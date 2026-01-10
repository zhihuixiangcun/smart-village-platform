import request from '@/utils/request';

/**
 * 地图相关API接口
 */

// ============ 村域地图配置 ============

/**
 * 获取村庄地图配置
 * @param {String} villageId - 村庄ID
 */
export function getVillageMapConfig(villageId) {
  return request({
    url: `/map/village/${villageId}`,
    method: 'get',
  });
}

/**
 * 更新村庄地图配置
 * @param {String} villageId - 村庄ID
 * @param {Object} data - 更新数据
 */
export function updateVillageMapConfig(villageId, data) {
  return request({
    url: `/map/village/${villageId}`,
    method: 'put',
    data,
  });
}

/**
 * 获取地图数据汇总
 * @param {String} villageId - 村庄ID
 */
export function getMapDataSummary(villageId) {
  return request({
    url: `/map/village/${villageId}/summary`,
    method: 'get',
  });
}

// ============ 地点管理 ============

/**
 * 获取村庄内所有地点
 * @param {String} villageId - 村庄ID
 * @param {Object} params - 查询参数
 */
export function getLocations(villageId, params = {}) {
  return request({
    url: `/map/locations/${villageId}`,
    method: 'get',
    params,
  });
}

/**
 * 添加地点
 * @param {Object} data - 地点数据
 */
export function addLocation(data) {
  return request({
    url: '/map/locations',
    method: 'post',
    data,
  });
}

/**
 * 更新地点信息
 * @param {String} locationId - 地点ID
 * @param {Object} data - 更新数据
 */
export function updateLocation(locationId, data) {
  return request({
    url: `/map/locations/${locationId}`,
    method: 'put',
    data,
  });
}

/**
 * 删除地点
 * @param {String} locationId - 地点ID
 */
export function deleteLocation(locationId) {
  return request({
    url: `/map/locations/${locationId}`,
    method: 'delete',
  });
}

/**
 * 搜索附近地点
 * @param {Object} params - 查询参数
 */
export function findNearbyLocations(params) {
  return request({
    url: '/map/locations/nearby',
    method: 'get',
    params,
  });
}

/**
 * 搜索地点
 * @param {String} villageId - 村庄ID
 * @param {String} keyword - 搜索关键词
 * @param {Object} options - 选项
 */
export function searchLocations(villageId, keyword, options = {}) {
  return request({
    url: '/map/locations/search',
    method: 'get',
    params: {
      villageId,
      keyword,
      ...options,
    },
  });
}

// ============ 危险区域管理 ============

/**
 * 获取村庄内所有危险区域
 * @param {String} villageId - 村庄ID
 */
export function getDangerZones(villageId) {
  return request({
    url: `/map/danger-zones/${villageId}`,
    method: 'get',
  });
}

/**
 * 添加危险区域
 * @param {Object} data - 危险区域数据
 */
export function addDangerZone(data) {
  return request({
    url: '/map/danger-zones',
    method: 'post',
    data,
  });
}

/**
 * 更新危险区域状态
 * @param {String} zoneId - 危险区域ID
 * @param {String} status - 状态
 */
export function updateDangerZoneStatus(zoneId, status) {
  return request({
    url: `/map/danger-zones/${zoneId}/status`,
    method: 'put',
    data: { status },
  });
}

/**
 * 检查位置是否在危险区域
 * @param {Object} params - 查询参数
 */
export function checkLocationInDangerZone(params) {
  return request({
    url: '/map/danger-zones/check',
    method: 'get',
    params,
  });
}

// ============ 应急资源管理 ============

/**
 * 获取村庄内所有应急资源
 * @param {String} villageId - 村庄ID
 * @param {Object} params - 查询参数
 */
export function getEmergencyResources(villageId, params = {}) {
  return request({
    url: `/map/resources/${villageId}`,
    method: 'get',
    params,
  });
}

/**
 * 添加应急资源
 * @param {Object} data - 资源数据
 */
export function addEmergencyResource(data) {
  return request({
    url: '/map/resources',
    method: 'post',
    data,
  });
}

/**
 * 更新资源状态
 * @param {String} resourceId - 资源ID
 * @param {String} status - 状态
 * @param {String} remarks - 备注
 */
export function updateResourceStatus(resourceId, status, remarks) {
  return request({
    url: `/map/resources/${resourceId}/status`,
    method: 'put',
    data: { status, remarks },
  });
}

