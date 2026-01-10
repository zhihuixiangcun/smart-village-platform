<!--
  PC端系统设置页面
  智慧乡村综合服务平台 - PC端系统设置
-->
<template>
  <div class="pc-settings">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1>系统设置</h1>
        <p>基本设置、通知设置、安全设置、数据管理</p>
      </div>
    </header>

    <!-- 主内容区域 -->
    <section class="main-section">
      <el-row :gutter="20">
        <!-- 左侧导航 -->
        <el-col :xs="24" :sm="24" :md="6" :lg="5">
          <el-card class="nav-card" shadow="never">
            <el-menu :default-active="activeMenu" @select="handleMenuSelect" class="settings-menu">
              <el-menu-item index="basic">
                <el-icon><Setting /></el-icon>
                <span>基本设置</span>
              </el-menu-item>
              <el-menu-item index="notification">
                <el-icon><Bell /></el-icon>
                <span>通知设置</span>
              </el-menu-item>
              <el-menu-item index="security">
                <el-icon><Lock /></el-icon>
                <span>安全设置</span>
              </el-menu-item>
              <el-menu-item index="data">
                <el-icon><DataBoard /></el-icon>
                <span>数据管理</span>
              </el-menu-item>
              <el-menu-item index="about">
                <el-icon><InfoFilled /></el-icon>
                <span>关于系统</span>
              </el-menu-item>
            </el-menu>
          </el-card>
        </el-col>

        <!-- 右侧内容 -->
        <el-col :xs="24" :sm="24" :md="18" :lg="19">
          <!-- 基本设置 -->
          <el-card v-show="activeMenu === 'basic'" class="content-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><Setting /></el-icon>
                  基本设置
                </span>
                <el-button type="primary" @click="saveBasicSettings">保存设置</el-button>
              </div>
            </template>

            <el-form :model="basicSettings" label-width="120px">
              <el-form-item label="村名称">
                <el-input v-model="basicSettings.villageName" placeholder="请输入村名称" />
              </el-form-item>
              <el-form-item label="所属乡镇">
                <el-input v-model="basicSettings.township" placeholder="请输入所属乡镇" />
              </el-form-item>
              <el-form-item label="村编码">
                <el-input v-model="basicSettings.villageCode" placeholder="请输入村编码" />
              </el-form-item>
              <el-form-item label="联系人">
                <el-input v-model="basicSettings.contactPerson" placeholder="请输入联系人姓名" />
              </el-form-item>
              <el-form-item label="联系电话">
                <el-input v-model="basicSettings.contactPhone" placeholder="请输入联系电话" />
              </el-form-item>
              <el-form-item label="村地址">
                <el-input v-model="basicSettings.address" placeholder="请输入村地址" />
              </el-form-item>
              <el-form-item label="系统语言">
                <el-select v-model="basicSettings.language" placeholder="请选择系统语言">
                  <el-option label="简体中文" value="zh-CN" />
                  <el-option label="English" value="en-US" />
                </el-select>
              </el-form-item>
              <el-form-item label="时区设置">
                <el-select v-model="basicSettings.timezone" placeholder="请选择时区">
                  <el-option label="Asia/Shanghai (UTC+8)" value="Asia/Shanghai" />
                  <el-option label="Asia/Hong_Kong (UTC+8)" value="Asia/Hong_Kong" />
                </el-select>
              </el-form-item>
              <el-form-item label="logo图片">
                <el-upload
                  action="#"
                  :show-file-list="false"
                  :auto-upload="false"
                  :on-change="handleLogoChange"
                >
                  <el-image v-if="basicSettings.logo" :src="basicSettings.logo" class="logo-preview" />
                  <el-button v-else type="primary">上传Logo</el-button>
                </el-upload>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 通知设置 -->
          <el-card v-show="activeMenu === 'notification'" class="content-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><Bell /></el-icon>
                  通知设置
                </span>
                <el-button type="primary" @click="saveNotificationSettings">保存设置</el-button>
              </div>
            </template>

            <div class="settings-group">
              <h3>系统通知</h3>
              <el-form label-width="160px">
                <el-form-item label="新村民注册通知">
                  <el-switch v-model="notificationSettings.newResidentNotify" />
                </el-form-item>
                <el-form-item label="事务审批通知">
                  <el-switch v-model="notificationSettings.approvalNotify" />
                </el-form-item>
                <el-form-item label="系统更新通知">
                  <el-switch v-model="notificationSettings.systemUpdateNotify" />
                </el-form-item>
                <el-form-item label="安全告警通知">
                  <el-switch v-model="notificationSettings.securityAlertNotify" />
                </el-form-item>
              </el-form>
            </div>

            <el-divider />

            <div class="settings-group">
              <h3>通知方式</h3>
              <el-form label-width="160px">
                <el-form-item label="站内消息">
                  <el-switch v-model="notificationSettings.enableSiteMessage" />
                </el-form-item>
                <el-form-item label="短信通知">
                  <el-switch v-model="notificationSettings.enableSms" />
                </el-form-item>
                <el-form-item label="邮件通知">
                  <el-switch v-model="notificationSettings.enableEmail" />
                </el-form-item>
                <el-form-item label="微信推送">
                  <el-switch v-model="notificationSettings.enableWechat" />
                </el-form-item>
              </el-form>
            </div>

            <el-divider />

            <div class="settings-group">
              <h3>免打扰时间</h3>
              <el-form label-width="160px">
                <el-form-item label="开启免打扰">
                  <el-switch v-model="notificationSettings.enableQuietTime" />
                </el-form-item>
                <el-form-item label="免打扰开始时间">
                  <el-time-picker
                    v-model="notificationSettings.quietStart"
                    format="HH:mm"
                    placeholder="选择时间"
                  />
                </el-form-item>
                <el-form-item label="免打扰结束时间">
                  <el-time-picker
                    v-model="notificationSettings.quietEnd"
                    format="HH:mm"
                    placeholder="选择时间"
                  />
                </el-form-item>
              </el-form>
            </div>
          </el-card>

          <!-- 安全设置 -->
          <el-card v-show="activeMenu === 'security'" class="content-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><Lock /></el-icon>
                  安全设置
                </span>
                <el-button type="primary" @click="saveSecuritySettings">保存设置</el-button>
              </div>
            </template>

            <div class="settings-group">
              <h3>密码策略</h3>
              <el-form label-width="160px">
                <el-form-item label="最小密码长度">
                  <el-input-number v-model="securitySettings.minPasswordLength" :min="6" :max="20" />
                </el-form-item>
                <el-form-item label="必须包含数字">
                  <el-switch v-model="securitySettings.requireNumber" />
                </el-form-item>
                <el-form-item label="必须包含大写字母">
                  <el-switch v-model="securitySettings.requireUppercase" />
                </el-form-item>
                <el-form-item label="必须包含特殊字符">
                  <el-switch v-model="securitySettings.requireSpecial" />
                </el-form-item>
                <el-form-item label="密码有效期(天)">
                  <el-input-number v-model="securitySettings.passwordExpiryDays" :min="0" :max="365" />
                </el-form-item>
              </el-form>
            </div>

            <el-divider />

            <div class="settings-group">
              <h3>登录安全</h3>
              <el-form label-width="160px">
                <el-form-item label="登录失败锁定">
                  <el-switch v-model="securitySettings.enableLockout" />
                </el-form-item>
                <el-form-item label="失败次数阈值">
                  <el-input-number
                    v-model="securitySettings.maxLoginAttempts"
                    :min="3"
                    :max="10"
                    :disabled="!securitySettings.enableLockout"
                  />
                </el-form-item>
                <el-form-item label="锁定时间(分钟)">
                  <el-input-number
                    v-model="securitySettings.lockoutMinutes"
                    :min="5"
                    :max="60"
                    :disabled="!securitySettings.enableLockout"
                  />
                </el-form-item>
                <el-form-item label="异地登录检测">
                  <el-switch v-model="securitySettings.detectUnusualLogin" />
                </el-form-item>
                <el-form-item label="强制双因素认证">
                  <el-switch v-model="securitySettings.forceTwoFactor" />
                </el-form-item>
              </el-form>
            </div>

            <el-divider />

            <div class="settings-group">
              <h3>会话管理</h3>
              <el-form label-width="160px">
                <el-form-item label="会话超时(分钟)">
                  <el-input-number v-model="securitySettings.sessionTimeout" :min="5" :max="480" />
                </el-form-item>
                <el-form-item label="单点登录">
                  <el-switch v-model="securitySettings.singleSession" />
                </el-form-item>
              </el-form>
            </div>
          </el-card>

          <!-- 数据管理 -->
          <el-card v-show="activeMenu === 'data'" class="content-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><DataBoard /></el-icon>
                  数据管理
                </span>
              </div>
            </template>

            <div class="settings-group">
              <h3>数据备份</h3>
              <div class="backup-info">
                <div class="info-item">
                  <span class="label">最近备份时间:</span>
                  <span class="value">{{ dataSettings.lastBackupTime }}</span>
                </div>
                <div class="info-item">
                  <span class="label">备份文件大小:</span>
                  <span class="value">{{ dataSettings.backupSize }}</span>
                </div>
                <div class="info-item">
                  <span class="label">自动备份频率:</span>
                  <span class="value">每日凌晨2点</span>
                </div>
              </div>
              <div class="action-buttons">
                <el-button type="primary" @click="handleBackupNow">立即备份</el-button>
                <el-button @click="handleRestoreBackup">恢复备份</el-button>
                <el-button @click="handleDownloadBackup">下载备份</el-button>
              </div>
            </div>

            <el-divider />

            <div class="settings-group">
              <h3>自动备份设置</h3>
              <el-form label-width="160px">
                <el-form-item label="开启自动备份">
                  <el-switch v-model="dataSettings.enableAutoBackup" />
                </el-form-item>
                <el-form-item label="备份频率">
                  <el-select v-model="dataSettings.backupFrequency" :disabled="!dataSettings.enableAutoBackup">
                    <el-option label="每日" value="daily" />
                    <el-option label="每周" value="weekly" />
                    <el-option label="每月" value="monthly" />
                  </el-select>
                </el-form-item>
                <el-form-item label="保留备份数量">
                  <el-input-number v-model="dataSettings.keepBackupCount" :min="1" :max="30" />
                </el-form-item>
              </el-form>
            </div>

            <el-divider />

            <div class="settings-group">
              <h3>数据清理</h3>
              <el-form label-width="160px">
                <el-form-item label="日志保留天数">
                  <el-input-number v-model="dataSettings.logRetentionDays" :min="7" :max="365" />
                </el-form-item>
                <el-form-item label="清理临时文件">
                  <el-button type="warning" @click="handleCleanTempFiles">清理临时文件</el-button>
                </el-form-item>
              </el-form>
            </div>

            <el-divider />

            <div class="settings-group danger-zone">
              <h3>危险操作</h3>
              <p class="warning-text">以下操作具有不可逆性，请谨慎操作</p>
              <div class="danger-actions">
                <el-button type="danger" @click="handleClearData">清空所有数据</el-button>
                <el-button type="danger" @click="handleResetSystem">重置系统</el-button>
              </div>
            </div>
          </el-card>

          <!-- 关于系统 -->
          <el-card v-show="activeMenu === 'about'" class="content-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><InfoFilled /></el-icon>
                  关于系统
                </span>
              </div>
            </template>

            <div class="about-section">
              <div class="system-info">
                <el-image :src="basicSettings.logo" class="system-logo" fit="contain" />
                <div class="system-details">
                  <h2>智慧乡村综合服务平台</h2>
                  <p class="version">版本号: {{ systemInfo.version }}</p>
                  <p class="build">构建时间: {{ systemInfo.buildTime }}</p>
                </div>
              </div>

              <el-descriptions :column="2" border class="info-descriptions">
                <el-descriptions-item label="系统名称">智慧乡村综合服务平台</el-descriptions-item>
                <el-descriptions-item label="版本号">{{ systemInfo.version }}</el-descriptions-item>
                <el-descriptions-item label="前端框架">Vue 3 + Vite</el-descriptions-item>
                <el-descriptions-item label="后端框架">Node.js + Express</el-descriptions-item>
                <el-descriptions-item label="数据库">MongoDB</el-descriptions-item>
                <el-descriptions-item label="实时通信">Socket.IO</el-descriptions-item>
                <el-descriptions-item label="开发团队" :span="2">智慧乡村开发团队</el-descriptions-item>
                <el-descriptions-item label="技术支持">技术支持邮箱: support@village.com</el-descriptions-item>
                <el-descriptions-item label="官方网站">https://www.smart-village.com</el-descriptions-item>
              </el-descriptions>

              <div class="update-section">
                <h3>检查更新</h3>
                <div class="update-info">
                  <p>当前版本: {{ systemInfo.version }}</p>
                  <p>最新版本: {{ systemInfo.latestVersion }}</p>
                  <p v-if="systemInfo.hasUpdate" class="update-available">
                    <el-tag type="success">有新版本可用</el-tag>
                    <el-button type="primary" size="small" @click="handleUpdate">立即更新</el-button>
                  </p>
                  <p v-else class="update-latest">
                    <el-tag type="info">当前已是最新版本</el-tag>
                  </p>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Setting,
  Bell,
  Lock,
  DataBoard,
  InfoFilled,
} from '@element-plus/icons-vue';

