<!-- src/views/MultiplayerView.vue -->
<template>
  <v-container class="multiplayer-container" pa-0 fluid>
    <!-- Room Lobby State -->
    <div v-if="!isGameStarted" class="lobby-container">
      <!-- Back Navigation -->
      <div class="back-navigation">
        <v-btn
          icon
          size="large"
          @click="goHome"
          class="back-btn"
        >
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
      </div>
      
      <!-- Main Lobby Content -->
      <div class="lobby-content">
        <v-row justify="center">
          <v-col cols="12" md="8" lg="6">
          <v-card class="lobby-card pa-8" outlined>
            <v-card-title
              class="text-h4 text-center mb-6"
              style="color: var(--text-color)"
            >
              {{ roomId ? "Room: " + roomId : "Join or Create Room" }}
            </v-card-title>

            <!-- Player Name Display -->
            <div v-if="!roomId" class="text-center mb-4">
              <p
                class="text-subtitle-1"
                style="color: var(--text-color); opacity: 0.8"
              >
                Playing as: <strong>{{ pseudo }}</strong>
              </p>
              <p
                class="text-caption"
                style="color: var(--text-color); opacity: 0.6"
              >
                (Set from Home page)
              </p>
            </div>

            <!-- Room Join/Create Section -->
            <div v-if="!roomId" class="room-setup mb-8">
              <div class="room-input-container mb-6">
                <v-text-field
                  v-model="roomInput"
                  label="Room ID (leave empty to create random room)"
                  outlined
                  class="custom-text-field"
                  dense
                  @keyup.enter="joinOrCreateRoom"
                />
              </div>
              <div class="d-flex flex-column mb-4 button-group">
                <v-btn
                  class="room-action-btn"
                  @click="joinOrCreateRoom"
                  :disabled="!roomInput"
                  block
                >
                  Join Room
                </v-btn>
                <v-btn class="room-action-btn" @click="createNewRoom" block>
                  Create New Room
                </v-btn>
                <v-btn class="room-action-btn" @click="fetchActiveRooms" block>
                  Refresh Room List
                </v-btn>
              </div>
            </div>

            <!-- Active Rooms List -->
            <div
              v-if="!roomId && activeRooms.length > 0"
              class="active-rooms mb-6"
            >
              <div class="section-header mb-4">
                <v-icon class="section-icon mr-2">mdi-home-group</v-icon>
                <h4 class="section-title">
                  Active Rooms ({{ activeRooms.length }})
                </h4>
              </div>
              
              <div class="rooms-grid">
                <v-card
                  v-for="room in activeRooms"
                  :key="room.roomId"
                  class="room-card"
                  @click="joinSpecificRoom(room.roomId)"
                  :class="{
                    'room-disabled': room.isPlaying || room.playerCount >= room.maxPlayers
                  }"
                  outlined
                >
                  <v-card-text class="room-content">
                    <!-- Room Header -->
                    <div class="room-header">
                      <div class="room-info">
                        <v-icon class="room-icon mr-2">mdi-door-open</v-icon>
                        <span class="room-name">{{ room.roomId }}</span>
                      </div>
                      <v-chip
                        :color="
                          room.isPlaying
                            ? 'error'
                            : room.playerCount >= room.maxPlayers
                              ? 'warning'
                              : 'secondary'
                        "
                        size="small"
                        class="status-chip"
                      >
                        {{ room.playerCount }}/{{ room.maxPlayers }}
                      </v-chip>
                    </div>
                    
                    <!-- Room Status -->
                    <div class="room-status">
                      <v-icon 
                        class="status-icon mr-1"
                        :color="
                          room.isPlaying
                            ? 'error'
                            : room.playerCount >= room.maxPlayers
                              ? 'warning'
                              : 'success'
                        "
                      >
                        {{
                          room.isPlaying
                            ? 'mdi-play-circle'
                            : room.playerCount >= room.maxPlayers
                              ? 'mdi-lock'
                              : 'mdi-clock-time-four'
                        }}
                      </v-icon>
                      <span class="status-text">
                        {{
                          room.isPlaying
                            ? "Playing"
                            : room.playerCount >= room.maxPlayers
                              ? "Full"
                              : "Waiting"
                        }}
                      </span>
                    </div>
                    
                    <!-- Players List -->
                    <div class="room-players">
                      <v-icon class="players-icon mr-1">mdi-account-multiple</v-icon>
                      <span class="players-list">
                        {{ room.players.map((p) => p.name).join(", ") }}
                      </span>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </div>

            <!-- No Active Rooms Message -->
            <div
              v-if="!roomId && activeRooms.length === 0 && roomsLoaded"
              class="no-rooms mb-6"
            >
              <p
                class="text-center"
                style="color: var(--text-color); opacity: 0.7"
              >
                No active rooms found. Create a new room to start playing!
              </p>
            </div>

            <!-- Players List -->
            <div v-if="roomId" class="players-section">
              <h3 class="text-h5 mb-4" style="color: var(--text-color)">
                Players ({{ players.length }}/{{ maxPlayers }})
              </h3>
              <v-list class="players-list">
                <v-list-item
                  v-for="player in players"
                  :key="player.name"
                  class="player-item"
                >
                  <template v-slot:prepend>
                    <v-icon class="player-list-icon">mdi-account</v-icon>
                  </template>
                  
                  <v-list-item-title class="player-name">
                    {{ player.name }}
                    <v-icon
                      v-if="player.isLeader"
                      class="leader-crown ml-2"
                      color="warning"
                    >
                      mdi-crown
                    </v-icon>
                  </v-list-item-title>
                </v-list-item>
              </v-list>

              <!-- Game Controls -->
              <div class="game-controls mt-6">
                <v-btn
                  v-if="isLeader && players.length >= 2"
                  class="start-btn"
                  @click="startMultiplayerGame"
                  variant="elevated"
                  block
                >
                  Start Game
                </v-btn>
                <v-btn
                  class="leave-btn mt-3"
                  @click="leaveRoomHandler"
                  variant="outlined"
                  block
                >
                  Leave Room
                </v-btn>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>
      </div>
    </div>

    <!-- Game State -->
    <div v-else class="game-container">
      <div class="game-layout">
        <!-- Player 1 Section -->
        <div class="player-section">
          <div class="player-header">
            <v-icon class="player-icon">mdi-account</v-icon>
            <span class="player-name">{{ currentPlayer?.name }} (You)</span>
            <v-icon class="score-icon">mdi-star</v-icon>
            <span class="score-value">{{ score }}</span>
          </div>
          <div class="grid-container">
            <TetrisGrid
              :grid="myGameState.board"
              :currentPiece="myGameState.currentPiece"
              :clearedLinesInfo="clearedLinesInfo"
              :isCurrentPlayer="true"
            />
          </div>
        </div>

        <!-- Center Controls -->
        <div class="center-controls">
          <!-- Next Piece -->
          <v-card class="next-piece-card pa-4 mb-4" outlined>
            <v-card-title
              class="text-h6 text-center mb-3"
              style="color: var(--text-color)"
            >
              <v-icon class="mr-2">mdi-cube-outline</v-icon>
              Next Piece
            </v-card-title>
            <v-card-text class="d-flex align-center justify-center">
              <div class="next-piece-display">
                <table v-if="nextPiece">
                  <tbody>
                    <tr
                      v-for="(row, rowIndex) in PIECE_SHAPES[nextPiece.type]"
                      :key="rowIndex"
                    >
                      <td
                        v-for="(cell, cellIndex) in row"
                        :key="cellIndex"
                        :class="[
                          'next-cell',
                          cell ? 'filled filled-' + nextPiece.type : 'empty',
                        ]"
                      ></td>
                    </tr>
                  </tbody>
                </table>
                <span v-else>?</span>
              </div>
            </v-card-text>
          </v-card>

          <!-- Leave Game Button -->
          <v-btn
            class="leave-btn"
            @click="leaveGame"
            variant="outlined"
            size="large"
            block
          >
            <v-icon class="mr-2">mdi-exit-to-app</v-icon>
            Leave Game
          </v-btn>
        </div>

        <!-- Player 2 Section -->
        <div class="player-section" v-if="opponentData">
          <div class="player-header">
            <v-icon class="player-icon">mdi-account</v-icon>
            <span class="player-name">{{ opponentData.name }}</span>
            <v-icon class="score-icon">mdi-star</v-icon>
            <span class="score-value">{{ opponentData.score }}</span>
          </div>
          <div class="grid-container">
            <TetrisGrid
              :grid="opponentData.board"
              :currentPiece="opponentData.currentPiece"
              :clearedLinesInfo="opponentData.clearedLinesInfo"
              :isCurrentPlayer="false"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Game Over Modal -->
    <v-dialog v-model="showGameOverModal" max-width="500" persistent>
      <v-card class="game-over-card">
        <v-card-title class="text-h6 text-center game-over-title">
          🎮 {{ gameOverMessage }}
        </v-card-title>
        <v-card-text class="text-center game-over-text font-weight-bold">
          Play Again?
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-btn @click="goToLobby"> Back to Lobby </v-btn>
          <v-btn @click="goHome">Home</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { onMounted, onBeforeUnmount, computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useSocket } from "@/middleware/useSocket.js";
