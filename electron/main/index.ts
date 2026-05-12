import { app, BrowserWindow, shell, ipcMain, dialog, Notification } from "electron";
import { release } from "os";
import { join } from "path";
import { execSync, execSync as _execSync, spawn, ChildProcess } from "child_process";
import { readFileSync, readdirSync, appendFileSync, mkdirSync } from "fs";

import logger from "../utils/log";
import os from 'os';
const pty = require('node-pty');

import { initScheduler, schedulerHandleList, schedulerHandleSave, schedulerHandleDeleteAndNotify, schedulerHandleRunNow } from './scheduler'

// Detect if git is available
function detectGit(): boolean {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const gitAvailable = detectGit();

// Initialize electron-store for window state
const ElectronStore = require("electron-store");
const windowStateStore = new ElectronStore({ name: "window-state" });
ElectronStore.initRenderer();

// Disable GPU Acceleration for Windows 7
//if (release().startsWith("6.1")) app.disableHardwareAcceleration();
app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

export const ROOT_PATH = {
  // /dist
  dist: join(__dirname, "../.."),
  // /dist or /public
  public: join(__dirname, app.isPackaged ? "../.." : "../../../public"),
};

let win: BrowserWindow | null = null;
let ptyProcess: any = null;
// Here, you can also use other preload
const preload = join(__dirname, "../preload/index.js");
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin
const url = `http://${process.env["VITE_DEV_SERVER_HOST"]}:${process.env["VITE_DEV_SERVER_PORT"]}`;
const indexHtml = join(ROOT_PATH.dist, "index.html");

// Default window state
const defaultWindowState = {
  width: 1200,
  height: 800,
  x: undefined as number | undefined,
  y: undefined as number | undefined,
  isMaximized: false,
};

// Get saved window state
function getWindowState() {
  return {
    width: windowStateStore.get("width", defaultWindowState.width) as number,
    height: windowStateStore.get("height", defaultWindowState.height) as number,
    x: windowStateStore.get("x", defaultWindowState.x) as number | undefined,
    y: windowStateStore.get("y", defaultWindowState.y) as number | undefined,
    isMaximized: windowStateStore.get("isMaximized", defaultWindowState.isMaximized) as boolean,
  };
}

// Save window state
function saveWindowState() {
  if (!win) return;

  const bounds = win.getBounds();
  windowStateStore.set("width", bounds.width);
  windowStateStore.set("height", bounds.height);
  windowStateStore.set("x", bounds.x);
  windowStateStore.set("y", bounds.y);
  windowStateStore.set("isMaximized", win.isMaximized());
}

async function createWindow() {
  const windowState = getWindowState();

  win = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 900,
    minHeight: 600,

    title: "Main window",
    icon: join(ROOT_PATH.public, "favicon.ico"),
    // useContentSize: true,
    frame: false,
    // maximizable: false,
    // minimizable: false,
    // fullscreenable: false,
    transparent: true,
    hasShadow: false,
    // resizable: false,
    webPreferences: {
      preload,
      webSecurity: false,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://electronjs.org/docs/latest/tutorial/contextIsolation
      nodeIntegration: true,
      contextIsolation: false,

    },
  });

  // Restore maximized state
  if (windowState.isMaximized) {
    win.maximize();
  }

  // Save window state on close
  win.on("close", () => {
    saveWindowState();
  });

  app.commandLine.appendSwitch("disable-features", "OutOfBlinkCors");
  if (app.isPackaged) {
    win.loadFile(indexHtml);
  } else {
    win.loadURL(url);
    win.webContents.openDevTools();
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
    win?.webContents.send("git-available", gitAvailable);
    if (win) initScheduler(win);
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(createWindow);

app.on("before-quit", () => {
  if (ptyProcess) {
    try { ptyProcess.kill(); } catch (_) {}
    ptyProcess = null;
  }
});

app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

ipcMain.on("min", (e) => win.minimize());
ipcMain.on("window-maximize", function () {
  if (win.isFullScreen()) {
    win.setFullScreen(false);
  } else if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});
ipcMain.on("close", (e) => win.close());
ipcMain.on("reload", (e) => win.reload());

// new window example arg: new windows url
ipcMain.handle("open-win", (event, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
    },
  });

  if (app.isPackaged) {
    childWindow.loadFile(indexHtml, { hash: arg });
  } else {
    childWindow.loadURL(`${url}/#${arg}`);
    childWindow.webContents.openDevTools({ mode: "undocked", activate: true });
  }
});

ipcMain.on("log.info", async (event, arg) => {
  logger.info(arg);
});
ipcMain.on("log.error", async (event, arg) => {
  logger.error(arg);
});

ipcMain.on("openLogs", async (event, arg) => {
  shell.openPath(logger.logger.transports.file.getFile().path);
});
ipcMain.on("openLogFolder", async (event, arg) => {
  shell.openPath(logger.logFolder);
});
ipcMain.on("showItemInFolder", async (event, arg) => {
  shell.showItemInFolder(arg);
});
ipcMain.on("openDevTools", async (event, arg) => {
  if (win.webContents.isDevToolsOpened()) {
    win.webContents.closeDevTools();
  } else {
    win.webContents.openDevTools({ mode: "undocked", activate: true });
  }
});