const activeMenu = ref('basic');

const basicSettings = reactive({
  villageName: '阳光村',
  township: '清河镇',
  villageCode: 'VILLAGE001',
  contactPerson: '村支书',
  contactPhone: '138****1234',
  address: 'XX省XX市XX县清河镇阳光村',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  logo: '',
});

const notificationSettings = reactive({
  newResidentNotify: true,
  approvalNotify: true,
  systemUpdateNotify: true,
  securityAlertNotify: true,
  enableSiteMessage: true,
  enableSms: false,
  enableEmail: true,
  enableWechat: true,
  enableQuietTime: true,
  quietStart: new Date(2024, 0, 1, 22, 0),
  quietEnd: new Date(2024, 0, 1, 8, 0),
});

const securitySettings = reactive({
  minPasswordLength: 8,
  requireNumber: true,
  requireUppercase: false,
  requireSpecial: false,
  passwordExpiryDays: 90,
  enableLockout: true,
  maxLoginAttempts: 5,
  lockoutMinutes: 30,
  detectUnusualLogin: true,
  forceTwoFactor: false,
  sessionTimeout: 60,
  singleSession: false,
});

const dataSettings = reactive({
  lastBackupTime: '2024-12-01 02:00:00',
  backupSize: '256 MB',
  enableAutoBackup: true,
  backupFrequency: 'daily',
  keepBackupCount: 7,
  logRetentionDays: 30,
});

