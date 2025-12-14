/**
 * 云通信服务路由
 */

const express = require('express');
const router = express.Router();
const cloudCommunicationController = require('../controllers/cloudCommunicationController');
const auth = require('../middleware/auth');

// 短信服务
router.post('/sms/send', auth.authenticate, cloudCommunicationController.sendSMS);

// 语音服务
router.post('/voice/send', auth.authenticate, cloudCommunicationController.sendVoice);

// 邮件服务
router.post('/email/send', auth.authenticate, cloudCommunicationController.sendEmail);

// 推送服务
router.post('/push/send', auth.authenticate, cloudCommunicationController.sendPush);

// 批量消息发送
router.post('/batch/send', auth.authenticate, cloudCommunicationController.sendBatchMessages);

// 验证码服务
router.post('/verification-code/send', cloudCommunicationController.sendVerificationCode);
router.post('/verification-code/verify', cloudCommunicationController.verifyCode);

// 应急广播（需要管理员权限）
router.post('/emergency/broadcast', auth.authenticate, auth.requireRole(['admin']), cloudCommunicationController.sendEmergencyBroadcast);

// 村务通知
router.post('/village/notification', auth.authenticate, cloudCommunicationController.sendVillageNotification);

// 生日祝福
router.post('/birthday/greetings', auth.authenticate, cloudCommunicationController.sendBirthdayGreetings);

// 节日祝福
router.post('/holiday/greetings', auth.authenticate, cloudCommunicationController.sendHolidayGreetings);

// 消息历史
router.get('/history', auth.authenticate, cloudCommunicationController.getMessageHistory);

// 服务状态
router.get('/service/status', cloudCommunicationController.getServiceStatus);

// 缓存管理
router.delete('/cache/clear', auth.authenticate, auth.requireRole(['admin']), cloudCommunicationController.clearCache);

module.exports = router;