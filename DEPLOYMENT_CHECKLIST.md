# 智慧乡村平台 - 生产环境部署检查清单

## 📋 部署前检查清单

### 1. 环境变量配置 ✅

- [ ] 复制 `.env.production.example` 为 `.env.production`
- [ ] 更新所有敏感密钥和密码:
  - [ ] `JWT_SECRET` - 至少32字符的强随机密钥
  - [ ] `MONGO_ROOT_PASSWORD` - MongoDB root密码
  - [ ] `REDIS_PASSWORD` - Redis密码
  - [ ] `SESSION_SECRET` - Session密钥
  - [ ] `BAIDU_TTS_API_KEY` - 百度语音服务密钥
  - [ ] `BAIDU_TTS_SECRET_KEY` - 百度语音服务密钥
  - [ ] `TENCENT_SECRET_ID` - 腾讯云密钥
  - [ ] `TENCENT_SECRET_KEY` - 腾讯云密钥
  - [ ] `SMS_ACCESS_KEY_SECRET` - 短信服务密钥
  - [ ] `SMTP_PASS` - 邮件服务密码
  - [ ] `GRAFANA_PASSWORD` - Grafana管理员密码

- [ ] 配置生产域名:
  - [ ] `CLIENT_URL` - 前端域名 (https://your-domain.com)
  - [ ] `DOMAIN` - 主域名
  - [ ] `API_DOMAIN` - API域名

- [ ] 配置数据库连接:
  - [ ] `MONGO_URI` - MongoDB副本集连接字符串
  - [ ] `REDIS_HOST` - Redis主机地址

- [ ] 配置AI服务端点
- [ ] 配置第三方服务 (短信、邮件、支付等)
- [ ] 配置对象存储服务 (OSS)

### 2. 安全配置检查 🔒

- [ ] SSL/TLS证书准备:
  - [ ] 获取有效的SSL证书 (Let's Encrypt或商业证书)
  - [ ] 证书文件放置在 `./ssl/` 目录
  - [ ] 检查证书有效期
  
- [ ] CORS配置:
  - [ ] 更新 `CORS_ORIGIN` 为生产域名
  - [ ] 测试跨域请求是否正常

- [ ] 安全头配置:
  - [ ] Helmet中间件已启用
  - [ ] CSP策略已配置
  - [ ] HSTS已启用
  - [ ] X-Frame-Options已设置

- [ ] 速率限制:
  - [ ] API速率限制已配置
  - [ ] 登录速率限制已配置
  - [ ] 防暴力破解措施已就绪

- [ ] 敏感数据保护:
  - [ ] 密码使用bcrypt加密 (rounds >= 12)
  - [ ] 敏感字段数据库加密
  - [ ] 日志中敏感信息脱敏
  - [ ] JWT令牌安全存储

### 3. 数据库配置 🗄️

- [ ] MongoDB配置:
  - [ ] 副本集已配置 (1主2从1仲裁)
  - [ ] 认证已启用
  - [ ] TLS/SSL加密连接已启用
  - [ ] 连接池参数已优化
  - [ ] 索引已创建
  - [ ] 备份策略已配置

- [ ] Redis配置:
  - [ ] 密码认证已设置
  - [ ] 持久化已启用 (AOF)
  - [ ] 内存策略已配置
  - [ ] 主从复制已配置 (如需要)

- [ ] 数据库迁移:
  - [ ] 所有迁移脚本已准备
  - [ ] 测试环境迁移成功
  - [ ] 回滚计划已准备

### 4. 服务器配置 🖥️

- [ ] 系统要求:
  - [ ] Node.js >= 20.17.0
  - [ ] MongoDB >= 7.0
  - [ ] Redis >= 7.0
  - [ ] Nginx >= 1.20
  - [ ] Docker & Docker Compose (如使用容器化)

- [ ] 资源配置:
  - [ ] CPU >= 4核
  - [ ] 内存 >= 8GB
  - [ ] 磁盘空间 >= 100GB
  - [ ] 网络带宽 >= 100Mbps

- [ ] 防火墙配置:
  - [ ] 仅开放必要端口 (80, 443, 22)
  - [ ] 数据库端口不对外暴露
  - [ ] SSH密钥认证已配置
  - [ ] fail2ban已安装

### 5. Docker配置 (如使用) 🐳

- [ ] Dockerfile已创建并优化
- [ ] docker-compose.production.yml已配置
- [ ] 镜像仓库已配置 (阿里云/腾讯云/AWS)
- [ ] 容器资源限制已设置
- [ ] 健康检查已配置
- [ ] 日志驱动已配置

### 6. Nginx配置 🌐

- [ ] nginx.production.conf已配置
- [ ] SSL证书路径正确
- [ ] 上游服务器地址正确
- [ ] Gzip压缩已启用
- [ ] 静态资源缓存已配置
- [ ] WebSocket代理已配置
- [ ] 速率限制已配置
- [ ] 日志格式已配置

### 7. 监控和日志 📊

- [ ] 监控系统:
  - [ ] Prometheus已配置
  - [ ] Grafana已配置并导入仪表板
  - [ ] Node Exporter已运行
  - [ ] cAdvisor已运行
  - [ ] 告警规则已配置

- [ ] 日志系统:
  - [ ] Winston日志已配置
  - [ ] 日志轮转已启用
  - [ ] 错误日志监控已配置
  - [ ] 日志保留策略已设置

- [ ] APM (可选):
  - [ ] Elastic APM / New Relic / DataDog已配置

### 8. CI/CD配置 🚀

- [ ] GitHub Actions / GitLab CI / Jenkins已配置
- [ ] 自动化测试已集成
- [ ] 自动化构建已配置
- [ ] 自动化部署流程已测试
- [ ] 回滚流程已准备

### 9. 备份和灾难恢复 💾

- [ ] 数据库备份:
  - [ ] 自动备份计划已配置 (cron job)
  - [ ] 备份存储位置已确定
  - [ ] 备份加密已启用
  - [ ] 备份恢复流程已测试

- [ ] 文件备份:
  - [ ] 上传文件已备份
  - [ ] 配置文件已备份
  - [ ] SSL证书已备份

- [ ] 灾难恢复:
  - [ ] RTO/RPO目标已定义
  - [ ] 恢复流程已文档化
  - [ ] 恢复演练已完成

### 10. 性能优化 ⚡

- [ ] 应用层优化:
  - [ ] 连接池已优化
  - [ ] 缓存策略已实施
  - [ ] 查询优化已完成
  - [ ] N+1查询已消除

- [ ] 数据库优化:
  - [ ] 索引已优化
  - [ ] 慢查询已分析
  - [ ] 分片策略已规划 (如需要)

- [ ] CDN配置:
  - [ ] 静态资源CDN已配置
  - [ ] 图片优化已实施
  - [ ] 懒加载已实现

### 11. 测试验证 ✅

- [ ] 功能测试:
  - [ ] 所有核心功能已测试
  - [ ] 用户认证流程已测试
  - [ ] 支付流程已测试
  - [ ] 文件上传已测试

- [ ] 性能测试:
  - [ ] 负载测试已完成
  - [ ] 压力测试已完成
  - [ ] 并发测试已完成

- [ ] 安全测试:
  - [ ] SQL注入测试
  - [ ] XSS测试
  - [ ] CSRF测试
  - [ ] 认证绕过测试
  - [ ] 敏感数据暴露测试

- [ ] 渗透测试 (推荐)

### 12. 文档和培训 📚

- [ ] 技术文档已更新
- [ ] API文档已生成
- [ ] 运维手册已编写
- [ ] 故障排查指南已准备
- [ ] 运维人员已培训

### 13. 合规性和法律 ⚖️

- [ ] 数据隐私政策已发布
- [ ] 用户协议已准备
- [ ] GDPR/个人信息保护法合规
- [ ] 数据处理协议已签署
- [ ] 安全等级保护备案 (如需要)

### 14. 第三方服务 🌐

- [ ] 域名DNS已配置
- [ ] CDN已配置
- [ ] 短信服务已测试
- [ ] 邮件服务已测试
- [ ] 支付接口已测试
- [ ] AI服务已测试

### 15. 上线前最终检查 🎯

- [ ] 所有环境变量已确认无硬编码
- [ ] 所有默认密码已更改
- [ ] 所有调试模式已关闭
- [ ] 所有测试数据已清除
- [ ] 所有临时文件已删除
- [ ] 所有依赖版本已锁定
- [ ] 所有安全补丁已应用
- [ ] 回滚计划已准备
- [ ] 应急联系人列表已准备
- [ ] 监控告警已测试

## 部署步骤

### 第一步: 准备工作
```bash
# 1. 更新代码
git pull origin main

# 2. 安装依赖
npm ci --production

# 3. 配置环境变量
cp .env.production.example .env.production
nano .env.production  # 填入实际配置

# 4. 构建前端
cd client && npm run build && cd ..
```

### 第二步: 数据库准备
```bash
# 1. 启动MongoDB副本集
docker-compose -f docker-compose.production.yml up -d mongodb-primary mongodb-secondary

# 2. 初始化副本集
docker-compose -f docker-compose.production.yml run --rm mongodb-setup

# 3. 运行数据库迁移
npm run migrate:production
```

### 第三步: 启动服务
```bash
# 使用Docker Compose
docker-compose -f docker-compose.production.yml up -d

# 或使用PM2
pm2 start ecosystem.config.js --env production
```

### 第四步: 验证部署
```bash
# 健康检查
curl https://your-domain.com/health

# API测试
curl https://your-domain.com/api/v1/info

# 查看日志
docker-compose -f docker-compose.production.yml logs -f
```

### 第五步: 监控和验证
- 访问 Grafana: https://your-domain.com:3000
- 访问 Prometheus: https://your-domain.com:9090
- 检查日志文件
- 测试核心功能

## 回滚流程

如果部署出现问题,执行以下步骤:

```bash
# 1. 停止当前服务
docker-compose -f docker-compose.production.yml down

# 2. 切换到上一个稳定版本
git checkout <previous-stable-tag>

# 3. 恢复数据库备份 (如需要)
mongorestore --uri="$MONGO_URI" --drop /backup/path

# 4. 重新部署
docker-compose -f docker-compose.production.yml up -d

# 5. 验证回滚成功
curl https://your-domain.com/health
```

## 应急联系

- 技术负责人: [姓名] - [电话]
- 运维负责人: [姓名] - [电话]
- 数据库管理员: [姓名] - [电话]
- 安全负责人: [姓名] - [电话]

## 相关文档

- [系统架构文档](./docs/ARCHITECTURE.md)
- [API文档](https://your-domain.com/api/v1/docs.html)
- [运维手册](./docs/OPERATIONS.md)
- [故障排查指南](./docs/TROUBLESHOOTING.md)

---

**部署日期**: _____________  
**部署人员**: _____________  
**审核人员**: _____________  
**备注**: _____________