ipcMain.handle('get-git-available', () => gitAvailable);

ipcMain.on('open-dialog', (event) => {
  dialog.showOpenDialog({
    properties: ['openDirectory']
  }).then(result => {
    if (!result.canceled) {
      event.sender.send('selected-directory', result.filePaths);
    }
  });
});

// 文件/目录选择对话框（返回路径，供配置面板使用）
ipcMain.handle('dialog:openFile', async (_event, options: any = {}) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    ...options,
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:openDirectory', async (_event, options: any = {}) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    ...options,
  })
  return result.canceled ? null : result.filePaths[0]
})

// Terminal IPC handlers
ipcMain.on('terminal-open', (event, cwd: string) => {
  // Kill existing PTY if any
  if (ptyProcess) {
    try { ptyProcess.kill(); } catch (_) {}
    ptyProcess = null;
  }

  const isWindows = process.platform === 'win32';
  const shell = isWindows
    ? 'powershell.exe'
    : (process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash'));
  const shellArgs = isWindows ? [] : ['-l'];
  const validCwd = cwd && require('fs').existsSync(cwd) ? cwd : os.homedir();

  // Augment PATH with common locations missing in Electron's env (Unix only)
  let env: NodeJS.ProcessEnv;
  if (isWindows) {
    env = { ...process.env };
  } else {
    const extraPaths = [
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/usr/local/bin',
      '/usr/local/sbin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin',
    ].join(':');
    env = {
      ...process.env,
      PATH: `${extraPaths}:${process.env.PATH || ''}`,
      TERM: 'xterm-256color',
    };
  }

  ptyProcess = pty.spawn(shell, shellArgs, {
    name: isWindows ? 'windows-terminal' : 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: validCwd,
    env,
  });

  ptyProcess.onData((data: string) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('terminal-output', data);
    }
  });

  ptyProcess.onExit(() => {
    ptyProcess = null;
    if (win && !win.isDestroyed()) {
      win.webContents.send('terminal-exited');
    }
  });
});

ipcMain.on('terminal-input', (_event, data: string) => {
  if (ptyProcess) {
    ptyProcess.write(data);
  }
});

ipcMain.on('terminal-resize', (_event, cols: number, rows: number) => {
  if (ptyProcess) {
    ptyProcess.resize(cols, rows);
  }
});

// 文章改编：后台静默执行 monitor.py，输出通过 IPC 流式传回面板
let articleRewriteProc: ChildProcess | null = null

