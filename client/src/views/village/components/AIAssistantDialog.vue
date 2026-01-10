<template>
  <el-dialog
    v-model="dialogVisible"
    title="AI语音助手"
    :width="accessibilityStore.largeTextMode ? '600px' : '500px'"
    center
    :close-on-click-modal="false"
    class="ai-assistant-dialog"
  >
    <div class="ai-assistant">
      <!-- AI助手头部 -->
      <div class="assistant-header">
        <div class="assistant-avatar">
          <el-avatar :size="60">
            <el-icon :size="30"><MagicStick /></el-icon>
          </el-avatar>
          <div class="status-indicator" :class="{ listening: isListening }"></div>
        </div>
        <div class="assistant-info">
          <h3 class="assistant-name">智慧村务AI助手</h3>
          <p class="assistant-desc">我是您的智能助手，可以帮您查询信息、办理业务</p>
        </div>
      </div>

      <!-- 语音输入区域 -->
      <div class="voice-section">
        <div class="voice-visualizer" :class="{ active: isListening }">
          <div
            v-for="i in 5"
            :key="i"
            class="voice-bar"
            :style="{ height: `${Math.random() * 100}%` }"
          ></div>
        </div>

        <div class="voice-controls">
          <el-select
            v-model="selectedDialect"
            placeholder="选择方言"
            :size="accessibilityStore.largeTextMode ? 'large' : 'default'"
            class="dialect-select"
          >
            <el-option label="普通话" value="mandarin" />
            <el-option label="粤语" value="cantonese" />
            <el-option label="闽南语" value="hokkien" />
            <el-option label="客家话" value="hakka" />
            <el-option label="贵州话" value="guizhou" />
            <el-option label="四川话" value="sichuan" />
          </el-select>

          <el-button
            @click="toggleVoiceRecognition"
            :type="isListening ? 'danger' : 'primary'"
            :size="accessibilityStore.largeTextMode ? 'large' : 'default'"
            :icon="isListening ? VideoPause : Microphone"
            round
            class="voice-toggle-btn"
          >
            {{ isListening ? '停止录音' : '开始录音' }}
          </el-button>
        </div>

        <!-- 识别结果 -->
        <div v-if="recognitionResult" class="recognition-result">
          <div class="result-header">
            <el-icon><Document /></el-icon>
            <span>识别结果</span>
            <el-button @click="clearResult" size="small" type="text" icon="Close"> 清除 </el-button>
          </div>
          <div class="result-content">
            <el-input
              v-model="recognitionResult"
              type="textarea"
              :rows="3"
              placeholder="语音识别结果将显示在这里"
              :size="accessibilityStore.largeTextMode ? 'large' : 'default'"
            />
            <div class="result-actions">
              <el-button @click="processQuery" type="primary" :loading="processing">
                <el-icon><Search /></el-icon>
                查询信息
              </el-button>
              <el-button @click="startService" :disabled="!recognitionResult">
                <el-icon><Service /></el-icon>
                办理业务
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 智能建议 -->
      <div class="suggestions-section">
        <h4 class="suggestions-title">常用命令</h4>
        <div class="suggestions-grid">
          <div
            v-for="suggestion in smartSuggestions"
            :key="suggestion.id"
            class="suggestion-item"
            @click="useSuggestion(suggestion)"
          >
            <div class="suggestion-icon">{{ suggestion.icon }}</div>
            <div class="suggestion-content">
              <h5 class="suggestion-title">{{ suggestion.title }}</h5>
              <p class="suggestion-desc">{{ suggestion.description }}</p>
            </div>
            <div class="suggestion-arrow">
              <el-icon><ArrowRight /></el-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- 对话历史 -->
      <div v-if="conversationHistory.length > 0" class="history-section">
        <div class="history-header">
          <h4 class="history-title">对话历史</h4>
          <el-button @click="clearHistory" size="small" type="text"> 清空历史 </el-button>
        </div>
        <div class="history-list">
          <div
            v-for="item in conversationHistory.slice(-5)"
            :key="item.id"
            class="history-item"
            :class="{ user: item.type === 'user', assistant: item.type === 'assistant' }"
          >
            <div class="history-avatar">
              <el-avatar :size="32">
                <el-icon v-if="item.type === 'user'"><User /></el-icon>
                <el-icon v-else><MagicStick /></el-icon>
              </el-avatar>
            </div>
            <div class="history-content">
              <p class="history-text">{{ item.content }}</p>
              <span class="history-time">{{ formatTime(item.timestamp) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- AI响应结果 -->
      <div v-if="aiResponse" class="response-section">
        <div class="response-header">
          <el-icon class="response-icon"><Select /></el-icon>
          <span class="response-title">AI助手回复</span>
        </div>
        <div class="response-content">
          <div v-if="aiResponse.type === 'info'" class="info-response">
            <h5 class="info-title">{{ aiResponse.title }}</h5>
            <div class="info-details">
              <div v-for="detail in aiResponse.details" :key="detail.label" class="info-item">
                <span class="info-label">{{ detail.label }}：</span>
                <span class="info-value">{{ detail.value }}</span>
              </div>
            </div>
          </div>

          <div v-else-if="aiResponse.type === 'service'" class="service-response">
            <el-steps :active="aiResponse.currentStep" direction="vertical">
              <el-step
                v-for="step in aiResponse.steps"
                :key="step.id"
                :title="step.title"
                :description="step.description"
              />
            </el-steps>
            <div class="service-actions">
              <el-button @click="executeStep(aiResponse.currentStep)" type="primary">
                执行当前步骤
              </el-button>
            </div>
          </div>

          <div v-else class="text-response">
            <p class="response-text">{{ aiResponse.content }}</p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="closeDialog">关闭</el-button>
        <el-button @click="openSettings" type="text" icon="Setting"> 设置 </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { ElMessage, ElNotification } from 'element-plus';
import {
  MagicStick,
  Microphone,
  VideoPause,
  Document,
  Close,
  Search,
  Service,
  ArrowRight,
  User,
  Select,
  Setting,
} from '@element-plus/icons-vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:visible', 'query']);

