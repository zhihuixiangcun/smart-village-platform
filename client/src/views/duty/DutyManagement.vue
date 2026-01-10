<template>
  <div class="duty-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">智能值班表管理</h1>
        <p class="page-description">高效管理值班安排，支持智能排班和快速调班</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="showQuickScheduleDialog = true">
          快速排班
        </el-button>
        <el-button type="success" :icon="User" @click="showPersonnelDialog = true">
          添加人员
        </el-button>
        <el-button type="info" :icon="Download" @click="exportReport"> 导出报表 </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <el-row :gutter="20" class="statistics-row">
      <el-col :span="6" :xs="12" :sm="12" :md="6">
        <el-card class="statistic-card">
          <div class="statistic-content">
            <div class="statistic-icon total">
              <el-icon><Calendar /></el-icon>
            </div>
            <div class="statistic-info">
              <div class="statistic-value">{{ statistics.totalDuties }}</div>
              <div class="statistic-label">本月值班</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6" :xs="12" :sm="12" :md="6">
        <el-card class="statistic-card">
          <div class="statistic-content">
            <div class="statistic-icon completed">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="statistic-info">
              <div class="statistic-value">{{ statistics.completedDuties }}</div>
              <div class="statistic-label">已完成</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6" :xs="12" :sm="12" :md="6">
        <el-card class="statistic-card">
          <div class="statistic-content">
            <div class="statistic-icon upcoming">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="statistic-info">
              <div class="statistic-value">{{ statistics.upcomingDuties }}</div>
              <div class="statistic-label">待值班</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6" :xs="12" :sm="12" :md="6">
        <el-card class="statistic-card">
          <div class="statistic-content">
            <div class="statistic-icon personnel">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="statistic-info">
              <div class="statistic-value">{{ statistics.personnelCount }}</div>
              <div class="statistic-label">值班人员</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 主要内容区 -->
    <el-row :gutter="20" class="main-content">
      <!-- 左侧：值班日历 -->
      <el-col :span="16" :xs="24" :sm="24" :md="16">
        <el-card class="calendar-card">
          <template #header>
            <div class="card-header">
              <span>值班日历</span>
              <div class="header-controls">
                <el-button-group>
                  <el-button size="small" @click="previousMonth">
                    <el-icon><ArrowLeft /></el-icon>
                  </el-button>
                  <el-button size="small" disabled>
                    {{ currentMonthText }}
                  </el-button>
                  <el-button size="small" @click="nextMonth">
                    <el-icon><ArrowRight /></el-icon>
                  </el-button>
                </el-button-group>
              </div>
            </div>
          </template>
          <DutyCalendar
            v-model:selected-date="selectedDate"
            :schedules="currentMonthSchedules"
            :personnel="personnelById"
            :loading="calendarLoading"
            @date-select="handleDateSelect"
            @schedule-click="handleScheduleClick"
            @schedule-drop="handleScheduleDrop"
          />
        </el-card>
      </el-col>

      <!-- 右侧：值班人员列表 -->
      <el-col :span="8" :xs="24" :sm="24" :md="8">
        <el-card class="personnel-card">
          <template #header>
            <div class="card-header">
              <span>值班人员</span>
              <el-button type="text" size="small" @click="showPersonnelDialog = true">
                管理人员
              </el-button>
            </div>
          </template>
          <div class="personnel-list">
            <div
              v-for="person in dutyPersonnel"
              :key="person.id"
              class="personnel-item"
              :class="{ inactive: !person.isActive }"
            >
              <div class="personnel-info">
                <el-avatar :size="40" :src="person.avatar">
                  {{ person.name.charAt(0) }}
                </el-avatar>
                <div class="personnel-details">
                  <div class="personnel-name">{{ person.name }}</div>
                  <div class="personnel-role">{{ person.role }}</div>
                </div>
              </div>
              <div class="personnel-status">
                <el-tag :type="person.isActive ? 'success' : 'info'" size="small">
                  {{ person.isActive ? '在岗' : '离岗' }}
                </el-tag>
                <div class="duty-count">本月: {{ getPersonnelDutyCount(person.id) }}次</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快速排班对话框 -->
    <QuickScheduleDialog
      v-model="showQuickScheduleDialog"
      :selected-date="selectedDate"
      :personnel="availablePersonnel"
      @confirm="handleQuickSchedule"
    />

    <!-- 人员管理对话框 -->
    <DutyPersonnelForm
      v-model="showPersonnelDialog"
      :personnel="editingPersonnel"
      @confirm="handlePersonnelSave"
    />

    <!-- 值班详情抽屉 -->
    <el-drawer v-model="showScheduleDetail" title="值班详情" direction="rtl" size="500px">
      <div v-if="selectedSchedule" class="schedule-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="日期">
            {{ formatDate(selectedSchedule.date) }}
          </el-descriptions-item>
          <el-descriptions-item label="班次">
            <el-tag :type="getShiftTypeColor(selectedSchedule.shiftType)">
              {{ getShiftTypeName(selectedSchedule.shiftType) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="值班人员">
            {{ selectedSchedule.personnelName }}
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">
            {{ selectedSchedule.contactPhone }}
          </el-descriptions-item>
          <el-descriptions-item label="值班地点">
            {{ selectedSchedule.location }}
          </el-descriptions-item>
          <el-descriptions-item label="备注">
            {{ selectedSchedule.remark || '无' }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="detail-actions" style="margin-top: 20px">
          <el-button type="primary" @click="editSchedule"> 编辑 </el-button>
          <el-button type="warning" @click="initiateSwap"> 调班 </el-button>
          <el-button type="danger" @click="deleteSchedule"> 删除 </el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 调班对话框 -->
    <el-dialog v-model="showSwapDialog" title="选择调班目标" width="500px">
      <div class="swap-dialog-content">
        <p>当前值班：{{ selectedSchedule?.date }} {{ selectedSchedule?.personnelName }}</p>
        <p>请选择要调换的班次：</p>
        <el-table
          :data="swapableSchedules"
          style="width: 100%"
          @selection-change="handleSwapSelection"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="date" label="日期" width="120">
            <template #default="{ row }">
              {{ formatDate(row.date) }}
            </template>
          </el-table-column>
          <el-table-column prop="personnelName" label="人员" />
          <el-table-column prop="shiftType" label="班次">
            <template #default="{ row }">
              <el-tag :type="getShiftTypeColor(row.shiftType)" size="small">
                {{ getShiftTypeName(row.shiftType) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showSwapDialog = false">取消</el-button>
          <el-button type="primary" :disabled="!selectedSwapSchedule" @click="confirmSwap">
            确认调班
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 统计报表 -->
    <DutyStatistics
      v-if="showStatistics"
      v-model="showStatistics"
      :statistics="statistics"
      :personnel="dutyPersonnel"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useDutyStore } from '@/stores/dutyStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus,
  User,
  Download,
  Calendar,
  CircleCheck,
  Clock,
  UserFilled,
  ArrowLeft,
  ArrowRight,
} from '@element-plus/icons-vue';
import DutyCalendar from '@/components/duty/DutyCalendar.vue';
import DutyPersonnelForm from '@/components/duty/DutyPersonnelForm.vue';
import QuickScheduleDialog from '@/components/duty/QuickScheduleDialog.vue';
import DutyStatistics from '@/components/duty/DutyStatistics.vue';

// Store
const dutyStore = useDutyStore();

// 响应式数据
const selectedDate = ref(null);
const showQuickScheduleDialog = ref(false);
const showPersonnelDialog = ref(false);
const showScheduleDetail = ref(false);
const showSwapDialog = ref(false);
const showStatistics = ref(false);
const editingPersonnel = ref(null);
const selectedSchedule = ref(null);
const selectedSwapSchedule = ref(null);

// 计算属性
const { dutyPersonnel, currentMonth, statistics, calendarLoading } = dutyStore;
const { currentMonthSchedules, personnelById, availablePersonnel } = dutyStore;

const currentMonthText = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth() + 1;
  return `${year}年${month}月`;
});

const swapableSchedules = computed(() => {
  if (!selectedSchedule.value) return [];
  return currentMonthSchedules.value.filter(schedule => schedule.id !== selectedSchedule.value.id);
});

// 方法
const previousMonth = () => {
  const newDate = new Date(currentMonth.value);
  newDate.setMonth(newDate.getMonth() - 1);
  dutyStore.changeMonth(newDate);
};

const nextMonth = () => {
  const newDate = new Date(currentMonth.value);
  newDate.setMonth(newDate.getMonth() + 1);
  dutyStore.changeMonth(newDate);
};

const handleDateSelect = date => {
  selectedDate.value = date;
  showQuickScheduleDialog.value = true;
};

const handleScheduleClick = schedule => {
  selectedSchedule.value = schedule;
  showScheduleDetail.value = true;
};

const handleScheduleDrop = async (draggedSchedule, targetDate) => {
  try {
    await dutyStore.updateSchedule(draggedSchedule.id, {
      date: targetDate,
    });
    ElMessage.success('调班成功');
  } catch (error) {
    ElMessage.error('调班失败');
  }
};

const handleQuickSchedule = async scheduleData => {
  try {
    if (scheduleData.type === 'single') {
      await dutyStore.createSchedule(scheduleData.data);
    } else {
      await dutyStore.batchCreateSchedules(scheduleData.data);
    }
  } catch (error) {
    // 错误已在store中处理
  }
};

const handlePersonnelSave = async personnelData => {
  try {
    if (editingPersonnel.value) {
      await dutyStore.updatePersonnel(editingPersonnel.value.id, personnelData);
    } else {
      await dutyStore.addPersonnel(personnelData);
    }
    showPersonnelDialog.value = false;
    editingPersonnel.value = null;
  } catch (error) {
    // 错误已在store中处理
  }
};

const getPersonnelDutyCount = personnelId => {
  return currentMonthSchedules.value.filter(schedule => schedule.personnelId === personnelId)
    .length;
};

const formatDate = dateString => {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const getShiftTypeName = shiftType => {
  const shiftMap = {
    morning: '早班',
    afternoon: '午班',
    evening: '晚班',
    night: '夜班',
  };
  return shiftMap[shiftType] || shiftType;
};

const getShiftTypeColor = shiftType => {
  const colorMap = {
    morning: 'success',
    afternoon: 'warning',
    evening: 'danger',
    night: 'info',
  };
  return colorMap[shiftType] || 'info';
};

const editSchedule = () => {
  // 编辑值班安排
  ElMessage.info('编辑功能开发中');
};

const initiateSwap = () => {
  showSwapDialog.value = true;
};

const handleSwapSelection = selection => {
  selectedSwapSchedule.value = selection[0];
};

const confirmSwap = async () => {
  try {
    await dutyStore.swapSchedule(selectedSchedule.value.id, selectedSwapSchedule.value.id);
    showSwapDialog.value = false;
    showScheduleDetail.value = false;
  } catch (error) {
    // 错误已在store中处理
  }
};

const deleteSchedule = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这个值班安排吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await dutyStore.deleteSchedule(selectedSchedule.value.id);
    showScheduleDetail.value = false;
  } catch (error) {
    if (error !== 'cancel') {
      // 错误已在store中处理
    }
  }
};

