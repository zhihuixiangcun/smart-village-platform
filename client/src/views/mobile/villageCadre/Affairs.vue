<template>
  <div class="affairs-page">
    <header class="page-header">
      <h2>村务管理</h2>
    </header>

    <main class="affairs-content">
      <section class="affairs-section">
        <h3>待办事项</h3>
        <div class="task-list">
          <div class="task-card" v-for="task in tasks" :key="task.id">
            <div class="task-priority" :class="task.priority"></div>
            <div class="task-info">
              <h4>{{ task.title }}</h4>
              <p>{{ task.deadline }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="affairs-section">
        <h3>快捷功能</h3>
        <div class="action-grid">
          <div class="action-item" v-for="action in actions" :key="action.id">
            <el-icon :size="28" :color="action.color"><component :is="action.icon" /></el-icon>
            <span>{{ action.name }}</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Notification, User, Document, Money } from '@element-plus/icons-vue';

const tasks = ref([
  { id: 1, title: '审批建房申请', deadline: '今天 18:00', priority: 'high' },
  { id: 2, title: '审核财务报表', deadline: '明天 12:00', priority: 'medium' },
]);

const actions = ref([
  { id: 1, name: '发布公告', icon: Notification, color: '#409EFF' },
  { id: 2, name: '村民管理', icon: User, color: '#67C23A' },
  { id: 3, name: '公文处理', icon: Document, color: '#E6A23C' },
  { id: 4, name: '财务管理', icon: Money, color: '#F56C6C' },
]);
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

.affairs-section {
  margin-bottom: 24px;

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 12px;
  }
}

.task-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.task-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f5f7fa;

  &:last-child {
    border-bottom: none;
  }

  .task-priority {
    width: 4px;
    height: 40px;
    border-radius: 2px;
    margin-right: 12px;

    &.high {
      background: #f56c6c;
    }

    &.medium {
      background: #e6a23c;
    }
  }

  .task-info {
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

  span {
    font-size: 12px;
    color: #606266;
  }
}
</style>
