import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { dutyApi } from '@/api/duty';

export const useDutyStore = defineStore('duty', () => {
  // 状态
  const dutyPersonnel = ref([]);
  const dutySchedules = ref([]);
  const currentMonth = ref(new Date());
  const selectedDate = ref(null);
  const statistics = ref({
    totalDuties: 0,
    completedDuties: 0,
    upcomingDuties: 0,
    personnelCount: 0,
    workloadDistribution: [],
    monthlyStats: []
  });
  const loading = ref(false);
  const calendarLoading = ref(false);

  // 计算属性
  const currentMonthSchedules = computed(() => {
    const year = currentMonth.value.getFullYear();
    const month = currentMonth.value.getMonth();

    return dutySchedules.value.filter(schedule => {
      const scheduleDate = new Date(schedule.date);
      return scheduleDate.getFullYear() === year &&
             scheduleDate.getMonth() === month;
    });
  });

  const personnelById = computed(() => {
    const map = {};
    dutyPersonnel.value.forEach(person => {
      map[person.id] = person;
    });
    return map;
  });

  const availablePersonnel = computed(() => {
    return dutyPersonnel.value.filter(person => person.isActive && !person.isOnLeave);
  });

  // 方法
  const fetchDutyPersonnel = async () => {
    try {
      loading.value = true;
      const response = await dutyApi.getPersonnel();
      dutyPersonnel.value = response.data;
    } catch (error) {
      console.error('获取值班人员失败:', error);
      ElMessage.error('获取值班人员列表失败');
    } finally {
      loading.value = false;
    }
  };

  const fetchDutySchedules = async (startDate, endDate) => {
    try {
      calendarLoading.value = true;
      const response = await dutyApi.getSchedules(startDate, endDate);
      dutySchedules.value = response.data;
    } catch (error) {
      console.error('获取值班安排失败:', error);
      ElMessage.error('获取值班安排失败');
    } finally {
      calendarLoading.value = false;
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await dutyApi.getStatistics();
      statistics.value = response.data;
    } catch (error) {
      console.error('获取统计数据失败:', error);
      ElMessage.error('获取统计数据失败');
    }
  };

  const addPersonnel = async (personnelData) => {
    try {
      const response = await dutyApi.addPersonnel(personnelData);
      dutyPersonnel.value.push(response.data);
      ElMessage.success('添加值班人员成功');
      return response.data;
    } catch (error) {
      console.error('添加值班人员失败:', error);
      ElMessage.error(error.response?.data?.message || '添加值班人员失败');
      throw error;
    }
  };

  const updatePersonnel = async (id, personnelData) => {
    try {
      const response = await dutyApi.updatePersonnel(id, personnelData);
      const index = dutyPersonnel.value.findIndex(p => p.id === id);
      if (index !== -1) {
        dutyPersonnel.value[index] = { ...dutyPersonnel.value[index], ...response.data };
      }
      ElMessage.success('更新值班人员信息成功');
      return response.data;
    } catch (error) {
      console.error('更新值班人员失败:', error);
      ElMessage.error(error.response?.data?.message || '更新值班人员失败');
      throw error;
    }
  };

  const deletePersonnel = async (id) => {
    try {
      await dutyApi.deletePersonnel(id);
      dutyPersonnel.value = dutyPersonnel.value.filter(p => p.id !== id);
      ElMessage.success('删除值班人员成功');
    } catch (error) {
      console.error('删除值班人员失败:', error);
      ElMessage.error(error.response?.data?.message || '删除值班人员失败');
      throw error;
    }
  };

  const createSchedule = async (scheduleData) => {
    try {
      const response = await dutyApi.createSchedule(scheduleData);
      dutySchedules.value.push(response.data);
      ElMessage.success('创建值班安排成功');
      return response.data;
    } catch (error) {
      console.error('创建值班安排失败:', error);
      ElMessage.error(error.response?.data?.message || '创建值班安排失败');
      throw error;
    }
  };

  const updateSchedule = async (id, scheduleData) => {
    try {
      const response = await dutyApi.updateSchedule(id, scheduleData);
      const index = dutySchedules.value.findIndex(s => s.id === id);
      if (index !== -1) {
        dutySchedules.value[index] = { ...dutySchedules.value[index], ...response.data };
      }
      ElMessage.success('更新值班安排成功');
      return response.data;
    } catch (error) {
      console.error('更新值班安排失败:', error);
      ElMessage.error(error.response?.data?.message || '更新值班安排失败');
      throw error;
    }
  };

  const deleteSchedule = async (id) => {
    try {
      await dutyApi.deleteSchedule(id);
      dutySchedules.value = dutySchedules.value.filter(s => s.id !== id);
      ElMessage.success('删除值班安排成功');
    } catch (error) {
      console.error('删除值班安排失败:', error);
      ElMessage.error(error.response?.data?.message || '删除值班安排失败');
      throw error;
    }
  };

  const batchCreateSchedules = async (schedulesData) => {
    try {
      const response = await dutyApi.batchCreateSchedules(schedulesData);
      dutySchedules.value.push(...response.data);
      ElMessage.success(`成功创建 ${response.data.length} 个值班安排`);
      return response.data;
    } catch (error) {
      console.error('批量创建值班安排失败:', error);
      ElMessage.error(error.response?.data?.message || '批量创建值班安排失败');
      throw error;
    }
  };

  const getRecommendedPersonnel = async (date, shiftType) => {
    try {
      const response = await dutyApi.getRecommendedPersonnel(date, shiftType);
      return response.data;
    } catch (error) {
      console.error('获取推荐人员失败:', error);
      ElMessage.error('获取推荐人员失败');
      return [];
    }
  };

  const swapSchedule = async (scheduleId1, scheduleId2) => {
    try {
      const response = await dutyApi.swapSchedule(scheduleId1, scheduleId2);
      const { schedule1, schedule2 } = response.data;

      const index1 = dutySchedules.value.findIndex(s => s.id === scheduleId1);
      const index2 = dutySchedules.value.findIndex(s => s.id === scheduleId2);

      if (index1 !== -1) dutySchedules.value[index1] = schedule1;
      if (index2 !== -1) dutySchedules.value[index2] = schedule2;

      ElMessage.success('调班成功');
      return response.data;
    } catch (error) {
      console.error('调班失败:', error);
      ElMessage.error(error.response?.data?.message || '调班失败');
      throw error;
    }
  };

  const generateQRCode = async (personnelId) => {
    try {
      const response = await dutyApi.generateQRCode(personnelId);
      return response.data.qrCode;
    } catch (error) {
      console.error('生成二维码失败:', error);
      ElMessage.error('生成二维码失败');
      throw error;
    }
  };

  const exportScheduleReport = async (startDate, endDate) => {
    try {
      const response = await dutyApi.exportReport(startDate, endDate);
      // 创建下载链接
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `值班报表_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      ElMessage.success('导出报表成功');
    } catch (error) {
      console.error('导出报表失败:', error);
      ElMessage.error('导出报表失败');
    }
  };

  // 初始化方法
  const init = async () => {
    await Promise.all([
      fetchDutyPersonnel(),
      fetchStatistics()
    ]);
  };

  // 切换月份
  const changeMonth = (date) => {
    currentMonth.value = date;
    const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    fetchDutySchedules(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
  };

  return {
    // 状态
    dutyPersonnel,
    dutySchedules,
    currentMonth,
    selectedDate,
    statistics,
    loading,
    calendarLoading,

    // 计算属性
    currentMonthSchedules,
    personnelById,
    availablePersonnel,

    // 方法
    fetchDutyPersonnel,
    fetchDutySchedules,
    fetchStatistics,
    addPersonnel,
    updatePersonnel,
    deletePersonnel,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    batchCreateSchedules,
    getRecommendedPersonnel,
    swapSchedule,
    generateQRCode,
    exportScheduleReport,
    init,
    changeMonth
  };
});