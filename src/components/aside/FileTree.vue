<template>
    <div class="filter-container">
      <el-input
        v-model="filterText"
        :prefix-icon="Search"
        :placeholder="t('fileTree.filterPlaceholder')"
        clearable
        class="filter-input"
      />
    </div>
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
      :default-expanded-keys="expandedKeys"
      ref="treeRef"
    >
    <template #default="{ node, data }">
        <div class="custom-tree-node" @contextmenu.prevent="handleContextMenu(node, $event)">
          <input
            v-if="editingPath === data.path"
            class="rename-input"
            v-model="editingName"
            @keyup.enter="confirmRename(data)"
            @keyup.esc="cancelRename"
            @blur="confirmRename(data)"
            ref="renameInputRef"
          />
          <el-tooltip
            v-else
            :content="node.label"
            placement="right"
            :show-after="800"
            :hide-after="0"
          >
            <span
              class="el-dropdown-link"
              @dblclick.stop="startRename(data)"
            >{{ node.label }}</span>
          </el-tooltip>
          <span class="node-actions">
            <!-- Star icon for favorites -->
            <el-icon
              v-if="!node.data.isFolder && ttsStore.isStarred(node.data.path)"
              class="star-icon"
              color="#f7ba2a">
              <StarFilled />
            </el-icon>
            <el-dropdown  @command="handleCommand" trigger="click">
             <a class="icon-add" >⚙︎</a>
              <template #dropdown>
              <el-dropdown-menu class="tree-context-menu">
                <el-dropdown-item v-if="node.data.isFolder" :command="{type:'file', data:data}">
                  <el-icon><Document /></el-icon>
                  <span>{{ t('fileTree.createFile') }}</span>
                </el-dropdown-item>
                <el-dropdown-item v-if="node.data.isFolder" :command="{type:'mdfile', data:data}">
                  <el-icon><Document /></el-icon>
                  <span>📝 MD File</span>
                </el-dropdown-item>
                <el-dropdown-item v-if="node.data.isFolder" :command="{type:'folder', data:data}">
                  <el-icon><Folder /></el-icon>
                  <span>{{ t('fileTree.createFolder') }}</span>
                </el-dropdown-item>
                <el-dropdown-item v-if="node.data.isFolder" :command="{type:'remove', data:data, node:node}" divided>
                  <el-icon><Delete /></el-icon>
                  <span>{{ t('fileTree.remove') }}</span>
                </el-dropdown-item>
                <el-dropdown-item v-if="!node.data.isFolder" :command="{type:'pin', data:data}">
                  <el-icon v-if="ttsStore.isPinned(data.path)"><RemoveFilled /></el-icon>
                  <el-icon v-else><Position /></el-icon>
                  <span>{{ ttsStore.isPinned(data.path) ? t('fileTree.unpinNote') : t('fileTree.pinNote') }}</span>
                </el-dropdown-item>
                <el-dropdown-item v-if="!node.data.isFolder" :command="{type:'star', data:data}">
                  <el-icon v-if="ttsStore.isStarred(data.path)"><StarFilled /></el-icon>
                  <el-icon v-else><Star /></el-icon>
                  <span>{{ ttsStore.isStarred(data.path) ? t('fileTree.removeStar') : t('fileTree.addStar') }}</span>
                </el-dropdown-item>
                <el-dropdown-item v-if="!node.data.isFolder" :command="{type:'removeitem', data:data, node:node}" divided>
                  <el-icon><Delete /></el-icon>
                  <span>{{ t('fileTree.remove') }}</span>
                </el-dropdown-item>
              </el-dropdown-menu>
              </template>
            </el-dropdown>
          </span>
          
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

    <el-dialog v-model="dialogFormVisible" :title="t('dialog.typeFolderName')">
    <el-form :model="ttsStore.menu">
      <el-form-item :label="t('dialog.folderName')" :label-width="formLabelWidth">
        <el-input v-model="ttsStore.treeMenu.newFolderName" autocomplete="off" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogFormVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="addFolder" >{{ t('common.ok') }}</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import fs from 'fs'
import {join} from "path"
import { storeToRefs } from "pinia"
import {ref, watch, nextTick, getCurrentInstance, onMounted, onUnmounted} from 'vue'
import Node from 'element-plus/es/components/tree/src/model/node'
import {ElTree, ElMessage,ElMessageBox, ElPopconfirm} from 'element-plus'
import { Search, InfoFilled, Star, StarFilled, Document, Folder, Delete, Position, RemoveFilled } from "@element-plus/icons-vue"
import {getNoteLabel} from "@/libs/noteUtil"
import { useTtsStore, editorInstance, Tree } from "@/store/store"
import { readDir,readNotes} from "@/libs/fileHandler"
import {updateTreeMenu} from "@/libs/treeMenu"
import {remove, removeFolder, renameFile} from "@/libs/fileHandler"
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const ttsStore = useTtsStore();
var {editerData,inputs,cnote ,treeMenu} = storeToRefs(ttsStore);

