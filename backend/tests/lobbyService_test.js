// tests/lobbyService_test.js
const LobbyService = require('../src/services/lobbyService');
const { REDIS_KEYS, MAX_PLAYERS } = require('../src/config/constants');

// Mock Redis client
const mockRedisClient = {
    hSet: jest.fn().mockResolvedValue(true),
    hGet: jest.fn().mockResolvedValue('[]'),
    hGetAll: jest.fn().mockResolvedValue({
        players: '[]',
        isPlaying: 'false'
    }),
    exists: jest.fn().mockResolvedValue(false),
    del: jest.fn().mockResolvedValue(true),
    keys: jest.fn().mockResolvedValue([])
};

describe('LobbyService', () => {
    let lobbyService;

    beforeEach(() => {
        lobbyService = new LobbyService(mockRedisClient);
        // Reset mocks
        Object.values(mockRedisClient).forEach(fn => fn.mockClear());
    });

    describe('Création de room', () => {
        test('devrait créer une nouvelle room avec un joueur', async () => {
            const roomId = 'test-room';
            const player = { id: 'player-123', name: 'TestPlayer' };

            await lobbyService.createRoom(roomId, player);

            expect(mockRedisClient.hSet).toHaveBeenCalledWith(
                `${REDIS_KEYS.GAME_PREFIX}${roomId}`,
                expect.objectContaining({
                    players: expect.any(String),
                    isPlaying: 'false'
                })
            );
        });

        test('devrait marquer le premier joueur comme leader', async () => {
            const roomId = 'test-room';
            const player = { id: 'player-123', name: 'TestPlayer' };

            await lobbyService.createRoom(roomId, player);

            const playersData = JSON.parse(mockRedisClient.hSet.mock.calls[0][1].players);
            expect(playersData[0].isLeader).toBe(true);
        });
    });

    describe('Gestion des joueurs', () => {
        test('devrait permettre à un joueur de rejoindre une room existante', async () => {
            mockRedisClient.exists.mockResolvedValue(true);
            mockRedisClient.hGetAll.mockResolvedValue({
                players: JSON.stringify([{ id: 'player-1', name: 'Player1', isLeader: true }]),
                isPlaying: 'false'
            });

            const roomId = 'test-room';
            const player = { id: 'player-2', name: 'Player2' };

            const result = await lobbyService.joinGame(roomId, player);

            expect(result).toBeDefined();
            expect(result.roomId).toBe(roomId);
            expect(mockRedisClient.hSet).toHaveBeenCalled();
        });

        test('devrait refuser l\'ajout si la room est pleine', async () => {
            const fullPlayers = Array(MAX_PLAYERS).fill().map((_, i) => ({
                socketId: `player-${i}`,
                name: `Player${i}`,
                isLeader: i === 0
            }));

            mockRedisClient.exists.mockResolvedValue(true);
            mockRedisClient.hGetAll.mockResolvedValue({
                players: JSON.stringify(fullPlayers),
                isPlaying: 'false'
            });

            const roomId = 'test-room';
            const player = { id: 'player-new', name: 'NewPlayer' };

            await expect(lobbyService.joinGame(roomId, player)).rejects.toThrow('Room is full');
        });

        test('devrait supprimer un joueur de la room', async () => {
            const players = [
                { socketId: 'player-1', name: 'Player1', isLeader: true },
                { socketId: 'player-2', name: 'Player2', isLeader: false }
            ];

            mockRedisClient.hGetAll.mockResolvedValue({
                players: JSON.stringify(players),
                isPlaying: 'false'
            });

            const roomId = 'test-room';
            const socketId = 'player-2';

            const result = await lobbyService.removePlayer(roomId, socketId);

            expect(result).toBeDefined();
            expect(mockRedisClient.hSet).toHaveBeenCalled();
        });
    });

    describe('État des rooms', () => {
        test('devrait récupérer l\'état d\'une room', async () => {
            const roomData = {
                players: JSON.stringify([{ id: 'player-1', name: 'Player1' }]),
                isPlaying: 'false',
                pieces: '[]',
                gameState: '{}'
            };

            mockRedisClient.hGetAll.mockResolvedValue(roomData);

            const roomId = 'test-room';
            const result = await lobbyService.getGameState(roomId);

            expect(result).toBeDefined();
            expect(result.roomId).toBe(roomId);
            expect(result.isPlaying).toBe(false);
            expect(mockRedisClient.hGetAll).toHaveBeenCalledWith(
                `${REDIS_KEYS.GAME_PREFIX}${roomId}`
            );
        });

        test('devrait récupérer le seed d\'une room', async () => {
            const expectedSeed = 'test-room-123456789';
            mockRedisClient.hGet.mockResolvedValue(expectedSeed);

            const roomId = 'test-room';
            const result = await lobbyService.getRoomSeed(roomId);

            expect(result).toBe(expectedSeed);
            expect(mockRedisClient.hGet).toHaveBeenCalledWith(
                `${REDIS_KEYS.GAME_PREFIX}${roomId}`,
                'seed'
            );
        });

        test('devrait vérifier si un joueur est leader', async () => {
            const gameState = {
                players: [
                    { id: 'player-1', name: 'Player1', isLeader: true },
                    { id: 'player-2', name: 'Player2', isLeader: false }
                ],
                isPlaying: false
            };

            // Mock getGameState to return our test data
            lobbyService.getGameState = jest.fn().mockResolvedValue(gameState);

            const result = await lobbyService.verifyLeader('test-room', 'player-1');
            expect(result).toBe(true);

            const result2 = await lobbyService.verifyLeader('test-room', 'player-2');
            expect(result2).toBe(false);
        });
    });
});