import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { ElMessage } from 'element-plus/es';

NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
});

const whiteList = [
  '/unified-login',
  '/auth/login',
  '/auth/register',
  '/login',
  '/register',
  '/forgot-password',
  '/404',
  '/403',
  '/',
];

export function setupGuards(router) {
  router.beforeEach(async (to, from, next) => {
    NProgress.start();

    try {
      const { useUserStore } = await import('@/stores/userStore');
      const userStore = useUserStore();
      const { token, isLoggedIn } = userStore;

      if (to.meta.title) {
        document.title = `${to.meta.title} - 智慧乡村服务平台`;
      }

      if (whiteList.includes(to.path)) {
        if (
          isLoggedIn &&
          (to.path === '/auth/login' || to.path === '/login' || to.path === '/unified-login')
        ) {
          const userRole = userStore.userInfo?.role || localStorage.getItem('userRole');
          const roleRedirectMap = {
            resident: '/village/affairs',
            villager: '/village/affairs',
            village_admin: '/village/dashboard',
            village_official: '/village/dashboard',
            admin: '/village/dashboard',
            purchaser: '/purchaser/dashboard',
          };
          const redirectPath = roleRedirectMap[userRole] || '/village/affairs';
          next(redirectPath);
        } else {
          next();
        }
        return;
      }

      if (!token) {
        ElMessage.warning('请先登录');
        next(`/auth/login?redirect=${encodeURIComponent(to.fullPath)}`);
        return;
      }

      next();
    } catch (error) {
      console.error('路由守卫错误:', error);
      NProgress.done();
      next();
    }
  });

  router.afterEach((to, from) => {
    NProgress.done();

    if (process.env.NODE_ENV === 'development') {
      console.log(`路由跳转: ${from.path} -> ${to.path}`);
    }
  });

  router.onError(error => {
    console.error('路由错误:', error);
    NProgress.done();
  });
}
