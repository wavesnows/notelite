<template>
  <div class="main">
    <template v-if="hasNote">
      <div class="title-container">
        <Title />
      </div>
      <MarkdownEditor v-if="isMdFile" />
      <Editor v-else v-model="inputs.noteValue" :initialData="inputs.noteValue" ref="editor" />
    </template>
    <Welcome v-else />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTtsStore } from '@/store/store'
import { storeToRefs } from 'pinia'
import Editor from '../note/Editor.vue'
import MarkdownEditor from '../note/MarkdownEditor.vue'
import Title from '../note/Title.vue'
import Welcome from '../note/Welcome.vue'

const store = useTtsStore()
const { inputs, cnote } = storeToRefs(store)

const isMdFile = computed(() => inputs.value.notePath?.endsWith('.md') ?? false)
const hasNote = computed(() => !!cnote.value.lastPath)
</script>

<style scoped>
.main {
  width: 100%;
  height: 100%;
  margin-top: 0px;
  scroll-behavior: smooth;
  overscroll-behavior: none;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.title-container {
  flex-shrink: 0;
}
</style>