const systemInfo = reactive({
  version: '1.0.0',
  buildTime: '2024-12-01 10:30:00',
  latestVersion: '1.0.0',
  hasUpdate: false,
});

const handleMenuSelect = (index: string) => {
  activeMenu.value = index;
};

const handleLogoChange = (file: { raw: File }) => {
  const reader = new FileReader();
  reader.onload = (e: ProgressEvent<FileReader>) => {
    basicSettings.logo = e.target?.result as string;
  };
  reader.readAsDataURL(file.raw);
};

const saveBasicSettings = () => {
  ElMessage.success('基本设置已保存');
};

const saveNotificationSettings = () => {
  ElMessage.success('通知设置已保存');
};

const saveSecuritySettings = () => {
  ElMessage.success('安全设置已保存');
};

const handleBackupNow = async () => {
  try {
    await ElMessageBox.confirm('确定要立即执行备份吗？', '确认备份', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    });
    ElMessage.success('备份任务已启动，请稍候...');
  } catch {}
};

const handleRestoreBackup = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要从备份恢复数据吗？这将覆盖当前所有数据。',
      '确认恢复',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    ElMessage.success('恢复任务已启动，请稍候...');
  } catch {}
};

const handleDownloadBackup = () => {
  ElMessage.info('开始下载备份文件...');
};

