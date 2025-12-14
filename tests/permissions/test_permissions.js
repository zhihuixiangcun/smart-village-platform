// 权限系统测试文件
const DatabaseService = require('../../src/database/databaseService');

async function testPermissions() {
  const dbService = new DatabaseService();
  await dbService.init();
  
  console.log('=== 权限系统测试 ===');
  
  // 1. 创建角色
  console.log('\n1. 创建角色测试');
  const adminRole = await dbService.createRole({
    roleName: 'test_admin',
    description: '测试管理员角色',
    hierarchyLevel: 1
  });
  console.log('创建管理员角色:', adminRole);
  
  const userRole = await dbService.createRole({
    roleName: 'test_user',
    description: '测试用户角色',
    hierarchyLevel: 3
  });
  console.log('创建用户角色:', userRole);
  
  // 2. 获取所有角色
  console.log('\n2. 获取所有角色测试');
  const allRoles = await dbService.getAllRoles();
  console.log('所有角色:', allRoles);
  
  // 3. 创建权限模板
  console.log('\n3. 创建权限模板测试');
  const template = await dbService.createPermissionTemplate({
    position: '测试职位',
    permissions: [
      { module: 'resident_management', actions: ['read', 'update'] },
      { module: 'announcement_management', actions: ['read'] }
    ]
  });
  console.log('创建权限模板:', template);
  
  // 4. 权限检查测试
  console.log('\n4. 权限检查测试');
  // 注意：这里需要一个有效的用户ID来进行测试
  // const permissionCheck = await dbService.hasPermission(1, 'resident_management', 'read');
  // console.log('权限检查结果:', permissionCheck);
  
  // 5. 数据敏感性测试
  console.log('\n5. 数据敏感性测试');
  const sensitivityInfo = await dbService.getDataSensitivityInfo('financial_management', 'create');
  console.log('财务创建操作的敏感性信息:', sensitivityInfo);
  
  const requiresApproval = await dbService.requiresApproval('financial_management', 'create');
  console.log('财务创建操作是否需要审批:', requiresApproval);
  
  // 6. 审计日志测试
  console.log('\n6. 审计日志测试');
  const logEntry = await dbService.logPermissionActivity({
    operationType: 'data_access',
    operatorId: 1,
    operatorName: '测试用户',
    operatorPosition: '测试职位',
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
  console.log('创建审计日志:', logEntry);
  
  console.log('\n=== 权限系统测试完成 ===');
}

// 运行测试
testPermissions().catch(console.error);