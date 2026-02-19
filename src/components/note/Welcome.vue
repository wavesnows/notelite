<template>
  <div class="welcome-container">
    <div class="welcome-content">
      <div class="welcome-header">
        <div class="logo">
          <el-icon :size="80" color="#409eff"><Document /></el-icon>
        </div>
        <h1>{{ t('welcome.title') }}</h1>
        <p class="subtitle">{{ t('welcome.subtitle') }}</p>
      </div>

      <div class="welcome-body">
        <div class="left-column">
          <h3 class="section-title">{{ t('welcome.quickActions') }}</h3>
          <div class="quick-actions">
            <div class="action-card" @click="createNote">
              <el-icon :size="32" color="#67c23a"><DocumentAdd /></el-icon>
              <h3>{{ t('welcome.createNote') }}</h3>
              <p>{{ t('welcome.createNoteDesc') }}</p>
            </div>

            <div class="action-card" @click="openSettings">
              <el-icon :size="32" color="#e6a23c"><Setting /></el-icon>
              <h3>{{ t('welcome.settings') }}</h3>
              <p>{{ t('welcome.settingsDesc') }}</p>
            </div>

            <div class="action-card" @click="showHelp">
              <el-icon :size="32" color="#909399"><QuestionFilled /></el-icon>
              <h3>{{ t('welcome.help') }}</h3>
              <p>{{ t('welcome.helpDesc') }}</p>
            </div>
          </div>
        </div>

        <div class="right-column">
          <div class="tips">
            <h3>{{ t('welcome.tipsTitle') }}</h3>
            <ul>
              <li>{{ t('welcome.tip1') }}</li>
              <li>{{ t('welcome.tip2') }}</li>
              <li>{{ t('welcome.tip3') }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Document, DocumentAdd, Setting, QuestionFilled } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { useTtsStore } from '@/store/store'

const { t } = useI18n()
const ttsStore = useTtsStore()

const createNote = async () => {
  const fs = await import('fs')
  const path = await import('path')

  // Check if there are any folders
  if (ttsStore.treeMenu.data.length === 0) {
    // No folders exist, create a default folder first
    const folderName = 'notes'
    const folderPath = path.join(ttsStore.notebook.currentPath, folderName)

    try {
      fs.mkdirSync(folderPath)
      console.log('Created default folder:', folderPath)

      // Refresh tree data to show new folder
      ttsStore.refreshTreeData()

      // Wait a bit for tree to update
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error('Failed to create folder:', error)
      return
    }
  }

  // Now create a note in the first folder
  if (ttsStore.treeMenu.data.length > 0) {
    const firstFolder = ttsStore.treeMenu.data[0]
    const noteName = 'Welcome'
    const notePath = path.join(firstFolder.path, noteName + '.json')

    // Create empty note file
    const emptyEditorData = {
      time: Date.now(),
      blocks: [],
      version: "2.26.5"
    }

    try {
      fs.writeFileSync(notePath, JSON.stringify(emptyEditorData, null, 2), 'utf8')
      console.log('Created note:', notePath)

      // Refresh tree and open the note
      ttsStore.refreshTreeData()

      // Wait for tree to update
      await new Promise(resolve => setTimeout(resolve, 100))

      // Open the note
      ttsStore.inputs.notePath = notePath
      ttsStore.cnote.title = noteName
      ttsStore.cnote.destTitle = noteName
      ttsStore.cnote.lastPath = notePath
      ttsStore.editerData = emptyEditorData
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }
}

const openSettings = () => {
  ttsStore.config.drawer = true
}

const showHelp = () => {
  ttsStore.openHelpDialog()
}
</script>

<style scoped>
.welcome-container {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  overflow-y: auto;
}

.welcome-content {
  max-width: 1200px;
  width: 100%;
}

.welcome-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo {
  margin-bottom: 20px;
}

h1 {
  font-size: 32px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 10px 0;
}

.subtitle {
  font-size: 16px;
  color: #606266;
  margin: 0;
}

.welcome-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
}

/* Two column layout for wider screens */
@media (min-width: 900px) {
  .welcome-body {
    grid-template-columns: 1fr 1fr;
  }
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 20px 0;
  text-align: center;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  text-align: left;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.action-card .el-icon {
  flex-shrink: 0;
}

.action-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px 0;
}

.action-card p {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.tips {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  height: 100%;
}

.tips h3 {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 20px 0;
}

.tips ul {
  margin: 0;
  padding-left: 24px;
}

.tips li {
  font-size: 14px;
  color: #606266;
  line-height: 2;
  margin-bottom: 12px;
}

.tips li:last-child {
  margin-bottom: 0;
}

/* Single column layout for narrow screens */
@media (max-width: 899px) {
  .section-title {
    text-align: left;
  }
}
</style>
