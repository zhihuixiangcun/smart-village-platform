# GitHub SSH 配置指南

## 为什么使用SSH？

- ✅ 更安全（公钥加密）
- ✅ 更稳定（不需要每次输入密码）
- ✅ 更便捷（一次配置，永久使用）
- ✅ 绕过HTTPS连接问题

---

## 📋 步骤一：检查现有SSH密钥

### Windows (Git Bash)
```bash
# 检查是否已有SSH密钥
ls ~/.ssh
# 或
dir ~/.ssh
```

### Linux/Mac
```bash
# 检查是否已有SSH密钥
ls -al ~/.ssh
```

**如果看到以下文件，说明已有SSH密钥：**
- `id_rsa.pub`
- `id_ed25519.pub`

---

## 🔑 步骤二：生成新的SSH密钥（如果没有）

### 生成Ed25519密钥（推荐）
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

### 或生成RSA密钥
```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

**提示：**
- 按Enter使用默认位置
- 可以设置密码或留空
- 记住您的密码（如果设置了）

---

## 📤 步骤三：添加SSH密钥到GitHub

### 1. 复制公钥

**Windows (Git Bash):**
```bash
cat ~/.ssh/id_ed25519.pub | clip
```

**Linux:**
```bash
cat ~/.ssh/id_ed25519.pub
# 复制输出内容
```

**Mac:**
```bash
pbcopy < ~/.ssh/id_ed25519.pub
# 或
cat ~/.ssh/id_ed25519.pub | pbcopy
```

### 2. 添加到GitHub

1. 访问 [GitHub SSH设置](https://github.com/settings/keys)
2. 点击 **"New SSH key"**
3. 粘贴公钥内容
4. 点击 **"Add SSH key"**
5. 可能需要输入GitHub密码验证

---

## ✅ 步骤四：测试SSH连接

```bash
ssh -T git@github.com
```

**成功示例：**
```
Hi zhihuixiangcun! You've successfully authenticated, but GitHub does not provide shell access.
```

**如果看到这个消息，说明配置成功！**

---

## 🔄 步骤五：切换仓库到SSH

### 查看当前远程仓库
```bash
git remote -v
```

### 切换到SSH方式
```bash
git remote set-url origin git@github.com:username/repository.git
```

### 对于本项目
```bash
git remote set-url origin git@github.com:zhihuixiangcun/smart-village-platform.git
```

### 验证切换成功
```bash
git remote -v
```

应该看到：
```
origin  git@github.com:zhihuixiangcun/smart-village-platform.git (fetch)
origin  git@github.com:zhihuixiangcun/smart-village-platform.git (push)
```

---

## 🚀 步骤六：推送代码

```bash
# 推送所有本地提交
git push origin main
```

**第一次可能需要：**
- 确认SSH指纹（输入 `yes`）
- 输入SSH密钥密码（如果设置了）

---

## 🔧 故障排查

### 问题1: Permission denied (publickey)
**原因：** SSH密钥未添加到GitHub

**解决：**
```bash
# 1. 检查SSH agent是否运行
eval "$(ssh-agent -s)"

# 2. 添加私钥到SSH agent
ssh-add ~/.ssh/id_ed25519
# 或
ssh-add ~/.ssh/id_rsa

# 3. 重新测试
ssh -T git@github.com
```

### 问题2: Could not open a connection to your authentication agent
**解决：**
```bash
# 启动SSH agent
eval "$(ssh-agent -s)"

# 添加私钥
ssh-add ~/.ssh/id_ed25519
```

### 问题3: SSH连接超时
**解决：**
```bash
# 创建SSH配置文件
cat > ~/.ssh/config << EOF
Host github.com
    HostName ssh.github.com
    Port 443
    User git
    IdentityFile ~/.ssh/id_ed25519
EOF

# 测试连接
ssh -T git@github.com
```

### 问题4: 多个SSH密钥冲突
**解决：**
```bash
# 编辑SSH配置
nano ~/.ssh/config

# 添加以下内容
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
```

---

## 📝 Windows特别说明

### 使用Git Bash
1. 打开 **Git Bash**
2. 按照上述步骤操作

### 使用PowerShell
```powershell
# 生成SSH密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 复制公钥
cat $env:USERPROFILE\.ssh\id_ed25519.pub | clip

# 测试连接
ssh -T git@github.com
```

### 使用CMD
```cmd
# 生成SSH密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 复制公钥
type %USERPROFILE%\.ssh\id_ed25519.pub | clip

# 测试连接
ssh -T git@github.com
```

---

## 🎯 快速配置脚本

### Linux/Mac
```bash
#!/bin/bash
# 快速配置GitHub SSH

echo "=== GitHub SSH 快速配置 ==="

# 1. 生成密钥
echo "1. 生成SSH密钥..."
ssh-keygen -t ed25519 -C "$(git config user.email)" -f ~/.ssh/id_ed25519 -N ""

# 2. 启动SSH agent
echo "2. 启动SSH agent..."
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 3. 复制公钥
echo "3. 复制以下公钥到GitHub:"
echo "----------------------------------------"
cat ~/.ssh/id_ed25519.pub
echo "----------------------------------------"
echo ""
echo "访问: https://github.com/settings/keys"
echo "点击 'New SSH key' 并粘贴上述内容"
echo ""
read -p "按Enter继续测试连接..."

# 4. 测试连接
echo "4. 测试SSH连接..."
ssh -T git@github.com || true

echo "=== 配置完成 ==="
```

### Windows (PowerShell)
```powershell
# 快速配置GitHub SSH

Write-Host "=== GitHub SSH 快速配置 ===" -ForegroundColor Green

# 1. 生成密钥
Write-Host "1. 生成SSH密钥..." -ForegroundColor Yellow
ssh-keygen -t ed25519 -C (git config user.email) -f "$env:USERPROFILE\.ssh\id_ed25519" -N ""

# 2. 启动SSH agent
Write-Host "2. 启动SSH agent..." -ForegroundColor Yellow
Start-Service ssh-agent
ssh-add "$env:USERPROFILE\.ssh\id_ed25519"

# 3. 复制公钥
Write-Host "3. 公钥已复制到剪贴板" -ForegroundColor Yellow
cat "$env:USERPROFILE\.ssh\id_ed25519.pub" | clip

Write-Host "访问: https://github.com/settings/keys"
Write-Host "点击 'New SSH key' 并粘贴剪贴板内容"
Read-Host "按Enter继续测试连接"

# 4. 测试连接
Write-Host "4. 测试SSH连接..." -ForegroundColor Yellow
ssh -T git@github.com

Write-Host "=== 配置完成 ===" -ForegroundColor Green
```

---

## 📚 相关资源

- [GitHub官方文档 - 生成SSH密钥](https://docs.github.com/zh/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
- [GitHub官方文档 - 添加SSH密钥到账户](https://docs.github.com/zh/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account)
- [GitHub官方文档 - 测试SSH连接](https://docs.github.com/zh/authentication/connecting-to-github-with-ssh/testing-your-ssh-connection)

---

**最后更新**: 2025-01-03
**适用版本**: Git 2.30+, GitHub