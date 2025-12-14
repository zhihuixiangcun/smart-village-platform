const DatabaseService = require('../../src/database/databaseService');
const SQLiteDB = require('../../src/database/sqlite');

describe('Permissions System Unit Tests', () => {
  let dbService;
  let sqliteDB;

  beforeAll(async () => {
    dbService = new DatabaseService();
    sqliteDB = new SQLiteDB();
    await sqliteDB.init();
  });

  beforeEach(() => {
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
        sqliteDB.run(`DELETE FROM ${table}`);
      } catch (error) {
        // Table might not exist yet, ignore
      }
    }
  });

  afterAll(() => {
    if (sqliteDB) {
      sqliteDB.close();
    }
  });

  describe('SQLiteDB Class', () => {
    test('should initialize database successfully', async () => {
      expect(sqliteDB.db).toBeDefined();
      expect(sqliteDB.dbPath).toBe('./data.db');
    });

    test('should create tables during initialization', async () => {
      // Check if key tables exist by trying to query them
      expect(() => {
        sqliteDB.run('SELECT * FROM permission_modules LIMIT 1');
      }).not.toThrow();

      expect(() => {
        sqliteDB.run('SELECT * FROM permission_actions LIMIT 1');
      }).not.toThrow();

      expect(() => {
        sqliteDB.run('SELECT * FROM user_roles LIMIT 1');
      }).not.toThrow();
    });

    test('should insert and retrieve data', () => {
      // Test basic insert and select operations
      sqliteDB.run(`
        INSERT INTO permission_modules (name, description) 
        VALUES (?, ?)
      `, ['test_module', '测试模块']);

      const result = sqliteDB.get(
        'SELECT * FROM permission_modules WHERE name = ?', 
        ['test_module']
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('test_module');
      expect(result.description).toBe('测试模块');
    });
  });

  describe('DatabaseService Class', () => {
    test('should initialize successfully', async () => {
      await dbService.init();
      expect(dbService.sqliteDB).toBeDefined();
    });

    test('should create roles with correct structure', async () => {
      const roleData = {
        roleName: 'unit_test_role',
        description: '单元测试角色',
        hierarchyLevel: 5
      };

      const result = await dbService.createRole(roleData);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();

      const retrievedRole = await dbService.getRoleById(result.id);
      expect(retrievedRole.roleName).toBe('unit_test_role');
      expect(retrievedRole.description).toBe('单元测试角色');
      expect(retrievedRole.hierarchyLevel).toBe(5);
    });

    test('should handle permission templates correctly', async () => {
      const templateData = {
        position: '单元测试职位',
        permissions: [
          { module: 'test_module', actions: ['read', 'write'] },
          { module: 'another_module', actions: ['execute'] }
        ]
      };

      const result = await dbService.createPermissionTemplate(templateData);
      expect(result.id).toBeDefined();

      const retrievedTemplate = await dbService.getPermissionTemplateById(result.id);
      expect(retrievedTemplate.position).toBe('单元测试职位');
      expect(retrievedTemplate.permissions).toHaveLength(2);
      expect(retrievedTemplate.permissions[0].module).toBe('test_module');
      expect(retrievedTemplate.permissions[0].actions).toContain('read');
      expect(retrievedTemplate.permissions[0].actions).toContain('write');
    });

    test('should properly serialize and deserialize JSON data', async () => {
      const complexPermissions = [
        { module: 'complex_module', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'simple_module', actions: ['read'] }
      ];

      const templateData = {
        position: '复杂权限测试',
        permissions: complexPermissions
      };

      const result = await dbService.createPermissionTemplate(templateData);
      const retrievedTemplate = await dbService.getPermissionTemplateById(result.id);

      expect(retrievedTemplate.permissions).toHaveLength(2);
      expect(retrievedTemplate.permissions[0].actions).toHaveLength(4);
      expect(retrievedTemplate.permissions[1].actions).toHaveLength(1);
    });
  });

  describe('Permission Checking Logic', () => {
    test('should correctly identify approval requirements', async () => {
      // High risk operations should require approval
      const highRiskApproval = await dbService.requiresApproval('financial_management', 'create');
      expect(highRiskApproval).toBe(true);

      // Low risk operations should not require approval
      const lowRiskApproval = await dbService.requiresApproval('announcement_management', 'read');
      expect(lowRiskApproval).toBe(false);

      // Critical operations should require approval
      const criticalRiskApproval = await dbService.requiresApproval('system_settings', 'update');
      expect(criticalRiskApproval).toBe(true);
    });

    test('should retrieve sensitivity information correctly', async () => {
      const info = await dbService.getDataSensitivityInfo('financial_management', 'approve');
      expect(info).toBeDefined();
      expect(info.moduleName).toBe('financial_management');
      expect(info.actionName).toBe('approve');
      expect(info.riskLevel).toBe('critical');
      expect(info.requiresApproval).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    test('should handle complex JSON data in logs', async () => {
      const complexLogData = {
        operationType: 'bulk_operation',
        operatorId: 1,
        operatorName: '复杂日志测试用户',
        operatorPosition: '测试职位',
        targetInfo: {
          targetType: 'resident',
          targetIds: [1, 2, 3, 4, 5],
          targetNames: ['用户1', '用户2', '用户3']
        },
        operationDetails: {
          module: 'resident_management',
          action: 'bulk_update',
          fieldsChanged: ['phone', 'address'],
          oldValue: { phone: 'old_phone' },
          newValue: { phone: 'new_phone' }
        },
        ipAddress: '192.168.1.100',
        riskLevel: 'high',
        isAnomalous: false,
        requiresApproval: true
      };

      const logEntry = await dbService.logPermissionActivity(complexLogData);
      expect(logEntry.id).toBeDefined();

      const logs = await dbService.getPermissionAuditLogs({
        operationType: 'bulk_operation'
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].operatorName).toBe('复杂日志测试用户');
      expect(logs[0].riskLevel).toBe('high');
    });

    test('should correctly paginate audit logs', async () => {
      // Create multiple log entries
      for (let i = 0; i < 5; i++) {
        await dbService.logPermissionActivity({
          operationType: 'data_access',
          operatorId: 1,
          operatorName: `测试用户${i}`,
          operatorPosition: '测试职位',
          targetInfo: { targetType: 'resident', targetId: i },
          operationDetails: { module: 'resident_management', action: 'read' },
          ipAddress: '127.0.0.1',
          riskLevel: 'low'
        });
      }

      const page1 = await dbService.getPermissionAuditLogs({}, { page: 1, limit: 3 });
      const page2 = await dbService.getPermissionAuditLogs({}, { page: 2, limit: 3 });

      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(2);
    });
  });
});