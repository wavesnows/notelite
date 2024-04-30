<template>
    <div class="aside">
      <FileTree v-if="ttsStore.page.asideIndex == '1'"/>
      <Common v-if="ttsStore.page.asideIndex == '2'"/>
      <Lan v-if="ttsStore.page.asideIndex == '3'"/>
</div>

  </template>
  
  <script setup lang="ts">
  import { useTtsStore } from "@/store/store";
  import { storeToRefs } from "pinia";
  import FileTree from "./FileTree.vue"
  import Common from "./Common.vue";
  import Lan from "./Lan.vue"
  
  const ttsStore = useTtsStore();
  const { page, config } = storeToRefs(ttsStore);

 
  
  const menuChange = (index: number) => {
    if (index === 4) return;
    ttsStore.page.asideIndex = index.toString();
  };
  </script>
  
  <style scoped>
  .aside {
    height: 100%;
    background-color: var(--note-side-bgcolor);
    /*border-right: 1px solid #dcdfe6;
    border-top: 1px solid #dcdfe6;*/
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 175px;
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
  