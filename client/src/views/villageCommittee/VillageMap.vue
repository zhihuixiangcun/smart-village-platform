<template>
  <div class="village-map-container">
    <!-- 地图控制栏 -->
    <el-card class="control-card" shadow="never">
      <el-row :gutter="20" class="control-row">
        <el-col :xs="24" :sm="8" :md="6">
          <el-select v-model="mapType" placeholder="选择地图类型" @change="handleMapTypeChange">
            <el-option label="卫星地图" value="satellite" />
            <el-option label="普通地图" value="normal" />
            <el-option label="地形地图" value="terrain" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="8" :md="6">
          <el-select
            v-model="layerFilter"
            placeholder="显示图层"
            multiple
            @change="handleLayerChange"
          >
            <el-option label="住户位置" value="household" />
            <el-option label="公共设施" value="facility" />
            <el-option label="监控摄像头" value="camera" />
            <el-option label="应急设备" value="emergency" />
            <el-option label="特殊人群" value="special" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="8" :md="6">
          <el-button-group>
            <el-button @click="handleLocate">
              <el-icon><Location /></el-icon>
              定位
            </el-button>
            <el-button @click="handleFullscreen">
              <el-icon><FullScreen /></el-icon>
              全屏
            </el-button>
            <el-button @click="handleRefresh">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </el-button-group>
        </el-col>
        <el-col :xs="24" :sm="24" :md="6">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索地址或姓名"
            @keyup.enter="handleSearch"
          >
            <template #append>
              <el-button @click="handleSearch">
                <el-icon><Search /></el-icon>
              </el-button>
            </template>
          </el-input>
        </el-col>
      </el-row>
    </el-card>

    <!-- 统计信息栏 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="12" :sm="6" :md="4" v-for="stat in mapStats" :key="stat.key">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <el-icon class="stat-icon" :size="30" :color="stat.color">
              <component :is="stat.icon" />
            </el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 地图主体 -->
    <el-card class="map-card" shadow="never">
      <div id="villageMap" class="map-container" :class="{ fullscreen: isFullscreen }">
        <!-- 地图加载指示器 -->
        <div v-if="mapLoading" class="map-loading">
          <div class="loading-spinner">⏳</div>
          <p>地图加载中...</p>
        </div>

        <!-- 地图工具栏 -->
        <div class="map-toolbar" v-if="!isMobile">
          <el-button-group vertical>
            <el-button size="small" @click="zoomIn">
              <el-icon><ZoomIn /></el-icon>
            </el-button>
            <el-button size="small" @click="zoomOut">
              <el-icon><ZoomOut /></el-icon>
            </el-button>
            <el-button size="small" @click="resetView">
              <el-icon><Aim /></el-icon>
            </el-button>
          </el-button-group>
        </div>

        <!-- 图例 -->
        <div class="map-legend" v-if="!isMobile">
          <el-card shadow="always" class="legend-card">
            <template #header>
              <span>图例</span>
            </template>
            <div class="legend-item" v-for="item in legendItems" :key="item.type">
              <span class="legend-icon" :style="{ backgroundColor: item.color }"></span>
              <span class="legend-label">{{ item.label }}</span>
            </div>
          </el-card>
        </div>

        <!-- 实时信息面板 -->
        <div class="info-panel" v-if="selectedMarker">
          <el-card shadow="always" class="info-card">
            <template #header>
              <div class="info-header">
                <span>{{ selectedMarker.name || selectedMarker.title }}</span>
                <el-button text @click="closeInfoPanel">
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
            </template>
            <div class="info-content">
              <!-- 住户信息 -->
              <template v-if="selectedMarker.type === 'household'">
                <el-descriptions :column="2" size="small">
                  <el-descriptions-item label="户主">{{
                    selectedMarker.householder
                  }}</el-descriptions-item>
                  <el-descriptions-item label="人口"
                    >{{ selectedMarker.population }}人</el-descriptions-item
                  >
                  <el-descriptions-item label="电话">{{
                    selectedMarker.phone
                  }}</el-descriptions-item>
                  <el-descriptions-item label="类型">{{
                    getHouseholdType(selectedMarker.category)
                  }}</el-descriptions-item>
                </el-descriptions>
                <div class="info-actions">
                  <el-button type="primary" size="small" @click="callHousehold(selectedMarker)">
                    <el-icon><Phone /></el-icon>
                    呼叫
                  </el-button>
                  <el-button size="small" @click="viewHouseholdDetail(selectedMarker)">
                    <el-icon><View /></el-icon>
                    详情
                  </el-button>
                </div>
              </template>

              <!-- 设施信息 -->
              <template v-else-if="selectedMarker.type === 'facility'">
                <el-descriptions :column="2" size="small">
                  <el-descriptions-item label="类型">{{
                    getFacilityType(selectedMarker.category)
                  }}</el-descriptions-item>
                  <el-descriptions-item label="状态">
                    <el-tag :type="selectedMarker.status === 'normal' ? 'success' : 'warning'">
                      {{ selectedMarker.status === 'normal' ? '正常' : '异常' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="负责人">{{
                    selectedMarker.manager
                  }}</el-descriptions-item>
                  <el-descriptions-item label="联系电话">{{
                    selectedMarker.contact
                  }}</el-descriptions-item>
                </el-descriptions>
                <div class="info-actions">
                  <el-button
                    type="primary"
                    size="small"
                    @click="viewFacilityDetail(selectedMarker)"
                  >
                    <el-icon><View /></el-icon>
                    详情
                  </el-button>
                </div>
              </template>

              <!-- 监控信息 -->
              <template v-else-if="selectedMarker.type === 'camera'">
                <div class="camera-preview">
                  <img :src="selectedMarker.snapshot" alt="监控快照" />
                </div>
                <el-descriptions :column="1" size="small">
                  <el-descriptions-item label="设备ID">{{
                    selectedMarker.deviceId
                  }}</el-descriptions-item>
                  <el-descriptions-item label="位置">{{
                    selectedMarker.location
                  }}</el-descriptions-item>
                  <el-descriptions-item label="状态">
                    <el-tag :type="selectedMarker.online ? 'success' : 'danger'">
                      {{ selectedMarker.online ? '在线' : '离线' }}
                    </el-tag>
                  </el-descriptions-item>
                </el-descriptions>
                <div class="info-actions">
                  <el-button type="primary" size="small" @click="viewCameraLive(selectedMarker)">
                    <el-icon><VideoPlay /></el-icon>
                    实时画面
                  </el-button>
                </div>
              </template>

              <!-- 应急设备信息 -->
              <template v-else-if="selectedMarker.type === 'emergency'">
                <el-descriptions :column="2" size="small">
                  <el-descriptions-item label="设备类型">{{
                    getEmergencyType(selectedMarker.category)
                  }}</el-descriptions-item>
                  <el-descriptions-item label="状态">
                    <el-tag :type="selectedMarker.available ? 'success' : 'danger'">
                      {{ selectedMarker.available ? '可用' : '不可用' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="最后检查">{{
                    formatDate(selectedMarker.lastCheck)
                  }}</el-descriptions-item>
                  <el-descriptions-item label="负责人">{{
                    selectedMarker.responsible
                  }}</el-descriptions-item>
                </el-descriptions>
                <div class="info-actions">
                  <el-button
                    type="warning"
                    size="small"
                    @click="useEmergencyDevice(selectedMarker)"
                  >
                    <el-icon><Warning /></el-icon>
                    使用设备
                  </el-button>
                </div>
              </template>
            </div>
          </el-card>
        </div>
      </div>
    </el-card>

    <!-- 紧急事件悬浮窗 -->
    <div class="emergency-panel" v-if="emergencyEvents.length">
      <el-card shadow="always" class="emergency-card">
        <template #header>
          <div class="emergency-header">
            <el-icon class="emergency-icon" size="20" color="#f56c6c">
              <Warning />
            </el-icon>
            <span>紧急事件</span>
            <el-badge :value="emergencyEvents.length" type="danger" />
          </div>
        </template>
        <div class="emergency-list">
          <div
            class="emergency-item"
            v-for="event in emergencyEvents"
            :key="event.id"
            @click="locateEmergency(event)"
          >
            <div class="emergency-level" :class="event.level"></div>
            <div class="emergency-info">
              <div class="emergency-title">{{ event.title }}</div>
              <div class="emergency-location">{{ event.location }}</div>
              <div class="emergency-time">{{ formatDateTime(event.time) }}</div>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 监控实时画面对话框 -->
    <el-dialog
      v-model="showCameraDialog"
      title="监控实时画面"
      width="80%"
      :fullscreen="isMobile"
      destroy-on-close
    >
      <div class="camera-live-container">
        <video ref="cameraVideoRef" class="camera-video" controls autoplay muted></video>
      </div>
    </el-dialog>

    <!-- 添加标记对话框 -->
    <el-dialog
      v-model="showAddMarkerDialog"
      title="添加地图标记"
      width="500px"
      :fullscreen="isMobile"
    >
      <el-form ref="markerFormRef" :model="markerForm" :rules="markerRules" label-width="100px">
        <el-form-item label="标记类型" prop="type">
          <el-select v-model="markerForm.type" placeholder="请选择类型">
            <el-option label="住户" value="household" />
            <el-option label="公共设施" value="facility" />
            <el-option label="监控摄像头" value="camera" />
            <el-option label="应急设备" value="emergency" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="markerForm.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="经纬度" prop="position">
          <el-input v-model="markerForm.position" placeholder="点击地图选择位置" readonly>
            <template #append>
              <el-button @click="pickPosition">选择</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="markerForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddMarkerDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddMarker">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Location,
  FullScreen,
  Refresh,
  Search,
  ZoomIn,
  ZoomOut,
  Aim,
  Close,
  Phone,
  View,
  VideoPlay,
  Warning,
  House,
  School,
  ShoppingBag,
  FirstAidKit,
  VideoCamera,
} from '@element-plus/icons-vue';
import dayjs from 'dayjs';

// 响应式数据
const mapType = ref('normal');
const layerFilter = ref(['household', 'facility', 'camera']);
const searchKeyword = ref('');
const mapLoading = ref(true);
const isFullscreen = ref(false);
const isMobile = ref(false);

const selectedMarker = ref(null);
const emergencyEvents = ref([
  {
    id: 1,
    title: '火情警报',
    location: '村东头仓库',
    level: 'high',
    time: new Date(),
    position: { lng: 120.123456, lat: 30.654321 },
  },
  {
    id: 2,
    title: '老人走失',
    location: '村西口',
    level: 'medium',
    time: new Date(Date.now() - 30 * 60 * 1000),
    position: { lng: 120.124456, lat: 30.655321 },
  },
]);

const showCameraDialog = ref(false);
const showAddMarkerDialog = ref(false);
const isPickingPosition = ref(false);

const cameraVideoRef = ref();
const markerFormRef = ref();

const markerForm = ref({
  type: '',
  name: '',
  position: '',
  description: '',
});

const markerRules = {
  type: [{ required: true, message: '请选择标记类型', trigger: 'change' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  position: [{ required: true, message: '请选择位置', trigger: 'change' }],
};

// 地图统计数据
const mapStats = ref([
  {
    key: 'households',
    label: '住户总数',
    value: '486',
    icon: 'House',
    color: '#409eff',
  },
  {
    key: 'facilities',
    label: '公共设施',
    value: '28',
    icon: 'School',
    color: '#67c23a',
  },
  {
    key: 'cameras',
    label: '监控摄像头',
    value: '45',
    icon: 'VideoCamera',
    color: '#e6a23c',
  },
  {
    key: 'emergency',
    label: '应急设备',
    value: '32',
    icon: 'FirstAidKit',
    color: '#f56c6c',
  },
  {
    key: 'special',
    label: '特殊人群',
    value: '23',
    icon: 'User',
    color: '#909399',
  },
]);

// 图例配置
const legendItems = ref([
  { type: 'household', label: '普通住户', color: '#409eff' },
  { type: 'special', label: '特殊人群', color: '#f56c6c' },
  { type: 'facility', label: '公共设施', color: '#67c23a' },
  { type: 'camera', label: '监控摄像头', color: '#e6a23c' },
  { type: 'emergency', label: '应急设备', color: '#ff4757' },
]);

// 地图实例
let mapInstance = null;
let mapClickHandler = null;

// 计算属性
const showLayers = computed(() => {
  return {
    household: layerFilter.value.includes('household'),
    facility: layerFilter.value.includes('facility'),
    camera: layerFilter.value.includes('camera'),
    emergency: layerFilter.value.includes('emergency'),
    special: layerFilter.value.includes('special'),
  };
});

// 方法
const initMap = async () => {
  try {
    mapLoading.value = true;

    // 这里应该初始化地图（百度地图、高德地图或其他地图服务）
    // 以下为示例代码，需要根据实际地图SDK进行调整
    await nextTick();

    // 模拟地图初始化
    setTimeout(() => {
      mapLoading.value = false;
      // 添加地图点击事件
      if (isPickingPosition.value) {
        setupMapClickHandler();
      }
    }, 1000);
  } catch (error) {
    console.error('地图初始化失败:', error);
    ElMessage.error('地图加载失败');
  }
};

const handleMapTypeChange = type => {
  if (mapInstance) {
    // 切换地图类型
    mapInstance.setMapType(type);
  }
};

const handleLayerChange = () => {
  // 更新地图图层显示
  updateMapLayers();
};

const handleLocate = () => {
  if (mapInstance) {
    // 定位到村庄中心
    mapInstance.setCenter({ lng: 120.123456, lat: 30.654321 });
    mapInstance.setZoom(15);
  }
};

const handleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  const mapContainer = document.getElementById('villageMap');

  if (isFullscreen.value) {
    mapContainer.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }

  // 延迟调整地图大小
  setTimeout(() => {
    if (mapInstance) {
      mapInstance.resize();
    }
  }, 300);
};

const handleRefresh = () => {
  // 刷新地图数据
  initMap();
  ElMessage.success('地图已刷新');
};

const handleSearch = () => {
  if (!searchKeyword.value) {
    ElMessage.warning('请输入搜索关键词');
    return;
  }

  // 搜索并定位到指定位置
  ElMessage.success(`搜索: ${searchKeyword.value}`);
};

const zoomIn = () => {
  if (mapInstance) {
    mapInstance.zoomIn();
  }
};

const zoomOut = () => {
  if (mapInstance) {
    mapInstance.zoomOut();
  }
};

const resetView = () => {
  if (mapInstance) {
    mapInstance.resetView();
  }
};

const updateMapLayers = () => {
  if (!mapInstance) return;

  // 根据选择的图层更新地图显示
  Object.keys(showLayers.value).forEach(layerType => {
    if (showLayers.value[layerType]) {
      mapInstance.showLayer(layerType);
    } else {
      mapInstance.hideLayer(layerType);
    }
  });
};

const closeInfoPanel = () => {
  selectedMarker.value = null;
};

const callHousehold = household => {
  ElMessageBox.confirm(
    `确定要呼叫 ${household.householder} 吗？\n电话：${household.phone}`,
    '呼叫确认',
    {
      confirmButtonText: '呼叫',
      cancelButtonText: '取消',
      type: 'info',
    }
  ).then(() => {
    window.location.href = `tel:${household.phone}`;
    ElMessage.success(`正在呼叫 ${household.householder}`);
  });
};

const viewHouseholdDetail = household => {
  // 跳转到住户详情页
  ElMessage.info('查看住户详情');
};

const viewFacilityDetail = facility => {
  ElMessage.info('查看设施详情');
};

const viewCameraLive = camera => {
  showCameraDialog.value = true;
  // 播放实时视频流
  nextTick(() => {
    if (cameraVideoRef.value) {
      // 设置视频源
      cameraVideoRef.value.src = camera.liveUrl;
    }
  });
};

const useEmergencyDevice = device => {
  ElMessageBox.confirm(`确定要使用 ${device.name} 吗？`, '使用确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    ElMessage.success('已通知相关人员');
  });
};

const locateEmergency = event => {
  if (mapInstance) {
    mapInstance.setCenter(event.position);
    mapInstance.setZoom(17);
    selectedMarker.value = {
      type: 'emergency',
      title: event.title,
      ...event,
    };
  }
};

const pickPosition = () => {
  isPickingPosition.value = true;
  ElMessage.info('请在地图上点击选择位置');
  setupMapClickHandler();
};

const setupMapClickHandler = () => {
  if (!mapInstance) return;

  mapClickHandler = e => {
    const { lng, lat } = e.lnglat;
    markerForm.value.position = `${lng}, ${lat}`;
    isPickingPosition.value = false;

    // 移除点击事件
    if (mapInstance) {
      mapInstance.off('click', mapClickHandler);
    }
  };

  mapInstance.on('click', mapClickHandler);
};

const handleAddMarker = () => {
  ElMessage.success('标记添加成功');
  showAddMarkerDialog.value = false;
};

// 辅助函数
const formatDate = date => {
  return date ? dayjs(date).format('YYYY-MM-DD') : '';
};

const formatDateTime = date => {
  return date ? dayjs(date).format('MM-DD HH:mm') : '';
};

const getHouseholdType = category => {
  const typeMap = {
    normal: '普通住户',
    lowIncome: '低保户',
    singleChild: '独生子女户',
    elderly: '独居老人',
    disabled: '残疾家庭',
  };
  return typeMap[category] || category;
};

const getFacilityType = category => {
  const typeMap = {
    school: '学校',
    hospital: '卫生所',
    shop: '商店',
    office: '村委会',
    square: '文化广场',
  };
  return typeMap[category] || category;
};

const getEmergencyType = category => {
  const typeMap = {
    fire_extinguisher: '灭火器',
    first_aid: '急救箱',
    alarm: '报警器',
    pump: '水泵',
  };
  return typeMap[category] || category;
};

// 生命周期
onMounted(() => {
  isMobile.value = window.innerWidth < 768;
  initMap();

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768;
    if (mapInstance) {
      setTimeout(() => {
        mapInstance.resize();
      }, 100);
    }
  });
});

onUnmounted(() => {
  // 清理地图资源
  if (mapInstance) {
    mapInstance.destroy();
    mapInstance = null;
  }
});
</script>

<style lang="scss" scoped>
.village-map-container {
  height: calc(100vh - 140px);
  padding: 20px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eaf5 100%);
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 10px;
    height: calc(100vh - 100px);
  }
}

