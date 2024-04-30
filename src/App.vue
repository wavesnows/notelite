<script setup lang="ts">
import { useTtsStore } from "@/store/store";
import Header from "./components/header/Header.vue";
import Aside from "./components/aside/Aside.vue";
import Bside from "./components/aside/Bside.vue";
import HomeMain from "./components/note/HomeMain.vue";
import Footer from "./components/footer/NoteFooter.vue";

const ttsStore = useTtsStore();

</script>

<template>
  <div class="app">
    <el-container>
      <el-header><Header /></el-header>
      <el-container class="container">
        <el-aside><Aside /></el-aside>
        <el-aside><Bside /></el-aside>
        <el-container class="main-footer">
          <div id="result"></div>
          <el-main><HomeMain /></el-main>
        <el-footer><Footer /></el-footer>
        </el-container>
      </el-container>
    </el-container>
  </div>
</template>

<style>

* {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

:root{
    --note-foot-bgcolor: #eee;
    --note-side-bgcolor: #DDD;
}

body {
  margin: 0;
  /* height: 570px; */
}

.app {
  background-color: #f2f3f5;
  border-radius: 10px;
}
.el-header {
  border: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  height: auto !important;
  -webkit-app-region: drag;
}
.el-aside {
  width: auto !important;
  overflow: hidden !important;
}
.container {
  height: calc(100vh - 35px);
}
.el-main,
.el-footer {
  border: 0 !important;
  padding: 0 !important;
  margin-left: 0;
  height:auto  !important;
}
.main-footer {
  height: 100%;
  display: flex;
}
.el-button {
  -webkit-app-region: no-drag;
}
</style>
