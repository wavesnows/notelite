<template>
  <div class="terminal-panel" :style="{ height: panelHeight + 'px' }">
    <!-- Drag handle -->
    <div class="terminal-resize-handle" @mousedown="startDrag"></div>
    <div class="terminal-toolbar">
      <span class="terminal-title">Terminal</span>
      <div class="toolbar-actions">
        <button class="toolbar-btn" @click="setSize('sm')" :class="{ active: currentSize === 'sm' }" title="小">▁</button>
        <button class="toolbar-btn" @click="setSize('md')" :class="{ active: currentSize === 'md' }" title="中">▄</button>
        <button class="toolbar-btn" @click="setSize('lg')" :class="{ active: currentSize === 'lg' }" title="大">█</button>
        <button class="terminal-close" @click="ttsStore.closeTerminal()">✕</button>
      </div>
    </div>
    <div ref="terminalEl" class="terminal-body"></div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { CanvasAddon } from 'xterm-addon-canvas'
import { ipcRenderer } from 'electron'
import { useTtsStore } from '@/store/store'
import path from 'path'
import os from 'os'
import 'xterm/css/xterm.css'

const ttsStore = useTtsStore()
const terminalEl = ref<HTMLElement | null>(null)

const SIZES = { sm: 180, md: 280, lg: 450 }
const panelHeight = ref(SIZES.md)
const currentSize = ref<'sm' | 'md' | 'lg' | 'custom'>('md')

function setSize(size: 'sm' | 'md' | 'lg') {
  currentSize.value = size
  panelHeight.value = SIZES[size]
  setTimeout(() => fitAddon?.fit(), 50)
}

// Drag to resize
let dragStartY = 0
let dragStartHeight = 0

function startDrag(e: MouseEvent) {
  dragStartY = e.clientY
  dragStartHeight = panelHeight.value
  currentSize.value = 'custom'
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

function onDrag(e: MouseEvent) {
  const delta = dragStartY - e.clientY
  const newHeight = Math.min(Math.max(dragStartHeight + delta, 150), window.innerHeight * 0.8)
  panelHeight.value = Math.round(newHeight)
  fitAddon?.fit()
}

function stopDrag() {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  setTimeout(() => fitAddon?.fit(), 50)
}

let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null
let initialized = false
let outputHandler: ((_event: any, data: string) => void) | null = null

function getCwd(): string {
  const lastPath = ttsStore.cnote.lastPath
  if (lastPath) return path.dirname(lastPath)
  return os.homedir()
}

function init() {
  if (initialized || !terminalEl.value) return
  initialized = true

  terminal = new Terminal({
    cursorBlink: true,
    cursorStyle: 'bar',
    fontSize: 14,
    lineHeight: 1.5,
    fontFamily: '"SF Mono", Menlo, monospace',
    fontWeight: '300',
    scrollback: 1000,
    allowTransparency: true,
    theme: {
      background: 'rgba(26, 26, 26, 0)',
      foreground: '#e0e0e0',
      cursor: '#61afef',
      selectionBackground: 'rgba(97,175,239,0.3)',
      black: '#1a1a1a',
      red: '#e06c75',
      green: '#98c379',
      yellow: '#e5c07b',
      blue: '#61afef',
      magenta: '#c678dd',
      cyan: '#56b6c2',
      white: '#abb2bf',
      brightBlack: '#5c6370',
      brightRed: '#e06c75',
      brightGreen: '#98c379',
      brightYellow: '#e5c07b',
      brightBlue: '#61afef',
      brightMagenta: '#c678dd',
      brightCyan: '#56b6c2',
      brightWhite: '#ffffff',
    },
  })

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.open(terminalEl.value)
  terminal.loadAddon(new CanvasAddon())
  fitAddon.fit()

  terminal.onData((data) => ipcRenderer.send('terminal-input', data))
  terminal.onResize(({ cols, rows }) => ipcRenderer.send('terminal-resize', cols, rows))

  outputHandler = (_event: any, data: string) => terminal?.write(data)
  ipcRenderer.on('terminal-output', outputHandler)

  // When PTY exits (e.g. user types 'exit'), show message and reset for next open
  ipcRenderer.once('terminal-exited', () => {
    initialized = false
    ttsStore.closeTerminal()
    // Delay teardown to let xterm finish its current render cycle
    setTimeout(() => {
      if (outputHandler) {
        ipcRenderer.removeListener('terminal-output', outputHandler)
        outputHandler = null
      }
      resizeObserver?.disconnect()
      resizeObserver = null
      try { terminal?.dispose() } catch (_) {}
      terminal = null
      fitAddon = null
    }, 100)
  })

  resizeObserver = new ResizeObserver(() => fitAddon?.fit())
  resizeObserver.observe(terminalEl.value)

  ipcRenderer.send('terminal-open', getCwd())
}

watch(
  () => ttsStore.terminal.show,
  (visible) => { if (visible && !initialized) setTimeout(init, 50) },
  { immediate: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  if (outputHandler) {
    ipcRenderer.removeListener('terminal-output', outputHandler)
    outputHandler = null
  }
  resizeObserver?.disconnect()
  terminal?.dispose()
  terminal = null
  fitAddon = null
  initialized = false
})
</script>

<style scoped>
.terminal-panel {
  position: fixed;
  bottom: 0;
  left: 210px;
  right: 0;
  background: rgba(26, 26, 26, 0.88);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(255,255,255,0.1);
  border-left: 1px solid rgba(255,255,255,0.1);
  border-right: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px 4px 0 0;
  z-index: 1000;
  user-select: none;
}

.terminal-resize-handle {
  position: absolute;
  top: -4px;
  left: 0;
  right: 0;
  height: 8px;
  cursor: ns-resize;
  z-index: 10;
}

.terminal-resize-handle:hover {
  background: rgba(97, 175, 239, 0.3);
  border-radius: 4px 4px 0 0;
}

.terminal-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  background: rgba(45, 45, 45, 0.6);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  border-radius: 4px 4px 0 0;
  height: 28px;
  flex-shrink: 0;
}

.terminal-title {
  color: #ccc;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 3px;
  line-height: 1;
  transition: all 0.15s;
}

.toolbar-btn:hover {
  color: #ccc;
  background: rgba(255,255,255,0.08);
}

.toolbar-btn.active {
  color: #61afef;
  background: rgba(97,175,239,0.15);
}

.terminal-close {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 13px;
  padding: 0 4px;
  line-height: 1;
  margin-left: 4px;
  transition: color 0.15s;
}

.terminal-close:hover {
  color: #e06c75;
}

.terminal-body {
  flex: 1;
  overflow: hidden;
  padding: 6px 10px;
  box-sizing: border-box;
  user-select: text;
}

.terminal-body :deep(.xterm) {
  height: 100%;
}

.terminal-body :deep(.xterm-viewport) {
  border-radius: 0;
}
</style>
