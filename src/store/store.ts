// @/store/firstStore.js
import { defineStore } from "pinia";
import EditorJS from "@editorjs/editorjs";
import {join} from "path";
import type Node from 'element-plus/es/components/tree/src/model/node'
import noteConf from "@/global/defaultConf";
import {store as defaultStore} from "@/global/initLocalStore";
import defaultConf from "@/global/defaultConf";
import {readNotes} from "@/libs/fileHandler"

const fs = require("fs");
const os = require("os")
const path = require("path");
const Store = require("electron-store");
const { ipcRenderer } = require("electron");
export interface Tree {
  label: string
  isLeaf:boolean
  isFolder:boolean
  path?: any
  children?: Tree[]
  }

export var editorInstance:EditorJS

const store = defaultStore

/*

if(store.get("savePath") == ""){
  const homedir = os.homedir();
  store.set("savePath", path.join(homedir, noteConf.appName))
}
*/

// 定义并导出容器，第一个参数是容器id，必须唯一，用来将所有的容器
// 挂载到根容器上
export const useTtsStore = defineStore(noteConf.storeName, {
  // 定义state，用来存储状态的
  state: () => {
    return {
      currentbook:store.get('currentNoteBookObj'),
      notebook:{
        currentPath:store.get('currentNotebookPath'),
        current:store.get('currentNotebook'),
        bookType:store.get('currentNotebookType')
      },
      cnote:{
        title:store.get("title"),
        lastPath: store.get("lastPath"),
        destTitle:store.get("title"),
        titleVisable:true,
      },
      inputs: {
        noteTitle:"Title",
        notePath:store.get("lastPath"),
        noteValue: "",
        itemData:<Tree>{}
      },
      treeMenu:{
        data:readNotes(store.get('currentNotebookPath')),
        node:<Node>{},
        treeData:<Tree>{},
        currentNode:<any>{},
        expandedKeys:null,
        newFolderName:noteConf.newFolderName,
      },
      menu:{
        current:"",
        curentData:<Tree>{}
      },
      folderName:"",
      editerData:store.get("editerData"),
      editerflag:false,
      readOnly:false,
      editor:{

      },
      editorInstance:<EditorJS> editorInstance,
      page: {
        asideIndex: "1",
        tsideIndex:"1",
        tabIndex: "1",
      },
      config: {
        needUpdateTree:false,
        defaultNoteInit:store.get("defaultNoteInit")? true:false,
        savePath: store.get("savePath"),
        defaultNotePath: store.get("defaultNotePath"),
        drawer:false,
        githubEnable:false,
        githubRepoName:store.get("GithubRepoName"),
        githubUsername:store.get("GithubUsername"),
        githubToken:store.get("GithubToken"),
        formConfigJson: store.get("FormConfig"),
        updateNotification: store.get("updateNotification"),
      }
    };
  },
  // 定义getters，类似于computed，具有缓存功能
  getters: {},
  // 定义actions，类似于methods，用来修改state，做一些业务逻辑
  actions: {
    setLastPath(){
      store.set("lastPath", this.cnote.lastPath);
      store.set("title", this.cnote.title);
      store.set('editerData', this.editerData);
    },
    setSavePath() {
      store.set("savePath", this.config.savePath);
     // store.set("defaultNotePath",this.config.defaultNotePath);
    },
    setNoteBookConfig() {
    //  store.set("currentNotebook", this.notebook.current);
      store.set("currentNotebookType",this.notebook.bookType);
      store.set("currentNotebookPath",this.notebook.currentPath);
      store.set('currentNoteBookObj',this.currentbook)
    },
    setLocalNotePath() {
     // store.set("savePath", this.config.savePath);
      store.set("GithubRepoName", this.config.githubRepoName);
      store.set("GithubUsername", this.config.githubUsername);
      store.set("GithubToken", this.config.githubToken);
      this.setSavePath()
    },
    initDefaultNotePath(){
      this.setSavePath();
      this.config.defaultNotePath = join(this.config.savePath, defaultConf.defaultRepoPath, defaultConf.defaultRepoName)
      store.set("defaultNotePath", this.config.defaultNotePath);
    },
    updateNotificationChange() {
      store.set("updateNotification", this.config.updateNotification);
    },
    getValueFormStore(key:string){
      return store.get(key);
    },
    setInited(){
      store.set("defaultNoteInit", true)
    },
    showItemInFolder(filePath: string) {
      ipcRenderer.send("showItemInFolder", filePath);
    },
  },
});