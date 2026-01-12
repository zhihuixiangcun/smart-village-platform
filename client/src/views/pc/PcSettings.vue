<!--
  PC端系统设置页面
  智慧乡村综合服务平台 - PC端系统设置
-->
<template>
  <div class="pc-settings" role="main" aria-label="系统设置页面">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1>系统设置</h1>
        <p>基本设置、通知设置、安全设置、数据管理</p>
      </div>
    </header>

    <!-- 主内容区域 -->
    <section class="main-section" role="region" aria-label="主内容区域">
      <el-row :gutter="20">
        <!-- 左侧导航 -->
        <el-col :xs="24" :sm="24" :md="6" :lg="5">
          <el-card class="nav-card" shadow="never" role="region" aria-label="设置导航">
            <nav>
              <el-menu :default-active="activeMenu" @select="handleMenuSelect" class="settings-menu" role="navigation" aria-label="设置菜单">
                <el-menu-item index="basic" role="menuitem" tabindex="0" aria-label="基本设置">
                  <el-icon><Setting /></el-icon>
                  <span>基本设置</span>
                </el-menu-item>
                <el-menu-item index="notification" role="menuitem" tabindex="0" aria-label="通知设置">
                  <el-icon><Bell /></el-icon>
                  <span>通知设置</span>
                </el-menu-item>
                <el-menu-item index="security" role="menuitem" tabindex="0" aria-label="安全设置">
                  <el-icon><Lock /></el-icon>
                  <span>安全设置</span>
                </el-menu-item>
                <el-menu-item index="data" role="menuitem" tabindex="0" aria-label="数据管理">
                  <el-icon><DataBoard /></el-icon>
                  <span>数据管理</span>
                </el-menu-item>
                <el-menu-item index="about" role="menuitem" tabindex="0" aria-label="关于系统">
                  <el-icon><InfoFilled /></el-icon>
                  <span>关于系统</span>
                </el-menu-item>
              </el-menu>
            </nav>
          </el-card>
        </el-col>

        <!-- 右侧内容 -->
        <el-col :xs="24" :sm="24" :md="18" :lg="19">
          <!-- 基本设置 -->
          <el-card v-show="activeMenu === 'basic'" class="content-card" shadow="never" role="region" aria-label="基本设置">
            <template #header>
              <div class="card-header">
                <h2 class="card-title">
                  <el-icon><Setting /></el-icon>
                  基本设置
                </h2>
                <el-button type="primary" @click="saveBasicSettings" aria-label="保存基本设置">保存设置</el-button>
              </div>
            </template>

            <SkeletonScreen v-if="loading" type="card" :rows="4" />

            <el-form v-else :model="basicSettings" label-width="120px">
              <el-form-item label="村名称">
                <el-input v-model="basicSettings.villageName" placeholder="请输入村名称" aria-label="村名称" />
              </el-form-item>
              <el-form-item label="所属乡镇">
                <el-input v-model="basicSettings.township" placeholder="请输入所属乡镇" aria-label="所属乡镇" />
              </el-form-item>
              <el-form-item label="村编码">
                <el-input v-model="basicSettings.villageCode" placeholder="请输入村编码" aria-label="村编码" />
              </el-form-item>
              <el-form-item label="联系人">
                <el-input v-model="basicSettings.contactPerson" placeholder="请输入联系人姓名" aria-label="联系人" />
              </el-form-item>
              <el-form-item label="联系电话">
                <el-input v-model="basicSettings.contactPhone" placeholder="请输入联系电话" aria-label="联系电话" />
              </el-form-item>
              <el-form-item label="村地址">
                <el-input v-model="basicSettings.address" placeholder="请输入村地址" aria-label="村地址" />
              </el-form-item>
              <el-form-item label="系统语言">
                <el-select v-model="basicSettings.language" placeholder="请选择系统语言" aria-label="系统语言">
                  <el-option label="简体中文" value="zh-CN" />
                  <el-option label="English" value="en-US" />
                </el-select>
              </el-form-item>
              <el-form-item label="时区设置">
                <el-select v-model="basicSettings.timezone" placeholder="请选择时区" aria-label="时区设置">
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
                  aria-label="上传logo图片"
                >
                  <el-image
                    v-if="basicSettings.logo"
                    :src="basicSettings.logo"
                    class="logo-preview"
                    alt="系统logo预览"
                  />
                  <el-button v-else type="primary">上传Logo</el-button>
                </el-upload>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 通知设置 -->
          <el-card v-show="activeMenu === 'notification'" class="content-card" shadow="never" role="region" aria-label="通知设置">
            <template #header>
              <div class="card-header">
                <h2 class="card-title">
                  <el-icon><Bell /></el-icon>
                  通知设置
                </h2>
                <el-button type="primary" @click="saveNotificationSettings" aria-label="保存通知设置">保存设置</el-button>
              </div>
            </template>

            <SkeletonScreen v-if="loading" type="list" :rows="5" />

            <div v-else class="settings-group" role="list" aria-label="系统通知设置">
              <h3>系统通知</h3>
              <el-form label-width="160px">
                <el-form-item label="新村民注册通知">
                  <el-switch v-model="notificationSettings.newResidentNotify" role="switch" :aria-checked="notificationSettings.newResidentNotify" aria-label="新村民注册通知" />
                </el-form-item>
                <el-form-item label="事务审批通知">
                  <el-switch v-model="notificationSettings.approvalNotify" role="switch" :aria-checked="notificationSettings.approvalNotify" aria-label="事务审批通知" />
                </el-form-item>
                <el-form-item label="系统更新通知">
                  <el-switch v-model="notificationSettings.systemUpdateNotify" role="switch" :aria-checked="notificationSettings.systemUpdateNotify" aria-label="系统更新通知" />
                </el-form-item>
                <el-form-item label="安全告警通知">
                  <el-switch v-model="notificationSettings.securityAlertNotify" role="switch" :aria-checked="notificationSettings.securityAlertNotify" aria-label="安全告警通知" />
                </el-form-item>
              </el-form>
            </div>

            <el-divider />

            <div class="settings-group" role="list" aria-label="通知方式设置">
              <h3>通知方式</h3>
              <el-form label-width="160px">
                <el-form-item label="站内消息">
                  <el-switch v-model="notificationSettings.enableSiteMessage" role="switch" :aria-checked="notificationSettings.enableSiteMessage" aria-label="站内消息通知" />
                </el-form-item>
                <el-form-item label="短信通知">
                  <el-switch v-model="notificationSettings.enableSms" role="switch" :aria-checked="notificationSettings.enableSms" aria-label="短信通知" />
                </el-form-item>
                <el-form-item label="邮件通知">
                  <el-switch v-model="notificationSettings.enableEmail" role="switch" :aria-checked="notificationSettings.enableEmail" aria-label="邮件通知" />
                </el-form-item>
                <el-form-item label="微信推送">
                  <el-switch v-model="notificationSettings.enableWechat" role="switch" :aria-checked="notificationSettings.enableWechat" aria-label="微信推送通知" />
                </el-form-item>
              </el-form>
            </div>

            <el-divider />

            <div class="settings-group" role="list" aria-label="免打扰时间设置">
              <h3>免打扰时间</h3>
              <el-form label-width="160px">
                <el-form-item label="开启免打扰">
                  <el-switch v-model="notificationSettings.enableQuietTime" role="switch" :aria-checked="notificationSettings.enableQuietTime" aria-label="开启免打扰模式" />
                </el-form-item>
                <el-form-item label="免打扰开始时间">
                  <el-time-picker
                    v-model="notificationSettings.quietStart"
                    format="HH:mm"
                    placeholder="选择时间"
                    aria-label="免打扰开始时间"
                  />
                </el-form-item>
                <el-form-item label="免打扰结束时间">
                  <el-time-picker
                    v-model="notificationSettings.quietEnd"
                    format="HH:mm"
                    placeholder="选择时间"
                    aria-label="免打扰结束时间"
                  />
                </el-form-item>
              </el-form>
            </div>
          </el-card>

          <!-- 安全设置 -->
          <el-card v-show="activeMenu === 'security'" class="content-card" shadow="never" role="region" aria-label="安全设置">
            <template #header>
              <div class="card-header">
                <h2 class="card-title">
                  <el-icon><Lock /></el-icon>
                  安全设置
                </h2>
                <el-button type="primary" @click="saveSecuritySettings" aria-label="保存安全设置">保存设置</el-button>
              </div>
            </template>

            <SkeletonScreen v-if="loading" type="list" :rows="5" />

            <div v-else class="settings-group" role="list" aria-label="密码策略设置">
              <h3>密码策略</h3>
              <el-form label-width="160px">
                <el-form-item label="最小密码长度">
                  <el-input-number
                    v-model="securitySettings.minPasswordLength"
                    :min="6"
                    :max="20"
                    aria-label="最小密码长度"
                  />
                </el-form-item>
                <el-form-item label="必须包含数字">
                  <el-switch v-model="securitySettings.requireNumber" role="switch" :aria-checked="securitySettings.requireNumber" aria-label="必须包含数字" />
                </el-form-item>
                <el-form-item label="必须包含大写字母">
                  <el-switch v-model="securitySettings.requireUppercase" role="switch" :aria-checked="securitySettings.requireUppercase" aria-label="必须包含大写字母" />
                </el-form-item>
                <el-form-item label="必须包含特殊字符">
                  <el-switch v-model="securitySettings.requireSpecial" role="switch" :aria-checked="securitySettings.requireSpecial" aria-label="必须包含特殊字符" />
                </el-form-item>
                <el-form-item label="密码有效期(天)">
                  <el-input-number
                    v-model="securitySettings.passwordExpiryDays"
                    :min="0"
                    :max="365"
                    aria-label="密码有效期天数"
                  />
                </el-form-item>
              </el-form>
            </div>

            <el-divider />

            <div class="settings-group" role="list" aria-label="登录安全设置">
              <h3>登录安全</h3>
              <el-form label-width="160px">
                <el-form-item label="登录失败锁定">
                  <el-switch v-model="securitySettings.enableLockout" role="switch" :aria-checked="securitySettings.enableLockout" aria-label="登录失败锁定" />
                </el-form-item>
                <el-form-item label="失败次数阈值">
                  <el-input-number
                    v-model="securitySettings.maxLoginAttempts"
                    :min="3"
                    :max="10"
                    :disabled="!securitySettings.enableLockout"
                    aria-label="失败次数阈值"
                  />
                </el-form-item>
                <el-form-item label="锁定时间(分钟)">
                  <el-input-number
                    v-model="securitySettings.lockoutMinutes"
                    :min="5"
                    :max="60"
                    :disabled="!securitySettings.enableLockout"
                    aria-label="锁定时间分钟"
                  />
                </el-form-item>
                <el-form-item label="异地登录检测">
                  <el-switch v-model="securitySettings.detectUnusualLogin" role="switch" :aria-checked="securitySettings.detectUnusualLogin" aria-label="异地登录检测" />
                </el-form-item>
                <el-form-item label="强制双因素认证">
                  <el-switch v-model="securitySettings.forceTwoFactor" role="switch" :aria-checked="securitySettings.forceTwoFactor" aria-label="强制双因素认证" />
                </el-form-item>
              </el-form>
            </div>

            <el-divider />

            <div class="settings-group" role="list" aria-label="会话管理设置">
              <h3>会话管理</h3>
              <el-form label-width="160px">
                <el-form-item label="会话超时(分钟)">
                  <el-input-number v-model="securitySettings.sessionTimeout" :min="5" :max="480" aria-label="会话超时分钟" />
                </el-form-item>
                <el-form-item label="单点登录">
                  <el-switch v-model="securitySettings.singleSession" role="switch" :aria-checked="securitySettings.singleSession" aria-label="单点登录" />
                </el-form-item>
              </el-form>
            </div>
          </el-card>

          <!-- 数据管理 -->
          <el-card v-show="activeMenu === 'data'" class="content-card" shadow="never" role="region" aria-label="数据管理">
            <template #header>
              <div class="card-header">
                <h2 class="card-title">
                  <el-icon><DataBoard /></el-icon>
                  数据管理
                </h2>
              </div>
            </template>

            <SkeletonScreen v-if="loading" type="card" :rows="4" />

            <div v-else class="settings-group" role="list" aria-label="数据备份信息">
              <h3>数据备份</h3>
              <div class="backup-info" role="group" aria-label="备份信息">
                <div class="info-item" role="listitem">
                  <span class="label">最近备份时间:</span>
                  <span class="value">{{ dataSettings.lastBackupTime }}</span>
                </div>
                <div class="info-item" role="listitem">
                  <span class="label">备份文件大小:</span>
                  <span class="value">{{ dataSettings.backupSize }}</span>
                </div>
                <div class="info-item" role="listitem">
                  <span class="label">自动备份频率:</span>
                  <span class="value">每日凌晨2点</span>
                </div>
              </div>
              <div class="action-buttons" role="group" aria-label="备份操作按钮">
                <el-button type="primary" @click="handleBackupNow" aria-label="立即备份">立即备份</el-button>
                <el-button @click="handleRestoreBackup" aria-label="恢复备份">恢复备份</el-button>
                <el-button @click="handleDownloadBackup" aria-label="下载备份">下载备份</el-button>
              </div>
            </div>

            <el-divider />

            <div class="settings-group" role="list" aria-label="自动备份设置">
              <h3>自动备份设置</h3>
              <el-form label-width="160px">
                <el-form-item label="开启自动备份">
                  <el-switch v-model="dataSettings.enableAutoBackup" role="switch" :aria-checked="dataSettings.enableAutoBackup" aria-label="开启自动备份" />
                </el-form-item>
                <el-form-item label="备份频率">
                  <el-select
                    v-model="dataSettings.backupFrequency"
                    :disabled="!dataSettings.enableAutoBackup"
                    aria-label="备份频率"
                  >
                    <el-option label="每日" value="daily" />
                    <el-option label="每周" value="weekly" />
                    <el-option label="每月" value="monthly" />
                  </el-select>
                </el-form-item>
                <el-form-item label="保留备份数量">
                  <el-input-number v-model="dataSettings.keepBackupCount" :min="1" :max="30" aria-label="保留备份数量" />
                </el-form-item>
              </el-form>
            </div>

            <el-divider />

            <div class="settings-group" role="list" aria-label="数据清理设置">
              <h3>数据清理</h3>
              <el-form label-width="160px">
                <el-form-item label="日志保留天数">
                  <el-input-number v-model="dataSettings.logRetentionDays" :min="7" :max="365" aria-label="日志保留天数" />
                </el-form-item>
                <el-form-item label="清理临时文件">
                  <el-button type="warning" @click="handleCleanTempFiles" aria-label="清理临时文件">清理临时文件</el-button>
                </el-form-item>
              </el-form>
            </div>

            <el-divider />

            <div class="settings-group danger-zone" role="region" aria-label="危险操作区域">
              <h3>危险操作</h3>
              <p class="warning-text">以下操作具有不可逆性，请谨慎操作</p>
              <div class="danger-actions" role="group" aria-label="危险操作按钮">
                <el-button type="danger" @click="handleClearData" aria-label="清空所有数据">清空所有数据</el-button>
                <el-button type="danger" @click="handleResetSystem" aria-label="重置系统">重置系统</el-button>
              </div>
            </div>
          </el-card>

          <!-- 关于系统 -->
          <el-card v-show="activeMenu === 'about'" class="content-card" shadow="never" role="region" aria-label="关于系统">
            <template #header>
              <div class="card-header">
                <h2 class="card-title">
                  <el-icon><InfoFilled /></el-icon>
                  关于系统
                </h2>
              </div>
            </template>

            <SkeletonScreen v-if="loading" type="card" :rows="4" />

            <div v-else class="about-section" role="region" aria-label="系统信息">
              <div class="system-info" role="region" aria-label="系统基本信息">
                <el-image :src="basicSettings.logo" class="system-logo" fit="contain" alt="系统logo" />
                <div class="system-details">
                  <h2>智慧乡村综合服务平台</h2>
                  <p class="version">版本号: {{ systemInfo.version }}</p>
                  <p class="build">构建时间: {{ systemInfo.buildTime }}</p>
                </div>
              </div>

              <el-descriptions :column="2" border class="info-descriptions" role="list" aria-label="系统详细信息">
                <el-descriptions-item label="系统名称">智慧乡村综合服务平台</el-descriptions-item>
                <el-descriptions-item label="版本号">{{ systemInfo.version }}</el-descriptions-item>
                <el-descriptions-item label="前端框架">Vue 3 + Vite</el-descriptions-item>
                <el-descriptions-item label="后端框架">Node.js + Express</el-descriptions-item>
                <el-descriptions-item label="数据库">MongoDB</el-descriptions-item>
                <el-descriptions-item label="实时通信">Socket.IO</el-descriptions-item>
                <el-descriptions-item label="开发团队" :span="2"
                  >智慧乡村开发团队</el-descriptions-item
                >
                <el-descriptions-item label="技术支持"
                  >技术支持邮箱: support@village.com</el-descriptions-item
                >
                <el-descriptions-item label="官方网站"
                  >https://www.smart-village.com</el-descriptions-item
                >
              </el-descriptions>

              <div class="update-section" role="region" aria-label="系统更新信息">
                <h3>检查更新</h3>
                <div class="update-info" role="list">
                  <p role="listitem">当前版本: {{ systemInfo.version }}</p>
                  <p role="listitem">最新版本: {{ systemInfo.latestVersion }}</p>
                  <p v-if="systemInfo.hasUpdate" class="update-available" role="listitem">
                    <el-tag type="success">有新版本可用</el-tag>
                    <el-button type="primary" size="small" @click="handleUpdate" aria-label="立即更新系统"
                      >立即更新</el-button
                    >
                  </p>
                  <p v-else class="update-latest" role="listitem">
                    <el-tag type="info">当前已是最新版本</el-tag>
                  </p>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <!-- 通知区域 -->
    <div
      v-if="notification"
      role="alert"
      :aria-live="notification.type === 'error' ? 'assertive' : 'polite'"
      :aria-label="notification.message"
      class="sr-only"
    >
      {{ notification.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Setting, Bell, Lock, DataBoard, InfoFilled } from '@element-plus/icons-vue';
import SkeletonScreen from '@/components/common/SkeletonScreen.vue';

const activeMenu = ref('basic');
const loading = ref(true);
const notification = ref<{ message: string; type: string } | null>(null);

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
  notification.value = { message: '基本设置已保存', type: 'success' };
  setTimeout(() => (notification.value = null), 3000);
};

