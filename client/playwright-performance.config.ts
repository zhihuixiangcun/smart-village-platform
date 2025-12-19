import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/performance',
  testMatch: '**/*.perf.spec.ts',
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false, // 性能测试不适合并行
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // 性能测试使用单线程
  reporter: [
    ['html', { outputFolder: 'e2e-results/performance-report' }],
    ['json', { outputFile: 'e2e-results/performance-results.json' }],
    ['junit', { outputFile: 'e2e-results/performance-junit.xml' }],
    ['line']
  ],

  use: {
    actionTimeout: 0,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off', // 性能测试不需要视频
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    // 性能测试特定配置
    ignoreHTTPSErrors: true,
    bypassCSP: true,
    // 启用性能指标收集
    launchOptions: {
      args: [
        '--enable-precise-memory-info',
        '--enable-performance-api',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    }
  },

  projects: [
    // 桌面端性能测试
    {
      name: 'chromium-performance',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      testMatch: '**/desktop/**/*.perf.spec.ts'
    },

    // 移动端性能测试
    {
      name: 'mobile-performance',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 },
        // 移动端特定的性能测试配置
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--enable-performance-api',
            '--disable-web-security',
            '--disable-gpu',
            '--disable-software-rasterizer'
          ]
        }
      },
      testMatch: '**/mobile/**/*.perf.spec.ts'
    }
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  },

  globalSetup: './e2e/performance/performance-setup.ts',
  globalTeardown: './e2e/performance/performance-teardown.ts',

  // 性能测试输出配置
  outputDir: 'e2e-results/performance-artifacts'
})