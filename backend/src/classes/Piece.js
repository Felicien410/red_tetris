// src/classes/Piece.js

class Piece {
    // Définition statique des formes de pièces standard de Tetris
    static SHAPES = {
      I: [[1, 1, 1, 1]],
      O: [[1, 1], 
          [1, 1]],
      T: [[0, 1, 0], 
          [1, 1, 1]],
      S: [[0, 1, 1], 
          [1, 1, 0]],
      Z: [[1, 1, 0], 
          [0, 1, 1]],
      J: [[1, 0, 0], 
          [1, 1, 1]],
      L: [[0, 0, 1], 
          [1, 1, 1]]
    };
  
    constructor(type) {
      if (!Piece.SHAPES[type]) {
        throw new Error(`Type de pièce invalide: ${type}`);
      }
      
      this.type = type;
      this.shape = JSON.parse(JSON.stringify(Piece.SHAPES[type])); // Copie profonde
      this.position = { x: 3, y: 0 }; // Position initiale au centre en haut
      this.rotation = 0; // 0, 90, 180, 270 degrés
    }
  
    rotate(clockwise = true) {
      const rows = this.shape.length;
      const cols = this.shape[0].length;
      const newShape = Array(cols).fill().map(() => Array(rows).fill(0));
  
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (clockwise) {
            newShape[col][rows - 1 - row] = this.shape[row][col];
          } else {
            newShape[cols - 1 - col][row] = this.shape[row][col];
          }
        }
      }
  
      this.shape = newShape;
      this.rotation = (this.rotation + (clockwise ? 90 : -90)) % 360;
      return this;
    }
  
    move(direction) {
      const movements = {
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
        down: { x: 0, y: 1 },
      };
  
      if (!movements[direction]) {
        throw new Error(`Direction invalide: ${direction}`);
      }
  
      this.position.x += movements[direction].x;
      this.position.y += movements[direction].y;
      return this;
    }
  
    // Retourne une copie de la pièce pour tester les mouvements
    getGhost() {
        // Au lieu de retourner un objet simple, créons une nouvelle instance
        const ghostPiece = new Piece(this.type);
        ghostPiece.shape = JSON.parse(JSON.stringify(this.shape));
        ghostPiece.position = { ...this.position };
        ghostPiece.rotation = this.rotation;
        return ghostPiece;
    }
  
    // Obtenir les coordonnées occupées par la pièce
    getCoordinates() {
      const coords = [];
      for (let row = 0; row < this.shape.length; row++) {
        for (let col = 0; col < this.shape[row].length; col++) {
          if (this.shape[row][col]) {
            coords.push({
              x: this.position.x + col,
              y: this.position.y + row
            });
          }
        }
      }
      return coords;
    }
  }
  
  module.exports = Piece;