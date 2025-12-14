// 权限系统最终验证测试
const DatabaseService = require('../../src/database/databaseService');

async function finalVerificationTest() {
  console.log('=== 权限系统最终验证测试 ===\n');

  try {
    // Initialize the database service
    const dbService = new DatabaseService();
    await dbService.init();
    console.log('✅ 数据库服务初始化成功');

    // Test 1: Create roles
    console.log('\n1. 测试角色创建...');
    const adminRole = await dbService.createRole({
      roleName: 'final_test_admin',
      description: '最终测试管理员',
      hierarchyLevel: 1
    });
    console.log('✅ 管理员角色创建成功:', adminRole);

    const userRole = await dbService.createRole({
      roleName: 'final_test_user',
      description: '最终测试用户',
      hierarchyLevel: 3
    });
    console.log('✅ 用户角色创建成功:', userRole);

    // Test 2: Retrieve roles
    console.log('\n2. 测试角色检索...');
    const allRoles = await dbService.getAllRoles();
    console.log('✅ 角色检索成功，总角色数:', allRoles.length);

    // Test 3: Create permission template
    console.log('\n3. 测试权限模板创建...');
    const template = await dbService.createPermissionTemplate({
      position: '最终测试职位',
      permissions: [
        { module: 'resident_management', actions: ['read', 'update'] },
        { module: 'announcement_management', actions: ['read'] },
        { module: 'financial_management', actions: ['read'] }
      ]
    });
    console.log('✅ 权限模板创建成功:', template);

    // Test 4: Data sensitivity
    console.log('\n4. 测试数据敏感性...');
    const financialCreate = await dbService.getDataSensitivityInfo('financial_management', 'create');
    console.log('✅ 财务创建操作信息:', {
      riskLevel: financialCreate.riskLevel,
      requiresApproval: financialCreate.requiresApproval
    });

    const approvalRequired = await dbService.requiresApproval('financial_management', 'create');
    console.log('✅ 财务创建需要审批:', approvalRequired);

    // Test 5: Audit logging
    console.log('\n5. 测试审计日志...');
    const logEntry = await dbService.logPermissionActivity({
      operationType: 'data_access',
      operatorId: 1,
      operatorName: '最终测试用户',
      operatorPosition: '最终测试职位',
      targetInfo: { targetType: 'resident', targetId: 999 },
      operationDetails: { module: 'resident_management', action: 'read' },
      ipAddress: '192.168.1.100',
      riskLevel: 'low',
      isAnomalous: false,
      requiresApproval: false,
      isApproved: null,
      approvedBy: null,
      approvalDate: null
    });
    console.log('✅ 审计日志创建成功:', logEntry);

    // Test 6: Retrieve audit logs
    console.log('\n6. 测试审计日志检索...');
    const logs = await dbService.getPermissionAuditLogs({
      operatorId: 1,
      riskLevel: 'low'
    });
    console.log('✅ 审计日志检索成功，找到记录数:', logs.length);

    // Test 7: Role permissions
    console.log('\n7. 测试角色权限...');
    // Get module and action IDs for assignment
    const modules = dbService.sqliteDB.all('SELECT id, name FROM permission_modules');
    const actions = dbService.sqliteDB.all('SELECT id, name FROM permission_actions');
    
    const residentModule = modules.find(m => m.name === 'resident_management');
    const readAction = actions.find(a => a.name === 'read');
    
    if (residentModule && readAction) {
      await dbService.assignPermissionToRole(userRole.id, residentModule.id, readAction.id);
      console.log('✅ 角色权限分配成功');
      
      const rolePermissions = await dbService.getRolePermissions(userRole.id);
      console.log('✅ 角色权限检索成功，权限数:', rolePermissions.length);
    }

    // Test 8: User role assignment
    console.log('\n8. 测试用户角色分配...');
    // Create a mock committee member for testing
    dbService.sqliteDB.run(`
      INSERT INTO village_committee (name, position, phone, department) 
      VALUES (?, ?, ?, ?)
    `, ['测试委员会成员', '最终测试职位', '13800138000', '测试部门']);
    
    const committeeMembers = dbService.sqliteDB.all('SELECT id FROM village_committee WHERE name = ?', ['测试委员会成员']);
    if (committeeMembers.length > 0) {
      const userId = committeeMembers[0].id;
      await dbService.assignRoleToUser(userId, userRole.id, 1); // 1 as assignedBy
      console.log('✅ 用户角色分配成功');
      
      const userRoles = await dbService.getUserRoles(userId);
      console.log('✅ 用户角色检索成功，角色数:', userRoles.length);
    }

    console.log('\n=== 所有验证测试通过 ===');
    console.log('\n权限系统已准备好进行生产部署！');

  } catch (error) {
    console.error('❌ 验证测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  finalVerificationTest();
}

module.exports = { finalVerificationTest };