import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// API基础地址
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
const CHAT_API_BASE = `${API_BASE_URL}/chat`;

/**
 * 获取认证token
 */
function getAuthToken() {
  return localStorage.getItem('auth_token') || '';
}

/**
 * 通用API请求函数
 */
async function apiRequest(url, options = {}) {
  const token = getAuthToken();

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `请求失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API请求失败:', error);
    throw error;
  }
}

export const useChatStore = defineStore('chat', () => {
  // 状态
  const conversations = ref([]);
  const messages = ref({});
  const activeConversationId = ref(null);
  const loading = ref(false);
  const loadingMore = ref(false);
  const sending = ref(false);

  // 当前激活的会话
  const activeConversation = computed(() => {
    return conversations.value.find(c => c._id === activeConversationId.value) || null;
  });

  // 当前会话的消息列表
  const activeMessages = computed(() => {
    return messages.value[activeConversationId.value] || [];
  });

  /**
   * 获取会话列表
   */
  async function fetchConversations() {
    try {
      loading.value = true;
      const response = await apiRequest(`${CHAT_API_BASE}/conversations`);
      
      if (response.success) {
        // 转换会话数据格式以匹配前端需求
        const conversations = (response.data.conversations || []).map(conv => {
          // 获取参与者信息
          const participants = conv.participants || [];
          const currentUserIndex = participants.findIndex(p => p.username === 'admin'); // 假设当前用户
          
          // 计算未读数
          const unreadCount = conv.unreadCount 
            ? conv.unreadCount.get('admin') || 0 
            : 0;

          // 获取对方信息（用于私聊显示）
          const otherUser = conv.type === 'private' 
            ? participants.find(p => p._id.toString() !== '695a5a09aff959537acf60b')
            : null;

          return {
            id: conv._id,
            type: conv.type,
            name: otherUser?.username || conv.groupInfo?.name || '会话',
            avatar: otherUser?.profile?.avatar || conv.groupInfo?.avatar || '👤',
            online: otherUser?.status === 'active', // 假设在线状态
            lastMessage: formatLastMessage(conv),
            lastMessageTime: conv.lastMessageAt,
            unreadCount
          };
        });

        conversations.value = conversations;
      }

      return response;
    } catch (error) {
      console.error('获取会话列表失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 格式化最后消息文本
   */
  function formatLastMessage(conv) {
    if (!conv.lastMessage) {
      return '暂无消息';
    }

    // lastMessage可能是引用ID，需要通过lastMessage的type来判断
    // 这里简化处理，直接返回默认值
    return '最近消息';
  }

  /**
   * 设置当前激活的会话
   */
  async function setActiveConversation(conversationId) {
    try {
      activeConversationId.value = conversationId;

      // 如果已有消息，不再重新获取
      if (messages.value[conversationId] && messages.value[conversationId].length > 0) {
        return;
      }

      // 获取会话消息
      await fetchMessages(conversationId);
    } catch (error) {
      console.error('设置会话失败:', error);
      throw error;
    }
  }

  /**
   * 获取会话消息列表
   */
  async function fetchMessages(conversationId, options = {}) {
    try {
      loadingMore.value = true;

      const params = new URLSearchParams({
        limit: options.limit || '50',
        ...(options.before && { before: options.before }),
        ...(options.after && { after: options.after })
      });

      const response = await apiRequest(`${CHAT_API_BASE}/conversations/${conversationId}/messages?${params}`);

      if (response.success) {
        const newMessages = response.data || [];

        if (!messages.value[conversationId]) {
          messages.value[conversationId] = [];
        }

        if (options.append) {
          // 追加到现有消息列表（加载更多）
          messages.value[conversationId] = [...newMessages, ...messages.value[conversationId]];
        } else {
          // 替换整个消息列表
          messages.value[conversationId] = newMessages;
        }
      }

      return response;
    } catch (error) {
      console.error('获取消息列表失败:', error);
      throw error;
    } finally {
      loadingMore.value = false;
    }
  }

  /**
   * 发送文本消息
   */
  async function sendMessage(conversationId, content) {
    try {
      sending.value = true;

      const response = await apiRequest(`${CHAT_API_BASE}/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          content
        })
      });

      if (response.success) {
        const message = response.data;

        // 添加到消息列表
        if (!messages.value[conversationId]) {
          messages.value[conversationId] = [];
        }
        messages.value[conversationId].push(message);

        // 更新会话的最后消息
        const conversation = conversations.value.find(c => c._id === conversationId);
        if (conversation) {
          conversation.lastMessage = content;
          conversation.lastMessageTime = message.timestamp;
        }
      }

      return response.data;
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    } finally {
      sending.value = false;
    }
  }

  /**
   * 发送图片消息
   */
  async function sendImageMessage(conversationId, imageUrl) {
    try {
      sending.value = true;

      const response = await apiRequest(`${CHAT_API_BASE}/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'image',
          content: imageUrl,
          file: {
            url: imageUrl
          }
        })
      });

      if (response.success) {
        const message = response.data;

        if (!messages.value[conversationId]) {
          messages.value[conversationId] = [];
        }
        messages.value[conversationId].push(message);

        const conversation = conversations.value.find(c => c._id === conversationId);
        if (conversation) {
          conversation.lastMessage = '[图片]';
          conversation.lastMessageTime = message.timestamp;
        }
      }

      return response.data;
    } catch (error) {
      console.error('发送图片消息失败:', error);
      throw error;
    } finally {
      sending.value = false;
    }
  }

  /**
   * 发送语音消息
   */
  async function sendVoiceMessage(conversationId, voiceUrl, duration) {
    try {
      sending.value = true;

      const response = await apiRequest(`${CHAT_API_BASE}/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'voice',
          content: voiceUrl,
          duration
        })
      });

      if (response.success) {
        const message = response.data;

        if (!messages.value[conversationId]) {
          messages.value[conversationId] = [];
        }
        messages.value[conversationId].push(message);

        const conversation = conversations.value.find(c => c._id === conversationId);
        if (conversation) {
          conversation.lastMessage = '[语音]';
          conversation.lastMessageTime = message.timestamp;
        }
      }

      return response.data;
    } catch (error) {
      console.error('发送语音消息失败:', error);
      throw error;
    } finally {
      sending.value = false;
    }
  }

  /**
   * 发送位置消息
   */
  async function sendLocationMessage(conversationId, locationData) {
    try {
      sending.value = true;

      const response = await apiRequest(`${CHAT_API_BASE}/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'location',
          content: JSON.stringify(locationData),
          location: locationData
        })
      });

      if (response.success) {
        const message = response.data;

        if (!messages.value[conversationId]) {
          messages.value[conversationId] = [];
        }
        messages.value[conversationId].push(message);

        const conversation = conversations.value.find(c => c._id === conversationId);
        if (conversation) {
          conversation.lastMessage = '[位置]';
          conversation.lastMessageTime = message.timestamp;
        }
      }

      return response.data;
    } catch (error) {
      console.error('发送位置消息失败:', error);
      throw error;
    } finally {
      sending.value = false;
    }
  }

  /**
   * 标记消息为已读
   */
  async function markAsRead(conversationId) {
    try {
      const response = await apiRequest(`${CHAT_API_BASE}/conversations/${conversationId}/read`, {
        method: 'POST',
        body: JSON.stringify({})
      });

      if (response.success) {
        // 更新会话未读数
        const conversation = conversations.value.find(c => c._id === conversationId);
        if (conversation) {
          conversation.unreadCount = 0;
        }
      }

      return response;
    } catch (error) {
      console.error('标记已读失败:', error);
      throw error;
    }
  }

  /**
   * 创建会话（私聊或群聊）
   */
  async function createConversation(type, participants, groupInfo) {
    try {
      const response = await apiRequest(`${CHAT_API_BASE}/conversations`, {
        method: 'POST',
        body: JSON.stringify({
          type,
          participants,
          groupInfo
        })
      });

      if (response.success) {
        const conversation = response.data;
        conversations.value.unshift(conversation);
      }

      return response.data;
    } catch (error) {
      console.error('创建会话失败:', error);
      throw error;
    }
  }

  /**
   * 撤回消息
   */
  async function recallMessage(conversationId, messageId) {
    try {
      const response = await apiRequest(`${CHAT_API_BASE}/conversations/${conversationId}/messages/${messageId}/recall`, {
        method: 'PUT'
      });

      if (response.success) {
        // 更新消息列表
        if (messages.value[conversationId]) {
          const message = messages.value[conversationId].find(m => m._id === messageId);
          if (message) {
            message.type = 'recall';
            message.content = '消息已撤回';
          }
        }
      }

      return response;
    } catch (error) {
      console.error('撤回消息失败:', error);
      throw error;
    }
  }

  /**
   * 清空聊天记录
   */
  async function clearMessages(conversationId, options = {}) {
    try {
      const response = await apiRequest(`${CHAT_API_BASE}/conversations/${conversationId}/messages`, {
        method: 'DELETE',
        body: JSON.stringify(options)
      });

      if (response.success) {
        // 清空本地消息列表
        messages.value[conversationId] = [];

        // 更新会话
        const conversation = conversations.value.find(c => c._id === conversationId);
        if (conversation) {
          conversation.lastMessage = '';
          conversation.lastMessageTime = null;
          conversation.unreadCount = 0;
        }
      }

      return response;
    } catch (error) {
      console.error('清空聊天记录失败:', error);
      throw error;
    }
  }

  /**
   * 置顶/取消置顶会话
   */
  async function togglePin(conversationId) {
    try {
      const response = await apiRequest(`${CHAT_API_BASE}/conversations/${conversationId}/pin`, {
        method: 'PUT'
      });

      if (response.success) {
        const conversation = conversations.value.find(c => c._id === conversationId);
        if (conversation) {
          conversation.isPinned = response.data.isPinned;
        }
      }

      return response;
    } catch (error) {
      console.error('切换置顶状态失败:', error);
      throw error;
    }
  }

  /**
   * 静音/取消静音会话
   */
  async function toggleMute(conversationId) {
    try {
      const response = await apiRequest(`${CHAT_API_BASE}/conversations/${conversationId}/mute`, {
        method: 'PUT'
      });

      if (response.success) {
        const conversation = conversations.value.find(c => c._id === conversationId);
        if (conversation) {
          conversation.isMuted = response.data.isMuted;
        }
      }

      return response;
    } catch (error) {
      console.error('切换静音状态失败:', error);
      throw error;
    }
  }

  return {
    // 状态
    conversations,
    messages,
    activeConversationId,
    loading,
    loadingMore,
    sending,

    // 计算属性
    activeConversation,
    activeMessages,

    // 方法
    fetchConversations,
    setActiveConversation,
    fetchMessages,
    sendMessage,
    sendImageMessage,
    sendVoiceMessage,
    sendLocationMessage,
    markAsRead,
    createConversation,
    recallMessage,
    clearMessages,
    togglePin,
    toggleMute
  };
});
