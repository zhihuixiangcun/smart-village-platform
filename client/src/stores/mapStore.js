import { defineStore } from 'pinia';
import { mapApi } from '@/api/map';

/**
 * 地图状态管理Store
 */
export const useMapStore = defineStore('map', {
  state: () => ({
    // 地图配置
    mapConfig: null,
    // 地图数据
    mapData: {
      locations: {},
      dangerZones: [],
      resources: [],
      residents: {
        clusters: [],
        individuals: []
      }
    },
    // 图层显示控制
    layerVisibility: {
      locations: true,
      dangerZones: true,
      resources: true,
      residents: false
    },
    // 当前选中的图层
    currentLayer: 'normal',
    // 加载状态
    loading: false,
    // 错误信息
    error: null,
    // 搜索关键词
    searchKeyword: '',
    // 搜索结果
    searchResults: [],
    // 用户位置
    userLocation: null,
    // 定位状态
    locating: false
  }),

  getters: {
    // 是否正在加载
    isLoading: (state) => state.loading,

    // 获取错误信息
    getError: (state) => state.error,

    // 获取地图配置
    getMapConfig: (state) => state.mapConfig,

    // 获取地点统计
    getLocationStats: (state) => {
      const locations = state.mapData.locations;
      const stats = {};
      Object.keys(locations).forEach(type => {
        stats[type] = locations[type].length;
      });
      return stats;
    },

    // 获取危险区域统计
    getDangerZoneStats: (state) => {
      const zones = state.mapData.dangerZones;
      const stats = {
        total: zones.length,
        byLevel: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        },
        active: 0,
        monitoring: 0
      };

      zones.forEach(zone => {
        stats.byLevel[zone.dangerLevel]++;
        if (zone.status === 'active') stats.active++;
        if (zone.status === 'monitoring') stats.monitoring++;
      });

      return stats;
    },

    // 获取应急资源统计
    getResourceStats: (state) => {
      const resources = state.mapData.resources;
      const stats = {
        total: resources.length,
        byType: {},
        byStatus: {
          available: 0,
          in_use: 0,
          maintenance: 0,
          unavailable: 0,
          damaged: 0
        }
      };

      resources.forEach(resource => {
        // 按类型统计
        if (!stats.byType[resource.resourceType]) {
          stats.byType[resource.resourceType] = 0;
        }
        stats.byType[resource.resourceType]++;

        // 按状态统计
        stats.byStatus[resource.status]++;
      });

      return stats;
    },

    // 获取在线村民数量
    getOnlineResidentsCount: (state) => {
      return state.mapData.residents.individuals.length +
             state.mapData.residents.clusters.reduce((sum, cluster) => sum + cluster.count, 0);
    },

    // 是否显示某图层
    isLayerVisible: (state) => (layerType) => {
      return state.layerVisibility[layerType] || false;
    }
  },

  actions: {
    // 获取村庄地图配置
    async fetchMapConfig(villageId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.getVillageMapConfig(villageId);
        this.mapConfig = response.data;
        return response.data;
      } catch (error) {
        this.error = error.message || '获取地图配置失败';
        console.error('获取地图配置失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 更新村庄地图配置
    async updateMapConfig(villageId, updates) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.updateVillageMapConfig(villageId, updates);
        this.mapConfig = response.data;
        return response.data;
      } catch (error) {
        this.error = error.message || '更新地图配置失败';
        console.error('更新地图配置失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 获取地图数据汇总
    async fetchMapData(villageId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.getMapDataSummary(villageId);
        this.mapData = response.data;
        return response.data;
      } catch (error) {
        this.error = error.message || '获取地图数据失败';
        console.error('获取地图数据失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 刷新地图数据
    async refreshMapData(villageId) {
      await this.fetchMapData(villageId);
    },

    // 切换图层显示
    toggleLayer(layerType) {
      if (this.layerVisibility.hasOwnProperty(layerType)) {
        this.layerVisibility[layerType] = !this.layerVisibility[layerType];
      }
    },

    // 设置图层显示
    setLayerVisibility(layerType, visible) {
      if (this.layerVisibility.hasOwnProperty(layerType)) {
        this.layerVisibility[layerType] = visible;
      }
    },

    // 切换当前图层
    setCurrentLayer(layerType) {
      this.currentLayer = layerType;
    },

    // 搜索地点
    async searchLocations(villageId, keyword, options = {}) {
      this.loading = true;
      this.error = null;
      this.searchKeyword = keyword;
      try {
        const response = await mapApi.searchLocations(villageId, keyword, options);
        this.searchResults = response.data;
        return response.data;
      } catch (error) {
        this.error = error.message || '搜索地点失败';
        console.error('搜索地点失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 清除搜索结果
    clearSearchResults() {
      this.searchResults = [];
      this.searchKeyword = '';
    },

    // 添加地点
    async addLocation(locationData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.addLocation(locationData);
        return response.data;
      } catch (error) {
        this.error = error.message || '添加地点失败';
        console.error('添加地点失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 更新地点
    async updateLocation(locationId, updates) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.updateLocation(locationId, updates);
        return response.data;
      } catch (error) {
        this.error = error.message || '更新地点失败';
        console.error('更新地点失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 删除地点
    async deleteLocation(locationId) {
      this.loading = true;
      this.error = null;
      try {
        await mapApi.deleteLocation(locationId);
        return true;
      } catch (error) {
        this.error = error.message || '删除地点失败';
        console.error('删除地点失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 添加危险区域
    async addDangerZone(zoneData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.addDangerZone(zoneData);
        return response.data;
      } catch (error) {
        this.error = error.message || '添加危险区域失败';
        console.error('添加危险区域失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 更新危险区域状态
    async updateDangerZoneStatus(zoneId, status) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.updateDangerZoneStatus(zoneId, status);
        return response.data;
      } catch (error) {
        this.error = error.message || '更新危险区域状态失败';
        console.error('更新危险区域状态失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 检查位置是否在危险区域
    async checkLocationInDangerZone(villageId, longitude, latitude) {
      try {
        const response = await mapApi.checkLocationInDangerZone({
          villageId,
          longitude,
          latitude
        });
        return response.data;
      } catch (error) {
        console.error('检查危险区域失败:', error);
        throw error;
      }
    },

    // 添加应急资源
    async addEmergencyResource(resourceData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.addEmergencyResource(resourceData);
        return response.data;
      } catch (error) {
        this.error = error.message || '添加应急资源失败';
        console.error('添加应急资源失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 更新资源状态
    async updateResourceStatus(resourceId, status, remarks) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.updateResourceStatus(resourceId, status, remarks);
        return response.data;
      } catch (error) {
        this.error = error.message || '更新资源状态失败';
        console.error('更新资源状态失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 记录资源使用
    async recordResourceUsage(resourceId, usageData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.recordResourceUsage(resourceId, usageData);
        return response.data;
      } catch (error) {
        this.error = error.message || '记录资源使用失败';
        console.error('记录资源使用失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 记录资源维护
    async recordResourceMaintenance(resourceId, checkData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.recordResourceMaintenance(resourceId, checkData);
        return response.data;
      } catch (error) {
        this.error = error.message || '记录资源维护失败';
        console.error('记录资源维护失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 搜索附近资源
    async findNearbyResources(longitude, latitude, maxDistance = 500) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.findNearbyResources({
          longitude,
          latitude,
          maxDistance
        });
        return response.data;
      } catch (error) {
        this.error = error.message || '搜索附近资源失败';
        console.error('搜索附近资源失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 更新村民位置
    async updateResidentLocation(longitude, latitude, options = {}) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.updateResidentLocation({
          longitude,
          latitude,
          ...options
        });
        return response.data;
      } catch (error) {
        this.error = error.message || '更新位置失败';
        console.error('更新位置失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 获取村庄内村民位置
    async fetchResidentLocations(villageId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.getResidentLocations(villageId);
        this.mapData.residents = response.data;
        return response.data;
      } catch (error) {
        this.error = error.message || '获取村民位置失败';
        console.error('获取村民位置失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 搜索附近村民
    async findNearbyResidents(villageId, longitude, latitude, radius = 500) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.findNearbyResidents({
          villageId,
          longitude,
          latitude,
          radius
        });
        return response.data;
      } catch (error) {
        this.error = error.message || '搜索附近村民失败';
        console.error('搜索附近村民失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 更新隐私设置
    async updatePrivacySettings(settings) {
      this.loading = true;
      this.error = null;
      try {
        const response = await mapApi.updatePrivacySettings(settings);
        return response.data;
      } catch (error) {
        this.error = error.message || '更新隐私设置失败';
        console.error('更新隐私设置失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 计算距离
    async calculateDistance(point1, point2) {
      try {
        const response = await mapApi.calculateDistance(point1, point2);
        return response.data;
      } catch (error) {
        console.error('计算距离失败:', error);
        throw error;
      }
    },

    // 计算面积
    async calculateArea(coordinates) {
      try {
        const response = await mapApi.calculateArea(coordinates);
        return response.data;
      } catch (error) {
        console.error('计算面积失败:', error);
        throw error;
      }
    },

    // 设置用户位置
    setUserLocation(location) {
      this.userLocation = location;
    },

    // 设置定位状态
    setLocating(status) {
      this.locating = status;
    },

    // 清除错误
    clearError() {
      this.error = null;
    },

    // 重置状态
    resetState() {
      this.mapConfig = null;
      this.mapData = {
        locations: {},
        dangerZones: [],
        resources: [],
        residents: {
          clusters: [],
          individuals: []
        }
      };
      this.layerVisibility = {
        locations: true,
        dangerZones: true,
        resources: true,
        residents: false
      };
      this.currentLayer = 'normal';
      this.loading = false;
      this.error = null;
      this.searchKeyword = '';
      this.searchResults = [];
      this.userLocation = null;
      this.locating = false;
    }
  }
});

export default useMapStore;
