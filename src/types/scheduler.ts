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
  systemJobId?: string  // set when shell task is installed in OS scheduler
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
