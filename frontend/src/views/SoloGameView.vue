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

  if (!pseudo) {
    console.error(
      "❌ Pseudo not found in localStorage. Cannot initialize player.",
    );
    return;
  }

  socket.on("connect", () => {
    console.log("✅ Connected to server");

    const room = `solo-${pseudo}`;
    socket.emit("init-player", { pseudo });

    socket.on("room-update", (roomData) => {
      console.log("🛠️ Room updated:", roomData);
    });

    socket.emit("join-room", 1, { pseudo });

    socket.on("joined-room", (roomData) => {
      console.log("😄 Joined room:", roomData);
    });

    socket.on("error", (error) => {
      console.error("❌ Socket error:", error.message);
    });
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Connection error:", err.message);
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
