/**
 * HouseholdQRController - 一户一码控制器
 */

const householdQRService = require('../services/householdQRService');
const logger = require('../utils/logger');

class HouseholdQRController {
  /**
   * 生成户码二维码
   * POST /api/v1/household-qr/generate/:householdId
   */
  generateQR = async (req, res) => {
    try {
      const { householdId } = req.params;
      const options = {
        includeImage: req.query.includeImage !== 'false',
        protocol: req.query.protocol || 'smartvillage'
      };

      const result = await householdQRService.generateHouseholdQR(householdId, options);

      res.json({
        success: true,
        message: '二维码生成成功',
        data: result
      });
    } catch (error) {
      logger.error('生成户码二维码失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '生成二维码失败'
      });
    }
  };

  /**
   * 扫码查看户信息
   * POST /api/v1/household-qr/scan
   */
  scanQR = async (req, res) => {
    try {
      const { codeId } = req.body;
      const scannerInfo = {
        userId: req.user?._id,
        userName: req.user?.name,
        idCard: req.user?.idCard,
        role: req.user?.role || 'guest',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      const result = await householdQRService.scanHouseholdQR(codeId, scannerInfo);

      res.json({
        success: true,
        message: '扫码成功',
        data: result
      });
    } catch (error) {
      logger.error('扫码查看失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '扫码失败'
      });
    }
  };

  /**
   * 公开扫码接口（无需登录）
   * POST /api/v1/household-qr/public/scan
   */
  publicScanQR = async (req, res) => {
    try {
      const { codeId } = req.body;
      const scannerInfo = {
        role: 'guest',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      const result = await householdQRService.scanHouseholdQR(codeId, scannerInfo);

      res.json({
        success: true,
        message: '扫码成功',
        data: result
      });
    } catch (error) {
      logger.error('公开扫码失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '扫码失败'
      });
    }
  };

  /**
   * 通过二维码更新户信息
   * PUT /api/v1/household-qr/update/:codeId
   */
  updateByQR = async (req, res) => {
    try {
      const { codeId } = req.params;
      const updaterInfo = {
        userId: req.user._id,
        userName: req.user.name,
        idCard: req.user.idCard,
        role: req.user.role
      };

      const result = await householdQRService.updateHouseholdByQR(
        codeId,
        req.body,
        updaterInfo
      );

      res.json({
        success: true,
        message: '更新成功',
        data: result
      });
    } catch (error) {
      logger.error('通过二维码更新失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '更新失败'
      });
    }
  };

  /**
   * 获取成员详情
   * GET /api/v1/household-qr/member/:codeId/:memberId
   */
  getMember = async (req, res) => {
    try {
      const { codeId, memberId } = req.params;
      const viewerInfo = {
        userId: req.user?._id,
        userName: req.user?.name,
        idCard: req.user?.idCard,
        role: req.user?.role || 'guest'
      };

      const result = await householdQRService.getMemberByQR(codeId, memberId, viewerInfo);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('获取成员详情失败:', error);
      res.status(404).json({
        success: false,
        message: error.message || '获取成员详情失败'
      });
    }
  };

  /**
   * 批量生成户码（管理员）
   * POST /api/v1/household-qr/batch/:villageId
   */
  batchGenerate = async (req, res) => {
    try {
      const { villageId } = req.params;

      const result = await householdQRService.batchGenerateQRForVillage(villageId);

      res.json({
        success: true,
        message: `批量生成完成，成功 ${result.successCount}，失败 ${result.failureCount}`,
        data: result
      });
    } catch (error) {
      logger.error('批量生成户码失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '批量生成失败'
      });
    }
  };

  /**
   * 刷新二维码
   * POST /api/v1/household-qr/refresh/:householdId
   */
  refreshQR = async (req, res) => {
    try {
      const { householdId } = req.params;

      const result = await householdQRService.refreshQRCode(householdId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('刷新二维码失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '刷新失败'
      });
    }
  };

  /**
   * 获取户码统计
   * GET /api/v1/household-qr/stats/:villageId
   */
  getStats = async (req, res) => {
    try {
      const { villageId } = req.params;

      const result = await householdQRService.getHouseholdQRStats(villageId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('获取户码统计失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取统计失败'
      });
    }
  };

  /**
   * 验证户码
   * POST /api/v1/household-qr/validate
   */
  validateCode = async (req, res) => {
    try {
      const { codeId } = req.body;
      const Household = require('../models/Household');

      const validation = Household.validateHouseholdCode(codeId);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.reason
        });
      }

      // 检查户码是否存在
      const household = await Household.findOne({ codeId, status: 'active' });
      if (!household) {
        return res.status(404).json({
          success: false,
          message: '户码不存在'
        });
      }

      res.json({
        success: true,
        message: '户码有效',
        data: {
          codeId,
          householder: household.householder.name,
          memberCount: household.totalFamilyMembers
        }
      });
    } catch (error) {
      logger.error('验证户码失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '验证失败'
      });
    }
  };
}

module.exports = new HouseholdQRController();
