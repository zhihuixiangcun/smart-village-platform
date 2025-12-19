import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'coverage/',
        'public/'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // 核心业务模块要求更高覆盖率
        './src/views/**/*.{js,ts,vue}': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    },
    // 测试文件匹配模式
    include: [
      'src/**/__tests__/**/*.{test,spec}.{js,ts,vue}',
      'src/**/*.{test,spec}.{js,ts,vue}',
      'test/**/*.{test,spec}.{js,ts,vue}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.idea/',
      '.git/',
      '.cache/'
    ],
    // 并发测试配置
    threads: true,
    maxThreads: 4,
    minThreads: 1,
    // 测试超时设置
    testTimeout: 10000,
    hookTimeout: 10000,
    // 监听模式配置
    watch: false,
    // 报告器配置
    reporter: ['verbose', 'html', 'json'],
    outputFile: {
      html: './coverage/test-report.html',
      json: './coverage/test-results.json'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@views': resolve(__dirname, 'src/views'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@services': resolve(__dirname, 'src/services'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@test': resolve(__dirname, 'src/test')
    }
  },
  // 服务器配置
  server: {
    port: 3000,
    host: true,
    cors: true
  }
})