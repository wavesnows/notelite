<template>
  <div class="md-editor-container">
    <div
      v-show="ttsStore.mdMode === 'edit'"
      :inert="ttsStore.mdMode === 'preview'"
      ref="editorEl"
      class="md-codemirror"
    ></div>
    <div
      v-show="ttsStore.mdMode === 'preview'"
      ref="previewEl"
      class="md-preview"
      tabindex="-1"
      v-html="renderedHtml"
    ></div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import MarkdownIt from 'markdown-it'
import { useTtsStore } from '@/store/store'
import '@/assets/md-preview.css'

const fs = require('fs')

const ttsStore = useTtsStore()
const editorEl = ref<HTMLElement | null>(null)
const previewEl = ref<HTMLElement | null>(null)
const content = ref('')
let cmView: EditorView | null = null

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })

const renderedHtml = computed(() => md.render(content.value))

function loadFile(filePath: string) {
  if (!filePath || !fs.existsSync(filePath)) return
  const text = fs.readFileSync(filePath, 'utf8')
  content.value = text
  if (cmView) {
    cmView.dispatch({
      changes: { from: 0, to: cmView.state.doc.length, insert: text }
    })
  }
}

function saveFile() {
  const filePath = ttsStore.inputs.notePath
  if (!filePath) return
  fs.writeFileSync(filePath, content.value, 'utf8')
}

onMounted(() => {
  cmView = new EditorView({
    doc: content.value,
    extensions: [
      basicSetup,
      markdown(),
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          content.value = update.state.doc.toString()
          saveFile()
        }
      }),
    ],
    parent: editorEl.value!,
  })

  loadFile(ttsStore.inputs.notePath)
})

onBeforeUnmount(() => {
  cmView?.destroy()
  cmView = null
})

watch(
  () => ttsStore.inputs.notePath,
  (newPath) => {
    if (newPath && newPath.endsWith('.md')) {
      loadFile(newPath)
    }
  }
)

watch(
  () => ttsStore.mdMode,
  (mode) => {
    if (mode === 'preview') {
      // 让预览区获得焦点，Cmd+A 选中预览文本而非 CodeMirror 内容
      setTimeout(() => previewEl.value?.focus(), 0)
    } else {
      cmView?.focus()
    }
  }
)
</script>

<style scoped>
.md-editor-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.md-codemirror {
  flex: 1;
  overflow: auto;
  height: 100%;
}

.md-codemirror :deep(.cm-editor) {
  height: 100%;
  font-size: 14px;
}

.md-preview {
  flex: 1;
  overflow-y: auto;
  height: 100%;
}
</style>
