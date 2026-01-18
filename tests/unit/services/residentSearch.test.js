const mongoose = require('mongoose');
const Resident = require('../../../src/models/Resident');
const residentService = require('../../../src/services/residentService');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('Resident Search - Full Text Search and Filtering', () => {
  let mongod;
  let testVillageId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, {
      bufferCommands: false,
      bufferMaxEntries: 0
    });

    testVillageId = new mongoose.Types.ObjectId();

    const residents = [
      {
        name: '张三',
        idCard: '110101199001011234',
        phone: '13800138000',
        gender: 'male',
        birthDate: new Date('1990-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道1号'
        },
        status: 'active'
      },
      {
        name: '李四',
        idCard: '110101199201011235',
        phone: '13900139000',
        gender: 'female',
        birthDate: new Date('1992-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道2号'
        },
        specialIdentities: [{
          type: 'party_member',
          certificateNumber: 'CERT001',
          issuedDate: new Date('2010-01-01')
        }],
        status: 'active'
      },
      {
        name: '王五',
        idCard: '110101198501011236',
        phone: '13700137000',
        gender: 'male',
        birthDate: new Date('1985-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道3号'
        },
        occupation: 'teacher',
        education: {
          degree: 'bachelor'
        },
        status: 'active'
      },
      {
        name: '赵六',
        idCard: '110101198801011237',
        phone: '13600136000',
        gender: 'female',
        birthDate: new Date('1988-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道4号'
        },
        occupation: 'doctor',
        education: {
          degree: 'master'
        },
        specialIdentities: [{
          type: 'veteran',
          certificateNumber: 'CERT002',
          issuedDate: new Date('2005-01-01')
        }],
        status: 'active'
      },
      {
        name: '孙七',
        idCard: '110101199501011238',
        phone: '13500135000',
        gender: 'male',
        birthDate: new Date('1995-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市西城区西单大街1号'
        },
        household: {
          householdType: 'low_income'
        },
        status: 'active'
      },
      {
        name: '张小明',
        idCard: '110101201001011239',
        phone: '13400134000',
        gender: 'male',
        birthDate: new Date('2010-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道5号'
        },
        status: 'active'
      },
      {
        name: '李小红',
        idCard: '110101201201011240',
        phone: '13300133000',
        gender: 'female',
        birthDate: new Date('2012-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道6号'
        },
        specialIdentities: [{
          type: 'left_behind_children',
          certificateNumber: 'CERT003',
          issuedDate: new Date('2015-01-01')
        }],
        status: 'active'
      },
      {
        name: '王老',
        idCard: '110101195001011241',
        phone: '13200132000',
        gender: 'male',
        birthDate: new Date('1950-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道7号'
        },
        specialIdentities: [{
          type: 'elderly',
          certificateNumber: 'CERT004',
          issuedDate: new Date('2010-01-01')
        }],
        status: 'active'
      },
      {
        name: '陈大',
        idCard: '110101199701011242',
        phone: '13100131000',
        gender: 'male',
        birthDate: new Date('1997-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道8号'
        },
        occupation: 'farmer',
        status: 'active'
      },
      {
        name: '刘二',
        idCard: '110101199601011243',
        phone: '13000130000',
        gender: 'female',
        birthDate: new Date('1996-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道9号'
        },
        occupation: 'unemployed',
        status: 'active'
      }
    ];

    await Resident.insertMany(residents);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await Resident.deleteMany({});
    await Resident.insertMany([
      {
        name: '张三',
        idCard: '110101199001011234',
        phone: '13800138000',
        gender: 'male',
        birthDate: new Date('1990-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道1号'
        },
        status: 'active'
      },
      {
        name: '李四',
        idCard: '110101199201011235',
        phone: '13900139000',
        gender: 'female',
        birthDate: new Date('1992-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道2号'
        },
        specialIdentities: [{
          type: 'party_member',
          certificateNumber: 'CERT001',
          issuedDate: new Date('2010-01-01')
        }],
        status: 'active'
      },
      {
        name: '王五',
        idCard: '110101198501011236',
        phone: '13700137000',
        gender: 'male',
        birthDate: new Date('1985-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道3号'
        },
        occupation: 'teacher',
        education: {
          degree: 'bachelor'
        },
        status: 'active'
      },
      {
        name: '赵六',
        idCard: '110101198801011237',
        phone: '13600136000',
        gender: 'female',
        birthDate: new Date('1988-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道4号'
        },
        occupation: 'doctor',
        education: {
          degree: 'master'
        },
        specialIdentities: [{
          type: 'veteran',
          certificateNumber: 'CERT002',
          issuedDate: new Date('2005-01-01')
        }],
        status: 'active'
      },
      {
        name: '孙七',
        idCard: '110101199501011238',
        phone: '13500135000',
        gender: 'male',
        birthDate: new Date('1995-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市西城区西单大街1号'
        },
        household: {
          householdType: 'low_income'
        },
        status: 'active'
      },
      {
        name: '张小明',
        idCard: '110101201001011239',
        phone: '13400134000',
        gender: 'male',
        birthDate: new Date('2010-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道5号'
        },
        status: 'active'
      },
      {
        name: '李小红',
        idCard: '110101201201011240',
        phone: '13300133000',
        gender: 'female',
        birthDate: new Date('2012-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道6号'
        },
        specialIdentities: [{
          type: 'left_behind_children',
          certificateNumber: 'CERT003',
          issuedDate: new Date('2015-01-01')
        }],
        status: 'active'
      },
      {
        name: '王老',
        idCard: '110101195001011241',
        phone: '13200132000',
        gender: 'male',
        birthDate: new Date('1950-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道7号'
        },
        specialIdentities: [{
          type: 'elderly',
          certificateNumber: 'CERT004',
          issuedDate: new Date('2010-01-01')
        }],
        status: 'active'
      },
      {
        name: '陈大',
        idCard: '110101199701011242',
        phone: '13100131000',
        gender: 'male',
        birthDate: new Date('1997-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道8号'
        },
        occupation: 'farmer',
        status: 'active'
      },
      {
        name: '刘二',
        idCard: '110101199601011243',
        phone: '13000130000',
        gender: 'female',
        birthDate: new Date('1996-01-01'),
        villageId: testVillageId,
        address: {
          detailAddress: '北京市东城区东华门街道9号'
        },
        occupation: 'unemployed',
        status: 'active'
      }
    ]);
  });

  const operator = {
    userId: new mongoose.Types.ObjectId().toString(),
    username: 'testuser',
    name: '测试用户',
    role: 'admin',
    sessionId: 'test_session_123'
  };

  describe('全文搜索 (Full Text Search)', () => {
    it('应该能够使用全文搜索查找村民', async () => {
      const result = await residentService.fullTextSearchResidents({
        keyword: '张三',
        villageId: testVillageId.toString()
      }, operator);

      expect(result.residents).toBeDefined();
      expect(result.residents.length).toBeGreaterThan(0);
      expect(result.pagination).toBeDefined();
    });

    it('应该能够通过姓名进行全文搜索', async () => {
      const result = await residentService.fullTextSearchResidents({
        keyword: '张',
        villageId: testVillageId.toString()
      }, operator);

      expect(result.residents.length).toBe(2);
      const names = result.residents.map(r => r.name);
      expect(names).toContain('张三');
      expect(names).toContain('张小明');
    });

    it('应该能够通过手机号进行全文搜索', async () => {
      const result = await residentService.fullTextSearchResidents({
        keyword: '13800138000',
        villageId: testVillageId.toString()
      }, operator);

      expect(result.residents.length).toBe(1);
      expect(result.residents[0].phone).toContain('138');
    });

    it('应该能够通过地址进行全文搜索', async () => {
      const result = await residentService.fullTextSearchResidents({
        keyword: '东华门街道',
        villageId: testVillageId.toString()
      }, operator);

      expect(result.residents.length).toBeGreaterThan(0);
    });

    it('应该能够通过特殊身份标签进行全文搜索', async () => {
      const result = await residentService.fullTextSearchResidents({
        keyword: 'party_member',
        villageId: testVillageId.toString()
      }, operator);

      expect(result.residents.length).toBe(1);
      expect(result.residents[0].name).toBe('李四');
    });

    it('应该按照搜索结果的相关性得分排序', async () => {
      const result = await residentService.fullTextSearchResidents({
        keyword: '张',
        villageId: testVillageId.toString(),
        sortBy: 'score',
        sortOrder: 'desc'
      }, operator);

      expect(result.residents).toBeDefined();
    });

    it('应该支持分页', async () => {
      const result1 = await residentService.fullTextSearchResidents({
        keyword: '',
        villageId: testVillageId.toString(),
        page: 1,
        limit: 5
      }, operator);

      const result2 = await residentService.fullTextSearchResidents({
        keyword: '',
        villageId: testVillageId.toString(),
        page: 2,
        limit: 5
      }, operator);

      expect(result1.residents.length).toBe(5);
      expect(result2.residents.length).toBe(5);
      expect(result1.pagination.total).toBe(result2.pagination.total);
    });

    it('应该在关键词为空时抛出错误', async () => {
      await expect(
        residentService.fullTextSearchResidents({
          keyword: '',
          villageId: testVillageId.toString()
        }, operator)
      ).rejects.toThrow('搜索关键词不能为空');
    });
  });

  describe('高级筛选 (Advanced Filtering)', () => {
    it('应该能够按照性别筛选', async () => {
      const result = await residentService.searchResidents({
        keyword: '',
        villageId: testVillageId.toString(),
        filters: { gender: 'female' }
      }, operator);

      expect(result.residents.every(r => r.gender === 'female')).toBe(true);
    });

    it('应该能够按照职业筛选', async () => {
      const result = await residentService.searchResidents({
        keyword: '',
        villageId: testVillageId.toString(),
        filters: { occupation: 'teacher' }
      }, operator);

      expect(result.residents.length).toBe(1);
      expect(result.residents[0].occupation).toBe('teacher');
    });

    it('应该能够按照年龄段筛选', async () => {
      const result = await residentService.searchResidents({
        keyword: '',
        villageId: testVillageId.toString(),
        filters: { ageRange: [20, 30] }
      }, operator);

      const currentYear = new Date().getFullYear();
      const minBirthYear = currentYear - 30;
      const maxBirthYear = currentYear - 20;

      result.residents.forEach(resident => {
        const birthYear = new Date(resident.birthDate).getFullYear();
        expect(birthYear).toBeGreaterThanOrEqual(minBirthYear);
        expect(birthYear).toBeLessThanOrEqual(maxBirthYear);
      });
    });

    it('应该能够按照教育程度筛选', async () => {
      const result = await residentService.searchResidents({
        keyword: '',
        villageId: testVillageId.toString(),
        filters: { education: 'bachelor' }
      }, operator);

      expect(result.residents.every(r => r.education?.degree === 'bachelor')).toBe(true);
    });

    it('应该能够按照特殊身份类型筛选', async () => {
      const result = await residentService.searchResidents({
        keyword: '',
        villageId: testVillageId.toString(),
        filters: { specialIdentityType: 'veteran' }
      }, operator);

      expect(result.residents.length).toBe(1);
      expect(result.residents[0].specialIdentities.some(s => s.type === 'veteran')).toBe(true);
    });

    it('应该能够按照家庭类型筛选', async () => {
      const result = await residentService.searchResidents({
        keyword: '',
        villageId: testVillageId.toString(),
        filters: { householdType: 'low_income' }
      }, operator);

      expect(result.residents.length).toBe(1);
      expect(result.residents[0].household?.householdType).toBe('low_income');
    });

    it('应该支持多个筛选条件同时使用', async () => {
      const result = await residentService.searchResidents({
        keyword: '',
        villageId: testVillageId.toString(),
        filters: {
          gender: 'male',
          occupation: 'teacher'
        }
      }, operator);

      expect(result.residents.length).toBe(1);
      expect(result.residents[0].gender).toBe('male');
      expect(result.residents[0].occupation).toBe('teacher');
    });
  });

  describe('搜索类型 (Search Types)', () => {
    it('应该支持全字段搜索', async () => {
      const result = await residentService.searchResidents({
        keyword: '张',
        searchType: 'all',
        villageId: testVillageId.toString()
      }, operator);

      expect(result.residents.length).toBeGreaterThanOrEqual(2);
    });

    it('应该支持仅姓名搜索', async () => {
      const result = await residentService.searchResidents({
        keyword: '张',
        searchType: 'name',
        villageId: testVillageId.toString()
      }, operator);

      expect(result.residents.every(r => r.name.includes('张'))).toBe(true);
    });

    it('应该支持仅手机号搜索', async () => {
      const result = await residentService.searchResidents({
        keyword: '138',
        searchType: 'phone',
        villageId: testVillageId.toString()
      }, operator);

      expect(result.residents.length).toBe(1);
      expect(result.residents[0].phone).toContain('138');
    });

    it('应该支持仅身份证号搜索', async () => {
      const result = await residentService.searchResidents({
        keyword: '110101199001011234',
        searchType: 'idCard',
        villageId: testVillageId.toString()
      }, operator);

      expect(result.residents.length).toBe(1);
      expect(result.residents[0].idCard).toContain('110101199001011234');
    });

    it('应该支持仅地址搜索', async () => {
      const result = await residentService.searchResidents({
        keyword: '西单大街',
        searchType: 'address',
        villageId: testVillageId.toString()
      }, operator);

      expect(result.residents.length).toBe(1);
      expect(result.residents[0].address?.detailAddress).toContain('西单大街');
    });

    it('应该支持仅特殊身份标签搜索', async () => {
      const result = await residentService.searchResidents({
        keyword: 'elderly',
        searchType: 'specialIdentity',
        villageId: testVillageId.toString()
      }, operator);

      expect(result.residents.length).toBe(1);
      expect(result.residents[0].specialIdentities.some(s => s.type === 'elderly')).toBe(true);
    });
  });

  describe('分页和排序 (Pagination and Sorting)', () => {
    it('应该正确计算分页信息', async () => {
      const result = await residentService.searchResidents({
        keyword: '',
        villageId: testVillageId.toString(),
        page: 1,
        limit: 5
      }, operator);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(5);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.pages).toBe(2);
    });

    it('应该返回正确的页数记录', async () => {
      const page1 = await residentService.searchResidents({
        keyword: '',
        villageId: testVillageId.toString(),
        page: 1,
        limit: 3
      }, operator);

      const page2 = await residentService.searchResidents({
        keyword: '',
        villageId: testVillageId.toString(),
        page: 2,
        limit: 3
      }, operator);

      expect(page1.residents.length).toBe(3);
      expect(page2.residents.length).toBe(3);

      const page1Ids = page1.residents.map(r => r._id.toString());
      const page2Ids = page2.residents.map(r => r._id.toString());
      const intersection = page1Ids.filter(id => page2Ids.includes(id));
      expect(intersection.length).toBe(0);
    });

    it('应该支持按姓名排序', async () => {
      const result = await residentService.fullTextSearchResidents({
        keyword: '',
        villageId: testVillageId.toString(),
        sortBy: 'name',
        sortOrder: 'asc'
      }, operator);

      const names = result.residents.map(r => r.name);
      const sortedNames = [...names].sort();

      expect(names).toEqual(sortedNames);
    });

    it('应该支持按创建时间排序', async () => {
      const result = await residentService.fullTextSearchResidents({
        keyword: '',
        villageId: testVillageId.toString(),
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }, operator);

      const dates = result.residents.map(r => new Date(r.createdAt).getTime());
      const sortedDates = [...dates].sort((a, b) => b - a);

      expect(dates).toEqual(sortedDates);
    });
  });

  describe('列表查询 (List Query)', () => {
    it('应该能够查询村民列表', async () => {
      const result = await residentService.listResidents({
        villageId: testVillageId.toString(),
        page: 1,
        limit: 10
      }, operator);

      expect(result.residents).toBeDefined();
      expect(result.residents.length).toBeGreaterThan(0);
      expect(result.pagination).toBeDefined();
    });

    it('应该支持按姓名模糊查询', async () => {
      const result = await residentService.listResidents({
        villageId: testVillageId.toString(),
        name: '张',
        page: 1,
        limit: 10
      }, operator);

      expect(result.residents.every(r => r.name.includes('张'))).toBe(true);
    });

    it('应该支持按性别筛选', async () => {
      const result = await residentService.listResidents({
        villageId: testVillageId.toString(),
        gender: 'female',
        page: 1,
        limit: 10
      }, operator);

      expect(result.residents.every(r => r.gender === 'female')).toBe(true);
    });

    it('应该支持按年龄段筛选', async () => {
      const result = await residentService.listResidents({
        villageId: testVillageId.toString(),
        ageRange: '20-30',
        page: 1,
        limit: 10
      }, operator);

      const currentYear = new Date().getFullYear();
      const minBirthYear = currentYear - 30;
      const maxBirthYear = currentYear - 20;

      result.residents.forEach(resident => {
        const birthYear = new Date(resident.birthDate).getFullYear();
        expect(birthYear).toBeGreaterThanOrEqual(minBirthYear);
        expect(birthYear).toBeLessThanOrEqual(maxBirthYear);
      });
    });

    it('应该支持排序', async () => {
      const result = await residentService.listResidents({
        villageId: testVillageId.toString(),
        sortBy: 'name',
        sortOrder: 'asc',
        page: 1,
        limit: 10
      }, operator);

      const names = result.residents.map(r => r.name);
      const sortedNames = [...names].sort();

      expect(names).toEqual(sortedNames);
    });
  });

  describe('边界情况 (Edge Cases)', () => {
    it('应该处理搜索无结果的情况', async () => {
      const result = await residentService.searchResidents({
        keyword: '不存在的人名',
        villageId: testVillageId.toString()
      }, operator);

      expect(result.residents.length).toBe(0);
      expect(result.pagination.total).toBe(0);
    });

    it('应该处理超过页码范围的情况', async () => {
      const result = await residentService.searchResidents({
        keyword: '',
        villageId: testVillageId.toString(),
        page: 100,
        limit: 10
      }, operator);

      expect(result.residents.length).toBe(0);
      expect(result.pagination.page).toBe(100);
    });

    it('应该处理空格关键词', async () => {
      const result = await residentService.searchResidents({
        keyword: '   张   ',
        villageId: testVillageId.toString()
      }, operator);

      expect(result.residents.length).toBeGreaterThan(0);
    });

    it('应该处理特殊字符关键词', async () => {
      const result = await residentService.searchResidents({
        keyword: '#@$%',
        villageId: testVillageId.toString()
      }, operator);

      expect(result).toBeDefined();
    });

    it('应该处理大写小写混合的关键词', async () => {
      const result = await residentService.searchResidents({
        keyword: 'ZHANG',
        villageId: testVillageId.toString()
      }, operator);

      expect(result.residents.length).toBeGreaterThan(0);
    });
  });

  describe('数据脱敏 (Data Masking)', () => {
    it('应该对非管理员角色脱敏身份证号', async () => {
      const nonAdminOperator = {
        userId: new mongoose.Types.ObjectId().toString(),
        username: 'testuser',
        name: '测试用户',
        role: 'resident',
        sessionId: 'test_session_123'
      };

      const result = await residentService.searchResidents({
        keyword: '张三',
        villageId: testVillageId.toString()
      }, nonAdminOperator);

      result.residents.forEach(resident => {
        if (resident.idCard) {
          expect(resident.idCard).toContain('*');
        }
      });
    });

    it('应该对非管理员角色脱敏手机号', async () => {
      const nonAdminOperator = {
        userId: new mongoose.Types.ObjectId().toString(),
        username: 'testuser',
        name: '测试用户',
        role: 'resident',
        sessionId: 'test_session_123'
      };

      const result = await residentService.searchResidents({
        keyword: '张三',
        villageId: testVillageId.toString()
      }, nonAdminOperator);

      result.residents.forEach(resident => {
        if (resident.phone) {
          expect(resident.phone).toContain('*');
        }
      });
    });
  });

  describe('村庄筛选 (Village Filtering)', () => {
    it('应该仅返回指定村庄的村民', async () => {
      const otherVillageId = new mongoose.Types.ObjectId();

      await Resident.create({
        name: '外人',
        idCard: '110101199901011299',
        phone: '12000120000',
        gender: 'male',
        birthDate: new Date('1999-01-01'),
        villageId: otherVillageId,
        address: {
          detailAddress: '其他村庄'
        },
        status: 'active'
      });

      const result = await residentService.searchResidents({
        keyword: '',
        villageId: testVillageId.toString()
      }, operator);

      expect(result.residents.every(r => r.villageId.toString() === testVillageId.toString())).toBe(true);
    });

    it('应该能够查询所有村庄的村民（当不指定村庄ID时）', async () => {
      const otherVillageId = new mongoose.Types.ObjectId();

      await Resident.create({
        name: '外人',
        idCard: '110101199901011299',
        phone: '12000120000',
        gender: 'male',
        birthDate: new Date('1999-01-01'),
        villageId: otherVillageId,
        address: {
          detailAddress: '其他村庄'
        },
        status: 'active'
      });

      const result = await residentService.searchResidents({
        keyword: ''
      }, operator);

      expect(result.residents.length).toBeGreaterThan(10);
    });
  });
});
