import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '@/store/user'

// Mock uni API
global.uni = {
  getStorage: vi.fn(),
  setStorage: vi.fn(),
  removeStorage: vi.fn()
}

describe('User Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('用户状态', () => {
    it('初始状态应为未登录', () => {
      const store = useUserStore()
      expect(store.isLoggedIn.value).toBe(false)
      expect(store.userInfo.value).toBe(null)
      expect(store.accessToken.value).toBe('')
    })

    it('登录后应更新状态', async () => {
      const store = useUserStore()
      const mockResult = {
        success: true,
        data: {
          accessToken: 'test-token',
          refreshToken: 'refresh-token',
          user: {
            id: '1',
            name: '测试用户',
            phone: '13800138000'
          }
        }
      }

      // Mock API call
      vi.mocked('@/api').auth.login = vi.fn().mockResolvedValue(mockResult)

      const result = await store.login({
        phone: '13800138000',
        code: '123456'
      })

      expect(result.success).toBe(true)
      expect(store.isLoggedIn.value).toBe(true)
      expect(store.userInfo.value).not.toBe(null)
      expect(store.accessToken.value).toBe('test-token')
    })

    it('登出后应清除状态', () => {
      const store = useUserStore()

      // 模拟登录状态
      store.userInfo.value = { name: '测试用户' }
      store.accessToken.value = 'test-token'

      // Mock navigateBack
      const navigateBack = vi.fn()
      global.uni.navigateBack = navigateBack

      store.logout()

      expect(store.userInfo.value).toBe(null)
      expect(store.accessToken.value).toBe('')
      expect(navigateBack).toHaveBeenCalled()
    })
  })

  describe('用户角色', () => {
    it('默认角色应为村民', () => {
      const store = useUserStore()
      expect(store.userRole.value).toBe('villager')
    })

    it('村干部应被识别为管理员', () => {
      const store = useUserStore()
      store.userInfo.value = {
        name: '村干部',
        role: 'admin'
      }
      expect(store.isOfficial.value).toBe(true)
    })

    it('普通村民不应被识别为管理员', () => {
      const store = useUserStore()
      store.userInfo.value = {
        name: '村民',
        role: 'villager'
      }
      expect(store.isOfficial.value).toBe(false)
    })
  })

  describe('Token管理', () => {
    it('Token刷新成功后应更新状态', async () => {
      const store = useUserStore()
      store.refreshToken.value = 'old-refresh-token'

      const mockResult = {
        success: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        }
      }

      vi.fn().mockResolvedValue(mockResult)

      const result = await store.refreshAccessToken()

      expect(result).toBe(true)
      expect(store.accessToken.value).toBe('new-access-token')
      expect(store.refreshToken.value).toBe('new-refresh-token')
    })

    it('Token刷新失败时应登出', async () => {
      const store = useUserStore()
      store.accessToken.value = 'expired-token'
      store.refreshToken.value = 'valid-refresh-token'

      const logoutSpy = vi.spyOn(store, 'logout')

      vi.fn().mockResolvedValue({ success: false })

      const result = await store.refreshAccessToken()

      expect(result).toBe(false)
      expect(logoutSpy).toHaveBeenCalled()
    })
  })

  describe('用户信息更新', () => {
    it('应支持更新用户信息', async () => {
      const store = useUserStore()
      store.userInfo.value = {
        id: '1',
        name: '原名称'
      }

      const mockResult = {
        success: true,
        data: {
          name: '新名称'
        }
      }

      vi.fn().mockResolvedValue(mockResult)

      const result = await store.updateUserInfo({ name: '新名称' })

      expect(result.success).toBe(true)
      expect(store.userInfo.value.name).toBe('新名称')
    })
  })

  describe('本地存储', () => {
    it('登录成功后应保存到本地存储', async () => {
      const setStorage = vi.fn()
      global.uni.setStorage = setStorage

      const store = useUserStore()

      // Mock login
      const mockResult = {
        success: true,
        data: {
          accessToken: 'test-token',
          refreshToken: 'refresh-token',
          user: { name: '测试用户' }
        }
      }

      vi.fn().mockResolvedValue(mockResult)

      await store.login({
        phone: '13800138000',
        code: '123456'
      })

      // 验证保存操作
      expect(setStorage).toHaveBeenCalledWith({
        key: 'access_token',
        data: 'test-token',
        success: expect.any(Function)
      })
    })

    it('checkAuth应从本地存储加载用户信息', async () => {
      const mockUser = {
        name: '测试用户',
        phone: '13800138000'
      }

      const getStorage = vi.fn((options) => {
        options.success(mockUser)
      })
      global.uni.getStorage = getStorage

      const store = useUserStore()
      await store.checkAuth()

      expect(store.userInfo.value).toEqual(mockUser)
    })
  })
})
