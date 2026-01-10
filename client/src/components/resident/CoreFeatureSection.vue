<template>
  <div class="core-feature-section">
    <div class="feature-grid">
      <!-- 一户一码卡片 -->
      <div
        class="feature-card qrcode-card"
        @click="handleQRCodeClick"
        role="button"
        tabindex="0"
        :aria-label="'查看家庭二维码，点击展开'"
      >
        <div class="card-icon qrcode-icon">
          <el-icon :size="48"><Iphone /></el-icon>
        </div>
        <div class="card-content">
          <h3>一户一码</h3>
          <p>扫码查看家庭信息</p>
        </div>
        <el-icon class="card-arrow"><ArrowRight /></el-icon>
      </div>

      <!-- 紧急求助按钮 -->
      <div
        class="feature-card emergency-card"
        @mousedown="handleMouseDown"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
        @keydown="handleKeyDown"
        @keyup="handleKeyUp"
        role="button"
        tabindex="0"
        :aria-label="`紧急求助，长按${countdown}秒呼叫村委`"
      >
        <div class="emergency-button" :class="{ 'is-counting': countdown > 0 }">
          <div class="emergency-icon">
            <el-icon :size="64"><Warning /></el-icon>
          </div>
          <div class="emergency-content">
            <h3>紧急求助</h3>
            <p class="emergency-hint">
              {{ countdown > 0 ? `松开取消 (${countdown})` : '长按3秒呼叫' }}
            </p>
          </div>
          <div class="countdown-ring" v-if="countdown > 0">
            <svg viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255, 255, 255, 0.3)"
                stroke-width="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="white"
                stroke-width="8"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="dashOffset"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div class="countdown-number">{{ countdown }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 二维码展示对话框 -->
    <el-dialog
      v-model="showQRCodeDialog"
      title="家庭二维码"
      width="400px"
      center
      custom-class="qrcode-dialog"
    >
      <div class="qrcode-display">
        <div class="qrcode-container">
          <!-- 生成或显示二维码 -->
          <div class="qrcode-placeholder">
            <el-image
              :src="qrcodeUrl"
              fit="contain"
              :preview-src-list="[qrcodeUrl]"
              class="qrcode-image"
            >
              <template #error>
                <div class="qrcode-error">
                  <el-icon><Picture /></el-icon>
                  <p>二维码加载失败</p>
                </div>
              </template>
            </el-image>
          </div>
          <div class="qrcode-info">
            <p class="family-name">{{ profile?.personalInfo?.name }}家庭</p>
            <p class="family-code">编码: {{ householdCode }}</p>
            <el-tag type="success" size="large">已认证</el-tag>
          </div>
        </div>

        <div class="qrcode-actions">
          <el-button type="primary" size="large" @click="saveQRCode">
            <el-icon><Download /></el-icon>
            保存到相册
          </el-button>
          <el-button size="large" @click="shareQRCode">
            <el-icon><Share /></el-icon>
            分享
          </el-button>
          <el-button size="large" @click="printQRCode">
            <el-icon><Printer /></el-icon>
            打印
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Iphone,
  ArrowRight,
  Warning,
  Picture,
  Download,
  Share,
  Printer,
} from '@element-plus/icons-vue';
import { useEmergency } from '@/composables/useEmergency';
import { profileApi } from '@/api/residentProfile';

interface Props {
  profile?: any;
}

const props = defineProps<Props>();

// Composables
const { countdown, triggerEmergencyCall, startCountdown, cancelCountdown } = useEmergency();

// 响应式数据
const showQRCodeDialog = ref(false);
const longPressTimer = ref<NodeJS.Timeout | null>(null);
const householdCode = ref('HK20250105001');
const qrcodeUrl = ref('');

// 倒计时圆环计算
const circumference = 2 * Math.PI * 45;
const dashOffset = computed(() => {
  const progress = countdown.value / 3;
  return circumference * (1 - progress);
});

/**
 * 点击一户一码卡片
 */
const handleQRCodeClick = () => {
  // 生成或获取家庭二维码
  generateQRCode();
  showQRCodeDialog.value = true;
};

/**
 * 生成家庭二维码
 */
const generateQRCode = async () => {
  try {
    // 调用API生成二维码
    // const response = await profileApi.getHouseholdQRCode()
    // qrcodeUrl.value = response.data.qrcodeUrl
    // householdCode.value = response.data.code

    // 临时使用示例二维码
    qrcodeUrl.value =
      'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SmartVillage-HK20250105001';
  } catch (error) {
    ElMessage.error('获取二维码失败');
    console.error(error);
  }
};

