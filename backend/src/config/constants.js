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