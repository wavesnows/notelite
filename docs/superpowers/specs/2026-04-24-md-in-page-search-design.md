# MD Preview In-Page Search Design

## Overview

Add Cmd/Ctrl+F triggered in-page search to the markdown preview mode. Uses mark.js to highlight matches in the rendered HTML. Search bar appears at the top of the preview area and dismisses on Esc or close button.

## Scope

- **Only works in preview mode** (`ttsStore.mdMode === 'preview'`)
- Edit mode (CodeMirror) is out of scope
- Case-insensitive search, no toggle needed

## UI

A search bar rendered inside `MarkdownEditor.vue`, positioned at the top of the preview container, controlled by `v-show="searchVisible"`.

Contents (left to right):
- Text input (auto-focused on open)
- Match counter: `3 / 12` — shows `No results` when query has no matches, empty when query is blank
- Previous `↑` button
- Next `↓` button  
- Close `✕` button

## Behavior

### Opening
- `Cmd/Ctrl+F` keydown on `.md-editor-container` (only when `mdMode === 'preview'`)
- Sets `searchVisible = true`, focuses input on next tick
- If a query was already present from last open, re-highlights immediately

### Searching
- Watcher on `query` ref: debounce is not needed (mark.js is fast on typical note sizes)
- On each change: `marker.unmark()` → `marker.mark(query)` → collect all `.mark` elements → `currentIndex = 0` → scroll first match into view
- Empty query: just `marker.unmark()`, reset counter display

### Navigation
- `↑` / `↓` buttons and `Enter` (next) / `Shift+Enter` (prev) in the input
- Remove `active` class from current match → `currentIndex ±1` (wraps around) → add `active` class → `.scrollIntoView({ block: 'center' })`

### Closing
- `Esc` keydown in input, or close button click
- `marker.unmark()`, `searchVisible = false`, focus returns to `previewEl`
- `query` and `currentIndex` reset to defaults

## Highlight Styles

```css
/* All matches */
mark {
  background-color: rgba(255, 213, 0, 0.5);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

/* Current active match */
mark.active {
  background-color: rgba(255, 140, 0, 0.7);
}
```

## Architecture

All logic lives in `src/components/note/MarkdownEditor.vue`. No store changes, no new files.

New reactive state (script setup):
- `searchVisible: ref<boolean>(false)`
- `query: ref<string>('')`
- `matches: ref<HTMLElement[]>([])`
- `currentIndex: ref<number>(0)`
- `marker: Mark | null` — mark.js instance, created after mount pointing at `previewEl`

New functions:
- `openSearch()` — sets visible, focuses input
- `closeSearch()` — unmarks, resets, hides
- `runSearch()` — unmark → mark → collect matches → scroll to first
- `goToMatch(index)` — update active class, scroll
- `nextMatch()` / `prevMatch()` — call goToMatch with wrapped index

## Dependencies

- Install: `npm install mark.js`
- Types: `npm install --save-dev @types/mark.js` (if available, otherwise use `// @ts-ignore`)

## Files Changed

- `src/components/note/MarkdownEditor.vue` — add search bar template, search logic, mark.js integration, CSS
