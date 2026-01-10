import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

class GeocodingService {
  async getLocationName(latitude, longitude) {
    try {
      const response = await axios.get(
        `https://api.map.baidu.com/reverse_geocoding/v3/?ak=${process.env.VITE_BAIDU_AK || ''}&output=json&coordtype=wgs84ll&location=${longitude},${latitude}`
      );
      
      if (response.data && response.data.status === 0) {
        const { addressComponent } = response.data.result;
        return {
          province: addressComponent.province,
          city: addressComponent.city,
          district: addressComponent.district,
          street: addressComponent.street,
          formattedAddress: response.data.result.formatted_address
        };
      }
      
      return null;
    } catch (error) {
      console.error('逆地理编码失败:', error);
      return null;
    }
  }

  async searchNearbyRegions(keyword, latitude, longitude) {
    try {
      const response = await axios.get(
        `https://api.map.baidu.com/place/v2/suggestion?query=${encodeURIComponent(keyword)}&region=${latitude},${longitude}&output=json&ak=${process.env.VITE_BAIDU_AK || ''}`
      );
      
      if (response.data && response.data.status === 0) {
        return response.data.result.map(item => ({
          name: item.name,
          address: item.address,
          province: item.province,
          city: item.city,
          district: item.district,
          lat: item.location.lat,
          lng: item.location.lng
        }));
      }
      
      return [];
    } catch (error) {
      console.error('搜索附近区域失败:', error);
      return [];
    }
  }

  async getLocationFromIP() {
    try {
      const response = await axios.get('https://ip-api.com/json/');
      
      if (response.data) {
        return {
          ip: response.data.ip,
          city: response.data.city,
          region: response.data.region,
          country: response.data.country,
          latitude: response.data.latitude,
          longitude: response.data.longitude
        };
      }
      
      return null;
    } catch (error) {
      console.error('获取IP位置失败:', error);
      return null;
    }
  }
}

export default new GeocodingService();
