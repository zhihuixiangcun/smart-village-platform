/**
 * Mock data fixtures for NotificationsService tests
 */

// 村民数据模拟
const mockVillagers = {
  small_village: Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: `村民${i + 1}`,
    phone: `138001380${String(i).padStart(2, '0')}`,
    email: `villager${i + 1}@small-village.com`,
    deviceToken: `small_token_${i + 1}`,
    role: 'resident',
    villageId: 'small_village',
    villageName: '小村庄',
    status: 'active',
    preferences: {
      notifications: {
        emergency: true,
        announcements: i % 3 !== 0, // 2/3的人接收公告
        services: i % 2 === 0 // 1/2的人接收服务通知
      },
      dialect: ['普通话', '四川话', '粤语'][i % 3]
    }
  })),

  medium_village: Array.from({ length: 200 }, (_, i) => ({
    id: i + 1,
    name: `居民${i + 1}`,
    phone: `139001390${String(i).padStart(2, '0')}`,
    email: `resident${i + 1}@medium-village.com`,
    deviceToken: `medium_token_${i + 1}`,
    role: i < 10 ? 'village_admin' : 'resident', // 前10个是管理员
    villageId: 'medium_village',
    villageName: '中等村庄',
    status: ['active', 'inactive'][Math.floor(Math.random() * 2)],
    preferences: {
      notifications: {
        emergency: true,
        announcements: Math.random() > 0.2, // 80%接收公告
        services: Math.random() > 0.4 // 60%接收服务通知
      },
      dialect: ['普通话', '河南话', '东北话'][i % 3]
    }
  })),

  large_village: Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    name: `用户${i + 1}`,
    phone: `150001500${String(i).padStart(2, '0')}`,
    email: `user${i + 1}@large-village.com`,
    deviceToken: `large_token_${i + 1}`,
    role: i < 20 ? 'village_admin' : 'resident', // 前20个是管理员
    villageId: 'large_village',
    villageName: '大型村庄',
    status: 'active',
    preferences: {
      notifications: {
        emergency: true,
        announcements: i % 4 !== 0, // 75%接收公告
        services: i % 3 !== 0 // 66%接收服务通知
      },
      dialect: ['普通话', '四川话', '粤语', '河南话', '东北话'][i % 5]
    }
  }))
};

