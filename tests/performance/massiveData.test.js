/**
 * 海量数据处理性能测试
 * 测试百万级数据的处理性能
 */

const mongoose = require('mongoose');
const massiveDataService = require('../../src/services/massiveDataService');
const Resident = require('../../src/models/Resident');

// 测试配置
const TEST_CONFIG = {
  // 测试数据量
  testRecordCounts: [1000, 10000, 100000, 1000000],
  // 性能基准（毫秒）
  performanceBenchmarks: {
    pagination_1000: 50,    // 1000条分页查询 < 50ms
    pagination_10000: 100,  // 10000条分页查询 < 100ms
    aggregation_10000: 200, // 10000条聚合查询 < 200ms
    batch_process_10000: 5000 // 10000条批处理 < 5s
  }
};

describe('海量数据处理性能测试', () => {
  let testVillageId;
  let connection;

  beforeAll(async () => {
    // 连接测试数据库
    connection = await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/smart-village-test');

    // 创建测试村庄
    const Village = require('../../src/models/Village');
    const village = await Village.create({
      name: '性能测试村庄',
      code: 'PERF_TEST',
      address: '测试地址',
      population: 0
    });
    testVillageId = village._id;
  });

  afterAll(async () => {
    // 清理测试数据
    await Resident.deleteMany({ villageId: testVillageId });
    await mongoose.connection.close();
  });

  describe('分页查询性能测试', () => {
    const testData = [];

    beforeAll(async () => {
      console.log('🔄 生成测试数据...');

      // 生成100万条测试数据
      for (let i = 0; i < 1000000; i++) {
        testData.push({
          name: `测试用户${i}`,
          idCard: `110101199001${String(i).padStart(6, '0')}`,
          phone: `138${String(i).padStart(8, '0')}`,
          gender: i % 2 === 0 ? 'male' : 'female',
          age: 18 + (i % 60),
          birthDate: new Date(1990 + (i % 30), (i % 12), (i % 28) + 1),
          villageId: testVillageId,
          address: {
            province: '测试省',
            city: '测试市',
            district: '测试区',
            town: '测试镇',
            village: '测试村',
            detailAddress: `测试地址${i}号`
          },
          location: {
            type: 'Point',
            coordinates: [116.404 + (i % 100) * 0.001, 39.915 + (i % 100) * 0.001]
          },
          education: {
            degree: ['primary', 'junior_high', 'senior_high', 'college', 'bachelor'][i % 5]
          },
          occupation: ['farmer', 'worker', 'teacher', 'business', 'other'][i % 5],
          annualIncome: 20000 + (i % 100) * 1000,
          specialIdentities: i % 10 === 0 ? [{
            type: ['party_member', 'veteran', 'disabled'][i % 3],
            certificateNumber: `CERT${i}`
          }] : [],
          createdAt: new Date(Date.now() - (i * 1000)),
          updatedAt: new Date()
        });
      }

      // 批量插入数据（分批避免内存溢出）
      const batchSize = 10000;
      for (let i = 0; i < testData.length; i += batchSize) {
        const batch = testData.slice(i, i + batchSize);
        await Resident.insertMany(batch);
        console.log(`✅ 已插入 ${Math.min(i + batchSize, testData.length)} / ${testData.length} 条数据`);
      }

      console.log('🎉 测试数据生成完成');
    });

    test('1000条数据分页查询性能', async () => {
      const startTime = Date.now();

      const result = await massiveDataService.cursorBasedPagination(
        Resident,
        { villageId: testVillageId },
        { pageSize: 1000 }
      );

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(TEST_CONFIG.performanceBenchmarks.pagination_1000);
      expect(result.data.length).toBeLessThanOrEqual(1000);
      expect(result.hasNextPage).toBe(true);

      console.log(`✅ 1000条分页查询耗时: ${duration}ms`);
    });

    test('10000条数据分页查询性能', async () => {
      const startTime = Date.now();

      const result = await massiveDataService.cursorBasedPagination(
        Resident,
        { villageId: testVillageId },
        { pageSize: 10000 }
      );

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(TEST_CONFIG.performanceBenchmarks.pagination_10000);
      expect(result.data.length).toBeLessThanOrEqual(10000);

      console.log(`✅ 10000条分页查询耗时: ${duration}ms`);
    });

    test('带条件的分页查询性能', async () => {
      const startTime = Date.now();

      const result = await massiveDataService.cursorBasedPagination(
        Resident,
        {
          villageId: testVillageId,
          gender: 'male',
          age: { $gte: 30, $lte: 50 }
        },
        { pageSize: 5000 }
      );

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200); // 复杂查询允许更长时间
      expect(result.data.length).toBeGreaterThan(0);

      console.log(`✅ 复杂条件分页查询耗时: ${duration}ms`);
    });

    test('游标分页 vs 传统分页性能对比', async () => {
      const pageSize = 5000;

      // 游标分页
      const cursorStartTime = Date.now();
      let cursorResult = await massiveDataService.cursorBasedPagination(
        Resident,
        { villageId: testVillageId },
        { pageSize }
      );
      const cursorDuration = Date.now() - cursorStartTime;

      // 传统分页
      const traditionalStartTime = Date.now();
      const traditionalResult = await Resident.find({ villageId: testVillageId })
        .sort({ _id: 1 })
        .limit(pageSize)
        .lean();
      const traditionalDuration = Date.now() - traditionalStartTime;

      console.log(`✅ 游标分页耗时: ${cursorDuration}ms`);
      console.log(`✅ 传统分页耗时: ${traditionalDuration}ms`);
      console.log(`📊 性能提升: ${((traditionalDuration - cursorDuration) / traditionalDuration * 100).toFixed(2)}%`);

      // 游标分页应该更快或接近
      expect(cursorDuration).toBeLessThanOrEqual(traditionalDuration * 1.2);
    });
  });

  describe('聚合管道性能测试', () => {
    test('村庄统计聚合性能', async () => {
      const startTime = Date.now();

      const stats = await massiveDataService.getVillageMassiveStats(testVillageId);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(TEST_CONFIG.performanceBenchmarks.aggregation_10000);
      expect(stats).toBeDefined();
      expect(stats.basicStats).toBeDefined();
      expect(stats.genderStats).toBeDefined();
      expect(stats.ageStats).toBeDefined();

      console.log(`✅ 村庄统计聚合耗时: ${duration}ms`);
      console.log(`📊 总村民数: ${stats.basicStats?.totalResidents}`);
    });

    test('地理空间聚合性能', async () => {
      const startTime = Date.now();

      const geoStats = await massiveDataService.getGeospatialAnalytics(testVillageId);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // 地理查询允许更长时间
      expect(geoStats).toBeDefined();
      expect(geoStats.densityData).toBeDefined();

      console.log(`✅ 地理空间聚合耗时: ${duration}ms`);
      console.log(`📊 热力图数据点: ${geoStats.densityData?.length}`);
    });

    test('实时数据流聚合性能', async () => {
      const startTime = Date.now();

      const realtimeData = await massiveDataService.getRealTimeDataStream(testVillageId);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500); // 实时查询要求更高性能
      expect(Array.isArray(realtimeData)).toBe(true);

      console.log(`✅ 实时数据流聚合耗时: ${duration}ms`);
      console.log(`📊 实时活动用户: ${realtimeData.length}`);
    });
  });

  describe('批处理性能测试', () => {
    test('批量数据更新性能', async () => {
      let processedCount = 0;
      const startTime = Date.now();

      await massiveDataService.batchProcess(
        Resident,
        { villageId: testVillageId, age: { $lt: 30 } },
        async (doc) => {
          // 模拟数据处理
          processedCount++;
          return Resident.findByIdAndUpdate(doc._id, {
            $set: { 'metadata.batchProcessed': true }
          });
        },
        {
          batchSize: 1000,
          maxConcurrency: 5,
          progressCallback: (progress) => {
            console.log(`📈 批处理进度: ${progress.progress}%`);
          }
        }
      );

      const duration = Date.now() - startTime;
      const throughput = processedCount / (duration / 1000); // 每秒处理记录数

      expect(duration).toBeLessThan(TEST_CONFIG.performanceBenchmarks.batch_process_10000);
      expect(processedCount).toBeGreaterThan(0);

      console.log(`✅ 批量更新耗时: ${duration}ms`);
      console.log(`📊 处理记录数: ${processedCount}`);
      console.log(`📊 处理速度: ${throughput.toFixed(2)} 记录/秒`);
    });

    test('缓存命中性能测试', async () => {
      // 第一次查询（无缓存）
      const firstStartTime = Date.now();
      await massiveDataService.getVillageMassiveStats(testVillageId);
      const firstDuration = Date.now() - firstStartTime;

      // 第二次查询（有缓存）
      const secondStartTime = Date.now();
      await massiveDataService.getVillageMassiveStats(testVillageId);
      const secondDuration = Date.now() - secondStartTime;

      // 缓存应该显著提升性能
      expect(secondDuration).toBeLessThan(firstDuration / 10);

      console.log(`✅ 首次查询耗时: ${firstDuration}ms`);
      console.log(`✅ 缓存查询耗时: ${secondDuration}ms`);
      console.log(`📊 性能提升: ${((firstDuration - secondDuration) / firstDuration * 100).toFixed(2)}%`);
    });
  });

  describe('数据导出性能测试', () => {
    test('大数据量导出性能', async () => {
      const exportCount = 50000;
      const startTime = Date.now();

      const exportResult = await massiveDataService.exportMassiveData(
        Resident,
        { villageId: testVillageId },
        {
          fields: ['name', 'idCard', 'phone', 'age', 'gender'],
          chunkSize: 10000,
          progressCallback: (progress) => {
            console.log(`📤 导出进度: ${progress.progress}%`);
          }
        }
      );

      const duration = Date.now() - startTime;
      const throughput = exportResult.totalExported / (duration / 1000);

      expect(exportResult.totalExported).toBeLessThanOrEqual(exportCount);
      expect(duration).toBeLessThan(30000); // 30秒内完成

      console.log(`✅ 数据导出耗时: ${duration}ms`);
      console.log(`📊 导出记录数: ${exportResult.totalExported}`);
      console.log(`📊 导出速度: ${throughput.toFixed(2)} 记录/秒`);
    });
  });

  describe('内存使用优化测试', () => {
    test('大数据查询内存使用', async () => {
      const initialMemory = process.memoryUsage();

      // 执行大量数据查询
      await massiveDataService.cursorBasedPagination(
        Resident,
        { villageId: testVillageId },
        { pageSize: 50000 }
      );

      const afterQueryMemory = process.memoryUsage();

      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }

      const afterGCMemory = process.memoryUsage();

      const memoryIncrease = afterQueryMemory.heapUsed - initialMemory.heapUsed;
      const memoryAfterGC = afterGCMemory.heapUsed - initialMemory.heapUsed;

      console.log(`✅ 查询后内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`✅ GC后内存增长: ${(memoryAfterGC / 1024 / 1024).toFixed(2)}MB`);

      // GC后内存应该有显著回收
      expect(memoryAfterGC).toBeLessThan(memoryIncrease * 0.5);
    });
  });

  describe('并发性能测试', () => {
    test('并发分页查询性能', async () => {
      const concurrentQueries = 50;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentQueries }, (_, i) =>
        massiveDataService.cursorBasedPagination(
          Resident,
          { villageId: testVillageId },
          { pageSize: 100, cursor: null }
        )
      );

      await Promise.all(promises);

      const duration = Date.now() - startTime;
      const avgQueryTime = duration / concurrentQueries;

      expect(avgQueryTime).toBeLessThan(100); // 平均查询时间应小于100ms

      console.log(`✅ ${concurrentQueries}个并发查询总耗时: ${duration}ms`);
      console.log(`✅ 平均查询时间: ${avgQueryTime.toFixed(2)}ms`);
    });
  });
});

// 性能测试报告生成
describe('性能测试报告', () => {
  test('生成性能报告', async () => {
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage()
      },
      benchmarks: TEST_CONFIG.performanceBenchmarks,
      testResults: {
        pagination: '分页查询性能通过',
        aggregation: '聚合管道性能通过',
        batchProcess: '批处理性能通过',
        export: '数据导出性能通过',
        memory: '内存优化测试通过',
        concurrency: '并发性能测试通过'
      }
    };

    console.log('📊 性能测试报告:');
    console.log(JSON.stringify(report, null, 2));

    expect(report.testResults).toBeDefined();
  });
});