const filterText = ref('')
const treeRef = ref<InstanceType<typeof ElTree>>()
const dialogFormVisible = ref(false)
const formLabelWidth = '120px';
const expandedKeys = ref<string[]>([]);

const editingPath = ref('')
const editingName = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)

function startRename(data: Tree) {
  if (data.isFolder) return
  editingPath.value = data.path
  editingName.value = data.label
  nextTick(() => {
    renameInputRef.value?.select()
  })
}

function confirmRename(data: Tree) {
  if (!editingPath.value) return
  const newName = editingName.value.trim()
  if (newName && newName !== data.label) {
    // Update store state so renameFile() picks it up
    ttsStore.cnote.destTitle = newName
    ttsStore.cnote.title = data.label
    ttsStore.inputs.notePath = data.path
    renameFile()
    data.label = newName
  }
  editingPath.value = ''
  editingName.value = ''
}

function cancelRename() {
  editingPath.value = ''
  editingName.value = ''
}

var show = ref(false);

const dropdownVisible = ref(false);

// Save expanded nodes state
function saveExpandedState() {
  if (treeRef.value) {
    const store = treeRef.value.store;
    const expanded: string[] = [];

    function traverse(node: any) {
      if (node.expanded && node.key) {
        expanded.push(node.key);
      }
      if (node.childNodes && node.childNodes.length > 0) {
        node.childNodes.forEach((child: any) => traverse(child));
      }
    }

    if (store && store.root) {
      traverse(store.root);
    }

    expandedKeys.value = expanded;
    // Also save to store so refreshTreeData can preserve it
    ttsStore.treeMenu.expandedKeys = expanded;
  }
}

