const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'smart-village-secret-key-2024';

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 模拟用户数据
const mockUsers = {
  'admin': { password: 'admin123', role: 'admin', name: '管理员' },
  '13800138000': { password: '123456', role: 'resident', name: '测试村民' },
  '13900139000': { password: '123456', role: 'cadre', name: '测试村干部' },
};

// 验证码存储（开发模式）
const verifyCodes = {};

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 发送验证码
app.post('/api/v1/auth/verify-code', (req, res) => {
  const { phone, type } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verifyCodes[phone] = code;
  console.log(`[开发模式] 验证码: ${phone} - ${code}`);
  res.json({ success: true, data: { code }, message: '验证码已发送' });
});

// 密码登录
app.post('/api/v1/auth/login', (req, res) => {
  const { username, password, role } = req.body;
  
  console.log(`[登录请求] username=${username}, role=${role}`);
  
  // 查找用户
  let user = null;
  let userRole = role;
  
  // 检查是否是测试账号
  if (mockUsers[username]) {
    if (mockUsers[username].password === password) {
      user = {
        _id: 'test_' + Date.now(),
        phone: username,
        name: mockUsers[username].name,
        role: mockUsers[username].role
      };
      userRole = mockUsers[username].role;
    }
  }
  
  // 如果找不到用户，返回错误
  if (!user) {
    return res.status(401).json({
      success: false,
      error: '用户名或密码错误'
    });
  }
  
  // 生成token
  const token = jwt.sign(
    { id: user._id, phone: user.phone, role: userRole },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  console.log(`[登录成功] ${user.phone} (${userRole})`);
  
  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        role: userRole
      }
    }
  });
});

// 注册
app.post('/api/v1/auth/register', (req, res) => {
  const { phone, username, password, role, verifyCode } = req.body;
  
  console.log(`[注册请求] phone=${phone}, role=${role}, username=${username}`);
  
  // 验证验证码
  if (verifyCodes[phone] && verifyCodes[phone] !== verifyCode) {
    return res.status(400).json({
      success: false,
      error: '验证码错误'
    });
  }
  
  // 模拟注册成功
  console.log(`[注册成功] ${phone} (${role})`);
  
  res.json({
    success: true,
    message: '注册成功'
  });
});

// 获取当前用户
app.get('/api/v1/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未授权' });
  }
  
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      success: true,
      data: {
        id: decoded.id,
        phone: decoded.phone,
        role: decoded.role,
        name: decoded.role === 'admin' ? '管理员' : '用户'
      }
    });
  } catch (error) {
    res.status(401).json({ success: false, error: '令牌无效' });
  }
});

// 退出登录
app.post('/api/v1/auth/logout', (req, res) => {
  res.json({ success: true, message: '退出成功' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================`);
  console.log(`  智慧乡村开发服务器已启动`);
  console.log(`  - HTTP服务: http://localhost:${PORT}`);
  console.log(`  - 健康检查: http://localhost:${PORT}/health`);
  console.log(`========================================`);
  console.log(`测试账号:`);
  console.log(`  - 管理员: admin / admin123`);
  console.log(`  - 村民: 13800138000 / 123456`);
  console.log(`  - 村干部: 13900139000 / 123456`);
  console.log(`========================================`);
});