const saveNotificationSettings = () => {
  ElMessage.success('通知设置已保存');
  notification.value = { message: '通知设置已保存', type: 'success' };
  setTimeout(() => (notification.value = null), 3000);
};

const saveSecuritySettings = () => {
  ElMessage.success('安全设置已保存');
  notification.value = { message: '安全设置已保存', type: 'success' };
  setTimeout(() => (notification.value = null), 3000);
};

const handleBackupNow = async () => {
  try {
    await ElMessageBox.confirm('确定要立即执行备份吗？', '确认备份', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
      confirmButtonProps: { 'aria-label': '确认立即备份' },
      cancelButtonProps: { 'aria-label': '取消备份' },
    });
    ElMessage.success('备份任务已启动，请稍候...');
    notification.value = { message: '备份任务已启动，请稍候...', type: 'success' };
    setTimeout(() => (notification.value = null), 3000);
  } catch {}
};

const handleRestoreBackup = async () => {
  try {
    await ElMessageBox.confirm('确定要从备份恢复数据吗？这将覆盖当前所有数据。', '确认恢复', {
      confirmButtonText: '确定恢复',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonProps: { 'aria-label': '确认恢复备份' },
      cancelButtonProps: { 'aria-label': '取消恢复' },
    });
    ElMessage.success('恢复任务已启动，请稍候...');
    notification.value = { message: '恢复任务已启动，请稍候...', type: 'success' };
    setTimeout(() => (notification.value = null), 3000);
  } catch {}
};

