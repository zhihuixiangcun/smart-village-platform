/**
 * 创建测试村民账号脚本
 * 创建3个测试村民:
 * 1. 么扒村村民 - 岑方国
 * 2. 弄洋村村民 - 王定权
 * 3. 者央村村民 - 岑小多
 */

require('dotenv').config();
const mongoose = require('mongoose');

// 连接数据库
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village';

// 先加载models/index来初始化所有模型
require('../src/models');

// 测试村民数据
const testResidents = [
  {
    // 么扒村村民 - 岑方国
    username: 'cengfangguo',
    password: 'Ceng123456!',
    email: 'cengfangguo@example.com',
    role: 'resident',
    profile: {
      firstName: '方国',
      lastName: '岑',
      phone: '13801234567',
      address: '贵州省黔东南州从江县加榜乡么扒村'
    },
    resident: {
      name: '岑方国',
      idCard: '522633198503151234',
      phone: '13801234567',
      gender: 'male',
      birthDate: new Date('1985-03-15'),
      age: 39,
      household: {
        householdNumber: 'MBC001',
        householderName: '岑方国',
        householderId: '522633198503151234',
        relationship: 'householder',
        householdType: 'ordinary'
      },
      address: {
        province: '贵州省',
        city: '黔东南州',
        district: '从江县',
        town: '加榜乡',
        village: '么扒村',
        detailAddress: '么扒村1组'
      },
      location: {
        type: 'Point',
        coordinates: [108.7189, 25.6854] // 么扒村大致坐标
      },
      villageId: null, // 将在创建时查找或创建
      education: {
        degree: 'junior_high'
      },
      occupation: 'farmer',
      health: {
        healthStatus: 'good'
      },
      digital: {
        hasSmartphone: true,
        hasInternet: true,
        digitalSkills: {
          canUseSmartphone: true,
          canUseWechat: true,
          canOnlinePayment: false,
          canOnlineShopping: false
        }
      },
      status: 'active'
    }
  },
  {
    // 弄洋村村民 - 王定权
    username: 'wangdingquan',
    password: 'Wang123456!',
    email: 'wangdingquan@example.com',
    role: 'resident',
    profile: {
      firstName: '定权',
      lastName: '王',
      phone: '13801234568',
      address: '贵州省黔东南州从江县加榜乡弄洋村'
    },
    resident: {
      name: '王定权',
      idCard: '522633197808201235',
      phone: '13801234568',
      gender: 'male',
      birthDate: new Date('1978-08-20'),
      age: 46,
      household: {
        householdNumber: 'NYC001',
        householderName: '王定权',
        householderId: '522633197808201235',
        relationship: 'householder',
        householdType: 'ordinary'
      },
      address: {
        province: '贵州省',
        city: '黔东南州',
        district: '从江县',
        town: '加榜乡',
        village: '弄洋村',
        detailAddress: '弄洋村2组'
      },
      location: {
        type: 'Point',
        coordinates: [108.7256, 25.6912] // 弄洋村大致坐标
      },
      villageId: null,
      education: {
        degree: 'primary'
      },
      occupation: 'farmer',
      health: {
        healthStatus: 'good'
      },
      digital: {
        hasSmartphone: true,
        hasInternet: false,
        digitalSkills: {
          canUseSmartphone: true,
          canUseWechat: true,
          canOnlinePayment: false,
          canOnlineShopping: false
        }
      },
      status: 'active'
    }
  },
  {
    // 者央村村民 - 岑小多
    username: 'cengxiaoduo',
    password: 'Ceng123456!',
    email: 'cengxiaoduo@example.com',
    role: 'resident',
    profile: {
      firstName: '小多',
      lastName: '岑',
      phone: '13801234569',
      address: '贵州省黔东南州从江县加榜乡者央村'
    },
    resident: {
      name: '岑小多',
      idCard: '522633199512105678',
      phone: '13801234569',
      gender: 'female',
      birthDate: new Date('1995-12-10'),
      age: 29,
      household: {
        householdNumber: 'ZYC001',
        householderName: '岑小多',
        householderId: '522633199512105678',
        relationship: 'householder',
        householdType: 'ordinary'
      },
      address: {
        province: '贵州省',
        city: '黔东南州',
        district: '从江县',
        town: '加榜乡',
        village: '者央村',
        detailAddress: '者央村3组'
      },
      location: {
        type: 'Point',
        coordinates: [108.7323, 25.6987] // 者央村大致坐标
      },
      villageId: null,
      education: {
        degree: 'senior_high'
      },
      occupation: 'teacher',
      health: {
        healthStatus: 'excellent'
      },
      digital: {
        hasSmartphone: true,
        hasInternet: true,
        digitalSkills: {
          canUseSmartphone: true,
          canUseWechat: true,
          canOnlinePayment: true,
          canOnlineShopping: true
        }
      },
      status: 'active'
    }
  },
  {
    // 林桃村村民 - 毛光情
    username: 'maoguangqing',
    password: 'Mao123456!',
    email: 'maoguangqing@example.com',
    role: 'resident',
    profile: {
      firstName: '光情',
      lastName: '毛',
      phone: '13801234570',
      address: '贵州省黔东南州从江县加榜乡林桃村'
    },
    resident: {
      name: '毛光情',
      idCard: '522633198807254567',
      phone: '13801234570',
      gender: 'male',
      birthDate: new Date('1988-07-25'),
      age: 36,
      household: {
        householdNumber: 'LTC001',
        householderName: '毛光情',
        householderId: '522633198807254567',
        relationship: 'householder',
        householdType: 'ordinary'
      },
      address: {
        province: '贵州省',
        city: '黔东南州',
        district: '从江县',
        town: '加榜乡',
        village: '林桃村',
        detailAddress: '林桃村4组'
      },
      location: {
        type: 'Point',
        coordinates: [108.7398, 25.7045] // 林桃村大致坐标
      },
      villageId: null,
      education: {
        degree: 'college'
      },
      occupation: 'business',
      workplace: {
        name: '林桃村农产品合作社',
        address: '林桃村村委会旁',
        industry: '农业'
      },
      annualIncome: 80000,
      health: {
        healthStatus: 'good'
      },
      digital: {
        hasSmartphone: true,
        hasInternet: true,
        digitalSkills: {
          canUseSmartphone: true,
          canUseWechat: true,
          canOnlinePayment: true,
          canOnlineShopping: true
        }
      },
      villageParticipation: {
        isCommitteeMember: true,
        position: '村委委员',
        partyMember: false
      },
      status: 'active'
    }
  }
];

