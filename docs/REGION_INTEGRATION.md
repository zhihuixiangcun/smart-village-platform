# 全国行政区划数据集成

## 概述

本项目集成了全国省、市、区县、乡镇、村五级行政区划数据，支持通过 API 动态获取和管理行政区划信息。

## 功能特性

- **五级行政区划**: 省/直辖市 → 地级市 → 区县 → 乡镇 → 村庄
- **动态数据获取**: 通过阿里云 DataV API 实时获取最新的行政区划数据
- **灵活的 API**: 支持按代码查询、按名称搜索、获取完整路径等多种查询方式
- **前端组件**: 提供 Vue 3 + Element Plus 的行政区划选择器组件

## 数据模型

### Province (省/直辖市/自治区/特别行政区)
- code: 行政区划代码
- name: 名称
- level: 类型 (province/municipality/autonomous_region/sar)
- coordinates: 中心坐标

### City (地级市)
- code: 行政区划代码
- name: 名称
- provinceCode: 所属省份代码
- level: 类型 (prefecture/sub_provincial/county_level)

### District (区县)
- code: 行政区划代码
- name: 名称
- provinceCode: 所属省份代码
- cityCode: 所属城市代码
- level: 类型 (county/district/banner/autonomous_county)

### Township (乡镇)
- code: 行政区划代码
- name: 名称
- provinceCode: 所属省份代码
- cityCode: 所属城市代码
- districtCode: 所属区县代码
- level: 类型 (town/township/subdistrict/ethnic_township/ethnic_town)

## API 接口

### 获取所有省份
```
GET /api/v1/regions/provinces
```

### 获取指定省份的城市列表
```
GET /api/v1/regions/province/:provinceCode/cities
```

### 获取指定城市的区县列表
```
GET /api/v1/regions/province/:provinceCode/city/:cityCode/districts
```

### 获取指定区县的乡镇列表
```
GET /api/v1/regions/province/:provinceCode/city/:cityCode/district/:districtCode/townships
```

### 获取指定乡镇的村庄列表
```
GET /api/v1/regions/province/:provinceCode/city/:cityCode/district/:districtCode/township/:townshipCode/villages
```

### 根据代码查询区域信息
```
GET /api/v1/regions/code/:code
```

### 按名称搜索区域
```
GET /api/v1/regions/search?keyword=关键词
```

### 获取完整区域路径
```
GET /api/v1/regions/path/:code
```

### 获取统计数据
```
GET /api/v1/regions/statistics
```

## 数据导入

### 导入全国所有省份数据
```bash
node scripts/import-regions.js all
```

### 导入指定省份数据
```bash
node scripts/import-regions.js province 110000
```

### 查看统计数据
```bash
node scripts/import-regions.js stats
```

## 前端使用

### 方式一：使用静态数据组件
```vue
<template>
  <RegionSelector 
    v-model="villageId" 
    @change="onRegionChange" 
    label="选择地区"
  />
</template>

<script setup>
import RegionSelector from '@/components/RegionSelector.vue';
</script>
```

### 方式二：使用 API 数据组件
```vue
<template>
  <RegionSelectorAPI 
    @change="onRegionChange" 
  />
</template>

<script setup>
import RegionSelectorAPI from '@/components/RegionSelectorAPI.vue';

const onRegionChange = (region) => {
  console.log('选择的地区:', region);
};
</script>
```

## 数据源

行政区划数据来源于阿里云 DataV 地理数据 API: https://geo.datav.aliyun.com/areas_v3/bound/

## 注意事项

1. **API 限流**: 阿里云 API 可能有请求频率限制，导入大量数据时建议间隔请求
2. **数据更新**: 行政区划会定期调整，建议定期更新数据库中的数据
3. **村庄数据**: 村庄数据来源于现有的 Village 模型，需要另外导入
4. **数据库索引**: 模型已设置必要索引以优化查询性能

## 文件结构

```
src/
  models/
    Province.js      # 省份模型
    City.js          # 城市模型
    District.js      # 区县模型
    Township.js      # 乡镇模型
  controllers/
    regionController.js  # 行政区划控制器
  routes/
    regionRoutes.js  # 行政区划路由
  app.js          # 主应用 (已集成 regionRoutes)

client/
  src/
    services/
      regionAPI.js         # 行政区划 API 服务
    components/
      RegionSelector.vue   # 静态数据选择器
      RegionSelectorAPI.vue # API 数据选择器

scripts/
  import-regions.js   # 数据导入脚本
```

## 常见问题

### Q: 如何获取某个城市的所有乡镇？
A: 需要先获取城市下的区县列表，再遍历每个区县获取其乡镇列表。

### Q: 数据更新频率？
A: 行政区划调整不频繁，建议每年更新一次。

### Q: 导入数据很慢怎么办？
A: 可以只导入需要的省份，或者分批次导入。
