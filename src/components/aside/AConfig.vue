<template>
    <!--Left Panel Start-->
    <div class="button-container">
      <el-button-group>
      <el-tooltip class="box-item" :content="t('toolbar.addFolder')" placement="top-start">
        <el-button type="info" size="small" circle class="circle-btn" @click="handleCommand">
          <el-icon ><Plus /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip class="box-item" :content="t('toolbar.gitSync')" placement="top-start">
        <el-dropdown @command="handleGit" v-show="notebook.bookType != 'local'">
          <el-button type="success" size="small" circle class="circle-btn">
            <el-icon><Suitcase /></el-icon>
          </el-button>
        <template #dropdown>
        <el-dropdown-menu class="git-dropdown">
          <el-dropdown-item command="pull">
            <el-icon><Download /></el-icon>
            <span>{{ t('toolbar.pull') }}</span>
          </el-dropdown-item>
          <el-dropdown-item command="push">
            <el-icon><Upload /></el-icon>
            <span>{{ t('toolbar.push') }}</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
      </el-dropdown>
      </el-tooltip>
    <el-tooltip class="box-item" :content="t('toolbar.setting')" placement="top-start">
    <el-button
      type="info"
      size="small"
      circle
      class="circle-btn"
      @click="popHandler">
      <el-icon ><Setting /></el-icon>
    </el-button>
    </el-tooltip>
    </el-button-group>
    </div>
    <!--Left Panel End-->
    <!--Config Drawer Start-->
    <el-drawer v-model="config.drawer" direction="rtl" size="50%" :close-on-click-modal="true">
      <template #header>
        <h3>{{ t('settings.title') }}</h3>
      </template>
      <template #default>
        <el-tabs tab-position="left" style="height: 100%" class="demo-tabs">
          <el-tab-pane :label="t('settings.globalSetting')">
            <el-form  v-model="config" label-width="120px" label-position="top">

              <el-form-item :label="t('settings.languageLabel')">
                <el-select v-model="config.language" @change="changeLanguage">
                  <el-option :label="t('settings.english')" value="en_US" />
                  <el-option :label="t('settings.chinese')" value="zh_CN" />
                </el-select>
              </el-form-item>

              <el-form-item :label="t('settings.localPath')">
                <div class="form-item-content">
                  <div class="path-display">{{ notestore.currentStore }}</div>
                  <el-button class="action-button" :prefix-icon="Select" @click="openDialog">{{ t('settings.changeDefaultPath') }}</el-button>
                </div>
              </el-form-item>
              <el-form-item :label="t('settings.defaultNotebookPath')">
                <div class="form-item-content">
                  <div class="path-display">{{ settings.defaultNotePath }}</div>
                  <el-button class="action-button" :prefix-icon="Select" @click="initCommonBook">{{ t('settings.initDefaultNotebook') }}</el-button>
                </div>
              </el-form-item>
              <el-form-item :label="t('settings.currentNotebook')">
              <el-select v-model="settings.currentbook" :placeholder="t('settings.currentNotebook')" @change="saveHander" >
                <el-option-group v-for="group in options" :key="group.label" :label="group.label">
                  <el-option v-for="item in group.options" :key="item.value" :label="item.label" :value="item" />
                </el-option-group>
              </el-select>
            </el-form-item>
            <el-form-item :label="t('settings.notebookPath')">
              <div class="path-display">{{ notebook.currentPath }}</div>
            </el-form-item>
            </el-form>
           <!-- <div style="flex: auto">
              <el-button style="float: right;"  type="success" @click="initCommonBook">Initial Default Noetbook</el-button>
            </div>-->
          </el-tab-pane>
          <el-tab-pane :label="t('settings.remoteSetting')">
            <el-form :model="config" label-width="120px" label-position="top">
              <el-form-item :label="t('settings.githubUsername')">
                <el-input
                  v-model="config.githubUsername"
                  :placeholder="t('settings.githubUsernamePlaceholder')"
                  @change="saveGitHubConfig"
                />
              </el-form-item>
              <el-form-item :label="t('settings.githubToken')">
                <el-input
                  v-model="config.githubToken"
                  type="password"
                  show-password
                  :placeholder="t('settings.githubTokenPlaceholder')"
                  @change="saveGitHubConfig"
                />
              </el-form-item>
              <el-form-item :label="t('settings.githubRepoName')">
                <el-input
                  v-model="config.githubRepoName"
                  :placeholder="t('settings.githubRepoPlaceholder')"
                  @change="saveGitHubConfig"
                />
              </el-form-item>
            </el-form>
            <div class="form-actions">
              <el-button class="action-button" @click="initClick" :disabled="!isGithubConfigured">{{ t('settings.initFromGitHub') }}</el-button>
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-drawer>
    <!--Config Drawer End-->
    <!--Create Note Folder Dialog Start -->
    <el-dialog v-model="dialogFormVisible" :title="t('dialog.addRootFolder')">
    <el-form :model="ttsStore.menu">
      <el-form-item :label="t('dialog.typeFolderName')" :label-width="formLabelWidth">
        <el-input v-model="rootFolderName" autocomplete="off" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogFormVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="addRootFolder" >{{ t('common.ok') }}</el-button>
      </span>
    </template>
  </el-dialog>

 <!--Create Note Folder Dialog End -->
