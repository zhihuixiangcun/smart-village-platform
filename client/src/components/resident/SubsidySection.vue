<template>
  <div class="subsidy-section">
    <div class="section-header">
      <h2 class="section-title">
        <el-icon><Coin /></el-icon>
        我的补贴
      </h2>
      <el-button text @click="goToSubsidyList">
        查看全部
        <el-icon><ArrowRight /></el-icon>
      </el-button>
    </div>

    <div class="section-divider"></div>

    <div class="subsidy-grid">
      <!-- 补贴卡片 -->
      <div
        v-for="subsidy in subsidies"
        :key="subsidy.id"
        class="subsidy-card"
        :class="`subsidy-${subsidy.type}`"
        @click="handleSubsidyClick(subsidy)"
        role="button"
        tabindex="0"
        :aria-label="`${subsidy.name}，${subsidy.status}`"
      >
        <div class="subsidy-icon">
          <component :is="subsidy.icon" :size="32" />
        </div>
        <div class="subsidy-content">
          <h3 class="subsidy-name">{{ subsidy.name }}</h3>
          <p class="subsidy-amount" v-if="subsidy.amount">
            {{ subsidy.amount }}
          </p>
          <p class="subsidy-status" :class="`status-${subsidy.status}`">
            {{ getStatusText(subsidy) }}
          </p>
        </div>
        <el-tag
          v-if="subsidy.badge"
          :type="subsidy.badgeType"
          size="small"
          class="subsidy-badge"
        >
          {{ subsidy.badge }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Coin, ArrowRight, Calendar, Suitcase, Medal, Wallet, Operation } from '@element-plus/icons-vue'

interface Subsidy {
  id: string
  name: string
  type: 'elderly' | 'medical' | 'subsistence' | 'disability'
  icon: any
  amount?: string
  status: 'available' | 'pending' | 'applied' | 'approved'
  badge?: string
  badgeType?: 'success' | 'warning' | 'danger' | 'info'
  route?: string
}

const router = useRouter()

// 补贴列表数据
const subsidies = ref<Subsidy[]>([
  {
    id: 'elderly',
    name: '老年补贴',
    type: 'elderly',
    icon: Calendar,
    amount: '¥200/月',
    status: 'available',
    badge: '可领取',
    badgeType: 'success',
    route: '/subsidy/elderly'
  },
  {
    id: 'medical',
    name: '医疗补贴',
    type: 'medical',
    icon: Suitcase,
    amount: '¥0',
    status: 'pending',
    badge: '待申请',
    badgeType: 'warning',
    route: '/subsidy/medical'
  },
  {
    id: 'subsistence',
    name: '低保补贴',
    type: 'subsistence',
    icon: Medal,
    amount: '',
    status: 'applied',
    badge: '审核中',
    badgeType: 'info'
  },
  {
    id: 'calculator',
    name: '政策计算器',
    type: 'disability',
    icon: Operation,
    amount: '',
    status: 'available',
    badge: '试一试',
    badgeType: 'primary',
    route: '/subsidy/calculator'
  }
])

/**
 * 获取状态文本
 */
const getStatusText = (subsidy: Subsidy): string => {
  const statusMap: Record<string, string> = {
    available: subsidy.amount || '查看详情',
    pending: '立即申请',
    applied: '审核中',
    approved: '已通过'
  }
  return statusMap[subsidy.status] || '查看详情'
}

/**
 * 处理补贴卡片点击
 */
const handleSubsidyClick = (subsidy: Subsidy) => {
  if (subsidy.route) {
    router.push(subsidy.route)
  } else {
    // 显示补贴详情
    ElMessage.info(`查看${subsidy.name}详情`)
  }
}

/**
 * 跳转到补贴列表页面
 */
const goToSubsidyList = () => {
  router.push('/subsidy')
}
</script>

<style lang="scss" scoped>
.subsidy-section {
  margin-bottom: 24px;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--font-size-h2, 20px);
      font-weight: 700;
      margin: 0;
      color: #303133;

      .el-icon {
        color: #ff9800;
      }
    }

    .el-button {
      font-size: var(--font-size-small, 14px);
      color: #909399;

      &:hover {
        color: #409eff;
      }
    }
  }

  .section-divider {
    height: 2px;
    background: linear-gradient(90deg, #ff9800 0%, transparent 100%);
    margin-bottom: 16px;
  }

  .subsidy-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    @media (max-width: 480px) {
      grid-template-columns: 1fr;
    }

    @media (min-width: 768px) {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .subsidy-card {
    background: white;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    min-height: 120px;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
    }

    &:active {
      transform: translateY(-2px);
    }

    &.subsidy-elderly {
      border-top: 3px solid #51cf66;
    }

    &.subsidy-medical {
      border-top: 3px solid #2196f3;
    }

    &.subsidy-subsistence {
      border-top: 3px solid #ff9800;
    }

    &.subsidy-disability {
      border-top: 3px solid #9c27b0;
    }

    .subsidy-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      background: #f5f7fa;

      .subsidy-elderly & {
        background: #e8f5e9;
        color: #51cf66;
      }

      .subsidy-medical & {
        background: #e3f2fd;
        color: #2196f3;
      }

      .subsidy-subsistence & {
        background: #fff3e0;
        color: #ff9800;
      }

      .subsidy-disability & {
        background: #f3e5f5;
        color: #9c27b0;
      }
    }

    .subsidy-content {
      flex: 1;
      width: 100%;

      .subsidy-name {
        font-size: var(--font-size-base, 16px);
        font-weight: 600;
        margin: 0 0 4px 0;
        color: #303133;
      }

      .subsidy-amount {
        font-size: var(--font-size-h3, 18px);
        font-weight: 700;
        margin: 0 0 4px 0;
        color: #ff9800;
      }

      .subsidy-status {
        font-size: var(--font-size-small, 14px);
        margin: 0;
        color: #909399;

        &.status-available {
          color: #51cf66;
        }

        &.status-pending {
          color: #ff9800;
        }
      }
    }

    .subsidy-badge {
      position: absolute;
      top: 8px;
      right: 8px;
    }
  }
}

// 大字模式适配
:deep(.large-text-mode) {
  .subsidy-section {
    .section-title {
      font-size: var(--font-size-large-h2, 28px);
    }

    .subsidy-card {
      .subsidy-name {
        font-size: var(--font-size-large-base, 22px);
      }

      .subsidy-amount {
        font-size: var(--font-size-large-h3, 25px);
      }

      .subsidy-status {
        font-size: var(--font-size-large-small, 19px);
      }
    }
  }
}

// 响应式适配
@media (max-width: 480px) {
  .subsidy-section {
    .subsidy-card {
      flex-direction: row;
      text-align: left;
      padding: 12px;

      .subsidy-icon {
        width: 48px;
        height: 48px;
        margin-bottom: 0;
        margin-right: 12px;
      }

      .subsidy-content {
        .subsidy-name {
          font-size: var(--font-size-small, 14px);
        }

        .subsidy-amount {
          font-size: var(--font-size-base, 16px);
        }
      }
    }
  }
}
</style>
