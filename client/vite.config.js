import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: true
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3006,
    host: '0.0.0.0',
    proxy: {
      // 主API服务器代理 (监控、稳定性、通知等)
      '/api/monitoring': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/stability': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/v1/notifications': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/v1/i18n': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      // 村务服务器代理 (村民、公告、投票等)
      '/api/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/api/residents': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/api/qrcode': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/api/suggestions': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/api/announcements': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      // Socket.IO代理到村务服务器
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true
      },
      // 默认API代理到主服务器
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      external: ['vant'], // 将 vant 标记为外部依赖
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    }
  }
});