/**
 * 移动端适配插件
 * 为Vue应用提供移动端适配功能
 */

import { App } from 'vue'
import mobileAdaptationService from '@/services/mobileAdaptationService'

const MobileAdaptationPlugin = {
  install(app) {
    // 将服务实例注入到Vue应用
    app.config.globalProperties.$mobile = mobileAdaptationService
    app.provide('mobileAdaptationService', mobileAdaptationService)

    // 添加全局混合
    app.mixin({
      mounted() {
        // 为每个组件添加移动端适配
        this.$nextTick(() => {
          this.setupMobileAdaptation()
        })
      },
      methods: {
        /**
         * 设置组件的移动端适配
         */
        setupMobileAdaptation() {
          const element = this.$el
          if (!element) return

          // 添加响应式类
          this.addResponsiveClasses(element)

          // 设置触摸事件
          this.setupTouchEvents(element)

          // 处理安全区域
          this.handleSafeArea(element)

          // 自适应布局
          this.adaptLayout(element)
        },

        /**
         * 添加响应式类
         */
        addResponsiveClasses(element) {
          const deviceInfo = mobileAdaptationService.getDeviceInfo()

          // 设备类型类
          if (deviceInfo.isMobile) {
            element.classList.add('mobile')
          } else if (deviceInfo.isTablet) {
            element.classList.add('tablet')
          } else {
            element.classList.add('desktop')
          }

          // 屏幕尺寸类
          if (deviceInfo.isSmallScreen) {
            element.classList.add('small-screen')
          } else if (deviceInfo.isMediumScreen) {
            element.classList.add('medium-screen')
          } else if (deviceInfo.isLargeScreen) {
            element.classList.add('large-screen')
          }

          // 触摸支持类
          if (deviceInfo.touchSupported) {
            element.classList.add('touch-enabled')
          }

          // 方向类
          element.classList.add(deviceInfo.orientation)
        },

        /**
         * 设置触摸事件
         */
        setupTouchEvents(element) {
          if (!mobileAdaptationService.isMobileDevice()) return

          // 点击事件添加触觉反馈
          const clickElements = element.querySelectorAll('button, a, .clickable, .touchable')
          clickElements.forEach(el => {
            el.addEventListener('click', (e) => {
              mobileAdaptationService.hapticFeedback('light')
              mobileAdaptationService.addHapticClass(el, 'light')
            }, { passive: true })
          })

          // 长按事件
          const longPressElements = element.querySelectorAll('.long-press')
          longPressElements.forEach(el => {
            let pressTimer = null

            el.addEventListener('touchstart', (e) => {
              pressTimer = setTimeout(() => {
                mobileAdaptationService.hapticFeedback('medium')
                mobileAdaptationService.addHapticClass(el, 'medium')
                this.$emit('long-press', { target: el, event: e })
              }, 500)
            }, { passive: true })

            el.addEventListener('touchend', () => {
              if (pressTimer) {
                clearTimeout(pressTimer)
              }
            }, { passive: true })

            el.addEventListener('touchcancel', () => {
              if (pressTimer) {
                clearTimeout(pressTimer)
              }
            }, { passive: true })
          })

          // 滑动手势
          const swipeElements = element.querySelectorAll('.swipeable')
          swipeElements.forEach(el => {
            let startX = 0
            let startY = 0

            el.addEventListener('touchstart', (e) => {
              const touch = e.touches[0]
              startX = touch.clientX
              startY = touch.clientY
            }, { passive: true })

            el.addEventListener('touchmove', (e) => {
              e.preventDefault()
            }, { passive: false })

            el.addEventListener('touchend', (e) => {
              const touch = e.changedTouches[0]
              const endX = touch.clientX
              const endY = touch.clientY
              const deltaX = endX - startX
              const deltaY = endY - startY

              if (Math.abs(deltaX) > 50) {
                const direction = deltaX > 0 ? 'right' : 'left'
                this.$emit('swipe', { target: el, direction, deltaX })
              }

              if (Math.abs(deltaY) > 50) {
                const direction = deltaY > 0 ? 'down' : 'up'
                this.$emit('swipe', { target: el, direction, deltaY })
              }
            }, { passive: true })
          })
        },

        /**
         * 处理安全区域
         */
        handleSafeArea(element) {
          const deviceInfo = mobileAdaptationService.getDeviceInfo()

          // 检查是否支持安全区域
          if (!CSS.supports('padding', 'max(0px)')) return

          // 设置安全区域CSS变量
          const style = element.style
          style.paddingLeft = 'env(safe-area-inset-left)'
          style.paddingRight = 'env(safe-area-inset-right)'
          style.paddingTop = 'env(safe-area-inset-top)'
          style.paddingBottom = 'env(safe-area-inset-bottom)'

          // 添加安全区域类
          element.classList.add('safe-area-support')
        },

        /**
         * 自适应布局
         */
        adaptLayout(element) {
          const deviceInfo = mobileAdaptationService.getDeviceInfo()

          // 横屏适配
          if (deviceInfo.orientation === 'landscape') {
            element.classList.add('landscape-layout')
          } else {
            element.classList.remove('landscape-layout')
          }

          // 小屏幕适配
          if (deviceInfo.isSmallScreen) {
            element.classList.add('compact-layout')
          }

          // 触摸设备适配
          if (deviceInfo.touchSupported) {
            element.classList.add('touch-layout')
          }

          // 应用自定义布局适配
          this.applyCustomLayout(element)
        },

        /**
         * 应用自定义布局适配
         */
        applyCustomLayout(element) {
          const layoutConfig = this.$options.mobileLayout || {}

          // 响应式断点配置
          if (layoutConfig.breakpoints) {
            const deviceInfo = mobileAdaptationService.getDeviceInfo()
            const { breakpoints } = layoutConfig.breakpoints

            Object.keys(breakpoints).forEach(breakpoint => {
              const condition = breakpoints[breakpoint]
              const shouldApply = this.evaluateCondition(condition, deviceInfo)

              if (shouldApply) {
                element.classList.add(`layout-${breakpoint}`)
              }
            })
          }
        },

        /**
         * 评估条件
         */
        evaluateCondition(condition, deviceInfo) {
          if (typeof condition === 'string') {
            // 简单条件评估
            switch (condition) {
              case 'mobile':
                return deviceInfo.isMobile
              case 'tablet':
                return deviceInfo.isTablet
              case 'desktop':
                return deviceInfo.isDesktop
              case 'touch':
                return deviceInfo.touchSupported
              case 'landscape':
                return deviceInfo.orientation === 'landscape'
              case 'portrait':
                return deviceInfo.orientation === 'portrait'
              default:
                return false
            }
          } else if (typeof condition === 'function') {
            // 函数条件评估
            return condition(deviceInfo)
          } else if (typeof condition === 'object') {
            // 对象条件评估
            return this.evaluateObjectCondition(condition, deviceInfo)
          }
        },

        /**
         * 评估对象条件
         */
        evaluateObjectCondition(condition, deviceInfo) {
          return Object.entries(condition).every(([key, value]) => {
          switch (key) {
            case 'minWidth':
              return deviceInfo.screenWidth >= value
            case 'maxWidth':
              return deviceInfo.screenWidth <= value
            case 'orientation':
              return deviceInfo.orientation === value
            case 'device':
              return deviceInfo[value] || false
            default:
              return deviceInfo[key] === value
          }
        })
        },

        /**
         * 检测是否为移动端
         */
        $isMobile() {
          return mobileAdaptationService.isMobileDevice()
        },

        /**
         * 获取设备信息
         */
        $getDeviceInfo() {
          return mobileAdaptationService.getDeviceInfo()
        },

        /**
         * 触觉反馈
         */
        $hapticFeedback(type) {
          return mobileAdaptionService.hapticFeedback(type)
        },

        /**
         * 获取主题配置
         */
        $getTheme() {
          return mobileAdaptationService.getTheme()
        },

        /**
         * 更新主题配置
         */
        $updateTheme(theme) {
          return mobileAdaptationService.updateThemeConfig(theme)
        }
      }
    })

    // 响应式指令
    app.directive('responsive', {
      mounted(el, binding) {
        const config = binding.value || {}
        mobileAdaptationService.adaptiveLayout(el, config)
      },
      updated(el, binding) {
        const config = binding.value || {}
        mobileAdiationService.adaptiveLayout(el, config)
      }
    })

    // 触摸指令
    app.directive('touch', {
      mounted(el, binding) {
        if (!mobileAdaptationService.isMobileDevice()) return

        const config = binding.value || {}
        const eventType = config.event || 'click'
        const feedback = config.feedback || true

        el.addEventListener(eventType, (e) => {
          if (feedback) {
            mobileAdaptationService.hapticFeedback('light')
            mobileAdaptationService.addHapticClass(el, 'light')
          }
          binding.value && binding.value(e)
        }, { passive: true })
      }
    })

    // 滑动指令
    app.directive('swipe', {
      mounted(el, binding) {
        if (!mobileAdiationService.isMobileDevice()) return

        const config = binding.value || {}
        const direction = config.direction || 'horizontal'
        const threshold = config.threshold || 50

        let startX = 0
        let startY = 0

        el.addEventListener('touchstart', (e) => {
          const touch = e.touches[0]
          startX = touch.clientX
          startY = touch.clientY
        }, { passive: true })

        el.addEventListener('touchmove', (e) => {
          e.preventDefault()
        }, { passive: false })

        el.addEventListener('touchend', (e) => {
          const touch = e.changedTouches[0]
          const endX = touch.clientX
          const endY = touch.clientY
          const deltaX = endX - startX
          const deltaY = endY - startY

          let swipeResult = false

          if (direction === 'horizontal' || direction === 'both') {
            if (Math.abs(deltaX) > threshold) {
              swipeResult = {
                direction: deltaX > 0 ? 'right' : 'left',
                distance: Math.abs(deltaX)
              }
            }
          }

          if (direction === 'vertical' || direction === 'both') {
            if (Math.abs(deltaY) > threshold) {
              const verticalResult = {
                direction: deltaY > 0 ? 'down' : 'up',
                distance: Math.abs(deltaY)
              }
              swipeResult = swipeResult ? swipeResult : verticalResult
            }
          }

          if (swipeResult && binding.value) {
            binding.value(swipeResult)
          }
        }, { passive: true })
      }
    })

    // 长按指令
    app.directive('longpress', {
      mounted(el, binding) {
        if (!mobileAdaptationService.isMobileDevice()) return

        const config = binding.value || {}
        const duration = config.duration || 500
        const feedback = config.feedback !== false

        let pressTimer = null

        el.addEventListener('touchstart', (e) => {
          pressTimer = setTimeout(() => {
            if (feedback) {
              mobileAdaptationService.hapticFeedback('medium')
              mobileAdaptationService.addHapticClass(el, 'medium')
            }
            binding.value && binding.value('longpress', e)
          }, duration)
        }, { passive: true })

        el.addEventListener('touchend', () => {
          if (pressTimer) {
            clearTimeout(pressTimer)
          }
        }, { passive: true })

        el.addEventListener('touchcancel', () => {
          if (pressTimer) {
            clearTimeout(pressTimer)
          }
        }, { passive: true })
      }
    })

    // 全局属性
    app.config.globalProperties.$deviceInfo = mobileAdaptationService.getDeviceInfo()
    app.config.globalProperties.$isMobile = mobileAdaptationService.isMobileDevice()
  }
}

export default MobileAdaptationPlugin