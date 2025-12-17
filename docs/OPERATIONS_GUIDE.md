# 智慧乡村平台运维指南

## 目录
1. [CI/CD 自动化部署](#cicd-自动化部署)
2. [监控告警系统](#监控告警系统)
3. [性能优化](#性能优化)
4. [安全防护](#安全防护)
5. [运维最佳实践](#运维最佳实践)

## CI/CD 自动化部署

### 部署流水线配置

1. **GitHub Actions 工作流**
   - 位置：`.github/workflows/ci-cd.yml`
   - 支持多环境部署（staging、production）
   - 自动化测试、安全扫描、性能测试

2. **部署命令**
```bash
# 部署到测试环境
git push origin develop

# 部署到生产环境（需要创建 release）
git tag v1.0.0
git push origin v1.0.0
```

3. **蓝绿部署**
   - 生产环境使用蓝绿部署策略
   - 零停机时间部署
   - 自动回滚机制

### 监控部署流程

1. **监控命令**
```bash
# 查看部署状态
kubectl get deployments -n smart-village-prod

# 查看服务状态
kubectl get services -n smart-village-prod

# 查看滚动日志
kubectl logs -f deployment/smart-village-api -n smart-village-prod
```

## 监控告警系统

### 监控架构

1. **数据收集层**
   - Prometheus：指标收集
   - Loki：日志聚合
   - Jaeger：分布式追踪

2. **存储层**
   - Prometheus TSDB：时序数据
   - Loki：日志数据
   - Elasticsearch：可选日志存储

3. **可视化层**
   - Grafana：监控面板
   - 自定义监控仪表板

### 启动监控栈

```bash
# 启动所有监控服务
docker-compose -f docker-compose.monitoring.yml up -d

# 查看服务状态
docker-compose -f docker-compose.monitoring.yml ps

# 查看日志
docker-compose -f docker-compose.monitoring.yml logs -f grafana
```

### 访问监控面板

- **Grafana Dashboard**: http://localhost:3000
  - 用户名：admin
  - 密码：admin123

- **Prometheus**: http://localhost:9090

- **Alertmanager**: http://localhost:9093

### 关键监控指标

1. **应用指标**
   - HTTP 请求数和延迟
   - 错误率
   - WebSocket 连接数
   - 活跃用户数

2. **基础设施指标**
   - CPU 使用率
   - 内存使用率
   - 磁盘空间
   - 网络流量

3. **数据库指标**
   - MongoDB 连接数
   - 查询性能
   - Redis 内存使用

### 告警配置

1. **告警级别**
   - Critical：服务宕机、严重错误
   - Warning：性能下降、资源不足
   - Info：状态变更、业务指标

2. **告警渠道**
   - Slack：#alerts 频道
   - 邮件：运维组邮箱
   - 短信：严重告警

## 性能优化

### 性能测试

1. **运行负载测试**
```bash
# 基础负载测试
npm run performance:test

# 自定义测试
artillery run tests/performance/load-test.yml

# 压力测试
artillery run tests/performance/stress-test.yml
```

2. **性能优化脚本**
```bash
# 运行性能优化
npm run optimize:performance
```

### 优化配置

1. **数据库优化**
   - 连接池配置：最大 50 连接
   - 索引优化：创建必要索引
   - 查询优化：避免全表扫描

2. **缓存策略**
   - Redis 缓存热点数据
   - HTTP 缓存静态资源
   - 应用级缓存

3. **服务器优化**
   - PM2 集群模式
   - Nginx 反向代理
   - Gzip 压缩

### 性能基准

| 指标 | 目标值 | 当前值 |
|-----|--------|--------|
| API 响应时间 | < 200ms | 待测试 |
| 95th 延迟 | < 500ms | 待测试 |
| 并发用户数 | > 1000 | 待测试 |
| 错误率 | < 0.1% | 待测试 |

## 安全防护

### 安全审计

```bash
# 运行安全审计
npm run security:audit

# 运行安全测试
npm run security:test

# 快速安全检查
node scripts/quick-security-test.js
```

### 安全措施

1. **认证和授权**
   - JWT Token 认证
   - 密码强度验证
   - 多因素认证（可选）

2. **输入验证**
   - XSS 防护
   - SQL 注入防护
   - 输入清理和验证

3. **传输安全**
   - HTTPS 强制
   - 安全头配置
   - CORS 策略

4. **访问控制**
   - IP 白名单
   - 速率限制
   - 请求频率控制

### 安全配置

1. **环境变量安全**
   - 敏感信息加密存储
   - 使用密钥管理服务
   - 定期轮换密钥

2. **数据库安全**
   - 连接加密
   - 访问控制
   - 审计日志

3. **文件安全**
   - 文件类型限制
   - 大小限制
   - 病毒扫描

### 安全检查清单

- [ ] 所有密码使用 bcrypt 加密
- [ ] JWT 密钥长度 > 32 字符
- [ ] 启用 HTTPS
- [ ] 配置安全头
- [ ] 实施速率限制
- [ ] 输入验证和清理
- [ ] 依赖项安全扫描
- [ ] 定期安全审计

## 运维最佳实践

### 日常运维任务

1. **每日检查**
   - 查看监控面板
   - 检查告警日志
   - 验证备份

2. **每周任务**
   - 更新依赖项
   - 安全扫描
   - 性能报告

3. **每月任务**
   - 安全审计
   - 容量规划
   - 灾备演练

### 备份策略

1. **数据库备份**
```bash
# MongoDB 备份
mongodump --uri="mongodb://user:pass@host:27017/db" --out=/backup/mongodb

# 自动备份脚本
./scripts/backup-database.sh
```

2. **文件备份**
   - 代码仓库备份
   - 配置文件备份
   - 日志文件归档

### 故障排查

1. **常见问题**
   - 服务无响应：检查日志、资源使用
   - 数据库连接失败：检查连接字符串、网络
   - 高延迟：检查缓存、数据库查询

2. **排查步骤**
   1. 查看服务状态
   2. 检查错误日志
   3. 分析性能指标
   4. 查看告警历史

### 扩容方案

1. **水平扩展**
   - 增加应用实例
   - 数据库分片
   - CDN 加速

2. **垂直扩展**
   - 增加 CPU/内存
   - 优化数据库
   - 升级硬件

### 紧急响应流程

1. **严重故障**
   - 立即通知相关人员
   - 执行回滚
   - 修复问题
   - 总结报告

2. **联系方式**
   - 运维团队：ops@smartvillage.com
   - 开发团队：dev@smartvillage.com
   - 紧急热线：400-xxx-xxxx

## 附录

### 有用的命令

```bash
# 查看系统资源
top
htop
iostat
free -h

# 查看服务状态
systemctl status
docker ps
kubectl get pods

# 日志查看
tail -f /var/log/syslog
journalctl -u service-name
docker logs -f container-name
```

### 监控端口

| 服务 | 端口 | 描述 |
|-----|------|------|
| API 服务 | 3001 | 主 API 服务 |
| 村务服务 | 5000 | 村务管理服务 |
| MongoDB | 27017 | 数据库 |
| Redis | 6379 | 缓存服务 |
| Grafana | 3000 | 监控面板 |
| Prometheus | 9090 | 指标收集 |
| Alertmanager | 9093 | 告警管理 |

### 联系信息

- **技术支持邮箱**: support@smartvillage.com
- **问题反馈**: issues@smartvillage.com
- **文档更新**: docs@smartvillage.com

---

*最后更新：2024年12月*