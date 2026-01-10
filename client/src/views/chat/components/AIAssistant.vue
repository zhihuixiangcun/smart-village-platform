<template>
  <el-dialog
    v-model="visible"
    title="AI 智能助手"
    width="600px"
    @close="handleClose"
    class="ai-assistant-dialog"
  >
    <!-- 功能标签 -->
    <div class="ai-tabs">
      <el-radio-group v-model="activeTab" size="small">
        <el-radio-button value="chat">智能问答</el-radio-button>
        <el-radio-button value="policy">政策计算</el-radio-button>
        <el-radio-button value="agriculture">农业知识</el-radio-button>
        <el-radio-button value="form">AI 填表</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 智能问答 -->
    <div v-if="activeTab === 'chat'" class="ai-content">
      <div class="chat-messages" ref="messagesRef">
        <div v-for="(msg, index) in chatMessages" :key="index" :class="['message', msg.role]">
          <div class="message-avatar">
            <el-avatar v-if="msg.role === 'assistant'" :size="32">
              <el-icon><Service /></el-icon>
            </el-avatar>
            <el-avatar v-else :size="32">
              <el-icon><User /></el-icon>
            </el-avatar>
          </div>
          <div class="message-content">
            <div class="message-text">{{ msg.content }}</div>
            <div class="message-time">{{ msg.time }}</div>
          </div>
        </div>
        <div v-if="loading" class="message assistant">
          <div class="message-avatar">
            <el-avatar :size="32">
              <el-icon><Service /></el-icon>
            </el-avatar>
          </div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
      <div class="chat-input">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="2"
          placeholder="向 AI 助手提问农业知识、政策咨询等问题..."
          @keydown.enter.ctrl="sendChatMessage"
        />
        <el-button
          type="primary"
          @click="sendChatMessage"
          :loading="loading"
          :disabled="!inputMessage.trim()"
        >
          发送 (Ctrl+Enter)
        </el-button>
      </div>
    </div>

    <!-- 政策计算 -->
    <div v-else-if="activeTab === 'policy'" class="ai-content">
      <el-form :model="policyForm" label-width="120px">
        <el-form-item label="政策类型">
          <el-select v-model="policyForm.type" placeholder="请选择政策类型">
            <el-option label="耕地保护补贴" value="cultivation" />
            <el-option label="农机购置补贴" value="machinery" />
            <el-option label="农业保险补贴" value="insurance" />
            <el-option label="粮食直补" value="grain" />
          </el-select>
        </el-form-item>
        <el-form-item label="种植面积（亩）">
          <el-input-number v-model="policyForm.area" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="家庭人口">
          <el-input-number v-model="policyForm.familySize" :min="1" :max="20" />
        </el-form-item>
        <el-form-item label="作物类型">
          <el-select v-model="policyForm.crop" placeholder="请选择作物类型">
            <el-option label="水稻" value="rice" />
            <el-option label="小麦" value="wheat" />
            <el-option label="玉米" value="corn" />
            <el-option label="大豆" value="soybean" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="calculatePolicy" :loading="loading">
            计算补贴金额
          </el-button>
        </el-form-item>
      </el-form>
      <div v-if="policyResult" class="policy-result">
        <h4>计算结果</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="预计补贴"
            >{{ policyResult.subsidy }} 元</el-descriptions-item
          >
          <el-descriptions-item label="补贴依据">{{ policyResult.basis }}</el-descriptions-item>
          <el-descriptions-item label="发放时间" :span="2">{{
            policyResult.paymentTime
          }}</el-descriptions-item>
          <el-descriptions-item label="备注说明" :span="2">{{
            policyResult.note
          }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>

    <!-- 农业知识搜索 -->
    <div v-else-if="activeTab === 'agriculture'" class="ai-content">
      <div class="search-box">
        <el-input
          v-model="agricultureSearch"
          placeholder="搜索农业知识、病虫害防治、种植技术等..."
          @keyup.enter="searchAgriculture"
        >
          <template #append>
            <el-button @click="searchAgriculture" :loading="loading">
              <el-icon><Search /></el-icon>
            </el-button>
          </template>
        </el-input>
      </div>
      <div class="search-results" v-if="agricultureResults.length > 0">
        <div v-for="(item, index) in agricultureResults" :key="index" class="result-item">
          <h4>{{ item.title }}</h4>
          <p>{{ item.content }}</p>
          <div class="result-tags">
            <el-tag v-for="tag in item.tags" :key="tag" size="small">{{ tag }}</el-tag>
          </div>
        </div>
      </div>
      <div v-else-if="searched && agricultureResults.length === 0" class="empty-results">
        <el-empty description="未找到相关农业知识" />
      </div>
      <div v-else class="popular-topics">
        <h4>热门话题</h4>
        <div class="topic-list">
          <el-tag
            v-for="topic in popularTopics"
            :key="topic"
            @click="
              agricultureSearch = topic;
              searchAgriculture();
            "
            class="topic-tag"
          >
            {{ topic }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- AI 填表助手 -->
    <div v-else-if="activeTab === 'form'" class="ai-content">
      <el-form :model="formAssistant" label-width="120px">
        <el-form-item label="表格类型">
          <el-select v-model="formAssistant.type" placeholder="请选择表格类型">
            <el-option label="人口普查表" value="census" />
            <el-option label="农户信息表" value="household" />
            <el-option label="土地登记表" value="land" />
            <el-option label="作物产量表" value="crop" />
          </el-select>
        </el-form-item>
        <el-form-item label="语音输入/描述">
          <el-input
            v-model="formAssistant.description"
            type="textarea"
            :rows="4"
            placeholder="请描述需要填写的表格信息，或使用语音输入..."
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fillForm" :loading="loading"> AI 智能填表 </el-button>
        </el-form-item>
      </el-form>
      <div v-if="formResult" class="form-result">
        <h4>生成的表格数据</h4>
        <el-table :data="formResult.data" border style="width: 100%">
          <el-table-column
            v-for="col in formResult.columns"
            :key="col.prop"
            :prop="col.prop"
            :label="col.label"
          />
        </el-table>
        <el-button type="success" @click="exportForm" style="margin-top: 12px">
          <el-icon><Download /></el-icon>
          导出表格
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Service, User, Search, Download } from '@element-plus/icons-vue';
import api from '@/api';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

// 对话框可见性
const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

// 当前标签页
const activeTab = ref('chat');

// 加载状态
const loading = ref(false);

// 聊天消息
const chatMessages = ref([
  {
    role: 'assistant',
    content:
      '您好！我是智慧乡村 AI 助手，可以帮您解答农业知识、政策咨询、补贴计算等问题。请问有什么可以帮您的？',
    time: new Date().toLocaleTimeString(),
  },
]);
const inputMessage = ref('');
const messagesRef = ref(null);

// 政策计算表单
const policyForm = ref({
  type: 'cultivation',
  area: 0,
  familySize: 1,
  crop: 'rice',
});
const policyResult = ref(null);

// 农业知识搜索
const agricultureSearch = ref('');
const agricultureResults = ref([]);
const searched = ref(false);
const popularTopics = ref([
  '水稻病虫害防治',
  '玉米种植技术',
  '小麦施肥指南',
  '农机补贴政策',
  '农业保险申请',
]);

// AI 填表助手
const formAssistant = ref({
  type: '',
  description: '',
});
const formResult = ref(null);

// 发送聊天消息
const sendChatMessage = async () => {
  if (!inputMessage.value.trim() || loading.value) return;

  const userMessage = {
    role: 'user',
    content: inputMessage.value,
    time: new Date().toLocaleTimeString(),
  };

  chatMessages.value.push(userMessage);
  const question = inputMessage.value;
  inputMessage.value = '';

  // 滚动到底部
  await nextTick();
  scrollToBottom();

  loading.value = true;
  try {
    const { data } = await api.post('/api/v1/ai/chat', {
      question,
      sessionId: 'ai-assistant',
    });

    if (data.success) {
      chatMessages.value.push({
        role: 'assistant',
        content: data.data.answer,
        time: new Date().toLocaleTimeString(),
      });
    } else {
      ElMessage.error(data.message || 'AI 助手暂时无法回答');
    }
  } catch (error) {
    console.error('AI chat error:', error);
    chatMessages.value.push({
      role: 'assistant',
      content: '抱歉，AI 助手暂时无法连接。请稍后再试。',
      time: new Date().toLocaleTimeString(),
    });
  } finally {
    loading.value = false;
    await nextTick();
    scrollToBottom();
  }
};

// 滚动到底部
const scrollToBottom = () => {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
  }
};

