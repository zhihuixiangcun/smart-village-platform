<template>
  <div v-if="show" class="gift-modal-overlay" @click="closeModal">
    <div class="gift-modal" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">发送礼物</h3>
        <button class="close-btn" @click="closeModal">✕</button>
      </div>

      <div class="modal-body">
        <div class="gift-list">
          <div
            v-for="gift in giftList"
            :key="gift.id"
            class="gift-item"
            :class="{ selected: selectedGift?.id === gift.id }"
            @click="selectGift(gift)"
          >
            <div class="gift-icon">{{ gift.icon }}</div>
            <div class="gift-name">{{ gift.name }}</div>
            <div class="gift-price">{{ gift.price }}金币</div>
          </div>
        </div>

        <div class="amount-section">
          <div class="section-label">发送数量</div>
          <div class="amount-control">
            <button class="amount-btn" @click="decreaseAmount">-</button>
            <input type="number" v-model.number="amount" class="amount-input" min="1" max="99" />
            <button class="amount-btn" @click="increaseAmount">+</button>
          </div>
          <div class="section-hint">当前账户余额: {{ balance }}金币</div>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="send-btn"
          :disabled="!selectedGift || sending"
          @click="sendGift"
        >
          {{ sending ? '发送中...' : `发送 (总价: ${totalPrice}金币)` }}
        </button>
      </div>
    </div>

    <!-- 礼物动画 -->
    <div v-if="showAnimation" class="gift-animation">
      <div class="animation-content">
        <div class="gift-large-icon">{{ selectedGift?.icon }}</div>
        <div class="gift-count">×{{ amount }}</div>
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
  }
})

const emit = defineEmits(['close', 'sent'])

const route = useRoute()
const chatStore = useChatStore()

// 礼物列表
const giftList = ref([
  { id: 1, name: '鲜花', icon: '🌹', price: 1 },
  { id: 2, name: '爱心', icon: '❤️', price: 5 },
  { id: 3, name: '掌声', icon: '👏', price: 10 },
  { id: 4, name: '玫瑰', icon: '🌷', price: 20 },
  { id: 5, name: '钻戒', icon: '💍', price: 50 },
  { id: 6, name: '跑车', icon: '🏎️', price: 100 },
  { id: 7, name: '飞机', icon: '✈️', price: 200 },
  { id: 8, name: '城堡', icon: '🏰', price: 500 },
  { id: 9, name: '火箭', icon: '🚀', price: 1000 }
])

// 状态
const selectedGift = ref(null)
const amount = ref(1)
const balance = ref(5000) // 模拟余额
const sending = ref(false)
const showAnimation = ref(false)

// 总价
const totalPrice = computed(() => {
  if (!selectedGift.value) return 0
  return selectedGift.value.price * amount.value
})

// 选择礼物
const selectGift = (gift) => {
  selectedGift.value = gift
}

// 增加数量
const increaseAmount = () => {
  if (amount.value < 99) {
    amount.value++
  }
}

// 减少数量
const decreaseAmount = () => {
  if (amount.value > 1) {
    amount.value--
  }
}

// 发送礼物
const sendGift = async () => {
  if (!selectedGift.value) return

  sending.value = true

  try {
    const giftData = {
      id: `gift_${Date.now()}`,
      giftId: selectedGift.value.id,
      name: selectedGift.value.name,
      icon: selectedGift.value.icon,
      amount: amount.value,
      price: selectedGift.value.price,
      totalPrice: totalPrice.value
    }

    // 显示动画
    showAnimation.value = true

    await chatStore.sendGiftMessage(route.params.id, giftData)

    setTimeout(() => {
      showAnimation.value = false
      showToast('礼物发送成功', 'success')
      emit('sent', giftData)
      closeModal()
    }, 1500)
  } catch (error) {
    console.error('发送礼物失败:', error)
    showToast('发送礼物失败', 'error')
    showAnimation.value = false
  } finally {
    sending.value = false
  }
}

// 关闭弹窗
const closeModal = () => {
  emit('close')
  // 重置状态
  selectedGift.value = null
  amount.value = 1
}

// 显示 Toast
const showToast = (message, type = 'info') => {
  console.log(`${type.toUpperCase()}: ${message}`)
}
</script>

<style lang="scss" scoped>
.gift-modal-overlay {
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

.gift-modal {
  background: #fff;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
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

  .gift-list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 24px;

    .gift-item {
      padding: 16px 12px;
      border: 2px solid #f0f0f0;
      border-radius: 12px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;

      &:active {
        transform: scale(0.95);
      }

      &.selected {
        border-color: #1890ff;
        background: linear-gradient(135deg, rgba(24, 144, 255, 0.1), rgba(24, 144, 255, 0.05));
      }

      .gift-icon {
        font-size: 36px;
        margin-bottom: 8px;
      }

      .gift-name {
        font-size: 14px;
        color: #333;
        margin-bottom: 4px;
      }

      .gift-price {
        font-size: 12px;
        color: #ff6b6b;
        font-weight: 600;
      }
    }
  }

  .amount-section {
    .section-label {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
    }

    .amount-control {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;

      .amount-btn {
        width: 40px;
        height: 40px;
        border: none;
        background: #f0f0f0;
        border-radius: 8px;
        font-size: 20px;
        font-weight: 600;
        color: #333;
        cursor: pointer;
        transition: all 0.2s;

        &:active {
          background: #e0e0e0;
          transform: scale(0.95);
        }
      }

      .amount-input {
        flex: 1;
        height: 40px;
        border: 2px solid #e8e8e8;
        border-radius: 8px;
        text-align: center;
        font-size: 18px;
        font-weight: 600;
        color: #333;
        outline: none;
        transition: border-color 0.2s;

        &:focus {
          border-color: #1890ff;
        }

        &::placeholder {
          color: #ccc;
        }
      }
    }

    .section-hint {
      font-size: 12px;
      color: #999;
    }
  }
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;

  .send-btn {
    width: 100%;
    padding: 14px;
    border: none;
    background: linear-gradient(135deg, #667eea, #764ba2);
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

.gift-animation {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  animation: fadeIn 0.3s ease;

  .animation-content {
    text-align: center;
    animation: giftFly 1.5s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes giftFly {
    0% {
      transform: scale(0) translateY(100vh);
      opacity: 0;
    }
    50% {
      transform: scale(1.5) translateY(-50vh);
      opacity: 1;
    }
    100% {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }

  .gift-large-icon {
    font-size: 120px;
    margin-bottom: 20px;
  }

  .gift-count {
    font-size: 24px;
    font-weight: 600;
    color: #fff;
  }
}
</style>
