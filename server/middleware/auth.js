/**
 * 身份认证中间件
 */

const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  try {
    // 从请求头获取token
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // 将用户信息添加到请求对象
    req.user = decoded;
    req.user.ip = req.ip || req.connection.remoteAddress;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '认证令牌无效或已过期'
    });
  }
};

module.exports = { authenticate };
