/**
 * WebSocket 聊天集成 Composable
 * 提供聊天功能的 WebSocket 连接和消息处理
 */
import { ref, onMounted, onUnmounted } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useUserStore } from '@/stores/user';

// WebSocket URL (使用环境变量或默认值)
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

let socket = null;
let reconnectTimer = null;
let heartbeatTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

/**
 * WebSocket 聊天 Hook
 * @returns {Object} WebSocket 相关的状态和方法
 */
export function useWebSocketChat() {
  const chatStore = useChatStore();
  const userStore = useUserStore();

  const connected = ref(false);
  const connecting = ref(false);
  const error = ref(null);

  /**
   * 获取当前用户 Token
   */
  function getToken() {
    return localStorage.getItem('token') || '';
  }

  /**
   * 连接 WebSocket
   */
  function connect() {
    if (socket?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] 已经连接');
      return;
    }

    if (connecting.value) {
      console.log('[WebSocket] 正在连接中...');
      return;
    }

    connecting.value = true;
    error.value = null;

    try {
      const token = getToken();
      const wsUrl = `${WS_URL}?token=${encodeURIComponent(token)}`;

      console.log('[WebSocket] 正在连接:', wsUrl);
      socket = new WebSocket(wsUrl);

      // 连接成功
      socket.addEventListener('open', handleOpen);

      // 收到消息
      socket.addEventListener('message', handleMessage);

      // 连接关闭
      socket.addEventListener('close', handleClose);

      // 连接错误
      socket.addEventListener('error', handleError);
    } catch (err) {
      console.error('[WebSocket] 连接失败:', err);
      error.value = err.message;
      connecting.value = false;
      attemptReconnect();
    }
  }

  /**
   * 断开 WebSocket
   */
  function disconnect() {
    console.log('[WebSocket] 主动断开连接');

    // 清除重连定时器
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    // 清除心跳定时器
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (socket) {
      socket.close();
      socket = null;
    }

    connected.value = false;
    connecting.value = false;
    reconnectAttempts = 0;
  }

  /**
   * 发送消息
   */
  function send(event, data = {}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] 未连接，无法发送消息:', event);
      return false;
    }

    try {
      const message = JSON.stringify({ event, data });
      socket.send(message);
      console.log('[WebSocket] 发送消息:', event, data);
      return true;
    } catch (err) {
      console.error('[WebSocket] 发送消息失败:', err);
      return false;
    }
  }

  /**
   * 处理连接打开事件
   */
  function handleOpen() {
    console.log('[WebSocket] 连接已建立');
    connected.value = true;
    connecting.value = false;
    reconnectAttempts = 0;
    error.value = null;

    // 更新 store 状态
    chatStore.setWsConnected(true);

    // 启动心跳
    startHeartbeat();

    // 认证
    const user = userStore.user;
    if (user) {
      send('authenticate', { userId: user.id || user._id });
    }
  }

  /**
   * 处理收到消息事件
   */
  function handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('[WebSocket] 收到消息:', data);

      const { event: eventType, data: eventData } = data;

      // 根据事件类型分发处理
      switch (eventType) {
      // 新消息
      case 'new_message':
        chatStore.handleNewMessage(eventData);
        break;

        // 消息已读
      case 'message_read':
        chatStore.handleMessageRead(eventData);
        break;

        // 消息撤回
      case 'message_recalled':
        chatStore.handleMessageRecalled(eventData);
        break;

        // 好友请求
      case 'friend_request':
        chatStore.handleFriendRequest(eventData);
        break;

        // 好友请求被接受
      case 'friend_request_accepted':
        chatStore.handleFriendRequestAccepted(eventData);
        break;

        // 添加新好友
      case 'new_friend_added':
        chatStore.handleNewFriendAdded(eventData);
        break;

        // 正在输入
      case 'typing_status':
        // 可以在组件中监听这个状态
        break;

        // 会话更新
      case 'conversation_updated':
        // 刷新会话列表
        chatStore.loadConversations();
        break;

        // 认证成功
      case 'authenticated':
        console.log('[WebSocket] 认证成功:', eventData);
        break;

        // 错误
      case 'error':
        console.error('[WebSocket] 服务器错误:', eventData.message);
        break;

      default:
        console.log('[WebSocket] 未知事件类型:', eventType);
      }
    } catch (err) {
      console.error('[WebSocket] 解析消息失败:', err);
    }
  }

  /**
   * 处理连接关闭事件
   */
  function handleClose(event) {
    console.log('[WebSocket] 连接已关闭:', event.code, event.reason);
    connected.value = false;
    connecting.value = false;
    chatStore.setWsConnected(false);

    // 清除心跳
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    // 如果不是主动关闭，尝试重连
    if (event.code !== 1000) {
      attemptReconnect();
    }
  }

  /**
   * 处理连接错误事件
   */
  function handleError(err) {
    console.error('[WebSocket] 连接错误:', err);
    error.value = 'WebSocket 连接错误';
    connecting.value = false;
  }

  /**
   * 尝试重连
   */
  function attemptReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[WebSocket] 达到最大重连次数，停止重连');
      error.value = '连接失败，请刷新页面重试';
      return;
    }

    reconnectAttempts++;
    console.log(`[WebSocket] ${RECONNECT_DELAY / 1000}秒后进行第 ${reconnectAttempts} 次重连...`);

    reconnectTimer = setTimeout(() => {
      console.log(`[WebSocket] 开始第 ${reconnectAttempts} 次重连`);
      connect();
    }, RECONNECT_DELAY);
  }

  /**
   * 启动心跳
   */
  function startHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }

    heartbeatTimer = setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        send('ping', { timestamp: Date.now() });
      }
    }, 30000); // 每30秒发送一次心跳
  }

  /**
   * 加入会话房间
   */
  function joinConversation(conversationId) {
    send('join-conversation', conversationId);
  }

  /**
   * 离开会话房间
   */
  function leaveConversation(conversationId) {
    send('leave-conversation', conversationId);
  }

  /**
   * 发送正在输入状态
   */
  function sendTypingStatus(conversationId, isTyping) {
    send('typing-status', { conversationId, isTyping });
  }

  /**
   * 发送已读回执
   */
  function sendReadReceipt(conversationId, messageIds) {
    send('messages-read', { conversationId, messageIds });
  }

  // ========== 聊天相关方法 ==========

  /**
   * 发送聊天消息
   */
  function sendChatMessage(conversationId, messageData) {
    return send('chat_message', {
      conversationId,
      ...messageData
    });
  }

  /**
   * 发送好友请求
   */
  function sendFriendRequest(toUserId, message) {
    return send('friend_request', { toUserId, message });
  }

  /**
   * 接受好友请求
   */
  function acceptFriendRequest(requestId, responseMessage) {
    return send('accept_friend_request', { requestId, responseMessage });
  }

  /**
   * 拒绝好友请求
   */
  function declineFriendRequest(requestId, responseMessage) {
    return send('decline_friend_request', { requestId, responseMessage });
  }

  return {
    // 状态
    connected,
    connecting,
    error,

    // 连接管理
    connect,
    disconnect,
    send,

    // 会话房间
    joinConversation,
    leaveConversation,

    // 聊天相关
    sendChatMessage,
    sendTypingStatus,
    sendReadReceipt,

    // 好友相关
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest
  };
}

/**
 * 在组件中自动连接 WebSocket 的 Hook
 * @returns {Object} WebSocket 相关的状态和方法
 */
export function useWebSocketChatAuto() {
  const ws = useWebSocketChat();

  onMounted(() => {
    ws.connect();
  });

  onUnmounted(() => {
    ws.disconnect();
  });

  return ws;
}
