import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useElderlyStore } from '@/store/elderly'

describe('Elderly Store', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  describe('适老化模式', () => {
    it('默认模式应为标准模式', () => {
      const store = useElderlyStore()
      expect(store.mode).toBe('standard')
    })

    it('应该支持切换到大字模式', () => {
      const store = useElderlyStore()
      store.setMode('large')
      expect(store.mode).toBe('large')
    })

    it('应该支持切换到超大字模式', () => {
      const store = useElderlyStore()
      store.setMode('xl')
      expect(store.mode).toBe('xl')
    })

    it('应该返回正确的字体配置', () => {
      const store = useElderlyStore()

      store.setMode('standard')
      expect(store.fontSizeConfig.base).toBe(16)

      store.setMode('large')
      expect(store.fontSizeConfig.base).toBe(18)

      store.setMode('xl')
      expect(store.fontSizeConfig.base).toBe(24)
    })

    it('大字模式和超大字模式应为适老化模式', () => {
      const store = useElderlyStore()

      store.setMode('standard')
      expect(store.isElderlyMode).toBe(false)

      store.setMode('large')
      expect(store.isElderlyMode).toBe(true)

      store.setMode('xl')
      expect(store.isElderlyMode).toBe(true)
    })
  })

  describe('语音功能', () => {
    it('默认应关闭语音功能', () => {
      const store = useElderlyStore()
      expect(store.voiceEnabled).toBe(false)
    })

    it('应该支持开启语音功能', () => {
      const store = useElderlyStore()
      store.setVoiceEnabled(true)
      expect(store.voiceEnabled).toBe(true)
    })

    it('应该支持设置语音语言', () => {
      const store = useElderlyStore()
      store.setVoiceLanguage('en-US')
      expect(store.voiceLanguage).toBe('en-US')
    })

    it('应该支持设置语音速率', () => {
      const store = useElderlyStore()
      store.setVoiceRate(1.5)
      expect(store.voiceRate).toBe(1.5)
    })

    it('语音速率应在0.5-2.0范围内', () => {
      const store = useElderlyStore()

      store.setVoiceRate(0.3)
      expect(store.voiceRate).toBe(0.5)

      store.setVoiceRate(2.5)
      expect(store.voiceRate).toBe(2.0)
    })
  })

  describe('高对比度模式', () => {
    it('默认应关闭高对比度', () => {
      const store = useElderlyStore()
      expect(store.highContrast).toBe(false)
    })

    it('应该支持开启高对比度', () => {
      const store = useElderlyStore()
      store.setHighContrast(true)
      expect(store.highContrast).toBe(true)
    })
  })

  describe('触觉反馈', () => {
    it('默认应开启触觉反馈', () => {
      const store = useElderlyStore()
      expect(store.hapticFeedback).toBe(true)
    })

    it('应该支持关闭触觉反馈', () => {
      const store = useElderlyStore()
      store.setHapticFeedback(false)
      expect(store.hapticFeedback).toBe(false)
    })

    it('震动函数应调用navigator.vibrate', () => {
      const store = useElderlyStore()
      store.setHapticFeedback(true)

      const vibrate = vi.fn()
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrate,
        writable: true
      })

      store.vibrate('short')
      expect(vibrate).toHaveBeenCalledWith(15)
    })
  })

  describe('设置保存与加载', () => {
    it('保存设置时应调用localStorage.setItem', () => {
      const store = useElderlyStore()
      const setItemSpy = vi.spyOn(localStorage, 'setItem')

      store.setMode('large')

      expect(setItemSpy).toHaveBeenCalledWith('elderly_settings', expect.stringContaining('large'))
    })

    it('加载设置时应调用localStorage.getItem', async () => {
      const mockSettings = {
        mode: 'large',
        voiceEnabled: true,
        voiceLanguage: 'zh-CN',
        voiceRate: 1.0,
        voicePitch: 1.0,
        highContrast: false,
        hapticFeedback: true
      }

      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockReturnValue(JSON.stringify(mockSettings))

      const store = useElderlyStore()
      await store.loadSettings()

      expect(getItemSpy).toHaveBeenCalledWith('elderly_settings')
      expect(store.mode).toBe('large')
      expect(store.voiceEnabled).toBe(true)
    })
  })

  describe('设置重置', () => {
    it('重置后应恢复默认值', () => {
      const store = useElderlyStore()

      // 修改设置
      store.setMode('xl')
      store.setVoiceEnabled(true)
      store.setHighContrast(true)

      // 重置
      store.resetSettings()

      expect(store.mode).toBe('standard')
      expect(store.voiceEnabled).toBe(false)
      expect(store.highContrast).toBe(false)
      expect(store.hapticFeedback).toBe(true)
    })
  })
})
