# Keyboard Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add keyboard navigation to the file tree (↑/↓/←/→) and a global Alt+↑/↓ shortcut for switching between files.

**Architecture:** Maintain a `flatFileList` in the Pinia store (depth-first leaf nodes) for global navigation. FileTree gets a keyboard handler that tracks a `focusedNodeKey` cursor through visible nodes, opening files when the cursor lands on a leaf, and expanding/collapsing folders with ←/→.

**Tech Stack:** Vue 3 + TypeScript, Pinia, Element Plus el-tree

---

### Task 1: Add `flatFileList` and `navigateNote()` to store

**Files:**
- Modify: `src/store/store.ts`

- [ ] **Step 1: Add `flatFileList` to state**

In `src/store/store.ts`, inside the `state: () => { return { ... } }` block, add after `showHiddenFiles: false,`:

```typescript
flatFileList: [] as string[],
```

- [ ] **Step 2: Add `buildFlatFileList()` action**

In the `actions: { ... }` block, add after the `refreshTreeData()` action:

```typescript
buildFlatFileList() {
  const result: string[] = [];
  const traverse = (nodes: Tree[]) => {
    for (const node of nodes) {
      if (node.isLeaf && !node.isFolder) {
        result.push(node.path);
      }
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  };
  traverse(this.treeMenu.data as Tree[]);
  this.flatFileList = result;
},
```

- [ ] **Step 3: Call `buildFlatFileList()` at the end of `refreshTreeData()`**

Find this existing code in `refreshTreeData()`:

```typescript
refreshTreeData() {
  const newData = readNotes(this.notebook.currentPath, this.favorites.pinned, this.showHiddenFiles);
  this.treeMenu.data = [...newData];
},
```

Replace with:

```typescript
refreshTreeData() {
  const newData = readNotes(this.notebook.currentPath, this.favorites.pinned, this.showHiddenFiles);
  this.treeMenu.data = [...newData];
  this.buildFlatFileList();
},
```

- [ ] **Step 4: Add `navigateNote()` action**

In the `actions: { ... }` block, add after `buildFlatFileList()`:

```typescript
navigateNote(direction: 'prev' | 'next') {
  const list = this.flatFileList;
  if (list.length === 0) return;
  const current = this.cnote.lastPath;
  const idx = list.indexOf(current);
  let nextIdx: number;
  if (idx === -1) {
    nextIdx = direction === 'next' ? 0 : list.length - 1;
  } else {
    nextIdx = direction === 'next' ? idx + 1 : idx - 1;
  }
  if (nextIdx < 0 || nextIdx >= list.length) return;
  const nextPath = list[nextIdx];
  this.inputs.notePath = nextPath;
  this.cnote.lastPath = nextPath;
  const fileName = nextPath.split('/').pop() || nextPath;
  const label = fileName.replace(/\.(json|md)$/, '');
  this.cnote.title = label;
  this.cnote.destTitle = label;
  this.setLastEditNote();
  this.addRecentFile(nextPath, label);
},
```

- [ ] **Step 5: Initialize `flatFileList` on app start**

Find the end of the `state: () => { return { ... } }` block. The `flatFileList` starts empty. We need to populate it on first load. In `refreshTreeData()`, it's now called — but we also need to build it from the initial state data.

Add a call at the bottom of `state()` initialization by adding a computed initial value. The simplest approach: call `buildFlatFileList` once in the store's `$onAction` or by calling it from `App.vue` on mount. Instead, initialize it inline in state by running the traversal once:

Replace the `flatFileList: [] as string[],` added in Step 1 with:

```typescript
flatFileList: (() => {
  const result: string[] = [];
  const traverse = (nodes: Tree[]) => {
    for (const node of nodes) {
      if (node.isLeaf && !node.isFolder) {
        result.push(node.path);
      }
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  };
  const initialData = readNotes(store.get('currentNotebookPath') || path.join(os.homedir(), DFConf.appName, DFConf.defaultRepoPath, DFConf.defaultRepoName), store.get('pinnedNotes') || []);
  traverse(initialData as Tree[]);
  return result;
})(),
```

- [ ] **Step 6: Commit**

```bash
git add src/store/store.ts
git commit -m "feat: add flatFileList and navigateNote to store"
```

---

### Task 2: Add keyboard navigation to FileTree

**Files:**
- Modify: `src/components/aside/FileTree.vue`

