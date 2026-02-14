<template>
  <div class="editor-container">
    <div class="title-container">
      <Title></Title>
    </div>
    <div ref="editor" class="editor"></div>
  </div>
</template>

<script lang="ts" setup>
import {ref, onMounted, onUnmounted, watch} from 'vue'
import EditorJS from "@editorjs/editorjs";
import { useTtsStore } from "@/store/store";
import { initEditor, saveContent} from "@/libs/editor";
import { storeToRefs } from "pinia";
import Title from './Title.vue'

const ttsStore = useTtsStore();
//var {editerData,readOnly,inputs} = storeToRefs(ttsStore);
const editor = ref<HTMLElement | null>(null);

var editorInstance:EditorJS;

watch(
  () => ttsStore.readOnly, (newValue, oldValue) => {
    editorInstance.readOnly.toggle()}
)

watch(
  () => ttsStore.editerData, async (newv,oldv) => {
    console.log('value change', 'blocks:', newv?.blocks?.length)
    if (editorInstance && newv && newv.blocks !== undefined) {
      try {
        // For empty blocks, use clear instead of render to avoid errors
        if (newv.blocks.length === 0) {
          console.log('Empty blocks - using clear()')
          await editorInstance.isReady
          await editorInstance.clear()
        } else {
          console.log('Non-empty blocks - using render()')
          await editorInstance.render(newv)
        }
      } catch (error) {
        console.error('Error updating editor:', error)
      }
    }
   // ttsStore.editerData = newv
    ttsStore.setLastEditNote();
  }
)

onMounted(() => {
  editorInstance = initEditor(editor)
  ttsStore.editorInstance = editorInstance;

  // Start auto-save
  ttsStore.startAutoSave();

  // Listen for auto-save events
  const handleAutoSave = () => {
    if (ttsStore.autoSave.hasUnsavedChanges) {
      saveContent();
    }
  };
  window.addEventListener('auto-save', handleAutoSave);

  // Listen for editor changes to mark content as changed
  const handleEditorChange = () => {
    ttsStore.markContentChanged();
  };

  // EditorJS doesn't have a direct onChange event, so we'll mark as changed on any interaction
  if (editor.value) {
    editor.value.addEventListener('input', handleEditorChange, true);
    editor.value.addEventListener('keydown', handleEditorChange, true);
  }

  // Cleanup function stored for unmount
  (window as any).__editorCleanup = () => {
    window.removeEventListener('auto-save', handleAutoSave);
    if (editor.value) {
      editor.value.removeEventListener('input', handleEditorChange, true);
      editor.value.removeEventListener('keydown', handleEditorChange, true);
    }
  };
})

onUnmounted(() => {
  // Stop auto-save timer
  ttsStore.stopAutoSave();

  // Cleanup event listeners
  if ((window as any).__editorCleanup) {
    (window as any).__editorCleanup();
  }
})
</script>

<style>
.editor h1 {
  font-size: 2em !important;
}

.title-container{
  display: flex;
  margin-top: 2px;
  margin-bottom: 4px;
}

.editor-container {
  width: 1000px;
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
 /*
.ce-block__content {
  max-width: 100%;
  padding-left: 10px;
  padding-right: 10px;
}
*/
:deep(.el-input__wrapper) {
  background-color: transparent;
  font-size: 1.5rem;
  border-radius:0px;
  
}

:deep(.el-input__inner){
  color: #555;
}
</style>