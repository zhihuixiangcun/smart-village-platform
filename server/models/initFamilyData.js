/**
 * Initialize Family Data
 * 家庭数据初始化脚本
 *
 * 用于创建示例家庭数据和成员数据
 */

const mongoose = require('mongoose');
const Family = require('./Family');
const FamilyMember = require('./FamilyMember');
const Village = require('./Village');
const crypto = require('crypto');

/**
 * 生成示例家庭数据
 */
async function generateSampleFamilies(villageId, count = 10) {
  const families = [];
  const houseNumbers = ['A栋', 'B栋', 'C栋', 'D栋', 'E栋', 'F栋', 'G栋', 'H栋', 'I栋', 'J栋'];

  const familyTypes = [
    ['一般家庭'],
    ['低保户'],
    ['残疾人家庭'],
    ['独居老人家庭'],
    ['空巢家庭'],
    ['独生子女家庭'],
    ['模范家庭'],
    ['创业家庭']
  ];

  const surnames = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
  const names = ['明', '伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰'];

  for (let i = 0; i < count; i++) {
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const name = surname + names[Math.floor(Math.random() * names.length)];
    const houseNumber = `${houseNumbers[i % houseNumbers.length]}${Math.floor(i / 10) + 1}01`;

    // 随机选择家庭类型
    const selectedTypes = familyTypes[Math.floor(Math.random() * familyTypes.length)];

    // 生成二维码
    const qrCode = crypto.randomUUID();

    const family = new Family({
      villageId,
      houseNumber,
      headOfHousehold: {
        name,
        idCard: generateIdCard(),
        phone: generatePhone(),
        memberId: null // 将在创建成员后更新
      },
      address: {
        province: '浙江省',
        city: '杭州市',
        district: '余杭区',
        town: '瓶窑镇',
        village: '某某村',
        detail: `${houseNumber}${Math.floor(i / 10) + 1}01室`
      },
      memberCount: Math.floor(Math.random() * 5) + 1,
      memberCountInVillage: Math.floor(Math.random() * 5) + 1,
      familyTypes: selectedTypes,
      housing: {
        type: '自建房',
        area: Math.floor(Math.random() * 200) + 80,
        usableArea: Math.floor(Math.random() * 180) + 70,
        buildYear: 1980 + Math.floor(Math.random() * 44),
        structure: '砖混结构',
        floors: Math.floor(Math.random() * 4) + 1,
        isDangerous: Math.random() < 0.1, // 10%概率是危房
        dangerLevel: Math.random() < 0.1 ? Math.floor(Math.random() * 4) + 1 : null
      },
      land: {
        cultivatedArea: Math.random() * 10,
        forestArea: Math.random() * 5,
        homesteadArea: Math.floor(Math.random() * 200) + 80
      },
      economicStatus: {
        annualIncome: Math.floor(Math.random() * 20),
        incomeSource: ['务农', '务工', '经商', '其他'][Math.floor(Math.random() * 4)],
        hasLowIncomeSupport: selectedTypes.includes('低保户'),
        lowIncomeCertificate: selectedTypes.includes('低保户') ? `低保证${houseNumber}` : '',
        hasDebt: Math.random() < 0.2,
        debtAmount: Math.random() < 0.2 ? Math.floor(Math.random() * 10) : 0
      },
      qrCode: {
        code: qrCode,
        imageUrl: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
        generatedAt: new Date(),
        expiresAt: null,
        status: 'ACTIVE',
        printCount: 0,
        lastPrintedAt: null
      },
      tags: [],
      specialFlags: {
        needsRegularVisit: selectedTypes.includes('独居老人家庭') || selectedTypes.includes('低保户'),
        visitFrequency: selectedTypes.includes('独居老人家庭') ? 7 : 30,
        priorityHelp: selectedTypes.includes('低保户') || selectedTypes.includes('残疾人家庭'),
        helpPriority: calculateHelpPriority(selectedTypes),
        riskLevel: calculateRiskLevel(selectedTypes)
      },
      remarks: `示例家庭数据 - ${houseNumber}`
    });

    families.push(family);
  }

  return families;
}

