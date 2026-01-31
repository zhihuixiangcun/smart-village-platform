/**
 * 数据库初始化脚本
 * 用于初始化MongoDB数据库和插入测试数据
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 导入模型
const User = require('../src/models/User');
const Village = require('../src/models/Village');
const Resident = require('../src/models/Resident');
const Announcement = require('../src/models/Announcement');

class DatabaseInitializer {
  constructor() {
    this.uri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village';
  }

  async connect() {
    console.log('🔄 连接数据库...');
    console.log('   URI:', this.uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

    await mongoose.connect(this.uri);

    console.log('✅ 数据库连接成功');
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }

  async clearData() {
    console.log('🗑️  清理现有数据...');
    await User.deleteMany({});
    await Village.deleteMany({});
    await Resident.deleteMany({});
    await Announcement.deleteMany({});
    console.log('✅ 数据清理完成');
  }

  async initVillages() {
    console.log('🏘️  初始化村庄数据...');

    const villagesData = [
      {
        code: 'ZJHSS1V001A',
        name: '绿水村',
        // 地址字段：完整地址字符串（必填）
        address: '浙江省杭州市西湖区双浦镇绿水村',
        // 行政区划信息：顶层字段（必填）
        province: '浙江省',
        city: '杭州市',
        district: '西湖区',
        adcode: '330106001',
        // 地理位置
        location: {
          type: 'Point',
          coordinates: [120.123456, 30.654321]
        },
        // 统计信息：顶层字段（必填）
        population: 1250,
        households: 420,
        area: 15.6,
        // 状态
        isActive: true
      },
      {
        code: 'ZJHSS2V002A',
        name: '青山村',
        address: '浙江省杭州市西湖区双浦镇青山村',
        province: '浙江省',
        city: '杭州市',
        district: '西湖区',
        adcode: '330106002',
        location: {
          type: 'Point',
          coordinates: [120.234567, 30.765432]
        },
        population: 980,
        households: 350,
        area: 12.3,
        isActive: true
      }
    ];

    const createdVillages = [];
    for (const data of villagesData) {
      const village = new Village(data);

      // 验证文档
      const validationError = village.validateSync();
      if (validationError) {
        console.error('❌ Mongoose 验证失败:', data.name);
        console.error('错误详情:', validationError.errors);
        throw validationError;
      }

      try {
        await village.save();
        createdVillages.push(village);
        console.log(`✅ 创建村庄: ${village.name}`);
      } catch (dbError) {
        console.error('❌ MongoDB 验证失败:', data.name);
        if (dbError.errInfo?.details) {
          console.error('验证规则详情:', JSON.stringify(dbError.errInfo.details, null, 2));
        }
        throw dbError;
      }
    }

    console.log(`✅ 总共创建了 ${createdVillages.length} 个村庄`);
    return createdVillages;
  }

  async initUsers(villages) {
    console.log('👤 初始化用户数据...');
    
    // 创建管理员
    const adminData = {
      username: 'admin',
      password: 'admin123', // 将在模型中自动加密
      email: 'admin@smartvillage.com',
      role: 'admin',
      profile: {
        firstName: '系统',
        lastName: '管理员',
        phone: '13800138000'
      },
      status: 'active'
    };

    const admin = new User(adminData);
    await admin.save();

    // 创建村干部
    const cadreData = {
      username: 'cadre01',
      password: 'cadre123',
      email: 'cadre@smartvillage.com',
      role: 'village_admin',
      villageId: villages[0]._id,
      profile: {
        firstName: '张',
        lastName: '书记',
        phone: '13900139000',
        position: '村支书'
      },
      status: 'active'
    };

    const cadre = new User(cadreData);
    await cadre.save();

    // 创建普通村民
    const villagerData = {
      username: 'villager01',
      password: 'villager123',
      email: 'villager@smartvillage.com',
      role: 'resident',
      villageId: villages[0]._id,
      profile: {
        firstName: '李',
        lastName: '村民',
        phone: '13700137000'
      },
      status: 'active'
    };

    const villager = new User(villagerData);
    await villager.save();

    console.log('✅ 创建了 3 个测试用户');
    console.log('   管理员: admin / admin123');
    console.log('   村干部: cadre01 / cadre123');
    console.log('   村民: villager01 / villager123');
  }

  async initAnnouncements(villages) {
    console.log('📢 初始化公告数据...');
    
    const announcements = [
      {
        title: '欢迎来到智慧乡村平台',
        content: '欢迎使用智慧乡村综合服务平台！本平台提供村民管理、村务治理、信息公示、生活服务等功能。',
        category: 'policy',
        priority: 'high',
        villageId: villages[0]._id,
        publisher: '系统管理员',
        status: 'published',
        publishTime: new Date()
      },
      {
        title: '关于开展村庄环境整治的通知',
        content: '为改善村庄环境，提升村民生活质量，村委会决定于本月底开展村庄环境整治活动，请各位村民积极配合。',
        category: 'activity',
        priority: 'normal',
        villageId: villages[0]._id,
        publisher: '张书记',
        status: 'published',
        publishTime: new Date()
      }
    ];

    const created = await Announcement.insertMany(announcements);
    console.log(`✅ 创建了 ${created.length} 条公告`);
  }

  async initialize() {
    try {
      await this.connect();
      
      await this.clearData();
      
      const villages = await this.initVillages();
      await this.initUsers(villages);
      await this.initAnnouncements(villages);
      
      console.log('\n🎉 数据库初始化完成！');
      console.log('==================');
      console.log('测试账号：');
      console.log('管理员 - 用户名: admin, 密码: admin123');
      console.log('村干部 - 用户名: cadre01, 密码: cadre123');
      console.log('村民 - 用户名: villager01, 密码: villager123');
      console.log('==================\n');
      
    } catch (error) {
      console.error('❌ 初始化失败:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const initializer = new DatabaseInitializer();
  initializer.initialize()
    .then(() => {
      console.log('初始化成功完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('初始化失败:', error);
      process.exit(1);
    });
}

module.exports = DatabaseInitializer;
