# Local Task Scheduler Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cron-based local task scheduler to notelite that runs shell commands and built-in operations (git pull/push, refresh tree) from the Electron main process.

**Architecture:** The scheduler engine lives in `electron/main/scheduler.ts`, uses `node-cron` to register jobs, and communicates with the renderer via IPC. The renderer provides a sidebar panel (Scheduler.vue) and a create/edit dialog (TaskDialog.vue). Tasks are persisted to `electron-store`.

**Tech Stack:** Vue 3 + TypeScript, Electron, node-cron, simple-git, electron-store, Element Plus, uuid (already installed)

---

### Task 1: Install node-cron and define SchedulerTask type

**Files:**
- Modify: `package.json` (via npm)
- Create: `src/types/scheduler.ts`

- [ ] **Step 1: Install node-cron**

```bash
cd /Users/fusong/ClaudeCode/notelite && npm install node-cron && npm install --save-dev @types/node-cron
```

Expected: `added N packages`, no errors.

- [ ] **Step 2: Create `src/types/scheduler.ts`**

```typescript
export interface SchedulerTask {
  id: string
  name: string
  enabled: boolean
  schedule: {
    mode: 'simple' | 'cron'
    frequency?: 'daily' | 'weekly' | 'monthly'
    time?: string       // "HH:MM"
    weekday?: number    // 0–6
    day?: number        // 1–31
    cron?: string       // stored cron expression (always present after save)
  }
  type: 'shell' | 'builtin'
  command?: string
  workdir?: string
  action?: 'git-pull' | 'git-push' | 'refresh-tree'
  retry: {
    maxAttempts: number
    delaySeconds: number
  }
  lastRun?: number
  lastStatus?: 'success' | 'error' | 'running' | 'skipped'
  lastError?: string
}

export interface TaskResult {
  id: string
  status: 'success' | 'error' | 'skipped'
  output: string
  error?: string
  timestamp: number
}

export function simpleToCron(task: SchedulerTask): string {
  const { frequency, time = '09:00', weekday = 1, day = 1 } = task.schedule
  const [hh, mm] = time.split(':').map(Number)
  if (frequency === 'daily') return `${mm} ${hh} * * *`
  if (frequency === 'weekly') return `${mm} ${hh} * * ${weekday}`
  if (frequency === 'monthly') return `${mm} ${hh} ${day} * *`
  return `${mm} ${hh} * * *`
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/fusong/ClaudeCode/notelite && npx tsc --noEmit 2>&1 | grep "scheduler" | head -10
```

Expected: no errors for scheduler.ts.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/types/scheduler.ts
git commit -m "feat: install node-cron, define SchedulerTask type"
```

---

### Task 2: Build scheduler engine in main process

**Files:**
- Create: `electron/main/scheduler.ts`

- [ ] **Step 1: Create `electron/main/scheduler.ts`**

```typescript
import { BrowserWindow, Notification, app } from 'electron'
import * as nodeCron from 'node-cron'
import { exec } from 'child_process'
import { join } from 'path'
import * as fs from 'fs'
import { SchedulerTask, TaskResult } from '../../src/types/scheduler'

const ElectronStore = require('electron-store')
const store = new ElectronStore()

const activeJobs = new Map<string, nodeCron.ScheduledTask>()
const runningTasks = new Set<string>()

let mainWin: BrowserWindow | null = null

// ── Logging ──────────────────────────────────────────────────────────────────

function getLogPath() {
  return join(app.getPath('userData'), 'scheduler.log')
}

function writeLog(taskId: string, status: string, message: string) {
  const line = `[${new Date().toISOString()}] [${taskId}] [${status}] ${message}\n`
  const logPath = getLogPath()
  try {
    fs.appendFileSync(logPath, line, 'utf-8')
    // Trim to last 1000 lines
    const content = fs.readFileSync(logPath, 'utf-8')
    const lines = content.split('\n').filter(Boolean)
    if (lines.length > 1000) {
      fs.writeFileSync(logPath, lines.slice(lines.length - 1000).join('\n') + '\n', 'utf-8')
    }
  } catch (_) {}
}

// ── Store helpers ─────────────────────────────────────────────────────────────

function loadTasks(): SchedulerTask[] {
  return (store.get('schedulerTasks') as SchedulerTask[]) || []
}

