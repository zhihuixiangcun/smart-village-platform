# 行政区划定位功能说明

## 功能概述

已为行政区划选择器添加浏览器定位功能，支持自动获取用户当前位置并匹配对应的行政区划。

## 新增功能

### 1. 定位按钮
- **"正在定位..."**: 显示定位状态
- **"使用当前位置"**: 主动获取当前位置
- **"允许定位权限"**: 当定位权限被拒绝时显示

### 2. 定位流程

1. 检查浏览器是否支持定位
2. 请求用户授权
3. 获取经纬度坐标
4. 将坐标转换为行政区划信息（需要配合逆地理编码服务）

### 3. 权限处理

- 定位权限被拒绝时显示警告提示
- 用户可重新请求权限

### 4. 样式优化

- 定位按钮区域统一样式
- 美化的下拉框
- 响应式设计支持

## 使用说明

### 在表单中使用

```vue
<template>
  <RegionSelectorAPI
    @change="handleRegionChange"
  />
</template>

<script setup>
import RegionSelectorAPI from '@/components/RegionSelectorAPI.vue';

const handleRegionChange = (regionData) => {
  console.log('选择的区域:', regionData);
  // regionData 包含:
  // - provinceCode, provinceName
  // - cityCode, cityName
  // - districtCode, districtName
  // - townshipCode, townshipName
  // - villageCode, villageName
};
</script>
```

### 配置百度地图 API (可选)

如需使用自动定位功能并匹配行政区划，需要配置百度地图 API:

1. 在 `.env` 文件中添加：
```
VITE_BAIDU_AK=您的百度地图AK
```

2. 百度地图 API 申请地址：https://lbsyun.baidu.com/apiconsole/key/create

## 定位兼容性

### 支持的浏览器
- Chrome (桌面/移动端)
- Firefox
- Safari
- Edge
- 移动端浏览器

### 注意事项

1. **HTTPS 要求**: 现代浏览器要求在 HTTPS 环境下才能使用定位功能
   - HTTP 环境下可能无法获取位置
   - 本地开发 `localhost` 通常可以正常工作

2. **权限说明**:
   - 首次使用需要用户授权
   - 用户可以在浏览器设置中随时撤销授权
   - 需要友好提示用户授权用途

3. **精度说明**:
   - 桌面浏览器精度较低
   - 移动端配合 GPS 精度较高
   - 建议提供手动选择作为备选方案

4. **隐私保护**:
   - 位置信息仅用于行政区划选择
   - 不上传至服务器存储
   - 不追踪用户位置历史

## 未来优化建议

1. 集成高德地图 API 作为备选
2. 添加 IP 定位作为备用方案
3. 缓存最近选择的行政区划
4. 支持搜索附近村庄
5. 地图可视化显示选择的位置

## 相关文件

- `client/src/components/RegionSelectorAPI.vue` - 行政区划选择器组件
- `client/src/services/geocoding.js` - 逆地理编码服务
- `client/src/services/regionAPI.js` - 行政区划 API 服务
- `client/src/views/auth/RoleLogin.vue` - 登录页面
- `client/src/views/auth/MultiStepRegister.vue` - 注册页面
- `client/src/views/auth/OfficialRegister.vue` - 乡镇干部申请页面
