<template>
  <div class="smart-chatbot">
    <!-- 聊天窗口 -->
    <div class="chat-container" :class="{ expanded: isExpanded, mobile: isMobile }">
      <!-- 聊天头部 -->
      <div class="chat-header">
        <div class="header-left">
          <div class="bot-avatar">
            <img src="/images/ai-bot.png" alt="AI助手" />
          </div>
          <div class="bot-info">
            <h3>智慧农业助手</h3>
            <span class="status" :class="{ online: isOnline }">
              {{ isOnline ? '在线' : '离线' }}
            </span>
          </div>
        </div>
        <div class="header-right">
          <button class="icon-btn" @click="toggleVoiceInput" :class="{ active: voiceInputActive }">
            <i class="fas fa-microphone"></i>
          </button>
          <button class="icon-btn" @click="toggleDialectSelector">
            <i class="fas fa-language"></i>
          </button>
          <button class="icon-btn" @click="minimizeChat" v-if="isExpanded">
            <i class="fas fa-minus"></i>
          </button>
          <button class="icon-btn" @click="expandChat" v-else>
            <i class="fas fa-expand"></i>
          </button>
        </div>
      </div>

      <!-- 聊天内容区 -->
      <div class="chat-content" ref="chatContent">
        <!-- 欢迎消息 -->
        <div class="message welcome" v-if="messages.length === 0">
          <div class="message-content">
            <div class="bot-message">
              <div class="avatar">
                <img src="/images/ai-bot.png" alt="AI助手" />
              </div>
              <div class="text">
                <p>您好！我是智慧农业助手，可以帮您解答农业生产、政策咨询、技术指导等问题。</p>
                <div class="quick-actions">
                  <h4>我可以帮您：</h4>
                  <div class="action-buttons">
                    <button class="action-btn" @click="sendQuickQuery('种植咨询')">
                      <i class="fas fa-seedling"></i>
                      种植咨询
                    </button>
                    <button class="action-btn" @click="sendQuickQuery('病虫害防治')">
                      <i class="fas fa-bug"></i>
                      病虫害防治
                    </button>
                    <button class="action-btn" @click="sendQuickQuery('政策补贴')">
                      <i class="fas fa-coins"></i>
                      政策补贴
                    </button>
                    <button class="action-btn" @click="sendQuickQuery('市场价格')">
                      <i class="fas fa-chart-line"></i>
                      市场价格
                    </button>
                    <button class="action-btn" @click="openPolicyCalculator">
                      <i class="fas fa-calculator"></i>
                      政策计算器
                    </button>
                    <button class="action-btn" @click="openFormAssistant">
                      <i class="fas fa-file-alt"></i>
                      AI填表助手
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div
          class="message"
          v-for="(message, index) in messages"
          :key="index"
          :class="{ user: message.type === 'user', bot: message.type === 'bot' }"
        >
          <div class="message-content">
            <div class="user-message" v-if="message.type === 'user'">
              <div class="text">{{ message.content }}</div>
              <div class="time">{{ formatTime(message.timestamp) }}</div>
            </div>
            <div class="bot-message" v-else>
              <div class="avatar">
                <img src="/images/ai-bot.png" alt="AI助手" />
              </div>
              <div class="text">
                <div v-if="message.loading" class="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div v-else>
                  <div v-html="formatMessage(message.content)"></div>

                  <!-- 结构化响应 -->
                  <div v-if="message.response && message.response.type" class="structured-response">
                    <!-- 种植建议 -->
                    <div v-if="message.response.type === 'planting_advice'" class="planting-advice">
                      <h4><i class="fas fa-seedling"></i> {{ message.response.title }}</h4>
                      <div v-if="message.response.recommendations" class="recommendations">
                        <div
                          v-for="(rec, idx) in message.response.recommendations"
                          :key="idx"
                          class="recommendation-item"
                        >
                          <i class="fas fa-check-circle"></i>
                          {{ rec }}
                        </div>
                      </div>
                      <div v-if="message.response.fertilizerAdvice" class="fertilizer-advice">
                        <h5>施肥建议：</h5>
                        <div
                          v-for="(fertilizer, idx) in message.response.fertilizerAdvice"
                          :key="idx"
                          class="fertilizer-item"
                        >
                          {{ fertilizer }}
                        </div>
                      </div>
                    </div>

                    <!-- 政策咨询 -->
                    <div
                      v-if="message.response.type === 'policy_consultation'"
                      class="policy-response"
                    >
                      <h4><i class="fas fa-coins"></i> {{ message.response.title }}</h4>
                      <div
                        v-if="
                          message.response.calculations && message.response.calculations.length > 0
                        "
                        class="policy-calculations"
                      >
                        <div
                          v-for="(calc, idx) in message.response.calculations"
                          :key="idx"
                          class="calculation-card"
                        >
                          <h5>{{ calc.crop }}补贴计算</h5>
                          <div class="calculation-details">
                            <p>种植面积：{{ calc.area }}亩</p>
                            <p>
                              补贴金额：<strong>{{ calc.totalAmount }}元</strong>
                            </p>
                            <div class="subsidy-breakdown" v-if="calc.subsidies">
                              <div
                                v-for="(sub, sidx) in calc.subsidies"
                                :key="sidx"
                                class="subsidy-item"
                              >
                                <span class="policy-name">{{ sub.policy }}</span>
                                <span class="amount">{{ sub.amount }}元</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 病虫害防治 -->
                    <div
                      v-if="message.response.type === 'pest_disease_control'"
                      class="pest-disease-control"
                    >
                      <h4><i class="fas fa-bug"></i> {{ message.response.title }}</h4>
                      <div v-if="message.response.symptoms" class="symptoms">
                        <h5>症状表现：</h5>
                        <ul>
                          <li v-for="(symptom, idx) in message.response.symptoms" :key="idx">
                            {{ symptom }}
                          </li>
                        </ul>
                      </div>
                      <div v-if="message.response.prevention" class="prevention-methods">
                        <h5>预防措施：</h5>
                        <div
                          v-for="(method, idx) in message.response.prevention"
                          :key="idx"
                          class="prevention-item"
                        >
                          <span class="method-name">{{ method.method }}</span>
                          <span class="effectiveness">效果：{{ method.effectiveness }}</span>
                          <span class="cost">成本：{{ method.cost }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 相关问题推荐 -->
                  <div v-if="message.relatedQuestions" class="related-questions">
                    <h5>相关问题：</h5>
                    <div
                      v-for="(question, idx) in message.relatedQuestions"
                      :key="idx"
                      class="related-question"
                      @click="askRelatedQuestion(question)"
                    >
                      {{ question.question }}
                    </div>
                  </div>

                  <!-- 操作按钮 -->
                  <div class="message-actions">
                    <button
                      class="action-btn small"
                      @click="speakMessage(message)"
                      v-if="hasSpeechSupport"
                    >
                      <i class="fas fa-volume-up"></i> 语音播报
                    </button>
                    <button class="action-btn small" @click="copyMessage(message)">
                      <i class="fas fa-copy"></i> 复制
                    </button>
                    <button class="action-btn small" @click="likeMessage(message)">
                      <i class="fas fa-thumbs-up"></i> 有用
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 方言选择器 -->
      <div class="dialect-selector" v-if="showDialectSelector">
        <h4>选择方言</h4>
        <div class="dialect-options">
          <div
            v-for="dialect in supportedDialects"
            :key="dialect.code"
            class="dialect-option"
            :class="{ active: selectedDialect === dialect.code }"
            @click="selectDialect(dialect)"
          >
            <span class="dialect-name">{{ dialect.name }}</span>
            <span class="dialect-regions">{{ dialect.regions.join('、') }}</span>
          </div>
        </div>
        <button class="close-btn" @click="toggleDialectSelector">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- 输入区域 -->
      <div class="chat-input">
        <div class="input-container">
          <!-- 语音输入 -->
          <div class="voice-input" v-if="voiceInputActive">
            <button
              class="voice-record-btn"
              :class="{ recording: isRecording }"
              @click="toggleRecording"
            >
              <i class="fas fa-microphone"></i>
              <span v-if="isRecording">{{ recordingTime }}s</span>
            </button>
            <div class="voice-tips">按住说话，松开发送</div>
          </div>

          <!-- 文本输入 -->
          <div class="text-input" v-else>
            <input
              v-model="inputMessage"
              @keyup.enter="sendMessage"
              placeholder="请输入您的问题..."
              :disabled="isLoading"
              ref="messageInput"
            />
            <button
              class="send-btn"
              @click="sendMessage"
              :disabled="!inputMessage.trim() || isLoading"
            >
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>

        <!-- 快捷功能按钮 -->
        <div class="quick-functions">
          <button
            class="function-btn"
            @click="toggleVoiceInput"
            :class="{ active: voiceInputActive }"
          >
            <i class="fas fa-microphone"></i>
          </button>
          <button class="function-btn" @click="uploadImage">
            <i class="fas fa-image"></i>
          </button>
          <button class="function-btn" @click="openPolicyCalculator">
            <i class="fas fa-calculator"></i>
          </button>
          <button class="function-btn" @click="openFormAssistant">
            <i class="fas fa-file-alt"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 浮动按钮 -->
    <div class="floating-button" v-if="!isExpanded" @click="expandChat">
      <i class="fas fa-comments"></i>
      <span class="badge" v-if="unreadCount > 0">{{ unreadCount }}</span>
    </div>

    <!-- 政策计算器模态框 -->
    <PolicyCalculator v-if="showPolicyCalculator" @close="closePolicyCalculator" />

    <!-- AI填表助手模态框 -->
    <FormAssistant v-if="showFormAssistant" @close="closeFormAssistant" />
  </div>
</template>

<script>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import PolicyCalculator from './PolicyCalculator.vue';
import FormAssistant from './FormAssistant.vue';

export default {
  name: 'SmartChatBot',
  components: {
    PolicyCalculator,
    FormAssistant,
  },
  props: {
    initialExpanded: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const isExpanded = ref(props.initialExpanded);
    const isMobile = ref(false);
    const isOnline = ref(true);
    const isLoading = ref(false);
    const voiceInputActive = ref(false);
    const isRecording = ref(false);
    const recordingTime = ref(0);
    const recordingTimer = ref(null);
    const showDialectSelector = ref(false);
    const selectedDialect = ref('mandarin');
    const supportedDialects = ref([]);
    const hasSpeechSupport = ref(false);

    const inputMessage = ref('');
    const messages = ref([]);
    const unreadCount = ref(0);

    // 模态框状态
    const showPolicyCalculator = ref(false);
    const showFormAssistant = ref(false);

    // refs
    const chatContent = ref(null);
    const messageInput = ref(null);

    onMounted(() => {
      checkMobile();
      checkOnlineStatus();
      checkSpeechSupport();
      loadSupportedDialects();

      // 监听窗口大小变化
      window.addEventListener('resize', checkMobile);

      // 监听网络状态变化
      window.addEventListener('online', () => (isOnline.value = true));
      window.addEventListener('offline', () => (isOnline.value = false));
    });

    const checkMobile = () => {
      isMobile.value = window.innerWidth < 768;
    };

    const checkOnlineStatus = () => {
      isOnline.value = navigator.onLine;
    };

    const checkSpeechSupport = () => {
      hasSpeechSupport.value = 'speechSynthesis' in window;
    };

    const loadSupportedDialects = async () => {
      try {
        const response = await fetch('/api/v1/ai-chat/dialects');
        const data = await response.json();
        if (data.success) {
          supportedDialects.value = data.data;
        }
      } catch (error) {
        console.error('加载方言列表失败:', error);
      }
    };

    const expandChat = () => {
      isExpanded.value = true;
      unreadCount.value = 0;
      nextTick(() => {
        messageInput.value?.focus();
      });
    };

    const minimizeChat = () => {
      isExpanded.value = false;
    };

    const toggleVoiceInput = () => {
      voiceInputActive.value = !voiceInputActive.value;
      if (voiceInputActive.value && !isRecording.value) {
        nextTick(() => {
          startVoiceRecording();
        });
      }
    };

    const toggleDialectSelector = () => {
      showDialectSelector.value = !showDialectSelector.value;
    };

    const selectDialect = dialect => {
      selectedDialect.value = dialect.code;
      showDialectSelector.value = false;
      ElMessage.success(`已切换为${dialect.name}`);
    };

    const sendMessage = async () => {
      const message = inputMessage.value.trim();
      if (!message || isLoading.value) return;

      addUserMessage(message);
      inputMessage.value = '';

      try {
        await processQuery(message);
      } catch (error) {
        console.error('发送消息失败:', error);
        addBotMessage('抱歉，发送消息失败，请稍后重试。');
      }
    };

    const sendQuickQuery = async query => {
      addUserMessage(query);
      try {
        await processQuery(query);
      } catch (error) {
        console.error('发送快捷查询失败:', error);
        addBotMessage('抱歉，处理请求失败，请稍后重试。');
      }
    };

    const addUserMessage = content => {
      messages.value.push({
        type: 'user',
        content: content,
        timestamp: new Date(),
      });
      scrollToBottom();
    };

    const addBotMessage = (content, response = null, loading = false) => {
      messages.value.push({
        type: 'bot',
        content: content,
        response: response,
        loading: loading,
        timestamp: new Date(),
      });
      scrollToBottom();
    };

    const processQuery = async query => {
      isLoading.value = true;

      // 添加加载中的消息
      const loadingIndex = messages.value.length;
      addBotMessage('', null, true);

      try {
        const response = await fetch('/api/v1/ai-chat/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: query,
            context: {
              dialect: selectedDialect.value,
              sessionId: 'user_session_' + Date.now(),
            },
          }),
        });

        const data = await response.json();

        // 移除加载消息
        messages.value.splice(loadingIndex, 1);

        if (data.success) {
          addBotMessage(data.data.response.content || '正在思考...', data.data.response);
        } else {
          addBotMessage(data.message || '抱歉，我暂时无法回答这个问题。');
        }
      } catch (error) {
        // 移除加载消息
        messages.value.splice(loadingIndex, 1);
        addBotMessage('网络连接失败，请检查网络后重试。');
      } finally {
        isLoading.value = false;
      }
    };

    const startVoiceRecording = () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        ElMessage.error('您的浏览器不支持语音录制');
        return;
      }

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(stream => {
          isRecording.value = true;
          recordingTime.value = 0;

          recordingTimer.value = setInterval(() => {
            recordingTime.value++;
          }, 1000);

          // 这里应该开始录音并发送到服务器
          // 简化实现，3秒后自动结束
          setTimeout(() => {
            stopVoiceRecording();
            sendVoiceMessage('这是语音识别的模拟结果，请问水稻什么时候播种最好？');
          }, 3000);
        })
        .catch(error => {
          console.error('获取麦克风权限失败:', error);
          ElMessage.error('请允许使用麦克风进行语音输入');
        });
    };

    const stopVoiceRecording = () => {
      isRecording.value = false;
      if (recordingTimer.value) {
        clearInterval(recordingTimer.value);
        recordingTimer.value = null;
      }
    };

    const toggleRecording = () => {
      if (isRecording.value) {
        stopVoiceRecording();
      } else {
        startVoiceRecording();
      }
    };

    const sendVoiceMessage = async recognizedText => {
      addUserMessage(`[语音] ${recognizedText}`);
      try {
        await processQuery(recognizedText);
      } catch (error) {
        console.error('发送语音消息失败:', error);
        addBotMessage('抱歉，处理语音消息失败，请稍后重试。');
      }
    };

    const openPolicyCalculator = () => {
      showPolicyCalculator.value = true;
    };

    const closePolicyCalculator = () => {
      showPolicyCalculator.value = false;
    };

    const openFormAssistant = () => {
      showFormAssistant.value = true;
    };

    const closeFormAssistant = () => {
      showFormAssistant.value = false;
    };

    const askRelatedQuestion = question => {
      sendQuickQuery(question.question);
    };

    const speakMessage = message => {
      if (!hasSpeechSupport.value) return;

      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    };

    const copyMessage = message => {
      navigator.clipboard
        .writeText(message.content)
        .then(() => {
          ElMessage.success('内容已复制到剪贴板');
        })
        .catch(() => {
          ElMessage.error('复制失败');
        });
    };

    const likeMessage = message => {
      // 这里应该发送到后端记录用户反馈
      ElMessage.success('感谢您的反馈');
    };

    const uploadImage = () => {
      // 图片上传功能
      ElMessage.info('图片识别功能开发中');
    };

    const formatTime = timestamp => {
      return new Date(timestamp).toLocaleTimeString();
    };

    const formatMessage = content => {
      // 简单的文本格式化
      return content.replace(/\n/g, '<br>');
    };

    const scrollToBottom = () => {
      nextTick(() => {
        if (chatContent.value) {
          chatContent.value.scrollTop = chatContent.value.scrollHeight;
        }
      });
    };

    return {
      // 状态
      isExpanded,
      isMobile,
      isOnline,
      isLoading,
      voiceInputActive,
      isRecording,
      recordingTime,
      showDialectSelector,
      selectedDialect,
      supportedDialects,
      hasSpeechSupport,
      inputMessage,
      messages,
      unreadCount,
      showPolicyCalculator,
      showFormAssistant,

      // refs
      chatContent,
      messageInput,

      // 方法
      expandChat,
      minimizeChat,
      sendMessage,
      sendQuickQuery,
      toggleVoiceInput,
      toggleDialectSelector,
      selectDialect,
      toggleRecording,
      askRelatedQuestion,
      speakMessage,
      copyMessage,
      likeMessage,
      uploadImage,
      openPolicyCalculator,
      closePolicyCalculator,
      openFormAssistant,
      closeFormAssistant,
      formatTime,
      formatMessage,
    };
  },
};
</script>

