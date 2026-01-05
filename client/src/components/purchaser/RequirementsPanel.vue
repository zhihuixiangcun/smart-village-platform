<template>
  <div class="requirements-panel">
    <el-card>
      <template #header>
        <div class="panel-header">
          <div class="header-left">
            <el-icon><Document /></el-icon>
            <span>我的采购需求</span>
          </div>
          <el-button type="primary" @click="$emit('add')">
            <el-icon><Plus /></el-icon>
            发布需求
          </el-button>
        </div>
      </template>

      <div v-if="requirements.length === 0" class="empty-container">
        <el-empty description="暂无采购需求">
          <el-button type="primary" @click="$emit('add')">发布第一个需求</el-button>
        </el-empty>
      </div>

      <div v-else class="requirements-list">
        <div
          v-for="req in requirements"
          :key="req._id"
          class="requirement-item"
        >
          <div class="req-header">
            <div class="req-title">
              <h4>{{ req.productCategory }}</h4>
              <el-tag :type="getStatusType(req.status)" size="small">
                {{ getStatusLabel(req.status) }}
              </el-tag>
            </div>
            <div class="req-actions">
              <el-button size="small" @click="$emit('edit', req)">编辑</el-button>
              <el-button
                v-if="req.status === 'pending'"
                size="small"
                type="danger"
                @click="handleDelete(req)"
              >
                删除
              </el-button>
            </div>
          </div>

          <div class="req-content">
            <div class="req-info-row">
              <span class="label">采购数量:</span>
              <span class="value">{{ req.quantity }}{{ req.unit }}</span>
            </div>
            <div class="req-info-row">
              <span class="label">预算范围:</span>
              <span class="value">¥{{ req.budgetMin }} - ¥{{ req.budgetMax }}</span>
            </div>
            <div class="req-info-row" v-if="req.deadline">
              <span class="label">截止日期:</span>
              <span class="value">{{ formatDate(req.deadline) }}</span>
            </div>
            <div class="req-info-row" v-if="req.deliveryLocation">
              <span class="label">收货地址:</span>
              <span class="value">{{ req.deliveryLocation }}</span>
            </div>
            <div class="req-description" v-if="req.description">
              <p>{{ req.description }}</p>
            </div>
          </div>

          <div class="req-footer">
            <div class="req-meta">
              <span class="publish-time">
                <el-icon><Clock /></el-icon>
                发布于 {{ formatDate(req.createdAt) }}
              </span>
              <span class="response-count" v-if="req.responseCount > 0">
                <el-icon><ChatDotRound /></el-icon>
                {{ req.responseCount }} 位供应商响应
              </span>
            </div>
            <el-button type="primary" size="small" @click="viewResponses(req)">
              查看响应
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 响应列表对话框 -->
    <el-dialog v-model="responsesDialogVisible" title="供应商响应" width="600px">
      <el-table :data="currentResponses" stripe>
        <el-table-column prop="supplier.name" label="供应商" />
        <el-table-column prop="quote" label="报价">
          <template #default="{ row }">
            ¥{{ row.quote }}/{{ row.unit }}
          </template>
        </el-table-column>
        <el-table-column prop="availableQuantity" label="可供应量" />
        <el-table-column prop="responseTime" label="响应时间">
          <template #default="{ row }">
            {{ formatDate(row.responseTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="contactSupplier(row)">
              联系
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Plus, Clock, ChatDotRound } from '@element-plus/icons-vue'
import api from '@/api'

const props = defineProps({
  requirements: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['add', 'edit', 'delete'])

const responsesDialogVisible = ref(false)
const currentResponses = ref([])

const getStatusType = (status) => {
  const types = {
    pending: 'info',
    active: 'success',
    completed: 'info',
    cancelled: 'danger'
  }
  return types[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = {
    pending: '待响应',
    active: '进行中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return labels[status] || status
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

const handleDelete = async (req) => {
  try {
    await ElMessageBox.confirm('确定要删除此采购需求吗？', '确认删除', {
      type: 'warning'
    })
    emit('delete', req)
  } catch (error) {
    // 用户取消
  }
}

const viewResponses = async (req) => {
  try {
    const response = await api.get(`/api/v1/purchaser/requirements/${req._id}/responses`)
    if (response.success) {
      currentResponses.value = response.data || []
      responsesDialogVisible.value = true
    }
  } catch (error) {
    console.error('获取响应列表失败', error)
    ElMessage.error('获取响应列表失败')
  }
}

const contactSupplier = (supplier) => {
  ElMessage.info(`正在联系 ${supplier.supplier.name}...`)
  // 这里可以跳转到聊天页面或显示联系方式
}
</script>

<style scoped>
.requirements-panel {
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.empty-container {
  padding: 40px;
}

.requirements-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.requirement-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
}

.requirement-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.req-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f5f7fa;
}

.req-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.req-title h4 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.req-actions {
  display: flex;
  gap: 8px;
}

.req-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.req-info-row {
  display: flex;
  font-size: 14px;
}

.req-info-row .label {
  color: #909399;
  width: 100px;
  flex-shrink: 0;
}

.req-info-row .value {
  color: #606266;
}

.req-description {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.req-description p {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.req-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #f5f7fa;
}

.req-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #909399;
}

.req-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.response-count {
  color: #409eff;
}

@media (max-width: 768px) {
  .req-header {
    flex-direction: column;
    gap: 12px;
  }

  .req-footer {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .req-meta {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
