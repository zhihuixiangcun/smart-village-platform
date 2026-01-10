<template>
  <div class="committee-management">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1>村委管理</h1>
        <p>管理村委成员信息、职务分配和党员档案</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showAddMemberDialog">
          <el-icon><Plus /></el-icon>
          添加成员
        </el-button>
        <el-button @click="exportData">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </div>
    </header>

    <!-- 统计卡片 -->
    <section class="stats-section">
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ statistics.total }}</div>
            <div class="stat-label">总人数</div>
          </div>
        </div>
        <div class="stat-card party">
          <div class="stat-icon">
            <el-icon><Star /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ statistics.partyMembers }}</div>
            <div class="stat-label">党员</div>
          </div>
        </div>
        <div class="stat-card on-duty">
          <div class="stat-icon">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ statistics.onDuty }}</div>
            <div class="stat-label">今日值班</div>
          </div>
        </div>
        <div class="stat-card active">
          <div class="stat-icon">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ statistics.active }}</div>
            <div class="stat-label">在职人员</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 筛选和搜索 -->
    <section class="filter-section">
      <div class="filter-content">
        <div class="search-bar">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索姓名、职务、手机号..."
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="filter-options">
          <el-select
            v-model="filterPosition"
            placeholder="职务筛选"
            clearable
            @change="handleFilter"
          >
            <el-option label="全部" value="" />
            <el-option label="村支书" value="村支书" />
            <el-option label="村主任" value="村主任" />
            <el-option label="村会计" value="村会计" />
            <el-option label="村副主任" value="村副主任" />
            <el-option label="妇女主任" value="妇女主任" />
            <el-option label="治保主任" value="治保主任" />
          </el-select>
          <el-select
            v-model="filterPartyStatus"
            placeholder="党员状态"
            clearable
            @change="handleFilter"
          >
            <el-option label="全部" value="" />
            <el-option label="党员" value="是" />
            <el-option label="群众" value="否" />
          </el-select>
          <el-select v-model="filterStatus" placeholder="在职状态" clearable @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="在职" value="active" />
            <el-option label="调离" value="transferred" />
            <el-option label="退休" value="retired" />
          </el-select>
        </div>
      </div>
    </section>

    <!-- 成员列表 -->
    <section class="members-section">
      <div class="members-grid">
        <div class="member-card" v-for="member in filteredMembers" :key="member.id">
          <div class="member-header">
            <el-avatar :size="60" :src="member.avatar">
              {{ member.name.charAt(0) }}
            </el-avatar>
            <div class="member-basic">
              <h3>{{ member.name }}</h3>
              <p class="position">{{ member.position }}</p>
              <div class="member-tags">
                <el-tag v-if="member.isPartyMember" type="danger" size="small">党员</el-tag>
                <el-tag :type="getStatusType(member.status)" size="small">
                  {{ getStatusText(member.status) }}
                </el-tag>
                <el-tag v-if="member.isOnDuty" type="warning" size="small">值班中</el-tag>
              </div>
            </div>
            <div class="member-actions">
              <el-dropdown @command="handleAction">
                <el-button type="text">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="{ action: 'edit', member }">
                      <el-icon><Edit /></el-icon> 编辑
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'transfer', member }">
                      <el-icon><Switch /></el-icon> 调任
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'schedule', member }">
                      <el-icon><Calendar /></el-icon> 安排值班
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'delete', member }" divided>
                      <el-icon><Delete /></el-icon> 删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          <div class="member-content">
            <div class="info-grid">
              <div class="info-item">
                <span class="label">手机号:</span>
                <span class="value">{{ member.phone }}</span>
              </div>
              <div class="info-item">
                <span class="label">入职时间:</span>
                <span class="value">{{ formatDate(member.joinDate) }}</span>
              </div>
              <div class="info-item">
                <span class="label">身份证:</span>
                <span class="value">{{ maskIdCard(member.idCard) }}</span>
              </div>
              <div class="info-item">
                <span class="label">学历:</span>
                <span class="value">{{ member.education || '高中' }}</span>
              </div>
            </div>
            <div class="contact-section">
              <el-button type="primary" size="small" @click="callMember(member.phone)">
                <el-icon><Phone /></el-icon>
                呼叫
              </el-button>
              <el-button type="success" size="small" @click="sendMessage(member)">
                <el-icon><Message /></el-icon>
                短信
              </el-button>
              <el-button type="warning" size="small" @click="viewSchedule(member)">
                <el-icon><Calendar /></el-icon>
                值班表
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredMembers.length === 0" class="empty-state">
        <el-empty description="暂无村委成员">
          <el-button type="primary" @click="showAddMemberDialog">添加第一个成员</el-button>
        </el-empty>
      </div>
    </section>

    <!-- 添加/编辑成员对话框 -->
    <el-dialog
      v-model="memberDialogVisible"
      :title="isEditing ? '编辑成员' : '添加成员'"
      width="600px"
      @close="resetMemberForm"
    >
      <el-form :model="memberForm" :rules="memberRules" ref="memberFormRef" label-width="100px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="memberForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="职务" prop="position">
          <el-select v-model="memberForm.position" placeholder="请选择职务">
            <el-option label="村支书" value="村支书" />
            <el-option label="村主任" value="村主任" />
            <el-option label="村会计" value="村会计" />
            <el-option label="村副主任" value="村副主任" />
            <el-option label="妇女主任" value="妇女主任" />
            <el-option label="治保主任" value="治保主任" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="memberForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="身份证号" prop="idCard">
          <el-input v-model="memberForm.idCard" placeholder="请输入身份证号" />
        </el-form-item>
        <el-form-item label="政治面貌" prop="politicalStatus">
          <el-radio-group v-model="memberForm.politicalStatus">
            <el-radio label="党员">党员</el-radio>
            <el-radio label="群众">群众</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="入职时间" prop="joinDate">
          <el-date-picker
            v-model="memberForm.joinDate"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="学历" prop="education">
          <el-select v-model="memberForm.education" placeholder="请选择学历">
            <el-option label="小学" value="小学" />
            <el-option label="初中" value="初中" />
            <el-option label="高中" value="高中" />
            <el-option label="大专" value="大专" />
            <el-option label="本科" value="本科" />
            <el-option label="研究生" value="研究生" />
          </el-select>
        </el-form-item>
        <el-form-item label="头像" prop="avatar">
          <el-upload
            class="avatar-uploader"
            action="#"
            :show-file-list="false"
            :on-success="handleAvatarSuccess"
            :before-upload="beforeAvatarUpload"
          >
            <img v-if="memberForm.avatar" :src="memberForm.avatar" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="memberDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMember">确定</el-button>
      </template>
    </el-dialog>

    <!-- 智能值班表对话框 -->
    <el-dialog v-model="scheduleDialogVisible" title="智能值班表" width="800px">
      <div class="schedule-content">
        <div class="schedule-header">
          <el-button type="primary" @click="generateSchedule">
            <el-icon><MagicStick /></el-icon>
            智能生成
          </el-button>
          <el-button @click="scheduleDialogVisible = false">关闭</el-button>
        </div>
        <el-calendar v-model="currentDate">
          <template #date-cell="{ data }">
            <div class="calendar-cell">
              <div class="date-text">{{ data.day.split('-').slice(2).join('-') }}</div>
              <div class="duty-person" v-if="getDutyPerson(data.day)">
                <el-tag size="small">{{ getDutyPerson(data.day) }}</el-tag>
              </div>
            </div>
          </template>
        </el-calendar>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus,
  Download,
  User,
  Star,
  Clock,
  CircleCheck,
  Search,
  MoreFilled,
  Edit,
  Switch,
  Calendar,
  Delete,
  Phone,
  Message,
  MagicStick,
} from '@element-plus/icons-vue';

