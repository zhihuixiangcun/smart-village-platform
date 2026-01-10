<template>
  <div class="chat-view">
    <!-- 左侧会话列表 -->
    <div class="conversation-panel" v-show="!showChatOnly">
      <div class="panel-header">
        <h2>聊天</h2>
        <div class="header-actions">
          <el-dropdown trigger="click" @command="handleHeaderCommand">
            <el-button type="primary" circle>
              <el-icon><Plus /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="addFriend">
                  <el-icon><User /></el-icon>
                  添加好友
                </el-dropdown-item>
                <el-dropdown-item command="createGroup">
                  <el-icon><ChatDotRound /></el-icon>
                  创建群聊
                </el-dropdown-item>
                <el-dropdown-item command="aiAssistant">
                  <el-icon><Service /></el-icon>
                  AI 助手
                </el-dropdown-item>
                <el-dropdown-item command="avatarUpload">
                  <el-icon><Avatar /></el-icon>
                  更换头像
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 搜索框 -->
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索会话..."
          :prefix-icon="Search"
          clearable
        />
      </div>

      <!-- 会话列表 -->
      <div class="conversation-list">
        <ConversationItem
          v-for="conv in filteredConversations"
          :key="conv._id"
          :conversation="conv"
          :current-id="currentConversationId"
          :is-active="conv._id === currentConversationId"
          @click="selectConversation(conv._id)"
        />
      </div>
    </div>

    <!-- 右侧聊天窗口 -->
    <div class="chat-window-panel" v-show="currentConversationId || showChatOnly">
      <ChatWindow
        v-if="currentConversationId"
        :conversation-id="currentConversationId"
        @close="closeConversation"
        @back="showChatOnly = false"
      />
      <div v-else class="empty-state">
        <el-empty description="选择一个会话开始聊天" />
      </div>
    </div>

    <!-- 添加好友对话框 -->
    <AddFriendDialog v-model="showAddFriendDialog" />

    <!-- 创建群聊对话框 -->
    <CreateGroupModal v-model="showCreateGroupDialog" @created="handleGroupCreated" />

    <!-- AI助手对话框 -->
    <AIAssistant v-model="showAIAssistant" />

    <!-- 头像上传对话框 -->
    <AvatarUpload
      v-model="showAvatarUpload"
      :current-avatar="userStore.user?.profile?.avatar || ''"
      @success="handleAvatarUploadSuccess"
    />

    <!-- 移动端返回按钮 -->
    <el-button
      v-if="isMobile && currentConversationId"
      class="back-button"
      circle
      @click="showChatOnly = false"
    >
      <el-icon><ArrowLeft /></el-icon>
    </el-button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import {
  Plus,
  Search,
  ArrowLeft,
  User,
  ChatDotRound,
  Service,
  Avatar,
} from '@element-plus/icons-vue';
import { useChatStore } from '@/stores/chat';
import { useWebSocketChat } from '@/composables/useWebSocketChat';
import { useUserStore } from '@/stores/user';
import { ElMessage } from 'element-plus';
import ConversationItem from './components/ConversationItem.vue';
import ChatWindow from './components/ChatWindow.vue';
import AddFriendDialog from './components/AddFriendDialog.vue';
import CreateGroupModal from './components/CreateGroupModal.vue';
import AIAssistant from './components/AIAssistant.vue';
import AvatarUpload from './components/AvatarUpload.vue';

const chatStore = useChatStore();
const ws = useWebSocketChat();
const userStore = useUserStore();

// 搜索关键词
const searchKeyword = ref('');

// 当前会话ID
const currentConversationId = ref(null);

// 是否只显示聊天窗口（移动端）
const showChatOnly = ref(false);

// 是否显示添加好友对话框
const showAddFriendDialog = ref(false);

// 是否显示创建群聊对话框
const showCreateGroupDialog = ref(false);

// 是否显示AI助手对话框
const showAIAssistant = ref(false);

