<template>
  <el-tooltip content="Save">    
    <el-button size="small" circle class="tool-btn" @click="saveHandle">
      <el-icon><DocumentAdd /></el-icon>
    </el-button>
  </el-tooltip>
  <el-tooltip content="Delete File">   
    <el-button size="small" circle class="tool-btn" @click="removeHandle">
      <el-icon><Delete /></el-icon>
  
    </el-button>
  </el-tooltip>
  <el-tooltip content="Lock/Edit Mode">   
    <el-button size="small" circle class="tool-btn" @click="editHandle"> 
      <el-icon v-show="readOnly == false"><Lock /></el-icon>
      <el-icon v-show="readOnly == true"><Edit /></el-icon>
    </el-button>
  </el-tooltip>
</template>
  
<script setup lang="ts">

import { useTtsStore } from "@/store/store";
import { storeToRefs } from "pinia";
import {removeFile} from '@/libs/fileHandler'
import {saveContent} from '@/libs/editor'
//import {  DocumentAdd } from "@element-plus/icons-vue";

//const currShow = ref(0);

const ttsStore = useTtsStore();
var { editerflag,readOnly } = storeToRefs(ttsStore);


function saveHandle(){
    console.log("Save Btn")
    //editerflag.value = true
    saveContent()
};

function editHandle(){
  console.log("Edit Press")
  let v =ttsStore.readOnly
  readOnly.value = !v;
}

async function removeHandle(){
  console.log("Remove Press")
  removeFile()
}


</script>
  
  <style scoped>
  /* From uiverse.io by @mrhyddenn */
  .button {
    -webkit-app-region: no-drag;
    display: flex;
  }
  .tool-btn {
    margin-left: 1px !important;
  }
  
  </style>