// 响应式数据
const searchKeyword = ref('');
const filterPosition = ref('');
const filterPartyStatus = ref('');
const filterStatus = ref('');
const memberDialogVisible = ref(false);
const scheduleDialogVisible = ref(false);
const currentDate = ref(new Date());
const isEditing = ref(false);

// 统计数据
const statistics = reactive({
  total: 8,
  partyMembers: 6,
  onDuty: 2,
  active: 7,
});

// 村委成员数据
const members = ref([
  {
    id: 1,
    name: '张明',
    position: '村支书',
    phone: '13812345678',
    idCard: '330106197501011234',
    isPartyMember: true,
    status: 'active',
    isOnDuty: false,
    joinDate: '2020-01-15',
    education: '本科',
    avatar: '',
  },
  {
    id: 2,
    name: '李红',
    position: '村主任',
    phone: '13823456789',
    idCard: '330106198002022345',
    isPartyMember: true,
    status: 'active',
    isOnDuty: true,
    joinDate: '2019-03-20',
    education: '大专',
    avatar: '',
  },
  {
    id: 3,
    name: '王强',
    position: '村会计',
    phone: '13834567890',
    idCard: '330106198503033456',
    isPartyMember: true,
    status: 'active',
    isOnDuty: true,
    joinDate: '2018-06-10',
    education: '本科',
    avatar: '',
  },
]);

