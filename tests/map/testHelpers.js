/**
 * 村情地图测试数据辅助工具
 * 提供真实的测试GPS坐标和各种测试数据
 */

/**
 * 中国主要城市GPS坐标
 */
const CHINA_CITIES = {
  beijing: {
    name: '北京',
    center: [116.4074, 39.9042],
    bounds: {
      northeast: [116.5174, 40.0142],
      southwest: [116.2974, 39.7942]
    }
  },
  shanghai: {
    name: '上海',
    center: [121.4737, 31.2304],
    bounds: {
      northeast: [121.5837, 31.3404],
      southwest: [121.3637, 31.1204]
    }
  },
  hangzhou: {
    name: '杭州',
    center: [120.1551, 30.2741],
    bounds: {
      northeast: [120.2651, 30.3841],
      southwest: [120.0451, 30.1641]
    }
  },
  guangzhou: {
    name: '广州',
    center: [113.2644, 23.1291],
    bounds: {
      northeast: [113.3744, 23.2391],
      southwest: [113.1544, 23.0191]
    }
  }
};

/**
 * 测试村庄示例数据
 */
const TEST_VILLAGES = {
  beijing_village: {
    name: '北京智慧村',
    code: 'BJ_SMART_001',
    address: '北京市朝阳区智慧路1号',
    location: {
      type: 'Point',
      coordinates: [116.4574, 39.9342]
    },
    population: 1200,
    households: 350,
    area: 3.5
  },
  hangzhou_village: {
    name: '杭州示范村',
    code: 'HZ_DEMO_001',
    address: '浙江省杭州市余杭区瓶窑镇',
    location: {
      type: 'Point',
      coordinates: [120.0123, 30.2674]
    },
    population: 1500,
    households: 450,
    area: 5.2
  }
};

/**
 * 地图要素测试数据
 */
const MAP_FEATURES = {
  committee: {
    featureType: 'building',
    geometry: {
      type: 'Point',
      coordinates: [120.0123, 30.2674]
    },
    properties: {
      name: '村委会',
      description: '村行政管理中心',
      address: '村内中心位置',
      type: 'government',
      status: 'active'
    }
  },
  clinic: {
    featureType: 'medical_point',
    geometry: {
      type: 'Point',
      coordinates: [120.0133, 30.2684]
    },
    properties: {
      name: '村卫生室',
      description: '基本医疗服务点',
      capacity: 30,
      currentOccupancy: 5
    }
  },
  school: {
    featureType: 'building',
    geometry: {
      type: 'Point',
      coordinates: [120.0143, 30.2694]
    },
    properties: {
      name: '村小学',
      description: '村级小学',
      capacity: 200,
      currentOccupancy: 180
    }
  },
  plaza: {
    featureType: 'facility',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [120.0153, 30.2704],
        [120.0173, 30.2704],
        [120.0173, 30.2724],
        [120.0153, 30.2724],
        [120.0153, 30.2704]
      ]]
    },
    properties: {
      name: '文化广场',
      description: '村民文化娱乐场所',
      type: 'recreation'
    }
  }
};

/**
 * 危险区域测试数据
 */
const DANGER_ZONES = {
  flood_zone: {
    type: 'flood',
    severity: 'red',
    title: '洪水危险区',
    description: '低洼易涝区域',
    affectedArea: {
      type: 'Polygon',
      coordinates: [[
        [120.0103, 30.2654],
        [120.0153, 30.2654],
        [120.0153, 30.2704],
        [120.0103, 30.2704],
        [120.0103, 30.2654]
      ]]
    },
    centerPoint: {
      type: 'Point',
      coordinates: [120.0128, 30.2679]
    },
    radius: 300
  },
  fire_zone: {
    type: 'fire',
    severity: 'orange',
    title: '森林火灾风险区',
    description: '山林火灾易发区域',
    affectedArea: {
      type: 'Polygon',
      coordinates: [[
        [120.0173, 30.2724],
        [120.0223, 30.2724],
        [120.0223, 30.2774],
        [120.0173, 30.2774],
        [120.0173, 30.2724]
      ]]
    },
    centerPoint: {
      type: 'Point',
      coordinates: [120.0198, 30.2749]
    },
    radius: 500
  },
  landslide_zone: {
    type: 'landslide',
    severity: 'yellow',
    title: '山体滑坡预警区',
    description: '雨季易发生山体滑坡',
    affectedArea: {
      type: 'Polygon',
      coordinates: [[
        [120.0083, 30.2634],
        [120.0113, 30.2634],
        [120.0113, 30.2664],
        [120.0083, 30.2664],
        [120.0083, 30.2634]
      ]]
    },
    centerPoint: {
      type: 'Point',
      coordinates: [120.0098, 30.2649]
    },
    radius: 200
  }
};

/**
 * 应急资源测试数据
 */
