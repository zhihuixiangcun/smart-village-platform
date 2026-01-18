<template>
  <div class="system-settings">
    <!-- Header -->
    <header class="header">
      <div class="header-title">系统设置</div>
      <button class="back-btn" @click="goBack" aria-label="返回">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6 6"/>
          <path d="M9 6l6-6-6 6"/>
        </svg>
      </button>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <p>加载中...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <p class="error-message">{{ error }}</p>
      <button class="retry-button" @click="loadSettings">重试</button>
    </div>

    <!-- Main Content -->
    <div v-else class="content">
      <!-- Basic Settings Section -->
      <section class="settings-section">
        <h3 class="section-title">基本设置</h3>
        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">村名称</span>
            </div>
            <div class="setting-value">
              <input
                v-model="settings.basic.villageName"
                class="setting-input"
                placeholder="请输入村名称"
                aria-label="村名称"
              />
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">所属乡镇</span>
            </div>
            <div class="setting-value">
              <input
                v-model="settings.basic.township"
                class="setting-input"
                placeholder="请输入所属乡镇"
                aria-label="所属乡镇"
              />
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">村编码</span>
            </div>
            <div class="setting-value">
              <input
                v-model="settings.basic.villageCode"
                class="setting-input"
                placeholder="请输入村编码"
                aria-label="村编码"
              />
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">联系人</span>
            </div>
            <div class="setting-value">
              <input
                v-model="settings.basic.contactPerson"
                class="setting-input"
                placeholder="请输入联系人"
                aria-label="联系人"
              />
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">联系电话</span>
            </div>
            <div class="setting-value">
              <input
                v-model="settings.basic.contactPhone"
                class="setting-input"
                type="tel"
                placeholder="请输入联系电话"
                aria-label="联系电话"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- System Configuration Section -->
      <section class="settings-section">
        <h3 class="section-title">系统配置</h3>
        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">系统语言</span>
            </div>
            <div class="setting-value">
              <select
                v-model="settings.system.language"
                class="setting-select"
                aria-label="系统语言"
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">时区设置</span>
            </div>
            <div class="setting-value">
              <select
                v-model="settings.system.timezone"
                class="setting-select"
                aria-label="时区设置"
              >
                <option value="Asia/Shanghai">中国标准时间 (UTC+8)</option>
                <option value="Asia/Hong_Kong">香港时间 (UTC+8)</option>
                <option value="Asia/Tokyo">日本时间 (UTC+9)</option>
              </select>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">维护模式</span>
            </div>
            <div class="setting-value">
              <div class="switch-container">
                <span class="switch-status">{{ settings.system.maintenanceMode ? '开启' : '关闭' }}</span>
                <button
                  class="switch-button"
                  :class="{ active: settings.system.maintenanceMode }"
                  @click="settings.system.maintenanceMode = !settings.system.maintenanceMode"
                  role="switch"
                  :aria-checked="settings.system.maintenanceMode"
                  aria-label="维护模式开关"
                >
                  <span class="switch-thumb"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Save Button -->
      <div class="save-section">
        <button class="save-button" @click="handleSave" :disabled="saving">
          <span v-if="!saving">保存设置</span>
          <span v-else class="loading-text">保存中...</span>
        </button>
        <button class="reset-button" @click="handleReset" :disabled="saving">
          恢复默认
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'SystemSettings',
  setup() {
    const router = useRouter();
    const loading = ref(true);
    const saving = ref(false);
    const error = ref(null);

    // Settings data
    const settings = reactive({
      basic: {
        villageName: '',
        township: '',
        villageCode: '',
        contactPerson: '',
        contactPhone: ''
      },
      system: {
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        maintenanceMode: false
      },
      notification: {
        siteMessage: true,
        sms: false,
        email: false,
        wechat: false
      },
      security: {
        sessionTimeout: 30,
        passwordMinLength: 8,
        require2FA: false,
        maxLoginAttempts: 5
      },
      data: {
        autoBackup: false,
        retentionDays: 365
      }
    });

    const goBack = () => {
      router.back();
    };

    const showToast = (message, type = 'info') => {
      console.log('Show toast:', message, type);
      // Simple alert for now
      alert(`${type === 'error' ? '错误' : '提示'}: ${message}`);
    };

    const loadSettings = async () => {
      loading.value = true;
      error.value = null;
      try {
        console.log('Loading settings...');

        // Simulate API call for now
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('Settings loaded successfully');
      } catch (err) {
        console.error('Load settings error:', err);
        error.value = err.message || '加载设置失败';
        showToast('加载设置失败，请重试', 'error');
      } finally {
        loading.value = false;
      }
    };

    const handleSave = async () => {
      saving.value = true;
      error.value = null;
      try {
        console.log('Saving settings:', settings);

        // Simulate API call for now
        await new Promise(resolve => setTimeout(resolve, 1000));

        showToast('设置保存成功', 'success');
        console.log('Settings saved successfully');
      } catch (err) {
        console.error('Save settings error:', err);
        error.value = err.message || '保存失败';
        showToast('保存失败，请重试', 'error');
      } finally {
        saving.value = false;
      }
    };

    const handleReset = async () => {
      try {
        const confirmed = confirm('确定要将所有设置恢复为默认值吗？此操作不可撤销。');
        if (confirmed) {
          saving.value = true;

          // Simulate API call for now
          await new Promise(resolve => setTimeout(resolve, 500));

          // Reset to defaults
          settings.basic.villageName = '';
          settings.basic.township = '';
          settings.basic.villageCode = '';
          settings.basic.contactPerson = '';
          settings.basic.contactPhone = '';
          settings.system.language = 'zh-CN';
          settings.system.timezone = 'Asia/Shanghai';
          settings.system.maintenanceMode = false;
          settings.notification.siteMessage = true;
          settings.notification.sms = false;
          settings.notification.email = false;
          settings.notification.wechat = false;
          settings.security.sessionTimeout = 30;
          settings.security.passwordMinLength = 8;
          settings.security.require2FA = false;
          settings.security.maxLoginAttempts = 5;
          settings.data.autoBackup = false;
          settings.data.retentionDays = 365;

          showToast('已恢复默认设置', 'success');
          console.log('Settings reset successfully');
          saving.value = false;
        }
      } catch (err) {
        console.error('Reset settings error:', err);
        showToast('操作失败', 'error');
        saving.value = false;
      }
    };

    onMounted(() => {
      console.log('SystemSettings mounted');
      loadSettings();
    });

    return {
      loading,
      saving,
      error,
      settings,
      goBack,
      handleSave,
      handleReset
    };
  }
};
</script>

