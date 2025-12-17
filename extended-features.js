/**
 * 智慧村庄平台 - 扩展功能模块
 * 添加财务管理、项目管理、农产品管理等业务功能
 */

const express = require('express');
const router = express.Router();

// ==============================
// 财务管理模块
// ==============================

// 模拟财务数据
const financeData = {
  budget: {
    total: 1000000, // 100万预算
    spent: 350000,  // 已支出35万
    remaining: 650000, // 剩余65万
    categories: {
      infrastructure: 500000, // 基础设施50万
      agriculture: 200000,   // 农业发展20万
      welfare: 150000,       // 福利保障15万
      administration: 150000  // 行政管理15万
    }
  },
  transactions: [
    {
      id: 1,
      type: 'expense',
      category: 'infrastructure',
      description: '道路修缮工程',
      amount: 50000,
      date: '2024-12-10',
      status: 'completed',
      approver: '张书记'
    },
    {
      id: 2,
      type: 'income',
      category: 'agriculture',
      description: '农产品销售收入',
      amount: 25000,
      date: '2024-12-12',
      status: 'completed',
      approver: '李会计'
    },
    {
      id: 3,
      type: 'expense',
      category: 'welfare',
      description: '困难群众补助',
      amount: 8000,
      date: '2024-12-13',
      status: 'pending',
      approver: '王主任'
    }
  ]
};

// 获取财务概览
router.get('/finance/overview', (req, res) => {
  res.json({
    success: true,
    data: {
      budget: financeData.budget,
      monthlyStats: {
        income: 45000,
        expense: 68000,
        balance: -23000
      },
      alerts: [
        '基础设施建设预算使用率已达90%',
        '本月支出超过预算，需要审批'
      ]
    }
  });
});

// 获取交易记录
router.get('/finance/transactions', (req, res) => {
  const { page = 1, limit = 10, type, category } = req.query;

  let transactions = financeData.transactions;

  if (type) {
    transactions = transactions.filter(t => t.type === type);
  }

  if (category) {
    transactions = transactions.filter(t => t.category === category);
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      transactions: paginatedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: transactions.length,
        pages: Math.ceil(transactions.length / limit)
      }
    }
  });
});

// ==============================
// 项目管理模块
// ==============================

// 模拟项目数据
const projects = [
  {
    id: 1,
    name: '智慧农业大棚建设',
    type: 'infrastructure',
    description: '建设现代化智能农业大棚，提升农业生产效率',
    status: 'in_progress',
    progress: 65,
    startDate: '2024-10-01',
    expectedEndDate: '2025-03-31',
    budget: 300000,
    spent: 195000,
    manager: '张工程师',
    milestones: [
      { name: '设计规划', completed: true, date: '2024-10-15' },
      { name: '场地准备', completed: true, date: '2024-11-20' },
      { name: '主体建设', completed: false, expectedDate: '2025-01-15' },
      { name: '设备安装', completed: false, expectedDate: '2025-02-28' }
    ],
    risks: [
      { level: 'medium', description: '天气可能影响施工进度' },
      { level: 'low', description: '材料价格波动风险' }
    ]
  },
  {
    id: 2,
    name: '村民技能培训计划',
    type: 'education',
    description: '组织村民参加电商、农业技术等技能培训',
    status: 'planning',
    progress: 15,
    startDate: '2025-01-01',
    expectedEndDate: '2025-06-30',
    budget: 50000,
    spent: 7500,
    manager: '李老师',
    milestones: [
      { name: '需求调研', completed: true, date: '2024-12-01' },
      { name: '课程设计', completed: false, expectedDate: '2024-12-31' },
      { name: '师资确定', completed: false, expectedDate: '2025-01-15' }
    ]
  }
];

// 获取项目列表
router.get('/projects', (req, res) => {
  const { status, type, page = 1, limit = 10 } = req.query;

  let filteredProjects = projects;

  if (status) {
    filteredProjects = filteredProjects.filter(p => p.status === status);
  }

  if (type) {
    filteredProjects = filteredProjects.filter(p => p.type === type);
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      projects: paginatedProjects,
      summary: {
        total: projects.length,
        byStatus: {
          planning: projects.filter(p => p.status === 'planning').length,
          in_progress: projects.filter(p => p.status === 'in_progress').length,
          completed: projects.filter(p => p.status === 'completed').length,
          suspended: projects.filter(p => p.status === 'suspended').length
        },
        byType: {
          infrastructure: projects.filter(p => p.type === 'infrastructure').length,
          education: projects.filter(p => p.type === 'education').length,
          welfare: projects.filter(p => p.type === 'welfare').length
        }
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredProjects.length,
        pages: Math.ceil(filteredProjects.length / limit)
      }
    }
  });
});

// 获取单个项目详情
router.get('/projects/:id', (req, res) => {
  const project = projects.find(p => p.id === parseInt(req.params.id));

  if (!project) {
    return res.status(404).json({
      success: false,
      error: '项目不存在'
    });
  }

  res.json({
    success: true,
    data: project
  });
});

// ==============================
// 农产品管理模块
// ==============================

