import defaultConf from './defaultConf'
import {initDefaultNotebook} from "@/libs/noteUtil"
import path from 'path';
import os from 'os';

const Store = require('electron-store');
export const store = new Store();
const homeDir = os.homedir();
const defaultDir = path.join(homeDir, defaultConf.appName);

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

  // Initialize currentStore (same as savePath)
  if (!store.has("currentStore")) {
    store.set("currentStore", defaultDir);
  }

  // Initialize default notebook path
  const defaultNotebookPath = path.join(defaultDir, defaultConf.defaultRepoPath, defaultConf.defaultRepoName);
  if (!store.has("currentNotebookPath")) {
    store.set("currentNotebookPath", defaultNotebookPath);
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
}