const accessibilityStore = useAccessibilityStore();

// 响应式数据
const isListening = ref(false);
const recognitionResult = ref('');
const selectedDialect = ref('mandarin');
const processing = ref(false);
const aiResponse = ref(null);

// 语音识别相关
let recognition = null;
let isRecognitionSupported = false;

// 对话历史
const conversationHistory = reactive([]);

// 智能建议
const smartSuggestions = reactive([
  {
    id: 'finance',
    title: '查看财务公开',
    description: '查询村集体经济收支情况',
    icon: '💰',
    command: '查看财务公开',
  },
  {
    id: 'announcement',
    title: '最新通知公告',
    description: '获取村务最新通知',
    icon: '📢',
    command: '显示最新通知',
  },
  {
    id: 'subsidy',
    title: '补贴计算器',
    description: '计算可享受的农业补贴',
    icon: '🧮',
    command: '打开补贴计算器',
  },
  {
    id: 'duty',
    title: '今日值班信息',
    description: '查询今日值班人员',
    icon: '☎️',
    command: '谁今天值班',
  },
  {
    id: 'help',
    title: '便民服务',
    description: '在线办理各类业务',
    icon: '🛠️',
    command: '我要办理业务',
  },
  {
    id: 'emergency',
    title: '紧急呼叫',
    description: '一键联系值班人员',
    icon: '🚨',
    command: '紧急情况需要帮助',
  },
]);

// 计算属性
const dialogVisible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
});

// 监听对话框显示
watch(
  () => props.visible,
  newVal => {
    if (newVal) {
      initVoiceRecognition();
    } else {
      stopVoiceRecognition();
    }
  }
);

// 初始化语音识别
const initVoiceRecognition = () => {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    isRecognitionSupported = true;

    // 配置语音识别
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = getDialectLang(selectedDialect.value);

    // 事件监听
    recognition.onstart = () => {
      isListening.value = true;
      console.log('语音识别开始');
    };

    recognition.onresult = event => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;

      if (event.results[current].isFinal) {
        recognitionResult.value = transcript;
        isListening.value = false;

        // 自动处理查询
        setTimeout(() => {
          processQuery();
        }, 1000);
      }
    };

    recognition.onerror = event => {
      console.error('语音识别错误:', event.error);
      ElMessage.error(`语音识别失败: ${getErrorMessage(event.error)}`);
      isListening.value = false;
    };

    recognition.onend = () => {
      isListening.value = false;
      console.log('语音识别结束');
    };
  } else {
    isRecognitionSupported = false;
    ElMessage.warning('您的浏览器不支持语音识别功能');
  }
};

