<template>
  <div class="audit-page">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h2 class="page-title">审核管理</h2>
        <span class="page-subtitle">高效审核，严格把关</span>
      </div>

      <!-- 统计概览 -->
      <div class="stats-overview">
        <div
          class="stat-card"
          v-for="stat in stats"
          :key="stat.type"
          :class="stat.type"
        >
          <div class="stat-icon">
            <el-icon><component :is="stat.icon" /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </header>

    <!-- 筛选标签 -->
    <div class="filter-tabs-container">
      <div class="filter-tabs">
        <div
          v-for="tab in tabs"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: activeTab === tab.value }"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
          <el-badge
            v-if="tab.count > 0"
            :value="tab.count"
            :max="99"
            class="badge"
          />
        </div>
      </div>
    </div>

    <!-- 审核列表 -->
    <main class="audit-content">
      <div class="audit-list">
        <div
          v-for="item in filteredAudits"
          :key="item.id"
          class="audit-card"
          :class="item.priority"
        >
          <div class="audit-priority-line"></div>
          <div class="audit-header">
            <div class="audit-type" :class="item.type">
              <el-icon><component :is="getTypeIcon(item.type)" /></el-icon>
              <span>{{ item.typeText }}</span>
            </div>
            <el-tag
              :type="getPriorityType(item.priority)"
              size="small"
              effect="plain"
              round
            >
              {{ item.priorityText }}
            </el-tag>
          </div>

          <div class="audit-body">
            <h4 class="audit-title">{{ item.title }}</h4>
            <p class="audit-description">{{ item.description }}</p>
          </div>

          <div class="audit-meta">
            <div class="meta-item">
              <div class="meta-icon-wrapper">
                <el-icon><User /></el-icon>
              </div>
              <div class="meta-content">
                <span class="meta-label">申请人</span>
                <span class="meta-value">{{ item.applicant }}</span>
              </div>
            </div>
            <div class="meta-item">
              <div class="meta-icon-wrapper">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="meta-content">
                <span class="meta-label">申请时间</span>
                <span class="meta-value">{{ item.applyTime }}</span>
              </div>
            </div>
          </div>

          <div class="audit-actions">
            <el-button
              type="success"
              size="default"
              class="action-btn approve-btn"
              @click="handleApprove(item)"
            >
              <el-icon><Select /></el-icon>
              通过
            </el-button>
            <el-button
              type="danger"
              size="default"
              class="action-btn reject-btn"
              @click="handleReject(item)"
            >
              <el-icon><Close /></el-icon>
              驳回
            </el-button>
            <el-button
              size="default"
              class="action-btn detail-btn"
              @click="viewDetail(item)"
            >
              查看详情
            </el-button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredAudits.length === 0" class="empty-state">
        <div class="empty-icon-wrapper">
          <el-icon :size="64"><DocumentChecked /></el-icon>
        </div>
        <p class="empty-title">暂无待审核项目</p>
        <p class="empty-subtitle">所有项目都已处理完毕</p>
      </div>
    </main>

    <!-- 审核对话框 -->
    <el-dialog
      v-model="showAuditDialog"
      :title="auditDialogTitle"
      width="90%"
      :close-on-click-modal="false"
      class="audit-dialog"
    >
      <div class="audit-detail">
        <div class="detail-card">
          <div class="detail-header">
            <el-icon><InfoFilled /></el-icon>
            <h4>申请信息</h4>
          </div>
          <div class="detail-content">
            <div class="detail-row">
              <span class="detail-label">申请人：</span>
              <span class="detail-value">{{ currentAudit.applicant }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">申请时间：</span>
              <span class="detail-value">{{ currentAudit.applyTime }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">申请类型：</span>
              <span class="detail-value">{{ currentAudit.typeText }}</span>
            </div>
          </div>
        </div>

        <div class="detail-card">
          <div class="detail-header">
            <el-icon><Document /></el-icon>
            <h4>申请内容</h4>
          </div>
          <div class="detail-content">
            <p class="detail-description">{{ currentAudit.description }}</p>
          </div>
        </div>

        <div v-if="showRejectForm" class="reject-form-card">
          <div class="detail-header">
            <el-icon><WarningFilled /></el-icon>
            <h4>驳回原因</h4>
          </div>
          <el-form label-width="80px">
            <el-form-item label="原因" required>
              <el-input
                v-model="rejectReason"
                type="textarea"
                :rows="4"
                placeholder="请输入驳回原因，以便申请人了解详情"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showAuditDialog = false" size="default">取消</el-button>
          <el-button
            v-if="!showRejectForm"
            type="success"
            size="default"
            class="confirm-approve-btn"
            @click="confirmApprove"
          >
            <el-icon><Select /></el-icon>
            确认通过
          </el-button>
          <el-button
            v-if="!showRejectForm"
            type="danger"
            size="default"
            @click="showRejectForm = true"
          >
            <el-icon><Close /></el-icon>
            驳回
          </el-button>
          <el-button
            v-if="showRejectForm"
            type="danger"
            size="default"
            class="confirm-reject-btn"
            @click="confirmReject"
          >
            <el-icon><Close /></el-icon>
            确认驳回
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import {
  User,
  Clock,
  Select,
  Close,
  DocumentChecked,
  UserFilled,
  OfficeBuilding,
  Document,
  InfoFilled,
  WarningFilled,
  Clock as ClockIcon,
  Document as DocumentIcon,
  Warning
} from '@element-plus/icons-vue';

const activeTab = ref('pending');
const showAuditDialog = ref(false);
const auditDialogTitle = ref('');
const showRejectForm = ref(false);
const rejectReason = ref('');
const currentAudit = ref({});

const stats = [
  {
    type: 'pending',
    label: '待审核',
    value: 12,
    icon: ClockIcon
  },
  {
    type: 'approved',
    label: '已通过',
    value: 156,
    icon: Select
  },
  {
    type: 'rejected',
    label: '已驳回',
    value: 23,
    icon: Close
  }
];

const tabs = [
  { label: '待审核', value: 'pending', count: 12 },
  { label: '已通过', value: 'approved', count: 0 },
  { label: '已驳回', value: 'rejected', count: 0 },
  { label: '全部', value: 'all', count: 0 }
];

const audits = ref([
  {
    id: 1,
    type: 'user',
    typeText: '用户注册',
    title: '村干部注册申请',
    description: '张三申请注册为智慧村示范村村干部，已提交相关证件。',
    applicant: '张三',
    applyTime: '2024-01-15 10:30',
    priority: 'high',
    priorityText: '紧急',
    status: 'pending'
  },
  {
    id: 2,
    type: 'project',
    typeText: '项目申报',
    title: '村路硬化工程申请',
    description: '申请对村内主干道进行硬化处理，预算5万元。',
    applicant: '村委会',
    applyTime: '2024-01-14 15:20',
    priority: 'normal',
    priorityText: '普通',
    status: 'pending'
  },
  {
    id: 3,
    type: 'fund',
    typeText: '资金申请',
    title: '文化活动经费申请',
    description: '申请春节文化活动经费，预算2万元。',
    applicant: '文化站',
    applyTime: '2024-01-13 09:15',
    priority: 'low',
    priorityText: '一般',
    status: 'pending'
  }
]);

const filteredAudits = computed(() => {
  if (activeTab.value === 'all') return audits.value;
  return audits.value.filter(a => a.status === activeTab.value);
});

const handleApprove = (item) => {
  currentAudit.value = item;
  auditDialogTitle.value = '审核通过';
  showRejectForm.value = false;
  rejectReason.value = '';
  showAuditDialog.value = true;
};

const handleReject = (item) => {
  currentAudit.value = item;
  auditDialogTitle.value = '审核驳回';
  showRejectForm.value = true;
  rejectReason.value = '';
  showAuditDialog.value = true;
};

const confirmApprove = () => {
  ElMessage.success('审核通过');
  showAuditDialog.value = false;
};

const confirmReject = () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请输入驳回原因');
    return;
  }
  ElMessage.success('已驳回申请');
  showAuditDialog.value = false;
};

