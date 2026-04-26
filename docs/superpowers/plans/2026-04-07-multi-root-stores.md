# Multi-Root Store Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户可以添加多个根目录（root store），在配置面板管理根目录列表，笔记本下拉按根目录分组展示，切换时同时更新激活根目录和当前笔记本路径。

**Architecture:** 在 electron-store 中新增 `rootStores: string[]` 数组持久化多个根目录；store.ts 的 `notestore` 增加 `rootStores` 字段和操作 actions；AConfig.vue 配置面板新增根目录管理区域（添加/移除），笔记本下拉改为按根目录分组，切换笔记本时同时更新 `notestore.currentStore`。

**Tech Stack:** Vue 3, Pinia, electron-store, Element Plus, Node.js fs/path

---

## File Map

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `src/global/initLocalStore.ts` | 初始化 `rootStores` 数组（首次运行时用当前 `currentStore` 填充） |
| 修改 | `src/store/store.ts` | state 增加 `notestore.rootStores`；新增 `addRootStore`、`removeRootStore`、`setActiveStore` actions |
| 修改 | `src/components/aside/AConfig.vue` | 配置面板增加根目录管理区域；笔记本下拉改为按根目录分组 |

---

### Task 1: initLocalStore.ts 初始化 rootStores

**Files:**
- Modify: `src/global/initLocalStore.ts`

- [ ] **Step 1: 读取文件确认当前内容**

用 Read 工具读取 `/Users/fusong/ClaudeCode/notelite/src/global/initLocalStore.ts`，确认 `initStore` 函数结构。

- [ ] **Step 2: 在 `initStore` 函数末尾添加 `rootStores` 初始化**

找到文件末尾的 `}` 前，在最后一个 `if (!store.has(...))` 块之后添加：

```ts
  // Initialize rootStores array with current store if not set
  if (!store.has("rootStores")) {
    const currentStore = store.get("currentStore") || defaultDir;
    store.set("rootStores", [currentStore]);
  } else {
    // Ensure currentStore is in rootStores (migration safety)
    const currentStore = store.get("currentStore") || defaultDir;
    const rootStores: string[] = store.get("rootStores") || [];
    if (!rootStores.includes(currentStore)) {
      rootStores.push(currentStore);
      store.set("rootStores", rootStores);
    }
  }
```

- [ ] **Step 3: Commit**

```bash
cd /Users/fusong/ClaudeCode/notelite
git add src/global/initLocalStore.ts
git commit -m "feat: initialize rootStores array in electron-store"
```

---

### Task 2: store.ts 增加 rootStores state 和 actions

**Files:**
- Modify: `src/store/store.ts`

- [ ] **Step 1: 在 `notestore` state 中增加 `rootStores` 字段**

找到 state 中的 `notestore` 对象：
```ts
      notestore:{
        currentStore: store.get('currentStore') || defaultDir,
      },
```

替换为：
```ts
      notestore:{
        currentStore: store.get('currentStore') || defaultDir,
        rootStores: (store.get('rootStores') as string[]) || [store.get('currentStore') || defaultDir],
      },
```

- [ ] **Step 2: 在 actions 末尾（`expandTreeToPath` 之后，`},` 闭合前）添加三个 actions**

找到 `expandTreeToPath` action 的结束位置，在其后、`},` 之前插入：

```ts
    // Add a new root store directory
    addRootStore(dirPath: string) {
      if (!this.notestore.rootStores.includes(dirPath)) {
        this.notestore.rootStores.push(dirPath);
        store.set('rootStores', this.notestore.rootStores);
      }
    },

    // Remove a root store directory (only removes from list, does not delete files)
    removeRootStore(dirPath: string) {
      const index = this.notestore.rootStores.indexOf(dirPath);
      if (index > -1) {
        this.notestore.rootStores.splice(index, 1);
        store.set('rootStores', this.notestore.rootStores);
        // If removed store was active, switch to first remaining store
        if (this.notestore.currentStore === dirPath && this.notestore.rootStores.length > 0) {
          this.setActiveStore(this.notestore.rootStores[0]);
        }
      }
    },

    // Switch active root store and update currentStore
    setActiveStore(dirPath: string) {
      this.notestore.currentStore = dirPath;
      this.settings.currentStore = dirPath;
      store.set('currentStore', dirPath);
    },
```

