/**
 * AI智能助手 Composable
 * 提供AI会话管理、消息处理和状态管理功能
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/user';
import aiApi from '@/api/ai';

/**
 * AI助手 Hook
 * @returns {Object} AI相关的状态和方法
 */
export function useAI() {
  const userStore = useUserStore();

  // 状态
  const sessions = ref([]);
  const currentSession = ref(null);
  const messages = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const streaming = ref(false);
  const streamingMessage = ref('');
  const websocket = ref(null);
  const smartQuestions = ref([]);

  // 计算属性
  const hasSessions = computed(() => sessions.value.length > 0);
  const hasMessages = computed(() => messages.value.length > 0);
  const isCurrentSessionActive = computed(() => currentSession.value && currentSession.value.status === 'active');
  const sessionTypes = computed(() => {
    const types = {};
    sessions.value.forEach(session => {
      types[session.type] = (types[session.type] || 0) + 1;
    });
    return types;
  });

  /**
   * 获取用户ID
   */
  function getUserId() {
    return userStore.user?.id || userStore.user?._id || localStorage.getItem('userId');
  }

  /**
   * 加载会话列表
   */
  async function loadSessions(params = {}) {
    if (!getUserId()) {
      error.value = '用户未登录';
      return;
    }

    try {
      loading.value = true;
      error.value = null;
      
      const response = await aiApi.getSessions({
        limit: 50,
        ...params,
      });
      
      if (response.success) {
        sessions.value = response.data || [];
      } else {
        throw new Error(response.message || '加载会话失败');
      }
    } catch (err) {
      console.error('加载会话失败:', err);
      error.value = err.message || '网络错误';
    } finally {
      loading.value = false;
    }
  }

  /**
   * 创建新会话
   */
  async function createSession(sessionData) {
    const userId = getUserId();
    if (!userId) {
      error.value = '用户未登录';
      return null;
    }

    try {
      loading.value = true;
      error.value = null;

      const sessionPayload = {
        title: sessionData.title || '新会话',
        type: sessionData.type || 'general',
        userId,
        ...sessionData,
      };

      const response = await aiApi.createSession(sessionPayload);
      
      if (response.success) {
        const newSession = response.data;
        sessions.value.unshift(newSession);
        await switchSession(newSession._id);
        return newSession;
      } else {
        throw new Error(response.message || '创建会话失败');
      }
    } catch (err) {
      console.error('创建会话失败:', err);
      error.value = err.message || '创建会话失败';
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 切换会话
   */
  async function switchSession(sessionId) {
    try {
      loading.value = true;
      
      const response = await aiApi.getSession(sessionId);
      
      if (response.success) {
        currentSession.value = response.data;
        await loadMessages(sessionId);
        
        // 连接WebSocket进行实时通信
        connectStreaming(sessionId);
      } else {
        throw new Error(response.message || '获取会话详情失败');
      }
    } catch (err) {
      console.error('切换会话失败:', err);
      error.value = err.message || '切换会话失败';
    } finally {
      loading.value = false;
    }
  }

  /**
   * 加载消息历史
   */
  async function loadMessages(sessionId, params = {}) {
    try {
      const response = await aiApi.getMessages(sessionId, {
        limit: 100,
        ...params,
      });
      
      if (response.success) {
        messages.value = response.data || [];
      } else {
        throw new Error(response.message || '加载消息失败');
      }
    } catch (err) {
      console.error('加载消息失败:', err);
      error.value = err.message || '加载消息失败';
    }
  }

  /**
   * 发送文本消息
   */
  async function sendTextMessage(content, options = {}) {
    if (!currentSession.value) {
      error.value = '请先选择或创建会话';
      return null;
    }

    try {
      loading.value = true;
      error.value = null;

      // 添加用户消息到列表
      const userMessage = {
        _id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date(),
        isVoice: false,
      };
      
      messages.value.push(userMessage);

      const response = await aiApi.sendTextMessage(currentSession.value._id, content);
      
      if (response.success) {
        const aiMessage = {
          _id: response.data._id,
          role: 'assistant',
          content: response.data.content,
          timestamp: new Date(),
          isVoice: false,
        };
        
        messages.value.push(aiMessage);
        return aiMessage;
      } else {
        // 移除用户消息并显示错误
        messages.value.pop();
        throw new Error(response.message || '发送消息失败');
      }
    } catch (err) {
      console.error('发送消息失败:', err);
      error.value = err.message || '发送消息失败';
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 发送语音消息
   */
  async function sendVoiceMessage(audioBlob, options = {}) {
    if (!currentSession.value) {
      error.value = '请先选择或创建会话';
      return null;
    }

    try {
      loading.value = true;
      error.value = null;

      const response = await aiApi.sendVoiceMessage(currentSession.value._id, audioBlob);
      
      if (response.success) {
        const aiMessage = {
          _id: response.data._id,
          role: 'assistant',
          content: response.data.content,
          timestamp: new Date(),
          isVoice: true,
          audioUrl: response.data.audioUrl,
        };
        
        messages.value.push(aiMessage);
        return aiMessage;
      } else {
        throw new Error(response.message || '发送语音消息失败');
      }
    } catch (err) {
      console.error('发送语音消息失败:', err);
      error.value = err.message || '发送语音消息失败';
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 连接WebSocket进行实时流式对话
   */
  function connectStreaming(sessionId) {
    if (websocket.value?.readyState === WebSocket.OPEN) {
      websocket.value.close();
    }

    try {
      websocket.value = aiApi.createStreamingConnection(sessionId, {
        voice: true,
        language: 'zh-CN',
      });

      websocket.value.onopen = handleWebSocketOpen;
      websocket.value.onmessage = handleWebSocketMessage;
      websocket.value.onerror = handleWebSocketError;
      websocket.value.onclose = handleWebSocketClose;
    } catch (err) {
      console.error('连接WebSocket失败:', err);
      error.value = '实时连接失败';
    }
  }

  /**
   * 处理WebSocket连接打开
   */
  function handleWebSocketOpen() {
    console.log('[AI WebSocket] 连接已建立');
    streaming.value = true;
  }

  /**
   * 处理WebSocket消息
   */
  function handleWebSocketMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
      case 'streaming_start':
        streamingMessage.value = '';
        break;
          
      case 'streaming_chunk':
        streamingMessage.value += data.content;
        break;
          
      case 'streaming_end':
        const finalMessage = {
          _id: data.messageId || Date.now().toString(),
          role: 'assistant',
          content: streamingMessage.value,
          timestamp: new Date(),
        };
        messages.value.push(finalMessage);
        streamingMessage.value = '';
        break;
          
      case 'message_complete':
        // 更新消息状态
        const messageIndex = messages.value.findIndex(msg => msg._id === data.messageId);
        if (messageIndex !== -1) {
          messages.value[messageIndex] = {
            ...messages.value[messageIndex],
            ...data.message,
          };
        }
        break;
          
      case 'error':
        error.value = data.message || 'AI响应错误';
        break;
      }
    } catch (err) {
      console.error('解析WebSocket消息失败:', err);
    }
  }

  /**
   * 处理WebSocket错误
   */
  function handleWebSocketError(err) {
    console.error('[AI WebSocket] 连接错误:', err);
    error.value = '实时连接错误';
    streaming.value = false;
  }

  /**
   * 处理WebSocket关闭
   */
  function handleWebSocketClose() {
    console.log('[AI WebSocket] 连接已关闭');
    streaming.value = false;
    websocket.value = null;
  }

  /**
   * 关闭WebSocket连接
   */
  function disconnectStreaming() {
    if (websocket.value) {
      websocket.value.close();
      websocket.value = null;
    }
    streaming.value = false;
    streamingMessage.value = '';
  }

  /**
   * 获取智能提问建议
   */
  async function loadSmartQuestions(type = 'general') {
    try {
      const context = currentSession.value?.title || '通用咨询';
      const response = await aiApi.getSmartQuestions(context, type);
      
      if (response.success) {
        smartQuestions.value = response.data || [];
      }
    } catch (err) {
      console.error('获取智能提问建议失败:', err);
    }
  }

  /**
   * 删除会话
   */
  async function deleteSession(sessionId) {
    try {
      loading.value = true;
      
      const response = await aiApi.deleteSession(sessionId);
      
      if (response.success) {
        sessions.value = sessions.value.filter(session => session._id !== sessionId);
        
        // 如果删除的是当前会话，清空当前会话
        if (currentSession.value?._id === sessionId) {
          currentSession.value = null;
          messages.value = [];
          disconnectStreaming();
        }
        
        return true;
      } else {
        throw new Error(response.message || '删除会话失败');
      }
    } catch (err) {
      console.error('删除会话失败:', err);
      error.value = err.message || '删除会话失败';
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 获取农业建议
   */
  async function getAgricultureAdvice(agricultureData) {
    try {
      loading.value = true;
      const response = await aiApi.getAgricultureAdvice(agricultureData);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || '获取农业建议失败');
      }
    } catch (err) {
      console.error('获取农业建议失败:', err);
      error.value = err.message || '获取农业建议失败';
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 获取政策分析
   */
  async function analyzePolicy(policyData) {
    try {
      loading.value = true;
      const response = await aiApi.analyzePolicy(policyData);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || '政策分析失败');
      }
    } catch (err) {
      console.error('政策分析失败:', err);
      error.value = err.message || '政策分析失败';
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 获取财务指导
   */
  async function getFinancialGuidance(financeData) {
    try {
      loading.value = true;
      const response = await aiApi.getFinancialGuidance(financeData);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || '获取财务指导失败');
      }
    } catch (err) {
      console.error('获取财务指导失败:', err);
      error.value = err.message || '获取财务指导失败';
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 清理错误状态
   */
  function clearError() {
    error.value = null;
  }

  /**
   * 重置状态
   */
  function reset() {
    sessions.value = [];
    currentSession.value = null;
    messages.value = [];
    loading.value = false;
    error.value = null;
    streaming.value = false;
    streamingMessage.value = '';
    smartQuestions.value = [];
    disconnectStreaming();
  }

  // 自动加载会话列表
  onMounted(() => {
    if (getUserId()) {
      loadSessions();
    }
  });

  // 组件卸载时清理WebSocket连接
  onUnmounted(() => {
    disconnectStreaming();
  });

  // 监听用户状态
  watch(
    () => userStore.user,
    (user) => {
      if (user) {
        loadSessions();
      } else {
        reset();
      }
    }
  );

  return {
    // 状态
    sessions,
    currentSession,
    messages,
    loading,
    error,
    streaming,
    streamingMessage,
    smartQuestions,
    
    // 计算属性
    hasSessions,
    hasMessages,
    isCurrentSessionActive,
    sessionTypes,
    
    // 方法
    loadSessions,
    createSession,
    switchSession,
    loadMessages,
    sendTextMessage,
    sendVoiceMessage,
    deleteSession,
    connectStreaming,
    disconnectStreaming,
    loadSmartQuestions,
    getAgricultureAdvice,
    analyzePolicy,
    getFinancialGuidance,
    clearError,
    reset,
  };
}

/**
 * 自动连接AI助事的Hook
 * @returns {Object} AI相关的状态和方法
 */
export function useAIAuto() {
  const ai = useAI();

  onMounted(() => {
    if (ai.getUserId()) {
      ai.loadSessions();
    }
  });

  return ai;
}