<template>
  <el-drawer
    v-model="visible"
    :title="t('history.title')"
    direction="rtl"
    size="500px"
  >
    <!-- File name header -->
    <div class="history-header">
      <el-icon><Clock /></el-icon>
      <span class="file-name">{{ fileName }}</span>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="loading-container">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>{{ t('history.loading') }}</span>
    </div>

    <!-- Empty state: not in git -->
    <el-empty v-else-if="!isInGitRepo" :description="t('history.notInGitDesc')">
      <el-button type="primary" @click="goToSettings">
        {{ t('history.enableSync') }}
      </el-button>
    </el-empty>

    <!-- Empty state: no commits -->
    <el-empty v-else-if="commits.length === 0" :description="t('history.noHistory')" />

    <!-- Timeline of commits -->
    <el-scrollbar v-else height="calc(100vh - 150px)">
      <el-timeline>
        <el-timeline-item
          v-for="commit in commits"
          :key="commit.hash"
          :timestamp="formatDate(commit.date)"
          placement="top"
        >
          <el-card class="commit-card" shadow="hover">
            <div class="commit-content">
              <div class="commit-message">{{ commit.message }}</div>
              <div class="commit-meta">
                <span class="author">
                  <el-icon><User /></el-icon>
                  {{ commit.author_name }}
                </span>
                <span class="hash">
                  <el-icon><DocumentCopy /></el-icon>
                  {{ shortHash(commit.hash) }}
                </span>
              </div>
            </div>
            <div class="commit-actions">
              <el-button size="small" @click="previewCommit(commit)">
                {{ t('history.preview') }}
              </el-button>
              <el-button size="small" type="primary" @click="confirmRestore(commit)">
                {{ t('history.restore') }}
              </el-button>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-scrollbar>
  </el-drawer>

  <!-- Preview dialog -->
  <el-dialog
    v-model="previewVisible"
    :title="t('history.previewTitle')"
    width="70%"
    top="5vh"
    @opened="onDialogOpened"
  >
    <div class="preview-header">
      <span>{{ formatDate(selectedCommit?.date) }}</span>
      <span>{{ selectedCommit?.author_name }}</span>
    </div>
    <el-divider />
    <div class="preview-content">
      <div v-if="previewLoading" class="preview-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
      </div>
      <div v-else-if="previewError" class="preview-error">
        <el-icon><WarningFilled /></el-icon>
        <p>{{ t('history.previewFailed') }}</p>
        <p style="font-size: 12px; color: #909399;">This file may not exist in the selected commit</p>
      </div>
      <div v-else-if="!history.previewData" class="preview-error">
        No preview data available
      </div>
      <div v-else-if="!history.previewData.blocks || history.previewData.blocks.length === 0" class="preview-empty">
        <el-icon><Document /></el-icon>
        <p>This file was empty in this version</p>
      </div>
      <div v-else>
        <div id="preview-editor-holder" class="preview-editor"></div>
      </div>
    </div>
    <template #footer>
      <el-button @click="previewVisible = false">
        {{ t('common.cancel') }}
      </el-button>
      <el-button type="primary" @click="confirmRestore(selectedCommit)">
        {{ t('history.restore') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTtsStore } from '@/store/store';
import { storeToRefs } from 'pinia';
import { ElMessageBox, ElMessage } from 'element-plus';
import { Clock, Loading, User, DocumentCopy, WarningFilled, Document } from '@element-plus/icons-vue';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import Underline from '@editorjs/underline';
import Warning from "@editorjs/warning";
import List from '@editorjs/list';
import Quote from '@editorjs/quote';
import Code from '@editorjs/code';
import Table from '@editorjs/table';
import Checklist from '@editorjs/checklist';

const { t } = useI18n();
const ttsStore = useTtsStore();
const { history, cnote } = storeToRefs(ttsStore);

const visible = computed({
  get: () => history.value.showDrawer,
  set: (val) => { history.value.showDrawer = val; }
});

const isLoading = computed(() => history.value.isLoading);
const isInGitRepo = computed(() => history.value.isInGitRepo);
const commits = computed(() => history.value.commits);
const fileName = computed(() => {
  const path = cnote.value.lastPath;
  return path ? path.split('/').pop()?.replace('.json', '') : '';
});

const previewVisible = ref(false);
const previewLoading = ref(false);
const previewError = ref(false);
const selectedCommit = ref<any>(null);
let previewEditorInstance: EditorJS | null = null;

// Format date for display
function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString();
}

// Shorten commit hash
function shortHash(hash: string): string {
  return hash.substring(0, 7);
}

// Preview commit
async function previewCommit(commit: any) {
  console.log('Preview button clicked for commit:', commit.hash);
  selectedCommit.value = commit;
  previewVisible.value = true;
  previewLoading.value = true;
  previewError.value = false;

  try {
    console.log('Calling ttsStore.previewCommit...');
    await ttsStore.previewCommit(commit);
    console.log('Preview data loaded successfully');
    previewLoading.value = false;
  } catch (error: any) {
    console.error('Preview error:', error);
    console.error('Error message:', error?.message);
    previewError.value = true;
    previewLoading.value = false;
  }
}

