// src/services/gameLogicService.js
const Game = require('../classes/Game');
const { REDIS_KEYS } = require('../config/constants');

class GameLogicService {
  constructor(redisClient) {
      this.redisClient = redisClient;
      this.games = new Map();
  }

    async createGame(roomId) {
      console.log('Création d\'un nouveau jeu pour la room:', roomId);
      const game = new Game(roomId);
      game.start();
      this.games.set(roomId, game); // On garde le jeu en mémoire
      return game;
  }


  // Récupère l'instance de jeu, la crée si elle n'existe pas
  async getGame(roomId) {
    let game = this.games.get(roomId);
    if (!game) {
        const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
        const gameData = await this.redisClient.hGetAll(roomKey);
        if (gameData && gameData.gameState) {
            game = new Game(roomId);
            game.loadState(JSON.parse(gameData.gameState));
            this.games.set(roomId, game);
        }
    }
    return game;
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
  // Charge l'état du jeu depuis Redis
  async loadGameState(roomId) {
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
    const data = await this.redisClient.hGet(roomKey, 'gameState');
    return data ? JSON.parse(data) : null;
  }

  // Gère le mouvement d'une pièce
    async handleMove(roomId, direction) {
      try {
          const game = this.games.get(roomId);
          if (!game) {
              console.error('Jeu non trouvé pour la room:', roomId);
              return null;
          }

          // On utilise directement le jeu en mémoire
          const result = game.movePiece(direction);
          return { gameState: game.getState() };

      } catch (error) {
          console.error('Erreur dans handleMove:', error);
          return null;
      }
  }

    async saveGameState(roomId, gameState) {
        const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
        await this.redisClient.hSet(roomKey, 'gameState', JSON.stringify(gameState));
    }

  // Gère la rotation d'une pièce

  async handleRotation(roomId) {
    try {
        const game = this.games.get(roomId);
        if (!game) {
            console.error('Jeu non trouvé pour la room:', roomId);
            return null;
        }

        game.rotate();
        return { gameState: game.getState() };

    } catch (error) {
        console.error('Erreur dans handleRotation:', error);
        return null;
    }
}


  // Vérifie les collisions d'une pièce avec le plateau ou les bordures
  checkCollision(game, piece) {
    for (let y = 0; y < piece.matrix.length; y++) {
      for (let x = 0; x < piece.matrix[y].length; x++) {
        if (piece.matrix[y][x]) {
          const boardX = piece.position.x + x;
          const boardY = piece.position.y + y;

          // Vérification des bordures
          if (boardX < 0 || boardX >= game.board[0].length || 
              boardY >= game.board.length) {
            return true;
          }

          // Vérification des collisions avec les pièces existantes
          if (boardY >= 0 && game.board[boardY][boardX]) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Verrouille une pièce sur le plateau
  lockPiece(game) {
    const piece = game.currentPiece;
    for (let y = 0; y < piece.matrix.length; y++) {
      for (let x = 0; x < piece.matrix[y].length; x++) {
        if (piece.matrix[y][x]) {
          const boardY = piece.position.y + y;
          const boardX = piece.position.x + x;
          if (boardY >= 0) {
            game.board[boardY][boardX] = piece.type;
          }
        }
      }
    }
  }

  // Efface les lignes complètes et met à jour le score
  clearLines(game) {
    let linesCleared = 0;
    for (let y = game.board.length - 1; y >= 0; y--) {
      if (game.board[y].every(cell => cell !== 0)) {
        game.board.splice(y, 1);
        game.board.unshift(Array(10).fill(0));
        linesCleared++;
        y++;  // Revérifie la même ligne après décalage
      }
    }

    if (linesCleared > 0) {
      game.updateScore(linesCleared);
    }

    return linesCleared;
  }

  // Fait apparaître la prochaine pièce
  spawnNextPiece(game) {
    const nextPiece = game.pieces.shift();
    if (nextPiece) {
      game.currentPiece = {
        type: nextPiece.type,
        position: { x: 3, y: 0 },
        matrix: this.getPieceMatrix(nextPiece.type)
      };
      // Génère une nouvelle pièce si nécessaire
      if (game.pieces.length < 3) {
        game.generateNewPieces();
      }
    }
  }

  // Met à jour l'état complet du jeu
  updateGameState(game, linesCleared = 0) {
    return {
      board: game.board,
      score: game.score,
      level: game.level,
      currentPiece: game.currentPiece,
      nextPiece: game.pieces[0],
      linesCleared: game.totalLinesCleared,
      lastClearedLines: linesCleared
    };
  }

  // Ajoute des lignes de pénalité au plateau de jeu
  addPenaltyLines(game, count) {
    // Déplace les lignes existantes vers le haut
    game.board.splice(0, count);
    
    // Ajoute les nouvelles lignes de pénalité
    for (let i = 0; i < count; i++) {
      const penaltyLine = Array(10).fill(1);
      const hole = Math.floor(Math.random() * 10);
      penaltyLine[hole] = 0;
      game.board.push(penaltyLine);
    }
  }

  // Utilitaire pour faire pivoter une matrice de pièce
  rotatePieceMatrix(matrix) {
    const N = matrix.length;
    const rotated = Array(N).fill().map(() => Array(N).fill(0));
    
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        rotated[x][N - 1 - y] = matrix[y][x];
      }
    }
    
    return rotated;
  }

  // Retourne la matrice correspondant à chaque type de pièce
  getPieceMatrix(type) {
    const pieces = {
      'I': [[1, 1, 1, 1]],
      'O': [[1, 1], [1, 1]],
      'T': [[0, 1, 0], [1, 1, 1]],
      'S': [[0, 1, 1], [1, 1, 0]],
      'Z': [[1, 1, 0], [0, 1, 1]],
      'J': [[1, 0, 0], [1, 1, 1]],
      'L': [[0, 0, 1], [1, 1, 1]]
    };
    return pieces[type] || pieces['I'];
  }
}

module.exports = GameLogicService;