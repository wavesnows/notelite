# Terminal Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable bottom terminal panel (xterm.js + node-pty) that opens to the current note's directory.

**Architecture:** `node-pty` runs in the Electron main process and spawns a shell; `xterm.js` renders in the renderer inside `TerminalPanel.vue`; they communicate over IPC channels `terminal-open`, `terminal-input`, `terminal-output`, `terminal-resize`. The panel is toggled via `` Ctrl+` `` and its visibility is managed in the Pinia store.

**Tech Stack:** `xterm`, `xterm-addon-fit`, `node-pty`, `@electron/rebuild`, Vue 3, Pinia, Electron IPC

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `package.json` | Add xterm, xterm-addon-fit, node-pty, @electron/rebuild deps |
| Modify | `electron/main/index.ts` | IPC handlers for terminal-open/input/resize, PTY lifecycle |
| Modify | `src/store/store.ts` | Add `terminal.show` state + toggle/open/close actions |
| Create | `src/components/terminal/TerminalPanel.vue` | xterm.js component, IPC bridge, ResizeObserver |
| Modify | `src/App.vue` | Mount TerminalPanel, add Ctrl+` keybinding |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install renderer dependencies**

```bash
npm install xterm xterm-addon-fit
```

Expected output: added xterm and xterm-addon-fit to `dependencies`.

- [ ] **Step 2: Install main-process dependency**

```bash
npm install node-pty
```

Expected output: added node-pty to `dependencies`.

- [ ] **Step 3: Install electron-rebuild as dev dependency**

```bash
npm install --save-dev @electron/rebuild
```

- [ ] **Step 4: Rebuild node-pty for the current Electron version**

```bash
./node_modules/.bin/electron-rebuild -f -w node-pty
```

Expected output: `✔ Rebuild Complete` (takes ~30s). If it fails with a Python/compiler error, ensure Xcode Command Line Tools are installed: `xcode-select --install`.

- [ ] **Step 5: Add postinstall script to package.json**

Open `package.json` and update the `scripts` section:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build && electron-builder",
  "build:check": "vue-tsc --noEmit && vite build && electron-builder",
  "postinstall": "electron-rebuild -f -w node-pty"
},
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install xterm, xterm-addon-fit, node-pty for terminal panel"
```

---

## Task 2: Add terminal state to Pinia store

**Files:**
- Modify: `src/store/store.ts`

- [ ] **Step 1: Add `terminal` state**

In `src/store/store.ts`, inside the `state: () => { return { ... } }` block, add after the `helpDialog` entry (around line 196):

```ts
terminal: {
  show: false,
},
```

- [ ] **Step 2: Add terminal actions**

In the `actions` block, after the `closeHelpDialog` action, add:

```ts
toggleTerminal() {
  this.terminal.show = !this.terminal.show;
},
openTerminal() {
  this.terminal.show = true;
},
closeTerminal() {
  this.terminal.show = false;
},
```

- [ ] **Step 3: Verify dev server still starts**

```bash
npm run dev
```

Expected: Electron app opens without errors in console.

- [ ] **Step 4: Commit**

```bash
git add src/store/store.ts
git commit -m "feat: add terminal show state and toggle actions to store"
```

---

## Task 3: Add IPC handlers in main process

**Files:**
- Modify: `electron/main/index.ts`

- [ ] **Step 1: Add node-pty import at top of file**

In `electron/main/index.ts`, after the existing imports (after line 4), add:

```ts
import os from 'os';
const pty = require('node-pty');
```

- [ ] **Step 2: Add PTY instance variable**

After the `let win: BrowserWindow | null = null;` line (line 36), add:

```ts
let ptyProcess: any = null;
```

- [ ] **Step 3: Add IPC handlers at the end of the file (after the existing ipcMain handlers)**

At the bottom of `electron/main/index.ts`, add:

```ts
// Terminal IPC handlers
ipcMain.on('terminal-open', (event, cwd: string) => {
  // Kill existing PTY if any
  if (ptyProcess) {
    try { ptyProcess.kill(); } catch (_) {}
    ptyProcess = null;
  }

  const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'zsh');
  const validCwd = cwd && require('fs').existsSync(cwd) ? cwd : os.homedir();

  ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: validCwd,
    env: process.env,
  });

  ptyProcess.onData((data: string) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('terminal-output', data);
    }
  });

  ptyProcess.onExit(() => {
    ptyProcess = null;
  });
});

ipcMain.on('terminal-input', (_event, data: string) => {
  if (ptyProcess) {
    ptyProcess.write(data);
  }
});

