<template>
  <div class="ai-chat-container">
    <!-- 会话列表侧边栏 -->
    <div class="sessions-sidebar" v-if="showSessions">
      <div class="sidebar-header">
        <h3>AI助手会话</h3>
        <el-button 
          type="primary" 
          size="small" 
          @click="createNewSession"
          :loading="loading"
        >
          <el-icon><Plus /></el-icon>
          新建会话
        </el-button>
      </div>

      <!-- 会话类型过滤 -->
      <div class="session-types">
        <el-radio-group v-model="selectedType" size="small" @change="filterSessions">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="general">通用</el-radio-button>
          <el-radio-button label="agriculture">农业</el-radio-button>
          <el-radio-button label="policy">政策</el-radio-button>
          <el-radio-button label="finance">财务</el-radio-button>
          <el-radio-button label="emergency">应急</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 会话列表 -->
      <div class="sessions-list">
        <div 
          v-for="session in filteredSessions" 
          :key="session._id"
          class="session-item"
          :class="{ active: currentSession?._id === session._id }"
          @click="switchToSession(session)"
        >
          <div class="session-info">
            <div class="session-title">{{ session.title }}</div>
            <div class="session-meta">
              <span class="session-type">{{ getSessionTypeLabel(session.type) }}</span>
              <span class="session-time">{{ formatTime(session.updatedAt) }}</span>
            </div>
          </div>
          <div class="session-actions">
            <el-button 
              type="danger" 
              size="small" 
              text
              @click.stop="deleteSessionHandler(session)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
        
        <div v-if="!hasSessions" class="empty-sessions">
          <el-empty description="暂无会话" />
          <el-button type="primary" @click="createNewSession">创建第一个会话</el-button>
        </div>
      </div>
    </div>

    <!-- 聊天主区域 -->
    <div class="chat-main">
      <!-- 聊天头部 -->
      <div class="chat-header">
        <div class="header-left">
          <el-button 
            text 
            @click="toggleSessions"
            class="sessions-toggle"
          >
            <el-icon><Menu /></el-icon>
          </el-button>
          <div class="session-info" v-if="currentSession">
            <h3>{{ currentSession.title }}</h3>
            <el-tag size="small" :type="getSessionTypeTag(currentSession.type)">
              {{ getSessionTypeLabel(currentSession.type) }}
            </el-tag>
          </div>
        </div>
        <div class="header-right">
          <!-- 语音输入按钮 -->
          <el-button 
            :type="voiceInputActive ? 'primary' : 'default'"
            size="small"
            @click="toggleVoiceInput"
            :disabled="!currentSession"
          >
            <el-icon><Microphone /></el-icon>
          </el-button>
          
          <!-- 智能建议按钮 -->
          <el-button 
            size="small"
            @click="toggleSmartQuestions"
            :disabled="!currentSession"
          >
            <el-icon><Lightbulb /></el-icon>
          </el-button>
          
          <!-- 设置按钮 -->
          <el-dropdown @command="handleSettingCommand">
            <el-button size="small">
              <el-icon><Setting /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="clear">清空对话</el-dropdown-item>
                <el-dropdown-item command="export">导出记录</el-dropdown-item>
                <el-dropdown-item command="settings">设置</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 聊天内容区域 -->
      <div class="chat-content" ref="chatContent">
        <!-- 欢迎界面 -->
        <div v-if="!currentSession" class="welcome-screen">
          <div class="welcome-content">
            <div class="ai-avatar">
              <el-icon size="64" color="#4caf50"><Robot /></el-icon>
            </div>
            <h2>智慧乡村AI助手</h2>
            <p>我是您的智能助手，可以为您提供农业咨询、政策解读、财务指导等服务</p>
            
            <div class="quick-start">
              <h3>快速开始</h3>
              <div class="quick-actions">
                <el-button 
                  v-for="action in quickActions" 
                  :key="action.type"
                  :type="action.type === 'general' ? 'primary' : ''"
                  @click="createSessionByType(action.type)"
                  :icon="action.icon"
                >
                  {{ action.label }}
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-else class="messages-container">
          <div 
            v-for="message in messages" 
            :key="message._id"
            class="message"
            :class="message.role"
          >
            <div class="message-avatar">
              <el-icon v-if="message.role === 'user'" size="24"><User /></el-icon>
              <el-icon v-else size="24"><Robot /></el-icon>
            </div>
            <div class="message-content">
              <div class="message-text" v-html="formatMessage(message.content)"></div>
              <div class="message-meta">
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                <span v-if="message.isVoice" class="voice-indicator">
                  <el-icon><Microphone /></el-icon> 语音
                </span>
              </div>
            </div>
          </div>

          <!-- 流式响应 -->
          <div v-if="streaming" class="message assistant streaming">
            <div class="message-avatar">
              <el-icon size="24"><Robot /></el-icon>
            </div>
            <div class="message-content">
              <div class="message-text">{{ streamingMessage }}<span class="typing-cursor">|</span></div>
            </div>
          </div>

          <!-- 加载状态 -->
          <div v-if="loading" class="loading-indicator">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>AI正在思考中...</span>
          </div>
        </div>
      </div>

      <!-- 智能建议面板 -->
      <div v-if="showSmartQuestions && smartQuestions.length > 0" class="smart-questions-panel">
        <div class="panel-header">
          <h4>相关问题建议</h4>
          <el-button text size="small" @click="showSmartQuestions = false">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        <div class="questions-list">
          <el-tag
            v-for="question in smartQuestions"
            :key="question"
            @click="sendQuickQuestion(question)"
            class="question-tag"
          >
            {{ question }}
          </el-tag>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="chat-input" v-if="currentSession">
        <div class="input-container">
          <!-- 语音输入 -->
          <div v-if="voiceInputActive" class="voice-input-container">
            <el-button
              :type="isRecording ? 'danger' : 'primary'"
              circle
              size="large"
              @click="toggleRecording"
              :loading="processingVoice"
            >
              <el-icon><Microphone /></el-icon>
            </el-button>
            <div class="voice-status">
              <span v-if="isRecording">录音中... {{ recordingTime }}s</span>
              <span v-else>点击开始录音</span>
            </div>
          </div>

          <!-- 文本输入 -->
          <div v-else class="text-input-container">
            <el-input
              v-model="inputMessage"
              type="textarea"
              :rows="1"
              :autosize="{ minRows: 1, maxRows: 4 }"
              placeholder="请输入您的问题..."
              @keyup.ctrl.enter="sendMessage"
              @keyup.alt.enter="newLine"
              :disabled="loading"
              ref="messageInput"
            />
            <el-button
              type="primary"
              @click="sendMessage"
              :disabled="!inputMessage.trim() || loading"
              :loading="loading"
            >
              <el-icon><Promotion /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 快捷功能 -->
        <div class="quick-functions">
          <el-button 
            text 
            size="small"
            @click="toggleVoiceInput"
            :disabled="loading"
          >
            <el-icon><Microphone /></el-icon>
            语音
          </el-button>
          <el-button 
            text 
            size="small"
            @click="loadSmartQuestions"
            :disabled="loading"
          >
            <el-icon><Lightbulb /></el-icon>
            建议
          </el-button>
          <el-button 
            text 
            size="small"
            @click="clearMessages"
            :disabled="loading || !hasMessages"
          >
            <el-icon><Delete /></el-icon>
            清空
          </el-button>
        </div>
      </div>
    </div>
  </div>

  <!-- 语音确认弹窗 -->
  <el-dialog
    v-model="showVoiceConfirm"
    title="语音识别结果"
    width="400px"
  >
    <div class="voice-confirm-content">
      <p>识别结果：</p>
      <div class="recognized-text">{{ recognizedText }}</div>
    </div>
    <template #footer>
      <el-button @click="showVoiceConfirm = false">取消</el-button>
      <el-button type="primary" @click="confirmVoiceMessage">发送</el-button>
    </template>
  </el-dialog>
