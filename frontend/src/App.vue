<!-- src/App.vue -->
<template>
  <router-view :key="$route.fullPath" />
</template>

<script setup></script>

<style>
#app {
  overflow: hidden;
  text-align: center;
}
</style>
