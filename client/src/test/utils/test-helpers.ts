import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import type { ComponentPublicInstance } from 'vue'
import { nextTick } from 'vue'

/**
 * 测试辅助工具类
 */
export class TestHelper {
  /**
   * 创建带有必要插件的包装器
   */
  static async mountWithPlugins(component: any, options: any = {}) {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/residents', component: { template: '<div>Residents</div>' } },
        { path: '/committee', component: { template: '<div>Committee</div>' } },
        { path: '/finance', component: { template: '<div>Finance</div>' } }
      ]
    })

    const pinia = createPinia()

    const wrapper = mount(component, {
      global: {
        plugins: [ElementPlus, router, pinia],
        stubs: {
          'router-link': { template: '<a><slot /></a>' },
          'router-view': { template: '<div><slot /></div>' }
        }
      },
      ...options
    })

    await router.isReady()
    await nextTick()

    return wrapper as VueWrapper<ComponentPublicInstance>
  }

  /**
   * 等待 DOM 更新
   */
  static async waitForUpdate() {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  /**
   * 模拟用户输入
   */
  static async fillForm(wrapper: VueWrapper, formData: Record<string, any>) {
    for (const [selector, value] of Object.entries(formData)) {
      const element = wrapper.find(selector)
      if (element.exists()) {
        await element.setValue(value)
        await element.trigger('input')
        await element.trigger('blur')
        await this.waitForUpdate()
      }
    }
  }

  /**
   * 模拟表单提交
   */
  static async submitForm(wrapper: VueWrapper) {
    const form = wrapper.find('form')
    if (form.exists()) {
      await form.trigger('submit.prevent')
      await this.waitForUpdate()
    }
  }

  /**
   * 模拟点击操作
   */
  static async click(wrapper: VueWrapper, selector: string) {
    const element = wrapper.find(selector)
    if (element.exists()) {
      await element.trigger('click')
      await this.waitForUpdate()
    }
  }

  /**
   * 检查元素是否存在
   */
  static expectElementExists(wrapper: VueWrapper, selector: string) {
    const element = wrapper.find(selector)
    expect(element.exists()).toBe(true)
  }

  /**
   * 检查元素文本内容
   */
  static expectElementText(wrapper: VueWrapper, selector: string, text: string | RegExp) {
    const element = wrapper.find(selector)
    expect(element.exists()).toBe(true)
    expect(element.text()).toMatch(text)
  }

  /**
   * 检查元素属性
   */
  static expectElementAttribute(wrapper: VueWrapper, selector: string, attribute: string, value: string) {
    const element = wrapper.find(selector)
    expect(element.exists()).toBe(true)
    expect(element.attributes(attribute)).toBe(value)
  }

  /**
   * 检查元素是否可见
   */
  static expectElementVisible(wrapper: VueWrapper, selector: string) {
    const element = wrapper.find(selector)
    expect(element.exists()).toBe(true)
    expect(element.isVisible()).toBe(true)
  }

  /**
   * 检查元素是否隐藏
   */
  static expectElementHidden(wrapper: VueWrapper, selector: string) {
    const element = wrapper.find(selector)
    if (element.exists()) {
      expect(element.isVisible()).toBe(false)
    }
  }

  /**
   * 检查组件是否渲染
   */
  static expectComponentExists(wrapper: VueWrapper, componentName: string) {
    const component = wrapper.findComponent({ name: componentName })
    expect(component.exists()).toBe(true)
  }

  /**
   * 检查组件 Props
   */
  static expectComponentProps(wrapper: VueWrapper, componentName: string, props: Record<string, any>) {
    const component = wrapper.findComponent({ name: componentName })
    expect(component.exists()).toBe(true)

    for (const [propName, expectedValue] of Object.entries(props)) {
      expect(component.props(propName)).toEqual(expectedValue)
    }
  }

  /**
   * 检查事件是否触发
   */
  static async expectEventEmitted(wrapper: VueWrapper, eventName: string, payload?: any) {
    await wrapper.vm.$nextTick()
    if (payload !== undefined) {
      expect(wrapper.emitted(eventName)).toEqual([[payload]])
    } else {
      expect(wrapper.emitted(eventName)).toBeTruthy()
    }
  }

  /**
   * 模拟 API 延迟
   */
  static async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 创建 mock 响应
   */
  static createMockResponse(data: any, status = 200) {
    return {
      status,
      data: {
        success: status === 200,
        data,
        message: status === 200 ? 'Success' : 'Error'
      }
    }
  }

  /**
   * 检查表单验证错误
   */
  static expectValidationError(wrapper: VueWrapper, fieldName: string, errorMessage: string) {
    const errorElement = wrapper.find(`[data-testid="${fieldName}-error"]`)
    expect(errorElement.exists()).toBe(true)
    expect(errorElement.text()).toContain(errorMessage)
  }

  /**
   * 检查加载状态
   */
  static expectLoadingState(wrapper: VueWrapper) {
    const loadingElement = wrapper.find('[data-testid="loading"]')
    expect(loadingElement.exists()).toBe(true)
  }

  /**
   * 检查空状态
   */
  static expectEmptyState(wrapper: VueWrapper) {
    const emptyElement = wrapper.find('[data-testid="empty"]')
    expect(emptyElement.exists()).toBe(true)
  }

  /**
   * 检查错误状态
   */
  static expectErrorState(wrapper: VueWrapper, errorMessage?: string) {
    const errorElement = wrapper.find('[data-testid="error"]')
    expect(errorElement.exists()).toBe(true)
    if (errorMessage) {
      expect(errorElement.text()).toContain(errorMessage)
    }
  }

  /**
   * 模拟网络错误
   */
  static mockNetworkError(message = 'Network Error') {
    return Promise.reject(new Error(message))
  }

  /**
   * 模拟分页数据
   */
  static createMockPaginationData<T>(items: T[], page = 1, pageSize = 10) {
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedItems = items.slice(startIndex, endIndex)

    return {
      data: paginatedItems,
      pagination: {
        current: page,
        pageSize,
        total: items.length,
        pages: Math.ceil(items.length / pageSize)
      }
    }
  }

  /**
   * 创建 mock 用户
   */
  static createMockUser(overrides = {}) {
    return {
      id: 'user-1',
      username: 'testuser',
      name: '测试用户',
      role: 'resident',
      villageId: 'village-1',
      email: 'test@example.com',
      phone: '13800138000',
      avatar: 'https://example.com/avatar.jpg',
      isActive: true,
      permissions: ['read'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      ...overrides
    }
  }

  /**
   * 创建 mock 村民
   */
  static createMockResident(overrides = {}) {
    return {
      id: 'resident-1',
      name: '测试村民',
      idCard: '330106199001011234',
      phone: '13800138000',
      address: '测试地址',
      familyType: '普通户',
      familyMembers: 4,
      villageId: 'village-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      ...overrides
    }
  }

  /**
   * 创建 mock 村委
   */
  static createMockCommittee(overrides = {}) {
    return {
      id: 'committee-1',
      name: '张三',
      position: '村支书',
      phone: '13900139000',
      email: 'zhangsan@village.com',
      avatar: 'https://example.com/avatar.jpg',
      department: '村委会',
      duties: '负责村务全面工作',
      startDate: '2020-01-01',
      isActive: true,
      villageId: 'village-1',
      ...overrides
    }
  }

  /**
   * 创建 mock 反馈
   */
  static createMockFeedback(overrides = {}) {
    return {
      id: 'feedback-1',
      userId: 'user-1',
      userName: '测试用户',
      type: 'suggestion',
      title: '建议标题',
      content: '建议内容',
      status: 'pending',
      createTime: '2024-01-01T00:00:00Z',
      replyTime: null,
      replyContent: null,
      replyUser: null,
      villageId: 'village-1',
      ...overrides
    }
  }
}

/**
 * 模拟 Pinia Store
 */
export function createMockStore(initialState = {}) {
  const store = {
    state: { ...initialState },
    setState: function(newState: any) {
      this.state = { ...this.state, ...newState }
    },
    getState: function() {
      return this.state
    },
    actions: {},
    getters: {}
  }
  return store
}

/**
 * 模拟 Vue Router
 */
export function createMockRouter() {
  const routes: string[] = []
  return {
    push: jest.fn((route: any) => {
      routes.push(route)
      return Promise.resolve()
    }),
    replace: jest.fn((route: any) => {
      routes[routes.length - 1] = route
      return Promise.resolve()
    }),
    go: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    currentRoute: {
      value: {
        path: '/',
        name: 'home',
        params: {},
        query: {}
      }
    },
    getRoutes: () => routes
  }
}