function saveTask(task: SchedulerTask) {
  const tasks = loadTasks()
  const idx = tasks.findIndex(t => t.id === task.id)
  if (idx >= 0) tasks[idx] = task
  else tasks.push(task)
  store.set('schedulerTasks', tasks)
}

function deleteTaskFromStore(id: string) {
  const tasks = loadTasks().filter(t => t.id !== id)
  store.set('schedulerTasks', tasks)
}

// ── Execution ─────────────────────────────────────────────────────────────────

async function execShell(command: string, workdir: string): Promise<{ output: string; error?: string }> {
  return new Promise((resolve) => {
    exec(command, { cwd: workdir, timeout: 120000 }, (err, stdout, stderr) => {
      if (err) resolve({ output: stdout.trim(), error: stderr.trim() || err.message })
      else resolve({ output: stdout.trim() })
    })
  })
}

async function execBuiltin(action: string): Promise<{ output: string; error?: string }> {
  if (action === 'refresh-tree') {
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('scheduler:refresh-tree')
    }
    return { output: 'Tree refresh requested' }
  }

  // git-pull / git-push: delegate to renderer (it has simpleGit context)
  return new Promise((resolve) => {
    if (!mainWin || mainWin.isDestroyed()) {
      resolve({ output: '', error: 'Window not available' })
      return
    }
    const timeout = setTimeout(() => resolve({ output: '', error: 'Builtin action timeout' }), 30000)
    mainWin.webContents.send('scheduler:builtin-action', action)
    // Renderer replies via scheduler:builtin-result IPC
    const { ipcMain } = require('electron')
    ipcMain.once(`scheduler:builtin-result:${action}`, (_: any, result: { output: string; error?: string }) => {
      clearTimeout(timeout)
      resolve(result)
    })
  })
}

async function runTask(task: SchedulerTask): Promise<void> {
  if (runningTasks.has(task.id)) {
    writeLog(task.id, 'skipped', 'Previous run still in progress')
    return
  }

  runningTasks.add(task.id)
  task.lastStatus = 'running'
  task.lastRun = Date.now()
  saveTask(task)

  let result: { output: string; error?: string } = { output: '' }
  let succeeded = false

  for (let attempt = 1; attempt <= task.retry.maxAttempts; attempt++) {
    try {
      if (task.type === 'shell') {
        const workdir = task.workdir || app.getPath('home')
        result = await execShell(task.command || '', workdir)
      } else {
        result = await execBuiltin(task.action || '')
      }

      if (!result.error) {
        succeeded = true
        break
      }
    } catch (e: any) {
      result = { output: '', error: e.message }
    }

    writeLog(task.id, `attempt-${attempt}-failed`, result.error || 'unknown error')

    if (attempt < task.retry.maxAttempts) {
      await new Promise(r => setTimeout(r, task.retry.delaySeconds * 1000))
    }
  }

  task.lastStatus = succeeded ? 'success' : 'error'
  task.lastError = succeeded ? undefined : result.error
  task.lastRun = Date.now()
  saveTask(task)

  const taskResult: TaskResult = {
    id: task.id,
    status: task.lastStatus,
    output: result.output,
    error: result.error,
    timestamp: task.lastRun,
  }

  writeLog(task.id, task.lastStatus, result.output.slice(0, 200))

  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('task-result', taskResult)
  }

  if (!succeeded) {
    new Notification({
      title: 'Scheduler Task Failed',
      body: `"${task.name}" failed after ${task.retry.maxAttempts} attempt(s): ${result.error?.slice(0, 100)}`,
    }).show()
  }

  runningTasks.delete(task.id)
}

// ── Job registration ──────────────────────────────────────────────────────────

function registerJob(task: SchedulerTask) {
  unregisterJob(task.id)
  if (!task.enabled || !task.schedule.cron) return
  if (!nodeCron.validate(task.schedule.cron)) {
    writeLog(task.id, 'error', `Invalid cron expression: ${task.schedule.cron}`)
    return
  }
  const job = nodeCron.schedule(task.schedule.cron, () => runTask(task))
  activeJobs.set(task.id, job)
}

