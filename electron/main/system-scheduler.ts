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
  // In Electron, process.execPath points to Electron itself, not Node.
  const nodeBin = (() => {
    const candidates = [
      '/usr/local/bin/node',
      '/opt/homebrew/bin/node',
      '/usr/bin/node',
    ]
    for (const c of candidates) {
      try { require('fs').accessSync(c); return c; } catch (_) {}
    }
    try { return require('child_process').execSync('which node', { encoding: 'utf-8' }).trim(); } catch (_) {}
    return 'node'
  })()
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
