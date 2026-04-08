<template>
  <!-- MD 编辑/预览切换 + 复制全文，仅 .md 文件时显示 -->
  <template v-if="isMdFile">
    <el-tooltip :content="ttsStore.mdMode === 'edit' ? '切换到预览' : '切换到编辑'" class="tool-tooltip">
      <el-button size="small" circle class="tool-btn" @click="toggleMdMode">
        <el-icon v-if="ttsStore.mdMode === 'edit'"><View /></el-icon>
        <el-icon v-else><EditPen /></el-icon>
      </el-button>
    </el-tooltip>
    <el-tooltip v-if="ttsStore.mdMode === 'edit'" :content="ttsStore.mdEditor.lineWrap ? '关闭自动折行' : '开启自动折行'" class="tool-tooltip">
      <el-button size="small" circle class="tool-btn" @click="ttsStore.mdEditor.lineWrap = !ttsStore.mdEditor.lineWrap" :type="ttsStore.mdEditor.lineWrap ? 'primary' : ''">
        <el-icon><Minus /></el-icon>
      </el-button>
    </el-tooltip>
    <el-tooltip v-if="ttsStore.mdMode === 'preview'" content="复制全文（带样式）" class="tool-tooltip">
      <el-button size="small" circle class="tool-btn" @click="copyAll">
        <el-icon><CopyDocument /></el-icon>
      </el-button>
    </el-tooltip>
  </template>
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

import { computed } from 'vue'
import { useTtsStore } from "@/store/store";
import { storeToRefs } from "pinia";
import {removeFile} from '@/libs/fileHandler'
import {saveContent} from '@/libs/editor'
import {ElMessageBox, ElMessage} from 'element-plus'
import { useI18n } from 'vue-i18n'
import { Clock, QuestionFilled, View, EditPen, CopyDocument, Minus } from '@element-plus/icons-vue'
//import {  DocumentAdd } from "@element-plus/icons-vue";

//const currShow = ref(0);
const { t } = useI18n()
const ttsStore = useTtsStore();
var { editerflag, readOnly, inputs } = storeToRefs(ttsStore);

const isMdFile = computed(() => inputs.value.notePath?.endsWith('.md') ?? false)

function toggleMdMode() {
  ttsStore.mdMode = ttsStore.mdMode === 'edit' ? 'preview' : 'edit'
}

function copyAll() {
  ttsStore.triggerMdCopy()
  ElMessage({ message: '已复制（含样式），可直接粘贴到公众号', type: 'success', duration: 2000 })
}


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