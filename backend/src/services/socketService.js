// backend/src/services/socketService.js
const { REDIS_KEYS } = require('../config/constants');

class SocketService {
  constructor(io, gameService) {
    this.io = io;
    this.gameService = gameService;
  }

  async handleJoinRoom(socket, { roomId, playerName }) {
    try {
      // Stocker les données du joueur dans Redis
      const playerKey = `${REDIS_KEYS.PLAYER_PREFIX}${socket.id}`;
      await this.gameService.redisClient.hSet(playerKey, {
        id: socket.id,
        name: playerName,
        roomId: roomId
      });

      // Rejoindre la room Socket.IO
      socket.join(roomId);

      // Ajouter le joueur au jeu
      const gameState = await this.gameService.joinGame(roomId, {
        id: socket.id,
        name: playerName
      });

      // Informer tous les joueurs de la room
      this.io.to(roomId).emit('room-update', gameState);

    } catch (error) {
      console.error('Erreur lors de la jointure de la room:', error);
      throw error;
    }
  }

  async handleStartGame(socket, roomId) {
    try {
      // Vérifier si le joueur est le leader
      const gameState = await this.gameService.getGameState(roomId);
      const player = gameState.players.find(p => p.id === socket.id);

      if (!player || !player.isLeader) {
        throw new Error('Seul le leader peut démarrer la partie');
      }

      // Démarrer le jeu
      const newGameState = await this.gameService.startGame(roomId);
      
      // Informer tous les joueurs
      this.io.to(roomId).emit('game-started', newGameState);

    } catch (error) {
      console.error('Erreur lors du démarrage du jeu:', error);
      throw error;
    }
  }

  async handleMovePiece(socket, { roomId, moveType }) {
    try {
      // TODO: Implémenter la logique de mouvement des pièces
      // Cette partie sera développée quand on va implementer la logique du jeu
      console.log(`Mouvement ${moveType} reçu du joueur ${socket.id}`);
      
    } catch (error) {
      console.error('Erreur lors du mouvement de pièce:', error);
      throw error;
    }
  }

  async handleDisconnect(socket) {
    try {
      // Récupérer les données du joueur
      const playerKey = `${REDIS_KEYS.PLAYER_PREFIX}${socket.id}`;
      const playerData = await this.gameService.redisClient.hGetAll(playerKey);

      if (playerData.roomId) {
        // Retirer le joueur du jeu
        const gameState = await this.gameService.removePlayer(playerData.roomId, socket.id);
        
        if (gameState) {
          // Informer les autres joueurs
          this.io.to(playerData.roomId).emit('room-update', gameState);
        }
      }

      // Supprimer les données du joueur de Redis
      await this.gameService.redisClient.del(playerKey);

    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      throw error;
    }
  }
}

module.exports = SocketService;