- [ ] **Step 1: Add `focusedNodeKey` ref and `getVisibleNodes()` helper**

In `src/components/aside/FileTree.vue`, in the `<script lang="ts" setup>` block, after the existing refs (`filterText`, `treeRef`, etc.), add:

```typescript
const focusedNodeKey = ref<string | null>(null)

function getVisibleNodes(): Tree[] {
  const result: Tree[] = []
  const expandedSet = new Set(ttsStore.treeMenu.expandedKeys || [])

  function traverse(nodes: Tree[]) {
    for (const node of nodes) {
      result.push(node)
      if (node.isFolder && expandedSet.has(node.path) && node.children) {
        traverse(node.children)
      }
    }
  }

  traverse(ttsStore.treeMenu.data as Tree[])
  return result
}
```

- [ ] **Step 2: Add `handleTreeKeydown()` function**

After `getVisibleNodes()`, add:

```typescript
function handleTreeKeydown(event: KeyboardEvent) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(event.key) === -1) return
  event.preventDefault()
  event.stopPropagation()

  const visible = getVisibleNodes()
  if (visible.length === 0) return

  const currentIdx = focusedNodeKey.value
    ? visible.findIndex(n => n.path === focusedNodeKey.value)
    : -1

  if (event.key === 'ArrowDown') {
    const nextIdx = currentIdx < visible.length - 1 ? currentIdx + 1 : currentIdx
    const next = visible[nextIdx]
    if (!next) return
    focusedNodeKey.value = next.path
    if (!next.isFolder) {
      handleNodeClick(next, {} as Node)
    }
  } else if (event.key === 'ArrowUp') {
    const prevIdx = currentIdx > 0 ? currentIdx - 1 : 0
    const prev = visible[prevIdx]
    if (!prev) return
    focusedNodeKey.value = prev.path
    if (!prev.isFolder) {
      handleNodeClick(prev, {} as Node)
    }
  } else if (event.key === 'ArrowRight') {
    if (currentIdx === -1) return
    const node = visible[currentIdx]
    if (node.isFolder) {
      const keys = ttsStore.treeMenu.expandedKeys || []
      if (!keys.includes(node.path)) {
        ttsStore.treeMenu.expandedKeys = [...keys, node.path]
        nextTick(() => {
          treeRef.value?.getNode(node.path)?.expand()
        })
      }
    }
  } else if (event.key === 'ArrowLeft') {
    if (currentIdx === -1) return
    const node = visible[currentIdx]
    if (node.isFolder) {
      const keys = ttsStore.treeMenu.expandedKeys || []
      if (keys.includes(node.path)) {
        ttsStore.treeMenu.expandedKeys = keys.filter(k => k !== node.path)
        nextTick(() => {
          treeRef.value?.getNode(node.path)?.collapse()
        })
      }
    }
  }
}
```

- [ ] **Step 3: Sync `focusedNodeKey` on mouse click**

In `handleNodeClick`, after `ttsStore.treeMenu.currentNode = treeRef.value?.getCurrentNode()`, add:

```typescript
focusedNodeKey.value = itemdata.path
```

The full updated start of `handleNodeClick` becomes:

```typescript
const handleNodeClick = ((itemdata: Tree, node: Node) => {
    console.log('node data is '+ node + itemdata)
    console.dir(node)
    console.dir(itemdata)

    ttsStore.treeMenu.node = node;
    ttsStore.treeMenu.treeData = itemdata
    ttsStore.inputs.itemData = itemdata
    focusedNodeKey.value = itemdata.path
    console.log(itemdata)
   if(!itemdata.isFolder && fs.existsSync(itemdata.path)){
```

- [ ] **Step 4: Add `tabindex` and `keydown` to the tree container in template**

Find the `<el-scrollbar>` tag in the template:

```html
<el-scrollbar height="100%" width="100%">
```

Replace with:

```html
<el-scrollbar height="100%" width="100%" tabindex="0" @keydown="handleTreeKeydown">
```

- [ ] **Step 5: Add focused node highlight via dynamic class**

In the `<template #default="{ node, data }">` slot, change:

```html
<div class="custom-tree-node" @contextmenu.prevent="handleContextMenu(node, $event)">
```

To:

```html
<div
  class="custom-tree-node"
  :class="{ 'keyboard-focused': data.path === focusedNodeKey }"
  @contextmenu.prevent="handleContextMenu(node, $event)"
>
```

