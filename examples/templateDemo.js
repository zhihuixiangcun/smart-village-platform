/**
 * 消息模板系统演示示例
 * 展示智慧乡村通知系统中模板的各种使用场景
 */
const NotificationsService = require('../server/services/notificationsService');

// 模拟运行环境
console.log('🌱 智慧乡村通知模板系统演示\n');

async function demonstrateTemplateSystem() {
  
  console.log('='.repeat(60));
  console.log('📋 1. 查看预定义模板');
  console.log('='.repeat(60));
  
  const allTemplates = NotificationsService.getAllTemplates();
  console.log(`共有 ${allTemplates.length} 个预定义模板:\n`);
  
  allTemplates.forEach(template => {
    console.log(`🏷️  ${template.name} (${template.id})`);
    console.log(`   类别: ${template.category}`);
    console.log(`   渠道: ${template.channels.join(', ')}`);
    console.log(`   优先级: ${template.priority}`);
    console.log(`   变量数: ${template.variableCount}`);
    console.log('');
  });

  console.log('='.repeat(60));
  console.log('🌪️  2. 台风预警模板演示');
  console.log('='.repeat(60));
  
  const typhoonData = {
    village: { name: '幸福村' },
    typhoon: { 
      name: '海燕',
      arrivalTime: '今晚11点左右'
    },
    contact: { emergency: '110' }
  };
  
  console.log('📝 模板数据:');
  console.log(JSON.stringify(typhoonData, null, 2));
  console.log('\n🖨️  渲染结果:');
  
  const typhoonPreview = NotificationsService.previewTemplate('emergency_typhoon', typhoonData);
  if (typhoonPreview.success) {
    console.log(`✅ ${typhoonPreview.message}\n`);
  }

  // 方言版本
  console.log('🗣️  四川话版本:');
  const typhoonSichuan = NotificationsService.previewTemplate('emergency_typhoon', typhoonData, {
    dialect: '四川话'
  });
  if (typhoonSichuan.success) {
    console.log(`✅ ${typhoonSichuan.message}\n`);
  }

  console.log('='.repeat(60));
  console.log('📢 3. 村民大会条件模板演示');
  console.log('='.repeat(60));
  
  const meetingData = {
    village: { name: '和谐村' },
    meeting: {
      date: '2024年2月15日',
      time: '下午2点',
      location: '村文化广场',
      agenda: '讨论村道硬化项目'
    }
  };
  
  console.log('📝 普通会议数据:');
  console.log(JSON.stringify(meetingData, null, 2));
  
  const normalMeeting = NotificationsService.previewTemplate('announcement_meeting', meetingData);
  console.log('\n🖨️  普通会议渲染:');
  console.log(`✅ ${normalMeeting.message}\n`);
  
  // 紧急会议
  const urgentMeetingData = {
    ...meetingData,
    meeting: {
      ...meetingData.meeting,
      urgent: true,
      agenda: '紧急商讨防汛措施'
    }
  };
  
  console.log('📝 紧急会议数据（urgent: true）:');
  const urgentMeeting = NotificationsService.previewTemplate('announcement_meeting', urgentMeetingData);
  console.log('\n🖨️  紧急会议渲染:');
  console.log(`⚠️  ${urgentMeeting.message}\n`);

  console.log('='.repeat(60));
  console.log('🌱 4. 农事提醒模板演示');
  console.log('='.repeat(60));
  
  const agricultureData = {
    season: '春季',
    crop: { name: '玉米' },
    planting: {
      timeRange: '3月15日 - 4月10日',
      tips: '选择优质种子，保持土壤湿润，注意防虫害'
    },
    technician: {
      name: '李农技',
      phone: '13800138888'
    }
  };
  
  console.log('📝 农事数据:');
  console.log(JSON.stringify(agricultureData, null, 2));
  
  const agriculturePreview = NotificationsService.previewTemplate('agriculture_planting', agricultureData);
  console.log('\n🖨️  农事提醒渲染:');
  console.log(`🌾 ${agriculturePreview.message}\n`);

  console.log('='.repeat(60));
  console.log('🏥 5. 医疗服务通知演示');
  console.log('='.repeat(60));
  
  const medicalData = {
    service: {
      type: '免费体检',
      date: '2024年3月8日',
      time: '上午9:00-11:30',
      location: '村卫生室',
      details: '血压、血糖、心电图检查'
    },
    doctor: { name: '王医生' },
    registration: { method: '现场排号或电话预约' },
    contact: { phone: '13900139999' }
  };
  
  console.log('📝 医疗服务数据:');
  console.log(JSON.stringify(medicalData, null, 2));
  
  const medicalPreview = NotificationsService.previewTemplate('service_medical', medicalData);
  console.log('\n🖨️  医疗服务渲染:');
  console.log(`🏥 ${medicalPreview.message}\n`);

  console.log('='.repeat(60));
  console.log('🔧 6. 创建自定义模板演示');
  console.log('='.repeat(60));
  
  const customTemplate = {
    name: '村庄停水通知',
    category: 'service',
    description: '用于通知村民停水维修等情况',
    content: '🚰【停水通知】{{village.name}}村民注意：因{{reason}}，定于{{date}}{{time}}停水{{duration}}。影响区域：{{areas}}。请提前储水。如有疑问请联系{{contact.name}}：{{contact.phone}}。',
    priority: 'high',
    channels: ['sms', 'push'],
    variables: [
      'village.name', 'reason', 'date', 'time', 
      'duration', 'areas', 'contact.name', 'contact.phone'
    ],
    formatting: {
      emoji: '🚰',
      maxLength: 200
    },
    tags: ['公共设施', '维修', '停水']
  };
  
  console.log('📝 注册自定义模板:');
  const registerResult = NotificationsService.registerTemplate('water_outage', customTemplate);
  console.log(`✅ ${registerResult.message}`);
  
  // 使用自定义模板
  const waterOutageData = {
    village: { name: '清泉村' },
    reason: '水管维修',
    date: '明天',
    time: '上午8点',
    duration: '约4小时',
    areas: '村东、村南片区',
    contact: {
      name: '水务管理员老张',
      phone: '13700137777'
    }
  };
  
  console.log('\n📝 停水通知数据:');
  console.log(JSON.stringify(waterOutageData, null, 2));
  
  const waterOutagePreview = NotificationsService.previewTemplate('water_outage', waterOutageData);
  console.log('\n🖨️  停水通知渲染:');
  console.log(`🚰 ${waterOutagePreview.message}\n`);

  console.log('='.repeat(60));
  console.log('📱 7. 批量发送演示（模拟）');
  console.log('='.repeat(60));
  
  console.log('准备批量发送村民大会通知...\n');
  
  const batchCommonData = {
    village: { name: '演示村' },
    meeting: {
      date: '2024年3月1日',
      time: '晚上7点',
      location: '村民活动中心',
      agenda: '讨论村庄绿化方案'
    }
  };
  
  const mockRecipients = [
    {
      id: 'resident_001',
      contact: { phone: '13800138001', email: 'zhangsan@village.com' },
      data: { user: { name: '张三' } },
      dialect: '普通话'
    },
    {
      id: 'resident_002', 
      contact: { phone: '13800138002', email: 'lisi@village.com' },
      data: { user: { name: '李四' } },
      dialect: '四川话'
    },
    {
      id: 'resident_003',
      contact: { phone: '13800138003', email: 'wangwu@village.com' },
      data: { user: { name: '王五' } },
      dialect: '普通话'
    }
  ];
  
  console.log(`📝 批量数据: ${mockRecipients.length}个接收人`);
  console.log('📋 公共数据:');
  console.log(JSON.stringify(batchCommonData, null, 2));
  
  console.log('\n🖨️  为每个接收人预览渲染结果:');
  mockRecipients.forEach((recipient, index) => {
    const personalData = { ...batchCommonData, ...recipient.data };
    const preview = NotificationsService.previewTemplate('announcement_meeting', personalData, {
      dialect: recipient.dialect
    });
    
    console.log(`${index + 1}. ${recipient.data.user.name} (${recipient.dialect})`);
    console.log(`   📱 ${recipient.contact.phone}`);
    console.log(`   💬 ${preview.message}`);
    console.log('');
  });

  console.log('='.repeat(60));
  console.log('📊 8. 模板统计信息');
  console.log('='.repeat(60));
  
  const categoryStats = {};
  allTemplates.forEach(template => {
    categoryStats[template.category] = (categoryStats[template.category] || 0) + 1;
  });
  
  console.log('📈 按类别统计:');
  Object.entries(categoryStats).forEach(([category, count]) => {
    console.log(`   ${category}: ${count}个模板`);
  });
  
  console.log('\n📋 功能特性统计:');
  const withConditions = allTemplates.filter(t => t.hasConditions).length;
  const withDialect = allTemplates.filter(t => t.dialectSupport).length;
  const multiChannel = allTemplates.filter(t => t.channels.length > 1).length;
  
  console.log(`   支持条件逻辑: ${withConditions}个`);
  console.log(`   支持方言转换: ${withDialect}个`);
  console.log(`   支持多渠道: ${multiChannel}个`);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 模板系统演示完成！');
  console.log('='.repeat(60));
  
  console.log('\n💡 使用建议:');
  console.log('1. 根据实际需求创建自定义模板');
  console.log('2. 充分利用变量替换和条件逻辑');
  console.log('3. 为不同方言地区设置合适的转换');
  console.log('4. 使用批量发送功能提高效率');
  console.log('5. 定期备份和管理模板库');
}

// 运行演示
if (require.main === module) {
  demonstrateTemplateSystem().catch(console.error);
}

module.exports = demonstrateTemplateSystem;