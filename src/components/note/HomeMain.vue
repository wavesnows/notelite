<template>
  <div class="main">
    <MarkdownEditor v-if="isMdFile" />
    <Editor v-else v-model="inputs.noteValue" :initialData="inputs.noteValue" ref="editor" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTtsStore } from '@/store/store'
import { storeToRefs } from 'pinia'
import Editor from '../note/Editor.vue'
import MarkdownEditor from '../note/MarkdownEditor.vue'

const store = useTtsStore()
const { inputs } = storeToRefs(store)

const isMdFile = computed(() => {
  return inputs.value.notePath?.endsWith('.md') ?? false
})
</script>

<style scoped>
.main {
  width: 100%;
  height: 100%;
  margin-top: 0px;
  scroll-behavior: smooth;
  overscroll-behavior: contain;
  display: flex;
  justify-content: space-between;
  overflow-y: auto;
  padding-bottom: 20px;
}
</style>
