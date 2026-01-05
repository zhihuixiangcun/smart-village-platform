// PWA插件 - 增强PWA功能
export default {
  install(app, options = {}) {
    const {
      registerSW = true,
      enablePush = true,
      enableShare = true,
      enableOffline = true
    } = options;

    // 注册Service Worker
    if (process.client && registerSW && 'serviceWorker' in navigator) {
      registerServiceWorker();
    }

    // 初始化推送通知
    if (process.client && enablePush) {
      initializePushNotifications();
    }

    // 初始化分享功能
    if (process.client && enableShare) {
      initializeShareFeature();
    }

    // 初始化离线功能
    if (process.client && enableOffline) {
      initializeOfflineFeature();
    }

    // 全局混入
    app.mixin({
      created() {
        // PWA相关功能初始化
        if (process.client) {
          this.$initPWAFeatures();
        }
      },

      methods: {
        $initPWAFeatures() {
          // 检查PWA环境
          this.checkPWAEnvironment();

          // 监听网络状态
          this.monitorNetworkStatus();

          // 监听安装事件
          this.monitorInstallPrompt();
        },

        // 检查PWA环境
        checkPWAEnvironment() {
          // 检查是否在PWA模式下运行
          const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;

          if (isPWA) {
            document.body.classList.add('pwa-mode');
          }

          // 提供全局访问
          app.config.globalProperties.$isPWA = isPWA;
        },

        // 监听网络状态
        monitorNetworkStatus() {
          const updateOnlineStatus = () => {
            const isOnline = navigator.onLine;
            document.body.classList.toggle('offline', !isOnline);

            // 显示网络状态提示
            if (isOnline) {
              this.$message?.success('网络已恢复');
              // 尝试同步离线数据
              this.syncOfflineData?.();
            } else {
              this.$message?.warning('网络连接已断开，当前为离线模式');
            }
          };

          window.addEventListener('online', updateOnlineStatus);
          window.addEventListener('offline', updateOnlineStatus);

          // 初始状态
          updateOnlineStatus();
        },

        // 监听安装提示
        monitorInstallPrompt() {
          let deferredPrompt = null;

          window.addEventListener('beforeinstallprompt', (e) => {
            // 阻止默认安装横幅
            e.preventDefault();
            deferredPrompt = e;

            // 显示自定义安装提示
            this.showInstallPrompt?.(deferredPrompt);
          });

          window.addEventListener('appinstalled', () => {
            // 安装成功
            this.$message?.success('应用安装成功！');
            // 可以显示使用引导
            this.showAppGuide?.();
          });

          // 提供安装方法
          app.config.globalProperties.$installPWA = async () => {
            if (!deferredPrompt) {
              this.$message?.warning('当前环境不支持安装');
              return false;
            }

            try {
              deferredPrompt.prompt();
              const { outcome } = await deferredPrompt.userChoice;

              if (outcome === 'accepted') {
                console.log('用户接受了安装');
              } else {
                console.log('用户拒绝了安装');
              }

              deferredPrompt = null;
              return outcome === 'accepted';
            } catch (error) {
              console.error('安装失败:', error);
              return false;
            }
          };
        }
      }
    });

    // 提供注入
    app.provide('pwa', {
      isInstalled: () => {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
      },

      // 分享功能
      share: async (data) => {
        if (navigator.share) {
          try {
            await navigator.share({
              title: data.title || '智慧乡村',
              text: data.text || '',
              url: data.url || window.location.href
            });
            return true;
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.error('分享失败:', error);
            }
            return false;
          }
        } else {
          // 降级方案：复制链接
          navigator.clipboard.writeText(data.url || window.location.href);
          app.config.globalProperties.$message?.success('链接已复制到剪贴板');
          return true;
        }
      }
    });
  }
};

// 注册Service Worker
async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('SW registered successfully:', registration);

    // 监听更新
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // 有新版本可用
          showUpdateNotification(registration);
        }
      });
    });

    // 监听控制器变化
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.error('SW registration failed:', error);
    return null;
  }
}

