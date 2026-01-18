<template>
  <div class="villages-page">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h2 class="page-title">村庄管理</h2>
          <span class="page-subtitle">{{ villages.length }}个村庄</span>
        </div>
        <div class="header-actions">
          <el-button circle class="icon-button" :icon="Plus" />
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="search-container">
        <el-input
          v-model="searchQuery"
          placeholder="搜索村庄名称、书记..."
          class="search-input"
          :prefix-icon="Search"
          clearable
        />
      </div>
    </header>

    <!-- 村庄列表 -->
    <main class="villages-content">
      <div class="village-list">
        <div
          class="village-card"
          v-for="village in filteredVillages"
          :key="village.id"
          @click="viewVillage(village)"
        >
          <div class="village-image-wrapper">
            <img :src="village.image" :alt="village.name" />
            <div class="image-overlay"></div>
            <div class="status-badge" :class="village.status">
              {{ village.statusText }}
            </div>
          </div>
          <div class="village-info">
            <div class="village-header">
              <h4>{{ village.name }}</h4>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
            </div>
            <div class="village-stats">
              <div class="stat-item">
                <el-icon class="stat-icon"><User /></el-icon>
                <span>{{ village.population }}人</span>
              </div>
              <div class="stat-item">
                <el-icon class="stat-icon"><Location /></el-icon>
                <span>{{ village.district }}</span>
              </div>
            </div>
            <div class="village-footer">
              <div class="secretary-info">
                <el-icon><UserFilled /></el-icon>
                <span>{{ village.secretary }}</span>
              </div>
              <div class="score-badge">
                <el-icon><Star /></el-icon>
                <span>{{ village.score }}分</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredVillages.length === 0" class="empty-state">
        <el-icon :size="64" color="#cbd5e1"><OfficeBuilding /></el-icon>
        <p>没有找到匹配的村庄</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  Search,
  ArrowRight,
  Plus,
  User,
  Location,
  UserFilled,
  Star,
  OfficeBuilding
} from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const searchQuery = ref('');

const villages = ref([
  {
    id: 1,
    name: '智慧乡村示范村',
    secretary: '张书记',
    population: 1234,
    district: '东区',
    status: 'good',
    statusText: '正常运营',
    score: 98,
    image: '/images/village1.jpg',
  },
  {
    id: 2,
    name: '绿色生态村',
    secretary: '李书记',
    population: 856,
    district: '南区',
    status: 'warning',
    statusText: '需关注',
    score: 85,
    image: '/images/village2.jpg',
  },
  {
    id: 3,
    name: '文化古村',
    secretary: '王书记',
    population: 678,
    district: '西区',
    status: 'good',
    statusText: '正常运营',
    score: 92,
    image: '/images/village3.jpg',
  },
  {
    id: 4,
    name: '现代农业村',
    secretary: '赵书记',
    population: 945,
    district: '北区',
    status: 'good',
    statusText: '正常运营',
    score: 88,
    image: '/images/village4.jpg',
  },
  {
    id: 5,
    name: '和谐新村',
    secretary: '周书记',
    population: 567,
    district: '东区',
    status: 'good',
    statusText: '正常运营',
    score: 90,
    image: '/images/village5.jpg',
  },
]);

const filteredVillages = computed(() => {
  if (!searchQuery.value) return villages.value;
  const query = searchQuery.value.toLowerCase();
  return villages.value.filter(village =>
    village.name.toLowerCase().includes(query) ||
    village.secretary.toLowerCase().includes(query)
  );
});

const viewVillage = (village) => {
  router.push(`/mobile/township/villages/${village.id}`);
};
</script>

<style scoped lang="scss">
.villages-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding-bottom: 100px;
}

// 页面头部
.page-header {
  background: white;
  padding: 16px 20px 20px;
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 10;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .page-title {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        color: #1e293b;
      }

      .page-subtitle {
        font-size: 13px;
        color: #64748b;
      }
    }

    .header-actions {
      .icon-button {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: none;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);

        .el-icon {
          font-size: 20px;
          color: white;
        }
      }
    }
  }

  .search-container {
    .search-input {
      :deep(.el-input__wrapper) {
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        background: #f8fafc;
        padding: 12px 16px;
        transition: all 0.3s ease;

        &:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        &:focus-within {
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
          background: white;
        }
      }

      :deep(.el-input__inner) {
        font-size: 14px;
        color: #475569;
      }

      :deep(.el-input__prefix) {
        color: #94a3b8;
      }
    }
  }
}

.villages-content {
  padding: 20px 16px;
}

// 村庄列表
.village-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.village-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:active {
    transform: translateY(2px) scale(0.98);
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  }

  .village-image-wrapper {
    position: relative;
    height: 140px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s ease;
    }

    .image-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        180deg,
        transparent 0%,
        rgba(0, 0, 0, 0.1) 100%
      );
    }

    .status-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      backdrop-filter: blur(10px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      &.good {
        background: rgba(16, 185, 129, 0.95);
        color: white;
      }

      &.warning {
        background: rgba(245, 158, 11, 0.95);
        color: white;
      }
    }
  }

  &:hover .village-image-wrapper img {
    transform: scale(1.05);
  }

  .village-info {
    padding: 16px;

    .village-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      h4 {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
        color: #1e293b;
        flex: 1;
        padding-right: 8px;
      }

      .arrow-icon {
        font-size: 18px;
        color: #cbd5e1;
        flex-shrink: 0;
      }
    }

    .village-stats {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #64748b;

        .stat-icon {
          font-size: 16px;
          color: #94a3b8;
        }
      }
    }

    .village-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;

      .secretary-info {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #475569;

        .el-icon {
          font-size: 16px;
          color: #94a3b8;
        }
      }

      .score-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        color: #d97706;

        .el-icon {
          font-size: 14px;
        }
      }
    }
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;

  p {
    margin: 16px 0 0;
    font-size: 15px;
    color: #94a3b8;
  }
}
</style>
