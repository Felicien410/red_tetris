// backend/src/server.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { REDIS_KEYS, MAX_PLAYERS } = require('./config/constants');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",  
    methods: ["GET", "POST"]
  }
});

const redisClient = createClient();

app.use(express.static(path.join(__dirname, 'public')));

redisClient.on('error', err => console.error('Redis Client Error:', err));

const startServer = async () => {
  await redisClient.connect();
  console.log('Redis connected');

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-room', async ({ roomId, playerName }) => {
      try {
        const playerKey = `${REDIS_KEYS.PLAYER_PREFIX}${socket.id}`;
        const existingPlayer = await redisClient.hGetAll(playerKey);
        
        if (existingPlayer.roomId === roomId) {
          throw new Error('Player is already in this room');
        } else if (existingPlayer.roomId) {
          // Si le joueur est dans une autre room, le retirer d'abord
          const oldRoomKey = `${REDIS_KEYS.GAME_PREFIX}${existingPlayer.roomId}`;
          const oldRoomData = await redisClient.hGetAll(oldRoomKey);
          
          if (oldRoomData.players) {
            let oldPlayers = JSON.parse(oldRoomData.players);
            oldPlayers = oldPlayers.filter(p => p.id !== socket.id);
            
            if (oldPlayers.length === 0) {
              await redisClient.del(oldRoomKey);
            } else {
              if (oldPlayers[0].isLeader === false) {
                oldPlayers[0].isLeader = true;
              }
              await redisClient.hSet(oldRoomKey, 'players', JSON.stringify(oldPlayers));
              
              io.to(existingPlayer.roomId).emit('room-update', {
                roomId: existingPlayer.roomId,
                players: oldPlayers,
                isPlaying: oldRoomData.isPlaying === 'true'
              });
            }
            
            socket.leave(existingPlayer.roomId);
          }
        }

        const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
        const roomExists = await redisClient.exists(roomKey);
        
        if (roomExists) {
          const playersStr = await redisClient.hGet(roomKey, 'players');
          const players = JSON.parse(playersStr);
          
          if (players.some(p => p.name === playerName)) {
            throw new Error('This player name is already taken in this room');
          }
          
          if (players.length >= MAX_PLAYERS) {
            throw new Error('Room is full');
          }
          
          socket.join(roomId);
          
          players.push({ id: socket.id, name: playerName, isLeader: false });
          await redisClient.hSet(roomKey, 'players', JSON.stringify(players));
        } else {
          socket.join(roomId);
          
          await redisClient.hSet(roomKey, {
            players: JSON.stringify([{ id: socket.id, name: playerName, isLeader: true }]),
            isPlaying: 'false'
          });
        }

        await redisClient.hSet(playerKey, {
          id: socket.id,
          name: playerName,
          roomId: roomId
        });

        const roomData = await redisClient.hGetAll(roomKey);
        io.to(roomId).emit('room-update', {
          roomId,
          players: JSON.parse(roomData.players),
          isPlaying: roomData.isPlaying === 'true'
        });

      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', async () => {
      try {
        const playerKey = `${REDIS_KEYS.PLAYER_PREFIX}${socket.id}`;
        const player = await redisClient.hGetAll(playerKey);
        
        if (player.roomId) {
          const roomKey = `${REDIS_KEYS.GAME_PREFIX}${player.roomId}`;
          const roomData = await redisClient.hGetAll(roomKey);
          
          if (roomData.players) {
            let players = JSON.parse(roomData.players);
            players = players.filter(p => p.id !== socket.id);
            
            if (players.length === 0) {
              await redisClient.del(roomKey);
            } else {
              if (players[0].isLeader === false) {
                players[0].isLeader = true;
              }
              await redisClient.hSet(roomKey, 'players', JSON.stringify(players));
              
              io.to(player.roomId).emit('room-update', {
                roomId: player.roomId,
                players: players,
                isPlaying: roomData.isPlaying === 'true'
              });
            }
          }
        }
        
        await redisClient.del(playerKey);
        
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch(console.error);