/**
 * 保存二维码到相册
 */
const saveQRCode = async () => {
  try {
    // 下载图片
    const link = document.createElement('a');
    link.href = qrcodeUrl.value;
    link.download = `家庭二维码_${householdCode.value}.png`;
    link.click();
    ElMessage.success('二维码已保存到相册');
  } catch (error) {
    ElMessage.error('保存失败');
    console.error(error);
  }
};

/**
 * 分享二维码
 */
const shareQRCode = async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: '我的家庭二维码',
        text: `扫码查看${props.profile?.personalInfo?.name}的家庭信息`,
        url: qrcodeUrl.value,
      });
      ElMessage.success('分享成功');
    } catch (error) {
      console.error('Share failed:', error);
    }
  } else {
    // 降级方案：复制链接
    const input = document.createElement('input');
    input.value = qrcodeUrl.value;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    ElMessage.success('二维码链接已复制，可以发送给亲友');
  }
};

/**
 * HTML转义函数（防止XSS攻击）
 */
const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * 验证二维码URL安全性
 */
const validateQRCodeUrl = (url: string): boolean => {
  // 允许的域名列表
  const allowedDomains = ['https://api.qrserver.com/', window.location.origin];

  return allowedDomains.some(domain => url.startsWith(domain));
};

/**
 * 打印二维码（安全版本）
 */