.control-card {
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(99, 102, 241, 0.1);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.08);

  .control-row {
    align-items: center;
    gap: 10px;

    @media (max-width: 768px) {
      .el-col {
        margin-bottom: 10px;
      }
    }
  }
}

.stats-row {
  margin-bottom: 20px;

  .stat-card {
    height: 100px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.08);

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 30px rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.3);
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 15px;

      .stat-info {
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 14px;
          color: #6b7280;
          margin-top: 5px;
          font-weight: 500;
        }
      }
    }
  }
}

.map-card {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(99,102,241,0.15);
  box-shadow: 0 4px 20px rgba(99,102,241,0.08);

  .map-container {
    height: 100%;
    min-height: 500px;
    position: relative;
    background: linear-gradient(135deg, #f5f7fa 0%, #e8eaf6 100%);
    border-radius: 12px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2);

    &.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      border-radius: 0;
    }

    .map-loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;

      .loading-spinner {
        font-size: 40px;
        animation: spin 1s linear infinite;
      }

      p {
        margin-top: 10px;
        color: #6366f1;
        font-weight: 500;
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .map-toolbar {
      position: absolute;
      top: 20px;
      right: 20px;
      z-index: 100;

      :deep(.el-button) {
        background: rgba(255,255,255,0.9);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(99,102,241,0.2);
        transition: all 0.3s;

        &:hover {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-color: transparent;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99,102,241,0.3);
        }
      }
    }

    .map-legend {
      position: absolute;
      bottom: 20px;
      right: 20px;
      z-index: 100;

      .legend-card {
        width: 180px;
        background: rgba(255,255,255,0.95);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(99,102,241,0.15);
        box-shadow: 0 8px 30px rgba(99,102,241,0.12);

        .legend-item {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.3s;

          &:hover {
            background: rgba(99,102,241,0.05);
          }

          .legend-icon {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            margin-right: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }

          .legend-label {
            font-size: 13px;
            color: #1f2937;
            font-weight: 500;
          }
        }
      }
    }

    .info-panel {
      position: absolute;
      bottom: 20px;
      left: 20px;
      z-index: 100;
      max-width: 400px;

      .info-card {
        background: rgba(255,255,255,0.97);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(99,102,241,0.2);
        box-shadow: 0 8px 30px rgba(99,102,241,0.2);

        .info-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(99,102,241,0.1);
          padding-bottom: 12px;
          margin-bottom: 16px;
        }

        .info-content {
          .camera-preview {
            margin-bottom: 20px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);

            img {
              width: 100%;
              height: 200px;
              object-fit: cover;
            }
          }

          .info-actions {
            margin-top: 20px;
            display: flex;
            gap: 12px;

            :deep(.el-button) {
              background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
              border: none;
              transition: all 0.3s;

              &:hover {
                background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(99,102,241,0.25);
              }
            }
          }
        }
      }
    }
  }
}