const EMERGENCY_RESOURCES = {
  shelter: {
    featureType: 'shelter',
    geometry: {
      type: 'Point',
      coordinates: [120.0133, 30.2684]
    },
    properties: {
      name: '应急避难所',
      capacity: 200,
      currentOccupancy: 0,
      status: 'active'
    }
  },
  medical_point: {
    featureType: 'medical_point',
    geometry: {
      type: 'Point',
      coordinates: [120.0143, 30.2694]
    },
    properties: {
      name: '紧急医疗点',
      capacity: 50,
      currentOccupancy: 5,
      status: 'active'
    }
  },
  rescue_point: {
    featureType: 'rescue_point',
    geometry: {
      type: 'Point',
      coordinates: [120.0153, 30.2704]
    },
    properties: {
      name: '救援物资点',
      capacity: 100,
      currentOccupancy: 0,
      status: 'active'
    }
  },
  water_pump: {
    featureType: 'facility',
    geometry: {
      type: 'Point',
      coordinates: [120.0163, 30.2714]
    },
    properties: {
      name: '应急水泵',
      type: 'equipment',
      quantity: 5,
      status: 'available'
    }
  }
};

/**
 * 村民位置测试数据
 */
const RESIDENT_LOCATIONS = {
  location1: {
    location: {
      type: 'Point',
      coordinates: [120.0123, 30.2674],
      accuracy: 10,
      altitude: 50
    },
    activityStatus: {
      isMoving: false,
      activityType: 'still'
    }
  },
  location2: {
    location: {
      type: 'Point',
      coordinates: [120.0133, 30.2684],
      accuracy: 15,
      altitude: 55
    },
    activityStatus: {
      isMoving: true,
      activityType: 'walking'
    }
  },
  location3: {
    location: {
      type: 'Point',
      coordinates: [120.0143, 30.2694],
      accuracy: 8,
      altitude: 48
    },
    activityStatus: {
      isMoving: true,
      activityType: 'cycling'
    }
  }
};

/**
 * 撤离路线测试数据
 */
const EVACUATION_ROUTES = {
  primary_route: {
    routeId: 'route_primary_1',
    name: '主撤离路线',
    priority: 'primary',
    path: {
      type: 'LineString',
      coordinates: [
        [120.0103, 30.2654],
        [120.0123, 30.2674],
        [120.0153, 30.2704]
      ]
    },
    capacity: 1000,
    estimatedTime: 10
  },
  secondary_route: {
    routeId: 'route_secondary_1',
    name: '备用撤离路线',
    priority: 'secondary',
    path: {
      type: 'LineString',
      coordinates: [
        [120.0113, 30.2664],
        [120.0133, 30.2684],
        [120.0163, 30.2714]
      ]
    },
    capacity: 500,
    estimatedTime: 15
  },
  emergency_route: {
    routeId: 'route_emergency_1',
    name: '紧急撤离路线',
    priority: 'emergency',
    path: {
      type: 'LineString',
      coordinates: [
        [120.0173, 30.2724],
        [120.0183, 30.2734],
        [120.0203, 30.2754]
      ]
    },
    capacity: 200,
    estimatedTime: 5
  }
};

/**
 * 辅助函数：生成随机GPS坐标（在指定范围内）
 */
function generateRandomCoordinate(center, radius) {
  const [lng, lat] = center;
  const r = radius / 111320; // 转换为度（近似值）
  const u = Math.random();
  const v = Math.random();
  const w = r * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);

  return [lng + x / Math.cos(lat * Math.PI / 180), lat + y];
}

/**
 * 辅助函数：生成测试村民数据
 */
function generateTestResidents(count, villageId, centerLocation) {
  const residents = [];
  for (let i = 0; i < count; i++) {
    const coords = generateRandomCoordinate(centerLocation, 500); // 500米范围内
    residents.push({
      userId: new mongoose.Types.ObjectId(),
      villageId: villageId,
      sessionId: `test_session_${i}`,
      location: {
        type: 'Point',
        coordinates: coords,
        accuracy: Math.floor(Math.random() * 50) + 5,
        altitude: Math.floor(Math.random() * 100) + 0
      },
      activityStatus: {
        isMoving: Math.random() > 0.5,
        activityType: ['still', 'walking', 'running', 'cycling', 'driving'][Math.floor(Math.random() * 5)]
      },
      privacySettings: {
        isVisibleToPublic: false,
        isVisibleToVillage: true,
        anonymizePublic: true,
        blurRadius: Math.floor(Math.random() * 200) + 50
      },
      timestamp: new Date()
    });
  }
  return residents;
}

/**
 * 辅助函数：计算两点间距离（米）
 */
function calculateDistance(point1, point2) {
  const [lng1, lat1] = point1;
  const [lng2, lat2] = point2;
  const R = 6371000;

  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 辅助函数：判断点是否在多边形内
 */
function isPointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

module.exports = {
  CHINA_CITIES,
  TEST_VILLAGES,
  MAP_FEATURES,
  DANGER_ZONES,
  EMERGENCY_RESOURCES,
  RESIDENT_LOCATIONS,
  EVACUATION_ROUTES,
  generateRandomCoordinate,
  generateTestResidents,
  calculateDistance,
  isPointInPolygon
};