/**
 * 生成示例家庭成员
 */
async function generateSampleMembers(familyId, headOfHousehold) {
  const members = [];
  const relationships = ['配偶', '儿子', '女儿', '父亲', '母亲', '孙子', '孙女'];

  // 创建户主
  const headMember = new FamilyMember({
    familyId,
    name: headOfHousehold.name,
    idCard: headOfHousehold.idCard,
    gender: Math.random() < 0.5 ? '男' : '女',
    birthDate: new Date(1960 + Math.floor(Math.random() * 40), 0, 1),
    relationship: '户主',
    isHead: true,
    phone: headOfHousehold.phone,
    education: ['初中', '高中', '本科'][Math.floor(Math.random() * 3)],
    occupation: '农民',
    maritalStatus: '已婚',
    politicalStatus: Math.random() < 0.3 ? '党员' : '群众',
    healthStatus: ['健康', '良好', '一般'][Math.floor(Math.random() * 3)],
    specialTags: [],
    residenceStatus: '在本村居住',
    isInVillage: true,
    authentication: {
      status: 'NOT_REGISTERED'
    }
  });

  members.push(headMember);

  // 添加其他家庭成员
  const memberCount = Math.floor(Math.random() * 4);
  for (let i = 0; i < memberCount; i++) {
    const relationship = relationships[i % relationships.length];
    const gender = (relationship === '妻子' || relationship === '女儿' || relationship === '母亲' || relationship === '孙女') ? '女' : '男';

    let birthYear = 1990;
    if (['父亲', '母亲'].includes(relationship)) {
      birthYear = 1940 + Math.floor(Math.random() * 20);
    } else if (['配偶'].includes(relationship)) {
      birthYear = 1960 + Math.floor(Math.random() * 10);
    } else if (['儿子', '女儿'].includes(relationship)) {
      birthYear = 1985 + Math.floor(Math.random() * 20);
    } else {
      birthYear = 2010 + Math.floor(Math.random() * 10);
    }

    const specialTags = [];
    if (birthYear <= 1960) {
      specialTags.push('独居老人');
    }
    if (Math.random() < 0.1) {
      specialTags.push('残疾人');
    }

    const member = new FamilyMember({
      familyId,
      name: generateName(),
      idCard: generateIdCard(),
      gender,
      birthDate: new Date(birthYear, 0, 1),
      relationship,
      isHead: false,
      phone: generatePhone(),
      education: ['未上学', '小学', '初中', '高中', '本科'][Math.floor(Math.random() * 5)],
      occupation: relationship === '儿子' || relationship === '女儿' ? '务工' : '务农',
      maritalStatus: relationship === '配偶' ? '已婚' : '未婚',
      politicalStatus: '群众',
      healthStatus: '健康',
      specialTags,
      residenceStatus: Math.random() < 0.8 ? '在本村居住' : '在外地居住',
      isInVillage: Math.random() < 0.8,
      authentication: {
        status: 'NOT_REGISTERED'
      }
    });

    members.push(member);
  }

  return members;
}

/**
 * 初始化示例数据
 */
