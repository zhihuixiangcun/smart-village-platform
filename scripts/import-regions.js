const axios = require('axios');
const Province = require('../src/models/Province');
const City = require('../src/models/City');
const District = require('../src/models/District');
const Township = require('../src/models/Township');
const mongoose = require('mongoose');

const API_BASE_URL = 'https://geo.datav.aliyun.com/areas_v3/bound';

async function fetchRegionData(adcode) {
  try {
    const response = await axios.get(`${API_BASE_URL}/${adcode}_full.json`);
    return response.data;
  } catch (error) {
    console.error(`获取区域 ${adcode} 数据失败:`, error.message);
    return null;
  }
}

async function saveProvince(data) {
  const { adcode, name, level, center } = data;

  const province = await Province.findOneAndUpdate(
    { code: adcode },
    {
      code: adcode,
      name: name,
      level: determineProvinceLevel(name),
      coordinates: center,
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  console.log(`✓ 保存省份: ${name} (${adcode})`);
  return province;
}

async function saveCities(provinceCode, districts) {
  const cities = [];

  for (const district of districts) {
    if (district.level === 'district') {
      const city = await City.findOneAndUpdate(
        { code: district.adcode },
        {
          code: district.adcode,
          name: district.name,
          provinceCode: provinceCode,
          provinceName: district.parent?.name || '',
          level: determineCityLevel(district.name),
          coordinates: district.center,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      cities.push(city);
      console.log(`  ✓ 保存城市: ${district.name} (${district.adcode})`);
    }
  }

  return cities;
}

async function saveDistricts(provinceCode, provinceName, cityCode, cityName, districts) {
  const districtList = [];

  for (const district of districts) {
    if (district.level === 'district') {
      const savedDistrict = await District.findOneAndUpdate(
        { code: district.adcode },
        {
          code: district.adcode,
          name: district.name,
          provinceCode: provinceCode,
          provinceName: provinceName,
          cityCode: cityCode,
          cityName: cityName,
          level: determineDistrictLevel(district.name),
          coordinates: district.center,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      districtList.push(savedDistrict);
      console.log(`    ✓ 保存区县: ${district.name} (${district.adcode})`);
    }
  }

  return districtList;
}

async function saveTownships(districtCode, districts) {
  const townships = [];

  for (const district of districts) {
    if (district.level === 'street') {
      const township = await Township.findOneAndUpdate(
        { code: district.adcode },
        {
          code: district.adcode,
          name: district.name,
          provinceCode: district.parent?.parent?.parent?.adcode || '',
          provinceName: district.parent?.parent?.parent?.name || '',
          cityCode: district.parent?.parent?.adcode || '',
          cityName: district.parent?.parent?.name || '',
          districtCode: districtCode,
          districtName: district.parent?.name || '',
          level: determineTownshipLevel(district.name),
          coordinates: district.center,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      townships.push(township);
      console.log(`      ✓ 保存乡镇: ${district.name} (${district.adcode})`);
    }
  }

  return townships;
}

function determineProvinceLevel(name) {
  const municipalities = ['北京市', '天津市', '上海市', '重庆市'];
  const autonomousRegions = ['内蒙古自治区', '新疆维吾尔自治区', '广西壮族自治区', '宁夏回族自治区', '西藏自治区'];
  const sars = ['香港特别行政区', '澳门特别行政区'];

  if (municipalities.includes(name)) return 'municipality';
  if (autonomousRegions.includes(name)) return 'autonomous_region';
  if (sars.includes(name)) return 'sar';
  return 'province';
}

function determineCityLevel(name) {
  if (name.endsWith('市')) {
    const subProvincialCities = ['深圳市', '青岛市', '大连市', '宁波市', '厦门市'];
    if (subProvincialCities.includes(name)) return 'sub_provincial';
    return 'prefecture';
  }
  if (name.endsWith('自治州') || name.endsWith('地区') || name.endsWith('盟')) {
    return 'prefecture';
  }
  return 'county_level';
}

function determineDistrictLevel(name) {
  if (name.endsWith('区')) return 'district';
  if (name.endsWith('县')) return 'county';
  if (name.endsWith('自治县')) return 'autonomous_county';
  if (name.endsWith('旗')) return 'banner';
  return 'district';
}

function determineTownshipLevel(name) {
  if (name.endsWith('街道')) return 'subdistrict';
  if (name.endsWith('镇')) return 'town';
  if (name.endsWith('乡')) return 'township';
  if (name.endsWith('民族乡')) return 'ethnic_township';
  if (name.endsWith('民族镇')) return 'ethnic_town';
  return 'township';
}

async function importProvinceData(provinceAdcode) {
  console.log(`\n========================================`);
  console.log(`开始导入省份: ${provinceAdcode}`);
  console.log(`========================================`);

  const data = await fetchRegionData(provinceAdcode);
  if (!data) {
    console.error(`获取 ${provinceAdcode} 数据失败`);
    return;
  }

  const province = await saveProvince(data);

  const provinceDistricts = data.districts || [];
  const cities = await saveCities(provinceAdcode, provinceDistricts);

  for (const cityData of cities) {
    const cityRegionData = await fetchRegionData(cityData.code);
    if (!cityRegionData) continue;

    const cityDistricts = cityRegionData.districts || [];
    const districts = await saveDistricts(
      provinceAdcode,
      province.name,
      cityData.code,
      cityData.name,
      cityDistricts
    );

    for (const district of districts) {
      const districtRegionData = await fetchRegionData(district.code);
      if (!districtRegionData) continue;

      const districtSubDistricts = districtRegionData.districts || [];
      await saveTownships(district.code, districtSubDistricts);

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✓ 省份 ${province.name} 导入完成\n`);
}

async function importAllProvinces() {
  console.log('\n========================================');
  console.log('开始导入全国行政区划数据');
  console.log('========================================\n');

  const municipalityCodes = ['110000', '120000', '310000', '500000'];
  const provinceCodes = [
    '130000', '140000', '150000', '210000', '220000', '230000',
    '320000', '330000', '340000', '350000', '360000', '370000',
    '410000', '420000', '430000', '440000', '450000', '460000',
    '510000', '520000', '530000', '540000', '610000', '620000',
    '630000', '640000', '650000'
  ];
  const arCodes = ['450000', '650000', '540000', '640000'];

  for (const code of municipalityCodes) {
    await importProvinceData(code);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  for (const code of provinceCodes) {
    await importProvinceData(code);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n========================================');
  console.log('全国行政区划数据导入完成');
  console.log('========================================\n');
}

async function getStatistics() {
  const [provinceCount, cityCount, districtCount, townshipCount] = await Promise.all([
    Province.countDocuments({ isActive: true }),
    City.countDocuments({ isActive: true }),
    District.countDocuments({ isActive: true }),
    Township.countDocuments({ isActive: true })
  ]);

  console.log('\n========================================');
  console.log('行政区划数据统计');
  console.log('========================================');
  console.log(`省份/直辖市: ${provinceCount}`);
  console.log(`地级市: ${cityCount}`);
  console.log(`区县: ${districtCount}`);
  console.log(`乡镇: ${townshipCount}`);
  console.log('========================================\n');
}

const command = process.argv[2];

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ 数据库连接成功\n');

    switch (command) {
      case 'all':
        await importAllProvinces();
        break;
      case 'province':
        const provinceCode = process.argv[3];
        if (!provinceCode) {
          console.error('请指定省份代码，例如: node scripts/import-regions.js province 110000');
          process.exit(1);
        }
        await importProvinceData(provinceCode);
        break;
      case 'stats':
        await getStatistics();
        break;
      default:
        console.log(`
用法:
  node scripts/import-regions.js all              # 导入全国所有省份数据
  node scripts/import-regions.js province 110000  # 导入指定省份数据
  node scripts/import-regions.js stats             # 查看统计数据
        `);
    }
  } catch (error) {
    console.error('执行失败:', error);
  } finally {
    await mongoose.connection.close();
  }
}

main();
