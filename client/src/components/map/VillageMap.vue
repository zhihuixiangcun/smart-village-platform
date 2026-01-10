<template>
  <div class="village-map-container">
    <!-- 地图容器 -->
    <div id="amap-container" class="amap-container" ref="mapContainer"></div>

    <!-- 地图工具栏 -->
    <div class="map-toolbar" v-if="mapConfig">
      <!-- 图层切换 -->
      <el-dropdown @command="changeLayer" trigger="click">
        <el-button type="primary" size="small">
          {{ currentLayerName }}
          <el-icon class="el-icon--right"><arrow-down /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="layer in availableLayers"
              :key="layer.type"
              :command="layer.type"
            >
              {{ layer.name }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 工具按钮组 -->
      <el-button-group class="ml-2">
        <el-button
          size="small"
          :type="showLocations ? 'primary' : ''"
          @click="toggleLayer('locations')"
        >
          <el-icon><location /></el-icon>
          地点
        </el-button>
        <el-button
          size="small"
          :type="showDangerZones ? 'danger' : ''"
          @click="toggleLayer('dangerZones')"
        >
          <el-icon><warning /></el-icon>
          危险区域
        </el-button>
        <el-button
          size="small"
          :type="showResources ? 'success' : ''"
          @click="toggleLayer('resources')"
        >
          <el-icon><goods /></el-icon>
          应急资源
        </el-button>
        <el-button
          size="small"
          :type="showResidents ? 'warning' : ''"
          @click="toggleLayer('residents')"
          v-if="canViewResidents"
        >
          <el-icon><user /></el-icon>
          村民
        </el-button>
      </el-button-group>

      <!-- 搜索框 -->
      <el-input
        v-model="searchKeyword"
        placeholder="搜索地点"
        size="small"
        class="search-input"
        clearable
        @keyup.enter="searchLocation"
        @clear="clearSearch"
      >
        <template #prefix>
          <el-icon><search /></el-icon>
        </template>
      </el-input>

      <!-- 定位按钮 -->
      <el-button size="small" circle @click="locateUser" :loading="locating">
        <el-icon><aim /></el-icon>
      </el-button>

      <!-- 测量按钮 -->
      <el-button
        size="small"
        circle
        @click="toggleMeasurement"
        :type="measuring ? 'primary' : ''"
        v-if="mapConfig.features.enableMeasurement"
      >
        <el-icon><ruler /></el-icon>
      </el-button>
    </div>

    <!-- 图例 -->
    <div class="map-legend" v-if="mapConfig && (showLocations || showDangerZones || showResources)">
      <div class="legend-title">图例</div>
      <div class="legend-items">
        <div v-if="showLocations" class="legend-item">
          <span class="legend-icon" style="background: #1890ff"></span>
          <span class="legend-text">地点</span>
        </div>
        <div v-if="showDangerZones" class="legend-item">
          <span class="legend-icon" style="background: #ff4d4f"></span>
          <span class="legend-text">危险区域</span>
        </div>
        <div v-if="showResources" class="legend-item">
          <span class="legend-icon" style="background: #52c41a"></span>
          <span class="legend-text">应急资源</span>
        </div>
        <div v-if="showResidents" class="legend-item">
          <span class="legend-icon" style="background: #faad14"></span>
          <span class="legend-text">村民</span>
        </div>
      </div>
    </div>

    <!-- 信息弹窗 -->
    <el-dialog v-model="infoWindowVisible" :title="infoWindowTitle" width="500px" append-to-body>
      <div v-if="infoWindowData">
        <!-- 地点信息 -->
        <div v-if="infoWindowData.type === 'location'">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="名称">
              {{ infoWindowData.data.name }}
            </el-descriptions-item>
            <el-descriptions-item label="类型">
              {{ getLocationTypeName(infoWindowData.data.type) }}
            </el-descriptions-item>
            <el-descriptions-item label="地址" v-if="infoWindowData.data.address">
              {{ infoWindowData.data.address.detail }}
            </el-descriptions-item>
            <el-descriptions-item label="联系人" v-if="infoWindowData.data.contact">
              {{ infoWindowData.data.contact.personInCharge }}
              {{ infoWindowData.data.contact.phone }}
            </el-descriptions-item>
            <el-descriptions-item label="服务时间" v-if="infoWindowData.data.serviceHours">
              {{ infoWindowData.data.serviceHours.openTime }} -
              {{ infoWindowData.data.serviceHours.closeTime }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 危险区域信息 -->
        <div v-else-if="infoWindowData.type === 'dangerZone'">
          <el-alert
            :type="getDangerLevelType(infoWindowData.data.dangerLevel)"
            :title="infoWindowData.data.alert.title"
            :description="infoWindowData.data.alert.message"
            show-icon
            :closable="false"
            class="mb-3"
          />
          <el-descriptions :column="1" border>
            <el-descriptions-item label="危险类型">
              {{ getDangerTypeName(infoWindowData.data.dangerType) }}
            </el-descriptions-item>
            <el-descriptions-item label="危险等级">
              {{ getDangerLevelName(infoWindowData.data.dangerLevel) }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              {{ getDangerZoneStatusName(infoWindowData.data.status) }}
            </el-descriptions-item>
            <el-descriptions-item label="建议措施" v-if="infoWindowData.data.alert.recommendations">
              <ul>
                <li v-for="(rec, index) in infoWindowData.data.alert.recommendations" :key="index">
                  {{ rec }}
                </li>
              </ul>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 应急资源信息 -->
        <div v-else-if="infoWindowData.type === 'resource'">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="资源名称">
              {{ infoWindowData.data.name }}
            </el-descriptions-item>
            <el-descriptions-item label="资源编号">
              {{ infoWindowData.data.resourceCode }}
            </el-descriptions-item>
            <el-descriptions-item label="资源类型">
              {{ getResourceTypeName(infoWindowData.data.resourceType) }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="getResourceStatusType(infoWindowData.data.status)">
                {{ getResourceStatusName(infoWindowData.data.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="责任人">
              {{ infoWindowData.data.responsiblePerson.name }}
              {{ infoWindowData.data.responsiblePerson.phone }}
            </el-descriptions-item>
            <el-descriptions-item label="规格" v-if="infoWindowData.data.specifications">
              {{ infoWindowData.data.specifications.capacity }}
            </el-descriptions-item>
          </el-descriptions>
          <div class="mt-3" v-if="infoWindowData.data.status === 'available'">
            <el-button type="primary" @click="useResource(infoWindowData.data)">
              使用此资源
            </el-button>
          </div>
        </div>

        <!-- 村民位置信息 -->
        <div v-else-if="infoWindowData.type === 'resident'">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="姓名">
              {{ infoWindowData.data.name }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              {{ getResidentStatusName(infoWindowData.data.status) }}
            </el-descriptions-item>
            <el-descriptions-item label="最后更新">
              {{ formatTime(infoWindowData.data.lastUpdate) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </el-dialog>

    <!-- 加载状态 -->
    <div v-loading="loading" class="map-loading"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ArrowDown,
  Location,
  Warning,
  Goods,
  User,
  Search,
  Aim,
  Ruler,
} from '@element-plus/icons-vue';
import AMapLoader from '@amap/amap-jsapi-loader';
import { mapApi } from '@/api/map';

// Props
const props = defineProps({
  villageId: {
    type: String,
    required: true,
  },
  height: {
    type: String,
    default: '600px',
  },
});

// Emits
const emit = defineEmits([
  'location-click',
  'danger-zone-click',
  'resource-click',
  'resident-click',
]);

// 响应式数据
const mapContainer = ref(null);
const loading = ref(false);
const locating = ref(false);
const map = ref(null);
const mapConfig = ref(null);
const searchKeyword = ref('');
const infoWindowVisible = ref(false);
const infoWindowTitle = ref('');
const infoWindowData = ref(null);

// 图层显示控制
const showLocations = ref(true);
const showDangerZones = ref(true);
const showResources = ref(true);
const showResidents = ref(false);
const currentLayer = ref('normal');

// 测量工具
const measuring = ref(false);
const measurementTool = ref(null);

// 地图对象
const markers = ref([]);
const polygons = ref([]);
const circles = ref([]);

// 高德地图安全密钥（需要在实际项目中配置）
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || 'your_amap_key_here';
const AMAP_SECURITY_KEY = import.meta.env.VITE_AMAP_SECURITY_KEY || 'your_security_key_here';

// 计算属性
const currentLayerName = computed(() => {
  const layers = {
    normal: '标准地图',
    satellite: '卫星地图',
    hybrid: '混合地图',
  };
  return layers[currentLayer.value] || '标准地图';
});

const availableLayers = computed(() => {
  return [
    { name: '标准地图', type: 'normal' },
    { name: '卫星地图', type: 'satellite' },
    { name: '混合地图', type: 'hybrid' },
  ];
});

const canViewResidents = computed(() => {
  // 根据用户角色判断是否可以查看村民位置
  return true; // 这里可以根据实际权限逻辑修改
});

// 生命周期
onMounted(async () => {
  await initMap();
});

onBeforeUnmount(() => {
  if (map.value) {
    map.value.destroy();
    map.value = null;
  }
});

// 初始化地图
const initMap = async () => {
  loading.value = true;
  try {
    // 加载地图配置
    const configResponse = await mapApi.getVillageMapConfig(props.villageId);
    mapConfig.value = configResponse.data;

    // 加载高德地图API
    window._AMapSecurityConfig = {
      securityJsCode: AMAP_SECURITY_KEY,
    };

    const AMap = await AMapLoader.load({
      key: AMAP_KEY,
      version: '2.0',
      plugins: [
        'AMap.Scale',
        'AMap.ToolBar',
        'AMap.ControlBar',
        'AMap.Geolocation',
        'AMap.Geocoder',
      ],
    });

    // 创建地图实例
    map.value = new AMap.Map(mapContainer.value, {
      zoom: mapConfig.value.zoomLevel,
      center: [mapConfig.value.center.longitude, mapConfig.value.center.latitude],
      mapStyle: 'amap://styles/normal',
      viewMode: '3D',
      pitch: 0,
    });

    // 添加控件
    if (mapConfig.value.controls.showScale) {
      map.value.addControl(new AMap.Scale());
    }
    if (mapConfig.value.controls.showToolbar) {
      map.value.addControl(
        new AMap.ToolBar({
          position: {
            top: '110px',
            right: '40px',
          },
        })
      );
    }

    // 绘制村界
    await drawVillageBoundary();

    // 加载地图数据
    await loadMapData();

    // 地图点击事件
    map.value.on('click', e => {
      console.log('地图点击:', e.lnglat.getLng(), e.lnglat.getLat());
    });
  } catch (error) {
    console.error('初始化地图失败:', error);
    ElMessage.error('地图加载失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

// 绘制村界
const drawVillageBoundary = async () => {
  if (!mapConfig.value || !mapConfig.value.boundary) return;

  const AMap = window.AMap;
  const path = mapConfig.value.boundary.coordinates[0].map(coord => {
    return new AMap.LngLat(coord[0], coord[1]);
  });

  const polygon = new AMap.Polygon({
    path: path,
    strokeColor: mapConfig.value.style.boundaryColor,
    strokeWeight: mapConfig.value.style.boundaryWidth,
    fillColor: mapConfig.value.style.fillColor,
    fillOpacity: 0.3,
  });

  map.value.add(polygon);
  polygons.value.push(polygon);
};

// 加载地图数据
const loadMapData = async () => {
  try {
    const response = await mapApi.getMapDataSummary(props.villageId);
    const data = response.data;

    // 绘制地点
    if (showLocations.value) {
      drawLocations(data.locations);
    }

    // 绘制危险区域
    if (showDangerZones.value) {
      drawDangerZones(data.dangerZones);
    }

    // 绘制应急资源
    if (showResources.value) {
      drawResources(data.resources);
    }

    // 绘制村民位置
    if (showResidents.value && canViewResidents.value) {
      drawResidents(data.residents);
    }
  } catch (error) {
    console.error('加载地图数据失败:', error);
  }
};

// 绘制地点
const drawLocations = locations => {
  const AMap = window.AMap;

  Object.keys(locations).forEach(type => {
    locations[type].forEach(loc => {
      const marker = new AMap.Marker({
        position: [loc.location.coordinates[0], loc.location.coordinates[1]],
        title: loc.name,
        icon: getMarkerIcon(type),
        extData: { type: 'location', data: loc },
      });

      marker.on('click', () => {
        showInfoWindow('location', loc);
        emit('location-click', loc);
      });

      map.value.add(marker);
      markers.value.push(marker);
    });
  });
};

// 绘制危险区域
const drawDangerZones = zones => {
  const AMap = window.AMap;

  zones.forEach(zone => {
    const fillColor = getDangerZoneColor(zone.dangerLevel);

    if (zone.area.type === 'Polygon') {
      const path = zone.area.coordinates[0].map(coord => {
        return new AMap.LngLat(coord[0], coord[1]);
      });

      const polygon = new AMap.Polygon({
        path: path,
        strokeColor: fillColor,
        strokeWeight: 2,
        fillColor: fillColor,
        fillOpacity: zone.displayConfig.fillOpacity,
      });

      polygon.on('click', () => {
        showInfoWindow('dangerZone', zone);
        emit('danger-zone-click', zone);
      });

      map.value.add(polygon);
      polygons.value.push(polygon);
    }
  });
};

// 绘制应急资源
const drawResources = resources => {
  const AMap = window.AMap;

  resources.forEach(resource => {
    const marker = new AMap.Marker({
      position: [resource.location.coordinates[0], resource.location.coordinates[1]],
      title: resource.name,
      icon: getResourceIcon(resource.resourceType),
      extData: { type: 'resource', data: resource },
    });

    marker.on('click', () => {
      showInfoWindow('resource', resource);
      emit('resource-click', resource);
    });

    map.value.add(marker);
    markers.value.push(marker);
  });
};

// 绘制村民位置
const drawResidents = residents => {
  const AMap = window.AMap;

  residents.forEach(resident => {
    const marker = new AMap.Marker({
      position: [resident.location.coordinates[0], resident.location.coordinates[1]],
      title: resident.name,
      icon: getResidentIcon(resident.status),
      extData: { type: 'resident', data: resident },
    });

    marker.on('click', () => {
      showInfoWindow('resident', resident);
      emit('resident-click', resident);
    });

    map.value.add(marker);
    markers.value.push(marker);
  });
};

// 切换图层
const changeLayer = layerType => {
  currentLayer.value = layerType;

  const styles = {
    normal: 'amap://styles/normal',
    satellite: 'amap://styles/satellite',
    hybrid: 'amap://styles/hybrid',
  };

  map.value.setMapStyle(styles[layerType]);
};

// 切换图层显示
const toggleLayer = layerType => {
  switch (layerType) {
    case 'locations':
      showLocations.value = !showLocations.value;
      break;
    case 'dangerZones':
      showDangerZones.value = !showDangerZones.value;
      break;
    case 'resources':
      showResources.value = !showResources.value;
      break;
    case 'residents':
      showResidents.value = !showResidents.value;
      break;
  }

  // 清除并重新加载数据
  clearMapLayers();
  loadMapData();
};

// 清除地图图层
const clearMapLayers = () => {
  markers.value.forEach(marker => map.value.remove(marker));
  polygons.value.forEach(polygon => map.value.remove(polygon));
  circles.value.forEach(circle => map.value.remove(circle));

  markers.value = [];
  polygons.value = [];
  circles.value = [];
};

// 搜索地点
const searchLocation = async () => {
  if (!searchKeyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词');
    return;
  }

  try {
    const response = await mapApi.searchLocations(props.villageId, searchKeyword.value);
    const locations = response.data;

    if (locations.length > 0) {
      // 定位到第一个搜索结果
      const firstLoc = locations[0];
      map.value.setCenter([firstLoc.location.coordinates[0], firstLoc.location.coordinates[1]]);
      map.value.setZoom(16);

      ElMessage.success(`找到 ${locations.length} 个结果`);
    } else {
      ElMessage.info('未找到相关地点');
    }
  } catch (error) {
    console.error('搜索地点失败:', error);
    ElMessage.error('搜索失败');
  }
};

// 清除搜索
const clearSearch = () => {
  searchKeyword.value = '';
};

// 定位用户
const locateUser = () => {
  locating.value = true;
  const AMap = window.AMap;

  AMap.plugin('AMap.Geolocation', () => {
    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 10000,
    });

    map.value.addControl(geolocation);
    geolocation.getCurrentPosition((status, result) => {
      locating.value = false;

      if (status === 'complete') {
        map.value.setCenter([result.position.lng, result.position.lat]);
        map.value.setZoom(16);
        ElMessage.success('定位成功');
      } else {
        ElMessage.error('定位失败: ' + result.message);
      }
    });
  });
};

// 切换测量工具
const toggleMeasurement = () => {
  measuring.value = !measuring.value;
  // 这里可以实现测量工具的逻辑
  ElMessage.info(measuring.value ? '测量工具已开启' : '测量工具已关闭');
};

// 显示信息窗口
const showInfoWindow = (type, data) => {
  infoWindowData.value = { type, data };

  const titles = {
    location: '地点信息',
    dangerZone: '危险区域',
    resource: '应急资源',
    resident: '村民信息',
  };

  infoWindowTitle.value = titles[type];
  infoWindowVisible.value = true;
};

// 使用资源
const useResource = resource => {
  ElMessageBox.confirm(`确认使用 ${resource.name} 吗？`, '使用资源', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      // 这里调用使用资源的API
      ElMessage.success('使用记录已提交');
      infoWindowVisible.value = false;
    })
    .catch(() => {
      // 取消使用
    });
};

// 工具函数
const getMarkerIcon = type => {
  // 返回不同类型地点的图标
  const icons = {
    government: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b1.png',
    education: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b2.png',
    medical: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b3.png',
    emergency: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b4.png',
  };
  return icons[type] || icons.government;
};

const getResourceIcon = type => {
  // 返回不同类型资源的图标
  return 'https://webapi.amap.com/theme/v1.3/markers/n/mark_g.png';
};

const getResidentIcon = status => {
  // 返回不同状态村民的图标
  const icons = {
    home: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
    away: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_y.png',
    emergency: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
  };
  return icons[status] || icons.home;
};

const getDangerZoneColor = level => {
  const colors = {
    low: '#52c41a',
    medium: '#faad14',
    high: '#ff4d4f',
    critical: '#722ed1',
  };
  return colors[level] || '#faad14';
};

const getLocationTypeName = type => {
  const types = {
    government: '政府机构',
    education: '教育机构',
    medical: '医疗机构',
    emergency: '应急设施',
    commercial: '商业设施',
    agricultural: '农业设施',
    recreational: '娱乐设施',
    residential: '住宅区',
    infrastructure: '基础设施',
    religious: '宗教场所',
    cultural: '文化场所',
    other: '其他',
  };
  return types[type] || type;
};

const getDangerTypeName = type => {
  const types = {
    flood: '易涝区域',
    fire: '火灾高风险区',
    landslide: '滑坡风险区',
    collapse: '塌方风险区',
    pollution: '污染区域',
    epidemic: '疫情区域',
    construction: '施工区域',
    traffic: '交通安全隐患',
    electrical: '电力隐患',
    chemical: '化学品危险',
    explosive: '爆炸物危险',
    radiation: '辐射危险',
    other: '其他危险',
  };
  return types[type] || type;
};

const getDangerLevelName = level => {
  const levels = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重',
  };
  return levels[level] || level;
};

const getDangerLevelType = level => {
  const types = {
    low: 'success',
    medium: 'warning',
    high: 'error',
    critical: 'error',
  };
  return types[level] || 'warning';
};

const getDangerZoneStatusName = status => {
  const statuses = {
    active: '活跃',
    monitoring: '监测中',
    resolved: '已解决',
    inactive: '不活跃',
  };
  return statuses[status] || status;
};

const getResourceTypeName = type => {
  const types = {
    fire_hydrant: '消防栓',
    water_pump: '水泵',
    fire_extinguisher: '灭火器',
    shelter: '避难所',
    first_aid_kit: '急救箱',
    emergency_generator: '应急发电机',
    emergency_light: '应急照明',
    rescue_boat: '救援船只',
    rescue_equipment: '救援设备',
    emergency_vehicle: '应急车辆',
    communication: '通信设备',
    emergency_supplies: '应急物资',
    medical_equipment: '医疗设备',
    sandbag: '沙袋',
    portable_pump: '便携式水泵',
    other: '其他',
  };
  return types[type] || type;
};

const getResourceStatusName = status => {
  const statuses = {
    available: '可用',
    in_use: '使用中',
    maintenance: '维护中',
    unavailable: '不可用',
    damaged: '已损坏',
  };
  return statuses[status] || status;
};

const getResourceStatusType = status => {
  const types = {
    available: 'success',
    in_use: 'warning',
    maintenance: 'info',
    unavailable: 'info',
    damaged: 'danger',
  };
  return types[status] || '';
};

const getResidentStatusName = status => {
  const statuses = {
    home: '在家',
    away: '外出',
    emergency: '紧急',
    offline: '离线',
  };
  return statuses[status] || status;
};

const formatTime = time => {
  if (!time) return '';
  const date = new Date(time);
  return date.toLocaleString('zh-CN');
};
</script>

<style scoped>
.village-map-container {
  position: relative;
  width: 100%;
  height: v-bind(height);
}

.amap-container {
  width: 100%;
  height: 100%;
}

.map-toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 999;
  display: flex;
  gap: 8px;
  background: white;
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.search-input {
  width: 200px;
}

.map-legend {
  position: absolute;
  bottom: 20px;
  left: 10px;
  z-index: 999;
  background: white;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.legend-title {
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 14px;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-icon {
  width: 16px;
  height: 16px;
  border-radius: 2px;
}

.legend-text {
  font-size: 12px;
}

.map-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ml-2 {
  margin-left: 8px;
}

.mb-3 {
  margin-bottom: 12px;
}

.mt-3 {
  margin-top: 12px;
}
</style>
