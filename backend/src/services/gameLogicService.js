// src/services/gameLogicService.js
const Game = require('../classes/Game');
const { REDIS_KEYS } = require('../config/constants');

class GameLogicService {

  // cree un redisClient et une map pour stocker toutes les parties en cours
  constructor(redisClient) {
      this.redisClient = redisClient;
      this.games = new Map();
  }

  // Crée une nouvelle partie pour une room donnée
  async createGame(roomId, playerId) {
    console.log('Création d\'un nouveau jeu pour le joueur:', playerId, 'dans la room:', roomId);
    const game = new Game(roomId, this.redisClient, playerId);

    // Initialise la Map pour la room si elle n'existe pas
    if (!this.games.has(roomId)) {
        this.games.set(roomId, new Map());
    }

    // Stocke l'instance de jeu pour ce joueur spécifique
    this.games.get(roomId).set(playerId, game);
    await game.start();

    // Récupère l'état initial
    const initialState = game.getState();
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const roomData = await this.redisClient.hGetAll(roomKey);
    const players = JSON.parse(roomData.players || '[]');

    return { 
        gameState: initialState,
        players: players,
        isPlaying: roomData.isPlaying === 'true'
    };
}

  // Sauvegarde l'état du jeu dans Redis
  async saveGameState(roomId, gameState) {
    try {
      const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
      await this.redisClient.hSet(roomKey, 'gameState', JSON.stringify(gameState));
     // console.log('État du jeu sauvegardé:', gameState);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'état:', error);
    }
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

        const result = game.movePiece(direction);
        const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
        const roomData = await this.redisClient.hGetAll(roomKey);
        let players = JSON.parse(roomData.players);

        if (result && result.locked) {
            const playerIndex = players.findIndex(p => p.id === playerId);
            if (playerIndex !== -1) {
                if (!players[playerIndex].blocksPlaced) players[playerIndex].blocksPlaced = 0;
                players[playerIndex].blocksPlaced++;
                console.log('blocksPlaced:', players[playerIndex].blocksPlaced);
                
                // Mettre à jour blocksPlaced dans l'instance du jeu
                game.blocksPlaced = players[playerIndex].blocksPlaced;
                
                // Générer la prochaine pièce avec le nouveau blocksPlaced
                game.nextPiece = game.generateNextPiece(game.seed, game.blocksPlaced);
                
                await this.redisClient.hSet(roomKey, 'players', JSON.stringify(players));
            }
        }

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