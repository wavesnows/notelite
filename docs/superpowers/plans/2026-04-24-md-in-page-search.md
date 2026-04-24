# MD Preview In-Page Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Cmd/Ctrl+F in-page search to the markdown preview mode using mark.js for highlighting.

**Architecture:** All logic is self-contained in `MarkdownEditor.vue`. A search bar `div` is shown/hidden via `v-show`. mark.js operates directly on `previewEl` DOM. No store changes needed.

**Tech Stack:** Vue 3, TypeScript, mark.js, existing CodeMirror/MarkdownIt setup

---

### Task 1: Install mark.js

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install mark.js**

```bash
cd /Users/fusong/ClaudeCode/notelite && npm install mark.js
```

Expected output: `added 1 package` (or similar), no errors.

- [ ] **Step 2: Check types are available**

```bash
ls node_modules/mark.js/dist/
```

Expected: `mark.min.js`, `mark.es6.min.js` etc. mark.js ships its own types via `@types/mark.js` — check if they installed automatically:

```bash
ls node_modules/@types/mark.js 2>/dev/null && echo "types found" || echo "types not found"
```

If types not found, install them:

```bash
npm install --save-dev @types/mark.js
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install mark.js for in-page search"
```

---

### Task 2: Add search bar UI to MarkdownEditor

**Files:**
- Modify: `src/components/note/MarkdownEditor.vue`

The current template is:
```html
<template>
  <div class="md-editor-container">
    <div v-show="ttsStore.mdMode === 'edit'" ref="editorEl" class="md-codemirror"></div>
    <div v-show="ttsStore.mdMode === 'preview'" ref="previewEl" class="md-preview" ... v-html="renderedHtml"></div>
  </div>
</template>
```

- [ ] **Step 1: Add search bar markup inside the preview wrapper**

Replace the template with:

```html
<template>
  <div class="md-editor-container" @keydown="handleContainerKeydown">
    <div v-show="ttsStore.mdMode === 'edit'" ref="editorEl" class="md-codemirror"></div>
    <div v-show="ttsStore.mdMode === 'preview'" class="md-preview-wrapper">
      <div v-show="searchVisible" class="md-search-bar">
        <input
          ref="searchInputRef"
          v-model="query"
          class="md-search-input"
          placeholder="Search..."
          @keydown="handleSearchKeydown"
        />
        <span class="md-search-count">{{ searchCountText }}</span>
        <button class="md-search-btn" @click="prevMatch" title="Previous (Shift+Enter)">↑</button>
        <button class="md-search-btn" @click="nextMatch" title="Next (Enter)">↓</button>
        <button class="md-search-btn md-search-close" @click="closeSearch" title="Close (Esc)">✕</button>
      </div>
      <div
        ref="previewEl"
        class="md-preview"
        :class="ttsStore.mdTheme !== 'default' ? `theme-${ttsStore.mdTheme}` : ''"
        tabindex="-1"
        v-html="renderedHtml"
      ></div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Add search bar CSS at the end of `<style scoped>`**

```css
.md-preview-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  height: 100%;
}

.md-search-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.md-search-input {
  flex: 1;
  min-width: 0;
  height: 24px;
  padding: 0 8px;
  font-size: 13px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  outline: none;
  background: #fff;
  color: #303133;
}

.md-search-input:focus {
  border-color: #409eff;
}

.md-search-count {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  min-width: 48px;
  text-align: center;
}

.md-search-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  color: #606266;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.md-search-btn:hover {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.md-search-close {
  color: #909399;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/note/MarkdownEditor.vue
git commit -m "feat: add search bar UI to markdown preview"
```

---

### Task 3: Add search logic to MarkdownEditor

**Files:**
- Modify: `src/components/note/MarkdownEditor.vue`

- [ ] **Step 1: Add mark.js import and new refs in `<script lang="ts" setup>`**

After the existing imports at the top of the script block, add:

```typescript
import Mark from 'mark.js'
```

After the existing `let saveStatusTimer` line, add:

```typescript
const searchVisible = ref(false)
const query = ref('')
const matches = ref<HTMLElement[]>([])
const currentIndex = ref(0)
const searchInputRef = ref<HTMLInputElement | null>(null)
let marker: Mark | null = null
```

- [ ] **Step 2: Add `searchCountText` computed**

After the existing `renderedHtml` computed, add:

```typescript
const searchCountText = computed(() => {
  if (!query.value) return ''
  if (matches.value.length === 0) return 'No results'
  return `${currentIndex.value + 1} / ${matches.value.length}`
})
```

- [ ] **Step 3: Add search functions**

After `saveFile()`, add:

```typescript
function openSearch() {
  if (ttsStore.mdMode !== 'preview') return
  searchVisible.value = true
  nextTick(() => {
    searchInputRef.value?.focus()
    searchInputRef.value?.select()
    if (query.value) runSearch()
  })
}

