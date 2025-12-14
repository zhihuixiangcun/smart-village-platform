<template>
  <div class="map-view">
    <!-- 地图工具栏 -->
    <div class="map-toolbar">
      <el-button-group>
        <el-button
          :type="currentTool === 'pan' ? 'primary' : 'default'"
          icon="el-icon-location"
          size="small"
          @click="setTool('pan')"
        >
          漫游
        </el-button>
        <el-button
          :type="currentTool === 'marker' ? 'primary' : 'default'"
          icon="el-icon-place"
          size="small"
          @click="setTool('marker')"
        >
          标记
        </el-button>
        <el-button
          :type="currentTool === 'measure' ? 'primary' : 'default'"
          icon="el-icon-ruler"
          size="small"
          @click="setTool('measure')"
        >
          测距
        </el-button>
        <el-button
          :type="currentTool === 'draw' ? 'primary' : 'default'"
          icon="el-icon-edit"
          size="small"
          @click="setTool('draw')"
        >
          绘制
        </el-button>
      </el-button-group>

      <el-divider direction="vertical" />

      <el-button-group>
        <el-button
          icon="el-icon-plus"
          size="small"
          @click="zoomIn"
        >
          放大
        </el-button>
        <el-button
          icon="el-icon-minus"
          size="small"
          @click="zoomOut"
        >
          缩小
        </el-button>
        <el-button
          icon="el-icon-aim"
          size="small"
          @click="resetView"
        >
          重置
        </el-button>
      </el-button-group>

      <el-divider direction="vertical" />

      <el-switch
        v-model="showVillages"
        active-text="显示村庄"
        @change="toggleVillages"
      />
      <el-switch
        v-model="showFacilities"
        active-text="显示设施"
        @change="toggleFacilities"
      />
      <el-switch
        v-model="showResidents"
        active-text="显示村民"
        @change="toggleResidents"
      />
    </div>

    <!-- 地图容器 -->
    <div id="mapContainer" class="map-container"></div>

    <!-- 侧边栏信息面板 -->
    <el-drawer
      v-model="infoDrawerVisible"
      direction="rtl"
      size="400px"
      title="地图信息"
    >
      <div class="map-info-content">
        <!-- POI搜索 -->
        <el-card class="mb-4" header="地点搜索">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索地点、设施、地址..."
            clearable
            @keyup.enter="searchPOI"
          >
            <template #append>
              <el-button icon="el-icon-search" @click="searchPOI" />
            </template>
          </el-input>

          <div v-if="searchResults.length > 0" class="mt-3">
            <el-tag
              v-for="(result, index) in searchResults"
              :key="index"
              class="search-result-tag"
              @click="focusOnPOI(result)"
            >
              {{ result.name }}
              <span class="text-gray-500">{{ result.address }}</span>
            </el-tag>
          </div>
        </el-card>

        <!-- 村庄信息 -->
        <el-card v-if="selectedVillage" class="mb-4" header="村庄信息">
          <div class="village-info">
            <h4>{{ selectedVillage.name }}</h4>
            <p class="text-gray-600">{{ selectedVillage.address }}</p>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">人口：</span>
                <span class="value">{{ selectedVillage.population }}人</span>
              </div>
              <div class="info-item">
                <span class="label">户数：</span>
                <span class="value">{{ selectedVillage.households }}户</span>
              </div>
              <div class="info-item">
                <span class="label">面积：</span>
                <span class="value">{{ selectedVillage.area }}km²</span>
              </div>
              <div class="info-item">
                <span class="label">产业：</span>
                <span class="value">{{ selectedVillage.economy?.mainIndustry || '-' }}</span>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 天气信息 -->
        <el-card v-if="weatherInfo" class="mb-4" header="天气信息">
          <div class="weather-info">
            <div class="current-weather">
              <el-tag :type="getWeatherType(weatherInfo.weather?.weather)">
                {{ weatherInfo.weather?.weather || '-' }}
              </el-tag>
              <span class="temperature">{{ weatherInfo.weather?.temperature }}°C</span>
            </div>
            <div class="weather-details">
              <p>湿度：{{ weatherInfo.weather?.humidity }}%</p>
              <p>风向：{{ weatherInfo.weather?.winddirection }} {{ weatherInfo.weather?.windpower }}级</p>
              <p>更新时间：{{ formatTime(weatherInfo.weather?.reporttime) }}</p>
            </div>
          </div>
        </el-card>

        <!-- 设施统计 -->
        <el-card v-if="facilitiesStats" class="mb-4" header="周边设施">
          <div class="facilities-stats">
            <div
              v-for="(count, type) in facilitiesStats"
              :key="type"
              class="facility-type"
            >
              <span class="type-name">{{ getFacilityTypeName(type) }}：</span>
              <span class="type-count">{{ count }}个</span>
            </div>
          </div>
        </el-card>
      </div>
    </el-drawer>

    <!-- 路线规划对话框 -->
    <el-dialog
      v-model="routeDialogVisible"
      title="路线规划"
      width="600px"
    >
      <el-form :model="routeForm" label-width="80px">
        <el-form-item label="起点">
          <el-input
            v-model="routeForm.origin"
            placeholder="输入起点或点击地图选择"
            clearable
            @click="selectOriginPoint"
          />
        </el-form-item>
        <el-form-item label="终点">
          <el-input
            v-model="routeForm.destination"
            placeholder="输入终点或点击地图选择"
            clearable
            @click="selectDestinationPoint"
          />
        </el-form-item>
        <el-form-item label="途经点">
          <el-input
            v-model="routeForm.waypoints"
            placeholder="输入途经点（多个用分号分隔）"
            clearable
          />
        </el-form-item>
        <el-form-item label="出行方式">
          <el-radio-group v-model="routeForm.type">
            <el-radio label="driving">驾车</el-radio>
            <el-radio label="walking">步行</el-radio>
            <el-radio label="cycling">骑行</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="routeDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="planRoute">规划路线</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 地图操作按钮 -->
    <div class="map-actions">
      <el-button
        type="primary"
        icon="el-icon-menu"
        circle
        @click="infoDrawerVisible = true"
      />
      <el-button
        type="success"
        icon="el-icon-guide"
        circle
        @click="routeDialogVisible = true"
      />
      <el-button
        type="warning"
        icon="el-icon-location"
        circle
        @click="getCurrentLocation"
      />
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import mapService from '@/services/mapService'

