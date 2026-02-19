<template>
  <!--<el-tooltip content="Save">
    <el-button size="small" circle class="tool-btn" @click="saveHandle">
      <el-icon><DocumentAdd /></el-icon>
    </el-button>
  </el-tooltip>-->
  <el-tooltip :content="t('tools.deleteFile')" class="tool-tooltip">
    <el-button size="small" circle class="tool-btn" @click="removeHandle">
      <el-icon><Delete /></el-icon>
    </el-button>
  </el-tooltip>
  <el-tooltip :content="t('tools.lockEditMode')" class="tool-tooltip">
    <el-button size="small" circle class="tool-btn" @click="editHandle">
      <el-icon v-show="readOnly == false"><Lock /></el-icon>
      <el-icon v-show="readOnly == true"><Edit /></el-icon>
    </el-button>
  </el-tooltip>
  <el-tooltip :content="t('history.viewHistory')" class="tool-tooltip">
    <el-button size="small" circle class="tool-btn" @click="openHistory">
      <el-icon><Clock /></el-icon>
    </el-button>
  </el-tooltip>
  <el-tooltip :content="t('help.keyboardShortcuts')" class="tool-tooltip">
    <el-button size="small" circle class="tool-btn" @click="openHelp">
      <el-icon><QuestionFilled /></el-icon>
    </el-button>
  </el-tooltip>
</template>
<script setup lang="ts">

import { useTtsStore } from "@/store/store";
import { storeToRefs } from "pinia";
import {removeFile} from '@/libs/fileHandler'
import {saveContent} from '@/libs/editor'
import {ElMessageBox} from 'element-plus'
import { useI18n } from 'vue-i18n'
import { Clock, QuestionFilled } from '@element-plus/icons-vue'
//import {  DocumentAdd } from "@element-plus/icons-vue";

//const currShow = ref(0);
const { t } = useI18n()
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
  ElMessageBox.confirm(
    t('tools.confirmDelete', { name: ttsStore.treeMenu.node.label }),
    t('common.delete'),
    {
      confirmButtonText: t('common.ok'),
      cancelButtonText: t('common.cancel'),
      type: 'warning',
    }
  )
  .then(()=>{
    removeFile()
    })
  .catch(() => {
      // catch error
    })
  console.log("Remove Press")
}

function openHistory() {
  ttsStore.openHistoryViewer();
}

function openHelp() {
  ttsStore.openHelpDialog();
}
</script>
  
<style scoped>
  .button {
    -webkit-app-region: no-drag;
    display: flex;
    gap: 4px;
  }

  .tool-tooltip {
    display: inline-flex;
    margin: 0;
  }

  .tool-btn {
    width: 24px;
    height: 24px;
    padding: 0;
    min-width: 24px;
    margin: 0 !important;
  }

  .tool-btn .el-icon {
    font-size: 14px;
  }

  :deep(.el-tooltip__trigger) {
    display: inline-flex;
    margin: 0;
  }

  :deep(.el-button) {
    margin: 0 !important;
  }
</style>