/**
 * 筛选标签组件
 * 支持按类型、排序方式筛选公告
 * 适老化设计：大标签、清晰的选中状态
 */
<template>
  <view
    :class="['filter-tabs', `layout-${layout}`, { 'elderly-mode': isElderly }]"
    role="tablist"
    :aria-label="`筛选标签，当前选中${activeTabLabel}`"
  >
    <!-- 类型筛选标签 -->
    <view
      v-if="showTypeFilter"
      class="tab-group"
      role="group"
      :aria-label="'公告类型筛选'"
    >
      <view
        v-for="tab in typeTabs"
        :key="tab.value"
        :class="[
          'tab-item',
          {
            'is-active': currentType === tab.value,
            'is-disabled': tab.disabled
          }
        ]"
        :role="'tab'"
        :aria-selected="currentType === tab.value"
        :aria-label="`${tab.label}${tab.count ? `，${tab.count}条` : ''}`"
        :tabindex="currentType === tab.value ? 0 : -1"
        @click="handleTypeChange(tab.value)"
        @keydown.enter="handleTypeChange(tab.value)"
      >
        <text class="tab-label">{{ tab.label }}</text>
        <text v-if="showCount && tab.count !== undefined" class="tab-count">
          {{ tab.count }}
        </text>
      </view>
    </view>

    <!-- 排序标签 -->
    <view
      v-if="showSortFilter"
      class="tab-group sort-group"
      role="group"
      :aria-label="'排序方式'"
    >
      <view
        v-for="sort in sortOptions"
        :key="sort.value"
        :class="[
          'tab-item',
          'sort-item',
          {
            'is-active': currentSort === sort.value
          }
        ]"
        :role="'tab'"
        :aria-selected="currentSort === sort.value"
        :aria-label="sort.label"
        :tabindex="currentSort === sort.value ? 0 : -1"
        @click="handleSortChange(sort.value)"
        @keydown.enter="handleSortChange(sort.value)"
      >
        <SvgIcon :name="sort.icon" :size="iconSize" />
        <text class="tab-label">{{ sort.label }}</text>
      </view>
    </view>

    <!-- 排序方向切换 -->
    <view
      v-if="showSortDirection"
      class="sort-direction"
      :aria-label="sortDirection === 'desc' ? '降序排列' : '升序排列'"
      role="button"
      tabindex="0"
      @click="toggleSortDirection"
      @keydown.enter="toggleSortDirection"
    >
      <SvgIcon
        :name="sortDirection === 'desc' ? 'arrow-down' : 'arrow-up'"
        :size="iconSize"
      />
    </view>
  </view>
</template>

<script setup>
import { computed, defineProps, defineEmits } from 'vue'
import { useElderlyStore } from '@/store/elderly'
import SvgIcon from '@/components/icons/SvgIcon.vue'

/**
 * 组件Props
 */
const props = defineProps({
  /**
   * 当前选中的类型
   */
  currentType: {
    type: String,
    default: 'all'
  },
  /**
   * 当前排序方式
   */
  currentSort: {
    type: String,
    default: 'date'
  },
  /**
   * 排序方向
   */
  sortDirection: {
    type: String,
    default: 'desc',
    validator: (value) => ['asc', 'desc'].includes(value)
  },
  /**
   * 类型标签数据
   */
  typeTabs: {
    type: Array,
    default: () => [
      { label: '全部', value: 'all' },
      { label: '重要', value: 'important' },
      { label: '通知', value: 'notice' },
      { label: '会议', value: 'meeting' },
      { label: '公示', value: 'public' }
    ]
  },
  /**
   * 排序选项
   */
  sortOptions: {
    type: Array,
    default: () => [
      { label: '最新', value: 'date', icon: 'clock' },
      { label: '最热', value: 'viewCount', icon: 'eye' },
      { label: '点赞', value: 'likeCount', icon: 'heart' }
    ]
  },
  /**
   * 布局方式
   */
  layout: {
    type: String,
    default: 'scroll',
    validator: (value) => ['scroll', 'grid', 'segment'].includes(value)
  },
  /**
   * 是否显示类型筛选
   */
  showTypeFilter: {
    type: Boolean,
    default: true
  },
  /**
   * 是否显示排序筛选
   */
  showSortFilter: {
    type: Boolean,
    default: false
  },
  /**
   * 是否显示排序方向切换
   */
  showSortDirection: {
    type: Boolean,
    default: false
  },
  /**
   * 是否显示数量
   */
  showCount: {
    type: Boolean,
    default: false
  }
})

