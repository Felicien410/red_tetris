const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { createClient } = require("redis");
const { REDIS_KEYS } = require("./config/constants");
const path = require("path");
const cors = require("cors");
const LobbyService = require("./services/lobbyService");
const GameLogicService = require("./services/gameLogicService");
const dotenv = require("dotenv");

const {
  setupMiddlewares,
  setupDebugRoute,
  setupMainRoutes,
  setupSocketHandlers,
  cleanupAllRooms,
} = require("./utils/helpers");

dotenv.config();

class TetrisServer {
  constructor() {
    // Services de base
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, {
      cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Services et connexions
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.redisClient = createClient({ url: redisUrl });
    this.connectedSockets = new Set();
    this.LobbyService = new LobbyService(this.redisClient);
    this.gameLogicService = new GameLogicService(this.redisClient, this);
    this.gameIntervals = new Map();

    this.setupServer();
  }

  async setupServer() {
    // Connexion à Redis
    await this.redisClient.connect();
    console.log("Redis connected");
    await cleanupAllRooms(this.redisClient);

    // Setup du serveur
    setupMiddlewares(this.app);
    setupDebugRoute(this.app, this.redisClient);
    setupMainRoutes(this.app, this.redisClient, this.connectedSockets);

    // Setup des sockets
    this.io.on("connection", (socket) => {
      console.log("New connection:", socket.id);
      this.connectedSockets.add(socket.id);
      setupSocketHandlers(socket, this);
    });

    // Démarrage du serveur
    const PORT = process.env.PORT || 3000;
    this.httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

new TetrisServer();
