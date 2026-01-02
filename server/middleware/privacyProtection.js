/**
 * 隐私保护中间件
 * 自动对响应数据进行脱敏处理
 */

const privacyProtectionService = require('../services/privacyProtectionService');

/**
 * 响应数据脱敏中间件
 * 自动对API响应中的敏感数据进行脱敏
 */
const privacyMask = async (req, res, next) => {
  try {
    // 保存原始的json方法
    const originalJson = res.json.bind(res);

    // 重写json方法
    res.json = function(data) {
      // 如果请求中包含不脱敏的标记，则跳过
      if (req.query.skipPrivacyMask === 'true') {
        return originalJson(data);
      }

      // 异步处理脱敏
      (async () => {
        try {
          // 如果数据包含success字段且为true，处理data部分
          if (data && data.success && data.data) {
            const maskedData = await privacyProtectionService.maskData(
              data.data,
              req.user,
              'api'
            );
            data.data = maskedData;
          }
          // 如果数据直接是数组或对象
          else if (data && (Array.isArray(data) || typeof data === 'object')) {
            const maskedData = await privacyProtectionService.maskData(
              data,
              req.user,
              'api'
            );
            data = maskedData;
          }

          // 调用原始的json方法
          return originalJson(data);
        } catch (error) {
          console.error('Error in privacy mask middleware:', error);
          // 出错时返回原始数据
          return originalJson(data);
        }
      })();
    };

    next();
  } catch (error) {
    console.error('Error setting up privacy mask middleware:', error);
    next();
  }
};

/**
 * 检查敏感数据访问权限
 */
const checkSensitiveDataAccess = (fieldType = 'all') => {
  return async (req, res, next) => {
    try {
      // 检查是否已通过人脸识别验证
      const faceVerified = req.query.faceVerified === 'true' || req.body.faceVerified === true;

      // 如果需要人脸识别但未验证
      if (!faceVerified) {
        // 检查是否需要人脸识别
        const requireFaceAuth = await privacyProtectionService.requireFaceAuth(
          fieldType,
          req.user
        );

        if (requireFaceAuth) {
          return res.status(403).json({
            success: false,
            message: '需要人脸识别验证',
            requireFaceAuth: true
          });
        }
      }

      next();
    } catch (error) {
      console.error('Error checking sensitive data access:', error);
      return res.status(500).json({
        success: false,
        message: '权限检查失败',
        error: error.message
      });
    }
  };
};

/**
 * 记录敏感数据访问
 */
const logSensitiveDataAccess = (operationType = 'view_sensitive_data') => {
  return async (req, res, next) => {
    // 保存原始的json方法
    const originalJson = res.json.bind(res);
    let logged = false;

    // 重写json方法
    res.json = function(data) {
      // 只记录一次
      if (!logged) {
        logged = true;

        // 异步记录日志
        setImmediate(async () => {
          try {
            const securityAuditService = require('../services/securityAuditService');

            await securityAuditService.log({
              operationType,
              operationName: '访问敏感数据',
              operator: {
                userId: req.user?._id,
                userName: req.user?.name,
                userRole: req.user?.role
              },
              ipAddress: req.ip || req.connection.remoteAddress,
              operationDetails: {
                url: req.originalUrl,
                method: req.method,
                params: req.params,
                query: req.query
              },
              sensitivityLevel: 'high',
              result: data?.success ? 'success' : 'failed'
            });
          } catch (error) {
            console.error('Error logging sensitive data access:', error);
          }
        });
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * 导出敏感数据时的额外检查
 */
const checkExportPermission = () => {
  return async (req, res, next) => {
    try {
      // 只有管理员和村委管理员可以导出
      if (!['admin', 'village_admin'].includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: '您没有权限导出数据'
        });
      }

      // 记录导出操作
      const securityAuditService = require('../services/securityAuditService');

      await securityAuditService.log({
        operationType: 'export_sensitive_data',
        operationName: '导出敏感数据',
        operator: {
          userId: req.user._id,
          userName: req.user.name,
          userRole: req.user.role
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        operationDetails: {
          url: req.originalUrl,
          method: req.method,
          params: req.params,
          query: req.query
        },
        sensitivityLevel: 'high',
        result: 'success'
      });

      next();
    } catch (error) {
      console.error('Error checking export permission:', error);
      return res.status(500).json({
        success: false,
        message: '权限检查失败',
        error: error.message
      });
    }
  };
};

module.exports = {
  privacyMask,
  checkSensitiveDataAccess,
  logSensitiveDataAccess,
  checkExportPermission
};
