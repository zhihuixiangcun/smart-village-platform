/**
 * 村民数据状态管理 Store
 */
import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { residentApi } from '@/api/residentApi';

export const useResidentStore = defineStore('resident', () => {
  // 状态数据
  const residentList = ref([]);
  const currentResident = ref(null);
  const familyMembers = ref([]);
  const healthRecords = ref([]);
  const statistics = reactive({
    total: 0,
    households: 0,
    elderly: 0,
    children: 0,
    partyMembers: 0
  });

  // 加载状态
  const loading = ref(false);
  const familyLoading = ref(false);
  const healthLoading = ref(false);

  // 分页信息
  const pagination = reactive({
    page: 1,
    pageSize: 10,
    total: 0
  });

  // 搜索条件
  const searchParams = reactive({
    keyword: '',
    gender: '',
    householdType: '',
    healthStatus: '',
    ageRange: []
  });

  // 计算属性
  const hasResidents = computed(() => residentList.value.length > 0);
  const currentResidentName = computed(() => currentResident.value?.name || '');

  /**
   * 获取村民列表
   * @param {Object} params 查询参数
   * @returns {Promise} 请求结果
   */
  const getResidentList = async (params = {}) => {
    try {
      loading.value = true;

      const queryParams = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...searchParams,
        ...params
      };

      const response = await residentApi.getList(queryParams);

      residentList.value = response.data || [];
      pagination.total = response.total || 0;

      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('获取村民列表失败');
      return Promise.reject(error);
    } finally {
      loading.value = false;
    }
  };

  /**
   * 获取村民详情
   * @param {string|number} id 村民ID
   * @returns {Promise} 请求结果
   */
  const getResidentDetail = async (id) => {
    try {
      const response = await residentApi.getDetail(id);
      currentResident.value = response;
      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('获取村民详情失败');
      return Promise.reject(error);
    }
  };

  /**
   * 创建村民
   * @param {Object} data 村民数据
   * @returns {Promise} 请求结果
   */
  const createResident = async (data) => {
    try {
      const response = await residentApi.create(data);

      // 添加到列表
      residentList.value.unshift(response);
      pagination.total += 1;

      ElMessage.success('创建成功');
      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('创建失败');
      return Promise.reject(error);
    }
  };

  /**
   * 更新村民信息
   * @param {string|number} id 村民ID
   * @param {Object} data 更新数据
   * @returns {Promise} 请求结果
   */
  const updateResident = async (id, data) => {
    try {
      const response = await residentApi.update(id, data);

      // 更新列表中的数据
      const index = residentList.value.findIndex(item => item.id === id);
      if (index !== -1) {
        residentList.value[index] = { ...residentList.value[index], ...response };
      }

      // 更新当前村民数据
      if (currentResident.value && currentResident.value.id === id) {
        currentResident.value = { ...currentResident.value, ...response };
      }

      ElMessage.success('更新成功');
      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('更新失败');
      return Promise.reject(error);
    }
  };

  /**
   * 删除村民
   * @param {string|number} id 村民ID
   * @returns {Promise} 请求结果
   */
  const deleteResident = async (id) => {
    try {
      await residentApi.delete(id);

      // 从列表中移除
      const index = residentList.value.findIndex(item => item.id === id);
      if (index !== -1) {
        residentList.value.splice(index, 1);
        pagination.total -= 1;
      }

      // 清除当前村民数据
      if (currentResident.value && currentResident.value.id === id) {
        currentResident.value = null;
      }

      ElMessage.success('删除成功');
      return Promise.resolve();
    } catch (error) {
      ElMessage.error('删除失败');
      return Promise.reject(error);
    }
  };

  /**
   * 批量删除村民
   * @param {Array} ids 村民ID数组
   * @returns {Promise} 请求结果
   */
  const batchDeleteResidents = async (ids) => {
    try {
      await residentApi.batchDelete(ids);

      // 从列表中移除
      residentList.value = residentList.value.filter(item => !ids.includes(item.id));
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
      const response = await residentApi.getStatistics();
      Object.assign(statistics, response);
      return Promise.resolve(response);
    } catch (error) {
      console.error('获取统计数据失败:', error);
      return Promise.reject(error);
    }
  };

  /**
   * 搜索村民
   * @param {string} keyword 搜索关键词
   * @param {Object} filters 过滤条件
   * @returns {Promise} 请求结果
   */
  const searchResidents = async (keyword, filters = {}) => {
    try {
      // 更新搜索条件
      searchParams.keyword = keyword;
      Object.assign(searchParams, filters);

      // 重置分页
      pagination.page = 1;

      // 重新获取数据
      return await getResidentList();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  /**
   * 重置搜索条件
   */
  const resetSearch = () => {
    Object.keys(searchParams).forEach(key => {
      if (Array.isArray(searchParams[key])) {
        searchParams[key] = [];
      } else {
        searchParams[key] = '';
      }
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
   * 获取家庭成员
   * @param {string|number} residentId 村民ID
   * @returns {Promise} 请求结果
   */
  const getFamilyMembers = async (residentId) => {
    try {
      familyLoading.value = true;
      const response = await residentApi.getFamilyMembers(residentId);
      familyMembers.value = response;
      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('获取家庭成员失败');
      return Promise.reject(error);
    } finally {
      familyLoading.value = false;
    }
  };

  /**
   * 添加家庭成员
   * @param {string|number} residentId 村民ID
   * @param {Object} data 成员数据
   * @returns {Promise} 请求结果
   */
  const addFamilyMember = async (residentId, data) => {
    try {
      const response = await residentApi.addFamilyMember(residentId, data);
      familyMembers.value.push(response);
      ElMessage.success('添加家庭成员成功');
      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('添加家庭成员失败');
      return Promise.reject(error);
    }
  };

  /**
   * 更新家庭成员
   * @param {string|number} residentId 村民ID
   * @param {string|number} memberId 成员ID
   * @param {Object} data 更新数据
   * @returns {Promise} 请求结果
   */
  const updateFamilyMember = async (residentId, memberId, data) => {
    try {
      const response = await residentApi.updateFamilyMember(residentId, memberId, data);

      // 更新列表中的数据
      const index = familyMembers.value.findIndex(item => item.id === memberId);
      if (index !== -1) {
        familyMembers.value[index] = { ...familyMembers.value[index], ...response };
      }

      ElMessage.success('更新家庭成员成功');
      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('更新家庭成员失败');
      return Promise.reject(error);
    }
  };

  /**
   * 删除家庭成员
   * @param {string|number} residentId 村民ID
   * @param {string|number} memberId 成员ID
   * @returns {Promise} 请求结果
   */
  const deleteFamilyMember = async (residentId, memberId) => {
    try {
      await residentApi.deleteFamilyMember(residentId, memberId);

      // 从列表中移除
      const index = familyMembers.value.findIndex(item => item.id === memberId);
      if (index !== -1) {
        familyMembers.value.splice(index, 1);
      }

      ElMessage.success('删除家庭成员成功');
      return Promise.resolve();
    } catch (error) {
      ElMessage.error('删除家庭成员失败');
      return Promise.reject(error);
    }
  };

  /**
   * 获取健康档案
   * @param {string|number} residentId 村民ID
   * @returns {Promise} 请求结果
   */
  const getHealthRecords = async (residentId) => {
    try {
      healthLoading.value = true;
      const response = await residentApi.getHealthRecords(residentId);
      healthRecords.value = response;
      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('获取健康档案失败');
      return Promise.reject(error);
    } finally {
      healthLoading.value = false;
    }
  };

  /**
   * 添加健康记录
   * @param {string|number} residentId 村民ID
   * @param {Object} data 健康记录数据
   * @returns {Promise} 请求结果
   */
  const addHealthRecord = async (residentId, data) => {
    try {
      const response = await residentApi.addHealthRecord(residentId, data);
      healthRecords.value.unshift(response);
      ElMessage.success('添加健康记录成功');
      return Promise.resolve(response);
    } catch (error) {
      ElMessage.error('添加健康记录失败');
      return Promise.reject(error);
    }
  };

  /**
   * 导出村民数据
   * @param {Object} params 查询参数
   * @returns {Promise} 请求结果
   */
  const exportResidents = async (params = {}) => {
    try {
      const queryParams = { ...searchParams, ...params };
      await residentApi.export(queryParams);
      return Promise.resolve();
    } catch (error) {
      ElMessage.error('导出失败');
      return Promise.reject(error);
    }
  };

  /**
   * 清除当前村民数据
   */
  const clearCurrentResident = () => {
    currentResident.value = null;
    familyMembers.value = [];
    healthRecords.value = [];
  };

  /**
   * 刷新数据
   */
  const refresh = async () => {
    await Promise.all([
      getResidentList(),
      getStatistics()
    ]);
  };

  return {
    // 状态
    residentList,
    currentResident,
    familyMembers,
    healthRecords,
    statistics,
    loading,
    familyLoading,
    healthLoading,
    pagination,
    searchParams,

    // 计算属性
    hasResidents,
    currentResidentName,

    // 方法
    getResidentList,
    getResidentDetail,
    createResident,
    updateResident,
    deleteResident,
    batchDeleteResidents,
    getStatistics,
    searchResidents,
    resetSearch,
    setPagination,
    getFamilyMembers,
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,
    getHealthRecords,
    addHealthRecord,
    exportResidents,
    clearCurrentResident,
    refresh
  };
});

export default useResidentStore;