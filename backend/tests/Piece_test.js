// tests/Piece.test.js
const Piece = require('../src/classes/Piece');

describe('Piece Class', () => {
  describe('Création de pièce', () => {
    test('devrait créer une pièce valide avec un type correct', () => {
      const piece = new Piece('T');
      expect(piece.type).toBe('T');
      expect(piece.shape).toEqual([[0, 1, 0], [1, 1, 1]]);
      expect(piece.position).toEqual({ x: 3, y: 0 });
    });

    test('devrait lever une erreur avec un type invalide', () => {
      expect(() => new Piece('X')).toThrow('Type de pièce invalide: X');
    });

    test('chaque pièce devrait avoir une forme correcte', () => {
      const types = Object.keys(Piece.SHAPES);
      types.forEach(type => {
        const piece = new Piece(type);
        expect(piece.shape).toEqual(Piece.SHAPES[type]);
      });
    });
  });

  describe('Rotation', () => {
    test('devrait correctement faire pivoter une pièce T dans le sens horaire', () => {
      const piece = new Piece('T');
      const initialShape = [[0, 1, 0], [1, 1, 1]];
      const rotatedShape = [[1, 0], [1, 1], [1, 0]];
      
      piece.rotate();
      expect(piece.shape).toEqual(rotatedShape);
      expect(piece.rotation).toBe(90);
    });

    test('devrait retourner à la forme initiale après 4 rotations', () => {
      const piece = new Piece('T');
      const initialShape = JSON.stringify(piece.shape);
      
      // 4 rotations complètes
      for (let i = 0; i < 4; i++) {
        piece.rotate();
      }
      
      expect(JSON.stringify(piece.shape)).toBe(initialShape);
      expect(piece.rotation).toBe(0);
    });
  });

  describe('Mouvement', () => {
    test('devrait correctement déplacer la pièce vers la gauche', () => {
      const piece = new Piece('T');
      const initialX = piece.position.x;
      
      piece.move('left');
      expect(piece.position.x).toBe(initialX - 1);
      expect(piece.position.y).toBe(0);
    });

    test('devrait correctement déplacer la pièce vers la droite', () => {
      const piece = new Piece('T');
      const initialX = piece.position.x;
      
      piece.move('right');
      expect(piece.position.x).toBe(initialX + 1);
      expect(piece.position.y).toBe(0);
    });

    test('devrait correctement déplacer la pièce vers le bas', () => {
      const piece = new Piece('T');
      const initialY = piece.position.y;
      
      piece.move('down');
      expect(piece.position.y).toBe(initialY + 1);
      expect(piece.position.x).toBe(3);
    });

    test('devrait lever une erreur pour une direction invalide', () => {
      const piece = new Piece('T');
      expect(() => piece.move('invalid')).toThrow('Direction invalide: invalid');
    });
  });

  describe('Obtention des coordonnées', () => {
    test('devrait retourner les bonnes coordonnées pour une pièce T', () => {
      const piece = new Piece('T');
      piece.position = { x: 0, y: 0 };
      
      const coords = piece.getCoordinates();
      expect(coords).toEqual([
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 }
      ]);
    });
  });

  describe('Création de fantôme', () => {
    test('devrait créer une copie indépendante de la pièce', () => {
      const piece = new Piece('T');
      const ghost = piece.getGhost();
      
      expect(ghost.type).toBe(piece.type);
      expect(ghost.position).toEqual(piece.position);
      expect(ghost.shape).toEqual(piece.shape);
      
      // Vérifier que c'est une copie profonde
      ghost.position.x = 99;
      expect(piece.position.x).toBe(3);
    });
  });
});