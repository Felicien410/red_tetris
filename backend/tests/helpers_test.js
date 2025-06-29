// tests/helpers_test.js
const {
    setupMiddlewares,
    setupDebugRoute,
    setupMainRoutes,
    setupSocketHandlers,
    startPlayerGameLoop,
    stopGameLoop,
    cleanupRoom,
    cleanupAllRooms,
    resetRoom
} = require('../src/utils/helpers');
const express = require('express');
const { REDIS_KEYS, MAX_PLAYERS } = require('../src/config/constants');

// Mock Redis client
const mockRedisClient = {
    hSet: jest.fn().mockResolvedValue(true),
    hGet: jest.fn().mockResolvedValue('[]'),
    hGetAll: jest.fn().mockResolvedValue({
        players: '[]',
        isPlaying: 'false'
    }),
    del: jest.fn().mockResolvedValue(true),
    keys: jest.fn().mockResolvedValue([]),
    exists: jest.fn().mockResolvedValue(true)
};

// Mock socket
const mockSocket = {
    id: 'test-socket-id',
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    roomId: null
};

// Mock server
const mockServer = {
    redisClient: mockRedisClient,
    io: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
    },
    gameIntervals: new Map(),
    connectedSockets: new Set(),
    gameLogicService: {
        createGame: jest.fn().mockResolvedValue({
            roomId: 'test-room',
            playerId: 'test-player',
            gameState: {
                board: Array(20).fill().map(() => Array(10).fill(0)),
                currentPiece: null,
                nextPiece: null,
                score: 0
            }
        }),
        handleMove: jest.fn().mockResolvedValue({
            playerUpdate: { gameState: { score: 100 } },
            roomUpdate: { roomId: 'test-room' }
        }),
        handleRotation: jest.fn().mockResolvedValue({
            playerUpdate: { gameState: { score: 100 } },
            roomUpdate: { roomId: 'test-room' }
        }),
        handleFall: jest.fn().mockResolvedValue({
            playerUpdate: { gameState: { score: 100 } },
            roomUpdate: { roomId: 'test-room' }
        }),
        games: new Map()
    },
    LobbyService: {
        createRoom: jest.fn().mockResolvedValue(true)
    }
};