In the `<style scoped>` block, add at the end:

```css
.keyboard-focused {
  background-color: rgba(64, 158, 255, 0.12);
  border-radius: 4px;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/aside/FileTree.vue
git commit -m "feat: add keyboard navigation to FileTree (↑↓←→)"
```

---

### Task 3: Add global Alt+↑/↓ shortcut in App.vue

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Add Alt+↑/↓ to the keydown handler**

Find the existing `handleKeyDown` function in `src/App.vue`:

```typescript
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

Replace with:

```typescript
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
  // Alt+↑/↓ to navigate between files
  if (event.altKey && event.key === 'ArrowDown') {
    event.preventDefault();
    ttsStore.navigateNote('next');
  }
  if (event.altKey && event.key === 'ArrowUp') {
    event.preventDefault();
    ttsStore.navigateNote('prev');
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/App.vue
git commit -m "feat: add global Alt+↑/↓ shortcut for file navigation"
```

---

### Task 4: Update keyboard shortcuts help dialog

**Files:**
- Modify: `src/components/help/KeyboardShortcuts.vue`

- [ ] **Step 1: Add a "File Tree" shortcuts section**

In `src/components/help/KeyboardShortcuts.vue`, find the shortcuts template section. After the closing `</div>` of the `shortcut-section` for "editor" (the last section), add a new section before the closing `</template>`:

Find:

```html
          <div class="shortcut-section">
            <h3>{{ t('help.editor') }}</h3>
            <div class="shortcut-item">
              <span class="keys"><kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd>+<kbd>B</kbd></span>
              <span class="description">{{ t('help.bold') }}</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd>+<kbd>I</kbd></span>
              <span class="description">{{ t('help.italic') }}</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd>+<kbd>K</kbd></span>
              <span class="description">{{ t('help.link') }}</span>
            </div>
          </div>
        </template>
```

Replace with:

```html
          <div class="shortcut-section">
            <h3>{{ t('help.editor') }}</h3>
            <div class="shortcut-item">
              <span class="keys"><kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd>+<kbd>B</kbd></span>
              <span class="description">{{ t('help.bold') }}</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd>+<kbd>I</kbd></span>
              <span class="description">{{ t('help.italic') }}</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd>+<kbd>K</kbd></span>
              <span class="description">{{ t('help.link') }}</span>
            </div>
          </div>
          <div class="shortcut-section">
            <h3>File Tree</h3>
            <div class="shortcut-item">
              <span class="keys"><kbd>↑</kbd> / <kbd>↓</kbd></span>
              <span class="description">Move to previous/next node (opens file automatically)</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>→</kbd></span>
              <span class="description">Expand folder</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>←</kbd></span>
              <span class="description">Collapse folder</span>
            </div>
          </div>
          <div class="shortcut-section">
            <h3>Global Navigation</h3>
            <div class="shortcut-item">
              <span class="keys"><kbd>Alt</kbd>+<kbd>↑</kbd> / <kbd>↓</kbd></span>
              <span class="description">Switch to previous/next file</span>
            </div>
          </div>
        </template>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/help/KeyboardShortcuts.vue
git commit -m "docs: add keyboard navigation shortcuts to help dialog"
```

---

### Task 5: Manual smoke test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test file tree keyboard navigation**

1. Click anywhere in the file tree sidebar to give it focus (click the scrollbar area, not a node)
2. Press `↓` — the first node should highlight and if it's a file, the document should open
3. Press `↓` again — moves to next node
4. Navigate to a folder node — no document opens, only highlight moves
5. Press `→` on a collapsed folder — it expands
6. Press `←` on an expanded folder — it collapses
7. Press `↑` — moves back up

- [ ] **Step 3: Test global Alt+↑/↓**

1. Click inside the editor (so focus is NOT in the file tree)
2. Press `Alt+↓` — should open the next file in the tree (depth-first order)
3. Press `Alt+↑` — should open the previous file
4. Press `Alt+↑` when on the first file — nothing happens
5. Press `Alt+↓` when on the last file — nothing happens

- [ ] **Step 4: Test help dialog**

1. Press `Cmd/Ctrl+?` to open help
2. Navigate to "Keyboard Shortcuts"
3. Verify "File Tree" and "Global Navigation" sections appear with correct shortcuts
