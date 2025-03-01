<template>
  <div class="home">
    <h1>Tetris</h1>
    <div class="form">
      <input v-model="username" type="text" placeholder="Enter your nickname" />
      <button @click="joinRoom">Join a room</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const username = ref("");

const joinRoom = () => {
  if (username.value.trim()) {
    console.log(`${username.value} joins a room...`);
  } else {
    alert("Veuillez entrer un pseudo");
  }
};
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: var(--primary-color);
  color: var(--text-color);
}
</style>
