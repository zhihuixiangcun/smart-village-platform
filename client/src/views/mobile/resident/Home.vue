<template>
  <div class="resident-home">
    <!-- 顶部欢迎区 -->
    <header class="home-header">
      <div class="location-info">
        <el-icon><Location /></el-icon>
        <span>{{ villageName }}</span>
      </div>
      <div class="user-greeting">
        <h2>您好，{{ userName }}</h2>
        <p>今天是 {{ currentDate }}</p>
      </div>
    </header>

    <!-- 主要内容区 -->
    <main class="home-content">
      <!-- 快捷服务 -->
      <section class="quick-services">
        <h3 class="section-title">便民服务</h3>
        <div class="service-grid">
          <div
            v-for="service in quickServices"
            :key="service.id"
            class="service-card"
            @click="handleService(service)"
          >
            <el-icon :size="32" :color="service.color">
              <component :is="service.icon" />
            </el-icon>
            <span>{{ service.label }}</span>
          </div>
        </div>
      </section>

      <!-- 生活服务 -->
      <section class="life-services">
        <h3 class="section-title">生活服务</h3>
        <div class="life-grid">
          <div
            v-for="item in lifeServices"
            :key="item.id"
            class="life-card"
            @click="handleLifeService(item)"
          >
            <img :src="item.image" :alt="item.label" />
            <span>{{ item.label }}</span>
          </div>
        </div>
      </section>

      <!-- 紧急联系 -->
      <section class="emergency-contact">
        <el-button type="danger" size="large" @click="handleEmergency" :icon="Phone">
          紧急求助
        </el-button>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Location,
  Document,
  Notification,
  Service,
  Phone,
  Shop,
  Message,
} from '@element-plus/icons-vue';

const router = useRouter();

const villageName = ref('智慧乡村示范村');
const userName = ref('村民');
const currentDate = ref('');

const quickServices = ref([
  { id: 'announcements', label: '村务公告', icon: Notification, color: '#409EFF' },
  { id: 'services', label: '办事大厅', icon: Service, color: '#67C23A' },
  { id: 'documents', label: '证件办理', icon: Document, color: '#E6A23C' },
  { id: 'feedback', label: '意见反馈', icon: Message, color: '#F56C6C' },
]);

const lifeServices = ref([
  { id: 'market', label: '农产品', image: '/images/market.jpg' },
  { id: 'shopping', label: '网上购物', image: '/images/shopping.jpg' },
  { id: 'mutual-aid', label: '邻里互助', image: '/images/aid.jpg' },
  { id: 'activities', label: '活动广场', image: '/images/activity.jpg' },
]);

const formatDate = () => {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  currentDate.value = now.toLocaleDateString('zh-CN', options);
};

const handleService = (service) => {
  router.push(`/mobile/resident/${service.id}`);
};

const handleLifeService = (item) => {
  router.push(`/mobile/resident/life?type=${item.id}`);
};

const handleEmergency = () => {
  router.push('/mobile/resident/emergency');
};

onMounted(() => {
  formatDate();
});
</script>

<style scoped lang="scss">
.resident-home {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 80px;
}

.home-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  padding-top: max(20px, env(safe-area-inset-top));

  .location-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    margin-bottom: 16px;
  }

  .user-greeting {
    h2 {
      margin: 0 0 8px;
      font-size: 24px;
    }

    p {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }
  }
}

.home-content {
  padding: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px;
}

.quick-services {
  margin-bottom: 24px;

  .service-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .service-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 8px;
    background: white;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.2s;

    &:active {
      transform: scale(0.95);
    }

    span {
      margin-top: 8px;
      font-size: 12px;
      color: #606266;
    }
  }
}

.life-services {
  margin-bottom: 24px;

  .life-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .life-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;

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
      text-align: center;
    }
  }
}

.emergency-contact {
  display: flex;
  justify-content: center;

  button {
    width: 100%;
    height: 48px;
  }
}
</style>