function unregisterJob(id: string) {
  const job = activeJobs.get(id)
  if (job) {
    job.stop()
    activeJobs.delete(id)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function initScheduler(window: BrowserWindow) {
  mainWin = window
  const tasks = loadTasks()
  for (const task of tasks) {
    if (task.enabled) registerJob(task)
  }
  writeLog('system', 'info', `Scheduler initialized with ${tasks.filter(t => t.enabled).length} active tasks`)
}

export function schedulerHandleList() {
  return loadTasks()
}

export function schedulerHandleSave(task: SchedulerTask): SchedulerTask {
  saveTask(task)
  registerJob(task)
  return task
}

export function schedulerHandleDelete(id: string) {
  unregisterJob(id)
  deleteTaskFromStore(id)
}

export async function schedulerHandleRunNow(id: string) {
  const task = loadTasks().find(t => t.id === id)
  if (task) await runTask(task)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/fusong/ClaudeCode/notelite && npx tsc --noEmit 2>&1 | grep "scheduler" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add electron/main/scheduler.ts
git commit -m "feat: add scheduler engine to main process"
```

---

### Task 3: Wire scheduler into main process IPC

**Files:**
- Modify: `electron/main/index.ts`

- [ ] **Step 1: Import scheduler and call `initScheduler` after window creation**

In `electron/main/index.ts`, add the import at the top (after existing imports):

```typescript
import { initScheduler, schedulerHandleList, schedulerHandleSave, schedulerHandleDelete, schedulerHandleRunNow } from './scheduler'
```

- [ ] **Step 2: Call `initScheduler` after window loads**

Find the `did-finish-load` handler:

```typescript
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
    win?.webContents.send("git-available", gitAvailable);
  });
```

Replace with:

```typescript
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
    win?.webContents.send("git-available", gitAvailable);
    if (win) initScheduler(win);
  });
```

- [ ] **Step 3: Register IPC handlers**

After the existing `ipcMain.on('terminal-resize', ...)` block at the bottom of `index.ts`, add:

```typescript
// Scheduler IPC handlers
ipcMain.handle('scheduler:list', () => schedulerHandleList())
ipcMain.handle('scheduler:save', (_event, task) => schedulerHandleSave(task))
ipcMain.handle('scheduler:delete', (_event, { id }) => schedulerHandleDelete(id))
ipcMain.handle('scheduler:run-now', (_event, { id }) => schedulerHandleRunNow(id))
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/fusong/ClaudeCode/notelite && npx tsc --noEmit 2>&1 | grep -E "scheduler|index\.ts" | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add electron/main/index.ts
git commit -m "feat: wire scheduler IPC handlers into main process"
```

---

### Task 4: Add scheduler state to Pinia store

**Files:**
- Modify: `src/store/store.ts`

- [ ] **Step 1: Add scheduler UI state to store state**

In `src/store/store.ts`, find `helpDialog: { show: false, },` and add after it:

```typescript
scheduler: {
  dialogVisible: false,
  editingTask: null as import('@/types/scheduler').SchedulerTask | null,
},
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/fusong/ClaudeCode/notelite && npx tsc --noEmit 2>&1 | grep "store.ts" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/store/store.ts
git commit -m "feat: add scheduler UI state to store"
```

---

### Task 5: Add i18n keys

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/zh.ts`

- [ ] **Step 1: Add English keys to `src/i18n/en.ts`**

Find the last key block in `en.ts` (e.g., `help: { ... }`) and add before the closing `}` of the exported object:

```typescript
  scheduler: {
    title: 'Scheduler',
    newTask: 'New Task',
    empty: 'No tasks yet. Click + to create one.',
    taskName: 'Task name',
    taskNamePlaceholder: 'e.g. Daily git pull',
    schedule: 'Schedule',
    simple: 'Simple',
    cron: 'Cron',
    frequency: 'Frequency',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    time: 'Time',
    weekday: 'Weekday',
    dayOfMonth: 'Day of month',
    cronExpression: 'Cron expression',
    cronInvalid: 'Invalid cron expression',
    taskType: 'Task type',
    shell: 'Shell command',
    builtin: 'Built-in action',
    command: 'Command',
    workdir: 'Working directory',
    workdirPlaceholder: 'Default: current notebook path',
    action: 'Action',
    gitPull: 'Git Pull',
    gitPush: 'Git Push',
    refreshTree: 'Refresh Tree',
    retry: 'Retry',
    maxAttempts: 'Max attempts',
    delaySeconds: 'Delay (seconds)',
    enabled: 'Enabled',
    logs: 'Execution Logs',
    noLogs: 'No logs yet',
    runNow: 'Run Now',
    delete: 'Delete',
    nextRun: 'Next run',
    lastRun: 'Last run',
    never: 'Never',
    statusSuccess: 'Success',
    statusError: 'Error',
    statusRunning: 'Running',
    statusSkipped: 'Skipped',
    statusDisabled: 'Disabled',
    confirmDelete: 'Delete task "{name}"?',
  },
```

