const Store = require("electron-store");
const path = require('path')
const store = new Store();
const homeDir = require("os").homedir();
const defaultDir = path.join(homeDir,'yesnote');

export default function initNote() {
  if (!store.has("FormConfig.默认")) {
    store.set("FormConfig.默认", {
      languageSelect: "Chinese (Mandarin, Simplified)",
      voiceSelect: "zh-CN-XiaoxiaoNeural",
      voiceStyleSelect: "General",
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
  if (!store.has("autoplay")) {
    store.set("autoplay", true);
  }
}
