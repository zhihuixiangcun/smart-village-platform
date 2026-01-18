import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '@/store/user'

describe('User Store', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  describe('用户状态', () => {
    it('初始状态应为未登录', () => {
      const store = useUserStore()
      expect(store.isLoggedIn).toBe(false)
      expect(store.userInfo).toBe(null)
      expect(store.accessToken).toBe('')
    })

    it('登出后应清除状态', () => {
      const store = useUserStore()
      
      store.userInfo = { name: '测试用户' }
      store.accessToken = 'test-token'
      
      store.logout()
      
      expect(store.userInfo).toBe(null)
      expect(store.accessToken).toBe('')
    })
  })

  describe('用户角色', () => {
    it('默认角色应为村民', () => {
      const store = useUserStore()
      expect(store.userRole).toBe('villager')
    })

    it('村干部应被识别为管理员', () => {
      const store = useUserStore()
      store.userInfo = {
        name: '村干部',
        role: 'admin'
      }
      expect(store.isOfficial).toBe(true)
    })

    it('普通村民不应被识别为管理员', () => {
      const store = useUserStore()
      store.userInfo = {
        name: '村民',
        role: 'villager'
      }
      expect(store.isOfficial).toBe(false)
    })
  })

  describe('用户信息更新', () => {
    it('应支持更新用户信息', async () => {
      const store = useUserStore()
      store.userInfo = {
        id: '1',
        name: '原名称'
      }
      
      await store.updateUserInfo({ name: '新名称' })
      
      expect(store.userInfo.name).toBe('新名称')
    })
  })
})
