// 简单的权限系统测试脚本
const DatabaseService = require('../../src/database/databaseService');
const SQLiteDB = require('../../src/database/sqlite');

async function runSimpleTests() {
  console.log('=== 权限系统简单测试 ===\n');

  try {
    // Test 1: Database initialization
    console.log('1. 测试数据库初始化...');
    const sqliteDB = new SQLiteDB();
    await sqliteDB.init();
    console.log('✅ 数据库初始化成功\n');

    // Test 2: Check if tables exist
    console.log('2. 测试表结构...');
    try {
      sqliteDB.get('SELECT * FROM user_roles LIMIT 1');
      sqliteDB.get('SELECT * FROM permission_modules LIMIT 1');
      sqliteDB.get('SELECT * FROM permission_actions LIMIT 1');
      console.log('✅ 所需表结构存在\n');
    } catch (error) {
      console.log('❌ 表结构不完整:', error.message);
      return;
    }

    // Test 3: DatabaseService initialization
    console.log('3. 测试数据库服务初始化...');
    const dbService = new DatabaseService();
    await dbService.init();
    console.log('✅ 数据库服务初始化成功\n');

    // Test 4: Role management
    console.log('4. 测试角色管理...');
    const adminRole = await dbService.createRole({
      roleName: 'simple_test_admin',
      description: '简单测试管理员',
      hierarchyLevel: 1
    });
    console.log('✅ 创建管理员角色:', adminRole);

    const userRole = await dbService.createRole({
      roleName: 'simple_test_user',
      description: '简单测试用户',
      hierarchyLevel: 3
    });
    console.log('✅ 创建用户角色:', userRole);

    const allRoles = await dbService.getAllRoles();
    console.log('✅ 获取所有角色，总数:', allRoles.length);

    // Test 5: Permission templates
    console.log('\n5. 测试权限模板...');
    const template = await dbService.createPermissionTemplate({
      position: '简单测试职位',
      permissions: [
        { module: 'resident_management', actions: ['read', 'update'] },
        { module: 'announcement_management', actions: ['read'] }
      ]
    });
    console.log('✅ 创建权限模板:', template);

    // Test 6: Data sensitivity
    console.log('\n6. 测试数据敏感性...');
    const sensitivityInfo = await dbService.getDataSensitivityInfo('financial_management', 'create');
    console.log('✅ 财务创建操作敏感性信息:', {
      moduleName: sensitivityInfo.moduleName,
      actionName: sensitivityInfo.actionName,
      riskLevel: sensitivityInfo.riskLevel
    });

    const requiresApproval = await dbService.requiresApproval('financial_management', 'create');
    console.log('✅ 财务创建操作需要审批:', requiresApproval);

    // Test 7: Audit logging
    console.log('\n7. 测试审计日志...');
    const logEntry = await dbService.logPermissionActivity({
      operationType: 'data_access',
      operatorId: 1,
      operatorName: '简单测试用户',
      operatorPosition: '简单测试职位',
      targetInfo: { targetType: 'resident', targetId: 123 },
      operationDetails: { module: 'resident_management', action: 'read' },
      ipAddress: '127.0.0.1',
      riskLevel: 'low',
      isAnomalous: false,
      requiresApproval: false,
      isApproved: null,
      approvedBy: null,
      approvalDate: null
    });
    console.log('✅ 创建审计日志:', logEntry);

    // Test 8: Retrieve audit logs
    const logs = await dbService.getPermissionAuditLogs({
      operationType: 'data_access'
    });
    console.log('✅ 检索审计日志，找到记录数:', logs.length);

    // Cleanup
    sqliteDB.close();
    console.log('\n=== 所有测试完成 ===');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

// Run the tests
if (require.main === module) {
  runSimpleTests();
}

module.exports = { runSimpleTests };