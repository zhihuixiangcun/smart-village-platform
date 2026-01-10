<template>
  <div class="transportation-services">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><Van /></el-icon>
            <span>附近交通服务</span>
            <el-tag type="primary" size="small" v-if="locationInfo">
              {{ locationInfo.city || '附近' }}
            </el-tag>
          </div>
          <div class="header-right">
            <el-button type="primary" text @click="handleRefresh">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button type="primary" text @click="handleMapView">
              <el-icon><MapLocation /></el-icon>
              地图
            </el-button>
          </div>
        </div>
      </template>

      <!-- 交通类型标签 -->
      <div class="transport-tabs">
        <div
          v-for="type in transportTypes"
          :key="type.key"
          class="transport-tab"
          :class="{ active: activeType === type.key }"
          @click="switchType(type.key)"
        >
          <div class="tab-icon" :style="{ background: type.color }">
            <component :is="type.icon" />
          </div>
          <span class="tab-label">{{ type.label }}</span>
          <span class="tab-count" v-if="type.count > 0">({{ type.count }})</span>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-section">
        <el-select
          v-model="filters.distance"
          placeholder="距离范围"
          style="width: 140px"
          @change="handleFilter"
        >
          <el-option label="5公里内" :value="5" />
          <el-option label="10公里内" :value="10" />
          <el-option label="20公里内" :value="20" />
          <el-option label="50公里内" :value="50" />
        </el-select>
        <el-select
          v-model="filters.sortBy"
          placeholder="排序方式"
          style="width: 130px"
          @change="handleFilter"
          v-if="activeType === 'flight'"
        >
          <el-option label="时间最早" value="time" />
          <el-option label="价格最低" value="price" />
        </el-select>
        <el-select
          v-model="filters.priceRange"
          placeholder="价格区间"
          style="width: 140px"
          @change="handleFilter"
          clearable
          v-if="activeType !== 'bus'"
        >
          <el-option label="100元以下" :value="{ min: 0, max: 100 }" />
          <el-option label="100-300元" :value="{ min: 100, max: 300 }" />
          <el-option label="300-500元" :value="{ min: 300, max: 500 }" />
          <el-option label="500元以上" :value="{ min: 500, max: 9999 }" />
        </el-select>
        <el-date-picker
          v-model="filters.date"
          type="date"
          placeholder="选择日期"
          style="width: 160px"
          @change="handleFilter"
          v-if="activeType !== 'bus'"
        />
        <el-button type="primary" @click="handleFilter">
          <el-icon><Search /></el-icon>
          筛选
        </el-button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在搜索附近的{{ currentTypeLabel }}...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="filteredServices.length === 0" class="empty-container">
        <el-empty :description="`附近暂无${currentTypeLabel}信息`">
          <el-button type="primary" @click="expandSearch"> 扩大搜索范围 </el-button>
        </el-empty>
      </div>

      <!-- 航班列表 -->
      <div v-else-if="activeType === 'flight'" class="flights-container">
        <div v-for="flight in filteredServices" :key="flight._id" class="flight-card">
          <div class="flight-header">
            <div class="airport-info">
              <div class="airport-name">
                <el-icon><Location /></el-icon>
                {{ flight.airportName }}
              </div>
              <div class="airport-distance">距离 {{ flight.distance?.toFixed(1) }}km</div>
            </div>
            <el-tag type="success" size="small" v-if="flight.available"> 有票 </el-tag>
            <el-tag type="danger" size="small" v-else> 售罄 </el-tag>
          </div>

          <div class="flight-info">
            <div class="flight-route">
              <div class="route-item">
                <div class="city-code">{{ flight.departureCode }}</div>
                <div class="city-name">{{ flight.departureCity }}</div>
                <div class="flight-time">{{ flight.departureTime }}</div>
              </div>
              <div class="route-arrow">
                <el-icon><DArrowRight /></el-icon>
                <div class="flight-duration">约{{ flight.duration }}小时</div>
                <div class="flight-number">{{ flight.flightNumber }}</div>
              </div>
              <div class="route-item">
                <div class="city-code">{{ flight.arrivalCode }}</div>
                <div class="city-name">{{ flight.arrivalCity }}</div>
                <div class="flight-time">{{ flight.arrivalTime }}</div>
              </div>
            </div>
          </div>

          <div class="flight-footer">
            <div class="price-info">
              <span class="price-label">起</span>
              <span class="price-value">¥{{ flight.price }}</span>
            </div>
            <div class="flight-actions">
              <el-button size="small" @click="handleNavigate(flight)">
                <el-icon><Location /></el-icon>
                导航
              </el-button>
              <el-button size="small" type="primary" @click="handleBook(flight, 'flight')">
                <el-icon><ShoppingCart /></el-icon>
                预订
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 高铁列表 -->
      <div v-else-if="activeType === 'train'" class="trains-container">
        <div v-for="train in filteredServices" :key="train._id" class="train-card">
          <div class="train-header">
            <div class="station-info">
              <div class="station-name">
                <el-icon><Location /></el-icon>
                {{ train.stationName }}
              </div>
              <div class="station-distance">距离 {{ train.distance?.toFixed(1) }}km</div>
            </div>
            <el-tag :type="train.available ? 'success' : 'danger'" size="small">
              {{ train.available ? '有票' : '售罄' }}
            </el-tag>
          </div>

          <div class="train-info">
            <div class="train-route">
              <div class="route-item">
                <div class="station-code">{{ train.departureStation }}</div>
                <div class="departure-time">{{ train.departureTime }}</div>
              </div>
              <div class="route-arrow">
                <el-icon><DArrowRight /></el-icon>
                <div class="train-number">{{ train.trainNumber }}</div>
                <div class="train-type">{{ train.trainType }}</div>
                <div class="duration">约{{ train.duration }}分钟</div>
              </div>
              <div class="route-item">
                <div class="station-code">{{ train.arrivalStation }}</div>
                <div class="arrival-time">{{ train.arrivalTime }}</div>
              </div>
            </div>
          </div>

          <div class="train-seats">
            <div
              v-for="seat in train.seats"
              :key="seat.type"
              class="seat-item"
              :class="{ 'sold-out': seat.count === 0 }"
            >
              <span class="seat-type">{{ seat.type }}</span>
              <span class="seat-price">¥{{ seat.price }}</span>
              <span class="seat-count">{{ seat.count > 0 ? `${seat.count}张` : '无' }}</span>
            </div>
          </div>

          <div class="train-footer">
            <div class="price-range">最低 ¥{{ train.lowestPrice }}</div>
            <div class="train-actions">
              <el-button size="small" @click="handleNavigate(train)">
                <el-icon><Location /></el-icon>
                导航
              </el-button>
              <el-button size="small" type="primary" @click="handleBook(train, 'train')">
                <el-icon><ShoppingCart /></el-icon>
                预订
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 巴士列表 -->
      <div v-else-if="activeType === 'bus'" class="buses-container">
        <div v-for="bus in filteredServices" :key="bus._id" class="bus-card">
          <div class="bus-header">
            <div class="station-info">
              <div class="station-name">
                <el-icon><Location /></el-icon>
                {{ bus.stationName }}
              </div>
              <div class="station-distance">距离 {{ bus.distance?.toFixed(1) }}km</div>
            </div>
            <el-tag type="info" size="small"> 客运站 </el-tag>
          </div>

          <div class="bus-info">
            <div class="bus-route">
              <div class="route-lines">
                <div class="route-line-item" v-for="route in bus.routes" :key="route._id">
                  <div class="route-header">
                    <span class="route-name">{{ route.name }}</span>
                    <el-tag size="small" type="warning">{{ route.frequency }}</el-tag>
                  </div>
                  <div class="route-details">
                    <div class="route-stops">
                      <span>{{ route.departure }}</span>
                      <el-icon><Right /></el-icon>
                      <span>{{ route.arrival }}</span>
                    </div>
                    <div class="route-schedule">
                      首班：{{ route.firstBus }} | 末班：{{ route.lastBus }}
                    </div>
                    <div class="route-price">票价：¥{{ route.price }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bus-footer">
            <el-button size="small" @click="handleNavigate(bus)">
              <el-icon><Location /></el-icon>
              导航
            </el-button>
            <el-button size="small" type="primary" @click="handleCall(bus)">
              <el-icon><Phone /></el-icon>
              咨询
            </el-button>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div class="load-more" v-if="hasMore && !loading">
        <el-button @click="loadMore" :loading="loadingMore"> 加载更多 </el-button>
      </div>
    </el-card>

    <!-- 地图视图对话框 -->
    <el-dialog v-model="mapDialogVisible" title="附近交通设施地图" width="90%" top="5vh">
      <div class="map-container" id="transportMap">
        <div class="map-placeholder">
          <el-icon><MapLocation /></el-icon>
          <p>地图功能开发中</p>
          <p class="map-tip">将在地图上显示所有交通设施位置</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="mapDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 预订对话框 -->
    <el-dialog
      v-model="bookingDialogVisible"
      :title="`预订${currentBooking?.type === 'flight' ? '航班' : '高铁'}`"
      width="600px"
    >
      <el-form :model="bookingForm" label-width="100px" v-if="currentBooking">
        <el-form-item label="班次">
          <el-input
            :value="currentBooking.item.flightNumber || currentBooking.item.trainNumber"
            disabled
          />
        </el-form-item>
        <el-form-item label="出发时间">
          <el-input
            :value="`${currentBooking.item.departureTime} - ${currentBooking.item.arrivalTime}`"
            disabled
          />
        </el-form-item>
        <el-form-item label="乘客姓名" required>
          <el-input v-model="bookingForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="身份证号" required>
          <el-input v-model="bookingForm.idCard" placeholder="请输入身份证号" />
        </el-form-item>
        <el-form-item label="手机号码" required>
          <el-input v-model="bookingForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="座位类型" v-if="currentBooking.type === 'train'">
          <el-select v-model="bookingForm.seatType" placeholder="选择座位类型">
            <el-option
              v-for="seat in currentBooking.item.seats"
              :key="seat.type"
              :label="`${seat.type} ¥${seat.price}`"
              :value="seat.type"
              :disabled="seat.count === 0"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="bookingForm.count" :min="1" :max="9" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bookingDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBooking">确认预订</el-button>
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
  MapLocation,
  Location,
  Search,
  Loading,
  DArrowRight,
  ShoppingCart,
  Right,
  Phone,
} from '@element-plus/icons-vue';
import api from '@/api';

