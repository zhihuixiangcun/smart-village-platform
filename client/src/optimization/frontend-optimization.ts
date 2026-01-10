/**
 * 智慧乡村平台前端优化方案
 * 包含代码质量改进、性能优化、无障碍增强
 */

// ==================== 1. TypeScript 类型增强 ====================

// 增强现有类型定义
interface EnhancedHousehold {
  _id: string;
  codeId: string;
  householder: string;
  householderPhone: string;
  address: string;
  memberCount: number;
  members: HouseholdMember[];
  tags: string[];
  status: 'active' | 'inactive';
  villageId: string;
  povertyLevel?: 'normal' | 'low-income' | 'poverty-alleviated';
  createdAt: string;
  updatedAt: string;
}

interface HouseholdMember {
  residentId: string;
  name: string;
  relationship: string;
  phone?: string;
  isHouseholder: boolean;
}

// ==================== 2. 性能优化建议 ====================

/**
 * 虚拟滚动组件配置
 */
const virtualTableConfig = {
  // 数据量大时启用虚拟滚动
  enableVirtualScroll: true,
  // 虚拟滚动阈值
  virtualScrollThreshold: 100,
  // 缓冲区大小
  bufferSize: 10,

  // 分页配置
  pagination: {
    pageSize: 20,
    pageSizes: [10, 20, 50, 100],
  },
};

/**
 * 图片懒加载配置
 */
const imageLazyLoad = {
  // 懒加载阈值
  threshold: 100,
  // 占位符
  placeholder:
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+PC9zdmc+',
  // 错误处理
  errorHandler: true,
};

/**
 * 缓存策略
 */
const cacheStrategy = {
  // API响应缓存时间（毫秒）
  apiCacheTime: 5 * 60 * 1000, // 5分钟
  // 页面数据缓存
  pageDataCache: {
    enable: true,
    maxAge: 10 * 60 * 1000, // 10分钟
  },
  // 路由预加载
  routePrefetch: {
    enable: true,
    prefetchRoutes: ['/village', '/household', '/residents'],
  },
};

// ==================== 3. 错误处理优化 ====================

/**
 * 全局错误处理配置
 */
const errorHandlerConfig = {
  // 是否记录错误日志
  logErrors: true,
  // 是否发送错误报告
  reportErrors: import.meta.env.PROD,
  // 错误报告API
  reportApi: '/api/errors',
  // 降级处理
  fallback: {
    enabled: true,
    errorPage: '/error',
    retryEnabled: true,
    maxRetries: 3,
  },
};

/**
 * 统一错误码处理
 */
const errorCodeHandler = {
  AUTH_001: { message: '登录已过期，请重新登录', action: 'redirect', to: '/auth/login' },
  AUTH_002: { message: '没有权限访问此功能', action: 'show' },
  VAL_001: { message: '请检查输入内容', action: 'highlight' },
  DB_001: { message: '服务暂时不可用，请稍后重试', action: 'retry' },
  NET_001: { message: '网络连接失败，请检查网络', action: 'retry' },
  RATE_001: { message: '请求过于频繁，请稍后再试', action: 'show' },
};

// ==================== 4. 无障碍增强 ====================

/**
 * 无障碍配置
 */
const accessibilityConfig = {
  // WCAG 2.1 AA 标准
  wcagLevel: 'AA',

  // 字体大小层级
  fontSizeLevels: {
    default: '16px',
    large: '18px',
    elderly: '20px',
    extraLarge: '24px',
  },

  // 对比度要求
  contrastRatio: {
    normal: 4.5,
    largeText: 3,
    uiComponents: 3,
  },

  // 焦点管理
  focusManagement: {
    trapFocus: true,
    returnFocus: true,
    focusableElements: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  },

  // 语音配置
  speechConfig: {
    // 支持的方言
    dialects: [
      { code: 'zh-CN', name: '普通话' },
      { code: 'wuu-CN', name: '吴语' },
      { code: 'yue-CN', name: '粤语' },
      { code: 'hak-CN', name: '客家话' },
      { code: 'nan-CN', name: '闽南语' },
    ],
    // 默认语音速率
    defaultRate: 0.9,
    // 默认音量
    defaultVolume: 1,
  },

  // 键盘快捷键
  keyboardShortcuts: {
    '/': { action: 'focusSearch', description: '聚焦搜索框' },
    Escape: { action: 'closeModal', description: '关闭弹窗' },
    h: { action: 'goHome', description: '返回首页' },
    '?': { action: 'showHelp', description: '显示帮助' },
  },
};

// ==================== 5. 状态管理优化 ====================

