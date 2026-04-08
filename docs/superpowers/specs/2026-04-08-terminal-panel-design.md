# Terminal Panel Design

**Date:** 2026-04-08  
**Status:** Approved

## Overview

Embed a terminal panel at the bottom of the app, toggled with `` Ctrl+` ``. Uses `xterm.js` in the renderer and `node-pty` in the main process, communicating over IPC.

## Architecture

```
Renderer: TerminalPanel.vue (xterm.js)
    ↕ IPC: terminal-input / terminal-output / terminal-resize / terminal-open
Main: node-pty PTY process
    ↕ shell (zsh/bash)
```

### Main Process (`electron/main/index.ts`)

- On `terminal-open`: spawn a PTY via `node-pty` with `cwd` set to the provided directory (falls back to `os.homedir()`). If a PTY already exists, kill it and spawn a new one.
- On `terminal-input`: write data to the PTY.
- On `terminal-resize`: call `pty.resize(cols, rows)`.
- PTY output: forward to renderer via `webContents.send('terminal-output', data)`.
- On app quit: kill the PTY process.

### Renderer (`src/components/terminal/TerminalPanel.vue`)

- Mounts an `xterm.js` `Terminal` instance with `xterm-addon-fit`.
- On mount: calls `ipcRenderer.send('terminal-open', cwd)` where `cwd` is the directory of the currently open note (`path.dirname(ttsStore.cnote.lastPath)`) or `os.homedir()` if no note is open.
- Listens to `terminal-output` and writes data to xterm.
- On xterm `onData`: sends `terminal-input`.
- On xterm `onResize`: sends `terminal-resize`.
- Uses `ResizeObserver` to call `fitAddon.fit()` when panel size changes.
- `onBeforeUnmount`: removes IPC listeners.

### Store (`src/store/store.ts`)

New state:
```ts
terminal: {
  show: false
}
```

New actions:
```ts
toggleTerminal()   // flip show
openTerminal()     // show = true
closeTerminal()    // show = false
```

### Layout (`src/App.vue`)

- Import and register `TerminalPanel`.
- Add `TerminalPanel` below `el-footer`, visible when `ttsStore.terminal.show`.
- Panel height: 280px fixed.
- Global keydown handler: `` Ctrl+` `` calls `ttsStore.toggleTerminal()`.

## Behavior

- **Default cwd**: `path.dirname(ttsStore.cnote.lastPath)` when a note is open; `os.homedir()` otherwise.
- **Switching notes**: does NOT auto-cd — avoids interrupting running commands.
- **Re-opening panel**: if panel was hidden and re-shown, terminal session continues (PTY is not restarted).
- **First open**: PTY is spawned on first `terminal-open` IPC call (lazy init).

## Dependencies

- `xterm` — terminal emulator in renderer
- `xterm-addon-fit` — auto-resize to container
- `node-pty` — PTY in main process (native module, requires `electron-rebuild`)

## Build Notes

`node-pty` is a native module and must be rebuilt for the target Electron version:
```
npx electron-rebuild -f -w node-pty
```

Add to `package.json` scripts:
```json
"postinstall": "electron-rebuild -f -w node-pty"
```
