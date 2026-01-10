import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import { apiServer } from '../mocks/api';
import { TestHelper } from '../utils/test-helpers';
import UserFeedbackSubmit from '@/views/SuggestionSubmit.vue';
import UserFeedbackList from '@/views/SuggestionTracking.vue';
import UserFeedbackDetail from '@/views/SuggestionReview.vue';

// 启动 mock 服务器
beforeAll(() => apiServer.listen());
afterAll(() => apiServer.close());
beforeEach(() => apiServer.resetHandlers());

// 创建测试路由
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/feedback/submit', component: UserFeedbackSubmit },
    { path: '/feedback/list', component: UserFeedbackList },
    { path: '/feedback/:id', component: UserFeedbackDetail },
  ],
});

// 模拟 Element Plus
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus');
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
    ElMessageBox: {
      confirm: vi.fn(() => Promise.resolve('confirm')),
      prompt: vi.fn(() => Promise.resolve({ value: 'test' })),
      alert: vi.fn(),
    },
  };
});

// 模拟用户认证
const mockAuth = {
  isAuthenticated: true,
  user: {
    id: 'user-1',
    username: 'testuser',
    name: '测试用户',
    role: 'resident',
    villageId: 'village-1',
  },
};

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuth,
}));

describe('用户反馈流程集成测试', () => {
  let pinia: any;

  beforeEach(async () => {
    pinia = createPinia();
    setActivePinia(pinia);
    await router.isReady();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('反馈提交流程', () => {
    it('应该能够成功提交建议反馈', async () => {
      const wrapper = mount(UserFeedbackSubmit, {
        global: {
          plugins: [pinia, router],
          stubs: {
            'router-link': { template: '<a><slot /></a>' },
          },
        },
      });

      // 验证页面加载
      TestHelper.expectElementVisible(wrapper, '[data-testid="feedback-form"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="feedback-type-select"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="feedback-title-input"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="feedback-content-textarea"]');

      // 填写反馈表单
      const feedbackData = {
        type: 'suggestion',
        title: '关于村口道路维修的建议',
        content:
          '村口道路破损严重，影响村民出行，建议尽快维修。同时建议加装路灯，提高夜间行车安全。',
      };

      await TestHelper.fillForm(wrapper, feedbackData);
      await TestHelper.waitForUpdate();

      // 验证表单数据已填写
      expect(wrapper.vm.formData.type).toBe(feedbackData.type);
      expect(wrapper.vm.formData.title).toBe(feedbackData.title);
      expect(wrapper.vm.formData.content).toBe(feedbackData.content);

      // 提交表单
      await TestHelper.submitForm(wrapper);
      await TestHelper.waitForUpdate();

      // 验证提交成功
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/feedback'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(JSON.stringify(feedbackData)),
        })
      );

      // 验证成功提示
      // 注意：由于 Element Plus 是 mock 的，这里需要验证实际的成功逻辑
      expect(wrapper.vm.submitSuccess).toBe(true);
    });

    it('应该验证表单必填字段', async () => {
      const wrapper = mount(UserFeedbackSubmit, {
        global: {
          plugins: [pinia, router],
        },
      });

      // 不填写任何内容直接提交
      await TestHelper.submitForm(wrapper);
      await TestHelper.waitForUpdate();

      // 验证错误提示
      TestHelper.expectValidationError(wrapper, 'type', '请选择反馈类型');
      TestHelper.expectValidationError(wrapper, 'title', '请输入反馈标题');
      TestHelper.expectValidationError(wrapper, 'content', '请输入反馈内容');

      // 验证提交按钮被禁用
      const submitButton = wrapper.find('[data-testid="submit-btn"]');
      expect(submitButton.attributes('disabled')).toBeDefined();
    });

    it('应该支持添加附件', async () => {
      const wrapper = mount(UserFeedbackSubmit, {
        global: {
          plugins: [pinia, router],
        },
      });

      // 模拟文件选择
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = wrapper.find('[data-testid="attachment-input"]');
      await fileInput.trigger('change', {
        target: { files: [file] },
      });

      await TestHelper.waitForUpdate();

      // 验证文件已添加
      expect(wrapper.vm.attachments).toHaveLength(1);
      expect(wrapper.vm.attachments[0].name).toBe('test.jpg');

      // 验证文件预览
      TestHelper.expectElementVisible(wrapper, '[data-testid="attachment-preview"]');
    });

    it('应该支持保存草稿', async () => {
      const wrapper = mount(UserFeedbackSubmit, {
        global: {
          plugins: [pinia, router],
        },
      });

      // 填写部分内容
      await TestHelper.fillForm(wrapper, {
        type: 'complaint',
        title: '未完成的反馈',
      });

      // 点击保存草稿
      await TestHelper.click(wrapper, '[data-testid="save-draft-btn"]');
      await TestHelper.waitForUpdate();

      // 验证草稿保存到 localStorage
      const draftKey = 'feedback_draft_user-1';
      const draftData = JSON.parse(localStorage.getItem(draftKey) || '{}');
      expect(draftData.type).toBe('complaint');
      expect(draftData.title).toBe('未完成的反馈');
    });

    it('应该能够加载草稿', async () => {
      // 先保存草稿
      const draftKey = 'feedback_draft_user-1';
      const draftData = {
        type: 'praise',
        title: '草稿标题',
        content: '草稿内容',
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));

      const wrapper = mount(UserFeedbackSubmit, {
        global: {
          plugins: [pinia, router],
        },
      });

      await TestHelper.waitForUpdate();

      // 验证草稿已加载
      expect(wrapper.vm.formData.type).toBe(draftData.type);
      expect(wrapper.vm.formData.title).toBe(draftData.title);
      expect(wrapper.vm.formData.content).toBe(draftData.content);

      // 验证草稿提示
      TestHelper.expectElementVisible(wrapper, '[data-testid="draft-loaded-tip"]');
    });
  });

  describe('反馈列表查看流程', () => {
    it('应该显示用户的反馈列表', async () => {
      const wrapper = mount(UserFeedbackList, {
        global: {
          plugins: [pinia, router],
        },
      });

      // 等待数据加载
      await TestHelper.waitForUpdate();

      // 验证列表显示
      TestHelper.expectElementVisible(wrapper, '[data-testid="feedback-list"]');

      // 验证统计数据
      TestHelper.expectElementVisible(wrapper, '[data-testid="total-count"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="pending-count"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="processing-count"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="resolved-count"]');

      // 验证列表项
      const feedbackItems = wrapper.findAll('[data-testid="feedback-item"]');
      expect(feedbackItems.length).toBeGreaterThan(0);
    });

    it('应该支持按状态筛选', async () => {
      const wrapper = mount(UserFeedbackList, {
        global: {
          plugins: [pinia, router],
        },
      });

      await TestHelper.waitForUpdate();

      // 选择"待处理"状态
      await TestHelper.fillForm(wrapper, { status: 'pending' });
      await TestHelper.click(wrapper, '[data-testid="filter-btn"]');
      await TestHelper.waitForUpdate();

      // 验证筛选结果
      const feedbackItems = wrapper.findAll('[data-testid="feedback-item"]');
      feedbackItems.forEach(item => {
        const statusTag = item.find('[data-testid="status-tag"]');
        if (statusTag.exists()) {
          expect(statusTag.text()).toBe('待处理');
        }
      });
    });

    it('应该支持按类型筛选', async () => {
      const wrapper = mount(UserFeedbackList, {
        global: {
          plugins: [pinia, router],
        },
      });

      await TestHelper.waitForUpdate();

      // 选择"建议"类型
      await TestHelper.fillForm(wrapper, { type: 'suggestion' });
      await TestHelper.click(wrapper, '[data-testid="filter-btn"]');
      await TestHelper.waitForUpdate();

      // 验证筛选结果
      const feedbackItems = wrapper.findAll('[data-testid="feedback-item"]');
      feedbackItems.forEach(item => {
        const typeTag = item.find('[data-testid="type-tag"]');
        if (typeTag.exists()) {
          expect(typeTag.text()).toBe('建议');
        }
      });
    });

    it('应该支持搜索功能', async () => {
      const wrapper = mount(UserFeedbackList, {
        global: {
          plugins: [pinia, router],
        },
      });

      await TestHelper.waitForUpdate();

      // 输入搜索关键词
      const keyword = '道路';
      await TestHelper.fillForm(wrapper, { search: keyword });
      await TestHelper.click(wrapper, '[data-testid="search-btn"]');
      await TestHelper.waitForUpdate();

      // 验证 API 调用
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`search=${keyword}`),
        expect.any(Object)
      );
    });

    it('应该支持下拉刷新', async () => {
      const wrapper = mount(UserFeedbackList, {
        global: {
          plugins: [pinia, router],
        },
      });

      await TestHelper.waitForUpdate();

      // 模拟下拉刷新
      const listContainer = wrapper.find('[data-testid="list-container"]');
      await listContainer.trigger('touchstart', { touches: [{ clientY: 0 }] });
      await listContainer.trigger('touchmove', { touches: [{ clientY: 100 }] });
      await listContainer.trigger('touchend');

      await TestHelper.waitForUpdate();

      // 验证刷新状态
      TestHelper.expectElementVisible(wrapper, '[data-testid="refreshing"]');
    });
  });

  describe('反馈详情查看流程', () => {
    it('应该显示反馈详情', async () => {
      // 设置路由参数
      await router.push('/feedback/feedback-1');

      const wrapper = mount(UserFeedbackDetail, {
        global: {
          plugins: [pinia, router],
        },
      });

      await TestHelper.waitForUpdate();

      // 验证详情显示
      TestHelper.expectElementVisible(wrapper, '[data-testid="feedback-detail"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="feedback-title"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="feedback-content"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="feedback-status"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="feedback-timeline"]');
    });

    it('应该支持添加补充说明', async () => {
      await router.push('/feedback/feedback-1');

      const wrapper = mount(UserFeedbackDetail, {
        global: {
          plugins: [pinia, router],
        },
      });

      await TestHelper.waitForUpdate();

      // 点击添加补充说明
      await TestHelper.click(wrapper, '[data-testid="add-comment-btn"]');
      await TestHelper.waitForUpdate();

      // 填写补充说明
      const comment = '补充一些详细信息';
      await TestHelper.fillForm(wrapper, { comment });
      await TestHelper.click(wrapper, '[data-testid="submit-comment-btn"]');
      await TestHelper.waitForUpdate();

      // 验证提交成功
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/feedback/comment'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(comment),
        })
      );
    });

    it('应该支持评价处理结果', async () => {
      await router.push('/feedback/feedback-1');

      const wrapper = mount(UserFeedbackDetail, {
        global: {
          plugins: [pinia, router],
        },
      });

      // 模拟已解决的反馈
      wrapper.vm.feedback = {
        ...wrapper.vm.feedback,
        status: 'resolved',
      };

      await TestHelper.waitForUpdate();

      // 点击评价按钮
      await TestHelper.click(wrapper, '[data-testid="rate-btn"]');
      await TestHelper.waitForUpdate();

      // 选择满意度
      await TestHelper.click(wrapper, '[data-testid="satisfaction-5"]');
      await TestHelper.fillForm(wrapper, { rateComment: '处理很满意' });
      await TestHelper.click(wrapper, '[data-testid="submit-rate-btn"]');
      await TestHelper.waitForUpdate();

      // 验证评价提交
      expect(wrapper.vm.feedback.userRating).toBe(5);
    });
  });

  describe('端到端流程测试', () => {
    it('完整的反馈处理流程', async () => {
      // 1. 用户提交反馈
      const submitWrapper = mount(UserFeedbackSubmit, {
        global: {
          plugins: [pinia, router],
        },
      });

      const feedbackData = {
        type: 'complaint',
        title: '垃圾处理不及时',
        content: '村内垃圾处理点经常满溢，影响环境。',
      };

      await TestHelper.fillForm(submitWrapper, feedbackData);
      await TestHelper.submitForm(submitWrapper);
      await TestHelper.waitForUpdate();

      // 验证提交成功
      expect(submitWrapper.vm.submitSuccess).toBe(true);

      // 2. 跳转到反馈列表
      await router.push('/feedback/list');
      const listWrapper = mount(UserFeedbackList, {
        global: {
          plugins: [pinia, router],
        },
      });

      await TestHelper.waitForUpdate();

      // 验证新提交的反馈在列表中
      const feedbackItems = listWrapper.findAll('[data-testid="feedback-item"]');
      const newFeedback = feedbackItems.find(
        item => item.find('[data-testid="feedback-title"]').text() === feedbackData.title
      );
      expect(newFeedback).toBeDefined();

      // 3. 查看反馈详情
      const feedbackId = 'feedback-1';
      await router.push(`/feedback/${feedbackId}`);
      const detailWrapper = mount(UserFeedbackDetail, {
        global: {
          plugins: [pinia, router],
        },
      });

      await TestHelper.waitForUpdate();

      // 验证详情信息
      TestHelper.expectElementText(
        detailWrapper,
        '[data-testid="feedback-title"]',
        feedbackData.title
      );
      TestHelper.expectElementText(
        detailWrapper,
        '[data-testid="feedback-content"]',
        feedbackData.content
      );

      // 4. 添加补充说明
      await TestHelper.click(detailWrapper, '[data-testid="add-comment-btn"]');
      await TestHelper.fillForm(detailWrapper, { comment: '补充说明' });
      await TestHelper.click(detailWrapper, '[data-testid="submit-comment-btn"]');
      await TestHelper.waitForUpdate();

      // 验证整个流程完成
      expect(detailWrapper.vm.comments).toContainEqual(
        expect.objectContaining({
          content: '补充说明',
        })
      );
    });
  });

  describe('异常处理测试', () => {
    it('应该处理网络错误', async () => {
      // 模拟网络错误
      global.fetch = vi.fn().mockRejectedValue(new Error('网络错误'));

      const wrapper = mount(UserFeedbackList, {
        global: {
          plugins: [pinia, router],
        },
      });

      await TestHelper.waitForUpdate();

      // 验证错误状态
      TestHelper.expectElementVisible(wrapper, '[data-testid="error-state"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="retry-btn"]');

      // 点击重试
      await TestHelper.click(wrapper, '[data-testid="retry-btn"]');
      await TestHelper.waitForUpdate();

      // 验证重试逻辑
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('应该处理权限不足', async () => {
      // 模拟未认证用户
      mockAuth.isAuthenticated = false;

      const wrapper = mount(UserFeedbackSubmit, {
        global: {
          plugins: [pinia, router],
        },
      });

      await TestHelper.waitForUpdate();

      // 验证跳转到登录页
      expect(wrapper.vm.$route.path).toBe('/login');
    });
  });
});
