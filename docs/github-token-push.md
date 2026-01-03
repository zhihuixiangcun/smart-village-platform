# GitHub 代码推送指南

## 🚀 三种推送方式

### 方式一：HTTPS + 个人访问令牌（推荐，最简单）

#### 步骤1: 创建GitHub个人访问令牌

1. 访问：https://github.com/settings/tokens
2. 点击 **"Generate new token"** → **"Generate new token (classic)"**
3. 设置令牌名称：`smart-village-push`
4. 选择权限：
   - ✅ **repo** (完整仓库访问权限)
5. 点击 **"Generate token"** 生成令牌
6. **复制令牌**（只显示一次，请妥善保管）

#### 步骤2: 使用令牌推送

**方法A: 直接推送（推荐）**
```bash
# 替换YOUR_TOKEN为您的实际令牌
git push https://YOUR_TOKEN@github.com/zhihuixiangcun/smart-village-platform.git main
```

**方法B: 使用凭证存储**
```bash
# 切换回HTTPS
git remote set-url origin https://github.com/zhihuixiangcun/smart-village-platform.git

# 推送时会提示输入用户名和密码
# 用户名: GitHub用户名
# 密码: 粘贴令牌（不是GitHub密码）
git push origin main
```

#### 步骤3: 保存凭证（可选）

**Windows (凭证管理器):**
```bash
# 配置凭证助手
git config --global credential.helper wincred

# 下次推送时会保存凭证
git push origin main
```

**Linux/Mac:**
```bash
# 配置凭证缓存
git config --global credential.helper cache

# 缓存1小时
git config --global credential.helper 'cache --timeout=3600'

# 推送时输入一次令牌，会在缓存中保存
git push origin main
```

---

### 方式二：SSH密钥（推荐用于长期使用）

1. **运行自动配置脚本**
   ```
   双击运行: setup-github-ssh.bat
   ```

2. **按提示完成配置**
   - 生成SSH密钥
   - 添加到GitHub
   - 测试连接

3. **推送代码**
   ```bash
   git push origin main
   ```

详细说明请查看: [GitHub SSH 配置指南](github-ssh-setup.md)

---

### 方式三：使用GitHub CLI (gh)

#### 安装GitHub CLI
```bash
# Windows (winget)
winget install --id GitHub.cli

# Mac
brew install gh

# Linux
sudo apt install gh
```

#### 登录并推送
```bash
# 登录GitHub
gh auth login

# 推送代码
git push origin main
```

---

## 🎯 推荐方案

### 临时推送或偶尔推送
→ 使用 **方式一：HTTPS + 个人访问令牌**
- ✅ 最简单快速
- ✅ 无需配置SSH
- ⚠️ 令牌有有效期

### 长期开发或频繁推送
→ 使用 **方式二：SSH密钥**
- ✅ 一次配置，永久使用
- ✅ 更安全
- ✅ 更稳定

### GitHub重度用户
→ 使用 **方式三：GitHub CLI**
- ✅ 功能最强大
- ✅ 集成所有GitHub功能

---

## 📋 当前状态

您的代码已提交到本地，等待推送：

```
当前分支: main
待推送提交: 3个
- 543b5ee 智能值班表系统和一键呼叫功能
- 33293ea 村情地图功能开发
- 63836b5 村民服务增强、安全防护和移动端优化
```

---

## 🚀 立即推送

### 选择最适合您的方式：

**如果您是第一次推送：**
```bash
# 使用HTTPS + 令牌（最简单）
git push https://YOUR_TOKEN@github.com/zhihuixiangcun/smart-village-platform.git main
```

**如果您已配置SSH：**
```bash
git push origin main
```

**或者运行快速推送工具：**
```bash
# Windows
deploy-simple.bat

# Linux/Mac
./deploy.sh push
```

---

## ❓ 常见问题

### Q: 忘记令牌了怎么办？
**A:** 令牌只显示一次，如果忘记了需要重新生成。访问：
https://github.com/settings/tokens

### Q: 推送时提示权限错误？
**A:** 检查令牌是否有 `repo` 权限，或者令牌是否已过期。

### Q: 想要切换推送方式？
**A:**
```bash
# 切换到HTTPS
git remote set-url origin https://github.com/zhihuixiangcun/smart-village-platform.git

# 切换到SSH
git remote set-url origin git@github.com:zhihuixiangcun/smart-village-platform.git

# 查看当前方式
git remote -v
```

---

**最后更新**: 2025-01-03