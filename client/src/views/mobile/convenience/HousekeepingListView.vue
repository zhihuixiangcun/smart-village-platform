<template>
  <div class="housekeeping-list">
    <van-nav-bar title="家政服务" fixed left-arrow @click-left="onClickLeft">
      <template #right>
        <van-icon name="search" size="20" @click="onSearch" />
      </template>
    </van-nav-bar>

    <van-tabs v-model="activeTab" :fixed="true" :placeholder="true" class="tabs-container">
      <van-tabbar-item title="服务列表" />
      <van-tabbar-item title="服务商" />
    </van-tabs>

    <div v-if="activeTab === 0" class="tab-content">
      <van-pull-refresh v-model="loading" @refresh="onRefresh">
        <van-list v-model="loading="listLoading" :finished="finished" finished-text="没有更多了" @load="onLoad">
          <div v-for="service in serviceList" :key="service._id" class="service-card" @click="goToDetail(service._id)">
            <div class="service-header">
              <van-image round :src="service.photos[0]?.url || defaultAvatar" class="service-avatar" />
              <div class="service-info">
                <h3 class="service-name">{{ service.name }}</h3>
                <div class="service-meta">
                  <van-tag v-if="service.isVerified" type="success" size="small">已认证</van-tag>
                  <van-tag :type="getTypeColor(service.type)" plain>{{ getTypeLabel(service.type) }}</van-tag>
                </div>
                <div class="service-rating">
                  <van-rate :value="service.rating?.average || 0" :size="12" allow-half void />
                  <span class="rating-text">{{ service.rating?.average || 0 }}</span>
                  <span class="rating-count">({{ service.rating?.count || 0 }}条评价)</span>
                </div>
              </div>
            </div>
            <div class="service-body">
              <div class="service-services">
                <van-tag v-for="(s, index) in service.services.slice(0, 3)" :key="s.name">{{ s.name }}</van-tag>
              </div>
              <div class="service-location">
                <van-icon name="location-o" size="14" />
                <span>{{ service.serviceArea?.join(', ') || '全小区' }}</span>
              </div>
            </div>
            <div class="service-footer">
              <div class="price-section">
                <span class="price-label">参考价格</span>
                <span class="price-value">¥{{ service.price }}/次</span>
              </div>
              <van-button 
                type="primary" 
                size="small" 
                round 
                plain 
                @click="goToBook(service)"
              >
                预约服务
              </van-button>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
    </div>

    <div v-if="activeTab === 1" class="tab-content">
      <div class="filter-bar">
        <van-dropdown-menu v-model="filterType" :title="服务类型">
          <van-dropdown-item v-model="filterType" :options="typeOptions" />
        </van-dropdown-menu>
        <van-dropdown-menu v-model="filterSort" :title="排序方式">
          <van-dropdown-item v-model="filterSort" :options="sortOptions" />
        </van-dropdown-menu>
      </div>

      <van-pull-refresh v-model="loading" @refresh="onRefresh">
        <van-list v-model="loading="listLoading" :finished="finished" finished-text="没有更多了" @load="onLoad">
          <div v-for="service in serviceList" :key="service._id" class="service-card" @click="goToDetail(service._id)">
            <div class="service-header">
              <van-image round :src="service.photos[0]?.url || defaultAvatar" class="service-avatar" />
              <div class="service-info">
                <h3 class="service-name">{{ service.name }}</h3>
                <van-tag v-if="service.isVerified" type="success" size="small">已认证</van-tag>
                <span class="service-location">{{ service.serviceArea?.join(', ') || '全小区' }}</span>
              </div>
            </div>
            <div class="service-body">
              <div class="service-services">
                <van-tag v-for="(s, index) in service.services.slice(0, 3)" :key="s.name">{{ s.name }}</van-tag>
              </div>
              <div class="price-info">
                <span class="price-label">参考价格</span>
                <span class="price-value">¥{{ service.price }}/次</span>
                <span class="price-unit">/次</span>
              </div>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
    </div>

    <van-empty v-if="serviceList.length === 0 && !loading" :description="暂无服务" />
  </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Toast } from 'vant';
import housekeepingApi from '@/api/housekeepingApi';

const router = useRouter();
const defaultAvatar = 'https://fastly.jsdelivr.net/npm/@vant/assets/icon.png';

