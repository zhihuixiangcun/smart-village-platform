<template>
  <el-dialog
    v-model="dialogVisible"
    title="二维码信息"
    width="500px"
    :close-on-click-modal="false"
    class="qr-code-dialog"
  >
    <div v-if="resident" class="qr-code-content">
      <!-- 村民基本信息 -->
      <div class="resident-info">
        <el-avatar
          :size="60"
          :src="resident.avatar"
          :icon="UserFilled"
          class="resident-avatar"
        />
        <div class="info">
          <h3>{{ resident.name }}</h3>
          <p>户码：{{ resident.householdCode }}</p>
          <p>{{ resident.gender === 'male' ? '男' : '女' }} | {{ resident.age }}岁</p>
        </div>
      </div>

      <!-- 二维码显示 -->
      <div class="qr-code-section">
        <div class="qr-code-container">
          <canvas ref="qrCodeCanvas" class="qr-code-canvas"></canvas>
        </div>
        <div class="qr-code-info">
          <p class="code-text">{{ resident.householdCode }}</p>
          <p class="scan-tip">扫描二维码查看村民信息</p>
        </div>
      </div>

      <!-- 功能按钮 -->
      <div class="action-buttons">
        <el-button
          type="primary"
          @click="downloadQRCode"
          icon="Download"
        >
          下载二维码
        </el-button>
        <el-button
          type="success"
          @click="printQRCode"
          icon="Printer"
        >
          打印二维码
        </el-button>
        <el-button
          @click="regenerateQRCode"
          icon="Refresh"
        >
          重新生成
        </el-button>
      </div>

      <!-- 二维码用途说明 -->
      <div class="usage-info">
        <el-alert
          title="二维码用途说明"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <ul>
              <li>快速查看村民基本信息</li>
              <li>应急情况人员定位</li>
              <li>政策补贴资格验证</li>
              <li>医疗健康信息查询</li>
            </ul>
          </template>
        </el-alert>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { UserFilled, Download, Printer, Refresh } from '@element-plus/icons-vue'
import QRCode from 'qrcode'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  resident: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const qrCodeCanvas = ref()

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 生成二维码数据
const generateQRCodeData = () => {
  if (!props.resident) return ''

  const qrData = {
    type: 'resident_info',
    householdCode: props.resident.householdCode,
    name: props.resident.name,
    id: props.resident.id,
    timestamp: Date.now()
  }

  return JSON.stringify(qrData)
}

// 生成二维码
const generateQRCode = async () => {
  if (!qrCodeCanvas.value || !props.resident) return

  try {
    const qrData = generateQRCodeData()

    await QRCode.toCanvas(qrCodeCanvas.value, qrData, {
      width: 200,
      height: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
  } catch (error) {
    console.error('生成二维码失败:', error)
    ElMessage.error('生成二维码失败')
  }
}

// 下载二维码
const downloadQRCode = () => {
  if (!qrCodeCanvas.value) return

  try {
    const link = document.createElement('a')
    link.download = `${props.resident.name}_${props.resident.householdCode}_qrcode.png`
    link.href = qrCodeCanvas.value.toDataURL()
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    ElMessage.success('二维码下载成功')
  } catch (error) {
    console.error('下载二维码失败:', error)
    ElMessage.error('下载二维码失败')
  }
}

// 打印二维码
const printQRCode = () => {
  if (!qrCodeCanvas.value) return

  try {
    const printWindow = window.open('', '_blank')
    const imageData = qrCodeCanvas.value.toDataURL()

    printWindow.document.write(`
      <html>
        <head>
          <title>村民二维码 - ${props.resident.name}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              text-align: center;
            }
            .print-container {
              max-width: 300px;
              margin: 0 auto;
            }
            .resident-info {
              margin-bottom: 20px;
            }
            .qr-code {
              margin: 20px 0;
            }
            .code-text {
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
            }
            .tips {
              font-size: 12px;
              color: #666;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="resident-info">
              <h2>${props.resident.name}</h2>
              <p>户码：${props.resident.householdCode}</p>
              <p>${props.resident.gender === 'male' ? '男' : '女'} | ${props.resident.age}岁</p>
            </div>
            <div class="qr-code">
              <img src="${imageData}" alt="二维码" style="width: 200px; height: 200px;" />
            </div>
            <div class="code-text">${props.resident.householdCode}</div>
            <div class="tips">
              <p>扫描二维码查看村民信息</p>
              <p>智慧村庄管理平台</p>
            </div>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.print()

    ElMessage.success('正在打印二维码')
  } catch (error) {
    console.error('打印二维码失败:', error)
    ElMessage.error('打印二维码失败')
  }
}

// 重新生成二维码
const regenerateQRCode = async () => {
  try {
    await generateQRCode()
    ElMessage.success('二维码已重新生成')
  } catch (error) {
    ElMessage.error('重新生成二维码失败')
  }
}

// 监听对话框显示状态
watch(() => props.modelValue, (newVal) => {
  if (newVal && props.resident) {
    nextTick(() => {
      generateQRCode()
    })
  }
})
</script>

<style lang="scss" scoped>
.qr-code-dialog {
  .qr-code-content {
    text-align: center;

    .resident-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 30px;

      .resident-avatar {
        border: 2px solid #e0e0e0;
      }

      .info {
        text-align: left;

        h3 {
          margin: 0 0 8px 0;
          color: #303133;
          font-size: 18px;
        }

        p {
          margin: 4px 0;
          color: #606266;
          font-size: 14px;
        }
      }
    }

    .qr-code-section {
      margin-bottom: 30px;

      .qr-code-container {
        display: flex;
        justify-content: center;
        margin-bottom: 15px;

        .qr-code-canvas {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
      }

      .qr-code-info {
        .code-text {
          font-size: 18px;
          font-weight: bold;
          color: #303133;
          margin: 10px 0;
          font-family: monospace;
        }

        .scan-tip {
          color: #909399;
          font-size: 14px;
          margin: 0;
        }
      }
    }

    .action-buttons {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 30px;
      flex-wrap: wrap;
    }

    .usage-info {
      text-align: left;

      :deep(.el-alert__content) {
        ul {
          margin: 8px 0 0 0;
          padding-left: 20px;

          li {
            margin: 4px 0;
            color: #606266;
          }
        }
      }
    }
  }
}

.dialog-footer {
  text-align: center;
}

// 响应式设计
@media (max-width: 768px) {
  .qr-code-dialog {
    .qr-code-content {
      .resident-info {
        flex-direction: column;
        text-align: center;

        .info {
          text-align: center;
        }
      }

      .action-buttons {
        flex-direction: column;
        align-items: center;

        .el-button {
          width: 200px;
        }
      }
    }
  }
}
</style>