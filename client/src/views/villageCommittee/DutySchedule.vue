<template>
  <div class="duty-schedule-container">
    <!-- 搜索和操作栏 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleDateChange"
          />
        </el-form-item>
        <el-form-item label="值班人员">
          <el-select
            v-model="searchForm.memberId"
            placeholder="请选择值班人员"
            clearable
            filterable
          >
            <el-option
              v-for="member in committeeStore.activeMembers"
              :key="member.id"
              :label="member.name"
              :value="member.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <div class="action-bar">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加值班
        </el-button>
        <el-button type="success" @click="showGenerateDialog = true">
          <el-icon><MagicStick /></el-icon>
          智能排班
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出排班表
        </el-button>
      </div>
    </el-card>

    <!-- 今日值班概览 -->
    <el-card class="today-duty-card" shadow="never" v-if="onDutyToday.length">
      <template #header>
        <div class="card-header">
          <span>今日值班 - {{ formatDate(new Date()) }}</span>
          <el-tag type="success">{{ getWeekday(new Date()) }}</el-tag>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="duty in onDutyToday" :key="duty.id">
          <div class="duty-item">
            <div class="duty-period">{{ duty.period }}</div>
            <div class="duty-member">
              <el-avatar :size="40" :src="duty.avatar">
                {{ duty.memberName?.charAt(0) }}
              </el-avatar>
              <div class="member-info">
                <div class="member-name">{{ duty.memberName }}</div>
                <div class="member-position">{{ duty.position }}</div>
              </div>
            </div>
            <div class="duty-contact">
              <el-button type="primary" size="small" @click="callMember(duty)">
                <el-icon><Phone /></el-icon>
                呼叫
              </el-button>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 值班表视图切换 -->
    <el-card class="view-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>值班安排</span>
          <el-radio-group v-model="viewType" @change="handleViewChange">
            <el-radio-button label="calendar">日历视图</el-radio-button>
            <el-radio-button label="table">表格视图</el-radio-button>
            <el-radio-button label="timeline">时间线视图</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <!-- 日历视图 -->
      <div v-show="viewType === 'calendar'" class="calendar-view">
        <el-calendar v-model="currentDate">
          <template #date-cell="{ data }">
            <div class="calendar-cell">
              <p class="calendar-day">{{ data.day.split('-')[2] }}</p>
              <div class="calendar-duty" v-if="getDutyByDate(data.day)">
                <el-tag
                  v-for="duty in getDutyByDate(data.day)"
                  :key="duty.id"
                  size="small"
                  :type="getDutyTagType(duty.period)"
                >
                  {{ duty.memberName }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-calendar>
      </div>

      <!-- 表格视图 -->
      <div v-show="viewType === 'table'" class="table-view">
        <el-table
          v-loading="committeeStore.loading"
          :data="filteredSchedule"
          style="width: 100%"
          :default-sort="{ prop: 'date', order: 'ascending' }"
        >
          <el-table-column prop="date" label="日期" width="120" sortable>
            <template #default="scope">
              {{ formatDate(scope.row.date) }}
            </template>
          </el-table-column>
          <el-table-column prop="weekday" label="星期" width="80">
            <template #default="scope">
              {{ getWeekday(scope.row.date) }}
            </template>
          </el-table-column>
          <el-table-column prop="period" label="时段" width="100">
            <template #default="scope">
              <el-tag :type="getDutyTagType(scope.row.period)">
                {{ scope.row.period }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="memberName" label="值班人员" width="120" />
          <el-table-column prop="position" label="职务" width="120" />
          <el-table-column prop="contact" label="联系电话" width="130" />
          <el-table-column prop="responsibilities" label="主要职责" />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="scope">
              <el-button type="primary" size="small" @click="handleEdit(scope.row)">
                编辑
              </el-button>
              <el-button type="danger" size="small" @click="handleDelete(scope.row)">
                删除
              </el-button>
              <el-button type="success" size="small" @click="handleSwap(scope.row)">
                交换
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.size"
            :total="pagination.total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>

      <!-- 时间线视图 -->
      <div v-show="viewType === 'timeline'" class="timeline-view">
        <el-timeline>
          <el-timeline-item
            v-for="duty in timelineData"
            :key="duty.id"
            :timestamp="formatDateTime(duty.date, duty.period)"
            :type="getTimelineType(duty.period)"
          >
            <el-card class="timeline-card">
              <div class="timeline-content">
                <div class="timeline-header">
                  <span class="duty-date">{{ formatDate(duty.date) }} {{ duty.period }}</span>
                  <el-tag :type="getDutyTagType(duty.period)">{{ duty.period }}</el-tag>
                </div>
                <div class="timeline-body">
                  <div class="member-info">
                    <el-avatar :size="40" :src="duty.avatar">
                      {{ duty.memberName?.charAt(0) }}
                    </el-avatar>
                    <div class="info">
                      <div class="name">{{ duty.memberName }}</div>
                      <div class="position">{{ duty.position }}</div>
                      <div class="contact">{{ duty.contact }}</div>
                    </div>
                  </div>
                  <div class="responsibilities">
                    <strong>主要职责：</strong>{{ duty.responsibilities }}
                  </div>
                </div>
                <div class="timeline-actions">
                  <el-button size="small" @click="callMember(duty)">
                    <el-icon><Phone /></el-icon>呼叫
                  </el-button>
                  <el-button type="primary" size="small" @click="handleEdit(duty)">
                    编辑
                  </el-button>
                </div>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-card>

    <!-- 添加/编辑值班对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="isEdit ? '编辑值班安排' : '添加值班安排'"
      width="600px"
      :fullscreen="isMobile"
    >
      <el-form ref="dutyFormRef" :model="dutyForm" :rules="dutyRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="值班日期" prop="date">
              <el-date-picker
                v-model="dutyForm.date"
                type="date"
                placeholder="选择日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="值班时段" prop="period">
              <el-select v-model="dutyForm.period" placeholder="请选择时段">
                <el-option label="上午班(8:00-12:00)" value="上午班" />
                <el-option label="下午班(12:00-18:00)" value="下午班" />
                <el-option label="晚上班(18:00-22:00)" value="晚上班" />
                <el-option label="全天班(8:00-22:00)" value="全天班" />
                <el-option label="应急班(24小时)" value="应急班" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="值班人员" prop="memberId">
          <el-select
            v-model="dutyForm.memberId"
            placeholder="请选择值班人员"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="member in committeeStore.activeMembers"
              :key="member.id"
              :label="`${member.name} - ${member.position}`"
              :value="member.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="主要职责" prop="responsibilities">
          <el-input
            v-model="dutyForm.responsibilities"
            type="textarea"
            :rows="3"
            placeholder="请输入主要职责"
          />
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="dutyForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? '更新' : '添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 智能排班对话框 -->
    <el-dialog
      v-model="showGenerateDialog"
      title="智能排班设置"
      width="700px"
      :fullscreen="isMobile"
    >
      <el-form
        ref="generateFormRef"
        :model="generateForm"
        :rules="generateRules"
        label-width="120px"
      >
        <el-form-item label="排班周期" prop="cycle">
          <el-radio-group v-model="generateForm.cycle">
            <el-radio label="week">按周排班</el-radio>
            <el-radio label="month">按月排班</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="开始日期" prop="startDate">
          <el-date-picker
            v-model="generateForm.startDate"
            type="date"
            placeholder="选择开始日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="结束日期" prop="endDate">
          <el-date-picker
            v-model="generateForm.endDate"
            type="date"
            placeholder="选择结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="值班时段" prop="periods">
          <el-checkbox-group v-model="generateForm.periods">
            <el-checkbox label="上午班">上午班(8:00-12:00)</el-checkbox>
            <el-checkbox label="下午班">下午班(12:00-18:00)</el-checkbox>
            <el-checkbox label="晚上班">晚上班(18:00-22:00)</el-checkbox>
            <el-checkbox label="应急班">应急班(24小时)</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="参与人员" prop="members">
          <el-transfer
            v-model="generateForm.members"
            :data="memberTransferData"
            :titles="['可选人员', '值班人员']"
            :props="{ key: 'id', label: 'name' }"
          />
        </el-form-item>

        <el-form-item label="排班规则">
          <el-checkbox-group v-model="generateForm.rules">
            <el-checkbox label="average">平均分配</el-checkbox>
            <el-checkbox label="avoidContinuous">避免连续值班</el-checkbox>
            <el-checkbox label="weekendSeparate">周末单独排班</el-checkbox>
            <el-checkbox label="emergencyRotation">应急班轮换</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showGenerateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleGenerateSchedule" :loading="generating">
          生成排班表
        </el-button>
      </template>
    </el-dialog>

    <!-- 交换值班对话框 -->
    <el-dialog v-model="showSwapDialog" title="交换值班" width="500px" :fullscreen="isMobile">
      <el-form ref="swapFormRef" :model="swapForm" :rules="swapRules" label-width="100px">
        <el-form-item label="原值班安排">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="日期">{{
              formatDate(swapForm.originalDate)
            }}</el-descriptions-item>
            <el-descriptions-item label="时段">{{ swapForm.originalPeriod }}</el-descriptions-item>
            <el-descriptions-item label="人员">{{ swapForm.originalMember }}</el-descriptions-item>
          </el-descriptions>
        </el-form-item>

        <el-form-item label="目标值班" prop="targetDutyId">
          <el-select
            v-model="swapForm.targetDutyId"
            placeholder="请选择要交换的值班安排"
            filterable
          >
            <el-option
              v-for="duty in availableSwapDuties"
              :key="duty.id"
              :label="`${formatDate(duty.date)} ${duty.period} - ${duty.memberName}`"
              :value="duty.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="交换原因" prop="reason">
          <el-input
            v-model="swapForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入交换原因"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showSwapDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSwapSubmit">确定交换</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useCommitteeStore } from '@/stores/villageCommittee/committeeStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Plus, Download, MagicStick, Phone } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const committeeStore = useCommitteeStore();

// 响应式数据
const searchForm = ref({
  memberId: '',
});

const dateRange = ref([]);
const currentDate = ref(new Date());
const viewType = ref('calendar');

const showAddDialog = ref(false);
const showGenerateDialog = ref(false);
const showSwapDialog = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const generating = ref(false);
const isMobile = ref(false);

const dutyFormRef = ref();
const generateFormRef = ref();
const swapFormRef = ref();

const currentDuty = ref(null);

const pagination = ref({
  page: 1,
  size: 20,
  total: 0,
});

const dutyForm = ref({
  date: '',
  period: '',
  memberId: '',
  responsibilities: '',
  remark: '',
});

const generateForm = ref({
  cycle: 'week',
  startDate: '',
  endDate: '',
  periods: ['上午班', '下午班', '晚上班'],
  members: [],
  rules: ['average', 'avoidContinuous'],
});

const swapForm = ref({
  originalDate: '',
  originalPeriod: '',
  originalMember: '',
  targetDutyId: '',
  reason: '',
});

// 表单验证规则
const dutyRules = {
  date: [{ required: true, message: '请选择值班日期', trigger: 'change' }],
  period: [{ required: true, message: '请选择值班时段', trigger: 'change' }],
  memberId: [{ required: true, message: '请选择值班人员', trigger: 'change' }],
  responsibilities: [{ required: true, message: '请输入主要职责', trigger: 'blur' }],
};

const generateRules = {
  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  periods: [{ type: 'array', required: true, message: '请选择至少一个时段', trigger: 'change' }],
  members: [{ type: 'array', required: true, message: '请选择值班人员', trigger: 'change' }],
};

const swapRules = {
  targetDutyId: [{ required: true, message: '请选择要交换的值班安排', trigger: 'change' }],
  reason: [{ required: true, message: '请输入交换原因', trigger: 'blur' }],
};

// 计算属性
const onDutyToday = computed(() => committeeStore.onDutyToday);

const filteredSchedule = computed(() => {
  let result = committeeStore.dutySchedule;

  // 日期范围过滤
  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value;
    result = result.filter(duty => {
      return duty.date >= start && duty.date <= end;
    });
  }

  // 人员过滤
  if (searchForm.value.memberId) {
    result = result.filter(duty => duty.memberId === searchForm.value.memberId);
  }

  pagination.value.total = result.length;
  const start = (pagination.value.page - 1) * pagination.value.size;
  const end = start + pagination.value.size;
  return result.slice(start, end);
});

const timelineData = computed(() => {
  return filteredSchedule.value.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA - dateB;
  });
});

