# System Scheduler Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route shell tasks to the OS native scheduler (launchd on macOS, crontab on Linux) so they run even when notelite is closed, while builtin tasks continue using node-cron.

**Architecture:** A new `system-scheduler.ts` module handles platform-specific install/uninstall of shell tasks. A wrapper shell script per task writes results to `scheduler-results.json`. A new `scheduler-results.ts` module reads that file and merges results back into task state. `scheduler.ts` branches on `task.type` at save/delete time.

**Tech Stack:** Node.js `child_process.execSync`, `fs`, Electron `app.getPath`, launchd plist XML, crontab, node-cron (existing)

---

### Task 1: Add `systemJobId` to SchedulerTask type

**Files:**
- Modify: `src/types/scheduler.ts`

- [ ] **Step 1: Add `systemJobId` field**

In `src/types/scheduler.ts`, find the `SchedulerTask` interface and add after `lastError?: string`:

```typescript
  systemJobId?: string  // set when shell task is installed in OS scheduler
```

The full interface ending becomes:

```typescript
  lastRun?: number
  lastStatus?: 'success' | 'error' | 'running' | 'skipped'
  lastError?: string
  systemJobId?: string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/fusong/ClaudeCode/notelite && npx tsc --noEmit 2>&1 | grep "scheduler" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/scheduler.ts
git commit -m "feat: add systemJobId field to SchedulerTask"
```

---

### Task 2: Create `scheduler-results.ts`

**Files:**
- Create: `electron/main/scheduler-results.ts`

- [ ] **Step 1: Create the file**

```typescript
import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { SchedulerTask } from '../../src/types/scheduler'

export interface TaskRunResult {
  lastRun: number
  lastStatus: 'success' | 'error'
  lastError: string
  exitCode: number
}

function getResultsPath(): string {
  return join(app.getPath('userData'), 'scheduler-results.json')
}

export function readResults(): Record<string, TaskRunResult> {
  try {
    const content = fs.readFileSync(getResultsPath(), 'utf-8')
    return JSON.parse(content) as Record<string, TaskRunResult>
  } catch (_) {
    return {}
  }
}

export function mergeResultsIntoTasks(tasks: SchedulerTask[]): SchedulerTask[] {
  const results = readResults()
  return tasks.map(task => {
    const r = results[task.id]
    if (!r) return task
    return {
      ...task,
      lastRun: r.lastRun,
      lastStatus: r.lastStatus,
      lastError: r.lastError || undefined,
    }
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/fusong/ClaudeCode/notelite && npx tsc --noEmit 2>&1 | grep "scheduler-results" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add electron/main/scheduler-results.ts
git commit -m "feat: add scheduler-results.ts for reading OS task run results"
```

---

### Task 3: Create `system-scheduler.ts`

**Files:**
- Create: `electron/main/system-scheduler.ts`

- [ ] **Step 1: Create the file**

```typescript
import { app } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import * as fs from 'fs'
import { execSync } from 'child_process'
import { SchedulerTask } from '../../src/types/scheduler'

export function isSystemSchedulerSupported(): boolean {
  return process.platform !== 'win32'
}

// ── Paths ─────────────────────────────────────────────────────────────────────

function wrappersDir(): string {
  return join(homedir(), '.notelite', 'wrappers')
}

function wrapperPath(taskId: string): string {
  return join(wrappersDir(), `${taskId}.sh`)
}

function plistPath(taskId: string): string {
  return join(homedir(), 'Library', 'LaunchAgents', `com.notelite.${taskId}.plist`)
}

function systemJobId(task: SchedulerTask): string {
  return process.platform === 'darwin'
    ? `com.notelite.${task.id}`
    : `notelite-${task.id}`
}

// ── Wrapper script ────────────────────────────────────────────────────────────

function generateWrapper(task: SchedulerTask): string {
  const userData = app.getPath('userData')
  const resultsFile = join(userData, 'scheduler-results.json')
  const nodeBin = process.execPath
  const workdir = task.workdir || homedir()
  const command = task.command || ''
  const taskId = task.id

  return `#!/bin/bash