const exportReport = () => {
  showStatistics.value = true;
};

// 监听选中日期变化
watch(selectedDate, newDate => {
  if (newDate) {
    // 可以在这里添加日期选择后的逻辑
  }
});

// 生命周期
onMounted(() => {
  dutyStore.init();
});
</script>

<style lang="scss" scoped>
.duty-management {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    .header-left {
      .page-title {
        font-size: 24px;
        font-weight: bold;
        color: #303133;
        margin: 0 0 8px 0;
      }

      .page-description {
        font-size: 14px;
        color: #606266;
        margin: 0;
      }
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }
  }

  .statistics-row {
    margin-bottom: 20px;

    .statistic-card {
      .statistic-content {
        display: flex;
        align-items: center;
        padding: 10px;

        .statistic-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 16px;

          .el-icon {
            font-size: 30px;
            color: white;
          }

          &.total {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          &.completed {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }

          &.upcoming {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          }

          &.personnel {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          }
        }

        .statistic-info {
          .statistic-value {
            font-size: 32px;
            font-weight: bold;
            color: #303133;
            line-height: 1;
          }

          .statistic-label {
            font-size: 14px;
            color: #909399;
            margin-top: 8px;
          }
        }
      }
    }
  }

  .main-content {
    .calendar-card,
    .personnel-card {
      margin-bottom: 20px;

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    }

    .personnel-list {
      max-height: 600px;
      overflow-y: auto;

      .personnel-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid #ebeef5;
        transition: background-color 0.3s;

        &:hover {
          background-color: #f5f7fa;
        }

        &.inactive {
          opacity: 0.6;
        }

        .personnel-info {
          display: flex;
          align-items: center;
          flex: 1;

          .personnel-details {
            margin-left: 12px;

            .personnel-name {
              font-size: 14px;
              font-weight: 500;
              color: #303133;
            }

            .personnel-role {
              font-size: 12px;
              color: #909399;
              margin-top: 4px;
            }
          }
        }

        .personnel-status {
          text-align: right;

          .duty-count {
            font-size: 12px;
            color: #909399;
            margin-top: 4px;
          }
        }
      }
    }
  }

  .schedule-detail {
    padding: 20px;

    .detail-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
  }

  .swap-dialog-content {
    p {
      margin: 10px 0;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .duty-management {
    padding: 10px;

    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;

      .header-actions {
        width: 100%;
        justify-content: flex-end;
      }
    }

    .main-content {
      .personnel-list {
        max-height: 400px;
      }
    }
  }
}
</style>
