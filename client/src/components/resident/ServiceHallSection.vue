<template>
  <div class="service-hall-section">
    <div class="section-header">
      <h2 class="section-title">
        <el-icon><Service /></el-icon>
        在线办事大厅
      </h2>
      <div class="header-actions">
        <el-badge :value="pendingCount" :hidden="pendingCount === 0" class="pending-badge">
          <el-button text @click="goToPendingTasks">
            待办事项
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </el-badge>
      </div>
    </div>

    <div class="section-divider"></div>

    <div class="service-grid">
      <div
        v-for="service in services"
        :key="service.id"
        class="service-card"
        @click="handleServiceClick(service)"
        role="button"
        tabindex="0"
        :aria-label="service.name"
      >
        <div class="service-icon" :class="`service-${service.type}`">
          <component :is="service.icon" :size="32" />
        </div>
        <div class="service-content">
          <h3 class="service-name">{{ service.name }}</h3>
          <p class="service-status" v-if="service.status">
            <el-tag :type="service.statusType" size="small">
              {{ service.status }}
            </el-tag>
          </p>
        </div>
        <el-badge v-if="service.pending" :value="service.pending" class="service-badge" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  Service,
  ArrowRight,
  Document,
  User,
  Coin,
  House,
  Avatar,
  Wallet,
  Grid,
} from '@element-plus/icons-vue';
import { useFontSize } from '@/composables/useFontSize';

interface ServiceItem {
  id: string;
  name: string;
  type: string;
  icon: any;
  route?: string;
  status?: string;
  statusType?: 'success' | 'warning' | 'danger' | 'info';
  pending?: number;
}

const router = useRouter();
const { isLargeText } = useFontSize();

// 服务列表数据
const services = ref<ServiceItem[]>([
  {
    id: 'id-card',
    name: '身份证办理',
    type: 'id',
    icon: Document,
    route: '/services/id-card',
    status: '办理中',
    statusType: 'warning',
  },
  {
    id: 'household',
    name: '户口本',
    type: 'household',
    icon: User,
    route: '/services/household',
    pending: 1,
  },
  {
    id: 'marriage',
    name: '结婚证',
    type: 'marriage',
    icon: Service,
    route: '/services/marriage',
  },
  {
    id: 'birth',
    name: '生育证',
    type: 'birth',
    icon: Avatar,
    route: '/services/birth',
    pending: 2,
  },
  {
    id: 'housing',
    name: '建房申请',
    type: 'housing',
    icon: House,
    route: '/services/housing',
  },
  {
    id: 'subsidy',
    name: '补贴申请',
    type: 'subsidy',
    icon: Coin,
    route: '/services/subsidy',
    status: '可申请',
    statusType: 'success',
  },
  {
    id: 'more',
    name: '更多服务',
    type: 'more',
    icon: Grid,
    route: '/services/hall',
  },
]);

// 待办事项总数
const pendingCount = computed(() => {
  return services.value.reduce((total, service) => {
    return total + (service.pending || 0);
  }, 0);
});

/**
 * 处理服务卡片点击
 */
const handleServiceClick = (service: ServiceItem) => {
  if (service.route) {
    router.push(service.route);
  } else {
    ElMessage.info(`${service.name}功能开发中`);
  }
};

/**
 * 跳转到待办事项页面
 */
const goToPendingTasks = () => {
  router.push('/services/pending');
};
</script>

<style lang="scss" scoped>
.service-hall-section {
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
        color: #409eff;
      }
    }

    .header-actions {
      .el-button {
        font-size: var(--font-size-small, 14px);
        color: #909399;

        &:hover {
          color: #409eff;
        }
      }
    }
  }

  .section-divider {
    height: 2px;
    background: linear-gradient(90deg, #409eff 0%, transparent 100%);
    margin-bottom: 16px;
  }

  .service-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;

    @media (max-width: 480px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (min-width: 768px) {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .service-card {
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
    min-height: 100px;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
    }

    &:active {
      transform: translateY(-2px);
    }

    .service-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;

      &.service-id {
        background: #e3f2fd;
        color: #2196f3;
      }

      &.service-household {
        background: #fff3e0;
        color: #ff9800;
      }

      &.service-marriage {
        background: #fce4ec;
        color: #e91e63;
      }

      &.service-birth {
        background: #e8f5e9;
        color: #51cf66;
      }

      &.service-housing {
        background: #f3e5f5;
        color: #9c27b0;
      }

      &.service-subsidy {
        background: #fff8e1;
        color: #ffc107;
      }

      &.service-more {
        background: #eceff1;
        color: #607d8b;
      }
    }

    .service-content {
      width: 100%;

      .service-name {
        font-size: var(--font-size-small, 14px);
        font-weight: 600;
        margin: 0 0 4px 0;
        color: #303133;
      }

      .service-status {
        margin: 0;

        :deep(.el-tag) {
          font-size: 12px;
        }
      }
    }

    .service-badge {
      position: absolute;
      top: 8px;
      right: 8px;

      :deep(.el-badge__content) {
        font-size: 11px;
        height: 18px;
        line-height: 18px;
        padding: 0 6px;
      }
    }
  }
}

// 大字模式适配
:deep(.large-text-mode) {
  .service-hall-section {
    .section-title {
      font-size: var(--font-size-large-h2, 28px);
    }

    .service-card {
      .service-name {
        font-size: var(--font-size-large-small, 19px);
      }
    }
  }
}

// 响应式适配
@media (max-width: 480px) {
  .service-hall-section {
    .service-card {
      flex-direction: row;
      text-align: left;
      padding: 12px;

      .service-icon {
        width: 40px;
        height: 40px;
        margin-bottom: 0;
        margin-right: 12px;
      }

      .service-content {
        .service-name {
          font-size: var(--font-size-small, 14px);
        }
      }
    }
  }
}
</style>
