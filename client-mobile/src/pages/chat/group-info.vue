<template>
  <div class="group-info-page">
    <!-- 顶部导航栏 -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <span class="header-title">群聊信息</span>
      <div class="placeholder"></div>
    </div>

    <!-- 群信息卡片 -->
    <div v-if="groupInfo" class="group-card">
      <div class="group-avatar">{{ groupInfo.avatar }}</div>
      <div class="group-name">{{ groupInfo.name }}</div>
      <div class="group-desc">{{ groupInfo.description }}</div>

      <div class="group-stats">
        <div class="stat-item">
          <span class="stat-value">{{ groupInfo.memberCount }}</span>
          <span class="stat-label">群成员</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ groupInfo.messageCount || 0 }}</span>
          <span class="stat-label">消息数</span>
        </div>
      </div>
    </div>

    <!-- 群成员列表 -->
    <div class="members-section">
      <div class="section-header">
        <span class="section-title">群成员 ({{ memberList.length }})</span>
      </div>

      <div class="members-list">
        <!-- 群主 -->
        <div v-if="groupOwner" class="member-item owner">
          <div class="member-avatar">{{ groupOwner.avatar }}</div>
          <div class="member-info">
            <span class="member-name">{{ groupOwner.name }}</span>
            <span class="member-role">群主</span>
          </div>
        </div>

        <!-- 管理员 -->
        <div
          v-for="admin in adminList"
          :key="admin.id"
          class="member-item admin"
        >
          <div class="member-avatar">{{ admin.avatar }}</div>
          <div class="member-info">
            <span class="member-name">{{ admin.name }}</span>
            <span class="member-role">管理员</span>
          </div>
        </div>

        <!-- 普通成员 -->
        <div
          v-for="member in normalMembers"
          :key="member.id"
          class="member-item"
        >
          <div class="member-avatar">{{ member.avatar }}</div>
          <div class="member-info">
            <span class="member-name">{{ member.name }}</span>
          </div>
        </div>

        <!-- 查看更多 -->
        <div v-if="memberList.length > displayCount" class="member-item more" @click="viewAllMembers">
          <div class="more-icon">⋯</div>
          <span class="more-text">查看全部 {{ memberList.length }} 位成员</span>
        </div>
      </div>
    </div>

    <!-- 管理操作 -->
    <div v-if="isAdmin" class="admin-section">
      <div class="section-header">
        <span class="section-title">群管理</span>
      </div>

      <div class="admin-actions">
        <div class="action-item" @click="inviteMembers">
          <span class="action-icon">➕</span>
          <span class="action-text">邀请成员</span>
          <span class="action-arrow">→</span>
        </div>
        <div class="action-item" @click="manageAdmins">
          <span class="action-icon">👑</span>
          <span class="action-text">群管理</span>
          <span class="action-arrow">→</span>
        </div>
        <div class="action-item" @click="editGroupInfo">
          <span class="action-icon">✏️</span>
          <span class="action-text">群信息</span>
          <span class="action-arrow">→</span>
        </div>
        <div class="action-item" @click="groupSettings">
          <span class="action-icon">⚙️</span>
          <span class="action-text">群设置</span>
          <span class="action-arrow">→</span>
        </div>
      </div>
    </div>

    <!-- 普通操作 -->
    <div class="common-section">
      <div class="section-header">
        <span class="section-title">操作</span>
      </div>

      <div class="common-actions">
        <div class="action-item" @click="searchMessages">
          <span class="action-icon">🔍</span>
          <span class="action-text">查找聊天记录</span>
          <span class="action-arrow">→</span>
        </div>
        <div class="action-item" @click="muteNotifications">
          <span class="action-icon">🔔</span>
          <span class="action-text">消息免打扰</span>
          <span class="action-switch">
            <input v-model="muted" type="checkbox" class="switch" />
          </span>
        </div>
        <div class="action-item" @click="pinChat">
          <span class="action-icon">📌</span>
          <span class="action-text">置顶聊天</span>
          <span class="action-switch">
            <input v-model="pinned" type="checkbox" class="switch" />
          </span>
        </div>
        <div class="action-item danger" @click="clearHistory">
          <span class="action-icon">🗑️</span>
          <span class="action-text">清空聊天记录</span>
          <span class="action-arrow">→</span>
        </div>
      </div>

      <!-- 退出群聊/解散群 -->
      <button
        v-if="!isOwner"
        class="exit-btn"
        @click="exitGroup"
      >
        <span class="btn-text">退出群聊</span>
      </button>
      <button
        v-else
        class="dissolve-btn danger"
        @click="dissolveGroup"
      >
        <span class="btn-text">解散群聊</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useChatStore } from '@/store/chat'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'