const viewDetail = (item) => {
  console.log('View detail:', item);
};

const getTypeIcon = (type) => {
  const iconMap = {
    user: UserFilled,
    project: OfficeBuilding,
    fund: Document
  };
  return iconMap[type] || Document;
};

const getPriorityType = (priority) => {
  const typeMap = {
    high: 'danger',
    normal: 'warning',
    low: 'info'
  };
  return typeMap[priority] || 'info';
};
</script>

<style scoped lang="scss">
.audit-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding-bottom: 100px;
}

// 页面头部
.page-header {
  background: white;
  padding: 16px 20px 20px;
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 10;

  .header-content {
    margin-bottom: 20px;

    .page-title {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
    }

    .page-subtitle {
      font-size: 13px;
      color: #64748b;
    }
  }

  .stats-overview {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .stat-card {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 16px;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 40px;
      opacity: 0.1;
    }

    &.pending::before {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }

    &.approved::before {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    &.rejected::before {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }

    .stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 1;

      .el-icon {
        font-size: 20px;
      }

      .pending & {
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        color: #d97706;
      }

      .approved & {
        background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
        color: #059669;
      }

      .rejected & {
        background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
        color: #dc2626;
      }
    }

    .stat-content {
      text-align: center;
      position: relative;
      z-index: 1;

      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 2px;
        line-height: 1.2;
      }

      .stat-label {
        font-size: 12px;
        color: #64748b;
        font-weight: 500;
      }
    }
  }
}

