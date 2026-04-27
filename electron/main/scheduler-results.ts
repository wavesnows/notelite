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