// 通知模板数据
const notificationTemplates = {
  emergency: {
    typhoon: {
      title: '🌪️ 台风预警通知',
      message: '预计今晚有强台风过境，风力达到12级以上。请村民立即采取防护措施：\n1. 加固门窗，清理阳台杂物\n2. 准备应急物资（手电筒、食物、饮水）\n3. 老人小孩请到安全区域避险\n4. 如遇紧急情况请拨打：{emergency_phone}\n村委会24小时值班，确保大家安全！',
      sender: '村委会应急中心',
      priority: 'high',
      channels: ['sms', 'push', 'email']
    },
    flood: {
      title: '🌊 洪水预警通知',
      message: '受上游降雨影响，预计2小时后河水位将达到警戒线。低洼地区居民请立即撤离：\n• 撤离路线：沿主干道向高地转移\n• 安置点：村委会二楼、小学教学楼\n• 携带必需品：身份证、少量现金、药品\n• 撤离专线：{evacuation_phone}\n请相互转告，确保无人遗漏！',
      sender: '村委会防汛指挥部',
      priority: 'urgent',
      channels: ['sms', 'push', 'voice_broadcast']
    },
    fire: {
      title: '🔥 火灾预警通知',
      message: '山林火险等级极高，严禁一切野外用火！违者将承担法律责任。\n防火措施：\n✓ 禁止焚烧垃圾、秸秆\n✓ 禁止野外吸烟、烧烤\n✓ 发现火情立即报告：{fire_phone}\n✓ 配合森林防火巡查工作\n保护家园，人人有责！',
      sender: '村委会护林防火站',
      priority: 'high',
      channels: ['sms', 'push', 'loudspeaker']
    }
  },

  announcements: {
    village_meeting: {
      title: '📢 村民大会通知',
      message: '定于{date}上午9:00在村委会大院召开村民大会，讨论以下重要事项：\n1. {topic1}\n2. {topic2}\n3. {topic3}\n请各位村民准时参加，共同参与村庄建设决策。因事不能参加者请提前请假。\n联系电话：{contact_phone}',
      sender: '村委会',
      priority: 'normal',
      channels: ['sms', 'push']
    },
    infrastructure: {
      title: '🚧 基础设施建设通知',
      message: '{project_name}工程将于{start_date}开始施工，预计{duration}天完工。\n施工期间：\n• 请绕行临时道路\n• 注意施工安全标识\n• 配合施工人员工作\n• 如有疑问请联系：{project_manager}\n感谢大家的理解与支持！',
      sender: '村建设办公室',
      priority: 'normal',
      channels: ['sms', 'push']
    },
    policy: {
      title: '📋 惠民政策通知',
      message: '{policy_name}政策开始实施！符合条件的村民可申请{benefit}。\n申请条件：{conditions}\n申请材料：{documents}\n申请时间：{application_period}\n申请地点：村委会便民服务中心\n咨询电话：{service_phone}\n请符合条件的村民及时申请！',
      sender: '村便民服务中心',
      priority: 'normal',
      channels: ['sms', 'push', 'email']
    }
  },

  services: {
    medical: {
      title: '🏥 医疗服务通知',
      message: '村卫生站{service_type}：\n• 时间：{service_time}\n• 地点：{service_location}\n• 服务项目：{service_items}\n• 注意事项：{notes}\n• 预约电话：{appointment_phone}\n请需要服务的村民提前预约，按时参加。',
      sender: '村卫生站',
      priority: 'normal',
      channels: ['sms', 'push']
    },
    agriculture: {
      title: '🌾 农业技术通知',
      message: '农技专家{expert_name}将于{visit_date}到村指导{guidance_topic}。\n指导内容：\n✓ {topic1}\n✓ {topic2}\n✓ {topic3}\n地点：{location}\n时间：{time}\n请种植户积极参加，现场可免费咨询种植技术问题。\n联系人：{contact_person} {contact_phone}',
      sender: '村农技服务站',
      priority: 'normal',
      channels: ['sms', 'push']
    },
    social_security: {
      title: '🛡️ 社保服务通知',
      message: '{service_name}办理提醒：\n办理对象：{target_group}\n所需材料：{required_documents}\n办理时间：{service_hours}\n办理地点：{service_location}\n注意：逾期将影响{consequences}\n如有疑问请致电：{inquiry_phone}\n请符合条件的村民及时办理！',
      sender: '村社保服务点',
      priority: 'normal',
      channels: ['sms', 'push', 'email']
    }
  },

  seasonal: {
    spring: {
      title: '🌸 春季农事提醒',
      message: '春耕时节已到，农事活动提醒：\n🌱 作物种植：{crop_planting_advice}\n💧 灌溉管理：{irrigation_schedule}\n🐛 病虫防治：{pest_control_tips}\n🌦️ 天气关注：{weather_alert}\n技术咨询：{tech_support_phone}\n祝愿大家春耕顺利，丰收在望！',
      sender: '村农技服务中心',
      priority: 'low',
      channels: ['sms', 'push']
    },
    summer: {
      title: '☀️ 夏季安全提醒',
      message: '夏季高温，安全提醒：\n🏊 水域安全：严禁在{restricted_areas}游泳\n🔥 用电安全：注意空调等大功率电器使用\n🌡️ 防暑降温：老人小孩注意避暑\n⚡ 雷雨天气：注意防雷电措施\n紧急电话：{emergency_contacts}\n请大家注意安全，度过平安夏季！',
      sender: '村安全管理办',
      priority: 'normal',
      channels: ['sms', 'push', 'loudspeaker']
    },
    autumn: {
      title: '🍂 秋收秋种通知',
      message: '秋收季节，农事安排：\n🌾 收获时机：{harvest_timing}\n🚜 机械服务：联系{machinery_service}\n🔥 秸秆处理：严禁焚烧，可联系{disposal_service}\n🌱 秋种准备：{autumn_planting_plan}\n天气预报：{weather_forecast}\n技术支持：{technical_support}\n祝大家秋收满满！',
      sender: '村农业服务中心',
      priority: 'normal',
      channels: ['sms', 'push']
    },
    winter: {
      title: '❄️ 冬季安全提醒',
      message: '冬季来临，安全过冬提醒：\n🔥 取暖安全：使用煤炉注意通风，防止一氧化碳中毒\n🧊 防滑防冻：路面结冰时注意出行安全\n🌨️ 雪灾准备：备好食物和取暖用品\n🏠 房屋检查：及时清理屋顶积雪\n求助电话：{winter_help_phone}\n愿大家温暖过冬！',
      sender: '村应急管理办',
      priority: 'normal',
      channels: ['sms', 'push', 'email']
    }
  }
};

