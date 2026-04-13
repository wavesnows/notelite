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
        <el-dropdown @command="handleGit" v-show="isInGitRepo && ttsStore.gitAvailable">
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
    <el-button type="info" size="small" circle class="circle-btn" @click="popHandler">
      <el-icon ><Setting /></el-icon>
    </el-button>
    </el-tooltip>
    <el-tooltip class="box-item" content="刷新目录" placement="top-start">
      <el-button type="info" size="small" circle class="circle-btn" @click="refreshTree">
        <el-icon :class="{ spinning: refreshing }"><Refresh /></el-icon>
      </el-button>
    </el-tooltip>
    </el-button-group>
    </div>
    <!--Left Panel End-->

    <!--Config Drawer Start-->
    <el-drawer v-model="config.drawer" direction="rtl" size="50%" :close-on-click-modal="true" @open="onDrawerOpen">
      <template #header>
        <h3>{{ t('settings.title') }}</h3>
      </template>
      <template #default>
        <el-tabs tab-position="left" style="height: 100%" class="demo-tabs">

          <!-- Tab 1: 笔记本 -->
          <el-tab-pane :label="t('settings.notebookTab')">
            <el-form label-width="120px" label-position="top">
              <el-form-item :label="t('settings.currentNotebook')">
                <el-select v-model="settings.currentbook" :placeholder="t('settings.currentNotebook')" value-key="value" @change="saveHander">
                  <el-option-group v-for="group in notebookOptions" :key="group.label" :label="group.label">
                    <el-option v-for="item in group.options" :key="item.value" :label="item.label" :value="item" />
                  </el-option-group>
                </el-select>
              </el-form-item>
              <el-form-item :label="t('settings.notebookPath')">
                <div class="path-display">{{ notebook.currentPath }}</div>
              </el-form-item>
              <el-form-item v-if="isMultiMode" :label="t('settings.createNotebook')">
                <div style="display: flex; gap: 8px; width: 100%;">
                  <el-input v-model="newNotebookName" :placeholder="t('settings.notebookNamePlaceholder')" style="flex: 1;" />
                  <el-button type="primary" @click="createNotebook" :disabled="!newNotebookName.trim()">
                    {{ t('common.ok') }}
                  </el-button>
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
                      <el-button v-if="storeDir !== notestore.currentStore" size="small" type="primary" link @click="switchRootStore(storeDir)">切换</el-button>
                      <el-button v-if="notestore.rootStores.length > 1" size="small" type="danger" link @click="removeRootStore(storeDir)">移除</el-button>
                    </div>
                  </div>
                  <el-button size="small" @click="addRootStore" style="margin-top: 8px;">+ 添加根目录</el-button>
                </div>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <!-- Tab 2: 外观 -->
          <el-tab-pane :label="t('settings.appearanceTab')">
            <el-form label-width="120px" label-position="top">
              <el-form-item :label="t('settings.languageLabel')">
                <el-select v-model="config.language" @change="changeLanguage">
                  <el-option :label="t('settings.english')" value="en_US" />
                  <el-option :label="t('settings.chinese')" value="zh_CN" />
                </el-select>
              </el-form-item>
              <el-form-item label="MD 预览主题">
                <el-select :model-value="ttsStore.mdTheme" @change="(v: string) => ttsStore.setMdTheme(v)" style="width: 200px;">
                  <el-option label="🩵 青绿经典（默认）" value="teal" />
                  <el-option label="🟢 墨绿极简" value="default" />
                  <el-option label="🟣 蓝紫知性" value="purple" />
                  <el-option label="🟠 暖橙活力" value="orange" />
                  <el-option label="🔴 红黑经典" value="red" />
                </el-select>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <!-- Tab 3: 同步 -->
          <el-tab-pane :label="t('settings.remoteSetting')">
            <el-alert v-if="!ttsStore.gitAvailable" type="warning" :closable="false" style="margin-bottom: 16px;">
              <template #title>{{ t('settings.gitNotFound') }}</template>
              <template #default>
                <p style="margin: 4px 0;">{{ t('settings.gitNotFoundDesc') }}</p>
                <el-button size="small" type="primary" link @click="openGitInstallPage">{{ t('settings.installGit') }} →</el-button>
              </template>
            </el-alert>

            <!-- GitHub 账号配置 -->
            <div class="section-title">{{ t('settings.githubAccount') }}</div>
            <el-form :model="config" label-width="120px" label-position="top">
              <el-form-item :label="t('settings.githubUsername')">
                <el-input v-model="config.githubUsername" :placeholder="t('settings.githubUsernamePlaceholder')" @change="saveGitHubConfig" />
              </el-form-item>
              <el-form-item :label="t('settings.githubToken')">
                <el-input v-model="config.githubToken" type="password" show-password :placeholder="t('settings.githubTokenPlaceholder')" @change="saveGitHubConfig" />
              </el-form-item>
            </el-form>

            <!-- 添加远程仓库（自动判断创建或克隆） -->
            <div class="section-title" style="margin-top: 16px;">{{ t('settings.addRemoteRepo') }}</div>
            <el-form label-width="120px" label-position="top">
              <el-form-item :label="t('settings.githubRepoName')">
                <el-input
                  v-model="cloneRepoName"
                  :placeholder="t('settings.githubRepoPlaceholder')"
                  style="width: 100%;"
                  @blur="checkRepo"
                  @change="resetRepoCheck"
                />
              </el-form-item>

              <!-- 检查状态提示 -->
              <div v-if="repoCheckStatus === 'checking'" style="font-size: 12px; color: #909399; margin: -8px 0 12px;">
                ⏳ {{ t('settings.checkingRepo') }}
              </div>
              <div v-else-if="repoCheckStatus === 'exists'" style="font-size: 12px; color: #67c23a; margin: -8px 0 12px;">
                ✓ {{ t('settings.repoExists') }}
              </div>
              <div v-else-if="repoCheckStatus === 'not_found'" style="font-size: 12px; color: #e6a23c; margin: -8px 0 12px;">
                ✦ {{ t('settings.repoWillCreate') }}
              </div>

              <!-- 公私有：仅在需要创建时显示 -->
              <el-form-item v-if="repoCheckStatus === 'not_found'">
                <div style="display: flex; align-items: center; gap: 10px; -webkit-app-region: no-drag;">
                  <el-switch v-model="newRemoteRepoPrivate" />
                  <span style="font-size: 13px; color: #606266;">{{ newRemoteRepoPrivate ? t('settings.repoPrivate') : t('settings.repoPublic') }}</span>
                </div>
              </el-form-item>

              <el-form-item>
                <div style="display: flex; align-items: center; gap: 10px; -webkit-app-region: no-drag;">
                  <el-switch
                    :model-value="cloneMode === 'multi'"
                    @change="(v: boolean) => cloneMode = v ? 'multi' : 'direct'"
                  />
                  <span style="font-size: 13px; color: #606266;">
                    {{ cloneMode === 'multi' ? t('settings.cloneModeMulti') : t('settings.cloneModeDirect') }}
                  </span>
                </div>
              </el-form-item>
              <el-form-item :label="t('settings.cloneTo')">
                <div class="path-display">{{ cloneTargetPath }}</div>
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  @click="cloneRepo"
                  :disabled="!canClone || repoCheckStatus === 'checking' || repoCheckStatus === 'auth_error'"
                  :loading="cloning"
                  style="width: 100%;"
                >
                  {{ repoCheckStatus === 'not_found' ? t('settings.createAndCloneBtn') : t('settings.addRepoBtn') }}
                </el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>

        </el-tabs>
      </template>
    </el-drawer>
    <!--Config Drawer End-->

    <!--Create Note Folder Dialog-->
    <el-dialog v-model="dialogFormVisible" :title="t('dialog.addToNotebook')" width="420px">
      <el-tabs v-model="addDialogTab">
        <!-- Tab 1: 本地文件夹 -->
        <el-tab-pane :label="t('dialog.localFolder')" name="local">
          <el-form style="margin-top: 12px;">
            <el-form-item :label="t('dialog.folderName')" :label-width="formLabelWidth">
              <el-input v-model="rootFolderName" autocomplete="off" :placeholder="t('dialog.folderNamePlaceholder')" />
            </el-form-item>
          </el-form>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
            <el-button @click="dialogFormVisible = false">{{ t('common.cancel') }}</el-button>
            <el-button type="primary" @click="addRootFolder" :disabled="!rootFolderName.trim()">{{ t('common.ok') }}</el-button>
          </div>
        </el-tab-pane>

        <!-- Tab 2: Git 仓库 -->
        <el-tab-pane :label="t('dialog.gitRepo')" name="git">
          <el-form style="margin-top: 12px;">
            <el-form-item :label="t('settings.githubRepoName')" :label-width="formLabelWidth">
              <el-input v-model="dialogCloneRepoName" autocomplete="off" :placeholder="t('settings.githubRepoPlaceholder')" />
            </el-form-item>
          </el-form>
          <div v-if="!ttsStore.config.githubUsername || !ttsStore.config.githubToken" style="font-size: 12px; color: #e6a23c; margin-bottom: 8px;">
            {{ t('dialog.gitConfigRequired') }}
          </div>
          <div v-else style="font-size: 12px; color: #909399; margin-bottom: 8px;">
            → {{ ttsStore.notebook.currentPath }}/{{ dialogCloneRepoName || 'repo-name' }}
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <el-button @click="dialogFormVisible = false">{{ t('common.cancel') }}</el-button>
            <el-button type="primary" @click="addGitRepo" :disabled="!canDialogClone" :loading="dialogCloning">
              {{ t('dialog.cloneBtn') }}
            </el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