# notelite-task: ${taskId}
RESULTS_FILE="${resultsFile}"
cd "${workdir}"
${command}
EXIT_CODE=$?
"${nodeBin}" -e "
const fs = require('fs');
const f = process.argv[1];
let data = {};
try { data = JSON.parse(fs.readFileSync(f, 'utf8')); } catch(_) {}
data['${taskId}'] = {
  lastRun: Date.now(),
  lastStatus: $EXIT_CODE === 0 ? 'success' : 'error',
  lastError: $EXIT_CODE !== 0 ? 'exit code ' + $EXIT_CODE : '',
  exitCode: $EXIT_CODE
};
fs.writeFileSync(f, JSON.stringify(data, null, 2));
" "$RESULTS_FILE"
`
}

function writeWrapper(task: SchedulerTask): string {
  const dir = wrappersDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const path = wrapperPath(task.id)
  fs.writeFileSync(path, generateWrapper(task), 'utf-8')
  fs.chmodSync(path, '755')
  return path
}

// ── cron expression parser ────────────────────────────────────────────────────

interface CalendarInterval {
  Minute: number
  Hour: number
  Weekday?: number
  Day?: number
}

function cronToCalendarInterval(cron: string): CalendarInterval {
  const parts = cron.trim().split(/\s+/)
  // parts: [minute, hour, day-of-month, month, day-of-week]
  const minute = parseInt(parts[0], 10)
  const hour = parseInt(parts[1], 10)
  const dom = parts[2]
  const dow = parts[4]

  const result: CalendarInterval = { Minute: minute, Hour: hour }
  if (dow !== '*') result.Weekday = parseInt(dow, 10)
  else if (dom !== '*') result.Day = parseInt(dom, 10)
  return result
}

// ── macOS launchd ─────────────────────────────────────────────────────────────

function generatePlist(task: SchedulerTask, wrapperScriptPath: string): string {
  const label = systemJobId(task)
  const cron = task.schedule.cron || '0 9 * * *'
  const interval = cronToCalendarInterval(cron)
  const userData = app.getPath('userData')
  const logFile = join(userData, `launchd-${task.id}.log`)

  let intervalXml = `  <key>StartCalendarInterval</key>\n  <dict>\n`
  intervalXml += `    <key>Hour</key><integer>${interval.Hour}</integer>\n`
  intervalXml += `    <key>Minute</key><integer>${interval.Minute}</integer>\n`
  if (interval.Weekday !== undefined) {
    intervalXml += `    <key>Weekday</key><integer>${interval.Weekday}</integer>\n`
  }
  if (interval.Day !== undefined) {
    intervalXml += `    <key>Day</key><integer>${interval.Day}</integer>\n`
  }
  intervalXml += `  </dict>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${wrapperScriptPath}</string>
  </array>
${intervalXml}
  <key>StandardOutPath</key>
  <string>${logFile}</string>
  <key>StandardErrorPath</key>
  <string>${logFile}</string>