const activeTab = ref(0);
const filterType = ref('all');
const filterSort = ref('rating');
const serviceList = ref([]);
const loading = ref(false);
const listLoading = ref(false);
const finished = ref(false);
const page = ref(1);

const typeOptions = [
  { text: '全部类型', value: 'all' },
  { text: '保洁服务', value: 'cleaning' },
  { text: '月嫂服务', value: 'nanny' },
  { text: '保姆服务', value: 'babysitter' },
  { text: '老人服务', value: 'elderly' },
];

const sortOptions = [
  { text: '评分优先', value: 'rating' },
  { text: '最新发布', value: 'createdAt' },
  { text: '距离优先', value: 'distance' },
];

const filteredList = computed(() => {
  let list = serviceList.value;
  
  if (filterType.value !== 'all') {
    list = list.filter(s => s.type === filterType.value);
  }
  
  if (filterSort.value === 'rating') {
    list = [...list].sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
  } else if (filterSort.value === 'createdAt') {
    list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  return list;
});

const onClickLeft = () => router.back();

const onSearch = () => {
  router.push('/mobile/convenience/housekeeping/search');
};

const onRefresh = async () => {
  page.value = 1;
  serviceList.value = [];
  finished.value = false;
  await loadServices();
  loading.value = false;
};

const onLoad = async () => {
  if (!finished.value) {
    page.value += 1;
    await loadServices();
  }
};

const loadServices = async () => {
  listLoading.value = true;
  try {
    const params = { 
      page: page.value, 
      limit: 10,
      ...(filterType.value !== 'all' && { type: filterType.value }),
      ...(filterSort.value && { sortBy: filterSort.value }),
    };
    const res = await housekeepingApi.getProviders(params);
    if (res.success) {
      serviceList.value = [...serviceList.value, ...res.data];
      if (res.data.length < 10) finished.value = true;
    }
  } catch (error) {
    console.error('加载服务商列表失败:', error);
    Toast.fail('加载失败');
  } finally {
    listLoading.value = false;
  }
};

const goToDetail = (id) => {
  router.push(`/mobile/convenience/housekeeping/detail/${id}`);
};

const goToBook = (service) => {
  router.push(`/mobile/convenience/housekeeping/booking/${service._id}`);
};

const getTypeLabel = (type) => {
  const labels = {
    'cleaning': '保洁服务',
    'nanny': '月嫂服务',
    'babysitter': '保姆服务',
    'elderly': '老人服务',
  };
  return labels[type] || type;
};

const getTypeColor = (type) => {
  const colors = {
    'cleaning': 'primary',
    'nanny': 'success',
    'babysitter': 'warning',
    'elderly': 'danger',
  };
  return colors[type] || 'default';
};

onMounted(() => {
  loadServices();
});
</script>

<style scoped>
.housekeeping-list {
  min-height: 100vh;
  background: #E3F2FD;
  padding-top: 46px;
}

.tabs-container {
  background: #fff;
}

.tab-content {
  min-height: calc(100vh - 100px);
}

.filter-bar {
  padding: 12px;
  background: #fff;
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.service-card {
  background: #fff;
  margin: 12px;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.08);
  cursor: pointer;
}

.service-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.service-avatar {
  width: 56px;
  height: 56px;
  margin-right: 12px;
}

.service-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 12px;
}

.service-name {
  font-size: 16px;
  font-weight: 600;
  color: #1A3320;
}

.service-meta {
  display: flex;
  align-items: center;
  gap: 4px;
}

.service-rating {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rating-text {
  font-size: 12px;
  color: #F59E0B;
}

.rating-count {
  font-size: 12px;
  color: #94A3B8;
}

.service-body {
  margin-top: 12px;
  margin-bottom: 16px;
}

.service-services {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.service-location {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #718096;
}

.price-section {
  padding-top: 12px;
  border-top: 1px solid #E0E7FF;
}

.price-label {
  font-size: 14px;
  color: #718096;
  margin-right: 8px;
}

.price-value {
  font-size: 18px;
  font-weight: 600;
  color: #1976D2;
}

.price-unit {
  font-size: 14px;
  color: #94A3B8;
}

.service-footer {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #E0E7FF;
  padding-top: 12px;
}
</style>
