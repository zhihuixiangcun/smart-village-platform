<template>
  <div :class="cardClass" @click="handleClick">
    <!-- 卡片头部 -->
    <div v-if="title || $slots.header" class="elderly-card__header">
      <slot name="header">
        <div class="elderly-card__header-content">
          <div v-if="icon" class="elderly-card__icon">
            <i :class="icon"></i>
          </div>
          <h3 class="elderly-card__title">{{ title }}</h3>
          <div v-if="subtitle" class="elderly-card__subtitle">{{ subtitle }}</div>
        </div>
        <div v-if="showArrow" class="elderly-card__arrow">
          <i class="el-icon-arrow-right"></i>
        </div>
      </slot>
    </div>

    <!-- 卡片内容 -->
    <div class="elderly-card__body">
      <slot></slot>
    </div>

    <!-- 卡片底部 -->
    <div v-if="$slots.footer" class="elderly-card__footer">
      <slot name="footer"></slot>
    </div>

    <!-- 状态标签 -->
    <div v-if="status" class="elderly-card__status" :class="`status--${statusType}`">
      {{ status }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // 标题
  title: {
    type: String,
    default: '',
  },
  // 副标题
  subtitle: {
    type: String,
    default: '',
  },
  // 图标类名
  icon: {
    type: String,
    default: '',
  },
  // 卡片类型
  type: {
    type: String,
    default: 'default',
    validator: value => ['default', 'primary', 'success', 'warning', 'danger'].includes(value),
  },
  // 是否可点击
  clickable: {
    type: Boolean,
    default: false,
  },
  // 是否显示箭头
  showArrow: {
    type: Boolean,
    default: false,
  },
  // 状态文本
  status: {
    type: String,
    default: '',
  },
  // 状态类型
  statusType: {
    type: String,
    default: 'info',
    validator: value => ['success', 'warning', 'danger', 'info'].includes(value),
  },
  // 阴影级别
  shadow: {
    type: String,
    default: 'medium',
    validator: value => ['none', 'light', 'medium', 'heavy'].includes(value),
  },
});

const emit = defineEmits(['click']);

const cardClass = computed(() => {
  return [
    'elderly-card',
    `elderly-card--${props.type}`,
    `shadow--${props.shadow}`,
    {
      'is-clickable': props.clickable,
    },
  ];
});

const handleClick = e => {
  if (!props.clickable) return;
  emit('click', e);
};
</script>

<style lang="scss" scoped>
.elderly-card {
  position: relative;
  background: #ffffff;
  border-radius: 12px;
  box-sizing: border-box;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  // 阴影级别
  &.shadow--none {
    box-shadow: none;
    border: 2px solid #e4e7ed;
  }

  &.shadow--light {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    border: 1px solid #e4e7ed;
  }

  &.shadow--medium {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    border: 1px solid #e4e7ed;
  }

  &.shadow--heavy {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border: 1px solid #e4e7ed;
  }

  // 可点击状态
  &.is-clickable {
    cursor: pointer;

    &:active {
      transform: scale(0.98);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
  }

  // 类型样式
  &--primary {
    background: linear-gradient(135deg, #fff5f3 0%, #ffffff 100%);
    border-color: #e85d4c;

    .elderly-card__title {
      color: #e85d4c;
    }
  }

  &--success {
    background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%);
    border-color: #67c23a;

    .elderly-card__title {
      color: #67c23a;
    }
  }

  &--warning {
    background: linear-gradient(135deg, #fdf6ec 0%, #ffffff 100%);
    border-color: #e6a23c;

    .elderly-card__title {
      color: #e6a23c;
    }
  }

  &--danger {
    background: linear-gradient(135deg, #fef0f0 0%, #ffffff 100%);
    border-color: #f56c6c;

    .elderly-card__title {
      color: #f56c6c;
    }
  }

  // 头部
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 24px 16px;
    border-bottom: 2px solid #f5f7fa;
  }

  &__header-content {
    display: flex;
    align-items: center;
    flex: 1;
  }

  &__icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f7fa;
    border-radius: 8px;
    margin-right: 16px;
    font-size: 24px;
    color: #e85d4c;
  }

  &__title {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
    color: #1a1a1a;
    margin: 0;
  }

  &__subtitle {
    font-size: 16px;
    color: #757575;
    margin-top: 4px;
  }

  &__arrow {
    margin-left: 16px;
    font-size: 20px;
    color: #c0c4cc;
  }

  // 内容
  &__body {
    padding: 20px 24px;
    font-size: 18px;
    line-height: 1.8;
    color: #4a4a4a;
  }

  // 底部
  &__footer {
    display: flex;
    gap: 12px;
    padding: 16px 24px;
    border-top: 2px solid #f5f7fa;
    background: #fafafa;
  }

  // 状态标签
  &__status {
    position: absolute;
    top: 16px;
    right: 16px;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;

    &.status--success {
      background: #f0f9ff;
      color: #67c23a;
      border: 2px solid #b3e19d;
    }

    &.status--warning {
      background: #fdf6ec;
      color: #e6a23c;
      border: 2px solid #f5dab1;
    }

    &.status--danger {
      background: #fef0f0;
      color: #f56c6c;
      border: 2px solid #fbc4c4;
    }

    &.status--info {
      background: #f4f4f5;
      color: #909399;
      border: 2px solid #d3d4d6;
    }
  }
}

// 大字模式适配
.elderly-mode {
  .elderly-card {
    border-radius: 16px;

    &__header {
      padding: 32px 32px 20px;
    }

    &__icon {
      width: 64px;
      height: 64px;
      font-size: 32px;
    }

    &__title {
      font-size: 24px;
    }

    &__subtitle {
      font-size: 18px;
    }

    &__body {
      padding: 24px 32px;
      font-size: 20px;
    }

    &__footer {
      padding: 20px 32px;
    }

    &__status {
      top: 20px;
      right: 20px;
      padding: 8px 20px;
      font-size: 16px;
    }
  }
}
</style>
