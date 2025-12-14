const mongoose = require('mongoose');
const { Villager, News, Affair } = require('../../src/models');
const TestHelpers = require('../helpers');

// Skip model tests if database is not available
const describeModels = mongoose.connection.readyState === 1 ? describe : describe.skip;

describeModels('Models', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await TestHelpers.clearDatabase();
    }
  });

  describe('Villager Model', () => {
    test('should create a valid villager', async () => {
      const villagerData = {
        name: '张三',
        idCard: '110101199001010001',
        phone: '13800138000',
        address: '北京市朝阳区测试街道1号',
        householdId: 'HH001'
      };

      const villager = new Villager(villagerData);
      const savedVillager = await villager.save();

      expect(savedVillager._id).toBeDefined();
      expect(savedVillager.name).toBe(villagerData.name);
      expect(savedVillager.idCard).toBe(villagerData.idCard);
      expect(savedVillager.phone).toBe(villagerData.phone);
      expect(savedVillager.address).toBe(villagerData.address);
      expect(savedVillager.householdId).toBe(villagerData.householdId);
      expect(savedVillager.status).toBe('在住'); // default value
      expect(savedVillager.createdAt).toBeDefined();
      expect(savedVillager.updatedAt).toBeDefined();
    });

    test('should require name field', async () => {
      const villager = new Villager({
        idCard: '110101199001010002',
        phone: '13800138001',
        address: '测试地址',
        householdId: 'HH002'
      });

      let error;
      try {
        await villager.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
    });

    test('should require unique idCard', async () => {
      const villagerData1 = {
        name: '张三',
        idCard: '110101199001010003',
        phone: '13800138000',
        address: '测试地址1',
        householdId: 'HH003'
      };

      const villagerData2 = {
        name: '李四',
        idCard: '110101199001010003', // same idCard
        phone: '13800138001',
        address: '测试地址2',
        householdId: 'HH004'
      };

      await new Villager(villagerData1).save();

      let error;
      try {
        await new Villager(villagerData2).save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB duplicate key error
    });

    test('should validate status enum', async () => {
      const villager = new Villager({
        name: '王五',
        idCard: '110101199001010004',
        phone: '13800138002',
        address: '测试地址',
        householdId: 'HH005',
        status: '无效状态'
      });

      let error;
      try {
        await villager.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.status).toBeDefined();
    });
  });

  describe('News Model', () => {
    test('should create a valid news article', async () => {
      const newsData = {
        title: '测试新闻标题',
        content: '这是一条测试新闻内容',
        author: '管理员',
        category: '通知公告',
        status: '已发布',
        publishedAt: new Date()
      };

      const news = new News(newsData);
      const savedNews = await news.save();

      expect(savedNews._id).toBeDefined();
      expect(savedNews.title).toBe(newsData.title);
      expect(savedNews.content).toBe(newsData.content);
      expect(savedNews.author).toBe(newsData.author);
      expect(savedNews.category).toBe(newsData.category);
      expect(savedNews.status).toBe(newsData.status);
      expect(savedNews.views).toBe(0); // default value
      expect(savedNews.createdAt).toBeDefined();
    });

    test('should require title and content', async () => {
      const news = new News({
        author: '管理员'
      });

      let error;
      try {
        await news.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.title).toBeDefined();
      expect(error.errors.content).toBeDefined();
    });

    test('should validate category enum', async () => {
      const news = new News({
        title: '测试标题',
        content: '测试内容',
        author: '管理员',
        category: '无效分类'
      });

      let error;
      try {
        await news.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.category).toBeDefined();
    });
  });

  describe('Affair Model', () => {
    test('should create a valid affair', async () => {
      const affairData = {
        title: '村道维修决议',
        description: '关于村道维修的决议讨论',
        type: '民主决策',
        status: '讨论中',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      const affair = new Affair(affairData);
      const savedAffair = await affair.save();

      expect(savedAffair._id).toBeDefined();
      expect(savedAffair.title).toBe(affairData.title);
      expect(savedAffair.description).toBe(affairData.description);
      expect(savedAffair.type).toBe(affairData.type);
      expect(savedAffair.status).toBe(affairData.status);
      expect(savedAffair.votes.agree).toBe(0);
      expect(savedAffair.votes.disagree).toBe(0);
      expect(savedAffair.votes.abstain).toBe(0);
    });

    test('should require title, description, and type', async () => {
      const affair = new Affair({});

      let error;
      try {
        await affair.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.title).toBeDefined();
      expect(error.errors.description).toBeDefined();
      expect(error.errors.type).toBeDefined();
    });

    test('should validate type enum', async () => {
      const affair = new Affair({
        title: '测试标题',
        description: '测试描述',
        type: '无效类型'
      });

      let error;
      try {
        await affair.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.type).toBeDefined();
    });

    test('should have default vote counts', async () => {
      const affair = new Affair({
        title: '测试标题',
        description: '测试描述',
        type: '民主决策'
      });

      const savedAffair = await affair.save();

      expect(savedAffair.votes.agree).toBe(0);
      expect(savedAffair.votes.disagree).toBe(0);
      expect(savedAffair.votes.abstain).toBe(0);
    });
  });
});