// @/store/firstStore.js
import { defineStore } from "pinia";
import EditorJS from "@editorjs/editorjs";
import {join} from "path";
import type Node from 'element-plus/es/components/tree/src/model/node'
import DFConf from "@/global/defaultConf";
import {store as defaultStore} from "@/global/initLocalStore";
import {readNotes} from "@/libs/fileHandler"
import {searchNotes, type SearchResult} from "@/libs/searchUtil"
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ipcRenderer } from 'electron';
import { getFileHistory, getFileContentAtCommit, restoreFileToCommit, isFileInGitRepo, getRepoPath, getGitStatus } from '@/libs/gitHistory';
import { ElMessage } from 'element-plus';
import { errorHandler } from '@/libs/errorHandler';
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
    const homeDir = os.homedir();
    const defaultDir = path.join(homeDir, DFConf.appName);
    const defaultNotebookPath = path.join(defaultDir, DFConf.defaultRepoPath, DFConf.defaultRepoName);
    const currentNotebookPath = store.get('currentNotebookPath') || defaultNotebookPath;
    const savedLastPath = store.get("lastPath");

    // Check if lastPath belongs to current notebook
    let validLastPath = "";
    if (savedLastPath && savedLastPath.startsWith(currentNotebookPath)) {
      // Check if file still exists
      if (fs.existsSync(savedLastPath)) {
        validLastPath = savedLastPath;
      }
    }

    return {
      notestore:{
        currentStore: store.get('currentStore') || defaultDir,
      },
      notebook:{
        currentPath: currentNotebookPath,
        current: store.get('currentNotebook') || DFConf.defaultRepoName,
        bookType: store.get('currentNotebookType') || 'local'
      },
      cnote:{ // current note which in editor
        title: validLastPath ? store.get("title") : "",
        lastPath: validLastPath,
        destTitle: validLastPath ? store.get("title") : "",
        titleVisable:true,
      },
      inputs: {
        noteTitle:"Title",
        notePath:store.get("lastPath"),
        noteValue: "",
        itemData:<Tree>{}
      },
      treeMenu:{
        data:readNotes(store.get('currentNotebookPath') || defaultNotebookPath, store.get('pinnedNotes') || []),
        node:<Node>{},
        treeData:<Tree>{},
        currentNode:<any>{},
        expandedKeys:null,
        newFolderName:DFConf.newFolderName,
      },
      favorites: {
        pinned: store.get('pinnedNotes') || [],
        starred: store.get('starredNotes') || [],
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
        savePath: store.get("savePath") || defaultDir,
      //  store.set("defaultStorePath",this.notestore.currentStore);
        defaultNotePath: store.get("defaultNotePath") || defaultNotebookPath,
        drawer:false,
        githubEnable:false,
        githubRepoName:store.get("GithubRepoName") || "",
        githubUsername:store.get("GithubUsername") || "",
        githubToken:store.get("GithubToken") || "",
        formConfigJson: store.get("FormConfig"),
        updateNotification: store.get("updateNotification"),
        language: store.get("language") || 'en_US',
      },
      settings: {
        currentStore: store.get('currentStore') || defaultDir,
        currentbook:store.get('currentNoteBookObj'),
        needUpdateTree:false,
     //   defaultNoteInit:store.get("defaultNoteInit")? true:false,
        savePath: store.get("savePath") || defaultDir,
      //  store.set("defaultStorePath",this.notestore.currentStore);
        defaultNotePath: store.get("defaultNotePath") || defaultNotebookPath,
        drawer:false,
        githubEnable:false,
        githubRepoName:store.get("GithubRepoName"),
        githubUsername:store.get("GithubUsername"),
        githubToken:store.get("GithubToken"),
        formConfigJson: store.get("FormConfig"),
        updateNotification: store.get("updateNotification"),
      },
      search: {
        query: "",
        results: <SearchResult[]>[],
        isSearching: false,
        showResults: false,
      },
      history: {
        showDrawer: false,
        commits: [] as any[],
        selectedCommit: null as any,
        isLoading: false,
        previewData: null as any,
        isInGitRepo: false,
      },
      rawJsonEditor: {
        showDialog: false,
      },
      gitStatus: {
        hasUncommitted: false,
        hasUnpushed: false,
        ahead: 0,
        behind: 0,
        filesChanged: 0,
        isChecking: false,
        checkTimeout: null as any,
      },
      pushStatus: {
        message: '',
        type: '' as 'loading' | 'success' | 'error' | '',
        timeout: null as any,
      },
      saveStatus: {
        status: 'idle' as 'idle' | 'saving' | 'saved' | 'error',
        message: '',
        timeout: null as any,
      },
      autoSave: {
        enabled: true,
        interval: 30000, // 30 seconds
        timer: null as any,
        hasUnsavedChanges: false,
      },
      treeRefresh: {
        timeout: null as any,
        debounceMs: 500, // 500ms debounce for tree refresh
      },
      helpDialog: {
        show: false,
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
      store.set('currentNoteBookObj',this.settings.currentbook)
    },
    setLocalNotePath() {
     // store.set("savePath", this.config.savePath);
      store.set("GithubRepoName", this.config.githubRepoName);
      store.set("GithubUsername", this.config.githubUsername);
      store.set("GithubToken", this.config.githubToken);
      this.setSavePath()
    },
    updateSettings(){
      store.set("currentStore",this.notestore.currentStore);
      store.set("currentNotebookPath",this.notebook.currentPath)
      store.set("defaultNotePath",this.settings.defaultNotePath)

      store.set("GithubRepoName", this.config.githubRepoName?this.config.githubRepoName:"");
      store.set("GithubUsername", this.config.githubUsername?this.config.githubUsername:"");
      store.set("GithubToken", this.config.githubToken?this.config.githubToken:"");

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
    async performFullTextSearch(query: string) {
      if (!query || query.trim().length === 0) {
        this.search.results = [];
        this.search.showResults = false;
        return;
      }

      this.search.isSearching = true;
      this.search.query = query;

      try {
        const results = searchNotes(this.notebook.currentPath, query);
        this.search.results = results;
        this.search.showResults = true;
      } catch (error) {
        console.error('Search error:', error);
        this.search.results = [];
      } finally {
        this.search.isSearching = false;
      }
    },
    clearSearch() {
      this.search.query = "";
      this.search.results = [];
      this.search.showResults = false;
    },
    togglePin(path: string) {
      const index = this.favorites.pinned.indexOf(path);
      if (index > -1) {
        this.favorites.pinned.splice(index, 1);
      } else {
        this.favorites.pinned.push(path);
      }
      store.set('pinnedNotes', this.favorites.pinned);
      // Use debounced refresh instead of immediate refresh
      this.scheduleTreeRefresh();
    },
    toggleStar(path: string) {
      const index = this.favorites.starred.indexOf(path);
      if (index > -1) {
        this.favorites.starred.splice(index, 1);
      } else {
        this.favorites.starred.push(path);
      }
      store.set('starredNotes', this.favorites.starred);
    },
    isPinned(path: string): boolean {
      return this.favorites.pinned.includes(path);
    },
    isStarred(path: string): boolean {
      return this.favorites.starred.includes(path);
    },
    refreshTreeData() {
      console.log('Refreshing tree data for path:', this.notebook.currentPath);
      const newData = readNotes(this.notebook.currentPath, this.favorites.pinned);
      // Create new array reference to ensure Vue reactivity detection
      this.treeMenu.data = [...newData];
      console.log('Tree data refreshed, items count:', this.treeMenu.data.length);
    },

    // Debounced tree refresh to avoid excessive file scanning
    scheduleTreeRefresh() {
      // Clear existing timeout
      if (this.treeRefresh.timeout) {
        clearTimeout(this.treeRefresh.timeout);
      }

      // Schedule refresh after debounce period
      this.treeRefresh.timeout = setTimeout(() => {
        console.log('Refreshing tree data (debounced)...');
        this.refreshTreeData();
      }, this.treeRefresh.debounceMs);
    },
    setLanguage(language: string) {
      this.config.language = language;
      store.set('language', language);
      // Update error handler language
      errorHandler.setLanguage(language);
    },

    // Open history viewer for current note
    async openHistoryViewer() {
      const filePath = this.cnote.lastPath;

      if (!filePath) {
        ElMessage({
          type: 'warning',
          message: 'No file is currently open',
        });
        return;
      }

      this.history.showDrawer = true;
      this.history.isLoading = true;
      this.history.commits = [];

      // Check if file is in git repo
      this.history.isInGitRepo = isFileInGitRepo(filePath);

      if (!this.history.isInGitRepo) {
        this.history.isLoading = false;
        return;
      }

      // Load commit history
      await this.loadCommitHistory(filePath);
    },

    // Load commit history for file
    async loadCommitHistory(filePath: string) {
      try {
        const repoPath = getRepoPath(filePath);
        if (!repoPath) {
          this.history.isInGitRepo = false;
          return;
        }

        const commits = await getFileHistory(filePath, repoPath, 50);
        this.history.commits = commits;
      } catch (error) {
        console.error('Failed to load commit history:', error);
        ElMessage({
          type: 'error',
          message: 'Failed to load history',
        });
      } finally {
        this.history.isLoading = false;
      }
    },

    // Preview a specific commit
    async previewCommit(commit: any) {
      const filePath = this.cnote.lastPath;
      const repoPath = getRepoPath(filePath);

      if (!repoPath) {
        console.error('No repo path found');
        throw new Error('Repository path not found');
      }

      console.log('Previewing commit:', commit.hash, 'for file:', filePath);

      try {
        const content = await getFileContentAtCommit(filePath, repoPath, commit.hash);
        console.log('Got content:', content !== null ? `length: ${content.length}` : 'null');

        if (content !== null) {
          // Handle empty file
          if (content.length === 0 || content.trim().length === 0) {
            console.log('File is empty in this commit');
            this.history.previewData = {
              time: Date.now(),
              blocks: [],
              version: "2.26.5"
            };
            this.history.selectedCommit = commit;
          } else {
            const parsed = JSON.parse(content);
            console.log('Parsed data:', parsed);
            this.history.previewData = parsed;
            this.history.selectedCommit = commit;
          }
        } else {
          console.error('No content returned from git - file may not exist in this commit');
          throw new Error('File does not exist in this commit');
        }
      } catch (error: any) {
        console.error('Failed to preview commit:', error);
        if (error.message === 'File does not exist in this commit') {
          ElMessage({
            type: 'warning',
            message: 'This file does not exist in the selected commit',
          });
        } else if (error instanceof SyntaxError) {
          ElMessage({
            type: 'error',
            message: 'Failed to parse file content (invalid JSON)',
          });
        }
        throw error;
      }
    },

    // Restore file to commit version
    async restoreToCommit(commit: any) {
      const filePath = this.cnote.lastPath;
      const repoPath = getRepoPath(filePath);

      if (!repoPath) return;

      try {
        const success = await restoreFileToCommit(filePath, repoPath, commit.hash);

        if (success) {
          // Reload note content
          const content = fs.readFileSync(filePath, 'utf-8');
          this.editerData = JSON.parse(content);

          // Update editor
          if (this.editorInstance) {
            await this.editorInstance.render(this.editerData);
          }

          return true;
        }

        return false;
      } catch (error) {
        console.error('Failed to restore commit:', error);
        throw error;
      }
    },

    // Close history viewer
    closeHistoryViewer() {
      this.history.showDrawer = false;
      this.history.commits = [];
      this.history.selectedCommit = null;
      this.history.previewData = null;
    },

    // Open raw JSON editor
    openRawJsonEditor() {
      const filePath = this.cnote.lastPath;

      if (!filePath) {
        ElMessage({
          type: 'warning',
          message: 'No file is currently open',
        });
        return;
      }

      this.rawJsonEditor.showDialog = true;
    },

    // Check Git status for current notebook
    async checkGitStatus() {
      const currentPath = this.notebook.currentPath;

      if (!currentPath) {
        return;
      }

      const repoPath = getRepoPath(currentPath);

      if (!repoPath) {
        return;
      }

      this.gitStatus.isChecking = true;

      try {
        const status = await getGitStatus(repoPath);
        this.gitStatus.hasUncommitted = status.hasUncommitted;
        this.gitStatus.hasUnpushed = status.hasUnpushed;
        this.gitStatus.ahead = status.ahead;
        this.gitStatus.behind = status.behind;
        this.gitStatus.filesChanged = status.filesChanged;
      } catch (error) {
        console.error('Failed to check git status:', error);
      } finally {
        this.gitStatus.isChecking = false;
      }
    },

    // Debounced Git status check
    scheduleGitStatusCheck() {
      // Clear existing timeout
      if (this.gitStatus.checkTimeout) {
        clearTimeout(this.gitStatus.checkTimeout);
      }

      // Schedule check after 1 second of inactivity
      this.gitStatus.checkTimeout = setTimeout(() => {
        this.checkGitStatus();
      }, 1000);
    },

    // Start Git status check (called on mount)
    startGitStatusCheck() {
      // Check immediately
      this.checkGitStatus();
    },

    // Set push status message
    setPushStatus(message: string, type: 'loading' | 'success' | 'error') {
      // Clear existing timeout
      if (this.pushStatus.timeout) {
        clearTimeout(this.pushStatus.timeout);
      }

      this.pushStatus.message = message;
      this.pushStatus.type = type;

      // Auto-clear after 3 seconds for success/error
      if (type === 'success' || type === 'error') {
        this.pushStatus.timeout = setTimeout(() => {
          this.pushStatus.message = '';
          this.pushStatus.type = '';
        }, 3000);
      }
    },

    // Clear push status
    clearPushStatus() {
      if (this.pushStatus.timeout) {
        clearTimeout(this.pushStatus.timeout);
      }
      this.pushStatus.message = '';
      this.pushStatus.type = '';
    },

    // Set save status
    setSaveStatus(status: 'idle' | 'saving' | 'saved' | 'error', message: string = '') {
      // Clear existing timeout
      if (this.saveStatus.timeout) {
        clearTimeout(this.saveStatus.timeout);
      }

      this.saveStatus.status = status;
      this.saveStatus.message = message;

      // Auto-clear after 3 seconds for saved/error
      if (status === 'saved' || status === 'error') {
        this.saveStatus.timeout = setTimeout(() => {
          this.saveStatus.status = 'idle';
          this.saveStatus.message = '';
        }, 3000);
      }

      // Clear unsaved changes flag on successful save
      if (status === 'saved') {
        this.autoSave.hasUnsavedChanges = false;
      }
    },

    // Mark content as changed (needs save)
    markContentChanged() {
      this.autoSave.hasUnsavedChanges = true;
    },

    // Start auto-save timer
    startAutoSave() {
      if (this.autoSave.timer) {
        clearInterval(this.autoSave.timer);
      }

      if (this.autoSave.enabled) {
        this.autoSave.timer = setInterval(() => {
          if (this.autoSave.hasUnsavedChanges && this.cnote.lastPath) {
            console.log('Auto-saving...');
            // Trigger save through editor
            const saveEvent = new CustomEvent('auto-save');
            window.dispatchEvent(saveEvent);
          }
        }, this.autoSave.interval);
      }
    },

    // Stop auto-save timer
    stopAutoSave() {
      if (this.autoSave.timer) {
        clearInterval(this.autoSave.timer);
        this.autoSave.timer = null;
      }
    },

    // Open help dialog
    openHelpDialog() {
      this.helpDialog.show = true;
    },

    // Close help dialog
    closeHelpDialog() {
      this.helpDialog.show = false;
    },

    // Expand tree to show a specific path
    expandTreeToPath(targetPath: string) {
      const path = require('path');
      const notebookPath = this.notebook.currentPath;

      // Get all parent paths from notebook root to target
      const expandKeys: string[] = [];
      let currentPath = targetPath;

      while (currentPath && currentPath !== notebookPath && currentPath.startsWith(notebookPath)) {
        expandKeys.push(currentPath);
        currentPath = path.dirname(currentPath);
      }

      // Add notebook root
      if (notebookPath) {
        expandKeys.push(notebookPath);
      }

      // Update expanded keys
      this.treeMenu.expandedKeys = expandKeys;

      console.log('Expanding tree to path:', targetPath, 'Keys:', expandKeys);
    },
  },
});