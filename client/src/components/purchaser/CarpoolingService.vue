<template>
  <div class="carpooling-service">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><Van /></el-icon>
            <span>拼车服务</span>
            <el-tag type="success" size="small" v-if="locationInfo">
              {{ locationInfo.city || '附近' }}
            </el-tag>
          </div>
          <div class="header-right">
            <el-button type="primary" text @click="handleRefresh">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button type="primary" @click="showPublishDialog">
              <el-icon><Plus /></el-icon>
              发布拼车
            </el-button>
          </div>
        </div>
      </template>

      <!-- 拼车类型切换 -->
      <div class="type-tabs">
        <el-radio-group v-model="activeType" @change="handleFilter">
          <el-radio-button label="all"> 全部 </el-radio-button>
          <el-radio-button label="driver"> 我要开车 </el-radio-button>
          <el-radio-button label="passenger"> 我要乘车 </el-radio-button>
        </el-radio-group>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-section">
        <el-input
          v-model="filters.departure"
          placeholder="出发地"
          style="width: 160px"
          clearable
          @keyup.enter="handleFilter"
        >
          <template #prefix>
            <el-icon><Location /></el-icon>
          </template>
        </el-input>
        <el-input
          v-model="filters.destination"
          placeholder="目的地"
          style="width: 160px"
          clearable
          @keyup.enter="handleFilter"
        >
          <template #prefix>
            <el-icon><Location /></el-icon>
          </template>
        </el-input>
        <el-date-picker
          v-model="filters.date"
          type="date"
          placeholder="出发日期"
          style="width: 160px"
          @change="handleFilter"
          clearable
        />
        <el-select
          v-model="filters.seats"
          placeholder="座位数"
          style="width: 120px"
          clearable
          @change="handleFilter"
        >
          <el-option label="1座" :value="1" />
          <el-option label="2座" :value="2" />
          <el-option label="3座" :value="3" />
          <el-option label="4座+" :value="4" />
        </el-select>
        <el-select
          v-model="filters.priceRange"
          placeholder="价格区间"
          style="width: 140px"
          clearable
          @change="handleFilter"
        >
          <el-option label="50元以下" :value="{ min: 0, max: 50 }" />
          <el-option label="50-100元" :value="{ min: 50, max: 100 }" />
          <el-option label="100-200元" :value="{ min: 100, max: 200 }" />
          <el-option label="200元以上" :value="{ min: 200, max: 9999 }" />
        </el-select>
        <el-button type="primary" @click="handleFilter">
          <el-icon><Search /></el-icon>
          筛选
        </el-button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在搜索拼车信息...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="filteredCarpools.length === 0" class="empty-container">
        <el-empty description="暂无拼车信息">
          <el-button type="primary" @click="showPublishDialog"> 发布拼车信息 </el-button>
        </el-empty>
      </div>

      <!-- 拼车列表 -->
      <div v-else class="carpools-container">
        <div v-for="carpool in filteredCarpools" :key="carpool._id" class="carpool-card">
          <!-- 用户信息 -->
          <div class="carpool-header">
            <div class="user-info">
              <el-avatar :size="50" :src="carpool.publisher.avatar || defaultAvatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              <div class="user-details">
                <div class="user-name">
                  {{ carpool.publisher.name }}
                  <el-rate
                    v-model="carpool.publisher.rating"
                    disabled
                    show-score
                    text-color="#ff9900"
                    score-template="{value}"
                    size="small"
                  />
                </div>
                <div class="user-meta">
                  <el-tag :type="carpool.type === 'driver' ? 'success' : 'warning'" size="small">
                    {{ carpool.type === 'driver' ? '车主' : '乘客' }}
                  </el-tag>
                  <span class="publish-time">
                    {{ formatTime(cpool.publishTime) }}
                  </span>
                  <span class="verified" v-if="carpool.publisher.verified">
                    <el-icon><CircleCheck /></el-icon>
                    已认证
                  </span>
                </div>
              </div>
            </div>
            <div class="carpool-type-badge" :class="carpool.type">
              <el-icon><van v-if="carpool.type === 'driver'" /><User v-else /></el-icon>
              {{ carpool.type === 'driver' ? '车主发布' : '乘客求车' }}
            </div>
          </div>

          <!-- 路线信息 -->
          <div class="route-info">
            <div class="route-item">
              <div class="route-label">
                <el-icon><Location /></el-icon>
                出发地
              </div>
              <div class="route-value">{{ carpool.departure }}</div>
            </div>
            <div class="route-arrow">
              <el-icon><Right /></el-icon>
              <span class="route-distance">约{{ carpool.distance }}km</span>
            </div>
            <div class="route-item">
              <div class="route-label">
                <el-icon><Location /></el-icon>
                目的地
              </div>
              <div class="route-value">{{ carpool.destination }}</div>
            </div>
          </div>

          <!-- 出行信息 -->
          <div class="trip-info">
            <div class="info-item">
              <el-icon><Clock /></el-icon>
              <div class="info-content">
                <span class="info-label">出发时间</span>
                <span class="info-value">{{ carpool.departureTime }}</span>
              </div>
            </div>
            <div class="info-item" v-if="carpool.type === 'driver'">
              <el-icon><User /></el-icon>
              <div class="info-content">
                <span class="info-label">可载人数</span>
                <span class="info-value"
                  >{{ carpool.availableSeats }}/{{ carpool.totalSeats }}人</span
                >
              </div>
            </div>
            <div class="info-item" v-else>
              <el-icon><User /></el-icon>
              <div class="info-content">
                <span class="info-label">乘车人数</span>
                <span class="info-value">{{ carpool.passengerCount }}人</span>
              </div>
            </div>
            <div class="info-item">
              <el-icon><Wallet /></el-icon>
              <div class="info-content">
                <span class="info-label">费用</span>
                <span class="info-value price">¥{{ carpool.price }}/人</span>
              </div>
            </div>
          </div>

          <!-- 车辆信息（车主发布） -->
          <div class="vehicle-info" v-if="carpool.type === 'driver' && carpool.vehicle">
            <div class="vehicle-item">
              <span class="vehicle-label">车型：</span>
              <span class="vehicle-value">{{ carpool.vehicle.model }}</span>
            </div>
            <div class="vehicle-item">
              <span class="vehicle-label">车牌：</span>
              <span class="vehicle-value">{{ carpool.vehicle.plateNumber }}</span>
            </div>
            <div class="vehicle-item">
              <span class="vehicle-label">颜色：</span>
              <span class="vehicle-value">{{ carpool.vehicle.color }}</span>
            </div>
          </div>

          <!-- 备注信息 -->
          <div class="remark" v-if="carpool.remark">
            <el-icon><ChatDotRound /></el-icon>
            <span>{{ carpool.remark }}</span>
          </div>

          <!-- 操作按钮 -->
          <div class="carpool-actions">
            <el-button size="small" @click="handleContact(carpool)">
              <el-icon><ChatDotRound /></el-icon>
              联系
            </el-button>
            <el-button size="small" @click="handleViewDetail(carpool)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button size="small" type="primary" @click="handleJoin(carpool)">
              <el-icon><Check /></el-icon>
              {{ carpool.type === 'driver' ? '预约乘车' : '接受拼车' }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div class="load-more" v-if="hasMore && !loading">
        <el-button @click="loadMore" :loading="loadingMore"> 加载更多 </el-button>
      </div>
    </el-card>

    <!-- 发布拼车对话框 -->
    <el-dialog v-model="publishDialogVisible" title="发布拼车信息" width="600px">
      <el-form :model="publishForm" label-width="100px" ref="publishFormRef">
        <el-form-item label="拼车类型" required>
          <el-radio-group v-model="publishForm.type">
            <el-radio label="driver">我是车主，找人拼车</el-radio>
            <el-radio label="passenger">我是乘客，找车拼车</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="出发地" required>
          <el-input v-model="publishForm.departure" placeholder="请输入出发地" />
        </el-form-item>
        <el-form-item label="目的地" required>
          <el-input v-model="publishForm.destination" placeholder="请输入目的地" />
        </el-form-item>
        <el-form-item label="出发日期" required>
          <el-date-picker
            v-model="publishForm.date"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="出发时间" required>
          <el-time-picker v-model="publishForm.time" placeholder="选择时间" style="width: 100%" />
        </el-form-item>
        <el-form-item label="座位数" required v-if="publishForm.type === 'driver'">
          <el-input-number v-model="publishForm.availableSeats" :min="1" :max="7" />
        </el-form-item>
        <el-form-item label="乘车人数" required v-else>
          <el-input-number v-model="publishForm.passengerCount" :min="1" :max="6" />
        </el-form-item>
        <el-form-item label="费用（元/人）" required>
          <el-input-number v-model="publishForm.price" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="车型" v-if="publishForm.type === 'driver'">
          <el-input v-model="publishForm.vehicleModel" placeholder="如：大众帕萨特" />
        </el-form-item>
        <el-form-item label="车牌号" v-if="publishForm.type === 'driver'">
          <el-input v-model="publishForm.plateNumber" placeholder="请输入车牌号" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="publishForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息（选填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePublish" :loading="publishing">
          确认发布
        </el-button>
      </template>
    </el-dialog>

    <!-- 拼车详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="拼车详情" width="700px">
      <div class="carpool-detail" v-if="currentCarpool">
        <!-- 发布者信息 -->
        <div class="detail-publisher">
          <el-avatar :size="60" :src="currentCarpool.publisher.avatar || defaultAvatar">
            <el-icon><User /></el-icon>
          </el-avatar>
          <div class="publisher-info">
            <div class="publisher-name">{{ currentCarpool.publisher.name }}</div>
            <div class="publisher-meta">
              <el-rate
                v-model="currentCarpool.publisher.rating"
                disabled
                show-score
                text-color="#ff9900"
              />
              <span class="success-rate">成功率 {{ currentCarpool.publisher.successRate }}%</span>
            </div>
          </div>
        </div>

        <!-- 详细信息 -->
        <el-descriptions :column="2" border>
          <el-descriptions-item label="拼车类型">
            <el-tag :type="currentCarpool.type === 'driver' ? 'success' : 'warning'">
              {{ currentCarpool.type === 'driver' ? '车主发布' : '乘客求车' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发布时间">
            {{ formatTime(currentCarpool.publishTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="出发地" :span="2">
            {{ currentCarpool.departure }}
          </el-descriptions-item>
          <el-descriptions-item label="目的地" :span="2">
            {{ currentCarpool.destination }}
          </el-descriptions-item>
          <el-descriptions-item label="出发时间" :span="2">
            {{ currentCarpool.departureTime }}
          </el-descriptions-item>
          <el-descriptions-item label="座位/人数">
            {{
              currentCarpool.type === 'driver'
                ? `${currentCarpool.availableSeats}/${currentCarpool.totalSeats}座`
                : `${currentCarpool.passengerCount}人`
            }}
          </el-descriptions-item>
          <el-descriptions-item label="费用"> ¥{{ currentCarpool.price }}/人 </el-descriptions-item>
          <el-descriptions-item label="车型" v-if="currentCarpool.type === 'driver'">
            {{ currentCarpool.vehicle?.model || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="车牌" v-if="currentCarpool.type === 'driver'">
            {{ currentCarpool.vehicle?.plateNumber || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2" v-if="currentCarpool.remark">
            {{ currentCarpool.remark }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleJoin(currentCarpool)">
          {{ currentCarpool?.type === 'driver' ? '预约乘车' : '接受拼车' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  Van,
  Refresh,
  Plus,
  Location,
  Search,
  Loading,
  Right,
  Clock,
  Wallet,
  ChatDotRound,
  View,
  Check,
  CircleCheck,
  User,
} from '@element-plus/icons-vue';
import api from '@/api';

const router = useRouter();

const props = defineProps({
  purchaserId: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['contact', 'join', 'publish']);

const loading = ref(false);
const loadingMore = ref(false);
const publishing = ref(false);
const activeType = ref('all');
const publishDialogVisible = ref(false);
const detailDialogVisible = ref(false);
const currentCarpool = ref(null);
const locationInfo = ref({ city: '杭州市' });
const hasMore = ref(true);

const defaultAvatar =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23e0e0e0"/%3E%3C/svg%3E';

const filters = reactive({
  departure: '',
  destination: '',
  date: null,
  seats: null,
  priceRange: null,
});

const publishForm = reactive({
  type: 'driver',
  departure: '',
  destination: '',
  date: null,
  time: null,
  availableSeats: 3,
  passengerCount: 1,
  price: 50,
  vehicleModel: '',
  plateNumber: '',
  remark: '',
});

// 模拟拼车数据
const carpoolData = ref([
  {
    _id: '1',
    type: 'driver',
    departure: '杭州市西湖区',
    destination: '宁波市海曙区',
    departureTime: '2024-01-15 08:00',
    distance: 145,
    price: 80,
    totalSeats: 4,
    availableSeats: 2,
    publishTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    remark: '车内干净整洁，准时出发，可商议上车地点',
    publisher: {
      name: '张师傅',
      avatar: '',
      rating: 4.8,
      successRate: 98,
      verified: true,
    },
    vehicle: {
      model: '大众帕萨特',
      plateNumber: '浙A·12345',
      color: '黑色',
    },
  },
  {
    _id: '2',
    type: 'passenger',
    departure: '杭州市余杭区',
    destination: '湖州市吴兴区',
    departureTime: '2024-01-15 14:30',
    distance: 85,
    price: 60,
    passengerCount: 2,
    publishTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
    remark: '两人同行，行李不多，希望找到可靠的车主',
    publisher: {
      name: '李女士',
      avatar: '',
      rating: 4.6,
      successRate: 95,
      verified: true,
    },
  },
  {
    _id: '3',
    type: 'driver',
    departure: '杭州市滨江区',
    destination: '绍兴市越城区',
    departureTime: '2024-01-15 09:30',
    distance: 52,
    price: 45,
    totalSeats: 5,
    availableSeats: 3,
    publishTime: new Date(Date.now() - 30 * 60 * 1000),
    remark: '可以带宠物，车内禁烟',
    publisher: {
      name: '王先生',
      avatar: '',
      rating: 4.9,
      successRate: 99,
      verified: true,
    },
    vehicle: {
      model: '别克GL8',
      plateNumber: '浙A·67890',
      color: '白色',
    },
  },
  {
    _id: '4',
    type: 'passenger',
    departure: '杭州市萧山区',
    destination: '嘉兴市南湖区',
    departureTime: '2024-01-15 16:00',
    distance: 78,
    price: 55,
    passengerCount: 1,
    publishTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
    remark: '一个人出行，行李较少，分摊油费',
    publisher: {
      name: '赵先生',
      avatar: '',
      rating: 4.5,
      successRate: 92,
      verified: false,
    },
  },
  {
    _id: '5',
    type: 'driver',
    departure: '杭州市拱墅区',
    destination: '台州市椒江区',
    departureTime: '2024-01-15 07:00',
    distance: 210,
    price: 150,
    totalSeats: 4,
    availableSeats: 1,
    publishTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
    remark: '长途出行，需要副驾驶轮流驾驶',
    publisher: {
      name: '刘师傅',
      avatar: '',
      rating: 4.7,
      successRate: 96,
      verified: true,
    },
    vehicle: {
      model: '丰田凯美瑞',
      plateNumber: '浙A·24680',
      color: '银色',
    },
  },
]);

const filteredCarpools = ref([]);

// 格式化时间
const formatTime = time => {
  const now = new Date();
  const diff = now - new Date(time);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours < 1) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else {
    return new Date(time).toLocaleDateString();
  }
};

// 筛选拼车
const handleFilter = () => {
  loading.value = true;

  setTimeout(() => {
    let filtered = [...carpoolData.value];

    // 按类型筛选
    if (activeType.value !== 'all') {
      filtered = filtered.filter(c => c.type === activeType.value);
    }

    // 按出发地筛选
    if (filters.departure) {
      filtered = filtered.filter(c => c.departure.includes(filters.departure));
    }

    // 按目的地筛选
    if (filters.destination) {
      filtered = filtered.filter(c => c.destination.includes(filters.destination));
    }

    // 按价格筛选
    if (filters.priceRange) {
      filtered = filtered.filter(
        c => c.price >= filters.priceRange.min && c.price <= filters.priceRange.max
      );
    }

    // 按座位数筛选
    if (filters.seats && activeType.value !== 'passenger') {
      filtered = filtered.filter(c =>
        c.type === 'driver' ? c.availableSeats >= filters.seats : true
      );
    }

    // 按发布时间排序
    filtered.sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime));

    filteredCarpools.value = filtered.slice(0, 10);
    hasMore.value = filtered.length > 10;

    loading.value = false;
  }, 300);
};

// 刷新
const handleRefresh = () => {
  handleFilter();
};

// 显示发布对话框
const showPublishDialog = () => {
  publishDialogVisible.value = true;
};

// 发布拼车
const handlePublish = () => {
  if (
    !publishForm.departure ||
    !publishForm.destination ||
    !publishForm.date ||
    !publishForm.time
  ) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  publishing.value = true;

  // 模拟发布
  setTimeout(() => {
    const newCarpool = {
      _id: Date.now().toString(),
      type: publishForm.type,
      departure: publishForm.departure,
      destination: publishForm.destination,
      departureTime: `${publishForm.date.toLocaleDateString()} ${publishForm.time.toLocaleTimeString()}`,
      distance: Math.floor(Math.random() * 200) + 20,
      price: publishForm.price,
      totalSeats: publishForm.type === 'driver' ? publishForm.availableSeats : 0,
      availableSeats: publishForm.type === 'driver' ? publishForm.availableSeats : 0,
      passengerCount: publishForm.type === 'passenger' ? publishForm.passengerCount : 0,
      publishTime: new Date(),
      remark: publishForm.remark,
      publisher: {
        name: '我',
        avatar: '',
        rating: 5.0,
        successRate: 100,
        verified: true,
      },
    };

    if (publishForm.type === 'driver') {
      newCarpool.vehicle = {
        model: publishForm.vehicleModel,
        plateNumber: publishForm.plateNumber,
        color: '未知',
      };
    }

    carpoolData.value.unshift(newCarpool);
    emit('publish', newCarpool);

    ElMessage.success('发布成功！');
    publishing.value = false;
    publishDialogVisible.value = false;

    // 重置表单
    Object.assign(publishForm, {
      type: 'driver',
      departure: '',
      destination: '',
      date: null,
      time: null,
      availableSeats: 3,
      passengerCount: 1,
      price: 50,
      vehicleModel: '',
      plateNumber: '',
      remark: '',
    });

    handleFilter();
  }, 1000);
};

// 联系
const handleContact = carpool => {
  emit('contact', carpool);
  ElMessage.success(`正在联系${carpool.publisher.name}...`);
};

// 查看详情
const handleViewDetail = carpool => {
  currentCarpool.value = carpool;
  detailDialogVisible.value = true;
};

// 加入拼车
const handleJoin = carpool => {
  emit('join', carpool);
  ElMessage.success(
    carpool.type === 'driver'
      ? `已向${carpool.publisher.name}发送乘车请求`
      : `已接受${carpool.publisher.name}的拼车请求`
  );
  detailDialogVisible.value = false;
};

// 加载更多
const loadMore = () => {
  loadingMore.value = true;
  setTimeout(() => {
    loadingMore.value = false;
    hasMore.value = false;
    ElMessage.success('没有更多了');
  }, 1000);
};

onMounted(() => {
  handleFilter();
});
</script>

<style scoped>
.carpooling-service {
  height: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  gap: 8px;
}

/* 类型切换 */
.type-tabs {
  margin: 20px 0;
}

/* 筛选栏 */
.filter-section {
  display: flex;
  gap: 12px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 16px;
  color: #909399;
}

.loading-container .el-icon {
  font-size: 32px;
}

.empty-container {
  padding: 40px;
}

/* 拼车卡片 */
.carpools-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}

.carpool-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s;
  background: white;
}

.carpool-card:hover {
  border-color: #67c23a;
  box-shadow: 0 4px 16px rgba(103, 194, 58, 0.2);
}

.carpool-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.user-info {
  display: flex;
  gap: 12px;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #909399;
}

.publish-time {
  font-size: 12px;
  color: #909399;
}

.verified {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #67c23a;
  font-size: 12px;
}

.carpool-type-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.carpool-type-badge.driver {
  background: #f0f9ff;
  color: #67c23a;
}

.carpool-type-badge.passenger {
  background: #fef9e7;
  color: #e6a23c;
}

/* 路线信息 */
.route-info {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.route-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.route-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}

.route-value {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.route-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #409eff;
}

.route-distance {
  font-size: 12px;
  color: #909399;
}

/* 出行信息 */
.trip-info {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 12px;
  color: #909399;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.info-value.price {
  color: #f56c6c;
  font-weight: 600;
}

/* 车辆信息 */
.vehicle-info {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 8px;
  flex-wrap: wrap;
}

.vehicle-item {
  font-size: 13px;
  color: #606266;
}

.vehicle-label {
  color: #909399;
  margin-right: 4px;
}

.vehicle-value {
  color: #303133;
  font-weight: 500;
}

/* 备注 */
.remark {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #fef9e7;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

/* 操作按钮 */
.carpool-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f5f7fa;
}

.carpool-actions .el-button {
  flex: 1;
}

/* 加载更多 */
.load-more {
  margin-top: 20px;
  text-align: center;
}

/* 详情对话框 */
.carpool-detail {
  padding: 8px 0;
}

.detail-publisher {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.publisher-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.publisher-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.publisher-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.success-rate {
  font-size: 14px;
  color: #67c23a;
  font-weight: 500;
}

@media (max-width: 768px) {
  .filter-section {
    flex-direction: column;
  }

  .filter-section .el-input,
  .filter-section .el-select,
  .filter-section .el-date-picker,
  .filter-section .el-button {
    width: 100% !important;
  }

  .route-info {
    flex-direction: column;
    gap: 8px;
  }

  .route-arrow {
    transform: rotate(90deg);
  }

  .trip-info {
    flex-direction: column;
    gap: 12px;
  }

  .carpool-actions {
    flex-direction: column;
  }
}
</style>