- [ ] **Step 3: Commit**

```bash
cd /Users/fusong/ClaudeCode/notelite
git add src/store/store.ts
git commit -m "feat: add rootStores state and addRootStore/removeRootStore/setActiveStore actions"
```

---

### Task 3: AConfig.vue 根目录管理区域

**Files:**
- Modify: `src/components/aside/AConfig.vue`

这个 Task 改动较大，分步骤完成。先读取文件，再做修改。

- [ ] **Step 1: 在 Global Setting tab 的表单中，在"localPath"表单项之后，添加根目录管理区域**

找到：
```html
              <el-form-item :label="t('settings.localPath')">
                <div class="form-item-content">
                  <div class="path-display">{{ notestore.currentStore }}</div>
                  <el-button class="action-button" :prefix-icon="Select" @click="openDialog">{{ t('settings.changeDefaultPath') }}</el-button>
                </div>
              </el-form-item>
```

替换为：
```html
              <el-form-item :label="t('settings.localPath')">
                <div class="form-item-content">
                  <div class="path-display">{{ notestore.currentStore }}</div>
                  <el-button class="action-button" :prefix-icon="Select" @click="openDialog">{{ t('settings.changeDefaultPath') }}</el-button>
                </div>
              </el-form-item>

              <el-form-item label="根目录列表">
                <div class="root-stores-list">
                  <div
                    v-for="storeDir in notestore.rootStores"
                    :key="storeDir"
                    class="root-store-item"
                    :class="{ active: storeDir === notestore.currentStore }"
                  >
                    <span class="root-store-path" :title="storeDir">{{ storeDir.split('/').pop() || storeDir }}</span>
                    <div class="root-store-actions">
                      <el-button
                        v-if="storeDir !== notestore.currentStore"
                        size="small"
                        type="primary"
                        link
                        @click="switchRootStore(storeDir)"
                      >切换</el-button>
                      <el-button
                        v-if="notestore.rootStores.length > 1"
                        size="small"
                        type="danger"
                        link
                        @click="removeRootStore(storeDir)"
                      >移除</el-button>
                    </div>
                  </div>
                  <el-button size="small" @click="addRootStore" style="margin-top: 8px;">
                    + 添加根目录
                  </el-button>
                </div>
              </el-form-item>
```

- [ ] **Step 2: 修改 `options` computed，改为按根目录分组**

找到现有的 `options` computed：
```ts
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
```

替换为：
```ts
  const options = computed(() => {
    const groups: { label: string; options: any[] }[] = [];

    for (const rootDir of ttsStore.notestore.rootStores) {
      const allNotebooks = readOneDir(join(rootDir, defaultConf.defaultRepoPath));
      if (allNotebooks.length === 0) continue;

      // Attach rootDir to each notebook option so saveHander can use it
      const notebooksWithRoot = allNotebooks.map(nb => ({ ...nb, rootDir }));

      const dirName = rootDir.split('/').pop() || rootDir;
      groups.push({
        label: dirName,
        options: notebooksWithRoot,
      });
    }

    return groups;
  });
```

- [ ] **Step 3: 修改 `saveHander`，切换笔记本时同时更新 activeStore**

找到现有的 `saveHander`：
```ts
    async function saveHander(value:any){
      ttsStore.settings.currentbook = value;
      // Use notestore.currentStore which is the source of truth
      const newPath = join(ttsStore.notestore.currentStore, defaultConf.defaultRepoPath, value.value);
```