import TetrisGrid from "@/components/TetrisGrid.vue";
import { PIECE_SHAPES } from "@/constants";

const router = useRouter();
const {
  multiplayerState,
  isConnected,
  roomState,
  connectToRoom,
  startGame,
  movePiece,
  rotatePiece,
  fallPiece,
  onGameStarted,
  onGameUpdate,
  resetGameState,
  resetMultiplayerState,
  disconnect,
  joinRoom,
  leaveRoom,
  onRoomUpdate,
  onPlayerJoined,
  onPlayerLeft,
  onPlayerDisconnected,
  onMultiplayerUpdate,
  socket,
} = useSocket();

// Room and player management
const pseudo = localStorage.getItem("pseudo");
const roomInput = ref("");
const roomId = ref(null);
const players = ref([]);
const maxPlayers = 2;
const isLeader = ref(false);
const currentPlayer = ref(null);
const activeRooms = ref([]);
const roomsLoaded = ref(false);

// Game state
const isGameStarted = ref(false);
const clearedLinesInfo = ref(null);
const showGameOverModal = ref(false);
const gameOverMessage = ref("");

// Computed properties for multiplayer state
const myGameState = computed(() => multiplayerState.value.myGameState);
const opponents = computed(() => multiplayerState.value.opponents);
const score = computed(() => myGameState.value.score);
const nextPiece = computed(() => myGameState.value.nextPiece);