// 是否显示头像上传对话框
const showAvatarUpload = ref(false);

// 是否是移动端
const isMobile = ref(window.innerWidth < 768);

// 过滤后的会话列表（使用排序后的会话）
const filteredConversations = computed(() => {
  const conversations = chatStore.sortedConversations;
  if (!searchKeyword.value) {
    return conversations;
  }
  const keyword = searchKeyword.value.toLowerCase();

  // 获取当前用户ID
  const currentUserId = ref(null);
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    currentUserId.value = user.id || user._id;
  } catch {}

  return conversations.filter(conv => {
    // 搜索群聊名称或私聊对方的昵称
    if (conv.type === 'group') {
      return conv.groupInfo?.name?.toLowerCase().includes(keyword);
    } else {
      const otherUser = conv.participants?.find(p => p._id !== currentUserId.value);
      return (
        otherUser?.profile?.nickName?.toLowerCase().includes(keyword) ||
        otherUser?.username?.toLowerCase().includes(keyword)
      );
    }
  });
});

// 选择会话
const selectConversation = async conversationId => {
  currentConversationId.value = conversationId;
  showChatOnly.value = true;

  // 加入 WebSocket 房间
  if (ws.connected) {
    ws.joinConversation(conversationId);
  }

  // 加载消息
  await chatStore.loadMessages(conversationId);
  // 标记为已读
  await chatStore.markAsRead(conversationId);
};

// 关闭会话
const closeConversation = () => {
  // 离开 WebSocket 房间
  if (currentConversationId.value && ws.connected) {
    ws.leaveConversation(currentConversationId.value);
  }
  currentConversationId.value = null;
  showChatOnly.value = false;
};

// 处理窗口大小变化
const handleResize = () => {
  isMobile.value = window.innerWidth < 768;
  if (!isMobile.value) {
    showChatOnly.value = false;
  }
};

// 处理头部下拉菜单命令
const handleHeaderCommand = command => {
  if (command === 'addFriend') {
    showAddFriendDialog.value = true;
  } else if (command === 'createGroup') {
    showCreateGroupDialog.value = true;
  } else if (command === 'aiAssistant') {
    showAIAssistant.value = true;
  } else if (command === 'avatarUpload') {
    showAvatarUpload.value = true;
  }
};

// 处理头像上传成功
const handleAvatarUploadSuccess = avatarUrl => {
  ElMessage.success('头像上传成功');
};

// 处理群聊创建成功
const handleGroupCreated = async conversation => {
  ElMessage.success('群聊创建成功');
  showCreateGroupDialog.value = false;
  // 刷新会话列表
  await chatStore.loadConversations();
  // 选择新创建的群聊
  selectConversation(conversation._id);
};

// 监听 WebSocket 连接状态，自动重连
watch(
  () => ws.connected,
  connected => {
    if (connected && currentConversationId.value) {
      // 重新加入房间
      ws.joinConversation(currentConversationId.value);
    }
  }
);

onMounted(async () => {
  try {
    // 连接 WebSocket
    ws.connect();

    // 加载会话列表
    await chatStore.loadConversations();

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);
  } catch (error) {
    ElMessage.error('加载会话列表失败');
  }
});

onUnmounted(() => {
  // 离开当前会话房间
  if (currentConversationId.value && ws.connected) {
    ws.leaveConversation(currentConversationId.value);
  }

  // 断开 WebSocket
  ws.disconnect();

  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.chat-view {
  display: flex;
  height: 100%;
  background: #f5f5f5;
  position: relative;
}

.conversation-panel {
  width: 320px;
  background: #fff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.search-box {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
}

.chat-window-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-button {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  display: none;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .conversation-panel {
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 5;
    transition: transform 0.3s ease;
  }

  .conversation-panel[style*='display: none'] {
    transform: translateX(-100%);
  }

  .back-button {
    display: flex;
  }
}
</style>
