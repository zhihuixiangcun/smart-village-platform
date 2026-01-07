import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { dailyExpenseAPI } from '@/api/finance';
import { ElMessage } from 'element-plus';

/**
 * 财务管理状态管理
 * 包含日常开支、预算管理、统计分析等功能
 */
export const useFinanceStore = defineStore('finance', () => {
  // 状态定义
  const expenses = ref([]);
  const budgets = ref([]);
  const statistics = ref({});
  const reports = ref([]);
  const categories = ref([]);
  
  // 加载状态
  const loading = ref(false);
  const expensesLoading = ref(false);
  const statisticsLoading = ref(false);
  
  // 分页信息
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  // 筛选条件
  const filters = ref({
    villageId: '',
    status: '',
    category: '',
    startDate: '',
    endDate: '',
    keyword: ''
  });
  
  // 计算属性
  const totalExpenses = computed(() => expenses.value.length);
  
  const currentMonthTotal = computed(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return expenses.value
      .filter(expense => {
        const expenseDate = new Date(expense.expenseDate);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear;
      })
      .reduce((total, expense) => total + expense.amount, 0);
  });
  
  const expensesByCategory = computed(() => {
    const categoryMap = new Map();
    
    expenses.value.forEach(expense => {
      const category = expense.expenseCategory;
      if (categoryMap.has(category)) {
        categoryMap.set(category, categoryMap.get(category) + expense.amount);
      } else {
        categoryMap.set(category, expense.amount);
      }
    });
    
    return Object.fromEntries(categoryMap);
  });
  
  const budgetUtilization = computed(() => {
    if (!budgets.value.length) return 0;
    
    const totalBudget = budgets.value.reduce((sum, budget) => sum + budget.totalAmount, 0);
    const usedBudget = budgets.value.reduce((sum, budget) => sum + budget.usedAmount, 0);
    
    return totalBudget > 0 ? (usedBudget / totalBudget * 100).toFixed(2) : 0;
  });
  
  const filteredExpenses = computed(() => {
    let filtered = expenses.value;
    
    // 状态筛选
    if (filters.value.status) {
      filtered = filtered.filter(expense => expense.status === filters.value.status);
    }
    
    // 分类筛选
    if (filters.value.category) {
      filtered = filtered.filter(expense => expense.expenseCategory === filters.value.category);
    }
    
    // 日期范围筛选
    if (filters.value.startDate) {
      filtered = filtered.filter(expense => 
        new Date(expense.expenseDate) >= new Date(filters.value.startDate)
      );
    }
    
    if (filters.value.endDate) {
      filtered = filtered.filter(expense => 
        new Date(expense.expenseDate) <= new Date(filters.value.endDate)
      );
    }
    
    // 关键词搜索
    if (filters.value.keyword) {
      const keyword = filters.value.keyword.toLowerCase();
      filtered = filtered.filter(expense => 
        expense.expenseTitle.toLowerCase().includes(keyword) ||
        expense.description?.toLowerCase().includes(keyword)
      );
    }
    
    return filtered;
  });

  // Actions
  
  /**
   * 获取开支列表
   */
  const fetchExpenses = async (params = {}) => {
    try {
      expensesLoading.value = true;
      
      const queryParams = {
        ...filters.value,
        page: pagination.value.page,
        limit: pagination.value.limit,
        ...params
      };
      
      const response = await dailyExpenseAPI.getExpensesList(queryParams);
      
      if (response.success) {
        expenses.value = response.data.expenses || [];
        pagination.value = {
          page: response.data.page,
          limit: response.data.limit,
          total: response.data.total,
          totalPages: response.data.totalPages
        };
      }
      
      return response;
    } catch (error) {
      console.error('获取开支列表失败:', error);
      ElMessage.error('获取开支列表失败');
      throw error;
    } finally {
      expensesLoading.value = false;
    }
  };
  
  /**
   * 创建开支记录
   */
  const createExpense = async (expenseData) => {
    try {
      loading.value = true;
      
      const response = await dailyExpenseAPI.createExpense(expenseData);
      
      if (response.success) {
        // 添加到列表开头
        expenses.value.unshift(response.data);
        pagination.value.total++;
        
        ElMessage.success('开支记录创建成功');
        
        // 刷新统计数据
        await fetchStatistics();
      }
      
      return response;
    } catch (error) {
      console.error('创建开支记录失败:', error);
      ElMessage.error('创建开支记录失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 更新开支记录
   */
  const updateExpense = async (id, expenseData) => {
    try {
      loading.value = true;
      
      const response = await dailyExpenseAPI.updateExpense(id, expenseData);
      
      if (response.success) {
        // 更新列表中的记录
        const index = expenses.value.findIndex(expense => expense._id === id);
        if (index !== -1) {
          expenses.value[index] = response.data;
        }
        
        ElMessage.success('开支记录更新成功');
        
        // 刷新统计数据
        await fetchStatistics();
      }
      
      return response;
    } catch (error) {
      console.error('更新开支记录失败:', error);
      ElMessage.error('更新开支记录失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 删除开支记录
   */
  const deleteExpense = async (id) => {
    try {
      loading.value = true;
      
      const response = await dailyExpenseAPI.deleteExpense(id);
      
      if (response.success) {
        // 从列表中移除
        const index = expenses.value.findIndex(expense => expense._id === id);
        if (index !== -1) {
          expenses.value.splice(index, 1);
          pagination.value.total--;
        }
        
        ElMessage.success('开支记录删除成功');
        
        // 刷新统计数据
        await fetchStatistics();
      }
      
      return response;
    } catch (error) {
      console.error('删除开支记录失败:', error);
      ElMessage.error('删除开支记录失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 批量审批开支
   */
  const batchApproveExpenses = async (ids, approvalData) => {
    try {
      loading.value = true;
      
      const response = await dailyExpenseAPI.batchApprove(ids, approvalData);
      
      if (response.success) {
        // 更新列表中的记录状态
        expenses.value.forEach(expense => {
          if (ids.includes(expense._id)) {
            expense.status = 'approved';
            expense.approvalProcess.currentStage = 'completed';
          }
        });
        
        ElMessage.success(`成功审批 ${response.data.modified} 条记录`);
        
        // 刷新统计数据
        await fetchStatistics();
      }
      
      return response;
    } catch (error) {
      console.error('批量审批失败:', error);
      ElMessage.error('批量审批失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 获取统计数据
   */
  const fetchStatistics = async (dateRange) => {
    try {
      statisticsLoading.value = true;
      
      const response = await dailyExpenseAPI.getStatistics({
        villageId: filters.value.villageId,
        ...dateRange
      });
      
      if (response.success) {
        statistics.value = response.data;
      }
      
      return response;
    } catch (error) {
      console.error('获取统计数据失败:', error);
      ElMessage.error('获取统计数据失败');
      throw error;
    } finally {
      statisticsLoading.value = false;
    }
  };
  
  /**
   * 获取开支分类
   */
  const fetchCategories = async () => {
    try {
      const response = await dailyExpenseAPI.getCategories();
      
      if (response.success) {
        categories.value = response.data;
      }
      
      return response;
    } catch (error) {
      console.error('获取开支分类失败:', error);
      throw error;
    }
  };
  
  /**
   * OCR识别发票
   */
  const recognizeInvoice = async (file) => {
    try {
      loading.value = true;
      
      const response = await dailyExpenseAPI.recognizeInvoice(file);
      
      if (response.success) {
        ElMessage.success('发票识别成功');
      } else {
        ElMessage.warning('发票识别失败，请手动填写');
      }
      
      return response;
    } catch (error) {
      console.error('发票识别失败:', error);
      ElMessage.error('发票识别失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 导出数据
   */
  const exportExpenses = async (exportParams) => {
    try {
      loading.value = true;
      
      const response = await dailyExpenseAPI.exportExpenses({
        ...filters.value,
        ...exportParams
      });
      
      if (response.success) {
        // 处理文件下载
        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `开支记录_${new Date().toLocaleDateString()}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        ElMessage.success('数据导出成功');
      }
      
      return response;
    } catch (error) {
      console.error('数据导出失败:', error);
      ElMessage.error('数据导出失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 设置筛选条件
   */
  const setFilters = (newFilters) => {
    filters.value = { ...filters.value, ...newFilters };
    pagination.value.page = 1; // 重置页码
  };
  
  /**
   * 清空筛选条件
   */
  const clearFilters = () => {
    filters.value = {
      villageId: filters.value.villageId, // 保留村庄ID
      status: '',
      category: '',
      startDate: '',
      endDate: '',
      keyword: ''
    };
    pagination.value.page = 1;
  };
  
  /**
   * 设置分页
   */
  const setPagination = (newPagination) => {
    pagination.value = { ...pagination.value, ...newPagination };
  };
  
  /**
   * 重置状态
   */
  const resetState = () => {
    expenses.value = [];
    budgets.value = [];
    statistics.value = {};
    reports.value = [];
    categories.value = [];
    loading.value = false;
    expensesLoading.value = false;
    statisticsLoading.value = false;
    
    pagination.value = {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    };
    
    clearFilters();
  };
  
  /**
   * 初始化数据
   */
  const initializeData = async (villageId) => {
    try {
      if (villageId) {
        filters.value.villageId = villageId;
      }
      
      // 并行获取基础数据
      await Promise.all([
        fetchCategories(),
        fetchExpenses(),
        fetchStatistics()
      ]);
    } catch (error) {
      console.error('初始化财务数据失败:', error);
      ElMessage.error('数据加载失败');
    }
  };

  return {
    // 状态
    expenses,
    budgets,
    statistics,
    reports,
    categories,
    loading,
    expensesLoading,
    statisticsLoading,
    pagination,
    filters,
    
    // 计算属性
    totalExpenses,
    currentMonthTotal,
    expensesByCategory,
    budgetUtilization,
    filteredExpenses,
    
    // 方法
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    batchApproveExpenses,
    fetchStatistics,
    fetchCategories,
    recognizeInvoice,
    exportExpenses,
    setFilters,
    clearFilters,
    setPagination,
    resetState,
    initializeData
  };
});