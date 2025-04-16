<!-- src/views/SoloGameView.vue -->
<!-- HTML -->
<template>
  <v-container class="solo-container" pa-0 fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" md="8" lg="6">
        <TetrisGrid :grid="grid" />
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
          <v-card-title class="text-h6 text-center">Next Piece</v-card-title>
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

const grid = ref(createEmptyGrid());
const nextPiece = ref(null);
const currentPiece = ref(null);

// Start game function
const startGame = () => {
  socket.emit("start-game", { roomId: room, playerName: pseudo });
};

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

    socket.on("game-started", (playerGameState) => {
      console.log("🚀 Game started:", playerGameState);
      nextPiece.value = playerGameState.gameState.currentPiece;
      currentPiece.value = playerGameState.gameState.currentPiece;
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
  background-color: var(--primary-light);
  color: var(--text-color);
  font-weight: bold;
  width: 200px;
  align-self: center;
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
