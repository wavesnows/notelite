<template>
    <!--Left Panel Start-->
    <div class="button-container">
      <el-button-group>
      <el-dropdown @command="handleGit" v-show="notebook.bookType != 'local'">
        <el-button
          type="success"
          size="small"
          circle
          class="circle-btn"
        >
        <el-icon><Suitcase /></el-icon>
        </el-button>
          <template #dropdown>
        <el-dropdown-menu>
        <el-dropdown-item command="pull">📥 Pull</el-dropdown-item>
        <el-dropdown-item command="push">📤 Push</el-dropdown-item>
      </el-dropdown-menu>
    </template>
    </el-dropdown>
    <!--<el-tooltip
      class="box-item"
      content="Setting"
      placement="top-start"
    >
    <el-button
      type="info"
      size="small"
      circle
      class="circle-btn"
      @click="popHandler">
      <el-icon ><Setting /></el-icon>
    </el-button>
    </el-tooltip>-->
    </el-button-group>
    </div>
    <!--Left Panel End-->
    <!--Config Drawer Start-->
    <el-drawer v-model="config.drawer" :direction="direction" size="50%">
      <template #header>
        <h3>Config</h3>
      </template>
      <template #default>
        <el-tabs tab-position="left" style="height: 100%" class="demo-tabs">
          <el-tab-pane label="Note Book Config">
            <el-form  v-model="config" label-width="120px" label-position="top">
            <!--<el-form-item label="Note Book Config"></el-form-item>-->
            <el-form-item label="Current Notebook">
              <el-select v-model="value" placeholder="Select Note Repo" @change="saveHander" >
                <el-option-group v-for="group in options" :key="group.label" :label="group.label">
                  <el-option v-for="item in group.options" :key="item.value" :label="item.label" :value="item" />
                </el-option-group>
              </el-select>   
            </el-form-item>
            <el-form-item label="Notebook Path">
               {{ notebook.currentPath }}
              </el-form-item>
            </el-form>
          </el-tab-pane>
          <el-tab-pane label="Local Config">
            <el-form  v-model="config" label-width="120px" label-position="top">
              <el-form-item label="Path Config"></el-form-item>
              <el-form-item label="Default Local Path">
                <el-input v-model="config.savePath" />
              </el-form-item>
              <el-form-item label="Default Notebook Path">
                {{ config.defaultNotePath }}
               <!-- <el-input readonly="true"  v-model="config.defaultNotePath" />-->
              </el-form-item>
            </el-form>
            <div style="flex: auto">
              <el-button style="float: right;"  type="success" @click="initCommonBook">Initial Default Noetbook</el-button>
            </div>
          </el-tab-pane>
          <el-tab-pane label="Remote Store Config">
            <el-form :model="config" label-width="120px" label-position="top">
              <el-form-item label="GitHub Config"></el-form-item>
              <el-form-item label="Enable Config">
                <el-switch v-model="config.githubEnable" active-text="Open" inactive-text="Close" />
              </el-form-item>
              <el-form-item label="User Name">
                <el-input v-model="config.githubUsername" :disabled="!config.githubEnable"/>
              </el-form-item>
              <el-form-item label="Token">
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
    <!--Config Drawer Start-->
    <!--Create Note Folder Dialog Start -->
    <el-dialog v-model="dialogFormVisible" title="Type Folder Name">
      <el-form :model="ttsStore.menu">
        <el-form-item label="name" :label-width="formLabelWidth">
          <el-input v-model="ttsStore.treeMenu.newFolderName" autocomplete="off" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogFormVisible = false">Cancel</el-button>
          <el-button type="primary" @click="addFolder">OK</el-button>
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
  import { readDir,readNotes} from "@/libs/fileHandler"

  const formLabelWidth = '140px';
  const dialogFormVisible = ref(false)

  const ttsStore = useTtsStore();
  var {config, notebook} = storeToRefs(ttsStore);


  //const value = ref(ttsStore.notebook.current)

  type BookRepo = {
    value: string,
    label: string,
    type:string,
  }
  const value = ref(ttsStore.currentbook)
 // const value = ref<BookRepo>(ttsStore.currentbook)
  /*  const value = ref<BookRepo>({
          value: 'default',
          label: 'default',
          type:'local',
        })
*/
  
  const options = [
    {
      label: 'Local Note Repo',
      options: [
        {
          value: 'default',
          label: 'default',
          type:'local',
        },
      ],
    },
    {
      label: 'Remote Note Repo',
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
  
  function confirmClick() {
    ttsStore.initDefaultNotePath();
    ElMessageBox.confirm(`Are you confirm Changeed?`)
      .then(() => {
        ttsStore.setLocalNotePath()
        ttsStore.config.drawer = false;
        ttsStore.config.needUpdateTree = true;
      })
      .catch(() => {
        // catch error
      })
  }

  const handleCommand = (command: string) => {
    ElMessage(`click on item ${command}`)
    dialogFormVisible.value = true; 
  }

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
    const addFolder = ()=>{
      dialogFormVisible.value = false;
      let data = ttsStore.treeMenu.data
      let foldername  = ttsStore.treeMenu.newFolderName
      let repo = ttsStore.config.githubRepoName
      let path = join(ttsStore.config.savePath, 'repos',repo,'notes', foldername)
      const newChild:Tree = {label: foldername, path: path, isFolder:true, isLeaf: true,children:[]}
      data.push(newChild as Tree)
      fs.mkdirSync(path);
    }

    function saveHander(value:any){
     
      ttsStore.currentbook = value;
      ttsStore.notebook.currentPath = join(ttsStore.config.savePath,"repos",value.value)
     // ttsStore.setNoteBookConfig();
      ttsStore.treeMenu.data = readNotes(ttsStore.notebook.currentPath) // reload file
      console.dir(value)
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
    //console.log(command)
   // append(command.data)
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