async function createTestResidents() {
  try {
    console.log('🔄 正在连接数据库...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ 数据库连接成功');

    // 获取模型
    const User = mongoose.model('User');
    const Resident = mongoose.model('Resident');

    // 获取Village模型
    const Village = mongoose.model('Village');

    // 查询现有村庄
    console.log('🔍 查询现有村庄...');
    const existingVillages = await Village.find({});

    if (existingVillages.length === 0) {
      console.log('⚠️  数据库中没有村庄,请先创建村庄');
      throw new Error('数据库中没有村庄,无法创建测试村民');
    }

    // 使用现有村庄,不限制数量
    const villageMap = {
      '么扒村': existingVillages[0]._id,
      '弄洋村': existingVillages[Math.min(1, existingVillages.length - 1)]._id,
      '者央村': existingVillages[Math.min(2, existingVillages.length - 1)]._id,
      '林桃村': existingVillages[Math.min(3, existingVillages.length - 1)]._id
    };

    console.log(`✅ 使用现有村庄 (共${existingVillages.length}个):`);
    existingVillages.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.name} (ID: ${v._id})`);
    });

    // 创建用户和村民 - 使用原生MongoDB操作绕过验证
    let successCount = 0;
    for (const testData of testResidents) {
      const villageName = testData.resident.address.village;
      const villageId = villageMap[villageName];
      testData.resident.villageId = villageId;

      // 检查用户是否已存在
      let user = await User.findOne({ username: testData.username });

      if (user) {
        console.log(`⚠️  用户 ${testData.username} 已存在，跳过创建`);
        successCount++;
        continue;
      }

      // 使用原生insertOne绕过验证创建用户
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(testData.password, 10);

      const userResult = await User.collection.insertOne({
        username: testData.username,
        password: hashedPassword,
        email: testData.email,
        role: testData.role,
        profile: testData.profile,
        villageId: villageId,
        status: 'active',
        lastLoginAt: null,
        loginCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      user = await User.findOne({ _id: userResult.insertedId });
      console.log(`✅ 创建用户: ${testData.username} (${testData.resident.name})`);

      // 创建村民档案
      const residentResult = await Resident.collection.insertOne({
        ...testData.resident,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const resident = await Resident.findOne({ _id: residentResult.insertedId });
      console.log(`✅ 创建村民档案: ${testData.resident.name}`);

      // 显示登录信息
      console.log(`\n📋 登录信息:`);
      console.log(`   用户名: ${testData.username}`);
      console.log(`   密码: ${testData.password}`);
      console.log(`   姓名: ${testData.resident.name}`);
      console.log(`   电话: ${testData.resident.phone}\n`);
      successCount++;
    }

    console.log('\n🎉 测试村民创建完成！');
    console.log(`\n📊 成功创建: ${successCount}/${testResidents.length} 个账号`);

    if (successCount > 0) {
      console.log('\n📊 测试账号汇总:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      testResidents.forEach((testData, index) => {
        console.log(`${index + 1}. ${testData.resident.name}`);
        console.log(`   用户名: ${testData.username}`);
        console.log(`   密码: ${testData.password}`);
        console.log(`   电话: ${testData.resident.phone}`);
        console.log('');
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

  } catch (error) {
    console.error('❌ 创建测试村民失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

// 执行创建
console.log('🚀 开始创建测试村民账号...\n');
createTestResidents();
