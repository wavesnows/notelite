<template>
  <div class="terminal-panel">
    <div class="terminal-toolbar">
      <span class="terminal-title">Terminal</span>
      <button class="terminal-close" @click="ttsStore.closeTerminal()">✕</button>
    </div>
    <div ref="terminalEl" class="terminal-body"></div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { ipcRenderer } from 'electron'
import { useTtsStore } from '@/store/store'
import path from 'path'
import os from 'os'
import 'xterm/css/xterm.css'

const ttsStore = useTtsStore()
const terminalEl = ref<HTMLElement | null>(null)

let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null
let initialized = false
let outputHandler: ((_event: any, data: string) => void) | null = null

function getCwd(): string {
  const lastPath = ttsStore.cnote.lastPath
  if (lastPath) {
    return path.dirname(lastPath)
  }
  return os.homedir()
}

function init() {
  if (initialized || !terminalEl.value) return
  initialized = true

  terminal = new Terminal({
    cursorBlink: true,
    cursorStyle: 'bar',
    fontSize: 13,
    lineHeight: 1.4,
    fontFamily: 'monospace',
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
  fitAddon.fit()

  terminal.onData((data) => {
    ipcRenderer.send('terminal-input', data)
  })

  terminal.onResize(({ cols, rows }) => {
    ipcRenderer.send('terminal-resize', cols, rows)
  })

  outputHandler = (_event: any, data: string) => {
    terminal?.write(data)
  }
  ipcRenderer.on('terminal-output', outputHandler)

  resizeObserver = new ResizeObserver(() => {
    fitAddon?.fit()
  })
  resizeObserver.observe(terminalEl.value)

  ipcRenderer.send('terminal-open', getCwd())
}

// Init only when panel becomes visible for the first time
// (v-show keeps component mounted even when hidden, so onMounted fires too early)
watch(
  () => ttsStore.terminal.show,
  (visible) => {
    if (visible && !initialized) {
      setTimeout(init, 50)
    }
  }
)

onBeforeUnmount(() => {
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
  height: 280px;
  background: rgba(26, 26, 26, 0.88);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(255,255,255,0.1);
  border-left: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px 0 0 0;
  z-index: 1000;
}

.terminal-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  background: rgba(45, 45, 45, 0.6);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  height: 28px;
  flex-shrink: 0;
}

.terminal-title {
  color: #ccc;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.terminal-close {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  line-height: 1;
}

.terminal-close:hover {
  color: #fff;
}

.terminal-body {
  flex: 1;
  overflow: hidden;
  padding: 6px 10px;
  box-sizing: border-box;
}

.terminal-body :deep(.xterm) {
  height: 100%;
}

.terminal-body :deep(.xterm-viewport) {
  border-radius: 0;
}
</style>
