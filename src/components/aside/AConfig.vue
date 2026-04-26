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

            <!-- Git 平台选择 -->
            <div class="section-title">{{ t('settings.gitAccount') }}</div>
            <el-form :model="config" label-width="120px" label-position="top">
              <el-form-item :label="t('settings.gitProvider')">
                <el-select
                  v-model="config.gitProvider"
                  style="width: 160px;"
                  @change="saveGitHubConfig"
                >
                  <el-option label="GitHub" value="github" />
                  <el-option label="Gitee" value="gitee" />
                </el-select>
              </el-form-item>

              <!-- GitHub 配置 -->
              <template v-if="config.gitProvider === 'github'">
                <el-form-item :label="t('settings.githubUsername')">
                  <el-input v-model="config.githubUsername" :placeholder="t('settings.githubUsernamePlaceholder')" @change="saveGitHubConfig" />
                </el-form-item>
                <el-form-item :label="t('settings.githubToken')">
                  <el-input v-model="config.githubToken" type="password" show-password :placeholder="t('settings.githubTokenPlaceholder')" @change="saveGitHubConfig" />
                </el-form-item>
              </template>

              <!-- Gitee 配置 -->
              <template v-else>
                <el-form-item :label="t('settings.giteeUsername')">
                  <el-input v-model="config.giteeUsername" :placeholder="t('settings.giteeUsernamePlaceholder')" @change="saveGitHubConfig" />
                </el-form-item>
                <el-form-item :label="t('settings.giteeToken')">
                  <el-input v-model="config.giteeToken" type="password" show-password :placeholder="t('settings.giteeTokenPlaceholder')" @change="saveGitHubConfig" />
                </el-form-item>
              </template>
            </el-form>

            <!-- 添加远程仓库（自动判断创建或克隆） -->
            <div class="section-title" style="margin-top: 16px;">{{ t('settings.addRemoteRepo') }}</div>
            <el-form label-width="120px" label-position="top">
              <el-form-item :label="t('settings.repoName')">
                <el-input
                  v-model="cloneRepoName"
                  :placeholder="t('settings.repoPlaceholder')"
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

          <!-- Tab 4: 定时任务 -->
          <el-tab-pane :label="t('scheduler.title')">
            <div class="scheduler-tab" style="-webkit-app-region: no-drag">
              <!-- 任务列表 -->
              <div v-if="!schedulerTasks.length" class="scheduler-tab-empty">
                {{ t('scheduler.empty') }}
              </div>
              <div v-else class="scheduler-task-list">
                <div
                  v-for="item in schedulerTasks"
                  :key="item.id"
                  class="scheduler-task-item"
                  :class="{ 'is-editing': editingTaskId === item.id }"
                  @click="editTask(item)"
                >
                  <span class="s-dot" :class="dotClass(item)"></span>
                  <span class="s-name">{{ item.name }}</span>
                  <span class="s-cron">{{ item.schedule.cron || '—' }}</span>
                  <div class="s-actions" @click.stop>
                    <button class="s-btn" @click="runTaskNow(item)" :title="t('scheduler.runNow')">▶</button>
                    <button class="s-btn s-btn-danger" @click="removeTask(item)" :title="t('scheduler.delete')">✕</button>
                  </div>
                </div>
              </div>

              <!-- 新建/编辑表单 -->
              <div class="scheduler-form-header">
                <span>{{ editingTaskId ? t('scheduler.editTask') : t('scheduler.newTask') }}</span>
                <el-button v-if="editingTaskId" size="small" link @click="cancelEdit">{{ t('common.cancel') }}</el-button>
              </div>
              <el-form :model="taskForm" label-width="90px" label-position="top" size="small" class="scheduler-form">
                <el-form-item :label="t('scheduler.taskName')">
                  <el-input v-model="taskForm.name" :placeholder="t('scheduler.taskNamePlaceholder')" />
                </el-form-item>
                <el-form-item :label="t('scheduler.schedule')">
                  <el-select v-model="taskForm.schedule.mode" style="width:120px">
                    <el-option value="simple" :label="t('scheduler.simple')" />
                    <el-option value="cron" :label="t('scheduler.cron')" />
                  </el-select>
                </el-form-item>
                <template v-if="taskForm.schedule.mode === 'simple'">
                  <el-form-item :label="t('scheduler.frequency')">
                    <el-select v-model="taskForm.schedule.frequency" style="width:110px">
                      <el-option value="daily" :label="t('scheduler.daily')" />
                      <el-option value="weekly" :label="t('scheduler.weekly')" />
                      <el-option value="monthly" :label="t('scheduler.monthly')" />
                    </el-select>
                  </el-form-item>
                  <el-form-item :label="t('scheduler.time')">
                    <el-input v-model="taskFormTime" placeholder="09:00" style="width:100px" />
                  </el-form-item>
                  <el-form-item v-if="taskForm.schedule.frequency === 'weekly'" :label="t('scheduler.weekday')">
                    <el-select v-model="taskForm.schedule.weekday" style="width:110px">
                      <el-option v-for="(d,i) in weekdays" :key="i" :value="i" :label="d" />
                    </el-select>
                  </el-form-item>
                  <el-form-item v-if="taskForm.schedule.frequency === 'monthly'" :label="t('scheduler.dayOfMonth')">
                    <el-input-number v-model="taskForm.schedule.day" :min="1" :max="31" style="width:100px" />
                  </el-form-item>
                </template>
                <template v-else>
                  <el-form-item :label="t('scheduler.cronExpression')">
                    <el-input v-model="taskForm.schedule.cron" placeholder="0 9 * * *" @blur="validateTaskCron" />
                    <div v-if="cronError" style="color:#f56c6c;font-size:12px;margin-top:2px">{{ t('scheduler.cronInvalid') }}</div>
                  </el-form-item>
                </template>
                <el-form-item :label="t('scheduler.taskType')">
                  <el-select v-model="taskForm.type" style="width:140px">
                    <el-option value="shell" :label="t('scheduler.shell')" />
                    <el-option value="builtin" :label="t('scheduler.builtin')" />
                  </el-select>
                </el-form-item>
                <template v-if="taskForm.type === 'shell'">
                  <el-form-item :label="t('scheduler.command')">
                    <el-input v-model="taskForm.command" placeholder="e.g. python script.py" />
                  </el-form-item>
                  <el-form-item :label="t('scheduler.workdir')">
                    <el-input v-model="taskForm.workdir" :placeholder="t('scheduler.workdirPlaceholder')" />
                  </el-form-item>
                </template>
                <template v-else>
                  <el-form-item :label="t('scheduler.action')">
                    <el-select v-model="taskForm.action" style="width:160px">
                      <el-option value="git-pull" :label="t('scheduler.gitPull')" />
                      <el-option value="git-push" :label="t('scheduler.gitPush')" />
                      <el-option value="refresh-tree" :label="t('scheduler.refreshTree')" />
                    </el-select>
                  </el-form-item>
                </template>
                <el-form-item :label="t('scheduler.retry')">
                  <el-input-number v-model="taskForm.retry.maxAttempts" :min="1" :max="10" style="width:70px" />
                  <span style="margin:0 6px;font-size:12px;color:#909399">{{ t('scheduler.maxAttempts') }}</span>
                  <el-input-number v-model="taskForm.retry.delaySeconds" :min="10" :max="3600" style="width:90px" />
                  <span style="margin-left:6px;font-size:12px;color:#909399">s</span>
                </el-form-item>
                <el-form-item :label="t('scheduler.enabled')">
                  <div style="display:flex;align-items:center;gap:10px;-webkit-app-region:no-drag">
                    <el-switch v-model="taskForm.enabled" />
                  </div>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :disabled="!canSaveTask" @click="saveTask">{{ t('common.save') }}</el-button>
                </el-form-item>
              </el-form>
            </div>
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
          <div v-if="currentNotebookIsGit" style="margin-top: 16px; padding: 12px; background: #ecf5ff; border-radius: 4px; border-left: 4px solid #409eff; font-size: 13px; color: #606266;">
            ℹ️ {{ t('dialog.notebookAlreadyGit') }}
          </div>
          <template v-else>
          <el-form style="margin-top: 12px;">
            <el-form-item :label="t('settings.repoName')" :label-width="formLabelWidth">
              <el-input v-model="dialogCloneRepoName" autocomplete="off" :placeholder="t('settings.repoPlaceholder')" />
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
          </template>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue'
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
  import { SchedulerTask, simpleToCron } from '@/types/scheduler';
  import { v4 as uuidv4 } from 'uuid';

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
    const isGitee = config.value.gitProvider === 'gitee';
    const checkUsername = isGitee ? config.value.giteeUsername : config.value.githubUsername;
    const checkToken = isGitee ? config.value.giteeToken : config.value.githubToken;
    const result = await checkRepoExists(checkUsername, checkToken, name, config.value.gitProvider || 'github');
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

  const currentNotebookIsGit = computed(() => {
    const gitPath = join(ttsStore.notebook.currentPath, '.git');
    return fs.existsSync(gitPath);
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

  // ── Scheduler ────────────────────────────────────────────────────────────────

  const schedulerTasks = ref<SchedulerTask[]>([])
  const editingTaskId = ref<string | null>(null)
  const cronError = ref(false)
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  function defaultTaskForm(): SchedulerTask {
    return {
      id: '',
      name: '',
      enabled: true,
      schedule: { mode: 'simple', frequency: 'daily', time: '09:00' },
      type: 'shell',
      command: '',
      workdir: '',
      action: 'git-pull',
      retry: { maxAttempts: 3, delaySeconds: 60 },
    }
  }

  const taskForm = ref<SchedulerTask>(defaultTaskForm())

  const taskFormTime = computed({
    get: () => taskForm.value.schedule.time || '09:00',
    set: (v: string) => { taskForm.value.schedule.time = v },
  })

  async function loadSchedulerTasks() {
    schedulerTasks.value = await ipcRenderer.invoke('scheduler:list')
  }

  function editTask(item: SchedulerTask) {
    editingTaskId.value = item.id
    taskForm.value = { ...item, schedule: { ...item.schedule } }
    cronError.value = false
  }

  function cancelEdit() {
    editingTaskId.value = null
    taskForm.value = defaultTaskForm()
    cronError.value = false
  }

  function isValidCron(expr: string): boolean {
    const parts = expr.trim().split(/\s+/)
    if (parts.length !== 5) return false
    const ranges = [[0,59],[0,23],[1,31],[1,12],[0,7]]
    return parts.every((part, i) => {
      if (part === '*') return true
      if (/^\*\/\d+$/.test(part)) return true
      const [min, max] = ranges[i]
      return part.split(',').every(seg => {
        const r = seg.split('-')
        return r.every(n => { const num = parseInt(n,10); return !isNaN(num) && num >= min && num <= max })
      })
    })
  }

  function validateTaskCron() {
    if (taskForm.value.schedule.mode !== 'cron') return
    cronError.value = !isValidCron(taskForm.value.schedule.cron || '')
  }

  const canSaveTask = computed(() => {
    if (!taskForm.value.name.trim()) return false
    if (taskForm.value.schedule.mode === 'cron' && !isValidCron(taskForm.value.schedule.cron || '')) return false
    if (taskForm.value.type === 'shell' && !taskForm.value.command?.trim()) return false
    return true
  })

  async function saveTask() {
    // JSON round-trip strips Vue reactive proxies so IPC structured clone works
    const toSave: SchedulerTask = JSON.parse(JSON.stringify(taskForm.value))
    if (!toSave.id) toSave.id = uuidv4()
    if (toSave.schedule.mode === 'simple') toSave.schedule.cron = simpleToCron(toSave)
    await ipcRenderer.invoke('scheduler:save', toSave)
    ipcRenderer.send('scheduler:tasks-changed')
    await loadSchedulerTasks()
    cancelEdit()
    ElMessage({ message: t('common.save') + ' ✓', type: 'success' })
  }

  async function runTaskNow(item: SchedulerTask) {
    await ipcRenderer.invoke('scheduler:run-now', { id: item.id })
  }

  async function removeTask(item: SchedulerTask) {
    try {
      await ElMessageBox.confirm(
        t('scheduler.confirmDelete', { name: item.name }),
        t('common.delete'),
        { confirmButtonText: t('common.ok'), cancelButtonText: t('common.cancel'), type: 'warning' }
      )
    } catch { return }
    await ipcRenderer.invoke('scheduler:delete', { id: item.id })
    ipcRenderer.send('scheduler:tasks-changed')
    await loadSchedulerTasks()
    if (editingTaskId.value === item.id) cancelEdit()
  }

  function dotClass(item: SchedulerTask) {
    if (!item.enabled) return 'dot-grey'
    if (item.lastStatus === 'running') return 'dot-yellow'
    if (item.lastStatus === 'error') return 'dot-red'
    if (item.lastStatus === 'success') return 'dot-green'
    return 'dot-blue'
  }

  // Load tasks when drawer opens
  watch(() => config.value.drawer, (open) => {
    if (open) loadSchedulerTasks()
  })

  // ── End Scheduler ─────────────────────────────────────────────────────────────

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

/* Scheduler tab */
.scheduler-tab { display: flex; flex-direction: column; gap: 12px; }
.scheduler-tab-empty { font-size: 12px; color: #909399; padding: 8px 0; }
.scheduler-task-list { display: flex; flex-direction: column; gap: 2px; margin-bottom: 4px; }
.scheduler-task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  border: 1px solid transparent;
}
.scheduler-task-item:hover { background: #f5f7fa; }
.scheduler-task-item.is-editing { background: #ecf5ff; border-color: #b3d8ff; }
.s-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot-grey { background: #909399; }
.dot-green { background: #67c23a; }
.dot-red { background: #f56c6c; }
.dot-yellow { background: #e6a23c; }
.dot-blue { background: #409eff; }
.s-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #303133; }
.s-cron { font-size: 11px; color: #909399; white-space: nowrap; max-width: 100px; overflow: hidden; text-overflow: ellipsis; }
.s-actions { display: flex; gap: 2px; }
.s-btn {
  width: 20px; height: 20px; border: none; background: transparent;
  cursor: pointer; font-size: 11px; color: #909399; border-radius: 3px;
  display: flex; align-items: center; justify-content: center; padding: 0;
}
.s-btn:hover { background: rgba(0,0,0,0.06); color: #409eff; }
.s-btn-danger:hover { color: #f56c6c; }
.scheduler-form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  padding: 6px 0 4px;
  border-top: 1px solid #ebeef5;
}
.scheduler-form { margin-top: 4px; }
</style>