</dict>
</plist>
`
}

async function installMacOS(task: SchedulerTask): Promise<boolean> {
  try {
    const scriptPath = writeWrapper(task)
    const plist = generatePlist(task, scriptPath)
    const plistFile = plistPath(task.id)
    fs.writeFileSync(plistFile, plist, 'utf-8')
    execSync(`launchctl load "${plistFile}"`, { stdio: 'ignore' })
    return true
  } catch (e: any) {
    console.error('[system-scheduler] macOS install failed:', e.message)
    return false
  }
}

async function uninstallMacOS(task: SchedulerTask): Promise<void> {
  try {
    const plist = plistPath(task.id)
    if (fs.existsSync(plist)) {
      try { execSync(`launchctl unload "${plist}"`, { stdio: 'ignore' }) } catch (_) {}
      fs.unlinkSync(plist)
    }
    const wrapper = wrapperPath(task.id)
    if (fs.existsSync(wrapper)) fs.unlinkSync(wrapper)
  } catch (_) {}
}

// ── Linux crontab ─────────────────────────────────────────────────────────────

async function installLinux(task: SchedulerTask): Promise<boolean> {
  try {
    const scriptPath = writeWrapper(task)
    const marker = `# notelite-task:${task.id}`
    let current = ''
    try { current = execSync('crontab -l', { encoding: 'utf-8' }) } catch (_) {}
    // Remove any existing entry for this task
    const filtered = current.split('\n').filter(l => !l.includes(marker)).join('\n')
    const newLine = `${task.schedule.cron} /bin/bash "${scriptPath}" ${marker}`
    const newCrontab = filtered.trimEnd() + '\n' + newLine + '\n'
    execSync(`echo ${JSON.stringify(newCrontab)} | crontab -`, { stdio: 'ignore' })
    return true
  } catch (e: any) {
    console.error('[system-scheduler] Linux install failed:', e.message)
    return false
  }
}

async function uninstallLinux(task: SchedulerTask): Promise<void> {
  try {
    const marker = `# notelite-task:${task.id}`
    let current = ''
    try { current = execSync('crontab -l', { encoding: 'utf-8' }) } catch (_) {}
    const filtered = current.split('\n').filter(l => !l.includes(marker)).join('\n')
    execSync(`echo ${JSON.stringify(filtered)} | crontab -`, { stdio: 'ignore' })
    const wrapper = wrapperPath(task.id)
    if (fs.existsSync(wrapper)) fs.unlinkSync(wrapper)
  } catch (_) {}
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function installJob(task: SchedulerTask): Promise<{ success: boolean; jobId: string }> {
  if (process.platform === 'darwin') {
    const success = await installMacOS(task)
    return { success, jobId: systemJobId(task) }
  }
  if (process.platform === 'linux') {
    const success = await installLinux(task)
    return { success, jobId: systemJobId(task) }
  }
  return { success: false, jobId: '' }
}

export async function uninstallJob(task: SchedulerTask): Promise<void> {
  if (process.platform === 'darwin') return uninstallMacOS(task)
  if (process.platform === 'linux') return uninstallLinux(task)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/fusong/ClaudeCode/notelite && npx tsc --noEmit 2>&1 | grep "system-scheduler" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add electron/main/system-scheduler.ts
git commit -m "feat: add system-scheduler.ts with launchd and crontab adapters"
```

---

### Task 4: Update `scheduler.ts` to branch on task type

**Files:**
- Modify: `electron/main/scheduler.ts`

- [ ] **Step 1: Add imports at top of `scheduler.ts`**

After the existing imports, add:

```typescript
import { isSystemSchedulerSupported, installJob, uninstallJob } from './system-scheduler'
import { mergeResultsIntoTasks } from './scheduler-results'
```

- [ ] **Step 2: Update `schedulerHandleSave` to branch on task type**

Find the existing `schedulerHandleSave`:

```typescript
export function schedulerHandleSave(task: SchedulerTask): SchedulerTask {
  saveTask(task)
  registerJob(task)
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('scheduler:tasks-changed')
  }
  return task
}
```

Replace with:

```typescript
export async function schedulerHandleSave(task: SchedulerTask): Promise<SchedulerTask> {
  if (task.type === 'shell' && isSystemSchedulerSupported()) {
    // Uninstall old system job if updating
    if (task.systemJobId) await uninstallJob(task)
    const { success, jobId } = await installJob(task)
    if (success) {
      task.systemJobId = jobId
      writeLog(task.id, 'info', `Installed system job: ${jobId}`)
    } else {
      task.systemJobId = undefined
      writeLog(task.id, 'warn', 'System job install failed, falling back to node-cron')
      registerJob(task)
    }
  } else {
    // builtin tasks or Windows: use node-cron
    if (task.systemJobId) {
      await uninstallJob(task)
      task.systemJobId = undefined
    }
    registerJob(task)
  }
  saveTask(task)
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('scheduler:tasks-changed')
  }
  return task
}
```

- [ ] **Step 3: Update `schedulerHandleDeleteAndNotify` to uninstall system job**

Find:

```typescript
export function schedulerHandleDeleteAndNotify(id: string) {
  unregisterJob(id)
  deleteTaskFromStore(id)
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('scheduler:tasks-changed')
  }
}
```

Replace with:

```typescript
export async function schedulerHandleDeleteAndNotify(id: string): Promise<void> {
  const task = loadTasks().find(t => t.id === id)
  if (task?.systemJobId) {
    await uninstallJob(task)
  }
  unregisterJob(id)
  deleteTaskFromStore(id)
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('scheduler:tasks-changed')
  }
}
```

- [ ] **Step 4: Update `schedulerHandleList` to merge results**

Find:

```typescript
export function schedulerHandleList() {
  return loadTasks()
}
```

Replace with:

```typescript
export function schedulerHandleList() {
  return mergeResultsIntoTasks(loadTasks())
}
```

- [ ] **Step 5: Update `initScheduler` to merge results on startup**

Find in `initScheduler`:

```typescript
  let tasks = loadTasks()