/**
 * 组件事件
 */
const emit = defineEmits([
  'type-change',
  'sort-change',
  'sort-direction-change'
])

/**
 * 适老化Store
 */
const elderlyStore = useElderlyStore()
const isElderly = computed(() => elderlyStore.enabled)

/**
 * 图标大小（适老化模式增大）
 */
const iconSize = computed(() => isElderly.value ? 18 : 14)

/**
 * 当前选中标签名称
 */
const activeTabLabel = computed(() => {
  const tab = props.typeTabs.find(t => t.value === props.currentType)
  return tab?.label || '全部'
})

/**
 * 处理类型切换
 */
const handleTypeChange = (value) => {
  emit('type-change', value)
}

/**
 * 处理排序切换
 */
const handleSortChange = (value) => {
  emit('sort-change', value)
}

/**
 * 切换排序方向
 */
const toggleSortDirection = () => {
  const newDirection = props.sortDirection === 'desc' ? 'asc' : 'desc'
  emit('sort-direction-change', newDirection)
}
</script>

<style lang="scss" scoped>
.filter-tabs {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 16rpx 0;

  &.elderly-mode {
    gap: 24rpx;
    padding: 24rpx 0;
  }

  .tab-group {
    display: flex;
    align-items: center;
    gap: 16rpx;

    &.sort-group {
      justify-content: flex-end;
    }

    .tab-item {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8rpx;
      padding: 12rpx 24rpx;
      background: #f5f5f5;
      border-radius: 8rpx;
      font-size: 28rpx;
      color: #666666;
      white-space: nowrap;
      transition: all 0.2s ease;
      cursor: pointer;

      &:active {
        transform: scale(0.96);
      }

      &.is-active {
        background: #1890FF;
        color: #ffffff;
        font-weight: 500;
      }

      &.is-disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }

      .tab-count {
        min-width: 32rpx;
        height: 32rpx;
        padding: 0 8rpx;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 16rpx;
        font-size: 22rpx;
        line-height: 32rpx;
        text-align: center;

        .is-active & {
          background: rgba(255, 255, 255, 0.3);
        }
      }
    }

    .sort-item {
      padding: 8rpx 16rpx;
      font-size: 26rpx;
      gap: 6rpx;
    }
  }

  .sort-direction {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: #f5f5f5;
    color: #666666;
    transition: all 0.2s ease;
    cursor: pointer;

    &:active {
      transform: scale(0.95);
      background: #e8e8e8;
    }
  }

  /* 滚动布局 */
  &.layout-scroll {
    .tab-group {
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      &::-webkit-scrollbar {
        display: none;
      }
    }
  }

  /* 网格布局 */
  &.layout-grid {
    .tab-group {
      flex-wrap: wrap;

      .tab-item {
        flex: 1;
        min-width: 0;
        justify-content: center;
      }
    }
  }

  /* 分段控制器布局 */
  &.layout-segment {
    .tab-group {
      padding: 4rpx;
      background: #f5f5f5;
      border-radius: 12rpx;

      .tab-item {
        flex: 1;
        justify-content: center;
        background: transparent;
        border-radius: 8rpx;

        &.is-active {
          background: #ffffff;
          color: #1890FF;
          box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
        }
      }
    }
  }
}

.elderly-mode {
  .tab-group {
    gap: 20rpx;

    .tab-item {
      padding: 16rpx 32rpx;
      font-size: 32rpx;
      border-radius: 12rpx;

      .tab-count {
        min-width: 40rpx;
        height: 40rpx;
        padding: 0 10rpx;
        font-size: 26rpx;
        line-height: 40rpx;
      }
    }

    .sort-item {
      padding: 12rpx 20rpx;
      font-size: 30rpx;
      gap: 8rpx;
    }
  }

  .sort-direction {
    width: 72rpx;
    height: 72rpx;
  }
}

/* 减少动画（适老化） */
@media (prefers-reduced-motion: reduce) {
  .filter-tabs {
    .tab-item,
    .sort-direction {
      transition: none;
      &:active {
        transform: none;
      }
    }
  }
}
</style>
