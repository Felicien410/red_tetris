<!-- src/components/TetrisGrid.vue -->
<template>
  <div class="tetris-grid">
    <div v-for="(row, y) in grid" :key="y" class="row">
      <div
        v-for="(cell, x) in row"
        :key="x"
        :class="['cell', cellClass(cell)]"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { toRef } from "vue";

const props = defineProps({
  grid: {
    type: Array,
    required: true,
  },
});

const cellClass = (value) => {
  return value ? `filled filled-${value}` : "empty";
};
</script>

<style scoped>
.tetris-grid {
  display: grid;
  grid-template-rows: repeat(20, 1fr);
  gap: 1px;
  aspect-ratio: 10 / 20;
  width: 23vw;
  height: auto;
  background: #222;
}

.row {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 1px;
}

.cell {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #111;
}

.cell.empty {
  background: #111;
}

.cell.filled-1 {
  background: cyan;
}
.cell.filled-2 {
  background: yellow;
}
.cell.filled-3 {
  background: purple;
}
.cell.filled-4 {
  background: green;
}
.cell.filled-5 {
  background: orange;
}
.cell.filled-6 {
  background: red;
}
.cell.filled-7 {
  background: blue;
}
</style>
