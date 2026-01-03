# 村情地图功能使用指南

## 功能概述

村情地图是智慧乡村平台的核心功能之一，集成了高德地图SDK，提供村庄地理信息可视化、危险区域预警、应急资源管理、村民位置服务等功能。

## 核心特性

### 1. 位置隐私保护
- **随机偏移**：村民位置添加±50米随机偏移
- **位置聚合**：3人以上合并显示为区域集群
- **权限控制**：管理员可查看精确位置，普通村民仅查看模糊位置
- **数据加密**：位置数据传输采用HTTPS加密

### 2. 地理空间查询
- **附近搜索**：查找指定范围内的地点、资源、村民
- **危险区域检测**：判断位置是否在危险区域内
- **距离计算**：计算两点间精确距离
- **面积计算**：计算多边形区域面积

### 3. 实时更新
- **村民位置跟踪**：支持实时位置更新
- **资源状态管理**：应急资源状态实时同步
- **危险区域监控**：危险区域状态动态更新

## 安装配置

### 1. 安装高德地图SDK

```bash
cd client
npm install @amap/amap-jsapi-loader
```

### 2. 配置高德地图密钥

在 `.env` 文件中添加：

```env
# 高德地图Key
VITE_AMAP_KEY=your_amap_key_here
VITE_AMAP_SECURITY_KEY=your_security_key_here
```

