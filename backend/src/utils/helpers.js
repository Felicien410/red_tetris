const express = require('express');
const cors = require('cors');
const path = require('path');
const { REDIS_KEYS, MAX_PLAYERS } = require('../config/constants');

// Configuration des middlewares
function setupMiddlewares(app) {
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '../public')));
    app.use(cors({
        origin: 'http://localhost:5173',
        credentials: true
    }));
    
    app.use((req, res, next) => {
        res.setHeader(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self';"
        );
        next();
    });
}

// Configuration de la route de debug
function setupDebugRoute(app, redisClient) {
    app.get('/debug/redis', async (req, res) => {
        try {
            const games = {};
            const gameKeys = await redisClient.keys(`${REDIS_KEYS.GAME_PREFIX}*`);
            
            for (const key of gameKeys) {
                const data = await redisClient.hGetAll(key);
                games[key] = {
                    players: JSON.parse(data.players || '[]'),
                    isPlaying: data.isPlaying === 'true',
                    raw: data
                };
            }
            
            res.json({
                totalGames: gameKeys.length,
                games,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error("Debug route error:", error);
            res.status(500).json({ error: error.message });
        }
    });
}

// Configuration des routes principales
function setupMainRoutes(app, redisClient, connectedSockets) {
    app.get('/:room/:player_name', (req, res) => {
        res.sendFile(path.join(__dirname, '../public', 'index.html'));
    });

    app.post('/:room/:player_name', async (req, res) => {
        const { room, player_name } = req.params;

        try {
            const roomKey = `${REDIS_KEYS.GAME_PREFIX}${room}`;
            const roomExists = await redisClient.exists(roomKey);
            let players = [];

            if (roomExists) {
                const roomData = await redisClient.hGetAll(roomKey);
                players = JSON.parse(roomData.players);

                // Nettoyage des joueurs déconnectés
                players = players.filter(p => {
                    const isConnected = connectedSockets.has(p.id);
                    return !p.id || isConnected;
                });

                if (players.length >= MAX_PLAYERS) {
                    return res.status(400).json({ error: 'Room is full (max 2 players)' });
                }

                if (players.some(p => p.name === player_name)) {
                    return res.status(400).json({ error: 'Player name already exists in this room' });
                }
            }

            const newPlayer = {
                id: null,
                name: player_name,
                isLeader: players.length === 0
            };
            players.push(newPlayer);

            await redisClient.hSet(roomKey, {
                players: JSON.stringify(players),
                isPlaying: 'false'
            });

            res.json({ room, players, isPlaying: false });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

// Configuration des gestionnaires de socket
function setupSocketHandlers(socket, server) {
    socket.on('init-player', async (data) => {
        try {
            const { pseudo, room } = data;
            const roomKey = `${REDIS_KEYS.GAME_PREFIX}${room}`;
            
            const roomExists = await server.redisClient.exists(roomKey);
            if (!roomExists) {
                await server.LobbyService.createRoom(room, {
                    id: socket.id,
                    name: pseudo
                });
            }

            const roomData = await server.redisClient.hGetAll(roomKey);
            let players = JSON.parse(roomData.players || '[]');

            const playerIndex = players.findIndex(p => p.name === pseudo);
            if (playerIndex !== -1) {
                players[playerIndex].id = socket.id;
            } else {
                players.push({
                    id: socket.id,
                    name: pseudo,
                    isLeader: players.length === 0
                });
            }

            await server.redisClient.hSet(roomKey, 'players', JSON.stringify(players));

            socket.join(room);
            socket.roomId = room;

            server.io.to(room).emit('room-update', {
                room,
                players,
                isPlaying: roomData.isPlaying === 'true'
            });

            socket.emit('joined-room', {
                room,
                playerId: socket.id,
                players
            });

        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('start-game', async (data) => {
        try {
            const roomId = data.room || data.roomId;
            if (!roomId) throw new Error('Room ID is required');

            const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
            const roomExists = await server.redisClient.exists(roomKey);
            if (!roomExists) throw new Error('Room not found - Please try reconnecting');

            const roomData = await server.redisClient.hGetAll(roomKey);
            if (!roomData || !roomData.players) throw new Error('Invalid room data');

            const players = JSON.parse(roomData.players);
            const currentPlayer = players.find(p => p.id === socket.id);
            
            if (!currentPlayer) throw new Error('Player not found in room');
            if (!currentPlayer.isLeader) throw new Error('Seul le leader peut démarrer la partie');

            const gameState = await server.gameLogicService.createGame(roomId);
            await server.redisClient.hSet(roomKey, 'isPlaying', 'true');

            server.io.to(roomId).emit('game-started', gameState);
            server.io.to(roomId).emit('room-update', {
                room: roomId,
                players: players,
                isPlaying: true
            });

            startGameLoop(roomId, server);

        } catch (error) {
            console.error('Erreur lors du démarrage:', error);
            socket.emit('error', { 
                message: error.message,
                details: 'Erreur lors du démarrage de la partie'
            });
        }
    });

    socket.on('move-piece', async (data) => {
        if (socket.roomId) {
            const gameUpdate = await server.gameLogicService.handleMove(socket.roomId, data.direction);
            if (gameUpdate) {
                server.io.to(socket.roomId).emit('game-update', gameUpdate);
            }
        }
    });

    socket.on('rotate-piece', async (data) => {
        if (socket.roomId) {
            const gameUpdate = await server.gameLogicService.handleRotation(socket.roomId);
            if (gameUpdate) {
                server.io.to(socket.roomId).emit('game-update', gameUpdate);
            }
        }
    });

    socket.on('disconnect', async () => {
        console.log('Disconnection:', socket.id);
        server.connectedSockets.delete(socket.id);

        if (socket.roomId) {
            stopGameLoop(socket.roomId, server);
            await cleanupRoom(socket.roomId, socket.id, server);
        }
    });
}

// Gestion des intervalles de jeu
function startGameLoop(roomId, server) {
    console.log('Démarrage de la boucle de jeu pour la room:', roomId);
    const interval = setInterval(async () => {
        try {
            const gameUpdate = await server.gameLogicService.handleMove(roomId, 'down');
            if (gameUpdate) {
                server.io.to(roomId).emit('game-update', gameUpdate);
            }
        } catch (error) {
            console.error('Erreur dans la boucle de jeu:', error);
            clearInterval(interval);
            server.gameIntervals.delete(roomId);
        }
    }, 1000);

    server.gameIntervals.set(roomId, interval);
}

function stopGameLoop(roomId, server) {
    const interval = server.gameIntervals.get(roomId);
    if (interval) {
        clearInterval(interval);
        server.gameIntervals.delete(roomId);
        console.log('Boucle de jeu arrêtée pour la room:', roomId);
    }
}

// Nettoyage des rooms
async function cleanupRoom(roomId, socketId, server) {
    try {
        const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
        const roomData = await server.redisClient.hGetAll(roomKey);

        if (roomData.players) {
            let players = JSON.parse(roomData.players);
            players = players.filter(p => p.id !== socketId);

            if (players.length === 0) {
                await server.redisClient.del(roomKey);
                stopGameLoop(roomId, server);
            } else {
                if (!players.some(p => p.isLeader)) {
                    players[0].isLeader = true;
                }
                await server.redisClient.hSet(roomKey, 'players', JSON.stringify(players));
                server.io.to(roomId).emit('room-update', {
                    room: roomId,
                    players,
                    isPlaying: roomData.isPlaying === 'true'
                });
            }
        }
    } catch (error) {
        console.error('Error cleaning room:', error);
    }
}

async function cleanupAllRooms(redisClient) {
    try {
        const keys = await redisClient.keys(`${REDIS_KEYS.GAME_PREFIX}*`);
        for (const key of keys) {
            await redisClient.del(key);
        }
        console.log('All rooms cleaned up');
    } catch (error) {
        console.error('Error cleaning all rooms:', error);
    }
}

module.exports = {
    setupMiddlewares,
    setupDebugRoute,
    setupMainRoutes,
    setupSocketHandlers,
    startGameLoop,
    stopGameLoop,
    cleanupRoom,
    cleanupAllRooms
};