const handleCleanTempFiles = async () => {
  try {
    await ElMessageBox.confirm('确定要清理临时文件吗？', '确认清理', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    ElMessage.success('临时文件清理完成');
  } catch {}
};

const handleClearData = async () => {
  try {
    await ElMessageBox.confirm(
      '警告：此操作将清空所有数据，且无法恢复！确定要继续吗？',
      '危险操作确认',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'danger',
      }
    );
    ElMessage.error('数据清空功能需要管理员权限');
  } catch {}
};

const handleResetSystem = async () => {
  try {
    await ElMessageBox.confirm(
      '警告：此操作将重置整个系统，包括所有配置和数据！确定要继续吗？',
      '危险操作确认',
      {
        confirmButtonText: '确定重置',
        cancelButtonText: '取消',
        type: 'danger',
      }
    );
    ElMessage.error('系统重置功能需要超级管理员权限');
  } catch {}
};

const handleUpdate = () => {
  ElMessage.info('正在检查更新...');
};
</script>

<style lang="scss" scoped>
.pc-settings {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

  .header-content {
    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }

    p {
      margin: 0;
      font-size: 14px;
      color: #909399;
    }
  }
}

.nav-card {
  position: sticky;
  top: 88px;

  .settings-menu {
    border-right: none;

    :deep(.el-menu-item) {
      height: 48px;
      line-height: 48px;
      margin: 4px 0;
      border-radius: 8px;

      &:hover {
        background-color: #f5f7fa;
      }

      &.is-active {
        background-color: #ecf5ff;
        color: #409eff;
      }
    }
  }
}

