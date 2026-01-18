/**
 * 评论输入组件
 * 支持发表评论和回复
 * 适老化设计：大输入框、清晰的按钮
 */
<template>
  <view
    :class="['comment-input', { 'elderly-mode': isElderly, 'is-reply': !!replyTo }]"
    role="form"
    :aria-label="replyTo ? `回复给${replyTo.user?.name}` : '发表评论'"
  >
    <!-- 回复提示 -->
    <view v-if="replyTo" class="reply-tip">
      <text class="reply-tip-text">回复 @{{ replyTo.user?.name }}</text>
      <view
        class="reply-tip-close"
        :aria-label="'取消回复'"
        role="button"
        tabindex="0"
        @click="handleCancelReply"
        @keydown.enter="handleCancelReply"
      >
        <SvgIcon name="x" :size="14" />
      </view>
    </view>

    <!-- 输入区域 -->
    <view class="input-wrapper">
      <textarea
        ref="textareaRef"
        :class="['input-textarea', { 'has-value': hasValue }]"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxLength"
        :auto-height="autoHeight"
        :aria-label="placeholder"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @confirm="handleSubmit"
      />
      <view class="input-footer">
        <text class="char-count">{{ charCount }}/{{ maxLength }}</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="input-actions">
      <view
        v-if="showCancel"
        class="action-btn cancel-btn"
        :aria-label="'取消'"
        role="button"
        tabindex="0"
        @click="handleCancel"
        @keydown.enter="handleCancel"
      >
        <text class="btn-text">取消</text>
      </view>
      <view
        :class="['action-btn', 'submit-btn', { 'is-loading': loading, 'is-disabled': !canSubmit }]"
        :aria-label="loading ? '发送中' : '发送'"
        role="button"
        tabindex="0"
        @click="handleSubmit"
        @keydown.enter="handleSubmit"
      >
        <SvgIcon v-if="loading" name="loader" :size="16" class="spin-icon" />
        <SvgIcon v-else name="send" :size="16" />
        <text class="btn-text">{{ submitText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits, nextTick } from 'vue'
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
    default: '说点什么...'
  },
  /**
   * 是否禁用
   */
  disabled: {
    type: Boolean,
    default: false
  },
  /**
   * 是否加载中
   */
  loading: {
    type: Boolean,
    default: false
  },
  /**
   * 最大长度
   */
  maxLength: {
    type: Number,
    default: 500
  },
  /**
   * 是否自动高度
   */
  autoHeight: {
    type: Boolean,
    default: true
  },
  /**
   * 是否显示取消按钮
   */
  showCancel: {
    type: Boolean,
    default: true
  },
  /**
   * 提交按钮文本
   */
  submitText: {
    type: String,
    default: '发送'
  },
  /**
   * 回复对象（用于回复评论）
   */
  replyTo: {
    type: Object,
    default: null
  }
})

/**
 * 组件事件
 */
const emit = defineEmits([
  'update:modelValue',
  'submit',
  'cancel',
  'cancel-reply',
  'focus',
  'blur'
])

/**
 * 适老化Store
 */
const elderlyStore = useElderlyStore()
const isElderly = computed(() => elderlyStore.enabled)

/**
 * 输入框引用
 */
const textareaRef = ref(null)

/**
 * 是否有值
 */
const hasValue = computed(() => {
  return props.modelValue && props.modelValue.trim().length > 0
})

/**
 * 字符计数
 */
const charCount = computed(() => {
  return (props.modelValue || '').length
})

/**
 * 是否可以提交
 */
const canSubmit = computed(() => {
  return hasValue.value && !props.loading && !props.disabled
})

/**
 * 处理输入
 */
const handleInput = (e) => {
  const value = e.detail.value
  emit('update:modelValue', value)
}

/**
 * 处理聚焦
 */
const handleFocus = () => {
  emit('focus')
}

/**
 * 处理失焦
 */
const handleBlur = () => {
  emit('blur')
}

/**
 * 提交
 */
const handleSubmit = () => {
  if (!canSubmit.value) return
  emit('submit', props.modelValue)
}

/**
 * 取消
 */
const handleCancel = () => {
  emit('cancel')
}

/**
 * 取消回复
 */
const handleCancelReply = () => {
  emit('cancel-reply')
}

/**
 * 聚焦输入框
 */
const focus = () => {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus()
    }
  })
}

// 暴露方法给父组件
defineExpose({
  focus
})
</script>

<style lang="scss" scoped>
.comment-input {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 16rpx;
  background: #f9f9f9;
  border-radius: 12rpx;

  &.elderly-mode {
    padding: 24rpx;
    gap: 20rpx;
    border-radius: 16rpx;
  }

  .reply-tip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8rpx 12rpx;
    background: linear-gradient(135deg, #E6F7FF 0%, #BAE7FF 100%);
    border-radius: 6rpx;
    border-left: 3rpx solid #1890FF;

    .reply-tip-text {
      font-size: 24rpx;
      color: #1890FF;
    }

    .reply-tip-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32rpx;
      height: 32rpx;
      color: #1890FF;
      transition: opacity 0.2s ease;

      &:active {
        opacity: 0.6;
      }
    }
  }

  .input-wrapper {
    display: flex;
    flex-direction: column;
    background: #ffffff;
    border-radius: 8rpx;
    border: 1rpx solid #e8e8e8;
    transition: border-color 0.2s ease;

    &:focus-within {
      border-color: #1890FF;
    }

    .input-textarea {
      width: 100%;
      min-height: 80rpx;
      max-height: 200rpx;
      padding: 12rpx;
      font-size: 28rpx;
      line-height: 1.5;
      color: #333333;
      background: transparent;
      border: none;
      outline: none;

      &::placeholder {
        color: #999999;
      }
    }

    .input-footer {
      display: flex;
      justify-content: flex-end;
      padding: 8rpx 12rpx;
      border-top: 1rpx solid #f0f0f0;

      .char-count {
        font-size: 22rpx;
        color: #999999;
      }
    }
  }

  .input-actions {
    display: flex;
    gap: 12rpx;
    justify-content: flex-end;

    .action-btn {
      display: flex;
      align-items: center;
      gap: 6rpx;
      padding: 10rpx 20rpx;
      border-radius: 6rpx;
      font-size: 26rpx;
      transition: all 0.2s ease;

      &:active {
        transform: scale(0.96);
      }

      &.cancel-btn {
        background: #f0f0f0;
        color: #666666;
      }

      &.submit-btn {
        background: #1890FF;
        color: #ffffff;

        &.is-loading {
          opacity: 0.7;
          pointer-events: none;
        }

        &.is-disabled {
          background: #d9d9d9;
          color: #999999;
          pointer-events: none;
        }
    }

    .btn-text {
      font-size: 26rpx;
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }
  }
}

.elderly-mode {
  .input-textarea {
    min-height: 100rpx;
    max-height: 240rpx;
    padding: 16rpx;
    font-size: 32rpx;
  }

  .input-footer .char-count {
    font-size: 26rpx;
  }

  .input-actions .action-btn {
    padding: 14rpx 28rpx;
    gap: 8rpx;

    .btn-text {
      font-size: 30rpx;
    }
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
  .comment-input {
    .input-wrapper,
    .action-btn,
    .reply-tip-close {
      transition: none;
      &:active {
        transform: none;
      }
    }

    .spin-icon {
      animation: none;
    }
  }
}
</style>
