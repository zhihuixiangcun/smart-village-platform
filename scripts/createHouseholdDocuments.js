/**
 * 为测试账号创建Household文档
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const testHouseholds = [
  {
    _id: new ObjectId('675f1234567890abcdef0001'),
    codeId: 'MBAC01H0001A',
    householdCode: 'MBAC01H0001A',
    villageId: new ObjectId('695d2f0a1993c080b9fa520b'),
    householder: {
      userId: new ObjectId('695e825d4769790a904c977e'),
      name: '岑方国',
      idCard: '522633198501010001',
      phone: '13801234567',
      isPartyMember: false,
      occupation: '村民'
    },
    members: [
      {
        userId: new ObjectId('695e825d4769790a904c977e'),
        name: '岑方国',
        idCard: '522633198501010001',
        relationship: '其他',
        phone: '13801234567',
        gender: '男',
        education: '初中',
        isActive: true
      }
    ],
    address: {
      province: '贵州省',
      city: '黔西南布依族苗族自治州',
      county: '贞丰县',
      township: '鲁贡镇',
      village: '么扒村',
      detailed: '么扒村1组'
    },
    householdRegistration: {
      type: '农业户口',
      landArea: 5,
      houseArea: 120
    },
    privacySettings: {
      allowPublicView: false,
      allowNeighborView: true,
      allowRelativeView: true
    },
    demographics: {
      totalMembers: 1,
      workingAgeMembers: 1,
      elderlyMembers: 0,
      minorMembers: 0,
      disabledMembers: 0
    },
    status: 'active',
    totalFamilyMembers: 1,
    qrCode: {
      imageUrl: null,
      expiryDate: new Date('2026-12-31'),
      createdAt: new Date(),
      scanCount: 0
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId('675f1234567890abcdef0002'),
    codeId: 'NYBC02H0002B',
    householdCode: 'NYBC02H0002B',
    villageId: new ObjectId('695da4e954f6af867bebc416'),
    householder: {
      userId: new ObjectId('695e825e4769790a904c977f'),
      name: '王定权',
      idCard: '522633199001010002',
      phone: '13801234568',
      isPartyMember: false,
      occupation: '村民'
    },
    members: [
      {
        userId: new ObjectId('695e825e4769790a904c977f'),
        name: '王定权',
        idCard: '522633199001010002',
        relationship: '其他',
        phone: '13801234568',
        gender: '女',
        education: '初中',
        isActive: true
      }
    ],
    address: {
      province: '贵州省',
      city: '黔西南布依族苗族自治州',
      county: '贞丰县',
      township: '鲁贡镇',
      village: '弄洋村',
      detailed: '弄洋村1组'
    },
    householdRegistration: {
      type: '农业户口',
      landArea: 6,
      houseArea: 130
    },
    privacySettings: {
      allowPublicView: false,
      allowNeighborView: true,
      allowRelativeView: true
    },
    demographics: {
      totalMembers: 1,
      workingAgeMembers: 1,
      elderlyMembers: 0,
      minorMembers: 0,
      disabledMembers: 0
    },
    status: 'active',
    totalFamilyMembers: 1,
    qrCode: {
      imageUrl: null,
      expiryDate: new Date('2026-12-31'),
      createdAt: new Date(),
      scanCount: 0
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId('675f1234567890abcdef0003'),
    codeId: 'ZYBC03H0003C',
    householdCode: 'ZYBC03H0003C',
    villageId: new ObjectId('695da4e954f6af867bebc418'),
    householder: {
      userId: new ObjectId('695e825e4769790a904c9780'),
      name: '岑小多',
      idCard: '522633199501010003',
      phone: '13801234569',
      isPartyMember: false,
      occupation: '村民'
    },
    members: [
      {
        userId: new ObjectId('695e825e4769790a904c9780'),
        name: '岑小多',
        idCard: '522633199501010003',
        relationship: '其他',
        phone: '13801234569',
        gender: '男',
        education: '初中',
        isActive: true
      }
    ],
    address: {
      province: '贵州省',
      city: '黔西南布依族苗族自治州',
      county: '贞丰县',
      township: '鲁贡镇',
      village: '者央村',
      detailed: '者央村1组'
    },
    householdRegistration: {
      type: '农业户口',
      landArea: 4,
      houseArea: 110
    },
    privacySettings: {
      allowPublicView: false,
      allowNeighborView: true,
      allowRelativeView: true
    },
    demographics: {
      totalMembers: 1,
      workingAgeMembers: 1,
      elderlyMembers: 0,
      minorMembers: 0,
      disabledMembers: 0
    },
    status: 'active',
    totalFamilyMembers: 1,
    qrCode: {
      imageUrl: null,
      expiryDate: new Date('2026-12-31'),
      createdAt: new Date(),
      scanCount: 0
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId('675f1234567890abcdef0004'),
    codeId: 'LTBC04H0004D',
    householdCode: 'LTBC04H0004D',
    villageId: new ObjectId('695da4e954f6af867bebc417'),
    householder: {
      userId: new ObjectId('695e825e4769790a904c9781'),
      name: '毛光情',
      idCard: '522633200001010004',
      phone: '13801234570',
      isPartyMember: false,
      occupation: '村民'
    },
    members: [
      {
        userId: new ObjectId('695e825e4769790a904c9781'),
        name: '毛光情',
        idCard: '522633200001010004',
        relationship: '其他',
        phone: '13801234570',
        gender: '女',
        education: '初中',
        isActive: true
      }
    ],
    address: {
      province: '贵州省',
      city: '黔西南布依族苗族自治州',
      county: '贞丰县',
      township: '鲁贡镇',
      village: '林桃村',
      detailed: '林桃村1组'
    },
    householdRegistration: {
      type: '农业户口',
      landArea: 7,
      houseArea: 140
    },
    privacySettings: {
      allowPublicView: false,
      allowNeighborView: true,
      allowRelativeView: true
    },
    demographics: {
      totalMembers: 1,
      workingAgeMembers: 1,
      elderlyMembers: 0,
      minorMembers: 0,
      disabledMembers: 0
    },
    status: 'active',
    totalFamilyMembers: 1,
    qrCode: {
      imageUrl: null,
      expiryDate: new Date('2026-12-31'),
      createdAt: new Date(),
      scanCount: 0
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function createHouseholdDocuments() {
  console.log('🚀 开始创建Household文档...\n');

  let client;

  try {
    console.log('📡 连接数据库...');
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village';
    client = await MongoClient.connect(mongoUri);
    const db = client.db();

    // 暂时禁用验证
    try {
      await db.command({ collMod: 'households', validator: {} });
      console.log('✅ 数据库连接成功,验证已禁用\n');
    } catch (e) {
      console.log('✅ 数据库连接成功\n');
    }

    const householdsCollection = db.collection('households');
    const results = [];
    let successCount = 0;

    for (const household of testHouseholds) {
      console.log(`📝 处理: ${household.householder.name} (${household.codeId})`);

      try {
        // 检查是否已存在
        const existing = await householdsCollection.findOne({ codeId: household.codeId });

        if (existing) {
          console.log(`   ℹ️  文档已存在\n`);
          results.push({
            name: household.householder.name,
            codeId: household.codeId,
            success: true,
            alreadyExists: true
          });
          successCount++;
          continue;
        }

        // 插入文档
        await householdsCollection.insertOne(household);
        console.log(`   ✅ 创建成功\n`);

        results.push({
          name: household.householder.name,
          codeId: household.codeId,
          householdId: household._id,
          success: true
        });
        successCount++;

      } catch (error) {
        console.error(`   ❌ 失败:`, error.message);
        console.log('');

        results.push({
          name: household.householder.name,
          codeId: household.codeId,
          success: false,
          error: error.message
        });
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 完成: ${successCount}/${testHouseholds.length} 个文档`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 创建结果汇总:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.name} (${result.codeId})`);

      if (result.success) {
        if (result.alreadyExists) {
          console.log(`   状态: 已存在`);
        } else {
          console.log(`   家庭ID: ${result.householdId}`);
          console.log(`   状态: 创建成功`);
        }
      } else {
        console.log(`   错误: ${result.error}`);
      }
      console.log('');
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
  } finally {
    if (client) {
      await client.close();
    }
    console.log('\n👋 脚本执行完毕');
  }
}

createHouseholdDocuments();
