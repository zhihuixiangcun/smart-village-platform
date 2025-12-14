/**
 * 地图服务路由
 */

const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');
const auth = require('../middleware/auth');

// 基础地图功能
router.post('/geocode', mapController.geocodeAddress); // 地址解析
router.get('/reverse-geocode', mapController.reverseGeocode); // 逆地址解析
router.get('/poi/search', mapController.searchPoi); // POI搜索
router.post('/route/plan', mapController.planRoute); // 路线规划
router.post('/distance/calculate', mapController.calculateDistance); // 距离计算
router.get('/weather', mapController.getWeather); // 天气查询
router.get('/ip/location', mapController.locateByIP); // IP定位
router.get('/district/boundary', mapController.getDistrictBoundary); // 行政区边界

// 批量操作
router.post('/batch/geocode', mapController.batchGeocode); // 批量地址解析

// 村庄地图服务
router.get('/village/:villageId', mapController.getVillageMapInfo); // 获取村庄地图信息
router.get('/village/:villageId/facilities', mapController.getVillageServiceFacilities); // 获取村庄服务设施

// 村民位置服务（需要认证）
router.get('/resident/:residentId/location', auth.authenticate, mapController.getResidentLocation); // 获取村民位置
router.put('/resident/:residentId/location', auth.authenticate, mapController.updateResidentLocation); // 更新村民位置

// 管理接口
router.delete('/cache/clear', auth.authenticate, auth.requireRole(['admin']), mapController.clearCache); // 清理缓存
router.get('/service/status', mapController.getServiceStatus); // 服务状态

module.exports = router;