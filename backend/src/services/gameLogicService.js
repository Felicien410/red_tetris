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
  async createGame(roomId) {
    console.log('Création d\'un nouveau jeu pour la room:', roomId);

    //cree un jeu vide et le stocke dans la map
    const game = new Game(roomId);
    this.games.set(roomId, game); 

    //demarre le jeu (premiere piece...)
    game.start(); 
    
    // recupere l'etat du jeu et le sauvegarde dans Redis
    const initialState = game.getState();
    await this.saveGameState(roomId, initialState);
    
    return { gameState: initialState };
  }

  // Sauvegarde l'état du jeu dans Redis
  async saveGameState(roomId, gameState) {
    try {
      const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
      await this.redisClient.hSet(roomKey, 'gameState', JSON.stringify(gameState));
      console.log('État du jeu sauvegardé:', gameState);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'état:', error);
    }
  }

  async handleMove(roomId, direction) {
    try {
      const game = this.games.get(roomId);
      if (!game) {
        console.error('Jeu non trouvé pour la room:', roomId);
        return null;
      }
      game.movePiece(direction);
      return { gameState: game.getState() };
    } catch (error) {
      console.error('Erreur dans handleMove:', error);
      return null;
    }
  }

  async handleRotation(roomId) {
    try {
      const game = this.games.get(roomId);
      if (!game) {
        console.error('Jeu non trouvé pour la room:', roomId);
        return null;
      }
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