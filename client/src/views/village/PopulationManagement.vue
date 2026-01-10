<template>
  <div class="population-management">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1>人口管理</h1>
        <p>村民分组管理和人口变动记录</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showGroupDialog">
          <el-icon><Plus /></el-icon>
          创建分组
        </el-button>
        <el-button type="success" @click="showChangeDialog">
          <el-icon><DocumentAdd /></el-icon>
          人口变动
        </el-button>
      </div>
    </header>

    <!-- 统计概览 -->
    <section class="stats-section">
      <div class="stats-grid">
        <div class="stat-card groups">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <div class="stat-number">{{ populationStats.totalGroups }}</div>
            <div class="stat-label">分组总数</div>
          </div>
        </div>
        <div class="stat-card members">
          <div class="stat-icon">👤</div>
          <div class="stat-info">
            <div class="stat-number">{{ populationStats.totalGroupMembers }}</div>
            <div class="stat-label">分组总人数</div>
          </div>
        </div>
        <div class="stat-card changes">
          <div class="stat-icon">📝</div>
          <div class="stat-info">
            <div class="stat-number">{{ populationStats.total }}</div>
            <div class="stat-label">变动记录总数</div>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <div class="stat-number">{{ populationStats.changesByStatus?.pending || 0 }}</div>
            <div class="stat-label">待审核变动</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="tabs-section">
      <!-- 分组管理标签页 -->
      <el-tab-pane label="分组管理" name="groups">
        <div class="tab-header">
          <div class="filter-options">
            <el-select
              v-model="groupFilter.type"
              placeholder="分组类型"
              clearable
              @change="loadGroups"
            >
              <el-option label="全部" value="" />
              <el-option label="特殊关怀组" value="special_care" />
              <el-option label="动态监测户" value="dynamic_monitoring" />
              <el-option label="党员" value="party_member" />
              <el-option label="志愿者" value="volunteer" />
              <el-option label="网格责任" value="grid_responsibility" />
              <el-option label="自定义" value="custom" />
            </el-select>
          </div>
        </div>

        <div class="groups-grid">
          <el-card v-for="group in groups" :key="group._id" class="group-card">
            <div class="group-header">
              <div class="group-icon">{{ getGroupIcon(group.groupType) }}</div>
              <div class="group-info">
                <h3>{{ group.groupName }}</h3>
                <el-tag :type="getGroupTypeColor(group.groupType)" size="small">
                  {{ getGroupTypeName(group.groupType) }}
                </el-tag>
              </div>
              <div class="group-actions">
                <el-dropdown @command="handleGroupAction">
                  <el-button type="text">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="{ action: 'members', group }">
                        <el-icon><User /></el-icon> 管理成员
                      </el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'edit', group }">
                        <el-icon><Edit /></el-icon> 编辑
                      </el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'delete', group }" divided>
                        <el-icon><Delete /></el-icon> 删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
            <div class="group-stats">
              <div class="stat-item">
                <span class="label">成员数:</span>
                <span class="value">{{ group.memberCount || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="label">关怀计划:</span>
                <el-tag :type="group.carePlan?.enabled ? 'success' : 'info'" size="small">
                  {{ group.carePlan?.enabled ? '已启用' : '未启用' }}
                </el-tag>
              </div>
              <div class="stat-item">
                <span class="label">创建时间:</span>
                <span class="value">{{ formatDate(group.createdAt) }}</span>
              </div>
            </div>
          </el-card>
        </div>

        <el-empty v-if="groups.length === 0" description="暂无分组" />
      </el-tab-pane>

      <!-- 人口变动标签页 -->
      <el-tab-pane label="人口变动" name="changes">
        <div class="tab-header">
          <div class="filter-options">
            <el-select
              v-model="changeFilter.type"
              placeholder="变动类型"
              clearable
              @change="loadChanges"
            >
              <el-option label="全部" value="" />
              <el-option label="新生儿出生" value="birth" />
              <el-option label="婚入" value="marriage_in" />
              <el-option label="婚出" value="marriage_out" />
              <el-option label="死亡" value="death" />
              <el-option label="迁入" value="move_in" />
              <el-option label="迁出" value="move_out" />
            </el-select>
            <el-select
              v-model="changeFilter.status"
              placeholder="状态"
              clearable
              @change="loadChanges"
            >
              <el-option label="全部" value="" />
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
          </div>
        </div>

        <div class="changes-list">
          <el-card v-for="change in changes" :key="change._id" class="change-card">
            <div class="change-header">
              <div class="change-info">
                <el-tag :type="getChangeStatusType(change.status)" size="small">
                  {{ getChangeStatusText(change.status) }}
                </el-tag>
                <span class="change-id">{{ change.changeId }}</span>
              </div>
              <div class="change-actions">
                <el-button
                  v-if="canReviewChange(change)"
                  type="primary"
                  size="small"
                  @click="reviewChange(change)"
                >
                  审核
                </el-button>
                <el-button size="small" @click="viewChangeDetail(change)"> 详情 </el-button>
              </div>
            </div>
            <div class="change-content">
              <div class="change-type">
                <span class="icon">{{ getChangeIcon(change.changeType) }}</span>
                <span class="text">{{ getChangeTypeName(change.changeType) }}</span>
              </div>
              <div class="change-person">
                <div class="person-item">
                  <span class="label">姓名:</span>
                  <span class="value">{{ change.personInfo?.name }}</span>
                </div>
                <div class="person-item">
                  <span class="label">身份证:</span>
                  <span class="value">{{ maskIdCard(change.personInfo?.idCard) }}</span>
                </div>
                <div class="person-item">
                  <span class="label">关系:</span>
                  <span class="value">{{ change.personInfo?.relation }}</span>
                </div>
              </div>
              <div class="change-meta">
                <div class="meta-item">
                  <span class="label">变动日期:</span>
                  <span class="value">{{ formatDate(change.changeDate) }}</span>
                </div>
                <div class="meta-item">
                  <span class="label">提交人:</span>
                  <span class="value">{{ change.submittedBy?.name }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <el-empty v-if="changes.length === 0" description="暂无变动记录" />
      </el-tab-pane>
    </el-tabs>

    <!-- 创建分组对话框 -->
    <el-dialog
      v-model="groupDialogVisible"
      title="创建村民分组"
      width="600px"
      @close="resetGroupForm"
    >
      <el-form :model="groupForm" :rules="groupRules" ref="groupFormRef" label-width="120px">
        <el-form-item label="分组名称" prop="groupName">
          <el-input v-model="groupForm.groupName" placeholder="请输入分组名称" />
        </el-form-item>
        <el-form-item label="分组类型" prop="groupType">
          <el-select v-model="groupForm.groupType" placeholder="请选择分组类型">
            <el-option label="特殊关怀组" value="special_care" />
            <el-option label="动态监测户" value="dynamic_monitoring" />
            <el-option label="党员" value="party_member" />
            <el-option label="志愿者" value="volunteer" />
            <el-option label="网格责任" value="grid_responsibility" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="村庄ID" prop="villageId">
          <el-input v-model="groupForm.villageId" placeholder="请输入村庄ID" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="groupForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="启用关怀计划">
          <el-switch v-model="groupForm.carePlanEnabled" />
        </el-form-item>
        <el-form-item v-if="groupForm.carePlanEnabled" label="关怀频率">
          <el-select v-model="groupForm.carePlanFrequency">
            <el-option label="每日" value="daily" />
            <el-option label="每周" value="weekly" />
            <el-option label="每月" value="monthly" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitGroup">创建</el-button>
      </template>
    </el-dialog>

    <!-- 人口变动对话框 -->
    <el-dialog
      v-model="changeDialogVisible"
      title="提交人口变动"
      width="600px"
      @close="resetChangeForm"
    >
      <el-form :model="changeForm" :rules="changeRules" ref="changeFormRef" label-width="120px">
        <el-form-item label="变动类型" prop="changeType">
          <el-select v-model="changeForm.changeType" placeholder="请选择变动类型">
            <el-option label="新生儿出生" value="birth" />
            <el-option label="婚入" value="marriage_in" />
            <el-option label="婚出" value="marriage_out" />
            <el-option label="死亡" value="death" />
            <el-option label="迁入" value="move_in" />
            <el-option label="迁出" value="move_out" />
          </el-select>
        </el-form-item>
        <el-form-item label="村庄ID" prop="villageId">
          <el-input v-model="changeForm.villageId" placeholder="请输入村庄ID" />
        </el-form-item>
        <el-form-item label="家庭ID" prop="householdId">
          <el-input v-model="changeForm.householdId" placeholder="请输入家庭ID" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="changeForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="身份证号" prop="idCard">
          <el-input v-model="changeForm.idCard" placeholder="请输入身份证号" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="changeForm.gender">
            <el-radio label="male">男</el-radio>
            <el-radio label="female">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="出生日期" prop="birthDate" v-if="changeForm.changeType === 'birth'">
          <el-date-picker v-model="changeForm.birthDate" type="date" />
        </el-form-item>
        <el-form-item label="与户主关系" prop="relation">
          <el-select v-model="changeForm.relation" placeholder="请选择关系">
            <el-option label="户主" value="户主" />
            <el-option label="配偶" value="配偶" />
            <el-option label="子女" value="子女" />
            <el-option label="父母" value="父母" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="变动日期" prop="changeDate">
          <el-date-picker v-model="changeForm.changeDate" type="date" />
        </el-form-item>
        <el-form-item label="自动更新家庭档案">
          <el-switch v-model="changeForm.autoUpdateHousehold" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="changeForm.notes" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="changeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitChange">提交</el-button>
      </template>
    </el-dialog>

    <!-- 审核变动对话框 -->
    <el-dialog v-model="reviewChangeDialogVisible" title="审核人口变动" width="500px">
      <div v-if="currentChange" class="review-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="变动ID">{{ currentChange.changeId }}</el-descriptions-item>
          <el-descriptions-item label="变动类型">
            {{ getChangeTypeName(currentChange.changeType) }}
          </el-descriptions-item>
          <el-descriptions-item label="姓名">{{
            currentChange.personInfo?.name
          }}</el-descriptions-item>
          <el-descriptions-item label="身份证">
            {{ currentChange.personInfo?.idCard }}
          </el-descriptions-item>
          <el-descriptions-item label="变动日期">
            {{ formatDate(currentChange.changeDate) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <el-form style="margin-top: 20px">
        <el-form-item label="审核意见">
          <el-input
            v-model="reviewForm.comments"
            type="textarea"
            :rows="3"
            placeholder="请输入审核意见"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewChangeDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleReviewChange('reject')">驳回</el-button>
        <el-button type="primary" @click="handleReviewChange('approve')">通过</el-button>
      </template>
    </el-dialog>

    <!-- 管理成员对话框 -->
    <el-dialog
      v-model="membersDialogVisible"
      :title="`管理成员 - ${currentGroup?.groupName}`"
      width="700px"
    >
      <div class="members-manage">
        <el-button type="primary" size="small" @click="showAddMembersDialog">
          <el-icon><Plus /></el-icon> 添加成员
        </el-button>
        <el-table :data="currentGroup?.members || []" style="margin-top: 1rem">
          <el-table-column prop="userId.name" label="姓名" />
          <el-table-column prop="userId.phone" label="手机号">
            <template #default="scope">
              {{ maskPhone(scope.row.userId?.phone) }}
            </template>
          </el-table-column>
          <el-table-column prop="joinedAt" label="加入时间">
            <template #default="scope">
              {{ formatDate(scope.row.joinedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="scope">
              <el-button type="danger" size="small" @click="removeGroupMember(scope.row)">
                移除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="membersDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, DocumentAdd, MoreFilled, User, Edit, Delete } from '@element-plus/icons-vue';
import axios from 'axios';

// API基础URL
const API_BASE = 'http://localhost:3001/api';

// 响应式数据
const activeTab = ref('groups');
const groupDialogVisible = ref(false);
const changeDialogVisible = ref(false);
const reviewChangeDialogVisible = ref(false);
const membersDialogVisible = ref(false);

const groups = ref([]);
const changes = ref([]);
const currentGroup = ref(null);
const currentChange = ref(null);

// 统计数据
const populationStats = reactive({
  totalGroups: 0,
  totalGroupMembers: 0,
  total: 0,
  changesByStatus: {},
});

// 筛选条件
const groupFilter = reactive({
  type: '',
});

const changeFilter = reactive({
  type: '',
  status: '',
});

// 分组表单
const groupForm = reactive({
  groupName: '',
  groupType: '',
  villageId: '',
  description: '',
  carePlanEnabled: false,
  carePlanFrequency: 'weekly',
});

const groupRules = {
  groupName: [{ required: true, message: '请输入分组名称', trigger: 'blur' }],
  groupType: [{ required: true, message: '请选择分组类型', trigger: 'change' }],
  villageId: [{ required: true, message: '请输入村庄ID', trigger: 'blur' }],
};

const groupFormRef = ref(null);

// 变动表单
const changeForm = reactive({
  changeType: '',
  villageId: '',
  householdId: '',
  name: '',
  idCard: '',
  gender: '',
  birthDate: '',
  relation: '',
  changeDate: '',
  autoUpdateHousehold: true,
  notes: '',
});

const changeRules = {
  changeType: [{ required: true, message: '请选择变动类型', trigger: 'change' }],
  villageId: [{ required: true, message: '请输入村庄ID', trigger: 'blur' }],
  householdId: [{ required: true, message: '请输入家庭ID', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  idCard: [{ required: true, message: '请输入身份证号', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  relation: [{ required: true, message: '请选择关系', trigger: 'change' }],
  changeDate: [{ required: true, message: '请选择变动日期', trigger: 'change' }],
};

const changeFormRef = ref(null);

// 审核表单
const reviewForm = reactive({
  comments: '',
});

// 获取Token
const getToken = () => {
  return localStorage.getItem('token') || '';
};

// Axios配置
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      ElMessage.error('登录已过期,请重新登录');
    } else if (error.response?.status === 403) {
      ElMessage.error('权限不足');
    } else {
      ElMessage.error(error.response?.data?.message || '请求失败');
    }
    return Promise.reject(error);
  }
);

// 加载统计数据
const loadStatistics = async () => {
  try {
    const response = await apiClient.get('/population/statistics');
    if (response.data.success) {
      Object.assign(populationStats, response.data.data);
    }
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
};

// 加载分组列表
const loadGroups = async () => {
  try {
    const params = {};
    if (groupFilter.type) {
      params.groupType = groupFilter.type;
    }
    const response = await apiClient.get('/population/groups', { params });
    if (response.data.success) {
      groups.value = response.data.data.groups || [];
    }
  } catch (error) {
    console.error('加载分组列表失败:', error);
  }
};

// 加载变动列表
const loadChanges = async () => {
  try {
    const params = {};
    if (changeFilter.type) params.changeType = changeFilter.type;
    if (changeFilter.status) params.status = changeFilter.status;

    const response = await apiClient.get('/population/changes', { params });
    if (response.data.success) {
      changes.value = response.data.data.changes || [];
    }
  } catch (error) {
    console.error('加载变动列表失败:', error);
  }
};

// 提交分组
const submitGroup = async () => {
  if (!groupFormRef.value) return;

  try {
    await groupFormRef.value.validate();
    const data = {
      groupName: groupForm.groupName,
      groupType: groupForm.groupType,
      villageId: groupForm.villageId,
      description: groupForm.description,
      carePlan: {
        enabled: groupForm.carePlanEnabled,
        frequency: groupForm.carePlanFrequency,
      },
    };
    const response = await apiClient.post('/population/groups', data);
    if (response.data.success) {
      ElMessage.success('分组创建成功');
      groupDialogVisible.value = false;
      resetGroupForm();
      loadGroups();
      loadStatistics();
    }
  } catch (error) {
    console.error('创建分组失败:', error);
  }
};

// 提交变动
const submitChange = async () => {
  if (!changeFormRef.value) return;

  try {
    await changeFormRef.value.validate();
    const data = {
      changeType: changeForm.changeType,
      villageId: changeForm.villageId,
      householdId: changeForm.householdId,
      personInfo: {
        name: changeForm.name,
        idCard: changeForm.idCard,
        gender: changeForm.gender,
        birthDate: changeForm.birthDate,
        relation: changeForm.relation,
      },
      changeDate: changeForm.changeDate,
      autoUpdateHousehold: changeForm.autoUpdateHousehold,
      notes: changeForm.notes,
    };
    const response = await apiClient.post('/population/changes', data);
    if (response.data.success) {
      ElMessage.success('变动申请提交成功');
      changeDialogVisible.value = false;
      resetChangeForm();
      loadChanges();
      loadStatistics();
    }
  } catch (error) {
    console.error('提交变动失败:', error);
  }
};

// 审核变动
const reviewChange = change => {
  currentChange.value = change;
  reviewChangeDialogVisible.value = true;
};

const handleReviewChange = async decision => {
  if (!currentChange.value) return;

  try {
    const response = await apiClient.put(
      `/population/changes/${currentChange.value.changeId}/review`,
      {
        decision,
        reviewNotes: reviewForm.comments,
      }
    );
    if (response.data.success) {
      ElMessage.success(decision === 'approve' ? '审核通过' : '已驳回');
      reviewChangeDialogVisible.value = false;
      reviewForm.comments = '';
      loadChanges();
      loadStatistics();
    }
  } catch (error) {
    console.error('审核失败:', error);
  }
};

// 查看详情
const viewChangeDetail = change => {
  ElMessageBox.alert(
    `
    <p><strong>变动ID:</strong> ${change.changeId}</p>
    <p><strong>变动类型:</strong> ${getChangeTypeName(change.changeType)}</p>
    <p><strong>姓名:</strong> ${change.personInfo?.name}</p>
    <p><strong>身份证:</strong> ${change.personInfo?.idCard}</p>
    <p><strong>关系:</strong> ${change.personInfo?.relation}</p>
    <p><strong>变动日期:</strong> ${formatDate(change.changeDate)}</p>
    <p><strong>自动更新家庭档案:</strong> ${change.autoUpdateHousehold ? '是' : '否'}</p>
    <p><strong>备注:</strong> ${change.notes || '无'}</p>
    `,
    '变动详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭',
    }
  );
};

// 处理分组操作
const handleGroupAction = ({ action, group }) => {
  switch (action) {
    case 'members':
      manageMembers(group);
      break;
    case 'edit':
      ElMessage.info('编辑功能开发中');
      break;
    case 'delete':
      deleteGroup(group);
      break;
  }
};

// 管理成员
const manageMembers = async group => {
  try {
    const response = await apiClient.get(`/population/groups/${group.groupId}`);
    if (response.data.success) {
      currentGroup.value = response.data.data;
      membersDialogVisible.value = true;
    }
  } catch (error) {
    console.error('加载分组详情失败:', error);
  }
};

// 删除分组
const deleteGroup = async group => {
  try {
    await ElMessageBox.confirm(`确定要删除分组 "${group.groupName}" 吗?`, '确认操作', {
      type: 'warning',
    });
    const response = await apiClient.delete(`/population/groups/${group.groupId}`);
    if (response.data.success) {
      ElMessage.success('分组已删除');
      loadGroups();
      loadStatistics();
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除分组失败:', error);
    }
  }
};

// 移除分组成员
const removeGroupMember = async member => {
  if (!currentGroup.value) return;

  try {
    await ElMessageBox.confirm('确定要移除此成员吗?', '确认操作', {
      type: 'warning',
    });
    const response = await apiClient.delete(
      `/population/groups/${currentGroup.value.groupId}/members/${member.userId}`
    );
    if (response.data.success) {
      ElMessage.success('成员已移除');
      manageMembers(currentGroup.value);
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('移除成员失败:', error);
    }
  }
};

// 工具函数
const getGroupIcon = type => {
  const iconMap = {
    special_care: '❤️',
    dynamic_monitoring: '👁️',
    party_member: '🌟',
    volunteer: '🤝',
    grid_responsibility: '🏘️',
    custom: '📁',
  };
  return iconMap[type] || '👥';
};

const getGroupTypeName = type => {
  const nameMap = {
    special_care: '特殊关怀组',
    dynamic_monitoring: '动态监测户',
    party_member: '党员',
    volunteer: '志愿者',
    grid_responsibility: '网格责任',
    custom: '自定义',
  };
  return nameMap[type] || type;
};

const getGroupTypeColor = type => {
  const colorMap = {
    special_care: 'danger',
    dynamic_monitoring: 'warning',
    party_member: 'success',
    volunteer: 'primary',
    grid_responsibility: 'info',
    custom: '',
  };
  return colorMap[type] || '';
};

const getChangeIcon = type => {
  const iconMap = {
    birth: '👶',
    marriage_in: '💒',
    marriage_out: '💔',
    death: '🕊️',
    move_in: '📥',
    move_out: '📤',
  };
  return iconMap[type] || '📝';
};

const getChangeTypeName = type => {
  const nameMap = {
    birth: '新生儿出生',
    marriage_in: '婚入',
    marriage_out: '婚出',
    death: '死亡',
    move_in: '迁入',
    move_out: '迁出',
  };
  return nameMap[type] || type;
};

const getChangeStatusType = status => {
  const typeMap = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
  };
  return typeMap[status] || 'info';
};

const getChangeStatusText = status => {
  const textMap = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已驳回',
  };
  return textMap[status] || '未知';
};

const formatDate = dateString => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('zh-CN');
};

const maskIdCard = idCard => {
  if (!idCard) return '-';
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
};

const maskPhone = phone => {
  if (!phone) return '-';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

const canReviewChange = change => {
  return change.status === 'pending';
};

// 重置表单
const resetGroupForm = () => {
  Object.assign(groupForm, {
    groupName: '',
    groupType: '',
    villageId: '',
    description: '',
    carePlanEnabled: false,
    carePlanFrequency: 'weekly',
  });
  if (groupFormRef.value) {
    groupFormRef.value.resetFields();
  }
};

const resetChangeForm = () => {
  Object.assign(changeForm, {
    changeType: '',
    villageId: '',
    householdId: '',
    name: '',
    idCard: '',
    gender: '',
    birthDate: '',
    relation: '',
    changeDate: '',
    autoUpdateHousehold: true,
    notes: '',
  });
  if (changeFormRef.value) {
    changeFormRef.value.resetFields();
  }
};

const showGroupDialog = () => {
  groupDialogVisible.value = true;
};

const showChangeDialog = () => {
  changeDialogVisible.value = true;
};

const showAddMembersDialog = () => {
  ElMessage.info('添加成员功能开发中，请使用用户ID添加');
};

// 生命周期
onMounted(() => {
  loadStatistics();
  loadGroups();
  loadChanges();
});
</script>

<style scoped>
.population-management {
  padding: 2rem;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.75rem;
}

.header-content p {
  margin: 0;
  color: #7f8c8d;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.stats-section {
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  font-size: 2rem;
}

.stat-number {
  font-size: 1.75rem;
  font-weight: 700;
  color: #2c3e50;
}

.stat-label {
  color: #7f8c8d;
  font-size: 0.875rem;
}

.tabs-section {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.filter-options {
  display: flex;
  gap: 1rem;
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.group-card {
  transition: transform 0.2s;
}

.group-card:hover {
  transform: translateY(-5px);
}

.group-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.group-icon {
  font-size: 2.5rem;
}

.group-info {
  flex: 1;
}

.group-info h3 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.group-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-item .label {
  font-size: 0.875rem;
  color: #7f8c8d;
}

.stat-item .value {
  color: #2c3e50;
  font-weight: 500;
}

.changes-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.change-card {
  transition: transform 0.2s;
}

.change-card:hover {
  transform: translateX(5px);
}

.change-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.change-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.change-id {
  color: #7f8c8d;
  font-size: 0.875rem;
}

.change-actions {
  display: flex;
  gap: 0.5rem;
}

.change-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.change-type {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
}

.change-person,
.change-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
}

.person-item,
.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.person-item .label,
.meta-item .label {
  font-size: 0.875rem;
  color: #7f8c8d;
}

.person-item .value,
.meta-item .value {
  color: #2c3e50;
  font-weight: 500;
}

.review-content {
  margin-bottom: 1rem;
}

.members-manage {
  max-height: 500px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .population-management {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .groups-grid {
    grid-template-columns: 1fr;
  }

  .filter-options {
    flex-direction: column;
  }
}
</style>
