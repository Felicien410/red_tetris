// src/classes/Game.js
const Piece = require('./Piece');
const { BOARD, POINTS } = require('../config/constants');

class Game {
  constructor(roomId) {
    this.roomId = roomId;
    this.board = Array(BOARD.HEIGHT).fill().map(() => Array(BOARD.WIDTH).fill(0));
    this.currentPiece = null;
    this.nextPiece = null;
    this.score = 0;
    this.level = 1;
    this.gameSpeed = 1000;
    this.isPlaying = false;
    this.linesCleared = 0;
  }

  start() {
    this.reset();
    this.isPlaying = true;
    this.generateNextPiece();
    this.spawnPiece();
    return this;
  }

  reset() {
    this.board = Array(BOARD.HEIGHT).fill().map(() => Array(BOARD.WIDTH).fill(0));
    this.score = 0;
    this.level = 1;
    this.gameSpeed = 1000;
    this.linesCleared = 0;
    this.currentPiece = null;
    this.nextPiece = null;
    this.isPlaying = false;
    return this;
  }

  generateNextPiece() {
    const types = Object.keys(Piece.SHAPES);
    const randomType = types[Math.floor(Math.random() * types.length)];
    this.nextPiece = new Piece(randomType);
    return this;
  }

  spawnPiece() {
    if (!this.nextPiece) {
      this.generateNextPiece();
    }
    this.currentPiece = this.nextPiece;
    this.generateNextPiece();
    
    // Vérifier si la nouvelle pièce peut être placée
    if (this.checkCollision(this.currentPiece)) {
      this.isPlaying = false; // Game Over
      return false;
    }
    return true;
  }

  checkCollision(piece = this.currentPiece) {
    const coords = piece.getCoordinates();
    return coords.some(({x, y}) => {
      // Vérifier les limites du terrain
      if (x < 0 || x >= BOARD.WIDTH || y >= BOARD.HEIGHT) {
        return true;
      }
      // Vérifier les collisions avec les pièces existantes
      if (y >= 0 && this.board[y][x]) {
        return true;
      }
      return false;
    });
  }

  lockPiece() {
    const coords = this.currentPiece.getCoordinates();
    coords.forEach(({x, y}) => {
      if (y >= 0) {
        this.board[y][x] = this.currentPiece.type;
      }
    });
    return this;
  }

  clearLines() {
    let linesCleared = 0;
    for (let row = BOARD.HEIGHT - 1; row >= 0; row--) {
      if (this.board[row].every(cell => cell !== 0)) {
        // Supprimer la ligne complète
        this.board.splice(row, 1);
        // Ajouter une nouvelle ligne vide en haut
        this.board.unshift(Array(BOARD.WIDTH).fill(0));
        linesCleared++;
        row++; // Vérifier la même position après avoir supprimé une ligne
      }
    }
    
    if (linesCleared > 0) {
      this.updateScore(linesCleared);
      this.linesCleared += linesCleared;
      this.updateLevel();
    }
    
    return linesCleared;
  }

  updateScore(linesCleared) {
    const scores = {
      1: POINTS.SINGLE,
      2: POINTS.DOUBLE,
      3: POINTS.TRIPLE,
      4: POINTS.TETRIS
    };
    this.score += (scores[linesCleared] || 0) * this.level;
    return this;
  }

  updateLevel() {
    this.level = Math.floor(this.linesCleared / 10) + 1;
    this.gameSpeed = Math.max(100, 1000 - ((this.level - 1) * 100));
    return this;
  }

  getState() {
    return {
      board: this.board,
      currentPiece: this.currentPiece,
      nextPiece: this.nextPiece,
      score: this.score,
      level: this.level,
      isPlaying: this.isPlaying,
      linesCleared: this.linesCleared
    };
  }
}

module.exports = Game;