const mongoose = require('mongoose');
require('dotenv').config();

const Village = require('../src/models/Village');

async function addNewVillages() {
  try {
    console.log('🔄 连接数据库...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 数据库连接成功');

    const villagesData = [
      {
        name: '贵州省贞丰县鲁贡镇么扒村',
        code: 'GZZF01V001A',
        address: '贵州省贞丰县鲁贡镇么扒村',
        location: {
          type: 'Point',
          coordinates: [105.7, 25.5]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '贞丰县',
        adcode: '522325',
        population: 1500,
        households: 380,
        area: 12.5,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省贞丰县鲁贡镇弄洋村',
        code: 'GZZF01V002A',
        address: '贵州省贞丰县鲁贡镇弄洋村',
        location: {
          type: 'Point',
          coordinates: [105.72, 25.52]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '贞丰县',
        adcode: '522325',
        population: 1200,
        households: 310,
        area: 10.8,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省贞丰县鲁贡镇者央村',
        code: 'GZZF01V003A',
        address: '贵州省贞丰县鲁贡镇者央村',
        location: {
          type: 'Point',
          coordinates: [105.68, 25.48]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '贞丰县',
        adcode: '522325',
        population: 1350,
        households: 350,
        area: 11.2,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省贞丰县鲁贡镇林桃村',
        code: 'GZZF01V004A',
        address: '贵州省贞丰县鲁贡镇林桃村',
        location: {
          type: 'Point',
          coordinates: [105.75, 25.53]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '贞丰县',
        adcode: '522325',
        population: 1100,
        households: 290,
        area: 9.6,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省望谟县乐元镇乐元村',
        code: 'GZZF02V001A',
        address: '贵州省望谟县乐元镇乐元村',
        location: {
          type: 'Point',
          coordinates: [106.1, 25.2]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '望谟县',
        adcode: '522326',
        population: 1800,
        households: 450,
        area: 15.3,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省兴义市顶效镇绿化村',
        code: 'GZZXY1V001A',
        address: '贵州省兴义市顶效镇绿化村',
        location: {
          type: 'Point',
          coordinates: [104.9, 25.15]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '兴义市',
        adcode: '522301',
        population: 1600,
        households: 400,
        area: 13.2,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省兴义市顶效镇绿荫村',
        code: 'GZZXY1V002A',
        address: '贵州省兴义市顶效镇绿荫村',
        location: {
          type: 'Point',
          coordinates: [104.92, 25.17]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '兴义市',
        adcode: '522301',
        population: 1450,
        households: 380,
        area: 12.5,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省兴义市顶效镇查白村',
        code: 'GZZXY1V003A',
        address: '贵州省兴义市顶效镇查白村',
        location: {
          type: 'Point',
          coordinates: [104.88, 25.13]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '兴义市',
        adcode: '522301',
        population: 1250,
        households: 320,
        area: 10.8,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省兴义市顶效镇楼纳村',
        code: 'GZZXY1V004A',
        address: '贵州省兴义市顶效镇楼纳村',
        location: {
          type: 'Point',
          coordinates: [104.95, 25.19]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '兴义市',
        adcode: '522301',
        population: 1700,
        households: 420,
        area: 14.6,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省贞丰县沙坪镇者索村',
        code: 'GZZF02V002A',
        address: '贵州省贞丰县沙坪镇者索村',
        location: {
          type: 'Point',
          coordinates: [105.65, 25.45]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '贞丰县',
        adcode: '522325',
        population: 1300,
        households: 340,
        area: 11.5,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省贞丰县沙坪镇板昌村',
        code: 'GZZF02V003A',
        address: '贵州省贞丰县沙坪镇板昌村',
        location: {
          type: 'Point',
          coordinates: [105.68, 25.48]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '贞丰县',
        adcode: '522325',
        population: 1150,
        households: 300,
        area: 10.2,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省贞丰县沙坪镇这年村',
        code: 'GZZF02V004A',
        address: '贵州省贞丰县沙坪镇这年村',
        location: {
          type: 'Point',
          coordinates: [105.72, 25.52]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '贞丰县',
        adcode: '522325',
        population: 1080,
        households: 280,
        area: 9.5,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省贞丰县沙坪镇者砍村',
        code: 'GZZF02V005A',
        address: '贵州省贞丰县沙坪镇者砍村',
        location: {
          type: 'Point',
          coordinates: [105.75, 25.55]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '贞丰县',
        adcode: '522325',
        population: 980,
        households: 260,
        area: 8.8,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省贞丰县白层镇兴龙村',
        code: 'GZZF03V001A',
        address: '贵州省贞丰县白层镇兴龙村',
        location: {
          type: 'Point',
          coordinates: [105.85, 25.6]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '贞丰县',
        adcode: '522325',
        population: 1420,
        households: 360,
        area: 12.8,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省贞丰县白层镇坝桥村',
        code: 'GZZF03V002A',
        address: '贵州省贞丰县白层镇坝桥村',
        location: {
          type: 'Point',
          coordinates: [105.88, 25.62]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '贞丰县',
        adcode: '522325',
        population: 1180,
        households: 310,
        area: 10.5,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省贞丰县白层镇坡们村',
        code: 'GZZF03V003A',
        address: '贵州省贞丰县白层镇坡们村',
        location: {
          type: 'Point',
          coordinates: [105.82, 25.58]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '贞丰县',
        adcode: '522325',
        population: 1050,
        households: 280,
        area: 9.2,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省贞丰县白层镇纳杠村',
        code: 'GZZF03V004A',
        address: '贵州省贞丰县白层镇纳杠村',
        location: {
          type: 'Point',
          coordinates: [105.86, 25.64]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '贞丰县',
        adcode: '522325',
        population: 1280,
        households: 330,
        area: 11.5,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省望谟县乐元镇里好村',
        code: 'GZZW02V002A',
        address: '贵州省望谟县乐元镇里好村',
        location: {
          type: 'Point',
          coordinates: [106.05, 25.22]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '望谟县',
        adcode: '522326',
        population: 1350,
        households: 350,
        area: 11.8,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省望谟县乐元镇纳管村',
        code: 'GZZW02V003A',
        address: '贵州省望谟县乐元镇纳管村',
        location: {
          type: 'Point',
          coordinates: [106.08, 25.25]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '望谟县',
        adcode: '522326',
        population: 1120,
        households: 290,
        area: 9.8,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      },
      {
        name: '贵州省望谟县乐元镇董万村',
        code: 'GZZW02V004A',
        address: '贵州省望谟县乐元镇董万村',
        location: {
          type: 'Point',
          coordinates: [106.12, 25.28]
        },
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '望谟县',
        adcode: '522326',
        population: 1500,
        households: 380,
        area: 13.2,
        isActive: true,
        committee: {
          members: []
        },
        economy: {
          enterprises: []
        },
        infrastructure: {
          hasRunningWater: false,
          hasElectricity: true,
          hasInternet: false,
          hasRoad: true,
          hasSchool: false,
          hasClinic: false,
          publicFacilities: []
        },
        tourism: {
          isTouristSpot: false,
          attractions: []
        },
        poverty: {
          isPovertyVillage: false,
          reliefPolicies: []
        },
        digitalization: {
          hasWebsite: false,
          hasWechatAccount: false,
          hasApp: false
        },
        emergency: {
          emergencyContacts: [],
          emergencyEquipment: [],
          evacuationRoutes: []
        },
        culture: {
          culturalHeritage: [],
          traditionalCustoms: [],
          famousPeople: []
        },
        specialties: []
      }
    ];

    console.log('🏘️  添加村庄数据...');

    for (const villageData of villagesData) {
      const existing = await Village.findOne({ code: villageData.code });
      if (existing) {
        console.log(`⚠️  村庄 ${villageData.name} 已存在，跳过`);
        continue;
      }

      const village = new Village(villageData);
      await village.save();
      console.log(`✅ 创建村庄: ${villageData.name} (${villageData._id})`);
    }

    console.log('\n🎉 村庄添加完成！');

    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    if (error.errInfo && error.errInfo.details) {
      console.log('验证错误详情:', JSON.stringify(error.errInfo.details, null, 2));
    }
    console.error('❌ 添加失败:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

addNewVillages();
