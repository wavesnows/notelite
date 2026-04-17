<template>
  <div class="md-editor-container">
    <div
      v-show="ttsStore.mdMode === 'edit'"
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
import { Compartment, EditorState } from '@codemirror/state'
import MarkdownIt from 'markdown-it'
import { useTtsStore } from '@/store/store'
import '@/assets/md-preview.css'

const fs = require('fs')

const ttsStore = useTtsStore()
const editorEl = ref<HTMLElement | null>(null)
const previewEl = ref<HTMLElement | null>(null)
const content = ref('')
let cmView: EditorView | null = null
let saveStatusTimer: ReturnType<typeof setTimeout> | null = null
const lineWrapCompartment = new Compartment()
const readOnlyCompartment = new Compartment()

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
  try {
    fs.writeFileSync(filePath, content.value, 'utf8')
    // Throttle save status update to avoid flickering on every keystroke
    if (saveStatusTimer) clearTimeout(saveStatusTimer)
    saveStatusTimer = setTimeout(() => {
      ttsStore.setSaveStatus('saved', 'Saved')
      ttsStore.scheduleGitStatusCheck()
    }, 1000)
  } catch (e: any) {
    ttsStore.setSaveStatus('error', e.message)
  }
}

onMounted(() => {
  cmView = new EditorView({
    doc: content.value,
    extensions: [
      basicSetup,
      markdown(),
      oneDark,
      lineWrapCompartment.of(ttsStore.mdEditor.lineWrap ? EditorView.lineWrapping : []),
      readOnlyCompartment.of(EditorState.readOnly.of(ttsStore.readOnly)),
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
  () => ttsStore.readOnly,
  (val) => {
    cmView?.dispatch({
      effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(val))
    })
  }
)

watch(
  () => ttsStore.mdEditor.lineWrap,
  (wrap) => {
    cmView?.dispatch({
      effects: lineWrapCompartment.reconfigure(wrap ? EditorView.lineWrapping : [])
    })
  }
)

watch(
  () => ttsStore.inputs.notePath,
  (newPath) => {
    if (newPath && (!newPath.endsWith('.json') || ttsStore.showHiddenFiles)) {
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

/* 编辑模式选中颜色，更明显 */
.md-codemirror :deep(.cm-selectionBackground) {
  background: rgba(100, 180, 255, 0.35) !important;
}

.md-codemirror :deep(.cm-focused .cm-selectionBackground) {
  background: rgba(100, 180, 255, 0.45) !important;
}

.md-preview {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
}
</style>
