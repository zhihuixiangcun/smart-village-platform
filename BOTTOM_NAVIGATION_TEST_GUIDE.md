# 底部导航重构 - 测试指南

## 测试环境

```bash
# 进入项目目录
cd G:\claude code

# 启动开发服务器
npm run dev & npm run client
```

访问地址：http://localhost:3000

## 测试场景

### 1. 村民角色测试

**路由前缀**: `/mobile`

**预期导航项**:
1. 首页 → `/mobile/home`
2. 服务 → `/mobile/services`
3. 生活 → `/mobile/life`
4. 消息 → `/mobile/messages` (带徽章)
5. 我的 → `/mobile/profile`

**测试步骤**:
1. 访问 `http://localhost:3000/mobile/home`
2. 验证底部导航显示5个tab
3. 验证"消息"tab显示红色徽章（数字3）
4. 点击每个导航项，验证正确跳转
5. 验证激活状态的蓝色高亮

### 2. 村干部角色测试

**路由前缀**: `/village`

**预期导航项**:
1. 首页 → `/village/home`
2. 村务 → `/village/affairs`
3. 消息 → `/village/messages` (带徽章)
4. 我的 → `/profile`

**测试步骤**:
1. 访问 `http://localhost:3000/village/home`
2. 验证底部导航显示4个tab
3. 验证"消息"tab显示红色徽章
4. 点击每个导航项，验证正确跳转
5. 验证激活状态的蓝色高亮

### 3. 乡镇干部角色测试

**路由前缀**: `/township`

**预期导航项**:
1. 首页 → `/township/home`
2. 管理 → `/township/villages`
3. 统计 → `/township/statistics`
4. 我的 → `/profile`

**测试步骤**:
1. 访问 `http://localhost:3000/township/home`
2. 验证底部导航显示4个tab
3. 验证没有任何徽章（乡镇干部徽章未启用）
4. 点击每个导航项，验证正确跳转
5. 验证激活状态的蓝色高亮

### 4. 采购商角色测试

**路由前缀**: `/purchaser`

**预期导航项**:
1. 首页 → `/purchaser/home`
2. 市场 → `/purchaser/market`
3. 订单 → `/purchaser/orders` (带徽章)
4. 我的 → `/profile`

**测试步骤**:
1. 访问 `http://localhost:3000/purchaser/home`
2. 验证底部导航显示4个tab
3. 验证"订单"tab显示黄色徽章
4. 点击每个导航项，验证正确跳转
5. 验证激活状态的蓝色高亮

### 5. 管理员角色测试

**路由前缀**: `/admin`

**预期导航项**:
1. 村务 → `/admin/affairs`
2. 消息 → `/admin/messages` (带徽章)
3. 我的 → `/profile`

**测试步骤**:
1. 访问 `http://localhost:3000/admin/affairs`
2. 验证底部导航显示3个tab
3. 验证"消息"tab显示蓝色徽章
4. 点击每个导航项，验证正确跳转
5. 验证激活状态的蓝色高亮

## 功能测试

### 徽章测试

**测试徽章类型**:
- `danger` (红色) - 消息
- `warning` (黄色) - 订单
- `info` (蓝色) - 系统消息

**测试步骤**:
1. 验证徽章数字显示正确
2. 验证徽章数字超过99时显示"99+"
3. 验证徽章颜色正确
4. 验证徽章位置正确（右上角）
5. 验证徽章边框适配深色模式

### 适老化模式测试

**测试步骤**:
1. 点击右上角的访问性图标（View图标）
2. 验证大字模式启用
3. 验证底部导航高度从60px增加到70px
4. 验证图标尺寸从24px增加到28px
5. 验证标签字号从11px增加到14px
6. 验证激活指示器从3px增加到4px
7. 刷新页面，验证设置持久化

### 深色模式测试

