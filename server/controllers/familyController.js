/**
 * Family Controller
 * 家庭管理控制器
 *
 * 处理家庭管理相关的HTTP请求
 */

const familyService = require('../services/familyService');
const remoteAuthService = require('../services/remoteAuthService');

/**
 * 创建家庭档案
 */
exports.createFamily = async (req, res) => {
  try {
    const operator = {
      id: req.user?.id || req.body.operatorId,
      name: req.user?.name || req.body.operatorName || '系统'
    };

    const family = await familyService.createFamily(req.body, operator);

    res.status(201).json({
      success: true,
      message: '创建家庭档案成功',
      data: family
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 更新家庭档案
 */
exports.updateFamily = async (req, res) => {
  try {
    const { familyId } = req.params;
    const operator = {
      id: req.user?.id || req.body.operatorId,
      name: req.user?.name || req.body.operatorName || '系统'
    };

    const family = await familyService.updateFamily(familyId, req.body, operator);

    res.json({
      success: true,
      message: '更新家庭档案成功',
      data: family
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 删除家庭档案
 */
exports.deleteFamily = async (req, res) => {
  try {
    const { familyId } = req.params;
    const operator = {
      id: req.user?.id,
      name: req.user?.name || '系统'
    };

    await familyService.deleteFamily(familyId, operator);

    res.json({
      success: true,
      message: '删除家庭档案成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取家庭详情
 */
exports.getFamilyById = async (req, res) => {
  try {
    const { familyId } = req.params;
    const result = await familyService.getFamilyById(familyId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 根据二维码获取家庭信息
 */
exports.getFamilyByQRCode = async (req, res) => {
  try {
    const { qrCode } = req.params;
    const result = await familyService.getFamilyByQRCode(qrCode);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取村庄家庭列表
 */
exports.getFamilyList = async (req, res) => {
  try {
    const { villageId } = req.params;
    const filters = {
      familyType: req.query.familyType,
      needsVisit: req.query.needsVisit === 'true' ? true : req.query.needsVisit === 'false' ? false : undefined,
      housingType: req.query.housingType,
      riskLevel: req.query.riskLevel,
      keyword: req.query.keyword,
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20
    };

    const families = await familyService.getFamilyList(villageId, filters);

    res.json({
      success: true,
      data: families
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 添加家庭成员
 */
exports.addFamilyMember = async (req, res) => {
  try {
    const { familyId } = req.params;
    const operator = {
      id: req.user?.id,
      name: req.user?.name || '系统'
    };

    const member = await familyService.addFamilyMember(familyId, req.body, operator);

    res.status(201).json({
      success: true,
      message: '添加家庭成员成功',
      data: member
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 更新家庭成员信息
 */
exports.updateFamilyMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const operator = {
      id: req.user?.id,
      name: req.user?.name || '系统'
    };

    const member = await familyService.updateFamilyMember(memberId, req.body, operator);

    res.json({
      success: true,
      message: '更新成员信息成功',
      data: member
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 删除家庭成员
 */
exports.deleteFamilyMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const operator = {
      id: req.user?.id,
      name: req.user?.name || '系统'
    };

    await familyService.deleteFamilyMember(memberId, operator);

    res.json({
      success: true,
      message: '删除成员成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 重新生成二维码
 */
exports.regenerateQRCode = async (req, res) => {
  try {
    const { familyId } = req.params;
    const { expiresInDays } = req.body;
    const operator = {
      id: req.user?.id,
      name: req.user?.name || '系统'
    };

    const family = await familyService.regenerateQRCode(familyId, expiresInDays, operator);

    res.json({
      success: true,
      message: '重新生成二维码成功',
      data: family
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 撤销二维码
 */
exports.revokeQRCode = async (req, res) => {
  try {
    const { familyId } = req.params;
    const operator = {
      id: req.user?.id,
      name: req.user?.name || '系统'
    };

    const family = await familyService.revokeQRCode(familyId, operator);

    res.json({
      success: true,
      message: '撤销二维码成功',
      data: family
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 记录二维码打印
 */
exports.recordQRCodePrint = async (req, res) => {
  try {
    const { familyId } = req.params;
    const family = await familyService.recordQRCodePrint(familyId);

    res.json({
      success: true,
      message: '记录打印成功',
      data: {
        printCount: family.qrCode.printCount,
        lastPrintedAt: family.qrCode.lastPrintedAt
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 添加家庭标签
 */
exports.addFamilyTag = async (req, res) => {
  try {
    const { familyId } = req.params;
    const { tagName, color } = req.body;
    const createdBy = req.user?.id;

    const family = await familyService.addFamilyTag(familyId, tagName, color, createdBy);

    res.json({
      success: true,
      message: '添加标签成功',
      data: family.tags
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 移除家庭标签
 */
exports.removeFamilyTag = async (req, res) => {
  try {
    const { familyId, tagName } = req.params;

    const family = await familyService.removeFamilyTag(familyId, tagName);

    res.json({
      success: true,
      message: '移除标签成功',
      data: family.tags
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 添加成员特殊标签
 */
exports.addMemberSpecialTag = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { tag } = req.body;

    const member = await familyService.addMemberSpecialTag(memberId, tag);

    res.json({
      success: true,
      message: '添加标签成功',
      data: member
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 移除成员特殊标签
 */
exports.removeMemberSpecialTag = async (req, res) => {
  try {
    const { memberId, tag } = req.params;

    const member = await familyService.removeMemberSpecialTag(memberId, tag);

    res.json({
      success: true,
      message: '移除标签成功',
      data: member
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取统计数据
 */
exports.getStatistics = async (req, res) => {
  try {
    const { villageId } = req.params;
    const stats = await familyService.getStatistics(villageId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 导出家庭数据
 */
exports.exportFamilyData = async (req, res) => {
  try {
    const { villageId } = req.params;
    const filters = req.query;

    const data = await familyService.exportFamilyData(villageId, filters);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 搜索家庭
 */
exports.searchFamilies = async (req, res) => {
  try {
    const { villageId, keyword } = req.params;

    const families = await familyService.searchFamilies(villageId, keyword);

    res.json({
      success: true,
      data: families
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 批量导入家庭数据
 */
exports.batchImportFamilies = async (req, res) => {
  try {
    const { familyList } = req.body;
    const operator = {
      id: req.user?.id,
      name: req.user?.name || '系统'
    };

    const results = await familyService.batchImportFamilies(familyList, operator);

    res.json({
      success: true,
      message: `导入完成：成功${results.success}条，失败${results.failed}条`,
      data: results
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== 远程认证相关接口 ====================

/**
 * 初始化人脸认证
 */
exports.initializeFaceAuth = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { faceImageBase64 } = req.body;

    const result = await remoteAuthService.initializeFaceAuth(memberId, faceImageBase64);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 执行人脸识别
 */
exports.performFaceRecognition = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { capturedImageBase64 } = req.body;

    const result = await remoteAuthService.performFaceRecognition(sessionId, capturedImageBase64);

    res.json({
      success: result.success,
      message: result.message,
      data: result.success ? result : undefined
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 注册人脸信息
 */
exports.registerFace = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { faceImageBase64 } = req.body;

    const result = await remoteAuthService.registerFace(memberId, faceImageBase64);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 验证认证Token
 */
exports.verifyAuthToken = async (req, res) => {
  try {
    const { token } = req.body;

    const result = await remoteAuthService.verifyAuthToken(token);

    if (result.valid) {
      res.json({
        success: true,
        data: result.member
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 请求亲属代理认证
 */
exports.requestProxyAuth = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { proxyMemberId } = req.body;

    const result = await remoteAuthService.requestProxyAuth(memberId, proxyMemberId);

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 设置代理配置
 */
exports.setProxySettings = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { allowedProxyIds, expiryDays } = req.body;

    const result = await remoteAuthService.setProxySettings(memberId, allowedProxyIds, expiryDays);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取可用代理列表
 */
exports.getAvailableProxies = async (req, res) => {
  try {
    const { memberId } = req.params;

    const proxies = await remoteAuthService.getAvailableProxies(memberId);

    res.json({
      success: true,
      data: proxies
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 活体检测
 */
exports.performLivenessDetection = async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    const result = await remoteAuthService.performLivenessDetection(imageBase64);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取认证记录
 */
exports.getAuthHistory = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { limit } = req.query;

    const history = await remoteAuthService.getAuthHistory(memberId, limit);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 重置认证状态
 */
exports.resetAuthStatus = async (req, res) => {
  try {
    const { memberId } = req.params;

    const result = await remoteAuthService.resetAuthStatus(memberId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
