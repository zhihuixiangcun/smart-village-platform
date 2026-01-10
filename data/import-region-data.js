const mongoose = require('mongoose');
const Province = require('../src/models/Province');
const City = require('../src/models/City');
const District = require('../src/models/District');
const Township = require('../src/models/Township');
const Village = require('../src/models/Village');
const regionData = require('./china-regions-data.js');

async function importProvinces() {
  console.log('\n开始导入省份数据...');
  let imported = 0;
  
  for (const province of regionData.provinces) {
    const existing = await Province.findOne({ code: province.code });
    if (existing) {
      await Province.updateOne({ code: province.code }, province);
      console.log(`  更新省份: ${province.name}`);
    } else {
      await Province.create(province);
      console.log(`  创建省份: ${province.name}`);
    }
    imported++;
  }
  
  console.log(`✓ 省份数据导入完成，共 ${imported} 个\n`);
  return imported;
}

async function importCities() {
  console.log('开始导入城市数据...');
  let imported = 0;
  
  for (const [provinceCode, cities] of Object.entries(regionData.cities)) {
    for (const city of cities) {
      const province = regionData.provinces.find(p => p.code === provinceCode);
      const cityData = {
        ...city,
        provinceCode: provinceCode,
        provinceName: province?.name || ''
      };
      
      const existing = await City.findOne({ code: city.code });
      if (existing) {
        await City.updateOne({ code: city.code }, cityData);
        console.log(`  更新城市: ${city.name}`);
      } else {
        await City.create(cityData);
        console.log(`  创建城市: ${city.name}`);
      }
      imported++;
    }
  }
  
  console.log(`✓ 城市数据导入完成，共 ${imported} 个\n`);
  return imported;
}

async function importDistricts() {
  console.log('开始导入区县数据...');
  let imported = 0;
  
  for (const [cityCode, districts] of Object.entries(regionData.districts)) {
    const provinceCode = cityCode.substring(0, 2) + '0000';
    const province = regionData.provinces.find(p => p.code === provinceCode);
    const city = Object.values(regionData.cities).flat().find(c => c.code === cityCode);
    
    for (const district of districts) {
      const districtData = {
        ...district,
        provinceCode: provinceCode,
        provinceName: province?.name || '',
        cityCode: cityCode,
        cityName: city?.name || ''
      };
      
      const existing = await District.findOne({ code: district.code });
      if (existing) {
        await District.updateOne({ code: district.code }, districtData);
        console.log(`  更新区县: ${district.name}`);
      } else {
        await District.create(districtData);
        console.log(`  创建区县: ${district.name}`);
      }
      imported++;
    }
  }
  
  console.log(`✓ 区县数据导入完成，共 ${imported} 个\n`);
  return imported;
}

async function importTownships() {
  console.log('开始导入乡镇数据...');
  let imported = 0;
  
  for (const [districtCode, townships] of Object.entries(regionData.townships)) {
    const provinceCode = districtCode.substring(0, 2) + '0000';
    const cityCode = districtCode.substring(0, 4) + '00';
    const province = regionData.provinces.find(p => p.code === provinceCode);
    const city = Object.values(regionData.cities).flat().find(c => c.code === cityCode);
    const district = Object.values(regionData.districts).flat().find(d => d.code === districtCode);
    
    for (const township of townships) {
      const townshipData = {
        ...township,
        provinceCode: provinceCode,
        provinceName: province?.name || '',
        cityCode: cityCode,
        cityName: city?.name || '',
        districtCode: districtCode,
        districtName: district?.name || ''
      };
      
      const existing = await Township.findOne({ code: township.code });
      if (existing) {
        await Township.updateOne({ code: township.code }, townshipData);
        console.log(`  更新乡镇: ${township.name}`);
      } else {
        await Township.create(townshipData);
        console.log(`  创建乡镇: ${township.name}`);
      }
      imported++;
    }
  }
  
  console.log(`✓ 乡镇数据导入完成，共 ${imported} 个\n`);
  return imported;
}

async function importVillages() {
  console.log('开始导入村庄数据...');
  let imported = 0;
  
  for (const [townshipCode, villages] of Object.entries(regionData.villages)) {
    const provinceCode = townshipCode.substring(0, 2) + '0000';
    const cityCode = townshipCode.substring(0, 4) + '00';
    const districtCode = townshipCode.substring(0, 6);
    
    const province = regionData.provinces.find(p => p.code === provinceCode);
    const city = Object.values(regionData.cities).flat().find(c => c.code === cityCode);
    const district = Object.values(regionData.districts).flat().find(d => d.code === districtCode);
    const township = Object.values(regionData.townships).flat().find(t => t.code === townshipCode);
    
    for (const village of villages) {
      const villageData = {
        code: village.code,
        name: village.name,
        province: province?.name || '',
        city: city?.name || '',
        district: district?.name || '',
        township: township?.name || '',
        address: village.address,
        population: 0,
        area: 0,
        isActive: true
      };
      
      const existing = await Village.findOne({ code: village.code });
      if (existing) {
        await Village.updateOne({ code: village.code }, villageData);
        console.log(`  更新村庄: ${village.name}`);
      } else {
        await Village.create(villageData);
        console.log(`  创建村庄: ${village.name}`);
      }
      imported++;
    }
  }
  
  console.log(`✓ 村庄数据导入完成，共 ${imported} 个\n`);
  return imported;
}

async function getStatistics() {
  const [provinceCount, cityCount, districtCount, townshipCount, villageCount] = await Promise.all([
    Province.countDocuments({}),
    City.countDocuments({}),
    District.countDocuments({}),
    Township.countDocuments({}),
    Village.countDocuments({})
  ]);

  console.log('\n========================================');
  console.log('行政区划数据统计');
  console.log('========================================');
  console.log(`省份/直辖市: ${provinceCount}`);
  console.log(`地级市: ${cityCount}`);
  console.log(`区县: ${districtCount}`);
  console.log(`乡镇: ${townshipCount}`);
  console.log(`村庄: ${villageCount}`);
  console.log('========================================\n');
}

async function clearAllData() {
  console.log('\n清空所有行政区划数据...');
  await Province.deleteMany({});
  await City.deleteMany({});
  await District.deleteMany({});
  await Township.deleteMany({});
  await Village.deleteMany({});
  console.log('✓ 所有数据已清空\n');
}

async function main() {
  const command = process.argv[2];
  
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ 数据库连接成功\n');

    switch (command) {
      case 'provinces':
        await importProvinces();
        break;
      case 'cities':
        await importCities();
        break;
      case 'districts':
        await importDistricts();
        break;
      case 'townships':
        await importTownships();
        break;
      case 'villages':
        await importVillages();
        break;
      case 'all':
        await importProvinces();
        await importCities();
        await importDistricts();
        await importTownships();
        await importVillages();
        break;
      case 'stats':
        await getStatistics();
        break;
      case 'clear':
        await clearAllData();
        await importProvinces();
        await importCities();
        await importDistricts();
        await importTownships();
        await importVillages();
        await getStatistics();
        break;
      default:
        console.log(`
用法:
  node data/import-regions.js provinces   # 导入省份数据
  node data/import-regions.js cities       # 导入城市数据
  node data/import-regions.js districts   # 导入区县数据
  node data/import-regions.js townships    # 导入乡镇数据
  node data/import-regions.js villages    # 导入村庄数据
  node data/import-regions.js all         # 导入所有数据
  node data/import-regions.js stats        # 查看统计数据
  node data/import-regions.js clear       # 清空并重新导入所有数据
        `);
    }
  } catch (error) {
    console.error('❌ 执行失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭');
  }
}

main();