// 计算政策补贴
const calculatePolicy = async () => {
  loading.value = true;
  try {
    const { data } = await api.post('/api/v1/ai/policy/calculate', {
      policyType: policyForm.value.type,
      area: policyForm.value.area,
      familySize: policyForm.value.familySize,
      crop: policyForm.value.crop,
    });

    if (data.success) {
      policyResult.value = data.data;
      ElMessage.success('计算完成');
    } else {
      ElMessage.error(data.message || '计算失败');
    }
  } catch (error) {
    console.error('Policy calculation error:', error);
    ElMessage.error('计算失败，请稍后再试');
  } finally {
    loading.value = false;
  }
};

// 搜索农业知识
const searchAgriculture = async () => {
  if (!agricultureSearch.value.trim()) return;

  loading.value = true;
  try {
    const { data } = await api.get('/api/v1/ai/search/agriculture', {
      params: { q: agricultureSearch.value },
    });

    if (data.success) {
      agricultureResults.value = data.data.results || [];
      searched.value = true;
    } else {
      ElMessage.error(data.message || '搜索失败');
    }
  } catch (error) {
    console.error('Agriculture search error:', error);
    ElMessage.error('搜索失败，请稍后再试');
  } finally {
    loading.value = false;
  }
};

// AI 填表
const fillForm = async () => {
  if (!formAssistant.value.type || !formAssistant.value.description) {
    ElMessage.warning('请选择表格类型并输入描述');
    return;
  }

  loading.value = true;
  try {
    const { data } = await api.post('/api/v1/ai/form/fill', {
      formType: formAssistant.value.type,
      description: formAssistant.value.description,
    });

    if (data.success) {
      formResult.value = data.data;
      ElMessage.success('填表完成');
    } else {
      ElMessage.error(data.message || '填表失败');
    }
  } catch (error) {
    console.error('Form fill error:', error);
    ElMessage.error('填表失败，请稍后再试');
  } finally {
    loading.value = false;
  }
};

