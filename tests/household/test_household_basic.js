// 家庭档案基础功能测试
const DatabaseService = require('../../src/database/databaseService');
const HouseholdArchive = require('../../src/models/HouseholdArchive');
const FamilyRelationship = require('../../src/models/FamilyRelationship');
const ArchiveChangeLog = require('../../src/models/ArchiveChangeLog');
const QRCodeGenerator = require('../../src/utils/QRCodeGenerator');

async function testHouseholdBasic() {
  console.log('=== 家庭档案基础功能测试 ===\n');

  try {
    // 初始化数据库服务
    console.log('1. 初始化数据库服务...');
    const dbService = new DatabaseService();
    await dbService.init();
    console.log('✅ 数据库服务初始化成功\n');

    // 创建模型实例
    const householdArchive = new HouseholdArchive(dbService);
    const familyRelationship = new FamilyRelationship(dbService);
    const archiveChangeLog = new ArchiveChangeLog(dbService);
    const qrGenerator = new QRCodeGenerator('test_secret_key');

    // 测试1: 创建家庭档案
    console.log('2. 测试创建家庭档案...');
    const householdData = {
      householdId: 'HH20250909001',
      familyHeadId: 'USER001',
      familyHeadName: '张三',
      address: '北京市朝阳区测试街道101号',
      familyMembersCount: 3
    };

    const householdResult = await householdArchive.createHousehold(householdData);
    console.log('✅ 家庭档案创建成功:', householdResult);

    // 测试2: 获取家庭档案
    console.log('\n3. 测试获取家庭档案...');
    const retrievedHousehold = await householdArchive.getHouseholdByHouseholdId('HH20250909001');
    console.log('✅ 家庭档案获取成功:', {
      id: retrievedHousehold.id,
      householdId: retrievedHousehold.householdId,
      familyHeadName: retrievedHousehold.familyHeadName,
      address: retrievedHousehold.address
    });

    // 测试3: 更新家庭档案
    console.log('\n4. 测试更新家庭档案...');
    await householdArchive.updateHousehold('HH20250909001', {
      familyHeadId: 'USER001',
      familyHeadName: '张三丰',
      address: '北京市朝阳区测试街道101号 更新地址',
      familyMembersCount: 4,
      isActive: 1
    });
    
    const updatedHousehold = await householdArchive.getHouseholdByHouseholdId('HH20250909001');
    console.log('✅ 家庭档案更新成功:', {
      familyHeadName: updatedHousehold.familyHeadName,
      familyMembersCount: updatedHousehold.familyMembersCount,
      address: updatedHousehold.address
    });

    // 测试4: 添加家庭成员
    console.log('\n5. 测试添加家庭成员...');
    const members = [
      {
        householdId: 'HH20250909001',
        memberId: 'USER001',
        memberName: '张三丰',
        relationship: '户主',
        isMainContact: true
      },
      {
        householdId: 'HH20250909001',
        memberId: 'USER002',
        memberName: '李四',
        relationship: '配偶',
        isMainContact: false
      },
      {
        householdId: 'HH20250909001',
        memberId: 'USER003',
        memberName: '张小明',
        relationship: '子女',
        isMainContact: false
      }
    ];

    for (const member of members) {
      const result = await familyRelationship.addFamilyMember(member);
      console.log(`✅ 家庭成员添加成功 (${member.memberName}):`, result);
    }

    // 测试5: 获取家庭成员
    console.log('\n6. 测试获取家庭成员...');
    const familyMembers = await familyRelationship.getFamilyMembersByHouseholdId('HH20250909001');
    console.log('✅ 家庭成员获取成功，成员数量:', familyMembers.length);
    familyMembers.forEach(member => {
      console.log(`   - ${member.memberName} (${member.relationship})`);
    });

    // 测试6: 二维码生成
    console.log('\n7. 测试二维码生成...');
    const qrContent = qrGenerator.generateQRContent('HH20250909001');
    console.log('✅ 二维码内容生成成功，长度:', qrContent.length);

    // 更新家庭档案的二维码信息
    await householdArchive.updateQRCode('HH20250909001', qrContent, './qr_codes/HH20250909001.png');
    const householdWithQR = await householdArchive.getHouseholdByHouseholdId('HH20250909001');
    console.log('✅ 二维码信息更新成功:', {
      hasQRCode: !!householdWithQR.qrCode,
      qrCodeImage: householdWithQR.qrCodeImage
    });

    // 测试7: 二维码验证
    console.log('\n8. 测试二维码验证...');
    const verificationResult = qrGenerator.verifyQRContent(qrContent);
    console.log('✅ 二维码验证结果:', verificationResult);

    // 测试8: 档案变更日志
    console.log('\n9. 测试档案变更日志...');
    const changeLogData = {
      householdId: 'HH20250909001',
      changerId: 'ADMIN001',
      changerName: '管理员',
      changeType: '档案更新',
      changeDetails: '更新家庭成员信息',
      oldValue: { familyMembersCount: 3 },
      newValue: { familyMembersCount: 4 },
      ipAddress: '192.168.1.100'
    };

    const logResult = await archiveChangeLog.logChange(changeLogData);
    console.log('✅ 变更日志记录成功:', logResult);

    // 测试9: 获取变更历史
    console.log('\n10. 测试获取变更历史...');
    const changeHistory = await archiveChangeLog.getChangeHistoryByHouseholdId('HH20250909001');
    console.log('✅ 变更历史获取成功，记录数量:', changeHistory.length);

    // 测试10: 获取所有活跃家庭档案
    console.log('\n11. 测试获取所有活跃家庭档案...');
    const allHouseholds = await householdArchive.getAllActiveHouseholds();
    console.log('✅ 所有活跃家庭档案获取成功，数量:', allHouseholds.length);

    console.log('\n=== 所有基础功能测试通过 ===');
    console.log('\n家庭档案系统基础功能已准备就绪！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 直接运行测试
if (require.main === module) {
  testHouseholdBasic();
}

module.exports = { testHouseholdBasic };