.emergency-panel {
  position: fixed;
  top: 100px;
  right: 20px;
  z-index: 1000;

  .emergency-card {
    width: 320px;
    background: rgba(255,255,255,0.97);
    backdrop-filter: blur(16px);
    border: 2px solid rgba(245, 158, 11, 0.3);
    box-shadow: 0 8px 40px rgba(245, 158, 11, 0.15);
    animation: slideIn 0.5s ease-out;

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .emergency-header {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      color: #dc2626;
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      border-bottom: 2px solid rgba(245, 158, 11, 0.2);
      padding-bottom: 12px;
    }

    .emergency-list {
      .emergency-item {
        padding: 14px;
        border-top: 1px solid rgba(245, 158, 11, 0.15);
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 8px;
        margin: 8px 0;

        &:hover {
          background: rgba(245, 158, 11, 0.08);
          transform: translateX(-5px);
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.15);
        }

        &:first-child {
          margin-top: 0;
        }

        display: flex;
        align-items: flex-start;
        gap: 12px;

        .emergency-level {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          flex-shrink: 0;

          &.high {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
          }

          &.medium {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
          }

          &.low {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            box-shadow: 0 2px 8px(16, 185, 129, 0.4);
          }
        }

        .emergency-info {
          flex: 1;

          .emergency-title {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 6px;
            font-size: 15px;
          }

          .emergency-location {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 3px;
          }

          .emergency-time {
            font-size: 12px;
            color: #94a3b8;
          }
        }
      }
    }
  }
}

