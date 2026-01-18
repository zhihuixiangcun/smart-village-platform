<template>
  <div class="requirements-panel">
    <el-card class="main-card" shadow="hover">
      <template #header>
        <div class="panel-header">
          <div class="header-left">
            <div class="header-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="header-title">
              <h3>我的采购需求</h3>
              <span class="subtitle">管理和查看所有采购需求</span>
            </div>
          </div>
          <el-button class="add-btn" type="primary" @click="$emit('add')">
            <el-icon class="btn-icon"><Plus /></el-icon>
            <span>发布需求</span>
          </el-button>
        </div>
      </template>

      <div v-if="requirements.length === 0" class="empty-container">
        <div class="empty-illustration">
          <div class="empty-circle">
            <el-icon class="empty-icon"><Document /></el-icon>
          </div>
        </div>
        <h3 class="empty-title">暂无采购需求</h3>
        <p class="empty-description">开始发布您的第一个采购需求吧</p>
        <el-button class="empty-action-btn" type="primary" size="large" @click="$emit('add')">
          <el-icon><Plus /></el-icon>
          发布第一个需求
        </el-button>
      </div>

      <div v-else class="requirements-list">
        <transition-group name="list" tag="div">
          <div
            v-for="(req, index) in requirements"
            :key="req._id"
            class="requirement-item"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <div class="req-card-bg"></div>
            <div class="req-card-inner">
              <div class="req-header">
                <div class="req-title">
                  <h4>{{ req.productCategory }}</h4>
                  <el-tag
                    :type="getStatusType(req.status)"
                    size="small"
                    effect="dark"
                    round
                  >
                    {{ getStatusLabel(req.status) }}
                  </el-tag>
                </div>
                <div class="req-actions">
                  <el-button class="action-btn" size="small" plain @click="$emit('edit', req)">
                    <el-icon><Document /></el-icon>
                    编辑
                  </el-button>
                  <el-button
                    v-if="req.status === 'pending'"
                    class="action-btn danger"
                    size="small"
                    type="danger"
                    plain
                    @click="handleDelete(req)"
                  >
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </div>
              </div>

              <div class="req-content">
                <div class="req-info-grid">
                  <div class="req-info-row">
                    <div class="info-icon">
                      <el-icon><Box /></el-icon>
                    </div>
                    <div class="info-content">
                      <span class="label">采购数量</span>
                      <span class="value">{{ req.quantity }}{{ req.unit }}</span>
                    </div>
                  </div>
                  <div class="req-info-row">
                    <div class="info-icon">
                      <el-icon><Wallet /></el-icon>
                    </div>
                    <div class="info-content">
                      <span class="label">预算范围</span>
                      <span class="value">¥{{ req.budgetMin }} - ¥{{ req.budgetMax }}</span>
                    </div>
                  </div>
                  <div class="req-info-row" v-if="req.deadline">
                    <div class="info-icon">
                      <el-icon><Calendar /></el-icon>
                    </div>
                    <div class="info-content">
                      <span class="label">截止日期</span>
                      <span class="value">{{ formatDate(req.deadline) }}</span>
                    </div>
                  </div>
                  <div class="req-info-row" v-if="req.deliveryLocation">
                    <div class="info-icon">
                      <el-icon><Location /></el-icon>
                    </div>
                    <div class="info-content">
                      <span class="label">收货地址</span>
                      <span class="value">{{ req.deliveryLocation }}</span>
                    </div>
                  </div>
                </div>
                <div class="req-description" v-if="req.description">
                  <div class="desc-header">
                    <el-icon><ChatDotRound /></el-icon>
                    <span>需求说明</span>
                  </div>
                  <p>{{ req.description }}</p>
                </div>
              </div>

              <div class="req-footer">
                <div class="req-meta">
                  <span class="meta-item">
                    <el-icon class="meta-icon"><Clock /></el-icon>
                    <span>发布于 {{ formatDate(req.createdAt) }}</span>
                  </span>
                  <span class="meta-item response-badge" v-if="req.responseCount > 0">
                    <el-icon class="meta-icon"><ChatDotRound /></el-icon>
                    <span>{{ req.responseCount }} 位供应商响应</span>
                  </span>
                </div>
                <el-button class="view-btn" type="primary" @click="viewResponses(req)">
                  <el-icon><View /></el-icon>
                  查看响应
                </el-button>
              </div>
            </div>
          </div>
        </transition-group>
      </div>
    </el-card>

    <!-- 响应列表对话框 -->
    <el-dialog
      v-model="responsesDialogVisible"
      title="供应商响应"
      width="700px"
      class="responses-dialog"
    >
      <template #header>
        <div class="dialog-header">
          <div class="header-content">
            <div class="header-icon-wrap">
              <el-icon><ChatDotRound /></el-icon>
            </div>
            <div class="header-text">
              <h3>供应商响应</h3>
              <p>查看所有供应商的报价信息</p>
            </div>
          </div>
        </div>
      </template>
      <el-table :data="currentResponses" stripe class="responses-table">
        <el-table-column prop="supplier.name" label="供应商" min-width="120" />
        <el-table-column prop="quote" label="报价" min-width="100">
          <template #default="{ row }">
            <span class="price-tag">¥{{ row.quote }}/{{ row.unit }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="availableQuantity" label="可供应量" min-width="100" />
        <el-table-column prop="responseTime" label="响应时间" min-width="120">
          <template #default="{ row }">
            {{ formatDate(row.responseTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" circle @click="contactSupplier(row)">
              <el-icon><ChatDotRound /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Document,
  Plus,
  Clock,
  ChatDotRound,
  Delete,
  Box,
  Wallet,
  Calendar,
  Location,
  View,
} from '@element-plus/icons-vue';
import api from '@/api';

const props = defineProps({
  requirements: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['add', 'edit', 'delete']);

const responsesDialogVisible = ref(false);
const currentResponses = ref([]);

const getStatusType = status => {
  const types = {
    pending: 'info',
    active: 'success',
    completed: 'info',
    cancelled: 'danger',
  };
  return types[status] || 'info';
};

const getStatusLabel = status => {
  const labels = {
    pending: '待响应',
    active: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return labels[status] || status;
};

const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN');
};

const handleDelete = async req => {
  try {
    await ElMessageBox.confirm('确定要删除此采购需求吗？', '确认删除', {
      type: 'warning',
    });
    emit('delete', req);
  } catch (error) {
    // 用户取消
  }
};

const viewResponses = async req => {
  try {
    const response = await api.get(`/api/v1/purchaser/requirements/${req._id}/responses`);
    if (response.success) {
      currentResponses.value = response.data || [];
      responsesDialogVisible.value = true;
    }
  } catch (error) {
    console.error('获取响应列表失败', error);
    ElMessage.error('获取响应列表失败');
  }
};

const contactSupplier = supplier => {
  ElMessage.info(`正在联系 ${supplier.supplier.name}...`);
  // 这里可以跳转到聊天页面或显示联系方式
};
</script>

<style scoped>
.requirements-panel {
  height: 100%;
  background: linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 100%);
  min-height: 600px;
}

.main-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: none;
  box-shadow: 0 4px 24px rgba(16, 185, 129, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.main-card :deep(.el-card__header) {
  padding: 24px 28px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.header-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-title h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: white;
  letter-spacing: 0.5px;
}

.header-title .subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 400;
}

.add-btn {
  background: rgba(255, 255, 255, 0.95);
  color: #10b981;
  border: none;
  padding: 12px 24px;
  font-weight: 600;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  background: white;
}

.add-btn .btn-icon {
  font-size: 18px;
}

.empty-container {
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  animation: fadeIn 0.5s ease-out;
}

.empty-illustration {
  margin-bottom: 32px;
  animation: float 3s ease-in-out infinite;
}

.empty-circle {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.15);
  position: relative;
}

.empty-circle::before {
  content: '';
  position: absolute;
  width: 140px;
  height: 140px;
  border: 2px dashed rgba(16, 185, 129, 0.2);
  border-radius: 50%;
  animation: spin 20s linear infinite;
}

.empty-icon {
  font-size: 48px;
  color: #10b981;
}

.empty-title {
  margin: 0 0 12px 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  text-align: center;
}

.empty-description {
  margin: 0 0 28px 0;
  font-size: 15px;
  color: #6b7280;
  text-align: center;
}

.empty-action-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  padding: 14px 32px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.empty-action-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 24px rgba(16, 185, 129, 0.4);
}

.requirements-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 8px;
}

