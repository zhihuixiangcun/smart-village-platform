# 地区选择器使用说明

## 概述

已实现按行政区划层级（省、州、市、县、乡镇、村）的地区选择功能。

## 文件结构

### 数据文件
- `client/src/data/regionData.js` - 包含完整的行政区划数据树和辅助函数

### 组件
- `client/src/components/RegionSelector.vue` - 地区级联选择器组件

## 使用方法

### 1. 导入组件

```vue
import RegionSelector from '@/components/RegionSelector.vue';
```

### 2. 在模板中使用

```vue
<RegionSelector
  v-model="villageId"
  placeholder="请选择省/州/市/县/乡镇/村"
  @change="handleRegionChange"
/>
```

### 3. 处理选择事件

```vue
<script setup>
const villageId = ref('');
const regionInfo = ref(null);

const handleRegionChange = (info) => {
  console.log('选择地区:', info);
  // info包含以下字段:
  // - villageId: 村庄ID
  // - villageCode: 村庄编码
  // - village: 村庄名称
  // - township: 乡镇名称
  // - county: 县名称
  // - prefecture: 州名称
  // - province: 省名称
  // - fullAddress: 完整地址
};
</script>
```

## Props

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|--------|------|
| modelValue | String | '' | 选中的村庄ID |
| label | String | '所在地区' | 表单项标签 |
| prop | String | 'region' | 表单项prop |
| placeholder | String | '请选择省/州/市/县/乡镇/村' | 占位文本 |
| level | String | 'village' | 选择级别：province/prefecture/county/township/village |

## Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| update:modelValue | value | 更新v-model值 |
| change | regionInfo | 地区信息变更事件 |

## 辅助函数

### regionData.js 提供的函数

```javascript
import {
  getVillageById,
  getVillagesByLocation,
  getProvinceList,
  getPrefectureList,
  getCountyList,
  getTownshipList,
  getVillageList
} from '@/data/regionData';

// 获取村庄完整信息
const village = getVillageById('69620ba44261831e215211b3');

// 按位置获取村庄列表
const villages = getVillagesByLocation('520000', '522300', '522325', '522325001');

// 获取省份列表
const provinces = getProvinceList();

// 获取州列表
const prefectures = getPrefectureList('520000');

// 获取县列表
const counties = getCountyList('520000', '522300');

// 获取乡镇列表
const townships = getTownshipList('520000', '522300', '522325');

// 获取村庄列表
const villages = getVillageList('520000', '522300', '522325', '522325001');
```

## 已更新的页面

- `RoleLogin.vue` - 登录页面
- `MultiStepRegister.vue` - 多步注册页面

## 数据层级结构

```
省 (Province)
  └── 州/自治州 (Prefecture)
       └── 市/县 (County)
            └── 乡镇 (Township)
                 └── 村 (Village)
```

## 当前覆盖地区

### 贵州省 > 黔西南布依族苗族自治州

#### 兴义市
- 顶效镇
  - 绿化村
  - 绿荫村
  - 查白村
  - 楼纳村

#### 贞丰县
- 鲁贡镇
  - 么扒村
  - 弄洋村
  - 者央村
  - 林桃村
- 沙坪镇
  - 者索村
  - 板昌村
  - 这年村
  - 者砍村
- 白层镇
  - 兴龙村
  - 坝桥村
  - 坡们村
  - 纳杠村

#### 望谟县
- 乐元镇
  - 乐元村
  - 里好村
  - 纳管村
  - 董万村

## 添加新地区

1. 在 `client/src/data/regionData.js` 中添加省、州、县、乡镇、村数据
2. 在数据库中添加对应的村庄记录（使用 `scripts/add-villages.js`）
3. 确保代码格式符合规范：`^[A-Z0-9]{6}V[0-9]{3}[A-Z]$`

## 注意事项

1. 所有地区数据都在 `regionData.js` 中统一管理
2. 地区选择器使用 Element Plus 的 Cascader 组件
3. 支持搜索/过滤功能
4. 支持清空选择
5. 完整地址格式：`省+州+市+县+乡镇+村`
