/**
 * 地图服务测试
 */

const mapService = require('../../src/services/mapService');

describe('Map Service Tests', () => {
  describe('地址解析功能', () => {
    test('应该成功解析有效地址', async () => {
      const testAddress = '北京市朝阳区';

      // 模拟高德地图API响应
      const mockResponse = {
        status: '1',
        count: '1',
        geocodes: [{
          formatted_address: '北京市朝阳区',
          location: '116.443,39.921',
          level: '区县',
          confidence: 90
        }]
      };

      // Mock axios get方法
      jest.mock('axios', () => ({
        get: jest.fn(() => Promise.resolve({ data: mockResponse }))
      }));

      const result = await mapService.geocodeAddress(testAddress, '北京市');

      expect(result).toBeDefined();
      expect(result.address).toBe(testAddress);
      expect(result.location).toEqual([116.443, 39.921]);
      expect(result.level).toBe('区县');
    });

    test('应该处理空地址输入', async () => {
      await expect(mapService.geocodeAddress('')).rejects.toThrow('地址不能为空');
    });

    test('应该处理无效地址', async () => {
      const invalidAddress = '不存在的地址12345';

      const mockResponse = {
        status: '0',
        info: 'INVALID_USER_KEY',
        count: '0'
      };

      jest.mock('axios', () => ({
        get: jest.fn(() => Promise.resolve({ data: mockResponse }))
      }));

      await expect(mapService.geocodeAddress(invalidAddress)).rejects.toThrow('地址解析失败');
    });
  });

  describe('逆地址解析功能', () => {
    test('应该成功解析坐标为地址', async () => {
      const longitude = 116.443;
      const latitude = 39.921;

      const mockResponse = {
        status: '1',
        regeocode: {
          formatted_address: '北京市朝阳区某某街道',
          addressComponent: {
            province: '北京市',
            city: '北京市',
            district: '朝阳区',
            adcode: '110105'
          },
          pois: []
        }
      };

      jest.mock('axios', () => ({
        get: jest.fn(() => Promise.resolve({ data: mockResponse }))
      }));

      const result = await mapService.reverseGeocode(longitude, latitude);

      expect(result).toBeDefined();
      expect(result.location).toEqual([longitude, latitude]);
      expect(result.address).toBe('北京市朝阳区某某街道');
      expect(result.addressComponent.province).toBe('北京市');
    });

    test('应该处理无效坐标', async () => {
      await expect(mapService.reverseGeocode(null, 39.921)).rejects.toThrow('经纬度不能为空');
    });
  });

  describe('POI搜索功能', () => {
    test('应该成功搜索POI', async () => {
      const keyword = '医院';
      const city = '北京市';

      const mockResponse = {
        status: '1',
        count: '10',
        pois: [
          {
            id: 'B000A83VDI',
            name: '北京协和医院',
            type: '医疗保健服务;医院;综合医院',
            address: '北京市东城区东单帅府园1号',
            location: '116.412,39.914',
            tel: '010-69156114',
            distance: '1200'
          }
        ]
      };

      jest.mock('axios', () => ({
        get: jest.fn(() => Promise.resolve({ data: mockResponse }))
      }));

      const result = await mapService.searchPoi(keyword, city);

      expect(result).toBeDefined();
      expect(result.keyword).toBe(keyword);
      expect(result.city).toBe(city);
      expect(result.pois).toHaveLength(1);
      expect(result.pois[0].name).toBe('北京协和医院');
    });

    test('应该处理空搜索关键词', async () => {
      await expect(mapService.searchPoi('')).rejects.toThrow('搜索关键词不能为空');
    });

    test('应该支持分页', async () => {
      const keyword = '餐厅';
      const page = 2;
      const pageSize = 10;

      const mockResponse = {
        status: '1',
        count: '100',
        pois: Array(pageSize).fill().map((_, index) => ({
          id: `poi_${(page - 1) * pageSize + index}`,
          name: `餐厅${(page - 1) * pageSize + index}`,
          type: '餐饮服务;中餐厅',
          address: `测试地址${(page - 1) * pageSize + index}`,
          location: `${116.0 + index * 0.001},${39.0 + index * 0.001}`,
          tel: '010-12345678'
        }))
      };

      jest.mock('axios', () => ({
        get: jest.fn(() => Promise.resolve({ data: mockResponse }))
      }));

      const result = await mapService.searchPoi(keyword, '全国', '', page, pageSize);

      expect(result.page).toBe(page);
      expect(result.pageSize).toBe(pageSize);
      expect(result.pois).toHaveLength(pageSize);
    });
  });

  describe('路线规划功能', () => {
    test('应该成功规划驾车路线', async () => {
      const origin = '116.443,39.921'; // 起点
      const destination = '116.412,39.914'; // 终点

      const mockResponse = {
        status: '1',
        route: {
          paths: [{
            distance: '1500', // 米
            duration: '300', // 秒
            strategy: '0',
            toll: '0',
            traffic_lights: '3',
            restriction: '0',
            steps: [
              {
                instruction: '向东行驶200米',
                road: '某某路',
                distance: '200',
                duration: '60',
                action: '直行'
              }
            ]
          }]
        }
      };

      jest.mock('axios', () => ({
        get: jest.fn(() => Promise.resolve({ data: mockResponse }))
      }));

      const result = await mapService.planDrivingRoute(origin, destination);

      expect(result).toBeDefined();
      expect(result.origin).toBe(origin);
      expect(result.destination).toBe(destination);
      expect(result.distance).toBe('1500');
      expect(result.duration).toBe('300');
      expect(result.steps).toHaveLength(1);
    });

    test('应该处理无效的起点和终点', async () => {
      await expect(mapService.planDrivingRoute(null, '116.412,39.914')).rejects.toThrow('起点和终点不能为空');
    });
  });

  describe('距离计算功能', () => {
    test('应该成功计算多点距离', async () => {
      const origins = ['116.443,39.921', '116.444,39.922'];
      const destination = '116.412,39.914';

      const mockResponse = {
        status: '1',
        results: [
          {
            origin_id: '1',
            destination_id: '1',
            distance: '1500',
            duration: '300'
          },
          {
            origin_id: '2',
            destination_id: '1',
            distance: '1200',
            duration: '240'
          }
        ]
      };

      jest.mock('axios', () => ({
        get: jest.fn(() => Promise.resolve({ data: mockResponse }))
      }));

      const result = await mapService.calculateDistance(origins, destination);

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(2);
      expect(result.results[0].distance).toBe('1500');
      expect(result.results[1].distance).toBe('1200');
    });
  });

  describe('天气查询功能', () => {
    test('应该成功获取天气信息', async () => {
      const city = '北京';

      const mockResponse = {
        status: '1',
        lives: [{
          province: '北京',
          city: '北京',
          weather: '晴',
          temperature: '25',
          winddirection: '西',
          windpower: '3',
          humidity: '45',
          reporttime: '2024-01-15 14:00:00'
        }],
        forecasts: [{
          city: '北京',
          adcode: '110000',
          province: '北京',
          reporttime: '2024-01-15 14:00:00',
          casts: [
            {
              date: '2024-01-15',
              week: '1',
              dayweather: '晴',
              nightweather: '晴',
              daytemp: '26',
              nighttemp: '15',
              daywind: '西',
              nightwind: '西',
              daypower: '3',
              nightpower: '2'
            }
          ]
        }]
      };

      jest.mock('axios', () => ({
        get: jest.fn(() => Promise.resolve({ data: mockResponse }))
      }));

      const result = await mapService.getWeather(city);

      expect(result).toBeDefined();
      expect(result.city).toBe(city);
      expect(result.weather).toBeDefined();
      expect(result.weather.temperature).toBe('25');
      expect(result.weather.weather).toBe('晴');
      expect(result.forecasts).toBeDefined();
      expect(result.forecasts).toHaveLength(1);
    });

    test('应该处理空城市名称', async () => {
      await expect(mapService.getWeather('')).rejects.toThrow('城市不能为空');
    });
  });

  describe('IP定位功能', () => {
    test('应该成功根据IP定位', async () => {
      const ip = '116.23.45.67';

      const mockResponse = {
        status: '1',
        ip: '116.23.45.67',
        province: '北京',
        city: '北京',
        adcode: '110000',
        rectangle: '116.0119343,39.66127144;116.7829835,40.2164962'
      };

      jest.mock('axios', () => ({
        get: jest.fn(() => Promise.resolve({ data: mockResponse }))
      }));

      const result = await mapService.locateByIP(ip);

      expect(result).toBeDefined();
      expect(result.ip).toBe(ip);
      expect(result.province).toBe('北京');
      expect(result.city).toBe('北京');
      expect(result.adcode).toBe('110000');
    });
  });

  describe('村庄地图服务', () => {
    test('应该成功获取村庄地图信息', async () => {
      const villageId = '507f1f77bcf86cd799439011';

      // 模拟村庄数据
      const mockVillage = {
        _id: villageId,
        name: '测试村',
        address: '北京市朝阳区测试路123号',
        location: {
          type: 'Point',
          coordinates: [116.443, 39.921]
        },
        population: 1000,
        households: 300,
        area: 50.5
      };

      // Mock Village model
      jest.mock('../../src/models/Village', () => ({
        findById: jest.fn(() => Promise.resolve(mockVillage))
      }));

      // Mock reverse geocoding
      const mockGeocodeResponse = {
        status: '1',
        regeocode: {
          formatted_address: '北京市朝阳区某某街道',
          addressComponent: {
            province: '北京市',
            city: '北京市',
            district: '朝阳区',
            adcode: '110105'
          }
        }
      };

      jest.mock('axios', () => ({
        get: jest.fn(() => Promise.resolve({ data: mockGeocodeResponse }))
      }));

      const result = await mapService.getVillageMapInfo(villageId);

      expect(result).toBeDefined();
      expect(result.villageId).toBe(villageId);
      expect(result.name).toBe('测试村');
      expect(result.location).toBeDefined();
      expect(result.location.coordinates).toEqual([116.443, 39.921]);
    });

    test('应该处理不存在的村庄ID', async () => {
      const villageId = '507f1f77bcf86cd799439999';

      jest.mock('../../src/models/Village', () => ({
        findById: jest.fn(() => Promise.resolve(null))
      }));

      await expect(mapService.getVillageMapInfo(villageId)).rejects.toThrow('村庄不存在');
    });
  });

  describe('村庄服务设施功能', () => {
    test('应该成功获取村庄服务设施', async () => {
      const villageId = '507f1f77bcf86cd799439011';

      const mockVillageMapInfo = {
        location: {
          coordinates: [116.443, 39.921],
          addressComponent: {
            city: '北京市'
          }
        }
      };

      const mockPoiResponse = {
        status: '1',
        count: '5',
        pois: [
          {
            id: 'hospital_1',
            name: '村卫生室',
            type: '医疗保健服务;医院;综合医院',
            address: '村内1号',
            location: '116.443,39.921',
            tel: '010-12345678'
          }
        ]
      };

      // Mock getVillageMapInfo
      jest.spyOn(mapService, 'getVillageMapInfo').mockResolvedValue({
        success: true,
        data: mockVillageMapInfo
      });

      // Mock searchPoi
      jest.spyOn(mapService, 'searchPoi').mockResolvedValue({
        success: true,
        data: {
          pois: mockPoiResponse.pois
        }
      });

      const result = await mapService.getVillageServiceFacilities(villageId, ['medical']);

      expect(result).toBeDefined();
      expect(result.villageId).toBe(villageId);
      expect(result.villageName).toBeDefined();
      expect(result.facilities).toBeDefined();
      expect(result.facilities.medical).toBeDefined();
    });
  });

  describe('缓存功能', () => {
    test('应该正确缓存和检索数据', () => {
      const cacheKey = 'test_key';
      const testData = { test: 'data' };

      // 设置缓存
      mapService.setCache(cacheKey, testData);

      // 获取缓存
      const cachedData = mapService.getFromCache(cacheKey);
      expect(cachedData).toEqual(testData);
    });

    test('应该在缓存过期时返回null', () => {
      const cacheKey = 'test_key_expired';
      const testData = { test: 'data' };

      // 设置缓存
      mapService.setCache(cacheKey, testData);

      // 模拟缓存过期
      mapService.cacheTimeout = 0;

      // 获取缓存（应该返回null）
      const cachedData = mapService.getFromCache(cacheKey);
      expect(cachedData).toBeNull();
    });

    test('应该正确清理缓存', () => {
      const cacheKey = 'test_key_clear';
      const testData = { test: 'data' };

      // 设置缓存
      mapService.setCache(cacheKey, testData);
      expect(mapService.cache.size).toBe(1);

      // 清理缓存
      mapService.clearCache();
      expect(mapService.cache.size).toBe(0);
    });
  });

  describe('距离计算工具方法', () => {
    test('应该正确计算两点间距离', () => {
      const point1 = [116.443, 39.921];
      const point2 = [116.444, 39.922];

      const distance = mapService.calculateDistanceBetweenPoints(point1, point2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2000); // 应该在合理范围内
    });

    test('应该处理相同的点', () => {
      const point1 = [116.443, 39.921];
      const point2 = [116.443, 39.921];

      const distance = mapService.calculateDistanceBetweenPoints(point1, point2);

      expect(distance).toBe(0);
    });
  });

  describe('POI去重和排序功能', () => {
    test('应该正确去重POI列表', () => {
      const pois = [
        { name: '测试医院', address: '测试地址1', distance: 100 },
        { name: '测试医院', address: '测试地址1', distance: 200 }, // 重复
        { name: '另一家医院', address: '测试地址2', distance: 300 }
      ];

      const uniquePois = mapService.deduplicateAndSort(pois);

      expect(uniquePois).toHaveLength(2);
      expect(uniquePois[0].name).toBe('测试医院');
      expect(uniquePois[1].name).toBe('另一家医院');
    });

    test('应该正确按距离排序POI', () => {
      const pois = [
        { name: '远医院', address: '测试地址3', distance: 500 },
        { name: '近医院', address: '测试地址1', distance: 100 },
        { name: '中医院', address: '测试地址2', distance: 300 }
      ];

      const sortedPois = mapService.deduplicateAndSort(pois);

      expect(sortedPois[0].distance).toBe(100);
      expect(sortedPois[1].distance).toBe(300);
      expect(sortedPois[2].distance).toBe(500);
    });
  });

  describe('百度地图集成', () => {
    test('应该生成正确的SN签名', () => {
      const params = {
        ak: 'test_ak',
        address: '北京',
        output: 'json'
      };

      // 设置SK
      mapService.config.baidu.sk = 'test_sk';

      // Mock crypto createHash
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('mocked_hash')
      };

      jest.mock('crypto', () => ({
        createHash: jest.fn(() => mockHash)
      }));

      const sn = mapService.generateBaiduSN(params);

      expect(sn).toBeDefined();
      expect(mockHash.update).toHaveBeenCalled();
      expect(mockHash.digest).toHaveBeenCalledWith('hex');
    });
  });

  describe('错误处理', () => {
    test('应该处理网络超时错误', async () => {
      // Mock timeout error
      jest.mock('axios', () => ({
        get: jest.fn(() => Promise.reject(new Error('timeout')))
      }));

      await expect(mapService.geocodeAddress('测试地址')).rejects.toThrow('timeout');
    });

    test('应该处理API限制错误', async () => {
      const mockResponse = {
        status: '0',
        info: 'OVER_QUOTA'
      };

      jest.mock('axios', () => ({
        get: jest.fn(() => Promise.resolve({ data: mockResponse }))
      }));

      await expect(mapService.geocodeAddress('测试地址')).rejects.toThrow();
    });
  });
});