const handleDownloadBackup = () => {
  ElMessage.info('开始下载备份文件...');
  notification.value = { message: '开始下载备份文件...', type: 'info' };
  setTimeout(() => (notification.value = null), 3000);
};

const handleCleanTempFiles = async () => {
  try {
    await ElMessageBox.confirm('确定要清理临时文件吗？', '确认清理', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonProps: { 'aria-label': '确认清理临时文件' },
      cancelButtonProps: { 'aria-label': '取消清理' },
    });
    ElMessage.success('临时文件清理完成');
    notification.value = { message: '临时文件清理完成', type: 'success' };
    setTimeout(() => (notification.value = null), 3000);
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
        confirmButtonProps: { 'aria-label': '确认清空所有数据' },
        cancelButtonProps: { 'aria-label': '取消清空' },
      }
    );
    ElMessage.error('数据清空功能需要管理员权限');
    notification.value = { message: '数据清空功能需要管理员权限', type: 'error' };
    setTimeout(() => (notification.value = null), 3000);
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
        confirmButtonProps: { 'aria-label': '确认重置系统' },
        cancelButtonProps: { 'aria-label': '取消重置' },
      }
    );
    ElMessage.error('系统重置功能需要超级管理员权限');
    notification.value = { message: '系统重置功能需要超级管理员权限', type: 'error' };
    setTimeout(() => (notification.value = null), 3000);
  } catch {}
};

