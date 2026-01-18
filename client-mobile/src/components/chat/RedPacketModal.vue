<template>
  <div v-if="show" class="redpacket-modal-overlay" @click="closeModal">
    <div class="redpacket-modal" @click.stop>
      <!-- 发送红包 -->
      <div v-if="!redPacketId" class="send-redpacket">
        <div class="modal-header">
          <h3 class="modal-title">发红包</h3>
          <button class="close-btn" @click="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <div class="tabs">
            <button
              class="tab-btn"
              :class="{ active: packetType === 'random' }"
              @click="packetType = 'random'"
            >
              拼手气红包
            </button>
            <button
              class="tab-btn"
              :class="{ active: packetType === 'fixed' }"
              @click="packetType = 'fixed'"
            >
              普通红包
            </button>
          </div>

          <div class="form-group">
            <label class="form-label">红包金额</label>
            <div class="amount-input">
              <span class="currency">¥</span>
              <input
                type="number"
                v-model.number="amount"
                class="amount-field"
                placeholder="0.00"
                @input="validateAmount"
              />
            </div>
            <div class="form-hint">当前账户余额: ¥{{ balance.toFixed(2) }}</div>
          </div>

          <div v-if="packetType === 'random'" class="form-group">
            <label class="form-label">红包个数</label>
            <input
              type="number"
              v-model.number="count"
              class="input-field"
              placeholder="请输入个数"
              min="1"
              max="100"
              @input="validateCount"
            />
          </div>

          <div class="form-group">
            <label class="form-label">祝福语</label>
            <input
              type="text"
              v-model="greeting"
              class="input-field"
              placeholder="恭喜发财，大吉大利"
              maxlength="20"
            />
          </div>

          <div class="form-group" v-if="packetType === 'random'">
            <label class="form-label">总金额</label>
            <div class="total-amount">¥{{ (amount || 0).toFixed(2) }}</div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            class="send-btn"
            :disabled="!isValid || sending"
            @click="sendRedPacket"
          >
            {{ sending ? '发送中...' : `塞钱进红包 (¥${(amount || 0).toFixed(2)})` }}
          </button>
        </div>
      </div>

      <!-- 打开红包 -->
      <div v-else class="open-redpacket">
        <div class="open-header">
          <div class="avatar">{{ senderInfo?.avatar || '👤' }}</div>
          <div class="sender-name">{{ senderInfo?.name || '匿名' }}的红包</div>
          <div class="packet-greeting">{{ packetData?.greeting || '恭喜发财，大吉大利' }}</div>
        </div>

        <div v-if="!opened" class="open-body">
          <button class="open-btn" @click="openRedPacket">
            <span class="open-icon">🧧</span>
            <span class="open-text">开</span>
          </button>
        </div>

        <div v-else class="result-body">
          <div class="result-amount">¥{{ (receivedAmount || 0).toFixed(2) }}</div>
          <div class="result-label">已存入零钱，可直接消费</div>
          <div class="result-detail">
            <div class="detail-item">
              <span class="label">随机金额</span>
              <span class="value">¥{{ (receivedAmount || 0).toFixed(2) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">领取时间</span>
              <span class="value">{{ receivedTime }}</span>
            </div>
          </div>
        </div>

        <div class="open-footer">
          <button class="close-btn-text" @click="closeModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useChatStore } from '@/store/chat'
import { useRoute } from 'vue-router'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    default: 'send' // send | open
  },
  redPacketId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'sent', 'opened'])

const route = useRoute()
const chatStore = useChatStore()

// 状态
const packetType = ref('random') // random | fixed
const amount = ref(null)
const count = ref(1)
const greeting = ref('恭喜发财，大吉大利')
const balance = ref(1000.00) // 模拟余额
const sending = ref(false)
const opened = ref(false)
const receivedAmount = ref(null)
const receivedTime = ref('')
const senderInfo = ref(null)
const packetData = ref(null)

// 验证
const isValid = computed(() => {
  if (!amount.value || amount.value <= 0) return false
  if (amount.value > balance.value) return false
  if (packetType.value === 'random' && (!count.value || count.value < 1 || count.value > 100)) return false
  return true
})

// 验证金额
const validateAmount = () => {
  if (amount.value && amount.value > balance.value) {
    amount.value = balance.value
  }
}

// 验证个数
const validateCount = () => {
  if (count.value && count.value > 100) {
    count.value = 100
  } else if (count.value && count.value < 1) {
    count.value = 1
  }
}