- [ ] **Step 2: Add Chinese keys to `src/i18n/zh.ts`**

Find the last key block in `zh.ts` and add before the closing `}`:

```typescript
  scheduler: {
    title: '定时任务',
    newTask: '新建任务',
    empty: '暂无任务，点击 + 创建',
    taskName: '任务名称',
    taskNamePlaceholder: '例如：每日 git pull',
    schedule: '执行时间',
    simple: '简单模式',
    cron: 'Cron 模式',
    frequency: '频率',
    daily: '每天',
    weekly: '每周',
    monthly: '每月',
    time: '时间',
    weekday: '星期',
    dayOfMonth: '日期',
    cronExpression: 'Cron 表达式',
    cronInvalid: 'Cron 表达式无效',
    taskType: '任务类型',
    shell: 'Shell 命令',
    builtin: '内置操作',
    command: '命令',
    workdir: '工作目录',
    workdirPlaceholder: '默认：当前笔记本路径',
    action: '操作',
    gitPull: 'Git Pull',
    gitPush: 'Git Push',
    refreshTree: '刷新目录树',
    retry: '重试',
    maxAttempts: '最大次数',
    delaySeconds: '间隔（秒）',
    enabled: '启用',
    logs: '执行日志',
    noLogs: '暂无日志',
    runNow: '立即执行',
    delete: '删除',
    nextRun: '下次执行',
    lastRun: '上次执行',
    never: '从未执行',
    statusSuccess: '成功',
    statusError: '失败',
    statusRunning: '执行中',
    statusSkipped: '已跳过',
    statusDisabled: '已禁用',
    confirmDelete: '删除任务 "{name}"？',
  },
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/en.ts src/i18n/zh.ts
git commit -m "feat: add scheduler i18n keys"
```

---

### Task 6: Build TaskDialog component

**Files:**
- Create: `src/components/scheduler/TaskDialog.vue`

- [ ] **Step 1: Create `src/components/scheduler/TaskDialog.vue`**

