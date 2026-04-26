<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? task.name : t('scheduler.newTask')"
    width="520px"
    @close="handleClose"
  >
    <el-form :model="task" label-width="110px" size="small">
      <!-- Name -->
      <el-form-item :label="t('scheduler.taskName')" required>
        <el-input v-model="task.name" :placeholder="t('scheduler.taskNamePlaceholder')" />
      </el-form-item>

      <!-- Schedule mode -->
      <el-form-item :label="t('scheduler.schedule')">
        <el-radio-group v-model="task.schedule.mode">
          <el-radio value="simple">{{ t('scheduler.simple') }}</el-radio>
          <el-radio value="cron">{{ t('scheduler.cron') }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- Simple mode -->
      <template v-if="task.schedule.mode === 'simple'">
        <el-form-item :label="t('scheduler.frequency')">
          <el-select v-model="task.schedule.frequency" style="width:120px">
            <el-option value="daily" :label="t('scheduler.daily')" />
            <el-option value="weekly" :label="t('scheduler.weekly')" />
            <el-option value="monthly" :label="t('scheduler.monthly')" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('scheduler.time')">
          <el-time-picker v-model="timeDate" format="HH:mm" value-format="HH:mm" style="width:120px" />
        </el-form-item>
        <el-form-item v-if="task.schedule.frequency === 'weekly'" :label="t('scheduler.weekday')">
          <el-select v-model="task.schedule.weekday" style="width:120px">
            <el-option v-for="(d, i) in weekdays" :key="i" :value="i" :label="d" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="task.schedule.frequency === 'monthly'" :label="t('scheduler.dayOfMonth')">
          <el-input-number v-model="task.schedule.day" :min="1" :max="31" style="width:120px" />
        </el-form-item>
      </template>

      <!-- Cron mode -->
      <template v-else>
        <el-form-item :label="t('scheduler.cronExpression')">
          <el-input v-model="task.schedule.cron" placeholder="0 9 * * *" @blur="validateCron" />
          <div v-if="cronError" style="color:#f56c6c;font-size:12px;margin-top:4px">{{ t('scheduler.cronInvalid') }}</div>
        </el-form-item>
      </template>

      <!-- Task type -->
      <el-form-item :label="t('scheduler.taskType')">
        <el-radio-group v-model="task.type">
          <el-radio value="shell">{{ t('scheduler.shell') }}</el-radio>
          <el-radio value="builtin">{{ t('scheduler.builtin') }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- Shell fields -->
      <template v-if="task.type === 'shell'">
        <el-form-item :label="t('scheduler.command')" required>
          <el-input v-model="task.command" placeholder="e.g. python script.py" />
        </el-form-item>
        <el-form-item :label="t('scheduler.workdir')">
          <el-input v-model="task.workdir" :placeholder="t('scheduler.workdirPlaceholder')" />
        </el-form-item>
      </template>

      <!-- Builtin fields -->
      <template v-else>
        <el-form-item :label="t('scheduler.action')">
          <el-select v-model="task.action" style="width:160px">
            <el-option value="git-pull" :label="t('scheduler.gitPull')" />
            <el-option value="git-push" :label="t('scheduler.gitPush')" />
            <el-option value="refresh-tree" :label="t('scheduler.refreshTree')" />
          </el-select>
        </el-form-item>
      </template>

      <!-- Retry -->
      <el-form-item :label="t('scheduler.retry')">
        <el-input-number v-model="task.retry.maxAttempts" :min="1" :max="10" style="width:80px" />
        <span style="margin:0 8px;font-size:12px;color:#909399">{{ t('scheduler.maxAttempts') }}</span>
        <el-input-number v-model="task.retry.delaySeconds" :min="10" :max="3600" style="width:100px" />
        <span style="margin-left:8px;font-size:12px;color:#909399">{{ t('scheduler.delaySeconds') }}</span>
      </el-form-item>

      <!-- Enabled -->
      <el-form-item :label="t('scheduler.enabled')">
        <el-checkbox v-model="task.enabled" />
      </el-form-item>

      <!-- Logs (edit mode only) -->
      <el-form-item v-if="isEdit" :label="t('scheduler.logs')">
        <div class="task-logs">
          <div v-if="!logs.length" class="logs-empty">{{ t('scheduler.noLogs') }}</div>
          <div v-for="(log, i) in logs" :key="i" class="log-entry" @click="toggleLog(i)">
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            <span class="log-status" :class="'log-' + log.status">{{ log.status }}</span>
            <span class="log-output">{{ expanded.has(i) ? log.output : log.output.split('\n')[0] }}</span>
          </div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :disabled="!canSave" @click="handleSave">{{ t('common.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ipcRenderer } from 'electron'
import { SchedulerTask, TaskResult, simpleToCron } from '@/types/scheduler'
import { v4 as uuidv4 } from 'uuid'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  initialTask?: SchedulerTask | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'saved', task: SchedulerTask): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isEdit = computed(() => !!props.initialTask?.id)

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function defaultTask(): SchedulerTask {
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

const task = ref<SchedulerTask>(defaultTask())
const cronError = ref(false)
const logs = ref<TaskResult[]>([])
const expanded = ref(new Set<number>())

// timeDate is a proxy for task.schedule.time used by el-time-picker
const timeDate = computed({
  get: () => task.value.schedule.time || '09:00',
  set: (v: string) => { task.value.schedule.time = v },
})

watch(() => props.modelValue, (open) => {
  if (open) {
    task.value = props.initialTask ? { ...props.initialTask, schedule: { ...props.initialTask.schedule } } : defaultTask()
    cronError.value = false
    logs.value = []
    expanded.value = new Set()
    if (isEdit.value) loadLogs()
  }
})

async function loadLogs() {
  // Logs come from task-result events; for now show last results from store via list
  const tasks: SchedulerTask[] = await ipcRenderer.invoke('scheduler:list')
  const found = tasks.find(t => t.id === task.value.id)
  if (found?.lastRun) {
    logs.value = [{
      id: found.id,
      status: found.lastStatus === 'success' ? 'success' : 'error',
      output: found.lastError || '',
      error: found.lastError,
      timestamp: found.lastRun,
    }]
  }
}

function validateCron() {
  if (task.value.schedule.mode !== 'cron') return
  const expr = task.value.schedule.cron || ''
  // Basic 5-field cron validation: each field non-empty
  const parts = expr.trim().split(/\s+/)
  cronError.value = parts.length !== 5
}

const canSave = computed(() => {
  if (!task.value.name.trim()) return false
  if (task.value.schedule.mode === 'cron') {
    const parts = (task.value.schedule.cron || '').trim().split(/\s+/)
    if (parts.length !== 5) return false
  }
  if (task.value.type === 'shell' && !task.value.command?.trim()) return false
  return true
})

async function handleSave() {
  const toSave: SchedulerTask = { ...task.value, schedule: { ...task.value.schedule } }
  if (!toSave.id) toSave.id = uuidv4()
  // Convert simple mode to cron
  if (toSave.schedule.mode === 'simple') {
    toSave.schedule.cron = simpleToCron(toSave)
  }
  const saved: SchedulerTask = await ipcRenderer.invoke('scheduler:save', toSave)
  emit('saved', saved)
  emit('update:modelValue', false)
}

function handleClose() {
  emit('update:modelValue', false)
}

function toggleLog(i: number) {
  if (expanded.value.has(i)) expanded.value.delete(i)
  else expanded.value.add(i)
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString()
}
</script>

<style scoped>
.task-logs {
  max-height: 200px;
  overflow-y: auto;
  width: 100%;
  font-size: 12px;
}
.logs-empty {
  color: #909399;
  padding: 8px 0;
}
.log-entry {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  align-items: flex-start;
}
.log-time {
  color: #909399;
  white-space: nowrap;
  flex-shrink: 0;
}
.log-status {
  font-weight: 600;
  flex-shrink: 0;
}
.log-success { color: #67c23a; }
.log-error { color: #f56c6c; }
.log-skipped { color: #e6a23c; }
.log-output {
  color: #606266;
  word-break: break-all;
}
</style>