// API响应模拟数据
const mockApiResponses = {
  sms: {
    success: {
      message_id: () => `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cost: () => Math.round((Math.random() * 0.08 + 0.02) * 100) / 100, // 0.02-0.10元
      status: 'sent',
      timestamp: () => new Date().toISOString()
    },
    error: {
      insufficient_balance: {
        error_code: 'INSUFFICIENT_BALANCE',
        message: '账户余额不足'
      },
      invalid_phone: {
        error_code: 'INVALID_PHONE_NUMBER',
        message: '手机号格式错误'
      },
      rate_limit: {
        error_code: 'RATE_LIMIT_EXCEEDED',
        message: '发送频率超限，请稍后再试'
      },
      service_unavailable: {
        error_code: 'SERVICE_UNAVAILABLE',
        message: '短信服务暂时不可用'
      }
    }
  },

  email: {
    success: {
      messageId: () => `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@smart-village.local`,
      response: '250 2.0.0 OK',
      accepted: (recipients) => Array.isArray(recipients) ? recipients : [recipients],
      rejected: []
    },
    error: {
      smtp_error: {
        code: 'ECONNECTION',
        message: 'Connection timeout',
        command: 'CONN'
      },
      invalid_email: {
        code: 'EINVALIDADDRESS',
        message: 'Invalid recipient email address',
        recipient: null
      },
      authentication_failed: {
        code: 'EAUTH',
        message: 'Invalid login credentials'
      }
    }
  },

  fcm: {
    success: {
      multicast_id: () => Math.floor(Math.random() * 9000000000000000) + 1000000000000000,
      success: (tokens) => tokens.length,
      failure: 0,
      canonical_ids: 0,
      results: (tokens) => tokens.map(() => ({
        message_id: `fcm_${Math.random().toString(36).substr(2, 11)}`
      }))
    },
    partial_success: {
      multicast_id: () => Math.floor(Math.random() * 9000000000000000) + 1000000000000000,
      success: (tokens) => Math.floor(tokens.length * 0.8), // 80%成功率
      failure: (tokens) => Math.ceil(tokens.length * 0.2),
      results: (tokens) => tokens.map((token, index) => 
        index % 5 === 0 ? // 每5个有1个失败
          { error: 'InvalidRegistration' } :
          { message_id: `fcm_${Math.random().toString(36).substr(2, 11)}` }
      )
    },
    error: {
      authentication_error: {
        error: {
          code: 401,
          message: 'Request had invalid authentication credentials.',
          status: 'UNAUTHENTICATED'
        }
      },
      quota_exceeded: {
        error: {
          code: 429,
          message: 'Quota exceeded.',
          status: 'RESOURCE_EXHAUSTED'
        }
      }
    }
  }
};

// 性能基准数据
const performanceBenchmarks = {
  sms: {
    single_message: { max_time: 1000 }, // 1秒
    batch_100: { max_time: 15000 }, // 15秒
    batch_1000: { max_time: 60000 } // 1分钟
  },
  email: {
    single_message: { max_time: 2000 }, // 2秒
    batch_50: { max_time: 10000 }, // 10秒
    batch_200: { max_time: 30000 } // 30秒
  },
  push: {
    single_device: { max_time: 500 }, // 0.5秒
    batch_100: { max_time: 3000 }, // 3秒
    batch_1000: { max_time: 10000 } // 10秒
  },
  broadcast: {
    small_village: { max_time: 10000, users: 50 }, // 10秒，50人
    medium_village: { max_time: 30000, users: 200 }, // 30秒，200人
    large_village: { max_time: 120000, users: 1000 } // 2分钟，1000人
  }
};

// 测试场景配置
const testScenarios = {
  emergency_broadcast: {
    name: '紧急广播测试',
    notification: notificationTemplates.emergency.typhoon,
    options: {
      villageId: 'medium_village',
      userRole: 'all',
      channels: ['sms', 'push', 'voice_broadcast'],
      emergency: true
    },
    expectedResults: {
      targetUsers: 200,
      sms_success_rate: 0.95,
      push_success_rate: 0.90,
      max_duration: 30000
    }
  },

  scheduled_announcement: {
    name: '计划公告测试',
    notification: notificationTemplates.announcements.village_meeting,
    scheduleTime: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后
    options: {
      villageId: 'small_village',
      userRole: 'resident',
      channels: ['sms', 'push']
    },
    expectedResults: {
      targetUsers: 40, // 排除管理员
      success_rate: 0.92,
      max_duration: 15000
    }
  },

  multi_channel_service: {
    name: '多渠道服务通知测试',
    notification: notificationTemplates.services.medical,
    options: {
      villageId: 'large_village',
      userRole: 'all',
      channels: ['sms', 'email', 'push'],
      priority: 'normal'
    },
    expectedResults: {
      targetUsers: 1000,
      sms_success_rate: 0.85,
      email_success_rate: 0.80,
      push_success_rate: 0.88,
      max_duration: 90000
    }
  },

  seasonal_reminder: {
    name: '季节性提醒测试',
    notification: notificationTemplates.seasonal.spring,
    options: {
      villageId: 'medium_village',
      userRole: 'resident',
      channels: ['sms'],
      scheduled: true,
      cronExpression: '0 8 * * MON' // 每周一上午8点
    },
    expectedResults: {
      targetUsers: 180,
      success_rate: 0.90,
      max_duration: 20000
    }
  }
};

// 错误场景模拟
const errorScenarios = {
  network_timeout: {
    description: '网络超时场景',
    mockImplementation: () => {
      throw { code: 'ECONNABORTED', message: '请求超时' };
    },
    expectedBehavior: 'graceful_degradation'
  },

  service_unavailable: {
    description: '服务不可用场景',
    mockImplementation: () => {
      throw { code: 'ECONNREFUSED', message: '连接被拒绝' };
    },
    expectedBehavior: 'retry_with_backoff'
  },

  rate_limit_exceeded: {
    description: '频率限制场景',
    mockImplementation: () => ({
      status: 429,
      data: { error: 'Rate limit exceeded', retry_after: 60 }
    }),
    expectedBehavior: 'queue_and_retry'
  },

  partial_failure: {
    description: '部分失败场景',
    mockImplementation: (recipients) => {
      const results = recipients.map((recipient, index) => ({
        recipient,
        success: index % 3 !== 0, // 2/3成功率
        error: index % 3 === 0 ? '无效接收者' : null
      }));
      return { results, overall_success: true };
    },
    expectedBehavior: 'continue_with_partial_success'
  }
};

module.exports = {
  mockVillagers,
  notificationTemplates,
  mockApiResponses,
  performanceBenchmarks,
  testScenarios,
  errorScenarios,

  // 辅助函数
  getRandomVillagers: (villageId, count) => {
    const villagers = mockVillagers[villageId] || [];
    return villagers.slice(0, count);
  },

  generateNotificationWithVariables: (template, variables) => {
    let message = template.message;
    Object.keys(variables).forEach(key => {
      message = message.replace(new RegExp(`{${key}}`, 'g'), variables[key]);
    });
    return { ...template, message };
  },

  createMockApiResponse: (service, scenario, data = {}) => {
    const response = mockApiResponses[service]?.[scenario];
    if (!response) return null;

    // 处理函数类型的属性
    const result = {};
    Object.keys(response).forEach(key => {
      if (typeof response[key] === 'function') {
        result[key] = response[key](data);
      } else {
        result[key] = response[key];
      }
    });

    return result;
  },

  getPerformanceBenchmark: (operation, scale) => {
    return performanceBenchmarks[operation]?.[scale];
  },

  simulateNetworkLatency: (min = 50, max = 200) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
};