// Initialize editor when dialog is fully opened
async function onDialogOpened() {
  console.log('Dialog opened, initializing editor...');
  console.log('Preview data available:', !!history.value.previewData);
  console.log('Preview error state:', previewError.value);
  console.log('Preview loading state:', previewLoading.value);

  // If there's an error or still loading, don't initialize editor
  if (previewError.value || previewLoading.value) {
    console.log('Skipping editor init - error or loading');
    return;
  }

  // If no preview data, don't initialize
  if (!history.value.previewData) {
    console.log('No preview data available');
    return;
  }

  // If empty file (no blocks), don't initialize editor - just show empty state
  if (!history.value.previewData.blocks || history.value.previewData.blocks.length === 0) {
    console.log('File is empty, showing empty state');
    return;
  }

  // Destroy existing instance if any
  if (previewEditorInstance) {
    try {
      await previewEditorInstance.destroy();
      console.log('Destroyed previous editor instance');
    } catch (e) {
      console.log('Error destroying editor:', e);
    }
    previewEditorInstance = null;
  }

  // Wait for DOM to be ready
  await nextTick();

  // Check if element exists
  const holder = document.getElementById('preview-editor-holder');
  if (!holder) {
    console.error('preview-editor-holder not found in DOM');
    previewError.value = true;
    return;
  }

  try {
    // Ensure data has correct EditorJS format
    const editorData = history.value.previewData;

    console.log('Initializing editor with data:', {
      time: editorData.time,
      blocksCount: editorData.blocks?.length || 0,
      version: editorData.version
    });

    // Initialize read-only EditorJS
    previewEditorInstance = new EditorJS({
      holder: 'preview-editor-holder',
      data: editorData,
      readOnly: true,
      minHeight: 0,
      tools: {
        header: {
          class: Header,
          config: {
            placeholder: 'Header'
          },
          inlineToolbar: ['link'],
        },
        list: List,
        quote: Quote,
        underline: Underline,
        warning: {
          class: Warning,
          inlineToolbar: true,
          config: {
            titlePlaceholder: 'Title',
            messagePlaceholder: 'Message',
          },
        },
        code: {
          class: Code as any,
          config: {
            placeholder: 'Enter code here...'
          },
        },
        table: {
          class: Table as any,
          config: {
            rows: 2,
            cols: 3,
            withHeadings: false
          },
          inlineToolbar: true,
        },
        checklist: {
          class: Checklist as any,
          inlineToolbar: true,
        },
      }
    });

    // Wait for editor to be ready
    await previewEditorInstance.isReady;
    console.log('✅ Preview editor ready! Blocks count:', editorData.blocks?.length || 0);
  } catch (error: any) {
    console.error('❌ Editor initialization error:', error);
    console.error('Error message:', error?.message);
    previewError.value = true;
  }
}

// Confirm restore
async function confirmRestore(commit: any) {
  if (!commit) return;

  const date = formatDate(commit.date);

  try {
    await ElMessageBox.confirm(
      t('history.restoreConfirmDesc'),
      t('history.restoreConfirm', { date }),
      {
        confirmButtonText: t('common.ok'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await ttsStore.restoreToCommit(commit);

    ElMessage({
      type: 'success',
      message: t('history.restoreSuccess', { date }),
    });

    visible.value = false;
    previewVisible.value = false;
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage({
        type: 'error',
        message: t('history.restoreFailed'),
      });
    }
  }
}

// Navigate to settings
function goToSettings() {
  visible.value = false;
  ttsStore.config.drawer = true;
}

// Cleanup preview editor on close
watch(previewVisible, async (newVal) => {
  if (!newVal && previewEditorInstance) {
    try {
      await previewEditorInstance.destroy();
    } catch (e) {
      console.log('Error destroying editor on close:', e);
    }
    previewEditorInstance = null;
  }
});
</script>

<style scoped>
.history-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 16px;
}

.file-name {
  font-weight: 500;
  font-size: 14px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
}

.commit-card {
  cursor: pointer;
  margin-bottom: 12px;
}

.commit-content {
  margin-bottom: 12px;
}

.commit-message {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #303133;
}

.commit-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.commit-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.commit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #606266;
}

.preview-content {
  min-height: 400px;
  max-height: 60vh;
  overflow-y: auto;
}

.preview-editor {
  padding: 20px;
}

.preview-loading,
.preview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 12px;
}

.preview-error {
  color: #f56c6c;
}

.preview-error .el-icon {
  font-size: 48px;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 12px;
  color: #909399;
}

.preview-empty .el-icon {
  font-size: 48px;
}
</style>