<style scoped lang="scss">
.system-settings {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f5f5f5;
  padding-bottom: calc(70px + env(safe-area-inset-bottom));
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 16px calc(16px + env(safe-area-inset-left));
  background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(250, 140, 22, 0.2);
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
}

.back-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255,255,255,0.3);
  background: transparent;
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;

  &:active {
    background: rgba(255,255,255,0.2);
    transform: scale(0.95);
  }

  svg {
    width: 24px;
    height: 24px;
  }
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 40px 20px;

  p {
    font-size: 16px;
    color: #606266;
  }
}

.error-container {
  .error-message {
    color: #f56c6c;
    font-weight: 600;
    margin-bottom: 20px;
  }

  .retry-button {
    padding: 12px 24px;
    background: #409eff;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
  }
}

.content {
  padding: 20px 16px calc(20px + env(safe-area-inset-left));
}

.settings-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 20px;
}

.settings-list {
  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }
  }
}

.setting-label {
  flex: 1;
}

.label-text {
  font-size: 16px;
  color: #4a5568;
  font-weight: 500;
}

.setting-value {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  max-width: 240px;
}

.setting-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 16px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  color: #303133;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #409eff;
    box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
  }
}

.setting-select {
  width: 100%;
  padding: 10px 14px;
  font-size: 16px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  color: #303133;
  transition: all 0.2s ease;
}

.switch-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.switch-status {
  font-size: 15px;
  color: #606266;
  min-width: 40px;
}

.switch-button {
  width: 52px;
  height: 28px;
  border-radius: 14px;
  background: #dcdfe6;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  padding: 0;

  &.active {
    background: #409eff;
  }

  &:active {
    transform: scale(0.95);
  }
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  transition: all 0.3s ease;
}

.switch-button.active .switch-thumb {
  left: 26px;
}

.save-section {
  display: flex;
  gap: 12px;
  padding: 20px 16px calc(20px + env(safe-area-inset-left));
  background: #fff;
  position: sticky;
  bottom: calc(70px + env(safe-area-inset-bottom));
  z-index: 99;
}

.save-button {
  flex: 2;
  padding: 14px 20px;
  font-size: 17px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(250, 140, 22, 0.3);

  &:disabled {
    background: #c0c4cc;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  .loading-text {
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }
}

.reset-button {
  flex: 1;
  padding: 14px 20px;
  font-size: 17px;
  font-weight: 600;
  border: 2px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    background: #f5f7fa;
  }
}

// 适老化优化 - 大字模式
.large-text-mode {
  .section-title {
    font-size: 22px;
  }

  .label-text,
  .switch-status {
    font-size: 18px;
  }

  .setting-input,
  .setting-select,
  .save-button,
  .reset-button {
    font-size: 18px;
    padding: 12px 12px;
  }

  .switch-button {
    width: 64px;
    height: 32px;
    border-radius: 16px;
  }

  .switch-thumb {
    width: 28px;
    height: 28px;
  }
}
</style>
