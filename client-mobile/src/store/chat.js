import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 聊天Store
 * 管理聊天会话、消息、群组、好友等
 */
export const useChatStore = defineStore('chat', () => {
  // ===== 状态 =====

  // 当前选中的会话ID
  const activeConversationId = ref(null)

  // 会话列表
  const conversations = ref([])

  // 消息列表 (按会话ID分组)
  const messages = ref({})

  // 当前正在输入的文本
  const inputText = ref('')

  // 是否正在加载更多消息
  const loadingMore = ref(false)

  // 是否正在发送消息
  const sending = ref(false)

  // 联系人列表（所有联系人）
  const contacts = ref([])

  // 好友列表
  const friends = ref([])

  // 群组列表
  const groups = ref([])

  // 好友申请列表（收到的）
  const receivedRequests = ref([])

  // 好友申请列表（发出的）
  const sentRequests = ref([])

  // ===== 计算属性 =====

  // 当前会话
  const activeConversation = computed(() => {
    return conversations.value.find(c => c.id === activeConversationId.value) || null
  })

  // 当前会话的消息列表
  const activeMessages = computed(() => {
    return messages.value[activeConversationId.value] || []
  })

  // 未读消息总数
  const unreadCount = computed(() => {
    return conversations.value.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  })

  // 未处理的好友申请数量
  const pendingRequestsCount = computed(() => {
    return receivedRequests.value.filter(r => r.status === 'pending').length
  })

  // ===== 方法 =====

  /**
   * 获取会话列表
   */
  const fetchConversations = async () => {
    try {
      // 模拟数据
      const mockConversations = [
        {
          id: 'conv_001',
          type: 'private',
          name: '村支书',
          avatar: '👨‍💼',
          lastMessage: '好的，明天开会讨论',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 2,
          online: true
        },
        {
          id: 'conv_002',
          type: 'group',
          name: '东村村民群',
          avatar: '👥',
          lastMessage: '李大姐: 今年的水稻长势不错',
          lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
          unreadCount: 5,
          memberCount: 45
        },
        {
          id: 'conv_003',
          type: 'private',
          name: '王会计',
          avatar: '👩‍💼',
          lastMessage: '财务报表已经发给你了',
          lastMessageTime: new Date(Date.now() - 86400000).toISOString(),
          unreadCount: 0,
          online: false
        },
        {
          id: 'conv_004',
          type: 'group',
          name: '村务工作群',
          avatar: '📋',
          lastMessage: '张主任: 请大家按时提交周报',
          lastMessageTime: new Date(Date.now() - 172800000).toISOString(),
          unreadCount: 0,
          memberCount: 12
        }
      ]

      conversations.value = mockConversations
      console.log('会话列表加载成功')
      return mockConversations
    } catch (error) {
      console.error('获取会话列表失败:', error)
      return []
    }
  }

  /**
   * 获取会话消息
   */
  const fetchMessages = async (conversationId, loadMore = false) => {
    if (!loadMore && messages.value[conversationId]?.length > 0) {
      return messages.value[conversationId]
    }

    if (loadingMore.value) return

    loadingMore.value = true

    try {
      // 模拟消息数据
      const mockMessages = [
        {
          id: 'msg_001',
          conversationId,
          senderId: 'user_001',
          senderName: '张大山',
          senderAvatar: '👤',
          content: '你好，请问明天的会议几点开始？',
          type: 'text',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          isSelf: true,
          read: true
        },
        {
          id: 'msg_002',
          conversationId,
          senderId: 'user_002',
          senderName: '村支书',
          senderAvatar: '👨‍💼',
          content: '明天下午2点在村委会会议室',
          type: 'text',
          timestamp: new Date(Date.now() - 3000000).toISOString(),
          isSelf: false,
          read: true
        },
        {
          id: 'msg_003',
          conversationId,
          senderId: 'user_002',
          senderName: '村支书',
          senderAvatar: '👨‍💼',
          content: '好的，明天开会讨论',
          type: 'text',
          timestamp: new Date().toISOString(),
          isSelf: false,
          read: false
        }
      ]

      // 如果是加载更多，添加到现有消息前面
      if (loadMore && messages.value[conversationId]) {
        messages.value[conversationId] = [...mockMessages, ...messages.value[conversationId]]
      } else {
        messages.value[conversationId] = mockMessages
      }

      console.log('消息加载成功:', conversationId)
      return mockMessages
    } catch (error) {
      console.error('获取消息失败:', error)
      return []
    } finally {
      loadingMore.value = false
    }
  }

  /**
   * 发送消息
   */
  const sendMessage = async (conversationId, content, type = 'text') => {
    if (!content?.trim()) {
      return null
    }

    sending.value = true

    try {
      // 创建新消息
      const newMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        senderId: 'current_user',
        senderName: '张大山',
        senderAvatar: '👤',
        content,
        type,
        timestamp: new Date().toISOString(),
        isSelf: true,
        read: false,
        status: 'sending'
      }

      // 添加到消息列表
      if (!messages.value[conversationId]) {
        messages.value[conversationId] = []
      }
      messages.value[conversationId].push(newMessage)

      // 更新会话的最后消息
      const conversation = conversations.value.find(c => c.id === conversationId)
      if (conversation) {
        conversation.lastMessage = content
        conversation.lastMessageTime = newMessage.timestamp
        // 移到顶部
        conversations.value = [
          conversation,
          ...conversations.value.filter(c => c.id !== conversationId)
        ]
      }

      // 模拟网络请求
      await new Promise(resolve => setTimeout(resolve, 500))

      // 更新消息状态为已发送
      newMessage.status = 'sent'

      console.log('消息发送成功:', newMessage)
      return newMessage
    } catch (error) {
      console.error('发送消息失败:', error)
      return null
    } finally {
      sending.value = false
    }
  }

  /**
   * 设置当前会话
   */
  const setActiveConversation = async (conversationId) => {
    activeConversationId.value = conversationId

    if (conversationId) {
      // 清除未读数
      const conversation = conversations.value.find(c => c.id === conversationId)
      if (conversation) {
        conversation.unreadCount = 0
      }

      // 加载消息
      await fetchMessages(conversationId)
    }
  }

  /**
   * 创建新会话
   */
  const createConversation = async (type, targetUser = null) => {
    try {
      const newConversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        name: targetUser?.name || '新对话',
        avatar: targetUser?.avatar || '👤',
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        online: targetUser?.online || false
      }

      conversations.value.unshift(newConversation)
      await setActiveConversation(newConversation.id)

      console.log('会话创建成功:', newConversation)
      return newConversation
    } catch (error) {
      console.error('创建会话失败:', error)
      return null
    }
  }

  /**
   * 获取联系人列表
   */
  const fetchContacts = async () => {
    try {
      const mockContacts = [
        { id: 'user_002', name: '村支书', avatar: '👨‍💼', role: '支部书记', phone: '138****1234', online: true },
        { id: 'user_003', name: '王会计', avatar: '👩‍💼', role: '会计', phone: '138****5678', online: false },
        { id: 'user_004', name: '李大姐', avatar: '👩', role: '村民', phone: '138****9012', online: true },
        { id: 'user_005', name: '张主任', avatar: '👨', role: '主任', phone: '138****3456', online: false },
        { id: 'user_006', name: '刘秘书', avatar: '👩‍💼', role: '秘书', phone: '138****7890', online: true }
      ]

      contacts.value = mockContacts
      return mockContacts
    } catch (error) {
      console.error('获取联系人失败:', error)
      return []
    }
  }

  /**
   * 获取群组列表
   */
  const fetchGroups = async () => {
    try {
      const mockGroups = [
        {
          id: 'group_001',
          name: '东村村民群',
          avatar: '👥',
          description: '东村全体村民交流群',
          memberCount: 45,
          ownerId: 'user_002',
          isAdmin: false,
          createdAt: new Date('2024-01-01').toISOString()
        },
        {
          id: 'group_002',
          name: '村务工作群',
          avatar: '📋',
          description: '村务工作交流群',
          memberCount: 12,
          ownerId: 'user_005',
          isAdmin: false,
          createdAt: new Date('2024-01-15').toISOString()
        },
        {
          id: 'group_003',
          name: '农业技术交流群',
          avatar: '🌾',
          description: '农业种植技术交流',
          memberCount: 28,
          ownerId: 'user_003',
          isAdmin: true,
          createdAt: new Date('2024-02-01').toISOString()
        }
      ]

      groups.value = mockGroups
      return mockGroups
    } catch (error) {
      console.error('获取群组失败:', error)
      return []
    }
  }

  /**
   * 发送图片消息
   */
  const sendImageMessage = async (conversationId, imageUrl) => {
    return sendMessage(conversationId, imageUrl, 'image')
  }

  /**
   * 发送语音消息
   */
  const sendVoiceMessage = async (conversationId, voiceUrl, duration) => {
    const message = await sendMessage(conversationId, voiceUrl, 'voice')
    if (message) {
      message.duration = duration
    }
    return message
  }

  /**
   * 标记消息为已读
   */
  const markAsRead = async (conversationId) => {
    const conversation = conversations.value.find(c => c.id === conversationId)
    if (conversation) {
      conversation.unreadCount = 0
    }

    const msgs = messages.value[conversationId]
    if (msgs) {
      msgs.forEach(msg => {
        if (!msg.isSelf) {
          msg.read = true
        }
      })
    }

    console.log('消息已标记为已读:', conversationId)
  }

  /**
   * 撤回消息
   */
  const recallMessage = async (conversationId, messageId) => {
    try {
      const message = messages.value[conversationId]?.find(m => m.id === messageId)
      if (message) {
        message.recalled = true
        message.content = '消息已撤回'
        message.type = 'recall'
      }

      console.log('消息已撤回:', messageId)
      return true
    } catch (error) {
      console.error('撤回消息失败:', error)
      return false
    }
  }

  /**
   * 删除会话
   */
  const deleteConversation = async (conversationId) => {
    try {
      conversations.value = conversations.value.filter(c => c.id !== conversationId)
      delete messages.value[conversationId]

      if (activeConversationId.value === conversationId) {
        activeConversationId.value = null
      }

      console.log('会话已删除:', conversationId)
      return true
    } catch (error) {
      console.error('删除会话失败:', error)
      return false
    }
  }

  /**
   * 清空输入框
   */
  const clearInput = () => {
    inputText.value = ''
  }

  // ===== 好友管理方法 =====

  /**
   * 获取好友列表
   */
  const fetchFriends = async () => {
    try {
      const mockFriends = [
        {
          id: 'friend_001',
          userId: 'user_002',
          name: '村支书',
          avatar: '👨‍💼',
          phone: '138****1234',
          villageName: '东村',
          role: 'cadre',
          remark: '村支书',
          online: true,
          tags: ['工作', '村干部']
        },
        {
          id: 'friend_002',
          userId: 'user_003',
          name: '王会计',
          avatar: '👩‍💼',
          phone: '138****5678',
          villageName: '东村',
          role: 'villager',
          remark: '王姐',
          online: false,
          tags: ['工作']
        },
        {
          id: 'friend_003',
          userId: 'user_004',
          name: '李大姐',
          avatar: '👩',
          phone: '138****9012',
          villageName: '东村',
          role: 'villager',
          remark: '邻居',
          online: true,
          tags: ['邻居']
        }
      ]

      friends.value = mockFriends
      return mockFriends
    } catch (error) {
      console.error('获取好友列表失败:', error)
      return []
    }
  }

  /**
   * 搜索用户（通过手机号/乡村号/姓名）
   */
  const searchUser = async (keyword, type = 'phone') => {
    try {
      // 模拟搜索用户
      const mockUsers = [
        {
          id: 'user_search_001',
          phone: '13800138000',
          villageId: 'DZ2024001',
          name: '李小红',
          avatar: '👩',
          villageName: '东村',
          role: 'villager',
          verified: true,
          status: 'stranger'
        }
      ]

      let foundUser = null
      if (type === 'phone') {
        foundUser = mockUsers.find(u => u.phone === keyword)
      } else if (type === 'villageId') {
        foundUser = mockUsers.find(u => u.villageId.toLowerCase() === keyword.toLowerCase())
      } else if (type === 'name') {
        foundUser = mockUsers.find(u => u.name.includes(keyword))
      }

      return foundUser || null
    } catch (error) {
      console.error('搜索用户失败:', error)
      return null
    }
  }

  /**
   * 发送好友请求
   */
  const sendFriendRequest = async (userId, message, remark) => {
    try {
      const request = {
        id: `req_${Date.now()}`,
        userId,
        message,
        remark,
        timestamp: new Date().toISOString(),
        status: 'pending'
      }

      sentRequests.value.push(request)

      console.log('好友请求已发送:', request)
      return { success: true, request }
    } catch (error) {
      console.error('发送好友请求失败:', error)
      return { success: false, error }
    }
  }

  /**
   * 获取收到的好友请求列表
   */
  const fetchReceivedRequests = async () => {
    try {
      const mockRequests = [
        {
          id: 'req_001',
          userId: 'user_001',
          name: '李小红',
          avatar: '👩',
          phone: '138****1234',
          villageName: '东村',
          message: '你好，我是东村的李小红',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          status: 'pending'
        }
      ]

      receivedRequests.value = mockRequests
      return mockRequests
    } catch (error) {
      console.error('获取好友请求失败:', error)
      return []
    }
  }

  /**
   * 处理好友请求（接受/拒绝）
   */
  const handleFriendRequest = async (requestId, action) => {
    try {
      const request = receivedRequests.value.find(r => r.id === requestId)
      if (request) {
        request.status = action === 'accept' ? 'accepted' : 'rejected'

        // 如果接受，添加到好友列表
        if (action === 'accept') {
          const newFriend = {
            id: `friend_${request.userId}`,
            userId: request.userId,
            name: request.name,
            avatar: request.avatar,
            phone: request.phone,
            villageName: request.villageName,
            role: 'villager',
            remark: '',
            online: false,
            tags: []
          }
          friends.value.push(newFriend)
        }

        console.log(`好友请求已${action === 'accept' ? '接受' : '拒绝'}:`, requestId)
        return { success: true }
      }

      return { success: false, error: '请求不存在' }
    } catch (error) {
      console.error('处理好友请求失败:', error)
      return { success: false, error }
    }
  }

  /**
   * 删除好友
   */
  const deleteFriend = async (friendId) => {
    try {
      friends.value = friends.value.filter(f => f.id !== friendId)
      console.log('好友已删除:', friendId)
      return { success: true }
    } catch (error) {
      console.error('删除好友失败:', error)
      return { success: false, error }
    }
  }

  /**
   * 修改好友备注
   */
  const updateFriendRemark = async (friendId, remark) => {
    try {
      const friend = friends.value.find(f => f.id === friendId)
      if (friend) {
        friend.remark = remark
        console.log('好友备注已更新:', friendId, remark)
        return { success: true }
      }
      return { success: false, error: '好友不存在' }
    } catch (error) {
      console.error('修改备注失败:', error)
      return { success: false, error }
    }
  }

  /**
   * 匹配通讯录好友
   */
  const matchPhoneContacts = async (phoneContacts) => {
    try {
      // 模拟匹配结果
      const matched = phoneContacts.map(contact => ({
        ...contact,
        registered: Math.random() > 0.3, // 70%概率已注册
        isFriend: Math.random() > 0.7 // 30%概率已是好友
      }))

      console.log('通讯录匹配完成:', matched.length, '个联系人')
      return { success: true, matched }
    } catch (error) {
      console.error('匹配通讯录失败:', error)
      return { success: false, error }
    }
  }

  // 返回状态和方法
  return {
    // 状态
    conversations,
    messages,
    activeConversationId,
    activeConversation,
    activeMessages,
    inputText,
    loadingMore,
    sending,
    contacts,
    friends,
    groups,
    receivedRequests,
    sentRequests,
    unreadCount,
    pendingRequestsCount,

    // 会话操作
    fetchConversations,
    setActiveConversation,
    createConversation,
    deleteConversation,

    // 消息操作
    fetchMessages,
    sendMessage,
    sendImageMessage,
    sendVoiceMessage,
    markAsRead,
    recallMessage,

    // 联系人和群组
    fetchContacts,
    fetchGroups,

    // 好友管理
    fetchFriends,
    searchUser,
    sendFriendRequest,
    fetchReceivedRequests,
    handleFriendRequest,
    deleteFriend,
    updateFriendRemark,
    matchPhoneContacts,

    // 工具方法
    clearInput
  }
})
