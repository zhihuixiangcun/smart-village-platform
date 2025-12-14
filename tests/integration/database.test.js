const mongoose = require('mongoose');
const { Villager, News, Affair } = require('../../src/models');
const TestHelpers = require('../helpers');

// Skip database tests if not connected
const describeDatabase = mongoose.connection.readyState === 1 ? describe : describe.skip;

describeDatabase('Database Integration Tests', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await TestHelpers.clearDatabase();
    }
  });

  describe('Database Connection', () => {
    test('should be connected to test database', () => {
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
    });
  });

  describe('Villager Database Operations', () => {
    test('should create and save villager to database', async () => {
      const villagerData = {
        name: '数据库测试用户',
        idCard: '110101199001010010',
        phone: '13800138010',
        address: '测试地址10号',
        householdId: 'HH010'
      };

      const villager = new Villager(villagerData);
      const savedVillager = await villager.save();

      expect(savedVillager._id).toBeDefined();
      expect(savedVillager.name).toBe(villagerData.name);

      // Verify it's actually in the database
      const foundVillager = await Villager.findById(savedVillager._id);
      expect(foundVillager).toBeDefined();
      expect(foundVillager.name).toBe(villagerData.name);
    });

    test('should find villager by idCard', async () => {
      const villagerData = {
        name: '查找测试用户',
        idCard: '110101199001010011',
        phone: '13800138011',
        address: '测试地址11号',
        householdId: 'HH011'
      };

      await new Villager(villagerData).save();

      const foundVillager = await Villager.findOne({ idCard: villagerData.idCard });
      expect(foundVillager).toBeDefined();
      expect(foundVillager.name).toBe(villagerData.name);
    });

    test('should update villager status', async () => {
      const villager = await new Villager({
        name: '状态测试用户',
        idCard: '110101199001010012',
        phone: '13800138012',
        address: '测试地址12号',
        householdId: 'HH012'
      }).save();

      expect(villager.status).toBe('在住'); // default value

      villager.status = '外出';
      await villager.save();

      const updatedVillager = await Villager.findById(villager._id);
      expect(updatedVillager.status).toBe('外出');
    });

    test('should delete villager', async () => {
      const villager = await new Villager({
        name: '删除测试用户',
        idCard: '110101199001010013',
        phone: '13800138013',
        address: '测试地址13号',
        householdId: 'HH013'
      }).save();

      await Villager.findByIdAndDelete(villager._id);

      const deletedVillager = await Villager.findById(villager._id);
      expect(deletedVillager).toBeNull();
    });
  });

  describe('News Database Operations', () => {
    test('should create and save news article', async () => {
      const newsData = {
        title: '数据库新闻测试',
        content: '这是数据库新闻测试内容',
        author: '测试管理员',
        category: '通知公告',
        status: '已发布',
        publishedAt: new Date()
      };

      const news = new News(newsData);
      const savedNews = await news.save();

      expect(savedNews._id).toBeDefined();
      expect(savedNews.title).toBe(newsData.title);

      // Verify in database
      const foundNews = await News.findById(savedNews._id);
      expect(foundNews.title).toBe(newsData.title);
    });

    test('should increment news views', async () => {
      const news = await new News({
        title: '浏览量测试新闻',
        content: '测试内容',
        author: '测试作者'
      }).save();

      expect(news.views).toBe(0);

      await News.findByIdAndUpdate(news._id, { $inc: { views: 1 } });

      const updatedNews = await News.findById(news._id);
      expect(updatedNews.views).toBe(1);
    });

    test('should find news by category', async () => {
      await new News({
        title: '政策新闻1',
        content: '政策内容1',
        author: '作者1',
        category: '政策宣传'
      }).save();

      await new News({
        title: '通知新闻1',
        content: '通知内容1',
        author: '作者2',
        category: '通知公告'
      }).save();

      const policyNews = await News.find({ category: '政策宣传' });
      const noticeNews = await News.find({ category: '通知公告' });

      expect(policyNews).toHaveLength(1);
      expect(noticeNews).toHaveLength(1);
      expect(policyNews[0].title).toBe('政策新闻1');
      expect(noticeNews[0].title).toBe('通知新闻1');
    });
  });

  describe('Affair Database Operations', () => {
    test('should create affair with vote counts', async () => {
      const affairData = {
        title: '数据库村务测试',
        description: '数据库村务测试描述',
        type: '民主决策',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const affair = new Affair(affairData);
      const savedAffair = await affair.save();

      expect(savedAffair.votes.agree).toBe(0);
      expect(savedAffair.votes.disagree).toBe(0);
      expect(savedAffair.votes.abstain).toBe(0);

      // Test vote increment
      await Affair.findByIdAndUpdate(savedAffair._id, {
        $inc: { 'votes.agree': 1, 'votes.disagree': 2 }
      });

      const updatedAffair = await Affair.findById(savedAffair._id);
      expect(updatedAffair.votes.agree).toBe(1);
      expect(updatedAffair.votes.disagree).toBe(2);
      expect(updatedAffair.votes.abstain).toBe(0);
    });
  });
});