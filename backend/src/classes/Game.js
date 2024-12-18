// src/classes/Game.js
const Piece = require('./Piece');
const Player = require('./Player');
const { REDIS_KEYS, BOARD, POINTS, PIECE_TYPES } = require('../config/constants');

class Game {
  // Initialisation du jeu avec les propriétés de base
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
    this.seed = '0'; // Valeur par défaut
    this.playerBlocksPlaced = 0; // Valeur par défaut
  }


  async loadGameInfo() {
    try {
      const roomKey = `${REDIS_KEYS.GAME_PREFIX}${this.roomId}`;
      const [seed, playersData] = await Promise.all([
        this.redisClient.hGet(roomKey, 'seed'),
        this.redisClient.hGet(roomKey, 'players')
      ]);

      if (seed) {
        this.seed = seed;
      }
      
      if (playersData) {
        const players = JSON.parse(playersData);
        const currentPlayer = players.find(p => p.id === this.playerId);
        if (currentPlayer) {
          this.playerBlocksPlaced = currentPlayer.blocksPlaced || 0;
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des infos du jeu:', error);
      // Utiliser les valeurs par défaut en cas d'erreur
      this.seed = '0';
      this.playerBlocksPlaced = 0;
    }
  }

  async start() {
    await this.loadGameInfo();
    this.reset();
    this.isPlaying = true;
    return this.spawnPiece();
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
// Méthode pour générer la prochaine pièce
async generateNextPiece(roomId, blocksPlaced) {
  try {
      const seed = await this.lobbyService.getRoomSeed(roomId);
      if (!seed) {
          throw new Error('Seed not found for room');
      }

      // Utiliser blocksPlaced comme paramètre au lieu de le réinitialiser
      const hash = seed + blocksPlaced;
      console.log('Hash:', hash);

      // Générer un nombre pseudo-aléatoire basé sur le hash
      const randomValue = parseInt(hash.split('').reduce((acc, char) => {
          return acc + char.charCodeAt(0);
      }, 0));

      // Sélectionner une pièce basée sur le nombre pseudo-aléatoire
      const pieceTypes = Object.keys(PIECE_SHAPES);
      const selectedType = pieceTypes[randomValue % pieceTypes.length];

      return new Piece(selectedType);
  } catch (error) {
      console.error('Error generating next piece:', error);
      // En cas d'erreur, retourner une pièce aléatoire par défaut
      const pieceTypes = Object.keys(PIECE_SHAPES);
      return new Piece(pieceTypes[Math.floor(Math.random() * pieceTypes.length)]);
  }
}


  // Fait apparaître une nouvelle pièce sur le plateau
// Fait apparaître une nouvelle pièce sur le plateau
spawnPiece() {
  console.log('Apparition d\'une nouvelle pièce');
  if (!this.nextPiece) {
      // Passer le seed et blocksPlaced lors de la première génération
      this.nextPiece = this.generateNextPiece(this.seed, this.blocksPlaced);
  }
  
  // Create a new instance of Piece instead of just referencing nextPiece
  this.currentPiece = new Piece(this.nextPiece.type);
  this.currentPiece.position = {
      x: Math.floor(BOARD.WIDTH / 2) - 1,
      y: 0
  };
  
  // Generate next piece after setting current piece
  // Passer le seed et blocksPlaced pour la prochaine pièce
  this.nextPiece = this.generateNextPiece(this.seed, this.blocksPlaced);
  
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

    // Sauvegarde l'ancienne position
    const oldX = this.currentPiece.position.x;
    const oldY = this.currentPiece.position.y;

    // Applique le mouvement temporairement
    this.currentPiece.position.x += move.x;
    this.currentPiece.position.y += move.y;

    // Vérifie la collision
    if (this.checkCollision(this.currentPiece)) {
        // Restaure l'ancienne position
        this.currentPiece.position.x = oldX;
        this.currentPiece.position.y = oldY;
        // Si c un mouvement vers le bas qui a causé la collision
        if (direction === 'down') {
            console.log('Verrouillage de la pièce');
            this.lockPiece();
            // on verifie qu il n y a pas de lignes a effacer
            const linesCleared = this.clearLines();
            // on fait apparaitre la prochaine piece
            const spawnSuccess = this.spawnPiece();
            
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

  // Verrouille une pièce sur le plateau
  lockPiece() {
    const shape = this.currentPiece.getShape();
    const pos = this.currentPiece.position;

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        //si cellul pleine alors on calcule la position correspondante sur le plateau global.
        //On ajoute simplement la coordonnée locale (x, y) de la cellule à la position globale
        // de la pièce (pos.x, pos.y) pour obtenir (boardX, boardY).
        if (shape[y][x]) {

          const boardY = pos.y + y;
          const boardX = pos.x + x;
          if (boardY >= 0) {
          //Si la case de la pièce est occupée, on va poser le type de la pièce (this.currentPiece.type)
          //dans la grille du plateau this.board au bon endroit 
          //(this.board[boardY][boardX] = this.currentPiece.type;).
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