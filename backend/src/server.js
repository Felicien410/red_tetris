// server.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { REDIS_KEYS, MAX_PLAYERS } = require('./config/constants');
const path = require('path');
const cors = require('cors');
const GameService = require('./services/gameService');
const GameLogicService = require('./services/gameLogicService');

class TetrisServer {
  constructor() {
    // Initialisation des services de base
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, {
      cors: { 
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Initialisation des connexions et services
    this.redisClient = createClient();
    this.connectedSockets = new Map();
    this.gameService = new GameService(this.redisClient);
    this.gameLogicService = new GameLogicService(this.redisClient);
    this.gameIntervals = new Map(); // Pour gérer les intervalles de jeu
    this.setupServer();
  }

  startGameLoop(roomId) {
    console.log('Démarrage de la boucle de jeu pour la room:', roomId);
    const interval = setInterval(async () => {
      try {
        const gameUpdate = await this.gameLogicService.handleMove(roomId, 'down');
        if (gameUpdate) {
          this.io.to(roomId).emit('game-update', gameUpdate);
        }
      } catch (error) {
        console.error('Erreur dans la boucle de jeu:', error);
        clearInterval(interval);
        this.gameIntervals.delete(roomId);
      }
    }, 1000); // Descente toutes les secondes

    this.gameIntervals.set(roomId, interval);
  }

  stopGameLoop(roomId) {
    const interval = this.gameIntervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.gameIntervals.delete(roomId);
      console.log('Boucle de jeu arrêtée pour la room:', roomId);
    }
  }

  async setupServer() {
    // Connexion à Redis
    await this.redisClient.connect();
    console.log('Redis connected');
    await this.cleanupAllRooms();

    // Configuration des middlewares
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use(cors({
      origin: 'http://localhost:5173',
      credentials: true
    }));
    
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
            raw: data
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

    // Routes principales
    this.setupRoutes();
    this.setupSocketEvents();

    // Démarrage du serveur
    const PORT = process.env.PORT || 3000;
    this.httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }

  setupRoutes() {
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
  }

  setupSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log('New connection:', socket.id);
      this.connectedSockets.set(socket.id, socket);

      socket.on('init-player', async (data) => {
        try {
          const { pseudo, room } = data;
          console.log(`Initialisation du joueur ${pseudo} dans la room ${room}`);
      
          const roomKey = `${REDIS_KEYS.GAME_PREFIX}${room}`;
          let roomData;
      
          // Vérifions si la room existe
          const roomExists = await this.redisClient.exists(roomKey);
          if (!roomExists) {
            console.log('Création d\'une nouvelle room:', room);
            await this.gameService.createGame(room, {
              id: socket.id,
              name: pseudo
            });
          }
      
          roomData = await this.redisClient.hGetAll(roomKey);
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
          console.error('Erreur lors de l\'initialisation:', error);
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('start-game', async (data) => {
        try {
          console.log('Tentative de démarrage de la partie:', data);
          const roomId = data.room || data.roomId;
          
          if (!roomId) {
            console.log('Room ID manquant dans la requête:', data);
            throw new Error('Room ID is required');
          }
      
          const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
          console.log('Recherche de la room:', roomKey);
          
          const roomExists = await this.redisClient.exists(roomKey);
          if (!roomExists) {
            console.log('Room introuvable dans Redis:', roomKey);
            throw new Error('Room not found - Please try reconnecting');
          }

          const roomData = await this.redisClient.hGetAll(roomKey);
          console.log('Données de la room trouvées:', roomData);

          if (!roomData || !roomData.players) {
            console.log('Données de la room invalides');
            throw new Error('Invalid room data');
          }

          const players = JSON.parse(roomData.players);
          console.log('Joueurs dans la room:', players);

          const currentPlayer = players.find(p => p.id === socket.id);
          if (!currentPlayer) {
            console.log('Joueur non trouvé dans la room');
            throw new Error('Player not found in room');
          }

          if (!currentPlayer.isLeader) {
            console.log('Le joueur n\'est pas leader');
            throw new Error('Seul le leader peut démarrer la partie');
          }

          console.log('Démarrage de la partie autorisé pour le leader:', currentPlayer.name);

          const gameState = await this.gameService.startGame(roomId);
          await this.gameLogicService.createGame(roomId);

          this.io.to(roomId).emit('game-started', gameState);
          this.io.to(roomId).emit('room-update', {
            room: roomId,
            players: players,
            isPlaying: true
          });

          // Démarrer la boucle de jeu
          this.startGameLoop(roomId);

          console.log('Partie démarrée avec succès dans la room:', roomId);

        } catch (error) {
          console.error('Erreur détaillée lors du démarrage:', error);
          socket.emit('error', { 
            message: error.message,
            details: 'Erreur lors du démarrage de la partie'
          });
        }
      });

      socket.on('disconnect', async () => {
        console.log('Disconnection:', socket.id);
        this.connectedSockets.delete(socket.id);

        if (socket.roomId) {
          this.stopGameLoop(socket.roomId); // Arrêter la boucle de jeu
          await this.cleanupRoom(socket.roomId, socket.id);
        }
      });

      socket.on('move-piece', async (data) => {
        if (socket.roomId) {
          const gameUpdate = await this.gameLogicService.handleMove(socket.roomId, data.direction);
          if (gameUpdate) {
            this.io.to(socket.roomId).emit('game-update', gameUpdate);
          }
        }
      });

      socket.on('rotate-piece', async (data) => {
        if (socket.roomId) {
          const gameUpdate = await this.gameLogicService.handleRotation(socket.roomId);
          if (gameUpdate) {
            this.io.to(socket.roomId).emit('game-update', gameUpdate);
          }
        }
      });
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
          this.stopGameLoop(roomId);
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