ipcMain.on('article-rewrite-run', (_event, command: string) => {
  // 杀掉上一个还在跑的任务
  if (articleRewriteProc) {
    try { articleRewriteProc.kill('SIGTERM') } catch (_) {}
    articleRewriteProc = null
  }

  const home = os.homedir()
  const extraPaths = [
    `${home}/miniconda3/bin`,
    `${home}/.bun/bin`,
    `${home}/.opencode/bin`,
    `${home}/.nvm/versions/node/v23.11.0/bin`,
    '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'
  ].join(':')

  const env = {
    ...process.env,
    PATH: `${extraPaths}:${process.env.PATH || ''}`,
    HOME: os.homedir(),
  }

  // 日志文件路径
  const logDir = join(app.getPath('userData'), 'article-rewrite-logs')
  try { mkdirSync(logDir, { recursive: true }) } catch (_) {}
  const logFile = join(logDir, `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.log`)
  const writeLog = (text: string) => {
    try { appendFileSync(logFile, text) } catch (_) {}
  }
  writeLog(`[${new Date().toLocaleString()}] Command: ${command}\n\n`)

  // 用 shell 执行，支持完整的命令字符串
  // cwd 设为 monitor.py 所在目录，让 mc 能找到正确的 skill 上下文
  const monitorMatch = command.match(/["']?(\S+monitor\.py)["']?/)
  const monitorDir = monitorMatch ? require('path').dirname(monitorMatch[1]) : os.homedir()
  const proc = spawn('/bin/zsh', ['-c', command], {
    cwd: monitorDir,
    env,
  })
  articleRewriteProc = proc

  proc.stdout.on('data', (data: Buffer) => {
    const text = data.toString()
    writeLog(text)
    if (win && !win.isDestroyed()) {
      win.webContents.send('article-rewrite-output', text)
    }
  })

  proc.stderr.on('data', (data: Buffer) => {
    const text = data.toString()
    writeLog(text)
    if (win && !win.isDestroyed()) {
      win.webContents.send('article-rewrite-output', text)
    }
  })

  proc.on('close', (code: number | null) => {
    articleRewriteProc = null
    const exitCode = code ?? 1
    writeLog(`\n[exit ${exitCode}]\n`)
    // 系统通知
    if (Notification.isSupported()) {
      new Notification({
        title: exitCode === 0 ? '✅ 任务完成' : '❌ 任务失败',
        body: exitCode === 0 ? '文章处理完成，可查看结果' : `任务异常退出（exit ${exitCode}）`,
        silent: false,
      }).show()
    }
    if (win && !win.isDestroyed()) {
      win.webContents.send('article-rewrite-done', exitCode)
    }
  })

  proc.on('error', (err: Error) => {
    articleRewriteProc = null
    writeLog(`\n[error] ${err.message}\n`)
    if (Notification.isSupported()) {
      new Notification({ title: '❌ 任务失败', body: err.message }).show()
    }
    if (win && !win.isDestroyed()) {
      win.webContents.send('article-rewrite-output', `Error: ${err.message}\n`)
      win.webContents.send('article-rewrite-done', 1)
    }
  })
})

// 停止文章改编
ipcMain.handle('article-rewrite:log-dir', () => {
  return join(app.getPath('userData'), 'article-rewrite-logs')
})

ipcMain.handle('article-rewrite:is-running', () => {
  return articleRewriteProc !== null
})

ipcMain.on('article-rewrite-stop', () => {
  if (articleRewriteProc) {
    try { articleRewriteProc.kill('SIGTERM') } catch (_) {}
    articleRewriteProc = null
    if (win && !win.isDestroyed()) {
      win.webContents.send('article-rewrite-done', -1)
    }
  }
})

// Git diff IPC handler
ipcMain.handle('git:diff', async (_event, { repoPath, hashA, hashB, filePath }: {
  repoPath: string, hashA: string, hashB: string | null, filePath: string
}) => {
  try {
    const rel = filePath.startsWith(repoPath) ? filePath.slice(repoPath.length + 1) : filePath
    // hashB null 表示与工作区当前文件对比
    const cmd = hashB
      ? `git diff ${hashA} ${hashB} -- "${rel}"`
      : `git diff ${hashA} -- "${rel}"`
    const result = execSync(cmd, { cwd: repoPath, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
    return { diff: result }
  } catch (e: any) {
    return { diff: e.stdout || '', error: e.message }
  }
})

// Scheduler IPC handlers
ipcMain.handle('scheduler:list', () => schedulerHandleList())
ipcMain.handle('scheduler:save', async (_event, task) => schedulerHandleSave(task))
ipcMain.handle('scheduler:delete', async (_event, { id }) => schedulerHandleDeleteAndNotify(id))
ipcMain.handle('scheduler:run-now', (_event, { id }) => schedulerHandleRunNow(id))

// External tasks IPC handlers
ipcMain.handle('external-tasks:list', async () => {
  const launchAgentsDir = join(os.homedir(), 'Library', 'LaunchAgents')
  const result: any[] = []
  let plistFiles: string[] = []
  try {
    plistFiles = readdirSync(launchAgentsDir).filter(f => f.endsWith('.plist'))
  } catch { return [] }

  // 解析 launchctl list 获取运行状态
  let launchctlOutput = ''
  try {
    launchctlOutput = _execSync('launchctl list', { encoding: 'utf-8', timeout: 5000 })
  } catch {}
  const runningMap: Record<string, { pid?: number; lastExitCode?: number }> = {}
  for (const line of launchctlOutput.split('\n').slice(1)) {
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 3) {
      const label = parts[2]
      const pid = parts[0] !== '-' ? parseInt(parts[0]) : undefined
      const exitCode = parts[1] !== '-' ? parseInt(parts[1]) : undefined
      runningMap[label] = { pid, lastExitCode: exitCode }
    }
  }

  for (const file of plistFiles) {
    const label = file.replace('.plist', '')
    // 只显示非 com.yesnote.* 的外部任务
    if (label.startsWith('com.yesnote.')) continue
    try {
      const plistPath = join(launchAgentsDir, file)
      const content = readFileSync(plistPath, 'utf-8')
      // 简单解析 plist XML
      const labelMatch = content.match(/<key>Label<\/key>\s*<string>([^<]+)<\/string>/)
      const intervalMatch = content.match(/<key>StartInterval<\/key>\s*<integer>(\d+)<\/integer>/)
      const logMatch = content.match(/<key>StandardOutPath<\/key>\s*<string>([^<]+)<\/string>/)
      const argsMatch = [...content.matchAll(/<string>([^<]+)<\/string>/g)]
        .map(m => m[1])
        .filter(s => !s.includes('<') && s.length < 200)
      const parsedLabel = labelMatch?.[1] || label
      const interval = intervalMatch ? parseInt(intervalMatch[1]) : undefined
      const logPath = logMatch?.[1]
      const command = argsMatch.slice(0, 3).join(' ')
      const status = runningMap[parsedLabel]
      result.push({
        label: parsedLabel,
        plistPath,
        command,
        interval,
        logPath,
        isRunning: status?.pid != null,
        pid: status?.pid,
        lastExitCode: status?.lastExitCode,
      })
    } catch {}
  }
  return result
})

ipcMain.handle('external-tasks:start', async (_event, label: string) => {
  try {
    _execSync(`launchctl start ${label}`, { timeout: 5000 })
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('external-tasks:stop', async (_event, label: string) => {
  try {
    _execSync(`launchctl stop ${label}`, { timeout: 5000 })
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
})
