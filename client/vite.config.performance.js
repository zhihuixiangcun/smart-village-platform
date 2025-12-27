import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

/**
 * 性能优先的 Vite 配置
 * 重点：极致的代码分割、按需加载、资源优化
 */
export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },

  plugins: [
    vue(),
    // Element Plus 按需自动导入
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: true
    }),
    Components({
      resolvers: [
        ElementPlusResolver({
          importStyle: 'css' // 按需引入样式
        })
      ]
    })
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,

    // 代码分割策略
    rollupOptions: {
      output: {
        // 精细化 chunk 分割
        manualChunks(id) {
          // node_modules 包处理
          if (id.includes('node_modules')) {
            // Vue 核心
            if (id.includes('vue') || id.includes('pinia') || id.includes('@vue')) {
              return 'vue-core'
            }
            // Vue Router
            if (id.includes('vue-router')) {
              return 'vue-router'
            }
            // Element Plus
            if (id.includes('element-plus') || id.includes('@element-plus')) {
              return 'element-plus'
            }
            // ECharts 图表库 (体积大，单独分包)
            if (id.includes('echarts')) {
              return 'echarts'
            }
            // 工具库
            if (id.includes('axios') || id.includes('dayjs') || id.includes('lodash')) {
              return 'utils'
            }
            // Socket.IO
            if (id.includes('socket.io')) {
              return 'socket'
            }
            // 其他第三方库
            return 'vendor'
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name)) {
            return `assets/media/[name]-[hash].[ext]`
          }
          if (/\.(png|jpe?g|gif|svg|ico|webp)(\?.*)?$/i.test(assetInfo.name)) {
            return `assets/images/[name]-[hash].[ext]`
          }
          if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash].[ext]`
          }
          return `assets/${ext}/[name]-[hash].[ext]`
        }
      }
    },

    // Terser 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        // 生产环境移除 console
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      format: {
        comments: false
      }
    },

    // Chunk 大小限制
    chunkSizeWarningLimit: 1000,

    // CSS 代码分割
    cssCodeSplit: true
  },

  // 依赖预构建优化
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'axios',
      'element-plus/es',
      'dayjs',
      'lodash-es'
    ]
  },

  server: {
    port: 3006,
    host: '0.0.0.0',
    proxy: {
      '/api/monitoring': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
