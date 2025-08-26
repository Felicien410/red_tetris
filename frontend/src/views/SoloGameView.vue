<!-- src/views/SoloGameView.vue -->
<!-- HTML -->
<template>
  <v-container class="solo-container" pa-0 fluid>
    <v-row align="center" justify="center">
      <!-- BOARD (vertical 1/2) -->
      <v-col cols="12" md="8" lg="6">
        <TetrisGrid :grid="displayBoard" :clearedLinesInfo="clearedLinesInfo" />
      </v-col>

      <!-- BUTTONS & DATA (vertical 2/2) -->
      <v-col
        cols="12"
        md="4"
        lg="3"
        class="d-flex flex-column align-center justify-center"
        style="gap: 16px"
      >
        <!-- SCORE -->
        <v-card
          class="next-piece-card pa-7"
          style="margin-bottom: 5rem"
          outlined
        >
          <v-card-title
            class="text-h4 text-center"
            style="font-weight: bold; color: var(--text-color)"
          >
            Score
          </v-card-title>
          <v-card-text
            class="d-flex align-center justify-center"
            style="height: 80px"
          >
            <div
              class="text-h3 font-weight-bold"
              style="color: var(--text-color)"
            >
              {{ score }}
            </div>
          </v-card-text>
        </v-card>
        <!-- BUTTON -->
        <v-btn
          class="mb-4 start-btn"
          @click="startGameClick"
          variant="elevated"
        >
          Start
        </v-btn>

        <!-- NEXT PIECE DISPLAY -->
        <v-card class="next-piece-card pa-1" outlined>
          <v-card-title
            class="text-h6 text-center"
            style="font-weight: bold; color: var(--text-color)"
          >
            Next Piece
          </v-card-title>
          <v-card-text class="d-flex align-center justify-center">
            <div class="next-piece-display">
              <div v-if="nextPiece" class="next-piece-grid">
                <div
                  v-for="(row, rowIndex) in PIECE_SHAPES[nextPiece.type]"
                  :key="rowIndex"
                  class="next-piece-row"
                >
                  <div
                    v-for="(cell, cellIndex) in row"
                    :key="cellIndex"
                    :class="[
                      'next-cell',
                      cell ? 'filled filled-' + nextPiece.type : 'empty',
                    ]"
                  ></div>
                </div>
              </div>
              <span v-else>?</span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <!-- Game Over Modal -->
    <v-dialog v-model="showGameOverModal" max-width="500" persistent>
      <v-card class="game-over-card">
        <v-card-title class="text-h6 text-center game-over-title"
          >🎮 Game Over</v-card-title
        >
        <v-card-text class="text-center game-over-text font-weight-bold">
          Play Again ?
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-btn
            @click="
              startGameClick();
              showGameOverModal = false;
            "
          >
            Restart!
          </v-btn>
          <v-btn @click="goHome">Home</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<!-- JavaScript -->
<script setup>
import { onMounted, onBeforeUnmount, computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useSocket } from "@/middleware/useSocket.js";
import TetrisGrid from "@/components/TetrisGrid.vue";
import { PIECE_SHAPES, PIECE_COLORS } from "@/constants";

const router = useRouter();
const {
  rawBoard,
  currentPiece,
  nextPiece,
  isConnected,
  connectToRoom,
  startGame,
  movePiece,
  rotatePiece,
  fallPiece,
  onGameStarted,
  onGameUpdate,
  resetGameState,
  disconnect,
} = useSocket();
const pseudo = localStorage.getItem("pseudo");
const room = `solo-${pseudo}`;
const score = ref(0);
const isGameOver = ref(false);
const showGameOverModal = ref(false);
const clearedLinesInfo = ref(null);

//\\ BOARD //\\
const displayBoard = computed(() => {
  // console.log("⚡ displayBoard re-evaluated");
  // console.log("rawBoard", rawBoard.value);
  // console.log("currentPiece", currentPiece.value);
  // console.log("isGameOver", isGameOver.value);
  if (!rawBoard.value || !currentPiece.value || isGameOver.value) {
    return rawBoard.value;
  }
  console.log("Updating board");
  // Clone the server's board state to avoid direct mutation
  const boardCopy = rawBoard.value.map((row) => [...row]);
  // console.table(boardCopy.map((row) => row.join("")));
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

//\\ KEYS //\\
const handleKeyPress = (event) => {
  if (!currentPiece.value) return;
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
      event.preventDefault(); // Prevent default spacebar behavior (clicking on button)
      fallPiece();
      break;
    default:
      break;
  }
};

//\\ LISTENERS //\\
onMounted(async () => {
  console.log("🎯 SoloGameView mounted");
  try {
    await connectToRoom(room, pseudo);
    console.log("✅ Connected to room:", room);
  } catch (e) {
    alert(e.message);
  }

  onGameStarted((gameState) => {
    console.log("🚀 Game started:", gameState);
  });

  onGameUpdate((gameState) => {
    // console.log("🕹️ Game update:", gameState);
    if (gameState.linesClearedInfo && gameState.linesClearedInfo.count > 0) {
      console.log("🎆 Lines cleared:", gameState.linesClearedInfo);
      clearedLinesInfo.value = {
        count: gameState.linesClearedInfo.count,
        rowIndices: gameState.linesClearedInfo.rowIndices,
        timestamp: Date.now(), // Pour forcer la réactivité
      };

      // Réinitialiser après l'animation
      setTimeout(() => {
        clearedLinesInfo.value = null;
      }, 1000);
    }

    if (gameState.gameState.gameOver) {
      isGameOver.value = true;
      currentPiece.value = null;
      showGameOverModal.value = true;
    } else {
      isGameOver.value = false;
      score.value = gameState.gameState.score;
    }
  });

  window.addEventListener("keydown", handleKeyPress);
});

onBeforeUnmount(() => {
  console.log("👋 SoloGameView unmounted");
  disconnect();
  resetGameState();
  isGameOver.value = false;
  window.removeEventListener("keydown", handleKeyPress);
  console.log("👋 Disconnected from server");
});

//\\ EVENTS //\\
const startGameClick = () => {
  startGame(room, pseudo);
};

const goHome = () => {
  showGameOverModal.value = false;
  router.push("/");
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
.next-piece-grid {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.next-piece-row {
  display: flex;
  gap: 1px;
}

.next-cell {
  width: 20px;
  height: 20px;
}

.next-cell.filled {
  border-radius: 4px;
  box-shadow:
    inset 0 2px 3px rgba(255, 255, 255, 0.3),
    inset 0 -2px 3px rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
}

.next-cell.filled::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.4),
    rgba(255, 255, 255, 0)
  );
  border-radius: 4px;
  pointer-events: none;
}

.next-cell.filled::after {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0.1) 100%
  );
  transform: rotate(25deg);
  animation: shine 2.5s infinite ease-in-out;
  pointer-events: none;
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

::v-deep(.v-overlay__scrim) {
  backdrop-filter: blur(8px);
  background-color: rgba(0, 0, 0, 0.4) !important;
  transition:
    backdrop-filter 0.5s ease,
    background-color 0.5s ease;
}

.game-over-title,
.game-over-text {
  color: var(--text-color);
}
</style>
