import { createApp } from "vue";
import App from "./App.vue";
import { globalRegister } from "./global";
import { createPinia } from "pinia";
import  i18n  from "@/i18n";

const app = createApp(App) as any;
const pinia = createPinia();

app.use(pinia);
app.use(globalRegister);
app.use(i18n);

app.mount("#app").$nextTick(() => {
  postMessage({ payload: "removeLoading" }, "*");
});
