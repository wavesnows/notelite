<template>
  <div class="scheduler-panel">
    <div class="scheduler-header">
      <span class="scheduler-title">{{ t('scheduler.title') }}</span>
      <button class="settings-btn" @click="openSettings" :title="t('settings.title')">⚙︎</button>
    </div>

    <div v-if="!tasks.length" class="scheduler-empty">
      {{ t('scheduler.empty') }}
    </div>

    <div v-else class="task-list">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="task-row"
        @click="openSettings"
      >
        <span class="status-dot" :class="dotClass(task)" :title="dotTitle(task)"></span>
        <div class="task-info">
          <span class="task-name">{{ task.name }}</span>
          <span class="task-meta">{{ lastRunLabel(task) }}</span>
        </div>
        <span class="task-actions" @click.stop>
          <button class="action-btn" @click="runNow(task)" :title="t('scheduler.runNow')">▶</button>
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { ipcRenderer } from 'electron'
import { SchedulerTask, TaskResult } from '@/types/scheduler'
import { useTtsStore } from '@/store/store'
import { gitPull, gitHubPush } from '@/libs/github'

const { t } = useI18n()
const ttsStore = useTtsStore()

const tasks = ref<SchedulerTask[]>([])

async function loadTasks() {
  tasks.value = await ipcRenderer.invoke('scheduler:list')
}

function openSettings() {
  ttsStore.config.drawer = true
}

async function runNow(task: SchedulerTask) {
  await ipcRenderer.invoke('scheduler:run-now', { id: task.id })
}

function dotClass(task: SchedulerTask) {
  if (!task.enabled) return 'dot-grey'
  if (task.lastStatus === 'running') return 'dot-yellow'
  if (task.lastStatus === 'error') return 'dot-red'
  if (task.lastStatus === 'success') return 'dot-green'
  return 'dot-blue'
}

function dotTitle(task: SchedulerTask) {
  if (!task.enabled) return t('scheduler.statusDisabled')
  return task.lastStatus
    ? t(`scheduler.status${task.lastStatus.charAt(0).toUpperCase() + task.lastStatus.slice(1)}`)
    : t('scheduler.never')
}

function lastRunLabel(task: SchedulerTask) {
  if (!task.enabled) return t('scheduler.statusDisabled')
  if (!task.lastRun) return t('scheduler.never')
  const date = new Date(task.lastRun)
  const now = Date.now()
  const diff = now - task.lastRun
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return date.toLocaleDateString()
}

function onTaskResult(_event: any, result: TaskResult) {
  const task = tasks.value.find(t => t.id === result.id)
  if (task) {
    task.lastStatus = result.status
    task.lastRun = result.timestamp
    task.lastError = result.error
  }
}

function onBuiltinAction(_event: any, action: string) {
  if (action === 'git-pull') {
    gitPull(t, ttsStore.notebook.currentPath).then((ok: boolean) => {
      ipcRenderer.send(`scheduler:builtin-result:git-pull`, { output: ok ? 'pulled' : '', error: ok ? undefined : 'pull failed' })
      if (ok) ttsStore.refreshTreeData()
    }).catch((e: any) => {
      ipcRenderer.send(`scheduler:builtin-result:git-pull`, { output: '', error: e.message })
    })
  } else if (action === 'git-push') {
    gitHubPush(t).then((ok: boolean) => {
      ipcRenderer.send(`scheduler:builtin-result:git-push`, { output: ok ? 'pushed' : '', error: ok ? undefined : 'push failed' })
    }).catch((e: any) => {
      ipcRenderer.send(`scheduler:builtin-result:git-push`, { output: '', error: e.message })
    })
  }
}

function onRefreshTree() {
  ttsStore.refreshTreeData()
}

onMounted(() => {
  loadTasks()
  ipcRenderer.on('task-result', onTaskResult)
  ipcRenderer.on('scheduler:builtin-action', onBuiltinAction)
  ipcRenderer.on('scheduler:refresh-tree', onRefreshTree)
  ipcRenderer.on('scheduler:tasks-changed', loadTasks)
})

onBeforeUnmount(() => {
  ipcRenderer.removeListener('task-result', onTaskResult)
  ipcRenderer.removeListener('scheduler:builtin-action', onBuiltinAction)
  ipcRenderer.removeListener('scheduler:refresh-tree', onRefreshTree)
  ipcRenderer.removeListener('scheduler:tasks-changed', loadTasks)
})
</script>

<style scoped>
.scheduler-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.scheduler-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 6px;
  flex-shrink: 0;
}
.scheduler-title {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.settings-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.settings-btn:hover { background: rgba(0,0,0,0.06); color: #409eff; }
.scheduler-empty {
  padding: 16px 12px;
  font-size: 12px;
  color: #909399;
  text-align: center;
}
.task-list { flex: 1; overflow-y: auto; }
.task-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  cursor: pointer;
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
.task-row:hover { background: rgba(0,0,0,0.03); }
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-grey { background: #909399; }
.dot-green { background: #67c23a; }
.dot-red { background: #f56c6c; }
.dot-yellow { background: #e6a23c; }
.dot-blue { background: #409eff; }
.task-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.task-name {
  font-size: 12px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-meta {
  font-size: 11px;
  color: #909399;
}
.task-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.task-row:hover .task-actions { opacity: 1; }
.action-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 11px;
  color: #909399;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-btn:hover { background: rgba(0,0,0,0.06); color: #409eff; }
</style>
