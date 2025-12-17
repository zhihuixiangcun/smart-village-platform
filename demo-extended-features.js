/**
 * 扩展功能演示脚本
 * 演示财务管理、项目管理、农产品管理、应急管理等功能
 */

const http = require('http');

// 发送HTTP请求的辅助函数
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 演示扩展功能
async function demonstrateExtendedFeatures() {
  console.log('🚀 智慧村庄平台扩展功能演示开始\n');

  try {
    // 1. 财务管理模块演示
    console.log('💰 1. 财务管理模块');
    console.log('=' .repeat(50));

    const financeOverview = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/finance/overview',
      method: 'GET'
    });

    if (financeOverview.data.success) {
      const budget = financeOverview.data.data.budget;
      console.log('✅ 财务概览获取成功');
      console.log(`💵 总预算: ¥${budget.total.toLocaleString()}`);
      console.log(`💸 已支出: ¥${budget.spent.toLocaleString()}`);
      console.log(`💰 剩余: ¥${budget.remaining.toLocaleString()}`);
      console.log(`📊 使用率: ${((budget.spent / budget.total) * 100).toFixed(1)}%`);

      const alerts = financeOverview.data.data.alerts;
      console.log('\n⚠️ 财务预警:');
      alerts.forEach(alert => console.log(`  - ${alert}`));
    }
    console.log('');

    // 2. 项目管理模块演示
    console.log('🏗️ 2. 项目管理模块');
    console.log('=' .repeat(50));

    const projects = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/projects',
      method: 'GET'
    });

    if (projects.data.success) {
      console.log('✅ 项目列表获取成功');
      const projectSummary = projects.data.data.summary;
      console.log(`📋 总项目数: ${projectSummary.total}`);
      console.log(`🔄 进行中: ${projectSummary.byStatus.in_progress}`);
      console.log(`📝 规划中: ${projectSummary.byStatus.planning}`);
      console.log(`✅ 已完成: ${projectSummary.byStatus.completed}`);

      console.log('\n🏗️ 项目详情:');
      projects.data.data.projects.forEach(project => {
        console.log(`📌 ${project.name} (${project.status})`);
        console.log(`   进度: ${project.progress}% | 预算: ¥${project.budget.toLocaleString()}`);
        console.log(`   负责人: ${project.manager}`);
      });
    }
    console.log('');

    // 3. 农产品管理模块演示
    console.log('🌾 3. 农产品管理模块');
    console.log('=' .repeat(50));

    const products = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/agriculture/products',
      method: 'GET'
    });

    if (products.data.success) {
      const stats = products.data.data.stats;
      console.log('✅ 农产品列表获取成功');
      console.log(`📦 产品种类: ${stats.totalProducts}`);
      console.log(`📊 总库存: ${stats.totalStock.toLocaleString()} 单位`);
      console.log(`💰 销售收入: ¥${stats.totalValue.toLocaleString()}`);
      console.log(`📈 销售率: ${((stats.totalSold / (stats.totalSold + stats.totalStock)) * 100).toFixed(1)}%`);

      console.log('\n🛒 热销产品:');
      products.data.data.products.forEach(product => {
        console.log(`🌱 ${product.name} - ¥${product.price}/${product.unit}`);
        console.log(`   库存: ${product.stock}${product.unit} | 已售: ${product.sold}${product.unit}`);
        console.log(`   农户: ${product.farmer} (${product.contact})`);
        console.log(`   品质: ${product.quality === 'premium' ? '优质' : product.quality === 'fresh' ? '新鲜' : '标准'}`);
      });
    }
    console.log('');

    // 4. 应急管理模块演示
    console.log('🚨 4. 应急管理模块');
    console.log('=' .repeat(50));

    const emergencies = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/emergency/events',
      method: 'GET'
    });

    if (emergencies.data.success) {
      const stats = emergencies.data.data.stats;
      console.log('✅ 应急事件获取成功');
      console.log(`⚠️ 活跃事件: ${stats.active}`);
      console.log(`👀 监控中: ${stats.monitoring}`);
      console.log(`✅ 已解决: ${stats.resolved}`);
      console.log(`🔴 高级别: ${stats.highLevel}`);

      console.log('\n🚨 当前应急事件:');
      emergencies.data.data.events.forEach(event => {
        const levelEmoji = event.level === 'high' ? '🔴' : event.level === 'medium' ? '🟡' : '🟢';
        const statusEmoji = event.status === 'active' ? '⚡' : event.status === 'monitoring' ? '👁️' : '✅';
        console.log(`${levelEmoji} ${event.title} ${statusEmoji}`);
        console.log(`   类型: ${event.type} | 影响区域: ${event.affectedArea}`);
        console.log(`   描述: ${event.description}`);
        console.log(`   上报时间: ${event.reportedTime} | 上报人: ${event.reporter}`);

        if (event.responseActions && event.responseActions.length > 0) {
          console.log(`   应对措施: ${event.responseActions.slice(0, 2).join(', ')}...`);
        }
      });
    }
    console.log('');

    // 5. 模拟上报新的应急事件
    console.log('📝 5. 模拟上报应急事件');
    console.log('=' .repeat(50));

    const emergencyReport = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/emergency/report',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      type: 'safety',
      title: '道路安全隐患',
      description: '村东头路段出现路面塌陷，存在安全隐患',
      level: 'medium',
      reporter: '村民张三',
      affectedArea: '村东头主干道',
      contacts: ['村委会: 13800138000', '路政部门: 13800138002']
    });

    if (emergencyReport.data.success) {
      console.log('✅ 应急事件上报成功');
      console.log(`📋 事件ID: ${emergencyReport.data.data.id}`);
      console.log(`🚨 事件类型: ${emergencyReport.data.data.type}`);
      console.log(`⚠️ 严重程度: ${emergencyReport.data.data.level}`);
      console.log(`📅 上报时间: ${emergencyReport.data.data.reportedTime}`);
    }
    console.log('');

    // 6. 获取订单信息
    console.log('📦 6. 农产品订单管理');
    console.log('=' .repeat(50));

    const orders = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/agriculture/orders',
      method: 'GET'
    });

    if (orders.data.success) {
      console.log('✅ 订单列表获取成功');
      orders.data.data.orders.forEach(order => {
        console.log(`📦 订单 #${order.id}`);
        console.log(`   客户: ${order.customerName}`);
        console.log(`   金额: ¥${order.totalAmount.toLocaleString()}`);
        console.log(`   状态: ${order.status === 'processing' ? '处理中' : order.status}`);
        console.log(`   交货时间: ${order.deliveryDate}`);
      });
    }

    console.log('\n🎉 扩展功能演示完成!');
    console.log('\n💡 新增功能亮点:');
    console.log('1. 💰 财务管理 - 完整的预算管理和财务监控');
    console.log('2. 🏗️ 项目管理 - 项目全生命周期跟踪和风险管理');
    console.log('3. 🌾 农产品管理 - 电商化农产品销售和库存管理');
    console.log('4. 🚨 应急管理 - 实时应急事件上报和处理');
    console.log('5. 📦 订单管理 - 农产品订单处理和配送管理');

    console.log('\n🔧 技术特性:');
    console.log('- RESTful API设计');
    console.log('- 实时数据处理');
    console.log('- 分页和过滤支持');
    console.log('- 统计和报表功能');
    console.log('- 应急广播集成');

  } catch (error) {
    console.error('❌ 演示过程中出现错误:', error.message);
  }
}

// 运行演示
if (require.main === module) {
  demonstrateExtendedFeatures();
}

module.exports = demonstrateExtendedFeatures;