<template>
  <el-dialog
    v-model="visible"
    title="一户一码"
    width="450px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <div class="family-qrcode-container">
      <!-- 二维码展示区 -->
      <div class="qrcode-display">
        <div class="qrcode-wrapper">
          <VueQrcode
            v-if="familyQRCode"
            :value="familyQRCode"
            :size="250"
            :margin="2"
            :level="'M'"
          />
          <el-skeleton v-else :rows="1" animated />
        </div>
        <p class="qrcode-tip">扫码查看我们家信息</p>
      </div>

      <!-- 家庭信息摘要 -->
      <el-divider>家庭信息</el-divider>
      <div class="family-summary">
        <div class="summary-item">
          <el-icon><User /></el-icon>
          <span>户主：{{ familyInfo.headOfHousehold }}</span>
        </div>
        <div class="summary-item">
          <el-icon><House /></el-icon>
          <span>家庭编号：{{ familyInfo.familyCode }}</span>
        </div>
        <div class="summary-item">
          <el-icon><UserFilled /></el-icon>
          <span>成员人数：{{ familyInfo.memberCount }}人</span>
        </div>
        <div class="summary-item">
          <el-icon><Location /></el-icon>
          <span>住址：{{ familyInfo.address }}</span>
        </div>
      </div>

      <!-- 隐私设置 -->
      <el-divider>隐私设置</el-divider>
      <div class="privacy-settings">
        <p class="privacy-tip">选择哪些人可以扫码查看您的家庭信息</p>
        <el-radio-group v-model="privacyLevel" @change="handlePrivacyChange">
          <el-radio label="public" size="large">
            <div class="radio-content">
              <div class="radio-title">公开</div>
              <div class="radio-desc">所有人可查看基本信息</div>
            </div>
          </el-radio>
          <el-radio label="village" size="large">
            <div class="radio-content">
              <div class="radio-title">村民可见</div>
              <div class="radio-desc">本村村民可查看详细信息</div>
            </div>
          </el-radio>
          <el-radio label="private" size="large">
            <div class="radio-content">
              <div class="radio-title">仅家人可见</div>
              <div class="radio-desc">不对外展示任何信息</div>
            </div>
          </el-radio>
        </el-radio-group>
      </div>

      <!-- 功能说明 -->
      <el-collapse class="qrcode-features" style="margin-top: 16px">
        <el-collapse-item title="功能说明" name="1">
          <div class="feature-list">
            <div class="feature-item">
              <el-icon color="#67c23a"><CircleCheck /></el-icon>
              <span>扫码快速添加家庭成员</span>
            </div>
            <div class="feature-item">
              <el-icon color="#67c23a"><CircleCheck /></el-icon>
              <span>村务活动签到登记</span>
            </div>
            <div class="feature-item">
              <el-icon color="#67c23a"><CircleCheck /></el-icon>
              <span>邻里之间互相访问</span>
            </div>
            <div class="feature-item">
              <el-icon color="#67c23a"><CircleCheck /></el-icon>
              <span>紧急情况快速联系</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>

      <!-- 操作按钮 -->
      <div class="qrcode-actions">
        <el-button icon="Download" @click="downloadQRCode" :loading="downloading">
          保存图片
        </el-button>
        <el-button icon="Printer" @click="printQRCode">
          打印张贴
        </el-button>
        <el-button icon="Share" @click="shareQRCode" type="primary">
          分享家人
        </el-button>
      </div>

      <!-- 刷新二维码 -->
      <div class="qrcode-refresh">
        <el-button text icon="Refresh" @click="refreshQRCode">
          刷新二维码
        </el-button>
        <span class="refresh-tip">定期刷新可提高安全性</span>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  User,
  House,
  UserFilled,
  Location,
  CircleCheck,
  Refresh,
  Download,
  Printer,
  Share
} from '@element-plus/icons-vue'
import VueQrcode from '@chenfengyuan/vue-qrcode'
import { familyApi } from '@/api/family'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  familyId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 家庭信息
const familyInfo = ref({
  familyCode: '',
  headOfHousehold: '',
  memberCount: 0,
  address: ''
})

// 二维码数据
const familyQRCode = ref('')
const privacyLevel = ref('village')
const downloading = ref(false)

// 生成家庭二维码
const generateFamilyQRCode = async () => {
  try {
    if (!props.familyId) {
      ElMessage.error('缺少家庭ID')
      return
    }

    // 调用API获取家庭二维码数据
    const response = await familyApi.getFamilyQRCode(props.familyId)

    if (response.data) {
      familyQRCode.value = response.data.qrcode
      familyInfo.value = {
        familyCode: response.data.familyCode,
        headOfHousehold: response.data.headOfHousehold,
        memberCount: response.data.memberCount,
        address: response.data.address
      }
      privacyLevel.value = response.data.privacyLevel || 'village'
    }
  } catch (error) {
    ElMessage.error('生成二维码失败')
    console.error('Generate QR code error:', error)
  }
}

