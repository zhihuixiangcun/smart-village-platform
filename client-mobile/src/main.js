import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/index.scss'

// 全局注册 uni 组件替代品
import UniLoadMore from './components/uni/UniLoadMore.vue'
import ScrollView from './components/uni/ScrollView.vue'
import UniIcons from './components/uni/UniIcons.vue'
import UniBadge from './components/uni/UniBadge.vue'
import UniTag from './components/uni/UniTag.vue'
import UniList from './components/uni/UniList.vue'
import UniListItem from './components/uni/UniListItem.vue'

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

// 全局注册组件
app.component('uni-load-more', UniLoadMore)
app.component('scroll-view', ScrollView)
app.component('uni-icons', UniIcons)
app.component('uni-badge', UniBadge)
app.component('uni-tag', UniTag)
app.component('uni-list', UniList)
app.component('uni-list-item', UniListItem)

app.use(pinia)
app.use(router)

app.mount('#app')
