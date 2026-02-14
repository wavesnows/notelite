import fs from 'fs'
import path from 'path'
import {getNoteLabel} from '@/libs/noteUtil'
import { useTtsStore, editorInstance,Tree } from "@/store/store";
import Node from 'element-plus/es/components/tree/src/model/node'
import {updateTreeMenu} from "@/libs/treeMenu"
import {showMessage} from '@/libs/globalLib'

  export function renameFile(){
    //  saveContent(editor,ttsStore);
     // ttsStore.treeMenu.data = readDir();
    let ttsStore = useTtsStore()
    var destPath = path.dirname(ttsStore.inputs.notePath)
    var destPath = path.join(destPath,ttsStore.cnote.destTitle +'.json')
    //console.log(destPath)
    //console.log(ttsStore.inputs.notePath)
    if(ttsStore.inputs.notePath != destPath){
      const oldPath = ttsStore.inputs.notePath;

      try{
        fs.copyFileSync(ttsStore.inputs.notePath,destPath,fs.constants.COPYFILE_EXCL)
      }
      catch(e:any){
        showMessage(e.message, 'warning')
      }
      fs.rmSync(ttsStore.inputs.notePath)

      // Update favorites paths if the file was pinned or starred
      const wasPinned = ttsStore.isPinned(oldPath);
      const wasStarred = ttsStore.isStarred(oldPath);

      if (wasPinned) {
        ttsStore.togglePin(oldPath); // Remove old path
        ttsStore.togglePin(destPath); // Add new path
      }
      if (wasStarred) {
        ttsStore.toggleStar(oldPath); // Remove old path
        ttsStore.toggleStar(destPath); // Add new path
      }

      ttsStore.inputs.notePath = destPath;
      ttsStore.cnote.title = ttsStore.cnote.destTitle;
      ttsStore.scheduleTreeRefresh() // reload file with debounce
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
      showMessage('Remove success!', 'success')
         //'success' | 'warning' | 'info' | 'error'
    } catch (error) {
      showMessage(error as string, 'error')
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

    // Remove from favorites if present
    const filePath = node.data.path;
    if (ttsStore.isPinned(filePath)) {
      ttsStore.togglePin(filePath);
    }
    if (ttsStore.isStarred(filePath)) {
      ttsStore.toggleStar(filePath);
    }

    fs.rmSync(ttsStore.inputs.notePath)
  }




  export function removeFile(){
    const ttsStore = useTtsStore();

    updateTreeMenu()

    // Remove from favorites if present
    const filePath = ttsStore.inputs.notePath;
    if (ttsStore.isPinned(filePath)) {
      ttsStore.togglePin(filePath);
    }
    if (ttsStore.isStarred(filePath)) {
      ttsStore.toggleStar(filePath);
    }

    // var destPath = path.dirname(ttsStore.inputs.notePath)
    try {
      fs.rmSync(ttsStore.inputs.notePath)
      showMessage('Remove success!', 'success')
         //'success' | 'warning' | 'info' | 'error'
    } catch (error) {
      showMessage(error as string, 'error')
         //'success' | 'warning' | 'info' | 'error'
    }
      return ;
  }

// 通用目录读取函数
function readDirGeneric(dirPath: string, options: {
  recursive?: boolean,
  includeJson?: boolean,
  dirsOnly?: boolean,
  checkExists?: boolean,
  customMapper?: (file: string, fullPath: string, isDirectory: boolean) => any
}): any[] {
  if (options.checkExists && !fs.existsSync(dirPath)) {
    console.log("file path is empty")
    return []
  }

  let filter = (file: string) => !file.startsWith('.')
  if (options.includeJson) {
    filter = (file: string) => !file.startsWith('.') && (path.extname(file) == '.json' || path.extname(file) == '')
  } else if (options.dirsOnly) {
    filter = (file: string) => !file.startsWith('.') && path.extname(file) == ''
  }

  const files = fs.readdirSync(dirPath).filter(filter)

  return files.map((file: string) => {
    const fullPath = path.resolve(dirPath, file)
    const isDirectory = fs.statSync(fullPath).isDirectory()

    if (options.customMapper) {
      return options.customMapper(file, fullPath, isDirectory)
    }

    // Default mapper for readDir/readNotes
    return {
      label: isDirectory ? file : file.substring(0, file.lastIndexOf('.')),
      path: fullPath,
      isFolder: isDirectory,
      children: isDirectory && options.recursive ? readDirGeneric(fullPath, options) : null
    }
  }).filter(item => item !== "")
}

export function readDir(dir: string = ''): any {
  let dirPath = dir
  if (dir == '') {
    const ttsStore = useTtsStore()
    dirPath = path.join(ttsStore.settings.currentStore, 'repos', ttsStore.config.githubRepoName, 'notes')
    console.log(dirPath)
  }
  return readDirGeneric(dirPath, { recursive: true, includeJson: true })
}

export function readOneDir(dir: string = ''): Array<any> {
  return readDirGeneric(dir, {
    dirsOnly: true,
    customMapper: (file, fullPath, isDirectory) => {
      if (isDirectory) {
        return {
          label: file,
          value: file,
          path: fullPath,
          type: 'local',
        }
      }
      return ""
    }
  })
}

export function sortTreeByPinned(tree: Tree[], pinnedPaths: string[]): Tree[] {
  // Separate pinned and unpinned items
  const pinned: Tree[] = [];
  const unpinned: Tree[] = [];

  tree.forEach(item => {
    if (!item.isFolder && pinnedPaths.includes(item.path)) {
      pinned.push(item);
    } else {
      unpinned.push(item);
    }

    // Recursively sort children
    if (item.children && item.children.length > 0) {
      item.children = sortTreeByPinned(item.children, pinnedPaths);
    }
  });

  return [...pinned, ...unpinned];
}

export function readNotes(dirPath: string, pinnedPaths?: string[]): any {
  const notes = readDirGeneric(dirPath, {
    recursive: true,
    includeJson: true,
    checkExists: true
  });

  // Apply pinned sorting if provided
  if (pinnedPaths && pinnedPaths.length > 0) {
    return sortTreeByPinned(notes, pinnedPaths);
  }

  return notes;
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