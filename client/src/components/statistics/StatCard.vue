<!-- 统计卡片组件 - 统一的统计数据显示 -->
<template>
  <el-card
    class="stat-card"
    :class="[
      `stat-card-${type}`,
      { 'is-clickable': clickable }
    ]"
    :shadow="shadow"
    @click="handleClick"
  >
    <div class="stat-card-content">
      <div class="stat-icon" :style="{ background: gradient }">
        <el-icon :size="iconSize" color="white">
          <component :is="icon" />
        </el-icon>
      </div>
      
      <div class="stat-info">
        <div class="stat-value">{{ formatValue(value) }}</div>
        <div class="stat-label">{{ label }}</div>
        
        <div v-if="showChange" class="stat-change" :class="changeClass">
          <el-icon :size="14">
            <component :is="changeIcon" />
          </el-icon>
          <span class="change-text">{{ changeText }}</span>
          <span class="change-value">{{ changeValue }}</span>
        </div>
        
        <div v-if="extraInfo" class="stat-extra">
          <span>{{ extraInfo }}</span>
        </div>
      </div>
      
      <div v-if="showAction" class="stat-action">
        <el-dropdown trigger="click" @command="handleAction">
          <el-button text :icon="MoreFilled">
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-item command="view">查看详情</el-dropdown-item>
            <el-dropdown-item command="export">导出数据</el-dropdown-item>
            <el-dropdown-item command="settings">设置</el-dropdown-item>
          </template>
        </el-dropdown>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  label: string;
  value: number | string;
  icon: string;
  type?: 'primary' | 'success' | 'warning' | 'info' | 'danger';
  changeValue?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  changeText?: string;
  extraInfo?: string;
  clickable?: boolean;
  showAction?: boolean;
  shadow?: 'always' | 'hover' | 'never';
  iconSize?: number;
  onClick?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  clickable: true,
  showAction: false,
  shadow: 'hover',
  iconSize: 28,
  changeText: '较上周',
  changeType: 'positive',
});

const emit = defineEmits<{
  click: [event: MouseEvent];
  action: [command: string, event: MouseEvent];
}>();

// 渐变色配置
const gradients = {
  primary: 'linear-gradient(135deg, #2196F3 0%, #1565C0 100%)',
  success: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
  warning: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
  info: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
  danger: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
};

const gradient = computed(() => gradients[props.type]);

// 变化图标
const changeIcon = computed(() => {
  if (props.changeType === 'positive') return 'ArrowUp';
  if (props.changeType === 'negative') return 'ArrowDown';
  return 'Minus';
});

// 变化样式
const changeClass = computed(() => ({
  'is-positive': props.changeType === 'positive',
  'is-negative': props.changeType === 'negative',
  'is-neutral': props.changeType === 'neutral',
}));

const showChange = computed(() => !!props.changeValue);

// 格式化数值
const formatValue = (val: number | string): string => {
  if (typeof val === 'number') {
    return val.toLocaleString();
  }
  return val;
};

const handleClick = (event: MouseEvent) => {
  if (props.clickable && props.onClick) {
    props.onClick();
  }
  emit('click', event);
};

const handleAction = (command: string, event: MouseEvent) => {
  emit('action', command, event);
};
</script>

<style lang="scss" scoped>
.stat-card {
  border: none;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: #fff;
  
  &.is-clickable {
    cursor: pointer;
    
    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
    }
    
    &:active {
      transform: translateY(-2px);
    }
  }
  
  :deep(.el-card__body) {
    padding: 24px;
  }
}

.stat-card-content {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.stat-icon {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.is-clickable:hover .stat-icon {
  transform: scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.stat-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #0F172A;
  line-height: 1.2;
  transition: color 0.2s ease;
}

.stat-label {
  font-size: 13px;
  color: #475569;
  font-weight: 400;
  white-space: nowrap;
}

.stat-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
  align-items: center;
  transition: all 0.2s ease;
  
  .change-text {
    color: #94A3B8;
    font-weight: 400;
  }
  
  .change-value {
    font-weight: 500;
  }
  
  &.is-positive {
    .change-value {
      color: #10B981;
    }
    
    .el-icon {
      color: #10B981;
    }
  }
  
  &.is-negative {
    .change-value {
      color: #EF4444;
    }
    
    .el-icon {
      color: #EF4444;
    }
  }
  
  &.is-neutral {
    .change-value {
      color: #6B7280;
    }
    
    .el-icon {
      color: #6B7280;
    }
  }
}

.stat-extra {
  font-size: 12px;
  color: #94A3B8;
  margin-top: 2px;
}

.stat-action {
  flex-shrink: 0;
}

/* 卡片类型特殊样式 */
.stat-card-primary .stat-value {
  color: #1976D2;
}

.stat-card-success .stat-value {
  color: #388E3C;
}

.stat-card-warning .stat-value {
  color: #F57C00;
}

.stat-card-info .stat-value {
  color: #1976D2;
}

.stat-card-danger .stat-value {
  color: #D32F2F;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stat-card-content {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
  }
  
  .stat-value {
    font-size: 24px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .stat-change {
    justify-content: center;
  }
}
</style>
