# System Scheduler Integration — Design

## Overview

Shell tasks (`type: 'shell'`) are handed off to the OS native scheduler (launchd on macOS, crontab on Linux). Built-in tasks (`type: 'builtin'`) continue to use node-cron inside the Electron main process. Windows falls back to node-cron for all tasks in Phase 1.

This means shell tasks run even when notelite is not open. Results are written to a JSON file by a per-task wrapper script, and notelite reads this file on startup and when the settings drawer opens.

## Data Model Changes

### `SchedulerTask` (src/types/scheduler.ts)

Add one optional field:

```typescript
systemJobId?: string  // set when a shell task is installed in the OS scheduler
                      // format: "com.notelite.{taskId}" (macOS) or "notelite-{taskId}" (Linux)
```

### `scheduler-results.json`

Location: `{app.getPath('userData')}/scheduler-results.json`

Written by wrapper scripts, read by notelite on startup and drawer open.

```json
{
  "{taskId}": {
    "lastRun": 1714000000000,
    "lastStatus": "success",
    "lastError": "",
    "exitCode": 0
  }
}
```

## Architecture

```
Save shell task
      │
      ▼
system-scheduler.ts → installJob(task)
      ├─ macOS  → write plist to ~/Library/LaunchAgents/com.notelite.{id}.plist
      │           launchctl load plist
      ├─ Linux  → crontab -l → append line → crontab -
      └─ Windows → return false (node-cron fallback)

On task execution (OS calls directly):
      │
      ▼
~/.notelite/wrappers/{taskId}.sh
  cd {workdir}
  run {command}
  write exit code + timestamp to scheduler-results.json using Electron's node binary

notelite startup / settings drawer open:
      │
      ▼
scheduler-results.ts → readResults()
merge into schedulerTasks lastRun/lastStatus/lastError
```

## New Files

### `electron/main/system-scheduler.ts`

Exports:
- `installJob(task: SchedulerTask): Promise<boolean>` — installs OS job, returns success
- `uninstallJob(task: SchedulerTask): Promise<void>` — removes OS job, silent on not-found
- `isSystemSchedulerSupported(): boolean` — returns false on Windows

Platform behavior:
- `process.platform === 'darwin'` → launchd
- `process.platform === 'linux'` → crontab
- `process.platform === 'win32'` → returns false from `installJob`, logs warning

### `electron/main/scheduler-results.ts`

Exports:
- `readResults(): Record<string, TaskRunResult>` — reads and parses scheduler-results.json, returns {} on error
- `mergeResultsIntoTasks(tasks: SchedulerTask[]): SchedulerTask[]` — overlays results onto task list

## Wrapper Script

Location: `~/.notelite/wrappers/{taskId}.sh`

Generated on task save, executable (`chmod +x`).

```bash
#!/bin/bash
# notelite-task: {taskId}
set -e
RESULTS_FILE="{absolute path to userData}/scheduler-results.json"

cd "{workdir}"
{command}
EXIT_CODE=$?

"{absolute path to Electron node binary}" -e "
const fs = require('fs');
const f = process.argv[1];
let data = {};
try { data = JSON.parse(fs.readFileSync(f, 'utf8')); } catch(_) {}
data['{taskId}'] = {
  lastRun: Date.now(),
  lastStatus: $EXIT_CODE === 0 ? 'success' : 'error',
  lastError: $EXIT_CODE !== 0 ? 'exit code $EXIT_CODE' : '',
  exitCode: $EXIT_CODE
};
fs.writeFileSync(f, JSON.stringify(data, null, 2));
" "$RESULTS_FILE"
```

Note: Uses `process.execPath` (Electron's bundled Node) for the results write, so no external Node dependency is needed.

## macOS launchd plist

Location: `~/Library/LaunchAgents/com.notelite.{taskId}.plist`

Cron expression `MM HH * * *` maps to `StartCalendarInterval`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.notelite.{taskId}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>{wrapperPath}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>{HH}</integer>
    <key>Minute</key><integer>{MM}</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>{userData}/launchd-{taskId}.log</string>
  <key>StandardErrorPath</key>
  <string>{userData}/launchd-{taskId}.log</string>
</dict>
</plist>
```

Cron → plist field mapping:
- `daily` (`MM HH * * *`) → `StartCalendarInterval` with Hour + Minute
- `weekly` (`MM HH * * W`) → `StartCalendarInterval` with Hour + Minute + Weekday
- `monthly` (`MM HH D * *`) → `StartCalendarInterval` with Hour + Minute + Day

Install: `launchctl load ~/Library/LaunchAgents/com.notelite.{taskId}.plist`
Uninstall: `launchctl unload ...` then delete plist file

## Linux crontab

Append line:
```
{cron} /bin/bash ~/.notelite/wrappers/{taskId}.sh # notelite-task:{taskId}
```

Uninstall: filter out lines matching `# notelite-task:{taskId}` and write back.

## scheduler.ts Changes

`schedulerHandleSave(task)`:
```
if task.type === 'shell' && isSystemSchedulerSupported():
  uninstallJob(task)  // remove old job if updating
  installJob(task)    // install new job
  task.systemJobId = ...
else:
  registerJob(task)   // existing node-cron path
```

`schedulerHandleDelete(id)`:
```
if task.type === 'shell' && task.systemJobId:
  uninstallJob(task)
else:
  unregisterJob(id)
```

## index.ts Changes

In `initScheduler(window)`, after loading tasks:
```typescript
const results = readResults()
tasks = mergeResultsIntoTasks(tasks)
```

Also call `mergeResultsIntoTasks` in `schedulerHandleList()` so the settings drawer always shows fresh results.

## UI Changes (AConfig.vue)

In the scheduler task list, shell tasks show a small badge:
- `⚙ System` (grey) — installed in OS scheduler
- `⚙ App` (blue) — running via node-cron (builtin or Windows fallback)

On Windows, shell task form shows an info note: "Shell tasks use in-app scheduling on Windows."

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `launchctl load` fails | Log error, set `systemJobId = undefined`, show warning in UI |
| `crontab` not available | Fall back to node-cron, show warning |
| `scheduler-results.json` corrupt | Ignore, return empty results |
| Wrapper script node binary missing | Use `/usr/bin/env node` as fallback |
| Task uninstall — job not found | Silent ignore |
| Windows platform | `installJob` returns false, node-cron used, UI note shown |

## Files Changed

| File | Change |
|------|--------|
| `src/types/scheduler.ts` | Add `systemJobId?: string` |
| `electron/main/system-scheduler.ts` | Create — platform adapters |
| `electron/main/scheduler-results.ts` | Create — read/write results.json |
| `electron/main/scheduler.ts` | Modify — branch on task type in save/delete |
| `electron/main/index.ts` | Modify — merge results on startup |
| `src/components/aside/AConfig.vue` | Modify — show system/app badge on task rows |
