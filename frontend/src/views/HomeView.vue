<!-- src/views/HomeView.vue -->
<template>
  <v-container
    fluid
    class="fill-height d-flex flex-column justify-start pa-6"
    style="min-height: 100vh; width: 100%"
  >
    <!-- Switch Dark Mode -->
    <div class="d-flex justify-end w-100 mb-6">
      <v-switch
        v-model="isDarkMode"
        inset
        class="theme-switch me-4"
        hide-details
      >
        <template v-slot:prepend>
          <v-icon
            :icon="
              isDarkMode
                ? 'mdi-moon-waning-crescent'
                : 'mdi-white-balance-sunny'
            "
            color="white"
          />
        </template>
      </v-switch>
    </div>
    <!-- PSEUDO INPUT -->
    <div class="pseudo-container">
      <v-text-field
        v-model="pseudo"
        label="Enter your pseudo"
        outlined
        class="mb-4 custom-text-field"
        dense
      />
    </div>
    <!-- BUTTONS -->
    <div class="d-flex gap-8">
      <v-btn class="me-4" @click="startSolo">Solo</v-btn>
      <v-btn @click="startMultiplayer">Multi</v-btn>
    </div>
    <!-- TITLE -->
    <div class="d-flex gap-4 mt-12 welcome-card">
      <h1>Welcome to Tetris!</h1>
    </div>
  </v-container>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
const isDarkMode = ref(false);
onMounted(() => {
  const storedMode = localStorage.getItem("dark-mode");
  if (storedMode) {
    isDarkMode.value = storedMode === "true";
    document.body.classList.toggle("dark-mode", isDarkMode.value);
  }
});
watch(isDarkMode, (newValue) => {
  localStorage.setItem("dark-mode", newValue);
  document.body.classList.toggle("dark-mode", newValue);
});
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
  background-color: var(--text-color);
  color: var(--primary-plain);
  font-weight: bold;
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
.theme-switch {
  max-width: 60px;
}

.theme-switch :deep(.v-label) {
  color: white !important;
}

.theme-switch :deep(.v-switch__track),
.theme-switch :deep(.v-switch__thumb) {
  color: var(--primary-plain) !important;
}

.pseudo-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}
</style>
