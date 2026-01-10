import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const regionAPI = {
  async getProvinces() {
    const response = await axios.get(`${API_BASE_URL}/regions/provinces`);
    return response.data;
  },

  async getCities(provinceCode) {
    const response = await axios.get(`${API_BASE_URL}/regions/province/${provinceCode}/cities`);
    return response.data;
  },

  async getDistricts(provinceCode, cityCode) {
    const response = await axios.get(
      `${API_BASE_URL}/regions/province/${provinceCode}/city/${cityCode}/districts`
    );
    return response.data;
  },

  async getTownships(provinceCode, cityCode, districtCode) {
    const response = await axios.get(
      `${API_BASE_URL}/regions/province/${provinceCode}/city/${cityCode}/district/${districtCode}/townships`
    );
    return response.data;
  },

  async getVillages(provinceCode, cityCode, districtCode, townshipCode, queryParams = {}) {
    const params = new URLSearchParams(queryParams);
    const response = await axios.get(
      `${API_BASE_URL}/regions/province/${provinceCode}/city/${cityCode}/district/${districtCode}/township/${townshipCode}/villages?${params}`
    );
    return response.data;
  },

  async searchByCode(code) {
    const response = await axios.get(`${API_BASE_URL}/regions/code/${code}`);
    return response.data;
  },

  async searchByName(keyword) {
    const response = await axios.get(`${API_BASE_URL}/regions/search?keyword=${encodeURIComponent(keyword)}`);
    return response.data;
  },

  async getFullRegionPath(code) {
    const response = await axios.get(`${API_BASE_URL}/regions/path/${code}`);
    return response.data;
  },

  async getStatistics() {
    const response = await axios.get(`${API_BASE_URL}/regions/statistics`);
    return response.data;
  }
};

export default regionAPI;