```vue
<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? task.name : t('scheduler.newTask')"
    width="520px"
    @close="handleClose"
  >
    <el-form :model="task" label-width="110px" size="small">
      <!-- Name -->
      <el-form-item :label="t('scheduler.taskName')" required>
        <el-input v-model="task.name" :placeholder="t('scheduler.taskNamePlaceholder')" />
      </el-form-item>

      <!-- Schedule mode -->
      <el-form-item :label="t('scheduler.schedule')">
        <el-radio-group v-model="task.schedule.mode">
          <el-radio value="simple">{{ t('scheduler.simple') }}</el-radio>
          <el-radio value="cron">{{ t('scheduler.cron') }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- Simple mode -->
      <template v-if="task.schedule.mode === 'simple'">
        <el-form-item :label="t('scheduler.frequency')">
          <el-select v-model="task.schedule.frequency" style="width:120px">
            <el-option value="daily" :label="t('scheduler.daily')" />
            <el-option value="weekly" :label="t('scheduler.weekly')" />
            <el-option value="monthly" :label="t('scheduler.monthly')" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('scheduler.time')">
          <el-time-picker v-model="timeDate" format="HH:mm" value-format="HH:mm" style="width:120px" />
        </el-form-item>
        <el-form-item v-if="task.schedule.frequency === 'weekly'" :label="t('scheduler.weekday')">
          <el-select v-model="task.schedule.weekday" style="width:120px">
            <el-option v-for="(d, i) in weekdays" :key="i" :value="i" :label="d" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="task.schedule.frequency === 'monthly'" :label="t('scheduler.dayOfMonth')">
          <el-input-number v-model="task.schedule.day" :min="1" :max="31" style="width:120px" />
        </el-form-item>
      </template>

      <!-- Cron mode -->
      <template v-else>
        <el-form-item :label="t('scheduler.cronExpression')">
          <el-input v-model="task.schedule.cron" placeholder="0 9 * * *" @blur="validateCron" />
          <div v-if="cronError" style="color:#f56c6c;font-size:12px;margin-top:4px">{{ t('scheduler.cronInvalid') }}</div>
        </el-form-item>
      </template>

      <!-- Task type -->
      <el-form-item :label="t('scheduler.taskType')">
        <el-radio-group v-model="task.type">
          <el-radio value="shell">{{ t('scheduler.shell') }}</el-radio>
          <el-radio value="builtin">{{ t('scheduler.builtin') }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- Shell fields -->
      <template v-if="task.type === 'shell'">
        <el-form-item :label="t('scheduler.command')" required>
          <el-input v-model="task.command" placeholder="e.g. python script.py" />
        </el-form-item>
        <el-form-item :label="t('scheduler.workdir')">
          <el-input v-model="task.workdir" :placeholder="t('scheduler.workdirPlaceholder')" />
        </el-form-item>
      </template>

      <!-- Builtin fields -->
      <template v-else>
        <el-form-item :label="t('scheduler.action')">
          <el-select v-model="task.action" style="width:160px">
            <el-option value="git-pull" :label="t('scheduler.gitPull')" />
            <el-option value="git-push" :label="t('scheduler.gitPush')" />
            <el-option value="refresh-tree" :label="t('scheduler.refreshTree')" />
          </el-select>
        </el-form-item>
      </template>

      <!-- Retry -->
      <el-form-item :label="t('scheduler.retry')">
        <el-input-number v-model="task.retry.maxAttempts" :min="1" :max="10" style="width:80px" />
        <span style="margin:0 8px;font-size:12px;color:#909399">{{ t('scheduler.maxAttempts') }}</span>
        <el-input-number v-model="task.retry.delaySeconds" :min="10" :max="3600" style="width:100px" />
        <span style="margin-left:8px;font-size:12px;color:#909399">{{ t('scheduler.delaySeconds') }}</span>
      </el-form-item>

      <!-- Enabled -->
      <el-form-item :label="t('scheduler.enabled')">
        <el-checkbox v-model="task.enabled" />
      </el-form-item>

      <!-- Logs (edit mode only) -->
      <el-form-item v-if="isEdit" :label="t('scheduler.logs')">
        <div class="task-logs">
          <div v-if="!logs.length" class="logs-empty">{{ t('scheduler.noLogs') }}</div>
          <div v-for="(log, i) in logs" :key="i" class="log-entry" @click="toggleLog(i)">
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            <span class="log-status" :class="'log-' + log.status">{{ log.status }}</span>
            <span class="log-output">{{ expanded.has(i) ? log.output : log.output.split('\n')[0] }}</span>
          </div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :disabled="!canSave" @click="handleSave">{{ t('common.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ipcRenderer } from 'electron'
import { SchedulerTask, TaskResult, simpleToCron } from '@/types/scheduler'
import { v4 as uuidv4 } from 'uuid'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  initialTask?: SchedulerTask | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'saved', task: SchedulerTask): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isEdit = computed(() => !!props.initialTask?.id)

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function defaultTask(): SchedulerTask {
  return {
    id: '',
    name: '',
    enabled: true,
    schedule: { mode: 'simple', frequency: 'daily', time: '09:00' },
    type: 'shell',
    command: '',
    workdir: '',
    action: 'git-pull',
    retry: { maxAttempts: 3, delaySeconds: 60 },
  }
}

const task = ref<SchedulerTask>(defaultTask())
const cronError = ref(false)
const logs = ref<TaskResult[]>([])
const expanded = ref(new Set<number>())

// timeDate is a proxy for task.schedule.time used by el-time-picker
const timeDate = computed({
  get: () => task.value.schedule.time || '09:00',
  set: (v: string) => { task.value.schedule.time = v },
})

watch(() => props.modelValue, (open) => {
  if (open) {
    task.value = props.initialTask ? { ...props.initialTask, schedule: { ...props.initialTask.schedule } } : defaultTask()
    cronError.value = false
    logs.value = []
    expanded.value = new Set()
    if (isEdit.value) loadLogs()
  }
})

async function loadLogs() {
  // Logs come from task-result events; for now show last results from store via list
  const tasks: SchedulerTask[] = await ipcRenderer.invoke('scheduler:list')
  const found = tasks.find(t => t.id === task.value.id)
  if (found?.lastRun) {
    logs.value = [{
      id: found.id,
      status: found.lastStatus === 'success' ? 'success' : 'error',
      output: found.lastError || '',
      error: found.lastError,
      timestamp: found.lastRun,
    }]
  }
}

function validateCron() {
  if (task.value.schedule.mode !== 'cron') return
  const expr = task.value.schedule.cron || ''
  // Basic 5-field cron validation: each field non-empty
  const parts = expr.trim().split(/\s+/)
  cronError.value = parts.length !== 5
}

const canSave = computed(() => {
  if (!task.value.name.trim()) return false
  if (task.value.schedule.mode === 'cron') {
    const parts = (task.value.schedule.cron || '').trim().split(/\s+/)
    if (parts.length !== 5) return false
  }
  if (task.value.type === 'shell' && !task.value.command?.trim()) return false
  return true
})

async function handleSave() {
  const toSave: SchedulerTask = { ...task.value, schedule: { ...task.value.schedule } }
  if (!toSave.id) toSave.id = uuidv4()
  // Convert simple mode to cron
  if (toSave.schedule.mode === 'simple') {
    toSave.schedule.cron = simpleToCron(toSave)
  }
  const saved: SchedulerTask = await ipcRenderer.invoke('scheduler:save', toSave)
  emit('saved', saved)
  emit('update:modelValue', false)
}

function handleClose() {
  emit('update:modelValue', false)
}

function toggleLog(i: number) {
  if (expanded.value.has(i)) expanded.value.delete(i)
  else expanded.value.add(i)
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString()
}
</script>

<style scoped>
.task-logs {
  max-height: 200px;
  overflow-y: auto;
  width: 100%;
  font-size: 12px;
}
.logs-empty {
  color: #909399;
  padding: 8px 0;
}
.log-entry {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  align-items: flex-start;
}
.log-time {
  color: #909399;
  white-space: nowrap;
  flex-shrink: 0;
}
.log-status {
  font-weight: 600;
  flex-shrink: 0;
}
.log-success { color: #67c23a; }
.log-error { color: #f56c6c; }
.log-skipped { color: #e6a23c; }
.log-output {
  color: #606266;
  word-break: break-all;
}
</style>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/fusong/ClaudeCode/notelite && npx tsc --noEmit 2>&1 | grep "TaskDialog" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/scheduler/TaskDialog.vue
git commit -m "feat: add TaskDialog component for scheduler"
```

