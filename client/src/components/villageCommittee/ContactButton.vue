<template>
  <div class="contact-button">
    <el-button
      :type="type"
      :size="size"
      :disabled="disabled"
      @click="handleContact"
      :loading="calling"
    >
      <el-icon v-if="!calling">
        <component :is="icon" />
      </el-icon>
      <span v-if="showText">{{ buttonText }}</span>
    </el-button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Phone, Message, ChatDotRound } from '@element-plus/icons-vue'

const props = defineProps({
  contactType: {
    type: String,
    default: 'phone', // phone, sms, chat
    validator: (value) => ['phone', 'sms', 'chat'].includes(value)
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  buttonText: {
    type: String,
    default: '联系'
  },
  type: {
    type: String,
    default: 'primary'
  },
  size: {
    type: String,
    default: 'default'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  showText: {
    type: Boolean,
    default: true
  },
  confirmBeforeCall: {
    type: Boolean,
    default: false
  },
  customName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['contact', 'before-contact'])

const calling = ref(false)

const icon = computed(() => {
  const iconMap = {
    phone: Phone,
    sms: Message,
    chat: ChatDotRound
  }
  return iconMap[props.contactType] || Phone
})

const handleContact = async () => {
  if (calling.value || props.disabled) return

  // 发出before-contact事件，允许父组件阻止联系
  const canContinue = await new Promise((resolve) => {
    emit('before-contact', {
      type: props.contactType,
      contact: props.phoneNumber,
      allow: resolve
    })
  })

  if (!canContinue) return

  // 如果需要确认
  if (props.confirmBeforeCall) {
    try {
      await ElMessageBox.confirm(
        `确定要${getContactText()}${props.customName || props.phoneNumber}吗？`,
        '联系确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'info'
        }
      )
    } catch {
      return
    }
  }

  calling.value = true

  try {
    await executeContact()
    ElMessage.success(`${getContactText()}成功`)
    emit('contact', {
      type: props.contactType,
      contact: props.phoneNumber,
      success: true
    })
  } catch (error) {
    console.error('Contact failed:', error)
    ElMessage.error(`${getContactText()}失败`)
    emit('contact', {
      type: props.contactType,
      contact: props.phoneNumber,
      success: false,
      error
    })
  } finally {
    calling.value = false
  }
}

const executeContact = () => {
  return new Promise((resolve, reject) => {
    switch (props.contactType) {
      case 'phone':
        // 拨打电话
        if (!props.phoneNumber) {
          reject(new Error('电话号码不能为空'))
          return
        }
        window.location.href = `tel:${props.phoneNumber}`
        setTimeout(resolve, 1000)
        break

      case 'sms':
        // 发送短信
        if (!props.phoneNumber) {
          reject(new Error('电话号码不能为空'))
          return
        }
        window.location.href = `sms:${props.phoneNumber}`
        setTimeout(resolve, 1000)
        break

      case 'chat':
        // 打开聊天界面
        resolve()
        break

      default:
        reject(new Error('不支持的联系方式'))
    }
  })
}

const getContactText = () => {
  const textMap = {
    phone: '呼叫',
    sms: '发送短信',
    chat: '发起聊天'
  }
  return textMap[props.contactType] || '联系'
}
</script>

<style lang="scss" scoped>
.contact-button {
  display: inline-block;

  .el-button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
}
</style>