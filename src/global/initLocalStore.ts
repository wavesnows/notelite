import defaultConf from './defaultConf'
import {initDefaultNotebook} from "@/libs/noteUtil"
import path from 'path';
import os from 'os';
import fs from 'fs';

const Store = require('electron-store');
export const store = new Store();
const homeDir = os.homedir();
const defaultDir = path.join(homeDir, defaultConf.appName);
const defaultNotebookPath = path.join(defaultDir, defaultConf.defaultRepoPath, defaultConf.defaultRepoName);

initDefaultNotebook(defaultDir)

export default function initStore() {
  if (!store.has("FormConfig.默认")) {
    store.set("FormConfig.默认", {
      role: "Default",
      speed: 1.0,
      pitch: 1.0,
    });
  }

  // Initialize savePath
  if (!store.has("savePath")) {
    store.set("savePath", defaultDir);
  }

  // Initialize currentStore
  if (!store.has("currentStore")) {
    store.set("currentStore", defaultDir);
  }

  // Initialize default notebook path
  if (!store.has("currentNotebookPath")) {
    store.set("currentNotebookPath", defaultNotebookPath);
  } else {
    // If stored path no longer exists, reset to default
    const stored = store.get("currentNotebookPath") as string;
    if (stored && !fs.existsSync(stored)) {
      console.warn('currentNotebookPath not found, resetting to default:', stored);
      store.set("currentNotebookPath", defaultNotebookPath);
    }
  }

  if (!store.has("defaultNotePath")) {
    store.set("defaultNotePath", defaultNotebookPath);
  }

  // Initialize notebook type
  if (!store.has("currentNotebookType")) {
    store.set("currentNotebookType", "local");
  }

  if (!store.has("audition")) {
    store.set(
      "audition",
      "如果你觉得这个项目还不错， 欢迎Star、Fork和PR。你的Star是对作者最好的鼓励。"
    );
  }

  // Initialize rootStores — filter out any undefined or non-existent entries
  const currentStore = store.get("currentStore") as string || defaultDir;
  if (!store.has("rootStores")) {
    store.set("rootStores", [currentStore]);
  } else {
    const rootStores: string[] = (store.get("rootStores") as string[] || [])
      .filter((p: string) => p && typeof p === 'string');
    if (!rootStores.includes(currentStore)) {
      rootStores.push(currentStore);
    }
    store.set("rootStores", rootStores);
  }
}