---

### Task 7: Build Scheduler sidebar panel

**Files:**
- Create: `src/components/aside/Scheduler.vue`

- [ ] **Step 1: Create `src/components/aside/Scheduler.vue`**

```vue
<template>
  <div class="scheduler-panel">
    <div class="scheduler-header">
      <span class="scheduler-title">{{ t('scheduler.title') }}</span>
      <button class="add-btn" @click="openCreate" title="New task">+</button>
    </div>

    <div v-if="!tasks.length" class="scheduler-empty">
      {{ t('scheduler.empty') }}
    </div>

    <div v-else class="task-list">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="task-row"
        @click="openEdit(task)"
      >
        <span class="status-dot" :class="dotClass(task)" :title="dotTitle(task)"></span>
        <span class="task-name">{{ task.name }}</span>
        <span class="task-next">{{ nextRunLabel(task) }}</span>
        <span class="task-actions" @click.stop>
          <button class="action-btn" @click="runNow(task)" :title="t('scheduler.runNow')">▶</button>
          <button class="action-btn danger" @click="deleteTask(task)" :title="t('scheduler.delete')">✕</button>
        </span>
      </div>
    </div>

    <TaskDialog
      v-model="dialogVisible"
      :initial-task="editingTask"
      @saved="onSaved"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { ipcRenderer } from 'electron'
import { ElMessageBox } from 'element-plus'
import { SchedulerTask, TaskResult } from '@/types/scheduler'
import TaskDialog from '@/components/scheduler/TaskDialog.vue'
import { useTtsStore } from '@/store/store'

const { t } = useI18n()
const ttsStore = useTtsStore()

const tasks = ref<SchedulerTask[]>([])
const dialogVisible = ref(false)
const editingTask = ref<SchedulerTask | null>(null)

async function loadTasks() {
  tasks.value = await ipcRenderer.invoke('scheduler:list')
}

function openCreate() {
  editingTask.value = null
  dialogVisible.value = true
}

function openEdit(task: SchedulerTask) {
  editingTask.value = task
  dialogVisible.value = true
}

async function runNow(task: SchedulerTask) {
  await ipcRenderer.invoke('scheduler:run-now', { id: task.id })
}

async function deleteTask(task: SchedulerTask) {
  await ElMessageBox.confirm(
    t('scheduler.confirmDelete', { name: task.name }),
    t('common.delete'),
    { confirmButtonText: t('common.ok'), cancelButtonText: t('common.cancel'), type: 'warning' }
  )
  await ipcRenderer.invoke('scheduler:delete', { id: task.id })
  await loadTasks()
}

function onSaved(saved: SchedulerTask) {
  const idx = tasks.value.findIndex(t => t.id === saved.id)
  if (idx >= 0) tasks.value[idx] = saved
  else tasks.value.push(saved)
}

function dotClass(task: SchedulerTask) {
  if (!task.enabled) return 'dot-grey'
  if (task.lastStatus === 'running') return 'dot-yellow'
  if (task.lastStatus === 'error') return 'dot-red'
  if (task.lastStatus === 'success') return 'dot-green'
  return 'dot-blue'
}

function dotTitle(task: SchedulerTask) {
  if (!task.enabled) return t('scheduler.statusDisabled')
  return task.lastStatus ? t(`scheduler.status${task.lastStatus.charAt(0).toUpperCase() + task.lastStatus.slice(1)}`) : t('scheduler.never')
}

function nextRunLabel(task: SchedulerTask) {
  if (!task.enabled || !task.schedule.cron) return '—'
  // Simple display: just show cron expression
  return task.schedule.cron
}

// Handle task-result updates from main process
function onTaskResult(_event: any, result: TaskResult) {
  const task = tasks.value.find(t => t.id === result.id)
  if (task) {
    task.lastStatus = result.status
    task.lastRun = result.timestamp
    task.lastError = result.error
  }
}

// Handle builtin actions requested by scheduler
function onBuiltinAction(_event: any, action: string) {
  if (action === 'git-pull') {
    // Trigger git pull via store
    const { gitHubPull } = require('@/libs/github')
    const { useI18n: i } = require('vue-i18n')
    gitHubPull(t, ttsStore.notebook.currentPath).then((ok: boolean) => {
      ipcRenderer.send(`scheduler:builtin-result:git-pull`, { output: ok ? 'pulled' : '', error: ok ? undefined : 'pull failed' })
      if (ok) ttsStore.refreshTreeData()
    }).catch((e: any) => {
      ipcRenderer.send(`scheduler:builtin-result:git-pull`, { output: '', error: e.message })
    })
  } else if (action === 'git-push') {
    const { gitHubPush } = require('@/libs/github')
    gitHubPush(t).then((ok: boolean) => {
      ipcRenderer.send(`scheduler:builtin-result:git-push`, { output: ok ? 'pushed' : '', error: ok ? undefined : 'push failed' })
    }).catch((e: any) => {
      ipcRenderer.send(`scheduler:builtin-result:git-push`, { output: '', error: e.message })
    })
  } else if (action === 'refresh-tree') {
    ttsStore.refreshTreeData()
  }
}

function onRefreshTree() {
  ttsStore.refreshTreeData()
}

onMounted(() => {
  loadTasks()
  ipcRenderer.on('task-result', onTaskResult)
  ipcRenderer.on('scheduler:builtin-action', onBuiltinAction)
  ipcRenderer.on('scheduler:refresh-tree', onRefreshTree)
})

onBeforeUnmount(() => {
  ipcRenderer.removeListener('task-result', onTaskResult)
  ipcRenderer.removeListener('scheduler:builtin-action', onBuiltinAction)
  ipcRenderer.removeListener('scheduler:refresh-tree', onRefreshTree)
})
</script>

<style scoped>
.scheduler-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
}
.scheduler-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 6px;
  flex-shrink: 0;
}
.scheduler-title {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.add-btn {
  width: 22px;
  height: 22px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.add-btn:hover { background: #ecf5ff; }
.scheduler-empty {
  padding: 16px 12px;
  font-size: 12px;
  color: #909399;
  text-align: center;
}
.task-list { flex: 1; overflow-y: auto; }
.task-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 12px;
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
.task-row:hover { background: rgba(0,0,0,0.03); }
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-grey { background: #909399; }
.dot-green { background: #67c23a; }
.dot-red { background: #f56c6c; }
.dot-yellow { background: #e6a23c; }
.dot-blue { background: #409eff; }
.task-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
}
.task-next {
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.task-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.task-row:hover .task-actions { opacity: 1; }
.action-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 11px;
  color: #909399;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-btn:hover { background: rgba(0,0,0,0.06); color: #409eff; }
.action-btn.danger:hover { color: #f56c6c; }
</style>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/fusong/ClaudeCode/notelite && npx tsc --noEmit 2>&1 | grep "Scheduler" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/aside/Scheduler.vue
git commit -m "feat: add Scheduler sidebar panel"
```

