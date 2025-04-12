import { createRouter, createWebHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";
import SoloGameView from "@/views/SoloGameView.vue";

const routes = [
  { path: "/", component: HomeView },
  { path: "/solo", component: SoloGameView },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
