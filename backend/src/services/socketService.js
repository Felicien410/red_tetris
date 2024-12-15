// backend/src/server.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { REDIS_KEYS } = require('./config/constants');

class TetrisServer {
  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });
    this.redisClient = createClient();
    this.setupServer();
  }

  async setupServer() {
    await this.redisClient.connect();
    console.log('Redis connected');

    // Middleware
    this.app.use(express.json());

    // Récupérer le prochain numéro de room disponible
    async function getNextRoomNumber(redisClient) {
      const lastRoomKey = 'lastRoomNumber';
      const number = await redisClient.incr(lastRoomKey);
      return `room_${number}`;
    }

    // Gestion des sockets
    this.io.on('connection', (socket) => {
      console.log('New connection:', socket.id);

      // Connexion initiale du joueur
      socket.on('connect-player', async (data) => {
        try {
          const { pseudo } = data;
          console.log('Nouveau joueur:', pseudo);

          // Créer une nouvelle room
          const roomId = await getNextRoomNumber(this.redisClient);
          const playerKey = `${REDIS_KEYS.PLAYER_PREFIX}${socket.id}`;
          const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;

          // Stocker les données du joueur
          await this.redisClient.hSet(playerKey, {
            id: socket.id,
            name: pseudo,
            roomId: roomId
          });

          // Initialiser la room
          await this.redisClient.hSet(roomKey, {
            players: JSON.stringify([{
              id: socket.id,
              name: pseudo
            }]),
            isPlaying: 'false'
          });

          // Rejoindre la room socket
          socket.join(roomId);

          // Informer le client
          socket.emit('room-created', {
            roomId,
            playerId: socket.id
          });

        } catch (error) {
          console.error('Erreur connexion joueur:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // Rejoindre une room existante
      socket.on('join-room', async ({ roomId, playerName }) => {
        try {
          const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
          const roomExists = await this.redisClient.exists(roomKey);

          if (!roomExists) {
            throw new Error('Room introuvable');
          }

          const roomData = await this.redisClient.hGetAll(roomKey);
          const players = JSON.parse(roomData.players);

          // Vérifier si la partie est en cours
          if (roomData.isPlaying === 'true') {
            throw new Error('Partie en cours');
          }

          // Ajouter le joueur
          players.push({
            id: socket.id,
            name: playerName
          });

          // Mettre à jour la room
          await this.redisClient.hSet(roomKey, 'players', JSON.stringify(players));

          // Rejoindre la room socket
          socket.join(roomId);

          // Informer tous les joueurs
          this.io.to(roomId).emit('room-update', {
            roomId,
            players,
            isPlaying: false
          });

        } catch (error) {
          console.error('Erreur join room:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // Déconnexion
      socket.on('disconnect', async () => {
        try {
          const playerKey = `${REDIS_KEYS.PLAYER_PREFIX}${socket.id}`;
          const playerData = await this.redisClient.hGetAll(playerKey);

          if (playerData.roomId) {
            const roomKey = `${REDIS_KEYS.GAME_PREFIX}${playerData.roomId}`;
            const roomData = await this.redisClient.hGetAll(roomKey);

            if (roomData.players) {
              let players = JSON.parse(roomData.players);
              players = players.filter(p => p.id !== socket.id);

              if (players.length === 0) {
                await this.redisClient.del(roomKey);
              } else {
                await this.redisClient.hSet(roomKey, 'players', JSON.stringify(players));
                this.io.to(playerData.roomId).emit('room-update', {
                  roomId: playerData.roomId,
                  players,
                  isPlaying: roomData.isPlaying === 'true'
                });
              }
            }
          }

          await this.redisClient.del(playerKey);

        } catch (error) {
          console.error('Erreur déconnexion:', error);
        }
      });
    });

    const PORT = process.env.PORT || 3000;
    this.httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

new TetrisServer();