---

### Task 8: Wire Scheduler into sidebar navigation

**Files:**
- Modify: `src/components/aside/Aside.vue`
- Modify: `src/components/aside/Bside.vue`

- [ ] **Step 1: Add Timer icon to Aside.vue**

In `src/components/aside/Aside.vue`, find the import line:

```typescript
import { StarFilled, Clock } from '@element-plus/icons-vue';
```

Replace with:

```typescript
import { StarFilled, Clock, Timer } from '@element-plus/icons-vue';
```

Find the closing `</el-menu-item>` for index "3" and add after it:

```html
        <el-menu-item index="4">
          <el-icon><Timer /></el-icon>
          <span></span>
        </el-menu-item>
```

Also update the `menuChange` function — remove the `if (index === 4) return;` guard (it was blocking index 4):

```typescript
  const menuChange = (index: any) => {
    ttsStore.page.asideIndex = index.toString();
  };
```

- [ ] **Step 2: Add Scheduler panel to Bside.vue**

In `src/components/aside/Bside.vue`, find the import block and add:

```typescript
import Scheduler from "./Scheduler.vue"
```

Find `<Lan v-if="ttsStore.page.asideIndex == '5'"/>` and add after it:

```html
    <Scheduler v-if="ttsStore.page.asideIndex == '4'"/>
```

