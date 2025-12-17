# Vue3前端项目搭建指南

## 1. 项目初始化

### 使用Vite创建Vue3项目
```bash
# 1. 进入client目录
cd client

# 2. 初始化Vite项目
npm create vue@latest . -- --typescript --router --pinia --eslint --prettier

# 或者手动创建
npm init vue@latest smart-village-frontend
cd smart-village-frontend
```

### 安装核心依赖
```bash
# UI组件库
npm install element-plus @element-plus/icons-vue

# HTTP客户端
npm install axios

# 工具库
npm install lodash-es dayjs
npm install @types/lodash-es -D

# 状态管理
npm install pinia pinia-plugin-persistedstate

# 图表库
npm install echarts

# 地图
npm install @amap/amap-jsapi-loader

# 打包优化
npm install vite-plugin-compression vite-plugin-imagemin -D
```

## 2. 项目结构

```
client/
├── public/                 # 静态资源
│   ├── favicon.ico
│   └── logo.png
├── src/
│   ├── api/                # API接口
│   │   ├── auth.js
│   │   ├── residents.js
│   │   └── finance.js
│   ├── assets/             # 资源文件
│   │   ├── images/
│   │   ├── styles/
│   │   └── fonts/
│   ├── components/         # 公共组件
│   │   ├── common/         # 通用组件
│   │   ├── forms/          # 表单组件
│   │   └── charts/         # 图表组件
│   ├── composables/        # 组合式函数
│   │   ├── useAuth.js
│   │   ├── useTable.js
│   │   └── useWebSocket.js
│   ├── layouts/            # 布局组件
│   │   ├── DefaultLayout.vue
│   │   └── AuthLayout.vue
│   ├── router/             # 路由配置
│   │   ├── index.js
│   │   └── guards.js
│   ├── stores/             # 状态管理
│   │   ├── auth.js
│   │   ├── user.js
│   │   └── app.js
│   ├── styles/             # 全局样式
│   │   ├── index.scss
│   │   ├── variables.scss
│   │   └── mixins.scss
│   ├── utils/              # 工具函数
│   │   ├── request.js
│   │   ├── storage.js
│   │   └── validate.js
│   ├── views/              # 页面视图
│   │   ├── auth/           # 认证页面
│   │   ├── dashboard/      # 仪表板
│   │   ├── residents/      # 村民管理
│   │   └── finance/        # 财务管理
│   ├── App.vue             # 根组件
│   └── main.js             # 入口文件
├── .env                    # 环境变量
├── .env.development
├── .env.production
├── .eslintrc.js            # ESLint配置
├── .prettierrc             # Prettier配置
├── vite.config.js          # Vite配置
└── package.json
```

## 3. 核心配置文件

### vite.config.js
```javascript
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import compression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      vue(),
      compression({
        ext: '.gz',
        algorithm: 'gzip'
      }),
      // 打包分析
      mode === 'analyze' && visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true
      })
    ].filter(Boolean),

    // 路径别名
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@views': resolve(__dirname, 'src/views'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@api': resolve(__dirname, 'src/api'),
        '@stores': resolve(__dirname, 'src/stores'),
        '@assets': resolve(__dirname, 'src/assets')
      }
    },

    // 服务器配置
    server: {
      host: '0.0.0.0',
      port: 3000,
      open: true,
      cors: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        },
        '/socket.io': {
          target: env.VITE_SOCKET_URL || 'http://localhost:5000',
          changeOrigin: true,
          ws: true
        }
      }
    },

    // 构建配置
    build: {
      target: 'es2015',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'development',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production'
        }
      },
      rollupOptions: {
        output: {
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks: {
            // 将node_modules中的代码拆分出来
            vendor: ['vue', 'vue-router', 'pinia'],
            element: ['element-plus'],
            utils: ['lodash-es', 'dayjs', 'axios']
          }
        }
      },
      chunkSizeWarningLimit: 1500
    },

    // CSS配置
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`
        }
      }
    },

    // 定义全局常量
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    }
  };
});
```

### .env.development
```env
# 开发环境配置
VITE_APP_TITLE=智慧村庄综合服务平台
VITE_APP_VERSION=1.0.0

# API配置
VITE_API_BASE_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:5000

# 功能开关
VITE_ENABLE_MOCK=false
VITE_ENABLE_DEVTOOLS=true

