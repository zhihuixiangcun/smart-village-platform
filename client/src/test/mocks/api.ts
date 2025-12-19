import { rest } from 'msw'
import { setupServer } from 'msw/node'

// API 基础 URL
const API_BASE_URL = 'http://localhost:3000/api'

// Mock 数据生成器
const createMockPagination = (data: any[], page = 1, pageSize = 10) => ({
  data,
  pagination: {
    current: page,
    pageSize,
    total: data.length,
    pages: Math.ceil(data.length / pageSize)
  }
})

// Mock 用户数据
const mockUsers = [
  {
    id: 'user-1',
    username: 'admin',
    name: '管理员',
    role: 'admin',
    villageId: 'village-1',
    permissions: ['read', 'write', 'delete'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user-2',
    username: 'committee',
    name: '村委张三',
    role: 'committee',
    villageId: 'village-1',
    permissions: ['read', 'write'],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  }
]

// Mock 村民数据
const mockResidents = Array.from({ length: 50 }, (_, i) => ({
  id: `resident-${i + 1}`,
  name: `村民${i + 1}`,
  idCard: `3301061990${String(i).padStart(2, '0')}01001${String(i).padStart(4, '0')}`,
  phone: `1380013${String(i).padStart(4, '0')}`,
  address: `测试村${i + 1}号`,
  familyType: i % 3 === 0 ? '低保户' : i % 2 === 0 ? '独生户' : '普通户',
  familyMembers: Math.floor(Math.random() * 5) + 1,
  villageId: 'village-1',
  createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString()
}))

// Mock 村委数据
const mockCommittee = [
  {
    id: 'committee-1',
    name: '张三',
    position: '村支书',
    phone: '13900139001',
    email: 'zhangsan@village.com',
    avatar: 'https://example.com/avatar1.jpg',
    department: '村委会',
    duties: '负责村务全面工作',
    startDate: '2020-01-01',
    isActive: true,
    villageId: 'village-1'
  },
  {
    id: 'committee-2',
    name: '李四',
    position: '村长',
    phone: '13900139002',
    email: 'lisi@village.com',
    avatar: 'https://example.com/avatar2.jpg',
    department: '村委会',
    duties: '协助村支书处理村务',
    startDate: '2021-01-01',
    isActive: true,
    villageId: 'village-1'
  }
]

// Mock 财务数据
const mockFinanceRecords = Array.from({ length: 100 }, (_, i) => ({
  id: `finance-${i + 1}`,
  type: i % 2 === 0 ? 'income' : 'expense',
  amount: Math.floor(Math.random() * 100000) + 1000,
  category: i % 3 === 0 ? '补贴' : i % 2 === 0 ? '办公费用' : '项目支出',
  description: `财务记录${i + 1}`,
  date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  approver: '张书记',
  status: 'approved',
  attachments: [],
  villageId: 'village-1'
}))

// Mock 公告数据
const mockAnnouncements = Array.from({ length: 30 }, (_, i) => ({
  id: `announcement-${i + 1}`,
  title: `公告标题${i + 1}`,
  content: `这是第${i + 1}条公告的内容`,
  type: i % 3 === 0 ? '政策宣传' : i % 2 === 0 ? '会议通知' : '村务公开',
  priority: i % 4 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
  publishDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  publisher: mockCommittee[i % mockCommittee.length].name,
  status: 'published',
  viewCount: Math.floor(Math.random() * 1000),
  attachments: [],
  villageId: 'village-1'
}))

// Mock 用户反馈数据
const mockFeedbacks = Array.from({ length: 50 }, (_, i) => ({
  id: `feedback-${i + 1}`,
  userId: `user-${(i % 3) + 1}`,
  userName: `用户${(i % 3) + 1}`,
  type: i % 3 === 0 ? 'suggestion' : i % 2 === 0 ? 'complaint' : 'praise',
  title: `反馈标题${i + 1}`,
  content: `这是第${i + 1}条反馈的内容`,
  status: i % 4 === 0 ? 'pending' : i % 2 === 0 ? 'processing' : 'resolved',
  createTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  replyTime: i % 2 === 0 ? new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString() : null,
  replyContent: i % 2 === 0 ? `回复内容${i + 1}` : null,
  replyUser: i % 2 === 0 ? '张书记' : null,
  villageId: 'village-1'
}))

// MSW 服务器配置
export const apiHandlers = [
  // 认证相关
  rest.post(`${API_BASE_URL}/auth/login`, (req, res, ctx) => {
    const { username, password } = req.body as any
    if (username === 'admin' && password === 'admin123') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: {
            token: 'mock-jwt-token',
            user: mockUsers[0],
            expiresIn: 3600
          }
        })
      )
    }
    return res(
      ctx.status(401),
      ctx.json({ success: false, message: '用户名或密码错误' })
    )
  }),

  rest.post(`${API_BASE_URL}/auth/logout`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ success: true, message: '退出成功' })
    )
  }),

  rest.get(`${API_BASE_URL}/auth/current`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockUsers[0]
      })
    )
  }),

  // 村民管理
  rest.get(`${API_BASE_URL}/residents`, (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1')
    const pageSize = parseInt(req.url.searchParams.get('pageSize') || '10')
    const search = req.url.searchParams.get('search') || ''

    let filteredResidents = mockResidents
    if (search) {
      filteredResidents = mockResidents.filter(r =>
        r.name.includes(search) || r.idCard.includes(search) || r.phone.includes(search)
      )
    }

    const start = (page - 1) * pageSize
    const end = start + pageSize
    const pageData = filteredResidents.slice(start, end)

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: createMockPagination(pageData, page, pageSize)
      })
    )
  }),

  rest.get(`${API_BASE_URL}/residents/:id`, (req, res, ctx) => {
    const { id } = req.params
    const resident = mockResidents.find(r => r.id === id)

    if (!resident) {
      return res(
        ctx.status(404),
        ctx.json({ success: false, message: '村民不存在' })
      )
    }

    return res(
      ctx.status(200),
      ctx.json({ success: true, data: resident })
    )
  }),

  rest.post(`${API_BASE_URL}/residents`, (req, res, ctx) => {
    const newResident = {
      id: `resident-${mockResidents.length + 1}`,
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    mockResidents.push(newResident)

    return res(
      ctx.status(201),
      ctx.json({ success: true, data: newResident })
    )
  }),

  rest.put(`${API_BASE_URL}/residents/:id`, (req, res, ctx) => {
    const { id } = req.params
    const index = mockResidents.findIndex(r => r.id === id)

    if (index === -1) {
      return res(
        ctx.status(404),
        ctx.json({ success: false, message: '村民不存在' })
      )
    }

    mockResidents[index] = {
      ...mockResidents[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    }

    return res(
      ctx.status(200),
      ctx.json({ success: true, data: mockResidents[index] })
    )
  }),

  rest.delete(`${API_BASE_URL}/residents/:id`, (req, res, ctx) => {
    const { id } = req.params
    const index = mockResidents.findIndex(r => r.id === id)

    if (index === -1) {
      return res(
        ctx.status(404),
        ctx.json({ success: false, message: '村民不存在' })
      )
    }

    mockResidents.splice(index, 1)

    return res(
      ctx.status(200),
      ctx.json({ success: true, message: '删除成功' })
    )
  }),

  // 村委管理
  rest.get(`${API_BASE_URL}/committee`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: createMockPagination(mockCommittee, 1, 10)
      })
    )
  }),

  rest.get(`${API_BASE_URL}/committee/:id`, (req, res, ctx) => {
    const { id } = req.params
    const committee = mockCommittee.find(c => c.id === id)

    if (!committee) {
      return res(
        ctx.status(404),
        ctx.json({ success: false, message: '村委不存在' })
      )
    }

    return res(
      ctx.status(200),
      ctx.json({ success: true, data: committee })
    )
  }),

  // 财务管理
  rest.get(`${API_BASE_URL}/finance`, (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1')
    const pageSize = parseInt(req.url.searchParams.get('pageSize') || '10')
    const type = req.url.searchParams.get('type')

    let filteredRecords = mockFinanceRecords
    if (type && type !== 'all') {
      filteredRecords = mockFinanceRecords.filter(r => r.type === type)
    }

    const start = (page - 1) * pageSize
    const end = start + pageSize
    const pageData = filteredRecords.slice(start, end)

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: createMockPagination(pageData, page, pageSize)
      })
    )
  }),

  // 用户反馈
  rest.get(`${API_BASE_URL}/feedback`, (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1')
    const pageSize = parseInt(req.url.searchParams.get('pageSize') || '10')
    const status = req.url.searchParams.get('status')

    let filteredFeedbacks = mockFeedbacks
    if (status && status !== 'all') {
      filteredFeedbacks = mockFeedbacks.filter(f => f.status === status)
    }

    const start = (page - 1) * pageSize
    const end = start + pageSize
    const pageData = filteredFeedbacks.slice(start, end)

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: createMockPagination(pageData, page, pageSize)
      })
    )
  }),

  rest.post(`${API_BASE_URL}/feedback`, (req, res, ctx) => {
    const newFeedback = {
      id: `feedback-${mockFeedbacks.length + 1}`,
      ...req.body,
      status: 'pending',
      createTime: new Date().toISOString(),
      villageId: 'village-1'
    }
    mockFeedbacks.unshift(newFeedback)

    return res(
      ctx.status(201),
      ctx.json({ success: true, data: newFeedback })
    )
  }),

  // 公告管理
  rest.get(`${API_BASE_URL}/announcements`, (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1')
    const pageSize = parseInt(req.url.searchParams.get('pageSize') || '10')
    const type = req.url.searchParams.get('type')

    let filteredAnnouncements = mockAnnouncements
    if (type && type !== 'all') {
      filteredAnnouncements = mockAnnouncements.filter(a => a.type === type)
    }

    const start = (page - 1) * pageSize
    const end = start + pageSize
    const pageData = filteredAnnouncements.slice(start, end)

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: createMockPagination(pageData, page, pageSize)
      })
    )
  }),

  // 统计数据
  rest.get(`${API_BASE_URL}/statistics/dashboard`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          totalResidents: mockResidents.length,
          totalCommittee: mockCommittee.length,
          totalAnnouncements: mockAnnouncements.length,
          totalFeedbacks: mockFeedbacks.length,
          monthlyFinance: mockFinanceRecords.filter(r => {
            const date = new Date(r.date)
            const now = new Date()
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
          }).reduce((sum, r) => sum + (r.type === 'income' ? r.amount : -r.amount), 0),
          pendingFeedbacks: mockFeedbacks.filter(f => f.status === 'pending').length
        }
      })
    )
  }),

  // 文件上传
  rest.post(`${API_BASE_URL}/upload`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          url: 'https://example.com/uploaded-file.jpg',
          filename: 'test-file.jpg',
          size: 123456
        }
      })
    )
  })
]

// 创建 MSW 服务器
export const apiServer = setupServer(...apiHandlers)