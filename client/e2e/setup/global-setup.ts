import { chromium, FullConfig } from '@playwright/test'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...')

  // 设置全局超时
  config.timeout = 60000
  config.expect.timeout = 10000

  // 启动开发服务器（如果还没有运行）
  const serverPort = process.env.PORT || 3000
  const serverUrl = `http://localhost:${serverPort}`

  try {
    // 检查服务器是否已运行
    const response = await fetch(`${serverUrl}/health`)
    if (response.ok) {
      console.log('✅ Development server is already running')
    } else {
      console.log('⚠️  Starting development server...')
      await execAsync('npm run dev', { cwd: process.cwd() })
      console.log('✅ Development server started')
    }
  } catch (error) {
    console.log('⚠️  Starting development server...')
    // 启动服务器
    const { spawn } = await import('child_process')
    const devServer = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      stdio: 'pipe'
    })

    // 等待服务器启动
    let retries = 30
    while (retries > 0) {
      try {
        const response = await fetch(`${serverUrl}/health`)
        if (response.ok) {
          console.log('✅ Development server started successfully')
          break
        }
      } catch {
        // 服务器还未启动
      }
      retries -= 1
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    if (retries === 0) {
      throw new Error('Failed to start development server')
    }
  }

  // 设置测试数据库
  console.log('🗄️  Setting up test database...')
  try {
    await execAsync('npm run test:db:setup', { cwd: path.join(process.cwd(), '..') })
    console.log('✅ Test database setup completed')
  } catch (error) {
    console.log('⚠️  Test database setup failed, continuing with existing data')
  }

  // 创建全局浏览器上下文（用于全局登录状态）
  const browser = await chromium.launch()
  const context = await browser.newContext({
    storageState: {
      cookies: [],
      origins: []
    }
  })

  // 执行全局登录
  const page = await context.newPage()
  try {
    await page.goto(`${serverUrl}/login`)
    await page.fill('[data-testid="username-input"]', 'testadmin')
    await page.fill('[data-testid="password-input"]', 'admin123')
    await page.click('[data-testid="login-btn"]')
    await page.waitForURL('**/dashboard')

    // 保存登录状态
    const storageState = await context.storageState()

    // 写入全局存储状态文件
    require('fs').writeFileSync(
      path.join(config.projects?.[0]?.outputDir || 'e2e-results', 'storage-state.json'),
      JSON.stringify(storageState, null, 2)
    )

    console.log('✅ Global login state saved')
  } catch (error) {
    console.log('⚠️  Global login failed, tests will handle individual login')
  } finally {
    await context.close()
    await browser.close()
  }

  // 设置全局环境变量
  process.env.TEST_BASE_URL = serverUrl
  process.env.TEST_API_BASE_URL = `${serverUrl}/api`

  console.log('✅ E2E test setup completed')

  // 返回清理函数
  return async () => {
    console.log('🧹 Cleaning up after E2E tests...')

    // 清理测试数据库
    try {
      await execAsync('npm run test:db:cleanup', { cwd: path.join(process.cwd(), '..') })
      console.log('✅ Test database cleaned up')
    } catch (error) {
      console.log('⚠️  Test database cleanup failed')
    }

    console.log('✅ E2E test cleanup completed')
  }
}

export default globalSetup