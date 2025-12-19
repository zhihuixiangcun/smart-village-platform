import { test, expect, devices } from '@playwright/test'

// 使用桌面端设备配置
test.use({
  ...devices['Desktop Chrome'],
  viewport: { width: 1920, height: 1080 }
})

test.describe('桌面端用户反馈流程', () => {
  test.beforeEach(async ({ page }) => {
    // 使用已保存的登录状态
    const storageState = JSON.parse(
      require('fs').readFileSync('e2e-results/storage-state.json', 'utf8')
    )
    await page.context().addCookies(storageState.cookies)
  })

  test('完整的反馈提交流程', async ({ page }) => {
    // 1. 导航到反馈页面
    await page.goto('/feedback')
    await page.waitForLoadState('networkidle')

    // 2. 点击新建反馈按钮
    await page.click('[data-testid="new-feedback-btn"]')
    await expect(page).toHaveURL('/feedback/submit')

    // 3. 填写反馈表单
    await page.fill('[data-testid="feedback-title"]', '关于村口路灯损坏的反馈')
    await page.selectOption('[data-testid="feedback-type"]', { label: '设施报修' })
    await page.fill('[data-testid="feedback-content"]', '村口入口处的路灯已经损坏一周，夜间村民出入非常不便，存在安全隐患。希望尽快安排维修。')

    // 4. 添加附件
    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles('test/fixtures/broken-light.jpg')

    // 验证文件已上传
    await expect(page.locator('[data-testid="uploaded-file"]')).toBeVisible()

    // 5. 选择紧急程度
    await page.click('[data-testid="priority-high"]')
    await expect(page.locator('[data-testid="priority-high"]')).toBeChecked()

    // 6. 提交反馈
    await page.click('[data-testid="submit-feedback-btn"]')

    // 7. 验证提交成功
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="feedback-id"]')).toBeVisible()

    // 8. 记录反馈ID
    const feedbackId = await page.locator('[data-testid="feedback-id"]').textContent()
    console.log('Created feedback ID:', feedbackId)
  })

  test('反馈列表查看和筛选', async ({ page }) => {
    // 导航到反馈列表
    await page.goto('/feedback/list')
    await page.waitForLoadState('networkidle')

    // 验证列表加载
    await expect(page.locator('[data-testid="feedback-table"]')).toBeVisible()
    await expect(page.locator('[data-testid="feedback-row"]')).toHaveCount.greaterThan(0)

    // 测试筛选功能
    // 1. 按状态筛选
    await page.click('[data-testid="status-filter"]')
    await page.click('[data-testid="status-pending"]')
    await page.click('[data-testid="apply-filter-btn"]')

    // 验证筛选结果
    const pendingRows = page.locator('[data-testid="feedback-row"][data-status="pending"]')
    await expect(pendingRows.first()).toBeVisible()

    // 2. 按类型筛选
    await page.click('[data-testid="type-filter"]')
    await page.click('[data-testid="type-facility"]')
    await page.click('[data-testid="apply-filter-btn"]')

    // 验证筛选结果
    const facilityRows = page.locator('[data-testid="feedback-row"][data-type="facility"]')
    await expect(facilityRows.first()).toBeVisible()

    // 3. 使用搜索功能
    await page.fill('[data-testid="search-input"]', '路灯')
    await page.click('[data-testid="search-btn"]')

    // 验证搜索结果
    const searchResults = page.locator('[data-testid="feedback-row"]')
    const resultCount = await searchResults.count()
    for (let i = 0; i < Math.min(resultCount, 5); i++) {
      const title = await searchResults.nth(i).locator('[data-testid="feedback-title"]').textContent()
      expect(title).toContain('路灯')
    }

    // 4. 清除筛选
    await page.click('[data-testid="clear-filter-btn"]')
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('')
  })

  test('反馈详情查看和交互', async ({ page }) => {
    // 导航到反馈列表
    await page.goto('/feedback/list')
    await page.waitForLoadState('networkidle')

    // 点击第一条反馈查看详情
    await page.click('[data-testid="feedback-row"]').first()
    await expect(page).toHaveURL(/\/feedback\/detail\/\w+/)

    // 验证详情页面
    await expect(page.locator('[data-testid="feedback-detail-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="feedback-info"]')).toBeVisible()
    await expect(page.locator('[data-testid="feedback-timeline"]')).toBeVisible()

    // 测试添加补充说明
    await page.click('[data-testid="add-comment-btn"]')
    await page.fill('[data-testid="comment-input"]', '补充说明：路灯损坏位置更正为主入口左侧第二根灯杆。')
    await page.click('[data-testid="submit-comment-btn"]')

    // 验证补充说明添加成功
    await expect(page.locator('[data-testid="comment-item"]').last()).toContainText('补充说明')

    // 测试上传补充图片
    const commentFileInput = page.locator('[data-testid="comment-file-input"]')
    await commentFileInput.setInputFiles('test/fixtures/light-location.jpg')

    // 验证图片上传成功
    await expect(page.locator('[data-testid="comment-image"]')).toBeVisible()
  })

  test('反馈处理和评价', async ({ page }) => {
    // 使用管理员账号登录
    await page.goto('/login')
    await page.fill('[data-testid="username-input"]', 'admin')
    await page.fill('[data-testid="password-input"]', 'admin123')
    await page.click('[data-testid="login-btn"]')

    // 导航到待处理的反馈
    await page.goto('/admin/feedback/pending')
    await page.waitForLoadState('networkidle')

    // 选择一条反馈进行处理
    await page.click('[data-testid="feedback-row"]').first()
    await expect(page).toHaveURL(/\/admin\/feedback\/\w+/)

    // 分配处理人
    await page.click('[data-testid="assign-handler-btn"]')
    await page.click('[data-testid="handler-select"]')
    await page.click('[data-testid="handler-option"]')
    await page.click('[data-testid="confirm-assign-btn"]')

    // 验证分配成功
    await expect(page.locator('[data-testid="assign-success"]')).toBeVisible()

    // 添加处理回复
    await page.click('[data-testid="add-response-btn"]')
    await page.fill('[data-testid="response-content"]', '已收到反馈，预计本周内安排维修。')
    await page.click('[data-testid="submit-response-btn"]')

    // 更新处理状态
    await page.click('[data-testid="status-select"]')
    await page.click('[data-testid="status-processing"]')

    // 完成处理
    await page.click('[data-testid="mark-complete-btn"]')
    await page.fill('[data-testid="completion-note"]', '路灯已修复，恢复正常使用。')
    await page.click('[data-testid="confirm-complete-btn"]')

    // 切换回普通用户账号
    await page.goto('/login')
    await page.fill('[data-testid="username-input"]', 'testuser')
    await page.fill('[data-testid="password-input"]', 'user123')
    await page.click('[data-testid="login-btn"]')

    // 查看已处理的反馈
    await page.goto('/feedback/list')
    await page.click('[data-testid="status-filter"]')
    await page.click('[data-testid="status-resolved"]')
    await page.click('[data-testid="apply-filter-btn"]')

    // 点击已解决的反馈
    await page.click('[data-testid="feedback-row"]').first()

    // 进行满意度评价
    await page.click('[data-testid="rate-btn"]')
    await page.click('[data-testid="rating-5"]') // 五星好评
    await page.fill('[data-testid="rate-comment"]', '处理及时，服务态度很好！')
    await page.click('[data-testid="submit-rate-btn"]')

    // 验证评价成功
    await expect(page.locator('[data-testid="rate-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="rating-display"]')).toContainText('★★★★★')
  })

  test('批量操作功能', async ({ page }) => {
    // 导航到反馈管理页面（管理员）
    await page.goto('/admin/feedback')
    await page.waitForLoadState('networkidle')

    // 选择多条反馈
    await page.check('[data-testid="feedback-checkbox"] >> nth=0')
    await page.check('[data-testid="feedback-checkbox"] >> nth=1')
    await page.check('[data-testid="feedback-checkbox"] >> nth=2')

    // 验证批量操作按钮已启用
    await expect(page.locator('[data-testid="batch-actions"]')).toBeEnabled()

    // 测试批量分配
    await page.click('[data-testid="batch-assign-btn"]')
    await page.click('[data-testid="handler-select"]')
    await page.click('[data-testid="handler-option"]')
    await page.click('[data-testid="confirm-batch-assign-btn"]')

    // 验证批量操作成功
    await expect(page.locator('[data-testid="batch-success"]')).toBeVisible()

    // 测试批量导出
    await page.check('[data-testid="feedback-checkbox"] >> nth=0')
    await page.check('[data-testid="feedback-checkbox"] >> nth=1')
    await page.click('[data-testid="batch-export-btn"]')

    // 验证导出对话框
    await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible()
    await page.click('[data-testid="export-excel-btn"]')

    // 验证下载开始
    await expect(page.locator('[data-testid="download-started"]')).toBeVisible()
  })

  test('数据统计和报表', async ({ page }) => {
    // 导航到反馈统计页面
    await page.goto('/admin/feedback/statistics')
    await page.waitForLoadState('networkidle')

    // 验证统计卡片
    await expect(page.locator('[data-testid="total-count-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="pending-count-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="resolved-count-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="avg-response-time-card"]')).toBeVisible()

    // 验证图表
    await expect(page.locator('[data-testid="feedback-type-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="monthly-trend-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="department-performance-chart"]')).toBeVisible()

    // 测试时间范围筛选
    await page.click('[data-testid="date-range-picker"]')
    await page.click('[data-testid="last-30-days"]')
    await page.click('[data-testid="apply-date-filter"]')

    // 验证图表更新
    await page.waitForTimeout(1000)
    await expect(page.locator('[data-testid="chart-updated"]')).toBeVisible()

    // 导出报表
    await page.click('[data-testid="export-report-btn"]')
    await page.click('[data-testid="export-pdf-btn"]')

    // 验证报表生成
    await expect(page.locator('[data-testid="report-generating"]')).toBeVisible()
  })

  test('实时通知功能', async ({ page }) => {
    // 导航到反馈页面
    await page.goto('/feedback')
    await page.waitForLoadState('networkidle')

    // 监听WebSocket连接
    const wsMessages = []
    page.on('websocket', ws => {
      ws.on('framesent', event => console.log('Sent:', event.payload))
      ws.on('framereceived', event => {
        wsMessages.push(JSON.parse(event.payload))
      })
    })

    // 模拟新的反馈通知
    await page.evaluate(() => {
      // 模拟服务器推送通知
      window.postMessage({
        type: 'NEW_NOTIFICATION',
        data: {
          type: 'feedback_reply',
          title: '您有新的反馈回复',
          content: '您提交的关于路灯维修的反馈已得到处理',
          timestamp: new Date().toISOString()
        }
      }, '*')
    })

    // 验证通知显示
    await expect(page.locator('[data-testid="notification-toast"]')).toBeVisible()

    // 点击通知
    await page.click('[data-testid="notification-toast"]')

    // 验证跳转到对应反馈
    await expect(page).toHaveURL(/\/feedback\/detail\/\w+/)

    // 查看通知中心
    await page.click('[data-testid="notification-center-btn"]')
    await expect(page.locator('[data-testid="notification-list"]')).toBeVisible()

    // 标记为已读
    await page.click('[data-testid="mark-all-read-btn"]')
    await expect(page.locator('[data-testid="unread-badge"]')).toBeHidden()
  })

  test('快捷键操作', async ({ page }) => {
    // 导航到反馈列表
    await page.goto('/feedback/list')
    await page.waitForLoadState('networkidle')

    // 测试快捷键 N - 新建反馈
    await page.keyboard.press('n')
    await expect(page).toHaveURL('/feedback/submit')

    // 返回列表
    await page.goBack()
    await page.waitForLoadState('networkidle')

    // 测试快捷键 / - 聚焦搜索
    await page.keyboard.press('/')
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused()

    // 测试快捷键 Esc - 清除搜索
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('')

    // 测试快捷键 Ctrl+A - 全选
    await page.keyboard.press('Control+a')
    await expect(page.locator('[data-testid="feedback-checkbox"]')).toHaveCount.greaterThan(0)

    // 测试方向键导航
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('[data-testid="feedback-row"]').first()).toHaveClass(/selected/)

    // 测试回车查看详情
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/feedback\/detail\/\w+/)
  })
})