const express = require("express");
const cors = require("cors");
const path = require("path");
const { REDIS_KEYS, MAX_PLAYERS } = require("../config/constants");
const Player = require("../classes/Player"); // Ajouter en haut du fichier

// Configuration des middlewares
function setupMiddlewares(app) {
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "../public")));
  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    }),
  );

  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self';",
    );
    next();
  });
}

// Configuration de la route de debug
function setupDebugRoute(app, redisClient) {
  app.get("/debug/redis", async (req, res) => {
    try {
      const games = {};
      const gameKeys = await redisClient.keys(`${REDIS_KEYS.GAME_PREFIX}*`);

      for (const key of gameKeys) {
        const data = await redisClient.hGetAll(key);
        games[key] = {
          players: JSON.parse(data.players || "[]"),
          isPlaying: data.isPlaying === "true",
          raw: data,
        };
      }

      res.json({
        totalGames: gameKeys.length,
        games,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Debug route error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}

// Configuration des routes principales
function setupMainRoutes(app, redisClient, connectedSockets) {
  console.log("Setting up main routes");
  
  // API endpoint to list active rooms
  app.get("/api/rooms", async (req, res) => {
    try {
      const gameKeys = await redisClient.keys(`${REDIS_KEYS.GAME_PREFIX}*`);
      const activeRooms = [];

      for (const key of gameKeys) {
        const roomData = await redisClient.hGetAll(key);
        const players = JSON.parse(roomData.players || "[]");
        
        // Filter out empty rooms and rooms with disconnected players
        const connectedPlayers = players.filter(p => p.socketId && connectedSockets.has(p.socketId));
        
        if (connectedPlayers.length > 0) {
          const roomId = key.replace(REDIS_KEYS.GAME_PREFIX, "");
          activeRooms.push({
            roomId,
            playerCount: connectedPlayers.length,
            maxPlayers: MAX_PLAYERS,
            isPlaying: roomData.isPlaying === "true",
            players: connectedPlayers.map(p => ({ name: p.name, isLeader: p.isLeader }))
          });
        }
      }

      res.json({ rooms: activeRooms });
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  });

  app.get("/:room/:player_name", (req, res) => {
    console.log("GET /:room/:player_name");
    res.sendFile(path.join(__dirname, "../public", "index.html"));
  });

  app.post("/:room/:player_name", async (req, res) => {
    console.log("POST /:room/:player_name");
    const { room, player_name } = req.params;

    try {
      const roomKey = `${REDIS_KEYS.GAME_PREFIX}${room}`;
      const roomExists = await redisClient.exists(roomKey);

      if (roomExists) {
        const roomData = await redisClient.hGetAll(roomKey);
        const players = JSON.parse(roomData.players || "[]");

        // Basic validation - detailed player management happens in socket handler
        if (players.length >= MAX_PLAYERS) {
          return res
            .status(400)
            .json({ error: "Room is full (max 2 players)" });
        }

        if (players.some((p) => p.name === player_name)) {
          return res
            .status(400)
            .json({ error: "Player name already exists in this room" });
        }

        res.json({ room, canJoin: true });
      } else {
        // Room doesn't exist, it will be created in the socket handler
        res.json({ room, canJoin: true });
      }
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}

// Configuration des gestionnaires de socket
function setupSocketHandlers(socket, server) {
  socket.on("init-player", async (data) => {
    try {
      console.log("Init player:", data);
      const { pseudo, room } = data;
      const roomKey = `${REDIS_KEYS.GAME_PREFIX}${room}`;
      console.log("Room key:", roomKey);

      const roomExists = await server.redisClient.exists(roomKey);
      if (!roomExists) {
        console.log("Room does not exist, creating new room");
        await server.LobbyService.createRoom(room, {
          id: socket.id,
          name: pseudo,
        });
      }

      const roomData = await server.redisClient.hGetAll(roomKey);
      let players = JSON.parse(roomData.players || "[]");

      const playerIndex = players.findIndex((p) => p.name === pseudo);
      console.log(`Player "${pseudo}" joining room "${room}". Found existing player at index: ${playerIndex}`);
      console.log('Current players:', players.map(p => ({ name: p.name, socketId: p.socketId })));
      
      if (playerIndex !== -1) {
        const existingPlayer = players[playerIndex];
        console.log(`Existing player "${pseudo}" found:`, { socketId: existingPlayer.socketId, isConnected: existingPlayer.socketId ? server.connectedSockets.has(existingPlayer.socketId) : false });
        
        // Check if this is a different socket trying to use the same name
        if (existingPlayer.socketId && 
            existingPlayer.socketId !== socket.id && 
            server.connectedSockets.has(existingPlayer.socketId)) {
          console.log(`Player name "${pseudo}" is already taken by a different connected socket`);
          throw new Error(`Player name "${pseudo}" is already taken in this room`);
        }
        
        // If the existing player is disconnected, we can safely replace them
        if (existingPlayer.socketId && !server.connectedSockets.has(existingPlayer.socketId)) {
          console.log(`Existing player "${pseudo}" is disconnected, replacing with new connection`);
        }
        
        // This is either a reconnection or the first socket connection for this player
        console.log(`Updating existing player "${pseudo}" with new socket ID`);
        const player = new Player(pseudo, room);
        player.setSocketId(socket.id);
        player.setLeader(existingPlayer.isLeader);
        player.blocksPlaced = existingPlayer.blocksPlaced || 0;
        players[playerIndex] = player.toJSON();
      } else {
        // Check room capacity before adding new player
        if (players.length >= MAX_PLAYERS) {
          console.log(`Room "${room}" is full, cannot add player "${pseudo}"`);
          throw new Error("Room is full");
        }
        
        // Création d'un nouveau joueur
        console.log(`Adding new player "${pseudo}" to room "${room}"`);
        const player = new Player(pseudo, room);
        player.setSocketId(socket.id);
        player.setLeader(players.length === 0);
        players.push(player.toJSON());
      }

      await server.redisClient.hSet(
        roomKey,
        "players",
        JSON.stringify(players),
      );

      socket.join(room);
      socket.roomId = room;
      
      // Ensure this socket is tracked as connected
      server.connectedSockets.add(socket.id);

      server.io.to(room).emit("room-update", {
        room,
        players,
        isPlaying: roomData.isPlaying === "true",
      });

      // Send individual confirmation to the joining player
      socket.emit("joined-room", {
        room,
        playerId: socket.id,
        players,
      });
      
      // Also send a direct room update to the joining player to ensure they get the current state
      socket.emit("room-update", {
        room,
        players,
        isPlaying: roomData.isPlaying === "true",
      });
      
      console.log(`✅ Player ${pseudo} successfully joined room ${room}. Room now has ${players.length} players.`);
      console.log(`📤 Room update sent to all players in room ${room}:`, players.map(p => p.name));
    } catch (error) {
      console.error("Error initializing:", error);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("start-game", async (data) => {
    try {
      // 1. Validation des données de base
      const roomId = data.room || data.roomId;
      if (!roomId) {
        throw new Error("Room ID is required");
      }
      console.log("RoomId in start-game:", roomId);

      // 2. Vérification de l'existence de la room
      const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
      const roomExists = await server.redisClient.exists(roomKey);
      if (!roomExists) {
        throw new Error("Room not found");
      }

      // 3. Récupération des données de la room
      const roomData = await server.redisClient.hGetAll(roomKey);
      if (!roomData || !roomData.players) {
        throw new Error("Invalid room data");
      }

      // 4. Récupération et validation des joueurs
      const players = JSON.parse(roomData.players);
      if (players.length === 0) {
        throw new Error("No players in room");
      }

      // 5. Identification du joueur qui démarre la partie
      const currentPlayer = players.find((p) => p.socketId === socket.id);
      if (!currentPlayer) {
        throw new Error("Player not found in room");
      }

      // 6. Vérification que le joueur est bien le leader
      if (!currentPlayer.isLeader) {
        throw new Error("Only the leader can start the game");
      }

      // 7. Vérification que la partie n'est pas déjà en cours
      if (roomData.isPlaying === "true") {
        throw new Error("Game is already in progress");
      }

      // 8. Initialisation des jeux pour chaque joueur
      console.log(`🎮 Starting game for ${players.length} players in room ${roomId}`);
      for (const player of players) {
        console.log(`🎯 Creating game for player ${player.name} (${player.socketId})`);
        const playerGameState = await server.gameLogicService.createGame(
          roomId,
          player.socketId,
        );

        console.log(`📤 Sending game-started to ${player.name} (${player.socketId})`);
        server.io.to(player.socketId).emit("game-started", playerGameState);
      }

      // 9. Mise à jour du statut de la room
      await server.redisClient.hSet(roomKey, {
        isPlaying: "true",
        players: JSON.stringify(players),
      });

      // 10. Notification à tous les joueurs
      server.io.to(roomId).emit("room-update", {
        room: roomId,
        players: players,
        isPlaying: true,
      });

      // 11. Démarrage des boucles de jeu
      for (const player of players) {
        startPlayerGameLoop(roomId, player.socketId, server);
      }

      // 12. Log de confirmation
      console.log(
        `Game started in room ${roomId} with ${players.length} players`,
      );
    } catch (error) {
      console.error("Error starting game:", error);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("move-piece", async (data) => {
    if (socket.roomId) {
      const gameUpdate = await server.gameLogicService.handleMove(
        socket.roomId,
        socket.id, // Ajout de l'ID du joueur
        data.direction,
      );
      if (gameUpdate) {
        // Envoyer la mise à jour au joueur concerné
        server.io.to(socket.id).emit("game-update", gameUpdate.playerUpdate);
        
        // Envoyer la mise à jour multiplayer à tous les joueurs de la room
        server.io.to(socket.roomId).emit("multiplayer-update", gameUpdate.roomUpdate);
      }
    }
  });

  socket.on("rotate-piece", async (data) => {
    if (socket.roomId) {
      const gameUpdate = await server.gameLogicService.handleRotation(
        socket.roomId,
        socket.id, // Ajout de l'ID du joueur
      );
      if (gameUpdate) {
        // Envoyer la mise à jour au joueur concerné
        server.io.to(socket.id).emit("game-update", gameUpdate.playerUpdate);
        
        // Envoyer la mise à jour multiplayer à tous les joueurs de la room
        server.io.to(socket.roomId).emit("multiplayer-update", gameUpdate.roomUpdate);
      }
    }
  });

  socket.on("fall-piece", async (data) => {
    if (socket.roomId) {
      const gameUpdate = await server.gameLogicService.handleFall(
        socket.roomId,
        socket.id, // Ajout de l'ID du joueur
      );
      if (gameUpdate) {
        // Envoyer la mise à jour au joueur concerné
        server.io.to(socket.id).emit("game-update", gameUpdate.playerUpdate);
        
        // Envoyer la mise à jour multiplayer à tous les joueurs de la room
        server.io.to(socket.roomId).emit("multiplayer-update", gameUpdate.roomUpdate);
      }
    }
  });

  socket.on("leave-room", async (data) => {
    console.log("Player leaving room:", socket.id, data);
    
    if (socket.roomId) {
      stopGameLoop(socket.roomId, server);
      await cleanupRoom(socket.roomId, socket.id, server);
      socket.leave(socket.roomId);
      socket.roomId = null;
    }
  });

  socket.on("disconnect", async () => {
    console.log("Disconnection:", socket.id);
    server.connectedSockets.delete(socket.id);

    if (socket.roomId) {
      stopGameLoop(socket.roomId, server);
      await cleanupRoom(socket.roomId, socket.id, server);
    }
  });
}

// Gestion des intervalles de jeu
function startPlayerGameLoop(roomId, playerId, server) {
  console.log(`⭐ Starting Loop for ${playerId}, Room ${roomId}`);
  const runLoop = async () => {
    const gameInstance = server.gameLogicService.games
      ?.get(roomId)
      ?.get(playerId);
    if (!gameInstance) {
      server.gameIntervals.delete(`${roomId}-${playerId}`);
      return;
    }

    try {
      const gameUpdate = await server.gameLogicService.handleMove(
        roomId,
        playerId,
        "down",
      );

      if (gameUpdate) {
        server.io.to(playerId).emit("game-update", gameUpdate.playerUpdate);
        server.io.to(roomId).emit("multiplayer-update", gameUpdate.roomUpdate);
      }
      if (gameInstance.gameOver) {
        stopGameLoop(roomId, playerId, server);
        await handleGameOver(roomId, playerId, server);
        return;
      }
    } catch (error) {
      console.error("Loop error:", error);
      clearTimeout(server.gameIntervals.get(`${roomId}-${playerId}`));
      server.gameIntervals.delete(`${roomId}-${playerId}`);
      return;
    }

    // Attendre la prochaine itération selon la vitesse actuelle
    const timeout = setTimeout(runLoop, gameInstance.gameSpeed || 1000);
    server.gameIntervals.set(`${roomId}-${playerId}`, timeout);
  };

  runLoop();
}

async function handleGameOver(roomId, playerId, server) {
  try {
    console.log(`🎮 Game over for player ${playerId} in room ${roomId}`);
    
    // Get room data
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const roomData = await server.redisClient.hGetAll(roomKey);
    const players = JSON.parse(roomData.players || "[]");
    
    // Stop all game loops for this room
    for (const player of players) {
      stopGameLoop(roomId, player.socketId, server);
    }
    
    // Determine winner and loser
    const loser = players.find(p => p.socketId === playerId);
    const winner = players.find(p => p.socketId !== playerId);
    
    if (winner && loser) {
      // Send game over to loser
      server.io.to(playerId).emit("game-over", {
        type: "defeat",
        message: "Game Over",
        opponent: winner.name
      });
      
      // Send victory to winner
      server.io.to(winner.socketId).emit("game-over", {
        type: "victory",
        message: "You Win!",
        opponent: loser.name
      });
      
      console.log(`🏆 ${winner.name} wins against ${loser.name} in room ${roomId}`);
    }
    
    // Reset room state
    await resetRoom(roomId, server, server.gameLogicService.games);
    
  } catch (error) {
    console.error("Error handling game over:", error);
  }
}

function stopGameLoop(roomId, playerId, server) {
  console.log(`Stopping Loop for ${playerId}, Room ${roomId}`);
  if (!server || !server.gameIntervals) {
    console.error("Server or gameIntervals is not defined");
    return;
  }

  const interval = server.gameIntervals.get(`${roomId}-${playerId}`);
  if (interval) {
    clearTimeout(interval);
    server.gameIntervals.delete(`${roomId}-${playerId}`);
    console.log(`🛑 Stopped Loop for ${playerId}, Room ${roomId}`);
  }
}

// Nettoyage des rooms
async function cleanupRoom(roomId, socketId, server) {
  try {
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const roomData = await server.redisClient.hGetAll(roomKey);

    if (roomData.players) {
      console.log("Cleaning room:", roomId);
      let players = JSON.parse(roomData.players);
      const disconnectedPlayer = players.find((p) => p.socketId === socketId);
      const remainingPlayers = players.filter((p) => p.socketId !== socketId);

      if (remainingPlayers.length === 0) {
        // No players left, delete room
        await server.redisClient.del(roomKey);
        stopGameLoop(roomId, socketId, server);
      } else if (roomData.isPlaying === "true" && remainingPlayers.length === 1) {
        // Game was in progress and only one player remains - they win!
        const winner = remainingPlayers[0];
        
        console.log(`🏆 ${winner.name} wins by forfeit against ${disconnectedPlayer?.name} in room ${roomId}`);
        
        // Stop all game loops
        for (const player of players) {
          stopGameLoop(roomId, player.socketId, server);
        }
        
        // Send victory to remaining player
        server.io.to(winner.socketId).emit("game-over", {
          type: "victory",
          message: "You Win!",
          reason: "Opponent disconnected",
          opponent: disconnectedPlayer?.name
        });
        
        // Make sure the remaining player becomes leader
        if (remainingPlayers.length > 0) {
          remainingPlayers[0].isLeader = true;
          console.log(`👑 ${remainingPlayers[0].name} is now the leader after game forfeit`);
        }
        
        // Reset room state to lobby
        await server.redisClient.hSet(roomKey, {
          players: JSON.stringify(remainingPlayers),
          isPlaying: "false"
        });
        
        // Update room state for remaining player
        server.io.to(roomId).emit("room-update", {
          room: roomId,
          players: remainingPlayers,
          isPlaying: false,
        });
        
      } else {
        // Normal lobby disconnection - just remove player
        // Check if the disconnected player was the leader
        const wasLeader = disconnectedPlayer?.isLeader;
        
        // If the leader left and there are remaining players, make the first one leader
        if (wasLeader && remainingPlayers.length > 0) {
          console.log(`👑 Leader ${disconnectedPlayer.name} left room ${roomId}, promoting ${remainingPlayers[0].name} to leader`);
          remainingPlayers[0].isLeader = true;
        } else if (!remainingPlayers.some((p) => p.isLeader) && remainingPlayers.length > 0) {
          // Fallback: if somehow no leader exists, make the first player leader
          remainingPlayers[0].isLeader = true;
        }
        
        await server.redisClient.hSet(
          roomKey,
          "players",
          JSON.stringify(remainingPlayers),
        );
        
        server.io.to(roomId).emit("room-update", {
          room: roomId,
          players: remainingPlayers,
          isPlaying: roomData.isPlaying === "true",
        });
        
        stopGameLoop(roomId, socketId, server);
      }
    }
  } catch (error) {
    console.error("Error cleaning room:", error);
  }
}

async function cleanupAllRooms(redisClient) {
  try {
    const keys = await redisClient.keys(`${REDIS_KEYS.GAME_PREFIX}*`);
    for (const key of keys) {
      await redisClient.del(key);
    }
    console.log("All rooms cleaned up");
  } catch (error) {
    console.error("Error cleaning all rooms:", error);
  }
}

async function resetRoom(roomId, server, games) {
  try {
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const playerGames = games.get(roomId);

    if (playerGames) {
      playerGames.forEach((_, playerId) => {
        stopGameLoop(roomId, playerId, server);
      });
      games.delete(roomId);
    }

    const roomData = await server.redisClient.hGetAll(roomKey);
    if (roomData) {
      await server.redisClient.hSet(roomKey, "isPlaying", "false");
    }

    console.log(`Room ${roomId} has been reset.`);
  } catch (error) {
    console.error("Error resetting room:", error);
  }
}

module.exports = {
  setupMiddlewares,
  setupDebugRoute,
  setupMainRoutes,
  setupSocketHandlers,
  startPlayerGameLoop,
  stopGameLoop,
  cleanupRoom,
  cleanupAllRooms,
  resetRoom,
};
