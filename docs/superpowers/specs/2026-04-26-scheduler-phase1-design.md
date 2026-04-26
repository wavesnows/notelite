# Local Task Scheduler — Phase 1 Design

## Overview

Add a local task scheduler to notelite. Users can define cron-based tasks that run shell commands or built-in operations (git pull/push, refresh tree). The scheduler runs in the Electron main process so it continues even when the renderer window is hidden.

Phase 2 (out of scope here) will add LLM prompt tasks and mnote task format compatibility.

## Data Model

Tasks are persisted to `electron-store` under the key `schedulerTasks` as an array of `SchedulerTask` objects.

```typescript
interface SchedulerTask {
  id: string             // uuid v4
  name: string           // user-defined label
  enabled: boolean       // whether the task is active
  schedule: {
    mode: 'simple' | 'cron'
    // simple mode fields
    frequency?: 'daily' | 'weekly' | 'monthly'
    time?: string        // "09:00"
    weekday?: number     // 0–6, used when frequency === 'weekly'
    day?: number         // 1–31, used when frequency === 'monthly'
    // cron mode
    cron?: string        // e.g. "0 9 * * *"
  }
  type: 'shell' | 'builtin'
  command?: string       // shell task: command to execute
  workdir?: string       // shell task: working directory (defaults to current notebook path)
  action?: 'git-pull' | 'git-push' | 'refresh-tree'  // builtin task
  retry: {
    maxAttempts: number  // default 3
    delaySeconds: number // default 60
  }
  // persisted runtime state
  lastRun?: number       // Unix timestamp ms
  lastStatus?: 'success' | 'error' | 'running' | 'skipped'
  lastError?: string
}
```

Simple mode schedules are converted to cron expressions on save. The `mode` field is preserved only for UI display purposes.

**Simple → cron conversion:**
- `daily` at `HH:MM` → `MM HH * * *`
- `weekly` at `HH:MM` on weekday `W` → `MM HH * * W`
- `monthly` at `HH:MM` on day `D` → `MM HH D * *`

## Architecture

```
Renderer Process                    Main Process
────────────────────                ──────────────────────────
Scheduler.vue (task list)           electron/main/scheduler.ts
TaskDialog.vue (create/edit)
                                    On app start:
  scheduler:list ──────────────→    read schedulerTasks from store
  scheduler:save ──────────────→    register/update cron jobs
  scheduler:delete ────────────→    cancel and remove cron job
  scheduler:run-now ───────────→    execute task immediately
                   ←── task-result  push result to renderer

                                    Task execution:
                                    shell → child_process.exec
                                    git-pull/push → simple-git
                                    refresh-tree → IPC → renderer
```

### Main Process: `electron/main/scheduler.ts`

- Exports `initScheduler(mainWindow)` called from `index.ts` after window creation
- Maintains a `Map<taskId, CronJob>` of active jobs
- On each task execution:
  1. Check if task is already running → if yes, log `skipped`, return
  2. Mark `lastStatus = 'running'`, persist
  3. Execute (with retry loop on failure)
  4. Update `lastRun`, `lastStatus`, `lastError`, persist
  5. Send `task-result` IPC event to renderer
  6. On final failure (all retries exhausted): send system `Notification`

**Logging:** Append-only to `{app.getPath('userData')}/scheduler.log`. Format: `[ISO timestamp] [taskId] [status] message`. Trim to last 1000 lines on each write.

**Retry logic:** After a failure, wait `delaySeconds` seconds, retry up to `maxAttempts` total attempts. Each attempt is logged separately.

### IPC Channels

| Channel | Direction | Payload |
|---------|-----------|---------|
| `scheduler:list` | renderer → main (handle) | — → `SchedulerTask[]` |
| `scheduler:save` | renderer → main (handle) | `SchedulerTask` → `SchedulerTask` (with id assigned) |
| `scheduler:delete` | renderer → main (handle) | `{ id: string }` → `void` |
| `scheduler:run-now` | renderer → main (handle) | `{ id: string }` → `void` |
| `task-result` | main → renderer (send) | `{ id, status, output, error, timestamp }` |

## UI

### Left sidebar (Aside.vue)

Add menu item index `"4"` with Element Plus `Timer` icon. Existing indexes 4 and 5 (`Common` and `Lan`) shift to 5 and 6, or are left as-is if unused.

### Bside.vue

Add `<Scheduler v-if="ttsStore.page.asideIndex == '4'" />`.

### Scheduler.vue (task list panel)

- Header: title "Scheduler" + "+" button to open TaskDialog in create mode
- Task rows: status dot (grey=disabled, green=last success, red=last error, yellow=running) + task name + next run time
- Row actions: click → open TaskDialog in edit mode; context menu or icon → delete, run now
- Empty state: "No tasks yet. Click + to create one."

### TaskDialog.vue (el-dialog, create/edit)

Fields:
1. **Task name** — text input, required
2. **Schedule** — radio: Simple / Cron
   - Simple: frequency dropdown (Daily / Weekly / Monthly) + time picker + weekday/day selector (conditional)
   - Cron: text input with cron expression, validated on blur using `node-cron.validate()`
3. **Task type** — radio: Shell Command / Built-in Action
   - Shell: command text input + working directory input (optional, placeholder = current notebook path)
   - Built-in: dropdown (Git Pull / Git Push / Refresh Tree)
4. **Retry** — attempts number input (1–10) + delay seconds input (10–3600)
5. **Enabled** — checkbox, default true
6. **Log section** (edit mode only) — last 20 log entries, collapsible, shows timestamp + status + first line of output; click entry to expand full output

Footer: Cancel + Save buttons. Save is disabled if required fields are empty or cron expression is invalid.

### Status dot colors

| Color | Meaning |
|-------|---------|
| Grey | Disabled |
| Green | Last run succeeded |
| Red | Last run failed (all retries exhausted) |
| Yellow | Currently running |
| Blue | Never run / no status yet |

## Error Handling

- **Cron validation:** `node-cron.validate(expr)` called before save; invalid expressions show inline error, save is blocked
- **Concurrent execution:** If a job fires while the previous run is still in progress, the new run is skipped and logged as `skipped`
- **App restart:** On startup, all enabled tasks are re-registered from store; `lastRun`/`lastStatus` are restored from persisted state
- **Window closed (renderer gone):** Scheduler continues in main process; `task-result` IPC is sent only if `mainWindow` exists and is not destroyed
- **Shell command failure:** Non-zero exit code = failure; stderr captured as `lastError`
- **git-pull conflict:** `simple-git` throws on merge conflict; caught, logged as error, retry applies

## Files Changed

| File | Change |
|------|--------|
| `electron/main/scheduler.ts` | Create — scheduler engine |
| `electron/main/index.ts` | Modify — call `initScheduler`, register IPC handlers |
| `src/components/aside/Scheduler.vue` | Create — task list panel |
| `src/components/scheduler/TaskDialog.vue` | Create — create/edit dialog |
| `src/components/aside/Aside.vue` | Modify — add Timer icon at index 4 |
| `src/components/aside/Bside.vue` | Modify — add Scheduler panel |
| `src/store/store.ts` | Modify — add scheduler UI state (selectedTask, dialogVisible) |
| `src/i18n/en.ts` | Modify — add scheduler translation keys |
| `src/i18n/zh.ts` | Modify — add scheduler translation keys |

## Dependencies

- `node-cron` — cron scheduling in main process (`npm install node-cron && npm install --save-dev @types/node-cron`)
- `uuid` — already available or add (`npm install uuid`)
