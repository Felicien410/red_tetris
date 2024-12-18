// src/services/lobbyService.js
const { REDIS_KEYS, MAX_PLAYERS } = require('../config/constants');
const Player = require('../classes/Player');
class LobbyService {

  constructor(redisClient) {
    this.redisClient = redisClient;
  }

  // Crée une nouvelle partie avec un leader initial
  async createRoom(roomId, leader) {
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
  
    // Créer un nouveau Player au lieu d'un simple objet
    const newPlayer = new Player(leader.name, roomId);
    newPlayer.setSocketId(leader.id);
    newPlayer.setLeader(true);

    const players = [newPlayer.toJSON()];  // Utiliser toJSON()
  
    const seed = `${roomId}-${Date.now()}`;
  
    await this.redisClient.hSet(roomKey, {
      players: JSON.stringify(players),
      isPlaying: 'false',
      seed: seed.toString(),
      pieces: JSON.stringify([]),
      gameState: JSON.stringify({
        board: Array(20).fill().map(() => Array(10).fill(0)),
        score: 0,
        level: 1,
        linesCleared: 0
      })
    });
  
    return { roomId, players, seed };
  }

  async joinGame(roomId, player) {
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const roomExists = await this.redisClient.exists(roomKey);
    
    if (!roomExists) {
      return await this.createRoom(roomId, player);
    }

    const roomData = await this.redisClient.hGetAll(roomKey);
    let players = JSON.parse(roomData.players || '[]');
    
    if (roomData.isPlaying === 'true') {
      throw new Error('Cannot join a game in progress');
    }

    if (players.length >= MAX_PLAYERS) {
      throw new Error('Room is full');
    }

    if (players.some(p => p.name === player.name)) {
      throw new Error('Player name already taken');
    }

    // Création du nouveau joueur avec la classe Player
    const newPlayer = new Player(player.name, roomId);
    newPlayer.setSocketId(player.id);
    newPlayer.setLeader(false);
    const playerJSON = newPlayer.toJSON(); // Convertir en JSON pour stocker

    players.push(playerJSON);

    // Mise à jour de l'état dans Redis
    await this.redisClient.hSet(roomKey, {
        players: JSON.stringify(players),
        isPlaying: 'false'
    });
    
    return { 
        roomId, 
        players: players.map(p => ({...p, socketId: p.id})), // Ajouter socketId
        isPlaying: false 
    };
}

  // Supprime un joueur d'une partie
  async removePlayer(roomId, playerId) {
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const roomData = await this.redisClient.hGetAll(roomKey);
    
    if (!roomData.players) return null;

    let players = JSON.parse(roomData.players);
    players = players.filter(p => p.id !== playerId);

    if (players.length === 0) {
      await this.redisClient.del(roomKey);
      return null;
    }

    if (!players.some(p => p.isLeader) && players.length > 0) {
      // Convertir en Player pour utiliser les méthodes
      const leaderPlayer = new Player(players[0].name, roomId);
      leaderPlayer.setSocketId(players[0].id);
      leaderPlayer.setLeader(true);
      players[0] = leaderPlayer.toJSON();
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

  async getRoomSeed(roomId) {
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const seed = await this.redisClient.hGet(roomKey, 'seed');
    return seed;
  }
  
  // Vérifie si un joueur est le leader d'une partie
  async verifyLeader(roomId, playerId) {
    const gameState = await this.getGameState(roomId);
    if (!gameState) return false;

    const currentPlayer = gameState.players.find(p => p.id === playerId);
    return currentPlayer?.isLeader || false;
  }
}

module.exports = LobbyService;