// 获取方言语言代码
const getDialectLang = dialect => {
  const langMap = {
    mandarin: 'zh-CN',
    cantonese: 'zh-HK',
    hokkien: 'zh-MO',
    hakka: 'zh-CN',
    guizhou: 'zh-CN',
    sichuan: 'zh-CN',
  };
  return langMap[dialect] || 'zh-CN';
};

// 获取错误信息
const getErrorMessage = error => {
  const errorMap = {
    'no-speech': '未检测到语音',
    'audio-capture': '无法捕获音频',
    'not-allowed': '麦克风权限被拒绝',
    network: '网络错误',
    'service-not-allowed': '服务不被允许',
  };
  return errorMap[error] || '未知错误';
};

// 切换语音识别
const toggleVoiceRecognition = () => {
  if (!isRecognitionSupported) {
    ElMessage.warning('浏览器不支持语音识别');
    return;
  }

  if (isListening.value) {
    stopVoiceRecognition();
  } else {
    startVoiceRecognition();
  }
};

// 开始语音识别
const startVoiceRecognition = () => {
  if (!recognition || isListening.value) return;

  try {
    recognition.lang = getDialectLang(selectedDialect.value);
    recognition.start();
    ElMessage.info('请开始说话...');
  } catch (error) {
    console.error('启动语音识别失败:', error);
    ElMessage.error('启动语音识别失败');
  }
};

// 停止语音识别
const stopVoiceRecognition = () => {
  if (recognition && isListening.value) {
    recognition.stop();
  }
};

// 清除识别结果
const clearResult = () => {
  recognitionResult.value = '';
  aiResponse.value = null;
};

// 处理查询
const processQuery = async () => {
  if (!recognitionResult.value.trim()) {
    ElMessage.warning('请先输入查询内容');
    return;
  }

  processing.value = true;

  // 添加到对话历史
  conversationHistory.push({
    id: Date.now(),
    type: 'user',
    content: recognitionResult.value,
    timestamp: new Date().toISOString(),
  });

  try {
    // 模拟AI处理
    await new Promise(resolve => setTimeout(resolve, 1500));

    const response = await processAIQuery(recognitionResult.value);
    aiResponse.value = response;

    // 添加AI回复到历史
    conversationHistory.push({
      id: Date.now() + 1,
      type: 'assistant',
      content: getResponseSummary(response),
      timestamp: new Date().toISOString(),
    });

    // 语音播报回复
    if (accessibilityStore.voiceEnabled && accessibilityStore.autoRead) {
      await accessibilityStore.speakText(getResponseSummary(response));
    }

    ElMessage.success('查询完成');
  } catch (error) {
    console.error('处理查询失败:', error);
    ElMessage.error('查询失败，请重试');
  } finally {
    processing.value = false;
  }
};

