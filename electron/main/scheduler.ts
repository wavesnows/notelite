import { BrowserWindow, Notification, app, ipcMain } from 'electron'
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
    mainWin.webContents.send('scheduler:builtin-action', action)
    const handler = (_: any, result: { output: string; error?: string }) => {
      clearTimeout(timeout)
      resolve(result)
    }
    const timeout = setTimeout(() => {
      ipcMain.removeListener(`scheduler:builtin-result:${action}`, handler)
      resolve({ output: '', error: 'Builtin action timeout' })
    }, 30000)
    ipcMain.once(`scheduler:builtin-result:${action}`, handler)
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
