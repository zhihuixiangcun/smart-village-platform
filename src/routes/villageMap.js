const express = require('express');
const router = express.Router();
const VillageMapController = require('../controllers/villageMapController');
const { body, param, query } = require('express-validator');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// 创建控制器实例
const mapController = new VillageMapController();

// 限流配置
const locationUpdateLimit = rateLimit({
  windowMs: 30 * 1000, // 30秒
  max: 10, // 每30秒最多10次位置更新
  message: {
    success: false,
    message: '位置更新过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const mapDataLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 20, // 每分钟最多20次数据请求
  message: {
    success: false,
    message: '地图数据请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 验证中间件
const handleValidationErrors = (req, res, next) => {
  const errors = require('express-validator').validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '参数验证失败',
      errors: errors.array()
    });
  }
  next();
};

// 路由定义

/**
 * @swagger
 * components:
 *   schemas:
 *     VillageMap:
 *       type: object
 *       required:
 *         - villageId
 *         - mapName
 *       properties:
 *         villageId:
 *           type: string
 *           description: 村庄ID
 *         mapName:
 *           type: string
 *           description: 地图名称
 *         mapType:
 *           type: string
 *           enum: [base, emergency, disaster, planning]
 *           description: 地图类型
 *         mapBounds:
 *           type: object
 *           properties:
 *             northeast:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *             southwest:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *             center:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *             zoomLevel:
 *               type: number
 *               description: 缩放级别
 */

/**
 * @swagger
 * /api/village-map:
 *   post:
 *     summary: 创建村庄地图
 *     tags: [Village Map]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mapName
 *             properties:
 *               mapName:
 *                 type: string
 *                 description: 地图名称
 *               mapType:
 *                 type: string
 *                 enum: [base, emergency, disaster, planning]
 *                 default: base
 *               mapBounds:
 *                 type: object
 *                 properties:
 *                   northeast:
 *                     type: object
 *                     properties:
 *                       latitude:
 *                         type: number
 *                       longitude:
 *                         type: number
 *                   southwest:
 *                     type: object
 *                     properties:
 *                       latitude:
 *                         type: number
 *                       longitude:
 *                         type: number
 *                   center:
 *                     type: object
 *                     properties:
 *                       latitude:
 *                         type: number
 *                       longitude:
 *                         type: number
 *                   zoomLevel:
 *                     type: number
 *                     default: 15
 *     responses:
 *       201:
 *         description: 村庄地图创建成功
 *       400:
 *         description: 参数验证失败
 *       500:
 *         description: 服务器错误
 */
router.post('/', auth, [
  body('mapName')
    .notEmpty()
    .withMessage('地图名称不能为空')
    .isLength({ max: 100 })
    .withMessage('地图名称不能超过100个字符'),
  body('mapType')
    .optional()
    .isIn(['base', 'emergency', 'disaster', 'planning'])
    .withMessage('地图类型无效'),
  body('mapBounds.northeast.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('东北角纬度必须在-90到90之间'),
  body('mapBounds.northeast.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('东北角经度必须在-180到180之间'),
  body('mapBounds.southwest.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('西南角纬度必须在-90到90之间'),
  body('mapBounds.southwest.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('西南角经度必须在-180到180之间'),
  body('mapBounds.center.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('中心点纬度必须在-90到90之间'),
  body('mapBounds.center.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('中心点经度必须在-180到180之间'),
  body('mapBounds.zoomLevel')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('缩放级别必须在1到20之间'),
  handleValidationErrors
], mapController.createVillageMap);

/**
 * @swagger
 * /api/village-map/{villageId}:
 *   get:
 *     summary: 获取村庄地图
 *     tags: [Village Map]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: villageId
 *         required: true
 *         schema:
 *           type: string
 *         description: 村庄ID
 *       - in: query
 *         name: mapType
 *         schema:
 *           type: string
 *           enum: [base, emergency, disaster, planning]
 *           default: base
 *         description: 地图类型
 *     responses:
 *       200:
 *         description: 村庄地图数据
 *       404:
 *         description: 地图不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:villageId', auth, mapDataLimit, [
  param('villageId')
    .optional()
    .isMongoId()
    .withMessage('村庄ID格式错误'),
  query('mapType')
    .optional()
    .isIn(['base', 'emergency', 'disaster', 'planning'])
    .withMessage('地图类型无效'),
  handleValidationErrors
], mapController.getVillageMap);

/**
 * @swagger
 * /api/village-map/location:
 *   post:
 *     summary: 更新用户位置
 *     tags: [Village Map]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *               - sessionId
 *             properties:
 *               latitude:
 *                 type: number
 *                 description: 纬度
 *               longitude:
 *                 type: number
 *                 description: 经度
 *               accuracy:
 *                 type: number
 *                 description: 精度（米）
 *               altitude:
 *                 type: number
 *                 description: 海拔高度
 *               heading:
 *                 type: number
 *                 description: 方向角度
 *               speed:
 *                 type: number
 *                 description: 速度（m/s）
 *               sessionId:
 *                 type: string
 *                 description: 会话ID
 *               trackingSettings:
 *                 type: object
 *                 properties:
 *                   trackingMode:
 *                     type: string
 *                     enum: [manual, auto, emergency]
 *                   updateInterval:
 *                     type: number
 *                     description: 更新间隔（毫秒）
 *                   accuracyThreshold:
 *                     type: number
 *                     description: 精度阈值（米）
 *               privacySettings:
 *                 type: object
 *                 properties:
 *                   isVisibleToPublic:
 *                     type: boolean
 *                   anonymizePublic:
 *                     type: boolean
 *                   blurRadius:
 *                     type: number
 *                     description: 模糊半径（米）
 *               deviceInfo:
 *                 type: object
 *                 properties:
 *                   userAgent:
 *                     type: string
 *                   platform:
 *                     type: string
 *                   deviceId:
 *                     type: string
 *               activityStatus:
 *                 type: object
 *                 properties:
 *                   isMoving:
 *                     type: boolean
 *                   activityType:
 *                     type: string
 *                     enum: [still, walking, running, cycling, driving, unknown]
 *               batteryStatus:
 *                 type: object
 *                 properties:
 *                   level:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                   isCharging:
 *                     type: boolean
 *               networkStatus:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [none, ethernet, wifi, cellular, unknown]
 *                   effectiveType:
 *                     type: string
 *                     enum: [slow-2g, 2g, 3g, 4g]
 *     responses:
 *       200:
 *         description: 位置更新成功
 *       400:
 *         description: 参数验证失败
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器错误
 */
router.post('/location', auth, locationUpdateLimit, [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('纬度必须在-90到90之间'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('经度必须在-180到180之间'),
  body('accuracy')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('精度必须为非负数'),
  body('altitude')
    .optional()
    .isFloat()
    .withMessage('海拔高度必须为数字'),
  body('heading')
    .optional()
    .isFloat({ min: 0, max: 360 })
    .withMessage('方向角度必须在0到360之间'),
  body('speed')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('速度必须为非负数'),
  body('sessionId')
    .notEmpty()
    .withMessage('会话ID不能为空'),
  body('trackingSettings.trackingMode')
    .optional()
    .isIn(['manual', 'auto', 'emergency'])
    .withMessage('追踪模式无效'),
  body('trackingSettings.updateInterval')
    .optional()
    .isInt({ min: 5000, max: 300000 })
    .withMessage('更新间隔必须在5秒到5分钟之间'),
  body('trackingSettings.accuracyThreshold')
    .optional()
    .isFloat({ min: 5, max: 1000 })
    .withMessage('精度阈值必须在5米到1000米之间'),
  body('privacySettings.blurRadius')
    .optional()
    .isInt({ min: 10, max: 500 })
    .withMessage('模糊半径必须在10米到500米之间'),
  body('activityStatus.activityType')
    .optional()
    .isIn(['still', 'walking', 'running', 'cycling', 'driving', 'unknown'])
    .withMessage('活动类型无效'),
  body('batteryStatus.level')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('电池电量必须在0到1之间'),
  body('networkStatus.type')
    .optional()
    .isIn(['none', 'ethernet', 'wifi', 'cellular', 'unknown'])
    .withMessage('网络类型无效'),
  body('networkStatus.effectiveType')
    .optional()
    .isIn(['slow-2g', '2g', '3g', '4g'])
    .withMessage('网络有效类型无效'),
  handleValidationErrors
], mapController.updateLocation);

/**
 * @swagger
 * /api/village-map/{villageId}/realtime-locations:
 *   get:
 *     summary: 获取实时位置
 *     tags: [Village Map]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: villageId
 *         required: true
 *         schema:
 *           type: string
 *         description: 村庄ID
 *       - in: query
 *         name: includeOffline
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否包含离线用户
 *       - in: query
 *         name: onlyEmergency
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否只显示紧急状态用户
 *     responses:
 *       200:
 *         description: 实时位置列表
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.get('/:villageId/realtime-locations', auth, mapDataLimit, [
  param('villageId')
    .optional()
    .isMongoId()
    .withMessage('村庄ID格式错误'),
  query('includeOffline')
    .optional()
    .isBoolean()
    .withMessage('includeOffline必须为布尔值'),
  query('onlyEmergency')
    .optional()
    .isBoolean()
    .withMessage('onlyEmergency必须为布尔值'),
  handleValidationErrors
], mapController.getRealTimeLocations);

/**
 * @swagger
 * /api/village-map/{villageId}/disaster-warning:
 *   post:
 *     summary: 添加灾害预警
 *     tags: [Village Map]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: villageId
 *         required: true
 *         schema:
 *           type: string
 *         description: 村庄ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - severity
 *               - title
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [flood, fire, landslide, earthquake, drought, storm, epidemic, chemical, other]
 *                 description: 灾害类型
 *               severity:
 *                 type: string
 *                 enum: [blue, yellow, orange, red]
 *                 description: 严重程度
 *               title:
 *                 type: string
 *                 description: 预警标题
 *               description:
 *                 type: string
 *                 description: 预警描述
 *               centerPoint:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [Point]
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                     minItems: 2
 *                     maxItems: 2
 *                 description: 预警中心点
 *               radius:
 *                 type: number
 *                 description: 影响半径（米）
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: 过期时间
 *               isPublic:
 *                 type: boolean
 *                 default: true
 *                 description: 是否公开
 *               actions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 建议行动
 *     responses:
 *       200:
 *         description: 灾害预警添加成功
 *       400:
 *         description: 参数验证失败
 *       500:
 *         description: 服务器错误
 */
router.post('/:villageId/disaster-warning', auth, [
  param('villageId')
    .optional()
    .isMongoId()
    .withMessage('村庄ID格式错误'),
  body('type')
    .isIn(['flood', 'fire', 'landslide', 'earthquake', 'drought', 'storm', 'epidemic', 'chemical', 'other'])
    .withMessage('灾害类型无效'),
  body('severity')
    .isIn(['blue', 'yellow', 'orange', 'red'])
    .withMessage('严重程度无效'),
  body('title')
    .notEmpty()
    .withMessage('预警标题不能为空')
    .isLength({ max: 200 })
    .withMessage('预警标题不能超过200个字符'),
  body('centerPoint.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('中心点坐标必须是包含2个元素的数组'),
  body('centerPoint.coordinates.0')
    .isFloat({ min: -180, max: 180 })
    .withMessage('经度必须在-180到180之间'),
  body('centerPoint.coordinates.1')
    .isFloat({ min: -90, max: 90 })
    .withMessage('纬度必须在-90到90之间'),
  body('radius')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('影响半径必须为非负数'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('过期时间格式错误'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic必须为布尔值'),
  handleValidationErrors
], mapController.addDisasterWarning);

/**
 * @swagger
 * /api/village-map/{villageId}/evacuation-routes:
 *   post:
 *     summary: 计算应急撤离路线
 *     tags: [Village Map]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: villageId
 *         required: true
 *         schema:
 *           type: string
 *         description: 村庄ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startPoint
 *             properties:
 *               startPoint:
 *                 type: object
 *                 required:
 *                   - latitude
 *                   - longitude
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     description: 起始点纬度
 *                   longitude:
 *                     type: number
 *                     description: 起始点经度
 *               safeZones:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     zoneId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     capacity:
 *                       type: number
 *                     coordinates:
 *                       type: array
 *                       description: 安全区坐标
 *                     accessRoutes:
 *                       type: array
 *                       items:
 *                         type: string
 *                 description: 目标安全区列表
 *     responses:
 *       200:
 *         description: 撤离路线计算成功
 *       400:
 *         description: 参数验证失败
 *       500:
 *         description: 服务器错误
 */
router.post('/:villageId/evacuation-routes', auth, [
  param('villageId')
    .optional()
    .isMongoId()
    .withMessage('村庄ID格式错误'),
  body('startPoint.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('起始点纬度必须在-90到90之间'),
  body('startPoint.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('起始点经度必须在-180到180之间'),
  handleValidationErrors
], mapController.calculateEvacuationRoutes);

/**
 * @swagger
 * /api/village-map/{villageId}/nearby-facilities:
 *   get:
 *     summary: 获取附近应急设施
 *     tags: [Village Map]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: villageId
 *         required: true
 *         schema:
 *           type: string
 *         description: 村庄ID
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: 纬度
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: 经度
 *       - in: query
 *         name: maxDistance
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: 最大搜索距离（米）
 *     responses:
 *       200:
 *         description: 附近应急设施列表
 *       400:
 *         description: 参数验证失败
 *       500:
 *         description: 服务器错误
 */
router.get('/:villageId/nearby-facilities', auth, mapDataLimit, [
  param('villageId')
    .optional()
    .isMongoId()
    .withMessage('村庄ID格式错误'),
  query('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('纬度必须在-90到90之间'),
  query('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('经度必须在-180到180之间'),
  query('maxDistance')
    .optional()
    .isInt({ min: 100, max: 10000 })
    .withMessage('最大距离必须在100米到10公里之间'),
  handleValidationErrors
], mapController.getNearbyEmergencyFacilities);

/**
 * @swagger
 * /api/village-map/{villageId}/heatmap:
 *   get:
 *     summary: 生成热力图数据
 *     tags: [Village Map]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: villageId
 *         required: true
 *         schema:
 *           type: string
 *         description: 村庄ID
 *       - in: query
 *         name: dataType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [population, emergency, activity, disaster]
 *         description: 热力图数据类型
 *       - in: query
 *         name: bounds
 *         schema:
 *           type: string
 *         description: 地图边界（JSON字符串）
 *     responses:
 *       200:
 *         description: 热力图数据
 *       400:
 *         description: 参数验证失败
 *       500:
 *         description: 服务器错误
 */
router.get('/:villageId/heatmap', auth, mapDataLimit, [
  param('villageId')
    .optional()
    .isMongoId()
    .withMessage('村庄ID格式错误'),
  query('dataType')
    .isIn(['population', 'emergency', 'activity', 'disaster'])
    .withMessage('热力图数据类型无效'),
  query('bounds')
    .optional()
    .isJSON()
    .withMessage('边界数据必须是有效的JSON格式'),
  handleValidationErrors
], mapController.generateHeatmapData);

/**
 * @swagger
 * /api/village-map/{mapId}/features:
 *   post:
 *     summary: 添加地图要素
 *     tags: [Village Map]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mapId
 *         required: true
 *         schema:
 *           type: string
 *         description: 地图ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - featureType
 *               - geometry
 *             properties:
 *               featureId:
 *                 type: string
 *                 description: 要素ID
 *               featureType:
 *                 type: string
 *                 enum: [building, road, water, vegetation, facility, emergency_exit, shelter, medical_point, danger_zone, evacuation_route, rescue_point, monitoring_station]
 *                 description: 要素类型
 *               geometry:
 *                 type: object
 *                 required:
 *                   - type
 *                   - coordinates
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [Point, LineString, Polygon, MultiPolygon, MultiLineString]
 *                   coordinates:
 *                     type: array
 *                     description: 坐标数组
 *               properties:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   type:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [active, inactive, under_construction, damaged]
 *                   capacity:
 *                     type: number
 *                   currentOccupancy:
 *                     type: number
 *                   attributes:
 *                     type: object
 *               style:
 *                 type: object
 *                 properties:
 *                   color:
 *                     type: string
 *                   fillColor:
 *                     type: string
 *                   opacity:
 *                     type: number
 *                   weight:
 *                     type: number
 *                   iconUrl:
 *                     type: string
 *     responses:
 *       200:
 *         description: 地图要素添加成功
 *       400:
 *         description: 参数验证失败
 *       500:
 *         description: 服务器错误
 */
router.post('/:mapId/features', auth, [
  param('mapId')
    .isMongoId()
    .withMessage('地图ID格式错误'),
  body('featureType')
    .isIn(['building', 'road', 'water', 'vegetation', 'facility', 'emergency_exit', 'shelter', 'medical_point', 'danger_zone', 'evacuation_route', 'rescue_point', 'monitoring_station'])
    .withMessage('要素类型无效'),
  body('geometry.type')
    .isIn(['Point', 'LineString', 'Polygon', 'MultiPolygon', 'MultiLineString'])
    .withMessage('几何类型无效'),
  body('geometry.coordinates')
    .isArray()
    .withMessage('坐标必须是数组'),
  body('properties.status')
    .optional()
    .isIn(['active', 'inactive', 'under_construction', 'damaged'])
    .withMessage('状态无效'),
  body('properties.capacity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('容量必须为非负整数'),
  body('properties.currentOccupancy')
    .optional()
    .isInt({ min: 0 })
    .withMessage('当前占用数必须为非负整数'),
  handleValidationErrors
], mapController.addMapFeature);

/**
 * @swagger
 * /api/village-map/{villageId}/upload:
 *   post:
 *     summary: 上传地图数据
 *     tags: [Village Map]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: villageId
 *         required: true
 *         schema:
 *           type: string
 *         description: 村庄ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 上传的文件
 *               dataType:
 *                 type: string
 *                 enum: [geojson, features, layers]
 *                 description: 数据类型
 *     responses:
 *       200:
 *         description: 文件上传成功
 *       400:
 *         description: 文件类型不支持或参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/:villageId/upload', auth, [
  param('villageId')
    .optional()
    .isMongoId()
    .withMessage('村庄ID格式错误'),
  body('dataType')
    .optional()
    .isIn(['geojson', 'features', 'layers'])
    .withMessage('数据类型无效'),
  handleValidationErrors
], mapController.uploadMapData);

/**
 * @swagger
 * /api/village-map/users/{userId}/trajectory:
 *   get:
 *     summary: 获取用户轨迹
 *     tags: [Village Map]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束日期
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, geojson, csv]
 *           default: json
 *         description: 返回格式
 *     responses:
 *       200:
 *         description: 用户轨迹数据
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.get('/users/:userId/trajectory', auth, mapDataLimit, [
  param('userId')
    .isMongoId()
    .withMessage('用户ID格式错误'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式错误'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式错误'),
  query('format')
    .optional()
    .isIn(['json', 'geojson', 'csv'])
    .withMessage('返回格式无效'),
  handleValidationErrors
], mapController.getUserTrajectory);

/**
 * @swagger
 * /api/village-map/users/{userId}/activity-pattern:
 *   get:
 *     summary: 分析活动模式
 *     tags: [Village Map]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *           minimum: 1
 *           maximum: 30
 *         description: 分析天数
 *     responses:
 *       200:
 *         description: 活动模式分析结果
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.get('/users/:userId/activity-pattern', auth, mapDataLimit, [
  param('userId')
    .isMongoId()
    .withMessage('用户ID格式错误'),
  query('days')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('分析天数必须在1到30之间'),
  handleValidationErrors
], mapController.analyzeActivityPattern);

/**
 * @swagger
 * /api/village-map/{villageId}/monitoring:
 *   post:
 *     summary: 更新监测站数据
 *     tags: [Village Map]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: villageId
 *         required: true
 *         schema:
 *           type: string
 *         description: 村庄ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               monitoringData:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - stationId
 *                     - value
 *                     - unit
 *                   properties:
 *                     stationId:
 *                       type: string
 *                     value:
 *                       type: number
 *                     unit:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *     responses:
 *       200:
 *         description: 监测数据更新成功
 *       400:
 *         description: 参数验证失败
 *       500:
 *         description: 服务器错误
 */
router.post('/:villageId/monitoring', auth, [
  param('villageId')
    .optional()
    .isMongoId()
    .withMessage('村庄ID格式错误'),
  body('monitoringData')
    .isArray({ min: 1 })
    .withMessage('监测数据必须是非空数组'),
  body('monitoringData.*.stationId')
    .notEmpty()
    .withMessage('监测站ID不能为空'),
  body('monitoringData.*.value')
    .isNumeric()
    .withMessage('监测值必须是数字'),
  body('monitoringData.*.unit')
    .notEmpty()
    .withMessage('单位不能为空'),
  body('monitoringData.*.timestamp')
    .optional()
    .isISO8601()
    .withMessage('时间戳格式错误'),
  handleValidationErrors
], mapController.updateMonitoringData);

/**
 * @swagger
 * /api/village-map/{villageId}/export:
 *   get:
 *     summary: 导出地图数据
 *     tags: [Village Map]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: villageId
 *         required: true
 *         schema:
 *           type: string
 *         description: 村庄ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, geojson, zip]
 *           default: json
 *         description: 导出格式
 *       - in: query
 *         name: includeLayers
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 是否包含图层数据
 *       - in: query
 *         name: includeFeatures
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 是否包含要素数据
 *     responses:
 *       200:
 *         description: 地图数据文件
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: 服务器错误
 */
router.get('/:villageId/export', auth, [
  param('villageId')
    .optional()
    .isMongoId()
    .withMessage('村庄ID格式错误'),
  query('format')
    .optional()
    .isIn(['json', 'geojson', 'zip'])
    .withMessage('导出格式无效'),
  query('includeLayers')
    .optional()
    .isBoolean()
    .withMessage('includeLayers必须为布尔值'),
  query('includeFeatures')
    .optional()
    .isBoolean()
    .withMessage('includeFeatures必须为布尔值'),
  handleValidationErrors
], mapController.exportMapData);

module.exports = router;