function closeSearch() {
  marker?.unmark()
  matches.value = []
  currentIndex.value = 0
  query.value = ''
  searchVisible.value = false
  nextTick(() => previewEl.value?.focus())
}

function runSearch() {
  if (!marker) return
  marker.unmark({
    done: () => {
      if (!query.value) {
        matches.value = []
        currentIndex.value = 0
        return
      }
      marker!.mark(query.value, {
        caseSensitive: false,
        separateWordSearch: false,
        done: () => {
          matches.value = Array.from(previewEl.value?.querySelectorAll('mark') ?? []) as HTMLElement[]
          currentIndex.value = 0
          goToMatch(0)
        }
      })
    }
  })
}

function goToMatch(index: number) {
  if (matches.value.length === 0) return
  matches.value.forEach(el => el.classList.remove('active'))
  const target = matches.value[index]
  if (!target) return
  target.classList.add('active')
  target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  currentIndex.value = index
}

function nextMatch() {
  if (matches.value.length === 0) return
  goToMatch((currentIndex.value + 1) % matches.value.length)
}

function prevMatch() {
  if (matches.value.length === 0) return
  goToMatch((currentIndex.value - 1 + matches.value.length) % matches.value.length)
}

function handleContainerKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
    if (ttsStore.mdMode === 'preview') {
      event.preventDefault()
      openSearch()
    }
  }
}

function handleSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeSearch()
  } else if (event.key === 'Enter') {
    event.preventDefault()
    if (event.shiftKey) {
      prevMatch()
    } else {
      nextMatch()
    }
  }
}
```

- [ ] **Step 4: Initialize `marker` after mount**

In `onMounted`, after `cmView = new EditorView(...)` and `loadFile(...)`, add:

```typescript
marker = new Mark(previewEl.value!)
```

- [ ] **Step 5: Add watcher for `query`**

After the existing watchers, add:

```typescript
watch(query, () => {
  runSearch()
})
```

- [ ] **Step 6: Re-init marker when preview content changes**

The `renderedHtml` computed re-renders on every content change, which replaces the DOM inside `previewEl`. After the DOM updates, existing `mark` elements are gone. Add a watcher on `renderedHtml` to re-run search if the bar is open:

```typescript
watch(renderedHtml, () => {
  if (searchVisible.value && query.value) {
    nextTick(() => runSearch())
  }
})
```

- [ ] **Step 7: Add highlight CSS (global, not scoped — mark.js injects into previewEl DOM)**

Add a `<style>` block (non-scoped) after the existing `<style scoped>` block:

```html
<style>
.md-preview mark {
  background-color: rgba(255, 213, 0, 0.5);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

.md-preview mark.active {
  background-color: rgba(255, 140, 0, 0.7);
}
</style>
```

- [ ] **Step 8: Destroy marker on unmount**

In `onBeforeUnmount`, after `cmView?.destroy()`, add:

```typescript
marker?.unmark()
marker = null
```

- [ ] **Step 9: Commit**

```bash
git add src/components/note/MarkdownEditor.vue
git commit -m "feat: add in-page search logic with mark.js to markdown preview"
```

---

### Task 4: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
cd /Users/fusong/ClaudeCode/notelite && npm run dev
```

- [ ] **Step 2: Test basic search**

1. Open a markdown note with some repeated words
2. Switch to **preview mode**
3. Press `Cmd+F` (Mac) or `Ctrl+F` — search bar should appear at top of preview
4. Type a word that appears multiple times — matches should highlight in yellow, first match in orange
5. Counter shows `1 / N`

- [ ] **Step 3: Test navigation**

1. Press `Enter` — advances to next match (counter updates, orange moves)
2. Press `Shift+Enter` — goes to previous match
3. Click `↓` and `↑` buttons — same behavior
4. At last match, press `Enter` — wraps to first match

- [ ] **Step 4: Test closing**

1. Press `Esc` — bar hides, all highlights removed, focus returns to preview
2. Press `Cmd+F` again — bar reopens, previous query is cleared

- [ ] **Step 5: Test edge cases**

1. Type a query with no matches — counter shows `No results`
2. Clear the input — highlights removed, counter empty
3. Switch to **edit mode** while search bar is open — bar should remain (it's hidden with the preview), no errors
4. Press `Cmd+F` while in **edit mode** — nothing happens (search only activates in preview mode)