// Restore expanded state after tree data refresh
watch(
  () => ttsStore.treeMenu.data,
  () => {
    const keys = ttsStore.treeMenu.expandedKeys;
    if (!keys || keys.length === 0) return;
    nextTick(() => {
      if (!treeRef.value) return;
      keys.forEach((key: string) => {
        try {
          const node = treeRef.value?.getNode(key);
          if (node) node.expand();
        } catch (_) {}
      });
    });
  },
  { deep: false }
)



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
    console.dir(command.node)
   // ElMessage(`click on item ${command.type}`)
    switch (command.type) {
      case 'file':
        append(command.data)
        break;
      case 'mdfile':
        appendMd(command.data)
        break;
      case 'folder':
        dialogFormVisible.value = true;
        break;
      case 'pin':
        saveExpandedState();
        ttsStore.togglePin(command.data.path);
        break;
      case 'star':
        ttsStore.toggleStar(command.data.path);
        break;
      case 'removeitem':
      ElMessageBox.confirm(
        t('fileTree.confirmDelete', { name: ttsStore.treeMenu.node.label }),
        t('common.delete'),
        {
          confirmButtonText: t('common.ok'),
          cancelButtonText: t('common.cancel'),
          type: 'warning',
        }
      )
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
        ElMessageBox.confirm(
          t('fileTree.confirmDeleteFolder', { name: ttsStore.treeMenu.node.label }),
          t('common.delete'),
          {
            confirmButtonText: t('common.ok'),
            cancelButtonText: t('common.cancel'),
            type: 'warning',
          }
        )
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

// Watch for expandedKeys changes from store (e.g., from breadcrumb clicks)
watch(
  () => ttsStore.treeMenu.expandedKeys,
  (newKeys) => {
    if (newKeys && newKeys.length > 0) {
      expandedKeys.value = newKeys;
      console.log('Tree expanding to keys:', newKeys);
    }
  }
)

onMounted(() => {
  cancelEvent();
  window.addEventListener('save-tree-expanded-state', saveExpandedState);

  // Restore expanded state from last session
  const keys = ttsStore.treeMenu.expandedKeys;
  if (keys && keys.length > 0) {
    nextTick(() => {
      setTimeout(() => {
        if (!treeRef.value) return;
        keys.forEach((key: string) => {
          try {
            const node = treeRef.value?.getNode(key);
            if (node) node.expand();
          } catch (_) {}
        });
      }, 100);
    });
  }
})

onUnmounted(() => {
  window.removeEventListener('save-tree-expanded-state', saveExpandedState);
})

function cancelEvent(){

}

const filterNode:any = (value: string, data: Tree,node:Node) => {
  if (!value) return true
  return data.label.includes(value)
}

function loadHandler(data:any){
  console.log(data)
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

  const appendMd = (data: Tree) => {
    let label:string = getNoteLabel();
    let path:any = join(data.path, label + '.md')
    const newChild:Tree = {label: label, path: path, isFolder:false, isLeaf: true}
    if (!data.children) {
      data.children = []
    }
    data.children.push(newChild as Tree)
    ttsStore.inputs.notePath = path
    fs.writeFileSync(path, '', 'utf8')
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
    // Create new file with valid EditorJS structure
    const emptyEditorData = {
      time: Date.now(),
      blocks: [],
      version: "2.26.5"
    };
    fs.writeFileSync(path, JSON.stringify(emptyEditorData, null, 2), 'utf8')
 // ttsStore.treeMenu.data.value = [...ttsStore.treeMenu.data.value]
}

const handleNodeClick = ((itemdata: Tree,node:Node) => {
    console.log('node data is '+ node + itemdata)
    console.dir(node)
    console.dir(itemdata)

    ttsStore.treeMenu.node = node;
    ttsStore.treeMenu.treeData = itemdata
    ttsStore.inputs.itemData = itemdata
    console.log(itemdata)
   if(!itemdata.isFolder && fs.existsSync(itemdata.path)){
    ttsStore.inputs.notePath = itemdata.path;
    ttsStore.cnote.title = itemdata.label;
    ttsStore.cnote.destTitle = itemdata.label;
    ttsStore.cnote.lastPath = itemdata.path;
    ttsStore.treeMenu.currentNode = treeRef.value?.getCurrentNode()
    ttsStore.setLastEditNote()

    if (itemdata.path.endsWith('.md')) {
      // MarkdownEditor handles loading via watch on notePath
      return
    }

    fs.readFile(itemdata.path, 'utf8', (err:any, data:any) => {
    if (err) {
      console.error('Failed to read file:', err)
      return
    }
    data = data.trim().replace('\n','')
    if(data == "")
    {
      console.log('empty file - loading empty EditorJS data')
      const emptyData = {
        time: Date.now(),
        blocks: [],
        version: "2.26.5"
      };
      ttsStore.editerData = emptyData;
    }
    else{
      try {
        const jsonData = JSON.parse(data);
        ttsStore.editerData = jsonData;
        console.log('json data :'+ jsonData)
      } catch (e) {
        console.error('Failed to parse note JSON:', e)
      }
    }

  })}
  })
  </script>


  <style scoped>
  .filter-container {
    padding: 8px;
    background: transparent;
  }

  .filter-input {
    --el-input-border-color: transparent;
    --el-input-hover-border-color: #dcdfe6;
    --el-input-focus-border-color: #409eff;
  }

  .filter-input :deep(.el-input__wrapper) {
    background-color: rgba(0, 0, 0, 0.03);
    border-radius: 6px;
    box-shadow: none;
    transition: all 0.2s;
    padding: 4px 8px;
  }

  .filter-input :deep(.el-input__wrapper:hover) {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .filter-input :deep(.el-input__wrapper.is-focus) {
    background-color: #fff;
    box-shadow: 0 0 0 1px #409eff inset;
  }

  .filter-input :deep(.el-input__inner) {
    font-size: 12px;
    color: #606266;
  }

  .filter-input :deep(.el-input__inner::placeholder) {
    color: #a8abb2;
    font-size: 12px;
  }

  .filter-input :deep(.el-input__prefix) {
    color: #909399;
  }

  .filter-input :deep(.el-input__suffix) {
    color: #909399;
  }

  /* Tree context menu styling */
  .tree-context-menu :deep(.el-dropdown-menu__item) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 13px;
  }

  .tree-context-menu :deep(.el-dropdown-menu__item .el-icon) {
    font-size: 16px;
    flex-shrink: 0;
  }

  .tree-context-menu :deep(.el-dropdown-menu__item span) {
    flex: 1;
  }

  .treemenu{
      background-color: transparent;
      padding-bottom: 50px; /* Add padding to avoid being covered by AConfig buttons */
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
  padding-right: 8px;
  min-width: 0;
  max-width: 100%;
  position: relative;
}

.el-dropdown-link {
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  max-width: calc(100% - 30px);
  padding-right: 8px;
}

.node-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  position: absolute;
  right: 8px;
  background: inherit;
}

.star-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.star-icon:hover {
  transform: scale(1.2);
  transition: transform 0.2s;
}

.rename-input {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  border: 1px solid #409eff;
  border-radius: 3px;
  padding: 0 4px;
  height: 20px;
  outline: none;
  background: #fff;
  color: #303133;
}

  </style>