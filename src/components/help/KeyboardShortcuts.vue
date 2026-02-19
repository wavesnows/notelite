<template>
  <el-dialog
    v-model="visible"
    :title="t('help.keyboardShortcuts')"
    width="600px"
    @close="handleClose"
  >
    <div class="shortcuts-container">
      <div class="shortcut-section">
        <h3>{{ t('help.general') }}</h3>
        <div class="shortcut-item">
          <span class="keys">
            <kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd> + <kbd>?</kbd>
          </span>
          <span class="description">{{ t('help.showHelp') }}</span>
        </div>
        <div class="shortcut-item">
          <span class="keys">
            <kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd> + <kbd>S</kbd>
          </span>
          <span class="description">{{ t('help.saveNote') }}</span>
        </div>
      </div>

      <div class="shortcut-section">
        <h3>{{ t('help.git') }}</h3>
        <div class="shortcut-item">
          <span class="keys">
            <kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>
          </span>
          <span class="description">{{ t('help.gitPush') }}</span>
        </div>
      </div>

      <div class="shortcut-section">
        <h3>{{ t('help.editor') }}</h3>
        <div class="shortcut-item">
          <span class="keys">
            <kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd> + <kbd>Shift</kbd> + <kbd>H</kbd>
          </span>
          <span class="description">{{ t('help.insertHeader') }}</span>
        </div>
        <div class="shortcut-item">
          <span class="keys">
            <kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd> + <kbd>Shift</kbd> + <kbd>W</kbd>
          </span>
          <span class="description">{{ t('help.insertWarning') }}</span>
        </div>
        <div class="shortcut-item">
          <span class="keys">
            <kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd> + <kbd>B</kbd>
          </span>
          <span class="description">{{ t('help.bold') }}</span>
        </div>
        <div class="shortcut-item">
          <span class="keys">
            <kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd> + <kbd>I</kbd>
          </span>
          <span class="description">{{ t('help.italic') }}</span>
        </div>
        <div class="shortcut-item">
          <span class="keys">
            <kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd> + <kbd>K</kbd>
          </span>
          <span class="description">{{ t('help.link') }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">{{ t('common.ok') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTtsStore } from '@/store/store';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const ttsStore = useTtsStore();
const { helpDialog } = storeToRefs(ttsStore);

const visible = computed({
  get: () => helpDialog.value.show,
  set: (val) => { helpDialog.value.show = val; }
});

const isMac = computed(() => {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
});

function handleClose() {
  ttsStore.closeHelpDialog();
}
</script>

<style scoped>
.shortcuts-container {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 8px;
}

/* 滚动条样式 - 不使用时自动隐藏 */
.shortcuts-container::-webkit-scrollbar {
  width: 6px;
}

.shortcuts-container::-webkit-scrollbar-track {
  background: transparent;
}

.shortcuts-container::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 3px;
  transition: background-color 0.3s;
}

.shortcuts-container:hover::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
}

.shortcuts-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

.shortcut-section {
  margin-bottom: 24px;
}

.shortcut-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f7fa;
}

.shortcut-item:last-child {
  border-bottom: none;
}

.keys {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 14px;
  color: #606266;
}

.keys kbd {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  font-family: monospace;
  line-height: 1;
  color: #303133;
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  min-width: 24px;
  text-align: center;
}

.description {
  font-size: 14px;
  color: #606266;
  flex: 1;
  text-align: right;
}
</style>
