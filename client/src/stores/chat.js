/**
 * 聊天状态管理 Store
 * 管理会话列表、消息、未读数等聊天相关状态
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { chatApi, friendApi } from '@/api'
import { ElMessage } from 'element-plus'

export const useChatStore = defineStore('chat', () => {
  // ==================== 状态 ====================
  // 会话列表
  const conversations = ref([])

  // 当前选中的会话ID
  const currentConversationId = ref(null)

  // 消息缓存 (conversationId -> messages[])
  const messagesCache = ref(new Map())

  // 总未读数
  const totalUnreadCount = ref(0)

  // 好友列表
  const friends = ref([])

  // 待处理的好友请求
  const pendingRequests = ref([])

  // 已发送的好友请求
  const sentRequests = ref([])

  // 正在加载标记
  const loading = ref(false)

  // WebSocket 连接状态
  const wsConnected = ref(false)

  // ==================== 计算属性 ====================
  // 当前会话
  const currentConversation = computed(() => {
    return conversations.value.find(c => c._id === currentConversationId.value)
  })

  // 当前会话的消息
  const currentMessages = computed(() => {
    if (!currentConversationId.value) return []
    return messagesCache.value.get(currentConversationId.value) || []
  })

  // 按最后消息时间排序的会话列表
  const sortedConversations = computed(() => {
    return [...conversations.value].sort((a, b) => {
      // 置顶会话优先
      const aPinned = a.pinnedBy?.some(p => p.user === getCurrentUserId())
      const bPinned = b.pinnedBy?.some(p => p.user === getCurrentUserId())
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1

      // 按最后消息时间排序
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
      return bTime - aTime
    })
  })

  // ==================== 辅助函数 ====================
  // 获取当前用户ID (从 localStorage 获取)
  function getCurrentUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      return user.id || user._id
    } catch {
      return null
    }
  }

  // ==================== 会话相关方法 ====================
  // 加载会话列表
  async function loadConversations() {
    loading.value = true
    try {
      const { data } = await chatApi.getConversations()
      if (data.success) {
        conversations.value = data.data || []
        calculateTotalUnread()
      }
    } catch (error) {
      console.error('加载会话列表失败:', error)
      ElMessage.error('加载会话列表失败')
    } finally {
      loading.value = false
    }
  }

  // 选择会话
  async function selectConversation(conversationId) {
    currentConversationId.value = conversationId

    // 如果该会话的消息未加载，则加载
    if (!messagesCache.value.has(conversationId)) {
      await loadMessages(conversationId)
    }

    // 标记已读
    await markAsRead(conversationId)
  }

  // 创建会话
  async function createConversation(data) {
    try {
      const { res } = await chatApi.createConversation(data)
      if (res.data.success) {
        const newConversation = res.data.data
        conversations.value.push(newConversation)
        return newConversation
      }
    } catch (error) {
      console.error('创建会话失败:', error)
      ElMessage.error('创建会话失败')
      throw error
    }
  }

  // ==================== 消息相关方法 ====================
  // 加载消息
  async function loadMessages(conversationId, options = {}) {
    loading.value = true
    try {
      const { data } = await chatApi.getMessages(conversationId, options)
      if (data.success) {
        const messages = data.data || []
        messagesCache.value.set(conversationId, messages)
        return messages
      }
    } catch (error) {
      console.error('加载消息失败:', error)
      ElMessage.error('加载消息失败')
    } finally {
      loading.value = false
    }
  }

  // 发送消息
  async function sendMessage(messageData) {
    try {
      const { conversationId, type, content, replyTo, mentions, mentionAll } = messageData

      const { data } = await chatApi.sendMessage(conversationId, {
        type: type || 'text',
        content: content || {},
        replyTo,
        mentions: mentions || [],
        mentionAll: mentionAll || false
      })

      if (data.success) {
        const message = data.data

        // 添加到消息缓存
        const messages = messagesCache.value.get(conversationId) || []
        messages.push(message)
        messagesCache.value.set(conversationId, messages)

        // 更新会话的最后消息
        const conversation = conversations.value.find(c => c._id === conversationId)
        if (conversation) {
          conversation.lastMessage = message._id
          conversation.lastMessageAt = message.createdAt
        }

        return message
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      ElMessage.error('发送消息失败')
      throw error
    }
  }

  // 撤回消息
  async function recallMessage(conversationId, messageId) {
    try {
      const { data } = await chatApi.recallMessage(conversationId, messageId)
      if (data.success) {
        // 更新消息缓存
        const messages = messagesCache.value.get(conversationId) || []
        const index = messages.findIndex(m => m._id === messageId)
        if (index !== -1) {
          messages[index] = data.data
          messagesCache.value.set(conversationId, messages)
        }
        return true
      }
    } catch (error) {
      console.error('撤回消息失败:', error)
      ElMessage.error(error.response?.data?.message || '撤回消息失败')
      throw error
    }
  }

  // 标记已读
  async function markAsRead(conversationId) {
    try {
      const messages = messagesCache.value.get(conversationId) || []
      const unreadMessageIds = messages
        .filter(m => m.sender?._id !== getCurrentUserId() && !m.readBy?.some(r => r.user === getCurrentUserId()))
        .map(m => m._id)

      if (unreadMessageIds.length === 0) return

      await chatApi.markAsRead(conversationId, { messageIds: unreadMessageIds })

      // 更新本地状态
      const conversation = conversations.value.find(c => c._id === conversationId)
      if (conversation) {
        const userId = getCurrentUserId()
        const currentCount = conversation.unreadCount?.get(userId) || 0
        conversation.unreadCount.set(userId, 0)
        totalUnreadCount.value = Math.max(0, totalUnreadCount.value - currentCount)
      }

      // 更新消息的已读状态
      unreadMessageIds.forEach(id => {
        const msg = messages.find(m => m._id === id)
        if (msg && !msg.readBy) {
          msg.readBy = []
        }
        if (msg) {
          msg.readBy.push({ user: getCurrentUserId(), readAt: new Date() })
        }
      })
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  // 获取未读数
  async function getUnreadCount() {
    try {
      const { data } = await chatApi.getUnreadCount()
      if (data.success) {
        totalUnreadCount.value = data.data.count || 0
      }
    } catch (error) {
      console.error('获取未读数失败:', error)
    }
  }

  // ==================== 会话操作方法 ====================
  // 置顶/取消置顶
  async function togglePin(conversationId) {
    try {
      const { data } = await chatApi.togglePin(conversationId)
      if (data.success) {
        const conversation = conversations.value.find(c => c._id === conversationId)
        if (conversation) {
          conversation.pinnedBy = data.data.pinnedBy || []
        }
      }
    } catch (error) {
      console.error('置顶操作失败:', error)
      ElMessage.error('置顶操作失败')
      throw error
    }
  }

  // 静音/取消静音
  async function toggleMute(conversationId) {
    try {
      const { data } = await chatApi.toggleMute(conversationId)
      if (data.success) {
        const conversation = conversations.value.find(c => c._id === conversationId)
        if (conversation) {
          conversation.mutedBy = data.data.mutedBy || []
        }
      }
    } catch (error) {
      console.error('静音操作失败:', error)
      ElMessage.error('静音操作失败')
      throw error
    }
  }

  // ==================== 好友相关方法 ====================
  // 通过手机号搜索用户
  async function searchUserByPhone(phone) {
    try {
      const { data } = await friendApi.searchByPhone(phone)
      if (data.success) {
        return data.data
      }
    } catch (error) {
      console.error('搜索用户失败:', error)
      ElMessage.error(error.response?.data?.message || '搜索用户失败')
      throw error
    }
  }

  // 通过乡村号搜索用户
  async function searchUserByQRCode(qrcode) {
    try {
      const { data } = await friendApi.searchByQRCode(qrcode)
      if (data.success) {
        return data.data
      }
    } catch (error) {
      console.error('搜索用户失败:', error)
      ElMessage.error(error.response?.data?.message || '搜索用户失败')
      throw error
    }
  }

  // 发送好友请求
  async function sendFriendRequest(requestData) {
    try {
      const { data } = await friendApi.sendFriendRequest(requestData)
      if (data.success) {
        ElMessage.success('好友请求已发送')
        return data.data
      }
    } catch (error) {
      console.error('发送好友请求失败:', error)
      ElMessage.error(error.response?.data?.message || '发送好友请求失败')
      throw error
    }
  }

  // 获取待处理的好友请求
  async function loadPendingRequests() {
    try {
      const { data } = await friendApi.getPendingRequests()
      if (data.success) {
        pendingRequests.value = data.data || []
      }
    } catch (error) {
      console.error('加载好友请求失败:', error)
    }
  }

  // 获取已发送的好友请求
  async function loadSentRequests() {
    try {
      const { data } = await friendApi.getSentRequests()
      if (data.success) {
        sentRequests.value = data.data || []
      }
    } catch (error) {
      console.error('加载好友请求失败:', error)
    }
  }

  // 接受好友请求
  async function acceptFriendRequest(requestId, responseMessage) {
    try {
      const { data } = await friendApi.acceptFriendRequest(requestId, { responseMessage })
      if (data.success) {
        // 从待处理列表中移除
        pendingRequests.value = pendingRequests.value.filter(r => r._id !== requestId)
        // 重新加载好友列表
        await loadFriends()
        ElMessage.success('已添加好友')
        return data.data
      }
    } catch (error) {
      console.error('接受好友请求失败:', error)
      ElMessage.error(error.response?.data?.message || '接受好友请求失败')
      throw error
    }
  }

  // 拒绝好友请求
  async function declineFriendRequest(requestId, responseMessage) {
    try {
      const { data } = await friendApi.declineFriendRequest(requestId, { responseMessage })
      if (data.success) {
        // 从待处理列表中移除
        pendingRequests.value = pendingRequests.value.filter(r => r._id !== requestId)
        ElMessage.success('已拒绝好友请求')
        return true
      }
    } catch (error) {
      console.error('拒绝好友请求失败:', error)
      ElMessage.error(error.response?.data?.message || '拒绝好友请求失败')
      throw error
    }
  }

  // 获取好友列表
  async function loadFriends() {
    try {
      const { data } = await friendApi.getFriends()
      if (data.success) {
        friends.value = data.data || []
      }
    } catch (error) {
      console.error('加载好友列表失败:', error)
      ElMessage.error('加载好友列表失败')
    }
  }

  // 更新好友备注
  async function updateFriendAlias(friendId, alias) {
    try {
      const { data } = await friendApi.updateFriendAlias(friendId, { alias })
      if (data.success) {
        // 更新本地好友列表
        const friend = friends.value.find(f => f._id === friendId)
        if (friend) {
          friend.alias = alias
        }
        ElMessage.success('备注已更新')
        return true
      }
    } catch (error) {
      console.error('更新备注失败:', error)
      ElMessage.error('更新备注失败')
      throw error
    }
  }

  // 删除好友
  async function deleteFriend(friendId) {
    try {
      const { data } = await friendApi.deleteFriend(friendId)
      if (data.success) {
        // 从好友列表中移除
        friends.value = friends.value.filter(f => f._id !== friendId)
        ElMessage.success('已删除好友')
        return true
      }
    } catch (error) {
      console.error('删除好友失败:', error)
      ElMessage.error('删除好友失败')
      throw error
    }
  }

  // ==================== WebSocket 事件处理 ====================
  // 处理新消息
  function handleNewMessage(data) {
    const { message, conversation } = data

    // 添加到消息缓存
    const messages = messagesCache.value.get(conversation._id) || []
    messages.push(message)
    messagesCache.value.set(conversation._id, messages)

    // 更新会话列表
    const convIndex = conversations.value.findIndex(c => c._id === conversation._id)
    if (convIndex !== -1) {
      conversations.value[convIndex] = conversation
    } else {
      conversations.value.push(conversation)
    }

    // 如果不是当前会话，增加未读数
    if (currentConversationId.value !== conversation._id) {
      totalUnreadCount.value++
    }
  }

  // 处理消息已读回执
  function handleMessageRead(data) {
    const { conversationId, messageIds, userId } = data

    const messages = messagesCache.value.get(conversationId) || []
    messageIds.forEach(id => {
      const msg = messages.find(m => m._id === id)
      if (msg) {
        if (!msg.readBy) msg.readBy = []
        msg.readBy.push({ user: userId, readAt: new Date() })
      }
    })
  }

  // 处理消息撤回
  function handleMessageRecalled(data) {
    const { conversationId, messageId, recalledMessage } = data

    const messages = messagesCache.value.get(conversationId) || []
    const index = messages.findIndex(m => m._id === messageId)
    if (index !== -1) {
      messages[index] = recalledMessage
      messagesCache.value.set(conversationId, messages)
    }
  }

  // 处理好友请求通知
  function handleFriendRequest(data) {
    pendingRequests.value.push(data)
    ElMessage.info('收到新的好友请求')
  }

  // 处理好友请求被接受
  function handleFriendRequestAccepted(data) {
    ElMessage.success('对方通过了你的好友请求')
    loadFriends()
  }

  // 处理新好友添加
  function handleNewFriendAdded(data) {
    friends.value.push(data)
    ElMessage.success('添加了新好友')
  }

  // ==================== 工具方法 ====================
  // 计算总未读数
  function calculateTotalUnread() {
    const userId = getCurrentUserId()
    let total = 0
    conversations.value.forEach(conv => {
      total += conv.getUnreadCount?.(userId) || 0
    })
    totalUnreadCount.value = total
  }

  // 清空消息缓存
  function clearMessagesCache() {
    messagesCache.value.clear()
  }

  // 重置状态
  function reset() {
    conversations.value = []
    currentConversationId.value = null
    messagesCache.value.clear()
    totalUnreadCount.value = 0
    friends.value = []
    pendingRequests.value = []
    sentRequests.value = []
  }

  // 设置 WebSocket 连接状态
  function setWsConnected(connected) {
    wsConnected.value = connected
  }

  return {
    // 状态
    conversations,
    currentConversationId,
    messagesCache,
    totalUnreadCount,
    friends,
    pendingRequests,
    sentRequests,
    loading,
    wsConnected,

    // 计算属性
    currentConversation,
    currentMessages,
    sortedConversations,

    // 会话方法
    loadConversations,
    selectConversation,
    createConversation,

    // 消息方法
    loadMessages,
    sendMessage,
    recallMessage,
    markAsRead,
    getUnreadCount,

    // 会话操作
    togglePin,
    toggleMute,

    // 好友方法
    searchUserByPhone,
    searchUserByQRCode,
    sendFriendRequest,
    loadPendingRequests,
    loadSentRequests,
    acceptFriendRequest,
    declineFriendRequest,
    loadFriends,
    updateFriendAlias,
    deleteFriend,

    // WebSocket 事件处理
    handleNewMessage,
    handleMessageRead,
    handleMessageRecalled,
    handleFriendRequest,
    handleFriendRequestAccepted,
    handleNewFriendAdded,

    // 工具方法
    clearMessagesCache,
    reset,
    setWsConnected
  }
})