```

Replace with:

```typescript
  let tasks = mergeResultsIntoTasks(loadTasks())
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/fusong/ClaudeCode/notelite && npx tsc --noEmit 2>&1 | grep "scheduler" | head -10
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add electron/main/scheduler.ts
git commit -m "feat: branch shell tasks to system scheduler in schedulerHandleSave"
```

---

### Task 5: Update `index.ts` IPC handlers for async save/delete

**Files:**
- Modify: `electron/main/index.ts`

The IPC handlers need to await the now-async `schedulerHandleSave` and `schedulerHandleDeleteAndNotify`.

- [ ] **Step 1: Update IPC handlers**

Find:

```typescript
ipcMain.handle('scheduler:save', (_event, task) => schedulerHandleSave(task))
ipcMain.handle('scheduler:delete', (_event, { id }) => schedulerHandleDeleteAndNotify(id))
```

Replace with:

```typescript
ipcMain.handle('scheduler:save', async (_event, task) => schedulerHandleSave(task))
ipcMain.handle('scheduler:delete', async (_event, { id }) => schedulerHandleDeleteAndNotify(id))
```

(The `async` wrapper ensures the returned promise is properly awaited by the IPC handle mechanism.)

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/fusong/ClaudeCode/notelite && npx tsc --noEmit 2>&1 | grep "index.ts" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add electron/main/index.ts
git commit -m "fix: await async schedulerHandleSave and schedulerHandleDeleteAndNotify in IPC"
```

---

### Task 6: Add system/app badge to scheduler task list in UI

**Files:**
- Modify: `src/components/aside/AConfig.vue`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/zh.ts`

- [ ] **Step 1: Add badge to task list rows**

In `src/components/aside/AConfig.vue`, find the task list row in the scheduler list view:

```html
                    <span class="s-name">{{ item.name }}</span>
                    <span class="s-status" :class="'s-status-' + (item.lastStatus || 'none')">
                      {{ statusLabel(item) }}
                    </span>
```

Replace with:

```html
                    <span class="s-name">{{ item.name }}</span>
                    <span class="s-badge" :class="item.systemJobId ? 's-badge-system' : 's-badge-app'">
                      {{ item.type === 'shell' ? (item.systemJobId ? t('scheduler.badgeSystem') : t('scheduler.badgeApp')) : t('scheduler.badgeApp') }}
                    </span>
                    <span class="s-status" :class="'s-status-' + (item.lastStatus || 'none')">
                      {{ statusLabel(item) }}
                    </span>