# 第三方服务
VITE_AMAP_KEY=your-amap-key
VITE_UPLOAD_URL=http://localhost:3001/api/v1/upload
```

### .env.production
```env
# 生产环境配置
VITE_APP_TITLE=智慧村庄综合服务平台
VITE_APP_VERSION=1.0.0

# API配置
VITE_API_BASE_URL=https://api.smartvillage.com
VITE_SOCKET_URL=https://ws.smartvillage.com

# 功能开关
VITE_ENABLE_MOCK=false
VITE_ENABLE_DEVTOOLS=false

# 第三方服务
VITE_AMAP_KEY=your-amap-key
VITE_UPLOAD_URL=https://api.smartvillage.com/api/v1/upload
```

## 4. 主入口文件

### src/main.js
```javascript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

import App from './App.vue';
import router from './router';
import './styles/index.scss';

// 引入pinia持久化插件
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

// 创建应用实例
const app = createApp(App);

// 创建pinia实例
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 使用插件
app.use(pinia);
app.use(router);
app.use(ElementPlus, {
  size: 'default',
  zIndex: 3000
});

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('Global Error:', err);
  // 这里可以添加错误上报逻辑
};

// 挂载应用
app.mount('#app');
```

### src/App.vue
```vue
<template>
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>

<script setup>
import { ElConfigProvider } from 'element-plus';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import { useAppStore } from '@/stores/app';

const appStore = useAppStore();

// 初始化应用
appStore.initializeApp();
</script>

<style lang="scss">
#app {
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji',
    'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
}
</style>
```

## 5. 路由配置

### src/router/index.js
```javascript
import { createRouter, createWebHistory } from 'vue-router';
import { setupRouterGuards } from './guards';
import routes from './routes';

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  }
});

// 设置路由守卫
setupRouterGuards(router);

export default router;
```

### src/router/routes.js
```javascript
import { BasicLayout } from '@/layouts';

export default [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: {
      title: '登录',
      requiresGuest: true
    }
  },
  {
    path: '/',
    component: BasicLayout,
    redirect: '/dashboard',
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: {
          title: '首页',
          icon: 'House'
        }
      },
      {
        path: 'residents',
        name: 'Residents',
        meta: {
          title: '村民管理',
          icon: 'User',
          permission: { resource: 'residents', action: 'read' }
        },
        children: [
          {
            path: '',
            name: 'ResidentsList',
            component: () => import('@/views/residents/ResidentsListView.vue'),
            meta: {
              title: '村民列表'
            }
          },
          {
            path: 'add',
            name: 'ResidentAdd',
            component: () => import('@/views/residents/ResidentAddView.vue'),
            meta: {
              title: '添加村民',
              permission: { resource: 'residents', action: 'create' }
            }
          },
          {
            path: ':id',
            name: 'ResidentDetail',
            component: () => import('@/views/residents/ResidentDetailView.vue'),
            meta: {
              title: '村民详情',
              hidden: true
            }
          }
        ]
      },
      {
        path: 'finance',
        name: 'Finance',
        meta: {
          title: '财务管理',
          icon: 'Money',
          permission: { resource: 'finance', action: 'read' }
        },
        children: [
          {
            path: 'overview',
            name: 'FinanceOverview',
            component: () => import('@/views/finance/FinanceOverviewView.vue'),
            meta: {
              title: '财务总览'
            }
          },
          {
            path: 'expenses',
            name: 'Expenses',
            component: () => import('@/views/finance/ExpensesView.vue'),
            meta: {
              title: '开支管理',
              permission: { resource: 'expenses', action: 'read' }
            }
          },
          {
            path: 'budget',
            name: 'Budget',
            component: () => import('@/views/finance/BudgetView.vue'),
            meta: {
              title: '预算管理',
              permission: { resource: 'budget', action: 'read' }
            }
          },
          {
            path: 'reports',
            name: 'Reports',
            component: () => import('@/views/finance/ReportsView.vue'),
            meta: {
              title: '财务报表',
              permission: { resource: 'reports', action: 'read' }
            }
          }
        ]
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/ProfileView.vue'),
        meta: {
          title: '个人中心',
          icon: 'UserFilled'
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404View.vue'),
    meta: {
      title: '页面不存在'
    }
  }
];
```

### src/router/guards.js
```javascript
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// 配置NProgress
NProgress.configure({
  showSpinner: false,
  minimum: 0.2,
  easing: 'ease',
  speed: 500
});

