<template>
    <div class="footer">
      <div class="left-section">
        <div class="status-item" v-if="fileInfo.path">
          <span class="label">{{ t('statusBar.file') }}:</span>
          <span class="value">{{ fileName }}</span>
        </div>
        <div class="status-item" v-if="fileInfo.size !== null">
          <span class="label">{{ t('statusBar.size') }}:</span>
          <span class="value">{{ formatFileSize(fileInfo.size) }}</span>
        </div>
        <div class="status-item" v-if="fileInfo.modified">
          <span class="label">{{ t('statusBar.modified') }}:</span>
          <span class="value">{{ formatDate(fileInfo.modified) }}</span>
        </div>
      </div>
      <div class="right-section">
        <!-- Save status indicator -->
        <div v-if="ttsStore.saveStatus.status !== 'idle'" class="save-status" :class="ttsStore.saveStatus.status">
          <el-icon v-if="ttsStore.saveStatus.status === 'saving'" class="rotating"><Loading /></el-icon>
          <el-icon v-else-if="ttsStore.saveStatus.status === 'saved'"><CircleCheck /></el-icon>
          <el-icon v-else-if="ttsStore.saveStatus.status === 'error'"><CircleClose /></el-icon>
          <span>{{ ttsStore.saveStatus.message }}</span>
        </div>
        <!-- Push status indicator -->
        <div v-if="ttsStore.pushStatus.message" class="push-status" :class="ttsStore.pushStatus.type">
          <el-icon v-if="ttsStore.pushStatus.type === 'loading'"><Loading /></el-icon>
          <el-icon v-else-if="ttsStore.pushStatus.type === 'success'"><CircleCheck /></el-icon>
          <el-icon v-else-if="ttsStore.pushStatus.type === 'error'"><CircleClose /></el-icon>
          <span>{{ ttsStore.pushStatus.message }}</span>
        </div>
      </div>
    </div>
  </template>

  <script setup lang="ts">
  import { computed } from 'vue';
  import { useTtsStore } from "@/store/store";
  import { storeToRefs } from "pinia";
  import { useI18n } from 'vue-i18n';
  import { Loading, CircleCheck, CircleClose } from '@element-plus/icons-vue';
  import fs from 'fs';
  import path from 'path';

  const { t } = useI18n();
  const ttsStore = useTtsStore();
  const { config, cnote } = storeToRefs(ttsStore);

  const fileInfo = computed(() => {
    const filePath = cnote.value.lastPath;

    if (!filePath || !fs.existsSync(filePath)) {
      return {
        path: '',
        size: null,
        modified: null
      };
    }

    try {
      const stats = fs.statSync(filePath);
      return {
        path: filePath,
        size: stats.size,
        modified: stats.mtime
      };
    } catch (error) {
      console.error('Error reading file stats:', error);
      return {
        path: filePath,
        size: null,
        modified: null
      };
    }
  });

  const fileName = computed(() => {
    if (!fileInfo.value.path) return '';
    return path.basename(fileInfo.value.path, '.json');
  });

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  }

  function formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return t('statusBar.justNow');
    } else if (minutes < 60) {
      return t('statusBar.minutesAgo', { count: minutes });
    } else if (hours < 24) {
      return t('statusBar.hoursAgo', { count: hours });
    } else if (days < 7) {
      return t('statusBar.daysAgo', { count: days });
    } else {
      return date.toLocaleString();
    }
  }

  const download = () => {
   // ttsStore.writeFileSync();
  };
  </script>
  

 

  <style scoped>

  .footer {
    border-bottom-right-radius: 10px;
    height: 24px !important;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    background-color: var(--note-foot-bgcolor);
    font-size: 11px;
    color: #606266;
  }

  .left-section {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .right-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .label {
    font-weight: 500;
    color: #909399;
  }

  .value {
    color: #606266;
  }

  .push-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .push-status.loading {
    color: #409eff;
    background: #ecf5ff;
  }

  .push-status.success {
    color: #67c23a;
    background: #f0f9ff;
  }

  .push-status.error {
    color: #f56c6c;
    background: #fef0f0;
  }

  .push-status .el-icon {
    font-size: 14px;
  }

  .save-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .save-status.saving {
    color: #909399;
    background: #f4f4f5;
  }

  .save-status.saved {
    color: #67c23a;
    background: #f0f9ff;
  }

  .save-status.error {
    color: #f56c6c;
    background: #fef0f0;
  }

  .save-status .el-icon {
    font-size: 14px;
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .rotating {
    animation: rotate 1s linear infinite;
  }
  </style>
  