/**
 * 记录资源使用
 * @param {String} resourceId - 资源ID
 * @param {Object} usageData - 使用数据
 */
export function recordResourceUsage(resourceId, usageData) {
  return request({
    url: `/map/resources/${resourceId}/usage`,
    method: 'post',
    data: usageData,
  });
}

/**
 * 记录资源维护
 * @param {String} resourceId - 资源ID
 * @param {Object} checkData - 检查数据
 */
export function recordResourceMaintenance(resourceId, checkData) {
  return request({
    url: `/map/resources/${resourceId}/maintenance`,
    method: 'post',
    data: checkData,
  });
}

/**
 * 搜索附近应急资源
 * @param {Object} params - 查询参数
 */
export function findNearbyResources(params) {
  return request({
    url: '/map/resources/nearby',
    method: 'get',
    params,
  });
}

/**
 * 获取需要维护的资源
 * @param {String} villageId - 村庄ID
 */
export function getResourcesNeedingMaintenance(villageId) {
  return request({
    url: `/map/resources/maintenance/${villageId}`,
    method: 'get',
  });
}

/**
 * 获取即将过期的资源
 * @param {String} villageId - 村庄ID
 * @param {Number} days - 天数
 */
export function getExpiringResources(villageId, days = 30) {
  return request({
    url: `/map/resources/expiring/${villageId}`,
    method: 'get',
    params: { days },
  });
}

// ============ 村民位置管理 ============

/**
 * 更新村民位置
 * @param {Object} data - 位置数据
 */
export function updateResidentLocation(data) {
  return request({
    url: '/map/residents/location',
    method: 'post',
    data,
  });
}

/**
 * 获取村庄内村民位置（公开）
 * @param {String} villageId - 村庄ID
 */
export function getResidentLocations(villageId) {
  return request({
    url: `/map/residents/${villageId}`,
    method: 'get',
  });
}

/**
 * 搜索附近村民（用于应急响应）
 * @param {Object} params - 查询参数
 */
export function findNearbyResidents(params) {
  return request({
    url: '/map/residents/nearby',
    method: 'get',
    params,
  });
}

/**
 * 更新位置隐私设置
 * @param {Object} data - 隐私设置
 */
export function updatePrivacySettings(data) {
  return request({
    url: '/map/residents/privacy',
    method: 'put',
    data,
  });
}

// ============ 工具函数 ============

/**
 * 计算两点间距离
 * @param {Object} point1 - 点1 {longitude, latitude}
 * @param {Object} point2 - 点2 {longitude, latitude}
 */
export function calculateDistance(point1, point2) {
  return request({
    url: '/map/calculate-distance',
    method: 'post',
    data: { point1, point2 },
  });
}

/**
 * 计算多边形面积
 * @param {Array} coordinates - 坐标数组 [[longitude, latitude], ...]
 */
export function calculateArea(coordinates) {
  return request({
    url: '/map/calculate-area',
    method: 'post',
    data: { coordinates },
  });
}

// 导出所有API
export default {
  getVillageMapConfig,
  updateVillageMapConfig,
  getMapDataSummary,
  getLocations,
  addLocation,
  updateLocation,
  deleteLocation,
  findNearbyLocations,
  searchLocations,
  getDangerZones,
  addDangerZone,
  updateDangerZoneStatus,
  checkLocationInDangerZone,
  getEmergencyResources,
  addEmergencyResource,
  updateResourceStatus,
  recordResourceUsage,
  recordResourceMaintenance,
  findNearbyResources,
  getResourcesNeedingMaintenance,
  getExpiringResources,
  updateResidentLocation,
  getResidentLocations,
  findNearbyResidents,
  updatePrivacySettings,
  calculateDistance,
  calculateArea,
};

// 命名导出（便于按需导入）
export const mapApi = {
  getVillageMapConfig,
  updateVillageMapConfig,
  getMapDataSummary,
  getLocations,
  addLocation,
  updateLocation,
  deleteLocation,
  findNearbyLocations,
  searchLocations,
  getDangerZones,
  addDangerZone,
  updateDangerZoneStatus,
  checkLocationInDangerZone,
  getEmergencyResources,
  addEmergencyResource,
  updateResourceStatus,
  recordResourceUsage,
  recordResourceMaintenance,
  findNearbyResources,
  getResourcesNeedingMaintenance,
  getExpiringResources,
  updateResidentLocation,
  getResidentLocations,
  findNearbyResidents,
  updatePrivacySettings,
  calculateDistance,
  calculateArea,
};