// Opponent data - get first opponent with complete game state
const opponentData = computed(() => {
  const firstOpponent = opponents.value[0];
  if (!firstOpponent) return null;
  
  // Find the full game state for this opponent
  const opponentGameState = multiplayerState.value.roomGameStates.find(
    gameState => gameState.playerId === firstOpponent.playerId
  );
  
  return {
    name: firstOpponent.playerName,
    board: firstOpponent.board,
    currentPiece: opponentGameState?.gameState.currentPiece || null,
    score: firstOpponent.score,
    clearedLinesInfo: null, // Will be handled separately if needed
  };
});

// Room management functions
const fetchActiveRooms = async () => {
  try {
    const response = await fetch("http://localhost:3000/api/rooms");
    const data = await response.json();
    activeRooms.value = data.rooms || [];
    roomsLoaded.value = true;
    console.log("📋 Fetched active rooms:", activeRooms.value);
  } catch (error) {
    console.error("Failed to fetch active rooms:", error);
    activeRooms.value = [];
    roomsLoaded.value = true;
  }
};

const joinOrCreateRoom = async () => {
  if (!roomInput.value) {
    alert("Please enter a room ID to join");
    return;
  }

  try {
    await connectToRoom(roomInput.value, pseudo);
    roomId.value = roomInput.value;
    console.log("✅ Joined room:", roomInput.value);
  } catch (e) {
    if (e.message.includes("already taken")) {
      alert(
        `The player name "${pseudo}" is already taken in this room. Please use a different name or wait for the other player to leave.`,
      );
    } else {
      alert(e.message);
    }
  }
};

const createNewRoom = async () => {
  try {
    const newRoomId = `room-${Math.random().toString(36).substr(2, 9)}`;
    await connectToRoom(newRoomId, pseudo);
    roomId.value = newRoomId;
    console.log("✅ Created new room:", newRoomId);
  } catch (e) {
    alert(e.message);
  }
};

const joinSpecificRoom = async (roomIdToJoin) => {
  try {
    await connectToRoom(roomIdToJoin, pseudo);
    roomId.value = roomIdToJoin;
    console.log("✅ Joined specific room:", roomIdToJoin);
  } catch (e) {
    if (e.message.includes("already taken")) {
      alert(
        `The player name "${pseudo}" is already taken in this room. Please use a different name or wait for the other player to leave.`,
      );
    } else {
      alert(e.message);
    }
  }
};

