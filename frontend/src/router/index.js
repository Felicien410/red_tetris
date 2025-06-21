import { createRouter, createWebHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";
import SoloGameView from "@/views/SoloGameView.vue";
import MultiplayerView from "@/views/MultiplayerView.vue";

const routes = [
  { path: "/", component: HomeView },
  { path: "/solo", component: SoloGameView },
  { path: "/multiplayer", component: MultiplayerView },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
