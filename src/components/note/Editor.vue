<template>
  <div class="editor-container">
    <div class="title-container">
      <Title></Title>
    </div>
    <div ref="editor" class="editor"></div>
  </div>
</template>

<script lang="ts" setup>
import {ref, onMounted, watch} from 'vue'
import EditorJS from "@editorjs/editorjs";
import { useTtsStore } from "@/store/store";
import { initEditor} from "@/libs/editor";
import { storeToRefs } from "pinia";
import Title from './Title.vue'

const ttsStore = useTtsStore();
//var {editerData,readOnly,inputs} = storeToRefs(ttsStore);
const editor = ref(null);

var editorInstance:EditorJS;

watch(
  () => ttsStore.readOnly, (newValue, oldValue) => {
    editorInstance.readOnly.toggle()}
)

watch(
  () => ttsStore.editerData, (newv,oldv) => {
    console.log('value change')
    editorInstance.render(newv)
   // ttsStore.editerData = newv
    ttsStore.setLastPath();
  } 
)

onMounted(() => {
  editorInstance = initEditor(editor)
  ttsStore.editorInstance = editorInstance;
  })
</script>

<style>
.editor h1 {
  font-size: 2em !important;
}

.title-container{
  display: flex;
}

.editor-container {
  width: 800px;
  margin: 0 auto;
  display: block;
}
.editor * {
 /* font-family: 'Your Font Name', sans-serif;*/
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

}

.editor {
  width: 100%;
  height: 800px;
}

:deep(.el-input__wrapper) {
  background-color: transparent;
  font-size: 1.5rem;
  border-radius:0px;
  
}

:deep(.el-input__inner){
  color: #555;
}
</style>