async function initSampleData(villageName = '示例村庄', familyCount = 10) {
  try {
    console.log('开始初始化家庭数据...');

    // 查找或创建村庄
    let village = await Village.findOne({ name: villageName });
    if (!village) {
      village = new Village({
        name: villageName,
        district: '余杭区',
        town: '瓶窑镇',
        address: '浙江省杭州市余杭区瓶窑镇',
        population: 0,
        householdCount: 0
      });
      await village.save();
      console.log(`✓ 创建村庄: ${villageName}`);
    }

    // 检查是否已有数据
    const existingCount = await Family.countDocuments({ villageId: village._id });
    if (existingCount > 0) {
      console.log(`⚠ 该村庄已有 ${existingCount} 户家庭数据，跳过初始化`);
      return;
    }

    // 生成家庭数据
    console.log(`正在生成 ${familyCount} 户家庭...`);
    const families = await generateSampleFamilies(village._id, familyCount);

    // 保存家庭和成员
    for (const family of families) {
      await family.save();

      // 创建家庭成员
      const members = await generateSampleMembers(family._id, family.headOfHousehold);

      for (const member of members) {
        await member.save();

        // 如果是户主，更新家庭的户主成员ID
        if (member.isHead) {
          family.headOfHousehold.memberId = member._id;
          await family.save();
        }
      }

      console.log(`✓ 创建家庭: ${family.houseNumber} - ${family.headOfHousehold.name}`);
    }

    console.log(`\n数据初始化完成!`);
    console.log(`- 村庄: ${villageName}`);
    console.log(`- 家庭数: ${families.length}`);
    console.log(`- 成员总数: ${await FamilyMember.countDocuments({ familyId: { $in: families.map(f => f._id) } })}`);

    return families;
  } catch (error) {
    console.error('初始化数据失败:', error);
    throw error;
  }
}

/**
 * 清空示例数据
 */
async function clearSampleData(villageName = '示例村庄') {
  try {
    console.log('开始清空家庭数据...');

    const village = await Village.findOne({ name: villageName });
    if (!village) {
      console.log(`⚠ 未找到村庄: ${villageName}`);
      return;
    }

    // 删除家庭成员
    const deleteMembersResult = await FamilyMember.deleteMany({
      familyId: { $in: await Family.find({ villageId: village._id }).distinct('_id') }
    });
    console.log(`✓ 删除 ${deleteMembersResult.deletedCount} 个家庭成员`);

    // 删除家庭
    const deleteFamiliesResult = await Family.deleteMany({ villageId: village._id });
    console.log(`✓ 删除 ${deleteFamiliesResult.deletedCount} 个家庭`);

    console.log('数据清空完成!');
  } catch (error) {
    console.error('清空数据失败:', error);
    throw error;
  }
}

// 辅助函数
function generateIdCard() {
  const area = '330110'; // 杭州市余杭区
  const birth = '19800101';
  const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const idCard = area + birth + sequence + '1'; // 简化版，未计算校验码
  return idCard;
}

function generatePhone() {
  const prefixes = ['138', '139', '150', '151', '186', '187', '188'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + suffix;
}

function generateName() {
  const surnames = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
  const names = ['明', '伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰'];
  return surnames[Math.floor(Math.random() * surnames.length)] + names[Math.floor(Math.random() * names.length)];
}

function calculateHelpPriority(familyTypes) {
  let priority = 1;
  if (familyTypes.includes('低保户')) priority += 3;
  if (familyTypes.includes('残疾人家庭')) priority += 2;
  if (familyTypes.includes('独居老人家庭')) priority += 2;
  return Math.min(priority, 10);
}

function calculateRiskLevel(familyTypes) {
  if (familyTypes.includes('低保户') || familyTypes.includes('残疾人家庭')) {
    return '中';
  }
  if (familyTypes.includes('独居老人家庭')) {
    return '高';
  }
  return '低';
}

// 如果直接运行此脚本
if (require.main === module) {
  require('dotenv').config();

  const args = process.argv.slice(2);
  const command = args[0] || 'init';
  const villageName = args[1] || '示例村庄';
  const count = parseInt(args[2]) || 10;

  mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(async () => {
    console.log('✓ 数据库连接成功');

    try {
      switch (command) {
        case 'init':
          await initSampleData(villageName, count);
          break;
        case 'clear':
          await clearSampleData(villageName);
          break;
        default:
          console.log('用法: node initFamilyData.js [init|clear] [村庄名称] [家庭数量]');
          console.log('示例: node initFamilyData.js init 示例村庄 10');
      }
    } catch (error) {
      console.error('执行失败:', error);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      console.log('数据库连接已关闭');
    }
  }).catch(error => {
    console.error('数据库连接失败:', error);
    process.exit(1);
  });
}

module.exports = {
  initSampleData,
  clearSampleData,
  generateSampleFamilies,
  generateSampleMembers
};