const printQRCode = () => {
  // 验证URL安全性
  if (!validateQRCodeUrl(qrcodeUrl.value)) {
    ElMessage.error('二维码来源不安全，无法打印');
    console.error('Invalid QR code URL:', qrcodeUrl.value);
    return;
  }

  // 转义用户输入
  const familyName = escapeHtml(props.profile?.personalInfo?.name || '未知家庭');
  const safeQRCodeUrl = escapeHtml(qrcodeUrl.value);
  const safeHouseholdCode = escapeHtml(householdCode.value);

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>打印家庭二维码</title>
          <style>
            body { text-align: center; padding: 50px; font-family: Arial, sans-serif; }
            img { max-width: 300px; border: 1px solid #ddd; }
            h1 { margin-bottom: 30px; color: #333; }
            p { margin: 10px 0; font-size: 18px; color: #666; }
            @media print {
              body { padding: 20px; }
              img { max-width: 400px; }
            }
          </style>
        </head>
        <body>
          <h1>${familyName}家庭二维码</h1>
          <img src="${safeQRCodeUrl}" alt="家庭二维码" />
          <p>编码: ${safeHouseholdCode}</p>
          <p><small>扫码即可查看家庭信息</small></p>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          <\/script>
        </body>
      </html>
    `);
  }
};

/**
 * 鼠标按下（长按开始）
 */
const handleMouseDown = () => {
  startLongPress();
};

/**
 * 鼠标抬起或离开（取消长按）
 */
const handleMouseUp = () => {
  cancelLongPress();
};

const handleMouseLeave = () => {
  cancelLongPress();
};

/**
 * 触摸开始（移动端长按）
 */
const handleTouchStart = (e: TouchEvent) => {
  e.preventDefault();
  startLongPress();
};

/**
 * 触摸结束
 */
const handleTouchEnd = () => {
  cancelLongPress();
};

/**
 * 键盘按下（支持空格键和回车键长按）
 */
const handleKeyDown = (e: KeyboardEvent) => {
  // 空格键或回车键
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (!longPressTimer.value) {
      startLongPress();
    }
  }
  // Escape键取消
  else if (e.key === 'Escape') {
    cancelLongPress();
  }
};

/**
 * 键盘抬起
 */
const handleKeyUp = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    cancelLongPress();
  }
};

/**
 * 开始长按
 */
const startLongPress = () => {
  // 震动反馈
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }

  // 开始倒计时
  longPressTimer.value = startCountdown(async () => {
    // 长按完成，触发紧急呼叫
    const emergencyContacts = [
      { id: '1', name: '王村长', phone: '13800138000', role: '村主任', priority: 1 },
      { id: '2', name: '李支书', phone: '13800138001', role: '村支书', priority: 2 },
    ];
    await triggerEmergencyCall(emergencyContacts);
  }, 3);
};

/**
 * 取消长按
 */
const cancelLongPress = () => {
  if (longPressTimer.value) {
    cancelCountdown(longPressTimer.value);
    longPressTimer.value = null;
  }
};

/**
 * 组件卸载前清理定时器
 */
onBeforeUnmount(() => {
  if (longPressTimer.value) {
    cancelCountdown(longPressTimer.value);
    longPressTimer.value = null;
  }
});
</script>

<style lang="scss" scoped>
.core-feature-section {
  margin-bottom: 24px;

  .feature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;

    @media (max-width: 480px) {
      grid-template-columns: 1fr;
    }
  }

  .feature-card {
    border-radius: 16px;
    padding: 24px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &:hover {
      transform: translateY(-4px);
    }

    &:active {
      transform: translateY(-2px);
    }
  }

  // 一户一码卡片
  .qrcode-card {
    background: linear-gradient(135deg, #51cf66 0%, #36a043 100%);
    color: white;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 8px 16px rgba(81, 207, 102, 0.3);

    .card-icon {
      width: 64px;
      height: 64px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .card-content {
      flex: 1;

      h3 {
        font-size: var(--font-size-h3, 18px);
        font-weight: 700;
        margin: 0 0 4px 0;
      }

      p {
        font-size: var(--font-size-small, 14px);
        margin: 0;
        opacity: 0.9;
      }
    }

    .card-arrow {
      font-size: 24px;
      opacity: 0.7;
    }
  }

  // 紧急求助卡片
  .emergency-card {
    background: linear-gradient(135deg, #ff5252 0%, #d32f2f 100%);
    color: white;
    padding: 0; // 让按钮填满
    box-shadow: 0 0 20px rgba(255, 82, 82, 0.6);

    .emergency-button {
      width: 100%;
      height: 100%;
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 24px;
      position: relative;

      &.is-counting {
        background: rgba(0, 0, 0, 0.1);
      }
    }

    .emergency-icon {
      flex-shrink: 0;

      @media (max-width: 480px) {
        :deep(.el-icon) {
          font-size: 48px !important;
        }
      }
    }

    .emergency-content {
      flex: 1;

      h3 {
        font-size: var(--font-size-h2, 20px);
        font-weight: 700;
        margin: 0 0 8px 0;
      }

      .emergency-hint {
        font-size: var(--font-size-small, 14px);
        margin: 0;
        opacity: 0.9;
      }
    }

    .countdown-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 120px;
      height: 120px;
      pointer-events: none;

      svg {
        width: 100%;
        height: 100%;
        animation: rotate 3s linear infinite;
      }

      .countdown-number {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 32px;
        font-weight: 700;
      }
    }
  }
}

// 二维码对话框
.qrcode-dialog {
  .qrcode-display {
    text-align: center;

    .qrcode-container {
      margin-bottom: 24px;

      .qrcode-placeholder {
        display: inline-block;

        .qrcode-image {
          width: 250px;
          height: 250px;
          border-radius: 12px;
          overflow: hidden;
          background: white;
        }

        .qrcode-error {
          width: 250px;
          height: 250px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          border-radius: 12px;
          color: #999;

          .el-icon {
            font-size: 48px;
            margin-bottom: 8px;
          }

          p {
            margin: 0;
          }
        }
      }

      .qrcode-info {
        margin-top: 16px;

        .family-name {
          font-size: var(--font-size-h3, 18px);
          font-weight: 700;
          margin: 0 0 4px 0;
        }

        .family-code {
          font-size: var(--font-size-small, 14px);
          color: #666;
          margin: 0 0 12px 0;
        }
      }
    }

    .qrcode-actions {
      display: flex;
      gap: 12px;
      justify-content: center;

      .el-button {
        min-width: 120px;
      }
    }
  }
}

@keyframes rotate {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

// 大字模式适配
:deep(.large-text-mode) {
  .core-feature-section {
    .qrcode-card {
      h3 {
        font-size: var(--font-size-large-h3, 25px);
      }

      p {
        font-size: var(--font-size-large-small, 19px);
      }
    }

    .emergency-card {
      h3 {
        font-size: var(--font-size-large-h2, 28px);
      }

      .emergency-hint {
        font-size: var(--font-size-large-small, 19px);
      }
    }
  }
}

// 响应式适配
@media (max-width: 480px) {
  .core-feature-section {
    .qrcode-card {
      padding: 20px;
    }

    .emergency-card {
      .emergency-button {
        min-height: 100px;
        padding: 16px;
      }
    }
  }
}
</style>
