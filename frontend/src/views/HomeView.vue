<template>
  <v-container class="fill-height d-flex flex-column justify-start pa-6">
    <v-text-field
      v-model="pseudo"
      label="Enter your pseudo"
      outlined
      class="mb-4 custom-text-field"
      style="min-width: 500px"
    />

    <div class="d-flex gap-4">
      <v-btn color="primary" @click="startSolo">Solo</v-btn>
      <v-btn color="secondary" @click="startMultiplayer">Multi</v-btn>
    </div>

    <div class="d-flex gap-4 mt-12 welcome-card">
      <h1>Welcome to Tetris!</h1>
    </div>
  </v-container>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const pseudo = ref("");
const router = useRouter();

const startSolo = () => {
  if (!pseudo.value.trim()) {
    alert("Please enter a pseudo");
    return;
  }
  localStorage.setItem("pseudo", pseudo.value);
  router.push("/solo");
};

const startMultiplayer = () => {
  if (!pseudo.value.trim()) {
    alert("Please enter a pseudo");
    return;
  }
  localStorage.setItem("pseudo", pseudo.value);
  router.push("/multiplayer");
};
</script>

<style scoped>
.custom-text-field :deep(.v-field) {
  background-color: var(--secondary-color);
  border-radius: 8px;
}

.welcome-card {
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 32px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
</style>