获取高德地图Key：
1. 访问 [高德开放平台](https://lbs.amap.com/)
2. 注册并创建应用
3. 获取Web端(JS API) Key和安全密钥

### 3. 后端配置

确保MongoDB已安装并运行，地图数据模型会自动创建2dsphere地理空间索引。

## 数据模型说明

### 1. VillageMap（村庄地图配置）
```javascript
{
  villageId: ObjectId,      // 村庄ID
  villageName: String,      // 村庄名称
  boundary: {               // 村界边界（多边形）
    type: 'Polygon',
    coordinates: [[[lon, lat], ...]]
  },
  area: Number,             // 面积（平方米）
  center: {                 // 地图中心点
    longitude: Number,
    latitude: Number
  },
  zoomLevel: Number,        // 缩放级别（3-18）
  layers: Object,           // 图层配置
  style: Object,            // 地图样式
  controls: Object,         // 控件配置
  features: Object          // 功能开关
}
```

### 2. MapLocation（地点位置）
```javascript
{
  villageId: ObjectId,      // 村庄ID
  name: String,             // 地点名称
  type: String,             // 地点类型
  location: {               // GPS坐标
    type: 'Point',
    coordinates: [lon, lat]
  },
  address: Object,          // 地址信息
  attributes: Object,       // 地点属性
  contact: Object,          // 联系信息
  serviceHours: Object,     // 服务时间
  priority: Number          // 优先级
}
```

### 3. ResidentLocation（村民位置）
```javascript
{
  userId: ObjectId,         // 用户ID
  villageId: ObjectId,      // 村庄ID
  exactLocation: {          // 精确位置（仅管理员可见）
    type: 'Point',
    coordinates: [lon, lat]
  },
  publicLocation: {         // 公开位置（隐私保护后）
    type: 'Point',
    coordinates: [lon, lat]
  },
  status: String,           // 位置状态
  privacySettings: Object,  // 隐私设置
  cluster: Object,          // 聚合信息
  expiresAt: Date          // 过期时间
}
```

### 4. DangerZone（危险区域）
```javascript
{
  villageId: ObjectId,      // 村庄ID
  name: String,             // 区域名称
  dangerType: String,       // 危险类型
  dangerLevel: String,      // 危险等级
  area: Object,             // 区域边界
  alert: Object,            // 预警信息
  status: String,           // 区域状态
  displayConfig: Object     // 显示配置
}
```

### 5. EmergencyResource（应急资源）
```javascript
{
  villageId: ObjectId,      // 村庄ID
  resourceCode: String,     // 资源编号
  name: String,             // 资源名称
  resourceType: String,     // 资源类型
  location: Object,         // 资源位置
  status: String,           // 资源状态
  specifications: Object,   // 规格信息
  responsiblePerson: Object,// 责任人
  maintenance: Object       // 维护信息
}
```

## API接口说明

### 地图配置
- `GET /api/map/village/:villageId` - 获取村庄地图配置
- `PUT /api/map/village/:villageId` - 更新地图配置
- `GET /api/map/village/:villageId/summary` - 获取地图数据汇总

### 地点管理
- `GET /api/map/locations/:villageId` - 获取地点列表
- `POST /api/map/locations` - 添加地点
- `PUT /api/map/locations/:locationId` - 更新地点
- `DELETE /api/map/locations/:locationId` - 删除地点
- `GET /api/map/locations/nearby` - 搜索附近地点
- `GET /api/map/locations/search` - 搜索地点

### 危险区域
- `GET /api/map/danger-zones/:villageId` - 获取危险区域列表
- `POST /api/map/danger-zones` - 添加危险区域
- `PUT /api/map/danger-zones/:zoneId/status` - 更新区域状态
- `GET /api/map/danger-zones/check` - 检查位置是否在危险区域

### 应急资源
- `GET /api/map/resources/:villageId` - 获取资源列表
- `POST /api/map/resources` - 添加资源
- `PUT /api/map/resources/:resourceId/status` - 更新资源状态
- `POST /api/map/resources/:resourceId/usage` - 记录资源使用
- `POST /api/map/resources/:resourceId/maintenance` - 记录资源维护
- `GET /api/map/resources/nearby` - 搜索附近资源
- `GET /api/map/resources/maintenance/:villageId` - 获取需维护资源

### 村民位置
- `POST /api/map/residents/location` - 更新村民位置
- `GET /api/map/residents/:villageId` - 获取村民位置
- `GET /api/map/residents/nearby` - 搜索附近村民
- `PUT /api/map/residents/privacy` - 更新隐私设置

### 工具函数
- `POST /api/map/calculate-distance` - 计算两点距离
- `POST /api/map/calculate-area` - 计算多边形面积

## 前端组件使用

### VillageMap 组件

```vue
<template>
  <VillageMap
    :village-id="villageId"
    :height="'600px'"
    @location-click="handleLocationClick"
    @danger-zone-click="handleDangerZoneClick"
    @resource-click="handleResourceClick"
    @resident-click="handleResidentClick"
  />
</template>

<script setup>
import VillageMap from '@/components/map/VillageMap.vue';

const villageId = 'your_village_id';

const handleLocationClick = (location) => {
  console.log('地点点击:', location);
};

const handleDangerZoneClick = (zone) => {
  console.log('危险区域点击:', zone);
};

const handleResourceClick = (resource) => {
  console.log('应急资源点击:', resource);
};

const handleResidentClick = (resident) => {
  console.log('村民点击:', resident);
};
</script>
```

### 使用地图Store

```javascript
import { useMapStore } from '@/stores/mapStore';

const mapStore = useMapStore();

// 获取地图配置
await mapStore.fetchMapConfig(villageId);

// 获取地图数据
await mapStore.fetchMapData(villageId);

// 切换图层
mapStore.toggleLayer('dangerZones');

// 搜索地点
await mapStore.searchLocations(villageId, '村委会');

// 更新村民位置
await mapStore.updateResidentLocation(120.15, 30.29, {
  status: 'home',
  source: 'gps'
});
```

## 初始化数据

运行初始化脚本创建示例数据：

```bash
node server/models/initMapData.js
```

这会创建：
- 村庄地图配置
- 5个示例地点（村委会、学校、卫生室等）
- 2个示例危险区域（易涝区、滑坡区）
- 5个示例应急资源（消防栓、水泵等）

## 安全注意事项

### 1. 位置隐私
- 村民精确位置仅管理员可访问
- 普通用户只能查看添加随机偏移后的位置
- 3人以上位置自动聚合显示
- 支持用户自定义隐私设置

### 2. 权限控制
- 地图配置修改需要管理员权限
- 添加/修改地点需要村级管理权限
- 查看村民位置需要相应授权
- 危险区域管理需要管理员权限

### 3. 数据安全
- 所有API请求需认证
- 敏感数据传输加密
- 操作日志完整记录
- 定期数据备份

## 性能优化

### 1. 数据库索引
已自动创建以下索引：
- 地理空间索引（2dsphere）
- 村庄ID索引
- 状态字段索引
- 时间字段索引（TTL索引）

### 2. 前端优化
- 地图按需加载
- 图层懒加载
- 标记聚合显示
- 数据缓存机制

### 3. 后端优化
- 分页查询
- 数据聚合统计
- 异步处理
- 连接池管理

## 故障排查

### 地图不显示
1. 检查高德地图Key是否正确
2. 检查网络连接
3. 查看浏览器控制台错误
4. 确认地图容器高度设置

### 位置不准确
1. 检查GPS权限
2. 确认坐标格式正确
3. 检查坐标系（使用WGS84）
4. 验证定位精度

### 数据不更新
1. 检查API请求状态
2. 确认数据库连接
3. 查看服务器日志
4. 刷新页面重试

## 扩展开发

### 添加自定义图层

```javascript
// 在VillageMap.vue中添加自定义图层
const drawCustomLayer = (data) => {
  const AMap = window.AMap;

  data.forEach(item => {
    const marker = new AMap.Marker({
      position: [item.longitude, item.latitude],
      icon: customIcon,
      extData: { type: 'custom', data: item }
    });

    marker.on('click', () => {
      // 处理点击事件
    });

    map.value.add(marker);
  });
};
```

### 添加实时数据更新

```javascript
// 使用WebSocket实时更新位置数据
const socket = io('http://localhost:5000');

socket.on('location-update', (data) => {
  // 更新地图标记
  updateResidentMarker(data.userId, data.location);
});
```

## 技术支持

如有问题，请联系技术支持或查看项目文档。

---

**最后更新**: 2025-12-19
**版本**: 1.0.0
