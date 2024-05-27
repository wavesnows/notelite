<template>
    <!--Left Panel Start-->
    <div class="button-container">
      <el-button-group>
      <el-tooltip class="box-item" content="Add Folder" placement="top-start">
        <el-button type="info" size="small" circle class="circle-btn" @click="handleCommand">
          <el-icon ><Plus /></el-icon>
        </el-button>
      </el-tooltip>
      <el-dropdown @command="handleGit" v-show="notebook.bookType != 'local'">
        <el-button type="success" size="small" circle class="circle-btn">
          <el-icon><Suitcase /></el-icon>
        </el-button>
      <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="pull">📥 Pull</el-dropdown-item>
        <el-dropdown-item command="push">📤 Push</el-dropdown-item>
      </el-dropdown-menu>
    </template>
    </el-dropdown>
    <el-tooltip class="box-item" content="Setting" placement="top-start">
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
    <el-drawer v-model="config.drawer" :direction="direction" size="50%">
      <template #header>
        <h3>Settings</h3>
      </template>
      <template #default>
        <el-tabs tab-position="left" style="height: 100%" class="demo-tabs">
          <el-tab-pane label="Local Setting">
            <el-form  v-model="config" label-width="120px" label-position="top">
 
              <el-form-item label="Local Path">
                <el-input readonly="true"  v-model="notestore.currentStore" />
                <el-button style="margin-top: 5px;" :prefix-icon="Select"  type="success" @click="openDialog">Change Default Path</el-button>
              </el-form-item>
              <el-form-item label="Default Notebook Path">
                {{ settings.defaultNotePath }}
                <el-button v-show="true" style="margin-top: 5px;" :prefix-icon="Select"  type="success" @click="initCommonBook">Initial Default Noetbook</el-button>
              </el-form-item>
              <el-form-item label="Current Notebook">
              <el-select v-model="settings.currentbook" placeholder="Select Note Repo" @change="saveHander" >
                <el-option-group v-for="group in options" :key="group.label" :label="group.label">
                  <el-option v-for="item in group.options" :key="item.value" :label="item.label" :value="item" />
                </el-option-group>
              </el-select>   
            </el-form-item>
            <el-form-item label="Notebook Path">
               {{ notebook.currentPath }}
              </el-form-item>
            </el-form>
           <!-- <div style="flex: auto">
              <el-button style="float: right;"  type="success" @click="initCommonBook">Initial Default Noetbook</el-button>
            </div>-->
          </el-tab-pane>
          <el-tab-pane label="Remote Seting">
            <el-form :model="config" label-width="120px" label-position="top">
              <el-form-item label="Remote Repo">
              <!-- <el-select v-model="settings.currentbook" placeholder="Select Note Repo" @change="RemoteStoreSelectHander" >
                <el-option-group v-for="group in options" :key="group.label" :label="group.label">
                  <el-option v-for="item in group.options" :key="item.value" :label="item.label" :value="item" />
                </el-option-group>
              </el-select> --> 
              </el-form-item>
              <el-form-item label="Enable GitHub">
                <el-switch v-model="config.githubEnable" active-text="Open" inactive-text="Close" />
              </el-form-item>
              <el-form-item label="GitHub User Name">
                <el-input v-model="config.githubUsername" :disabled="!config.githubEnable"/>
              </el-form-item>
              <el-form-item label="GitHub Token">
                <el-input v-model="config.githubToken" :disabled="!config.githubEnable" />
              </el-form-item>
              <el-form-item label="GitHub RepoName">
                <el-input v-model="config.githubRepoName" :disabled="!config.githubEnable"/>
              </el-form-item>
            </el-form>
            <div style="flex: auto">
              <el-button style="float: right;"  type="success" @click="initClick" :disabled="!config.githubEnable">Initial Form GitHub</el-button>
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
      <template #footer>
        <div style="flex: auto">
          <el-button @click="cancelClick">Cancel</el-button>
          <el-button type="primary" @click="confirmClick">OK</el-button>
        </div>
      </template>
    </el-drawer>
    <!--Config Drawer End-->
    <!--Create Note Folder Dialog Start -->
    <el-dialog v-model="dialogFormVisible" title="Add Root Folder">
    <el-form :model="ttsStore.menu">
      <el-form-item label="Type Folder Name" :label-width="formLabelWidth">
        <el-input v-model="rootFolderName" autocomplete="off" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogFormVisible = false">Cancel</el-button>
        <el-button type="primary" @click="addRootFolder" >OK</el-button>
      </span>
    </template>
  </el-dialog>

 <!--Create Note Folder Dialog End -->
