<!-- src/views/SoloGameView.vue -->
<!-- HTML -->
<template>
  <v-container class="solo-container" pa-0 fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" md="8" lg="6">
        <TetrisGrid :grid="board" />
      </v-col>

      <v-col
        cols="12"
        md="4"
        lg="3"
        class="d-flex flex-column align-center justify-start"
      >
        <v-btn class="mb-4 start-btn" @click="startGame" variant="elevated">
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
import { onMounted, ref } from "vue";
import { io } from "socket.io-client";
import TetrisGrid from "@/components/TetrisGrid.vue";
import { PIECE_TYPES, PIECE_SHAPES, PIECE_COLORS } from "@/constants";

const socket = io("http://localhost:3000");
const pseudo = localStorage.getItem("pseudo");
const room = `solo-${pseudo}`;

// Grid for Tetris game
const createEmptyGrid = () =>
  Array.from({ length: 20 }, () => Array(10).fill(0));

const board = ref(createEmptyGrid());
const nextPiece = ref(null);
const currentPiece = ref(null);

// Start game function
const startGame = () => {
  socket.emit("start-game", { roomId: room, playerName: pseudo });
};

// Update board with game state
function updateBoard(gameState) {
  console.log("Updating board");
  // Clone the server's board state to avoid direct mutation
  const newBoard = gameState.gameState.board.map((row) => [...row]);
  console.log("🚀 Current piece placement:");
  console.table(newBoard.map((row) => row.join("")));
  const { shape, position, type } = gameState.gameState.currentPiece;
  console.log("🧱 Shape:", shape);
  shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        const boardY = y + position.y;
        const boardX = x + position.x;
        if (
          boardY >= 0 &&
          boardY < newBoard.length &&
          boardX >= 0 &&
          boardX < newBoard[0].length
        ) {
          newBoard[boardY][boardX] = type;
        }
      }
    });
  });
  board.value = newBoard;
}

onMounted(() => {
  socket.on("connect", () => {
    console.log("✅ Connected to server");

    socket.emit("init-player", { pseudo, room });

    socket.on("room-update", (roomData) => {
      console.log("🛠️ Room updated:", roomData);
    });

    socket.on("joined-room", (roomData) => {
      console.log(
        "😄 Joined room:",
        roomData.room,
        roomData.playerId,
        roomData.players,
      );
    });

    socket.on("game-started", (gameState) => {
      console.log("🚀 Game started:", gameState);
      nextPiece.value = gameState.gameState.currentPiece;
      currentPiece.value = gameState.gameState.currentPiece;
      updateBoard(gameState);
    });

    socket.on("game-update", (gameState) => {
      console.log("🕹️ Game state updated:", gameState);
      updateBoard(gameState);
      // board.value = gameState.board;
      // nextPiece.value = gameState.nextPiece;
    });

    socket.on("error", (error) => {
      console.error("❌ Socket error:", error.message);
    });
  });
});
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
  background-color: var(--primary-light);
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
