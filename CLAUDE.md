# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Red Tetris is a multiplayer real-time Tetris game built with JavaScript, Vue.js, and Socket.io. The project consists of a Node.js backend server and a Vue.js frontend client that communicate via WebSocket connections.

## Development Commands

### Backend (Node.js)
Navigate to the `backend/` directory:
- `npm run dev` - Start development server with nodemon (auto-restart)
- `npm start` - Start production server
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Frontend (Vue.js)
Navigate to the `frontend/` directory:
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Architecture

### Backend Structure
- **Server Entry Point**: `backend/src/server.js` - Main TetrisServer class handling Express app, Socket.io, and Redis
- **Game Logic**: `backend/src/classes/Game.js` - Core Tetris game mechanics (piece movement, collision detection, line clearing)
- **Piece Management**: `backend/src/classes/Piece.js` - Tetris piece shapes and rotations
- **Player Management**: `backend/src/classes/Player.js` - Player state and properties
- **Services**:
  - `gameLogicService.js` - Manages game instances and player actions
  - `lobbyService.js` - Handles room creation and player management
- **Configuration**: `backend/src/config/constants.js` - Game constants and Redis keys
- **Utilities**: `backend/src/utils/helpers.js` - Server setup helpers and utilities

### Frontend Structure
- **Main App**: `frontend/src/App.vue` - Root component with router view
- **Socket Management**: `frontend/src/middleware/useSocket.js` - WebSocket communication layer
- **Components**: 
  - `TetrisGrid.vue` - Game board rendering
  - `HelloWorld.vue` - Welcome/landing component
- **Views**:
  - `HomeView.vue` - Main menu and room creation
  - `SoloGameView.vue` - Game interface
- **Router**: `frontend/src/router/index.js` - Vue Router configuration
- **Plugins**: Vuetify UI framework and web font loader

### Key Technologies
- **Backend**: Express.js, Socket.io, Redis (for state persistence), Jest (testing)
- **Frontend**: Vue.js 3, Vuetify 3, Pinia (state management), Socket.io-client, Vite

### Game Architecture
- Each player has their own Game instance managed by GameLogicService
- Games are stored in a Map structure: `roomId -> Map<playerId, Game>`
- Deterministic piece generation using seed-based algorithm for consistency across players
- Real-time synchronization via Socket.io events (game-update, move-piece, rotate-piece, etc.)
- Redis stores room state, player data, and game configuration

### Socket Events
Key socket events for game communication:
- `init-player` - Initialize player in room
- `start-game` - Begin game session
- `move-piece` - Handle piece movement (left, right, down)
- `rotate-piece` - Rotate current piece
- `fall-piece` - Drop piece to bottom
- `game-started` - Broadcast game start to all players
- `game-update` - Broadcast game state changes

### Testing
- Backend tests located in `backend/tests/` with Jest
- Test coverage threshold: 70% statements, 50% branches, 70% functions/lines
- Test files follow `*_test.js` naming convention

### Development Notes
- Backend runs on port 3000 (configurable via PORT env var)
- Frontend development server runs on port 5173
- Redis connection via REDIS_URL env var (defaults to localhost:6379)
- Game uses deterministic piece generation for multiplayer consistency
- Docker support available with compose.yml in backend directory