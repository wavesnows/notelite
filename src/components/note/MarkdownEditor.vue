<template>
  <div class="md-editor-container">
    <div class="md-toolbar">
      <span class="md-filename">{{ filename }}</span>
      <div class="md-mode-switch">
        <el-button
          :type="mode === 'edit' ? 'primary' : 'default'"
          size="small"
          @click="mode = 'edit'"
        >编辑</el-button>
        <el-button
          :type="mode === 'preview' ? 'primary' : 'default'"
          size="small"
          @click="mode = 'preview'"
        >预览</el-button>
      </div>
    </div>

    <div v-show="mode === 'edit'" ref="editorEl" class="md-codemirror"></div>

    <div
      v-show="mode === 'preview'"
      class="md-preview"
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
const mode = ref<'edit' | 'preview'>('edit')
const editorEl = ref<HTMLElement | null>(null)
const content = ref('')
let cmView: EditorView | null = null

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })

const filename = computed(() => {
  const p = ttsStore.inputs.notePath
  return p ? p.split('/').pop() : ''
})

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
</script>

<style scoped>
.md-editor-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.md-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid #eee;
}

.md-filename {
  font-size: 13px;
  color: #888;
}

.md-mode-switch {
  display: flex;
  gap: 4px;
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
