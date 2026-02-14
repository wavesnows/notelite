<template>
  <div class="header">
    <div class="win-tools">
      <el-button
        type="danger"
        size="small"
        circle
        class="circle-btn"
        @click="ipcRenderer.send('close')"
        @mouseenter="currShow = 1"
        @mouseleave="currShow = 0"
      >
        <el-icon v-show="currShow == 1"><Close /></el-icon>
      </el-button>
      <el-button
        type="warning"
        size="small"
        circle
        class="circle-btn"
        @click="ipcRenderer.send('min')"
        @mouseenter="currShow = 2"
        @mouseleave="currShow = 0"
      >
        <el-icon v-show="currShow == 2"><Minus /></el-icon>
      </el-button>
      <el-button
        type="success"
        size="small"
        circle
        class="circle-btn"
        @click="ipcRenderer.send('window-maximize')"
        @mouseenter="currShow = 3"
        @mouseleave="currShow = 0"
      >
        <el-icon v-show="currShow == 3"><FullScreen /></el-icon>
      </el-button>
      <el-tooltip :content="t('tools.openDevTools')" placement="bottom">
        <el-button
          size="small"
          circle
          class="circle-btn"
          @click="ipcRenderer.send('openDevTools')"
        >
          <el-icon><Monitor /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip :content="t('tools.editRawJson')" placement="bottom">
        <el-button
          size="small"
          circle
          class="circle-btn"
          @click="openRawEditor"
        >
          <el-icon><Document /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
    <!-- <Title></Title> -->
   <!-- <Logo />-->
    <Breadcrumb />
    <div class="right-section">
      <SearchBar />
      <GitStatusIndicator />
      <div class="tools">
        <Tools />
      </div>
    </div>
    <SearchResults />
   

  </div>
</template>

<script lang="ts" setup>
import Logo from "./Logo.vue";
import Tools from "./Tools.vue";
import Title from "./HeadTitle.vue"
import SearchBar from "./SearchBar.vue"
import SearchResults from "../search/SearchResults.vue"
import GitStatusIndicator from "./GitStatusIndicator.vue"
import Breadcrumb from "../note/Breadcrumb.vue"
import { ref, onMounted, onUnmounted } from "vue";
import { useTtsStore } from "@/store/store";
import { Document } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';

const { ipcRenderer } = require("electron");
const { t } = useI18n();
const currShow = ref(0);
const ttsStore = useTtsStore();

// Handle keyboard shortcuts
const handleKeyDown = (event: KeyboardEvent) => {
  // CMD/Ctrl + Shift + P for push
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'P') {
    event.preventDefault();

    // Only trigger if there are changes to push
    const hasChanges = ttsStore.gitStatus.hasUnpushed || ttsStore.gitStatus.hasUncommitted;
    if (!hasChanges) {
      console.log('No changes to push, ignoring shortcut');
      return;
    }

    // Trigger push via GitStatusIndicator button
    const gitButton = document.querySelector('.git-status-indicator .el-button') as HTMLElement;
    if (gitButton && !gitButton.classList.contains('is-disabled')) {
      gitButton.click();
    }
  }
};

// Start Git status check on mount
onMounted(() => {
  ttsStore.startGitStatusCheck();
  // Add keyboard event listener
  window.addEventListener('keydown', handleKeyDown);
});

// Cleanup on unmount
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

// Open raw JSON editor
function openRawEditor() {
  ttsStore.openRawJsonEditor();
}
</script>

<style scoped>
.header {
  height: 36px;
  background: #eee;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  display: flex;
  align-items: center;
  justify-items: auto;
  justify-content: space-between;
  padding: 0 8px;
  -webkit-app-region: drag;
}

.win-tools {
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.win-tools .circle-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  min-width: 20px;
  margin-right: 2px !important;
  margin-left: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  border: none;
  transition: opacity 0.2s;
}

.win-tools .circle-btn:last-child {
  margin-right: 0 !important;
}

.win-tools .circle-btn:hover {
  opacity: 0.8;
}

.win-tools .el-icon {
  font-size: 12px;
}

.right-section {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 4px;
  -webkit-app-region: no-drag;
}

.tools {
  display: flex;
  align-items: center;
  gap: 2px;
  -webkit-app-region: no-drag;
}

.tools .tool-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  min-width: 24px;
}

.tools .el-icon {
  font-size: 14px;
}
</style>
