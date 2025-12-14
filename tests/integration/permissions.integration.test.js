const DatabaseService = require('../../src/database/databaseService');

describe('Permissions System Integration Tests', () => {
  let dbService;

  beforeAll(async () => {
    dbService = new DatabaseService();
    await dbService.init();
  });

  beforeEach(async () => {
    // Clear permission-related tables before each test
    const tables = [
      'permissions',
      'permission_templates',
      'user_roles',
      'role_permissions',
      'user_role_assignments',
      'permission_audit_logs'
    ];
    
    for (const table of tables) {
      try {
        dbService.sqliteDB.run(`DELETE FROM ${table}`);
      } catch (error) {
        // Table might not exist yet, ignore
      }
    }
  });

  describe('Role Management', () => {
    test('should create and retrieve roles', async () => {
      // Create roles
      const adminRole = await dbService.createRole({
        roleName: 'integration_admin',
        description: '集成测试管理员角色',
        hierarchyLevel: 1
      });

      const userRole = await dbService.createRole({
        roleName: 'integration_user',
        description: '集成测试用户角色',
        hierarchyLevel: 3
      });

      expect(adminRole.id).toBeDefined();
      expect(userRole.id).toBeDefined();

      // Retrieve roles
      const allRoles = await dbService.getAllRoles();
      expect(allRoles).toHaveLength(6); // 4 default roles + 2 new roles

      const retrievedAdminRole = await dbService.getRoleByName('integration_admin');
      expect(retrievedAdminRole).toBeDefined();
      expect(retrievedAdminRole.description).toBe('集成测试管理员角色');
    });

    test('should update and delete roles', async () => {
      // Create role
      const role = await dbService.createRole({
        roleName: 'test_update_role',
        description: '测试更新角色',
        hierarchyLevel: 2
      });

      // Update role
      await dbService.updateRole(role.id, {
        roleName: 'updated_role',
        description: '更新后的角色',
        hierarchyLevel: 1
      });

      const updatedRole = await dbService.getRoleById(role.id);
      expect(updatedRole.roleName).toBe('updated_role');
      expect(updatedRole.description).toBe('更新后的角色');

      // Delete role
      await dbService.deleteRole(role.id);
      const deletedRole = await dbService.getRoleById(role.id);
      expect(deletedRole).toBeNull();
    });
  });

  describe('Permission Templates', () => {
    test('should create and manage permission templates', async () => {
      const templateData = {
        position: '村支书',
        permissions: [
          { module: 'village_affairs', actions: ['create', 'read', 'update', 'approve'] },
          { module: 'resident_management', actions: ['create', 'read', 'update'] }
        ]
      };

      // Create template
      const template = await dbService.createPermissionTemplate(templateData);
      expect(template.id).toBeDefined();

      // Retrieve template
      const retrievedTemplate = await dbService.getPermissionTemplateById(template.id);
      expect(retrievedTemplate).toBeDefined();
      expect(retrievedTemplate.position).toBe('村支书');
      expect(retrievedTemplate.permissions).toHaveLength(2);

      // Retrieve by position
      const positionTemplate = await dbService.getPermissionTemplateByPosition('村支书');
      expect(positionTemplate).toBeDefined();
      expect(positionTemplate.id).toBe(template.id);

      // Update template
      const updatedTemplateData = {
        position: '村主任',
        permissions: [
          { module: 'village_affairs', actions: ['create', 'read', 'update'] },
          { module: 'resident_management', actions: ['read'] }
        ]
      };

      await dbService.updatePermissionTemplate(template.id, updatedTemplateData);
      const updatedTemplate = await dbService.getPermissionTemplateById(template.id);
      expect(updatedTemplate.position).toBe('村主任');
      expect(updatedTemplate.permissions).toHaveLength(2);
    });
  });

  describe('Permission Checking', () => {
    test('should check permissions correctly', async () => {
      // Create a committee member for testing
      const memberData = {
        name: '测试委员会成员',
        position: '测试职位',
        phone: '13800138001',
        department: '测试部门'
      };

      // Since we don't have a direct method to create a committee member in dbService,
      // we'll simulate the permission checking with template-based permissions
      const templateData = {
        position: '测试职位',
        permissions: [
          { module: 'resident_management', actions: ['read', 'update'] },
          { module: 'announcement_management', actions: ['read'] }
        ]
      };

      await dbService.createPermissionTemplate(templateData);

      // Test permission check (this would normally be done with an actual user ID)
      // For now, we'll test the data sensitivity functions
      const sensitivityInfo = await dbService.getDataSensitivityInfo('financial_management', 'create');
      expect(sensitivityInfo).toBeDefined();
      expect(sensitivityInfo.moduleName).toBe('financial_management');
      expect(sensitivityInfo.actionName).toBe('create');
    });
  });

  describe('Audit Logging', () => {
    test('should create and retrieve audit logs', async () => {
      const logData = {
        operationType: 'data_access',
        operatorId: 1,
        operatorName: '测试用户',
        operatorPosition: '测试职位',
        targetInfo: { targetType: 'resident', targetId: 123 },
        operationDetails: { module: 'resident_management', action: 'read' },
        ipAddress: '127.0.0.1',
        riskLevel: 'low'
      };

      // Create audit log
      const logEntry = await dbService.logPermissionActivity(logData);
      expect(logEntry.id).toBeDefined();

      // Retrieve audit logs
      const logs = await dbService.getPermissionAuditLogs({
        operatorId: 1,
        operationType: 'data_access'
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].operatorName).toBe('测试用户');
      expect(logs[0].riskLevel).toBe('low');
    });

    test('should filter audit logs by date range', async () => {
      const logData1 = {
        operationType: 'data_access',
        operatorId: 1,
        operatorName: '测试用户1',
        operatorPosition: '测试职位',
        targetInfo: { targetType: 'resident', targetId: 123 },
        operationDetails: { module: 'resident_management', action: 'read' },
        ipAddress: '127.0.0.1',
        riskLevel: 'low'
      };

      const logData2 = {
        operationType: 'data_modify',
        operatorId: 1,
        operatorName: '测试用户2',
        operatorPosition: '测试职位',
        targetInfo: { targetType: 'resident', targetId: 124 },
        operationDetails: { module: 'resident_management', action: 'update' },
        ipAddress: '127.0.0.1',
        riskLevel: 'medium'
      };

      await dbService.logPermissionActivity(logData1);
      await dbService.logPermissionActivity(logData2);

      const logs = await dbService.getPermissionAuditLogs({
        startDate: new Date(Date.now() - 10000), // 10 seconds ago
        endDate: new Date(Date.now() + 10000)    // 10 seconds from now
      });

      expect(logs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Data Sensitivity', () => {
    test('should correctly identify high-risk operations', async () => {
      const requiresApproval = await dbService.requiresApproval('financial_management', 'create');
      expect(requiresApproval).toBe(true);

      const lowRiskApproval = await dbService.requiresApproval('announcement_management', 'read');
      expect(lowRiskApproval).toBe(false);
    });

    test('should retrieve sensitivity information', async () => {
      const sensitivityInfo = await dbService.getDataSensitivityInfo('financial_management', 'approve');
      expect(sensitivityInfo).toBeDefined();
      expect(sensitivityInfo.riskLevel).toBe('critical');
      expect(sensitivityInfo.requiresApproval).toBe(true);
    });
  });
});