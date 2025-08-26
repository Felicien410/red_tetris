import { PIECE_COLORS } from '../config/constants';

<template>
  <!-- La partie template reste la même que précédemment -->
</template>

<script>
import { io } from 'socket.io-client';

export default {
  name: 'TetrisBoard',
  
  data() {
    return {
      socket: null,
      isConnected: false,
      isLoading: false,
      error: null,
      gameMessage: null,
      
      playerName: '',
      roomId: '',
      isLeader: false,
      
      board: Array(20).fill().map(() => Array(10).fill(0)),
      currentPiece: null,
      initialPiece: null,
      firstUpdateReceived: false,
      nextPiece: null,
      score: 0,
      level: 1,
      linesCleared: 0,
      isPlaying: false,
      isPaused: false,
      players: [],
      
      colors: PIECE_COLORS,
    }
  },

  computed: {
    canStartGame() {
      return this.isLeader && !this.isPlaying && this.players.length > 0 && !this.isLoading;
    },

    boardWithCurrentPiece() {
      if (!this.isPlaying) return this.board;
      
      const boardCopy = this.board.map(row => [...row]);
      
      if (this.currentPiece) {
        const { position, shape, type } = this.currentPiece;
        shape.forEach((row, y) => {
          row.forEach((cell, x) => {
            if (cell) {
              const boardY = position.y + y;
              const boardX = position.x + x;
              if (boardY >= 0 && boardY < 20 && boardX >= 0 && boardX < 10) {
                boardCopy[boardY][boardX] = type;
              }
            }
          });
        });
      }
      
      return boardCopy;
    }
  },

  watch: {
    isPlaying(newValue) {
      if (newValue) {
        this.gameMessage = 'La partie commence !';
        setTimeout(() => {
          this.gameMessage = null;
        }, 3000);
      }
    }
  },

  created() {
    window.addEventListener('keydown', this.handleKeyPress);
  },

  beforeDestroy() {
    window.removeEventListener('keydown', this.handleKeyPress);
    if (this.socket) {
      this.socket.disconnect();
    }
  },

  methods: {
    async connectToGame() {
      if (!this.playerName || !this.roomId || this.isLoading) return;
      
      this.isLoading = true;
      this.error = null;

      try {
        this.socket = io('http://localhost:3000');
        await this.setupSocketConnection();
        this.isConnected = true;
      } catch (error) {
        this.error = error.message || 'Erreur de connexion';
        this.socket = null;
      } finally {
        this.isLoading = false;
      }
    },

    setupSocketConnection() {
      return new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          this.socket.emit('init-player', {
            pseudo: this.playerName,
            room: this.roomId
          });
        });

        this.setupGameListeners();

        const timeout = setTimeout(() => {
          reject(new Error('Délai de connexion dépassé'));
        }, 5000);

        this.socket.on('joined-room', (data) => {
          clearTimeout(timeout);
          resolve(data);
        });

        this.socket.on('error', (error) => {
          reject(error);
        });
      });
    },

    setupGameListeners() {
      this.socket.on('room-update', (data) => {
        console.log('Room update received:', data);
        this.players = data.players;
        this.isPlaying = data.isPlaying;
        const currentPlayer = data.players.find(p => p.name === this.playerName);
        this.isLeader = currentPlayer?.isLeader || false;
      });

      this.socket.on('game-started', (data) => {
        console.log('Game started received:', data);
        this.firstUpdateReceived = false;
        this.initialPiece = data.gameState.currentPiece;
        this.board = data.gameState.board;
        this.currentPiece = data.gameState.currentPiece;
        this.nextPiece = data.gameState.nextPiece;
        this.score = data.gameState.score;
        this.level = data.gameState.level;
        this.linesCleared = data.gameState.linesCleared;
        this.isPlaying = true;
      });

      this.socket.on('game-update', (data) => {
        console.log('Game update received:', data);
        console.log('Current piece before update:', this.currentPiece?.type);
        
        if (!this.firstUpdateReceived && this.initialPiece) {
          data.gameState.currentPiece = {
            ...data.gameState.currentPiece,
            type: this.initialPiece.type,
            shape: this.initialPiece.shape
          };
          this.firstUpdateReceived = true;
        }

        this.board = data.gameState.board;
        this.currentPiece = data.gameState.currentPiece;
        this.nextPiece = data.gameState.nextPiece;
        this.score = data.gameState.score;
        this.level = data.gameState.level;
        this.linesCleared = data.gameState.linesCleared;

        console.log('Current piece after update:', this.currentPiece?.type);
      });

      this.socket.on('game-over', (data) => {
        this.gameMessage = `Partie terminée ! ${data.winner} a gagné !`;
        this.isPlaying = false;
      });
    },

    startGame() {
      if (!this.canStartGame) return;
      
      console.log('Starting game as leader:', this.playerName);
      this.isLoading = true;
      
      try {
        this.socket.emit('start-game', {
          room: this.roomId
        });
      } catch (error) {
        this.gameMessage = 'Erreur lors du démarrage de la partie';
        console.error('Start game error:', error);
      } finally {
        this.isLoading = false;
      }
    },

    handleKeyPress(event) {
      if (!this.isPlaying || this.isPaused) return;

      const keyActions = {
        'ArrowLeft': () => this.movePiece('left'),
        'ArrowRight': () => this.movePiece('right'),
        'ArrowDown': () => this.movePiece('down'),
        'ArrowUp': () => this.rotatePiece(),
        'Space': () => this.hardDrop()
      };

      if (keyActions[event.code]) {
        event.preventDefault();
        keyActions[event.code]();
      }
    },

    movePiece(direction) {
      this.socket.emit('move-piece', {
        direction,
        roomId: this.roomId
      });
    },

    rotatePiece() {
      this.socket.emit('rotate-piece', {
        roomId: this.roomId
      });
    },

    hardDrop() {
      this.socket.emit('hard-drop', {
        roomId: this.roomId
      });
    },

    pauseGame() {
      this.isPaused = !this.isPaused;
      this.socket.emit('toggle-pause', {
        roomId: this.roomId,
        isPaused: this.isPaused
      });
    },

    getCellClass(cell) {
      return {
        'cell': true,
        'filled': cell !== 0,
        [`piece-${cell}`]: cell !== 0
      };
    },

    getCellStyle(cell) {
      return cell !== 0 ? { backgroundColor: this.colors[cell] } : {};
    },

    getPreviewGrid() {
      if (!this.nextPiece) return Array(4).fill().map(() => Array(4).fill(0));
      return this.nextPiece.shape;
    }
  }
}
</script>

