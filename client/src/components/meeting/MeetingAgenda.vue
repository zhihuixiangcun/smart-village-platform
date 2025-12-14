<template>
  <div class="meeting-agenda">
    <div class="agenda-header">
      <h3>会议议程</h3>
      <el-button
        v-if="canEditAgenda"
        type="primary"
        size="small"
        @click="showEditDialog = true"
      >
        编辑议程
      </el-button>
    </div>

    <!-- 议程列表 -->
    <div v-if="agenda.items && agenda.items.length > 0" class="agenda-list">
      <div
        v-for="(item, index) in agenda.items"
        :key="item.itemId"
        class="agenda-item"
        :class="{ 'active': currentItemIndex === index, 'completed': item.status === 'completed' }"
      >
        <div class="item-header">
          <div class="item-order">{{ item.order }}</div>
          <div class="item-title">{{ item.title }}</div>
          <div class="item-duration">{{ item.estimatedDuration }}分钟</div>
        </div>

        <div v-if="item.description" class="item-description">
          {{ item.description }}
        </div>

        <div v-if="item.presenter" class="item-presenter">
          <i class="el-icon-user"></i>
          <span>主讲：{{ item.presenter.realName }}</span>
        </div>

        <div v-if="item.documents && item.documents.length > 0" class="item-documents">
          <div class="documents-label">相关文档：</div>
          <div class="documents-list">
            <el-link
              v-for="doc in item.documents"
              :key="doc.name"
              :href="doc.url"
              target="_blank"
              type="primary"
              class="document-link"
            >
              <i class="el-icon-document"></i>
              {{ doc.name }}
            </el-link>
          </div>
        </div>

        <div class="item-status">
          <el-tag
            :type="getStatusType(item.status)"
            size="small"
          >
            {{ getStatusText(item.status) }}
          </el-tag>
          <span v-if="item.actualDuration" class="actual-duration">
            实际用时：{{ item.actualDuration }}分钟
          </span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty v-else description="暂无议程安排"></el-empty>

    <!-- 议程进度 -->
    <div v-if="meeting.status === 'in_progress'" class="agenda-progress">
      <div class="progress-header">
        <h4>会议进度</h4>
        <div class="current-item">
          当前议程：{{ getCurrentItem()?.title || '暂无进行中议程' }}
        </div>
      </div>

      <el-progress
        :percentage="progressPercentage"
        :status="progressStatus"
        :stroke-width="8"
      ></el-progress>

      <div class="time-info">
        <span>已用时间：{{ getElapsedTime() }}</span>
        <span>预计剩余：{{ getRemainingTime() }}</span>
      </div>

      <!-- 主持人控制 -->
      <div v-if="canControlAgenda" class="agenda-controls">
        <el-button
          v-if="currentItemIndex < agenda.items.length - 1"
          type="success"
          @click="nextAgendaItem"
        >
          下一个议程
        </el-button>
        <el-button
          v-if="currentItemIndex < agenda.items.length"
          type="warning"
          @click="markItemCompleted"
        >
          标记当前议程完成
        </el-button>
      </div>
    </div>

    <!-- 编辑对话框 -->
    <el-dialog
      title="编辑会议议程"
      :visible.sync="showEditDialog"
      width="70%"
      :close-on-click-modal="false"
    >
      <div class="edit-agenda">
        <div class="edit-header">
          <el-button type="primary" @click="addAgendaItem">
            <i class="el-icon-plus"></i>
            添加议程
          </el-button>
          <div class="agenda-summary">
            总议程：{{ editingAgenda.length }}项 |
            预计时长：{{ getTotalDuration() }}分钟
          </div>
        </div>

        <draggable
          v-model="editingAgenda"
          handle=".drag-handle"
          @end="onDragEnd"
        >
          <transition-group name="list" tag="div">
            <div
              v-for="(item, index) in editingAgenda"
              :key="item.itemId"
              class="edit-agenda-item"
            >
              <div class="drag-handle">
                <i class="el-icon-rank"></i>
              </div>

              <div class="item-form">
                <el-form :model="item" label-width="80px" size="small">
                  <el-row :gutter="16">
                    <el-col :span="12">
                      <el-form-item label="议程标题" required>
                        <el-input v-model="item.title" placeholder="请输入议程标题"></el-input>
                      </el-form-item>
                    </el-col>
                    <el-col :span="6">
                      <el-form-item label="预计时长" required>
                        <el-input-number
                          v-model="item.estimatedDuration"
                          :min="5"
                          :max="180"
                          :step="5"
                          controls-position="right"
                        ></el-input-number>
                        <span style="margin-left: 8px;">分钟</span>
                      </el-form-item>
                    </el-col>
                    <el-col :span="6">
                      <el-form-item label="主讲人">
                        <el-select
                          v-model="item.presenterId"
                          placeholder="选择主讲人"
                          clearable
                        >
                          <el-option
                            v-for="participant in meetingParticipants"
                            :key="participant._id"
                            :label="participant.realName"
                            :value="participant._id"
                          ></el-option>
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-form-item label="议程描述">
                    <el-input
                      v-model="item.description"
                      type="textarea"
                      :rows="2"
                      placeholder="请输入议程描述"
                    ></el-input>
                  </el-form-item>

                  <el-form-item label="相关文档">
                    <div class="document-upload">
                      <el-upload
                        :action="uploadUrl"
                        :headers="uploadHeaders"
                        :on-success="(response) => onDocumentUploaded(response, index)"
                        :on-remove="(file) => onDocumentRemoved(file, index)"
                        :file-list="item.documents || []"
                        multiple
                      >
                        <el-button size="small" type="primary">选择文件</el-button>
                      </el-upload>
                    </div>
                  </el-form-item>
                </el-form>
              </div>

              <div class="item-actions">
                <el-button
                  type="danger"
                  size="mini"
                  @click="removeAgendaItem(index)"
                  icon="el-icon-delete"
                ></el-button>
              </div>
            </div>
          </transition-group>
        </draggable>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="saveAgenda" :loading="saving">
          保存议程
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import draggable from 'vuedraggable'
import { meetingAPI } from '@/api/meeting'

