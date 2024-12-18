const Piece = require('./Piece');
const { BOARD, POINTS, PIECE_TYPES, REDIS_KEYS } = require('../config/constants');

class Game {
  constructor(roomId, redisClient, playerId) {
    this.roomId = roomId;
    this.redisClient = redisClient;
    this.playerId = playerId;
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
    this.seed = '0';
    this.playerBlocksPlaced = 0;
  }

  async generateNextPiece() {
    console.log('Génération de la prochaine pièce', {
      seed: this.seed,
      blocksPlaced: this.playerBlocksPlaced
    });

    // Construit le hash avec le seed et le nombre de blocs placés
    const hash = this.seed + this.playerBlocksPlaced.toString();
    console.log('Hash:', hash);

    // Calcule l'index de manière déterministe
    let index = 0;
    for (let i = 0; i < hash.length; i++) {
      index = (index + hash.charCodeAt(i)) % PIECE_TYPES.length;
    }

    const pieceType = PIECE_TYPES[index];
    console.log('Type de pièce généré:', pieceType);
    
    return new Piece(pieceType);
  }

  async updateBlocksPlaced(blockCount) {
    // Mise à jour du compteur local
    this.playerBlocksPlaced += 1;
    
    // Mise à jour dans Redis
    const roomKey = `${REDIS_KEYS.GAME_PREFIX}${this.roomId}`;
    const playersData = await this.redisClient.hGet(roomKey, 'players');
    
    if (playersData) {
      const players = JSON.parse(playersData);
      const playerIndex = players.findIndex(p => p.id === this.playerId);
      if (playerIndex !== -1) {
        players[playerIndex].blocksPlaced = this.playerBlocksPlaced;
        await this.redisClient.hSet(roomKey, 'players', JSON.stringify(players));
      }
    }

    console.log('Nombre total de blocs placés:', this.playerBlocksPlaced);
    return this.playerBlocksPlaced;
  }

  async lockPiece() {
    const shape = this.currentPiece.getShape();
    const pos = this.currentPiece.position;
    let blockCount = 0;

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardY = pos.y + y;
          const boardX = pos.x + x;
          if (boardY >= 0) {
            this.board[boardY][boardX] = this.currentPiece.type;
            blockCount++;
          }
        }
      }
    }

    await this.updateBlocksPlaced(blockCount);

    return this;
  }

  async spawnPiece() {
    console.log('Apparition d\'une nouvelle pièce');
    console.log('Blocks placed:', this.playerBlocksPlaced);
  
    // Génère une nouvelle pièce directement
    const pieceType = await this.generateNextPiece();
    
    this.currentPiece = new Piece(pieceType.type);
    this.currentPiece.position = {
      x: Math.floor(BOARD.WIDTH / 2) - 1,
      y: 0
    };
  
    if (this.checkCollision(this.currentPiece)) {
      this.gameOver = true;
      this.isPlaying = false;
      return false;
    }
  
    return true;
  }


  // Déplace la pièce courante
  async movePiece(direction) {
    if (!this.currentPiece || !this.isPlaying || this.isPaused) return false;

    const movements = {
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
      down: { x: 0, y: 1 }
    };

    const move = movements[direction];
    if (!move) return false;

    const oldX = this.currentPiece.position.x;
    const oldY = this.currentPiece.position.y;

    this.currentPiece.position.x += move.x;
    this.currentPiece.position.y += move.y;

    if (this.checkCollision(this.currentPiece)) {
      this.currentPiece.position.x = oldX;
      this.currentPiece.position.y = oldY;

      if (direction === 'down') {
        console.log('Verrouillage de la pièce');
        // Verrouillez d'abord la pièce et mettez à jour le compteur
        await this.lockPiece();
        const linesCleared = this.clearLines();
        
        console.log('Blocks placed après verrouillage:', this.playerBlocksPlaced);
        
        // Générez la prochaine pièce seulement après la mise à jour du compteur
        const spawnSuccess = await this.spawnPiece();
        
        if (!spawnSuccess) {
          this.gameOver = true;
          this.isPlaying = false;
        }
        
        return { locked: true, linesCleared };
      }
      return false;
    }

    return true;
  }
  
  // Fait tourner la pièce courante
  rotatePiece() {
    if (!this.currentPiece || !this.isPlaying || this.isPaused) return false;

    // Sauvegarde l'état original
    const originalShape = this.currentPiece.getCurrentShape();
    const originalRotation = this.currentPiece.rotation;

    // Utilise la méthode rotate de la classe Piece
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
                this.currentPiece.shape = originalShape;
                this.currentPiece.rotation = originalRotation;
                return false;
            }
        }
    }
    return true;
}
  // Vérifie les collisions d'une pièce
  checkCollision(piece) {
    if (!piece || !piece.shape) {
        console.error('Pièce invalide dans checkCollision:', piece);
        return true;
    }

    const shape = Array.isArray(piece.shape) ? piece.shape : piece.getShape();
    const pos = piece.position;

    // Vérifie les collisions avec le plateau et les bordures
    for (let y = 0; y < shape.length; y++) {
      // Vérifie chaque cellule de la pièce
        for (let x = 0; x < shape[y].length; x++) {
          // Vérifie si la cellule est occupée
            if (shape[y][x]) {
                const boardX = pos.x + x;
                const boardY = pos.y + y;

      // Conditions de collision :
      // 1. La pièce dépasse le bord gauche (boardX < 0) ou droit (boardX >= BOARD.WIDTH)
      // 2. La pièce dépasse le bas du plateau (boardY >= BOARD.HEIGHT)
      // 3. La cellule du plateau à cette position est déjà occupée (this.board[boardY][boardX])       

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
  
  // Vérifie et efface les lignes complètes
  clearLines() {
    let linesCleared = 0;
    // iteration a partir du bas du tableau
    for (let row = BOARD.HEIGHT - 1; row >= 0; row--) {
      //si chaque cellule == 1 alors on efface la ligne
      if (this.board[row].every(cell => cell !== 0)) {
        //enlever la ligne
        this.board.splice(row, 1);
        //creer une nouvelle ligne vide en haut
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

}

module.exports = Game;