```

- [ ] **Step 2: Add Windows info note to shell task form**

In the form view, find the task type select:

```html
                  <el-form-item :label="t('scheduler.taskType')">
                    <el-select v-model="taskForm.type" style="width:140px">
```

Add before it:

```html
                  <div v-if="taskForm.type === 'shell' && isWindows" class="s-windows-note">
                    {{ t('scheduler.windowsFallback') }}
                  </div>
```

- [ ] **Step 3: Add `isWindows` computed and badge CSS**

In the script block, after `const weekdays = [...]`, add:

```typescript
  const isWindows = process.platform === 'win32'
```

In the style block, add:

```css
.s-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
  white-space: nowrap;
}
.s-badge-system { background: #f0f0f0; color: #606266; }
.s-badge-app { background: #ecf5ff; color: #409eff; }
.s-windows-note {
  font-size: 12px;
  color: #e6a23c;
  padding: 6px 0;
  margin-bottom: 4px;
}
```

- [ ] **Step 4: Add i18n keys to `src/i18n/en.ts`**

Find `confirmDelete: 'Delete task "{name}"?',` and add after:

```typescript
      badgeSystem: '⚙ System',
      badgeApp: '⚙ App',
      windowsFallback: 'Shell tasks use in-app scheduling on Windows.',
```

- [ ] **Step 5: Add i18n keys to `src/i18n/zh.ts`**

Find `confirmDelete: '删除任务 "{name}"？',` and add after:

```typescript
      badgeSystem: '⚙ 系统',
      badgeApp: '⚙ 应用',
      windowsFallback: 'Shell 任务在 Windows 上使用应用内调度。',
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/fusong/ClaudeCode/notelite && npx tsc --noEmit 2>&1 | grep "AConfig\|i18n" | head -5
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/aside/AConfig.vue src/i18n/en.ts src/i18n/zh.ts
git commit -m "feat: add system/app badge to scheduler task list, Windows fallback note"
```

---

### Task 7: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
cd /Users/fusong/ClaudeCode/notelite && npm run dev
```

- [ ] **Step 2: Test shell task on macOS — creates system job**

1. Open settings → Scheduler tab
2. Create a new shell task: name "Test echo", command `echo hello > /tmp/notelite-test.txt`, schedule daily 09:00
3. Save → task appears with `⚙ System` badge
4. Verify plist created:
   ```bash
   ls ~/Library/LaunchAgents/com.notelite.*.plist
   ```
   Expected: one plist file
5. Verify wrapper script created:
   ```bash
   ls ~/.notelite/wrappers/
   cat ~/.notelite/wrappers/*.sh
   ```

- [ ] **Step 3: Test run now — results written**

1. Click ▶ Run Now on the shell task
   (Note: Run Now still uses node-cron path, not the system job — this is correct)
2. Check results file:
   ```bash
   cat ~/Library/Application\ Support/notelite/scheduler-results.json
   ```

- [ ] **Step 4: Test task delete — system job removed**

1. Delete the shell task from settings
2. Verify plist removed:
   ```bash
   ls ~/Library/LaunchAgents/com.notelite.*.plist 2>/dev/null || echo "removed"
   ```
   Expected: "removed"

- [ ] **Step 5: Test builtin task — still uses node-cron**

1. Create a builtin task (Git Pull or Refresh Tree)
2. Save → badge shows `⚙ App`
3. No plist should be created

- [ ] **Step 6: Verify results merge on drawer open**

1. Manually write a test result to scheduler-results.json:
   ```bash
   echo '{"some-task-id": {"lastRun": 1714000000000, "lastStatus": "success", "lastError": "", "exitCode": 0}}' > ~/Library/Application\ Support/notelite/scheduler-results.json
   ```
2. Close and reopen the settings drawer
3. No crash — results are read silently
