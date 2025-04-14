<!-- src/views/SoloGameView.vue -->
<!-- HTML -->
<template>
  <div class="solo-container">
    <TetrisGrid :grid="grid" />
  </div>
</template>

<!-- JavaScript -->
<script setup>
import { onMounted, ref } from "vue";
import { io } from "socket.io-client";
import TetrisGrid from "@/components/TetrisGrid.vue";

const socket = io("http://localhost:3000");
const createEmptyGrid = () =>
  Array.from({ length: 20 }, () => Array(10).fill(0));
const grid = ref(createEmptyGrid());

onMounted(() => {
  const pseudo = localStorage.getItem("pseudo");
  const room = "solo-" + pseudo;
  socket.emit("connect-player", { pseudo });
  socket.on("room-created", (roomId, playerId) => {
    console.log("🎉 Room created :", roomId);
    console.log("👤 Player ID :", playerId);
  });
  socket.on("room-update", (roomId, grid) => {
    console.log("🛠️ Room updated :", roomId);
  });
  socket.on("error", (error) => {
    console.error("❌ Socket erreur:", error.message);
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
</style>