// 筛选标签
.filter-tabs-container {
  background: white;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;

  &::-webkit-scrollbar {
    display: none;
  }

  .filter-tab {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 16px;
    background: #f8fafc;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid transparent;

    &.active {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .badge {
      :deep(.el-badge__content) {
        background: rgba(255, 255, 255, 0.9);
        color: #3b82f6;
        font-weight: 600;
        border: none;
      }
    }
  }
}

// 审核内容
.audit-content {
  padding: 0 16px;
}

.audit-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.audit-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;

  &:active {
    transform: translateY(1px);
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  }

  .audit-priority-line {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
  }

  &.high .audit-priority-line {
    background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
  }

  &.normal .audit-priority-line {
    background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
  }

  &.low .audit-priority-line {
    background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  }

  .audit-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .audit-type {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;

    .el-icon {
      font-size: 16px;
    }

    &.user {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      color: #2563eb;
    }

    &.project {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      color: #d97706;
    }

    &.fund {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      color: #059669;
    }
  }

  .audit-body {
    margin-bottom: 16px;

    .audit-title {
      margin: 0 0 8px;
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      line-height: 1.4;
    }

    .audit-description {
      margin: 0;
      font-size: 14px;
      color: #64748b;
      line-height: 1.6;
    }
  }

  .audit-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f1f5f9;

    .meta-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;

      .meta-icon-wrapper {
        width: 32px;
        height: 32px;
        background: #f8fafc;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .el-icon {
          font-size: 16px;
          color: #94a3b8;
        }
      }

      .meta-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;

        .meta-label {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }

        .meta-value {
          font-size: 13px;
          color: #475569;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }

  .audit-actions {
    display: flex;
    gap: 8px;

    .action-btn {
      flex: 1;
      border-radius: 10px;
      font-weight: 600;
      height: 40px;

      .el-icon {
        margin-right: 4px;
      }
    }

    .approve-btn {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border: none;
    }

    .reject-btn {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border: none;
    }

    .detail-btn {
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: white;
  border-radius: 20px;
  margin-top: 16px;

  .empty-icon-wrapper {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;

    .el-icon {
      font-size: 40px;
      color: #cbd5e1;
    }
  }

  .empty-title {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 600;
    color: #64748b;
  }

  .empty-subtitle {
    margin: 0;
    font-size: 13px;
    color: #94a3b8;
  }
}

// 对话框样式
:deep(.audit-dialog) {
  .el-dialog__header {
    padding: 20px 24px;
    border-bottom: 1px solid #f1f5f9;

    .el-dialog__title {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
    }
  }

  .el-dialog__body {
    padding: 20px 24px;
  }

  .el-dialog__footer {
    padding: 16px 24px;
    background: #f8fafc;
  }
}

.audit-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .detail-card {
    background: #f8fafc;
    border-radius: 12px;
    padding: 16px;

    .detail-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;

      .el-icon {
        font-size: 18px;
        color: #3b82f6;
      }

      h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
      }
    }

    .detail-content {
      .detail-row {
        display: flex;
        margin-bottom: 8px;
        font-size: 14px;

        &:last-child {
          margin-bottom: 0;
        }

        .detail-label {
          color: #64748b;
          font-weight: 500;
          min-width: 80px;
        }

        .detail-value {
          color: #1e293b;
          flex: 1;
        }
      }

      .detail-description {
        margin: 0;
        font-size: 14px;
        color: #1e293b;
        line-height: 1.6;
      }
    }
  }

  .reject-form-card {
    background: #fef2f2;
    border-radius: 12px;
    padding: 16px;

    .detail-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;

      .el-icon {
        font-size: 18px;
        color: #ef4444;
      }

      h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  gap: 8px;

  .confirm-approve-btn {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border: none;
    font-weight: 600;

    .el-icon {
      margin-right: 4px;
    }
  }

  .confirm-reject-btn {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    border: none;
    font-weight: 600;

    .el-icon {
      margin-right: 4px;
    }
  }
}
</style>