const router = useRouter()
const route = useRoute()
const chatStore = useChatStore()
const userStore = useUserStore()
const elderlyStore = useElderlyStore()

// 群组ID
const groupId = ref(route.params.id)

// 群信息
const groupInfo = ref(null)

// 成员列表
const memberList = ref([])

// 显示成员数量
const displayCount = ref(10)

// 免打扰
const muted = ref(false)

// 置顶
const pinned = ref(false)

// 当前用户是否是群主
const isOwner = computed(() => {
  return groupInfo.value?.ownerId === userStore.userInfo?.id
})

// 当前用户是否是管理员
const isAdmin = computed(() => {
  return isOwner.value || groupInfo.value?.isAdmin
})

// 群主
const groupOwner = computed(() => {
  return memberList.value.find(m => m.role === 'owner')
})

// 管理员列表
const adminList = computed(() => {
  return memberList.value.filter(m => m.role === 'admin')
})

// 普通成员
const normalMembers = computed(() => {
  const members = memberList.value.filter(m => m.role === 'member')
  return members.slice(0, displayCount.value - 1 - adminList.value.length)
})

// 查看全部成员
const viewAllMembers = () => {
  router.push(`/chat/group-members/${groupId.value}`)
}

// 邀请成员
const inviteMembers = () => {
  router.push(`/chat/invite-members/${groupId.value}`)
}

// 管理管理员
const manageAdmins = () => {
  router.push(`/chat/manage-admins/${groupId.value}`)
}

// 编辑群信息
const editGroupInfo = () => {
  router.push(`/chat/edit-group/${groupId.value}`)
}

// 群设置
const groupSettings = () => {
  router.push(`/chat/group-settings/${groupId.value}`)
}

// 查找聊天记录
const searchMessages = () => {
  router.push(`/chat/search/${groupId.value}`)
}

// 消息免打扰
const muteNotifications = () => {
  muted.value = !muted.value
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
  // TODO: 调用API设置免打扰
}

// 置顶聊天
const pinChat = () => {
  pinned.value = !pinned.value
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
  // TODO: 调用API设置置顶
}

// 清空聊天记录
const clearHistory = () => {
  if (confirm('确定要清空聊天记录吗？此操作不可恢复')) {
    // TODO: 调用API清空记录
    console.log('清空聊天记录')
  }
}

// 退出群聊
const exitGroup = () => {
  if (confirm('确定要退出群聊吗？')) {
    // TODO: 调用API退出群聊
    console.log('退出群聊')
    router.back()
  }
}

// 解散群聊
const dissolveGroup = () => {
  if (confirm('确定要解散群聊吗？此操作不可恢复，所有成员将被移除')) {
    // TODO: 调用API解散群聊
    console.log('解散群聊')
    router.back()
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 初始化
onMounted(async () => {
  // 模拟群信息
  groupInfo.value = {
    id: groupId.value,
    name: '东村村民群',
    avatar: '👥',
    description: '东村全体村民交流群',
    memberCount: 45,
    messageCount: 1234,
    ownerId: 'user_002',
    isAdmin: false,
    createdAt: new Date('2024-01-01').toISOString()
  }

  // 模拟成员列表
  memberList.value = [
    {
      id: 'user_002',
      name: '村支书',
      avatar: '👨‍💼',
      role: 'owner',
      joinTime: new Date('2024-01-01').toISOString()
    },
    {
      id: 'user_003',
      name: '王会计',
      avatar: '👩‍💼',
      role: 'admin',
      joinTime: new Date('2024-01-02').toISOString()
    },
    {
      id: 'user_004',
      name: '李大姐',
      avatar: '👩',
      role: 'member',
      joinTime: new Date('2024-01-03').toISOString()
    },
    {
      id: 'user_005',
      name: '张主任',
      avatar: '👨',
      role: 'member',
      joinTime: new Date('2024-01-04').toISOString()
    },
    {
      id: 'user_006',
      name: '刘秘书',
      avatar: '👩‍💼',
      role: 'member',
      joinTime: new Date('2024-01-05').toISOString()
    },
    {
      id: 'user_007',
      name: '陈大哥',
      avatar: '👨‍🌾',
      role: 'member',
      joinTime: new Date('2024-01-06').toISOString()
    },
    {
      id: 'user_008',
      name: '周阿姨',
      avatar: '👩',
      role: 'member',
      joinTime: new Date('2024-01-07').toISOString()
    },
    {
      id: 'user_009',
      name: '吴大哥',
      avatar: '👨',
      role: 'member',
      joinTime: new Date('2024-01-08').toISOString()
    }
  ]
})
</script>

<style lang="scss" scoped>
.group-info-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.page-header {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #eee;

  .back-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: none;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 20px;

    &:active {
      background: #f5f5f5;
    }
  }

  .header-title {
    flex: 1;
    font-size: 18px;
    font-weight: 600;
    color: #333;
    text-align: center;
  }

  .placeholder {
    width: 40px;
  }
}

.group-card {
  background: #fff;
  padding: 24px 16px;
  text-align: center;
  border-bottom: 1px solid #eee;

  .group-avatar {
    width: 72px;
    height: 72px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    background: #f0f0f0;
    margin-bottom: 16px;
  }

  .group-name {
    font-size: 20px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
  }

  .group-desc {
    font-size: 14px;
    color: #999;
    margin-bottom: 20px;
  }

  .group-stats {
    display: flex;
    justify-content: center;
    gap: 40px;

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;

      .stat-value {
        font-size: 20px;
        font-weight: 600;
        color: #1890ff;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 12px;
        color: #999;
      }
    }
  }
}

