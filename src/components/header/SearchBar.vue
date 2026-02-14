<template>
  <div class="search-bar">
    <el-input
      v-model="searchQuery"
      :placeholder="t('search.placeholder')"
      :prefix-icon="Search"
      clearable
      @input="handleSearch"
      @clear="handleClear"
      @keyup.enter="handleEnter"
      @keyup.esc="handleEsc"
      class="search-input"
    >
      <template #suffix>
        <el-icon v-if="ttsStore.search.isSearching" class="is-loading">
          <Loading />
        </el-icon>
      </template>
    </el-input>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Search, Loading } from '@element-plus/icons-vue';
import { useTtsStore } from '@/store/store';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const ttsStore = useTtsStore();
const searchQuery = ref('');

// Debounce timer
let debounceTimer: NodeJS.Timeout | null = null;

const handleSearch = () => {
  // Clear previous timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Debounce search for 300ms
  debounceTimer = setTimeout(() => {
    if (searchQuery.value.trim()) {
      ttsStore.performFullTextSearch(searchQuery.value);
    } else {
      ttsStore.clearSearch();
    }
  }, 300);
};

const handleClear = () => {
  searchQuery.value = '';
  ttsStore.clearSearch();
};

const handleEnter = () => {
  if (searchQuery.value.trim()) {
    ttsStore.performFullTextSearch(searchQuery.value);
  }
};

const handleEsc = () => {
  searchQuery.value = '';
  ttsStore.clearSearch();
};

// Watch store query changes (for external updates)
watch(() => ttsStore.search.query, (newQuery) => {
  if (newQuery !== searchQuery.value) {
    searchQuery.value = newQuery;
  }
});
</script>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}

.search-input {
  width: 200px;
  transition: width 0.3s ease;
}

.search-input:focus-within {
  width: 300px;
}

.search-input :deep(.el-input__wrapper) {
  -webkit-app-region: no-drag;
  background-color: transparent;
  box-shadow: none;
  border: 1px solid transparent;
  transition: all 0.3s ease;
}

.search-input :deep(.el-input__wrapper):hover {
  border-color: #dcdfe6;
  background-color: rgba(255, 255, 255, 0.3);
}

.search-input :deep(.el-input__wrapper.is-focus) {
  border-color: #409eff;
  background-color: rgba(255, 255, 255, 0.6);
}

.search-input :deep(.el-input__inner) {
  -webkit-app-region: no-drag;
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