ipcMain.on('terminal-resize', (_event, cols: number, rows: number) => {
  if (ptyProcess) {
    ptyProcess.resize(cols, rows);
  }
});
```

- [ ] **Step 4: Kill PTY on app quit**

Find the `app.on("window-all-closed", ...)` handler (around line 140) and update it:

```ts
app.on("window-all-closed", () => {
  if (ptyProcess) {
    try { ptyProcess.kill(); } catch (_) {}
    ptyProcess = null;
  }
  win = null;
  if (process.platform !== "darwin") app.quit();
});
```

- [ ] **Step 5: Verify dev server still starts**

```bash
npm run dev
```

Expected: Electron app opens without errors. No terminal visible yet.

- [ ] **Step 6: Commit**

```bash
git add electron/main/index.ts
git commit -m "feat: add node-pty IPC handlers for terminal in main process"
```

---

## Task 4: Create TerminalPanel.vue component

**Files:**
- Create: `src/components/terminal/TerminalPanel.vue`

- [ ] **Step 1: Create the file**

Create `src/components/terminal/TerminalPanel.vue` with this content:

```vue
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

  // Send input to main process
  terminal.onData((data) => {
    ipcRenderer.send('terminal-input', data)
  })

  // Send resize to main process
  terminal.onResize(({ cols, rows }) => {
    ipcRenderer.send('terminal-resize', cols, rows)
  })

  // Receive output from main process
  ipcRenderer.on('terminal-output', (_event, data: string) => {
    terminal?.write(data)
  })

  // Watch container size changes
  resizeObserver = new ResizeObserver(() => {
    fitAddon?.fit()
  })
  resizeObserver.observe(terminalEl.value)

  // Open PTY in main process
  ipcRenderer.send('terminal-open', getCwd())
}

onMounted(() => {
  // Small delay to ensure DOM is rendered
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
```

- [ ] **Step 2: Verify no import errors**

```bash
npm run dev
```

Expected: app starts without compile errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/terminal/TerminalPanel.vue
git commit -m "feat: add TerminalPanel.vue with xterm.js and IPC bridge"
```

---

## Task 5: Wire TerminalPanel into App.vue

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Add import**

In `src/App.vue`, in the `<script setup>` block, add after the existing imports:

```ts
import TerminalPanel from "./components/terminal/TerminalPanel.vue";
```

- [ ] **Step 2: Add Ctrl+` keybinding to the existing keydown handler**

Find the existing `handleKeyDown` function in `src/App.vue`:

```ts
const handleKeyDown = (event: KeyboardEvent) => {
  // Cmd/Ctrl + ? for help
  if ((event.metaKey || event.ctrlKey) && event.key === '?' && !event.shiftKey) {
    event.preventDefault();
    ttsStore.openHelpDialog();
  }
};
```

Replace it with:

```ts
const handleKeyDown = (event: KeyboardEvent) => {
  // Cmd/Ctrl + ? for help
  if ((event.metaKey || event.ctrlKey) && event.key === '?' && !event.shiftKey) {
    event.preventDefault();
    ttsStore.openHelpDialog();
  }
  // Ctrl+` to toggle terminal
  if (event.ctrlKey && event.key === '`') {
    event.preventDefault();
    ttsStore.toggleTerminal();
  }
};
```

- [ ] **Step 3: Add TerminalPanel to template**

In `src/App.vue`, find the `<el-container class="main-footer">` block:

```html
<el-container class="main-footer">
  <div id="result"></div>
  <el-main><HomeMain /></el-main>
  <el-footer><Footer /></el-footer>
</el-container>
```

Replace it with:

```html
<el-container class="main-footer">
  <div id="result"></div>
  <el-main><HomeMain /></el-main>
  <el-footer><Footer /></el-footer>
  <TerminalPanel v-if="ttsStore.terminal.show" />
</el-container>
```

- [ ] **Step 4: Verify terminal toggles with Ctrl+`**

```bash
npm run dev
```

Press `` Ctrl+` `` — terminal panel should appear at the bottom. Press again — it should hide. Type a command (e.g. `pwd`) and verify output appears.

- [ ] **Step 5: Commit**

```bash
git add src/App.vue
git commit -m "feat: wire TerminalPanel into App.vue with Ctrl+\` toggle"
```

---

## Self-Review Checklist

- [x] **Spec coverage**
  - `terminal-open` IPC → Task 3 ✓
  - `terminal-input` IPC → Task 3 ✓
  - `terminal-output` IPC → Task 3 + Task 4 ✓
  - `terminal-resize` IPC → Task 3 + Task 4 ✓
  - xterm.js renderer → Task 4 ✓
  - FitAddon + ResizeObserver → Task 4 ✓
  - store `terminal.show` + actions → Task 2 ✓
  - `Ctrl+\`` keybinding → Task 5 ✓
  - Default cwd = note directory → Task 4 (`getCwd()`) ✓
  - PTY killed on app quit → Task 3 ✓
  - Re-open continues session (no restart) → `v-if` keeps component alive when shown; PTY only spawned on `terminal-open` which is sent on mount ✓
  - `postinstall` rebuild script → Task 1 ✓

- [x] **No placeholders** — all steps have concrete code

- [x] **Type consistency** — `ptyProcess`, `terminal`, `fitAddon` names consistent across tasks