<style scoped>
.tetris-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
  min-height: 100vh;
}

.connection-panel {
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.game-layout {
  display: flex;
  gap: 20px;
}

.tetris-board {
  border: 2px solid #333;
  padding: 2px;
  background: #000;
}

.row {
  display: flex;
}

.cell {
  width: 30px;
  height: 30px;
  border: 1px solid #333;
  margin: 1px;
}

.filled {
  border-color: rgba(255, 255, 255, 0.2);
}

.next-piece-preview {
  background: rgba(0, 0, 0, 0.8);
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(4, 20px);
  gap: 2px;
  padding: 10px;
}

.preview-cell {
  width: 20px;
  height: 20px;
  border: 1px solid #333;
}

.stats {
  background: rgba(0, 0, 0, 0.8);
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin: 5px 0;
}

.players-list {
  background: rgba(0, 0, 0, 0.8);
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.players-list ul {
  list-style: none;
  padding: 0;
}

.players-list li {
  padding: 5px 0;
  display: flex;
  justify-content: space-between;
}

.current-player {
  color: #4CAF50;
}

.leader {
  font-weight: bold;
  color: #f0ad4e;
}

.game-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

button {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  color: #ff4444;
  margin-top: 10px;
}

.game-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 20px;
  border-radius: 8px;
  z-index: 1000;
}

.piece-I { background-color: #00f0f0; }
.piece-O { background-color: #f0f000; }
.piece-T { background-color: #a000f0; }
.piece-S { background-color: #00f000; }
.piece-Z { background-color: #f00000; }
.piece-J { background-color: #0000f0; }
.piece-L { background-color: #f0a000; }

.input-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.input-group input {
  padding: 8px;
  border: 1px solid #333;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.controls-info {
  color: #888;
  font-size: 0.9em;
  text-align: center;
  margin-top: 10px;
}

.room-info {
  font-size: 0.9em;
  color: #888;
  margin-bottom: 10px;
}
</style>