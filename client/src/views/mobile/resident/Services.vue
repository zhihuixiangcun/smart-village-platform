<template>
  <div class="services-page">
    <header class="page-header">
      <h2>便民服务</h2>
      <p>在线办理各类证件和申请</p>
    </header>

    <main class="services-content">
      <section class="service-category">
        <h3>证件办理</h3>
        <div class="service-list">
          <div class="service-item" v-for="item in certificateServices" :key="item.id">
            <el-icon :size="24" :color="item.color"><component :is="item.icon" /></el-icon>
            <div class="service-info">
              <h4>{{ item.name }}</h4>
              <p>{{ item.description }}</p>
            </div>
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </section>

      <section class="service-category">
        <h3>福利申请</h3>
        <div class="service-list">
          <div class="service-item" v-for="item in benefitServices" :key="item.id">
            <el-icon :size="24" :color="item.color"><component :is="item.icon" /></el-icon>
            <div class="service-info">
              <h4>{{ item.name }}</h4>
              <p>{{ item.description }}</p>
            </div>
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Document, Money, User, House, ArrowRight } from '@element-plus/icons-vue';

const certificateServices = ref([
  { id: 1, name: '身份证办理', description: '身份证申领、补办、换领', icon: User, color: '#409EFF' },
  { id: 2, name: '居住证明', description: '开具居住证明', icon: Document, color: '#67C23A' },
  { id: 3, name: '房产证明', description: '房产相关证明材料', icon: House, color: '#E6A23C' },
  { id: 4, name: '婚姻证明', description: '婚姻状况证明', icon: Document, color: '#F56C6C' },
]);

const benefitServices = ref([
  { id: 5, name: '低保申请', description: '最低生活保障申请', icon: Money, color: '#409EFF' },
  { id: 6, name: '医保报销', description: '医疗保险报销申请', icon: Document, color: '#67C23A' },
  { id: 7, name: '养老金', description: '养老金领取认证', icon: Money, color: '#E6A23C' },
  { id: 8, name: '残疾人补贴', description: '残疾人补贴申请', icon: User, color: '#F56C6C' },
]);
</script>

<style scoped lang="scss">
.services-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 16px;
  padding-bottom: 80px;
}

.page-header {
  margin-bottom: 24px;
  text-align: center;

  h2 {
    margin: 0 0 8px;
    font-size: 24px;
    color: #303133;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #909399;
  }
}

.service-category {
  margin-bottom: 24px;

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 12px;
  }
}

.service-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.service-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f5f7fa;

  &:last-child {
    border-bottom: none;
  }

  .service-info {
    flex: 1;
    margin: 0 12px;

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