// 显示更新通知
function showUpdateNotification(registration) {
  const notification = document.createElement('div');
  notification.className = 'update-notification';
  notification.innerHTML = `
    <div class="update-content">
      <span class="update-icon">🔄</span>
      <span class="update-text">发现新版本，是否立即更新？</span>
      <div class="update-actions">
        <button class="update-btn" id="update-now">立即更新</button>
        <button class="update-btn cancel" id="update-later">稍后</button>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  document.getElementById('update-now').addEventListener('click', () => {
    // 激活新版本
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    document.body.removeChild(notification);
  });

  document.getElementById('update-later').addEventListener('click', () => {
    document.body.removeChild(notification);
  });
}

// 初始化推送通知
async function initializePushNotifications() {
  if (!('PushManager' in window)) {
    console.warn('此浏览器不支持推送通知');
    return;
  }

  // 请求权限
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.log('推送通知权限被拒绝');
    return;
  }

  // 获取订阅
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // 创建新订阅
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          'BMzFTLQaITlN1_vO3SvG5Jf2a5l7x1M9rQp3t4w6s8v0x2z4c6v8b0d2f4h6j8'
        )
      });

      // 发送订阅信息到服务器
      await sendSubscriptionToServer(newSubscription);
    }
  } catch (error) {
    console.error('推送订阅失败:', error);
  }
}

// 初始化分享功能
function initializeShareFeature() {
  // Web Share API检查
  if (!navigator.share) {
    console.log('此浏览器不支持Web Share API');
  }
}

// 初始化离线功能
function initializeOfflineFeature() {
  // 注册Background Sync
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then(registration => {
      // 可以注册同步事件
      console.log('Background Sync 可用');
    });
  }

  // 离线页面支持
  window.addEventListener('online', () => {
    // 同步离线数据
    syncOfflineData();
  });
}

// 同步离线数据
async function syncOfflineData() {
  // 获取离线存储的数据
  const offlineData = localStorage.getItem('offlineData');
  if (!offlineData) return;

  try {
    const data = JSON.parse(offlineData);

    // 发送到服务器
    for (const item of data) {
      await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body
      });
    }

    // 清除离线数据
    localStorage.removeItem('offlineData');
    console.log('离线数据同步成功');
  } catch (error) {
    console.error('离线数据同步失败:', error);
  }
}

// 工具函数：将base64字符串转换为Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// 发送订阅信息到服务器
async function sendSubscriptionToServer(subscription) {
  try {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(subscription)
    });
  } catch (error) {
    console.error('推送订阅发送失败:', error);
  }
}

// PWA样式
export const pwaStyles = `
  /* 安装提示样式 */
  .update-notification {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #409eff, #66b1ff);
    color: white;
    z-index: 9999;
    padding: 12px 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }

  .update-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 600px;
    margin: 0 auto;
  }

  .update-icon {
    font-size: 20px;
    margin-right: 12px;
    animation: rotate 1s linear infinite;
  }

  .update-text {
    flex: 1;
    font-size: 14px;
  }

  .update-actions {
    display: flex;
    gap: 8px;
    margin-left: 20px;
  }

  .update-btn {
    padding: 6px 16px;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .update-btn {
    background: white;
    color: #409eff;
  }

  .update-btn.cancel {
    background: transparent;
    color: white;
    border: 1px solid white;
  }

  /* PWA模式样式 */
  .pwa-mode {
    /* PWA特有样式 */
  }

  /* 离线状态样式 */
  .offline {
    position: relative;
  }

  .offline::before {
    content: '离线模式';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #f56c6c;
    color: white;
    text-align: center;
    padding: 8px;
    font-size: 14px;
    z-index: 9999;
  }

  /* 安装提示横幅 */
  .install-prompt {
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    background: white;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .install-prompt-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #409eff, #66b1ff);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
  }

  .install-prompt-content {
    flex: 1;
  }

  .install-prompt-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 4px 0;
  }

  .install-prompt-desc {
    font-size: 14px;
    color: #606266;
    margin: 0;
  }

  .install-prompt-actions {
    display: flex;
    gap: 8px;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* 安全区域适配 */
  @supports (padding: max(0px)) {
    .install-prompt {
      bottom: max(20px, env(safe-area-inset-bottom) + 20px);
    }
  }
`;