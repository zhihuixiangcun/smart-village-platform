import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/index.scss'

// 模拟 uni API (用于兼容原有组件)
const mockUniAPI = {
  getStorageSync: (key) => localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)) : '',
  setStorageSync: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
  removeStorageSync: (key) => localStorage.removeItem(key),
  getSystemInfoSync: () => ({
    platform: 'h5',
    system: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    pixelRatio: window.devicePixelRatio
  }),
  navigateTo: (options) => {
    router.push(options.url)
  },
  navigateBack: (options) => {
    router.back()
  },
  showToast: (options) => {
    const toast = document.createElement('div')
    toast.className = 'uni-toast'
    toast.textContent = options.title
    toast.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.7);
      color: #fff;
      padding: 16px 24px;
      border-radius: 8px;
      z-index: 9999;
      font-size: 16px;
    `
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), options.duration || 1500)
  },
  showModal: (options) => {
    return new Promise((resolve) => {
      const result = confirm(options.content)
      resolve({ confirm: result, cancel: !result })
    })
  },
  request: (options) => {
    return fetch(options.url, {
      method: options.method || 'GET',
      headers: options.header || {},
      body: options.data ? JSON.stringify(options.data) : undefined
    }).then(res => res.json())
  }
}

// 挂载到全局
window.uni = mockUniAPI

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
