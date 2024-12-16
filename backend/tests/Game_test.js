// tests/Game_test.js
const Game = require('../src/classes/Game');
const { BOARD, POINTS } = require('../src/config/constants');

describe('Game Class', () => {
    let game;

    // Avant chaque test, nous créons une nouvelle instance de Game
    beforeEach(() => {
        game = new Game('test-room');
    });

    describe('Initialisation', () => {
        test('devrait créer une nouvelle partie avec les valeurs par défaut', () => {
            // Vérifions que le plateau a les bonnes dimensions
            expect(game.board.length).toBe(BOARD.HEIGHT);
            expect(game.board[0].length).toBe(BOARD.WIDTH);
            
            // Vérifions les valeurs initiales
            expect(game.score).toBe(0);
            expect(game.level).toBe(1);
            expect(game.isPlaying).toBe(false);
            expect(game.currentPiece).toBeNull();
            expect(game.nextPiece).toBeNull();
        });

        test('devrait initialiser un plateau vide', () => {
            // Vérifions que toutes les cellules sont à 0
            const allCellsEmpty = game.board.every(row => 
                row.every(cell => cell === 0)
            );
            expect(allCellsEmpty).toBe(true);
        });
    });

    describe('Démarrage et réinitialisation', () => {
        test('devrait correctement démarrer une nouvelle partie', () => {
            game.start();
            
            expect(game.isPlaying).toBe(true);
            expect(game.currentPiece).not.toBeNull();
            expect(game.nextPiece).not.toBeNull();
            expect(game.score).toBe(0);
            expect(game.level).toBe(1);
        });

        test('devrait réinitialiser la partie aux valeurs par défaut', () => {
            // D'abord on modifie quelques valeurs
            game.start();
            game.score = 1000;
            game.level = 5;
            
            // Ensuite on reset
            game.reset();
            
            expect(game.score).toBe(0);
            expect(game.level).toBe(1);
            expect(game.isPlaying).toBe(false);
            expect(game.currentPiece).toBeNull();
            expect(game.nextPiece).toBeNull();
        });
    });

    describe('Gestion du score et du niveau', () => {
        test('devrait correctement calculer le score pour différentes lignes', () => {
            const initialScore = game.score;
            
            game.updateScore(1); // Une ligne
            expect(game.score).toBe(initialScore + POINTS.SINGLE);
            
            game.updateScore(4); // Tetris
            expect(game.score).toBe(initialScore + POINTS.SINGLE + POINTS.TETRIS);
        });

        test('devrait augmenter le niveau toutes les 10 lignes', () => {
            game.linesCleared = 9;
            game.updateLevel();
            expect(game.level).toBe(1);
            
            game.linesCleared = 10;
            game.updateLevel();
            expect(game.level).toBe(2);
            
            game.linesCleared = 20;
            game.updateLevel();
            expect(game.level).toBe(3);
        });
    });

    describe('Gestion des pièces', () => {
        test('devrait verrouiller une pièce sur le plateau', () => {
            game.start();
            const piece = game.currentPiece;
            const initialCoords = piece.getCoordinates();
            
            game.lockPiece();
            
            // Vérifions que les cellules sont maintenant occupées
            initialCoords.forEach(({x, y}) => {
                if (y >= 0) {  // Ne vérifions que les coordonnées visibles
                    expect(game.board[y][x]).toBe(piece.type);
                }
            });
        });

        test('devrait détecter correctement les collisions', () => {
            game.start();
            const piece = game.currentPiece;
            
            // Test collision avec le bord gauche
            piece.position.x = -1;
            expect(game.checkCollision()).toBe(true);
            
            // Test collision avec le bord droit
            piece.position.x = BOARD.WIDTH;
            expect(game.checkCollision()).toBe(true);
            
            // Test collision avec le bas
            piece.position.x = 3;
            piece.position.y = BOARD.HEIGHT;
            expect(game.checkCollision()).toBe(true);
        });
    });
});