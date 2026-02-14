<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useTtsStore } from "@/store/store";
import Header from "./components/header/Header.vue";
import Aside from "./components/aside/Aside.vue";
import Bside from "./components/aside/Bside.vue";
import HomeMain from "./components/note/HomeMain.vue";
import Footer from "./components/footer/NoteFooter.vue";
import HistoryViewer from "./components/history/HistoryViewer.vue";
import RawJsonEditor from "./components/editor/RawJsonEditor.vue";
import KeyboardShortcuts from "./components/help/KeyboardShortcuts.vue";

const ttsStore = useTtsStore();

// Handle global keyboard shortcuts
const handleKeyDown = (event: KeyboardEvent) => {
  // Cmd/Ctrl + ? for help
  if ((event.metaKey || event.ctrlKey) && event.key === '?' && !event.shiftKey) {
    event.preventDefault();
    ttsStore.openHelpDialog();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

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
    <HistoryViewer />
    <RawJsonEditor />
    <KeyboardShortcuts />
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
  height: calc(100vh - 36px);
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

/* Global override for EditorJS width constraints */
.ce-block__content,
.ce-toolbar__content {
  max-width: 100% !important;
}

.ce-block {
  max-width: 100% !important;
}

/* Git dropdown menu dark style to match tooltips */
.git-dropdown.el-dropdown-menu {
  background-color: #303133 !important;
  border: none !important;
  padding: 4px 0 !important;
}

.git-dropdown .el-dropdown-menu__item {
  color: #fff !important;
  transition: background-color 0.2s;
}

.git-dropdown .el-dropdown-menu__item:hover {
  background-color: #409eff !important;
  color: #fff !important;
}

.git-dropdown .el-dropdown-menu__item .el-icon {
  color: #fff !important;
}

/* Tree context menu dark style */
.tree-context-menu.el-dropdown-menu {
  background-color: #303133 !important;
  border: none !important;
  padding: 4px 0 !important;
}

.tree-context-menu .el-dropdown-menu__item {
  color: #fff !important;
  transition: background-color 0.2s;
}

.tree-context-menu .el-dropdown-menu__item:hover {
  background-color: #409eff !important;
  color: #fff !important;
}

.tree-context-menu .el-dropdown-menu__item .el-icon {
  color: #fff !important;
}

.tree-context-menu .el-dropdown-menu__item.is-divided {
  border-top: 1px solid #4c4d4f !important;
}
</style>
