/**
 * 服务层性能基准测试
 * 测试关键服务方法的执行性能
 */

const TripleQueryVerification = require('../../src/services/TripleQueryVerification');
const SpecialCasesHandler = require('../../src/services/SpecialCasesHandler');
const FamilyRelationshipBinder = require('../../src/services/FamilyRelationshipBinder');

// Mock DB service
const mockDbService = {
  sqliteDB: {
    all: jest.fn(),
    run: jest.fn(),
    get: jest.fn()
  },
  mongodb: {
    collection: jest.fn(() => ({
      find: jest.fn(() => ({
        toArray: jest.fn()
      })),
      aggregate: jest.fn(() => ({
        toArray: jest.fn()
      }))
    }))
  }
};

describe('服务层性能基准测试', () => {
  describe('TripleQueryVerification 性能', () => {
    let tripleVerification;

    beforeAll(() => {
      tripleVerification = new TripleQueryVerification(mockDbService, {
        enabled: true,
        approvalTimeout: 86400000
      });
    });

    test('初始化查询应该在50ms内完成', async () => {
      const iterations = 100;
      const executionTimes = [];

      mockDbService.sqliteDB.run.mockResolvedValue({ lastID: 1 });

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await tripleVerification.initiateTripleVerification('query_001', 'self_info', {
          requesterId: 'user_001',
          targetId: 'user_001',
          reason: '查询本人信息'
        });
        executionTimes.push(Date.now() - start);
      }

      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / iterations;
      const maxTime = Math.max(...executionTimes);

      console.log('TripleQueryVerification.initiateTripleVerification 性能:');
      console.log('  平均执行时间: ' + avgTime.toFixed(2) + 'ms');
      console.log('  最大执行时间: ' + maxTime + 'ms');
      console.log('  总迭代次数: ' + iterations);

      expect(avgTime).toBeLessThan(50);
      expect(maxTime).toBeLessThan(100);
    });
  });

  describe('SpecialCasesHandler 性能', () => {
    let specialCasesHandler;

    beforeAll(() => {
      specialCasesHandler = new SpecialCasesHandler(mockDbService);
    });

    test('记录特殊案例应该在100ms内完成', async () => {
      const iterations = 50;
      const executionTimes = [];

      mockDbService.sqliteDB.run.mockResolvedValue({ lastID: 1 });

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await specialCasesHandler.recordSpecialCase({
          caseType: 'adoption',
          primaryPersonId: 'person_001',
          secondaryPersonIds: ['person_002', 'person_003'],
          caseData: { adoptionDate: '2024-01-01', adoptionAgency: 'Agency_A' },
          operatorId: 'user_001'
        });
        executionTimes.push(Date.now() - start);
      }

      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / iterations;
      const p95Time = executionTimes.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

      console.log('SpecialCasesHandler.recordSpecialCase 性能:');
      console.log('  平均执行时间: ' + avgTime.toFixed(2) + 'ms');
      console.log('  P95执行时间: ' + p95Time + 'ms');

      expect(avgTime).toBeLessThan(100);
      expect(p95Time).toBeLessThan(150);
    });

    test('查询特殊案例应该在200ms内完成', async () => {
      const mockRecords = [
        {
          id: 1,
          case_type: 'adoption',
          status: 'active',
          primary_person_id: 'person_001',
          secondary_person_ids: 'person_002,person_003',
          case_data: '{"adoptionDate":"2024-01-01"}',
          operator_id: 'user_001',
          created_at: new Date().toISOString()
        }
      ];

      mockDbService.sqliteDB.all.mockResolvedValue(mockRecords);

      const iterations = 100;
      const executionTimes = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await specialCasesHandler.getSpecialCasesByPersonId('person_001');
        executionTimes.push(Date.now() - start);
      }

      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / iterations;

      console.log('SpecialCasesHandler.getSpecialCasesByPersonId 性能:');
      console.log('  平均执行时间: ' + avgTime.toFixed(2) + 'ms');

      expect(avgTime).toBeLessThan(200);
    });
  });

  describe('FamilyRelationshipBinder 性能', () => {
    let familyBinder;

    beforeAll(() => {
      familyBinder = new FamilyRelationshipBinder(mockDbService);
    });

    test('生成家族树应该在300ms内完成', async () => {
      const mockFamilyData = {
        members: Array(50).fill(null).map((_, i) => ({
          id: 'person_' + i,
          name: 'Person ' + i,
          gender: i % 2 === 0 ? 'male' : 'female',
          birthDate: '1980-01-01',
          familyId: 'family_001',
          parentId: i > 0 ? 'person_' + (i - 1) : null
        })),
        relationships: Array(100).fill(null).map((_, i) => ({
          id: 'rel_' + i,
          person1Id: 'person_' + i,
          person2Id: 'person_' + ((i + 1) % 50),
          relationshipType: 'parent_child'
        }))
      };

      mockDbService.sqliteDB.all.mockResolvedValue(mockFamilyData.members);

      const iterations = 30;
      const executionTimes = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await familyBinder.generateFamilyTree('person_0', 3);
        executionTimes.push(Date.now() - start);
      }

      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / iterations;
      const maxTime = Math.max(...executionTimes);

      console.log('FamilyRelationshipBinder.generateFamilyTree 性能:');
      console.log('  平均执行时间: ' + avgTime.toFixed(2) + 'ms');
      console.log('  最大执行时间: ' + maxTime + 'ms');
      console.log('  树成员数量: ' + mockFamilyData.members.length);

      expect(avgTime).toBeLessThan(300);
      expect(maxTime).toBeLessThan(500);
    });
  });

  describe('并发性能测试', () => {
    test('应该能够处理20个并发服务请求', async () => {
      const concurrency = 20;
      const startTime = Date.now();

      const tripleVerification = new TripleQueryVerification(mockDbService);
      mockDbService.sqliteDB.run.mockResolvedValue({ lastID: 1 });

      const promises = Array(concurrency).fill(null).map((_, i) =>
        tripleVerification.initiateTripleVerification('query_' + i, 'self_info', {
          requesterId: 'user_' + i,
          targetId: 'user_' + i,
          reason: '测试查询'
        })
      );

      await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / concurrency;

      console.log('并发服务请求性能 (' + concurrency + '个并发):');
      console.log('  总耗时: ' + totalTime + 'ms');
      console.log('  平均响应时间: ' + avgTime.toFixed(2) + 'ms');
      console.log('  每秒处理数: ' + ((concurrency / totalTime) * 1000).toFixed(2));

      expect(totalTime).toBeLessThan(1000); // 20个并发请求应该在1秒内完成
    });
  });
});