.requirement-item {
  position: relative;
  border-radius: 16px;
  overflow: visible;
  animation: slideInUp 0.5s ease-out both;
}

.requirement-item:nth-child(1) { animation-delay: 0s; }
.requirement-item:nth-child(2) { animation-delay: 0.1s; }
.requirement-item:nth-child(3) { animation-delay: 0.2s; }
.requirement-item:nth-child(4) { animation-delay: 0.3s; }
.requirement-item:nth-child(5) { animation-delay: 0.4s; }

.req-card-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.02) 100%);
  border-radius: 16px;
  border: 1px solid rgba(16, 185, 129, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.requirement-item:hover .req-card-bg {
  border-color: rgba(16, 185, 129, 0.3);
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.15);
  transform: translateY(-2px);
}

.req-card-inner {
  position: relative;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.req-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.req-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.req-title h4 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.req-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-btn.danger:hover {
  background: #fee2e2;
  border-color: #fecaca;
  color: #dc2626;
}

.req-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.req-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.req-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.req-info-row:hover {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  transform: translateX(4px);
}

.info-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.info-content .label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-content .value {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.req-description {
  padding: 16px;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-radius: 12px;
  border-left: 4px solid #10b981;
  transition: all 0.2s ease;
}

.req-description:hover {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
}

.desc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #059669;
}

.req-description p {
  margin: 0;
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
}

.req-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid rgba(16, 185, 129, 0.1);
  gap: 16px;
}

