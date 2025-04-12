<!-- src/views/SoloGameView.vue -->
<template>
  <div class="solo-container">
    <TetrisGrid :grid="grid" />
  </div>
</template>

<script setup>
import { ref } from "vue";
import TetrisGrid from "@/components/TetrisGrid.vue";

const createEmptyGrid = () =>
  Array.from({ length: 20 }, () => Array(10).fill(0));

const grid = ref(createEmptyGrid());
</script>

<style scoped>
.solo-container {
  height: 100vh;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
