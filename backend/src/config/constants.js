// src/config/constants.js
module.exports = {
  REDIS_KEYS: {
    GAME_PREFIX: 'game:',
    PLAYER_PREFIX: 'player:'
  },
  
  MAX_PLAYERS: 2,
  
  BOARD: {
    WIDTH: 10,
    HEIGHT: 20
  },
  
  GAME_SPEED: {
    INITIAL: 1000,
    SPEEDUP: 100,
    MIN: 100
  },
  
  POINTS: {
    SINGLE: 100,   // 1 ligne
    DOUBLE: 300,   // 2 lignes
    TRIPLE: 500,   // 3 lignes
    TETRIS: 800    // 4 lignes
  },
  
  PIECE_TYPES: ['I', 'O', 'T', 'S', 'Z', 'J', 'L'],
  
  PIECE_COLORS: {
    'I': '#00f0f0',
    'O': '#f0f000',
    'T': '#a000f0',
    'S': '#00f000',
    'Z': '#f00000',
    'J': '#0000f0',
    'L': '#f0a000'
  },

  PIECE_SHAPES: {
    'I': [[1, 1, 1, 1]],
    'O': [[1, 1], [1, 1]],
    'T': [[0, 1, 0], [1, 1, 1]],
    'S': [[0, 1, 1], [1, 1, 0]],
    'Z': [[1, 1, 0], [0, 1, 1]],
    'J': [[1, 0, 0], [1, 1, 1]],
    'L': [[0, 0, 1], [1, 1, 1]]
  },  

  EVENTS: {
    GAME_START: 'game:start',
    GAME_OVER: 'game:over',
    PIECE_MOVE: 'piece:move',
    PIECE_ROTATE: 'piece:rotate',
    LINES_CLEARED: 'lines:cleared',
    STATE_UPDATE: 'state:update',
    SPECTRUM_UPDATE: 'spectrum:update'
  }
};