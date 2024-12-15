// backend/src/server.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { REDIS_KEYS, MAX_PLAYERS } = require('./config/constants');
const GameService = require('./services/gameService');
const SocketService = require('./services/socketService');
const path = require('path');

class TetrisServer {
  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    this.redisClient = createClient();
    this.gameService = new GameService(this.redisClient);
    this.socketService = new SocketService(this.io, this.gameService);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  async initialize() {
    try {
      await this.redisClient.connect();
      console.log('Redis connected successfully');
      
      this.setupSocketHandlers();
      
      const PORT = process.env.PORT || 3000;
      this.httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    } catch (error) {
      console.error('Failed to initialize server:', error);
      process.exit(1);
    }
  }

  setupMiddleware() {
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use(express.json());
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      socket.on('join-room', async (data) => {
        try {
          await this.socketService.handleJoinRoom(socket, data);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('start-game', async (roomId) => {
        try {
          await this.socketService.handleStartGame(socket, roomId);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('move-piece', async (data) => {
        try {
          await this.socketService.handleMovePiece(socket, data);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('disconnect', async () => {
        try {
          await this.socketService.handleDisconnect(socket);
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      });
    });
  }
}

const server = new TetrisServer();
server.initialize().catch(console.error);

module.exports = TetrisServer;