// 模拟农产品数据
const products = [
  {
    id: 1,
    name: '有机大米',
    category: 'grain',
    description: '本村种植的优质有机大米，无农药无化肥',
    price: 12.5,
    unit: 'kg',
    stock: 5000,
    sold: 3200,
    harvestDate: '2024-11-15',
    quality: 'premium',
    certification: 'organic',
    images: ['rice1.jpg', 'rice2.jpg'],
    farmer: '王农户',
    contact: '13800138001'
  },
  {
    id: 2,
    name: '土鸡蛋',
    category: 'livestock',
    description: '散养土鸡产的新鲜鸡蛋，营养丰富',
    price: 2.0,
    unit: '个',
    stock: 800,
    sold: 450,
    harvestDate: '2024-12-10',
    quality: 'standard',
    certification: 'green',
    images: ['egg1.jpg'],
    farmer: '李农户',
    contact: '13800138002'
  },
  {
    id: 3,
    name: '时令蔬菜',
    category: 'vegetable',
    description: '当日采摘的新鲜蔬菜，品种多样',
    price: 8.0,
    unit: 'kg',
    stock: 200,
    sold: 180,
    harvestDate: '2024-12-14',
    quality: 'fresh',
    certification: 'none',
    images: ['veg1.jpg', 'veg2.jpg', 'veg3.jpg'],
    farmer: '张农户',
    contact: '13800138003'
  }
];

// 获取农产品列表
router.get('/agriculture/products', (req, res) => {
  const { category, quality, page = 1, limit = 10 } = req.query;

  let filteredProducts = products;

  if (category) {
    filteredProducts = filteredProducts.filter(p => p.category === category);
  }

  if (quality) {
    filteredProducts = filteredProducts.filter(p => p.quality === quality);
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      products: paginatedProducts,
      categories: ['grain', 'vegetable', 'fruit', 'livestock', 'processed'],
      qualityLevels: ['premium', 'standard', 'fresh'],
      stats: {
        totalProducts: products.length,
        totalStock: products.reduce((sum, p) => sum + p.stock, 0),
        totalSold: products.reduce((sum, p) => sum + p.sold, 0),
        totalValue: products.reduce((sum, p) => sum + (p.price * p.sold), 0)
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredProducts.length,
        pages: Math.ceil(filteredProducts.length / limit)
      }
    }
  });
});

// 农产品订单管理
const orders = [
  {
    id: 1,
    productIds: [1, 2],
    customerName: '社区居民团购',
    customerContact: '13900139876',
    totalAmount: 850,
    status: 'processing',
    orderDate: '2024-12-14',
    deliveryDate: '2024-12-16',
    address: '智慧示范村社区中心',
    notes: '需要分批次配送'
  }
];

// 获取订单列表
router.get('/agriculture/orders', (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  let filteredOrders = orders;

  if (status) {
    filteredOrders = filteredOrders.filter(o => o.status === status);
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      orders: paginatedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredOrders.length,
        pages: Math.ceil(filteredOrders.length / limit)
      }
    }
  });
});

// ==============================
// 应急管理模块
// ==============================

// 模拟应急事件数据
const emergencies = [
  {
    id: 1,
    type: 'weather',
    title: '暴雨预警',
    description: '气象部门发布暴雨橙色预警，预计未来6小时有大到暴雨',
    level: 'high',
    status: 'active',
    reportedTime: '2024-12-14 14:30',
    reporter: '气象站',
    affectedArea: '全村',
    responseActions: [
      '通知所有村民做好防护准备',
      '检查排水系统',
      '准备应急物资',
      '组织应急小组待命'
    ],
    contacts: ['村长: 13800138000', '应急队长: 13800138001']
  },
  {
    id: 2,
    type: 'health',
    title: '疫情防控',
    description: '发现发热病例，启动疫情防控应急预案',
    level: 'medium',
    status: 'monitoring',
    reportedTime: '2024-12-13 09:15',
    reporter: '卫生室',
    affectedArea: '村东部',
    responseActions: [
      '隔离相关人员',
      '全村消毒',
      '健康监测',
      '物资调配'
    ]
  }
];

// 获取应急事件列表
router.get('/emergency/events', (req, res) => {
  const { type, level, status } = req.query;

  let filteredEvents = emergencies;

  if (type) {
    filteredEvents = filteredEvents.filter(e => e.type === type);
  }

  if (level) {
    filteredEvents = filteredEvents.filter(e => e.level === level);
  }

  if (status) {
    filteredEvents = filteredEvents.filter(e => e.status === status);
  }

  res.json({
    success: true,
    data: {
      events: filteredEvents,
      stats: {
        active: emergencies.filter(e => e.status === 'active').length,
        monitoring: emergencies.filter(e => e.status === 'monitoring').length,
        resolved: emergencies.filter(e => e.status === 'resolved').length,
        highLevel: emergencies.filter(e => e.level === 'high').length
      }
    }
  });
});

// 报告新的应急事件
router.post('/emergency/report', (req, res) => {
  const {
    type,
    title,
    description,
    level,
    reporter,
    affectedArea,
    contacts
  } = req.body;

  const newEmergency = {
    id: emergencies.length + 1,
    type,
    title,
    description,
    level,
    status: 'active',
    reportedTime: new Date().toISOString().replace('T', ' ').slice(0, 16),
    reporter,
    affectedArea,
    responseActions: [],
    contacts: contacts || []
  };

  emergencies.unshift(newEmergency);

  // 通过Socket.IO发送紧急广播
  const socketServer = require('../socket-server.js');
  if (socketServer && socketServer.io) {
    socketServer.io.emit('emergency-alert', {
      type: 'emergency',
      message: `紧急事件：${title}`,
      details: description,
      level: level,
      timestamp: newEmergency.reportedTime
    });
  }

  res.json({
    success: true,
    message: '应急事件已上报',
    data: newEmergency
  });
});

module.exports = router;