const router = useRouter();

const props = defineProps({
  purchaserId: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['navigate', 'book']);

const loading = ref(false);
const loadingMore = ref(false);
const activeType = ref('all');
const mapDialogVisible = ref(false);
const bookingDialogVisible = ref(false);
const currentBooking = ref(null);
const locationInfo = ref({ city: '杭州市' });
const hasMore = ref(true);

const filters = reactive({
  distance: 20,
  sortBy: 'time',
  priceRange: null,
  date: new Date(),
});

const bookingForm = reactive({
  name: '',
  idCard: '',
  phone: '',
  seatType: '',
  count: 1,
});

const transportTypes = [
  {
    key: 'all',
    label: '全部',
    icon: Location,
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    count: 0,
  },
  {
    key: 'flight',
    label: '航班',
    icon: Van,
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    count: 5,
  },
  {
    key: 'train',
    label: '高铁',
    icon: Location,
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    count: 8,
  },
  {
    key: 'bus',
    label: '巴士',
    icon: Van,
    color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    count: 12,
  },
];

// 模拟航班数据
const flightsData = ref([
  {
    _id: 'f1',
    airportName: '杭州萧山国际机场',
    distance: 28.5,
    flightNumber: 'CA1234',
    departureCode: 'HGH',
    departureCity: '杭州',
    departureTime: '08:30',
    arrivalCode: 'PEK',
    arrivalCity: '北京',
    arrivalTime: '11:00',
    duration: 2.5,
    price: 680,
    available: true,
  },
  {
    _id: 'f2',
    airportName: '杭州萧山国际机场',
    distance: 28.5,
    flightNumber: 'MU5678',
    departureCode: 'HGH',
    departureCity: '杭州',
    departureTime: '14:20',
    arrivalCode: 'SHA',
    arrivalCity: '上海',
    arrivalTime: '15:30',
    duration: 1.2,
    price: 380,
    available: true,
  },
  {
    _id: 'f3',
    airportName: '杭州萧山国际机场',
    distance: 28.5,
    flightNumber: 'CZ3456',
    departureCode: 'HGH',
    departureCity: '杭州',
    departureTime: '19:45',
    arrivalCode: 'CAN',
    arrivalCity: '广州',
    arrivalTime: '22:15',
    duration: 2.5,
    price: 890,
    available: false,
  },
]);

// 模拟高铁数据
const trainsData = ref([
  {
    _id: 't1',
    stationName: '杭州东站',
    distance: 15.2,
    trainNumber: 'G1234',
    trainType: '高铁',
    departureStation: '杭州东',
    departureTime: '07:30',
    arrivalStation: '上海虹桥',
    arrivalTime: '09:12',
    duration: 102,
    lowestPrice: 73,
    available: true,
    seats: [
      { type: '二等座', price: 73, count: 120 },
      { type: '一等座', price: 117, count: 25 },
      { type: '商务座', price: 219, count: 5 },
    ],
  },
  {
    _id: 't2',
    stationName: '杭州东站',
    distance: 15.2,
    trainNumber: 'G5678',
    trainType: '高铁',
    departureStation: '杭州东',
    departureTime: '10:15',
    arrivalStation: '南京南',
    arrivalTime: '11:48',
    duration: 93,
    lowestPrice: 87,
    available: true,
    seats: [
      { type: '二等座', price: 87, count: 89 },
      { type: '一等座', price: 139, count: 12 },
      { type: '商务座', price: 260, count: 0 },
    ],
  },
  {
    _id: 't3',
    stationName: '杭州站',
    distance: 8.5,
    trainNumber: 'D2345',
    trainType: '动车',
    departureStation: '杭州',
    departureTime: '13:45',
    arrivalStation: '温州南',
    arrivalTime: '16:20',
    duration: 155,
    lowestPrice: 98,
    available: true,
    seats: [
      { type: '二等座', price: 98, count: 200 },
      { type: '一等座', price: 157, count: 45 },
    ],
  },
]);

// 模拟巴士数据
const busesData = ref([
  {
    _id: 'b1',
    stationName: '杭州汽车客运中心',
    distance: 12.8,
    routes: [
      {
        _id: 'r1',
        name: '杭州 - 宁波',
        departure: '杭州客运中心',
        arrival: '宁波汽车站',
        firstBus: '07:00',
        lastBus: '19:30',
        frequency: '30分钟一班',
        price: 68,
      },
      {
        _id: 'r2',
        name: '杭州 - 绍兴',
        departure: '杭州客运中心',
        arrival: '绍兴汽车站',
        firstBus: '06:30',
        lastBus: '20:00',
        frequency: '20分钟一班',
        price: 35,
      },
      {
        _id: 'r3',
        name: '杭州 - 嘉兴',
        departure: '杭州客运中心',
        arrival: '嘉兴汽车站',
        firstBus: '07:30',
        lastBus: '18:30',
        frequency: '40分钟一班',
        price: 42,
      },
    ],
  },
  {
    _id: 'b2',
    stationName: '杭州西站客运站',
    distance: 18.5,
    routes: [
      {
        _id: 'r4',
        name: '杭州 - 湖州',
        departure: '杭州西站',
        arrival: '湖州汽车站',
        firstBus: '08:00',
        lastBus: '17:30',
        frequency: '1小时一班',
        price: 55,
      },
      {
        _id: 'r5',
        name: '杭州 - 安吉',
        departure: '杭州西站',
        arrival: '安吉汽车站',
        firstBus: '09:00',
        lastBus: '16:00',
        frequency: '2小时一班',
        price: 48,
      },
    ],
  },
  {
    _id: 'b3',
    stationName: '萧山汽车站',
    distance: 22.3,
    routes: [
      {
        _id: 'r6',
        name: '杭州 - 台州',
        departure: '萧山汽车站',
        arrival: '台州客运中心',
        firstBus: '07:15',
        lastBus: '18:15',
        frequency: '45分钟一班',
        price: 95,
      },
    ],
  },
]);

const filteredServices = ref([]);

// 当前类型标签
const currentTypeLabel = computed(() => {
  const type = transportTypes.find(t => t.key === activeType.value);
  return type?.label || '交通';
});

// 切换类型
const switchType = key => {
  activeType.value = key;
  handleFilter();
};

// 筛选服务
const handleFilter = () => {
  loading.value = true;

  setTimeout(() => {
    let filtered = [];

    // 按类型筛选
    switch (activeType.value) {
      case 'flight':
        filtered = [...flightsData.value];
        break;
      case 'train':
        filtered = [...trainsData.value];
        break;
      case 'bus':
        filtered = [...busesData.value];
        break;
      case 'all':
        filtered = [
          ...flightsData.value.map(item => ({ ...item, type: 'flight' })),
          ...trainsData.value.map(item => ({ ...item, type: 'train' })),
          ...busesData.value.map(item => ({ ...item, type: 'bus' })),
        ];
        break;
    }

    // 按距离筛选
    if (filters.distance && activeType.value !== 'all') {
      filtered = filtered.filter(s => s.distance <= filters.distance);
    }

    // 按价格筛选
    if (filters.priceRange && activeType.value !== 'bus') {
      filtered = filtered.filter(s => {
        const price = s.lowestPrice || s.price;
        return price >= filters.priceRange.min && price <= filters.priceRange.max;
      });
    }

    // 排序
    if (activeType.value === 'flight' || activeType.value === 'all') {
      if (filters.sortBy === 'price') {
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else if (filters.sortBy === 'time') {
        filtered.sort((a, b) => {
          const timeA = parseInt(a.departureTime?.replace(':', '') || 0);
          const timeB = parseInt(b.departureTime?.replace(':', '') || 0);
          return timeA - timeB;
        });
      }
    }

    if (activeType.value === 'all') {
      filtered.sort((a, b) => a.distance - b.distance);
    }

    filteredServices.value = filtered.slice(0, 10);
    hasMore.value = filtered.length > 10;

    loading.value = false;
  }, 300);
};

// 刷新
const handleRefresh = () => {
  handleFilter();
};

// 扩大搜索范围
const expandSearch = () => {
  filters.distance = Math.min(filters.distance + 20, 100);
  handleFilter();
};

// 地图视图
const handleMapView = () => {
  mapDialogVisible.value = true;
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

// 导航
const handleNavigate = service => {
  emit('navigate', service);
  ElMessage.success(`正在为您导航到${service.airportName || service.stationName}...`);
};

// 预订
const handleBook = (item, type) => {
  currentBooking.value = { item, type };
  bookingDialogVisible.value = true;
};

// 咨询电话
const handleCall = service => {
  ElMessage.success(`正在拨打${service.stationName}咨询电话...`);
};

// 确认预订
const confirmBooking = () => {
  if (!bookingForm.name || !bookingForm.idCard || !bookingForm.phone) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  emit('book', {
    ...bookingForm,
    item: currentBooking.value.item,
    type: currentBooking.value.type,
  });

  ElMessage.success('预订成功！');
  bookingDialogVisible.value = false;

  // 重置表单
  Object.assign(bookingForm, {
    name: '',
    idCard: '',
    phone: '',
    seatType: '',
    count: 1,
  });
};

onMounted(() => {
  handleFilter();
});
</script>

<style scoped>
.transportation-services {
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

/* 交通类型标签 */
.transport-tabs {
  display: flex;
  gap: 12px;
  margin: 20px 0;
  overflow-x: auto;
  padding-bottom: 8px;
}

.transport-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
  min-width: 80px;
}

.transport-tab:hover {
  background: #f5f7fa;
  transform: translateY(-2px);
}

.transport-tab.active {
  border-color: #409eff;
  background: #f0f9ff;
}

.tab-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.tab-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.tab-count {
  font-size: 12px;
  color: #909399;
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

/* 航班卡片 */
.flights-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}

.flight-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s;
  background: white;
}

.flight-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.2);
}