</template>

<script>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  Delete, 
  Menu, 
  Microphone, 
  Lightbulb, 
  Setting, 
  Plus, 
  Robot, 
  User, 
  Promotion, 
  Loading, 
  Close 
} from '@element-plus/icons-vue';
import { useAI } from '@/composables/useAI';
import speechApi from '@/api/speech';

export default {
  name: 'AIChat',
  setup() {
    const ai = useAI();
    
    // 组件状态
    const showSessions = ref(true);
    const showSmartQuestions = ref(false);
    const showVoiceConfirm = ref(false);
    const selectedType = ref('all');
    const voiceInputActive = ref(false);
    const isRecording = ref(false);
    const recordingTime = ref(0);
    const processingVoice = ref(false);
    const recordingTimer = ref(null);
    const recognizedText = ref('');
    
    // 输入相关
    const inputMessage = ref('');
    const messageInput = ref(null);
    const chatContent = ref(null);

    // 计算属性
    const hasSessions = computed(() => ai.hasSessions);
    const hasMessages = computed(() => ai.hasMessages);
    const loading = computed(() => ai.loading);
    const error = computed(() => ai.error);
    const streaming = computed(() => ai.streaming);
    const streamingMessage = computed(() => ai.streamingMessage);
    const currentSession = computed(() => ai.currentSession);
    const messages = computed(() => ai.messages);
    const smartQuestions = computed(() => ai.smartQuestions);

    // 过滤后的会话列表
    const filteredSessions = computed(() => {
      if (selectedType.value === 'all') {
        return ai.sessions;
      }
      return ai.sessions.filter(session => session.type === selectedType.value);
    });

    // 快捷操作
    const quickActions = [
      { type: 'general', label: '通用咨询', icon: 'ChatRound' },
      { type: 'agriculture', label: '农业咨询', icon: 'Seeding' },
      { type: 'policy', label: '政策咨询', icon: 'Document' },
      { type: 'finance', label: '财务咨询', icon: 'Wallet' },
      { type: 'emergency', label: '应急咨询', icon: 'Warning' },
    ];

    // 方法
    const toggleSessions = () => {
      showSessions.value = !showSessions.value;
    };

    const toggleSmartQuestions = () => {
      showSmartQuestions.value = !showSmartQuestions.value;
      if (showSmartQuestions.value) {
        ai.loadSmartQuestions(currentSession.value?.type || 'general');
      }
    };

    const toggleVoiceInput = () => {
      voiceInputActive.value = !voiceInputActive.value;
      if (voiceInputActive.value) {
        nextTick(() => {
          focusInput();
        });
      }
    };

    const focusInput = () => {
      messageInput.value?.focus();
    };

    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    };

    const formatMessage = (content) => {
      return content
        ?.replace(/\n/g, '<br>')
        ?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        ?.replace(/\*(.*?)\*/g, '<em>$1</em>');
    };

    const getSessionTypeLabel = (type) => {
      const labels = {
        general: '通用',
        agriculture: '农业',
        policy: '政策',
        finance: '财务',
        emergency: '应急',
      };
      return labels[type] || '其他';
    };

    const getSessionTypeTag = (type) => {
      const types = {
        general: '',
        agriculture: 'success',
        policy: 'warning',
        finance: 'info',
        emergency: 'danger',
      };
      return types[type] || '';
    };

    const createNewSession = async () => {
      const session = await ai.createSession({
        title: '新会话',
        type: 'general',
      });
      
      if (session) {
        ElMessage.success('会话创建成功');
        focusInput();
      }
    };

    const createSessionByType = async (type) => {
      const titles = {
        general: '通用咨询',
        agriculture: '农业咨询',
        policy: '政策咨询',
        finance: '财务咨询',
        emergency: '应急咨询',
      };

      const session = await ai.createSession({
        title: titles[type],
        type,
      });
      
      if (session) {
        ElMessage.success(`${titles[type]}会话创建成功`);
        focusInput();
      }
    };

    const switchToSession = async (session) => {
      await ai.switchSession(session._id);
      inputMessage.value = '';
      focusInput();
    };

    const deleteSessionHandler = async (session) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除会话"${session.title}"吗？此操作不可恢复。`,
          '删除确认',
          {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
          }
        );
        
        const success = await ai.deleteSession(session._id);
        if (success) {
          ElMessage.success('会话删除成功');
        }
      } catch {
        // 用户取消删除
      }
    };

    const filterSessions = () => {
      // 会话列表已通过计算属性自动过滤
    };

    const sendMessage = async () => {
      const message = inputMessage.value.trim();
      if (!message || !currentSession.value) return;

      await ai.sendTextMessage(message);
      inputMessage.value = '';
      scrollToBottom();
    };

    const sendQuickQuestion = async (question) => {
      if (!currentSession.value) return;
      
      inputMessage.value = question;
      await sendMessage();
      showSmartQuestions.value = false;
    };

    const loadSmartQuestions = async () => {
      if (currentSession.value) {
        await ai.loadSmartQuestions(currentSession.value.type);
        showSmartQuestions.value = true;
      }
    };

    const clearMessages = async () => {
      try {
        await ElMessageBox.confirm(
          '确定要清空当前会话的消息记录吗？',
          '清空确认',
          {
            confirmButtonText: '清空',
            cancelButtonText: '取消',
            type: 'warning',
          }
        );
        
        // 这里应该调用清空消息的API
        ai.messages.value = [];
        ElMessage.success('消息已清空');
      } catch {
        // 用户取消
      }
    };

    const toggleRecording = () => {
      if (isRecording.value) {
        stopRecording();
      } else {
        startRecording();
      }
    };

    const startRecording = () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        ElMessage.error('您的浏览器不支持语音录制');
        return;
      }

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          isRecording.value = true;
          recordingTime.value = 0;
          
          recordingTimer.value = setInterval(() => {
            recordingTime.value++;
          }, 1000);

          // 这里应该实现实际的录音逻辑
          // 简化实现：5秒后自动停止
          setTimeout(() => {
            if (isRecording.value) {
              stopRecording();
              // 模拟语音识别结果
              recognizedText.value = '请问今年水稻种植有什么补贴政策？';
              showVoiceConfirm.value = true;
            }
          }, 5000);
        })
        .catch(error => {
          console.error('获取麦克风权限失败:', error);
          ElMessage.error('请允许使用麦克风进行语音输入');
        });
    };

    const stopRecording = () => {
      isRecording.value = false;
      if (recordingTimer.value) {
        clearInterval(recordingTimer.value);
        recordingTimer.value = null;
      }
    };

    const confirmVoiceMessage = async () => {
      if (!recognizedText.value.trim() || !currentSession.value) return;

      processingVoice.value = true;
      try {
        // 这里应该调用语音识别API
        // const result = await speechApi.recognize(audioBlob);
        // await ai.sendVoiceMessage(result.data);
        
        // 模拟发送语音消息
        ai.messages.value.push({
          _id: Date.now().toString(),
          role: 'user',
          content: `[语音] ${recognizedText.value}`,
          timestamp: new Date(),
          isVoice: true,
        });
        
        await ai.sendTextMessage(recognizedText.value);
        
        showVoiceConfirm.value = false;
        recognizedText.value = '';
        scrollToBottom();
      } catch (error) {
        ElMessage.error('语音处理失败，请重试');
      } finally {
        processingVoice.value = false;
      }
    };

    const handleSettingCommand = (command) => {
      switch (command) {
        case 'clear':
          clearMessages();
          break;
        case 'export':
          ElMessage.info('导出功能开发中');
          break;
        case 'settings':
          ElMessage.info('设置功能开发中');
          break;
      }
    };

    const scrollToBottom = () => {
      nextTick(() => {
        if (chatContent.value) {
          chatContent.value.scrollTop = chatContent.value.scrollHeight;
        }
      });
    };

    const newLine = () => {
      // 允许在输入框中换行
    };

    // 监听错误
    watch(error, (newError) => {
      if (newError) {
        ElMessage.error(newError);
        ai.clearError();
      }
    });

    // 监听消息变化
    watch(messages, () => {
      scrollToBottom();
    }, { deep: true });

    // 监听流式消息
    watch(streamingMessage, () => {
      scrollToBottom();
    });

    onMounted(() => {
      // 自动加载会话列表
      if (ai.getUserId()) {
        ai.loadSessions();
      }
      
      // 监听Enter键发送消息
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
          if (document.activeElement === messageInput.value?.textarea) {
            e.preventDefault();
            sendMessage();
          }
        }
      });
    });

    return {
      // 状态
      showSessions,
      showSmartQuestions,
      showVoiceConfirm,
      selectedType,
      voiceInputActive,
      isRecording,
      recordingTime,
      processingVoice,
      inputMessage,
      recognizedText,
      
      // 计算属性
      hasSessions,
      hasMessages,
      loading,
      streaming,
      streamingMessage,
      currentSession,
      messages,
      smartQuestions,
      filteredSessions,
      quickActions,
      
      // Refs
      messageInput,
      chatContent,
      
      // 方法
      toggleSessions,
      toggleSmartQuestions,
      toggleVoiceInput,
      toggleRecording,
      sendMessage,
      sendQuickQuestion,
      createNewSession,
      createSessionByType,
      switchToSession,
      deleteSessionHandler,
      filterSessions,
      loadSmartQuestions,
      clearMessages,
      confirmVoiceMessage,
      handleSettingCommand,
      formatTime,
      formatMessage,
      getSessionTypeLabel,
      getSessionTypeTag,
      newLine,
    };
  },
};
</script>

<style scoped>
.ai-chat-container {
  display: flex;
  height: 100%;
  background: #f5f5f5;
}

/* 侧边栏样式 */
.sessions-sidebar {
  width: 300px;
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.session-types {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.session-item:hover {
  background: #f0f7f0;
}

.session-item.active {
  background: #4caf50;
  color: white;
}

.session-info {
  flex: 1;
}

.session-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.session-meta {
  font-size: 12px;
  opacity: 0.7;
}

.session-type {
  margin-right: 8px;
}

.empty-sessions {
  text-align: center;
  padding: 40px 20px;
}

/* 主聊天区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sessions-toggle {
  padding: 8px;
}

.session-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.header-right {
  display: flex;
  gap: 8px;
}

/* 聊天内容 */
.chat-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
}

.welcome-screen {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-content {
  text-align: center;
  max-width: 400px;
}

.ai-avatar {
  margin-bottom: 16px;
}

.welcome-content h2 {
  margin: 0 0 8px 0;
  color: #2e7d32;
}

.welcome-content p {
  color: #666;
  margin-bottom: 32px;
}

.quick-start h3 {
  margin-bottom: 16px;
  color: #333;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

/* 消息样式 */
.messages-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 80%;
  margin: 0 auto;
}

.message.user {
  margin-left: auto;
  flex-direction: row-reverse;
}

.message.assistant {
  margin-right: auto;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: #4caf50;
  color: white;
}

.message.assistant .message-avatar {
  background: #2196f3;
  color: white;
}

.message-content {
  background: white;
  padding: 12px 16px;
  border-radius: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: calc(100% - 48px);
}

.message.user .message-content {
  background: #4caf50;
  color: white;
}

.message-text {
  line-height: 1.5;
  word-wrap: break-word;
}

.message-meta {
  font-size: 12px;
  opacity: 0.7;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.voice-indicator {
  display: flex;
  align-items: center;
  gap: 2px;
}

.loading-indicator {
  text-align: center;
  padding: 20px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.streaming .message-text::after {
  content: '|';
  animation: blink 1s infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 智能建议面板 */
.smart-questions-panel {
  border-top: 1px solid #e0e0e0;
  background: #f9f9f9;
  padding: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.questions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.question-tag {
  cursor: pointer;
  transition: all 0.3s;
}

.question-tag:hover {
  transform: scale(1.05);
}

/* 输入区域 */
.chat-input {
  border-top: 1px solid #e0e0e0;
  background: white;
  padding: 16px;
}

.input-container {
  margin-bottom: 8px;
}

.voice-input-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: #f0f7f0;
  border-radius: 8px;
}

.voice-status {
  font-size: 14px;
  color: #666;
}

.text-input-container {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.text-input-container .el-input {
  flex: 1;
}

.quick-functions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.quick-functions .el-button {
  font-size: 12px;
}

/* 语音确认弹窗 */
.voice-confirm-content {
  padding: 16px 0;
}

.recognized-text {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sessions-sidebar {
    position: absolute;
    left: -300px;
    height: 100%;
    z-index: 100;
    transition: left 0.3s;
  }
  
  .sessions-sidebar.show {
    left: 0;
  }
  
  .chat-main {
    margin-left: 0;
  }
  
  .message {
    max-width: 90%;
  }
  
  .quick-actions {
    grid-template-columns: 1fr;
  }
}
</style>