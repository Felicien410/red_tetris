// backend/src/server.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { REDIS_KEYS, MAX_PLAYERS } = require('./config/constants');
const path = require('path');

class TetrisServer {
  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });
    this.redisClient = createClient();
    this.connectedSockets = new Map();
    this.setupServer();
  }

  async setupServer() {
    await this.redisClient.connect();
    console.log('Redis connected');

    await this.cleanupAllRooms();

    // Middleware
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // Configuration des en-têtes de sécurité
    this.app.use((req, res, next) => {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self';"
      );
      next();
    });

    // Route de debug Redis
    this.app.get('/debug/redis', async (req, res) => {
      try {
        console.log("Accessing debug route");
        const games = {};
        
        const gameKeys = await this.redisClient.keys(`${REDIS_KEYS.GAME_PREFIX}*`);
        console.log("Game keys found:", gameKeys);

        for (const key of gameKeys) {
          const data = await this.redisClient.hGetAll(key);
          games[key] = {
            players: JSON.parse(data.players || '[]'),
            isPlaying: data.isPlaying === 'true',
            raw: data // données brutes pour le debug
          };
        }
        
        const response = {
          totalGames: gameKeys.length,
          games: games,
          timestamp: new Date().toISOString()
        };

        res.json(response);
      } catch (error) {
        console.error("Debug route error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Route GET pour servir l'application
    this.app.get('/:room/:player_name', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Route POST pour créer/rejoindre une room
    this.app.post('/:room/:player_name', async (req, res) => {
      const { room, player_name } = req.params;

      try {
        const roomKey = `${REDIS_KEYS.GAME_PREFIX}${room}`;
        const roomExists = await this.redisClient.exists(roomKey);

        let players = [];
        if (roomExists) {
          const roomData = await this.redisClient.hGetAll(roomKey);
          players = JSON.parse(roomData.players);

          // Nettoyer les joueurs déconnectés
          players = players.filter(p => {
            const isConnected = this.connectedSockets.has(p.id);
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

        await this.redisClient.hSet(roomKey, {
          players: JSON.stringify(players),
          isPlaying: 'false'
        });

        res.json({ room, players, isPlaying: false });
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    this.io.on('connection', (socket) => {
      console.log('New connection:', socket.id);
      this.connectedSockets.set(socket.id, socket);

      socket.on('init-player', async (data) => {
        try {
          const { pseudo, room } = data;
          console.log(`Joueur ${pseudo} rejoint room ${room}`);

          const roomKey = `${REDIS_KEYS.GAME_PREFIX}${room}`;
          const roomExists = await this.redisClient.exists(roomKey);
          
          if (!roomExists) {
            socket.emit('error', { message: 'Room does not exist' });
            return;
          }

          const roomData = await this.redisClient.hGetAll(roomKey);
          let players = JSON.parse(roomData.players);

          const playerIndex = players.findIndex(p => p.name === pseudo);
          if (playerIndex !== -1) {
            const oldId = players[playerIndex].id;
            if (oldId && this.connectedSockets.has(oldId)) {
              const oldSocket = this.connectedSockets.get(oldId);
              oldSocket.disconnect();
              this.connectedSockets.delete(oldId);
            }
            players[playerIndex].id = socket.id;
          }

          await this.redisClient.hSet(roomKey, 'players', JSON.stringify(players));

          socket.join(room);
          socket.roomId = room;

          this.io.to(room).emit('room-update', {
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
          console.error('Error:', error);
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('disconnect', async () => {
        console.log('Disconnection:', socket.id);
        this.connectedSockets.delete(socket.id);

        if (socket.roomId) {
          await this.cleanupRoom(socket.roomId, socket.id);
        }
      });
    });

    const PORT = process.env.PORT || 3000;
    this.httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }

  async cleanupRoom(roomId, socketId) {
    try {
      const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
      const roomData = await this.redisClient.hGetAll(roomKey);

      if (roomData.players) {
        let players = JSON.parse(roomData.players);
        players = players.filter(p => p.id !== socketId);

        if (players.length === 0) {
          await this.redisClient.del(roomKey);
        } else {
          if (!players.some(p => p.isLeader)) {
            players[0].isLeader = true;
          }
          await this.redisClient.hSet(roomKey, 'players', JSON.stringify(players));
          this.io.to(roomId).emit('room-update', {
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

  async cleanupAllRooms() {
    try {
      const keys = await this.redisClient.keys(`${REDIS_KEYS.GAME_PREFIX}*`);
      for (const key of keys) {
        await this.redisClient.del(key);
      }
      console.log('All rooms cleaned up');
    } catch (error) {
      console.error('Error cleaning all rooms:', error);
    }
  }
}

new TetrisServer();