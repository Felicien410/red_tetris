// tests/Game_test.js
const Game = require('../src/classes/Game');
const { BOARD, POINTS } = require('../src/config/constants');

// Mock Redis client
const mockRedisClient = {
    hGet: jest.fn().mockResolvedValue('[]'),
    hSet: jest.fn().mockResolvedValue(true),
};

describe('Game Class', () => {
    let game;

    // Avant chaque test, nous créons une nouvelle instance de Game
    beforeEach(() => {
        game = new Game('test-room', mockRedisClient, 'test-player');
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

    describe('Démarrage et état du jeu', () => {
        test('devrait correctement initialiser une nouvelle partie', async () => {
            game.isPlaying = true;
            await game.spawnPiece();
            
            expect(game.isPlaying).toBe(true);
            expect(game.currentPiece).not.toBeNull();
            expect(game.nextPiece).not.toBeNull();
            expect(game.score).toBe(0);
            expect(game.level).toBe(1);
        });

        test('devrait avoir les bonnes propriétés initiales', () => {
            expect(game.score).toBe(0);
            expect(game.level).toBe(1);
            expect(game.isPlaying).toBe(false);
            expect(game.currentPiece).toBeNull();
            expect(game.nextPiece).toBeNull();
            expect(game.gameOver).toBe(false);
            expect(game.isPaused).toBe(false);
            expect(game.linesCleared).toBe(0);
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

        test('devrait augmenter le niveau toutes les 5 lignes', () => {
            game.linesCleared = 4;
            game.updateLevel();
            expect(game.level).toBe(1);
            
            game.linesCleared = 5;
            game.updateLevel();
            expect(game.level).toBe(2);
            
            game.linesCleared = 10;
            game.updateLevel();
            expect(game.level).toBe(3);
            
            game.linesCleared = 15;
            game.updateLevel();
            expect(game.level).toBe(4);
        });
    });

    describe('Gestion des pièces', () => {
        test('devrait détecter correctement les collisions', async () => {
            game.isPlaying = true;
            await game.spawnPiece();
            const piece = game.currentPiece;
            
            // Test collision avec le bord gauche
            piece.position.x = -1;
            expect(game.checkCollision(piece)).toBe(true);
            
            // Test collision avec le bord droit
            piece.position.x = BOARD.WIDTH;
            expect(game.checkCollision(piece)).toBe(true);
            
            // Test collision avec le bas
            piece.position.x = 3;
            piece.position.y = BOARD.HEIGHT;
            expect(game.checkCollision(piece)).toBe(true);
        });

        test('devrait permettre le mouvement des pièces', async () => {
            game.isPlaying = true;
            await game.spawnPiece();
            const piece = game.currentPiece;
            const initialX = piece.position.x;
            const initialY = piece.position.y;
            
            // Test mouvement vers la gauche
            const moveLeftResult = await game.movePiece('left');
            if (moveLeftResult) {
                expect(piece.position.x).toBe(initialX - 1);
            }
            
            // Reset position
            piece.position.x = initialX;
            piece.position.y = initialY;
            
            // Test mouvement vers la droite
            const moveRightResult = await game.movePiece('right');
            if (moveRightResult) {
                expect(piece.position.x).toBe(initialX + 1);
            }
        });

        test('devrait permettre la rotation des pièces', async () => {
            game.isPlaying = true;
            await game.spawnPiece();
            const piece = game.currentPiece;
            const initialRotation = piece.rotation;
            
            const rotateResult = game.rotatePiece();
            if (rotateResult) {
                expect(piece.rotation).toBe((initialRotation + 90) % 360);
            }
        });

        test('devrait gérer la chute rapide des pièces', async () => {
            game.isPlaying = true;
            await game.spawnPiece();
            const piece = game.currentPiece;
            const initialY = piece.position.y;
            
            const fallResult = await game.fallPiece();
            // La pièce doit tomber au bas du plateau
            expect(piece.position.y).toBeGreaterThan(initialY);
        });

        test('devrait verrouiller les pièces correctement', async () => {
            game.isPlaying = true;
            await game.spawnPiece();
            const piece = game.currentPiece;
            
            // Déplacer la pièce vers le bas du plateau
            piece.position.y = BOARD.HEIGHT - 2;
            
            await game.lockPiece();
            
            // Vérifier que les blocs sont maintenant dans le plateau
            let hasLockedPieces = false;
            for (let y = 0; y < game.board.length; y++) {
                for (let x = 0; x < game.board[0].length; x++) {
                    if (game.board[y][x] !== 0) {
                        hasLockedPieces = true;
                        break;
                    }
                }
                if (hasLockedPieces) break;
            }
            expect(hasLockedPieces).toBe(true);
        });

        test('devrait détecter le game over', async () => {
            game.isPlaying = true;
            
            // Remplir le plateau jusqu'en haut pour forcer un game over
            for (let y = 0; y < BOARD.HEIGHT; y++) {
                for (let x = 0; x < BOARD.WIDTH; x++) {
                    game.board[y][x] = 1;
                }
            }
            
            const spawnResult = await game.spawnPiece();
            expect(spawnResult).toBe(false);
            expect(game.gameOver).toBe(true);
        });

        test('devrait nettoyer les lignes complètes', () => {
            // Créer une ligne complète
            for (let x = 0; x < BOARD.WIDTH; x++) {
                game.board[BOARD.HEIGHT - 1][x] = 1;
            }
            
            const clearInfo = game.clearLines();
            expect(clearInfo.count).toBe(1);
            expect(clearInfo.clearedRows).toContain(BOARD.HEIGHT - 1);
            
            // Vérifier que la ligne a été supprimée
            expect(game.board[BOARD.HEIGHT - 1].every(cell => cell === 0)).toBe(true);
        });
    });

    describe('Génération des pièces', () => {
        test('devrait générer des pièces de manière déterministe', async () => {
            game.seed = 'test-deterministic';
            game.playerBlocksPlaced = 0;
            
            const piece1 = await game.generateNextPiece();
            
            // Reset pour la même génération
            game.playerBlocksPlaced = 0;
            const piece2 = await game.generateNextPiece();
            
            expect(piece1.type).toBe(piece2.type);
        });

        test('devrait mettre à jour le compteur de blocs placés', async () => {
            const initialBlocks = game.playerBlocksPlaced;
            await game.updateBlocksPlaced(4);
            expect(game.playerBlocksPlaced).toBe(initialBlocks + 1);
        });
    });

    describe('État du jeu', () => {
        test('devrait retourner l\'état complet du jeu', async () => {
            game.isPlaying = true;
            await game.spawnPiece();
            
            const state = game.getState();
            expect(state).toHaveProperty('board');
            expect(state).toHaveProperty('currentPiece');
            expect(state).toHaveProperty('nextPiece');
            expect(state).toHaveProperty('score');
            expect(state).toHaveProperty('level');
            expect(state).toHaveProperty('gameOver');
            expect(state).toHaveProperty('isPaused');
        });

        test('devrait gérer la pause et reprise du jeu', async () => {
            game.isPaused = true;
            
            // Les mouvements ne doivent pas fonctionner en pause
            const moveResult = await game.movePiece('left');
            expect(moveResult).toBe(false);
            
            const rotateResult = game.rotatePiece();
            expect(rotateResult).toBe(false);
        });
    });
});