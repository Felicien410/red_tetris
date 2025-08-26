// tests/gameLogicService_test.js
const GameLogicService = require('../src/services/gameLogicService');
const Game = require('../src/classes/Game');

// Mock Redis and Server
const mockRedisClient = {
    hSet: jest.fn().mockResolvedValue(true),
    hGet: jest.fn().mockResolvedValue('[]'),
    hGetAll: jest.fn().mockResolvedValue({
        players: '[]',
        seed: 'test-seed'
    }),
};

const mockServer = {
    io: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
    },
    gameIntervals: new Map()
};

describe('GameLogicService', () => {
    let gameLogicService;

    beforeEach(() => {
        // Mock console.log to prevent excessive output during tests
        console.log = jest.fn();
        gameLogicService = new GameLogicService(mockRedisClient, mockServer);
    });

    describe('Gestion des parties', () => {
        test('devrait créer une nouvelle partie', async () => {
            const roomId = 'test-room';
            const playerId = 'player-123';
            
            const result = await gameLogicService.createGame(roomId, playerId);
            
            expect(result).toBeDefined();
            expect(result.gameState).toBeDefined();
            expect(result.gameState.board).toBeDefined();
            expect(result.players).toBeDefined();
            expect(typeof result.isPlaying).toBe('boolean');
        });

        test('devrait stocker le jeu dans la carte des jeux', async () => {
            const roomId = 'test-room';
            const playerId = 'player-123';
            
            await gameLogicService.createGame(roomId, playerId);
            
            expect(gameLogicService.games.has(roomId)).toBe(true);
            expect(gameLogicService.games.get(roomId).has(playerId)).toBe(true);
        });
    });

    describe('Gestion des mouvements', () => {
        test('devrait gérer les mouvements de pièces', async () => {
            const roomId = 'test-room';
            const playerId = 'player-123';
            
            await gameLogicService.createGame(roomId, playerId);
            const game = gameLogicService.games.get(roomId).get(playerId);
            game.isPlaying = true;
            await game.spawnPiece();
            
            const result = await gameLogicService.handleMove(roomId, playerId, 'left');
            expect(result).toBeDefined();
            expect(result.playerUpdate).toBeDefined();
            expect(result.roomUpdate).toBeDefined();
        });

        test('devrait gérer la rotation des pièces', async () => {
            const roomId = 'test-room';
            const playerId = 'player-123';
            
            await gameLogicService.createGame(roomId, playerId);
            const game = gameLogicService.games.get(roomId).get(playerId);
            game.isPlaying = true;
            await game.spawnPiece();
            
            const result = await gameLogicService.handleRotation(roomId, playerId);
            expect(result).toBeDefined();
            expect(result.playerUpdate).toBeDefined();
            expect(result.roomUpdate).toBeDefined();
        });

        test('devrait gérer la chute rapide des pièces', async () => {
            const roomId = 'test-room';
            const playerId = 'player-123';
            
            await gameLogicService.createGame(roomId, playerId);
            const game = gameLogicService.games.get(roomId).get(playerId);
            game.isPlaying = true;
            await game.spawnPiece();
            
            const result = await gameLogicService.handleFall(roomId, playerId);
            expect(result).toBeDefined();
            expect(result.playerUpdate).toBeDefined();
            expect(result.roomUpdate).toBeDefined();
        });
    });

    describe('État des jeux', () => {
        test('devrait retourner l\'état complet de la room', async () => {
            const roomId = 'test-room';
            const playerId = 'player-123';
            
            await gameLogicService.createGame(roomId, playerId);
            
            const roomState = await gameLogicService.getRoomGameStates(roomId);
            expect(roomState).toBeDefined();
            expect(roomState.roomId).toBe(roomId);
            expect(roomState.gameStates).toBeDefined();
            expect(Array.isArray(roomState.gameStates)).toBe(true);
        });
    });
});