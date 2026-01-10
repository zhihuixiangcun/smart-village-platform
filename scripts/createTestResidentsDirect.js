/**
 * 直接通过Mongoose模型创建测试村民账号
 * 绕过JSON Schema验证，使用模型的save()方法
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Resident = require('../src/models/Resident');
const Village = require('../src/models/Village');

// 测试村民数据
const testResidents = [
  {
    username: 'cengfangguo',
    password: 'Ceng@123456',
    name: '岑方国',
    phone: '13801234567',
    idCard: '522633198503151234',
    villageName: '么扒村',
    gender: 'male',
    birthDate: new Date('1985-03-15')
  },
  {
    username: 'wangdingquan',
    password: 'Wang@123456',
    name: '王定权',
    phone: '13801234568',
    idCard: '522633197808201235',
    villageName: '弄洋村',
    gender: 'male',
    birthDate: new Date('1978-08-20')
  },
  {
    username: 'cengxiaoduo',
    password: 'Ceng@123456',
    name: '岑小多',
    phone: '13801234569',
    idCard: '522633199512105678',
    villageName: '者央村',
    gender: 'female',
    birthDate: new Date('1995-12-10')
  },
  {
    username: 'maoguangqing',
    password: 'Mao@123456',
    name: '毛光情',
    phone: '13801234570',
    idCard: '522633198807254567',
    villageName: '林桃村',
    gender: 'female',
    birthDate: new Date('1988-07-25')
  }
];

/**
 * 计算年龄
 */
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * 创建测试用户和村民档案
 */
async function createTestResident(residentData) {
  try {
    console.log(`📝 正在创建: ${residentData.name} (${residentData.username})`);

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username: residentData.username });
    if (existingUser) {
      console.log(`   ⚠️  用户名已存在: ${residentData.username}`);
      return { success: true, exists: true, message: '用户名已存在' };
    }

    // 检查手机号是否已存在
    const existingPhone = await User.findOne({ 'profile.phone': residentData.phone });
    if (existingPhone) {
      console.log(`   ⚠️  手机号已注册: ${residentData.phone}`);
      return { success: true, exists: true, message: '手机号已注册' };
    }

    // 查找或创建村庄
    let village = await Village.findOne({ name: residentData.villageName });

    if (!village) {
      // 如果村庄不存在，创建一个
      village = new Village({
        name: residentData.villageName,
        code: residentData.villageName,
        address: `${residentData.villageName}地址`,
        province: '贵州省',
        city: '黔东南苗族侗族自治州',
        district: '从江县',
        adcode: '522633', // 从江县的行政区划代码
        population: 100,
        households: 50,
        area: 10,
        location: {
          type: 'Point',
          coordinates: [108.9, 25.5]
        },
        status: 'active'
      });
      await village.save();
      console.log(`   ✅ 创建村庄: ${residentData.villageName} (ID: ${village._id})`);
    } else {
      console.log(`   ✅ 找到村庄: ${residentData.villageName} (ID: ${village._id})`);
    }

    // 创建用户账号
    const user = new User({
      username: residentData.username,
      password: residentData.password, // User模型会自动加密
      email: `${residentData.phone}@smart-village.temp`,
      role: 'resident',
      profile: {
        firstName: residentData.name,
        lastName: '',
        phone: residentData.phone
      },
      villageId: village._id,
      status: 'active'
    });

    await user.save();
    console.log(`   ✅ 用户账号创建成功: ${user.username} (ID: ${user._id})`);

    // 创建村民档案
    const age = calculateAge(residentData.birthDate);
    const resident = new Resident({
      name: residentData.name,
      idCard: residentData.idCard,
      phone: residentData.phone,
      gender: residentData.gender,
      birthDate: residentData.birthDate,
      age: age,
      villageId: village._id,
      household: {
        householdNumber: `${residentData.villageName}-${residentData.idCard.slice(-6)}`,
        relationship: 'householder',
        householdType: 'ordinary'
      },
      address: {
        province: '贵州省',
        city: '黔东南苗族侗族自治州',
        district: '从江县',
        village: residentData.villageName,
        detailAddress: `${residentData.villageName}1组`
      },
      location: {
        type: 'Point',
        coordinates: [108.9 + Math.random() * 0.1, 25.5 + Math.random() * 0.1] // 随机坐标
      },
      status: 'active'
    });

    await resident.save();
    console.log(`   ✅ 村民档案创建成功: ${resident.name} (ID: ${resident._id})`);

    return {
      success: true,
      data: {
        userId: user._id,
        residentId: resident._id,
        villageId: village._id,
        username: user.username,
        name: resident.name
      }
    };

  } catch (error) {
    console.error(`   ❌ 创建失败:`, error.message);
    console.error(`   详细错误:`, error);

    // 检查是否是唯一键冲突
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return { success: true, exists: true, message: `${field} 已存在` };
    }

    return { success: false, error: error.message, details: error };
  }
}

/**
 * 主函数
 */
async function createTestResidents() {
  console.log('🚀 开始创建测试村民账号...\n');

  try {
    // 连接数据库
    console.log('📡 连接数据库...');
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village';
    await mongoose.connect(mongoUri);
    console.log('✅ 数据库连接成功\n');

    const results = [];
    let successCount = 0;

    // 逐个创建
    for (const resident of testResidents) {
      const result = await createTestResident(resident);
      results.push({ ...resident, result });

      if (result.success || result.exists) {
        successCount++;
      }

      console.log(''); // 空行分隔
      await new Promise(resolve => setTimeout(resolve, 200)); // 延迟200ms
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 创建完成: ${successCount}/${testResidents.length} 个账号`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 测试账号汇总:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    testResidents.forEach((resident, index) => {
      const result = results[index];
      const status = result.success ? '✅' : result.exists ? '⚠️' : '❌';

      console.log(`${index + 1}. ${status} ${resident.name}`);
      console.log(`   用户名: ${resident.username}`);
      console.log(`   密码: ${resident.password}`);
      console.log(`   电话: ${resident.phone}`);
      console.log(`   身份证: ${resident.idCard}`);
      console.log(`   村庄: ${resident.villageName}`);

      if (result.exists) {
        console.log(`   状态: 账号已存在`);
      } else if (!result.success) {
        console.log(`   状态: ${result.error || '创建失败'}`);
      } else {
        console.log(`   用户ID: ${result.data.userId}`);
        console.log(`   村民ID: ${result.data.residentId}`);
        console.log(`   村庄ID: ${result.data.villageId}`);
      }
      console.log('');
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 保存结果
    const fs = require('fs');
    const resultPath = './test-residents-results.json';
    fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
    console.log(`💾 结果已保存到: ${resultPath}`);

  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 脚本执行完毕');
  }
}

// 执行
createTestResidents();