export default {
  name: 'MeetingAgenda',
  components: {
    draggable
  },
  props: {
    meeting: {
      type: Object,
      required: true
    },
    agenda: {
      type: Object,
      default: () => ({ items: [] })
    }
  },
  data() {
    return {
      showEditDialog: false,
      saving: false,
      editingAgenda: [],
      currentItemIndex: 0,
      meetingParticipants: []
    }
  },
  computed: {
    canEditAgenda() {
      const userRole = this.$store.getters.userRole
      const userId = this.$store.getters.userId

      return userRole === 'admin' ||
             userRole === 'committee' ||
             this.meeting.organizer._id === userId
    },
    canControlAgenda() {
      return this.canEditAgenda && this.meeting.status === 'in_progress'
    },
    progressPercentage() {
      if (!this.agenda.items || this.agenda.items.length === 0) return 0
      return Math.round((this.currentItemIndex / this.agenda.items.length) * 100)
    },
    progressStatus() {
      if (this.currentItemIndex === this.agenda.items.length) return 'success'
      return null
    },
    uploadUrl() {
      return `/api/v1/meetings/${this.meeting._id}/documents`
    },
    uploadHeaders() {
      return {
        'Authorization': `Bearer ${this.$store.getters.token}`
      }
    }
  },
  watch: {
    'showEditDialog'(newVal) {
      if (newVal) {
        this.initEditingAgenda()
        this.loadMeetingParticipants()
      }
    }
  },
  methods: {
    initEditingAgenda() {
      this.editingAgenda = this.agenda.items ?
        JSON.parse(JSON.stringify(this.agenda.items)) : []

      // 确保每个议程项都有必要的字段
      this.editingAgenda.forEach((item, index) => {
        if (!item.itemId) {
          item.itemId = `agenda_${index + 1}_${Date.now()}`
        }
        if (!item.order) {
          item.order = index + 1
        }
        if (!item.estimatedDuration) {
          item.estimatedDuration = 30
        }
        if (!item.status) {
          item.status = 'pending'
        }
      })
    },

    addAgendaItem() {
      const newItem = {
        itemId: `agenda_${this.editingAgenda.length + 1}_${Date.now()}`,
        title: '',
        description: '',
        estimatedDuration: 30,
        order: this.editingAgenda.length + 1,
        status: 'pending',
        presenterId: null,
        documents: []
      }
      this.editingAgenda.push(newItem)
    },

    removeAgendaItem(index) {
      this.editingAgenda.splice(index, 1)
      // 重新排序
      this.editingAgenda.forEach((item, idx) => {
        item.order = idx + 1
      })
    },

    onDragEnd() {
      // 重新排序
      this.editingAgenda.forEach((item, index) => {
        item.order = index + 1
      })
    },

    async loadMeetingParticipants() {
      // 简化处理，从会议参与者中获取
      const participants = []

      if (this.meeting.participants?.required) {
        participants.push(...this.meeting.participants.required.map(p => p.userId))
      }

      if (this.meeting.participants?.optional) {
        participants.push(...this.meeting.participants.optional.map(p => p.userId))
      }

      this.meetingParticipants = participants
    },

    onDocumentUploaded(response, itemIndex) {
      if (response.success) {
        if (!this.editingAgenda[itemIndex].documents) {
          this.editingAgenda[itemIndex].documents = []
        }
        this.editingAgenda[itemIndex].documents.push({
          name: response.data.fileName,
          url: response.data.fileUrl,
          size: response.data.fileSize
        })
      }
    },

    onDocumentRemoved(file, itemIndex) {
      const documents = this.editingAgenda[itemIndex].documents || []
      const index = documents.findIndex(doc => doc.name === file.name)
      if (index > -1) {
        documents.splice(index, 1)
      }
    },

    async saveAgenda() {
      // 验证必填字段
      for (let item of this.editingAgenda) {
        if (!item.title.trim()) {
          this.$message.error('请填写所有议程标题')
          return
        }
      }

      this.saving = true
      try {
        const agendaData = {
          items: this.editingAgenda,
          totalEstimatedDuration: this.getTotalDuration()
        }

        const response = await meetingAPI.updateMeetingAgenda(this.meeting._id, agendaData)

        if (response.data.success) {
          this.$message.success('议程保存成功')
          this.showEditDialog = false
          this.$emit('agenda-updated', response.data.data)
        }
      } catch (error) {
        this.$message.error('保存议程失败')
        console.error(error)
      } finally {
        this.saving = false
      }
    },

    getTotalDuration() {
      return this.editingAgenda.reduce((total, item) => {
        return total + (item.estimatedDuration || 0)
      }, 0)
    },

    getCurrentItem() {
      if (!this.agenda.items || this.currentItemIndex >= this.agenda.items.length) {
        return null
      }
      return this.agenda.items[this.currentItemIndex]
    },

    getElapsedTime() {
      if (!this.meeting.actualStartTime) return '0分钟'

      const now = new Date()
      const start = new Date(this.meeting.actualStartTime)
      const minutes = Math.round((now - start) / (1000 * 60))

      if (minutes < 60) return `${minutes}分钟`
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return `${hours}小时${remainingMinutes}分钟`
    },

    getRemainingTime() {
      const totalDuration = this.agenda.totalEstimatedDuration || 0
      const elapsedMinutes = this.getElapsedMinutes()
      const remaining = Math.max(0, totalDuration - elapsedMinutes)

      if (remaining < 60) return `${remaining}分钟`
      const hours = Math.floor(remaining / 60)
      const minutes = remaining % 60
      return `${hours}小时${minutes}分钟`
    },

    getElapsedMinutes() {
      if (!this.meeting.actualStartTime) return 0

      const now = new Date()
      const start = new Date(this.meeting.actualStartTime)
      return Math.round((now - start) / (1000 * 60))
    },

    async nextAgendaItem() {
      if (this.currentItemIndex < this.agenda.items.length - 1) {
        try {
          await meetingAPI.updateAgendaProgress(this.meeting._id, {
            currentItemIndex: this.currentItemIndex + 1
          })
          this.currentItemIndex += 1
          this.$message.success('已切换到下一个议程')
        } catch (error) {
          this.$message.error('切换议程失败')
          console.error(error)
        }
      }
    },

    async markItemCompleted() {
      const currentItem = this.getCurrentItem()
      if (!currentItem) return

      try {
        await meetingAPI.markAgendaItemCompleted(this.meeting._id, currentItem.itemId)
        currentItem.status = 'completed'
        currentItem.actualDuration = this.getItemActualDuration(currentItem)
        this.$message.success('议程项已标记为完成')
      } catch (error) {
        this.$message.error('标记完成失败')
        console.error(error)
      }
    },

    getItemActualDuration(item) {
      // 简化计算，实际应该记录每个议程项的开始时间
      return item.estimatedDuration
    },

    getStatusType(status) {
      switch (status) {
        case 'pending': return 'info'
        case 'in_progress': return 'warning'
        case 'completed': return 'success'
        case 'skipped': return 'info'
        default: return 'info'
      }
    },

    getStatusText(status) {
      const statusMap = {
        'pending': '待进行',
        'in_progress': '进行中',
        'completed': '已完成',
        'skipped': '已跳过'
      }
      return statusMap[status] || '未知'
    }
  }
}
</script>

