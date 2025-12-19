const { createServer } = require('http')
const { parse } = require('url')
const { randomInt } = require('crypto')
const path = require('path')
const fs = require('fs')

// Mock 数据存储
const mockData = {
  users: [
    {
      id: 'user-admin',
      username: 'testadmin',
      name: '测试管理员',
      role: 'admin',
      permissions: ['read', 'write', 'delete', 'manage']
    },
    {
      id: 'user-committee',
      username: 'testcommittee',
      name: '测试村委',
      role: 'committee',
      permissions: ['read', 'write']
    },
    {
      id: 'user-resident',
      username: 'testresident',
      name: '测试村民',
      role: 'resident',
      permissions: ['read']
    }
  ],
  residents: Array.from({ length: 100 }, (_, i) => ({
    id: `resident-${String(i + 1).padStart(3, '0')}`,
    name: `测试村民${i + 1}`,
    idCard: `3301061990${String(i).padStart(2, '0')}01001${String(i).padStart(4, '0')}`,
    phone: `1380013${String(i).padStart(4, '0')}`,
    address: `测试村${i + 1}号`,
    familyType: i % 3 === 0 ? '低保户' : i % 2 === 0 ? '独生户' : '普通户',
    familyMembers: Math.floor(Math.random() * 5) + 1
  })),
  feedbacks: Array.from({ length: 50 }, (_, i) => ({
    id: `feedback-${String(i + 1).padStart(3, '0')}`,
    userId: `user-${(i % 3) + 1}`,
    userName: ['测试管理员', '测试村委', '测试村民'][i % 3],
    type: ['suggestion', 'complaint', 'praise', 'facility'][i % 4],
    title: `测试反馈标题${i + 1}`,
    content: `这是第${i + 1}条测试反馈的内容。`,
    status: ['pending', 'processing', 'resolved'][i % 3],
    createTime: new Date(Date.now() - i * 6 * 60 * 60 * 1000).toISOString()
  }))
}

// 工具函数
const createResponse = (data, status = 200, message = 'Success') => ({
  success: status === 200,
  data,
  message,
  timestamp: new Date().toISOString()
})

const createPagination = (items, page = 1, pageSize = 10) => {
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paginatedItems = items.slice(start, end)

  return {
    items: paginatedItems,
    pagination: {
      current: page,
      pageSize,
      total: items.length,
      pages: Math.ceil(items.length / pageSize)
    }
  }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// 路由处理
const routes = {
  // 认证
  'POST /api/auth/login': async (req, res) => {
    const body = await parseBody(req)
    const user = mockData.users.find(u => u.username === body.username)

    if (user && (body.password === 'admin123' || body.password === 'committee123' || body.password === 'resident123')) {
      sendJson(res, createResponse({
        token: 'mock-jwt-token',
        user,
        expiresIn: 3600
      }))
    } else {
      sendJson(res, createResponse(null, 401, '用户名或密码错误'), 401)
    }
  },

  // 村民管理
  'GET /api/residents': async (req, res) => {
    await delay(300) // 模拟网络延迟
    const query = parse(req.url, true).query
    const page = parseInt(query.page) || 1
    const pageSize = parseInt(query.pageSize) || 10
    const search = query.search || ''

    let filteredResidents = mockData.residents
    if (search) {
      filteredResidents = mockData.residents.filter(r =>
        r.name.includes(search) || r.idCard.includes(search) || r.phone.includes(search)
      )
    }

    sendJson(res, createResponse(createPagination(filteredResidents, page, pageSize)))
  },

  'POST /api/residents': async (req, res) => {
    await delay(500)
    const body = await parseBody(req)
    const newResident = {
      id: `resident-${String(mockData.residents.length + 1).padStart(3, '0')}`,
      ...body,
      createdAt: new Date().toISOString()
    }
    mockData.residents.push(newResident)
    sendJson(res, createResponse(newResident, 201, '创建成功'))
  },

  'GET /api/residents/:id': async (req, res) => {
    const id = req.url.split('/').pop()
    const resident = mockData.residents.find(r => r.id === id)

    if (resident) {
      sendJson(res, createResponse(resident))
    } else {
      sendJson(res, createResponse(null, 404, '村民不存在'), 404)
    }
  },

  'PUT /api/residents/:id': async (req, res) => {
    await delay(400)
    const id = req.url.split('/').pop()
    const index = mockData.residents.findIndex(r => r.id === id)

    if (index !== -1) {
      const body = await parseBody(req)
      mockData.residents[index] = {
        ...mockData.residents[index],
        ...body,
        updatedAt: new Date().toISOString()
      }
      sendJson(res, createResponse(mockData.residents[index]))
    } else {
      sendJson(res, createResponse(null, 404, '村民不存在'), 404)
    }
  },

  'DELETE /api/residents/:id': async (req, res) => {
    await delay(300)
    const id = req.url.split('/').pop()
    const index = mockData.residents.findIndex(r => r.id === id)

    if (index !== -1) {
      mockData.residents.splice(index, 1)
      sendJson(res, createResponse(null, 200, '删除成功'))
    } else {
      sendJson(res, createResponse(null, 404, '村民不存在'), 404)
    }
  },

  // 反馈管理
  'GET /api/feedback': async (req, res) => {
    await delay(200)
    const query = parse(req.url, true).query
    const page = parseInt(query.page) || 1
    const pageSize = parseInt(query.pageSize) || 10
    const status = query.status
    const type = query.type

    let filteredFeedbacks = mockData.feedbacks
    if (status && status !== 'all') {
      filteredFeedbacks = filteredFeedbacks.filter(f => f.status === status)
    }
    if (type && type !== 'all') {
      filteredFeedbacks = filteredFeedbacks.filter(f => f.type === type)
    }

    sendJson(res, createResponse(createPagination(filteredFeedbacks, page, pageSize)))
  },

  'POST /api/feedback': async (req, res) => {
    await delay(600)
    const body = await parseBody(req)
    const newFeedback = {
      id: `feedback-${String(mockData.feedbacks.length + 1).padStart(3, '0')}`,
      ...body,
      status: 'pending',
      createTime: new Date().toISOString()
    }
    mockData.feedbacks.unshift(newFeedback)
    sendJson(res, createResponse(newFeedback, 201, '提交成功'))
  },

  'GET /api/feedback/:id': async (req, res) => {
    const id = req.url.split('/').pop()
    const feedback = mockData.feedbacks.find(f => f.id === id)

    if (feedback) {
      sendJson(res, createResponse(feedback))
    } else {
      sendJson(res, createResponse(null, 404, '反馈不存在'), 404)
    }
  },

  // 统计数据
  'GET /api/statistics/dashboard': async (req, res) => {
    await delay(150)
    sendJson(res, createResponse({
      totalResidents: mockData.residents.length,
      totalFeedbacks: mockData.feedbacks.length,
      pendingFeedbacks: mockData.feedbacks.filter(f => f.status === 'pending').length,
      resolvedFeedbacks: mockData.feedbacks.filter(f => f.status === 'resolved').length,
      monthlyStats: {
        newResidents: randomInt(5, 15),
        newFeedbacks: randomInt(10, 30),
        resolvedRate: randomInt(70, 95)
      }
    }))
  },

  // 文件上传
  'POST /api/upload': async (req, res) => {
    await delay(800) // 模拟文件上传时间
    sendJson(res, createResponse({
      url: `https://example.com/uploaded/file-${Date.now()}.jpg`,
      filename: `file-${Date.now()}.jpg`,
      size: randomInt(50000, 500000)
    }))
  },

  // WebSocket 模拟
  'WS /socket.io/': (ws, req) => {
    console.log('WebSocket connection established')

    // 定时发送通知
    const notificationInterval = setInterval(() => {
      const notifications = [
        { type: 'new_feedback', message: '有新的用户反馈' },
        { type: 'system_update', message: '系统更新通知' },
        { type: 'announcement', message: '新的村务公告' }
      ]
      const notification = notifications[randomInt(0, notifications.length)]
      ws.send(JSON.stringify({
        event: 'notification',
        data: notification
      }))
    }, 30000) // 每30秒发送一次

    ws.on('close', () => {
      clearInterval(notificationInterval)
      console.log('WebSocket connection closed')
    })

    ws.on('message', (message) => {
      console.log('Received message:', message.toString())
    })
  }
}

// 辅助函数
function parseBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        resolve({})
      }
    })
  })
}

