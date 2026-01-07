import { vi } from 'vitest';
import { config } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createWebHistory } from 'vue-router';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

// Vue Test Utils 全局配置
config.global.plugins = [
  ElementPlus,
  createTestingPinia({
    createSpy: vi.fn,
    stubActions: false
  })
];

// 模拟路由
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/login', component: { template: '<div>Login</div>' } },
    { path: '/residents', component: { template: '<div>Residents</div>' } },
    { path: '/committee', component: { template: '<div>Committee</div>' } },
    { path: '/finance', component: { template: '<div>Finance</div>' } },
    { path: '/emergency', component: { template: '<div>Emergency</div>' } },
    { path: '/analytics', component: { template: '<div>Analytics</div>' } }
  ]
});
router.push('/');
config.global.plugins.push(router);

// 全局组件 mocks
config.global.stubs = {
  'el-icon': true,
  'el-button': {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'size', 'loading', 'disabled']
  },
  'el-input': {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'type']
  },
  'el-form': true,
  'el-form-item': true,
  'el-table': true,
  'el-table-column': true,
  'el-pagination': true,
  'el-dialog': {
    template: '<div v-if="modelValue"><slot /></div>',
    props: ['modelValue', 'title', 'width']
  },
  'el-drawer': {
    template: '<div v-if="modelValue"><slot /></div>',
    props: ['modelValue', 'title']
  },
  'el-select': true,
  'el-option': true,
  'el-date-picker': true,
  'el-upload': true,
  'el-image': true,
  'el-card': true,
  'el-row': true,
  'el-col': true,
  'router-link': { template: '<a><slot /></a>' },
  'router-view': { template: '<div><slot /></div>' }
};

// 模拟浏览器 API
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// 模拟 ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// 模拟 IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// 模拟 localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// 模拟 sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// 模拟 fetch
global.fetch = vi.fn();

// 模拟 WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1
}));

// 模拟 navigator.geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn()
  }
});

// 模拟 navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn(() => Promise.resolve({}))
  }
});

// 模拟 Canvas API
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Array(4) })),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn()
});

// 模拟 URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.VUE_APP_API_BASE_URL = 'http://localhost:3000/api';
process.env.VUE_APP_SOCKET_URL = 'ws://localhost:5000';

// 全局测试工具函数
global.createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  username: 'testuser',
  name: '测试用户',
  role: 'resident',
  villageId: 'test-village-id',
  ...overrides
});

global.createMockResident = (overrides = {}) => ({
  id: 'test-resident-id',
  name: '测试村民',
  idCard: '330106199001011234',
  phone: '13800138000',
  address: '测试地址',
  familyType: '普通户',
  ...overrides
});

global.createMockCommittee = (overrides = {}) => ({
  id: 'test-committee-id',
  name: '测试村委',
  position: '村支书',
  phone: '13900139000',
  email: 'committee@test.com',
  isActive: true,
  ...overrides
});

// 模拟 Element Plus 消息
global.mockMessage = {
  success: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  error: vi.fn()
};

global.mockMessageBox = {
  confirm: vi.fn(() => Promise.resolve('confirm')),
  prompt: vi.fn(() => Promise.resolve({ value: 'test' })),
  alert: vi.fn()
};

// 设置 Element Plus mock
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus');
  return {
    ...actual,
    ElMessage: global.mockMessage,
    ElMessageBox: global.mockMessageBox,
    ElNotification: vi.fn()
  };
});

// 在每个测试前重置所有 mocks
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});