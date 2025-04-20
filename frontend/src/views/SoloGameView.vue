<!-- src/views/SoloGameView.vue -->
<!-- HTML -->
<template>
  <v-container class="solo-container" pa-0 fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" md="8" lg="6">
        <TetrisGrid :grid="displayBoard" />
      </v-col>

      <v-col
        cols="12"
        md="4"
        lg="3"
        class="d-flex flex-column align-center justify-start"
      >
        <v-btn
          class="mb-4 start-btn"
          @click="startGameClick"
          variant="elevated"
        >
          Start
        </v-btn>

        <v-card class="next-piece-card" outlined>
          <v-card-title
            class="text-h6 text-center"
            style="font-weight: bold; color: var(--text-color)"
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
                      :style="{
                        width: '20px',
                        height: '20px',
                        backgroundColor: cell
                          ? PIECE_COLORS[nextPiece.type]
                          : 'transparent',
                        border: cell
                          ? '1px solid #999'
                          : '1px solid transparent',
                      }"
                    ></td>
                  </tr>
                </tbody>
              </table>
              <span v-else>?</span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<!-- JavaScript -->
<script setup>
import { onMounted, onBeforeUnmount, computed } from "vue";
import { useSocket } from "@/middleware/useSocket.js";
import TetrisGrid from "@/components/TetrisGrid.vue";
import { PIECE_SHAPES, PIECE_COLORS } from "@/constants";

const {
  rawBoard,
  currentPiece,
  nextPiece,
  isConnected,
  connectToRoom,
  startGame,
  movePiece,
  rotatePiece,
  onGameStarted,
  onGameUpdate,
  resetGameState,
  disconnect,
} = useSocket();

const pseudo = localStorage.getItem("pseudo");
const room = `solo-${pseudo}`;

// Update board with game state
const displayBoard = computed(() => {
  console.log("Updating board");
  if (!rawBoard.value || !currentPiece.value) {
    return rawBoard.value;
  }
  // Clone the server's board state to avoid direct mutation
  const boardCopy = rawBoard.value.map((row) => [...row]);
  console.table(boardCopy.map((row) => row.join("")));
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

const handleKeyPress = (event) => {
  if (!currentPiece.value) return;
  switch (event.key) {
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
      rotatePiece("rotate");
      break;
    default:
      break;
  }
};

onMounted(async () => {
  console.log("🎯 SoloGameView mounted");
  try {
    await connectToRoom(room, pseudo);
    console.log("👋 Connected to room:", room);
  } catch (e) {
    alert(e.message);
  }

  onGameStarted((gameState) => {
    console.log("🚀 Game started:", gameState);
  });

  onGameUpdate((gameState) => {
    console.log("🕹️ Game update:", gameState);
  });

  window.addEventListener("keydown", handleKeyPress);
});

onBeforeUnmount(() => {
  console.log("👋 SoloGameView unmounted");
  disconnect();
  resetGameState();
  window.removeEventListener("keydown", handleKeyPress);
  console.log("👋 Disconnected from server");
});

const startGameClick = () => {
  startGame(room, pseudo);
  console.log("🚀 Game started");
};
</script>

<!-- CSS -->
<style scoped>
.solo-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.start-btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background-color: var(--secondary-color);
  color: var(--text-color);
  font-weight: bold;
  width: 200px;
  align-self: center;
  box-shadow: 0 8px 40px rgba(0, 255, 255, 0.2);
  transform: scale(1.02);
}
.start-btn:hover {
  box-shadow: 0 8px 40px rgba(0, 255, 255, 0.2);
  transform: scale(1.02);
}

.next-piece-card {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  overflow: hidden;
}

.next-piece-display {
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.next-piece-display table {
  border-collapse: collapse;
}
</style>
