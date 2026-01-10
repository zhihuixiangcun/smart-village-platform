/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import VoiceAssistant from '../../components/VoiceAssistant.vue';
import { useAccessibilityStore } from '../../stores/accessibility';

describe('VoiceAssistant 组件测试', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(VoiceAssistant, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: ['router-link', 'router-view'],
      },
    });
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('应该正常渲染语音助手按钮', () => {
    expect(wrapper.find('.voice-assistant').exists()).toBe(true);
    expect(wrapper.find('.voice-button').exists()).toBe(true);
  });

  it('按钮应该有正确的无障碍标签', () => {
    const button = wrapper.find('.voice-button');
    expect(button.attributes('aria-label')).toBeTruthy();
  });

  it('应该显示帮助按钮', () => {
    expect(wrapper.find('.help-button').exists()).toBe(true);
  });
});

describe('VoiceAssistant 计算属性测试', () => {
  it('buttonLabel 计算属性应该根据状态返回正确的标签', () => {
    const accessibilityStore = useAccessibilityStore();
    accessibilityStore.largeTextMode = false;

    const wrapper = mount(VoiceAssistant, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
      },
    });

    expect(wrapper.vm.buttonLabel).toBe('点击开始语音输入');
  });
});

describe('VoiceAssistant 命令映射测试', () => {
  it('应该有正确的命令映射配置', () => {
    const wrapper = mount(VoiceAssistant, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
      },
    });

    expect(wrapper.vm.commandMap['首页']).toBe('/');
    expect(wrapper.vm.commandMap['办事']).toBe('/services/apply');
    expect(wrapper.vm.commandMap['公告']).toBe('/announcements');
    expect(wrapper.vm.commandMap['家庭']).toBe('/family');
  });
});