<style scoped>
.smart-chatbot {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.chat-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 380px;
  height: 600px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  transition: all 0.3s ease;
}

.chat-container.mobile {
  width: 100vw;
  height: 100vh;
  bottom: 0;
  right: 0;
  border-radius: 0;
}

.chat-container.expanded {
  width: 450px;
  height: 700px;
}

.chat-header {
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  color: white;
  padding: 16px;
  border-radius: 12px 12px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mobile .chat-header {
  border-radius: 0;
}

.header-left {
  display: flex;
  align-items: center;
}

.bot-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
  background: rgba(255, 255, 255, 0.2);
}

.bot-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bot-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.status {
  font-size: 12px;
  opacity: 0.9;
}

.status.online::before {
  content: '●';
  color: #4caf50;
  margin-right: 4px;
}

.header-right {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
}

.icon-btn:hover,
.icon-btn.active {
  background: rgba(255, 255, 255, 0.3);
}

.chat-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f8f9fa;
}

.message {
  margin-bottom: 16px;
  animation: fadeInUp 0.3s ease;
}

.message-content {
  display: flex;
}

.message.user .message-content {
  justify-content: flex-end;
}

.user-message {
  max-width: 80%;
  background: #4caf50;
  color: white;
  padding: 12px 16px;
  border-radius: 18px 18px 4px 18px;
  word-wrap: break-word;
}

