/**
 * 地理定位服务
 */
export const geolocationService = {
  /**
   * 获取当前位置
   */
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('您的浏览器不支持地理定位'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position);
        },
        (error) => {
          switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('用户拒绝了地理定位请求'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('位置信息不可用'));
            break;
          case error.TIMEOUT:
            reject(new Error('获取位置超时'));
            break;
          default:
            reject(new Error('获取位置时发生未知错误'));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  },

  /**
   * 逆地理编码 - 将坐标转换为地址
   * 注意：实际使用时需要集成高德地图或百度地图API
   */
  async reverseGeocode(latitude, longitude) {
    // 这里应该调用实际的地图API
    // 暂时返回格式化的坐标
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  },

  /**
   * 地理编码 - 将地址转换为坐标
   */
  async geocode(address) {
    // 这里应该调用实际的地图API
    return { latitude: 0, longitude: 0 };
  },

  /**
   * 计算两点之间的距离（米）
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // 地球半径（米）
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  },

  /**
   * 持续监听位置变化
   */
  watchPosition(onSuccess, onError, options = {}) {
    if (!navigator.geolocation) {
      onError(new Error('您的浏览器不支持地理定位'));
      return null;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    return navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      { ...defaultOptions, ...options }
    );
  },

  /**
   * 停止监听位置变化
   */
  clearWatch(watchId) {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  }
};

export default geolocationService;