Also remove or comment out the existing `<Common v-if="ttsStore.page.asideIndex == '4'"/>` line since index 4 is now Scheduler. The `Common` and `Lan` components at indexes 4 and 5 are unused in the current UI — leave them as dead code rather than deleting.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/fusong/ClaudeCode/notelite && npx tsc --noEmit 2>&1 | grep -E "Aside|Bside" | head -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/aside/Aside.vue src/components/aside/Bside.vue
git commit -m "feat: add Scheduler to sidebar navigation (index 4)"
```

---

### Task 9: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
cd /Users/fusong/ClaudeCode/notelite && npm run dev
```

- [ ] **Step 2: Verify sidebar icon appears**

Click the Timer icon (4th icon) in the left sidebar. The right panel should show "Scheduler" with an empty state message and a "+" button.

- [ ] **Step 3: Create a shell task**

1. Click "+" → TaskDialog opens
2. Enter name: "Test echo"
3. Schedule: Simple, Daily, 09:00
4. Type: Shell command, command: `echo hello`
5. Click Save → task appears in list with blue dot

- [ ] **Step 4: Run task immediately**

1. Hover over the task row → action buttons appear
2. Click ▶ (Run Now) → dot turns yellow briefly, then green
3. Click the task row → dialog opens in edit mode, log section shows last run

- [ ] **Step 5: Create a builtin task**

1. Click "+" → new dialog
2. Name: "Refresh tree", Type: Built-in, Action: Refresh Tree
3. Schedule: Simple, Daily, 09:00
4. Save → appears in list
5. Click ▶ → file tree refreshes

- [ ] **Step 6: Test cron mode**

1. Create new task, switch to Cron mode
2. Enter invalid expression `* * *` → Save button stays disabled
3. Enter valid `*/5 * * * *` → Save button enables, task saved

- [ ] **Step 7: Test delete**

1. Hover task → click ✕ → confirmation dialog appears
2. Confirm → task removed from list
