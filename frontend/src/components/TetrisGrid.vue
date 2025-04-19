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
import { PIECE_TYPES, PIECE_SHAPES, PIECE_COLORS } from "@/constants";

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
  height: 99vh;
  width: auto;
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

.cell.filled-I {
  background: cyan;
}
.cell.filled-O {
  background: yellow;
}
.cell.filled-T {
  background: purple;
}
.cell.filled-S {
  background: green;
}
.cell.filled-Z {
  background: red;
}
.cell.filled-J {
  background: blue;
}
.cell.filled-L {
  background: orange;
}
</style>
