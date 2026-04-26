<template>
  <div class="scheduler-panel">
    <div class="scheduler-header">
      <span class="scheduler-title">{{ t('scheduler.title') }}</span>
      <button class="add-btn" @click="openCreate" title="New task">+</button>
    </div>

    <div v-if="!tasks.length" class="scheduler-empty">
      {{ t('scheduler.empty') }}
    </div>

    <div v-else class="task-list">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="task-row"
        @click="openEdit(task)"
      >
        <span class="status-dot" :class="dotClass(task)" :title="dotTitle(task)"></span>
        <span class="task-name">{{ task.name }}</span>
        <span class="task-next">{{ nextRunLabel(task) }}</span>
        <span class="task-actions" @click.stop>
          <button class="action-btn" @click="runNow(task)" :title="t('scheduler.runNow')">▶</button>
          <button class="action-btn danger" @click="deleteTask(task)" :title="t('scheduler.delete')">✕</button>
        </span>
      </div>
    </div>

    <TaskDialog
      v-model="dialogVisible"
      :initial-task="editingTask"
      @saved="onSaved"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { ipcRenderer } from 'electron'
import { ElMessageBox } from 'element-plus'
import { SchedulerTask, TaskResult } from '@/types/scheduler'
import TaskDialog from '@/components/scheduler/TaskDialog.vue'
import { useTtsStore } from '@/store/store'

const { t } = useI18n()
const ttsStore = useTtsStore()

const tasks = ref<SchedulerTask[]>([])
const dialogVisible = ref(false)
const editingTask = ref<SchedulerTask | null>(null)

async function loadTasks() {
  tasks.value = await ipcRenderer.invoke('scheduler:list')
}

function openCreate() {
  editingTask.value = null
  dialogVisible.value = true
}

function openEdit(task: SchedulerTask) {
  editingTask.value = task
  dialogVisible.value = true
}

async function runNow(task: SchedulerTask) {
  await ipcRenderer.invoke('scheduler:run-now', { id: task.id })
}

async function deleteTask(task: SchedulerTask) {
  await ElMessageBox.confirm(
    t('scheduler.confirmDelete', { name: task.name }),
    t('common.delete'),
    { confirmButtonText: t('common.ok'), cancelButtonText: t('common.cancel'), type: 'warning' }
  )
  await ipcRenderer.invoke('scheduler:delete', { id: task.id })
  await loadTasks()
}

function onSaved(saved: SchedulerTask) {
  const idx = tasks.value.findIndex(t => t.id === saved.id)
  if (idx >= 0) tasks.value[idx] = saved
  else tasks.value.push(saved)
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
  return task.lastStatus ? t(`scheduler.status${task.lastStatus.charAt(0).toUpperCase() + task.lastStatus.slice(1)}`) : t('scheduler.never')
}

function nextRunLabel(task: SchedulerTask) {
  if (!task.enabled || !task.schedule.cron) return '—'
  return task.schedule.cron
}

// Handle task-result updates from main process
function onTaskResult(_event: any, result: TaskResult) {
  const task = tasks.value.find(t => t.id === result.id)
  if (task) {
    task.lastStatus = result.status
    task.lastRun = result.timestamp
    task.lastError = result.error
  }
}

// Handle builtin actions requested by scheduler
function onBuiltinAction(_event: any, action: string) {
  const { gitHubPull, gitHubPush } = require('@/libs/github')
  if (action === 'git-pull') {
    gitHubPull(t, ttsStore.notebook.currentPath).then((ok: boolean) => {
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
})

onBeforeUnmount(() => {
  ipcRenderer.removeListener('task-result', onTaskResult)
  ipcRenderer.removeListener('scheduler:builtin-action', onBuiltinAction)
  ipcRenderer.removeListener('scheduler:refresh-tree', onRefreshTree)
})
</script>

<style scoped>
.scheduler-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
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
.add-btn {
  width: 22px;
  height: 22px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.add-btn:hover { background: #ecf5ff; }
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
  gap: 6px;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 12px;
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
.task-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
}
.task-next {
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
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
.action-btn.danger:hover { color: #f56c6c; }
</style>
