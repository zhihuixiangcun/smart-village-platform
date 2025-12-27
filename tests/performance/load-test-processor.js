/**
 * Artillery 负载测试自定义处理器
 * 用于生成测试数据和处理响应
 */

'use strict';

module.exports = {
  // 生成随机用户名
  randomUsername: function(context, events, done) {
    const username = 'testuser_' + Math.random().toString(36).substring(7);
    context.vars.username = username;
    return done();
  },

  // 生成随机身份证号
  randomIdCard: function(context, events, done) {
    const areaCode = '110101';
    const birthDate = '19900101';
    const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const idCard = areaCode + birthDate + sequence + '0';
    context.vars.idCard = idCard;
    return done();
  },

  // 生成随机手机号
  randomPhone: function(context, events, done) {
    const prefixes = ['138', '139', '150', '151', '186', '188'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    context.vars.phone = prefix + suffix;
    return done();
  },

  // 生成真实姓名
  randomRealName: function(context, events, done) {
    const surnames = ['张', '李', '王', '赵', '刘', '陈', '杨', '黄', '吴', '周'];
    const names = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋'];
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    context.vars.realName = surname + name;
    return done();
  },

  // 生成随机村庄ID
  randomVillageId: function(context, events, done) {
    const villageId = 'village_' + Math.floor(Math.random() * 100);
    context.vars.villageId = villageId;
    return done();
  },

  // 处理认证响应
  handleAuthResponse: function(context, events, done) {
    if (context.vars.token) {
      context.vars.authToken = context.vars.token;
      console.log('Token received:', context.vars.token.substring(0, 20) + '...');
    }
    return done();
  },

  // 记录响应时间
  logResponseTime: function(context, events, done) {
    if (context.vars.lastResponseTime) {
      console.log('Response time:', context.vars.lastResponseTime, 'ms');
    }
    return done();
  },

  // 验证响应数据
  validateResponse: function(context, events, done) {
    const response = context.vars.response;
    if (response && response.statusCode === 200) {
      console.log('Request successful');
    } else {
      console.log('Request failed with status:', response ? response.statusCode : 'unknown');
    }
    return done();
  }
};
