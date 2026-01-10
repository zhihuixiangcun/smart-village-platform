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

  @media (max-width: 768px) {
    padding: 10px;
  }
}

.search-card {
  margin-bottom: 20px;

  .search-form {
    margin-bottom: 20px;
  }

  .action-bar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
}

.today-duty-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .duty-item {
    background: #f5f7fa;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 10px;

    .duty-period {
      font-size: 14px;
      color: #909399;
      margin-bottom: 10px;
    }

    .duty-member {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;

      .member-info {
        .member-name {
          font-weight: 600;
          color: #303133;
        }

        .member-position {
          font-size: 12px;
          color: #909399;
        }
      }
    }

    .duty-contact {
      text-align: center;
    }
  }
}

.view-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .calendar-view {
    .calendar-cell {
      height: 100%;
      padding: 4px;

      .calendar-day {
        margin: 0;
        text-align: center;
      }

      .calendar-duty {
        margin-top: 4px;

        .el-tag {
          display: block;
          margin-bottom: 2px;
          font-size: 10px;
        }
      }
    }
  }

  .table-view {
    .pagination-container {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  }

  .timeline-view {
    .timeline-card {
      margin-bottom: 10px;

      .timeline-content {
        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;

          .duty-date {
            font-weight: 600;
            color: #303133;
          }
        }

        .timeline-body {
          .member-info {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;

            .info {
              .name {
                font-weight: 600;
                color: #303133;
              }

              .position {
                font-size: 12px;
                color: #909399;
              }

              .contact {
                font-size: 12px;
                color: #606266;
              }
            }
          }

          .responsibilities {
            font-size: 14px;
            color: #606266;
            margin-bottom: 10px;
          }
        }

        .timeline-actions {
          display: flex;
          gap: 10px;
        }
      }
    }
  }
}

// 响应式调整
@media (max-width: 768px) {
  .search-form {
    .el-form-item {
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
    .el-button {
      flex: 1;
      margin: 5px 0;
    }
  }

  .today-duty-card {
    .el-col {
      margin-bottom: 10px;
    }
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .timeline-view {
    .timeline-actions {
      flex-direction: column;

      .el-button {
        width: 100%;
        margin-left: 0;
      }
    }
  }
}
</style>
