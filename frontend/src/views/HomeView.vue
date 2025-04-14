<!-- src/views/HomeView.vue -->
<!-- HTML -->
<template>
  <div class="home">
    <div class="header">
      <input
        v-model="pseudo"
        placeholder="Enter your pseudo"
        class="pseudo-input"
      />
      <div class="buttons">
        <button @click="startSolo">Solo</button>
        <button @click="startMultiplayer">Multiplayer</button>
      </div>
    </div>
  </div>
</template>

<!-- JavaScript -->
<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const pseudo = ref("");

const startSolo = () => {
  if (!pseudo.value.trim()) {
    alert("Please enter a pseudo.");
    return;
  }

  localStorage.setItem("pseudo", pseudo.value);
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

.header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

h1 {
  font-size: 4rem;
  margin-bottom: 3rem;
}

.pseudo-input {
  width: 250px;
  padding: 8px;
  font-size: 16px;
}

.buttons {
  display: flex;
  gap: 2rem;
}

button {
  background-color: var(--primary-color);
  color: var(--text-color);
  padding: 1rem 2rem;
  font-size: 1.5rem;
  border-radius: 10px;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: var(--primary-light);
}
</style>
