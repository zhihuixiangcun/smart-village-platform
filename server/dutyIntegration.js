/**
 * 智能值班表系统集成示例
 * 展示如何在主应用中集成值班表功能
 */

const express = require('express');
const mongoose = require('mongoose');

// 导入值班表相关模块
const dutyScheduleRoutes = require('./api/dutySchedule');

// 创建Express应用示例
const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB连接配置
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// 注册值班表API路由
app.use('/api/duty', dutyScheduleRoutes);

// 定时任务：处理到期的临时调班
const dutyRotationService = require('./services/dutyRotationService');

// 每天凌晨2点检查
setInterval(async () => {
  try {
    await dutyRotationService.processExpiredTemporarySwaps();
  } catch (error) {
    console.error('处理到期临时调班失败:', error);
  }
}, 24 * 60 * 60 * 1000);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 启动服务器
const PORT = process.env.DUTY_SERVICE_PORT || 5001;
app.listen(PORT, () => {
  console.log(`智能值班表服务运行在端口 ${PORT}`);
});

module.exports = app;