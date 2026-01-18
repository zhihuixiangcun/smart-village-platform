<template>
  <div class="affairs-page">
    <header class="page-header">
      <h2>村务管理</h2>
    </header>

    <main class="affairs-content">
      <section class="quick-actions">
        <h3>快捷操作</h3>
        <div class="action-grid">
          <div class="action-item" v-for="action in actions" :key="action.id" @click="handleAction(action.id)">
            <el-icon :size="28" :color="action.color"><component :is="action.icon" /></el-icon>
            <span>{{ action.name }}</span>
          </div>
        </div>
      </section>

      <section class="pending-items">
        <h3>待处理事项</h3>
        <div class="pending-list">
          <div class="pending-card" v-for="item in pendingItems" :key="item.id">
            <div class="pending-icon" :class="item.type"></div>
            <div class="pending-info">
              <h4>{{ item.title }}</h4>
              <p>{{ item.time }}</p>
            </div>
            <el-button type="primary" size="small">处理</el-button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { User, OfficeBuilding, Notification, Document } from '@element-plus/icons-vue';

const actions = ref([
  { id: 'users', name: '用户管理', icon: User, color: '#409EFF' },
  { id: 'villages', name: '村庄管理', icon: OfficeBuilding, color: '#67C23A' },
  { id: 'announcements', name: '公告管理', icon: Notification, color: '#E6A23C' },
  { id: 'audit', name: '审核管理', icon: Document, color: '#F56C6C' },
]);

const pendingItems = ref([
  { id: 1, title: '用户注册审核', time: '3个待审核', type: 'user' },
  { id: 2, title: '内容审核', time: '5条待审核', type: 'content' },
  { id: 3, title: '系统消息', time: '2条未读', type: 'message' },
]);

const handleAction = (actionId) => {
  console.log('Action:', actionId);
};
</script>

<style scoped lang="scss">
.affairs-page {
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

.affairs-content {
  padding: 16px;
}

.quick-actions {
  margin-bottom: 24px;

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 12px;
  }
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  background: white;
  border-radius: 12px;
  gap: 8px;
  cursor: pointer;

  &:active {
    background: #f5f7fa;
  }

  span {
    font-size: 12px;
    color: #606266;
  }
}

.pending-items {
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 12px;
  }
}

.pending-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.pending-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f5f7fa;

  &:last-child {
    border-bottom: none;
  }

  .pending-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;

    &.user {
      background: #f0f9ff;
      color: #409eff;
    }

    &.content {
      background: #fdf6ec;
      color: #e6a23c;
    }

    &.message {
      background: #fef0f0;
      color: #f56c6c;
    }
  }

  .pending-info {
    flex: 1;

    h4 {
      margin: 0 0 4px;
      font-size: 15px;
      color: #303133;
    }

    p {
      margin: 0;
      font-size: 12px;
      color: #909399;
    }
  }
}
</style>
