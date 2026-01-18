<template>
  <div class="messages-page">
    <header class="page-header">
      <h2>系统消息</h2>
    </header>

    <main class="messages-content">
      <div class="message-filters">
        <div class="filter-item" :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">
          全部
        </div>
        <div class="filter-item" :class="{ active: activeFilter === 'unread' }" @click="activeFilter = 'unread'">
          未读
        </div>
        <div class="filter-item" :class="{ active: activeFilter === 'system' }" @click="activeFilter = 'system'">
          系统
        </div>
      </div>

      <div class="message-list">
        <div class="message-card" v-for="msg in filteredMessages" :key="msg.id" :class="{ unread: !msg.read }">
          <div class="message-icon" :class="msg.type">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="message-content">
            <h4>{{ msg.title }}</h4>
            <p>{{ msg.content }}</p>
            <span class="message-time">{{ msg.time }}</span>
          </div>
          <div class="message-status" :class="{ unread: !msg.read }"></div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Warning } from '@element-plus/icons-vue';

const activeFilter = ref('all');

const messages = ref([
  {
    id: 1,
    title: '系统备份完成',
    content: '数据备份已于今日凌晨3点完成',
    time: '2小时前',
    type: 'success',
    read: true,
  },
  {
    id: 2,
    title: '用户注册审核',
    content: '有3个新用户注册待审核',
    time: '5小时前',
    type: 'warning',
    read: false,
  },
  {
    id: 3,
    title: '服务器负载警告',
    content: '服务器CPU使用率超过80%',
    time: '昨天',
    type: 'error',
    read: true,
  },
  {
    id: 4,
    title: '存储空间不足',
    content: '存储空间使用率已达到85%',
    time: '2天前',
    type: 'warning',
    read: false,
  },
]);

const filteredMessages = computed(() => {
  if (activeFilter.value === 'all') return messages.value;
  if (activeFilter.value === 'unread') return messages.value.filter(m => !m.read);
  return messages.value.filter(m => m.type === activeFilter.value || (activeFilter.value === 'system' && m.type !== 'error'));
});
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

.message-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;

  .filter-item {
    flex: 1;
    padding: 8px;
    text-align: center;
    background: white;
    border-radius: 8px;
    font-size: 14px;
    color: #606266;
    cursor: pointer;

    &.active {
      background: #409eff;
      color: white;
    }
  }
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-card {
  display: flex;
  background: white;
  border-radius: 12px;
  padding: 16px;
  align-items: center;

  &.unread {
    background: #f0f9ff;
  }

  .message-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;

    &.success {
      background: #f0f9ff;
      color: #67c23a;
    }

    &.warning {
      background: #fdf6ec;
      color: #e6a23c;
    }

    &.error {
      background: #fef0f0;
      color: #f56c6c;
    }
  }

  .message-content {
    flex: 1;

    h4 {
      margin: 0 0 4px;
      font-size: 15px;
      color: #303133;
    }

    p {
      margin: 0 0 4px;
      font-size: 13px;
      color: #606266;
    }

    .message-time {
      font-size: 11px;
      color: #909399;
    }
  }

  .message-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #c0c4cc;

    &.unread {
      background: #f56c6c;
    }
  }
}
</style>
