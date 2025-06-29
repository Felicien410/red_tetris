import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock socket.io-client
const mockSocket = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  connected: true,
  id: 'test-socket-id'
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket)
}))

// Import after setting up mocks
const { useSocket } = await import('@/middleware/useSocket.js')

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock socket state
    mockSocket.connected = true
    mockSocket.id = 'test-socket-id'
  })

  describe('Socket connection management', () => {
    it('should provide socket instance and state', () => {
      const socketApi = useSocket()
      
      expect(socketApi.socket).toBeDefined()
      expect(socketApi.isConnected).toBeDefined()
      expect(socketApi.rawBoard).toBeDefined()
      expect(socketApi.currentPiece).toBeDefined()
      expect(socketApi.nextPiece).toBeDefined()
    })

    it('should provide multiplayer state', () => {
      const socketApi = useSocket()
      
      expect(socketApi.multiplayerState).toBeDefined()
      expect(socketApi.multiplayerState.value.myGameState).toBeDefined()
      expect(socketApi.multiplayerState.value.opponents).toBeDefined()
      expect(socketApi.multiplayerState.value.roomGameStates).toBeDefined()
    })

    it('should provide room state', () => {
      const socketApi = useSocket()
      
      expect(socketApi.roomState).toBeDefined()
      expect(socketApi.roomState.value.roomId).toBeNull()
      expect(socketApi.roomState.value.players).toEqual([])
      expect(socketApi.roomState.value.isPlaying).toBe(false)
    })
  })

  describe('Game functions', () => {
    it('should provide game control functions', () => {
      const socketApi = useSocket()
      
      expect(typeof socketApi.connectToRoom).toBe('function')
      expect(typeof socketApi.startGame).toBe('function')
      expect(typeof socketApi.movePiece).toBe('function')
      expect(typeof socketApi.rotatePiece).toBe('function')
      expect(typeof socketApi.fallPiece).toBe('function')
      expect(typeof socketApi.resetGameState).toBe('function')
      expect(typeof socketApi.disconnect).toBe('function')
    })

    it('should provide multiplayer functions', () => {
      const socketApi = useSocket()
      
      expect(typeof socketApi.joinRoom).toBe('function')
      expect(typeof socketApi.leaveRoom).toBe('function')
      expect(typeof socketApi.onRoomUpdate).toBe('function')
      expect(typeof socketApi.onPlayerJoined).toBe('function')
      expect(typeof socketApi.onPlayerLeft).toBe('function')
      expect(typeof socketApi.onPlayerDisconnected).toBe('function')
      expect(typeof socketApi.onMultiplayerUpdate).toBe('function')
      expect(typeof socketApi.onGameOver).toBe('function')
      expect(typeof socketApi.resetMultiplayerState).toBe('function')
    })
  })

  describe('Game state management', () => {
    it('should reset game state correctly', () => {
      const socketApi = useSocket()
      
      // Set some initial state
      socketApi.rawBoard.value = [[1, 1], [1, 1]]
      socketApi.currentPiece.value = { type: 'T' }
      socketApi.nextPiece.value = { type: 'I' }
      
      // Reset state
      socketApi.resetGameState()
      
      // Check that state is reset
      expect(socketApi.rawBoard.value).toEqual(
        Array.from({ length: 20 }, () => Array(10).fill(0))
      )
      expect(socketApi.currentPiece.value).toBeNull()
      expect(socketApi.nextPiece.value).toBeNull()
    })

    it('should reset multiplayer state correctly', () => {
      const socketApi = useSocket()
      
      // Set some initial multiplayer state
      socketApi.multiplayerState.value.myGameState.score = 1000
      socketApi.multiplayerState.value.opponents = [{ name: 'test' }]
      socketApi.multiplayerState.value.roomGameStates = [{ roomId: 'test' }]
      
      // Reset multiplayer state
      socketApi.resetMultiplayerState()
      
      // Check that multiplayer state is reset
      expect(socketApi.multiplayerState.value.myGameState.score).toBe(0)
      expect(socketApi.multiplayerState.value.opponents).toEqual([])
      expect(socketApi.multiplayerState.value.roomGameStates).toEqual([])
    })
  })

  describe('Socket events', () => {
    it('should emit move-piece event', () => {
      const socketApi = useSocket()
      
      // Set current piece to allow movement
      socketApi.currentPiece.value = { type: 'T' }
      
      socketApi.movePiece('left')
      
      expect(mockSocket.emit).toHaveBeenCalledWith('move-piece', { direction: 'left' })
    })

    it('should not emit move-piece when no current piece', () => {
      const socketApi = useSocket()
      
      // Ensure no current piece
      socketApi.currentPiece.value = null
      
      socketApi.movePiece('left')
      
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })

    it('should emit rotate-piece event', () => {
      const socketApi = useSocket()
      
      // Set current piece to allow rotation
      socketApi.currentPiece.value = { type: 'T' }
      
      socketApi.rotatePiece()
      
      expect(mockSocket.emit).toHaveBeenCalledWith('rotate-piece')
    })

    it('should emit fall-piece event', () => {
      const socketApi = useSocket()
      
      // Set current piece to allow falling
      socketApi.currentPiece.value = { type: 'T' }
      
      socketApi.fallPiece()
      
      expect(mockSocket.emit).toHaveBeenCalledWith('fall-piece')
    })

    it('should emit start-game event', () => {
      const socketApi = useSocket()
      
      socketApi.startGame('test-room', 'test-player')
      
      expect(mockSocket.emit).toHaveBeenCalledWith('start-game', { 
        roomId: 'test-room', 
        playerName: 'test-player' 
      })
    })

    it('should emit leave-room event', () => {
      const socketApi = useSocket()
      
      // Set initial room state
      socketApi.roomState.value.roomId = 'test-room'
      
      socketApi.leaveRoom()
      
      expect(mockSocket.emit).toHaveBeenCalledWith('leave-room', { roomId: 'test-room' })
      expect(socketApi.roomState.value.roomId).toBeNull()
    })
  })

  describe('Room connection', () => {
    it('should handle connectToRoom', async () => {
      const socketApi = useSocket()
      
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
      
      const result = await socketApi.connectToRoom('test-room', 'test-player')
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/test-room/test-player',
        { method: 'POST' }
      )
      expect(mockSocket.emit).toHaveBeenCalledWith('init-player', {
        room: 'test-room',
        pseudo: 'test-player'
      })
    })

    it('should handle connectToRoom errors', async () => {
      const socketApi = useSocket()
      
      // Mock fetch error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Room full' })
      })
      
      await expect(socketApi.connectToRoom('test-room', 'test-player'))
        .rejects.toThrow('Room full')
    })
  })
})