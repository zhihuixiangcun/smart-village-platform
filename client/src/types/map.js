/**
 * 地图相关类型定义
 */

/**
 * 地理坐标点
 * @typedef {Object} LatLng
 * @property {number} latitude - 纬度
 * @property {number} longitude - 经度
 */

/**
 * POI兴趣点
 * @typedef {Object} POI
 * @property {string} id - POI ID
 * @property {string} name - 名称
 * @property {string} address - 地址
 * @property {LatLng} location - 位置坐标
 * @property {number} distance - 距离（米）
 * @property {string} type - 类型
 * @property {string} tel - 电话
 * @property {string} businessArea - 商圈
 * @property {Array} photos - 照片数组
 */

/**
 * 标记配置
 * @typedef {Object} MarkerConfig
 * @property {LatLng} position - 位置
 * @property {string} [title] - 标题
 * @property {string} [icon] - 图标
 * @property {Object} [label] - 标签
 * @property {Function} [onClick] - 点击事件
 */

/**
 * 路径规划结果
 * @typedef {Object} RouteResult
 * @property {number} distance - 总距离（米）
 * @property {number} duration - 预计时间（秒）
 * @property {Array} steps - 路径步骤
 */

/**
 * 位置信息
 * @typedef {Object} LocationInfo
 * @property {number} latitude - 纬度
 * @property {number} longitude - 经度
 * @property {string} address - 详细地址
 * @property {string} province - 省份
 * @property {string} city - 城市
 * @property {string} district - 区县
 * @property {string} street - 街道
 */

/**
 * 导航模式
 * @enum {string}
 */
export const NavigationMode = {
  CAR: 'car', // 驾车
  WALK: 'walk', // 步行
  BUS: 'bus', // 公交
  RIDE: 'ride', // 骑行
};

/**
 * 地图类型
 * @enum {string}
 */
export const MapType = {
  NORMAL: 'amap://styles/normal', // 标准
  SATISATE: 'amap://styles/satellite', // 卫星
  DARK: 'amap://styles/dark', // 暗色
  LIGHT: 'amap://styles/light', // 亮色
};

/**
 * POI类型枚举
 * @enum {Object}
 */
export const POIType = {
  // 餐饮服务
  RESTAURANT: '餐饮服务',
  FAST_FOOD: '快餐服务',
  CAFE: '咖啡厅',

  // 购物服务
  SUPERMARKET: '购物服务',
  CONVENIENCE_STORE: '便民商店',

  // 生活服务
  HOTEL: '住宿服务',
  BANK: '金融网点',
  HOSPITAL: '医疗保健服务',

  // 交通设施
  GAS_STATION: '加油站',
  PARKING: '停车场',
  BUS_STATION: '公交车站',
  SUBWAY_STATION: '地铁站',

  // 休闲娱乐
  SCENIC: '风景名胜',
  ENTERTAINMENT: '休闲娱乐',

  // 通用
  GENERAL: ' generalize',
};