// 刷新二维码
const refreshQRCode = async () => {
  try {
    await familyApi.refreshFamilyQRCode(props.familyId)
    await generateFamilyQRCode()
    ElMessage.success('二维码已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
    console.error('Refresh QR code error:', error)
  }
}

// 隐私设置变更
const handlePrivacyChange = async (value) => {
  try {
    await familyApi.updatePrivacySettings(props.familyId, {
      privacyLevel: value
    })
    ElMessage.success('隐私设置已更新')
  } catch (error) {
    ElMessage.error('更新失败')
    console.error('Update privacy error:', error)
  }
}

// 下载二维码
const downloadQRCode = () => {
  try {
    downloading.value = true

    // 获取二维码图片
    const qrcodeImg = document.querySelector('.qrcode-wrapper img')
    if (!qrcodeImg) {
      ElMessage.error('二维码未生成')
      return
    }

    // 创建下载链接
    const link = document.createElement('a')
    link.href = qrcodeImg.src
    link.download = `家庭二维码-${familyInfo.value.familyCode}.png`
    link.click()

    ElMessage.success('二维码已保存')
  } catch (error) {
    ElMessage.error('保存失败')
    console.error('Download error:', error)
  } finally {
    downloading.value = false
  }
}

// 打印二维码
const printQRCode = () => {
  try {
    const printWindow = window.open('', '_blank')
    const qrcodeImg = document.querySelector('.qrcode-wrapper img')

    if (!qrcodeImg) {
      ElMessage.error('二维码未生成')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>家庭二维码 - ${familyInfo.value.familyCode}</title>
          <style>
            body {
              font-family: "Microsoft YaHei", sans-serif;
              text-align: center;
              padding: 40px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            .info {
              color: #666;
              margin-bottom: 30px;
            }
            .qrcode {
              margin: 20px 0;
            }
            .tip {
              color: #999;
              font-size: 14px;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <h1>一户一码</h1>
          <div class="info">
            户主：${familyInfo.value.headOfHousehold}<br>
            家庭编号：${familyInfo.value.familyCode}<br>
            地址：${familyInfo.value.address}
          </div>
          <div class="qrcode">
            <img src="${qrcodeImg.src}" style="width: 300px; height: 300px;">
          </div>
          <p class="tip">扫码查看我们家信息</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  } catch (error) {
    ElMessage.error('打印失败')
    console.error('Print error:', error)
  }
}

// 分享二维码
const shareQRCode = async () => {
  try {
    // 检查是否支持Web Share API
    if (navigator.share) {
      const qrcodeImg = document.querySelector('.qrcode-wrapper img')
      if (!qrcodeImg) return

      // 将图片转换为Blob
      const response = await fetch(qrcodeImg.src)
      const blob = await response.blob()
      const file = new File([blob], '家庭二维码.png', { type: 'image/png' })

      await navigator.share({
        title: '我的家庭二维码',
        text: `扫码查看我们家信息\n户主：${familyInfo.value.headOfHousehold}`,
        files: [file]
      })

      ElMessage.success('分享成功')
    } else {
      // 不支持分享API,复制链接
      await navigator.clipboard.writeText(familyQRCode.value)
      ElMessage.success('二维码链接已复制到剪贴板')
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      ElMessage.error('分享失败')
      console.error('Share error:', error)
    }
  }
}

// 对话框关闭处理
const handleClosed = () => {
  // 重置状态
  familyQRCode.value = ''
  familyInfo.value = {
    familyCode: '',
    headOfHousehold: '',
    memberCount: 0,
    address: ''
  }
}

// 监听对话框打开
watch(() => props.modelValue, (newVal) => {
  if (newVal && props.familyId) {
    generateFamilyQRCode()
  }
})
</script>

<style lang="scss" scoped>
.family-qrcode-container {
  .qrcode-display {
    text-align: center;
    padding: 20px 0;

    .qrcode-wrapper {
      display: inline-block;
      padding: 16px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }

    .qrcode-tip {
      margin-top: 16px;
      font-size: 16px;
      color: #606266;
    }
  }

  .family-summary {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    .summary-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #f5f7fa;
      border-radius: 8px;
      font-size: 15px;
      color: #606266;

      .el-icon {
        font-size: 20px;
        color: #409eff;
      }
    }
  }

  .privacy-settings {
    .privacy-tip {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #909399;
      text-align: center;
    }

    .el-radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;

      .el-radio {
        margin: 0;
        padding: 16px;
        border: 2px solid #e4e7ed;
        border-radius: 8px;
        transition: all 0.3s;

        &:hover {
          border-color: #409eff;
          background: #ecf5ff;
        }

        &.is-checked {
          border-color: #409eff;
          background: #ecf5ff;
        }

        :deep(.el-radio__label) {
          width: 100%;
        }

        .radio-content {
          .radio-title {
            font-size: 16px;
            font-weight: 500;
            color: #303133;
            margin-bottom: 4px;
          }

          .radio-desc {
            font-size: 13px;
            color: #909399;
          }
        }
      }
    }
  }

  .qrcode-features {
    .feature-list {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .feature-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #606266;

        .el-icon {
          font-size: 18px;
        }
      }
    }
  }

  .qrcode-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;

    .el-button {
      flex: 1;
    }
  }

  .qrcode-refresh {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 16px;

    .refresh-tip {
      font-size: 13px;
      color: #909399;
    }
  }
}

// 大字模式适配
.large-text-mode {
  .family-qrcode-container {
    .qrcode-display {
      .qrcode-tip {
        font-size: 18px;
      }
    }

    .family-summary {
      grid-template-columns: 1fr;

      .summary-item {
        padding: 16px;
        font-size: 17px;
      }
    }

    .privacy-settings {
      .privacy-tip {
        font-size: 16px;
      }

      .el-radio-group {
        .el-radio {
          padding: 20px;

          .radio-content {
            .radio-title {
              font-size: 18px;
            }

            .radio-desc {
              font-size: 15px;
            }
          }
        }
      }
    }

    .qrcode-features {
      .feature-list {
        .feature-item {
          font-size: 16px;
        }
      }
    }

    .qrcode-refresh {
      .refresh-tip {
        font-size: 15px;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .family-qrcode-container {
    .family-summary {
      grid-template-columns: 1fr;
    }

    .qrcode-actions {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