.members-section,
.admin-section,
.common-section {
  margin-top: 8px;
  background: #fff;

  .section-header {
    padding: 12px 16px;
    border-bottom: 1px solid #f5f5f5;

    .section-title {
      font-size: 14px;
      color: #999;
    }
  }
}

.members-list {
  padding: 8px 0;

  .member-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;

    &:active {
      background: #f5f5f5;
    }

    &.owner,
    &.admin {
      background: #fafafa;
    }

    .member-avatar {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      background: #f0f0f0;
      margin-right: 12px;
    }

    .member-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;

      .member-name {
        font-size: 15px;
        color: #333;
      }

      .member-role {
        font-size: 11px;
        color: #1890ff;
        border: 1px solid #1890ff;
        padding: 1px 4px;
        border-radius: 4px;
      }
    }

    &.more {
      justify-content: center;
      color: #1890ff;

      .more-icon {
        font-size: 20px;
        margin-right: 8px;
      }

      .more-text {
        font-size: 14px;
      }
    }
  }
}

.admin-actions,
.common-actions {
  .action-item {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid #f5f5f5;
    cursor: pointer;

    &:active {
      background: #f5f5f5;
    }

    &:last-child {
      border-bottom: none;
    }

    &.danger {
      .action-text {
        color: #ff4d4f;
      }
    }

    .action-icon {
      font-size: 18px;
      margin-right: 12px;
      width: 24px;
      text-align: center;
    }

    .action-text {
      flex: 1;
      font-size: 15px;
      color: #333;
    }

    .action-arrow {
      font-size: 16px;
      color: #ccc;
    }

    .action-switch {
      .switch {
        width: 40px;
        height: 24px;
        appearance: none;
        background: #ccc;
        border-radius: 12px;
        position: relative;
        cursor: pointer;
        transition: background 0.2s;

        &::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.2s;
        }

        &:checked {
          background: #1890ff;

          &::after {
            transform: translateX(16px);
          }
        }
      }
    }
  }
}

.common-section {
  padding-bottom: 16px;

  .exit-btn,
  .dissolve-btn {
    width: calc(100% - 32px);
    margin: 16px;
    height: 48px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;

    .btn-text {
      color: #fff;
    }
  }

  .exit-btn {
    background: #fff;
    color: #666;
    border: 1px solid #ddd;

    .btn-text {
      color: #666;
    }
  }

  .dissolve-btn {
    background: #ff4d4f;

    &.danger {
      background: #ff4d4f;
    }
  }
}

// 适老化模式样式
:deep(.elderly-mode-large) {
  .page-header .header-title {
    font-size: 22px;
  }

  .group-card .group-name {
    font-size: 24px;
  }

  .members-list .member-item .member-info .member-name {
    font-size: 18px;
  }

  .admin-actions .action-item .action-text,
  .common-actions .action-item .action-text {
    font-size: 18px;
  }
}

:deep(.elderly-mode-xl) {
  .page-header .header-title {
    font-size: 28px;
  }

  .group-card .group-name {
    font-size: 28px;
  }

  .members-list .member-item {
    padding: 16px;

    .member-avatar {
      width: 48px;
      height: 48px;
      font-size: 24px;
    }

    .member-info .member-name {
      font-size: 20px;
    }
  }

  .admin-actions .action-item,
  .common-actions .action-item {
    padding: 18px 16px;

    .action-text {
      font-size: 20px;
    }
  }
}
</style>
