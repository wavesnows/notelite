import defaultConf from './defaultConf'
import {initDefaultNotebook} from "@/libs/noteUtil"

const Store = require("electron-store");
const path = require('path')
export const store = new Store();
const homeDir = require("os").homedir();
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
  store.set("savePath", defaultDir);
  if (!store.has("savePath")) {
    store.set("savePath", defaultDir);
  }
  if (!store.has("audition")) {
    store.set(
      "audition",
      "如果你觉得这个项目还不错， 欢迎Star、Fork和PR。你的Star是对作者最好的鼓励。"
    );
  }
}



