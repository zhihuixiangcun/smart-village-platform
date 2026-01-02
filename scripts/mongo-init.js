// MongoDB 初始化脚本
// 为智慧乡村平台创建初始数据库和用户

// 切换到 admin 数据库
db = db.getSiblingDB('admin');

// 创建应用用户
db.createUser({
  user: 'appuser',
  pwd: 'appuser_password_123',
  roles: [
    { role: 'readWrite', db: 'smart-village' }
  ]
});

// 切换到应用数据库
db = db.getSiblingDB('smart-village');

// 创建集合（可选，MongoDB 会自动创建）
// 这里只是确保数据库存在

print('MongoDB 初始化完成！');
print('数据库: smart-village');
print('用户: appuser 已创建');
