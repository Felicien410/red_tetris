// src/classes/Game.js
const Piece = require('./Piece');
const { BOARD, POINTS } = require('../config/constants');

class Game {
  // Initialisation du jeu avec les propriétés de base
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
    this.isPaused = false;
    this.gameOver = false;
  }

  // Démarre une nouvelle partie
  start() {
    this.reset();
    this.isPlaying = true;
    this.generateFirstPiece();  // On génère la première pièce
    this.generateNextPiece();   // Et la suivante
    return this;
  }

  generateFirstPiece() {
    const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    // On crée une nouvelle pièce avec une position initiale spécifique
    this.currentPiece = new Piece(randomType);
    this.currentPiece.position = {
      x: Math.floor(BOARD.WIDTH / 2) - 1,  // Centre de la pièce
      y: 0                                 // Haut du plateau
    };
    return this;
  }

  // Réinitialise l'état du jeu
  reset() {
    this.board = Array(BOARD.HEIGHT).fill().map(() => Array(BOARD.WIDTH).fill(0));
    this.score = 0;
    this.level = 1;
    this.gameSpeed = 1000;
    this.linesCleared = 0;
    this.currentPiece = null;
    this.nextPiece = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.gameOver = false;
    return this;
  }

  // Génère la prochaine pièce aléatoirement
  generateNextPiece() {
    const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    this.nextPiece = new Piece(randomType);
    return this;
  }

  // Fait apparaître une nouvelle pièce sur le plateau
  spawnPiece() {
    if (!this.nextPiece) {
      this.generateNextPiece();
    }
    this.currentPiece = this.nextPiece;
    this.generateNextPiece();
    
    // Position initiale de la pièce
    this.currentPiece.position = {
      x: Math.floor(BOARD.WIDTH / 2) - 1,
      y: 0
    };
    
    // Vérifie si la pièce peut être placée (game over si non)
    if (this.checkCollision(this.currentPiece)) {
      this.gameOver = true;
      this.isPlaying = false;
      return false;
    }
    return true;
  }

  // Déplace la pièce courante
  movePiece(direction) {
    if (!this.currentPiece || !this.isPlaying || this.isPaused) return false;

    const movements = {
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
      down: { x: 0, y: 1 }
    };

    const move = movements[direction];
    if (!move) return false;

    // Teste le mouvement
    const newPosition = {
      x: this.currentPiece.position.x + move.x,
      y: this.currentPiece.position.y + move.y
    };

    const ghostPiece = { ...this.currentPiece, position: newPosition };
    
    if (!this.checkCollision(ghostPiece)) {
      this.currentPiece.position = newPosition;
      return true;
    }

    // Si collision vers le bas, verrouille la pièce
    if (direction === 'down') {
      this.lockPiece();
      const linesCleared = this.clearLines();
      this.spawnPiece();
      return { locked: true, linesCleared };
    }

    return false;
  }

  // Fait tourner la pièce courante
  rotatePiece() {
    if (!this.currentPiece || !this.isPlaying || this.isPaused) return false;

    const originalRotation = this.currentPiece.rotation;
    this.currentPiece.rotate();

    // Si la rotation cause une collision, essaie de décaler la pièce
    if (this.checkCollision(this.currentPiece)) {
      // Essaie de décaler à gauche
      this.currentPiece.position.x -= 1;
      if (this.checkCollision(this.currentPiece)) {
        // Essaie de décaler à droite
        this.currentPiece.position.x += 2;
        if (this.checkCollision(this.currentPiece)) {
          // Si rien ne marche, annule la rotation
          this.currentPiece.position.x -= 1;
          this.currentPiece.rotation = originalRotation;
          return false;
        }
      }
    }
    return true;
  }

  // Vérifie les collisions d'une pièce
  checkCollision(piece) {
    const shape = piece.getShape();
    const pos = piece.position;

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardX = pos.x + x;
          const boardY = pos.y + y;

          // Vérifie les limites du plateau et les collisions
          if (boardX < 0 || boardX >= BOARD.WIDTH || 
              boardY >= BOARD.HEIGHT ||
              (boardY >= 0 && this.board[boardY][boardX])) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Verrouille une pièce sur le plateau
  lockPiece() {
    const shape = this.currentPiece.getShape();
    const pos = this.currentPiece.position;

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardY = pos.y + y;
          const boardX = pos.x + x;
          if (boardY >= 0) {
            this.board[boardY][boardX] = this.currentPiece.type;
          }
        }
      }
    }
    return this;
  }

  // Vérifie et efface les lignes complètes
  clearLines() {
    let linesCleared = 0;
    for (let row = BOARD.HEIGHT - 1; row >= 0; row--) {
      if (this.board[row].every(cell => cell !== 0)) {
        this.board.splice(row, 1);
        this.board.unshift(Array(BOARD.WIDTH).fill(0));
        linesCleared++;
        row++; // Revérifie la même position
      }
    }
    
    if (linesCleared > 0) {
      this.updateScore(linesCleared);
      this.linesCleared += linesCleared;
      this.updateLevel();
    }
    
    return linesCleared;
  }

  // Met à jour le score en fonction des lignes effacées
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

  // Met à jour le niveau et la vitesse du jeu
  updateLevel() {
    this.level = Math.floor(this.linesCleared / 10) + 1;
    this.gameSpeed = Math.max(100, 1000 - ((this.level - 1) * 100));
    return this;
  }

  // Retourne l'état complet du jeu
  getState() {
    return {
      board: this.board,
      currentPiece: this.currentPiece,
      nextPiece: this.nextPiece,
      score: this.score,
      level: this.level,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      gameOver: this.gameOver,
      linesCleared: this.linesCleared,
      gameSpeed: this.gameSpeed
    };
  }

  // Bascule l'état de pause
  togglePause() {
    if (this.isPlaying && !this.gameOver) {
      this.isPaused = !this.isPaused;
    }
    return this.isPaused;
  }
}

module.exports = Game;