// AI查询处理
const processAIQuery = async query => {
  const lowerQuery = query.toLowerCase();

  // 财务查询
  if (lowerQuery.includes('财务') || lowerQuery.includes('收支') || lowerQuery.includes('经济')) {
    return {
      type: 'info',
      title: '2024年第一季度财务情况',
      details: [
        { label: '总收入', value: '56.8万元' },
        { label: '总支出', value: '42.3万元' },
        { label: '主要用于', value: '基础设施建设和村民福利' },
      ],
    };
  }

  // 通知查询
  if (lowerQuery.includes('通知') || lowerQuery.includes('公告') || lowerQuery.includes('最新')) {
    return {
      type: 'info',
      title: '最新村务通知',
      details: [
        { label: '疫情防控通知', value: '2024-01-16发布' },
        { label: '道路硬化进展', value: '已完成80%' },
        { label: '文化活动安排', value: '春节系列活动' },
      ],
    };
  }

  // 补贴计算
  if (lowerQuery.includes('补贴') || lowerQuery.includes('计算') || lowerQuery.includes('农业')) {
    return {
      type: 'service',
      currentStep: 1,
      steps: [
        { id: 1, title: '选择补贴类型', description: '请选择您要查询的补贴类型' },
        { id: 2, title: '填写基本信息', description: '请输入您的耕地面积和家庭人口' },
        { id: 3, title: '查看计算结果', description: '系统将自动计算可享受的补贴金额' },
      ],
    };
  }

  // 值班查询
  if (lowerQuery.includes('值班') || lowerQuery.includes('谁') || lowerQuery.includes('今天')) {
    return {
      type: 'info',
      title: '今日值班信息',
      details: [
        { label: '值班人员', value: '李明（村主任）' },
        { label: '值班时间', value: '08:00 - 18:00' },
        { label: '联系电话', value: '138****5678' },
      ],
    };
  }

  // 紧急情况
  if (lowerQuery.includes('紧急') || lowerQuery.includes('帮助') || lowerQuery.includes('情况')) {
    return {
      type: 'service',
      currentStep: 1,
      steps: [
        { id: 1, title: '确认紧急情况', description: '请描述您遇到的紧急情况' },
        { id: 2, title: '联系值班人员', description: '系统将立即联系今日值班人员' },
        { id: 3, title: '等待救援', description: '值班人员将尽快赶到现场' },
      ],
    };
  }

  // 默认回复
  return {
    type: 'text',
    content:
      '抱歉，我暂时无法理解您的查询。您可以尝试说：\n' +
      '"查看财务公开"\n' +
      '"最新通知公告"\n' +
      '"补贴计算器"\n' +
      '"谁今天值班"\n' +
      '"我要办理业务"',
  };
};

// 获取回复摘要
const getResponseSummary = response => {
  if (response.type === 'info') {
    return response.title + '，' + response.details.map(d => d.value).join('，');
  } else if (response.type === 'service') {
    return response.steps[response.currentStep - 1]?.title || '开始为您服务';
  } else {
    return response.content.substring(0, 50) + '...';
  }
};

// 执行步骤
const executeStep = stepId => {
  if (aiResponse.value?.type === 'service') {
    aiResponse.value.currentStep = stepId + 1;
    ElMessage.success('已执行到下一步');
  }
};

// 使用建议
const useSuggestion = suggestion => {
  recognitionResult.value = suggestion.command;
  processQuery();
};

// 开始服务
const startService = () => {
  if (!recognitionResult.value) return;

  ElMessage.info('正在为您启动服务...');
  emit('query', {
    type: 'service',
    content: recognitionResult.value,
  });
};

// 清空历史
const clearHistory = () => {
  conversationHistory.splice(0);
  ElMessage.success('对话历史已清空');
};

// 打开设置
const openSettings = () => {
  ElMessage.info('设置功能开发中');
};

// 关闭对话框
const closeDialog = () => {
  dialogVisible.value = false;
  stopVoiceRecognition();
};

// 格式化时间
const formatTime = timestamp => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 生命周期
onMounted(() => {
  // 检查麦克风权限
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        console.log('麦克风权限已获取');
      })
      .catch(error => {
        console.warn('麦克风权限获取失败:', error);
      });
  }
});

onUnmounted(() => {
  stopVoiceRecognition();
});
</script>

<style scoped>
.ai-assistant-dialog {
  --dialog-radius: 16px;
}

.ai-assistant {
  padding: 20px 0;
  max-height: 70vh;
  overflow-y: auto;
}

/* ========== 助手头部样式 ========== */
.assistant-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f2f5;
}

.assistant-avatar {
  position: relative;
}

.status-indicator {
  position: absolute;
  bottom: 5px;
  right: 5px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #909399;
  border: 2px solid white;
}

