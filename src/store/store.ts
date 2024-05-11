// @/store/firstStore.js
import { defineStore } from "pinia";
import EditorJS from "@editorjs/editorjs";
import {join} from "path";
import type Node from 'element-plus/es/components/tree/src/model/node'
import DFConf from "@/global/defaultConf";
import {store as defaultStore} from "@/global/initLocalStore";
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


/*一个数据是存储在本地的数据，
  配置的数据一部分是存储在本地的，另外也会有一些是构造出来的
  每个根文件夹是一个notestore
  每个store里面可能会有多个notebook，其中有个notebook是默认的notebook是default

*/

export const useTtsStore = defineStore(DFConf.appName, {
  // 定义state，用来存储状态的
  state: () => {
    return {
      currentbook:store.get('currentNoteBookObj'),
      notestore:{
        currentStore:store.get('currentStore'),
      },
      notebook:{
        currentPath:store.get('currentNotebookPath'),
        current:store.get('currentNotebook'),
        bookType:store.get('currentNotebookType')
      },
      cnote:{ // current note which in editor
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
        newFolderName:DFConf.newFolderName,
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
     //   defaultNoteInit:store.get("defaultNoteInit")? true:false,
        savePath: store.get("savePath"),
      //  store.set("defaultStorePath",this.notestore.currentStore);
        defaultNotePath: store.get("defaultNotePath"),
        drawer:false,
        githubEnable:false,
        githubRepoName:store.get("GithubRepoName"),
        githubUsername:store.get("GithubUsername"),
        githubToken:store.get("GithubToken"),
        formConfigJson: store.get("FormConfig"),
        updateNotification: store.get("updateNotification"),
      },
      settings: {
        currentStore:store.get('currentStore'),
        needUpdateTree:false,
     //   defaultNoteInit:store.get("defaultNoteInit")? true:false,
        savePath: store.get("savePath"),
      //  store.set("defaultStorePath",this.notestore.currentStore);
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
    setLastEditNote(){
      store.set("lastPath", this.cnote.lastPath);
      store.set("title", this.cnote.title);
      store.set('editerData', this.editerData);
    },
    setSavePath() {
      store.set("savePath", this.config.savePath);
      store.set("defaultStorePath",this.notestore.currentStore);
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
    updateConfig(){
      store.set("currentStore",this.notestore.currentStore);
      store.set("currentNotebookPath",this.notebook.currentPath)

      console.log("confirm log + "+ this.config.githubRepoName)
      store.set("GithubRepoName", this.config.githubRepoName);

      
      store.set("GithubUsername", this.config.githubUsername);
      store.set("GithubToken", this.config.githubToken);

     // this.setLocalNotePath();
     // this.setSavePath();
   
    },

    initDefaultNotePath(){
      this.setSavePath();
      this.config.defaultNotePath = join(this.config.savePath, DFConf.defaultRepoPath, DFConf.defaultRepoName)
      store.set("defaultNotePath", this.config.defaultNotePath);
    },
    updateNotificationChange() {
      store.set("updateNotification", this.config.updateNotification);
    },
    getValueFormStore(key:string){
      return store.get(key);
    },
    showItemInFolder(filePath: string) {
      ipcRenderer.send("showItemInFolder", filePath);
    },
  },
});