替换为：
```ts
    async function saveHander(value:any){
      ttsStore.settings.currentbook = value;
      // Update active root store if notebook belongs to a different root
      if (value.rootDir && value.rootDir !== ttsStore.notestore.currentStore) {
        ttsStore.setActiveStore(value.rootDir);
      }
      const newPath = join(value.rootDir || ttsStore.notestore.currentStore, defaultConf.defaultRepoPath, value.value);
```

- [ ] **Step 4: 在 script 中添加 `addRootStore`、`removeRootStore`、`switchRootStore` 函数**

找到 `saveGitHubConfig` 函数之后，添加：

```ts
  function addRootStore() {
    ipcRenderer.send('open-dialog');
    ipcRenderer.once('selected-directory', (event, paths) => {
      if (paths && paths[0]) {
        ttsStore.addRootStore(paths[0]);
        ElMessage({ message: '根目录已添加', type: 'success' });
      }
    });
  }

  function removeRootStore(dirPath: string) {
    ttsStore.removeRootStore(dirPath);
    ElMessage({ message: '根目录已移除', type: 'success' });
  }

  function switchRootStore(dirPath: string) {
    ttsStore.setActiveStore(dirPath);
    // Refresh notebook list and tree
    ttsStore.refreshTreeData();
    ElMessage({ message: `已切换到：${dirPath.split('/').pop()}`, type: 'success' });
  }
```

- [ ] **Step 5: 修复 `openDialog` 的 `ipcRenderer.on` 冲突**

现有的 `openDialog` 使用 `ipcRenderer.on('selected-directory', ...)` 是持久监听，会和 `addRootStore` 里的 `once` 冲突。把现有的 `ipcRenderer.on` 改为 `ipcRenderer.once`：

找到：
```ts
  ipcRenderer.on('selected-directory', (event, path) => {
```
替换为：
```ts
  ipcRenderer.once('selected-directory', (event, path) => {
```

注意：`openDialog` 和 `addRootStore` 都用 `ipcRenderer.once`，两者不会同时触发（都是点击按钮后才注册），所以不会冲突。

- [ ] **Step 6: 在 `<style scoped>` 中添加根目录列表样式**

在 `.action-button` 样式之后添加：

```css
  .root-stores-list {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 4px;
  }

  .root-store-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-radius: 4px;
    background-color: #f5f7fa;
    font-size: 13px;
  }

  .root-store-item.active {
    background-color: #ecf5ff;
    border: 1px solid #b3d8ff;
  }

  .root-store-path {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #606266;
  }

  .root-store-item.active .root-store-path {
    color: #409eff;
    font-weight: 600;
  }

  .root-store-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
```

- [ ] **Step 7: Commit**

```bash
cd /Users/fusong/ClaudeCode/notelite
git add src/components/aside/AConfig.vue
git commit -m "feat: add root store management UI and multi-root notebook grouping"
```

---

### Task 4: 手动验证

- [ ] **Step 1: 启动应用**

```bash
cd /Users/fusong/ClaudeCode/notelite && npm run dev
```

- [ ] **Step 2: 验证根目录列表初始状态**

打开配置面板 → Global Setting → "根目录列表" 区域应显示当前根目录，标注为激活状态（蓝色高亮）。

- [ ] **Step 3: 验证添加根目录**

点击"+ 添加根目录"按钮，通过文件选择器选择一个目录，确认列表中出现新条目。

- [ ] **Step 4: 验证笔记本下拉按根目录分组**

"当前笔记本"下拉应按根目录名分组显示各笔记本。

- [ ] **Step 5: 验证切换根目录**

点击非激活根目录的"切换"按钮，确认 `notestore.currentStore` 更新，笔记本下拉内容相应变化。

- [ ] **Step 6: 验证移除根目录**

当列表有 2 个以上根目录时，点击"移除"，确认条目消失，且不删除磁盘文件。

- [ ] **Step 7: 验证持久化**

重启应用，确认根目录列表仍然保留。
