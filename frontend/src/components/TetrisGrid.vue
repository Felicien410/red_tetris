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
  background: var(--grid-background);
}

.row {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 1px;
}

.cell {
  width: 100%;
  aspect-ratio: 1 / 1;
}

.cell.filled {
  overflow: hidden;
  border-radius: 4px;
  box-shadow:
    inset 0 2px 3px rgba(255, 255, 255, 0.3),
    inset 0 -2px 3px rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.4);
  position: relative;
}

.cell.filled::before {
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

.cell.filled::after {
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

@keyframes shine {
  0% {
    transform: translateX(-100%) rotate(25deg);
  }
  100% {
    transform: translateX(100%) rotate(25deg);
  }
}

.cell.empty {
  background: var(--soft-black);
}

.cell.filled-I {
  background: linear-gradient(to bottom right, #00f0f0, #00cccc);
}

.cell.filled-O {
  background: linear-gradient(to bottom right, #ffff66, #e6e600);
}

.cell.filled-T {
  background: linear-gradient(to bottom right, #a000f0, #8000cc);
}

.cell.filled-S {
  background: linear-gradient(to bottom right, #00cc66, #00994d);
}

.cell.filled-Z {
  background: linear-gradient(to bottom right, #f00000, #cc0000);
}

.cell.filled-J {
  background: linear-gradient(to bottom right, #0000f0, #0000cc);
}

.cell.filled-L {
  background: linear-gradient(to bottom right, #ff9900, #cc7a00);
}
</style>