function sendJson(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  })
  res.end(JSON.stringify(data))
}

function corsHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return true
  }
  return false
}

// 创建服务器
const server = createServer(async (req, res) => {
  // CORS 处理
  if (corsHandler(req, res)) {
    return
  }

  const parsedUrl = parse(req.url, true)
  const routeKey = `${req.method} ${parsedUrl.pathname}`

  console.log(`${new Date().toISOString()} - ${req.method} ${parsedUrl.pathname}`)

  // 查找匹配的路由
  const route = routes[routeKey]

  if (route) {
    try {
      await route(req, res)
    } catch (error) {
      console.error('Route handler error:', error)
      sendJson(res, createResponse(null, 500, '服务器内部错误'), 500)
    }
  } else {
    // 处理带参数的路由
    const paramRoute = Object.keys(routes).find(key => {
      const [method, path] = key.split(' ')
      if (method !== req.method) return false

      const pathParts = path.split('/')
      const urlParts = parsedUrl.pathname.split('/')

      if (pathParts.length !== urlParts.length) return false
      if (pathParts[0] !== urlParts[0]) return false // 都应该是 ''
      if (pathParts[1] !== urlParts[1]) return false // 都应该是 'api'

      return pathParts.every((part, i) =>
        part.startsWith(':') || part === urlParts[i]
      )
    })

    if (paramRoute) {
      try {
        await routes[paramRoute](req, res)
      } catch (error) {
        console.error('Parameter route handler error:', error)
        sendJson(res, createResponse(null, 500, '服务器内部错误'), 500)
      }
    } else {
      // 404 - 未找到路由
      sendJson(res, createResponse(null, 404, '接口不存在'), 404)
    }
  }
})

// 启动服务器
const PORT = process.env.MOCK_SERVER_PORT || 3001
server.listen(PORT, () => {
  console.log(`🚀 Mock server running on http://localhost:${PORT}`)
  console.log('\n📋 Available routes:')
  Object.keys(routes).forEach(route => {
    console.log(`  ${route}`)
  })
  console.log('\n🔑 Test credentials:')
  console.log('  Admin: testadmin / admin123')
  console.log('  Committee: testcommittee / committee123')
  console.log('  Resident: testresident / resident123')
})

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down mock server...')
  server.close(() => {
    console.log('✅ Mock server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down mock server...')
  server.close(() => {
    console.log('✅ Mock server closed')
    process.exit(0)
  })
})