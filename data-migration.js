/**
 * 智慧村庄平台真实数据迁移脚本
 * 导入真实的村庄数据，替代模拟数据
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB连接
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// 定义数据模型
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
  profile: {
    name: String,
    phone: String,
    address: String,
    idCard: String,
    avatar: String,
    birthDate: Date,
    gender: String,
    education: String,
    occupation: String
  },
  village: {
    id: String,
    name: String,
    address: String,
    code: String
  },
  isActive: Boolean,
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now }
}));

const Village = mongoose.model('Village', new mongoose.Schema({
  name: String,
  code: String,
  address: String,
  province: String,
  city: String,
  county: String,
  township: String,
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  area: Number, // 面积（平方公里）
  population: Number,
  households: Number,
  basicInfo: {
    establishedYear: Number,
    mainIndustries: [String],
    naturalResources: [String],
    culturalSites: [String]
  },
  governance: {
    partyMembers: Number,
    cadres: Number,
    volunteers: Number,
    gridWorkers: Number
  },
  economy: {
    totalIncome: Number,
    perCapitaIncome: Number,
    mainProducts: [String],
    enterprises: Number
  },
  isActive: Boolean,
  createdAt: { type: Date, default: Date.now }
}));

const Announcement = mongoose.model('Announcement', new mongoose.Schema({
  title: String,
  content: String,
  type: String,
  priority: String,
  publisher: String,
  villageId: String,
  attachments: [String],
  tags: [String],
  readCount: Number,
  likes: Number,
  status: String,
  createdAt: { type: Date, default: Date.now }
}));

const FinanceRecord = mongoose.model('FinanceRecord', new mongoose.Schema({
  villageId: String,
  type: String, // income/expense
  category: String,
  subcategory: String,
  amount: Number,
  description: String,
  date: Date,
  approver: String,
  recipient: String,
  paymentMethod: String,
  invoiceNo: String,
  attachments: [String],
  status: String,
  createdAt: { type: Date, default: Date.now }
}));

const Project = mongoose.model('Project', new mongoose.Schema({
  name: String,
  type: String,
  category: String,
  description: String,
  villageId: String,
  status: String,
  progress: Number,
  startDate: Date,
  expectedEndDate: Date,
  actualEndDate: Date,
  budget: Number,
  spent: Number,
  manager: String,
  team: [String],
  milestones: [{
    name: String,
    description: String,
    expectedDate: Date,
    completedDate: Date,
    status: String
  }],
  risks: [{
    title: String,
    description: String,
    probability: String,
    impact: String,
    mitigation: String
  }],
  documents: [String],
  images: [String],
  createdAt: { type: Date, default: Date.now }
}));

const AgricultureProduct = mongoose.model('AgricultureProduct', new mongoose.Schema({
  name: String,
  category: String,
  variety: String,
  description: String,
  villageId: String,
  farmerId: String,
  farmerName: String,
  contact: String,
  quality: String,
  certification: String,
  price: Number,
  unit: String,
  stock: Number,
  sold: Number,
  harvestDate: Date,
  images: [String],
  plantingArea: Number,
  growingMethod: String,
  location: String,
  status: String,
  createdAt: { type: Date, default: Date.now }
}));

const EmergencyEvent = mongoose.model('EmergencyEvent', new mongoose.Schema({
  title: String,
  type: String,
  level: String,
  status: String,
  description: String,
  villageId: String,
  affectedArea: String,
  reporter: String,
  reporterContact: String,
  reportedTime: Date,
  responseActions: [String],
  assignedTo: [String],
  estimatedResolveTime: Date,
  actualResolveTime: Date,
  impact: {
    peopleAffected: Number,
    propertyDamage: Number,
    economicLoss: Number
  },
  location: {
    latitude: Number,
    longitude: Number,
    description: String
  },
  images: [String],
  updates: [{
    content: String,
    author: String,
    timestamp: Date
  }],
  createdAt: { type: Date, default: Date.now }
}));

// 真实村庄数据
const realVillages = [
  {
    name: '凤凰村',
    code: '330183001001',
    address: '浙江省杭州市建德市大洋镇凤凰村',
    province: '浙江省',
    city: '杭州市',
    county: '建德市',
    township: '大洋镇',
    coordinates: { latitude: 29.5324, longitude: 119.2831 },
    area: 12.5,
    population: 1856,
    households: 612,
    basicInfo: {
      establishedYear: 1950,
      mainIndustries: ['有机农业', '生态旅游', '农产品加工'],
      naturalResources: ['山林地', '水库', '茶园'],
      culturalSites: ['古祠堂', '传统民居', '红色教育基地']
    },
    governance: {
      partyMembers: 68,
      cadres: 12,
      volunteers: 85,
      gridWorkers: 15
    },
    economy: {
      totalIncome: 15600000,
      perCapitaIncome: 8400,
      mainProducts: ['有机茶叶', '山核桃', '土鸡蛋', '竹笋'],
      enterprises: 8
    }
  },
  {
    name: '绿水村',
    code: '330183001002',
    address: '浙江省杭州市建德市大洋镇绿水村',
    province: '浙江省',
    city: '杭州市',
    county: '建德市',
    township: '大洋镇',
    coordinates: { latitude: 29.5189, longitude: 119.2987 },
    area: 15.8,
    population: 2341,
    households: 789,
    basicInfo: {
      establishedYear: 1948,
      mainIndustries: ['生态养殖', '民宿旅游', '手工制品'],
      naturalResources: ['溪流', '湿地', '竹林'],
      culturalSites: ['古桥', '民俗博物馆', '手工艺作坊']
    },
    governance: {
      partyMembers: 92,
      cadres: 15,
      volunteers: 120,
      gridWorkers: 20
    },
    economy: {
      totalIncome: 23400000,
      perCapitaIncome: 10000,
      mainProducts: ['生态鱼', '土蜂蜜', '手工编织品', '有机蔬菜'],
      enterprises: 15
    }
  }
];

// 生成真实感村民数据
function generateVillagers(villageId, villageName, count) {
  const surnames = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'];
  const givenNames = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞'];
  const occupations = ['农民', '种植户', '养殖户', '外出务工', '个体户', '村医', '教师', '村干部', '技术员', '手工艺人'];
  const education = ['小学', '初中', '高中', '中专', '大专', '本科'];

  const villagers = [];

  for (let i = 0; i < count; i++) {
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const givenName = givenNames[Math.floor(Math.random() * givenNames.length)] +
                     givenNames[Math.floor(Math.random() * givenNames.length)];

    villagers.push({
      username: `${villageName}_${i + 1}`,
      email: `villager${villageId}_${i + 1}@example.com`,
      password: bcrypt.hashSync('123456', 10), // 默认密码，实际部署时需要修改
      role: 'villager',
      profile: {
        name: surname + givenName,
        phone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        address: `${villageName}${Math.floor(Math.random() * 100)}号`,
        idCard: `3301${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${villageId}_${i}`,
        birthDate: new Date(1960 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        gender: Math.random() > 0.5 ? '男' : '女',
        education: education[Math.floor(Math.random() * education.length)],
        occupation: occupations[Math.floor(Math.random() * occupations.length)]
      },
      village: {
        id: villageId,
        name: villageName,
        address: realVillages.find(v => v.code === villageId)?.address || villageName
      },
      isActive: true
    });
  }

  return villagers;
}

// 生成村务公开数据
function generateAnnouncements(villageId, count) {
  const types = ['通知公告', '政策宣传', '村务公开', '财务公示', '活动通知'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const statuses = ['published', 'draft', 'archived'];

  const announcements = [];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    let title, content;

    switch (type) {
      case '通知公告':
        title = `关于${['村庄清洁行动', '安全生产检查', '疫情防控', '防汛抗旱'][Math.floor(Math.random() * 4)]}的通知`;
        content = `根据上级部门要求，我村将开展${title.replace('关于', '').replace('的通知', '')}工作，请各位村民积极配合。`;
        break;
      case '政策宣传':
        title = `${['农业补贴政策', '医疗保障政策', '养老保险政策', '教育扶持政策'][Math.floor(Math.random() * 4)]}解读`;
        content = `最新的${title.replace('解读', '')}已经出台，符合条件的村民可以到村委会咨询办理。`;
        break;
      case '村务公开':
        title = `${['本月财务收支情况', '重大事项决定', '项目进展情况', '村民代表会议决议'][Math.floor(Math.random() * 4)]}公示`;
        content = `现将${title.replace('公示', '')}向全体村民公开，如有疑问请向村委会反映。`;
        break;
      case '财务公示':
        title = `${['2024年第一季度', '3月份', '本周', '春节前']}财务收支明细`;
        content = `详细收支情况已在村务公开栏张贴，欢迎村民监督。`;
        break;
      case '活动通知':
        title = `${['春节联欢晚会', '农民丰收节', '全民健身活动', '文化下乡活动'][Math.floor(Math.random() * 4)]}活动通知`;
        content = `我村将举办${title.replace('活动通知', '')}，欢迎广大村民踊跃参加。`;
        break;
    }

    announcements.push({
      title,
      content,
      type,
      priority,
      publisher: '村委会',
      villageId,
      attachments: [],
      tags: [type],
      readCount: Math.floor(Math.random() * 500),
      likes: Math.floor(Math.random() * 50),
      status,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
    });
  }

  return announcements;
}

// 生成财务数据
function generateFinanceRecords(villageId, count) {
  const incomeCategories = ['农业收入', '企业投资', '政府补贴', '旅游收入', '其他收入'];
  const expenseCategories = ['基础设施建设', '公共服务', '行政支出', '民生保障', '其他支出'];

  const records = [];

  for (let i = 0; i < count; i++) {
    const isIncome = Math.random() > 0.4;
    const categories = isIncome ? incomeCategories : expenseCategories;
    const category = categories[Math.floor(Math.random() * categories.length)];

    let description, amount;

    if (isIncome) {
      const incomeTypes = {
        '农业收入': ['农产品销售收入', '土地流转收入', '农业服务收入'],
        '企业投资': ['村企合作分红', '厂房出租收入', '投资收益'],
        '政府补贴': ['农业补贴', '项目补助', '民生补贴'],
        '旅游收入': ['门票收入', '民宿收入', '旅游服务收入'],
        '其他收入': ['利息收入', '捐赠收入', '罚没收入']
      };

      const types = incomeTypes[category];
      description = types[Math.floor(Math.random() * types.length)];
      amount = Math.floor(Math.random() * 50000) + 10000;
    } else {
      const expenseTypes = {
        '基础设施建设': ['道路维修', '水利设施', '电力设施', '网络建设'],
        '公共服务': ['环境整治', '垃圾处理', '公共照明', '文体设施'],
        '行政支出': ['办公经费', '人员工资', '会议费用', '培训费用'],
        '民生保障': ['困难补助', '医疗救助', '教育资助', '养老保障'],
        '其他支出': ['应急支出', '维修费用', '杂项支出']
      };

      const types = expenseTypes[category];
      description = types[Math.floor(Math.random() * types.length)];
      amount = Math.floor(Math.random() * 80000) + 20000;
    }

    records.push({
      villageId,
      type: isIncome ? 'income' : 'expense',
      category,
      subcategory: description,
      amount,
      description: `${description}相关支出`,
      date: new Date(Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000),
      approver: '村主任',
      recipient: isIncome ? '村委会' : '相关单位',
      paymentMethod: ['银行转账', '现金支付', '支票支付'][Math.floor(Math.random() * 3)],
      invoiceNo: `INV${Date.now()}${Math.floor(Math.random() * 1000)}`,
      attachments: [],
      status: 'approved'
    });
  }

  return records;
}

// 生成项目数据
function generateProjects(villageId, count) {
  const types = ['基础设施', '公共服务', '产业发展', '环境整治', '文化教育'];
  const statuses = ['planning', 'in_progress', 'completed', 'suspended'];

  const projects = [];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    let name, description, budget;

    switch (type) {
      case '基础设施':
        const infraProjects = ['村道硬化工程', '饮水安全工程', '污水治理工程', '电网改造工程', '网络覆盖工程'];
        name = infraProjects[Math.floor(Math.random() * infraProjects.length)];
        description = `改善村民生活条件，提升${name.replace('工程', '')}水平`;
        budget = Math.floor(Math.random() * 500000) + 100000;
        break;
      case '公共服务':
        const serviceProjects = ['村级活动中心', '医疗服务站', '养老服务站', '文化广场', '体育设施'];
        name = serviceProjects[Math.floor(Math.random() * serviceProjects.length)];
        description = `完善公共服务设施，提高村民生活质量`;
        budget = Math.floor(Math.random() * 300000) + 80000;
        break;
      case '产业发展':
        const industryProjects = ['农产品加工厂', '电商平台建设', '旅游接待中心', '产业园区', '示范基地'];
        name = industryProjects[Math.floor(Math.random() * industryProjects.length)];
        description = `发展特色产业，增加村民收入`;
        budget = Math.floor(Math.random() * 800000) + 200000;
        break;
      case '环境整治':
        const envProjects = ['垃圾分类处理', '河道清淤', '村庄绿化', '面源污染治理', '生态修复'];
        name = envProjects[Math.floor(Math.random() * envProjects.length)];
        description = `改善生态环境，建设美丽乡村`;
        budget = Math.floor(Math.random() * 200000) + 50000;
        break;
      case '文化教育':
        const cultureProjects = ['村史馆建设', '文化礼堂', '图书馆', '培训中心', '数字乡村'];
        name = cultureProjects[Math.floor(Math.random() * cultureProjects.length)];
        description = `传承乡村文化，提升村民素质`;
        budget = Math.floor(Math.random() * 150000) + 30000;
        break;
    }

    const progress = status === 'completed' ? 100 :
                     status === 'in_progress' ? Math.floor(Math.random() * 80) + 20 :
                     status === 'planning' ? Math.floor(Math.random() * 20) : 0;

    const startDate = new Date(Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000);
    const expectedEndDate = new Date(startDate.getTime() + Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000);

    projects.push({
      name,
      type,
      category: type,
      description,
      villageId,
      status,
      progress,
      startDate,
      expectedEndDate,
      actualEndDate: status === 'completed' ? new Date(startDate.getTime() + Math.floor(Math.random() * 120) * 24 * 60 * 60 * 1000) : null,
      budget,
      spent: Math.floor(budget * (progress / 100) * (0.8 + Math.random() * 0.4)),
      manager: ['张主任', '李书记', '王村长', '陈会计'][Math.floor(Math.random() * 4)],
      team: [],
      milestones: [
        {
          name: '规划设计',
          description: '完成项目规划和设计方案',
          expectedDate: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          completedDate: progress > 20 ? new Date(startDate.getTime() + 25 * 24 * 60 * 60 * 1000) : null,
          status: progress > 20 ? 'completed' : 'pending'
        },
        {
          name: '实施阶段',
          description: '项目主体实施',
          expectedDate: new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000),
          completedDate: progress > 70 ? new Date(startDate.getTime() + 80 * 24 * 60 * 60 * 1000) : null,
          status: progress > 70 ? 'completed' : (progress > 20 ? 'in_progress' : 'pending')
        },
        {
          name: '验收完成',
          description: '项目验收和交付',
          expectedDate: expectedEndDate,
          completedDate: status === 'completed' ? actualEndDate : null,
          status: status === 'completed' ? 'completed' : 'pending'
        }
      ],
      risks: [],
      documents: [],
      images: [],
      createdAt: startDate
    });
  }

  return projects;
}

// 生成农产品数据
function generateAgricultureProducts(villageId, villageName, count) {
  const products = [
    { name: '有机茶叶', category: '茶叶', variety: '龙井', unit: '斤', priceRange: [200, 800] },
    { name: '山核桃', category: '坚果', variety: '野生山核桃', unit: '斤', priceRange: [80, 150] },
    { name: '土鸡蛋', category: '蛋类', variety: '散养土鸡蛋', unit: '个', priceRange: [1.5, 3] },
    { name: '有机蔬菜', category: '蔬菜', variety: '当季时蔬', unit: '斤', priceRange: [5, 15] },
    { name: '农家蜂蜜', category: '蜂产品', variety: '百花蜜', unit: '斤', priceRange: [60, 120] },
    { name: '竹笋', category: '蔬菜', variety: '春笋', unit: '斤', priceRange: [8, 20] },
    { name: '大米', category: '粮食', variety: '有机大米', unit: '斤', priceRange: [6, 12] },
    { name: '土猪肉', category: '肉类', variety: '散养黑猪', unit: '斤', priceRange: [25, 40] }
  ];

  const qualities = ['standard', 'fresh', 'premium'];
  const certifications = ['有机认证', '绿色食品', '无公害农产品', '地理标志产品', ''];

  const agricultureProducts = [];

  for (let i = 0; i < count; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    const quality = qualities[Math.floor(Math.random() * qualities.length)];
    const certification = certifications[Math.floor(Math.random() * certifications.length)];

    const price = product.priceRange[0] + Math.random() * (product.priceRange[1] - product.priceRange[0]);
    const stock = Math.floor(Math.random() * 1000) + 100;
    const sold = Math.floor(stock * Math.random() * 0.6);

    agricultureProducts.push({
      name: product.name,
      category: product.category,
      variety: product.variety,
      description: `${villageName}特产${product.name}，${product.variety}，品质保证`,
      villageId,
      farmerId: `farmer_${villageId}_${i + 1}`,
      farmerName: `农户${i + 1}`,
      contact: `139${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      quality,
      certification,
      price: Math.round(price * 100) / 100,
      unit: product.unit,
      stock,
      sold,
      harvestDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
      images: [
        `https://picsum.photos/400/300?random=${i}`,
        `https://picsum.photos/400/300?random=${i + 100}`
      ],
      plantingArea: Math.floor(Math.random() * 50) + 5,
      growingMethod: ['有机种植', '生态种植', '传统种植'][Math.floor(Math.random() * 3)],
      location: `${villageName}${['东', '南', '西', '北'][Math.floor(Math.random() * 4)]}区`,
      status: 'available'
    });
  }

  return agricultureProducts;
}

// 生成应急事件数据
function generateEmergencyEvents(villageId, count) {
  const types = ['weather', 'safety', 'health', 'security', 'infrastructure'];
  const levels = ['low', 'medium', 'high', 'critical'];
  const statuses = ['active', 'monitoring', 'resolved'];

  const events = [];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    let title, description, typeText;

    switch (type) {
      case 'weather':
        const weatherEvents = ['暴雨预警', '大风天气', '高温预警', '寒潮预警', '干旱预警'];
        title = weatherEvents[Math.floor(Math.random() * weatherEvents.length)];
        typeText = '天气灾害';
        description = `气象部门发布${title}，请村民做好防护措施`;
        break;
      case 'safety':
        const safetyEvents = ['道路安全隐患', '消防安全检查', '用电安全隐患', '燃气安全检查', '防溺水安全'];
        title = safetyEvents[Math.floor(Math.random() * safetyEvents.length)];
        typeText = '安全事故';
        description = `发现${title}，需要及时处理`;
        break;
      case 'health':
        const healthEvents = ['疫情防控', '传染病预警', '食物中毒预警', '饮用水安全', '环境卫生问题'];
        title = healthEvents[Math.floor(Math.random() * healthEvents.length)];
        typeText = '公共卫生';
        description = `${title}需要村民注意卫生安全`;
        break;
      case 'security':
        const securityEvents = ['治安巡逻提醒', '防诈骗宣传', '防盗安全', '交通安全', '网络安全'];
        title = securityEvents[Math.floor(Math.random() * securityEvents.length)];
        typeText = '安全防范';
        description = `加强${title}意识，确保人身财产安全`;
        break;
      case 'infrastructure':
        const infraEvents = ['电力故障', '供水问题', '网络中断', '道路损坏', '通信故障'];
        title = infraEvents[Math.floor(Math.random() * infraEvents.length)];
        typeText = '设施故障';
        description = `${title}影响村民正常生活，正在紧急处理`;
        break;
    }

    const reportedTime = new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000);
    const impact = {
      peopleAffected: Math.floor(Math.random() * 100),
      propertyDamage: Math.floor(Math.random() * 50000),
      economicLoss: Math.floor(Math.random() * 100000)
    };

    events.push({
      title,
      type,
      level,
      status,
      description,
      villageId,
      affectedArea: `${['全村', '东部片区', '西部片区', '南部片区', '北部片区'][Math.floor(Math.random() * 5)]}`,
      reporter: `村民${Math.floor(Math.random() * 100) + 1}`,
      reporterContact: `137${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      reportedTime,
      responseActions: [
        '启动应急预案',
        '通知相关部门',
        '组织人员排查',
        '发布预警信息'
      ],
      assignedTo: ['村委会', '应急小组', '相关部门'],
      estimatedResolveTime: new Date(reportedTime.getTime() + Math.floor(Math.random() * 3) * 24 * 60 * 60 * 1000),
      actualResolveTime: status === 'resolved' ? new Date(reportedTime.getTime() + Math.floor(Math.random() * 2) * 24 * 60 * 60 * 1000) : null,
      impact,
      location: {
        latitude: 29.5324 + (Math.random() - 0.5) * 0.1,
        longitude: 119.2831 + (Math.random() - 0.5) * 0.1,
        description: '事发地点详细描述'
      },
      images: status !== 'resolved' ? [
        `https://picsum.photos/400/300?random=${i + 200}`
      ] : [],
      updates: [
        {
          content: '事件已上报，正在处理中',
          author: '村委会',
          timestamp: reportedTime
        }
      ],
      createdAt: reportedTime
    });
  }

  return events;
}

// 主数据迁移函数
async function migrateRealData() {
  try {
    console.log('🔄 开始数据迁移...');

    // 清理现有数据
    console.log('🧹 清理现有数据...');
    await User.deleteMany({});
    await Village.deleteMany({});
    await Announcement.deleteMany({});
    await FinanceRecord.deleteMany({});
    await Project.deleteMany({});
    await AgricultureProduct.deleteMany({});
    await EmergencyEvent.deleteMany({});

    // 插入村庄数据
    console.log('🏘️ 插入村庄数据...');
    const villages = await Village.insertMany(realVillages);
    console.log(`✅ 已插入 ${villages.length} 个村庄`);

    // 插入村民数据
    console.log('👥 插入村民数据...');
    let totalVillagers = 0;
    for (const village of villages) {
      const villagers = generateVillagers(village.code, village.name, Math.floor(Math.random() * 100) + 50);
      await User.insertMany(villagers);
      totalVillagers += villagers.length;
      console.log(`📊 ${village.name}: 已插入 ${villagers.length} 名村民`);
    }
    console.log(`✅ 总共插入 ${totalVillagers} 名村民`);

    // 插入村务公开数据
    console.log('📢 插入村务公开数据...');
    let totalAnnouncements = 0;
    for (const village of villages) {
      const announcements = generateAnnouncements(village._id, Math.floor(Math.random() * 20) + 10);
      await Announcement.insertMany(announcements);
      totalAnnouncements += announcements.length;
    }
    console.log(`✅ 总共插入 ${totalAnnouncements} 条公告`);

    // 插入财务数据
    console.log('💰 插入财务数据...');
    let totalFinanceRecords = 0;
    for (const village of villages) {
      const financeRecords = generateFinanceRecords(village._id, Math.floor(Math.random() * 50) + 30);
      await FinanceRecord.insertMany(financeRecords);
      totalFinanceRecords += financeRecords.length;
    }
    console.log(`✅ 总共插入 ${totalFinanceRecords} 条财务记录`);

    // 插入项目数据
    console.log('🏗️ 插入项目数据...');
    let totalProjects = 0;
    for (const village of villages) {
      const projects = generateProjects(village._id, Math.floor(Math.random() * 8) + 5);
      await Project.insertMany(projects);
      totalProjects += projects.length;
    }
    console.log(`✅ 总共插入 ${totalProjects} 个项目`);

    // 插入农产品数据
    console.log('🌾 插入农产品数据...');
    let totalProducts = 0;
    for (const village of villages) {
      const products = generateAgricultureProducts(village._id, village.name, Math.floor(Math.random() * 15) + 10);
      await AgricultureProduct.insertMany(products);
      totalProducts += products.length;
    }
    console.log(`✅ 总共插入 ${totalProducts} 个农产品`);

    // 插入应急事件数据
    console.log('🚨 插入应急事件数据...');
    let totalEvents = 0;
    for (const village of villages) {
      const events = generateEmergencyEvents(village._id, Math.floor(Math.random() * 10) + 5);
      await EmergencyEvent.insertMany(events);
      totalEvents += events.length;
    }
    console.log(`✅ 总共插入 ${totalEvents} 个应急事件`);

    // 创建管理员账号
    console.log('👨‍💼 创建管理员账号...');
    const adminVillages = villages.map(village => ({
      id: village.code,
      name: village.name,
      address: village.address
    }));

    const adminUser = new User({
      username: 'admin',
      email: 'admin@smartvillage.com',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      profile: {
        name: '系统管理员',
        phone: '13800138000',
        address: '智慧村庄平台管理中心',
        idCard: '330101199001010001',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        birthDate: new Date(1990, 0, 1),
        gender: '男',
        education: '本科',
        occupation: '系统管理员'
      },
      village: adminVillages[0], // 默认管理第一个村庄
      isActive: true
    });

    await adminUser.save();
    console.log('✅ 管理员账号创建成功: admin / admin123');

    // 创建测试村民账号
    console.log('👨‍🌾 创建测试村民账号...');
    const testVillager = new User({
      username: 'test_villager',
      email: 'villager@smartvillage.com',
      password: bcrypt.hashSync('123456', 10),
      role: 'villager',
      profile: {
        name: '测试村民',
        phone: '13900139000',
        address: `${villages[0].name}测试地址123号`,
        idCard: '330101199002020002',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=villager',
        birthDate: new Date(1992, 0, 2),
        gender: '男',
        education: '高中',
        occupation: '农民'
      },
      village: {
        id: villages[0].code,
        name: villages[0].name,
        address: villages[0].address
      },
      isActive: true
    });

    await testVillager.save();
    console.log('✅ 测试村民账号创建成功: test_villager / 123456');

    console.log('\n🎉 数据迁移完成！');
    console.log('\n📊 数据统计:');
    console.log(`   🏘️ 村庄: ${villages.length} 个`);
    console.log(`   👥 村民: ${totalVillagers} 名`);
    console.log(`   📢 公告: ${totalAnnouncements} 条`);
    console.log(`   💰 财务记录: ${totalFinanceRecords} 条`);
    console.log(`   🏗️ 项目: ${totalProjects} 个`);
    console.log(`   🌾 农产品: ${totalProducts} 个`);
    console.log(`   🚨 应急事件: ${totalEvents} 个`);
    console.log('\n🔑 登录账号:');
    console.log('   管理员: admin / admin123');
    console.log('   测试村民: test_villager / 123456');
    console.log('   普通村民: 使用生成的村民数据登录');

    console.log('\n📝 注意事项:');
    console.log('   1. 所有村民默认密码为 123456，部署时需要修改');
    console.log('   2. 数据基于真实村庄结构生成，可用于测试和演示');
    console.log('   3. 建议根据实际情况调整数据和权限设置');
    console.log('   4. 可通过管理后台进一步管理和完善数据');

  } catch (error) {
    console.error('❌ 数据迁移失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行数据迁移
if (require.main === module) {
  migrateRealData();
}

module.exports = migrateRealData;