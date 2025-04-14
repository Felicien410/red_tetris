// tests/gameLogicService_test.js
const GameLogicService = require('../src/services/gameLogicService');
const Game = require('../src/classes/Game');

// Mock Redis
const mockRedisClient = {
    hSet: jest.fn().mockResolvedValue(true),
    hGet: jest.fn().mockResolvedValue(null),
    hGetAll: jest.fn().mockResolvedValue({}),
};

describe('GameLogicService', () => {
    let gameLogicService;

    beforeEach(() => {
        gameLogicService = new GameLogicService(mockRedisClient);
    });

    describe('Gestion des parties', () => {
        test('devrait créer une nouvelle partie', async () => {
            const roomId = 'test-room';
            const game = await gameLogicService.createGame(roomId);
            
            expect(game).toBeDefined();
            expect(game.roomId).toBe(roomId);
        });
    });

    describe('Gestion des mouvements', () => {
        test('devrait gérer le mouvement valide d\'une pièce', async () => {
            const roomId = 'test-room';
            const game = await gameLogicService.createGame(roomId);
            game.start(); // Initialise la partie avec une pièce

            const result = await gameLogicService.handleMove(roomId, 'left');
            expect(result).toBeDefined();
            expect(result.currentPiece.position.x).toBe(2); // Position initiale (3) - 1
        });

        test('devrait gérer la collision lors d\'un mouvement', async () => {
            const roomId = 'test-room';
            const game = await gameLogicService.createGame(roomId);
            game.start();
            
            // Créer une situation de collision
            game.currentPiece.position.x = 0;
            const result = await gameLogicService.handleMove(roomId, 'left');
            expect(result).toBeNull();
        });
    });

    describe('Gestion des rotations', () => {
        test('devrait permettre une rotation valide', async () => {
            const roomId = 'test-room';
            const game = await gameLogicService.createGame(roomId);
            game.start();

            const initialShape = JSON.stringify(game.currentPiece.shape);
            const result = await gameLogicService.handleRotation(roomId);
            
            expect(result).toBeDefined();
            expect(JSON.stringify(result.currentPiece.shape)).not.toBe(initialShape);
        });
    });

    describe('Calcul du spectre', () => {
        test('devrait calculer correctement le spectre du plateau', () => {
            const board = Array(20).fill().map(() => Array(10).fill(0));
            board[18][0] = 1;
            board[15][5] = 1;
            
            const spectrum = gameLogicService.calculateSpectrum(board);
            expect(spectrum[0]).toBe(18);
            expect(spectrum[5]).toBe(15);
            expect(spectrum[9]).toBe(20);
        });
    });

    describe('Gestion des pénalités', () => {
        test('devrait ajouter correctement les lignes de pénalité', async () => {
            const roomId = 'test-room';
            const game = await gameLogicService.createGame(roomId);
            game.start();
            
            const initialHeight = game.board.length;
            gameLogicService.addPenaltyLines(game, 2);
            
            // Vérifier que la hauteur totale n'a pas changé
            expect(game.board.length).toBe(initialHeight);
            
            // Vérifier que les lignes de pénalité ont un trou
            const lastLine = game.board[game.board.length - 1];
            const holes = lastLine.filter(cell => cell === 0);
            expect(holes.length).toBe(1);
        });
    });
});