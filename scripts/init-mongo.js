// MongoDB 初始化脚本
// 创建智慧乡村平台数据库和初始数据

// 切换到智慧乡村数据库
db = db.getSiblingDB('smart_village');

// 创建用户角色
db.createRole({
  role: 'villageAdmin',
  privileges: [
    {
      resource: { db: 'smart_village', collection: '' },
      actions: ['find', 'insert', 'update', 'remove', 'createIndex', 'dropIndex']
    }
  ],
  roles: []
});

// 创建应用用户
db.createUser({
  user: 'village_app',
  pwd: 'app_password_2024',
  roles: [
    { role: 'villageAdmin', db: 'smart_village' }
  ]
});

// 创建集合和索引
print('开始创建集合和索引...');

// 村委会集合
db.createCollection('committees');
db.committees.createIndex({ villageId: 1 });
db.committees.createIndex({ position: 1 });

// 村民集合
db.createCollection('residents');
db.residents.createIndex({ idCard: 1 }, { unique: true });
db.residents.createIndex({ householdId: 1 });
db.residents.createIndex({ villageId: 1 });
db.residents.createIndex({ name: 'text', phone: 1 });

// 用户集合
db.createCollection('users');
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

// 公告集合
db.createCollection('announcements');
db.announcements.createIndex({ villageId: 1 });
db.announcements.createIndex({ createdAt: -1 });
db.announcements.createIndex({ type: 1 });

// 财务集合
db.createCollection('finances');
db.finances.createIndex({ villageId: 1 });
db.finances.createIndex({ type: 1 });
db.finances.createIndex({ createdAt: -1 });

// 会议记录集合
db.createCollection('meetings');
db.meetings.createIndex({ villageId: 1 });
db.meetings.createIndex({ date: -1 });

// 投票集合
db.createCollection('votes');
db.votes.createIndex({ villageId: 1 });
db.votes.createIndex({ createdAt: -1 });

// 服务申请集合
db.createCollection('services');
db.services.createIndex({ residentId: 1 });
db.services.createIndex({ type: 1 });
db.services.createIndex({ status: 1 });

// 通知集合
db.createCollection('notifications');
db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ createdAt: -1 });
db.notifications.createIndex({ read: 1 });

// 日志集合
db.createCollection('audit_logs');
db.audit_logs.createIndex({ userId: 1 });
db.audit_logs.createIndex({ action: 1 });
db.audit_logs.createIndex({ createdAt: -1 });

// 插入初始管理员数据
print('插入初始管理员数据...');
db.users.insertOne({
  username: 'admin',
  email: 'admin@smartvillage.com',
  password: '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQ', // bcrypt哈希 (password: admin123)
  role: 'admin',
  profile: {
    name: '系统管理员',
    phone: '13800000000',
    avatar: '/uploads/avatars/admin.png'
  },
  permissions: [
    'user.manage',
    'committee.manage',
    'resident.manage',
    'finance.manage',
    'announcement.manage',
    'system.manage'
  ],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// 插入示例村庄数据
print('插入示例村庄数据...');
db.committees.insertOne({
  villageId: 'demo_village_001',
  villageName: '智慧乡村示范村',
  address: '示范省示范市示范县示范镇示范村',
  committee: {
    secretary: {
      name: '张书记',
      phone: '13800000001',
      email: 'secretary@village.com',
      termStart: new Date('2021-01-01'),
      termEnd: new Date('2025-12-31')
    },
    director: {
      name: '李村长',
      phone: '13800000002',
      email: 'director@village.com',
      termStart: new Date('2021-01-01'),
      termEnd: new Date('2025-12-31')
    },
    members: [
      {
        name: '王会计',
        position: '会计',
        phone: '13800000003',
        email: 'accountant@village.com'
      },
      {
        name: '赵妇女主任',
        position: '妇女主任',
        phone: '13800000004',
        email: 'women@village.com'
      }
    ]
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// 插入示例公告数据
print('插入示例公告数据...');
db.announcements.insertMany([
  {
    villageId: 'demo_village_001',
    title: '关于做好2024年春耕备耕工作的通知',
    content: '各位村民：\n\n为做好2024年春耕备耕工作，确保农业生产顺利进行，现将有关事项通知如下：\n\n1. 农资准备：请各位村民提前准备好种子、化肥、农药等农资产品\n2. 农机维护：及时检查维护农机设备，确保正常运行\n3. 技术培训：村里将组织农业技术培训，请有意向的村民报名参加\n\n特此通知！',
    type: 'notice',
    publisher: '村委会',
    priority: 'high',
    attachments: [],
    readCount: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    villageId: 'demo_village_001',
    title: '2024年春节期间值班安排',
    content: '春节期间村委会值班安排如下：\n\n2月9日（除夕）：张书记 13800000001\n2月10日（初一）：李村长 13800000002\n2月11日（初二）：王会计 13800000003\n\n如遇紧急情况，请联系值班人员。',
    type: 'notice',
    publisher: '村委会',
    priority: 'medium',
    attachments: [],
    readCount: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print('MongoDB 初始化完成！');
print('数据库：smart_village');
print('用户：village_app / admin');
print('管理界面：http://localhost:8081 (admin/admin123)');
print('Redis管理：http://localhost:8082');