const handleUpdate = () => {
  ElMessage.info('正在检查更新...');
  notification.value = { message: '正在检查更新...', type: 'info' };
  setTimeout(() => (notification.value = null), 3000);
};

onMounted(() => {
  setTimeout(() => {
    loading.value = false;
  }, 500);
});
</script>

<style lang="scss" scoped>
.pc-settings {
  padding: 0;
  animation: fadeIn 0.5s ease-out;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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
  .page-header {
    padding: 16px;
    margin-bottom: 16px;

    .header-content {
      h1 {
        font-size: 20px;
        margin-bottom: 4px;
      }

      p {
        font-size: 12px;
      }
    }
  }

  .nav-card {
    position: static;
    margin-bottom: 16px;

    .settings-menu {
      :deep(.el-menu-item) {
        height: 44px;
        line-height: 44px;
        margin: 2px 0;
        padding: 0 12px;

        .el-icon {
          font-size: 18px;
        }

        span {
          font-size: 14px;
        }
      }
    }
  }

  .content-card {
    margin-bottom: 16px;

    .card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;

      .el-button {
        width: 100%;
      }
    }

    :deep(.el-card__body) {
      padding: 16px;
    }
  }

  .card-title {
    font-size: 15px;

    .el-icon {
      font-size: 18px;
    }
  }

  .settings-group {
    margin-bottom: 20px;

    h3 {
      font-size: 15px;
      margin-bottom: 16px;
    }

    :deep(.el-form) {
      .el-form-item {
        margin-bottom: 16px;

        .el-form-item__label {
          width: 100% !important;
          text-align: left;
          line-height: 1.5;
          padding-bottom: 8px;
          margin-bottom: 0;
        }

        .el-form-item__content {
          margin-left: 0 !important;
        }

        .el-input,
        .el-select,
        .el-input-number {
          width: 100%;
        }

        .el-input__inner {
          height: 40px;
          font-size: 14px;
        }

        .el-switch {
          transform: scale(0.9);
        }

        .el-time-picker {
          width: 100%;
        }

        .el-input-number {
          .el-input-number__decrease,
          .el-input-number__increase {
            width: 32px;
          }

          .el-input__inner {
            padding-left: 36px;
            padding-right: 36px;
          }
        }
      }
    }
  }

  .backup-info {
    padding: 12px;
    margin-bottom: 16px;

    .info-item {
      flex-direction: column;
      margin-bottom: 12px;

      .label {
        width: 100%;
        font-size: 13px;
        margin-bottom: 4px;
      }

      .value {
        font-size: 14px;
      }
    }
  }

  .action-buttons {
    flex-direction: column;

    .el-button {
      width: 100%;
      height: 44px;
      margin: 0;
    }
  }

  .logo-preview {
    width: 100px;
    height: 50px;
  }

  .danger-zone {
    padding: 16px;

    h3 {
      font-size: 15px;
    }

    .warning-text {
      font-size: 12px;
      margin-bottom: 12px;
    }

    .danger-actions {
      flex-direction: column;

      .el-button {
        width: 100%;
        height: 44px;
        margin: 0;
      }
    }
  }

  .about-section {
    .system-info {
      flex-direction: column;
      text-align: center;
      gap: 16px;
      padding-bottom: 20px;
      margin-bottom: 24px;

      .system-logo {
        width: 64px;
        height: 64px;
      }

      .system-details {
        h2 {
          font-size: 20px;
          margin-bottom: 6px;
        }

        .version,
        .build {
          font-size: 13px;
          margin-bottom: 4px;
        }
      }
    }

    .info-descriptions {
      :deep(.el-descriptions) {
        .el-descriptions__header {
          margin-bottom: 12px;
        }

        .el-descriptions__body {
          .el-descriptions__table {
            .el-descriptions__cell {
              font-size: 13px;
              padding: 8px 12px;
            }
          }
        }

        .el-descriptions__label {
          font-size: 13px;
        }

        .el-descriptions__content {
          font-size: 13px;
        }
      }
    }

    .update-section {
      h3 {
        font-size: 15px;
        margin-bottom: 12px;
      }

      .update-info {
        padding: 12px;

        p {
          font-size: 13px;
          margin-bottom: 6px;
        }

        .update-available {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;

          .el-button {
            width: 100%;
          }
        }

        .update-latest {
          display: block;
        }
      }
    }
  }

  :deep(.el-divider) {
    margin: 20px 0;
  }

  :deep(.el-main) {
    padding: 0;
  }

  :deep(.el-col) {
    padding-left: 0 !important;
    padding-right: 0 !important;
    margin-bottom: 16px;
  }
}

