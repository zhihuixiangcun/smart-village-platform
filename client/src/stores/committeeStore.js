/**
 * 村委会数据状态管理 Store
 */
import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { committeeApi } from '@/api/committeeApi';

export const useCommitteeStore = defineStore('committee', () => {
  // 状态数据
  const memberList = ref([]);
  const currentMember = ref(null);
  const organizationStructure = ref({
    partyCommittee: [],
    villageCommittee: [],
    supervisoryCommittee: [],
    departments: []
  });

  // 统计数据
  const statistics = reactive({
    totalMembers: 0,
    departments: 0,
    onDuty: 0,
    partyMembers: 0
  });

  // 加载状态
  const loading = ref(false);
  const orgLoading = ref(false);

  // 分页信息
  const pagination = reactive({
    page: 1,
    pageSize: 10,
    total: 0
  });

  // 搜索条件
  const searchParams = reactive({
    keyword: '',
    position: '',
    department: '',
    status: '',
    politicalStatus: ''
  });

  // 计算属性
  const hasMembers = computed(() => memberList.value.length > 0);
  const currentMemberName = computed(() => currentMember.value?.name || '');
  const departmentNames = computed(() => {
    return organizationStructure.value.departments.map(dept => dept.name);
  });

  /**
   * 获取成员列表
   * @param {Object} params 查询参数
   * @returns {Promise} 请求结果
   */
  const getMemberList = async (params = {}) => {
    try {
      loading.value = true;

      const queryParams = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...searchParams,
        ...params
      };

      const response = await committeeApi.getMembers(queryParams);

      memberList.value = response.data || [];
      pagination.total = response.total || 0;

      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('获取成员列表失败');
      return Promise.reject(error);
    } finally {
      loading.value = false;
    }
  };

  /**
   * 获取成员详情
   * @param {string|number} id 成员ID
   * @returns {Promise} 请求结果
   */
  const getMemberDetail = async (id) => {
    try {
      const response = await committeeApi.getMemberDetail(id);
      currentMember.value = response;
      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('获取成员详情失败');
      return Promise.reject(error);
    }
  };

  /**
   * 创建成员
   * @param {Object} data 成员数据
   * @returns {Promise} 请求结果
   */
  const createMember = async (data) => {
    try {
      const response = await committeeApi.createMember(data);

      // 添加到列表
      memberList.value.unshift(response);
      pagination.total += 1;

      ElMessage.success('创建成功');
      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('创建失败');
      return Promise.reject(error);
    }
  };

  /**
   * 更新成员信息
   * @param {string|number} id 成员ID
   * @param {Object} data 更新数据
   * @returns {Promise} 请求结果
   */
  const updateMember = async (id, data) => {
    try {
      const response = await committeeApi.updateMember(id, data);

      // 更新列表中的数据
      const index = memberList.value.findIndex(item => item.id === id);
      if (index !== -1) {
        memberList.value[index] = { ...memberList.value[index], ...response };
      }

      // 更新当前成员数据
      if (currentMember.value && currentMember.value.id === id) {
        currentMember.value = { ...currentMember.value, ...response };
      }

      ElMessage.success('更新成功');
      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('更新失败');
      return Promise.reject(error);
    }
  };

  /**
   * 删除成员
   * @param {string|number} id 成员ID
   * @returns {Promise} 请求结果
   */
  const deleteMember = async (id) => {
    try {
      await committeeApi.deleteMember(id);

      // 从列表中移除
      const index = memberList.value.findIndex(item => item.id === id);
      if (index !== -1) {
        memberList.value.splice(index, 1);
        pagination.total -= 1;
      }

      // 清除当前成员数据
      if (currentMember.value && currentMember.value.id === id) {
        currentMember.value = null;
      }

      ElMessage.success('删除成功');
      return Promise.resolve();
    } catch (error) {
      ElMessage.error('删除失败');
      return Promise.reject(error);
    }
  };

  /**
   * 批量删除成员
   * @param {Array} ids 成员ID数组
   * @returns {Promise} 请求结果
   */
  const batchDeleteMembers = async (ids) => {
    try {
      await committeeApi.batchDeleteMembers(ids);

      // 从列表中移除
      memberList.value = memberList.value.filter(item => !ids.includes(item.id));
      pagination.total -= ids.length;

      ElMessage.success(`成功删除 ${ids.length} 条记录`);
      return Promise.resolve();
    } catch (error) {
      ElMessage.error('批量删除失败');
      return Promise.reject(error);
    }
  };

  /**
   * 获取统计数据
   * @returns {Promise} 请求结果
   */
  const getStatistics = async () => {
    try {
      const response = await committeeApi.getStatistics();
      Object.assign(statistics, response);
      return Promise.resolve(response);
    } catch (error) {
      console.error('获取统计数据失败:', error);
      return Promise.reject(error);
    }
  };

  /**
   * 获取组织架构
   * @returns {Promise} 请求结果
   */
  const getOrganization = async () => {
    try {
      orgLoading.value = true;
      const response = await committeeApi.getOrganization();
      organizationStructure.value = response;
      return Promise.resolve(response);
    } catch (error) {
      console.error('获取组织架构失败:', error);
      return Promise.reject(error);
    } finally {
      orgLoading.value = false;
    }
  };

  /**
   * 更新组织架构
   * @param {Object} data 组织架构数据
   * @returns {Promise} 请求结果
   */
  const updateOrganization = async (data) => {
    try {
      const response = await committeeApi.updateOrganization(data);
      organizationStructure.value = response;
      ElMessage.success('组织架构更新成功');
      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('组织架构更新失败');
      return Promise.reject(error);
    }
  };

  /**
   * 搜索成员
   * @param {string} keyword 搜索关键词
   * @param {Object} filters 过滤条件
   * @returns {Promise} 请求结果
   */
  const searchMembers = async (keyword, filters = {}) => {
    try {
      // 更新搜索条件
      searchParams.keyword = keyword;
      Object.assign(searchParams, filters);

      // 重置分页
      pagination.page = 1;

      // 重新获取数据
      return await getMemberList();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  /**
   * 重置搜索条件
   */
  const resetSearch = () => {
    Object.keys(searchParams).forEach(key => {
      searchParams[key] = '';
    });
    pagination.page = 1;
  };

  /**
   * 设置分页参数
   * @param {number} page 页码
   * @param {number} pageSize 每页大小
   */
  const setPagination = (page, pageSize) => {
    pagination.page = page;
    pagination.pageSize = pageSize;
  };

  /**
   * 职务调动
   * @param {string|number} memberId 成员ID
   * @param {Object} data 调动数据
   * @returns {Promise} 请求结果
   */
  const transferPosition = async (memberId, data) => {
    try {
      const response = await committeeApi.transferPosition(memberId, data);

      // 更新成员信息
      const index = memberList.value.findIndex(item => item.id === memberId);
      if (index !== -1) {
        memberList.value[index] = { ...memberList.value[index], ...response };
      }

      if (currentMember.value && currentMember.value.id === memberId) {
        currentMember.value = { ...currentMember.value, ...response };
      }

      ElMessage.success('职务调动成功');
      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('职务调动失败');
      return Promise.reject(error);
    }
  };

  /**
   * 成员离职
   * @param {string|number} memberId 成员ID
   * @param {Object} data 离职数据
   * @returns {Promise} 请求结果
   */
  const retireMember = async (memberId, data = {}) => {
    try {
      await committeeApi.retireMember(memberId, data);

      // 更新成员状态
      const index = memberList.value.findIndex(item => item.id === memberId);
      if (index !== -1) {
        memberList.value[index].status = '离职';
      }

      if (currentMember.value && currentMember.value.id === memberId) {
        currentMember.value.status = '离职';
      }

      ElMessage.success('离职手续办理成功');
      return Promise.resolve();
    } catch (error) {
      ElMessage.error('离职手续办理失败');
      return Promise.reject(error);
    }
  };

  /**
   * 获取工作职责
   * @param {string|number} memberId 成员ID
   * @returns {Promise} 请求结果
   */
  const getWorkDuties = async (memberId) => {
    try {
      const response = await committeeApi.getWorkDuties(memberId);
      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('获取工作职责失败');
      return Promise.reject(error);
    }
  };

  /**
   * 更新工作职责
   * @param {string|number} memberId 成员ID
   * @param {Object} data 职责数据
   * @returns {Promise} 请求结果
   */
  const updateWorkDuties = async (memberId, data) => {
    try {
      const response = await committeeApi.updateWorkDuties(memberId, data);
      ElMessage.success('工作职责更新成功');
      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('工作职责更新失败');
      return Promise.reject(error);
    }
  };

  /**
   * 导出成员数据
   * @param {Object} params 查询参数
   * @returns {Promise} 请求结果
   */
  const exportMembers = async (params = {}) => {
    try {
      const queryParams = { ...searchParams, ...params };
      await committeeApi.export(queryParams);
      return Promise.resolve();
    } catch (error) {
      ElMessage.error('导出失败');
      return Promise.reject(error);
    }
  };

  /**
   * 清除当前成员数据
   */
  const clearCurrentMember = () => {
    currentMember.value = null;
  };

  /**
   * 刷新数据
   */
  const refresh = async () => {
    await Promise.all([
      getMemberList(),
      getStatistics(),
      getOrganization()
    ]);
  };

  return {
    // 状态
    memberList,
    currentMember,
    organizationStructure,
    statistics,
    loading,
    orgLoading,
    pagination,
    searchParams,

    // 计算属性
    hasMembers,
    currentMemberName,
    departmentNames,

    // 方法
    getMemberList,
    getMemberDetail,
    createMember,
    updateMember,
    deleteMember,
    batchDeleteMembers,
    getStatistics,
    getOrganization,
    updateOrganization,
    searchMembers,
    resetSearch,
    setPagination,
    transferPosition,
    retireMember,
    getWorkDuties,
    updateWorkDuties,
    exportMembers,
    clearCurrentMember,
    refresh
  };
});

export default useCommitteeStore;