const leaveRoomHandler = () => {
  leaveRoom();
  disconnect();
  resetGameState();
  resetMultiplayerState();
  roomId.value = null;
  players.value = [];
  isGameStarted.value = false;
  isLeader.value = false;
  currentPlayer.value = null;
};

const startMultiplayerGame = () => {
  if (isLeader.value && players.value.length >= 2) {
    startGame(roomId.value, pseudo);
  }
};

const leaveGame = () => {
  leaveRoomHandler();
};

const goToLobby = () => {
  showGameOverModal.value = false;
  isGameStarted.value = false;
  resetGameState();
  resetMultiplayerState();
};

const goHome = () => {
  leaveRoomHandler();
  router.push("/");
};

// Keyboard handling
const handleKeyPress = (event) => {
  if (!myGameState.value.currentPiece || !isGameStarted.value) return;

  switch (event.code) {
    case "ArrowLeft":
      movePiece("left");
      break;
    case "ArrowRight":
      movePiece("right");
      break;
    case "ArrowDown":
      movePiece("down");
      break;
    case "ArrowUp":
      rotatePiece();
      break;
    case "Space":
      event.preventDefault();
      fallPiece();
      break;
  }
};

// Socket event handlers
const setupSocketHandlers = () => {
  // Room updates
  onRoomUpdate((data) => {
    console.log("🏠 Room update:", data);
    players.value = data.players;
    currentPlayer.value = data.players.find((p) => p.name === pseudo);
    isLeader.value = currentPlayer.value?.isLeader || false;
  });

  // Game started
  onGameStarted((gameState) => {
    console.log("🚀 Multiplayer game started:", gameState);
    isGameStarted.value = true;
  });

  // Game updates (individual player updates)
  onGameUpdate((gameState) => {
    console.log("🕹️ Individual game update:", gameState);

    // Handle line clearing animation
    if (gameState.linesClearedInfo && gameState.linesClearedInfo.count > 0) {
      clearedLinesInfo.value = {
        count: gameState.linesClearedInfo.count,
        rowIndices: gameState.linesClearedInfo.rowIndices,
        timestamp: Date.now(),
      };

      setTimeout(() => {
        clearedLinesInfo.value = null;
      }, 1000);
    }

    // Handle game over
    if (gameState.gameState.gameOver) {
      gameOverMessage.value = "Game Over";
      showGameOverModal.value = true;
    }
  });

  // Multiplayer room updates (all players' game states)
  onMultiplayerUpdate((roomData) => {
    console.log("🎮 Multiplayer room update:", roomData);
    
    // Check if any player has game over to show appropriate message
    const anyPlayerGameOver = roomData.gameStates?.some(
      (gameState) => gameState.gameState.gameOver
    );
    
    if (anyPlayerGameOver && myGameState.value.gameOver) {
      gameOverMessage.value = "Game Over";
      showGameOverModal.value = true;
    }
  });

  // Player disconnected
  onPlayerDisconnected((data) => {
    console.log("👋 Player disconnected:", data);
    if (isGameStarted.value) {
      gameOverMessage.value = "Opponent disconnected!";
      showGameOverModal.value = true;
    }
  });
};

// Component lifecycle
onMounted(() => {
  console.log("🎯 MultiplayerView mounted");
  setupSocketHandlers();
  fetchActiveRooms();
  window.addEventListener("keydown", handleKeyPress);
});

onBeforeUnmount(() => {
  console.log("👋 MultiplayerView unmounted");
  leaveRoomHandler();
  window.removeEventListener("keydown", handleKeyPress);
});
</script>

<style scoped>
.multiplayer-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden; /* Prevent scrolling */
}

.lobby-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.back-navigation {
  position: absolute;
  top: 2rem;
  left: 2rem;
  z-index: 10;
}

.back-btn {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: var(--secondary-color) !important;
  transform: translateX(-2px);
}

.lobby-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lobby-card {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.game-container {
  width: 100%;
  height: 100vh;
  padding: 0;
  overflow: hidden;
}

.game-layout {
  display: flex;
  height: 100vh;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 1rem;
}

.player-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 500px;
  height: 100%;
}

.player-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  backdrop-filter: blur(8px);
}

.player-icon {
  font-size: 1.5rem;
  color: white !important;
}