export function setupRouterGuards(router) {
  // 全局前置守卫
  router.beforeEach(async (to, from, next) => {
    NProgress.start();

    const authStore = useAuthStore();
    const appStore = useAppStore();

    // 设置页面标题
    document.title = `${to.meta.title} - ${import.meta.env.VITE_APP_TITLE}`;

    // 检查认证状态
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      next({
        name: 'Login',
        query: { redirect: to.fullPath }
      });
      return;
    }

    // 游客页面
    if (to.meta.requiresGuest && authStore.isAuthenticated) {
      next({ name: 'Dashboard' });
      return;
    }

    // 检查权限
    if (to.meta.permission && authStore.isAuthenticated) {
      const { resource, action } = to.meta.permission;

      if (!authStore.hasPermission(resource, action)) {
        ElMessage.error('权限不足');
        next({ name: 'Dashboard' });
        return;
      }
    }

    next();
  });

  // 全局后置钩子
  router.afterEach(() => {
    NProgress.done();
  });

  // 路由错误处理
  router.onError((error) => {
    console.error('Router error:', error);
    NProgress.done();
  });
}
```

## 6. 状态管理

### src/stores/auth.js
```javascript
import { defineStore } from 'pinia';
import { authService } from '@/utils/auth';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    permissions: [],
    loading: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    userRole: (state) => state.user?.role,
    userName: (state) => state.user?.profile?.name || state.user?.username,
    hasPermission: (state) => (resource, action) => {
      if (state.permissions.includes('*')) return true;
      return state.permissions.includes(`${resource}:${action}`) ||
             state.permissions.includes(`${resource}:*`);
    }
  },

  actions: {
    async login(credentials) {
      try {
        this.loading = true;
        const result = await authService.login(credentials);

        if (result.success) {
          this.user = result.user;
          this.token = authService.token;
          this.permissions = result.user.permissions || [];

          return { success: true };
        } else {
          return { success: false, message: result.message };
        }
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      try {
        await authService.logout();
      } finally {
        this.user = null;
        this.token = null;
        this.permissions = [];
      }
    },

    async getCurrentUser() {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          this.user = user;
          this.permissions = user.permissions || [];
        }
        return user;
      } catch (error) {
        console.error('Get current user failed:', error);
        return null;
      }
    },

    initializeAuth() {
      const user = authService.currentUser;
      if (user) {
        this.user = user;
        this.token = authService.token;
        this.permissions = user.permissions || [];
      }
    }
  },

  persist: {
    key: 'auth-store',
    storage: localStorage,
    paths: ['user', 'token', 'permissions']
  }
});
```

## 7. 工具函数

### src/utils/request.js
```javascript
import axios from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAuthStore } from '@/stores/auth';

// 创建axios实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();

    // 添加认证token
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }

    // 添加请求ID
    config.headers['X-Request-ID'] = generateRequestId();

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const { response, config } = error;
    const authStore = useAuthStore();

    if (response) {
      switch (response.status) {
        case 401:
          // 未授权，可能是token过期
          if (!config._retry) {
            config._retry = true;

            try {
              await authService.refreshAccessToken();

              // 重新发送请求
              config.headers.Authorization = `Bearer ${authStore.token}`;
              return request(config);
            } catch (refreshError) {
              // 刷新失败，跳转登录
              authStore.logout();
              window.location.href = '/login';
            }
          }
          break;

        case 403:
          ElMessage.error('权限不足');
          break;

        case 404:
          ElMessage.error('请求的资源不存在');
          break;

        case 422:
          // 表单验证错误
          const errors = response.data?.data;
          if (Array.isArray(errors)) {
            const errorMessages = errors.map(err => err.msg).join(', ');
            ElMessage.error(errorMessages);
          }
          break;

        case 429:
          ElMessage.error('请求过于频繁，请稍后再试');
          break;

        case 500:
          ElMessage.error('服务器错误，请稍后再试');
          break;

        default:
          ElMessage.error(response.data?.message || '请求失败');
      }
    } else if (error.code === 'NETWORK_ERROR') {
      ElMessage.error('网络错误，请检查网络连接');
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请稍后再试');
    }

    return Promise.reject(error);
  }
);

// 生成请求ID
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 封装请求方法
export const http = {
  get: (url, params = {}) => request.get(url, { params }),

  post: (url, data = {}) => request.post(url, data),

  put: (url, data = {}) => request.put(url, data),

  delete: (url) => request.delete(url),

  upload: (url, file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    return request.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      }
    });
  }
};

