import { vi, afterEach } from 'vitest'

// Mock uni API
global.uni = {
  getStorage: vi.fn((options) => {
    options.success && options.success({})
  }),
  setStorage: vi.fn((options) => {
    options.success && options.success()
  }),
  removeStorage: vi.fn((options) => {
    options.success && options.success()
  }),
  getSystemInfoSync: vi.fn(() => ({
    platform: 'ios',
    system: 'iOS 15.0',
    screenWidth: 375,
    screenHeight: 812
  })),
  navigateBack: vi.fn(),
  navigateTo: vi.fn(),
  redirectTo: vi.fn(),
  switchTab: vi.fn(),
  showToast: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  showModal: vi.fn(),
  showActionSheet: vi.fn(),
  chooseImage: vi.fn(),
  previewImage: vi.fn(),
  makePhoneCall: vi.fn(),
  scanCode: vi.fn(),
  vibrateShort: vi.fn(),
  vibrateLong: vi.fn(),
  request: vi.fn(),
  uploadFile: vi.fn(),
  downloadFile: vi.fn()
}

// Mock getCurrentPages
global.getCurrentPages = vi.fn(() => [
  {
    route: 'pages/test/index',
    options: {},
    $el: null,
    $page: null
  }
])

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

global.localStorage = localStorageMock

// Clear localStorage after each test
afterEach(() => {
  localStorageMock.clear();
})
