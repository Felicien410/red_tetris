// src/services/gameService.js
const { REDIS_KEYS, MAX_PLAYERS } = require('../config/constants');

class GameService {
  constructor(redisClient) {
    this.redisClient = redisClient;
  }

  // Crée une nouvelle partie avec un leader initial
  async createGame(roomId, leader) {
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    
    // Création de la structure initiale des joueurs avec le leader
    const players = [{
      id: leader.id,
      name: leader.name,
      isLeader: true,
      score: 0
    }];

    // Initialisation de l'état de la partie dans Redis
    await this.redisClient.hSet(roomKey, {
      players: JSON.stringify(players),
      isPlaying: 'false',
      pieces: JSON.stringify([]),
      gameState: JSON.stringify({
        board: Array(20).fill().map(() => Array(10).fill(0)),
        score: 0,
        level: 1,
        linesCleared: 0
      })
    });

    return { roomId, players };
  }

  // Permet à un joueur de rejoindre une partie existante
  async joinGame(roomId, player) {
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const roomExists = await this.redisClient.exists(roomKey);
    
    // Si la room n'existe pas, on en crée une nouvelle
    if (!roomExists) {
      return await this.createGame(roomId, player);
    }

    const roomData = await this.redisClient.hGetAll(roomKey);
    const players = JSON.parse(roomData.players || '[]');
    
    // Vérifications avant de rejoindre
    if (roomData.isPlaying === 'true') {
      throw new Error('Cannot join a game in progress');
    }

    if (players.length >= MAX_PLAYERS) {
      throw new Error('Room is full');
    }

    if (players.some(p => p.name === player.name)) {
      throw new Error('Player name already taken');
    }

    // Ajout du nouveau joueur
    players.push({
      id: player.id,
      name: player.name,
      isLeader: false,
      score: 0
    });

    // Mise à jour de l'état dans Redis
    await this.redisClient.hSet(roomKey, 'players', JSON.stringify(players));
    
    return { roomId, players, isPlaying: false };
  }

  // Supprime un joueur d'une partie
  async removePlayer(roomId, playerId) {
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const roomData = await this.redisClient.hGetAll(roomKey);
    
    if (!roomData.players) return null;

    let players = JSON.parse(roomData.players);
    players = players.filter(p => p.id !== playerId);

    // Si plus de joueurs, on supprime la room
    if (players.length === 0) {
      await this.redisClient.del(roomKey);
      return null;
    }

    // Assignation d'un nouveau leader si nécessaire
    if (!players.some(p => p.isLeader) && players.length > 0) {
      players[0].isLeader = true;
    }

    await this.redisClient.hSet(roomKey, 'players', JSON.stringify(players));
    return {
      roomId,
      players,
      isPlaying: roomData.isPlaying === 'true'
    };
  }

  // Récupère l'état actuel d'une partie
  async getGameState(roomId) {
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const roomData = await this.redisClient.hGetAll(roomKey);
    
    if (!roomData.players) return null;

    return {
      roomId,
      players: JSON.parse(roomData.players),
      isPlaying: roomData.isPlaying === 'true',
      pieces: JSON.parse(roomData.pieces || '[]'),
      gameState: JSON.parse(roomData.gameState || '{}')
    };
  }

  // Vérifie si un joueur est le leader d'une partie
  async verifyLeader(roomId, playerId) {
    const gameState = await this.getGameState(roomId);
    if (!gameState) return false;

    const currentPlayer = gameState.players.find(p => p.id === playerId);
    return currentPlayer?.isLeader || false;
  }

    // Démarre une nouvelle partie
    async startGame(roomId) {
      const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
      const gameState = await this.getGameState(roomId);
      
      if (!gameState) {
          throw new Error('Game not found');
      }

      if (gameState.isPlaying) {
          throw new Error('Game already in progress');
      }

      // Création d'une nouvelle instance de jeu
      const game = new Game(roomId);
      game.start(); // Ceci va initialiser le jeu et générer la première pièce

      // Obtenir l'état complet du jeu après initialisation
      const initialGameState = game.getState();

      // Mise à jour de l'état dans Redis
      await this.redisClient.hSet(roomKey, {
          isPlaying: 'true',
          gameState: JSON.stringify(initialGameState)
      });

      return {
          ...gameState,
          isPlaying: true,
          gameState: initialGameState
      };
  }

}

module.exports = GameService;