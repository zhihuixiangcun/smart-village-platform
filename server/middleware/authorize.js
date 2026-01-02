/**
 * 权限授权中间件
 */

const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // 检查用户是否已认证
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '未认证'
        });
      }

      // 检查用户角色是否在允许列表中
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '授权检查失败',
        error: error.message
      });
    }
  };
};

module.exports = { authorize };