</template>
    
<script lang="ts" setup>
  import { ref } from 'vue'
  import { ElMessageBox, ElMessage } from 'element-plus'
  import { useTtsStore, Tree } from "@/store/store";
  import { storeToRefs } from "pinia";
  import {gitHubClone, gitPull, gitHubPush, githubPush} from "@/libs/github"
  import fs from 'fs'
  import {join} from "path";
  import type Node from 'element-plus/es/components/tree/src/model/node'
  import {initDefaultNotebook} from "@/libs/noteUtil"
  import { readDir, readOneDir,readNotes} from "@/libs/fileHandler"
  import { Select, Plus } from "@element-plus/icons-vue";
  import defaultConf from "@/global/defaultConf";
  import { ipcRenderer } from 'electron';


  const formLabelWidth = '140px';
  const dialogFormVisible = ref(false)
  var rootFolderName = ref("notes")
  const ttsStore = useTtsStore();
  var {config, notebook, notestore, settings} = storeToRefs(ttsStore);
  
  var options = [
    {
      label: 'Local Note Books',
      options: [
        {
          value: 'default',
          label: 'default',
          type:'local',
        },
      ],
    },
    {
      label: 'Remote Note Books',
      options: [
        
      ],
    },
  ]

  if(ttsStore.config.githubRepoName!=""){
    options[1].options.push(
        {
          value: ttsStore.config.githubRepoName,
          label: ttsStore.config.githubRepoName,
          type:'github',
        }
      )
    }

  options[0].options = [...readOneDir(join(ttsStore.notestore.currentStore, defaultConf.defaultRepoPath))];

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

 

  const direction = ref('rtl')
  const handleClose = (done: () => void) => {
    ElMessageBox.confirm('Are you sure you want to close this?')
      .then(() => {
        done()
      })
      .catch(() => {
        // catch error
      })
  }
  
  async function initClick(){
    await gitHubClone();
  }

  function initCommonBook(){
    let str = initDefaultNotebook(ttsStore.config.savePath as string);
    ElMessage(str);
  }


  function cancelClick() {
    ttsStore.config.drawer = false
  }
  
  function popHandler(){
    ttsStore.config.drawer = true
  }
  function RemoteStoreSelectHander(){
    
  }
  function confirmClick() {
    ElMessageBox.confirm(`Are you confirm Changeed?`)
      .then(() => {
        ttsStore.updateSettings();
        ttsStore.config.drawer = false;
        ttsStore.config.needUpdateTree = true;
        ElMessage({
            message: 'Save succed!',
            grouping: true,
            type: 'success',
          })
        console.log("confirm log")
      })
      .catch(() => {
        ElMessage({
            message: 'Save faild! Please try again',
            grouping: true,
            type: 'error',
          })
      })
  }

  const handleCommand = (command: string) => {
    //ElMessage(`click on item ${command}`)
    dialogFormVisible.value = true; 
    
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
      await gitPull()
      console.log("Git Pull")
    }
    else if(command == 'push'){
     // await githubPush()
      await gitHubPush();
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

    function saveHander(value:any){
      ttsStore.settings.currentbook = value;
      ttsStore.notebook.currentPath = join(settings.value.currentStore,"repos",value.value)
      ttsStore.treeMenu.data = readNotes(ttsStore.notebook.currentPath) // reload file
      ttsStore.notebook.bookType = value.type;
      ttsStore.setNoteBookConfig();
      /*
      ttsStore.notebook.current = value.value;
      // ttsStore.notebook.bookType = value.type;
      ttsStore.notebook.currentPath = join(ttsStore.config.savePath,"repos",ttsStore.notebook.current)
      console.log(ttsStore.notebook.currentPath)
      ttsStore.setNoteBookConfig();
      ttsStore.treeMenu.data = readNotes(ttsStore.notebook.currentPath) // reload file
      */
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


  </style>