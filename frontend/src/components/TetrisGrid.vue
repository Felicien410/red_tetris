<!-- src/components/TetrisGrid.vue -->
<template>
  <div class="tetris-grid">
    <div
      v-for="(row, y) in displayGrid"
      :key="y"
      class="row"
      :class="{
        'clearing-line': clearingRows.includes(y),
        'row-cleared': clearedRows.includes(y),
      }"
    >
      <div
        v-for="(cell, x) in row"
        :key="x"
        :class="[
          'cell',
          cellClass(cell),
          {
            'cell-clearing': clearingRows.includes(y),
            'cell-flash': flashingCells.some(
              (flash) => flash.row === y && flash.col === x,
            ),
          },
        ]"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
const props = defineProps({
  grid: {
    type: Array,
    required: true,
  },
  clearedLinesInfo: {
    type: Object,
    default: null,
  },
  currentPiece: {
    type: Object,
    default: null,
  },
  isCurrentPlayer: {
    type: Boolean,
    default: true,
  },
});

// Computed property for display grid with falling piece
const displayGrid = computed(() => {
  if (!props.grid) return [];
  
  // If no current piece, just return the base grid
  if (!props.currentPiece) {
    return props.grid;
  }
  
  // Clone the grid to avoid mutating the original
  const gridCopy = props.grid.map(row => [...row]);
  const { shape, position, type } = props.currentPiece;
  
  // Add the falling piece to the display grid
  if (shape && position) {
    shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const boardY = y + position.y;
          const boardX = x + position.x;
          if (
            boardY >= 0 &&
            boardY < gridCopy.length &&
            boardX >= 0 &&
            boardX < gridCopy[0].length
          ) {
            gridCopy[boardY][boardX] = type;
          }
        }
      });
    });
  }
  
  return gridCopy;
});

const cellClass = (value) => {
  return value ? `filled filled-${value}` : "empty";
};
const clearingRows = ref([]);
const clearedRows = ref([]);
const flashingCells = ref([]);

const animateLineClearing = async (rowIndices) => {
  if (!rowIndices || rowIndices.length === 0) return;

  console.log("🎬 Starting line clearing animation for rows:", rowIndices);

  // Phase 1: Flash des cellules individuelles
  flashingCells.value = [];
  rowIndices.forEach((rowIndex) => {
    for (let col = 0; col < (props.grid[rowIndex]?.length || 10); col++) {
      flashingCells.value.push({ row: rowIndex, col });
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 200));

  // Phase 2: Marquer les lignes comme en cours de suppression
  clearingRows.value = [...rowIndices];
  flashingCells.value = [];

  await new Promise((resolve) => setTimeout(resolve, 400));

  // Phase 3: Marquer comme supprimées (disparition complète)
  clearedRows.value = [...rowIndices];

  await new Promise((resolve) => setTimeout(resolve, 300));

  // Phase 4: Nettoyer les états d'animation
  clearingRows.value = [];
  clearedRows.value = [];

  console.log("✅ Line clearing animation completed");
};

// Watcher pour déclencher l'animation quand des lignes sont supprimées
watch(
  () => props.clearedLinesInfo,
  (newInfo) => {
    console.log("📥 Received clearedLinesInfo:", newInfo);
    if (newInfo && newInfo.rowIndices && newInfo.rowIndices.length > 0) {
      animateLineClearing(newInfo.rowIndices);
    }
  },
  { deep: true },
);

defineExpose({
  animateLineClearing,
});
</script>

<style scoped>
.tetris-grid {
  display: grid;
  grid-template-rows: repeat(20, 1fr);
  gap: 1px;
  aspect-ratio: 10 / 20;
  height: 100%;
  width: auto;
  max-height: 80vh;
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

.cell.cell-flash {
  animation: cellFlash 0.2s ease-in-out;
}

.cell.cell-clearing {
  animation: cellDissolve 0.4s ease-in-out;
}

@keyframes cellFlash {
  0% {
    transform: scale(1);
    box-shadow:
      inset 0 2px 3px rgba(255, 255, 255, 0.3),
      inset 0 -2px 3px rgba(0, 0, 0, 0.3),
      0 2px 4px rgba(0, 0, 0, 0.4);
  }
  50% {
    transform: scale(1.15);
    box-shadow:
      0 0 20px rgba(255, 255, 255, 0.9),
      0 0 40px rgba(255, 255, 255, 0.6),
      inset 0 0 20px rgba(255, 255, 255, 0.4);
    filter: brightness(1.8);
  }
  100% {
    transform: scale(1);
    box-shadow:
      inset 0 2px 3px rgba(255, 255, 255, 0.3),
      inset 0 -2px 3px rgba(0, 0, 0, 0.3),
      0 2px 4px rgba(0, 0, 0, 0.4);
  }
}

@keyframes lineClearing {
  0% {
    transform: scaleX(1);
    opacity: 1;
  }
  25% {
    transform: scaleX(1.08);
    opacity: 1;
    filter: brightness(1.4);
  }
  50% {
    transform: scaleX(1.15);
    opacity: 0.8;
    filter: brightness(1.7) blur(1px);
  }
  75% {
    transform: scaleX(0.85);
    opacity: 0.4;
    filter: brightness(2.2) blur(2px);
  }
  100% {
    transform: scaleX(0);
    opacity: 0;
    filter: brightness(3) blur(3px);
  }
}

@keyframes cellDissolve {
  0% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
  25% {
    opacity: 0.85;
    transform: scale(1.12) rotate(3deg);
  }
  50% {
    opacity: 0.65;
    transform: scale(0.88) rotate(-3deg);
    filter: blur(1px);
  }
  75% {
    opacity: 0.35;
    transform: scale(0.65) rotate(2deg);
    filter: blur(2px);
  }
  100% {
    opacity: 0;
    transform: scale(0) rotate(0deg);
    filter: blur(3px);
  }
}

/* Effet de pulsation pour le grid entier quand des lignes sont supprimées */
.tetris-grid:has(.clearing-line) {
  animation: gridPulse 0.1s ease-in-out;
}

@keyframes gridPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.015);
  }
  100% {
    transform: scale(1);
  }
}
</style>
