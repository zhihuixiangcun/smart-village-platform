/**
 * Service Worker 注册管理
 */

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register(config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.BASE_URL, window.location.href);

    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.BASE_URL}service-worker.js`;

      if (isLocalhost) {
        // localhost 环境检查 Service Worker
        checkValidServiceWorker(swUrl, config);

        navigator.serviceWorker.ready.then(() => {
          console.log(
            '本网页应用在本地服务器上运行，Service Worker 已启用'
          );
        });
      } else {
        // 生产环境注册 Service Worker
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('Service Worker 注册成功:', registration);

      // 检查更新
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;

        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // 新内容可用
              console.log('新内容可用，请刷新页面');

              // 触发更新提示回调
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // 内容已缓存
              console.log('内容已缓存，可离线使用');

              // 触发成功回调
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Service Worker 注册失败:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' }
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');

      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // Service Worker 不存在，需要重新注册
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service Worker 有效，正常注册
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('互联网连接可能已断开，应用正在离线模式下运行');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

/**
 * 发送消息给 Service Worker
 * @param {string} type - 消息类型
 * @param {any} payload - 消息数据
 */
export async function sendMessageToSW(type, payload) {
  if (!navigator.serviceWorker.controller) {
    console.warn('Service Worker 未激活');
    return null;
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    navigator.serviceWorker.controller.postMessage(
      { type, payload },
      [messageChannel.port2]
    );
  });
}

/**
 * 获取缓存大小
 */
export async function getCacheSize() {
  return sendMessageToSW('GET_CACHE_SIZE');
}

/**
 * 清除所有缓存
 */
export async function clearCache() {
  return sendMessageToSW('CLEAR_CACHE');
}

/**
 * 跳过等待，立即激活新版本
 */
export async function skipWaiting() {
  return sendMessageToSW('SKIP_WAITING');
}

/**
 * 请求后台同步
 */
export async function requestBackgroundSync(tag) {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(tag);
    console.log('后台同步已注册:', tag);
  }
}
