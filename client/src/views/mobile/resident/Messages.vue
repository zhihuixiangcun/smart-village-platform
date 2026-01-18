<template>
  <div class="messages-page">
    <header class="page-header">
      <h2>消息中心</h2>
    </header>

    <main class="messages-content">
      <div class="message-list">
        <div class="message-item" v-for="msg in messages" :key="msg.id">
          <div class="message-avatar">
            <el-avatar :size="48">{{ msg.avatar }}</el-avatar>
          </div>
          <div class="message-info" :class="{ unread: !msg.read }">
            <h4>{{ msg.title }}</h4>
            <p>{{ msg.content }}</p>
            <span class="message-time">{{ msg.time }}</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const messages = ref([
  {
    id: 1,
    title: '村委通知',
    content: '关于本周五村委会会议的通知',
    time: '10:30',
    avatar: '村',
    read: false,
  },
  {
    id: 2,
    title: '系统消息',
    content: '您的证件申请已通过审核',
    time: '昨天',
    avatar: '系',
    read: true,
  },
  {
    id: 3,
    title: '邻里消息',
    content: '李大爷发布了生活求助',
    time: '前天',
    avatar: '邻',
    read: true,
  },
]);
</script>

<style scoped lang="scss">
.messages-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 80px;
}

.page-header {
  background: white;
  padding: 16px;
  text-align: center;
  border-bottom: 1px solid #e4e7ed;

  h2 {
    margin: 0;
    font-size: 18px;
    color: #303133;
  }
}

.messages-content {
  padding: 16px;
}

.message-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.message-item {
  display: flex;
  padding: 16px;
  border-bottom: 1px solid #f5f7fa;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: #f5f7fa;
  }
}

.message-info {
  flex: 1;
  margin-left: 12px;

  h4 {
    margin: 0 0 4px;
    font-size: 15px;
    color: #303133;
  }

  p {
    margin: 0 0 4px;
    font-size: 13px;
    color: #606266;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .message-time {
    font-size: 11px;
    color: #909399;
  }

  &.unread h4 {
    font-weight: 600;
  }
}
</style>
