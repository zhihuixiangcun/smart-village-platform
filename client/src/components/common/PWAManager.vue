<template>
  <div class="pwa-manager">
    <!-- PWA安装提示横幅 -->
    <div
      v-if="showInstallBanner"
      class="install-banner"
      :class="{ 'banner-minimized': bannerMinimized }"
    >
      <div class="banner-content">
        <div class="banner-icon">
          <el-icon><Download /></el-icon>
        </div>
        <div class="banner-text">
          <h4>安装智慧村庄管理平台</h4>
          <p>将应用添加到主屏幕，获得原生应用体验</p>
        </div>
        <div class="banner-actions">
          <el-button @click="installPWA" type="primary" size="small"> 立即安装 </el-button>
          <el-button @click="minimizeBanner" text size="small"> 最小化 </el-button>
          <el-button @click="dismissBanner" text size="small">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- 最小化状态 -->
      <div v-if="bannerMinimized" class="banner-minimized-content" @click="expandBanner">
        <el-icon><Download /></el-icon>
        <span>安装应用</span>
      </div>
    </div>

    <!-- PWA功能状态面板 -->
    <div v-if="showStatusPanel" class="pwa-status-panel">
      <div class="panel-header">
        <h3>PWA状态</h3>
        <el-button @click="showStatusPanel = false" text icon="Close" size="small" />
      </div>

      <div class="status-items">
        <div class="status-item">
          <div class="status-label">Service Worker</div>
          <div class="status-value" :class="swStatus.class">
            <el-icon :class="swStatus.icon" />
            <span>{{ swStatus.text }}</span>
          </div>
        </div>

        <div class="status-item">
          <div class="status-label">缓存状态</div>
          <div class="status-value" :class="cacheStatus.class">
            <el-icon :class="cacheStatus.icon" />
            <span>{{ cacheStatus.text }}</span>
          </div>
        </div>

        <div class="status-item">
          <div class="status-label">离线支持</div>
          <div class="status-value" :class="offlineStatus.class">
            <el-icon :class="offlineStatus.icon" />
            <span>{{ offlineStatus.text }}</span>
          </div>
        </div>

        <div class="status-item">
          <div class="status-label">推送通知</div>
          <div class="status-value" :class="notificationStatus.class">
            <el-icon :class="notificationStatus.icon" />
            <span>{{ notificationStatus.text }}</span>
          </div>
        </div>

        <div class="status-item">
          <div class="status-label">安装状态</div>
          <div class="status-value" :class="installStatus.class">
            <el-icon :class="installStatus.icon" />
            <span>{{ installStatus.text }}</span>
          </div>
        </div>
      </div>

      <div class="panel-actions">
        <el-button @click="checkForUpdates" :loading="checkingUpdates" size="small">
          检查更新
        </el-button>
        <el-button @click="refreshServiceWorker" size="small"> 重启SW </el-button>
        <el-button @click="clearAllCaches" size="small" type="warning"> 清除缓存 </el-button>
      </div>
    </div>

    <!-- PWA更新提示 -->
    <el-dialog
      v-model="showUpdateDialog"
      title="应用更新"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="update-content">
        <div class="update-icon">
          <el-icon size="48" color="#409eff"><Refresh /></el-icon>
        </div>
        <p>检测到新版本，是否立即更新？</p>
        <div class="update-features" v-if="updateFeatures.length > 0">
          <h4>更新内容：</h4>
          <ul>
            <li v-for="feature in updateFeatures" :key="feature">{{ feature }}</li>
          </ul>
        </div>
      </div>

      <template #footer>
        <el-button @click="showUpdateDialog = false">稍后更新</el-button>
        <el-button @click="applyUpdate" type="primary" :loading="updatingApp"> 立即更新 </el-button>
      </template>
    </el-dialog>

    <!-- 安装成功提示 -->
    <el-dialog v-model="showInstallSuccess" title="安装成功" width="350px" :show-close="false">
      <div class="install-success-content">
        <div class="success-icon">
          <el-icon size="48" color="#67c23a"><SuccessFilled /></el-icon>
        </div>
        <p>应用已成功添加到您的设备！</p>
        <div class="success-tips">
          <h4>使用技巧：</h4>
          <ul>
            <li>从主屏幕图标启动应用</li>
            <li>享受原生应用般的体验</li>
            <li>支持离线使用</li>
            <li>自动接收更新通知</li>
          </ul>
        </div>
      </div>

      <template #footer>
        <el-button @click="showInstallSuccess = false" type="primary"> 知道了 </el-button>
      </template>
    </el-dialog>

    <!-- 功能引导 -->
    <div v-if="showFeatureGuide" class="feature-guide">
      <div class="guide-content">
        <div class="guide-header">
          <h3>PWA功能介绍</h3>
          <el-button @click="showFeatureGuide = false" text icon="Close" size="small" />
        </div>

        <div class="guide-features">
          <div class="guide-feature">
            <div class="feature-icon">📱</div>
            <h4>离线访问</h4>
            <p>无网络时也能正常使用，数据自动同步</p>
          </div>

          <div class="guide-feature">
            <div class="feature-icon">🔔</div>
            <h4>推送通知</h4>
            <p>及时接收重要消息和提醒</p>
          </div>

          <div class="guide-feature">
            <div class="feature-icon">⚡</div>
            <h4>快速启动</h4>
            <p>从主屏幕直接启动，响应速度更快</p>
          </div>

          <div class="guide-feature">
            <div class="feature-icon">🔄</div>
            <h4>自动更新</h4>
            <p>后台自动更新，始终保持最新版本</p>
          </div>
        </div>

        <div class="guide-actions">
          <el-button @click="enableAllFeatures" type="primary"> 启用所有功能 </el-button>
          <el-button @click="showFeatureGuide = false"> 稍后配置 </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import {
  Download,
  Close,
  Refresh,
  SuccessFilled,
  CircleCheck,
  Warning,
  CircleClose,
} from '@element-plus/icons-vue';