.content-card {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.settings-group {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }

  h3 {
    margin: 0 0 20px;
    font-size: 16px;
    font-weight: 500;
    color: #303133;
  }
}

.backup-info {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;

  .info-item {
    display: flex;
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    .label {
      width: 140px;
      color: #909399;
    }

    .value {
      color: #303133;
    }
  }
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.logo-preview {
  width: 120px;
  height: 60px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
}

.danger-zone {
  border: 1px solid #f56c6c;
  border-radius: 8px;
  padding: 20px;
  background: #fef0f0;

  h3 {
    color: #f56c6c;
  }

  .warning-text {
    color: #909399;
    font-size: 13px;
    margin: 0 0 16px;
  }

  .danger-actions {
    display: flex;
    gap: 12px;
  }
}

.about-section {
  .system-info {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 1px solid #ebeef5;

    .system-logo {
      width: 80px;
      height: 80px;
      border-radius: 12px;
    }

    .system-details {
      h2 {
        margin: 0 0 8px;
        font-size: 24px;
        font-weight: 600;
        color: #303133;
      }

      .version {
        margin: 0 0 4px;
        font-size: 14px;
        color: #606266;
      }

      .build {
        margin: 0;
        font-size: 13px;
        color: #909399;
      }
    }
  }

  .info-descriptions {
    margin-bottom: 32px;
  }

  .update-section {
    h3 {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }

    .update-info {
      background: #f5f7fa;
      padding: 16px;
      border-radius: 8px;

      p {
        margin: 0 0 8px;
        font-size: 14px;
        color: #606266;

        &:last-child {
          margin-bottom: 0;
        }
      }

      .update-available {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .update-latest {
        display: flex;
        align-items: center;
      }
    }
  }
}

@media (max-width: 768px) {
  .nav-card {
    position: static;
  }

  .about-section {
    .system-info {
      flex-direction: column;
      text-align: center;
    }
  }
}
</style>
