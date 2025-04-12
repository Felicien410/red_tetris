<!-- src/views/HomeView.vue -->
<!-- HTML -->
<template>
  <div class="home">
    <div class="buttons">
      <button @click="startSolo">Solo</button>
      <button @click="startMultiplayer">Multiplayer</button>
    </div>
  </div>
</template>

<!-- JavaScript -->
<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const startSolo = () => {
  router.push("/solo");
};

const startMultiplayer = () => {
  alert("Coming soon!");
};
</script>

<!-- CSS -->
<style scoped>
.home {
  background-image: url("@/assets/landingWallpaper.png");
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

h1 {
  font-size: 4rem;
  margin-bottom: 3rem;
}

.buttons {
  display: flex;
  gap: 2rem;
}

button {
  background-color: white;
  color: var(--primary-color);
  padding: 1rem 2rem;
  font-size: 1.5rem;
  border-radius: 10px;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: var(--primary-light);
}
</style>