describe('Helpers Utils', () => {
    beforeEach(() => {
        // Reset mocks
        Object.values(mockRedisClient).forEach(fn => fn.mockClear());
        mockServer.gameIntervals.clear();
        mockServer.connectedSockets.clear();
    });

    describe('Setup functions', () => {
        test('setupMiddlewares devrait configurer les middlewares Express', () => {
            const app = express();
            const originalUse = app.use;
            const useCalls = [];
            
            app.use = jest.fn((middleware) => {
                useCalls.push(middleware);
                return originalUse.call(app, middleware);
            });

            setupMiddlewares(app);

            expect(app.use).toHaveBeenCalled();
            expect(useCalls.length).toBeGreaterThan(0);
        });

        test('setupDebugRoute devrait ajouter la route de debug', () => {
            const app = express();
            app.get = jest.fn();

            setupDebugRoute(app, mockRedisClient);

            expect(app.get).toHaveBeenCalledWith('/debug/redis', expect.any(Function));
        });

        test('setupMainRoutes devrait configurer les routes principales', () => {
            const app = express();
            app.get = jest.fn();
            app.post = jest.fn();

            setupMainRoutes(app, mockRedisClient, new Set());

            expect(app.get).toHaveBeenCalledWith('/api/rooms', expect.any(Function));
            expect(app.get).toHaveBeenCalledWith('/:room/:player_name', expect.any(Function));
            expect(app.post).toHaveBeenCalledWith('/:room/:player_name', expect.any(Function));
        });
    });

    describe('Room management', () => {
        test('cleanupAllRooms devrait supprimer toutes les rooms', async () => {
            const roomKeys = [
                `${REDIS_KEYS.GAME_PREFIX}room-1`,
                `${REDIS_KEYS.GAME_PREFIX}room-2`
            ];

            mockRedisClient.keys.mockResolvedValue(roomKeys);

            await cleanupAllRooms(mockRedisClient);

            expect(mockRedisClient.keys).toHaveBeenCalledWith(`${REDIS_KEYS.GAME_PREFIX}*`);
            expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
            expect(mockRedisClient.del).toHaveBeenCalledWith(roomKeys[0]);
            expect(mockRedisClient.del).toHaveBeenCalledWith(roomKeys[1]);
        });

        test('resetRoom devrait remettre à zéro l\'état d\'une room', async () => {
            const roomId = 'test-room';
            const games = new Map();
            const playerGames = new Map();
            playerGames.set('player-1', { gameOver: true });
            games.set(roomId, playerGames);

            mockRedisClient.hGetAll.mockResolvedValue({
                players: '[]',
                isPlaying: 'true'
            });

            await resetRoom(roomId, mockServer, games);

            expect(mockRedisClient.hSet).toHaveBeenCalledWith(
                `${REDIS_KEYS.GAME_PREFIX}${roomId}`,
                'isPlaying',
                'false'
            );
            expect(games.has(roomId)).toBe(false);
        });
    });

    describe('Game intervals management', () => {
        test('devrait gérer les intervalles de jeu', () => {
            const roomId = 'test-room';
            const playerId = 'player-123';
            const intervalId = 'interval-123';

            // Simuler l'ajout d'un intervalle
            mockServer.gameIntervals.set(`${roomId}-${playerId}`, intervalId);

            expect(mockServer.gameIntervals.has(`${roomId}-${playerId}`)).toBe(true);
            expect(mockServer.gameIntervals.get(`${roomId}-${playerId}`)).toBe(intervalId);

            // Simuler la suppression
            mockServer.gameIntervals.delete(`${roomId}-${playerId}`);

            expect(mockServer.gameIntervals.has(`${roomId}-${playerId}`)).toBe(false);
        });
    });

    describe('Connected sockets management', () => {
        test('devrait gérer les sockets connectées', () => {
            const socketId = 'socket-123';

            // Ajouter une socket
            mockServer.connectedSockets.add(socketId);

            expect(mockServer.connectedSockets.has(socketId)).toBe(true);

            // Supprimer une socket
            mockServer.connectedSockets.delete(socketId);

            expect(mockServer.connectedSockets.has(socketId)).toBe(false);
        });
    });

    describe('Socket handlers', () => {
        beforeEach(() => {
            // Reset socket mock
            mockSocket.on.mockClear();
            mockSocket.emit.mockClear();
            mockSocket.join.mockClear();
            mockSocket.leave.mockClear();
            mockSocket.roomId = null;
        });

        test('setupSocketHandlers devrait configurer tous les gestionnaires d\'événements', () => {
            setupSocketHandlers(mockSocket, mockServer);

            expect(mockSocket.on).toHaveBeenCalledWith('init-player', expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('start-game', expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('move-piece', expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('rotate-piece', expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('fall-piece', expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('leave-room', expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
        });

        test('devrait gérer l\'événement init-player pour une nouvelle room', async () => {
            mockRedisClient.exists.mockResolvedValue(false);
            
            setupSocketHandlers(mockSocket, mockServer);
            
            // Simuler l'événement init-player
            const initPlayerHandler = mockSocket.on.mock.calls.find(call => call[0] === 'init-player')[1];
            
            await initPlayerHandler({
                pseudo: 'TestPlayer',
                room: 'test-room'
            });

            expect(mockServer.LobbyService.createRoom).toHaveBeenCalledWith('test-room', {
                id: 'test-socket-id',
                name: 'TestPlayer'
            });
            expect(mockSocket.join).toHaveBeenCalledWith('test-room');
            expect(mockSocket.roomId).toBe('test-room');
        });

        test('devrait gérer l\'événement init-player pour une room existante', async () => {
            mockRedisClient.exists.mockResolvedValue(true);
            mockRedisClient.hGetAll.mockResolvedValue({
                players: JSON.stringify([
                    { name: 'Player1', socketId: 'socket1', isLeader: true, blocksPlaced: 0 }
                ]),
                isPlaying: 'false'
            });
            
            setupSocketHandlers(mockSocket, mockServer);
            
            const initPlayerHandler = mockSocket.on.mock.calls.find(call => call[0] === 'init-player')[1];
            
            await initPlayerHandler({
                pseudo: 'TestPlayer',
                room: 'test-room'
            });

            expect(mockSocket.join).toHaveBeenCalledWith('test-room');
            expect(mockServer.connectedSockets.has('test-socket-id')).toBe(true);
        });

        test('devrait gérer l\'événement start-game', async () => {
            mockRedisClient.hGetAll.mockResolvedValue({
                players: JSON.stringify([
                    { name: 'Player1', socketId: 'test-socket-id', isLeader: true },
                    { name: 'Player2', socketId: 'socket2', isLeader: false }
                ]),
                isPlaying: 'false'
            });

            setupSocketHandlers(mockSocket, mockServer);
            
            const startGameHandler = mockSocket.on.mock.calls.find(call => call[0] === 'start-game')[1];
            
            await startGameHandler({
                room: 'test-room',
                playerName: 'Player1'
            });

            expect(mockServer.gameLogicService.createGame).toHaveBeenCalled();
            expect(mockRedisClient.hSet).toHaveBeenCalledWith(
                expect.stringContaining('test-room'),
                expect.objectContaining({
                    isPlaying: 'true'
                })
            );
        });

        test('devrait gérer l\'événement move-piece', async () => {
            mockSocket.roomId = 'test-room';
            
            setupSocketHandlers(mockSocket, mockServer);
            
            const movePieceHandler = mockSocket.on.mock.calls.find(call => call[0] === 'move-piece')[1];
            
            await movePieceHandler({
                direction: 'left'
            });

            expect(mockServer.gameLogicService.handleMove).toHaveBeenCalledWith(
                'test-room',
                'test-socket-id',
                'left'
            );
        });

        test('devrait gérer l\'événement rotate-piece', async () => {
            mockSocket.roomId = 'test-room';
            
            setupSocketHandlers(mockSocket, mockServer);
            
            const rotatePieceHandler = mockSocket.on.mock.calls.find(call => call[0] === 'rotate-piece')[1];
            
            await rotatePieceHandler({});

            expect(mockServer.gameLogicService.handleRotation).toHaveBeenCalledWith(
                'test-room',
                'test-socket-id'
            );
        });

        test('devrait gérer l\'événement fall-piece', async () => {
            mockSocket.roomId = 'test-room';
            
            setupSocketHandlers(mockSocket, mockServer);
            
            const fallPieceHandler = mockSocket.on.mock.calls.find(call => call[0] === 'fall-piece')[1];
            
            await fallPieceHandler({});

            expect(mockServer.gameLogicService.handleFall).toHaveBeenCalledWith(
                'test-room',
                'test-socket-id'
            );
        });

        test('devrait gérer l\'événement leave-room', async () => {
            mockSocket.roomId = 'test-room';
            
            setupSocketHandlers(mockSocket, mockServer);
            
            const leaveRoomHandler = mockSocket.on.mock.calls.find(call => call[0] === 'leave-room')[1];
            
            await leaveRoomHandler({
                roomId: 'test-room'
            });

            expect(mockSocket.leave).toHaveBeenCalledWith('test-room');
            expect(mockSocket.roomId).toBeNull();
        });

        test('devrait gérer l\'événement disconnect', async () => {
            mockSocket.roomId = 'test-room';
            mockServer.connectedSockets.add('test-socket-id');
            
            setupSocketHandlers(mockSocket, mockServer);
            
            const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
            
            await disconnectHandler();

            expect(mockServer.connectedSockets.has('test-socket-id')).toBe(false);
        });
    });

    describe('Game loop management', () => {
        test('startPlayerGameLoop devrait démarrer une boucle de jeu', (done) => {
            const mockGame = {
                gameOver: false,
                gameSpeed: 100 // Short timeout for testing
            };
            
            mockServer.gameLogicService.games.set('test-room', new Map([['player-123', mockGame]]));

            startPlayerGameLoop('test-room', 'player-123', mockServer);

            // Check after a small delay since the game loop is asynchronous
            setTimeout(() => {
                expect(mockServer.gameIntervals.has('test-room-player-123')).toBe(true);
                done();
            }, 50);
        });

        test('stopGameLoop devrait arrêter une boucle de jeu', () => {
            const mockTimeout = setTimeout(() => {}, 1000);
            mockServer.gameIntervals.set('test-room-player-123', mockTimeout);

            stopGameLoop('test-room', 'player-123', mockServer);

            expect(mockServer.gameIntervals.has('test-room-player-123')).toBe(false);
        });
    });

    describe('Room cleanup', () => {
        test('cleanupRoom devrait supprimer une room vide', async () => {
            mockRedisClient.hGetAll.mockResolvedValue({
                players: JSON.stringify([
                    { socketId: 'test-socket-id', name: 'Player1' }
                ])
            });

            await cleanupRoom('test-room', 'test-socket-id', mockServer);

            expect(mockRedisClient.del).toHaveBeenCalledWith(
                `${REDIS_KEYS.GAME_PREFIX}test-room`
            );
        });

        test('cleanupRoom devrait promouvoir un nouveau leader', async () => {
            mockRedisClient.hGetAll.mockResolvedValue({
                players: JSON.stringify([
                    { socketId: 'leader-socket', name: 'Leader', isLeader: true },
                    { socketId: 'player-socket', name: 'Player', isLeader: false }
                ]),
                isPlaying: 'false'
            });

            await cleanupRoom('test-room', 'leader-socket', mockServer);

            expect(mockRedisClient.hSet).toHaveBeenCalledWith(
                `${REDIS_KEYS.GAME_PREFIX}test-room`,
                'players',
                expect.stringContaining('"isLeader":true')
            );
        });

        test('cleanupRoom devrait gérer une victoire par forfait', async () => {
            mockRedisClient.hGetAll.mockResolvedValue({
                players: JSON.stringify([
                    { socketId: 'winner-socket', name: 'Winner' },
                    { socketId: 'loser-socket', name: 'Loser' }
                ]),
                isPlaying: 'true'
            });

            await cleanupRoom('test-room', 'loser-socket', mockServer);

            expect(mockServer.io.to).toHaveBeenCalledWith('winner-socket');
            expect(mockServer.io.emit).toHaveBeenCalledWith('game-over', 
                expect.objectContaining({
                    type: 'victory',
                    message: 'You Win!',
                    reason: 'Opponent disconnected'
                })
            );
        });
    });
});