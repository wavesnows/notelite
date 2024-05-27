import fs from 'fs'
import path from 'path'
import fse from 'fs-extra'
import { ElMessage } from 'element-plus';
import {getNoteLabel} from '@/libs/noteUtil'
import { useTtsStore, editorInstance,Tree } from "@/store/store";
import Node from 'element-plus/es/components/tree/src/model/node'
import { storeToRefs } from "pinia";
import {updateTreeMenu} from "@/libs/treeMenu"

  export function renameFile(){
    //  saveContent(editor,ttsStore);
     // ttsStore.treeMenu.data = readDir();
    let ttsStore = useTtsStore()
    var destPath = path.dirname(ttsStore.inputs.notePath)
    var destPath = path.join(destPath,ttsStore.cnote.destTitle +'.json')
    //console.log(destPath)
    //console.log(ttsStore.inputs.notePath)
    if(ttsStore.inputs.notePath != destPath){
      try{
        fs.copyFileSync(ttsStore.inputs.notePath,destPath,fs.constants.COPYFILE_EXCL)
      }
      catch(e:any){
        ElMessage({
          message: e.message,
          grouping: true,
          offset:40,
          type: 'warning'
        })
      }
      fs.rmSync(ttsStore.inputs.notePath)
      ttsStore.inputs.notePath = destPath;
      ttsStore.cnote.title = ttsStore.cnote.destTitle;
      ttsStore.treeMenu.data = readNotes(ttsStore.notebook.currentPath) // reload file
    }
    return ;
  }


  export function removeFolder() {
    let ttsStore = useTtsStore()
    console.log("remove Folder")
    let node  = ttsStore.treeMenu.node ;
  //  updateTreeMenu()
    updateTreeMenu()
    ttsStore.inputs.notePath =  node.data.path
    console.log("----"+node.data.path)
    try {
      fs.rmdirSync(node.data.path,{recursive: true}) 
      ElMessage({
              message: 'Remove success!',
              grouping: true,
              type: 'success',
            })
         //'success' | 'warning' | 'info' | 'error'
    } catch (error) {
      ElMessage({
              message: error as string,
              grouping: true,
              type: 'error',
            })
         //'success' | 'warning' | 'info' | 'error'
    }
    return null
  }
  
  export function remove(node: Node, data: Tree) {
    let ttsStore = useTtsStore()
    ttsStore.treeMenu.treeData = data;
    ttsStore.treeMenu.node = node;
    updateTreeMenu()
    ttsStore.inputs.notePath =  node.data.path
    fs.rmSync(ttsStore.inputs.notePath)
  }




  export function removeFile(){
    const ttsStore = useTtsStore();
    
    updateTreeMenu()
    // var destPath = path.dirname(ttsStore.inputs.notePath)
    try {
      fs.rmSync(ttsStore.inputs.notePath)
      ElMessage({
              message: 'Remove success!',
              grouping: true,
              type: 'success',
            })
         //'success' | 'warning' | 'info' | 'error'
    } catch (error) {
      ElMessage({
              message: error as string,
              grouping: true,
              type: 'error',
            })
         //'success' | 'warning' | 'info' | 'error'
    }
      return ;
  }

export function readDir(dir:string = ''):any{
  let dirPath = dir
  if(dir ==''){
    const ttsStore = useTtsStore();
    dirPath = path.join(ttsStore.settings.currentStore,'repos', ttsStore.config.githubRepoName, 'notes');
    console.log(dirPath)
  }
  const files = fs.readdirSync(dirPath).filter((file:string) => !file.startsWith('.') && (path.extname(file) == '.json'|| path.extname(file) =='' ));
  return files.map((file:string) => {
      const fullPath = path.resolve(dirPath, file);
      const isDirectory = fs.statSync(fullPath).isDirectory();
      return {
        label: isDirectory ? file : file.substring(0,file.lastIndexOf('.')),
        path:fullPath,
        isFolder: isDirectory,
        children: isDirectory ? readDir(fullPath) : null
      }
    })
}


export function readOneDir(dir:string = ''):Array<any>{
  let dirPath = dir
  const files = fs.readdirSync(dirPath).filter((file:string) => !file.startsWith('.') && (path.extname(file) =='' ));
  return files.map((file:string) => {
      const fullPath = path.resolve(dirPath, file);
      const isDirectory = fs.statSync(fullPath).isDirectory();
      if(isDirectory){
        return {
          label:file,
          value:file,
          path:fullPath,
          type:'local',
        }
      }
      else return ""
      
    }).filter(item => item !== "")
}

export function readNotes(dirPath:string):any{
  if(fs.existsSync(dirPath)){
    const files = fs.readdirSync(dirPath).filter((file:string) => !file.startsWith('.') && (path.extname(file) == '.json'|| path.extname(file) =='' ));
    return files.map((file:string) => {
        const fullPath = path.resolve(dirPath, file);
        const isDirectory = fs.statSync(fullPath).isDirectory();
        return {
          label: isDirectory ? file : file.substring(0,file.lastIndexOf('.')),
          path:fullPath,
          isFolder: isDirectory,
          children: isDirectory ? readDir(fullPath) : null
        }
      })
  }else
  {
    console.log("file path is empty")
  }
}

export function addHandler(){
  const ttsStore = useTtsStore();
  console.log("add")
  let data = ttsStore.inputs.itemData
  console.dir(data)
  let label:string = getNoteLabel();
  let filePath:any = path.join(data.path,label+'.json')
  const newChild:Tree = {label: label, isFolder:false, path: filePath, isLeaf: true}
  if (!data.children) {
    data.children = []
  }
  data.children.push(newChild as Tree)
  ttsStore.inputs.notePath = filePath
  fs.writeFileSync(filePath, '', 'utf8')
}