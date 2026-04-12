<template>
  <div class="aside" :style="{ width: width + 'px' }">
    <FileTree v-if="ttsStore.page.asideIndex == '1'"/>
    <Favorites v-if="ttsStore.page.asideIndex == '2'"/>
    <RecentFiles v-if="ttsStore.page.asideIndex == '3'"/>
    <Common v-if="ttsStore.page.asideIndex == '4'"/>
    <Lan v-if="ttsStore.page.asideIndex == '5'"/>
    <!-- Drag handle -->
    <div class="resize-handle" @mousedown="startDrag"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTtsStore } from "@/store/store";
import { storeToRefs } from "pinia";
import FileTree from "./FileTree.vue"
import Favorites from "./Favorites.vue"
import RecentFiles from "./RecentFiles.vue"
import Common from "./Common.vue";
import Lan from "./Lan.vue"

const ttsStore = useTtsStore();
const { page, config } = storeToRefs(ttsStore);

const MIN_WIDTH = 120;
const MAX_WIDTH = 400;
const width = ref(200);

onMounted(() => {
  ttsStore.layout.bsideWidth = width.value;
});

let dragStartX = 0;
let dragStartWidth = 0;

function startDrag(e: MouseEvent) {
  dragStartX = e.clientX;
  dragStartWidth = width.value;
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}

function onDrag(e: MouseEvent) {
  const delta = e.clientX - dragStartX;
  width.value = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth + delta));
  ttsStore.layout.bsideWidth = width.value;
}

function stopDrag() {
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}
</script>

<style scoped>
.aside {
  height: 100%;
  background-color: var(--note-side-bgcolor);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  flex-shrink: 0;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
}

.resize-handle:hover {
  background: rgba(64, 158, 255, 0.4);
}

.el-menu {
  border-right: unset !important;
}

.el-menu-item {
  box-sizing: border-box;
  background-color: var(--note-side-bgcolor);
  border-color: var(--el-menu-active-color);
}

.is-active {
  border-left: 2px solid;
}
</style>
