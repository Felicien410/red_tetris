const { REDIS_KEYS, MAX_PLAYERS, BOARD } = require('../config/constants');
const Game = require('../classes/Game');

class GameLogicService {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.games = new Map();
  }

  async createGame(roomId, playerId) {
    console.log('Création d\'un nouveau jeu pour le joueur:', playerId, 'dans la room:', roomId);

    // Charger les données de la room d'abord
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const roomData = await this.redisClient.hGetAll(roomKey);
    const players = JSON.parse(roomData.players || '[]');
    const seed = roomData.seed || `${roomId}-${Date.now()}`;

    // Créer le jeu avec les paramètres initiaux
    const game = new Game(roomId, this.redisClient, playerId);
    game.seed = seed;

    // Initialiser le compteur de blocs placés depuis les données joueur
    const currentPlayer = players.find(p => p.socketId === playerId);
    if (currentPlayer) {
      game.playerBlocksPlaced = currentPlayer.blocksPlaced || 0;
    }

    // Initialise la Map pour la room si elle n'existe pas
    if (!this.games.has(roomId)) {
      this.games.set(roomId, new Map());
    }

    // Stocke l'instance de jeu pour ce joueur spécifique
    this.games.get(roomId).set(playerId, game);

    // Initialisation directe du jeu (au lieu d'appeler reset)
    game.board = Array(BOARD.HEIGHT).fill().map(() => Array(BOARD.WIDTH).fill(0));
    game.score = 0;
    game.level = 1;
    game.gameSpeed = 1000;
    game.linesCleared = 0;
    game.currentPiece = null;
    game.nextPiece = null;
    game.isPaused = false;
    game.gameOver = false;
    game.isPlaying = true;

    await game.spawnPiece();

    return { 
      gameState: game.getState(),
      players: players,
      isPlaying: roomData.isPlaying === 'true'
    };
  }

  async handleMove(roomId, playerId, direction) {
    try {
      const playerGames = this.games.get(roomId);
      if (!playerGames) {
        console.error('Aucun jeu trouvé pour la room:', roomId);
        return null;
      }
  
      const game = playerGames.get(playerId);
      if (!game) {
        console.error('Aucun jeu trouvé pour le joueur:', playerId);
        return null;
      }
  
      const result = await game.movePiece(direction);
      const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
      const roomData = await this.redisClient.hGetAll(roomKey);
      const players = JSON.parse(roomData.players);
  
      // La mise à jour des blocs est déjà gérée dans game.lockPiece()
      return {
        gameState: game.getState(),
        players: players,
        isPlaying: roomData.isPlaying === 'true'
      };
    } catch (error) {
      console.error('Erreur dans handleMove:', error);
      return null;
    }
  }

  async handleRotation(roomId, playerId) {
    try {
      const playerGames = this.games.get(roomId);
      if (!playerGames) return null;

      const game = playerGames.get(playerId);
      if (!game) return null;

      game.rotatePiece();
      return { gameState: game.getState() };
    } catch (error) {
      console.error('Erreur dans handleRotation:', error);
      return null;
    }
  }


  // Gestion des pénalités (spécifique au mode multijoueur)
//   async addPenaltyLines(roomId, count) {
//     try {
//       const game = this.games.get(roomId);
//       if (!game) return null;
      
//       const board = game.board.slice();
//       board.splice(0, count);
      
//       for (let i = 0; i < count; i++) {
//         const penaltyLine = Array(10).fill(1);
//         const hole = Math.floor(Math.random() * 10);
//         penaltyLine[hole] = 0;
//         board.push(penaltyLine);
//       }
      
//       game.board = board;
//       return { gameState: game.getState() };
//     } catch (error) {
//       console.error('Erreur dans addPenaltyLines:', error);
//       return null;
//     }
//   }

  async getGame(roomId) {
    return this.games.get(roomId);
  }
}

module.exports = GameLogicService;