// 导出表格
const exportForm = () => {
  ElMessage.info('导出功能开发中');
};

// 关闭对话框
const handleClose = () => {
  activeTab.value = 'chat';
  inputMessage.value = '';
  policyResult.value = null;
  agricultureResults.value = [];
  searched.value = false;
  formResult.value = null;
  visible.value = false;
};
</script>

<style scoped>
.ai-assistant-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.ai-tabs {
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.ai-content {
  padding: 16px;
  max-height: 500px;
  overflow-y: auto;
}

/* 聊天样式 */
.chat-messages {
  min-height: 300px;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  max-width: 70%;
}

.message-text {
  padding: 10px 14px;
  border-radius: 8px;
  background: #f5f5f5;
  word-break: break-word;
}

.message.user .message-text {
  background: #07c160;
  color: #fff;
}

.message.assistant .message-text {
  background: #fff;
  border: 1px solid #e0e0e0;
}

.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.message.user .message-time {
  text-align: right;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  width: fit-content;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #999;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

.chat-input {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.chat-input .el-textarea {
  flex: 1;
}

/* 搜索结果 */
.search-box {
  margin-bottom: 16px;
}

.search-results {
  margin-top: 16px;
}

.result-item {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 12px;
}

.result-item h4 {
  margin: 0 0 8px 0;
  color: #07c160;
}

.result-item p {
  margin: 0 0 8px 0;
  color: #666;
  line-height: 1.5;
}

.result-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.popular-topics {
  margin-top: 24px;
}

.popular-topics h4 {
  margin: 0 0 12px 0;
  color: #333;
}

.topic-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.topic-tag {
  cursor: pointer;
}

/* 表格结果 */
.form-result {
  margin-top: 16px;
}

.form-result h4 {
  margin: 0 0 12px 0;
  color: #333;
}

.policy-result {
  margin-top: 16px;
}

.policy-result h4 {
  margin: 0 0 12px 0;
  color: #333;
}

.empty-results {
  text-align: center;
  padding: 40px 0;
}
</style>
