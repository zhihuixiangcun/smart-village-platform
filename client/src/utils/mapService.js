/**
 * 高德地图服务工具类
 * 文档: https://lbs.amap.com/api/javascript-api/summary
 */

// 高德地图密钥
const AMAP_KEY = '7da29ab1b7d58cd008724108da7745df';
const AMAP_SECURITY_KEY = '296c3fd0c70b887b7c915b8fa1e9247d';

/**
 * 设置安全密钥
 */
function setSecurityKey() {
  if (typeof window !== 'undefined') {
    window._AMapSecurityConfig = {
      securityJsCode: AMAP_SECURITY_KEY,
    };
    console.log('[地图] 安全密钥已设置:', `${AMAP_SECURITY_KEY.substring(0, 10)}...`);
  }
}

/**
 * 加载高德地图API
 */
export function loadAMapScript() {
  return new Promise((resolve, reject) => {
    // 检查是否已加载
    if (window.AMap) {
      console.log('[地图] AMap已加载');
      resolve();
      return;
    }

    // 设置安全密钥
    setSecurityKey();

    // 创建脚本标签
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.id = 'amap-script-loader';
    script.async = true;
    script.defer = true;

    // 构建API URL，包含所需插件
    const plugins = [
      'AMap.Geolocation',
      'AMap.Geocoder',
      'AMap.PlaceSearch',
      'AMap.Driving',
      'AMap.ToolBar',
      'AMap.Scale',
    ].join(',');

    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=${plugins}`;

    // 加载成功回调
    script.onload = () => {
      console.log('[地图] 脚本加载完成');

      // 等待AMap对象可用
      const checkAMap = setInterval(() => {
        if (window.AMap) {
          clearInterval(checkAMap);
          console.log('[地图] AMap对象已就绪');
          resolve();
        }
      }, 100);

      // 5秒超时
      setTimeout(() => {
        clearInterval(checkAMap);
        if (!window.AMap) {
          reject(new Error('AMap对象加载超时'));
        }
      }, 5000);
    };

    // 加载失败回调
    script.onerror = error => {
      console.error('[地图] 脚本加载失败:', error);
      reject(new Error('高德地图API加载失败'));
    };

    // 添加到页面
    document.head.appendChild(script);
  });
}

/**
 * 初始化地图
 */
export async function initAMap(containerId, options = {}) {
  try {
    console.log('[地图] 开始初始化, 容器:', containerId);

    // 确保API已加载
    if (!window.AMap) {
      console.log('[地图] AMap未加载，开始加载...');
      await loadAMapScript();
    }

    // 合并配置
    const config = {
      zoom: 15,
      center: [116.397428, 39.90923],
      viewMode: '2D',
      mapStyle: 'amap://styles/normal',
      resizeEnable: true,
      ...options,
    };

    console.log('[地图] 创建地图实例');

    // 创建地图
    const map = new window.AMap.Map(containerId, config);

    // 添加控件
    try {
      map.addControl(
        new window.AMap.ToolBar({
          position: { top: '110px', right: '40px' },
        })
      );
      map.addControl(new window.AMap.Scale());
    } catch (err) {
      console.warn('[地图] 控件添加失败（可忽略）:', err);
    }

    console.log('[地图] 地图初始化成功');

    return map;
  } catch (error) {
    console.error('[地图] 地图初始化失败:', error);
    throw error;
  }
}

/**
 * 获取当前位置
 */
export async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!window.AMap) {
      reject(new Error('地图API未加载'));
      return;
    }

    const geolocation = new window.AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 10000,
    });

    geolocation.getCurrentPosition((status, result) => {
      if (status === 'complete') {
        const location = {
          latitude: result.position.lat,
          longitude: result.position.lng,
          address: result.formattedAddress || '当前位置',
        };
        console.log('[地图] 定位成功:', location);
        resolve(location);
      } else {
        console.error('[地图] 定位失败:', result);
        reject(new Error(result.message || '定位失败'));
      }
    });
  });
}

/**
 * 格式化距离
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * 打开导航
 */
export function openNavigation(destination, mode = 'car') {
  const { longitude, latitude, name } = destination;
  const url = `https://uri.amap.com/navigation?to=${longitude},${latitude},${name}&mode=${mode}&coordinate=gaode&callnative=1`;
  window.open(url, '_blank');
}

/**
 * 添加标记
 */
export function addMarkers(map, markers = []) {
  if (!map || !markers.length) return [];

  const markerList = [];

  markers.forEach(markerData => {
    const marker = new window.AMap.Marker({
      position: [markerData.position.longitude, markerData.position.latitude],
      title: markerData.title || '',
    });

    if (markerData.onClick) {
      marker.on('click', () => markerData.onClick(marker));
    }

    marker.setMap(map);
    markerList.push(marker);
  });

  return markerList;
}

/**
 * 创建信息窗体
 */
export function createInfoWindow(map, options = {}) {
  if (!window.AMap) return null;

  const defaultOptions = {
    isCustom: false,
    autoMove: true,
    closeWhenClickMap: true,
    ...options,
  };

  return new window.AMap.InfoWindow(defaultOptions);
}

// 默认导出
export default {
  loadAMapScript,
  initAMap,
  getCurrentLocation,
  formatDistance,
  openNavigation,
  addMarkers,
  createInfoWindow,
};