.page-header {
  animation: slideDown 0.6s ease-out;
}

.nav-card {
  animation: slideInLeft 0.5s ease-out;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  }

  .settings-menu {
    :deep(.el-menu-item) {
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 0;
        background: #409eff;
        transition: height 0.3s ease;
      }

      &:hover {
        transform: translateX(4px);

        &::before {
          height: 24px;
        }

        .el-icon {
          transform: rotate(15deg);
        }
      }

      &.is-active {
        &::before {
          height: 24px;
        }
      }

      .el-icon {
        transition: transform 0.3s ease;
      }
    }
  }
}

.content-card {
  animation: slideInRight 0.5s ease-out;
  transition: all 0.3s ease;

  &:nth-child(1) {
    animation-delay: 0.1s;
  }

  &:nth-child(2) {
    animation-delay: 0.2s;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  }

  .card-header {
    transition: all 0.3s ease;
  }
}

.card-title {
  .el-icon {
    transition: transform 0.3s ease;

    &:hover {
      transform: scale(1.1);
    }
  }
}

.settings-group {
  animation: fadeInUp 0.4s ease-out;

  &:nth-child(1) {
    animation-delay: 0.1s;
  }

  &:nth-child(2) {
    animation-delay: 0.2s;
  }

  &:nth-child(3) {
    animation-delay: 0.3s;
  }

  &:nth-child(4) {
    animation-delay: 0.4s;
  }

  :deep(.el-form-item) {
    animation: fadeIn 0.3s ease-out;
    transition: all 0.3s ease;

    &:hover {
      background: #fafafa;
      border-radius: 6px;
      padding: 8px;
      margin: 0 0 16px;
    }

    .el-input {
      transition: all 0.3s ease;

      :deep(.el-input__wrapper) {
        transition: all 0.3s ease;

        &:hover {
          box-shadow: 0 0 0 1px #c0c4cc inset;
        }

        &.is-focus {
          box-shadow: 0 0 0 1px #409eff inset, 0 0 0 3px rgba(64, 158, 255, 0.1);
        }
      }
    }

    .el-select {
      transition: all 0.3s ease;

      :deep(.el-input__wrapper) {
        transition: all 0.3s ease;

        &:hover {
          box-shadow: 0 0 0 1px #c0c4cc inset;
        }

        &.is-focus {
          box-shadow: 0 0 0 1px #409eff inset, 0 0 0 3px rgba(64, 158, 255, 0.1);
        }
      }
    }

    .el-switch {
      :deep(.el-switch__core) {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        &::after {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      }

      :deep(.el-switch__action) {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      &:hover {
        :deep(.el-switch__core) {
          box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
        }
      }
    }
  }

  h3 {
    transition: color 0.3s ease;

    &:hover {
      color: #409eff;
    }
  }
}

.backup-info {
  animation: fadeIn 0.5s ease-out;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }

  .info-item {
    transition: all 0.3s ease;
    border-radius: 4px;
    padding: 8px;

    &:hover {
      background: rgba(64, 158, 255, 0.05);
      transform: translateX(4px);
    }
  }
}

.action-buttons {
  .el-button {
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transform: translate(-50%, -50%);
      transition: width 0.6s ease, height 0.6s ease;
    }

    &:active {
      transform: scale(0.95);

      &::before {
        width: 300px;
        height: 300px;
      }
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
    }
  }
}

