<template>
  <view class="uni-load-more" v-if="show">
    <view v-if="status === 'loading'" class="uni-load-more__loading">
      <view class="uni-load-more__spinner"></view>
      <text class="uni-load-more__text">{{ contentText.contentdown }}</text>
    </view>
    <view v-else-if="status === 'more'" class="uni-load-more__more">
      <text class="uni-load-more__text">{{ contentText.contentmore }}</text>
    </view>
    <view v-else-if="status === 'noMore'" class="uni-load-more__no-more">
      <text class="uni-load-more__text">{{ contentText.contentnomore }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: 'more' // 'loading' | 'more' | 'noMore'
  },
  contentText: {
    type: Object,
    default: () => ({
      contentdown: '加载中...',
      contentmore: '上拉显示更多',
      contentnomore: '没有更多数据了'
    })
  },
  showIcon: {
    type: Boolean,
    default: true
  },
  showLoading: {
    type: Boolean,
    default: true
  }
})

const show = computed(() => props.status !== 'hide')
</script>

<style lang="scss" scoped>
.uni-load-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  width: 100%;
}

.uni-load-more__loading,
.uni-load-more__more,
.uni-load-more__no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.uni-load-more__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.uni-load-more__text {
  font-size: 14px;
  color: #999;
}
</style>
