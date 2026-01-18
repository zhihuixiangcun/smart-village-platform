/**
 * 搜索栏组件
 * 支持关键词搜索、日期范围筛选
 * 适老化设计：大输入框、清晰的按钮
 */
<template>
  <view
    :class="['search-bar', { 'elderly-mode': isElderly, 'is-focused': isFocused }]"
    role="search"
  >
    <!-- 搜索输入框 -->
    <view class="search-input-wrapper">
      <view class="search-icon">
        <SvgIcon name="search" :size="iconSize" />
      </view>
      <input
        :class="['search-input', { 'has-value': hasValue }]"
        type="text"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-label="placeholder"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @confirm="handleSearch"
      />
      <view
        v-if="hasValue && clearable"
        class="clear-btn"
        :aria-label="'清除搜索'"
        role="button"
        tabindex="0"
        @click="handleClear"
        @keydown.enter="handleClear"
      >
        <SvgIcon name="x-circle" :size="iconSize" />
      </view>
    </view>

    <!-- 搜索按钮 -->
    <view
      v-if="showSearchButton"
      class="search-btn"
      :class="{ 'is-loading': loading }"
      :aria-label="loading ? '搜索中' : '搜索'"
      role="button"
      tabindex="0"
      @click="handleSearch"
      @keydown.enter="handleSearch"
    >
      <SvgIcon v-if="loading" name="loader" :size="iconSize" class="spin-icon" />
      <SvgIcon v-else name="search" :size="iconSize" />
    </view>

    <!-- 高级筛选按钮 -->
    <view
      v-if="showAdvancedFilter"
      class="filter-btn"
      :class="{ 'is-active': hasAdvancedFilter }"
      :aria-label="hasAdvancedFilter ? '筛选已启用' : '打开筛选'"
      role="button"
      tabindex="0"
      @click="handleToggleFilter"
      @keydown.enter="handleToggleFilter"
    >
      <SvgIcon :name="hasAdvancedFilter ? 'filter-filled' : 'filter'" :size="iconSize" />
    </view>
  </view>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue'
import { useElderlyStore } from '@/store/elderly'
import SvgIcon from '@/components/icons/SvgIcon.vue'

/**
 * 组件Props
 */
const props = defineProps({
  /**
   * 绑定值（v-model）
   */
  modelValue: {
    type: String,
    default: ''
  },
  /**
   * 占位文本
   */
  placeholder: {
    type: String,
    default: '搜索公告标题、内容'
  },
  /**
   * 是否禁用
   */
  disabled: {
    type: Boolean,
    default: false
  },
  /**
   * 是否显示清除按钮
   */
  clearable: {
    type: Boolean,
    default: true
  },
  /**
   * 是否显示搜索按钮
   */
  showSearchButton: {
    type: Boolean,
    default: false
  },
  /**
   * 是否显示高级筛选按钮
   */
  showAdvancedFilter: {
    type: Boolean,
    default: false
  },
  /**
   * 是否有高级筛选条件
   */
  hasAdvancedFilter: {
    type: Boolean,
    default: false
  },
  /**
   * 加载状态
   */
  loading: {
    type: Boolean,
    default: false
  }
})

/**
 * 组件事件
 */
const emit = defineEmits([
  'update:modelValue',
  'search',
  'clear',
  'focus',
  'blur',
  'toggle-filter'
])

/**
 * 适老化Store
 */
const elderlyStore = useElderlyStore()
const isElderly = computed(() => elderlyStore.enabled)

/**
 * 图标大小（适老化模式增大）
 */
const iconSize = computed(() => isElderly.value ? 20 : 16)

/**
 * 是否有值
 */
const hasValue = computed(() => {
  return props.modelValue && props.modelValue.trim().length > 0
})

/**
 * 输入框聚焦状态
 */
const isFocused = ref(false)

/**
 * 处理输入
 */
const handleInput = (e) => {
  const value = e.detail.value
  emit('update:modelValue', value)
}

/**
 * 处理搜索
 */
const handleSearch = () => {
  emit('search', props.modelValue)
}

/**
 * 处理清除
 */
const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
}

/**
 * 处理聚焦
 */
const handleFocus = () => {
  isFocused.value = true
  emit('focus')
}

/**
 * 处理失焦
 */
const handleBlur = () => {
  isFocused.value = false
  emit('blur')
}

/**
 * 切换筛选面板
 */
const handleToggleFilter = () => {
  emit('toggle-filter')
}
</script>

<style lang="scss" scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx;
  background: #ffffff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);

  &.elderly-mode {
    padding: 24rpx;
    gap: 20rpx;
    border-radius: 16rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  }

  .search-input-wrapper {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 12rpx 16rpx;
    background: #f5f5f5;
    border-radius: 8rpx;
    border: 2rpx solid transparent;
    transition: all 0.2s ease;

    .is-focused & {
      background: #ffffff;
      border-color: #1890FF;
    }

    .search-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999999;
      flex-shrink: 0;
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 28rpx;
      color: #333333;
      outline: none;

      &::placeholder {
        color: #999999;
      }

      &:disabled {
        color: #cccccc;
        cursor: not-allowed;
      }
    }

    .clear-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999999;
      flex-shrink: 0;
      transition: color 0.2s ease;

      &:active {
        color: #666666;
      }
    }
  }

  .search-btn,
  .filter-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64rpx;
    height: 64rpx;
    border-radius: 8rpx;
    background: #f5f5f5;
    color: #666666;
    flex-shrink: 0;
    transition: all 0.2s ease;

    &:active {
      transform: scale(0.95);
      background: #e8e8e8;
    }
  }

  .search-btn {
    background: #1890FF;
    color: #ffffff;

    &.is-loading {
      opacity: 0.7;
      pointer-events: none;
    }
  }

  .filter-btn {
    &.is-active {
      background: #1890FF;
      color: #ffffff;
    }
  }

  .spin-icon {
    animation: spin 1s linear infinite;
  }
}

.elderly-mode {
  .search-input-wrapper {
    padding: 20rpx 24rpx;
    gap: 16rpx;
    border-radius: 12rpx;

    .search-input {
      font-size: 32rpx;
    }
  }

  .search-btn,
  .filter-btn {
    width: 80rpx;
    height: 80rpx;
    border-radius: 12rpx;
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

/* 减少动画（适老化） */
@media (prefers-reduced-motion: reduce) {
  .search-bar .search-input-wrapper {
    transition: none;
  }

  .search-btn,
  .filter-btn {
    transition: none;
    &:active {
      transform: none;
    }
  }

  .spin-icon {
    animation: none;
  }
}
</style>