.status-indicator.listening {
  background-color: #67c23a;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

.assistant-info {
  flex: 1;
}

.assistant-name {
  margin: 0 0 5px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.assistant-desc {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.4;
}

/* ========== 语音区域样式 ========== */
.voice-section {
  margin-bottom: 25px;
}

.voice-visualizer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 60px;
  margin-bottom: 20px;
  opacity: 0.3;
  transition: opacity 0.3s;
}

.voice-visualizer.active {
  opacity: 1;
}

.voice-bar {
  width: 6px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border-radius: 3px;
  transition: height 0.1s ease;
  min-height: 4px;
}

.voice-controls {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 20px;
}

.dialect-select {
  flex: 1;
}

.voice-toggle-btn {
  min-width: 120px;
}

/* ========== 识别结果样式 ========== */
.recognition-result {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 25px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  font-weight: 600;
  color: #303133;
}

.result-actions {
  display: flex;
  gap: 12px;
  margin-top: 15px;
}

/* ========== 智能建议样式 ========== */
.suggestions-section {
  margin-bottom: 25px;
}

.suggestions-title {
  margin: 0 0 15px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: white;
  border: 1px solid #f0f2f5;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.suggestion-item:hover {
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.1);
}

.suggestion-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 8px;
}

.suggestion-content {
  flex: 1;
}

.suggestion-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.suggestion-desc {
  margin: 0;
  font-size: 12px;
  color: #606266;
  line-height: 1.3;
}

.suggestion-arrow {
  color: #c0c4cc;
  transition: color 0.3s;
}

.suggestion-item:hover .suggestion-arrow {
  color: #409eff;
}

/* ========== 对话历史样式 ========== */
.history-section {
  margin-bottom: 25px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.history-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f2f5;
}

.history-item:last-child {
  border-bottom: none;
}

.history-content {
  flex: 1;
}

.history-text {
  margin: 0 0 4px;
  font-size: 14px;
  color: #303133;
  line-height: 1.4;
}

.history-time {
  font-size: 12px;
  color: #909399;
}

.history-item.user .history-text {
  background: #e1f3ff;
  color: #409eff;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 4px;
}

.history-item.assistant .history-text {
  background: #f0f9ff;
  color: #67c23a;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 4px;
}

/* ========== AI响应样式 ========== */
.response-section {
  background: linear-gradient(135deg, #f0f9ff 0%, #e1f3ff 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.response-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  font-weight: 600;
  color: #409eff;
}

.response-icon {
  font-size: 18px;
}

.info-response .info-title {
  margin: 0 0 15px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.info-details {
  background: white;
  border-radius: 8px;
  padding: 15px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f2f5;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 500;
  color: #606266;
}

.info-value {
  color: #303133;
  font-weight: 600;
}

.service-actions {
  text-align: center;
  margin-top: 20px;
}

.text-response {
  background: white;
  border-radius: 8px;
  padding: 15px;
}

.response-text {
  margin: 0;
  font-size: 14px;
  color: #303133;
  line-height: 1.5;
}

/* ========== 底部按钮样式 ========== */
.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* ========== 响应式设计 ========== */
@media (max-width: 768px) {
  .ai-assistant {
    padding: 15px 0;
  }

  .assistant-header {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }

  .voice-controls {
    flex-direction: column;
    gap: 10px;
  }

  .suggestions-grid {
    grid-template-columns: 1fr;
  }

  .suggestion-item {
    padding: 12px;
  }

  .result-actions {
    flex-direction: column;
    gap: 10px;
  }

  .result-actions .el-button {
    width: 100%;
  }
}

/* ========== 大字模式样式 ========== */
:deep(.large-text-mode) .assistant-name {
  font-size: 22px;
}

:deep(.large-text-mode) .assistant-desc {
  font-size: 16px;
}

:deep(.large-text-mode) .suggestions-title {
  font-size: 20px;
}

:deep(.large-text-mode) .history-title {
  font-size: 20px;
}

/* ========== 深色模式支持 ========== */
@media (prefers-color-scheme: dark) {
  .assistant-header {
    border-bottom-color: #3a3a3a;
  }

  .assistant-name {
    color: #ffffff;
  }

  .assistant-desc {
    color: #b0b0b0;
  }

  .suggestion-item {
    background: #2a2a2a;
    border-color: #3a3a3a;
  }

  .suggestion-title {
    color: #ffffff;
  }

  .suggestion-desc {
    color: #b0b0b0;
  }

  .recognition-result {
    background: #2a2a2a;
  }

  .result-header {
    color: #ffffff;
  }

  .history-item {
    border-bottom-color: #3a3a3a;
  }

  .info-details {
    background: #2a2a2a;
  }

  .info-item {
    border-bottom-color: #3a3a3a;
  }

  .text-response {
    background: #2a2a2a;
  }
}
</style>
