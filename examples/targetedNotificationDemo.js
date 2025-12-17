/**
 * 特定人员通知系统演示示例
 * 展示智慧乡村通知系统中精准用户定向和分组通知功能
 */
const NotificationsService = require('../server/services/notificationsService');

// 模拟运行环境
console.log('🎯 智慧乡村特定人员通知系统演示\n');

async function demonstrateTargetedNotificationSystem() {
  
  console.log('='.repeat(60));
  console.log('👥 1. 用户管理演示');
  console.log('='.repeat(60));
  
  // 添加演示用户（已经通过初始化自动创建了）
  const allUsers = NotificationsService.getAllUsers();
  console.log(`📊 当前系统中共有 ${allUsers.length} 个用户\n`);
  
  // 显示部分用户信息
  allUsers.slice(0, 5).forEach((user, index) => {
    console.log(`${index + 1}. 👤 ${user.name} (${user.id})`);
    console.log(`   角色: ${user.role} | 年龄: ${user.demographics.age || '未知'} | 性别: ${user.demographics.gender || '未知'}`);
    console.log(`   标签: ${user.tags.join(', ')}`);
    console.log(`   联系: ${user.phone} ${user.email ? '| ' + user.email : ''}`);
    console.log('');
  });

  console.log('='.repeat(60));
  console.log('📊 2. 用户统计分析');
  console.log('='.repeat(60));
  
  const userStats = NotificationsService.getUserStats();
  console.log(`📈 用户总数: ${userStats.total}`);
  console.log(`📋 按角色分布:`);
  Object.entries(userStats.byRole).forEach(([role, count]) => {
    const roleName = {
      party_secretary: '村党支部书记',
      village_admin: '村委会干部', 
      accountant: '村会计',
      health_worker: '村医生',
      farmer: '种植户',
      breeder: '养殖户',
      business_owner: '个体商户',
      resident: '普通村民',
      elderly: '老年人'
    }[role] || role;
    console.log(`   ${roleName}: ${count}人`);
  });
  
  console.log(`\n📊 按年龄分布:`);
  console.log(`   18岁以下: ${userStats.byAge.under18}人`);
  console.log(`   成年人: ${userStats.byAge.adult}人`);
  console.log(`   老年人: ${userStats.byAge.elderly}人`);
  
  console.log(`\n👥 按性别分布:`);
  console.log(`   男性: ${userStats.byGender.male}人`);
  console.log(`   女性: ${userStats.byGender.female}人`);
  
  console.log(`\n📍 按位置分布:`);
  Object.entries(userStats.byLocation).forEach(([location, count]) => {
    console.log(`   ${location}: ${count}人`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('🔍 3. 精准筛选演示');
  console.log('='.repeat(60));
  
  // 演示1: 筛选所有农户
  console.log('🌾 筛选所有农户:');
  const farmerFilter = NotificationsService.filterUsers({
    filters: [{ field: 'role', operator: 'in', value: ['farmer', 'breeder'] }]
  });
  
  console.log(`   找到 ${farmerFilter.count} 个农户 (匹配率: ${farmerFilter.filterStats.matchRate})`);
  farmerFilter.users.slice(0, 3).forEach(user => {
    console.log(`   - ${user.name}: ${user.role} | 标签: ${user.tags.join(', ')}`);
  });
  
  // 演示2: 筛选特殊关怀群体
  console.log('\n💙 筛选特殊关怀群体:');
  const specialCareFilter = NotificationsService.filterUsers({
    logic: 'OR',
    filters: [
      { field: 'demographics.age', operator: 'greater_than', value: 75 },
      { field: 'tags', operator: 'contains', value: '独居老人' },
      { field: 'tags', operator: 'contains', value: '残障家庭' },
      { field: 'tags', operator: 'contains', value: '困难户' }
    ]
  });
  
  console.log(`   找到 ${specialCareFilter.count} 个特殊关怀对象 (匹配率: ${specialCareFilter.filterStats.matchRate})`);
  specialCareFilter.users.forEach(user => {
    console.log(`   - ${user.name}: ${user.demographics.age}岁 | 标签: ${user.tags.join(', ')}`);
  });
  
  // 演示3: 筛选青壮年劳动力
  console.log('\n💪 筛选青壮年劳动力:');
  const youngAdultFilter = NotificationsService.filterUsers({
    logic: 'AND',
    filters: [
      { field: 'demographics.age', operator: 'greater_than', value: 18 },
      { field: 'demographics.age', operator: 'less_than', value: 60 },
      { field: 'status', operator: 'equals', value: 'active' }
    ]
  });
  
  console.log(`   找到 ${youngAdultFilter.count} 个青壮年劳动力 (匹配率: ${youngAdultFilter.filterStats.matchRate})`);
  
  // 演示4: 按地区筛选
  console.log('\n📍 按地区筛选 - 东村居民:');
  const locationFilter = NotificationsService.filterUsers({
    filters: [{ field: 'tags', operator: 'contains', value: '东村' }]
  });
  
  console.log(`   找到 ${locationFilter.count} 个东村居民`);

  console.log('\n' + '='.repeat(60));
  console.log('👥 4. 用户分组管理演示');
  console.log('='.repeat(60));
  
  const allGroups = NotificationsService.getAllGroups();
  const groupStats = NotificationsService.getGroupStats();
  
  console.log(`📊 分组统计: 总计 ${groupStats.total} 个分组`);
  console.log(`   手动分组: ${groupStats.manual} 个`);
  console.log(`   自动分组: ${groupStats.auto} 个`);
  console.log(`   总成员数: ${groupStats.totalMembers} 人`);
  console.log('');
  
  // 显示前10个分组
  console.log('📋 分组列表:');
  allGroups.slice(0, 10).forEach((group, index) => {
    console.log(`${index + 1}. 🏷️  ${group.name} (${group.id})`);
    console.log(`   类型: ${group.type} | 成员: ${group.members.length}人 | 创建时间: ${group.createdAt.toLocaleDateString()}`);
    if (group.type === 'auto' && group.criteria) {
      console.log(`   筛选条件: ${group.criteria.filters.length}个条件`);
    }
    console.log('');
  });

  console.log('='.repeat(60));
  console.log('⚙️ 5. 通知偏好管理演示');
  console.log('='.repeat(60));
  
  // 为几个用户设置不同的通知偏好
  const demoUsers = allUsers.slice(0, 3);
  
  console.log('📱 设置用户通知偏好:');
  demoUsers.forEach((user, index) => {
    const preferences = {
      channels: {
        sms: true,
        email: user.email ? true : false,
        push: !!user.deviceToken,
        broadcast: true
      },
      categories: {
        emergency: true,
        announcement: true,
        service: user.role === 'elderly',
        agriculture: ['farmer', 'breeder'].includes(user.role),
        weather: true,
        health: user.role === 'elderly',
        event: true
      },
      quietHours: {
        enabled: true,
        start: user.role === 'elderly' ? '21:00' : '22:00',
        end: user.role === 'farmer' ? '06:00' : '07:00'
      },
      dialect: index === 0 ? '四川话' : (index === 1 ? '粤语' : '普通话'),
      frequency: {
        maxPerDay: user.role === 'village_admin' ? 50 : 10,
        maxPerHour: user.role === 'village_admin' ? 10 : 3
      }
    };
    
    const setPrefResult = NotificationsService.setNotificationPreferences(user.id, preferences);
    console.log(`✅ ${user.name}: ${setPrefResult.message}`);
    
    const userPrefs = NotificationsService.getNotificationPreferences(user.id);
    console.log(`   渠道偏好: SMS${userPrefs.channels.sms ? '✓' : '✗'} Email${userPrefs.channels.email ? '✓' : '✗'} Push${userPrefs.channels.push ? '✓' : '✗'}`);
    console.log(`   方言设置: ${userPrefs.dialect}`);
    console.log(`   免打扰: ${userPrefs.quietHours.start}-${userPrefs.quietHours.end}`);
    console.log('');
  });

  console.log('='.repeat(60));
  console.log('📨 6. 特定人员通知发送演示');
  console.log('='.repeat(60));
  
  // 演示1: 向所有农户发送农事通知
  console.log('🌾 向所有农户发送春播通知:');
  
  const agricultureNotification = {
    title: '春季播种通知',
    message: '各位农户朋友，春季播种期即将到来。请做好种子选购、土壤整理等准备工作。如需技术指导请联系村农技员。'
  };
  
  const agricultureResult = await NotificationsService.sendToTargetUsers(
    {
      filters: [{ field: 'role', operator: 'in', value: ['farmer', 'breeder'] }]
    },
    agricultureNotification,
    {
      channels: ['sms'],
      category: 'agriculture',
      priority: 'normal'
    }
  );
  
  console.log(`📊 发送结果: 目标用户 ${agricultureResult.targetUsers} 人, 成功发送 ${agricultureResult.totalSent} 个, 失败 ${agricultureResult.totalFailed} 个`);
  console.log(`📈 筛选统计: 总用户 ${agricultureResult.filterStats.totalUsers} 人, 匹配率 ${agricultureResult.filterStats.matchRate}`);
  
  // 演示2: 向特殊关怀群体发送紧急通知
  console.log('\n🚨 向特殊关怀群体发送紧急天气预警:');
  
  const emergencyNotification = {
    title: '紧急天气预警',
    message: '各位老人家注意！明天将有强降雨和大风天气，请减少外出，注意安全。如需帮助请联系村委会。'
  };
  
  const emergencyResult = await NotificationsService.sendToTargetUsers(
    {
      logic: 'OR',
      filters: [
        { field: 'demographics.age', operator: 'greater_than', value: 70 },
        { field: 'tags', operator: 'contains', value: '独居老人' }
      ]
    },
    emergencyNotification,
    {
      channels: ['sms', 'push'],
      category: 'emergency',
      priority: 'urgent'
    }
  );
  
  console.log(`📊 发送结果: 目标用户 ${emergencyResult.targetUsers} 人, 成功发送 ${emergencyResult.totalSent} 个, 失败 ${emergencyResult.totalFailed} 个`);
  
  // 演示3: 使用模板向特定用户发送通知
  console.log('\n🏥 使用模板向全村发送医疗服务通知:');
  
  const medicalTemplateData = {
    service: {
      type: '免费体检活动',
      date: '2024年3月15日',
      time: '上午9:00-11:30',
      location: '村卫生室',
      details: '血压、血糖、心电图等常规检查'
    },
    doctor: { name: '李医生' },
    registration: { method: '现场排号或提前电话预约' },
    contact: { phone: '13900139999' }
  };
  
  const medicalResult = await NotificationsService.sendToTargetUsers(
    {
      filters: [{ field: 'status', operator: 'equals', value: 'active' }]
    },
    null,
    {
      templateId: 'service_medical',
      templateData: medicalTemplateData,
      channels: ['sms'],
      category: 'health',
      priority: 'normal',
      villageName: '演示村'
    }
  );
  
  console.log(`📊 模板通知结果: 目标用户 ${medicalResult.targetUsers} 人, 成功发送 ${medicalResult.totalSent} 个`);

  console.log('\n' + '='.repeat(60));
  console.log('⏰ 7. 智能发送时间演示');
  console.log('='.repeat(60));
  
  console.log('🕐 不同类型通知的建议发送时间:');
  
  const sampleUserId = demoUsers[0].id;
  
  const emergencyTime = NotificationsService.getBestSendTime(sampleUserId, 'emergency');
  const agricultureTime = NotificationsService.getBestSendTime(sampleUserId, 'agriculture');
  const announcementTime = NotificationsService.getBestSendTime(sampleUserId, 'announcement');
  const weatherTime = NotificationsService.getBestSendTime(sampleUserId, 'weather');
  
  console.log(`🚨 紧急通知: ${emergencyTime.toLocaleString()} (立即发送)`);
  console.log(`🌾 农事通知: ${agricultureTime.toLocaleString()}`);
  console.log(`📢 村务公告: ${announcementTime.toLocaleString()}`);
  console.log(`🌤️  天气提醒: ${weatherTime.toLocaleString()}`);

  console.log('\n' + '='.repeat(60));
  console.log('📋 8. 用户分组通知演示');
  console.log('='.repeat(60));
  
  // 创建一个临时分组进行演示
  const demoGroupResult = NotificationsService.createGroup('demo_group_youth', {
    name: '青年创业群体',
    description: '村内年轻的创业者和商户',
    type: 'auto',
    criteria: {
      logic: 'AND',
      filters: [
        { field: 'demographics.age', operator: 'less_than', value: 45 },
        { field: 'role', operator: 'in', value: ['business_owner', 'farmer'] }
      ]
    }
  });
  
  if (demoGroupResult.success) {
    console.log(`✅ 创建分组: ${demoGroupResult.message}`);
    
    const groupNotification = {
      title: '创业政策通知',
      message: '村里正在申请创业扶持资金，有创业意向的年轻朋友请到村委会了解详情，申请截止时间为本月底。'
    };
    
    const groupResult = await NotificationsService.sendToGroup(
      'demo_group_youth',
      groupNotification,
      { channels: ['sms'] }
    );
    
    console.log(`📊 群组通知结果: 群组"${groupResult.groupName}" 发送给 ${groupResult.targetUsers} 人`);
    console.log(`📈 成功发送: ${groupResult.totalSent} 个, 失败: ${groupResult.totalFailed} 个`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 9. 系统整体统计');
  console.log('='.repeat(60));
  
  const finalUserStats = NotificationsService.getUserStats();
  const finalGroupStats = NotificationsService.getGroupStats();
  
  console.log('👥 用户管理统计:');
  console.log(`   总用户数: ${finalUserStats.total}`);
  console.log(`   活跃用户: ${finalUserStats.activeUsers}`);
  console.log(`   有邮箱用户: ${finalUserStats.withEmail}`);
  console.log(`   有推送令牌用户: ${finalUserStats.withDeviceToken}`);
  
  console.log('\n🏷️  分组管理统计:');
  console.log(`   总分组数: ${finalGroupStats.total}`);
  console.log(`   手动分组: ${finalGroupStats.manual}`);
  console.log(`   自动分组: ${finalGroupStats.auto}`);
  console.log(`   总成员数: ${finalGroupStats.totalMembers}`);
  if (finalGroupStats.largestGroup) {
    console.log(`   最大分组: ${finalGroupStats.largestGroup.name} (${finalGroupStats.largestGroup.members.length}人)`);
  }
  
  console.log('\n📈 通知发送统计:');
  const notificationStats = NotificationsService.getNotificationStats();
  if (notificationStats.success) {
    console.log(`   总通知数: ${notificationStats.stats.total}`);
    Object.entries(notificationStats.stats.byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}条`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 特定人员通知系统演示完成！');
  console.log('='.repeat(60));
  
  console.log('\n💡 系统特性总结:');
  console.log('✅ 用户精准管理 - 支持角色、标签、人口统计等多维度用户信息');
  console.log('✅ 智能分组功能 - 手动分组和基于条件的自动分组');
  console.log('✅ 精准筛选引擎 - 支持复杂条件组合的用户筛选');
  console.log('✅ 个性化偏好 - 每用户独立的通知渠道、类别和时间偏好');
  console.log('✅ 智能发送时间 - 基于消息类型和用户偏好的最佳时间推荐');
  console.log('✅ 模板集成支持 - 与消息模板系统无缝集成');
  console.log('✅ 多渠道发送 - SMS、邮件、推送通知的统一管理');
  console.log('✅ 方言适配 - 支持不同方言区域的个性化消息转换');
  
  console.log('\n🔧 使用建议:');
  console.log('1. 定期维护用户信息，确保联系方式准确性');
  console.log('2. 合理设置自动分组条件，提高管理效率');
  console.log('3. 根据用户反馈调整通知偏好设置');
  console.log('4. 充分利用筛选功能实现精准通知投递');
  console.log('5. 结合模板系统提升通知内容的专业性和一致性');
}

// 运行演示
if (require.main === module) {
  demonstrateTargetedNotificationSystem().catch(console.error);
}

module.exports = demonstrateTargetedNotificationSystem;