export default {
  name: 'MapView',
  props: {
    villageId: {
      type: String,
      default: null
    },
    height: {
      type: String,
      default: '600px'
    },
    showControls: {
      type: Boolean,
      default: true
    }
  },
  emits: ['marker-click', 'facility-click', 'resident-click'],
  setup(props, { emit }) {
    // 响应式数据
    const mapInstance = ref(null)
    const currentTool = ref('pan')
    const infoDrawerVisible = ref(false)
    const routeDialogVisible = ref(false)
    const searchKeyword = ref('')
    const searchResults = ref([])
    const selectedVillage = ref(null)
    const weatherInfo = ref(null)
    const facilitiesStats = ref(null)
    const showVillages = ref(true)
    const showFacilities = ref(true)
    const showResidents = ref(false)

    // 路线规划表单
    const routeForm = reactive({
      origin: '',
      destination: '',
      waypoints: '',
      type: 'driving'
    })

    // 地图标记和图层
    const markers = ref([])
    const facilities = ref([])
    const villages = ref([])
    const residents = ref([])

    // 初始化地图
    const initMap = async () => {
      try {
        // 这里可以根据实际需求初始化不同的地图SDK
        // 例如：高德地图、百度地图、腾讯地图等
        // 以下是示例代码，需要根据实际地图SDK调整

        // 创建地图实例
        mapInstance.value = new AMap.Map('mapContainer', {
          zoom: 12,
          center: [116.397428, 39.90923], // 北京市中心
          mapStyle: 'amap://styles/normal'
        })

        // 添加地图控件
        if (props.showControls) {
          mapInstance.value.addControl(new AMap.Scale())
          mapInstance.value.addControl(new AMap.ToolBar())
          mapInstance.value.addControl(new AMap.MapType())
        }

        // 地图事件监听
        mapInstance.value.on('click', handleMapClick)
        mapInstance.value.on('complete', handleMapReady)

        // 如果有村庄ID，加载村庄数据
        if (props.villageId) {
          await loadVillageData(props.villageId)
        }

        // 加载周边设施
        await loadNearbyFacilities()

        // 获取当前位置
        await getCurrentLocation()

      } catch (error) {
        console.error('地图初始化失败:', error)
        ElMessage.error('地图加载失败，请检查网络连接')
      }
    }

    // 加载村庄数据
    const loadVillageData = async (villageId) => {
      try {
        const response = await mapService.getVillageMapInfo(villageId)
        if (response.success) {
          selectedVillage.value = response.data
          weatherInfo.value = response.data.weather

          // 设置地图中心点
          if (response.data.location?.coordinates) {
            const [lng, lat] = response.data.location.coordinates
            mapInstance.value.setCenter([lng, lat])
            mapInstance.value.setZoom(14)
          }

          // 添加村庄标记
          addVillageMarker(response.data)
        }
      } catch (error) {
        console.error('加载村庄数据失败:', error)
      }
    }

    // 加载周边设施
    const loadNearbyFacilities = async () => {
      if (!props.villageId) return

      try {
        const response = await mapService.getVillageServiceFacilities(props.villageId)
        if (response.success) {
          facilities.value = response.data.facilities

          // 统计设施数量
          const stats = {}
          Object.keys(response.data.facilities).forEach(type => {
            stats[type] = response.data.facilities[type].length
          })
          facilitiesStats.value = stats

          // 添加设施标记
          addFacilityMarkers(response.data.facilities)
        }
      } catch (error) {
        console.error('加载周边设施失败:', error)
      }
    }

    // 添加村庄标记
    const addVillageMarker = (villageData) => {
      if (!villageData.location?.coordinates) return

      const marker = new AMap.Marker({
        position: villageData.location.coordinates,
        title: villageData.name,
        icon: new AMap.Icon({
          size: new AMap.Size(32, 32),
          image: '/icons/village-marker.png'
        })
      })

      // 添加信息窗体
      const infoWindow = new AMap.InfoWindow({
        content: `
          <div class="village-info-window">
            <h4>${villageData.name}</h4>
            <p>人口：${villageData.population}人</p>
            <p>户数：${villageData.households}户</p>
            <p>地址：${villageData.address}</p>
          </div>
        `
      })

      marker.on('click', () => {
        infoWindow.open(mapInstance.value, marker.getPosition())
        emit('marker-click', villageData)
      })

      mapInstance.value.add(marker)
      markers.value.push(marker)
    }

    // 添加设施标记
    const addFacilityMarkers = (facilitiesData) => {
      Object.keys(facilitiesData).forEach(type => {
        facilitiesData[type].forEach(facility => {
          if (!facility.location) return

          const iconMap = {
            medical: '/icons/hospital.png',
            education: '/icons/school.png',
            government: '/icons/government.png',
            commercial: '/icons/shop.png',
            transportation: '/icons/transport.png',
            recreation: '/icons/park.png'
          }

          const marker = new AMap.Marker({
            position: facility.location,
            title: facility.name,
            icon: new AMap.Icon({
              size: new AMap.Size(24, 24),
              image: iconMap[type] || '/icons/facility.png'
            })
          })

          const infoWindow = new AMap.InfoWindow({
            content: `
              <div class="facility-info-window">
                <h4>${facility.name}</h4>
                <p>类型：${facility.type}</p>
                <p>地址：${facility.address}</p>
                <p>电话：${facility.tel || '-'}</p>
                ${facility.distance ? `<p>距离：${Math.round(facility.distance)}米</p>` : ''}
              </div>
            `
          })

          marker.on('click', () => {
            infoWindow.open(mapInstance.value, marker.getPosition())
            emit('facility-click', facility)
          })

          mapInstance.value.add(marker)
          markers.value.push(marker)
        })
      })
    }

    // 处理地图点击
    const handleMapClick = (e) => {
      const lnglat = e.lnglat

      switch (currentTool.value) {
        case 'marker':
          addCustomMarker(lnglat)
          break
        case 'measure':
          startMeasure(lnglat)
          break
        case 'draw':
          startDraw(lnglat)
          break
      }
    }

    // 处理地图准备就绪
    const handleMapReady = () => {
      console.log('地图准备就绪')
    }

    // 设置工具
    const setTool = (tool) => {
      currentTool.value = tool

      // 根据工具类型设置地图样式
      switch (tool) {
        case 'pan':
          mapInstance.value.setDefaultCursor('grab')
          break
        case 'marker':
          mapInstance.value.setDefaultCursor('crosshair')
          break
        case 'measure':
          mapInstance.value.setDefaultCursor('crosshair')
          break
        case 'draw':
          mapInstance.value.setDefaultCursor('crosshair')
          break
      }
    }

    // 添加自定义标记
    const addCustomMarker = (lnglat) => {
      const marker = new AMap.Marker({
        position: lnglat,
        icon: new AMap.Icon({
          size: new AMap.Size(24, 24),
          image: '/icons/custom-marker.png'
        })
      })

      mapInstance.value.add(marker)
      markers.value.push(marker)

      ElMessage.success('标记添加成功')
    }

    // 开始测距
    const startMeasure = (lnglat) => {
      // 这里可以实现测距功能
      ElMessage.info('测距功能开发中...')
    }

    // 开始绘制
    const startDraw = (lnglat) => {
      // 这里可以实现绘制功能
      ElMessage.info('绘制功能开发中...')
    }

    // 地图缩放
    const zoomIn = () => {
      mapInstance.value.zoomIn()
    }

    const zoomOut = () => {
      mapInstance.value.zoomOut()
    }

    const resetView = () => {
      if (selectedVillage.value?.location?.coordinates) {
        const [lng, lat] = selectedVillage.value.location.coordinates
        mapInstance.value.setCenter([lng, lat])
        mapInstance.value.setZoom(14)
      } else {
        mapInstance.value.setCenter([116.397428, 39.90923])
        mapInstance.value.setZoom(12)
      }
    }

    // 切换显示
    const toggleVillages = (show) => {
      // 实现村庄标记的显示/隐藏
      console.log('切换村庄显示:', show)
    }

    const toggleFacilities = (show) => {
      // 实现设施标记的显示/隐藏
      console.log('切换设施显示:', show)
    }

    const toggleResidents = (show) => {
      // 实现村民标记的显示/隐藏
      console.log('切换村民显示:', show)
    }

    // POI搜索
    const searchPOI = async () => {
      if (!searchKeyword.value.trim()) {
        ElMessage.warning('请输入搜索关键词')
        return
      }

      try {
        const response = await mapService.searchPOI(searchKeyword.value)
        if (response.success) {
          searchResults.value = response.data.pois

          // 在地图上显示搜索结果
          showSearchResults(response.data.pois)
        }
      } catch (error) {
        console.error('POI搜索失败:', error)
        ElMessage.error('搜索失败，请重试')
      }
    }

    // 显示搜索结果
    const showSearchResults = (pois) => {
      // 清除之前的搜索结果标记
      // 添加新的搜索结果标记到地图
      pois.forEach(poi => {
        if (poi.location) {
          const marker = new AMap.Marker({
            position: poi.location,
            title: poi.name,
            icon: new AMap.Icon({
              size: new AMap.Size(24, 24),
              image: '/icons/search-result.png'
            })
          })

          const infoWindow = new AMap.InfoWindow({
            content: `
              <div class="search-result-window">
                <h4>${poi.name}</h4>
                <p>类型：${poi.type}</p>
                <p>地址：${poi.address}</p>
                ${poi.distance ? `<p>距离：${Math.round(poi.distance)}米</p>` : ''}
              </div>
            `
          })

          marker.on('click', () => {
            infoWindow.open(mapInstance.value, marker.getPosition())
          })

          mapInstance.value.add(marker)
        }
      })
    }

    // 聚焦POI
    const focusOnPOI = (poi) => {
      if (poi.location) {
        mapInstance.value.setCenter(poi.location)
        mapInstance.value.setZoom(16)
      }
    }

    // 获取当前位置
    const getCurrentLocation = async () => {
      try {
        const response = await mapService.locateByIP()
        if (response.success) {
          // 根据IP定位结果设置地图中心
          const rectangle = response.data.rectangle
          if (rectangle && rectangle.length > 0) {
            const center = [
              (rectangle[0][0] + rectangle[1][0]) / 2,
              (rectangle[0][1] + rectangle[1][1]) / 2
            ]
            mapInstance.value.setCenter(center)
          }
        }
      } catch (error) {
        console.error('获取位置失败:', error)
      }
    }

    // 选择起点
    const selectOriginPoint = () => {
      currentTool.value = 'marker'
      ElMessage.info('请在地图上点击选择起点')
    }

    // 选择终点
    const selectDestinationPoint = () => {
      currentTool.value = 'marker'
      ElMessage.info('请在地图上点击选择终点')
    }

    // 规划路线
    const planRoute = async () => {
      if (!routeForm.origin || !routeForm.destination) {
        ElMessage.warning('请输入起点和终点')
        return
      }

      try {
        const response = await mapService.planRoute({
          origin: routeForm.origin,
          destination: routeForm.destination,
          waypoints: routeForm.waypoints ? routeForm.waypoints.split(';') : [],
          type: routeForm.type
        })

        if (response.success) {
          // 在地图上显示路线
          showRoute(response.data)
          routeDialogVisible.value = false
        }
      } catch (error) {
        console.error('路线规划失败:', error)
        ElMessage.error('路线规划失败，请重试')
      }
    }

    // 显示路线
    const showRoute = (routeData) => {
      // 这里可以实现路线显示
      ElMessage.success('路线规划成功')
    }

    // 获取天气类型
    const getWeatherType = (weather) => {
      const weatherMap = {
        '晴': 'success',
        '多云': 'primary',
        '阴': 'info',
        '雨': 'warning',
        '雪': 'danger'
      }
      return weatherMap[weather] || 'info'
    }

    // 获取设施类型名称
    const getFacilityTypeName = (type) => {
      const typeMap = {
        medical: '医疗',
        education: '教育',
        government: '政务',
        commercial: '商业',
        transportation: '交通',
        recreation: '休闲'
      }
      return typeMap[type] || type
    }

    // 格式化时间
    const formatTime = (time) => {
      if (!time) return '-'
      return new Date(time).toLocaleString()
    }

    // 清理地图标记
    const clearMarkers = () => {
      markers.value.forEach(marker => {
        mapInstance.value.remove(marker)
      })
      markers.value = []
    }

    // 监听props变化
    watch(() => props.villageId, (newVillageId) => {
      if (newVillageId) {
        loadVillageData(newVillageId)
        loadNearbyFacilities()
      }
    })

    // 生命周期
    onMounted(() => {
      initMap()
    })

    onUnmounted(() => {
      if (mapInstance.value) {
        mapInstance.value.destroy()
      }
    })

    return {
      // 模板引用
      mapInstance,
      currentTool,
      infoDrawerVisible,
      routeDialogVisible,
      searchKeyword,
      searchResults,
      selectedVillage,
      weatherInfo,
      facilitiesStats,
      showVillages,
      showFacilities,
      showResidents,
      routeForm,
      markers,
      facilities,
      villages,
      residents,

      // 方法
      setTool,
      zoomIn,
      zoomOut,
      resetView,
      toggleVillages,
      toggleFacilities,
      toggleResidents,
      searchPOI,
      focusOnPOI,
      getCurrentLocation,
      selectOriginPoint,
      selectDestinationPoint,
      planRoute,
      getWeatherType,
      getFacilityTypeName,
      formatTime,
      clearMarkers
    }
  }
}
</script>

