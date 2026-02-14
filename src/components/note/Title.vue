<template>
    <!-- Display mode: show title with edit icon on hover -->
    <div v-show="cnote.titleVisable" class="title-display" @click="editShow">
        <h1 class="title-text">{{ cnote.title }}</h1>
        <el-icon class="edit-icon"><Edit /></el-icon>
    </div>

    <!-- Edit mode: input field -->
    <el-input
        ref="myInput"
        v-show="!cnote.titleVisable"
        v-model="cnote.destTitle"
        @blur="okHandler"
        @keyup.enter="okHandler"
        class="title-input"
        placeholder="Enter title..."
    />
</template>

<script lang="ts" setup>
import { useTtsStore } from "@/store/store";
import { ElInput,ElMessage } from "element-plus";
import { storeToRefs } from "pinia";
import { Edit,Check } from "@element-plus/icons-vue";
import { ref, Ref } from 'vue';
import {renameFile} from '@/libs/fileHandler'

const ttsStore = useTtsStore();
var {cnote} = storeToRefs(ttsStore);

const myInput:Ref<typeof ElInput | null> = ref(null)

const changeHandler = () =>{
    console.log("content change")
}

const editShow = () =>{
    ttsStore.cnote.titleVisable = !ttsStore.cnote.titleVisable
    myInput.value?.focus()
}

const okHandler = () =>{
    console.log("OK")
    // Only rename if title actually changed
    if (ttsStore.cnote.destTitle !== ttsStore.cnote.title) {
        renameFile()
    }
    ttsStore.cnote.titleVisable = !ttsStore.cnote.titleVisable;
}

const goBack = () => {
    console.log('go back')
    ElMessage({
    message: 'this is a message.',
    grouping: true,
    offset:40,
    type: 'success'
  })
}
  </script>

<style scoped>
.title-display {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid transparent;
}

.title-display:hover {
  border-bottom-color: #e0e0e0;
}

.title-display:hover .edit-icon {
  opacity: 1;
}

.title-text {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  flex: 1;
}

.edit-icon {
  font-size: 18px;
  color: #909399;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.title-input {
  margin-bottom: 16px;
}

.title-input :deep(.el-input__wrapper) {
  background-color: transparent;
  font-size: 28px;
  font-weight: 600;
  border-radius: 0;
  box-shadow: none;
  border-bottom: 2px solid #409eff;
  padding: 8px 0;
}

.title-input :deep(.el-input__inner) {
  color: #303133;
  font-weight: 600;
}
</style>