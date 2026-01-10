<template>
  <el-card class="quick-actions-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <span>快捷功能</span>
        <el-button text @click="showCustomize = true">
          <el-icon><Setting /></el-icon>
          自定义
        </el-button>
      </div>
    </template>

    <div class="quick-actions-grid">
      <div
        v-for="action in displayActions"
        :key="action.id"
        class="action-item"
        :class="{ 'has-badge': action.badge }"
        @click="handleAction(action)"
        @contextmenu.prevent="showContextMenu($event, action)"
      >
        <div class="action-icon" :style="{ background: action.color }">
          <el-icon :size="32" color="white">
            <component :is="action.icon" />
          </el-icon>
        </div>
        <div class="action-content">
          <h4>{{ action.title }}</h4>
          <p v-if="action.description">{{ action.description }}</p>
        </div>
        <el-badge v-if="action.badge" :value="action.badge" class="action-badge" />
      </div>
    </div>

    <!-- 自定义对话框 -->
    <el-dialog v-model="showCustomize" title="自定义快捷功能" width="600px">
      <div class="customize-content">
        <p class="tip">拖拽调整顺序,点击显示/隐藏功能</p>
        <div class="action-list">
          <div
            v-for="action in allActions"
            :key="action.id"
            class="customize-item"
            :class="{ disabled: !action.visible }"
            @click="toggleVisibility(action)"
          >
            <div class="action-icon-small" :style="{ background: action.color }">
              <el-icon color="white">
                <component :is="action.icon" />
              </el-icon>
            </div>
            <span class="action-name">{{ action.title }}</span>
            <el-icon v-if="action.visible" color="#67c23a"><Select /></el-icon>
            <el-icon v-else color="#909399"><hide /></el-icon>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showCustomize = false">取消</el-button>
        <el-button type="primary" @click="saveCustomization">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  QRCode,
  Document,
  Service,
  Coin,
  User,
  FirstAid,
  Setting,
  Select,
  Hide,
} from '@element-plus/icons-vue';

const router = useRouter();

// 所有可用快捷功能
const allActions = ref([
  {
    id: 'qrcode',
    title: '一户一码',
    icon: 'QRCode',
    color: '#409eff',
    route: '/my-qrcode',
    description: '扫码查看家庭信息',
    visible: true,
    badge: null,
  },
  {
    id: 'documents',
    title: '我的证件',
    icon: 'Document',
    color: '#67c23a',
    route: '/my-documents',
    description: '证件领取和办理',
    visible: true,
    badge: '3',
  },
  {
    id: 'services',
    title: '办事大厅',
    icon: 'Service',
    color: '#e6a23c',
    route: '/services',
    description: '在线办理业务',
    visible: true,
    badge: null,
  },
  {
    id: 'subsidy',
    title: '补贴查询',
    icon: 'Coin',
    color: '#f56c6c',
    route: '/subsidy',
    description: '本月可领 ¥320',
    visible: true,
    badge: null,
  },
  {
    id: 'family',
    title: '家庭档案',
    icon: 'User',
    color: '#909399',
    route: '/family',
    description: '家庭成员信息',
    visible: true,
    badge: null,
  },
  {
    id: 'medical',
    title: '医疗服务',
    icon: 'FirstAid',
    color: '#00bcd4',
    route: '/medical',
    description: '健康医疗服务',
    visible: false,
    badge: null,
  },
]);

const showCustomize = ref(false);

// 显示的快捷功能(最多6个)
const displayActions = computed(() => {
  return allActions.value.filter(a => a.visible).slice(0, 6);
});

// 处理快捷操作
const handleAction = action => {
  if (action.route) {
    router.push(action.route);
  } else if (action.action) {
    // 执行自定义操作
    action.action();
  } else {
    ElMessage.info(`功能开发中: ${action.title}`);
  }
};

// 显示右键菜单
const showContextMenu = (event, action) => {
  // 可以实现右键菜单功能
  console.log('Context menu for:', action);
};

// 切换可见性
const toggleVisibility = action => {
  action.visible = !action.visible;
};

// 保存自定义设置
const saveCustomization = () => {
  const settings = allActions.value.map(a => ({
    id: a.id,
    visible: a.visible,
  }));
  localStorage.setItem('quickActionsSettings', JSON.stringify(settings));
  showCustomize.value = false;
  ElMessage.success('设置已保存');
};

// 加载自定义设置
const loadCustomization = () => {
  const saved = localStorage.getItem('quickActionsSettings');
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      settings.forEach(setting => {
        const action = allActions.value.find(a => a.id === setting.id);
        if (action) {
          action.visible = setting.visible;
        }
      });
    } catch (error) {
      console.error('Failed to load quick actions settings:', error);
    }
  }
};

onMounted(() => {
  loadCustomization();
});
</script>

<style lang="scss" scoped>
.quick-actions-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .quick-actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 16px;

    @media (max-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .action-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 16px;
      background: #f5f7fa;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        background: #ecf5ff;
      }

      &:active {
        transform: translateY(0);
      }

      .action-icon {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;

        @media (max-width: 768px) {
          width: 48px;
          height: 48px;
        }
      }

      .action-content {
        text-align: center;

        h4 {
          margin: 0 0 4px 0;
          font-size: 15px;
          font-weight: 500;
          color: #303133;

          @media (max-width: 768px) {
            font-size: 14px;
          }
        }

        p {
          margin: 0;
          font-size: 12px;
          color: #909399;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 120px;
        }
      }

      .action-badge {
        position: absolute;
        top: 8px;
        right: 8px;
      }

      &.has-badge {
        .action-badge {
          :deep(.el-badge__content) {
            border: none;
          }
        }
      }
    }
  }

  .customize-content {
    .tip {
      margin: 0 0 16px 0;
      color: #909399;
      font-size: 14px;
    }

    .action-list {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .customize-item {
        display: flex;
        align-items: center;
        padding: 12px;
        background: #f5f7fa;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          background: #ecf5ff;
        }

        &.disabled {
          opacity: 0.5;
        }

        .action-icon-small {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
        }

        .action-name {
          flex: 1;
          font-size: 15px;
          color: #303133;
        }
      }
    }
  }
}

// 大字模式适配
.large-text-mode {
  .quick-actions-grid {
    .action-item {
      padding: 24px 20px;

      .action-content {
        h4 {
          font-size: 17px;
        }

        p {
          font-size: 14px;
        }
      }
    }
  }
}
</style>