.player-name {
  color: var(--text-color);
  font-weight: bold;
  font-size: 1.1rem;
  margin-right: 1rem;
}

.score-icon {
  font-size: 1.2rem;
  color: white !important;
}

.score-value {
  color: var(--text-color);
  font-weight: bold;
  font-size: 1.1rem;
}

.grid-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh; /* Fixed percentage height for grids */
}

.center-controls {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  min-width: 200px;
  max-width: 250px;
}

/* Make all icons white */
.v-icon {
  color: white !important;
}

/* Section Header */
.section-header {
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-icon {
  color: var(--secondary-color) !important;
  font-size: 1.5rem;
}

.section-title {
  color: var(--text-color);
  font-weight: bold;
  margin: 0;
}

/* Rooms Grid */
.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.room-card {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.room-card:hover:not(.room-disabled) {
  background: rgba(255, 255, 255, 0.15) !important;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.room-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.room-disabled:hover {
  transform: none !important;
  box-shadow: none !important;
}

.room-content {
  padding: 1rem !important;
}

/* Room Header */
.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.room-info {
  display: flex;
  align-items: center;
}

.room-icon {
  color: var(--secondary-color) !important;
  font-size: 1.2rem;
}

.room-name {
  color: var(--text-color);
  font-weight: bold;
  font-size: 1.1rem;
}

/* Room Status */
.room-status {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.status-icon {
  font-size: 1rem;
}

.status-text {
  color: var(--text-color);
  font-weight: 500;
  font-size: 0.9rem;
}

/* Room Players */
.room-players {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.players-icon {
  color: var(--text-color) !important;
  opacity: 0.7;
  font-size: 1rem;
  line-height: 1;
}

.room-players .players-list {
  color: var(--text-color);
  opacity: 0.8;
  font-size: 0.85rem;
  line-height: 1.2;
}

/* Legacy styles for players section */
.lobby-card .players-list {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 8px;
}

.player-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.player-item:last-child {
  border-bottom: none;
}

.player-name {
  color: var(--text-color);
  font-weight: bold;
}

.player-list-icon {
  color: var(--secondary-color) !important;
  font-size: 1.2rem;
  margin-right: 0.5rem;
}

.leader-crown {
  font-size: 1rem !important;
  vertical-align: middle;
}

/* Room input styling to match HomeView */
.room-input-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.custom-text-field :deep(.v-field) {
  background-color: var(--text-color);
  color: var(--primary-plain);
  font-weight: bold;
  border-radius: 8px;
}

/* Button group spacing */
.button-group {
  gap: 16px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .room-input-container {
    max-width: 100%;
    padding: 0 16px;
  }

  .room-action-btn,
  .start-btn {
    min-height: 44px;
    font-size: 14px;
  }

  .button-group {
    gap: 12px;
  }
}

.leave-btn {
  background-color: #ff6b6b !important;
  color: white !important;
}

.next-piece-card,
.game-info {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.next-piece-display {
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.next-piece-display table {
  border-collapse: collapse;
}

.next-cell {
  width: 16px;
  height: 16px;
}

.next-cell.filled {
  border-radius: 3px;
  box-shadow:
    inset 0 2px 3px rgba(255, 255, 255, 0.3),
    inset 0 -2px 3px rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.4);
}

.next-cell.filled-I {
  background: linear-gradient(to bottom right, #00f0f0, #00cccc);
}
.next-cell.filled-O {
  background: linear-gradient(to bottom right, #ffff66, #e6e600);
}
.next-cell.filled-T {
  background: linear-gradient(to bottom right, #a000f0, #8000cc);
}
.next-cell.filled-S {
  background: linear-gradient(to bottom right, #00cc66, #00994d);
}
.next-cell.filled-Z {
  background: linear-gradient(to bottom right, #f00000, #cc0000);
}
.next-cell.filled-J {
  background: linear-gradient(to bottom right, #0000f0, #0000cc);
}
.next-cell.filled-L {
  background: linear-gradient(to bottom right, #ff9900, #cc7a00);
}

.game-over-card {
  background-color: var(--primary-plain);
  border: 4px solid white;
  border-radius: 16px !important;
  color: white;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
}

.game-over-title,
.game-over-text {
  color: var(--text-color);
}

.score-display {
  margin-top: 8px;
}

@media (max-width: 768px) {
  .game-container {
    padding: 8px;
  }

  .player-board {
    margin-bottom: 16px;
  }
}
</style>