.logo-preview {
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.danger-zone {
  animation: pulse 2s ease-in-out infinite;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 20px rgba(245, 108, 108, 0.2);
  }

  .danger-actions {
    .el-button {
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: translate(-50%, -50%);
        transition: width 0.6s ease, height 0.6s ease;
      }

      &:active {
        transform: scale(0.95);

        &::before {
          width: 300px;
          height: 300px;
        }
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(245, 108, 108, 0.3);
      }
    }
  }
}

.about-section {
  animation: fadeInUp 0.5s ease-out;

  .system-info {
    transition: all 0.3s ease;

    &:hover {
      background: #fafafa;
      border-radius: 8px;
      padding: 24px;
    }

    .system-logo {
      transition: all 0.3s ease;

      &:hover {
        transform: scale(1.1) rotate(5deg);
      }
    }
  }

  .info-descriptions {
    animation: fadeIn 0.6s ease-out;
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      border-radius: 8px;
    }
  }

  .update-section {
    animation: fadeInUp 0.5s ease-out;

    .update-info {
      transition: all 0.3s ease;

      &:hover {
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      }
    }
  }
}

:deep(.el-dialog) {
  animation: dialogZoomIn 0.3s ease-out;
}

:deep(.el-overlay) {
  animation: fadeInOverlay 0.3s ease-out;
}

:deep(.el-message) {
  animation: messageSlideIn 0.3s ease-out;
  transition: all 0.3s ease;

  &.el-message--success {
    animation: messageSlideInSuccess 0.4s ease-out;
  }

  &.el-message--error {
    animation: messageSlideInError 0.4s ease-out;
  }

  &.el-message--warning {
    animation: messageSlideInWarning 0.4s ease-out;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.9;
  }
}

@keyframes dialogZoomIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes fadeInOverlay {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes messageSlideInSuccess {
  0% {
    opacity: 0;
    transform: translateY(-20px) scale(0.8);
  }
  50% {
    opacity: 1;
    transform: translateY(-5px) scale(1.05);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes messageSlideInError {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes messageSlideInWarning {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
