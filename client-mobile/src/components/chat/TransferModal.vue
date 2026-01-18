<template>
  <div v-if="show" class="transfer-modal-overlay" @click="closeModal">
    <div class="transfer-modal" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">转账</h3>
        <button class="close-btn" @click="closeModal">✕</button>
      </div>

      <div class="modal-body">
        <div class="recipient-info">
          <div class="avatar">{{ recipientInfo?.avatar || '👤' }}</div>
          <div class="recipient-name">{{ recipientInfo?.name || '对方' }}</div>
        </div>

        <div class="form-group">
          <label class="form-label">转账金额</label>
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

        <div class="form-group">
          <label class="form-label">转账说明（选填）</label>
          <input
            type="text"
            v-model="note"
            class="input-field"
            placeholder="请输入转账说明"
            maxlength="50"
          />
        </div>

        <div class="security-tip">
          <div class="tip-icon">🔒</div>
          <div class="tip-text">
            转账后资金将直接进入对方账户，无法退回。请确认收款人信息无误后再转账。
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="send-btn"
          :disabled="!isValid || sending"
          @click="sendTransfer"
        >
          {{ sending ? '转账中...' : '确认转账' }}
        </button>
      </div>
    </div>

    <!-- 支付密码弹窗 -->
    <div v-if="showPasswordModal" class="password-modal-overlay">
      <div class="password-modal">
        <div class="password-header">
          <h3 class="password-title">请输入支付密码</h3>
          <button class="close-btn" @click="showPasswordModal = false">✕</button>
        </div>

        <div class="password-body">
          <div class="password-inputs">
            <div
              v-for="(digit, index) in passwordDigits"
              :key="index"
              class="password-digit"
              :class="{ filled: digit }"
            >
              {{ digit ? '•' : '' }}
            </div>
          </div>

          <div class="password-keypad">
            <button
              v-for="key in keypad"
              :key="key.value"
              class="keypad-btn"
              @click="handleKeypad(key.value)"
            >
              {{ key.display }}
            </button>
          </div>
        </div>
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
const amount = ref(null)
const note = ref('')
const balance = ref(5000.00) // 模拟余额
const sending = ref(false)
const showPasswordModal = ref(false)
const passwordDigits = ref(['', '', '', '', '', ''])
const recipientInfo = ref(props.recipient || {})

// 数字键盘
const keypad = [
  { value: '1', display: '1' },
  { value: '2', display: '2' },
  { value: '3', display: '3' },
  { value: '4', display: '4' },
  { value: '5', display: '5' },
  { value: '6', display: '6' },
  { value: '7', display: '7' },
  { value: '8', display: '8' },
  { value: '9', display: '9' },
  { value: '', display: '' },
  { value: '0', display: '0' },
  { value: 'del', display: '⌫' }
]

// 验证
const isValid = computed(() => {
  if (!amount.value || amount.value <= 0) return false
  if (amount.value > balance.value) return false
  return true
})

// 验证金额
const validateAmount = () => {
  if (amount.value && amount.value > balance.value) {
    amount.value = balance.value
  }
}

// 处理键盘输入
const handleKeypad = (value) => {
  if (value === 'del') {
    // 删除最后一位
    for (let i = 5; i >= 0; i--) {
      if (passwordDigits.value[i]) {
        passwordDigits.value[i] = ''
        break
      }
    }
  } else {
    // 输入数字
    for (let i = 0; i < 6; i++) {
      if (!passwordDigits.value[i]) {
        passwordDigits.value[i] = value
        break
      }
    }

    // 检查是否已输入6位
    if (passwordDigits.value.every(d => d)) {
      setTimeout(() => {
        confirmTransfer()
      }, 200)
    }
  }
}

// 发起转账
const sendTransfer = () => {
  if (!isValid.value) return

  // 显示密码输入
  showPasswordModal.value = true
  passwordDigits.value = ['', '', '', '', '', '']
}

// 确认转账
const confirmTransfer = async () => {
  const password = passwordDigits.value.join('')

  if (password.length !== 6) {
    showToast('请输入6位支付密码', 'error')
    return
  }

  // 验证密码（模拟）
  if (password !== '123456') {
    showToast('支付密码错误', 'error')
    passwordDigits.value = ['', '', '', '', '', '']
    return
  }

  sending.value = true
  showPasswordModal.value = false

  try {
    const transferData = {
      id: `transfer_${Date.now()}`,
      amount: amount.value,
      note: note.value,
      recipientId: recipientInfo.value?.id || '',
      recipientName: recipientInfo.value?.name || '',
      status: 'sent'
    }

    await chatStore.sendTransferMessage(route.params.id, transferData)

    showToast('转账成功', 'success')
    emit('sent', transferData)

    // 重置表单
    amount.value = null
    note.value = ''

    closeModal()
  } catch (error) {
    console.error('转账失败:', error)
    showToast('转账失败', 'error')
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
.transfer-modal-overlay {
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

.transfer-modal {
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

  .recipient-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 24px;

    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin-bottom: 8px;
    }

    .recipient-name {
      font-size: 16px;
      font-weight: 600;
      color: #333;
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

    .amount-input {
      display: flex;
      align-items: center;
      border: 2px solid #e8e8e8;
      border-radius: 8px;
      padding: 12px 16px;
      transition: border-color 0.2s;

      &:focus-within {
        border-color: #1890ff;
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
        border-color: #1890ff;
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
  }

  .security-tip {
    display: flex;
    gap: 12px;
    padding: 12px;
    background: #fff7e6;
    border: 1px solid #ffd591;
    border-radius: 8px;

    .tip-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .tip-text {
      flex: 1;
      font-size: 12px;
      color: #874d00;
      line-height: 1.5;
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

// 支付密码弹窗
.password-modal-overlay {
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
}

.password-modal {
  background: #fff;
  border-radius: 16px;
  width: 90%;
  max-width: 360px;
  overflow: hidden;
  animation: modalSlideUp 0.3s ease;

  .password-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f0;

    .password-title {
      font-size: 16px;
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

  .password-body {
    padding: 24px 20px;

    .password-inputs {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 24px;

      .password-digit {
        width: 44px;
        height: 44px;
        border: 2px solid #e8e8e8;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: 600;
        color: #333;
        background: #fafafa;
        transition: all 0.2s;

        &.filled {
          border-color: #1890ff;
          background: #fff;
        }
      }
    }

    .password-keypad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;

      .keypad-btn {
        height: 48px;
        border: none;
        background: #f5f5f5;
        border-radius: 8px;
        font-size: 20px;
        font-weight: 600;
        color: #333;
        cursor: pointer;
        transition: all 0.1s;

        &:active {
          background: #e0e0e0;
          transform: scale(0.95);
        }

        &:empty {
          background: transparent;
          cursor: default;

          &:active {
            transform: none;
          }
        }
      }
    }
  }
}
</style>
