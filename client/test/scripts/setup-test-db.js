const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const { MongoClient } = require('mongodb')

// 测试数据库配置
const TEST_DB_CONFIG = {
  uri: process.env.TEST_MONGO_URI || 'mongodb://localhost:27017',
  dbName: 'smart_village_test',
  collections: [
    'users',
    'residents',
    'committee',
    'feedbacks',
    'announcements',
    'finance',
    'notifications'
  ]
}

// 测试数据目录
const TEST_DATA_DIR = path.join(__dirname, '../data')
const SEED_DATA_FILE = path.join(TEST_DATA_DIR, 'seed-data.json')

class TestDatabaseSetup {
  constructor() {
    this.client = null
    this.db = null
  }

  async connect() {
    console.log('🔌 Connecting to test database...')
    try {
      this.client = new MongoClient(TEST_DB_CONFIG.uri)
      await this.client.connect()
      this.db = this.client.db(TEST_DB_CONFIG.dbName)
      console.log('✅ Connected to test database')
    } catch (error) {
      console.error('❌ Failed to connect to test database:', error.message)
      throw error
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close()
      console.log('🔌 Disconnected from test database')
    }
  }

  async clearDatabase() {
    console.log('🧹 Clearing test database...')
    try {
      for (const collectionName of TEST_DB_CONFIG.collections) {
        await this.db.collection(collectionName).deleteMany({})
      }
      console.log('✅ Test database cleared')
    } catch (error) {
      console.error('❌ Failed to clear database:', error.message)
      throw error
    }
  }

  async createIndexes() {
    console.log('📊 Creating indexes...')
    const indexes = [
      {
        collection: 'users',
        index: { username: 1 },
        options: { unique: true }
      },
      {
        collection: 'residents',
        index: { idCard: 1 },
        options: { unique: true }
      },
      {
        collection: 'residents',
        index: { villageId: 1, name: 1 }
      },
      {
        collection: 'feedbacks',
        index: { userId: 1, createTime: -1 }
      },
      {
        collection: 'feedbacks',
        index: { status: 1, type: 1 }
      },
      {
        collection: 'announcements',
        index: { villageId: 1, publishDate: -1 }
      },
      {
        collection: 'notifications',
        index: { userId: 1, isRead: 1, createTime: -1 }
      }
    ]

    for (const { collection, index, options } of indexes) {
      try {
        await this.db.collection(collection).createIndex(index, options)
        console.log(`✅ Index created for ${collection}`)
      } catch (error) {
        console.log(`⚠️  Index already exists for ${collection}`)
      }
    }
  }

