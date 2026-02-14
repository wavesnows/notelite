<template>
  <div class="breadcrumb-container" v-if="breadcrumbs.length > 0">
    <div class="custom-breadcrumb">
      <span
        v-for="(item, index) in breadcrumbs"
        :key="index"
        class="breadcrumb-item"
        :class="{ 'is-clickable': index < breadcrumbs.length - 1, 'is-last': index === breadcrumbs.length - 1 }"
        @click="handleBreadcrumbClick(item, index)"
      >
        <span class="breadcrumb-content">
          <el-icon v-if="index === 0"><Folder /></el-icon>
          <span class="breadcrumb-text">{{ item.label }}</span>
        </span>
        <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator">/</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTtsStore } from '@/store/store';
import { storeToRefs } from 'pinia';
import { Folder } from '@element-plus/icons-vue';
import path from 'path';

const ttsStore = useTtsStore();
const { cnote, notebook } = storeToRefs(ttsStore);

const breadcrumbs = computed(() => {
  const filePath = cnote.value.lastPath;
  const notebookPath = notebook.value.currentPath;

  if (!filePath || !notebookPath) {
    return [];
  }

  // Get relative path from notebook root
  const relativePath = path.relative(notebookPath, filePath);

  // Split into parts
  const parts = relativePath.split(path.sep);

  // Build breadcrumb items
  const items = [];

  // Add notebook name as first item
  items.push({
    label: path.basename(notebookPath),
    path: notebookPath,
    isFolder: true
  });

  // Add folder parts
  let currentPath = notebookPath;
  for (let i = 0; i < parts.length - 1; i++) {
    currentPath = path.join(currentPath, parts[i]);
    items.push({
      label: parts[i],
      path: currentPath,
      isFolder: true
    });
  }

  // Add file name (without .json extension)
  const fileName = parts[parts.length - 1].replace('.json', '');
  items.push({
    label: fileName,
    path: filePath,
    isFolder: false
  });

  return items;
});

function handleBreadcrumbClick(item: any, index: number) {
  // Only allow clicking on folders (not the current file)
  if (index < breadcrumbs.value.length - 1 && item.isFolder) {
    console.log('Navigate to folder:', item.path);
    // Expand tree to show this folder
    ttsStore.expandTreeToPath(item.path);
  }
}
</script>

<style scoped>
.breadcrumb-container {
  padding: 0;
  font-size: 11px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-app-region: drag;
}

.custom-breadcrumb {
  display: flex;
  align-items: center;
  line-height: 1;
  -webkit-app-region: no-drag;
}

.breadcrumb-item {
  display: inline-flex;
  align-items: center;
  color: #909399;
  font-weight: normal;
}

.breadcrumb-content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.2s;
}

.breadcrumb-text {
  display: inline-block;
}

.breadcrumb-separator {
  color: #909399;
  margin: 0 2px;
  font-weight: normal;
  user-select: none;
}

.breadcrumb-item.is-clickable {
  cursor: pointer;
  color: #606266;
}

.breadcrumb-item.is-clickable:hover .breadcrumb-content {
  color: #409eff;
  background-color: #f5f7fa;
}

.breadcrumb-item.is-last {
  color: #303133;
  font-weight: 500;
}

.el-icon {
  font-size: 12px;
  color: #909399;
}
</style>
