/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { useAccessibilityStore } from '../../stores/accessibility';

describe('Accessibility Store 无障碍状态管理测试', () => {
  let store;

  beforeEach(() => {
    store = useAccessibilityStore();
  });

  it('应该默认启用无障碍功能', () => {
    expect(store.largeTextMode).toBe(false);
    expect(store.highContrastMode).toBe(false);
    expect(store.reduceMotion).toBe(false);
  });

  it('应该支持切换大字模式', () => {
    expect(store.largeTextMode).toBe(false);
    store.largeTextMode = true;
    expect(store.largeTextMode).toBe(true);
  });

  it('应该支持方言设置', () => {
    expect(store.dialect).toBe('zh-CN');
    store.dialect = 'yue-CN';
    expect(store.dialect).toBe('yue-CN');
  });

  it('应该支持方言列表', () => {
    expect(store.supportedDialects).toContain('zh-CN');
    expect(store.supportedDialects).toContain('yue-CN');
    expect(store.supportedDialects).toContain('wuu-CN');
    expect(store.supportedDialects).toContain('hak-CN');
    expect(store.supportedDialects).toContain('nan-CN');
  });

  it('应该支持语音设置', () => {
    expect(store.voiceEnabled).toBe(true);
    expect(store.voiceVolume).toBe(1);
    expect(store.voiceRate).toBe(1);
  });

  it('应该支持减少动画', () => {
    expect(store.reduceMotion).toBe(false);
    store.reduceMotion = true;
    expect(store.reduceMotion).toBe(true);
  });

  it('应该支持屏幕阅读器', () => {
    expect(store.screenReaderEnabled).toBe(false);
    store.screenReaderEnabled = true;
    expect(store.screenReaderEnabled).toBe(true);
  });

  it('elderlyMode 计算属性应该正确工作', () => {
    expect(store.elderlyMode).toBe(false);

    store.largeTextMode = true;
    expect(store.elderlyMode).toBe(true);

    store.largeTextMode = false;
    store.highContrastMode = true;
    expect(store.elderlyMode).toBe(true);
  });

  it('fontSize 计算属性应该返回正确的字体大小', () => {
    expect(store.fontSize).toBe('16px');

    store.largeTextMode = true;
    expect(store.fontSize).toBe('18px');
  });
});

describe('Accessibility Store 持久化测试', () => {
  it('应该从本地存储恢复设置', () => {
    localStorage.setItem(
      'accessibility_settings',
      JSON.stringify({
        largeTextMode: true,
        highContrastMode: true,
        dialect: 'yue-CN',
      })
    );

    const store = useAccessibilityStore();
    expect(store.largeTextMode).toBe(true);
    expect(store.highContrastMode).toBe(true);
    expect(store.dialect).toBe('yue-CN');

    localStorage.removeItem('accessibility_settings');
  });

  it('应该保存设置到本地存储', () => {
    const store = useAccessibilityStore();
    store.largeTextMode = true;
    store.dialect = 'wuu-CN';

    const saved = localStorage.getItem('accessibility_settings');
    expect(saved).toBeTruthy();

    const parsed = JSON.parse(saved);
    expect(parsed.largeTextMode).toBe(true);
    expect(parsed.dialect).toBe('wuu-CN');
  });
});
