/**
 * 安全管理控制器
 * 处理安全相关的HTTP请求
 */

const fraudProtectionService = require('../services/fraudProtectionService');
const privacyProtectionService = require('../services/privacyProtectionService');
const dataEncryptionService = require('../services/dataEncryptionService');
const blockchainService = require('../services/blockchainService');
const securityAuditService = require('../services/securityAuditService');

class SecurityController {
  /**
   * 检查电话号码是否为诈骗号码
   */
  async checkPhoneNumber(req, res) {
    try {
      const { phoneNumber } = req.params;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: '电话号码不能为空'
        });
      }

      const result = await fraudProtectionService.checkPhoneNumber(
        phoneNumber,
        req.user
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error checking phone number:', error);
      res.status(500).json({
        success: false,
        message: '检查失败',
        error: error.message
      });
    }
  }

  /**
   * 举报诈骗号码
   */
  async reportFraudNumber(req, res) {
    try {
      const { phoneNumber, fraudType, fraudTypeName, reason, description, lossAmount } = req.body;

      if (!phoneNumber || !reason) {
        return res.status(400).json({
          success: false,
          message: '电话号码和举报原因不能为空'
        });
      }

      const result = await fraudProtectionService.reportFraudNumber(
        phoneNumber,
        req.user,
        {
          fraudType,
          fraudTypeName,
          reason,
          description,
          lossAmount
        }
      );

      res.json(result);
    } catch (error) {
      console.error('Error reporting fraud number:', error);
      res.status(500).json({
        success: false,
        message: '举报失败',
        error: error.message
      });
    }
  }

  /**
   * 获取诈骗号码列表
   */
  async getFraudNumbers(req, res) {
    try {
      const filters = {
        fraudType: req.query.fraudType,
        riskLevel: req.query.riskLevel,
        status: req.query.status,
        verified: req.query.verified,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'reportCount',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await fraudProtectionService.getFraudNumbers(filters);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error getting fraud numbers:', error);
      res.status(500).json({
        success: false,
        message: '查询失败',
        error: error.message
      });
    }
  }

  /**
   * 获取诈骗统计数据
   */
  async getFraudStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const stats = await fraudProtectionService.getFraudStats(start, end);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting fraud stats:', error);
      res.status(500).json({
        success: false,
        message: '获取统计失败',
        error: error.message
      });
    }
  }

  /**
   * 验证诈骗号码
   */
  async verifyFraudNumber(req, res) {
    try {
      const { id } = req.params;

      const result = await fraudProtectionService.verifyFraudNumber(id, req.user._id);

      res.json(result);
    } catch (error) {
      console.error('Error verifying fraud number:', error);
      res.status(500).json({
        success: false,
        message: '验证失败',
        error: error.message
      });
    }
  }

  /**
   * 更新诈骗号码状态
   */
  async updateFraudNumberStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: '状态不能为空'
        });
      }

      const result = await fraudProtectionService.updateStatus(id, status, reason);

      res.json(result);
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({
        success: false,
        message: '更新失败',
        error: error.message
      });
    }
  }

  /**
   * 获取隐私规则列表
   */
  async getPrivacyRules(req, res) {
    try {
      const rules = await privacyProtectionService.getActiveRules();

      res.json({
        success: true,
        data: rules
      });
    } catch (error) {
      console.error('Error getting privacy rules:', error);
      res.status(500).json({
        success: false,
        message: '查询失败',
        error: error.message
      });
    }
  }

  /**
   * 创建或更新隐私规则
   */
  async upsertPrivacyRule(req, res) {
    try {
      const result = await privacyProtectionService.upsertRule(req.body, req.user._id);

      res.json(result);
    } catch (error) {
      console.error('Error upserting privacy rule:', error);
      res.status(500).json({
        success: false,
        message: '操作失败',
        error: error.message
      });
    }
  }

  /**
   * 删除隐私规则
   */
  async deletePrivacyRule(req, res) {
    try {
      const { id } = req.params;

      const result = await privacyProtectionService.deleteRule(id);

      res.json(result);
    } catch (error) {
      console.error('Error deleting privacy rule:', error);
      res.status(500).json({
        success: false,
        message: '删除失败',
        error: error.message
      });
    }
  }

  /**
   * 请求查看完整敏感信息
   */
  async requestViewFullInfo(req, res) {
    try {
      const { fieldType, recordId } = req.body;
      const { faceVerified } = req.query;

      const result = await privacyProtectionService.requestViewFullInfo(
        fieldType,
        recordId,
        req.user,
        faceVerified === 'true'
      );

      res.json(result);
    } catch (error) {
      console.error('Error requesting view full info:', error);
      res.status(500).json({
        success: false,
        message: '请求失败',
        error: error.message
      });
    }
  }

  /**
   * 获取查看历史
   */
  async getViewHistory(req, res) {
    try {
      const { startDate, endDate, limit } = req.query;

      const history = await privacyProtectionService.getViewHistory(req.user._id, {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: parseInt(limit) || 50
      });

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error getting view history:', error);
      res.status(500).json({
        success: false,
        message: '查询失败',
        error: error.message
      });
    }
  }

  /**
   * AES加密
   */
  async aesEncrypt(req, res) {
    try {
      const { plaintext } = req.body;

      if (!plaintext) {
        return res.status(400).json({
          success: false,
          message: '明文不能为空'
        });
      }

      const result = dataEncryptionService.aesEncrypt(plaintext);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error encrypting data:', error);
      res.status(500).json({
        success: false,
        message: '加密失败',
        error: error.message
      });
    }
  }

  /**
   * AES解密
   */
  async aesDecrypt(req, res) {
    try {
      const { encryptedData } = req.body;

      if (!encryptedData) {
        return res.status(400).json({
          success: false,
          message: '加密数据不能为空'
        });
      }

      const plaintext = dataEncryptionService.aesDecrypt(encryptedData);

      res.json({
        success: true,
        data: { plaintext }
      });
    } catch (error) {
      console.error('Error decrypting data:', error);
      res.status(500).json({
        success: false,
        message: '解密失败',
        error: error.message
      });
    }
  }

  /**
   * 计算哈希值
   */
  async calculateHash(req, res) {
    try {
      const { data, algorithm } = req.body;

      if (!data) {
        return res.status(400).json({
          success: false,
          message: '数据不能为空'
        });
      }

      const hash = dataEncryptionService.calculateHash(data, algorithm);

      res.json({
        success: true,
        data: { hash }
      });
    } catch (error) {
      console.error('Error calculating hash:', error);
      res.status(500).json({
        success: false,
        message: '计算失败',
        error: error.message
      });
    }
  }

  /**
   * 密钥轮换
   */
  async rotateKeys(req, res) {
    try {
      // 检查权限
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '只有管理员可以执行密钥轮换'
        });
      }

      const result = await dataEncryptionService.rotateKeys();

      res.json(result);
    } catch (error) {
      console.error('Error rotating keys:', error);
      res.status(500).json({
        success: false,
        message: '密钥轮换失败',
        error: error.message
      });
    }
  }

  /**
   * 获取加密统计信息
   */
  async getEncryptionStats(req, res) {
    try {
      const stats = await dataEncryptionService.getStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting encryption stats:', error);
      res.status(500).json({
        success: false,
        message: '获取统计失败',
        error: error.message
      });
    }
  }

  /**
   * 创建区块链存证
   */
  async createBlockchainRecord(req, res) {
    try {
      const record = await blockchainService.createRecord({
        ...req.body,
        metadata: {
          ...req.body.metadata,
          createdBy: req.user._id,
          creatorName: req.user.name,
          villageId: req.user.villageId
        }
      });

      res.json(record);
    } catch (error) {
      console.error('Error creating blockchain record:', error);
      res.status(500).json({
        success: false,
        message: '创建存证失败',
        error: error.message
      });
    }
  }

  /**
   * 上链
   */
  async uploadToChain(req, res) {
    try {
      const { id } = req.params;

      const result = await blockchainService.uploadToChain(id);

      res.json(result);
    } catch (error) {
      console.error('Error uploading to chain:', error);
      res.status(500).json({
        success: false,
        message: '上链失败',
        error: error.message
      });
    }
  }

  /**
   * 验证存证
   */
  async verifyBlockchainRecord(req, res) {
    try {
      const { id } = req.params;

      const result = await blockchainService.verifyRecord(id);

      res.json(result);
    } catch (error) {
      console.error('Error verifying record:', error);
      res.status(500).json({
        success: false,
        message: '验证失败',
        error: error.message
      });
    }
  }

  /**
   * 生成存证证书
   */
  async generateCertificate(req, res) {
    try {
      const { id } = req.params;

      const result = await blockchainService.generateCertificate(id);

      res.json(result);
    } catch (error) {
      console.error('Error generating certificate:', error);
      res.status(500).json({
        success: false,
        message: '生成证书失败',
        error: error.message
      });
    }
  }

  /**
   * 查询区块链记录
   */
  async queryBlockchainRecords(req, res) {
    try {
      const filters = {
        recordType: req.query.recordType,
        chainStatus: req.query.chainStatus,
        verificationStatus: req.query.verificationStatus,
        businessType: req.query.businessType,
        businessId: req.query.businessId,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await blockchainService.queryRecords(filters);

      res.json(result);
    } catch (error) {
      console.error('Error querying blockchain records:', error);
      res.status(500).json({
        success: false,
        message: '查询失败',
        error: error.message
      });
    }
  }

  /**
   * 获取区块链统计
   */
  async getBlockchainStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const stats = await blockchainService.getStats(start, end);

      res.json(stats);
    } catch (error) {
      console.error('Error getting blockchain stats:', error);
      res.status(500).json({
        success: false,
        message: '获取统计失败',
        error: error.message
      });
    }
  }

  /**
   * 记录审计日志
   */
  async logAudit(req, res) {
    try {
      const result = await securityAuditService.log({
        ...req.body,
        operator: {
          userId: req.user._id,
          userName: req.user.name,
          userRole: req.user.role,
          userPhone: req.user.phone
        },
        ipAddress: req.ip || req.connection.remoteAddress
      });

      res.json(result);
    } catch (error) {
      console.error('Error logging audit:', error);
      res.status(500).json({
        success: false,
        message: '记录失败',
        error: error.message
      });
    }
  }

  /**
   * 查询审计日志
   */
  async queryAuditLogs(req, res) {
    try {
      const filters = {
        userId: req.query.userId,
        operationType: req.query.operationType,
        sensitivityLevel: req.query.sensitivityLevel,
        isAnomaly: req.query.isAnomaly,
        requireAlert: req.query.requireAlert,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await securityAuditService.queryAudits(filters);

      res.json(result);
    } catch (error) {
      console.error('Error querying audit logs:', error);
      res.status(500).json({
        success: false,
        message: '查询失败',
        error: error.message
      });
    }
  }

  /**
   * 获取安全审计报告
   */
  async getSecurityReport(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const report = await securityAuditService.generateReport(start, end);

      res.json(report);
    } catch (error) {
      console.error('Error getting security report:', error);
      res.status(500).json({
        success: false,
        message: '获取报告失败',
        error: error.message
      });
    }
  }

  /**
   * 获取异常行为报告
   */
  async getAnomalyReport(req, res) {
    try {
      const { days } = req.query;

      const report = await securityAuditService.getAnomalyReport(
        parseInt(days) || 7
      );

      res.json(report);
    } catch (error) {
      console.error('Error getting anomaly report:', error);
      res.status(500).json({
        success: false,
        message: '获取报告失败',
        error: error.message
      });
    }
  }

  /**
   * 获取访问热力图
   */
  async getAccessHeatmap(req, res) {
    try {
      const { days } = req.query;

      const heatmap = await securityAuditService.getAccessHeatmap(
        parseInt(days) || 30
      );

      res.json(heatmap);
    } catch (error) {
      console.error('Error getting access heatmap:', error);
      res.status(500).json({
        success: false,
        message: '获取热力图失败',
        error: error.message
      });
    }
  }

  /**
   * 导出审计日志
   */
  async exportAuditLogs(req, res) {
    try {
      const {
        startDate,
        endDate,
        operationType,
        format
      } = req.query;

      const result = await securityAuditService.exportAudits({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        operationType
      }, format || 'csv');

      if (result.success) {
        res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.data);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({
        success: false,
        message: '导出失败',
        error: error.message
      });
    }
  }

  /**
   * 检查合规性
   */
  async checkCompliance(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const compliance = await securityAuditService.checkCompliance(start, end);

      res.json(compliance);
    } catch (error) {
      console.error('Error checking compliance:', error);
      res.status(500).json({
        success: false,
        message: '检查失败',
        error: error.message
      });
    }
  }

  /**
   * 获取系统安全概览
   */
  async getSecurityOverview(req, res) {
    try {
      // 获取各项统计数据
      const [
        fraudStats,
        blockchainStats,
        encryptionStats,
        recentAnomalies
      ] = await Promise.all([
        fraudProtectionService.getFraudNumbers({ limit: 10 }),
        blockchainService.getStats(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          new Date()
        ),
        dataEncryptionService.getStats(),
        securityAuditService.getAnomalyReport(7)
      ]);

      res.json({
        success: true,
        data: {
          fraud: {
            totalFraudNumbers: fraudStats.pagination?.total || 0,
            recentFrauds: fraudStats.data?.slice(0, 5) || []
          },
          blockchain: blockchainStats.data || {},
          encryption: encryptionStats,
          anomalies: recentAnomalies.data || []
        }
      });
    } catch (error) {
      console.error('Error getting security overview:', error);
      res.status(500).json({
        success: false,
        message: '获取概览失败',
        error: error.message
      });
    }
  }
}

module.exports = new SecurityController();
