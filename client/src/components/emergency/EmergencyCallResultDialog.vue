<template>
  <el-dialog
    v-model="dialogVisible"
    title="应急呼叫结果"
    width="500px"
    :close-on-click-modal="false"
  >
    <div class="result-dialog">
      <div class="result-icon" :class="`result-${status}`">
        <el-icon v-if="status === 'success'"><SuccessFilled /></el-icon>
        <el-icon v-else-if="status === 'pending'"><Loading /></el-icon>
        <el-icon v-else><WarningFilled /></el-icon>
      </div>

      <h3 class="result-title">{{ title }}</h3>
      <p class="result-message">{{ message }}</p>

      <el-timeline v-if="callResult" class="result-timeline">
        <el-timeline-item
          v-for="(item, index) in timeline"
          :key="index"
          :timestamp="item.timestamp"
          :type="item.type"
        >
          {{ item.content }}
        </el-timeline-item>
      </el-timeline>

      <div v-if="callResult?.emergencyId" class="result-info">
        <el-alert title="请保持电话畅通" type="info" :closable="false" show-icon>
          <template #default>
            <p>
              您的应急呼叫编号：<strong>{{ callResult.emergencyId }}</strong>
            </p>
            <p>救援人员正在赶来，预计到达时间：{{ callResult.estimatedArrival || '正在计算' }}</p>
          </template>
        </el-alert>
      </div>
    </div>

    <template #footer>
      <el-button type="primary" @click="handleClose">知道了</el-button>
      <el-button v-if="status === 'success'" @click="handleTrack">跟踪进度</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { SuccessFilled, WarningFilled, Loading } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  callResult: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'track']);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

const status = computed(() => {
  if (!props.callResult) return 'pending';
  return props.callResult.success ? 'success' : 'error';
});

const title = computed(() => {
  switch (status.value) {
    case 'success':
      return '呼叫成功';
    case 'error':
      return '呼叫失败';
    default:
      return '处理中...';
  }
});

const message = computed(() => {
  if (!props.callResult) return '正在处理您的请求...';

  switch (status.value) {
    case 'success':
      return '您的应急呼叫已受理，救援人员正在赶来';
    case 'error':
      return props.callResult.message || '呼叫失败，请重试或拨打紧急电话';
    default:
      return '正在处理您的请求...';
  }
});

const timeline = computed(() => {
  if (!props.callResult?.timeline) return [];

  return props.callResult.timeline.map(item => ({
    timestamp: item.timestamp || new Date().toLocaleString(),
    content: item.content,
    type: item.type || 'primary',
  }));
});

const handleClose = () => {
  dialogVisible.value = false;
};

const handleTrack = () => {
  emit('track', props.callResult);
  handleClose();
};
</script>

<style scoped>
.result-dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px 0;
}

.result-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
}

.result-success {
  background: #f0f9ff;
  color: #67c23a;
}

.result-error {
  background: #fef0f0;
  color: #f56c6c;
}

.result-pending {
  background: #fdf6ec;
  color: #e6a23c;
}

.result-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.result-message {
  margin: 0;
  text-align: center;
  color: #606266;
  line-height: 1.6;
}

.result-timeline {
  width: 100%;
  padding: 10px 0;
}

.result-info {
  width: 100%;
}

.result-info p {
  margin: 4px 0;
}
</style>
