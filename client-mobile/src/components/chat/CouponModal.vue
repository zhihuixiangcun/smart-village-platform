<template>
  <div v-if="show" class="coupon-modal-overlay" @click="closeModal">
    <div class="coupon-modal" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">选择卡券</h3>
        <button class="close-btn" @click="closeModal">✕</button>
      </div>

      <div class="modal-body">
        <div class="tabs">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'my' }"
            @click="activeTab = 'my'"
          >
            我的卡券
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'send' }"
            @click="activeTab = 'send'"
          >
            转赠卡券
          </button>
        </div>

        <!-- 我的卡券列表 -->
        <div v-if="activeTab === 'my'" class="coupon-list">
          <div
            v-for="coupon in myCoupons"
            :key="coupon.id"
            class="coupon-item"
            :class="{ selected: selectedCoupon?.id === coupon.id, expired: coupon.expired }"
            @click="selectCoupon(coupon)"
          >
            <div class="coupon-left">
              <div class="coupon-icon">{{ coupon.icon }}</div>
              <div class="coupon-info">
                <div class="coupon-name">{{ coupon.name }}</div>
                <div class="coupon-desc">{{ coupon.description }}</div>
              </div>
            </div>
            <div class="coupon-right">
              <div class="coupon-status">{{ getStatusText(coupon) }}</div>
            </div>
          </div>

          <div v-if="myCoupons.length === 0" class="empty-state">
            <div class="empty-icon">🎫</div>
            <div class="empty-text">暂无可用卡券</div>
          </div>
        </div>

        <!-- 转赠卡券 -->
        <div v-else class="send-coupon-form">
          <div v-if="selectedCoupon" class="selected-coupon-preview">
            <div class="preview-icon">{{ selectedCoupon.icon }}</div>
            <div class="preview-info">
              <div class="preview-name">{{ selectedCoupon.name }}</div>
              <div class="preview-desc">{{ selectedCoupon.description }}</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">转赠给</label>
            <div class="recipient-display">
              <span class="recipient-avatar">{{ recipientInfo?.avatar || '👤' }}</span>
              <span class="recipient-name">{{ recipientInfo?.name || '对方' }}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">转赠说明（选填）</label>
            <textarea
              v-model="message"
              class="textarea-field"
              placeholder="请输入转赠说明"
              rows="3"
              maxlength="100"
            />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button
          v-if="activeTab === 'my'"
          class="next-btn"
          :disabled="!selectedCoupon || selectedCoupon?.expired"
          @click="activeTab = 'send'"
        >
          下一步
        </button>
        <button
          v-else
          class="send-btn"
          :disabled="sending"
          @click="sendCoupon"
        >
          {{ sending ? '转赠中...' : '确认转赠' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useChatStore } from '@/store/chat'
import { useRoute } from 'vue-router'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  recipient: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'sent'])

const route = useRoute()
const chatStore = useChatStore()

// 状态
const activeTab = ref('my')
const selectedCoupon = ref(null)
const message = ref('')
const sending = ref(false)
const recipientInfo = ref(props.recipient || {})

// 我的卡券列表（模拟数据）
const myCoupons = ref([
  {
    id: 1,
    name: '满100减20',
    description: '全场通用券',
    icon: '🎫',
    type: 'discount',
    value: 20,
    minAmount: 100,
    expired: false,
    expiryDate: '2025-12-31'
  },
  {
    id: 2,
    name: '新人专享券',
    description: '首次下单立减50元',
    icon: '🎁',
    type: 'discount',
    value: 50,
    minAmount: 100,
    expired: false,
    expiryDate: '2025-12-31'
  },
  {
    id: 3,
    name: '免运费券',
    description: '单笔订单免运费',
    icon: '🚚',
    type: 'shipping',
    value: 0,
    minAmount: 50,
    expired: true,
    expiryDate: '2024-12-31'
  },
  {
    id: 4,
    name: '农资折扣券',
    description: '农资专区满300减50',
    icon: '🌾',
    type: 'discount',
    value: 50,
    minAmount: 300,
    expired: false,
    expiryDate: '2025-06-30'
  },
  {
    id: 5,
    name: '生活服务券',
    description: '生活服务满50减10',
    icon: '🛒',
    type: 'discount',
    value: 10,
    minAmount: 50,
    expired: false,
    expiryDate: '2025-12-31'
  }
])

// 获取状态文本
const getStatusText = (coupon) => {
  if (coupon.expired) return '已过期'
  return '可使用'
}

// 选择卡券
const selectCoupon = (coupon) => {
  if (coupon.expired) {
    showToast('该卡券已过期', 'warning')
    return
  }
  selectedCoupon.value = coupon
}

