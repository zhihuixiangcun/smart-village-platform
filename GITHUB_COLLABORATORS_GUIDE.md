# GitHub协作者权限管理指南

## 👥 协作者权限设置方法

### 方法1: 通过GitHub网页设置（推荐）
1. 访问仓库页面：https://github.com/zhihuixiangcun/smart-village-platform
2. 点击页面顶部的 "Settings" 选项卡
3. 在左侧菜单中点击 "Collaborators"
4. 点击 "Add people" 按钮
5. 输入要添加的GitHub用户名或邮箱
6. 选择权限级别：
   - **Read** - 只读权限（查看代码、下载）
   - **Triage** - 问题分类权限（管理Issues和PR）
   - **Write** - 写入权限（提交代码、管理Issues和PR）
   - **Maintain** - 维护者权限（除仓库设置外的所有权限）
   - **Admin** - 管理员权限（完全控制权限）
7. 点击 "Add [username] as collaborator" 完成添加

### 方法2: 使用GitHub CLI
```bash
# 添加写入权限的协作者
gh repo collaborator zhihuixiangcun/smart-village-platform [username] --permission write

# 添加只读权限的协作者
gh repo collaborator zhihuixiangcun/smart-village-platform [username] --permission read

# 添加管理员权限
gh repo collaborator zhihuixiangcun/smart-village-platform [username] --permission admin
```

### 方法3: 使用GitHub API
```bash
# 需要Personal Access Token
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     https://api.github.com/repos/zhihuixiangcun/smart-village-platform/collaborators/[username] \
     -d '{"permission": "write"}' -X PUT
```

## 🔐 权限级别说明

### Read (读取权限)
- ✅ 查看和下载代码
- ✅ 创建和查看Issues
- ✅ 查看Pull Requests
- ❌ 无法推送代码
- ❌ 无法管理仓库设置

### Triage (问题分类权限)
- ✅ 包含Read权限的所有功能
- ✅ 管理Issues（标记、分配）
- ✅ 管理Pull Requests（标记、分配）
- ❌ 无法推送代码
- ❌ 无法合并Pull Requests

### Write (写入权限)
- ✅ 包含Triage权限的所有功能
- ✅ 推送代码到仓库
- ✅ 创建和管理分支
- ✅ 创建和管理Pull Requests
- ✅ 合并Pull Requests
- ❌ 无法修改仓库设置

### Maintain (维护者权限)
- ✅ 包含Write权限的所有功能
- ✅ 管理Wiki页面
- ✅ 设置受保护分支
- ✅ 管理标签和里程碑
- ✅ 管理团队和协作者（除管理员外）
- ❌ 无法删除仓库
- ❌ 无法转移仓库

### Admin (管理员权限)
- ✅ 包含所有权限
- ✅ 完全控制仓库
- ✅ 删除和转移仓库
- ✅ 修改仓库设置和可见性

## 👤 建议的协作者分配方案

### 🏆 核心开发团队 (Write权限)
- 负责主要功能开发
- 可以提交代码和合并PR
- 参与项目架构决策

### 🔧 维护人员 (Maintain权限)
- 负责项目的日常维护
- 管理Issues和PR
- 协调开发团队

### 📋 项目经理 (Triage权限)
- 负责任务分配和进度跟踪
- 管理Issues和优先级
- 协调团队沟通

### 👀 观察者 (Read权限)
- 关注项目进展
- 可以报告问题
- 学习项目代码

## 📝 协作者管理最佳实践

### 添加协作者前的检查清单
- [ ] 确认协作者的GitHub用户名
- [ ] 确定合适的权限级别
- [ ] 与协作者沟通期望和责任
- [ ] 设置协作规范和代码审查流程

### 定期权限审查
- 每季度审查协作者列表
- 移除不再需要的协作者
- 根据项目需求调整权限级别
- 记录权限变更原因

### 安全建议
- 🛡️ 避免给过多的Admin权限
- 🔒 定期轮换高权限协作者
- 📊 启用仓库的访问日志监控
- 🚨 对可疑活动及时响应

## 🔄 团队协作工作流

### 代码贡献流程
1. **Fork仓库** → 2. **创建分支** → 3. **提交代码** → 4. **创建PR** → 5. **代码审查** → 6. **合并代码**

### 问题管理流程
1. **报告问题** → 2. **分类标记** → 3. **分配处理** → 4. **开发修复** → 5. **测试验证** → 6. **关闭问题**

### 发布管理流程
1. **版本规划** → 2. **功能开发** → 3. **测试验证** → 4. **创建标签** → 5. **发布说明** → 6. **部署更新**

## 📞 联系与支持

如有协作者权限相关问题，可以：
- 📧 发送邮件至项目维护者
- 💬 在GitHub Issues中咨询
- 📖 查阅GitHub官方文档：https://docs.github.com/en/account-and-profile/managing-access-to-your-personal-repositories/inviting-collaborators-to-a-personal-repository

---

**注意**：请根据项目实际需要合理分配权限，确保仓库安全和团队协作效率。