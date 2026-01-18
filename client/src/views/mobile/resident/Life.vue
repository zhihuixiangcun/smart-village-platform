<template>
  <div class="life-page">
    <header class="page-header">
      <h2>生活服务</h2>
      <p>便民生活，一触即达</p>
    </header>

    <main class="life-content">
      <section class="life-section">
        <h3>农产品</h3>
        <div class="grid-cards">
          <div class="grid-card" v-for="item in farmProducts" :key="item.id">
            <img :src="item.image" :alt="item.name" />
            <span>{{ item.name }}</span>
          </div>
        </div>
      </section>

      <section class="life-section">
        <h3>邻里服务</h3>
        <div class="list-cards">
          <div class="list-card" v-for="item in lifeServices" :key="item.id">
            <el-icon :size="24" :color="item.color"><component :is="item.icon" /></el-icon>
            <div class="card-info">
              <h4>{{ item.name }}</h4>
              <p>{{ item.description }}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Shop, Bicycle, Tools, Phone } from '@element-plus/icons-vue';

const farmProducts = ref([
  { id: 1, name: '蔬菜', image: '/images/vegetables.jpg' },
  { id: 2, name: '水果', image: '/images/fruits.jpg' },
  { id: 3, name: '粮油', image: '/images/grains.jpg' },
  { id: 4, name: '禽蛋', image: '/images/eggs.jpg' },
]);

const lifeServices = ref([
  { id: 5, name: '快递代收', description: '快递代收发服务', icon: Shop, color: '#409EFF' },
  { id: 6, name: '家电维修', description: '家用电器维修服务', icon: Tools, color: '#67C23A' },
  { id: 7, name: '代步工具', description: '自行车、电动车租赁', icon: Bicycle, color: '#E6A23C' },
  { id: 8, name: '紧急服务', description: '24小时紧急服务', icon: Phone, color: '#F56C6C' },
]);
</script>

<style scoped lang="scss">
.life-page {
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

.life-section {
  margin-bottom: 24px;

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 12px;
  }
}

.grid-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.grid-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  text-align: center;

  img {
    width: 100%;
    height: 100px;
    object-fit: cover;
  }

  span {
    display: block;
    padding: 8px;
    font-size: 14px;
    color: #303133;
  }
}

.list-cards {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.list-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f5f7fa;

  &:last-child {
    border-bottom: none;
  }

  .card-info {
    flex: 1;
    margin-left: 12px;

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
