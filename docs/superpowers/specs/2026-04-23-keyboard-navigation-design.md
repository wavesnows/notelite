# Keyboard Navigation Design

## Overview

Add keyboard navigation to the file tree and a global shortcut for switching documents.

## Behavior

### File tree focused (`↑ / ↓ / ← / →`)

- `↑ / ↓`: Move cursor to previous/next visible node (includes folders). When cursor lands on a file node, open the document automatically (same as mouse click). When cursor lands on a folder, only move the cursor — do not open anything.
- `→`: If cursor is on a collapsed folder, expand it.
- `←`: If cursor is on an expanded folder, collapse it.

### Global (`Alt + ↑ / ↓`)

- `Alt + ↓`: Open the next file in the flat file list.
- `Alt + ↑`: Open the previous file in the flat file list.
- At the start or end of the list, do nothing (no wrap-around).

## Architecture

### 1. Store (`store.ts`)

New state:
- `flatFileList: string[]` — all leaf node paths in depth-first order, regardless of tree expand state.

New actions:
- `buildFlatFileList()` — depth-first traversal of `treeMenu.treeData`, collect paths where `isLeaf === true`. Called automatically after every `refreshTreeData()`.
- `navigateNote(direction: 'prev' | 'next')` — find `cnote.lastPath` in `flatFileList`, open the adjacent file by updating `inputs.notePath` and `cnote.lastPath`.

### 2. FileTree.vue

- Add `tabindex="0"` to the tree container `div` so it can receive keyboard focus.
- Add `keydown` handler on the container:
  - Compute `visibleNodes`: depth-first walk of `treeMenu.treeData` respecting current expanded keys, returns all visible nodes in visual order.
  - `↑ / ↓`: Move `focusedNodeKey` (new reactive ref) through `visibleNodes`. If the newly focused node is a file, call `handleNodeClick()`.
  - `→`: If focused node is a folder and not expanded, add its key to `expandedKeys`.
  - `←`: If focused node is a folder and expanded, remove its key from `expandedKeys`.
- Add CSS: node matching `focusedNodeKey` gets a highlight style (background tint, same visual language as the selected node but distinct).
- When user clicks a node with the mouse, sync `focusedNodeKey` to that node so cursor position stays consistent.

### 3. App.vue

In the existing `keydown` listener, add:

```
if (event.altKey && event.key === 'ArrowDown') → store.navigateNote('next')
if (event.altKey && event.key === 'ArrowUp')   → store.navigateNote('prev')
```

### 4. KeyboardShortcuts.vue

Add three rows to the shortcuts reference table:

| Shortcut | Context | Action |
|---|---|---|
| `↑ / ↓` | File tree focused | Move to previous/next node |
| `← / →` | File tree focused | Collapse/expand folder |
| `Alt + ↑ / ↓` | Global | Switch to previous/next file |

## Files Changed

- `src/store/store.ts` — add `flatFileList`, `buildFlatFileList()`, `navigateNote()`
- `src/components/aside/FileTree.vue` — add `tabindex`, `keydown` handler, `focusedNodeKey`, highlight CSS
- `src/App.vue` — add `Alt+↑/↓` to existing keydown listener
- `src/components/help/KeyboardShortcuts.vue` — add three new shortcut rows
