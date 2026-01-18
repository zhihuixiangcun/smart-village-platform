<template>
  <div class="messages-page">
    <header class="page-header">
      <h2>消息中心</h2>
    </header>

    <main class="messages-content">
      <div class="message-tabs">
        <div class="tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">全部</div>
        <div class="tab" :class="{ active: activeTab === 'system' }" @click="activeTab = 'system'">系统</div>
        <div class="tab" :class="{ active: activeTab === 'village' }" @click="activeTab = 'village'">村务</div>
      </div>

      <div class="message-list">
        <div class="message-item" v-for="msg in filteredMessages" :key="msg.id">
          <div class="message-icon" :class="msg.type">
            <el-icon><Bell /></el-icon>
          </div>
          <div class="message-info">
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
import { ref, computed } from 'vue';
import { Bell } from '@element-plus/icons-vue';

const activeTab = ref('all');

const messages = ref([
  { id: 1, title: '系统通知', content: '系统将于今晚进行维护', time: '2小时前', type: 'system', read: false },
  { id: 2, title: '村务消息', content: '村民建房申请待审批', time: '5小时前', type: 'village', read: true },
  { id: 3, title: '系统通知', content: '您的周报已生成', time: '昨天', type: 'system', read: true },
]);

const filteredMessages = computed(() => {
  if (activeTab.value === 'all') return messages.value;
  return messages.value.filter(m => m.type === activeTab.value);
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

.message-tabs {
  display: flex;
  background: white;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;

  .tab {
    flex: 1;
    text-align: center;
    padding: 8px;
    font-size: 14px;
    color: #606266;
    border-radius: 8px;
    cursor: pointer;

    &.active {
      background: #409eff;
      color: white;
    }
  }
}

.message-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.message-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f5f7fa;

  &:last-child {
    border-bottom: none;
  }

  .message-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;

    &.system {
      background: #f0f9ff;
      color: #409eff;
    }

    &.village {
      background: #fdf6ec;
      color: #e6a23c;
    }
  }

  .message-info {
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
}
</style>