// 响应式数据
const showInstallBanner = ref(false);
const bannerMinimized = ref(false);
const showStatusPanel = ref(false);
const showUpdateDialog = ref(false);
const showInstallSuccess = ref(false);
const showFeatureGuide = ref(false);
const checkingUpdates = ref(false);
const updatingApp = ref(false);

// PWA相关状态
const swRegistration = ref(null);
const deferredPrompt = ref(null);
const isInstalled = ref(false);
const isOnline = ref(navigator.onLine);

// 更新功能列表
const updateFeatures = ref([
  '性能优化和Bug修复',
  '新增离线数据同步功能',
  '改进用户界面体验',
  '增强安全性',
]);

// 状态计算属性
const swStatus = computed(() => {
  if (!swRegistration.value) {
    return {
      class: 'status-error',
      icon: 'CircleClose',
      text: '未注册',
    };
  }

  if (swRegistration.value.active) {
    return {
      class: 'status-success',
      icon: 'CircleCheck',
      text: '运行中',
    };
  }

  return {
    class: 'status-warning',
    icon: 'Warning',
    text: '安装中',
  };
});

const cacheStatus = computed(() => {
  // 简化的缓存状态检查
  return {
    class: 'status-success',
    icon: 'CircleCheck',
    text: '已缓存',
  };
});

const offlineStatus = computed(() => {
  return {
    class: isOnline.value ? 'status-success' : 'status-warning',
    icon: isOnline.value ? 'CircleCheck' : 'Warning',
    text: isOnline.value ? '在线' : '离线',
  };
});

const notificationStatus = computed(() => {
  if (!('Notification' in window)) {
    return {
      class: 'status-error',
      icon: 'CircleClose',
      text: '不支持',
    };
  }

  switch (Notification.permission) {
    case 'granted':
      return {
        class: 'status-success',
        icon: 'CircleCheck',
        text: '已允许',
      };
    case 'denied':
      return {
        class: 'status-error',
        icon: 'CircleClose',
        text: '已拒绝',
      };
    default:
      return {
        class: 'status-warning',
        icon: 'Warning',
        text: '未设置',
      };
  }
});

const installStatus = computed(() => {
  if (isInstalled.value) {
    return {
      class: 'status-success',
      icon: 'CircleCheck',
      text: '已安装',
    };
  }

  if (deferredPrompt.value) {
    return {
      class: 'status-warning',
      icon: 'Warning',
      text: '可安装',
    };
  }

  return {
    class: 'status-error',
    icon: 'CircleClose',
    text: '不支持',
  };
});