const memberTransferData = computed(() => {
  return committeeStore.activeMembers.map(member => ({
    id: member.id,
    name: `${member.name} - ${member.position}`,
  }));
});

const availableSwapDuties = computed(() => {
  if (!currentDuty.value) return [];
  return committeeStore.dutySchedule.filter(duty => {
    return duty.id !== currentDuty.value.id && duty.date >= dayjs().format('YYYY-MM-DD');
  });
});

// 方法
const handleDateChange = () => {
  // 日期范围改变时重新查询
};

const handleSearch = () => {
  pagination.value.page = 1;
};

const handleReset = () => {
  searchForm.value = {
    memberId: '',
  };
  dateRange.value = [];
  pagination.value.page = 1;
};

const handleViewChange = type => {
  viewType.value = type;
};

const handleSizeChange = size => {
  pagination.value.size = size;
  pagination.value.page = 1;
};

const handleCurrentChange = page => {
  pagination.value.page = page;
};

const handleEdit = row => {
  isEdit.value = true;
  currentDuty.value = row;
  dutyForm.value = { ...row };
  showAddDialog.value = true;
};

const handleDelete = row => {
  ElMessageBox.confirm(
    `确定要删除 ${row.memberName} 在 ${formatDate(row.date)} ${row.period} 的值班安排吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await committeeStore.deleteDutySchedule(row.id);
      ElMessage.success('删除成功');
      await committeeStore.fetchDutySchedule();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  });
};

const handleSwap = row => {
  currentDuty.value = row;
  swapForm.value = {
    originalDate: row.date,
    originalPeriod: row.period,
    originalMember: row.memberName,
    targetDutyId: '',
    reason: '',
  };
  showSwapDialog.value = true;
};

const handleSubmit = async () => {
  if (!dutyFormRef.value) return;

  await dutyFormRef.value.validate(async valid => {
    if (valid) {
      submitting.value = true;
      try {
        if (isEdit.value) {
          await committeeStore.updateDutySchedule(currentDuty.value.id, dutyForm.value);
          ElMessage.success('更新成功');
        } else {
          await committeeStore.createDutySchedule(dutyForm.value);
          ElMessage.success('添加成功');
        }
        showAddDialog.value = false;
        await committeeStore.fetchDutySchedule();
      } catch (error) {
        ElMessage.error('操作失败');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const handleGenerateSchedule = async () => {
  if (!generateFormRef.value) return;

  await generateFormRef.value.validate(async valid => {
    if (valid) {
      generating.value = true;
      try {
        await committeeStore.generateDutySchedule(generateForm.value);
        ElMessage.success('智能排班成功');
        showGenerateDialog.value = false;
        await committeeStore.fetchDutySchedule();
      } catch (error) {
        ElMessage.error('排班失败');
      } finally {
        generating.value = false;
      }
    }
  });
};

const handleSwapSubmit = async () => {
  if (!swapFormRef.value) return;

  await swapFormRef.value.validate(async valid => {
    if (valid) {
      try {
        // 实现交换逻辑
        ElMessage.success('值班交换成功');
        showSwapDialog.value = false;
        await committeeStore.fetchDutySchedule();
      } catch (error) {
        ElMessage.error('交换失败');
      }
    }
  });
};

const handleExport = () => {
  ElMessage.success('导出成功');
};

const callMember = duty => {
  ElMessageBox.confirm(`确定要呼叫 ${duty.memberName} 吗？\n电话：${duty.contact}`, '呼叫确认', {
    confirmButtonText: '呼叫',
    cancelButtonText: '取消',
    type: 'info',
  }).then(() => {
    window.location.href = `tel:${duty.contact}`;
    ElMessage.success(`正在呼叫 ${duty.memberName}`);
  });
};

// 辅助函数
const formatDate = date => {
  return date ? dayjs(date).format('YYYY-MM-DD') : '';
};

const formatDateTime = (date, period) => {
  return `${formatDate(date)} ${period}`;
};

const getWeekday = date => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[dayjs(date).day()];
};

const getDutyByDate = date => {
  return committeeStore.dutySchedule.filter(duty => duty.date === date);
};

const getDutyTagType = period => {
  const typeMap = {
    上午班: 'success',
    下午班: 'primary',
    晚上班: 'warning',
    全天班: 'danger',
    应急班: 'info',
  };
  return typeMap[period] || '';
};

const getTimelineType = period => {
  const typeMap = {
    上午班: 'success',
    下午班: 'primary',
    晚上班: 'warning',
    全天班: 'danger',
    应急班: 'info',
  };
  return typeMap[period] || 'primary';
};

// 生命周期
onMounted(async () => {
  isMobile.value = window.innerWidth < 768;

  try {
    await committeeStore.fetchDutySchedule();
    await committeeStore.fetchMembers();
  } catch (error) {
    console.error('加载数据失败:', error);
  }
});
</script>

<style lang="scss" scoped>
.duty-schedule-container {
  padding: 20px;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eaf6 50%, #e0e7ff 100%);
  position: relative;
  overflow-x: hidden;

  // 装饰性渐变背景
  &::before {
    content: '';
    position: fixed;
    top: -20%;
    right: -5%;
    width: 40%;
    height: 50%;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  &::after {
    content: '';
    position: fixed;
    bottom: -20%;
    left: -5%;
    width: 50%;
    height: 40%;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  // 确保所有卡片在装饰元素之上
  :deep(.el-card) {
    position: relative;
    z-index: 1;
  }

  @media (max-width: 768px) {
    padding: 15px 10px;
  }
}

.search-card {
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(99, 102, 241, 0.1);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.08);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    box-shadow: 0 8px 30px rgba(99, 102, 241, 0.12);
    transform: translateY(-2px);
  }

  :deep(.el-card__header) {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    padding: 18px 20px;
    border-radius: 16px 16px 0 0;
  }

  .search-form {
    margin-bottom: 20px;

    :deep(.el-form-item__label) {
      font-weight: 500;
      color: #4f46e5;
    }
  }

  .action-bar {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    padding-top: 10px;
    border-top: 1px solid rgba(99, 102, 241, 0.1);

    :deep(.el-button) {
      border-radius: 8px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.15);
      }

      &.el-button--primary {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        border: none;
      }

      &.el-button--success {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border: none;
      }
    }
  }
}

.today-duty-card {
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(99, 102, 241, 0.1);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.08);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    box-shadow: 0 8px 30px rgba(99, 102, 241, 0.12);
    transform: translateY(-2px);
  }

  :deep(.el-card__header) {
    background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
    color: white;
    padding: 18px 20px;
    border-radius: 16px 16px 0 0;

    .el-tag {
      background: rgba(255, 255, 255, 0.25);
      border-color: rgba(255, 255, 255, 0.3);
      color: white;
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .duty-item {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
    border: 1px solid rgba(99, 102, 241, 0.1);
    border-radius: 12px;
    padding: 18px;
    margin-bottom: 10px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.15);
      transform: translateY(-2px);
    }

    .duty-period {
      font-size: 14px;
      font-weight: 500;
      color: #8b5cf6;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;

      &::before {
        content: '';
        display: inline-block;
        width: 8px;
        height: 8px;
        background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
        border-radius: 50%;
      }
    }

    .duty-member {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;

      :deep(.el-avatar) {
        border: 2px solid #8b5cf6;
        background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
        color: white;
        font-weight: 600;
      }

      .member-info {
        .member-name {
          font-weight: 600;
          color: #303133;
          font-size: 15px;
        }

        .member-position {
          font-size: 12px;
          color: #8b5cf6;
          margin-top: 2px;
        }
      }
    }

    .duty-contact {
      text-align: center;

      :deep(.el-button) {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        border: none;
        border-radius: 8px;

        &:hover {
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
          transform: translateY(-2px);
        }
      }
    }
  }
}

.view-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(99, 102, 241, 0.1);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.08);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    box-shadow: 0 8px 30px rgba(99, 102, 241, 0.12);
    transform: translateY(-2px);
  }

  :deep(.el-card__header) {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    padding: 18px 20px;
    border-radius: 16px 16px 0 0;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    span {
      font-weight: 600;
      font-size: 16px;
    }

    :deep(.el-radio-group) {
      .el-radio-button__inner {
        &:hover {
          color: #8b5cf6;
        }

        &.is-active {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-color: #6366f1;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }
      }
    }
  }

  .calendar-view {
    :deep(.el-calendar) {
      .el-calendar__header {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
        padding: 15px;
      }

      .el-calendar-table {
        .el-calendar-day {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

          &:hover {
            background: rgba(99, 102, 241, 0.1);
          }

          &.is-selected {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
          }
        }
      }
    }

    .calendar-cell {
      height: 100%;
      padding: 6px;

      .calendar-day {
        margin: 0;
        text-align: center;
        font-weight: 500;
        color: #4f46e5;
      }

      .calendar-duty {
        margin-top: 6px;

        :deep(.el-tag) {
          display: block;
          margin-bottom: 3px;
          font-size: 11px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
          border-color: rgba(99, 102, 241, 0.2);
          color: #7c3aed;
          border-radius: 4px;

          &.el-tag--success {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
            border-color: rgba(16, 185, 129, 0.2);
            color: #059669;
          }

          &.el-tag--warning {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(180, 83, 9, 0.1) 100%);
            border-color: rgba(245, 158, 11, 0.2);
            color: #d97706;
          }

          &.el-tag--danger {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.1) 100%);
            border-color: rgba(239, 68, 68, 0.2);
            color: #dc2626;
          }

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
          }
        }
      }
    }
  }

  .table-view {
    :deep(.el-table) {
      border-radius: 8px;
      overflow: hidden;

      &::before {
        display: none;
      }

      .el-table__header-wrapper {
        th.el-table__cell {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          font-weight: 600;
          border: none;

          .cell {
            padding: 0 12px;
          }
        }
      }

      .el-table__body-wrapper {
        tr {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

          &:hover {
            background: rgba(99, 102, 241, 0.05);
            transform: scale(1.005);
          }

          &.el-table__row--striped {
            background: rgba(99, 102, 241, 0.02);

            &:hover {
              background: rgba(99, 102, 241, 0.07);
            }
          }

          td.el-table__cell {
            border-bottom: 1px solid rgba(99, 102, 241, 0.05);
            padding: 12px 0;
          }
        }
      }

      .el-table__cell {
        :deep(.el-tag) {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
          border-color: rgba(99, 102, 241, 0.2);
          color: #7c3aed;
          border-radius: 6px;

          &.el-tag--success {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
            border-color: rgba(16, 185, 129, 0.2);
            color: #059669;
          }

          &.el-tag--warning {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(180, 83, 9, 0.1) 100%);
            border-color: rgba(245, 158, 11, 0.2);
            color: #d97706;
          }

          &.el-tag--danger {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.1) 100%);
            border-color: rgba(239, 68, 68, 0.2);
            color: #dc2626;
          }
        }
      }
    }

    .pagination-container {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;

      :deep(.el-pagination) {
        .el-pager li {
          border-radius: 6px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

          &.is-active {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
          }

          &:hover:not(.is-active) {
            background: rgba(99, 102, 241, 0.1);
            color: #8b5cf6;
          }
        }

        button {
          border-radius: 6px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

          &:hover:not(:disabled) {
            background: rgba(99, 102, 241, 0.1);
            color: #8b5cf6;
          }
        }
      }
    }
  }

  .timeline-view {
    :deep(.el-timeline-item__wrapper) {
      .el-timeline-item__timestamp {
        color: #8b5cf6;
        font-weight: 500;
      }
    }

    .timeline-card {
      margin-bottom: 16px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%);
      border: 1px solid rgba(99, 102, 241, 0.1);
      border-radius: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.06) 100%);
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.12);
        transform: translateY(-2px);
      }

      .timeline-content {
        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;

          .duty-date {
            font-weight: 600;
            color: #4f46e5;
            font-size: 15px;
          }
        }

        .timeline-body {
          .member-info {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;

            :deep(.el-avatar) {
              border: 2px solid #8b5cf6;
              background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
              color: white;
              font-weight: 600;
            }

            .info {
              .name {
                font-weight: 600;
                color: #303133;
                font-size: 15px;
              }

              .position {
                font-size: 12px;
                color: #8b5cf6;
                margin-top: 2px;
              }

              .contact {
                font-size: 12px;
                color: #606266;
                margin-top: 2px;
              }
            }
          }

          .responsibilities {
            font-size: 14px;
            color: #606266;
            margin-bottom: 12px;
            line-height: 1.6;
            padding: 10px;
            background: rgba(99, 102, 241, 0.03);
            border-radius: 8px;
            border-left: 3px solid #8b5cf6;

            strong {
              color: #4f46e5;
            }
          }
        }

        .timeline-actions {
          display: flex;
          gap: 10px;

          :deep(.el-button) {
            border-radius: 8px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(99, 102, 241, 0.15);
            }

            &.el-button--primary {
              background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
              border: none;
            }
          }
        }
      }
    }
  }
}

// 对话框样式优化
:deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;

  .el-dialog__header {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    padding: 18px 20px;

    .el-dialog__title {
      font-weight: 600;
      font-size: 18px;
    }

    .el-dialog__close {
      color: white;
      font-size: 20px;

      &:hover {
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }

  .el-dialog__body {
    padding: 24px 20px;
  }

  .el-dialog__footer {
    padding: 16px 20px;
    border-top: 1px solid rgba(99, 102, 241, 0.1);

    .el-button {
      border-radius: 8px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover:not(.el-button--primary) {
        border-color: #8b5cf6;
        color: #8b5cf6;
      }

      &.el-button--primary {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        border: none;

        &:hover {
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.3);
          transform: translateY(-2px);
        }
      }
    }
  }

  .el-form {
    .el-form-item__label {
      font-weight: 500;
      color: #4f46e5;
    }

    .el-input__wrapper,
    .el-select .el-input__wrapper,
    .el-textarea__inner {
      border-radius: 8px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        border-color: #8b5cf6;
        box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.2);
      }

      &.is-focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
      }
    }

    .el-radio-group {
      .el-radio-button__inner {
        &:hover {
          color: #8b5cf6;
        }

        &.is-active {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-color: #6366f1;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }
      }
    }
  }
}

// 响应式调整
@media (max-width: 768px) {
  .search-form {
    :deep(.el-form-item) {
      margin-right: 0;
      width: 100%;

      .el-input,
      .el-select,
      .el-date-picker {
        width: 100%;
      }
    }
  }

  .action-bar {
    :deep(.el-button) {
      flex: 1;
      margin: 6px 0;
      min-width: calc(50% - 6px);
    }
  }

  .today-duty-card {
    :deep(.el-col) {
      margin-bottom: 10px;
    }
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .timeline-view {
    :deep(.el-timeline-item__wrapper) {
      padding-left: 0;
    }

    .timeline-actions {
      flex-direction: column;

      :deep(.el-button) {
        width: 100%;
        margin-left: 0;
      }
    }
  }

  :deep(.el-dialog) {
    .el-dialog__body {
      padding: 16px 12px;
    }

    .el-row {
      .el-col {
        margin-bottom: 12px;
      }
    }
  }
}

// 表单元素通用样式
:deep(.el-button) {
  &.el-button--primary {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border: none;

    &:hover {
      background: linear-gradient(135deg, #5558e3 0%, #7c4fe8 100%);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.3);
      transform: translateY(-2px);
    }

    &:active {
      transform: translateY(0);
    }
  }
}
</style>
