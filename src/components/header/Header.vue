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
      <el-button
        size="small"
        circle
        class="circle-btn"
        @click="ipcRenderer.send('openDevTools')"
      >
        <el-icon><Monitor /></el-icon>
      </el-button>
    </div>
    <Title></Title>
   <!-- <Logo />-->
    <div class="tools">
      <Tools />
    </div>
   

  </div>
</template>

<script lang="ts" setup>
import Logo from "./Logo.vue";
import Tools from "./Tools.vue";
import Title from "./HeadTitle.vue"
import { ref } from "vue";

const { ipcRenderer } = require("electron");
const currShow = ref(0);
</script>

<style scoped>
.header {
  height: 28px;
  background: #eee;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  display: flex;
  align-items: center;
  justify-items: auto;
  justify-content: space-between;
}
.win-tools {
  height: 20px;
  margin-left: 0px;
  transform: scale(0.8);
}
.tools {
  transform: scale(0.8);
}

.el-button--small{
  --el-button-size:18px;
}
</style>