/**
 * Pinia 状态管理最佳实践
 */
const piniaConfig = {
  // 持久化配置
  persist: {
    enabled: true,
    // 持久化存储
    storage: localStorage,
    // 需要持久化的store
    stores: ['user', 'settings', 'accessibility'],
  },

  // 状态重置
  resetOnLogout: {
    enabled: true,
    excludedStores: ['accessibility'],
  },

  // 状态订阅
  subscribe: {
    enabled: true,
    logChanges: import.meta.env.DEV,
  },
};

/**
 * 数据缓存Store示例
 */
const cachedDataStore = {
  namespaced: true,
  state: () => ({
    cache: new Map(),
    lastFetch: new Map(),
  }),

  actions: {
    async getCachedData(key: string, fetcher: () => Promise<unknown>) {
      const now = Date.now();
      const cached = this.cache.get(key);
      const lastTime = this.lastFetch.get(key);

      // 检查缓存是否有效
      if (cached && lastTime && now - lastTime < cacheStrategy.apiCacheTime) {
        return cached;
      }

      // 重新获取数据
      const data = await fetcher();
      this.cache.set(key, data);
      this.lastFetch.set(key, now);

      return data;
    },

    invalidateCache(key: string) {
      this.cache.delete(key);
      this.lastFetch.delete(key);
    },

    clearAllCache() {
      this.cache.clear();
      this.lastFetch.clear();
    },
  },
};

// ==================== 6. API 层优化 ====================

/**
 * API 请求配置
 */
const apiConfig = {
  // 基础配置
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,

  // 重试配置
  retry: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000,
    retryOn: [408, 429, 500, 502, 503, 504],
  },

  // 缓存配置
  cache: {
    enabled: true,
    time: 5 * 60 * 1000, // 5分钟
  },

  // 响应拦截
  responseInterceptor: {
    handle401: true,
    handle403: true,
    handleError: true,
  },
};

/**
 * 请求拦截器配置
 */
const requestInterceptors = [
  // 添加认证token
  config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },

  // 添加请求ID
  config => {
    config.headers['X-Request-ID'] = crypto.randomUUID();
    return config;
  },

  // 请求日志
  config => {
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
];

/**
 * 响应拦截器配置
 */
const responseInterceptors = [
  // 401 处理
  response => {
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    return response;
  },

  // 错误处理
  error => {
    if (error.response) {
      const { data } = error.response;

      if (data?.code && errorCodeHandler[data.code]) {
        const handler = errorCodeHandler[data.code];
      }
    }
    return Promise.reject(error);
  },
];

// ==================== 7. 组件优化 ====================

/**
 * 组件加载优化配置
 */
const componentLoading = {
  // 路由懒加载
  lazyLoadRoutes: true,
  // 预加载配置
  preload: {
    enabled: true,
    // 鼠标悬停预加载
    hoverPreload: true,
    // 视口内预加载
    viewportPreload: true,
    // 预加载延迟
    preloadDelay: 200,
  },

  // 组件缓存
  keepAlive: {
    include: ['Home', 'VillageAffairs', 'HouseholdQR'],
    max: 10,
    exclude: [],
  },
};

/**
 * 骨架屏配置
 */
const skeletonConfig = {
  // 是否显示骨架屏
  showSkeleton: true,
  // 骨架屏数量
  skeletonCount: 3,
  // 动画效果
  animation: 'shimmer',
};

// ==================== 8. 安全性增强 ====================

/**
 * 安全配置
 */
const securityConfig = {
  // XSS防护
  xssProtection: {
    enabled: true,
    // 白名单标签
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    // 白名单属性
    allowedAttributes: ['href', 'title', 'target'],
  },

  // 点击劫持防护
  clickjacking: {
    enabled: true,
    // X-Frame-Options
    frameGuard: 'DENY',
  },

  // 内容安全策略
  contentSecurityPolicy: {
    enabled: import.meta.env.PROD,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https://api.example.com'],
    },
  },

  // 敏感信息脱敏
  sensitiveDataMasking: {
    enabled: true,
    // 需要脱敏的字段
    fields: ['idCard', 'phone', 'bankCard', 'password'],
  },
};

export {
  // 类型
  EnhancedHousehold,
  HouseholdMember,

  // 配置
  virtualTableConfig,
  imageLazyLoad,
  cacheStrategy,
  errorHandlerConfig,
  accessibilityConfig,
  piniaConfig,
  apiConfig,
  componentLoading,
  skeletonConfig,
  securityConfig,

  // 拦截器
  requestInterceptors,
  responseInterceptors,
  errorCodeHandler,
};
