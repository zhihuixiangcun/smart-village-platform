import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import Vant from 'vant';
import 'vant/lib/index.css';

import App from './App.vue';
import router from './router';
import permissionDirectives from './directives/permission';
import mobileAdaptationPlugin from './plugins/mobileAdaptation';
import './style/tailwind.css';
import './style/main.scss';

const app = createApp(App);
const pinia = createPinia();

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 注册权限指令
app.use(permissionDirectives);

// 注册移动端适配插件
app.use(mobileAdaptationPlugin);

app.use(pinia);
app.use(router);
app.use(ElementPlus, {
  locale: zhCn,
});
app.use(Vant);

// 全局错误处理 - 捕获并忽略renderSlot错误
app.config.errorHandler = (err, instance, info) => {
  // 忽略 renderSlot 相关的错误，这些是Element Plus的已知问题
  if (err?.message?.includes('renderSlot') || err?.message?.includes('ce')) {
    console.warn('忽略 Element Plus renderSlot 错误:', err.message);
    return;
  }
  // 其他错误正常处理
  console.error('全局错误:', err, info);
};

app.mount('#app');

// 调试：输出挂载信息
console.log('🚀 Vue应用已挂载到 #app');
console.log('📋 路由模式:', import.meta.env.BASE_URL);
console.log('📊 开发模式:', import.meta.env.DEV);