export default request;
```

## 8. 全局样式

### src/styles/index.scss
```scss
// 引入变量和混合
@import './variables.scss';
@import './mixins.scss';

// 重置样式
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  font-family: $font-family-base;
  font-size: $font-size-base;
  color: $text-primary;
  background-color: $bg-color-page;
}

// 滚动条样式
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;

  &:hover {
    background: #909399;
  }
}

// 通用类
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.flex { display: flex; }
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.flex-column {
  display: flex;
  flex-direction: column;
}

.hidden { display: none; }
.invisible { visibility: hidden; }

// 间距工具类
@each $prop in (margin, padding) {
  @each $size, $value in $spacers {
    .#{$prop}-#{$size} {
      #{$prop}: $value !important;
    }
    .#{$prop}t-#{$size} {
      #{$prop}-top: $value !important;
    }
    .#{$prop}r-#{$size} {
      #{$prop}-right: $value !important;
    }
    .#{$prop}b-#{$size} {
      #{$prop}-bottom: $value !important;
    }
    .#{$prop}l-#{$size} {
      #{$prop}-left: $value !important;
    }
    .#{$prop}x-#{$size} {
      #{$prop}-left: $value !important;
      #{$prop}-right: $value !important;
    }
    #{$prop}y-#{$size} {
      #{$prop}-top: $value !important;
      #{$prop}-bottom: $value !important;
    }
  }
}

// Element Plus 主题覆盖
.el-button--primary {
  background-color: $primary-color;
  border-color: $primary-color;

  &:hover {
    background-color: lighten($primary-color, 10%);
    border-color: lighten($primary-color, 10%);
  }
}

.el-menu--horizontal .el-menu-item.is-active {
  border-bottom-color: $primary-color;
  color: $primary-color;
}
```

### src/styles/variables.scss
```scss
// 颜色变量
$primary-color: #409eff;
$success-color: #67c23a;
$warning-color: #e6a23c;
$danger-color: #f56c6c;
$info-color: #909399;

// 文字颜色
$text-primary: #303133;
$text-regular: #606266;
$text-secondary: #909399;
$text-placeholder: #c0c4cc;

// 背景颜色
$bg-color-page: #f2f3f5;
$bg-color-base: #f5f7fa;
$bg-color-white: #ffffff;

// 边框颜色
$border-color-base: #dcdfe6;
$border-color-light: #e4e7ed;
$border-color-lighter: #ebeef5;

// 字体
$font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
  'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
$font-family-code: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;

// 字体大小
$font-size-base: 14px;
$font-size-small: 13px;
$font-size-large: 16px;
$font-size-extra-large: 20px;

// 行高
$line-height-base: 1.5;
$line-height-small: 1.25;
$line-height-large: 1.75;

// 圆角
$border-radius-base: 4px;
$border-radius-small: 2px;
$border-radius-large: 6px;
$border-radius-round: 20px;

// 阴影
$box-shadow-base: 0 2px 4px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.04);
$box-shadow-dark: 0 2px 4px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.12);
$box-shadow-light: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

// 间距
$spacers: (
  0: 0,
  1: 4px,
  2: 8px,
  3: 12px,
  4: 16px,
  5: 20px,
  6: 24px,
  8: 32px,
  10: 40px,
  12: 48px,
  16: 64px,
  20: 80px,
  24: 96px
);

// 断点
$breakpoints: (
  xs: 480px,
  sm: 576px,
  md: 768px,
  lg: 992px,
  xl: 1200px,
  xxl: 1600px
);

// z-index
$z-index-dropdown: 1000;
$z-index-sticky: 1020;
$z-index-fixed: 1030;
$z-index-modal-backdrop: 1040;
$z-index-modal: 1050;
$z-index-popover: 1060;
$z-index-tooltip: 1070;
```

## 9. 启动开发服务器

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 10. 验证项目配置

### 访问地址
- 开发服务器：http://localhost:3000
- 登录页面：http://localhost:3000/login

### 测试功能
1. 检查路由跳转是否正常
2. 验证API代理是否生效
3. 确认Element Plus组件是否正常加载
4. 测试状态管理持久化
5. 验证权限控制是否生效

这个Vue3项目配置提供了现代化的前端开发环境，包括TypeScript支持、Vite构建工具、Element Plus UI组件库等，为后续开发奠定了坚实基础。