  async seedTestData() {
    console.log('🌱 Seeding test data...')

    // 创建测试用户
    const testUsers = [
      {
        _id: 'user-admin',
        username: 'testadmin',
        password: '$2b$10$testhashedpassword', // admin123
        name: '测试管理员',
        role: 'admin',
        villageId: 'village-test',
        permissions: ['read', 'write', 'delete', 'manage'],
        email: 'admin@test.com',
        phone: '13800138001',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: 'user-committee',
        username: 'testcommittee',
        password: '$2b$10$testhashedpassword', // committee123
        name: '测试村委',
        role: 'committee',
        villageId: 'village-test',
        permissions: ['read', 'write'],
        email: 'committee@test.com',
        phone: '13800138002',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: 'user-resident',
        username: 'testresident',
        password: '$2b$10$testhashedpassword', // resident123
        name: '测试村民',
        role: 'resident',
        villageId: 'village-test',
        permissions: ['read'],
        email: 'resident@test.com',
        phone: '13800138003',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    // 创建测试村委
    const testCommittee = [
      {
        _id: 'committee-001',
        name: '张书记',
        position: '村支书',
        phone: '13900139001',
        email: 'zhang@village.com',
        avatar: '/images/avatars/zhang.jpg',
        department: '村委会',
        duties: '负责村务全面工作',
        startDate: '2020-01-01',
        isActive: true,
        villageId: 'village-test',
        createdBy: 'user-admin',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: 'committee-002',
        name: '李村长',
        position: '村长',
        phone: '13900139002',
        email: 'li@village.com',
        avatar: '/images/avatars/li.jpg',
        department: '村委会',
        duties: '协助村支书处理村务',
        startDate: '2021-01-01',
        isActive: true,
        villageId: 'village-test',
        createdBy: 'user-admin',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    // 创建测试村民
    const testResidents = Array.from({ length: 100 }, (_, i) => ({
      _id: `resident-${String(i + 1).padStart(3, '0')}`,
      name: `测试村民${i + 1}`,
      idCard: `3301061990${String(i).padStart(2, '0')}01001${String(i).padStart(4, '0')}`,
      phone: `1380013${String(i).padStart(4, '0')}`,
      address: `测试村${i + 1}号`,
      familyType: i % 3 === 0 ? '低保户' : i % 2 === 0 ? '独生户' : '普通户',
      familyMembers: Math.floor(Math.random() * 5) + 1,
      householdCode: `HH${String(i + 1).padStart(6, '0')}`,
      villageId: 'village-test',
      createdBy: 'user-admin',
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }))

    // 创建测试反馈
    const testFeedbacks = Array.from({ length: 50 }, (_, i) => ({
      _id: `feedback-${String(i + 1).padStart(3, '0')}`,
      userId: `user-${(i % 3) + 1}`,
      userName: testUsers[i % 3].name,
      type: ['suggestion', 'complaint', 'praise', 'facility'][i % 4],
      title: `测试反馈标题${i + 1}`,
      content: `这是第${i + 1}条测试反馈的内容，用于测试系统功能。`,
      status: ['pending', 'processing', 'resolved'][i % 3],
      priority: ['low', 'medium', 'high'][i % 3],
      attachments: i % 3 === 0 ? [`attachment-${i + 1}.jpg`] : [],
      createTime: new Date(Date.now() - i * 6 * 60 * 60 * 1000),
      updateTime: new Date(Date.now() - i * 3 * 60 * 60 * 1000),
      replyTime: i % 2 === 0 ? new Date(Date.now() - i * 2 * 60 * 60 * 1000) : null,
      replyContent: i % 2 === 0 ? `这是第${i + 1}条反馈的回复内容。` : null,
      replyUser: i % 2 === 0 ? testCommittee[i % 2].name : null,
      handlerId: i % 3 === 0 ? 'committee-001' : null,
      villageId: 'village-test'
    }))

    // 创建测试公告
    const testAnnouncements = Array.from({ length: 30 }, (_, i) => ({
      _id: `announcement-${String(i + 1).padStart(3, '0')}`,
      title: `测试公告${i + 1}`,
      content: `这是第${i + 1}条测试公告的内容。`,
      type: ['政策宣传', '会议通知', '村务公开', '温馨提示'][i % 4],
      priority: i % 4 === 0 ? 'high' : 'normal',
      status: 'published',
      publishDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      publisher: testCommittee[i % 2].name,
      publisherId: testCommittee[i % 2]._id,
      attachments: i % 4 === 0 ? [`announcement-${i + 1}.pdf`] : [],
      viewCount: Math.floor(Math.random() * 500),
      villageId: 'village-test',
      createdBy: 'user-admin',
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }))

    // 创建测试财务记录
    const testFinance = Array.from({ length: 80 }, (_, i) => ({
      _id: `finance-${String(i + 1).padStart(3, '0')}`,
      type: i % 2 === 0 ? 'income' : 'expense',
      amount: Math.floor(Math.random() * 100000) + 1000,
      category: ['补贴收入', '办公费用', '项目支出', '其他收入', '其他支出'][i % 5],
      description: `财务记录${i + 1}的说明`,
      date: new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString().split('T')[0],
      approver: testCommittee[i % 2].name,
      approverId: testCommittee[i % 2]._id,
      status: 'approved',
      attachments: i % 3 === 0 ? [`receipt-${i + 1}.jpg`] : [],
      villageId: 'village-test',
      createdBy: 'user-admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }))

    // 创建测试通知
    const testNotifications = Array.from({ length: 100 }, (_, i) => ({
      _id: `notification-${String(i + 1).padStart(3, '0')}`,
      userId: `user-${(i % 3) + 1}`,
      type: ['feedback_reply', 'announcement', 'system', 'reminder'][i % 4],
      title: `通知标题${i + 1}`,
      content: `这是第${i + 1}条通知的内容。`,
      isRead: i % 2 === 0,
      createTime: new Date(Date.now() - i * 30 * 60 * 1000),
      readTime: i % 2 === 0 ? new Date(Date.now() - i * 20 * 60 * 1000) : null,
      relatedId: i % 4 === 0 ? `feedback-${String(i + 1).padStart(3, '0')}` : null,
      relatedType: i % 4 === 0 ? 'feedback' : null
    }))

    // 插入数据
    try {
      await this.db.collection('users').insertMany(testUsers)
      await this.db.collection('committee').insertMany(testCommittee)
      await this.db.collection('residents').insertMany(testResidents)
      await this.db.collection('feedbacks').insertMany(testFeedbacks)
      await this.db.collection('announcements').insertMany(testAnnouncements)
      await this.db.collection('finance').insertMany(testFinance)
      await this.db.collection('notifications').insertMany(testNotifications)

      console.log('✅ Test data seeded successfully')
    } catch (error) {
      console.error('❌ Failed to seed test data:', error.message)
      throw error
    }
  }

  async setup() {
    console.log('🚀 Setting up test database...')
    try {
      await this.connect()
      await this.clearDatabase()
      await this.createIndexes()
      await this.seedTestData()

      // 保存测试配置
      const testConfig = {
        database: TEST_DB_CONFIG,
        testUsers: {
          admin: { username: 'testadmin', password: 'admin123' },
          committee: { username: 'testcommittee', password: 'committee123' },
          resident: { username: 'testresident', password: 'resident123' }
        },
        testDataCounts: {
          users: 3,
          committee: 2,
          residents: 100,
          feedbacks: 50,
          announcements: 30,
          finance: 80,
          notifications: 100
        }
      }

      // 确保测试数据目录存在
      if (!fs.existsSync(TEST_DATA_DIR)) {
        fs.mkdirSync(TEST_DATA_DIR, { recursive: true })
      }

      // 保存测试配置
      fs.writeFileSync(
        path.join(TEST_DATA_DIR, 'test-config.json'),
        JSON.stringify(testConfig, null, 2)
      )

      console.log('✅ Test database setup completed')
      return testConfig
    } catch (error) {
      console.error('❌ Test database setup failed:', error.message)
      throw error
    } finally {
      await this.disconnect()
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up test database...')
    try {
      await this.connect()
      await this.clearDatabase()
      console.log('✅ Test database cleaned up')
    } catch (error) {
      console.error('❌ Failed to cleanup test database:', error.message)
    } finally {
      await this.disconnect()
    }
  }
}

// 命令行执行
async function main() {
  const setup = new TestDatabaseSetup()
  const command = process.argv[2]

  try {
    switch (command) {
      case 'setup':
        await setup.setup()
        break
      case 'cleanup':
        await setup.cleanup()
        break
      default:
        console.log('Usage: node setup-test-db.js [setup|cleanup]')
        process.exit(1)
    }
  } catch (error) {
    console.error('Operation failed:', error.message)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

module.exports = TestDatabaseSetup