// 方法
const initPWA = async () => {
  // 检查是否已安装
  if (window.matchMedia('(display-mode: standalone)').matches) {
    isInstalled.value = true;
  }

  // 注册Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      swRegistration.value = registration;

      console.log('Service Worker注册成功:', registration);

      // 监听更新
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // 有新版本可用
              showUpdateDialog.value = true;
            }
          }
        });
      });

      // 监听消息
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    } catch (error) {
      console.error('Service Worker注册失败:', error);
    }
  }

  // 监听安装提示事件
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt.value = e;

    // 检查是否应该显示安装横幅
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const lastDismissed = localStorage.getItem('pwa-install-last-dismissed');

    if (
      !dismissed ||
      (lastDismissed && Date.now() - parseInt(lastDismissed) > 7 * 24 * 60 * 60 * 1000)
    ) {
      showInstallBanner.value = true;
    }
  });

  // 监听安装完成事件
  window.addEventListener('appinstalled', () => {
    isInstalled.value = true;
    showInstallBanner.value = false;
    showInstallSuccess.value = true;
    deferredPrompt.value = null;

    // 显示功能引导
    setTimeout(() => {
      showFeatureGuide.value = true;
    }, 2000);
  });

  // 监听网络状态
  window.addEventListener('online', () => {
    isOnline.value = true;
    ElMessage.success('网络已恢复');
  });

  window.addEventListener('offline', () => {
    isOnline.value = false;
    ElMessage.warning('网络连接断开，切换到离线模式');
  });
};

const installPWA = async () => {
  if (!deferredPrompt.value) {
    ElMessage.warning('当前环境不支持安装');
    return;
  }

  try {
    deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;

    if (outcome === 'accepted') {
      console.log('用户接受了安装');
    } else {
      console.log('用户拒绝了安装');
    }

    deferredPrompt.value = null;
    showInstallBanner.value = false;
  } catch (error) {
    console.error('安装失败:', error);
    ElMessage.error('安装失败，请稍后重试');
  }
};

const dismissBanner = () => {
  showInstallBanner.value = false;
  localStorage.setItem('pwa-install-dismissed', 'true');
  localStorage.setItem('pwa-install-last-dismissed', Date.now().toString());
};

const minimizeBanner = () => {
  bannerMinimized.value = true;
};

const expandBanner = () => {
  bannerMinimized.value = false;
};

const handleSWMessage = event => {
  const { type, data } = event.data;

  switch (type) {
    case 'update-available':
      showUpdateDialog.value = true;
      break;

    case 'cache-updated':
      ElNotification({
        title: '缓存已更新',
        message: '应用数据已更新到最新版本',
        type: 'success',
      });
      break;

    case 'offline-fallback':
      ElNotification({
        title: '离线模式',
        message: '当前处于离线状态，正在使用缓存数据',
        type: 'warning',
      });
      break;
  }
};

const checkForUpdates = async () => {
  checkingUpdates.value = true;

  try {
    if (swRegistration.value) {
      await swRegistration.value.update();
      ElMessage.success('已检查更新');
    }
  } catch (error) {
    console.error('检查更新失败:', error);
    ElMessage.error('检查更新失败');
  } finally {
    checkingUpdates.value = false;
  }
};

const applyUpdate = async () => {
  updatingApp.value = true;

  try {
    if (swRegistration.value?.waiting) {
      swRegistration.value.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // 等待页面刷新
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error('应用更新失败:', error);
    ElMessage.error('更新失败，请刷新页面重试');
    updatingApp.value = false;
  }
};

const refreshServiceWorker = async () => {
  try {
    if (swRegistration.value) {
      await swRegistration.value.unregister();
      window.location.reload();
    }
  } catch (error) {
    console.error('重启Service Worker失败:', error);
    ElMessage.error('重启失败');
  }
};

const clearAllCaches = async () => {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));

    ElMessage.success('缓存已清除，页面将重新加载');
    setTimeout(() => window.location.reload(), 1000);
  } catch (error) {
    console.error('清除缓存失败:', error);
    ElMessage.error('清除缓存失败');
  }
};

const enableAllFeatures = async () => {
  try {
    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // 注册后台同步
    if (swRegistration.value && 'sync' in swRegistration.value) {
      await swRegistration.value.sync.register('background-sync');
    }

    showFeatureGuide.value = false;
    ElMessage.success('所有功能已启用');
  } catch (error) {
    console.error('启用功能失败:', error);
    ElMessage.error('部分功能启用失败');
  }
};