<style scoped>
.map-view {
  position: relative;
  width: 100%;
  height: v-bind(height);
}

.map-toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-actions {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-info-content {
  padding: 16px;
}

.search-result-tag {
  display: block;
  margin-bottom: 8px;
  cursor: pointer;
}

.search-result-tag:hover {
  background-color: #f0f0f0;
}

.village-info h4 {
  margin: 0 0 8px 0;
  color: #303133;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
}

.info-item .label {
  color: #909399;
}

.info-item .value {
  color: #303133;
  font-weight: 500;
}

.weather-info {
  text-align: center;
}

.current-weather {
  margin-bottom: 12px;
}

.temperature {
  font-size: 24px;
  font-weight: bold;
  margin-left: 8px;
  color: #409EFF;
}

.weather-details p {
  margin: 4px 0;
  font-size: 14px;
  color: #606266;
}

.facilities-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.facility-type {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.type-name {
  color: #606266;
}

.type-count {
  color: #409EFF;
  font-weight: 500;
}

/* 地图信息窗体样式 */
:deep(.village-info-window) {
  padding: 12px;
  min-width: 200px;
}

:deep(.village-info-window h4) {
  margin: 0 0 8px 0;
  color: #303133;
}

:deep(.village-info-window p) {
  margin: 4px 0;
  color: #606266;
}

:deep(.facility-info-window) {
  padding: 12px;
  min-width: 200px;
}

:deep(.facility-info-window h4) {
  margin: 0 0 8px 0;
  color: #303133;
}

:deep(.facility-info-window p) {
  margin: 4px 0;
  color: #606266;
}

:deep(.search-result-window) {
  padding: 12px;
  min-width: 200px;
}

:deep(.search-result-window h4) {
  margin: 0 0 8px 0;
  color: #303133;
}

:deep(.search-result-window p) {
  margin: 4px 0;
  color: #606266;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-3 {
  margin-top: 12px;
}

.text-gray-500 {
  color: #909399;
}

.text-gray-600 {
  color: #606266;
}
</style>