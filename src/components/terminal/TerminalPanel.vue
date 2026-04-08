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
import { ref, onMounted, onBeforeUnmount } from 'vue'
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
    fontSize: 13,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
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

  ipcRenderer.on('terminal-output', (_event, data: string) => {
    terminal?.write(data)
  })

  resizeObserver = new ResizeObserver(() => {
    fitAddon?.fit()
  })
  resizeObserver.observe(terminalEl.value)

  ipcRenderer.send('terminal-open', getCwd())
}

onMounted(() => {
  setTimeout(init, 50)
})

onBeforeUnmount(() => {
  ipcRenderer.removeAllListeners('terminal-output')
  resizeObserver?.disconnect()
  terminal?.dispose()
  terminal = null
  fitAddon = null
  initialized = false
})
</script>

<style scoped>
.terminal-panel {
  width: 100%;
  height: 280px;
  background: #1e1e1e;
  display: flex;
  flex-direction: column;
  border-top: 1px solid #333;
  flex-shrink: 0;
}

.terminal-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  background: #2d2d2d;
  border-bottom: 1px solid #333;
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
  padding: 4px 8px;
}
</style>
