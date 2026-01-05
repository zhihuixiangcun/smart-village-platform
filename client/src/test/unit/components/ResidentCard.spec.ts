import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ResidentCard from '@/components/household/HouseholdCard.vue';
import { TestHelper } from '@/test/utils/test-helpers';
import { ElMessage } from 'element-plus';

// 模拟 Element Plus
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus');
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn()
    }
  };
});

describe('ResidentCard.vue', () => {
  const mockResident = TestHelper.createMockResident({
    id: 'resident-001',
    name: '张三',
    idCard: '330106199001011234',
    phone: '13800138000',
    address: '浙江省杭州市余杭区瓶窑镇凤都村1号',
    familyType: '普通户',
    familyMembers: 4,
    avatar: 'https://example.com/avatar.jpg'
  });

  const defaultProps = {
    resident: mockResident,
    showActions: true,
    editable: true,
    deletable: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('组件渲染', () => {
    it('应该正确渲染村民基本信息', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      // 检查村民姓名
      TestHelper.expectElementText(wrapper, '[data-testid="resident-name"]', mockResident.name);

      // 检查身份证号（应该脱敏显示）
      TestHelper.expectElementText(wrapper, '[data-testid="resident-idcard"]', '330106********1234');

      // 检查手机号（应该脱敏显示）
      TestHelper.expectElementText(wrapper, '[data-testid="resident-phone"]', '138****8000');

      // 检查地址
      TestHelper.expectElementText(wrapper, '[data-testid="resident-address"]', mockResident.address);

      // 检查家庭类型
      TestHelper.expectElementText(wrapper, '[data-testid="family-type"]', mockResident.familyType);

      // 检查家庭成员数
      TestHelper.expectElementText(wrapper, '[data-testid="family-members"]', `${mockResident.familyMembers}人`);
    });

    it('应该显示头像', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      const avatar = wrapper.find('[data-testid="resident-avatar"]');
      expect(avatar.exists()).toBe(true);
      expect(avatar.attributes('src')).toBe(mockResident.avatar);
    });

    it('应该显示操作按钮', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      // 检查编辑按钮
      const editButton = wrapper.find('[data-testid="edit-button"]');
      expect(editButton.exists()).toBe(true);

      // 检查删除按钮
      const deleteButton = wrapper.find('[data-testid="delete-button"]');
      expect(deleteButton.exists()).toBe(true);

      // 检查详情按钮
      const detailButton = wrapper.find('[data-testid="detail-button"]');
      expect(detailButton.exists()).toBe(true);
    });

    it('根据权限隐藏操作按钮', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: {
          ...defaultProps,
          editable: false,
          deletable: false
        }
      });

      // 编辑和删除按钮应该被隐藏
      TestHelper.expectElementHidden(wrapper, '[data-testid="edit-button"]');
      TestHelper.expectElementHidden(wrapper, '[data-testid="delete-button"]');

      // 详情按钮应该仍然可见
      TestHelper.expectElementVisible(wrapper, '[data-testid="detail-button"]');
    });

    it('应该显示家庭状态标签', async () => {
      const specialResident = TestHelper.createMockResident({
        familyType: '低保户'
      });

      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: {
          ...defaultProps,
          resident: specialResident
        }
      });

      const specialTag = wrapper.find('[data-testid="special-tag"]');
      expect(specialTag.exists()).toBe(true);
      expect(specialTag.text()).toBe('低保户');
    });
  });

  describe('交互行为', () => {
    it('点击编辑按钮应该触发编辑事件', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      await TestHelper.click(wrapper, '[data-testid="edit-button"]');

      await TestHelper.expectEventEmitted(wrapper, 'edit', mockResident.id);
    });

    it('点击删除按钮应该触发删除事件', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      // 模拟确认删除
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      await TestHelper.click(wrapper, '[data-testid="delete-button"]');

      await TestHelper.expectEventEmitted(wrapper, 'delete', mockResident.id);
      expect(window.confirm).toHaveBeenCalledWith('确定要删除该村民信息吗？');
    });

    it('取消删除时不应该触发删除事件', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      // 模拟取消删除
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      await TestHelper.click(wrapper, '[data-testid="delete-button"]');

      expect(wrapper.emitted('delete')).toBeUndefined();
    });

    it('点击详情按钮应该触发详情事件', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      await TestHelper.click(wrapper, '[data-testid="detail-button"]');

      await TestHelper.expectEventEmitted(wrapper, 'detail', mockResident.id);
    });

    it('点击头像应该查看大图', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      await TestHelper.click(wrapper, '[data-testid="resident-avatar"]');

      TestHelper.expectElementVisible(wrapper, '[data-testid="image-preview"]');
    });

    it('点击手机号应该复制', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      // 模拟复制到剪贴板
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText
        }
      });

      await TestHelper.click(wrapper, '[data-testid="resident-phone"]');

      expect(mockWriteText).toHaveBeenCalledWith(mockResident.phone);
      expect(ElMessage.success).toHaveBeenCalledWith('手机号已复制');
    });

    it('复制失败时显示错误提示', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      // 模拟复制失败
      const mockWriteText = vi.fn().mockRejectedValue(new Error('复制失败'));
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText
        }
      });

      await TestHelper.click(wrapper, '[data-testid="resident-phone"]');

      expect(ElMessage.error).toHaveBeenCalledWith('复制失败，请手动复制');
    });
  });

  describe('响应式布局', () => {
    it('在小屏幕上应该使用紧凑布局', async () => {
      // 模拟移动端视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      // 应该有紧凑布局的类
      expect(wrapper.find('.resident-card--compact').exists()).toBe(true);

      // 地址信息应该被截断
      const addressElement = wrapper.find('[data-testid="resident-address"]');
      expect(addressElement.classes()).toContain('text-ellipsis');
    });

    it('在大屏幕上应该使用完整布局', async () => {
      // 模拟桌面端视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920
      });

      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      // 不应该有紧凑布局的类
      expect(wrapper.find('.resident-card--compact').exists()).toBe(false);
    });
  });

  describe('数据脱敏', () => {
    it('应该正确脱敏身份证号', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      const idCardElement = wrapper.find('[data-testid="resident-idcard"]');
      expect(idCardElement.text()).toBe('330106********1234');
    });

    it('应该正确脱敏手机号', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      const phoneElement = wrapper.find('[data-testid="resident-phone"]');
      expect(phoneElement.text()).toBe('138****8000');
    });

    it('管理员用户应该查看完整信息', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: {
          ...defaultProps,
          showFullInfo: true
        }
      });

      // 管理员应该看到完整身份证号
      const idCardElement = wrapper.find('[data-testid="resident-idcard"]');
      expect(idCardElement.text()).toBe(mockResident.idCard);

      // 管理员应该看到完整手机号
      const phoneElement = wrapper.find('[data-testid="resident-phone"]');
      expect(phoneElement.text()).toBe(mockResident.phone);
    });
  });

  describe('错误处理', () => {
    it('头像加载失败时显示默认头像', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: {
          ...defaultProps,
          resident: {
            ...mockResident,
            avatar: ''
          }
        }
      });

      const avatar = wrapper.find('[data-testid="resident-avatar"]');
      expect(avatar.attributes('src')).toContain('default-avatar');
    });

    it('数据为空时显示占位内容', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: {
          resident: null
        }
      });

      TestHelper.expectElementVisible(wrapper, '[data-testid="empty-state"]');
    });
  });

  describe('无障碍访问', () => {
    it('应该有正确的 ARIA 标签', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      const card = wrapper.find('[data-testid="resident-card"]');
      expect(card.attributes('role')).toBe('article');
      expect(card.attributes('aria-label')).toContain(`村民${mockResident.name}的信息卡片`);
    });

    it('操作按钮应该有正确的 ARIA 描述', async () => {
      const wrapper = await TestHelper.mountWithPlugins(ResidentCard, {
        props: defaultProps
      });

      const editButton = wrapper.find('[data-testid="edit-button"]');
      expect(editButton.attributes('aria-label')).toBe('编辑村民信息');

      const deleteButton = wrapper.find('[data-testid="delete-button"]');
      expect(deleteButton.attributes('aria-label')).toBe('删除村民信息');

      const detailButton = wrapper.find('[data-testid="detail-button"]');
      expect(detailButton.attributes('aria-label')).toBe('查看村民详情');
    });
  });
});