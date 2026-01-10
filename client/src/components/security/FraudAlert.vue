<template>
  <teleport to="body">
    <transition name="el-fade">
      <div v-if="visible" class="fraud-alert-overlay" @click="handleClose">
        <div class="fraud-alert-dialog" @click.stop>
          <!-- 头部 -->
          <div class="alert-header" :class="`risk-${alertData.riskLevel}`">
            <div class="alert-icon">
              <el-icon :size="48">
                <Warning
                  v-if="alertData.riskLevel === 'high' || alertData.riskLevel === 'critical'"
                />
                <WarningFilled v-else />
              </el-icon>
            </div>
            <div class="alert-title">
              <h2>{{ alertTitle }}</h2>
              <p>{{ alertSubtitle }}</p>
            </div>
          </div>

          <!-- 内容 -->
          <div class="alert-content">
            <div class="phone-number">
              <el-icon><Phone /></el-icon>
              <span class="number">{{ alertData.phoneNumber }}</span>
              <el-tag :type="getRiskTagType(alertData.riskLevel)" size="large">
                {{ alertData.riskLevelName }}
              </el-tag>
            </div>

            <div v-if="alertData.isFraud" class="fraud-details">
              <el-descriptions :column="1" border>
                <el-descriptions-item label="诈骗类型">
                  {{ alertData.fraudTypeName }}
                </el-descriptions-item>
                <el-descriptions-item label="举报次数">
                  {{ alertData.reportCount }} 次
                </el-descriptions-item>
                <el-descriptions-item label="描述" v-if="alertData.description">
                  {{ alertData.description }}
                </el-descriptions-item>
              </el-descriptions>

              <div
                v-if="alertData.preventionTips && alertData.preventionTips.length > 0"
                class="prevention-tips"
              >
                <h4>防范建议：</h4>
                <ul>
                  <li v-for="(tip, index) in alertData.preventionTips" :key="index">
                    {{ tip }}
                  </li>
                </ul>
              </div>
            </div>

            <div v-else class="safe-info">
              <el-result
                icon="success"
                title="未检测到风险"
                sub-title="该号码未在诈骗号码库中，但仍需保持警惕"
              />
            </div>
          </div>

          <!-- 底部操作 -->
          <div class="alert-footer">
            <el-button size="large" @click="handleClose">
              {{ alertData.isFraud ? '立即挂断' : '我知道了' }}
            </el-button>
            <el-button v-if="alertData.isFraud" type="danger" size="large" @click="handleReport">
              举报此号码
            </el-button>
            <el-button v-if="alertData.isFraud" type="primary" size="large" @click="handleBlock">
              拦截此号码
            </el-button>
          </div>

          <!-- 自动关闭倒计时 -->
          <div v-if="autoClose && countdown > 0" class="countdown">
            {{ countdown }} 秒后自动关闭
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Warning, WarningFilled, Phone } from '@element-plus/icons-vue';
import { securityApi } from '@/api/security';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  alertData: {
    type: Object,
    default: () => ({
      phoneNumber: '',
      isFraud: false,
      riskLevel: 'low',
      riskLevelName: '低风险',
      fraudTypeName: '',
      reportCount: 0,
      description: '',
      preventionTips: [],
    }),
  },
  autoClose: {
    type: Boolean,
    default: true,
  },
  autoCloseDelay: {
    type: Number,
    default: 10, // 秒
  },
});

const emit = defineEmits(['update:modelValue', 'report', 'block']);

const visible = ref(props.modelValue);
const countdown = ref(props.autoClose ? props.autoCloseDelay : 0);
let countdownTimer = null;

// 警告标题
const alertTitle = computed(() => {
  if (!props.alertData.isFraud) return '来电提醒';
  return ['高危警告', '危险警告'].includes(props.alertData.riskLevel)
    ? '高危诈骗警告'
    : '诈骗风险警告';
});

// 警告副标题
const alertSubtitle = computed(() => {
  if (!props.alertData.isFraud) return '请注意识别来电身份';
  return '检测到此号码可能是诈骗电话，请谨慎接听';
});

// 获取风险等级标签类型
const getRiskTagType = level => {
  const typeMap = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  };
  return typeMap[level] || 'info';
};

// 关闭对话框
const handleClose = () => {
  visible.value = false;
  emit('update:modelValue', false);
};

// 举报号码
const handleReport = () => {
  emit('report', props.alertData.phoneNumber);
  ElMessage.success('感谢您的举报');
  handleClose();
};

// 拦截号码
const handleBlock = () => {
  emit('block', props.alertData.phoneNumber);
  ElMessage.success('已拦截该号码');
  handleClose();
};

// 开始倒计时
const startCountdown = () => {
  if (!props.autoClose) return;

  countdown.value = props.autoCloseDelay;

  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownTimer);
      handleClose();
    }
  }, 1000);
};

// 停止倒计时
const stopCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
};

// 监听visible变化
watch(
  () => props.modelValue,
  newVal => {
    visible.value = newVal;
    if (newVal) {
      startCountdown();
    } else {
      stopCountdown();
    }
  }
);

// 监听visible变化
watch(visible, newVal => {
  emit('update:modelValue', newVal);
});

onMounted(() => {
  if (visible.value) {
    startCountdown();
  }
});

onUnmounted(() => {
  stopCountdown();
});
</script>

<style scoped>
.fraud-alert-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(5px);
}

.fraud-alert-dialog {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.alert-header {
  padding: 30px 30px 20px;
  display: flex;
  align-items: center;
  color: white;
}

.alert-header.risk-low {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.alert-header.risk-medium {
  background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
}

.alert-header.risk-high {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.alert-header.risk-critical {
  background: linear-gradient(135deg, #ff0844 0%, #ffb199 100%);
}

.alert-icon {
  margin-right: 20px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.alert-title h2 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: bold;
}

.alert-title p {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
}

.alert-content {
  padding: 30px;
}

.phone-number {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 12px;
  margin-bottom: 20px;
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

.phone-number .el-icon {
  margin-right: 15px;
  font-size: 36px;
  color: #409eff;
}

.phone-number .number {
  flex: 1;
  text-align: center;
}

.fraud-details {
  margin-top: 20px;
}

.prevention-tips {
  margin-top: 20px;
  padding: 15px;
  background: #fef0f0;
  border-left: 4px solid #f56c6c;
  border-radius: 4px;
}

.prevention-tips h4 {
  margin: 0 0 10px 0;
  color: #f56c6c;
}

.prevention-tips ul {
  margin: 0;
  padding-left: 20px;
}

.prevention-tips li {
  margin: 8px 0;
  line-height: 1.6;
  color: #606266;
}

.safe-info {
  text-align: center;
}

.alert-footer {
  padding: 20px 30px;
  border-top: 1px solid #ebeef5;
  display: flex;
  gap: 10px;
  justify-content: center;
}

.countdown {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 14px;
}
</style>
