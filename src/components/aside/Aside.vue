<template>
    <div class="nside">
      <el-menu
        :default-active="page.asideIndex"
        class="el-menu-vertical-demo"
        @select="menuChange"
      >
        <el-menu-item index="1">
          <el-icon><notebook/></el-icon>
          <span></span>
        </el-menu-item>
        <el-menu-item index="2">
          <el-icon><StarFilled /></el-icon>
          <span></span>
        </el-menu-item>
        <el-menu-item index="refresh" @click.stop="refreshTree" style="margin-top: auto;">
          <el-icon :class="{ spinning: refreshing }"><Refresh /></el-icon>
          <span></span>
        </el-menu-item>
      <!-- <el-menu-item index="3">
          <el-icon><Files /></el-icon>
          <span></span>
        </el-menu-item>
        <el-menu-item index="4">
          <el-icon><Menu /></el-icon>
          <span></span>
        </el-menu-item>-->
      </el-menu>
        <!--<el-divider class="divider"/>-->
      <div class="setting"><AConf/></div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  import { useTtsStore } from "@/store/store";
  import { storeToRefs } from "pinia";
  import AConf from "./AConfig.vue";
  import { StarFilled, Refresh } from '@element-plus/icons-vue';

  const ttsStore = useTtsStore();
  const { page, config } = storeToRefs(ttsStore);
  const refreshing = ref(false);

  const menuChange = (index: any) => {
    if (index === 4 || index === 'refresh') return;
    ttsStore.page.asideIndex = index.toString();
  };

  const refreshTree = () => {
    refreshing.value = true;
    ttsStore.refreshTreeData();
    setTimeout(() => { refreshing.value = false; }, 600);
  };
  </script>
  
  <style scoped>
  .nside {
    height: 100%;
    width: 35px !important;
    background-color: #ccc;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border-bottom-left-radius: 10px;
  }
  .divider{
    width: 60%;
    margin: 0 7px;
  }
  .el-menu {
    border-right: unset !important;
    background-color: transparent;
  }
  .el-menu-item {
    box-sizing: border-box;
    border-color: var(--el-menu-active-color);
    padding-left: 5px !important;
    padding-right: 5px;
    height: 40px !important;
  }
  .is-active {
    border-left: 2px solid;
  }
  .setting{
    margin-left: 0px;
    margin-bottom: 0px;
  }

  .spinning {
    animation: spin 0.6s linear;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  </style>
  