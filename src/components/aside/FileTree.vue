<template>
    <el-input size="small" v-model="filterText" :suffix-icon="Search" placeholder="Filter keyword" />
    <el-scrollbar height="100%" width="100%">
    <el-tree
      :data="treeMenu.data"
      @node-click="handleNodeClick"
      @loadNode=" loadHandler"
      class="treemenu"
      node-key="path"
      :expand-on-click-node="false"
      :indent="5"
      :filter-node-method="filterNode"
      @node-contextmenu="showItemMenu "
      ref="treeRef"
    >
    <template #default="{ node, data }">
        <div class="custom-tree-node" @contextmenu.prevent="handleContextMenu(node, $event)">
          <span class="el-dropdown-link">{{ node.label }}</span>
         
            <el-dropdown  @command="handleCommand">
             <a  v-if="node.data.isFolder" class="icon-add" >⚙︎</a>
             <!--  <a v-if="!node.data.isFolder" class="icon-remove" > ☸︎</a>-->
              <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="node.data.isFolder" :command="{type:'file', data:data}">📄 File</el-dropdown-item>
                <el-dropdown-item v-if="node.data.isFolder" :command="{type:'folder', data:data} ">📂 Folder</el-dropdown-item>
                <el-dropdown-item v-if="node.data.isFolder" :command="{type:'remove', data:data, node:node}">❌ Remove</el-dropdown-item>
                <el-dropdown-item v-if="!node.data.isFolder" :command="{type:'removeitem', data:data, node:node}">❌ Remove</el-dropdown-item>
              </el-dropdown-menu>
              </template>
            </el-dropdown>
          
          <!-- <el-dropdown v-if="dropdownVisible" :style="{ position: 'fixed', top: `${dropdownPosition.y}px`, left: `${dropdownPosition.x}px` }">
              <span class="el-dropdown-link">{{ node.label }}</span>
              <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click.native="handleDropdownItemClick">菜单项</el-dropdown-item>
              </el-dropdown-menu>
            </template>
            </el-dropdown>-->
           
            <!--  <el-popconfirm
              confirm-button-text="Yes" cancel-button-text="No" :icon="InfoFilled" icon-color="#626AEF"
              title="Are you sure to delete this?" @confirm="remove(node, data)" @cancel="cancelEvent" >
              <template #reference>
                <a v-if="!node.data.isFolder" class="icon-remove" >✗</a>
              </template>
            </el-popconfirm> -->
          </div>
       
      </template>
    
    </el-tree>
    </el-scrollbar>


 



    <el-dialog v-model="dialogFormVisible" title="Type Folder Name">
    <el-form :model="ttsStore.menu">
      <el-form-item label="Folder Name" :label-width="formLabelWidth">
        <el-input v-model="ttsStore.treeMenu.newFolderName" autocomplete="off" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogFormVisible = false">Cancel</el-button>
        <el-button type="primary" @click="addFolder" >OK</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import fs from 'fs'
import {join} from "path"
import { storeToRefs } from "pinia"
import {ref, watch,getCurrentInstance, onMounted} from 'vue'
import type Node from 'element-plus/es/components/tree/src/model/node'
import {ElTree, ElMessage,ElMessageBox, ElPopconfirm} from 'element-plus'
import { Search,InfoFilled } from "@element-plus/icons-vue"
import {getNoteLabel} from "@/libs/noteUtil"
import { useTtsStore, editorInstance, Tree } from "@/store/store"
import { readDir,readNotes} from "@/libs/fileHandler"
import {updateTreeMenu} from "@/libs/treeMenu"

const ttsStore = useTtsStore();
var {editerData,inputs,cnote ,treeMenu} = storeToRefs(ttsStore);

const filterText = ref('')
const treeRef = ref<InstanceType<typeof ElTree>>()
const dialogFormVisible = ref(false)
const formLabelWidth = '120px';

var show = ref(false);

const dropdownVisible = ref(false);



const showItemMenu = () => {
  console.log("show content")
    show.value = true;
  };

  const dropdownPosition = ref({ x: 0, y: 0 });
  const handleContextMenu = (node:any, event:any) => {
      dropdownPosition.value = { x: event.clientX, y: event.clientY };
      dropdownVisible.value = true;
    };




    const handleDropdownItemClick = () => {
      console.log('点击下拉菜单项');
      dropdownVisible.value = false;
    };



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

const defaultProps = {
    children: 'children',
    label: 'label',
    isLeaf:true
  }

