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
      :class="ttsStore.mdTheme !== 'default' ? `theme-${ttsStore.mdTheme}` : ''"
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
  window.addEventListener('keydown', handleSelectAll, true)
})

onBeforeUnmount(() => {
  cmView?.destroy()
  cmView = null
  window.removeEventListener('keydown', handleSelectAll, true)
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
  () => ttsStore.mdCopyTrigger,
  () => { copyPreviewHtml() }
)

watch(
  () => ttsStore.mdMode,
  (mode) => {
    if (mode === 'preview') {
      setTimeout(() => previewEl.value?.focus(), 0)
    } else {
      cmView?.focus()
    }
  }
)

function handleSelectAll(e: KeyboardEvent) {
  if (ttsStore.mdMode !== 'preview') return
  if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
    e.preventDefault()
    e.stopPropagation()
    const el = previewEl.value
    if (!el) return
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(el)
    selection?.removeAllRanges()
    selection?.addRange(range)
  }
}

// 把 DOM 元素的 computed style 内联到 clone 上，用于复制到公众号
function inlineStyles(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement
  const sourceNodes = source.querySelectorAll('*')
  const cloneNodes = clone.querySelectorAll('*')

  // 只内联影响排版和颜色的关键属性，避免内联全部导致过于臃肿
  const INLINE_PROPS = [
    'color', 'background-color', 'font-size', 'font-weight', 'font-style',
    'font-family', 'line-height', 'letter-spacing', 'text-align',
    'border', 'border-left', 'border-bottom', 'border-top',
    'padding', 'margin', 'border-radius',
    'list-style-type', 'text-decoration',
  ]

  sourceNodes.forEach((srcEl, i) => {
    const cloneEl = cloneNodes[i] as HTMLElement
    if (!cloneEl) return
    const computed = window.getComputedStyle(srcEl)
    const inlined = INLINE_PROPS
      .map(p => `${p}:${computed.getPropertyValue(p)}`)
      .join(';')
    cloneEl.setAttribute('style', inlined)
  })

  // 内联根元素自身样式
  const rootComputed = window.getComputedStyle(source)
  const rootInlined = INLINE_PROPS
    .map(p => `${p}:${rootComputed.getPropertyValue(p)}`)
    .join(';')
  clone.setAttribute('style', rootInlined)

  return clone
}

function copyPreviewHtml() {
  const el = previewEl.value
  if (!el) return false
  const cloned = inlineStyles(el)
  const html = cloned.outerHTML
  const blob = new Blob([html], { type: 'text/html' })
  const text = el.innerText
  navigator.clipboard.write([
    new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([text], { type: 'text/plain' }) })
  ])
  return true
}

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

/* 预览模式下清除 CodeMirror 残留的 selection 背景色 */
.md-codemirror :deep(.cm-selectionBackground) {
  background: transparent !important;
}

.md-preview {
  flex: 1;
  overflow-y: auto;
  height: 100%;
}
</style>
