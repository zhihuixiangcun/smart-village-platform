import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.{js,ts}',
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/.git/**'
  ],
  /* Global settings for all tests */
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'e2e-results/html-report' }],
    ['json', { outputFile: 'e2e-results/test-results.json' }],
    ['junit', { outputFile: 'e2e-results/junit-results.xml' }],
    ['list'],
    process.env.CI && ['github']
  ].filter(Boolean),

  /* Shared settings for all the projects below */
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // 基础URL
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    // 全局测试数据
    extraHTTPHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9'
    },
    // 用户代理
    userAgent: 'SmartVillage-E2E-Test'
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/chrome/**/*.spec.{js,ts}'
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: '**/firefox/**/*.spec.{js,ts}'
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: '**/safari/**/*.spec.{js,ts}'
    },

    /* Mobile devices */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        // 移动端特定设置
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true
      },
      testMatch: '**/mobile/**/*.spec.{js,ts}'
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true
      },
      testMatch: '**/mobile/**/*.spec.{js,ts}'
    },

    /* Tablet devices */
    {
      name: 'iPad',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
        isMobile: true,
        hasTouch: true
      },
      testMatch: '**/tablet/**/*.spec.{js,ts}'
    }
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe'
  },

  /* Global setup and teardown */
  globalSetup: './e2e/setup/global-setup.ts',
  globalTeardown: './e2e/setup/global-teardown.ts',

  /* Output directory */
  outputDir: 'e2e-results/artifacts',

  /* Test metadata */
  metadata: {
    'test-environment': process.env.TEST_ENV || 'staging',
    'test-suite': 'smart-village-e2e',
    'test-version': '1.0.0'
  }
})