watch(
  () => ttsStore.config.needUpdateTree, (newValue, oldValue) => {
    console.log("tree value change")
    // do something
    ttsStore.config.needUpdateTree = false;
  }
)


watch(filterText, (val) => {
  treeRef.value!.filter(val)
})

onMounted(()=>{
console.log('页面初始化完成');
      // 调用其他函数或方法
      cancelEvent();
    }
)

function cancelEvent(){

}

const filterNode:any = (value: string, data: Tree,node:Node) => {
  if (!value) return true
  return data.label.includes(value)
}

function loadHandler(data:any){
  console.log(data)
}

function updateMenu(){
    console.log("Update Menu")
    let treedata:Tree = ttsStore.treeMenu.treeData;
    let node:Node = ttsStore.treeMenu.node;
    const parent = node.parent
    const children: Tree[] = parent.data.children || parent.data
    const index = children.findIndex((d) => d.path === treedata.path)
    children.splice(index, 1)
}

const addFolder = () =>{
  //let data:Tree = ttsStore.menu.curentData;
  let data:Tree = ttsStore.treeMenu.treeData;
  console.log("add folder",data)
  dialogFormVisible.value = false;
  let foldername  = ttsStore.treeMenu.newFolderName;
  let path = join(data.path, foldername)
  const newChild:Tree = {label: foldername, path: path, isFolder:true, isLeaf: true}
  if (!data.children) {
    data.children = []
  }
  data.children.push(newChild as Tree)
  fs.mkdirSync(join(data.path, foldername));

  }

  const append = (data: Tree) => {
    console.log("add")
    console.dir(data)
    let label:string = getNoteLabel();
    let path:any = join(data.path,label+'.json')
    const newChild:Tree = {label: label, path: path, isFolder:false, isLeaf: true}
    if (!data.children) {
      data.children = []
    }
    data.children.push(newChild as Tree)
    ttsStore.inputs.notePath = path
    fs.writeFileSync(path, '', 'utf8')
 // ttsStore.treeMenu.data.value = [...ttsStore.treeMenu.data.value]
}



const remove = (node: Node, data: Tree) => {
  console.log("remove")
  ttsStore.treeMenu.treeData = data;
  ttsStore.treeMenu.node = node;
 // updateTreeMenu()
  updateMenu()
  ttsStore.inputs.notePath =  node.data.path
  console.log("----"+node.data.path)
  fs.rmSync(ttsStore.inputs.notePath)
}

const removeFolder= () => {
  console.log("remove Folder")
  let node  = ttsStore.treeMenu.node ;
//  updateTreeMenu()
  updateMenu()
  ttsStore.inputs.notePath =  node.data.path
  console.log("----"+node.data.path)
  try {
    fs.rmdirSync(node.data.path,{recursive: true})
  } catch (error) {
    console.log(error);
  }
  return null
}



  const handleNodeClick = ((itemdata: Tree,node:Node) => {
    console.log('node data is '+ node + itemdata)
    console.dir(node)
    console.dir(itemdata)

    ttsStore.treeMenu.node = node;
    ttsStore.treeMenu.treeData = itemdata
    ttsStore.inputs.itemData = itemdata
    ttsStore.inputs.notePath = itemdata.path;
    console.log(itemdata)
   if(!itemdata.isFolder && fs.existsSync(itemdata.path)){
    fs.readFile(itemdata.path, 'utf8', (err:any, data:any) => {
    if (err) throw err;
    // 将文件内容解析为 JSON 对象
    ttsStore.cnote.title = itemdata.label;
    ttsStore.cnote.destTitle = itemdata.label;
    ttsStore.cnote.lastPath = itemdata.path;
    ttsStore.treeMenu.currentNode = treeRef.value?.getCurrentNode()
    data = data.trim().replace('\n','')
    if(data == "")
    {
      console.log('empty file')
      ttsStore.editorInstance.clear()
    }
    else{
      const jsonData = JSON.parse(data);
      ttsStore.editerData = jsonData;
      console.log('json data :'+ jsonData)
    }

  })}
  })
  </script>


  <style scoped>
  .treemenu{
      background-color: transparent;
  }

.el-dropdown{
  vertical-align: middle;
}
  .icon-add{
    color: rgb(115, 117, 115);
    margin-right: 2px;
    float: right;
  }

  .icon-remove{
    color: red;
    margin-right: 2px;
  }
  .custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;
}

  </style>