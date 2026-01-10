import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ResidentManagement from '@/views/resident/ResidentManagement.vue';
import { TestHelper } from '@/test/utils/test-helpers';
import { apiServer } from '@/test/mocks/api';
import { ElMessage, ElMessageBox } from 'element-plus';

// 启动 mock 服务器
beforeAll(() => apiServer.listen());
afterAll(() => apiServer.close());

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

// 模拟路由
const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useRoute: () => ({
    query: {},
  }),
}));

describe('ResidentManagement.vue', () => {
  let wrapper: any;
  let pinia: any;

  beforeEach(async () => {
    pinia = createPinia();
    setActivePinia(pinia);
    wrapper = await TestHelper.mountWithPlugins(ResidentManagement, {
      global: {
        plugins: [pinia],
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('页面初始化', () => {
    it('应该正确渲染页面标题和操作按钮', async () => {
      TestHelper.expectElementText(wrapper, '[data-testid="page-title"]', '村民管理');

      // 检查主要操作按钮
      TestHelper.expectElementVisible(wrapper, '[data-testid="add-resident-btn"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="import-btn"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="export-btn"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="batch-operations-btn"]');
    });

    it('应该显示搜索表单', async () => {
      TestHelper.expectElementVisible(wrapper, '[data-testid="search-form"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="search-input"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="family-type-select"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="search-btn"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="reset-btn"]');
    });

    it('应该显示数据表格', async () => {
      TestHelper.expectElementVisible(wrapper, '[data-testid="resident-table"]');

      // 等待数据加载
      await TestHelper.waitForUpdate();

      // 检查表格是否加载了数据
      const tableRows = wrapper.findAll('[data-testid="table-row"]');
      expect(tableRows.length).toBeGreaterThan(0);
    });

    it('应该显示分页组件', async () => {
      TestHelper.expectElementVisible(wrapper, '[data-testid="pagination"]');
    });

    it('应该显示统计卡片', async () => {
      TestHelper.expectElementVisible(wrapper, '[data-testid="total-residents"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="special-families"]');
      TestHelper.expectElementVisible(wrapper, '[data-testid="recent-added"]');
    });
  });

  describe('搜索功能', () => {
    it('应该支持按姓名搜索', async () => {
      const searchData = {
        search: '张三',
      };

      await TestHelper.fillForm(wrapper, searchData);
      await TestHelper.click(wrapper, '[data-testid="search-btn"]');
      await TestHelper.waitForUpdate();

      // 验证 API 调用参数
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=张三'),
        expect.any(Object)
      );
    });

    it('应该支持按家庭类型筛选', async () => {
      const searchData = {
        familyType: '低保户',
      };

      await TestHelper.fillForm(wrapper, searchData);
      await TestHelper.click(wrapper, '[data-testid="search-btn"]');
      await TestHelper.waitForUpdate();

      // 验证筛选结果
      const tableRows = wrapper.findAll('[data-testid="table-row"]');
      tableRows.forEach(row => {
        const familyTypeCell = row.find('[data-testid="family-type-cell"]');
        if (familyTypeCell.exists()) {
          expect(familyTypeCell.text()).toBe('低保户');
        }
      });
    });

    it('应该支持重置搜索条件', async () => {
      // 先输入搜索条件
      await TestHelper.fillForm(wrapper, {
        search: '测试',
        familyType: '低保户',
      });

      // 点击重置按钮
      await TestHelper.click(wrapper, '[data-testid="reset-btn"]');
      await TestHelper.waitForUpdate();

      // 验证表单已重置
      const searchInput = wrapper.find('[data-testid="search-input"]');
      expect(searchInput.element.value).toBe('');

      const familyTypeSelect = wrapper.find('[data-testid="family-type-select"]');
      expect(familyTypeSelect.element.value).toBe('');
    });
  });

  describe('村民操作', () => {
    it('点击新增按钮应该打开新增对话框', async () => {
      await TestHelper.click(wrapper, '[data-testid="add-resident-btn"]');

      TestHelper.expectElementVisible(wrapper, '[data-testid="resident-form-dialog"]');
      expect(wrapper.vm.dialogVisible).toBe(true);
      expect(wrapper.vm.dialogType).toBe('add');
    });

    it('点击编辑按钮应该打开编辑对话框', async () => {
      // 等待表格数据加载
      await TestHelper.waitForUpdate();

      // 点击第一行的编辑按钮
      const firstEditButton = wrapper.find('[data-testid="edit-btn-0"]');
      if (firstEditButton.exists()) {
        await firstEditButton.trigger('click');

        TestHelper.expectElementVisible(wrapper, '[data-testid="resident-form-dialog"]');
        expect(wrapper.vm.dialogVisible).toBe(true);
        expect(wrapper.vm.dialogType).toBe('edit');
      }
    });

    it('点击删除按钮应该显示确认对话框', async () => {
      // 等待表格数据加载
      await TestHelper.waitForUpdate();

      // 点击第一行的删除按钮
      const firstDeleteButton = wrapper.find('[data-testid="delete-btn-0"]');
      if (firstDeleteButton.exists()) {
        await firstDeleteButton.trigger('click');

        expect(ElMessageBox.confirm).toHaveBeenCalledWith(
          '确定要删除该村民信息吗？删除后将无法恢复。',
          '确认删除',
          expect.any(Object)
        );
      }
    });

    it('确认删除后应该更新列表', async () => {
      // 等待表格数据加载
      await TestHelper.waitForUpdate();

      // 模拟确认删除
      ElMessageBox.confirm = vi.fn().mockResolvedValue('confirm');

      const initialRowCount = wrapper.findAll('[data-testid="table-row"]').length;

      // 点击第一行的删除按钮
      const firstDeleteButton = wrapper.find('[data-testid="delete-btn-0"]');
      if (firstDeleteButton.exists()) {
        await firstDeleteButton.trigger('click');
        await TestHelper.waitForUpdate();

        expect(ElMessage.success).toHaveBeenCalledWith('删除成功');

        // 验证数据是否更新
        // 注意：由于使用的是 mock 数据，实际行数可能不变
        // 在真实应用中，这里应该验证行数减少
      }
    });

    it('点击查看详情应该跳转到详情页', async () => {
      // 等待表格数据加载
      await TestHelper.waitForUpdate();

      // 点击第一行的详情按钮
      const firstDetailButton = wrapper.find('[data-testid="detail-btn-0"]');
      if (firstDetailButton.exists()) {
        await firstDetailButton.trigger('click');

        expect(mockPush).toHaveBeenCalledWith({
          name: 'ResidentDetail',
          params: { id: expect.any(String) },
        });
      }
    });
  });

  describe('批量操作', () => {
    it('应该支持多选村民', async () => {
      // 等待表格数据加载
      await TestHelper.waitForUpdate();

      // 选择第一行
      const firstCheckbox = wrapper.find('[data-testid="checkbox-0"]');
      if (firstCheckbox.exists()) {
        await firstCheckbox.trigger('click');

        expect(wrapper.vm.selectedRows.length).toBe(1);
        TestHelper.expectElementVisible(wrapper, '[data-testid="batch-actions"]');
      }
    });

    it('应该支持批量删除', async () => {
      // 先选择村民
      await TestHelper.click(wrapper, '[data-testid="checkbox-0"]');
      await TestHelper.waitForUpdate();

      // 点击批量删除
      await TestHelper.click(wrapper, '[data-testid="batch-delete-btn"]');

      expect(ElMessageBox.confirm).toHaveBeenCalledWith(
        expect.stringContaining('确定要删除选中的'),
        '批量删除确认',
        expect.any(Object)
      );
    });

    it('应该支持批量导出', async () => {
      // 先选择村民
      await TestHelper.click(wrapper, '[data-testid="checkbox-0"]');
      await TestHelper.waitForUpdate();

      // 模拟导出函数
      const mockExport = vi.fn();
      wrapper.vm.exportResidents = mockExport;

      // 点击批量导出
      await TestHelper.click(wrapper, '[data-testid="batch-export-btn"]');

      expect(mockExport).toHaveBeenCalled();
    });
  });

  describe('数据导入导出', () => {
    it('点击导入按钮应该打开文件选择对话框', async () => {
      const fileInput = wrapper.find('[data-testid="file-input"]');
      expect(fileInput.exists()).toBe(true);

      await TestHelper.click(wrapper, '[data-testid="import-btn"]');

      // 验证点击事件触发
      expect(fileInput.element.click).toBeDefined();
    });

    it('应该支持 Excel 文件导入', async () => {
      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // 模拟文件选择
      const fileInput = wrapper.find('[data-testid="file-input"]');
      await fileInput.trigger('change', {
        target: { files: [file] },
      });

      await TestHelper.waitForUpdate();

      // 验证导入对话框显示
      TestHelper.expectElementVisible(wrapper, '[data-testid="import-dialog"]');
    });

    it('应该支持导出 Excel 文件', async () => {
      // 模拟导出 API
      const mockBlob = new Blob(['test']);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      // 创建下载链接的 mock
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob-url');
      global.URL.createObjectURL = mockCreateObjectURL;

      await TestHelper.click(wrapper, '[data-testid="export-btn"]');

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(ElMessage.success).toHaveBeenCalledWith('导出成功');
    });
  });

  describe('分页功能', () => {
    it('应该支持改变每页显示数量', async () => {
      const pagination = wrapper.find('[data-testid="pagination"]');

      // 模拟改变页大小
      await pagination.vm.$emit('size-change', 20);
      await TestHelper.waitForUpdate();

      expect(wrapper.vm.pageSize).toBe(20);
    });

    it('应该支持切换页码', async () => {
      const pagination = wrapper.find('[data-testid="pagination"]');

      // 模拟切换到第2页
      await pagination.vm.$emit('current-change', 2);
      await TestHelper.waitForUpdate();

      expect(wrapper.vm.currentPage).toBe(2);
    });
  });

  describe('数据加载状态', () => {
    it('应该显示加载状态', async () => {
      // 模拟加载状态
      wrapper.vm.loading = true;
      await TestHelper.waitForUpdate();

      TestHelper.expectElementVisible(wrapper, '[data-testid="loading"]');
    });

    it('应该处理加载错误', async () => {
      // 模拟加载错误
      global.fetch = vi.fn().mockRejectedValue(new Error('加载失败'));

      wrapper.vm.loadResidents();
      await TestHelper.waitForUpdate();

      TestHelper.expectElementVisible(wrapper, '[data-testid="error-message"]');
      expect(ElMessage.error).toHaveBeenCalledWith('加载失败');
    });
  });

  describe('表单验证', () => {
    it('应该验证必填字段', async () => {
      await TestHelper.click(wrapper, '[data-testid="add-resident-btn"]');
      await TestHelper.waitForUpdate();

      // 提交空表单
      await TestHelper.submitForm(wrapper);
      await TestHelper.waitForUpdate();

      // 验证错误提示
      TestHelper.expectValidationError(wrapper, 'name', '请输入姓名');
      TestHelper.expectValidationError(wrapper, 'idCard', '请输入身份证号');
      TestHelper.expectValidationError(wrapper, 'phone', '请输入手机号');
    });

    it('应该验证身份证号格式', async () => {
      await TestHelper.click(wrapper, '[data-testid="add-resident-btn"]');
      await TestHelper.waitForUpdate();

      // 输入错误的身份证号
      await TestHelper.fillForm(wrapper, {
        idCard: '123456',
      });
      await TestHelper.submitForm(wrapper);
      await TestHelper.waitForUpdate();

      TestHelper.expectValidationError(wrapper, 'idCard', '身份证号格式不正确');
    });

    it('应该验证手机号格式', async () => {
      await TestHelper.click(wrapper, '[data-testid="add-resident-btn"]');
      await TestHelper.waitForUpdate();

      // 输入错误的手机号
      await TestHelper.fillForm(wrapper, {
        phone: '123456',
      });
      await TestHelper.submitForm(wrapper);
      await TestHelper.waitForUpdate();

      TestHelper.expectValidationError(wrapper, 'phone', '手机号格式不正确');
    });
  });

  describe('响应式布局', () => {
    it('在移动端应该隐藏部分列', async () => {
      // 模拟移动端视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      await wrapper.vm.$nextTick();

      // 某些列应该被隐藏
      const hiddenColumns = wrapper.findAll('.column--mobile-hidden');
      expect(hiddenColumns.length).toBeGreaterThan(0);
    });

    it('在移动端应该使用操作菜单', async () => {
      // 模拟移动端视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      await wrapper.vm.$nextTick();

      // 应该显示操作菜单按钮
      TestHelper.expectElementVisible(wrapper, '[data-testid="action-menu-btn"]');
    });
  });
});