.req-meta {
  display: flex;
  gap: 20px;
  font-size: 13px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  transition: all 0.2s ease;
}

.meta-item:hover {
  color: #10b981;
}

.meta-icon {
  font-size: 16px;
  color: #9ca3af;
  transition: all 0.2s ease;
}

.meta-item:hover .meta-icon {
  color: #10b981;
}

.response-badge {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  padding: 4px 12px;
  border-radius: 20px;
  color: #1e40af;
  font-weight: 500;
}

.view-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  padding: 10px 20px;
  font-weight: 600;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 6px;
}

.view-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
}

/* 响应列表对话框样式 */
.responses-dialog :deep(.el-dialog__header) {
  padding: 0;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 12px 12px 0 0;
}

.responses-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

.dialog-header {
  padding: 24px 28px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon-wrap {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.header-text h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.header-text p {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.responses-table {
  border-radius: 8px;
  overflow: hidden;
}

.price-tag {
  font-weight: 600;
  color: #10b981;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  padding: 4px 12px;
  border-radius: 6px;
  display: inline-block;
}

/* 列表动画 */
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.list-move {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 全局动画关键帧 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .panel-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-left {
    justify-content: center;
  }

  .add-btn {
    width: 100%;
    justify-content: center;
  }

  .main-card :deep(.el-card__header) {
    padding: 20px;
  }

  .req-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .req-title {
    justify-content: space-between;
  }

  .req-actions {
    justify-content: flex-end;
  }

  .req-info-grid {
    grid-template-columns: 1fr;
  }

  .req-footer {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .req-meta {
    justify-content: center;
  }

  .view-btn {
    width: 100%;
    justify-content: center;
  }

  .responses-dialog :deep(.el-dialog) {
    width: 90% !important;
    margin: 20px auto;
  }
}

@media (max-width: 480px) {
  .header-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .header-title h3 {
    font-size: 18px;
  }

  .header-title .subtitle {
    font-size: 12px;
  }

  .empty-circle {
    width: 100px;
    height: 100px;
  }

  .empty-circle::before {
    width: 120px;
    height: 120px;
  }

  .empty-icon {
    font-size: 40px;
  }

  .empty-title {
    font-size: 20px;
  }

  .empty-description {
    font-size: 14px;
  }
}
</style>