.flight-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f5f7fa;
}

.airport-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.airport-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.airport-distance {
  font-size: 13px;
  color: #909399;
}

.flight-info {
  margin-bottom: 16px;
}

.flight-route {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.route-item {
  text-align: center;
  flex: 1;
}

.city-code {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 8px;
}

.city-name {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.flight-time {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.route-arrow {
  text-align: center;
  flex: 1.5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.flight-number {
  font-size: 14px;
  color: #409eff;
  font-weight: 600;
}

.flight-duration {
  font-size: 13px;
  color: #909399;
}

.flight-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f5f7fa;
}

.price-info {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.price-label {
  font-size: 13px;
  color: #909399;
}

.price-value {
  font-size: 24px;
  font-weight: 700;
  color: #f56c6c;
}

.flight-actions {
  display: flex;
  gap: 8px;
}

/* 高铁卡片 */
.trains-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}

.train-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s;
  background: white;
}

.train-card:hover {
  border-color: #67c23a;
  box-shadow: 0 4px 16px rgba(103, 194, 58, 0.2);
}

.train-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f5f7fa;
}

.station-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.station-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.station-distance {
  font-size: 13px;
  color: #909399;
}

.train-info {
  margin-bottom: 16px;
}

.train-route {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.station-code {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.departure-time,
.arrival-time {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.train-number {
  font-size: 16px;
  color: #67c23a;
  font-weight: 600;
}

.train-type {
  font-size: 13px;
  color: #909399;
}

.duration {
  font-size: 13px;
  color: #909399;
}

.train-seats {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.seat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  background: #f5f7fa;
  border-radius: 8px;
  min-width: 80px;
}

.seat-item.sold-out {
  opacity: 0.5;
}

.seat-type {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.seat-price {
  font-size: 16px;
  font-weight: 600;
  color: #f56c6c;
  margin-bottom: 4px;
}

.seat-count {
  font-size: 12px;
  color: #909399;
}

.train-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f5f7fa;
}

.price-range {
  font-size: 16px;
  color: #f56c6c;
  font-weight: 600;
}

.train-actions {
  display: flex;
  gap: 8px;
}

/* 巴士卡片 */
.buses-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}

.bus-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s;
  background: white;
}

.bus-card:hover {
  border-color: #e6a23c;
  box-shadow: 0 4px 16px rgba(230, 162, 60, 0.2);
}

.bus-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f5f7fa;
}

.bus-info {
  margin-bottom: 16px;
}

.route-lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.route-line-item {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.route-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.route-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.route-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.route-stops {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.route-schedule,
.route-price {
  font-size: 13px;
  color: #909399;
}

.bus-footer {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f5f7fa;
}

.bus-footer .el-button {
  flex: 1;
}

/* 加载更多 */
.load-more {
  margin-top: 20px;
  text-align: center;
}

/* 地图占位 */
.map-container {
  width: 100%;
  height: 500px;
}

.map-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
}

.map-placeholder .el-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.map-placeholder p {
  margin: 8px 0;
  font-size: 16px;
}

.map-tip {
  font-size: 14px;
  color: #c0c4cc;
}

@media (max-width: 768px) {
  .transport-tabs {
    overflow-x: auto;
  }

  .filter-section {
    flex-direction: column;
  }

  .filter-section .el-select,
  .filter-section .el-date-picker,
  .filter-section .el-button {
    width: 100% !important;
  }

  .flight-route,
  .train-route {
    flex-direction: column;
    gap: 16px;
  }

  .route-arrow {
    transform: rotate(90deg);
  }
}
</style>
