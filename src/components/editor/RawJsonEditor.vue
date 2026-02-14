<template>
  <el-dialog
    v-model="visible"
    :title="t('tools.rawJsonEditor')"
    width="80%"
    top="5vh"
    :close-on-click-modal="false"
  >
    <div class="editor-header">
      <el-alert
        :title="t('tools.rawJsonWarning')"
        type="warning"
        :closable="false"
        show-icon
      >
        <template #default>
          <p>{{ t('tools.rawJsonWarningDesc') }}</p>
        </template>
      </el-alert>
    </div>

    <div class="editor-content">
      <el-input
        v-model="jsonContent"
        type="textarea"
        :rows="25"
        :placeholder="t('tools.rawJsonPlaceholder')"
        class="json-textarea"
      />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">
          {{ t('common.cancel') }}
        </el-button>
        <el-button @click="handleFormat">
          {{ t('tools.formatJson') }}
        </el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">
          {{ t('common.save') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTtsStore } from '@/store/store';
import { storeToRefs } from 'pinia';
import { ElMessage, ElMessageBox } from 'element-plus';
import fs from 'fs';

const { t } = useI18n();
const ttsStore = useTtsStore();
const { rawJsonEditor, cnote } = storeToRefs(ttsStore);

const visible = computed({
  get: () => rawJsonEditor.value.showDialog,
  set: (val) => { rawJsonEditor.value.showDialog = val; }
});

const jsonContent = ref('');
const originalContent = ref('');
const saving = ref(false);

// Load file content when dialog opens
watch(visible, async (newVal) => {
  if (newVal) {
    await loadFileContent();
  }
});

async function loadFileContent() {
  const filePath = cnote.value.lastPath;

  if (!filePath) {
    ElMessage.error(t('tools.noFileOpen'));
    visible.value = false;
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    jsonContent.value = content;
    originalContent.value = content;
  } catch (error: any) {
    console.error('Failed to read file:', error);
    ElMessage.error(t('tools.readFileFailed') + ': ' + error.message);
    visible.value = false;
  }
}

function handleFormat() {
  try {
    const parsed = JSON.parse(jsonContent.value);
    jsonContent.value = JSON.stringify(parsed, null, 2);
    ElMessage.success(t('tools.formatSuccess'));
  } catch (error: any) {
    ElMessage.error(t('tools.formatFailed') + ': ' + error.message);
  }
}

async function handleSave() {
  const filePath = cnote.value.lastPath;

  if (!filePath) {
    ElMessage.error(t('tools.noFileOpen'));
    return;
  }

  // Validate JSON
  try {
    JSON.parse(jsonContent.value);
  } catch (error: any) {
    ElMessage.error(t('tools.invalidJson') + ': ' + error.message);
    return;
  }

  // Check if content changed
  if (jsonContent.value === originalContent.value) {
    ElMessage.info(t('tools.noChanges'));
    visible.value = false;
    return;
  }

  // Confirm save
  try {
    await ElMessageBox.confirm(
      t('tools.saveJsonConfirmDesc'),
      t('tools.saveJsonConfirm'),
      {
        confirmButtonText: t('common.ok'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    saving.value = true;

    // Save to file
    fs.writeFileSync(filePath, jsonContent.value, 'utf-8');

    // Reload editor - need to clear first to avoid duplication
    const parsed = JSON.parse(jsonContent.value);

    if (ttsStore.editorInstance) {
      // Clear the editor first
      await ttsStore.editorInstance.clear();
      // Then render new content
      await ttsStore.editorInstance.render(parsed);
    }

    // Update store
    ttsStore.editerData = parsed;

    ElMessage.success(t('tools.saveSuccess'));
    visible.value = false;
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to save file:', error);
      ElMessage.error(t('tools.saveFailed') + ': ' + error.message);
    }
  } finally {
    saving.value = false;
  }
}

function handleCancel() {
  // Check if content changed
  if (jsonContent.value !== originalContent.value) {
    ElMessageBox.confirm(
      t('tools.unsavedChanges'),
      t('common.confirm'),
      {
        confirmButtonText: t('common.ok'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    )
    .then(() => {
      visible.value = false;
    })
    .catch(() => {
      // User cancelled, do nothing
    });
  } else {
    visible.value = false;
  }
}
</script>

<style scoped>
.editor-header {
  margin-bottom: 16px;
}

.editor-content {
  margin-bottom: 16px;
}

.json-textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  font-size: 13px;
}

.json-textarea :deep(.el-textarea__inner) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  font-size: 13px;
  line-height: 1.5;
  background-color: #f5f5f5;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