</template>
    
<script lang="ts" setup>
  import { ref, computed } from 'vue'
  import { ElMessageBox, ElMessage } from 'element-plus'
  import { useTtsStore, Tree } from "@/store/store";
  import { storeToRefs } from "pinia";
  import {gitHubClone, gitPull, gitHubPush} from "@/libs/github"
  import fs from 'fs'
  import {join} from "path";
  import type Node from 'element-plus/es/components/tree/src/model/node'
  import {initDefaultNotebook} from "@/libs/noteUtil"
  import { readDir, readOneDir,readNotes} from "@/libs/fileHandler"
  import { Select, Plus, Download, Upload } from "@element-plus/icons-vue";
  import defaultConf from "@/global/defaultConf";
  import { ipcRenderer } from 'electron';
  import { useI18n } from 'vue-i18n';


  const { t, locale } = useI18n();
  const formLabelWidth = '140px';
  const dialogFormVisible = ref(false)
  var rootFolderName = ref("notes")
  const ttsStore = useTtsStore();
  var {config, notebook, notestore, settings} = storeToRefs(ttsStore);

  // Check if GitHub is configured (all fields filled)
  const isGithubConfigured = computed(() => {
    return !!(config.value.githubUsername &&
              config.value.githubToken &&
              config.value.githubRepoName);
  });

  const options = computed(() => {
    // Read all notebooks from the repos directory
    const allNotebooks = readOneDir(join(ttsStore.notestore.currentStore, defaultConf.defaultRepoPath));

    // Separate local and remote notebooks based on type
    const localOptions = allNotebooks.filter(nb => nb.type === 'local');
    const remoteOptions = allNotebooks.filter(nb => nb.type === 'github');

    return [
      {
        label: t('notebook.localNoteBooks'),
        options: localOptions,
      },
      {
        label: t('notebook.remoteNoteBooks'),
        options: remoteOptions,
      },
    ];
  });

  const openDialog = () => {
    ipcRenderer.send('open-dialog');
    console.log('store::'+ttsStore.notestore.currentStore)
  };

  ipcRenderer.on('selected-directory', (event, path) => {
    console.log(path);
    config.value.savePath = path[0];
    ttsStore.notestore.currentStore = path[0];
    ttsStore.notebook.currentPath = join(path[0],defaultConf.defaultRepoPath,defaultConf.defaultRepoName)
    ttsStore.settings.defaultNotePath = join(path[0],defaultConf.defaultRepoPath,defaultConf.defaultRepoName)
    getNoteBookList(join(path[0],defaultConf.defaultRepoPath))
  });

 

  async function initClick(){
    const success = await gitHubClone(t);
    // 克隆成功后自动切换到 GitHub 笔记本
    if (success && ttsStore.config.githubRepoName) {
      const githubNotebook = {
        value: ttsStore.config.githubRepoName,
        label: ttsStore.config.githubRepoName,
        type: 'github',
      };
      saveHander(githubNotebook);
      ElMessage({
        message: t('github.switchedToRemote'),
        type: 'success',
      });
    }
  }

  function initCommonBook(){
    let str = initDefaultNotebook(ttsStore.config.savePath as string);
    ElMessage(str);
  }

  function popHandler(){
    ttsStore.config.drawer = true
  }

  function saveGitHubConfig() {
    // Save GitHub config immediately when input changes
    ttsStore.setLocalNotePath();
    ElMessage({
      message: t('settings.saveSuccess'),
      type: 'success',
    });
  }

  const handleCommand = (command: string) => {
    //ElMessage(`click on item ${command}`)
    dialogFormVisible.value = true;

  }

  const changeLanguage = (lang: string) => {
    locale.value = lang;
    ttsStore.setLanguage(lang);
    ElMessage({
      message: t('settings.languageSwitched'),
      type: 'success',
    });
  }

  /*

  const handleCommand = (command: any) => {
    ttsStore.treeMenu.treeData = command.data as Tree;
    ttsStore.treeMenu.node = command.node as Node;
    ElMessage(`click on item ${command.type}`)
    switch (command.type) {
      case 'file':
        append(command.data)
        break;
      case 'folder':
        dialogFormVisible.value = true; 
        break;
      case 'removeitem':
      ElMessageBox.confirm('Are you sure to delete this file?','Delete')
        .then(()=>{
         // removeFolder() 
         remove(command.node, command.data)
        }
        )
        .catch(() => {
      // catch error
        })
        break;
      case 'remove':
        ElMessageBox.confirm('Are you sure to Delete this Folder?','Delete')
        .then(()=>{
          removeFolder() 
        }
        )
        .catch(() => {
      // catch error
        })
        break;
      default:
        break;
    }
  }

*/


  const handleGit = async (command:string) =>{
    if(command == 'pull'){
      await gitPull(t)
      console.log("Git Pull")
    }
    else if(command == 'push'){
     // await githubPush()
      await gitHubPush(t);
      console.log("Git Push");
    }
    else{
      ElMessage("Do nothings")
    }
  }



    const addRootFolder = () =>{
        dialogFormVisible.value = false;
        let foldername  = rootFolderName.value;
        let path = join(ttsStore.notebook.currentPath, foldername)
        const newChild:Tree = {label: foldername, path: path, isFolder:true, isLeaf: true}
        if(ttsStore.treeMenu.data.length <= 5){
          try{
            fs.mkdirSync(join(ttsStore.notebook.currentPath,foldername));
            ttsStore.treeMenu.data.push(newChild)
          }
          catch(error){
            ElMessage({
            message: error as string,
            grouping: true,
            type: 'error',
          })
          }
        }
        else
        {
          ElMessage({
            message: 'We only allow 6 folders at most!',
            grouping: true,
            type: 'warning',
          })
        }

       //'success' | 'warning' | 'info' | 'error'
       // ttsStore.treeMenu.data = readNotes(ttsStore.notebook.currentPath)
 
  }

    async function saveHander(value:any){
      ttsStore.settings.currentbook = value;
      // Use notestore.currentStore which is the source of truth
      const newPath = join(ttsStore.notestore.currentStore, defaultConf.defaultRepoPath, value.value);
      ttsStore.notebook.currentPath = newPath;
      ttsStore.notebook.bookType = value.type;
      ttsStore.setNoteBookConfig();

      console.log('Switched to notebook:', value.value);
      console.log('New notebook path:', newPath);

      // Auto-pull when switching to remote notebook
      if (value.type === 'github') {
        console.log('Switching to remote notebook, pulling updates...');
        await gitPull(t, ttsStore.notebook.currentPath);
      }

      // Force tree refresh by creating new array reference
      ttsStore.refreshTreeData();

      // Also set needUpdateTree to trigger any watchers
      ttsStore.config.needUpdateTree = true;

      ttsStore.startGitStatusCheck(); // Check git status for new notebook

      ElMessage({
        message: t('settings.notebookSwitched', { name: value.label }),
        type: 'success',
      });
  }


    function getNoteBookList(dir = ""){
     // console.log("start find lists")
    /*  var op:Array<Object> = readOneDir(dir)
        const simplifiedUsers = op.map(obj => {
        return {
              name: obj['label'],
              email: obj['value']
        };
      });
      */
      options[0].options = [...readOneDir(dir)];
    }
  </script>
    
  <style scoped>
  .button-container {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding-bottom: 20px;
  }
  
  .el-button-group {
    display: flex;
    flex-direction: column;
   
  }
  .circle-btn{
    width: 25px; /* 调整按钮的大小 */
    height: 25px;
    border-radius: 50% !important; /* 设置圆角半径 */
    border: none;
    margin-top: 10px;
    background-color: gray;
  }

  /* Git dropdown menu styling */
  .git-dropdown :deep(.el-dropdown-menu__item) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
  }

  .git-dropdown :deep(.el-dropdown-menu__item .el-icon) {
    font-size: 16px;
  }

  /* Form item content layout */
  .form-item-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .path-display {
    padding: 8px 12px;
    background-color: #f5f7fa;
    border-radius: 4px;
    font-size: 13px;
    color: #606266;
    word-break: break-all;
  }

  .action-button {
    width: fit-content;
    align-self: flex-start;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #ebeef5;
  }

  /* Make all form labels bold */
  :deep(.el-form-item__label) {
    font-weight: 600;
  }

  </style>