.camera-live-container {
  width: 100%;
  height: 500px;
  background: #000;
  display: flex;
  justify-content: center;
  align-items: center;

  .camera-video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

// 响应式调整
@media (max-width: 768px) {
  .stats-row {
    .el-col {
      margin-bottom: 10px;
    }
  }

  .map-container {
    .map-legend,
    .info-panel {
      display: none !important;
    }
  }

  .emergency-panel {
    right: 10px;
    top: 80px;

    .emergency-card {
      width: 280px;
    }
  }

  .info-actions {
    flex-direction: column;

    .el-button {
      width: 100%;
      margin-left: 0;
    }
  }
}

// 装饰性元素
.map-container::before {
  content: '';
  position: absolute;
  top: -20px;
  left: -20px;
  right: -20px;
  bottom: -20px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(99, 102, 241, 0.05) 100%),
              linear-gradient(45deg, rgba(139, 92, 246, 0.03) 0%, rgba(139, 92, 246, 0.05) 100%);
  background-size: 100px 100px;
  animation: gradient-rotate 20s linear infinite;
  border-radius: 12px;
  z-index: 0;
  pointer-events: none;
}

@keyframes gradient-rotate {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
}

.calendar-cell {
  .calendar-day {
    font-weight: 600;
    color: #6366f1;
  }

  .calendar-duty {
    .el-tag {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border: none;
      color: white;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);

      &:hover {
        background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
        transform: scale(1.05);
      }
    }
  }
}
</style>