// 表单数据
const memberForm = reactive({
  name: '',
  position: '',
  phone: '',
  idCard: '',
  politicalStatus: '群众',
  joinDate: '',
  education: '高中',
  avatar: '',
});

// 表单验证规则
const memberRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  position: [{ required: true, message: '请选择职务', trigger: 'change' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dX]$/, message: '请输入正确的身份证号', trigger: 'blur' },
  ],
};

const memberFormRef = ref(null);

// 计算属性
const filteredMembers = computed(() => {
  return members.value.filter(member => {
    const matchSearch =
      !searchKeyword.value ||
      member.name.includes(searchKeyword.value) ||
      member.position.includes(searchKeyword.value) ||
      member.phone.includes(searchKeyword.value);

    const matchPosition = !filterPosition.value || member.position === filterPosition.value;
    const matchPartyStatus =
      !filterPartyStatus.value ||
      (filterPartyStatus.value === '是' && member.isPartyMember) ||
      (filterPartyStatus.value === '否' && !member.isPartyMember);
    const matchStatus = !filterStatus.value || member.status === filterStatus.value;

    return matchSearch && matchPosition && matchPartyStatus && matchStatus;
  });
});

// 方法
const getStatusType = status => {
  const typeMap = {
    active: 'success',
    transferred: 'warning',
    retired: 'info',
  };
  return typeMap[status] || 'info';
};

const getStatusText = status => {
  const textMap = {
    active: '在职',
    transferred: '调离',
    retired: '退休',
  };
  return textMap[status] || '未知';
};

const formatDate = dateString => {
  return new Date(dateString).toLocaleDateString();
};

const maskIdCard = idCard => {
  if (!idCard) return '';
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
};

const handleSearch = () => {
  // 搜索逻辑已在计算属性中实现
};

const handleFilter = () => {
  // 筛选逻辑已在计算属性中实现
};

const showAddMemberDialog = () => {
  isEditing.value = false;
  memberDialogVisible.value = true;
  resetMemberForm();
};

const resetMemberForm = () => {
  Object.assign(memberForm, {
    name: '',
    position: '',
    phone: '',
    idCard: '',
    politicalStatus: '群众',
    joinDate: '',
    education: '高中',
    avatar: '',
  });
  if (memberFormRef.value) {
    memberFormRef.value.resetFields();
  }
};

const saveMember = async () => {
  if (!memberFormRef.value) return;

  try {
    await memberFormRef.value.validate();

    if (isEditing.value) {
      // 编辑成员
      const index = members.value.findIndex(m => m.id === memberForm.id);
      if (index !== -1) {
        members.value[index] = {
          ...members.value[index],
          ...memberForm,
          isPartyMember: memberForm.politicalStatus === '党员',
        };
      }
      ElMessage.success('成员信息更新成功');
    } else {
      // 添加成员
      const newMember = {
        id: Date.now(),
        ...memberForm,
        isPartyMember: memberForm.politicalStatus === '党员',
        status: 'active',
        isOnDuty: false,
      };
      members.value.push(newMember);
      ElMessage.success('成员添加成功');
    }

    memberDialogVisible.value = false;
    updateStatistics();
  } catch (error) {
    console.error('表单验证失败:', error);
  }
};

const handleAction = ({ action, member }) => {
  switch (action) {
    case 'edit':
      editMember(member);
      break;
    case 'transfer':
      transferMember(member);
      break;
    case 'schedule':
      viewSchedule(member);
      break;
    case 'delete':
      deleteMember(member);
      break;
  }
};

const editMember = member => {
  isEditing.value = true;
  Object.assign(memberForm, {
    ...member,
    politicalStatus: member.isPartyMember ? '党员' : '群众',
  });
  memberDialogVisible.value = true;
};

