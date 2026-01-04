/**
 * 路由守卫和权限控制
 */
import router from '@/router'
import { useUserStore } from '@/stores/userStore'
import { ElMessage } from 'element-plus'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// 配置NProgress
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200
})

// 白名单路由（不需要认证）
const whiteList = ['/unified-login', '/login', '/register', '/forgot-password', '/404', '/403']

// 路由前置守卫
router.beforeEach(async (to, from, next) => {
  // 开始进度条
  NProgress.start()

  const userStore = useUserStore()
  const { token, isLoggedIn, hasPermission, hasRole } = userStore

  try {
    // 设置页面标题
    if (to.meta.title) {
      document.title = `${to.meta.title} - 智慧乡村服务平台`
    }

    // 检查是否在白名单中
    if (whiteList.includes(to.path)) {
      // 如果已登录且访问登录页，根据角色重定向到对应主页
      if (isLoggedIn && (to.path === '/login' || to.path === '/unified-login')) {
        // 根据用户角色跳转到不同的主页
        const userRole = userStore.userInfo?.role || userStore.userRole
        const roleRedirectMap = {
          'resident': '/village-affairs',
          'village_admin': '/dashboard',  // 数据库中的村干部角色
          'village_official': '/dashboard',  // 数据库中的乡镇官员角色
          'admin': '/dashboard',
          'purchaser': '/purchaser/dashboard'
        }
        const redirectPath = roleRedirectMap[userRole] || '/dashboard'
        next(redirectPath)
      } else {
        next()
      }
      return
    }

    // 检查是否有Token
    if (!token) {
      ElMessage.warning('请先登录')
      next(`/unified-login?redirect=${encodeURIComponent(to.fullPath)}`)
      return
    }

    // 检查是否已获取用户信息
    if (!isLoggedIn) {
      try {
        // 尝试获取用户信息
        await userStore.getUserInfo()
        await Promise.all([
          userStore.getUserPermissions(),
          userStore.getUserRoles()
        ])
      } catch (error) {
        console.error('获取用户信息失败:', error)
        // Token可能已过期，清除并重定向到登录页
        await userStore.logout(false)
        next(`/unified-login?redirect=${encodeURIComponent(to.fullPath)}`)
        return
      }
    }

    // 权限检查
    if (to.meta.requiresAuth !== false) {
      // 检查路由权限
      if (to.meta.permission && !hasPermission(to.meta.permission)) {
        ElMessage.error('您没有访问该页面的权限')
        next('/403')
        return
      }

      // 检查角色权限
      if (to.meta.roles && !hasRole(to.meta.roles)) {
        ElMessage.error('您的角色无法访问该页面')
        next('/403')
        return
      }

      // 检查管理员权限
      if (to.meta.requiresAdmin && !hasRole('admin')) {
        ElMessage.error('需要管理员权限')
        next('/403')
        return
      }
    }

    next()
  } catch (error) {
    console.error('路由守卫错误:', error)
    ElMessage.error('页面加载失败')
    next('/404')
  }
})

// 路由后置守卫
router.afterEach((to, from) => {
  // 结束进度条
  NProgress.done()

  // 记录页面访问日志
  if (process.env.NODE_ENV === 'development') {
    console.log(`路由跳转: ${from.path} -> ${to.path}`)
  }
})

// 路由错误处理
router.onError((error) => {
  console.error('路由错误:', error)
  NProgress.done()
  ElMessage.error('页面加载出错，请刷新重试')
})

export default router