// 发送红包
const sendRedPacket = async () => {
  if (!isValid.value) return

  sending.value = true

  try {
    const redPacketData = {
      id: `rp_${Date.now()}`,
      type: packetType.value,
      amount: amount.value,
      count: count.value,
      greeting: greeting.value,
      status: 'pending'
    }

    await chatStore.sendRedPacketMessage(route.params.id, redPacketData)

    showToast('红包发送成功', 'success')
    emit('sent', redPacketData)

    // 重置表单
    amount.value = null
    count.value = 1
    greeting.value = '恭喜发财，大吉大利'

    closeModal()
  } catch (error) {
    console.error('发送红包失败:', error)
    showToast('发送红包失败', 'error')
  } finally {
    sending.value = false
  }
}

// 打开红包
const openRedPacket = async () => {
  try {
    // 模拟打开红包
    const result = await new Promise(resolve => {
      setTimeout(() => {
        // 随机金额
        const randomAmount = (Math.random() * (amount.value || 10)).toFixed(2)
        resolve({
          amount: parseFloat(randomAmount),
          time: new Date().toLocaleString('zh-CN')
        })
      }, 500)
    })

    receivedAmount.value = result.amount
    receivedTime.value = result.time
    opened.value = true

    emit('opened', {
      id: props.redPacketId,
      amount: result.amount
    })
  } catch (error) {
    console.error('打开红包失败:', error)
    showToast('打开红包失败', 'error')
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

// 监听 redPacketId 变化，加载红包信息
watch(() => props.redPacketId, (newId) => {
  if (newId && props.mode === 'open') {
    // 模拟加载红包信息
    packetData.value = {
      id: newId,
      amount: 100,
      count: 10,
      greeting: '恭喜发财，大吉大利'
    }
    senderInfo.value = {
      name: '村支书',
      avatar: '👨‍💼'
    }
  }
})
</script>

<style lang="scss" scoped>
.redpacket-modal-overlay {
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

.redpacket-modal {
  background: #fff;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
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

.send-redpacket {
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
          background: linear-gradient(135deg, #ff6b6b, #ff8e53);
          color: #fff;
        }

        &:active {
          transform: scale(0.98);
        }
      }
    }

    .form-group {
      margin-bottom: 16px;

      .form-label {
        display: block;
        font-size: 14px;
        color: #333;
        margin-bottom: 8px;
        font-weight: 500;
      }

      .amount-input {
        display: flex;
        align-items: center;
        border: 2px solid #e8e8e8;
        border-radius: 8px;
        padding: 12px 16px;
        transition: border-color 0.2s;

        &:focus-within {
          border-color: #ff6b6b;
        }

        .currency {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin-right: 8px;
        }

        .amount-field {
          flex: 1;
          border: none;
          font-size: 28px;
          font-weight: 600;
          color: #333;
          outline: none;
          background: transparent;

          &::placeholder {
            color: #ccc;
          }
        }
      }

      .input-field {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e8e8e8;
        border-radius: 8px;
        font-size: 16px;
        outline: none;
        transition: border-color 0.2s;

        &:focus {
          border-color: #ff6b6b;
        }

        &::placeholder {
          color: #ccc;
        }
      }

      .form-hint {
        font-size: 12px;
        color: #999;
        margin-top: 4px;
      }

      .total-amount {
        font-size: 32px;
        font-weight: 600;
        color: #ff6b6b;
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
      background: linear-gradient(135deg, #ff6b6b, #ff8e53);
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
}

.open-redpacket {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  color: #fff;

  .open-header {
    text-align: center;
    padding: 40px 20px 20px;

    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      margin: 0 auto 16px;
    }

    .sender-name {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .packet-greeting {
      font-size: 16px;
      opacity: 0.9;
    }
  }

  .open-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;

    .open-btn {
      width: 120px;
      height: 120px;
      border: none;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;

      &:active {
        transform: scale(0.95);
      }

      .open-icon {
        font-size: 48px;
        margin-bottom: 8px;
      }

      .open-text {
        font-size: 24px;
        font-weight: 600;
      }
    }
  }

  .result-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;

    .result-amount {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .result-label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 32px;
    }

    .result-detail {
      width: 100%;
      max-width: 280px;

      .detail-item {
        display: flex;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);

        &:last-child {
          border-bottom: none;
        }

        .label {
          font-size: 14px;
          opacity: 0.8;
        }

        .value {
          font-size: 16px;
          font-weight: 600;
        }
      }
    }
  }

  .open-footer {
    padding: 20px;

    .close-btn-text {
      width: 100%;
      padding: 12px;
      border: none;
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s;

      &:active {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }
}
</style>
