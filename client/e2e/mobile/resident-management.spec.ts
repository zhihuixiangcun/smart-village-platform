import { test, expect, devices } from '@playwright/test'

// 使用移动端设备配置
test.use({
  ...devices['iPhone 12'],
  // 自定义视口
  viewport: { width: 390, height: 844 },
  // 移动端用户代理
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
  // 触摸支持
  hasTouch: true,
  // 移动端配置
  isMobile: true
})

test.describe('移动端村民管理功能', () => {
  test.beforeEach(async ({ page }) => {
    // 使用已保存的登录状态
    const storageState = JSON.parse(
      require('fs').readFileSync('e2e-results/storage-state.json', 'utf8')
    )
    await page.context().addCookies(storageState.cookies)

    // 设置移动端检测
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      })
    })
  })

  test('应该能够查看村民列表（移动端布局）', async ({ page }) => {
    // 导航到村民管理页面
    await page.goto('/residents')
    await page.waitForLoadState('networkidle')

    // 验证移动端布局
    // 1. 验证响应式导航栏
    await expect(page.locator('[data-testid="mobile-menu-btn"]')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible()

    // 2. 验证村民卡片布局（而非表格）
    await expect(page.locator('[data-testid="resident-cards-container"]')).toBeVisible()

    // 3. 验证搜索栏在移动端的位置
    await expect(page.locator('[data-testid="mobile-search-bar"]')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-filter-btn"]')).toBeVisible()

    // 4. 验证村民卡片内容
    const firstCard = page.locator('[data-testid="resident-card"]').first()
    await expect(firstCard).toBeVisible()
    await expect(firstCard.locator('[data-testid="resident-name"]')).toBeVisible()
    await expect(firstCard.locator('[data-testid="resident-avatar"]')).toBeVisible()
    await expect(firstCard.locator('[data-testid="resident-info"]')).toBeVisible()

    // 5. 验证移动端分页
    await expect(page.locator('[data-testid="mobile-pagination"]')).toBeVisible()
  })

  test('应该能够使用移动端搜索功能', async ({ page }) => {
    await page.goto('/residents')
    await page.waitForLoadState('networkidle')

    // 点击移动端搜索框
    await page.click('[data-testid="mobile-search-input"]')

    // 输入搜索关键词
    const searchKeyword = '张'
    await page.fill('[data-testid="mobile-search-input"]', searchKeyword)

    // 等待搜索结果
    await page.waitForTimeout(500)

    // 验证搜索结果
    const cards = page.locator('[data-testid="resident-card"]')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)

    // 验证搜索结果包含关键词
    for (let i = 0; i < count; i++) {
      const cardName = await cards.nth(i).locator('[data-testid="resident-name"]').textContent()
      expect(cardName).toContain(searchKeyword)
    }
  })

  test('应该能够打开移动端筛选器', async ({ page }) => {
    await page.goto('/residents')
    await page.waitForLoadState('networkidle')

    // 点击筛选按钮
    await page.click('[data-testid="mobile-filter-btn"]')

    // 验证筛选抽屉打开
    await expect(page.locator('[data-testid="mobile-filter-drawer"]')).toBeVisible()

    // 选择家庭类型
    await page.click('[data-testid="family-type-filter"]')
    await page.click('[data-testid="option-low-income"]')

    // 应用筛选
    await page.click('[data-testid="apply-filter-btn"]')

    // 验证筛选结果
    await page.waitForTimeout(500)
    const cards = page.locator('[data-testid="resident-card"]')
    const firstCard = cards.first()
    const familyType = await firstCard.locator('[data-testid="family-type"]').textContent()
    expect(familyType).toContain('低保户')
  })

  test('应该能够查看村民详情', async ({ page }) => {
    await page.goto('/residents')
    await page.waitForLoadState('networkidle')

    // 点击第一个村民卡片
    await page.click('[data-testid="resident-card"]').first()

    // 验证跳转到详情页
    await expect(page).toHaveURL(/\/residents\/detail\/\w+/)

    // 验证详情页面布局
    await expect(page.locator('[data-testid="mobile-detail-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="resident-detail-card"]')).toBeVisible()

    // 验证详情内容（移动端垂直布局）
    await expect(page.locator('[data-testid="basic-info-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="contact-info-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="family-info-section"]')).toBeVisible()

    // 验证底部操作栏
    await expect(page.locator('[data-testid="mobile-action-bar"]')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-edit-btn"]')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-call-btn"]')).toBeVisible()
  })

  test('应该能够拨打村民电话', async ({ page }) => {
    await page.goto('/residents/detail/resident-001')
    await page.waitForLoadState('networkidle')

    // 点击拨打电话按钮
    await page.click('[data-testid="mobile-call-btn"]')

    // 验证原生拨号应用被调用
    // 注意：在实际测试中，这会触发系统拨号
    await expect(page.locator('[data-testid="call-confirm-dialog"]')).toBeVisible()

    // 确认拨打电话
    await page.click('[data-testid="confirm-call-btn"]')

    // 验证点击事件被触发
    // 在真实环境中，这将打开电话应用
  })

  test('应该能够添加新村民', async ({ page }) => {
    await page.goto('/residents')
    await page.waitForLoadState('networkidle')

    // 点击添加按钮（浮动操作按钮）
    await page.click('[data-testid="mobile-fab-add"]')

    // 验证添加表单页面
    await expect(page).toHaveURL('/residents/add')

    // 填写表单
    await page.fill('[data-testid="resident-name-input"]', '李四')
    await page.fill('[data-testid="resident-idcard-input"]', '330106199002021234')
    await page.fill('[data-testid="resident-phone-input"]', '13900139000')
    await page.fill('[data-testid="resident-address-input"]', '测试地址123号')

    // 选择家庭类型
    await page.click('[data-testid="family-type-select"]')
    await page.click('[data-testid="option-regular"]')

    // 滚动到页面底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // 提交表单
    await page.click('[data-testid="mobile-submit-btn"]')

    // 验证提交成功
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible()

    // 验证返回列表页
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL('/residents')
  })

  test('应该能够使用扫描身份证功能', async ({ page }) => {
    await page.goto('/residents/add')
    await page.waitForLoadState('networkidle')

    // 点击扫描身份证按钮
    await page.click('[data-testid="scan-idcard-btn"]')

    // 验证相机权限请求
    await expect(page.locator('[data-testid="camera-permission-dialog"]')).toBeVisible()

    // 允许相机权限
    await page.click('[data-testid="allow-camera-btn"]')

    // 模拟扫描成功（在实际测试中需要真实的摄像头）
    await page.evaluate(() => {
      // 模拟扫描结果
      window.postMessage({
        type: 'IDCARD_SCAN_RESULT',
        data: {
          name: '测试扫描',
          idCard: '330106199003031234',
          address: '浙江省杭州市测试区测试街道123号'
        }
      }, '*')
    })

    // 验证表单自动填充
    await expect(page.locator('[data-testid="resident-name-input"]')).toHaveValue('测试扫描')
    await expect(page.locator('[data-testid="resident-idcard-input"]')).toHaveValue('330106199003031234')
  })

  test('应该支持下拉刷新', async ({ page }) => {
    await page.goto('/residents')
    await page.waitForLoadState('networkidle')

    // 获取初始卡片数量
    const initialCount = await page.locator('[data-testid="resident-card"]').count()

    // 执行下拉刷新
    await page.evaluate(() => {
      const startY = 0
      const endY = 200

      window.scrollTo(0, startY)

      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientY: startY }]
      })
      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientY: endY }]
      })
      const touchEnd = new TouchEvent('touchend')

      document.dispatchEvent(touchStart)
      document.dispatchEvent(touchMove)
      document.dispatchEvent(touchEnd)
    })

    // 验证刷新指示器
    await expect(page.locator('[data-testid="refresh-indicator"]')).toBeVisible()

    // 等待刷新完成
    await page.waitForTimeout(2000)

    // 验证数据已更新
    await expect(page.locator('[data-testid="refresh-indicator"]')).toBeHidden()
  })

  test('应该支持上拉加载更多', async ({ page }) => {
    await page.goto('/residents')
    await page.waitForLoadState('networkidle')

    // 滚动到页面底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // 等待加载更多触发
    await page.waitForTimeout(1000)

    // 验证加载指示器
    await expect(page.locator('[data-testid="load-more-indicator"]')).toBeVisible()

    // 等待加载完成
    await page.waitForTimeout(2000)

    // 验证新数据已加载
    const finalCount = await page.locator('[data-testid="resident-card"]').count()
    expect(finalCount).toBeGreaterThan(10) // 初始每页10条
  })

  test('应该能够处理网络中断', async ({ page }) => {
    await page.goto('/residents')
    await page.waitForLoadState('networkidle')

    // 模拟网络中断
    await page.context().setOffline(true)

    // 尝试刷新页面
    await page.reload()

    // 验证离线提示
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible()
    await expect(page.locator('[data-testid="offline-message"]')).toBeVisible()

    // 验证缓存数据仍然显示
    await expect(page.locator('[data-testid="resident-card"]')).toHaveCount.greaterThan(0)

    // 恢复网络
    await page.context().setOffline(false)

    // 验证网络恢复提示
    await expect(page.locator('[data-testid="online-banner"]')).toBeVisible()
  })

  test('应该能够处理横竖屏切换', async ({ page }) => {
    await page.goto('/residents/detail/resident-001')
    await page.waitForLoadState('networkidle')

    // 初始竖屏状态
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('[data-testid="mobile-detail-layout-portrait"]')).toBeVisible()

    // 切换到横屏
    await page.setViewportSize({ width: 844, height: 390 })

    // 验证横屏布局
    await expect(page.locator('[data-testid="mobile-detail-layout-landscape"]')).toBeVisible()
    await expect(page.locator('[data-testid="detail-image-gallery"]')).toBeVisible()

    // 切换回竖屏
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('[data-testid="mobile-detail-layout-portrait"]')).toBeVisible()
  })

  test('应该支持语音搜索', async ({ page }) => {
    await page.goto('/residents')
    await page.waitForLoadState('networkidle')

    // 点击语音搜索按钮
    await page.click('[data-testid="voice-search-btn"]')

    // 验证语音识别界面
    await expect(page.locator('[data-testid="voice-search-modal"]')).toBeVisible()

    // 模拟语音输入
    await page.evaluate(() => {
      // 模拟语音识别结果
      window.postMessage({
        type: 'VOICE_RECOGNITION_RESULT',
        data: '张三'
      }, '*')
    })

    // 验证搜索框填充了语音结果
    await expect(page.locator('[data-testid="mobile-search-input"]')).toHaveValue('张三')

    // 验证搜索结果更新
    await page.waitForTimeout(500)
    const searchResults = page.locator('[data-testid="resident-card"]')
    const firstResult = searchResults.first()
    const resultName = await firstResult.locator('[data-testid="resident-name"]').textContent()
    expect(resultName).toContain('张三')
  })
})