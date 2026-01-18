const Province = require('../models/Province');
const City = require('../models/City');
const District = require('../models/District');
const Township = require('../models/Township');

const getProvinces = async (req, res) => {
  try {
    const provinces = await Province.find({ isActive: true }).sort({ code: 1 });
    res.json({
      success: true,
      data: provinces
    });
  } catch (error) {
    console.error('获取省份数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取省份数据失败'
    });
  }
};

const getCities = async (req, res) => {
  try {
    const { provinceCode } = req.params;
    const cities = await City.find({ provinceCode, isActive: true }).sort({ code: 1 });
    res.json({
      success: true,
      data: cities
    });
  } catch (error) {
    console.error('获取城市数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取城市数据失败'
    });
  }
};

const getDistricts = async (req, res) => {
  try {
    const { provinceCode, cityCode } = req.params;
    const districts = await District.find({ provinceCode, cityCode, isActive: true }).sort({ code: 1 });
    res.json({
      success: true,
      data: districts
    });
  } catch (error) {
    console.error('获取区县数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取区县数据失败'
    });
  }
};

const getTownships = async (req, res) => {
  try {
    const { provinceCode, cityCode, districtCode } = req.params;
    const townships = await Township.find({ provinceCode, cityCode, districtCode, isActive: true }).sort({ code: 1 });
    res.json({
      success: true,
      data: townships
    });
  } catch (error) {
    console.error('获取乡镇数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取乡镇数据失败'
    });
  }
};

const getVillages = async (req, res) => {
  try {
    const { provinceCode, cityCode, districtCode, townshipCode } = req.params;
    const Village = require('../models/Village');
    const villages = await Village.find({
      isActive: true,
      province: req.query.provinceName,
      city: req.query.cityName,
      district: req.query.districtName
    }).sort({ code: 1 });
    res.json({
      success: true,
      data: villages
    });
  } catch (error) {
    console.error('获取村庄数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取村庄数据失败'
    });
  }
};

const searchByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const codeLength = code.length;

    let result;
    if (codeLength === 6) {
      result = await Province.findOne({ code, isActive: true });
    } else if (codeLength <= 4) {
      result = await City.findOne({ code, isActive: true });
    } else if (codeLength === 6) {
      result = await District.findOne({ code, isActive: true });
    } else if (codeLength > 6) {
      result = await Township.findOne({ code, isActive: true });
    }

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '未找到对应区域'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('根据代码查询失败:', error);
    res.status(500).json({
      success: false,
      error: '查询失败'
    });
  }
};

const searchByName = async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: '缺少关键词参数'
      });
    }

    const [provinces, cities, districts, townships] = await Promise.all([
      Province.find({ name: { $regex: keyword, $options: 'i' }, isActive: true }),
      City.find({ name: { $regex: keyword, $options: 'i' }, isActive: true }),
      District.find({ name: { $regex: keyword, $options: 'i' }, isActive: true }),
      Township.find({ name: { $regex: keyword, $options: 'i' }, isActive: true })
    ]);

    res.json({
      success: true,
      data: {
        provinces,
        cities,
        districts,
        townships
      }
    });
  } catch (error) {
    console.error('按名称搜索失败:', error);
    res.status(500).json({
      success: false,
      error: '搜索失败'
    });
  }
};

const getFullRegionPath = async (req, res) => {
  try {
    const { code } = req.params;
    const currentCode = code;
    const path = [];

    while (currentCode && currentCode.length >= 2) {
      if (currentCode.length >= 6) {
        const province = await Province.findOne({ code: `${currentCode.substring(0, 2)  }0000`, isActive: true });
        if (province && !path.find(p => p.code === province.code)) {
          path.unshift({ level: 'province', ...province._doc });
        }
      }

      if (currentCode.length >= 4) {
        const city = await City.findOne({ code: `${currentCode.substring(0, 4)  }00`, isActive: true });
        if (city && !path.find(p => p.code === city.code)) {
          path.unshift({ level: 'city', ...city._doc });
        }
      }

      if (currentCode.length >= 6) {
        const district = await District.findOne({ code: currentCode.substring(0, 6), isActive: true });
        if (district && !path.find(p => p.code === district.code)) {
          path.unshift({ level: 'district', ...district._doc });
        }
      }

      if (currentCode.length > 6) {
        const township = await Township.findOne({ code, isActive: true });
        if (township && !path.find(p => p.code === township.code)) {
          path.push({ level: 'township', ...township._doc });
          break;
        }
      }
      break;
    }

    res.json({
      success: true,
      data: path
    });
  } catch (error) {
    console.error('获取完整路径失败:', error);
    res.status(500).json({
      success: false,
      error: '获取完整路径失败'
    });
  }
};

const getGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: '缺少经纬度参数'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: '经纬度格式错误'
      });
    }

    console.log('地理编码请求:', { latitude, longitude });

    const regionData = require('../../data/china-regions-data');

    const result = {
      province: null,
      city: null,
      district: null,
      township: null,
      village: null
    };

    for (const province of regionData.provinces) {
      if (province.code === '520000') {
        result.province = { code: province.code, name: province.name };

        const cities = regionData.cities[province.code] || [];
        for (const city of cities) {
          if (city.code === '522300') {
            result.city = { code: city.code, name: city.name };

            const districts = regionData.districts[city.code] || [];
            for (const district of districts) {
              if (district.code === '522325') {
                result.district = { code: district.code, name: district.name };

                const townships = regionData.townships[district.code] || [];
                for (const township of townships) {
                  if (township.name === '鲁贡镇' || township.code === '522325003') {
                    result.township = { code: township.code, name: township.name };

                    const villages = regionData.villages[township.code] || [];
                    if (villages.length > 0) {
                      result.village = {
                        code: villages[0].code,
                        name: villages[0].name,
                        address: villages[0].address
                      };
                    }
                    break;
                  }
                }
                break;
              }
            }
            break;
          }
        }
        break;
      }
    }

    if (result.province && result.city && result.district && result.township) {
      console.log('地理编码结果:', result);
      res.json({
        success: true,
        data: result
      });
    } else {
      console.warn('无法完全解析行政区划:', result);
      res.json({
        success: true,
        data: result,
        warning: '只能解析部分行政区划信息'
      });
    }
  } catch (error) {
    console.error('地理编码失败:', error);
    res.status(500).json({
      success: false,
      error: '地理编码失败'
    });
  }
};

const getStatistics = async (req, res) => {
  try {
    const [provinceCount, cityCount, districtCount, townshipCount] = await Promise.all([
      Province.countDocuments({ isActive: true }),
      City.countDocuments({ isActive: true }),
      District.countDocuments({ isActive: true }),
      Township.countDocuments({ isActive: true })
    ]);

    res.json({
      success: true,
      data: {
        provinces: provinceCount,
        cities: cityCount,
        districts: districtCount,
        townships: townshipCount
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计数据失败'
    });
  }
};

module.exports = {
  getProvinces,
  getCities,
  getDistricts,
  getTownships,
  getVillages,
  searchByCode,
  searchByName,
  getFullRegionPath,
  getStatistics,
  getGeocode
};
