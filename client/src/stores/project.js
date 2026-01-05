import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { projectAPI } from '@/api/project';
import { ElMessage } from 'element-plus';

/**
 * 项目管理状态管理
 * 包含项目全生命周期管理、团队管理、预算控制等功能
 */
export const useProjectStore = defineStore('project', () => {
  // 状态定义
  const projects = ref([]);
  const currentProject = ref(null);
  const projectTypes = ref([]);
  const workflowDefinitions = ref([]);
  const teamMembers = ref([]);
  
  // 加载状态
  const loading = ref(false);
  const projectsLoading = ref(false);
  const workflowLoading = ref(false);
  
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
    projectType: '',
    riskLevel: '',
    startDate: '',
    endDate: '',
    keyword: ''
  });

  // 计算属性
  const totalProjects = computed(() => projects.value.length);
  
  const projectsByStatus = computed(() => {
    const statusMap = new Map();
    
    projects.value.forEach(project => {
      const status = project.status;
      if (statusMap.has(status)) {
        statusMap.set(status, statusMap.get(status) + 1);
      } else {
        statusMap.set(status, 1);
      }
    });
    
    return Object.fromEntries(statusMap);
  });
  
  const projectsByType = computed(() => {
    const typeMap = new Map();
    
    projects.value.forEach(project => {
      const type = project.projectType;
      if (typeMap.has(type)) {
        typeMap.set(type, typeMap.get(type) + 1);
      } else {
        typeMap.set(type, 1);
      }
    });
    
    return Object.fromEntries(typeMap);
  });
  
  const totalBudget = computed(() => {
    return projects.value.reduce((sum, project) => sum + (project.budget?.totalBudget || 0), 0);
  });
  
  const usedBudget = computed(() => {
    return projects.value.reduce((sum, project) => sum + (project.budget?.usedBudget || 0), 0);
  });
  
  const budgetUtilization = computed(() => {
    return totalBudget.value > 0 ? (usedBudget.value / totalBudget.value * 100).toFixed(2) : 0;
  });
  
  const highRiskProjects = computed(() => {
    return projects.value.filter(project => 
      project.riskAssessment?.riskLevel === 'high' || 
      project.riskAssessment?.riskLevel === 'critical'
    );
  });
  
  const overdueProjects = computed(() => {
    const now = new Date();
    return projects.value.filter(project => {
      const endDate = new Date(project.timeline?.endDate);
      return endDate < now && project.status !== 'completed' && project.status !== 'archived';
    });
  });
  
  const filteredProjects = computed(() => {
    let filtered = projects.value;
    
    // 状态筛选
    if (filters.value.status) {
      filtered = filtered.filter(project => project.status === filters.value.status);
    }
    
    // 类型筛选
    if (filters.value.projectType) {
      filtered = filtered.filter(project => project.projectType === filters.value.projectType);
    }
    
    // 风险等级筛选
    if (filters.value.riskLevel) {
      filtered = filtered.filter(project => 
        project.riskAssessment?.riskLevel === filters.value.riskLevel
      );
    }
    
    // 日期范围筛选
    if (filters.value.startDate) {
      filtered = filtered.filter(project => 
        new Date(project.timeline?.startDate) >= new Date(filters.value.startDate)
      );
    }
    
    if (filters.value.endDate) {
      filtered = filtered.filter(project => 
        new Date(project.timeline?.endDate) <= new Date(filters.value.endDate)
      );
    }
    
    // 关键词搜索
    if (filters.value.keyword) {
      const keyword = filters.value.keyword.toLowerCase();
      filtered = filtered.filter(project => 
        project.projectName.toLowerCase().includes(keyword) ||
        project.description?.toLowerCase().includes(keyword)
      );
    }
    
    return filtered;
  });

  // Actions
  
  /**
   * 获取项目列表
   */
  const fetchProjects = async (params = {}) => {
    try {
      projectsLoading.value = true;
      
      const queryParams = {
        ...filters.value,
        page: pagination.value.page,
        limit: pagination.value.limit,
        ...params
      };
      
      const response = await projectAPI.getProjectsList(queryParams);
      
      if (response.success) {
        projects.value = response.data.projects || [];
        pagination.value = {
          page: response.data.page,
          limit: response.data.limit,
          total: response.data.total,
          totalPages: response.data.totalPages
        };
      }
      
      return response;
    } catch (error) {
      console.error('获取项目列表失败:', error);
      ElMessage.error('获取项目列表失败');
      throw error;
    } finally {
      projectsLoading.value = false;
    }
  };
  
  /**
   * 获取项目详情
   */
  const fetchProjectDetail = async (id) => {
    try {
      loading.value = true;
      
      const response = await projectAPI.getProjectDetail(id);
      
      if (response.success) {
        currentProject.value = response.data;
      }
      
      return response;
    } catch (error) {
      console.error('获取项目详情失败:', error);
      ElMessage.error('获取项目详情失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 创建项目
   */
  const createProject = async (projectData) => {
    try {
      loading.value = true;
      
      const response = await projectAPI.createProject(projectData);
      
      if (response.success) {
        // 添加到列表开头
        projects.value.unshift(response.data);
        pagination.value.total++;
        
        ElMessage.success('项目创建成功');
      }
      
      return response;
    } catch (error) {
      console.error('创建项目失败:', error);
      ElMessage.error('创建项目失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 更新项目
   */
  const updateProject = async (id, projectData) => {
    try {
      loading.value = true;
      
      const response = await projectAPI.updateProject(id, projectData);
      
      if (response.success) {
        // 更新列表中的记录
        const index = projects.value.findIndex(project => project._id === id);
        if (index !== -1) {
          projects.value[index] = response.data;
        }
        
        // 更新当前项目
        if (currentProject.value?._id === id) {
          currentProject.value = response.data;
        }
        
        ElMessage.success('项目更新成功');
      }
      
      return response;
    } catch (error) {
      console.error('更新项目失败:', error);
      ElMessage.error('更新项目失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 删除项目
   */
  const deleteProject = async (id) => {
    try {
      loading.value = true;
      
      const response = await projectAPI.deleteProject(id);
      
      if (response.success) {
        // 从列表中移除
        const index = projects.value.findIndex(project => project._id === id);
        if (index !== -1) {
          projects.value.splice(index, 1);
          pagination.value.total--;
        }
        
        // 清空当前项目
        if (currentProject.value?._id === id) {
          currentProject.value = null;
        }
        
        ElMessage.success('项目删除成功');
      }
      
      return response;
    } catch (error) {
      console.error('删除项目失败:', error);
      ElMessage.error('删除项目失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 项目审批
   */
  const approveProject = async (id, approvalData) => {
    try {
      loading.value = true;
      
      const response = await projectAPI.approveProject(id, approvalData);
      
      if (response.success) {
        // 更新项目状态
        const project = projects.value.find(p => p._id === id);
        if (project) {
          project.status = response.data.status;
          project.approvalHistory = response.data.approvalHistory;
        }
        
        if (currentProject.value?._id === id) {
          currentProject.value.status = response.data.status;
          currentProject.value.approvalHistory = response.data.approvalHistory;
        }
        
        ElMessage.success('项目审批成功');
      }
      
      return response;
    } catch (error) {
      console.error('项目审批失败:', error);
      ElMessage.error('项目审批失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 更新项目状态
   */
  const updateProjectStatus = async (id, status, statusData = {}) => {
    try {
      loading.value = true;
      
      const response = await projectAPI.updateProjectStatus(id, { status, ...statusData });
      
      if (response.success) {
        // 更新项目状态
        const project = projects.value.find(p => p._id === id);
        if (project) {
          project.status = status;
          Object.assign(project, response.data);
        }
        
        if (currentProject.value?._id === id) {
          currentProject.value.status = status;
          Object.assign(currentProject.value, response.data);
        }
        
        ElMessage.success('项目状态更新成功');
      }
      
      return response;
    } catch (error) {
      console.error('更新项目状态失败:', error);
      ElMessage.error('更新项目状态失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 分配项目团队
   */
  const assignProjectTeam = async (id, teamData) => {
    try {
      loading.value = true;
      
      const response = await projectAPI.assignTeam(id, teamData);
      
      if (response.success) {
        // 更新项目团队信息
        const project = projects.value.find(p => p._id === id);
        if (project) {
          project.team = response.data.team;
        }
        
        if (currentProject.value?._id === id) {
          currentProject.value.team = response.data.team;
        }
        
        ElMessage.success('团队分配成功');
      }
      
      return response;
    } catch (error) {
      console.error('团队分配失败:', error);
      ElMessage.error('团队分配失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 风险评估
   */
  const assessProjectRisk = async (id, riskData) => {
    try {
      loading.value = true;
      
      const response = await projectAPI.assessRisk(id, riskData);
      
      if (response.success) {
        // 更新风险评估信息
        const project = projects.value.find(p => p._id === id);
        if (project) {
          project.riskAssessment = response.data.riskAssessment;
        }
        
        if (currentProject.value?._id === id) {
          currentProject.value.riskAssessment = response.data.riskAssessment;
        }
        
        ElMessage.success('风险评估完成');
      }
      
      return response;
    } catch (error) {
      console.error('风险评估失败:', error);
      ElMessage.error('风险评估失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 获取项目统计数据
   */
  const fetchProjectStatistics = async (dateRange) => {
    try {
      const response = await projectAPI.getStatistics({
        villageId: filters.value.villageId,
        ...dateRange
      });
      
      return response;
    } catch (error) {
      console.error('获取项目统计失败:', error);
      ElMessage.error('获取项目统计失败');
      throw error;
    }
  };
  
  /**
   * 获取项目类型列表
   */
  const fetchProjectTypes = async () => {
    try {
      const response = await projectAPI.getProjectTypes();
      
      if (response.success) {
        projectTypes.value = response.data;
      }
      
      return response;
    } catch (error) {
      console.error('获取项目类型失败:', error);
      throw error;
    }
  };
  
  /**
   * 获取工作流定义
   */
  const fetchWorkflowDefinitions = async () => {
    try {
      workflowLoading.value = true;
      
      const response = await projectAPI.getWorkflowDefinitions();
      
      if (response.success) {
        workflowDefinitions.value = response.data;
      }
      
      return response;
    } catch (error) {
      console.error('获取工作流定义失败:', error);
      throw error;
    } finally {
      workflowLoading.value = false;
    }
  };
  
  /**
   * 执行工作流
   */
  const executeWorkflow = async (projectId, workflowId, variables) => {
    try {
      loading.value = true;
      
      const response = await projectAPI.executeWorkflow(projectId, {
        workflowId,
        variables
      });
      
      if (response.success) {
        ElMessage.success('工作流执行成功');
      }
      
      return response;
    } catch (error) {
      console.error('工作流执行失败:', error);
      ElMessage.error('工作流执行失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 获取团队成员列表
   */
  const fetchTeamMembers = async () => {
    try {
      const response = await projectAPI.getTeamMembers();
      
      if (response.success) {
        teamMembers.value = response.data;
      }
      
      return response;
    } catch (error) {
      console.error('获取团队成员失败:', error);
      throw error;
    }
  };
  
  /**
   * 生成项目报告
   */
  const generateProjectReport = async (projectId, reportType) => {
    try {
      loading.value = true;
      
      const response = await projectAPI.generateReport(projectId, { type: reportType });
      
      if (response.success) {
        ElMessage.success('报告生成成功');
        
        // 处理文件下载
        if (response.data.downloadUrl) {
          window.open(response.data.downloadUrl, '_blank');
        }
      }
      
      return response;
    } catch (error) {
      console.error('生成项目报告失败:', error);
      ElMessage.error('生成项目报告失败');
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
      projectType: '',
      riskLevel: '',
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
   * 设置当前项目
   */
  const setCurrentProject = (project) => {
    currentProject.value = project;
  };
  
  /**
   * 重置状态
   */
  const resetState = () => {
    projects.value = [];
    currentProject.value = null;
    projectTypes.value = [];
    workflowDefinitions.value = [];
    teamMembers.value = [];
    loading.value = false;
    projectsLoading.value = false;
    workflowLoading.value = false;
    
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
        fetchProjectTypes(),
        fetchWorkflowDefinitions(),
        fetchTeamMembers(),
        fetchProjects()
      ]);
    } catch (error) {
      console.error('初始化项目数据失败:', error);
      ElMessage.error('数据加载失败');
    }
  };

  return {
    // 状态
    projects,
    currentProject,
    projectTypes,
    workflowDefinitions,
    teamMembers,
    loading,
    projectsLoading,
    workflowLoading,
    pagination,
    filters,
    
    // 计算属性
    totalProjects,
    projectsByStatus,
    projectsByType,
    totalBudget,
    usedBudget,
    budgetUtilization,
    highRiskProjects,
    overdueProjects,
    filteredProjects,
    
    // 方法
    fetchProjects,
    fetchProjectDetail,
    createProject,
    updateProject,
    deleteProject,
    approveProject,
    updateProjectStatus,
    assignProjectTeam,
    assessProjectRisk,
    fetchProjectStatistics,
    fetchProjectTypes,
    fetchWorkflowDefinitions,
    executeWorkflow,
    fetchTeamMembers,
    generateProjectReport,
    setFilters,
    clearFilters,
    setPagination,
    setCurrentProject,
    resetState,
    initializeData
  };
});