.user-message .time {
  font-size: 11px;
  opacity: 0.8;
  text-align: right;
  margin-top: 4px;
}

.bot-message {
  display: flex;
  max-width: 80%;
}

.bot-message .avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 8px;
  background: #e0e0e0;
}

.bot-message .avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bot-message .text {
  background: white;
  padding: 12px 16px;
  border-radius: 18px 18px 18px 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #ccc;
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

.welcome .bot-message .text {
  background: linear-gradient(135deg, #e8f5e8, #f1f8e9);
}

.quick-actions h4 {
  margin: 16px 0 12px;
  color: #2e7d32;
  font-size: 14px;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.action-btn {
  background: white;
  border: 1px solid #4caf50;
  color: #4caf50;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn:hover {
  background: #4caf50;
  color: white;
}

.action-btn.small {
  padding: 4px 8px;
  font-size: 11px;
  margin-top: 8px;
  margin-right: 8px;
}

.structured-response {
  margin-top: 12px;
  padding: 12px;
  background: #f0f7f0;
  border-radius: 8px;
  border-left: 4px solid #4caf50;
}

.structured-response h4 {
  margin: 0 0 8px;
  color: #2e7d32;
  display: flex;
  align-items: center;
  gap: 6px;
}

.recommendations .recommendation-item {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  color: #555;
  font-size: 14px;
}

.fertilizer-advice h5 {
  margin: 12px 0 6px;
  color: #2e7d32;
  font-size: 14px;
}

.fertilizer-item {
  color: #666;
  font-size: 13px;
  margin-bottom: 4px;
}

.policy-calculations {
  margin-top: 12px;
}

.calculation-card {
  background: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid #e0e0e0;
}

.calculation-card h5 {
  margin: 0 0 8px;
  color: #2e7d32;
}

.calculation-details p {
  margin: 4px 0;
  font-size: 14px;
}

.subsidy-breakdown {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
}

.subsidy-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 13px;
}

.policy-name {
  color: #666;
}

.amount {
  font-weight: 600;
  color: #4caf50;
}

.related-questions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
}

.related-questions h5 {
  margin: 0 0 8px;
  color: #666;
  font-size: 14px;
}

.related-question {
  background: white;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #4caf50;
  border: 1px solid #e0e0e0;
  transition: all 0.3s;
}

.related-question:hover {
  background: #4caf50;
  color: white;
}

.dialect-selector {
  position: absolute;
  top: 60px;
  right: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 16px;
  width: 280px;
  z-index: 1001;
}

.dialect-selector h4 {
  margin: 0 0 12px;
  color: #333;
}

.dialect-option {
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.3s;
}

.dialect-option:hover {
  background: #f0f7f0;
}

.dialect-option.active {
  background: #4caf50;
  color: white;
}

.dialect-name {
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.dialect-regions {
  font-size: 12px;
  opacity: 0.7;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  background: #f0f0f0;
  color: #666;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-input {
  border-top: 1px solid #e0e0e0;
  padding: 16px;
  background: white;
  border-radius: 0 0 12px 12px;
}

.input-container {
  margin-bottom: 8px;
}

.voice-input {
  text-align: center;
}

.voice-record-btn {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid #4caf50;
  background: white;
  color: #4caf50;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
}

.voice-record-btn.recording {
  background: #4caf50;
  color: white;
  animation: pulse 1.5s infinite;
}

.voice-tips {
  font-size: 12px;
  color: #666;
}

.text-input {
  display: flex;
  gap: 8px;
}

.text-input input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.3s;
}

.text-input input:focus {
  border-color: #4caf50;
}

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: #4caf50;
  color: white;
  cursor: pointer;
  transition: background 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn:hover:not(:disabled) {
  background: #45a049;
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.quick-functions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.function-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  background: white;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.function-btn:hover,
.function-btn.active {
  background: #4caf50;
  color: white;
  border-color: #4caf50;
}

.floating-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  background: #4caf50;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.3);
  transition: all 0.3s;
  z-index: 999;
}

.floating-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ff4444;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-container {
    bottom: 0;
    right: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }

  .floating-button {
    bottom: 20px;
    right: 20px;
  }

  .action-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