const transferMember = member => {
  ElMessageBox.confirm(`确定要将 ${member.name} 调离当前职务吗？`, '调任确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      member.status = 'transferred';
      member.isOnDuty = false;
      ElMessage.success('调任操作成功');
      updateStatistics();
    })
    .catch(() => {});
};

const deleteMember = member => {
  ElMessageBox.confirm(`确定要删除 ${member.name} 的信息吗？此操作不可恢复。`, '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'error',
  })
    .then(() => {
      const index = members.value.findIndex(m => m.id === member.id);
      if (index !== -1) {
        members.value.splice(index, 1);
        ElMessage.success('删除成功');
        updateStatistics();
      }
    })
    .catch(() => {});
};

const callMember = phone => {
  ElMessage.info(`正在呼叫 ${phone}...`);
};

const sendMessage = member => {
  ElMessage.success(`已向 ${member.name} 发送短信通知`);
};

const viewSchedule = member => {
  scheduleDialogVisible.value = true;
};

const generateSchedule = () => {
  ElMessage.success('智能值班表生成成功');
};

const getDutyPerson = date => {
  // 简单的值班分配逻辑
  const dayIndex = new Date(date).getDay();
  const dutyMembers = members.value.filter(m => m.status === 'active');
  if (dutyMembers.length === 0) return null;
  return dutyMembers[dayIndex % dutyMembers.length]?.name;
};

const exportData = () => {
  ElMessage.success('数据导出成功');
};

const updateStatistics = () => {
  statistics.total = members.value.length;
  statistics.partyMembers = members.value.filter(m => m.isPartyMember).length;
  statistics.onDuty = members.value.filter(m => m.isOnDuty).length;
  statistics.active = members.value.filter(m => m.status === 'active').length;
};

const handleAvatarSuccess = response => {
  memberForm.avatar = response.url;
};

const beforeAvatarUpload = file => {
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png';
  const isLt2M = file.size / 1024 / 1024 < 2;

  if (!isJPG) {
    ElMessage.error('上传头像图片只能是 JPG/PNG 格式!');
  }
  if (!isLt2M) {
    ElMessage.error('上传头像图片大小不能超过 2MB!');
  }
  return isJPG && isLt2M;
};

// 生命周期
onMounted(() => {
  updateStatistics();
});
</script>

<style scoped>
.committee-management {
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

.stat-card.total {
  border-left: 4px solid #3498db;
}

.stat-card.party {
  border-left: 4px solid #e74c3c;
}

.stat-card.on-duty {
  border-left: 4px solid #f39c12;
}

.stat-card.active {
  border-left: 4px solid #2ecc71;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.stat-card.total .stat-icon {
  background: rgba(52, 152, 219, 0.1);
  color: #3498db;
}

.stat-card.party .stat-icon {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.stat-card.on-duty .stat-icon {
  background: rgba(243, 156, 18, 0.1);
  color: #f39c12;
}

.stat-card.active .stat-icon {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
}

.stat-label {
  color: #7f8c8d;
  font-size: 0.875rem;
}

.filter-section {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.filter-content {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-bar {
  flex: 1;
  min-width: 300px;
}

.filter-options {
  display: flex;
  gap: 1rem;
}

.members-section {
  margin-bottom: 2rem;
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.member-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.member-card:hover {
  transform: translateY(-5px);
}

.member-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.member-basic {
  flex: 1;
}

.member-basic h3 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.25rem;
}

.member-basic .position {
  margin: 0 0 0.5rem 0;
  color: #3498db;
  font-weight: 600;
}

.member-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item .label {
  font-size: 0.875rem;
  color: #7f8c8d;
}

.info-item .value {
  color: #2c3e50;
  font-weight: 500;
}

.contact-section {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.empty-state {
  text-align: center;
  padding: 3rem;
}

.avatar-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.avatar-uploader:hover {
  border-color: #409eff;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  line-height: 178px;
  text-align: center;
}

.avatar {
  width: 178px;
  height: 178px;
  display: block;
}

.schedule-content {
  max-height: 600px;
  overflow-y: auto;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #ecf0f1;
}

.calendar-cell {
  height: 100%;
  padding: 4px;
}

.date-text {
  font-weight: 500;
}

.duty-person {
  margin-top: 4px;
}

@media (max-width: 768px) {
  .committee-management {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .filter-content {
    flex-direction: column;
  }

  .filter-options {
    width: 100%;
    flex-direction: column;
  }

  .members-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
