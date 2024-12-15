// backend/src/services/gameService.js
const { REDIS_KEYS, MAX_PLAYERS } = require('../config/constants');

class GameService {
  constructor(redisClient) {
    this.redisClient = redisClient;
  }

  async createGame(roomId, leader) {
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const players = [{
      id: leader.id,
      name: leader.name,
      isLeader: true
    }];

    await this.redisClient.hSet(roomKey, {
      players: JSON.stringify(players),
      isPlaying: 'false',
      pieces: JSON.stringify([])
    });

    return { roomId, players };
  }

  async joinGame(roomId, player) {
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const roomExists = await this.redisClient.exists(roomKey);
    
    if (!roomExists) {
      return await this.createGame(roomId, player);
    }

    const roomData = await this.redisClient.hGetAll(roomKey);
    const players = JSON.parse(roomData.players || '[]');
    
    if (roomData.isPlaying === 'true') {
      throw new Error('Cannot join a game in progress');
    }

    if (players.length >= MAX_PLAYERS) {
      throw new Error('Room is full');
    }

    if (players.some(p => p.name === player.name)) {
      throw new Error('Player name already taken');
    }

    players.push({
      id: player.id,
      name: player.name,
      isLeader: false
    });

    await this.redisClient.hSet(roomKey, 'players', JSON.stringify(players));
    
    return { roomId, players, isPlaying: false };
  }

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

    // Assign new leader if necessary
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

  async getGameState(roomId) {
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const roomData = await this.redisClient.hGetAll(roomKey);
    
    if (!roomData.players) return null;

    return {
      roomId,
      players: JSON.parse(roomData.players),
      isPlaying: roomData.isPlaying === 'true',
      pieces: JSON.parse(roomData.pieces || '[]')
    };
  }

  async startGame(roomId) {
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const gameState = await this.getGameState(roomId);
    
    if (!gameState) {
      throw new Error('Game not found');
    }

    if (gameState.isPlaying) {
      throw new Error('Game already in progress');
    }

    // Initialize game pieces and state
    const initialPieces = this.generateInitialPieces();
    await this.redisClient.hSet(roomKey, {
      isPlaying: 'true',
      pieces: JSON.stringify(initialPieces)
    });

    return {
      ...gameState,
      isPlaying: true,
      pieces: initialPieces
    };
  }

  generateInitialPieces() {
    // Implement piece generation logic here
    return [];
  }
}

module.exports = GameService;