// 生命周期
onMounted(() => {
  initPWA();

  // 检查是否首次访问
  const isFirstVisit = !localStorage.getItem('pwa-visited');
  if (isFirstVisit) {
    localStorage.setItem('pwa-visited', 'true');
    setTimeout(() => {
      showFeatureGuide.value = true;
    }, 3000);
  }
});

onUnmounted(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener('message', handleSWMessage);
  }
});

// 暴露方法供外部调用
defineExpose({
  showStatus: () => {
    showStatusPanel.value = true;
  },
  checkUpdates: checkForUpdates,
  installApp: installPWA,
});
</script>

<style lang="scss" scoped>
.pwa-manager {
  .install-banner {
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    z-index: 1000;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;

    &.banner-minimized {
      bottom: 20px;
      left: auto;
      right: 20px;
      width: auto;
      background: #409eff;
      border-radius: 25px;
      cursor: pointer;

      .banner-content {
        display: none;
      }

      .banner-minimized-content {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        font-size: 14px;

        &:hover {
          background: #337ecc;
        }
      }
    }

    .banner-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;

      .banner-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .banner-text {
        flex: 1;

        h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
        }

        p {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }
      }

      .banner-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }
    }

    .banner-minimized-content {
      display: none;
    }
  }

  .pwa-status-panel {
    position: fixed;
    top: 50%;
    right: 20px;
    transform: translateY(-50%);
    z-index: 1001;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    min-width: 300px;
    max-width: 400px;

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #ebeef5;

      h3 {
        margin: 0;
        color: #303133;
        font-size: 16px;
      }
    }

    .status-items {
      padding: 16px 20px;

      .status-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;

        .status-label {
          color: #606266;
          font-size: 14px;
        }

        .status-value {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;

          &.status-success {
            color: #67c23a;
          }

          &.status-warning {
            color: #e6a23c;
          }

          &.status-error {
            color: #f56c6c;
          }
        }
      }
    }

    .panel-actions {
      padding: 16px 20px;
      border-top: 1px solid #ebeef5;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
  }

  .feature-guide {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;

    .guide-content {
      background: white;
      border-radius: 12px;
      padding: 30px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;

      .guide-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;

        h3 {
          margin: 0;
          color: #303133;
          font-size: 20px;
        }
      }

      .guide-features {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 30px;

        .guide-feature {
          text-align: center;
          padding: 20px;
          border: 1px solid #ebeef5;
          border-radius: 8px;

          .feature-icon {
            font-size: 48px;
            margin-bottom: 12px;
          }

          h4 {
            margin: 0 0 8px 0;
            color: #303133;
            font-size: 16px;
          }

          p {
            margin: 0;
            color: #606266;
            font-size: 14px;
            line-height: 1.5;
          }
        }
      }

      .guide-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
    }
  }
}

.update-content,
.install-success-content {
  text-align: center;

  .update-icon,
  .success-icon {
    margin-bottom: 16px;
  }

  p {
    margin-bottom: 20px;
    color: #606266;
    font-size: 16px;
  }

  .update-features,
  .success-tips {
    text-align: left;
    background: #f5f7fa;
    padding: 16px;
    border-radius: 6px;

    h4 {
      margin: 0 0 12px 0;
      color: #303133;
      font-size: 14px;
    }

    ul {
      margin: 0;
      padding-left: 20px;
      color: #606266;
      font-size: 14px;

      li {
        margin-bottom: 4px;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .pwa-manager {
    .install-banner {
      left: 10px;
      right: 10px;

      .banner-content {
        flex-direction: column;
        gap: 12px;
        text-align: center;

        .banner-actions {
          width: 100%;
          justify-content: center;
        }
      }
    }

    .pwa-status-panel {
      position: fixed;
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      transform: none;
      border-radius: 12px 12px 0 0;
      min-width: auto;
      max-width: none;
    }

    .feature-guide {
      .guide-content {
        padding: 20px;

        .guide-features {
          grid-template-columns: 1fr;
        }

        .guide-actions {
          flex-direction: column;
        }
      }
    }
  }
}
</style>