// 发送卡券
const sendCoupon = async () => {
  if (!selectedCoupon.value) return

  sending.value = true

  try {
    const couponData = {
      id: `coupon_${Date.now()}`,
      couponId: selectedCoupon.value.id,
      name: selectedCoupon.value.name,
      description: selectedCoupon.value.description,
      icon: selectedCoupon.value.icon,
      type: selectedCoupon.value.type,
      value: selectedCoupon.value.value,
      minAmount: selectedCoupon.value.minAmount,
      expiryDate: selectedCoupon.value.expiryDate,
      message: message.value,
      recipientId: recipientInfo.value?.id || '',
      recipientName: recipientInfo.value?.name || ''
    }

    await chatStore.sendCouponMessage(route.params.id, couponData)

    showToast('卡券转赠成功', 'success')
    emit('sent', couponData)

    // 重置状态
    selectedCoupon.value = null
    message.value = ''
    activeTab.value = 'my'

    closeModal()
  } catch (error) {
    console.error('转赠卡券失败:', error)
    showToast('转赠卡券失败', 'error')
  } finally {
    sending.value = false
  }
}

// 关闭弹窗
const closeModal = () => {
  emit('close')
}

// 显示 Toast
const showToast = (message, type = 'info') => {
  console.log(`${type.toUpperCase()}: ${message}`)
}
</script>

<style lang="scss" scoped>
.coupon-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(5px);
}

.coupon-modal {
  background: #fff;
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modalSlideUp 0.3s ease;
}

@keyframes modalSlideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;

  .modal-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: #999;
    cursor: pointer;
    padding: 4px;

    &:active {
      color: #666;
    }
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;

  .tabs {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;

    .tab-btn {
      flex: 1;
      padding: 10px;
      border: none;
      background: #f5f5f5;
      border-radius: 8px;
      font-size: 14px;
      color: #666;
      cursor: pointer;
      transition: all 0.2s;

      &.active {
        background: linear-gradient(135deg, #f093fb, #f5576c);
        color: #fff;
      }

      &:active {
        transform: scale(0.98);
      }
    }
  }

  .coupon-list {
    .coupon-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border: 2px solid #f0f0f0;
      border-radius: 12px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.2s;

      &:active {
        transform: scale(0.98);
      }

      &.selected {
        border-color: #1890ff;
        background: linear-gradient(135deg, rgba(24, 144, 255, 0.1), rgba(24, 144, 255, 0.05));
      }

      &.expired {
        opacity: 0.5;
        cursor: not-allowed;

        &:active {
          transform: none;
        }
      }

      .coupon-left {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;

        .coupon-icon {
          font-size: 36px;
          flex-shrink: 0;
        }

        .coupon-info {
          flex: 1;

          .coupon-name {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin-bottom: 4px;
          }

          .coupon-desc {
            font-size: 12px;
            color: #999;
          }
        }
      }

      .coupon-right {
        flex-shrink: 0;

        .coupon-status {
          font-size: 12px;
          color: #1890ff;
          padding: 4px 8px;
          background: rgba(24, 144, 255, 0.1);
          border-radius: 4px;
          font-weight: 500;
        }

        .coupon-item.expired & .coupon-status {
          color: #999;
          background: #f5f5f5;
        }
      }
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;

      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .empty-text {
        font-size: 14px;
        color: #999;
      }
    }
  }

  .send-coupon-form {
    .selected-coupon-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: linear-gradient(135deg, rgba(240, 147, 251, 0.1), rgba(245, 87, 108, 0.1));
      border: 2px solid #f093fb;
      border-radius: 12px;
      margin-bottom: 24px;

      .preview-icon {
        font-size: 36px;
        flex-shrink: 0;
      }

      .preview-info {
        flex: 1;

        .preview-name {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .preview-desc {
          font-size: 12px;
          color: #666;
        }
      }
    }

    .form-group {
      margin-bottom: 20px;

      .form-label {
        display: block;
        font-size: 14px;
        color: #333;
        margin-bottom: 8px;
        font-weight: 500;
      }

      .recipient-display {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: #f5f5f5;
        border-radius: 8px;

        .recipient-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e8e8e8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .recipient-name {
          font-size: 16px;
          color: #333;
        }
      }

      .textarea-field {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e8e8e8;
        border-radius: 8px;
        font-size: 16px;
        outline: none;
        resize: none;
        transition: border-color 0.2s;

        &:focus {
          border-color: #1890ff;
        }

        &::placeholder {
          color: #ccc;
        }
      }
    }
  }
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;

  .next-btn,
  .send-btn {
    width: 100%;
    padding: 14px;
    border: none;
    background: linear-gradient(135deg, #f093fb, #f5576c);
    color: #fff;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &:not(:disabled):active {
      transform: scale(0.98);
    }
  }
}
</style>
