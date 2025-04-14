import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router/index.js";
import "@/style.css";
import App from "@/App.vue";

// Vuetify
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: "customTheme",
    themes: {
      customTheme: {
        dark: false,
        colors: {
          primary: "#a066c9",
          secondary: "#6f2c91",
          background: "#fff",
          surface: "#fff",
          onPrimary: "#ffffff",
        },
      },
    },
  },
});

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(vuetify);
app.mount("#app");