**测试步骤**:
1. 在浏览器开发者工具中切换深色模式
2. 或在应用中启用深色模式
3. 验证底部导航背景变为深色
4. 验证激活状态颜色变为浅蓝色 (#60a5fa)
5. 验证文字颜色适配深色模式
6. 验证徽章边框适配深色模式

### 横屏模式测试

**测试步骤**:
1. 将设备横屏或调整浏览器窗口宽度大于高度
2. 验证底部导航高度从60px减少到50px
3. 验证图标尺寸从24px减少到20px
4. 验证标签字号从11px减少到10px
5. 验证间距和padding相应减少

### 动画效果测试

**点击波纹测试**:
1. 点击任意导航项
2. 验证出现蓝色圆形波纹效果
3. 验证波纹从中心向外扩散
4. 验证波纹持续约0.4秒

**激活指示器测试**:
1. 点击任意导航项
2. 验证底部蓝色指示器从左侧滑动到被点击项下方
3. 验证指示器宽度从0平滑过渡到20px
4. 验证指示器高度为3px

**徽章动画测试**:
1. 观察徽章数字变化
2. 验证徽章出现时有弹出动画
3. 验证徽章数字变化时有过渡效果

### 安全区域适配测试

**测试设备**: iPhone X 及以上

**测试步骤**:
1. 在 iPhone X 设备上打开应用
2. 验证底部导航不被底部手势条遮挡
3. 验证底部导航底部有额外的padding（安全区域）
4. 验证竖屏和横屏都正确适配

### 响应式测试

**测试屏幕尺寸**:
- 小屏幕 (< 360px)
- 中等屏幕 (361px - 414px)
- 大屏幕 (> 414px)

**测试步骤**:
1. 调整浏览器窗口宽度
2. 验证布局在不同屏幕尺寸下正常显示
3. 验证导航项不换行
4. 验证图标和标签清晰可见

### 键盘导航测试

**测试步骤**:
1. 使用 Tab 键切换焦点
2. 验证焦点正确移动到下一个导航项
3. 使用 Enter 键激活导航项
4. 验证激活时正确跳转
5. 验证焦点可见性（蓝色轮廓）

### 性能测试

**测试步骤**:
1. 快速点击多个导航项
2. 验证导航切换流畅无卡顿
3. 验证动画效果流畅
4. 验证没有内存泄漏
5. 验证控制台无错误或警告

## 边界测试

### 1. 路由不存在

**测试步骤**:
1. 访问不存在的路由，如 `/mobile/nonexistent`
2. 验证底部导航仍然显示
3. 验证导航项基于路由前缀正确显示

### 2. 徽章数量为0

**测试步骤**:
1. 将徽章数量设置为0
2. 验证徽章不显示
3. 验证导航项布局正常

### 3. 徽章数量超过99

**测试步骤**:
1. 将徽章数量设置为100
2. 验证显示"99+"
3. 验证徽章大小正常

### 4. 禁用底部导航的页面

**测试步骤**:
1. 访问登录页 `/auth/login`
2. 验证底部导航不显示
3. 验证页面可以正常操作

## 兼容性测试

### 浏览器测试

- ✅ Chrome (最新版本)
- ✅ Safari (最新版本)
- ✅ Firefox (最新版本)
- ✅ Edge (最新版本)

### 设备测试

- ✅ iOS (iPhone)
- ✅ Android
- ✅ iPad (平板)
- ✅ 桌面浏览器

## 测试清单

- [ ] 村民角色：5个tab正确显示
- [ ] 村干部角色：4个tab正确显示
- [ ] 乡镇干部角色：4个tab正确显示
- [ ] 采购商角色：4个tab正确显示
- [ ] 管理员角色：3个tab正确显示
- [ ] 徽章数字正确显示
- [ ] 徽章颜色正确（红/黄/蓝）
- [ ] 点击切换正确跳转
- [ ] 激活状态高亮正确
- [ ] 点击波纹动画流畅
- [ ] 激活指示器动画流畅
- [ ] 适老化模式支持
- [ ] 深色模式支持
- [ ] 横竖屏适配正常
- [ ] 安全区域适配正常
- [ ] 响应式布局正常
- [ ] 键盘导航支持
- [ ] 性能良好（< 100ms响应）
- [ ] 无控制台错误
- [ ] 无内存泄漏

## 常见问题排查

### 问题1: 底部导航不显示

**可能原因**:
- 路由未正确配置
- 组件未正确导入
- showBottomNav 计算属性错误

**解决方案**:
1. 检查路由是否在 hiddenRoutes 列表中
2. 检查控制台是否有错误
3. 验证组件导入路径正确

### 问题2: 导航项不正确

**可能原因**:
- 路由前缀不匹配
- 导航配置错误
- 角色识别错误

**解决方案**:
1. 检查路由前缀是否在 ROUTE_PREFIX_MAP 中
2. 验证 navigation.config.js 配置正确
3. 检查控制台日志输出的路由和角色信息

### 问题3: 徽章不显示

**可能原因**:
- 徽章数量为0
- 徽章配置未启用
- badgeKey 配置错误

**解决方案**:
1. 检查徽章数量是否 > 0
2. 检查 BADGE_CONFIG.enabled 是否为 true
3. 验证 badgeKey 与 BADGE_CONFIG.items 配置一致

### 问题4: 样式不正确

**可能原因**:
- CSS 变量未加载
- 组件样式冲突
- 主题类名未正确应用

**解决方案**:
1. 检查浏览器是否支持 CSS 变量
2. 检查是否有全局样式覆盖
3. 验证适老化/深色模式类名是否正确

## 自动化测试建议

### 单元测试

```javascript
// tests/composables/useBottomNavigation.spec.js
import { useBottomNavigation } from '@/composables/useBottomNavigation';

describe('useBottomNavigation', () => {
  it('应该正确返回村民角色的导航项', () => {
    const { navigationItems } = useBottomNavigation();
    // 测试逻辑...
  });

  it('应该正确显示徽章', () => {
    const { updateBadge, unreadCount } = useBottomNavigation();
    updateBadge('messages', 5);
    expect(unreadCount.value).toBe(5);
  });
});
```

### 组件测试

```javascript
// tests/components/BottomNavigation.spec.js
import { mount } from '@vue/test-utils';
import BottomNavigation from '@/components/mobile/BottomNavigation/index.vue';

describe('BottomNavigation', () => {
  it('应该渲染正确的导航项数量', () => {
    const wrapper = mount(BottomNavigation, {
      props: {
        items: mockItems,
      },
    });
    expect(wrapper.findAll('.nav-item').length).toBe(5);
  });

  it('应该正确处理点击事件', async () => {
    const wrapper = mount(BottomNavigation, {
      props: {
        items: mockItems,
      },
    });

    await wrapper.findAll('.nav-item')[0].trigger('click');
    expect(wrapper.emitted().itemClick).toBeTruthy();
  });
});
```

## 测试报告模板

```
测试日期: [YYYY-MM-DD]
测试人员: [姓名]
测试环境: [开发/测试/生产]
测试设备: [设备信息]

功能测试:
- ✅ 村民角色导航
- ✅ 村干部角色导航
- ✅ 乡镇干部角色导航
- ✅ 采购商角色导航
- ✅ 管理员角色导航
- ✅ 徽章功能
- ✅ 适老化模式
- ✅ 深色模式
- ✅ 横竖屏适配
- ✅ 动画效果

兼容性测试:
- ✅ Chrome
- ✅ Safari
- ✅ Firefox
- ✅ iOS
- ✅ Android

性能测试:
- ✅ 响应时间 < 100ms
- ✅ 无内存泄漏
- ✅ 无控制台错误

发现的问题:
1. [问题描述]
   - 严重程度: [高/中/低]
   - 复现步骤: [步骤]
   - 预期结果: [结果]
   - 实际结果: [结果]

总体评价: [通过/不通过]
```

---

**测试完成后，请更新本文档并提交测试报告。**
