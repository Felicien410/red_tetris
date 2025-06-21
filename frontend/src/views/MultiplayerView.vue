<!-- src/views/MultiplayerView.vue -->
<template>
  <v-container class="multiplayer-container" pa-0 fluid>
    <!-- Room Lobby State -->
    <div v-if="!isGameStarted" class="lobby-container">
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
              <h4 class="text-h6 mb-3" style="color: var(--text-color)">
                Active Rooms ({{ activeRooms.length }})
              </h4>
              <v-list class="rooms-list">
                <v-list-item
                  v-for="room in activeRooms"
                  :key="room.roomId"
                  class="room-item"
                  @click="joinSpecificRoom(room.roomId)"
                  :disabled="
                    room.isPlaying || room.playerCount >= room.maxPlayers
                  "
                >
                  <v-list-item-content>
                    <v-list-item-title class="room-title">
                      {{ room.roomId }}
                      <v-chip
                        :color="
                          room.isPlaying
                            ? 'error'
                            : room.playerCount >= room.maxPlayers
                              ? 'warning'
                              : 'success'
                        "
                        size="small"
                        class="ml-2"
                      >
                        {{ room.playerCount }}/{{ room.maxPlayers }}
                        {{
                          room.isPlaying
                            ? " (Playing)"
                            : room.playerCount >= room.maxPlayers
                              ? " (Full)"
                              : " (Waiting)"
                        }}
                      </v-chip>
                    </v-list-item-title>
                    <v-list-item-subtitle class="room-players">
                      Players: {{ room.players.map((p) => p.name).join(", ") }}
                    </v-list-item-subtitle>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
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
                  <v-list-item-content>
                    <v-list-item-title class="player-name">
                      {{ player.name }}
                      <v-chip
                        v-if="player.isLeader"
                        size="small"
                        color="primary"
                        class="ml-2"
                      >
                        Leader
                      </v-chip>
                    </v-list-item-title>
                  </v-list-item-content>
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

    <!-- Game State -->
    <div v-else class="game-container">
      <v-row align="start" justify="center">
        <!-- Player 1 Board -->
        <v-col cols="12" md="6" lg="5">
          <div class="player-board">
            <h3
              class="text-h6 text-center mb-2"
              style="color: var(--text-color)"
            >
              {{ currentPlayer?.name }} (You)
            </h3>
            <TetrisGrid
              :grid="displayBoard"
              :clearedLinesInfo="clearedLinesInfo"
              :isCurrentPlayer="true"
            />
            <div class="score-display mt-3 text-center">
              <span class="text-h6" style="color: var(--text-color)">
                Score: {{ score }}
              </span>
            </div>
          </div>
        </v-col>

        <!-- Player 2 Board -->
        <v-col cols="12" md="6" lg="5" v-if="opponentData">
          <div class="player-board">
            <h3
              class="text-h6 text-center mb-2"
              style="color: var(--text-color)"
            >
              {{ opponentData.name }}
            </h3>
            <TetrisGrid
              :grid="opponentData.board"
              :clearedLinesInfo="opponentData.clearedLinesInfo"
              :isCurrentPlayer="false"
            />
            <div class="score-display mt-3 text-center">
              <span class="text-h6" style="color: var(--text-color)">
                Score: {{ opponentData.score }}
              </span>
            </div>
          </div>
        </v-col>

        <!-- Game Info Panel -->
        <v-col cols="12" lg="2">
          <div class="game-info">
            <!-- Next Piece -->
            <v-card class="next-piece-card pa-3 mb-4" outlined>
              <v-card-title
                class="text-h6 text-center"
                style="color: var(--text-color)"
              >
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
              block
            >
              Leave Game
            </v-btn>
          </div>
        </v-col>
      </v-row>
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
  rawBoard,
  currentPiece,
  nextPiece,
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
  disconnect,
  joinRoom,
  leaveRoom,
  onRoomUpdate,
  onPlayerJoined,
  onPlayerLeft,
  onPlayerDisconnected,
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
const score = ref(0);
const opponentData = ref(null);
const clearedLinesInfo = ref(null);
const showGameOverModal = ref(false);
const gameOverMessage = ref("");

// Board display
const displayBoard = computed(() => {
  if (!rawBoard.value || !currentPiece.value || showGameOverModal.value) {
    return rawBoard.value;
  }

  const boardCopy = rawBoard.value.map((row) => [...row]);
  const { shape, position, type } = currentPiece.value;

  shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        const boardY = y + position.y;
        const boardX = x + position.x;
        if (
          boardY >= 0 &&
          boardY < boardCopy.length &&
          boardX >= 0 &&
          boardX < boardCopy[0].length
        ) {
          boardCopy[boardY][boardX] = type;
        }
      }
    });
  });
  return boardCopy;
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
  roomId.value = null;
  players.value = [];
  isGameStarted.value = false;
  isLeader.value = false;
  currentPlayer.value = null;
  opponentData.value = null;
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
};

const goHome = () => {
  leaveRoomHandler();
  router.push("/");
};

// Keyboard handling
const handleKeyPress = (event) => {
  if (!currentPiece.value || !isGameStarted.value) return;

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

  // Game updates
  onGameUpdate((gameState) => {
    console.log("🕹️ Multiplayer game update:", gameState);

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
    } else {
      score.value = gameState.gameState.score;
    }

    // Update opponent data (this would need backend support for multiplayer data)
    // For now, we'll simulate opponent data structure
    if (players.value.length > 1) {
      const opponent = players.value.find((p) => p.name !== pseudo);
      if (opponent) {
        opponentData.value = {
          name: opponent.name,
          board: rawBoard.value, // This should be opponent's board from backend
          score: 0, // This should be opponent's score from backend
          clearedLinesInfo: null,
        };
      }
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
  overflow-y: auto;
}

.lobby-container {
  width: 100%;
  height: 100%;
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
  height: 100%;
  padding: 16px;
}

.player-board {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.players-list,
.rooms-list {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 8px;
}

.player-item,
.room-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.player-item:last-child,
.room-item:last-child {
  border-bottom: none;
}

.room-item:hover:not(.v-list-item--disabled) {
  background-color: rgba(255, 255, 255, 0.1);
}

.room-item.v-list-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.player-name,
.room-title {
  color: var(--text-color);
  font-weight: bold;
}

.room-players {
  color: var(--text-color);
  opacity: 0.7;
  font-size: 0.9em;
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

/* Start button inherits same styling */
.start-btn {
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 12px !important;
  background-color: var(--secondary-color) !important;
  color: var(--text-color) !important;
  font-weight: bold;
  box-shadow: 0 8px 40px rgba(0, 255, 255, 0.2) !important;
  min-height: 48px;
  font-size: 16px;
  transition: all 0.3s ease !important;
}

.start-btn:hover {
  box-shadow: 0 8px 40px rgba(0, 255, 255, 0.3) !important;
  transform: scale(1.02) !important;
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
  border: 1px solid rgba(255, 100, 100, 0.5);
  color: #ff6b6b;
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