<style scoped>
.meeting-agenda {
  padding: 20px;
}

.agenda-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.agenda-header h3 {
  margin: 0;
  color: #333;
}

.agenda-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.agenda-item {
  background: white;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s ease;
}

.agenda-item.active {
  border-color: #409eff;
  background: #f0f9ff;
}

.agenda-item.completed {
  border-color: #67c23a;
  background: #f0f9ff;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.item-order {
  background: #409eff;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.agenda-item.completed .item-order {
  background: #67c23a;
}

.item-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  flex: 1;
}

.item-duration {
  color: #666;
  font-size: 14px;
}

.item-description {
  color: #666;
  line-height: 1.5;
  margin-bottom: 10px;
}

.item-presenter {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #666;
  font-size: 14px;
  margin-bottom: 10px;
}

.item-documents {
  margin-bottom: 10px;
}

.documents-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.documents-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.document-link {
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.actual-duration {
  color: #666;
  font-size: 12px;
}

.agenda-progress {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.progress-header h4 {
  margin: 0;
  color: #333;
}

.current-item {
  color: #666;
  font-size: 14px;
}

.time-info {
  display: flex;
  justify-content: space-between;
  margin: 10px 0;
  font-size: 14px;
  color: #666;
}

.agenda-controls {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.edit-agenda {
  max-height: 60vh;
  overflow-y: auto;
}

.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.agenda-summary {
  color: #666;
  font-size: 14px;
}

.edit-agenda-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 6px;
  background: #fafafa;
}

.drag-handle {
  cursor: move;
  color: #999;
  font-size: 18px;
  margin-top: 10px;
}

.item-form {
  flex: 1;
}

.item-actions {
  margin-top: 10px;
}

.document-upload {
  width: 100%;
}

.list-enter-active, .list-leave-active {
  transition: all 0.3s;
}

.list-enter, .list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .meeting-agenda {
    padding: 10px;
  }

  .agenda-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .edit-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .edit-agenda-item {
    flex-direction: column;
  }

  .agenda-controls {
    flex-direction: column;
  }
}
</style>