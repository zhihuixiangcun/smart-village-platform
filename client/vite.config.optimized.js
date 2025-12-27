import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'
import viteImagemin from 'vite-plugin-imagemin'
import vitePluginRequireTransform from 'vite-plugin-require-transform'

// CDN 配置 - 用于生产环境的大型库
const CDN_CONFIG = {
  // 开发环境不使用 CDN，生产环境可选
  modules: [
    {
      name: 'vue',
      var: 'Vue',
      path: 'https://cdn.jsdelivr.net/npm/vue@3.3.8/dist/vue.global.prod.js'
    },
    {
      name: 'vue-router',
      var: 'VueRouter',
      path: 'https://cdn.jsdelivr.net/npm/vue-router@4.2.5/dist/vue-router.global.prod.js'
    },
    {
      name: 'element-plus',
      var: 'ElementPlus',
      path: 'https://cdn.jsdelivr.net/npm/element-plus@2.4.4/dist/index.full.min.min.js',
      css: 'https://cdn.jsdelivr.net/npm/element-plus@2.4.4/dist/index.min.css'
    }
  ]
}

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    css: {
      postcss: {
        plugins: [
          tailwindcss,
          autoprefixer,
        ],
      },
      // CSS 代码分割
      devSourcemap: !isProd,
    },
    plugins: [
      vue(),
      // Element Plus 按需引入
      AutoImport({
        resolvers: [ElementPlusResolver()],
        imports: ['vue', 'vue-router', 'pinia'],
        dts: true,
        // 生产环境下自动移除 console
        eslintrc: {
          enabled: true,
          filepath: './.eslintrc-auto-import.json',
          globalsPropValue: true
        }
      }),
      Components({
        resolvers: [
          ElementPlusResolver({
            // 自动引入样式
            importStyle: 'css', // 或 'sass'
          })
        ]
      }),
      // 打包体积分析
      visualizer({
        open: false,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true
      }),
      // Gzip 压缩
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240, // 10KB 以上才压缩
        algorithm: 'gzip',
        ext: '.gz'
      }),
      // Brotli 压缩 (更好的压缩率)
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240,
        algorithm: 'brotliCompress',
        ext: '.br'
      }),
      // 图片优化
      viteImagemin({
        gifsicle: {
          optimizationLevel: 7,
          interlaced: false,
        },
        optipng: {
          optimizationLevel: 7,
        },
        mozjpeg: {
          quality: 80,
        },
        pngquant: {
          quality: [0.8, 0.9],
        },
        svgo: {
          plugins: [
            {
              name: 'removeViewBox',
            },
            {
              name: 'removeEmptyAttrs',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    // 开发服务器配置
    server: {
      port: 3006,
      host: '0.0.0.0',
      // 开启 HMR
      hmr: {
        overlay: true
      },
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
    // 生产构建优化
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false, // 生产环境不生成 sourcemap
      // 减小打包体积
      minify: 'terser',
      terserOptions: {
        compress: {
          // 移除 console
          drop_console: isProd,
          // 移除 debugger
          drop_debugger: isProd,
          // 移除无用代码
          pure_funcs: isProd ? ['console.log', 'console.info'] : []
        },
        format: {
          // 移除注释
          comments: false
        }
      },
      // chunk 大小警告阈值
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // 分包策略
          manualChunks: {
            // 将 Vue 生态系统分离
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            // Element Plus UI 库
            'element-plus': ['element-plus', '@element-plus/icons-vue'],
            // 工具库
            'utils': ['axios', 'dayjs', 'lodash-es'],
            // 图表库
            'charts': ['echarts'],
            // Socket.IO
            'socket': ['socket.io-client']
          },
          // 文件命名规则 (带 contenthash)
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        },
        // 外部化 CDN 资源 (如果使用 CDN)
        external: isProd ? [] : []
      },
      // CSS 代码分割
      cssCodeSplit: true,
      // 动态导入的 chunk 优化
      dynamicImportVarsOptions: {
        warnOnError: true
      }
    },
    // 优化依赖预构建
    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'pinia',
        'axios',
        'element-plus',
        '@element-plus/icons-vue',
        'dayjs',
        'echarts',
        'lodash-es',
        'socket.io-client'
      ],
      exclude: []
    },
    // 预加载配置
    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        return { runtime: `window.__assetsPath(${JSON.stringify(filename)})` }
      }
    }
  }
})