</template>

<script lang="ts" setup>
  import { ref, computed } from 'vue'
  import { Refresh, Setting, Plus, Download, Upload, Suitcase } from '@element-plus/icons-vue'
  import { ElMessageBox, ElMessage } from 'element-plus'
  import { useTtsStore, Tree } from "@/store/store";
  import { storeToRefs } from "pinia";
  import { gitPull, gitHubPush, addRemoteRepo, checkRepoExists } from "@/libs/github"
  import fs from 'fs'
  import { join } from "path";
  import { readOneDir } from "@/libs/fileHandler"
  import defaultConf from "@/global/defaultConf";
  import { ipcRenderer } from 'electron';
  import { useI18n } from 'vue-i18n';
  import { isFileInGitRepo } from '@/libs/gitHistory';

  const { t, locale } = useI18n();
  const formLabelWidth = '140px';
  const dialogFormVisible = ref(false)
  const addDialogTab = ref('local')
  const rootFolderName = ref('')
  const dialogCloneRepoName = ref('')
  const dialogCloning = ref(false)

  const canDialogClone = computed(() =>
    !!(config.value.githubUsername && config.value.githubToken && dialogCloneRepoName.value.trim())
  )

  async function addGitRepo() {
    if (!canDialogClone.value) return;
    const repoName = dialogCloneRepoName.value.trim();
    dialogCloning.value = true;
    try {
      const success = await addRemoteRepo(t, repoName, false, 'direct');
      if (success) {
        dialogCloneRepoName.value = '';
        dialogFormVisible.value = false;
        ttsStore.refreshTreeData();
        ElMessage({ message: t('github.cloneSuccess'), type: 'success' });
      } else {
        ElMessage({ message: t('github.cloneFailed'), type: 'error' });
      }
    } finally {
      dialogCloning.value = false;
    }
  }
  const ttsStore = useTtsStore();
  const { config, notebook, notestore, settings, cnote } = storeToRefs(ttsStore);

  const refreshing = ref(false);
  const newNotebookName = ref('');

  function createNotebook() {
    const name = newNotebookName.value.trim();
    if (!name) return;
    const reposPath = join(ttsStore.notestore.currentStore, defaultConf.defaultRepoPath);
    const notebookPath = join(reposPath, name);
    try {
      fs.mkdirSync(notebookPath, { recursive: true });
      newNotebookName.value = '';
      buildNotebookOptions();
      const newNotebook = { value: name, label: name, type: 'local', rootDir: ttsStore.notestore.currentStore };
      saveHander(newNotebook);
      ElMessage({ message: t('settings.notebookCreated'), type: 'success' });
    } catch (e: any) {
      ElMessage({ message: e.message, type: 'error' });
    }
  }

  const newRemoteRepoPrivate = ref(false);
  const cloneRepoName = ref('');
  const cloneMode = ref<'multi' | 'direct'>('multi');
  const cloning = ref(false);
  const repoCheckStatus = ref<'idle' | 'checking' | 'exists' | 'not_found' | 'auth_error'>('idle');

  const canClone = computed(() =>
    !!(config.value.githubUsername && config.value.githubToken && cloneRepoName.value.trim())
  );

  function resetRepoCheck() {
    repoCheckStatus.value = 'idle';
  }

  async function checkRepo() {
    const name = cloneRepoName.value.trim();
    if (!name || !config.value.githubUsername || !config.value.githubToken) return;
    repoCheckStatus.value = 'checking';
    const result = await checkRepoExists(config.value.githubUsername, config.value.githubToken, name);
    repoCheckStatus.value = result;
    if (result === 'auth_error') {
      ElMessage({ message: t('github.authFailed'), type: 'error' });
    }
  }

  const cloneTargetPath = computed(() => {
    const repoName = cloneRepoName.value || 'repo-name';
    const root = ttsStore.notestore.currentStore;
    return cloneMode.value === 'multi'
      ? `${root}/repos/${repoName}`
      : `${root}/${repoName}`;
  });

  async function cloneRepo() {
    if (!canClone.value) return;
    const repoName = cloneRepoName.value.trim();

    // Warn if switching to multi mode and root has non-repos/ content
    if (cloneMode.value === 'multi') {
      const reposPath = join(ttsStore.notestore.currentStore, defaultConf.defaultRepoPath);
      if (!fs.existsSync(reposPath)) {
        const items = fs.readdirSync(ttsStore.notestore.currentStore).filter((f: string) => !f.startsWith('.'));
        if (items.length > 0) {
          try {
            await ElMessageBox.confirm(
              t('settings.cloneMultiModeWarning'),
              t('common.confirm'),
              { confirmButtonText: t('common.ok'), cancelButtonText: t('common.cancel'), type: 'warning' }
            );
          } catch { return; }
        }
      }
    }

    cloning.value = true;
    try {
      const success = await addRemoteRepo(t, repoName, newRemoteRepoPrivate.value, cloneMode.value);
      if (success) {
        cloneRepoName.value = '';
        repoCheckStatus.value = 'idle';
        buildNotebookOptions();
        ElMessage({ message: t('github.cloneSuccess'), type: 'success' });
        if (cloneMode.value === 'multi') {
          const githubNotebook = { value: repoName, label: repoName, type: 'github', rootDir: ttsStore.notestore.currentStore };
          saveHander(githubNotebook);
        } else {
          ttsStore.refreshTreeData();
        }
      } else {
        ElMessage({ message: t('github.cloneFailed'), type: 'error' });
      }
    } finally {
      cloning.value = false;
    }
  }

  // Notebook options — computed lazily only when drawer opens, not reactive to every store change
  const notebookOptions = ref<{ label: string; options: any[] }[]>([]);

  function buildNotebookOptions() {
    const groups: { label: string; options: any[] }[] = [];
    for (const rootDir of ttsStore.notestore.rootStores) {
      const reposPath = join(rootDir, defaultConf.defaultRepoPath);
      const hasRepos = fs.existsSync(reposPath) && fs.statSync(reposPath).isDirectory();
      const dirName = rootDir.split('/').pop() || rootDir;
      if (hasRepos) {
        const allNotebooks = readOneDir(reposPath);
        if (allNotebooks.length === 0) continue;
        groups.push({ label: dirName, options: allNotebooks.map((nb: any) => ({ ...nb, rootDir })) });
      } else {
        groups.push({
          label: dirName,
          options: [{ label: dirName, value: dirName, path: rootDir, type: 'direct', rootDir }],
        });
      }
    }
    notebookOptions.value = groups;
  }

  function onDrawerOpen() {
    buildNotebookOptions();
  }

  const isMultiMode = computed(() => {
    const reposPath = join(ttsStore.notestore.currentStore, defaultConf.defaultRepoPath);
    return fs.existsSync(reposPath);
  });

  const isInGitRepo = computed(() => {
    const lastPath = cnote.value.lastPath;
    if (!lastPath) return false;
    return isFileInGitRepo(lastPath);
  });

  function openGitInstallPage() {
    const { shell } = require('electron');
    shell.openExternal('https://git-scm.com/downloads');
  }

  const refreshTree = () => {
    refreshing.value = true;
    ttsStore.refreshTreeData();
    setTimeout(() => { refreshing.value = false; }, 600);
  };

  const openDialog = () => {
    ipcRenderer.removeAllListeners('selected-directory');
    ipcRenderer.send('open-dialog');
    ipcRenderer.once('selected-directory', (event, path) => {
      config.value.savePath = path[0];
      ttsStore.notestore.currentStore = path[0];
      ttsStore.addRootStore(path[0]);
      ttsStore.notebook.currentPath = join(path[0], defaultConf.defaultRepoPath, defaultConf.defaultRepoName);
      ttsStore.settings.defaultNotePath = join(path[0], defaultConf.defaultRepoPath, defaultConf.defaultRepoName);
      buildNotebookOptions();
    });
  };

  function popHandler() {
    ttsStore.config.drawer = true;
  }

  function saveGitHubConfig() {
    ttsStore.setLocalNotePath();
    ElMessage({ message: t('settings.saveSuccess'), type: 'success' });
  }

  function addRootStore() {
    ipcRenderer.removeAllListeners('selected-directory');
    ipcRenderer.send('open-dialog');
    ipcRenderer.once('selected-directory', (_event: any, paths: string[]) => {
      if (paths && paths[0]) {
        ttsStore.addRootStore(paths[0]);
        buildNotebookOptions();
        ElMessage({ message: '根目录已添加', type: 'success' });
      }
    });
  }

  function removeRootStore(dirPath: string) {
    ttsStore.removeRootStore(dirPath);
    buildNotebookOptions();
    ElMessage({ message: '根目录已移除', type: 'success' });
  }

  function switchRootStore(dirPath: string) {
    ttsStore.setActiveStore(dirPath);
    const reposPath = join(dirPath, defaultConf.defaultRepoPath);
    const hasRepos = fs.existsSync(reposPath) && fs.statSync(reposPath).isDirectory();
    if (!hasRepos) {
      ttsStore.notebook.currentPath = dirPath;
      ttsStore.setNoteBookConfig();
    }
    ttsStore.refreshTreeData();
    ElMessage({ message: `已切换到：${dirPath.split('/').pop()}`, type: 'success' });
  }

  const handleCommand = () => {
    dialogFormVisible.value = true;
  }

  const changeLanguage = (lang: string) => {
    locale.value = lang;
    ttsStore.setLanguage(lang);
    ElMessage({ message: t('settings.languageSwitched'), type: 'success' });
  }

  const handleGit = async (command: string) => {
    if (command === 'pull') await gitPull(t);
    else if (command === 'push') await gitHubPush(t);
    else ElMessage("Do nothing");
  }

  const addRootFolder = () => {
    const foldername = rootFolderName.value.trim();
    if (!foldername) return;
    try {
      fs.mkdirSync(join(ttsStore.notebook.currentPath, foldername));
      rootFolderName.value = '';
      dialogFormVisible.value = false;
      ttsStore.refreshTreeData();
      ElMessage({ message: t('dialog.folderCreated'), type: 'success' });
    } catch (error) {
      ElMessage({ message: error as string, grouping: true, type: 'error' });
    }
  }

  async function saveHander(value: any) {
    ttsStore.settings.currentbook = value;
    if (value.rootDir && value.rootDir !== ttsStore.notestore.currentStore) {
      ttsStore.setActiveStore(value.rootDir);
    }
    const newPath = value.type === 'direct'
      ? value.rootDir
      : join(value.rootDir || ttsStore.notestore.currentStore, defaultConf.defaultRepoPath, value.value);
    ttsStore.notebook.currentPath = newPath;
    ttsStore.notebook.bookType = value.type;
    ttsStore.setNoteBookConfig();

    if (value.type === 'github') await gitPull(t, ttsStore.notebook.currentPath);

    ttsStore.refreshTreeData();
    ttsStore.config.needUpdateTree = true;
    ttsStore.startGitStatusCheck();

    ElMessage({ message: t('settings.notebookSwitched', { name: value.label }), type: 'success' });
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

.circle-btn {
  width: 25px;
  height: 25px;
  border-radius: 50% !important;
  border: none;
  margin-top: 10px;
  background-color: gray;
}

.spinning {
  animation: spin 0.6s linear;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

:deep(.el-form-item__label) {
  font-weight: 600;
}


.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  padding: 0 0 8px 0;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 12px;
}
</style>
