<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
const { ipcRenderer } = require('electron');
import { useTtsStore } from "@/store/store";
import Header from "./components/header/Header.vue";
import Aside from "./components/aside/Aside.vue";
import Bside from "./components/aside/Bside.vue";
import HomeMain from "./components/note/HomeMain.vue";
import Footer from "./components/footer/NoteFooter.vue";
import HistoryViewer from "./components/history/HistoryViewer.vue";
import KeyboardShortcuts from "./components/help/KeyboardShortcuts.vue";
import TerminalPanel from "./components/terminal/TerminalPanel.vue";

const ttsStore = useTtsStore();

// Handle global keyboard shortcuts
const handleKeyDown = (event: KeyboardEvent) => {
  // Cmd/Ctrl + ? for help
  if ((event.metaKey || event.ctrlKey) && event.key === '?' && !event.shiftKey) {
    event.preventDefault();
    ttsStore.openHelpDialog();
  }
  // Ctrl+` to toggle terminal
  if (event.ctrlKey && event.key === '`') {
    event.preventDefault();
    ttsStore.toggleTerminal();
  }
};

const handleFocus = () => {
  // Emit event so FileTree can save expanded state before refresh
  window.dispatchEvent(new CustomEvent('save-tree-expanded-state'));
  ttsStore.scheduleTreeRefresh();
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('focus', handleFocus);

  // Get git availability from main process
  ipcRenderer.invoke('get-git-available').then((available: boolean) => {
    ttsStore.gitAvailable = available;
  });
  ipcRenderer.on('git-available', (_: any, available: boolean) => {
    ttsStore.gitAvailable = available;
  });
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('focus', handleFocus);
  // Save expanded state on exit
  window.dispatchEvent(new CustomEvent('save-tree-expanded-state'));
  ttsStore.setLastEditNote();
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
    <TerminalPanel v-show="ttsStore.terminal.show" />
    <HistoryViewer />
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
  flex-direction: column;
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

/* Git dropdown menu light style */
.git-dropdown.el-dropdown-menu {
  background-color: #fff !important;
  border: none !important;
  border-radius: 6px !important;
  padding: 4px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
}

.git-dropdown .el-dropdown-menu__item {
  color: #303133 !important;
  border-radius: 4px !important;
  font-size: 13px !important;
  transition: background-color 0.15s;
}

.git-dropdown .el-dropdown-menu__item:hover {
  background-color: #f0f7ff !important;
  color: #409eff !important;
}

.git-dropdown .el-dropdown-menu__item .el-icon {
  color: #606266 !important;
}

.git-dropdown .el-dropdown-menu__item:hover .el-icon {
  color: #409eff !important;
}

/* Tree context menu light style */
.tree-context-menu.el-dropdown-menu {
  background-color: #fff !important;
  border: none !important;
  border-radius: 6px !important;
  padding: 4px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
}

.tree-context-menu .el-dropdown-menu__item {
  color: #303133 !important;
  border-radius: 4px !important;
  margin: 1px 0 !important;
  transition: background-color 0.15s;
  font-size: 13px !important;
}

.tree-context-menu .el-dropdown-menu__item:hover {
  background-color: #f0f7ff !important;
  color: #409eff !important;
}

.tree-context-menu .el-dropdown-menu__item .el-icon {
  color: #606266 !important;
}

.tree-context-menu .el-dropdown-menu__item:hover .el-icon {
  color: #409eff !important;
}

.tree-context-menu .el-dropdown-menu__item.is-divided {
  border-top: 1px solid #f0f0f0 !important;
  margin-top: 4px !important;
  padding-top: 4px !important;
}
</style>
