<template>
  <div class="duty-calendar">
    <!-- 星期标题 -->
    <div class="calendar-weekdays">
      <div v-for="day in weekDays" :key="day" class="weekday">
        {{ day }}
      </div>
    </div>

    <!-- 日历格子 -->
    <div class="calendar-grid">
      <!-- 空白格子（上月末尾） -->
      <div v-for="blank in firstDayOfMonth" :key="`blank-${blank}`" class="calendar-day blank" />

      <!-- 本月日期 -->
      <div
        v-for="day in daysInMonth"
        :key="day.date"
        class="calendar-day"
        :class="{
          today: isToday(day.date),
          selected: isSelected(day.date),
          'other-month': !isCurrentMonth(day.date),
          'has-duties': day.schedules.length > 0,
        }"
        @click="selectDate(day.date)"
        @drop="handleDrop($event, day.date)"
        @dragover.prevent
        @dragenter.prevent
      >
        <!-- 日期数字 -->
        <div class="day-number">
          {{ day.dayNumber }}
          <span v-if="day.isToday" class="today-badge">今</span>
        </div>

        <!-- 值班信息 -->
        <div class="duty-info">
          <div
            v-for="schedule in day.schedules.slice(0, 3)"
            :key="schedule.id"
            class="duty-item"
            :class="schedule.shiftType"
            draggable="true"
            @dragstart="handleDragStart($event, schedule)"
            @click.stop="handleScheduleClick(schedule)"
          >
            <el-tooltip :content="getScheduleTooltip(schedule)" placement="top">
              <div class="duty-content">
                <span class="personnel-name">{{ schedule.personnelName }}</span>
                <span class="shift-type">{{ getShiftTypeName(schedule.shiftType) }}</span>
              </div>
            </el-tooltip>
          </div>

          <!-- 更多指示器 -->
          <div v-if="day.schedules.length > 3" class="more-duties">
            +{{ day.schedules.length - 3 }}
          </div>
        </div>

        <!-- 快速操作按钮 -->
        <div class="quick-actions" v-if="isSelected(day.date)">
          <el-button type="primary" size="small" circle @click.stop="handleQuickSchedule(day.date)">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <!-- 拖拽提示 -->
    <div v-if="isDragging" class="drag-overlay">
      <div class="drag-hint">
        <el-icon><Position /></el-icon>
        <p>拖动到目标日期进行调班</p>
      </div>
    </div>

    <!-- 值班统计图例 -->
    <div class="calendar-legend">
      <div class="legend-item">
        <div class="legend-color morning"></div>
        <span>早班 (06:00-12:00)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color afternoon"></div>
        <span>午班 (12:00-18:00)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color evening"></div>
        <span>晚班 (18:00-24:00)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color night"></div>
        <span>夜班 (00:00-06:00)</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Plus, Position } from '@element-plus/icons-vue';

const props = defineProps({
  selectedDate: {
    type: Date,
    default: null,
  },
  schedules: {
    type: Array,
    default: () => [],
  },
  personnel: {
    type: Object,
    default: () => ({}),
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:selectedDate', 'date-select', 'schedule-click', 'schedule-drop']);

// 响应式数据
const isDragging = ref(false);
const draggedSchedule = ref(null);
const currentDate = ref(new Date());

// 计算属性
const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

const firstDayOfMonth = computed(() => {
  const date = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1);
  return date.getDay();
});

const daysInMonth = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  const days = [];

  // 获取当月天数
  const lastDay = new Date(year, month + 1, 0).getDate();

  // 生成日期数组
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDateStr(date);
    const daySchedules = props.schedules
      .filter(schedule => schedule.date === dateStr)
      .map(schedule => ({
        ...schedule,
        personnelName: props.personnel[schedule.personnelId]?.name || '未知',
        contactPhone: props.personnel[schedule.personnelId]?.phone || '',
      }));

    days.push({
      date: dateStr,
      dayNumber: day,
      isToday: isSameDay(date, new Date()),
      schedules: daySchedules,
    });
  }

  return days;
});

// 方法
const formatDateStr = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const isToday = dateStr => {
  const today = new Date();
  const date = new Date(dateStr);
  return isSameDay(date, today);
};

const isSelected = dateStr => {
  if (!props.selectedDate) return false;
  const date = new Date(dateStr);
  return isSameDay(date, props.selectedDate);
};

const isCurrentMonth = dateStr => {
  const date = new Date(dateStr);
  return date.getMonth() === currentDate.value.getMonth();
};

const selectDate = dateStr => {
  const date = new Date(dateStr);
  emit('update:selectedDate', date);
  emit('date-select', date);
};

const handleScheduleClick = schedule => {
  emit('schedule-click', schedule);
};

const handleDragStart = (event, schedule) => {
  isDragging.value = true;
  draggedSchedule.value = schedule;
  event.dataTransfer.effectAllowed = 'move';
};

const handleDrop = (event, targetDate) => {
  event.preventDefault();
  isDragging.value = false;

  if (draggedSchedule.value && draggedSchedule.value.date !== targetDate) {
    emit('schedule-drop', draggedSchedule.value, targetDate);
  }

  draggedSchedule.value = null;
};

const handleQuickSchedule = dateStr => {
  const date = new Date(dateStr);
  emit('date-select', date);
};

const getScheduleTooltip = schedule => {
  return `${schedule.personnelName} - ${getShiftTypeName(schedule.shiftType)}
联系电话: ${schedule.contactPhone}
地点: ${schedule.location || '村委会'}
${schedule.remark ? '备注: ' + schedule.remark : ''}`;
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

// 监听当前日期变化
watch(
  () => props.schedules,
  () => {
    // 当值班数据更新时，可以添加额外的处理逻辑
  },
  { deep: true }
);
</script>

<style lang="scss" scoped>
.duty-calendar {
  .calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background-color: #e4e7ed;
    margin-bottom: 1px;

    .weekday {
      background-color: #f5f7fa;
      padding: 12px 0;
      text-align: center;
      font-weight: 500;
      color: #606266;
      font-size: 14px;
    }
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background-color: #e4e7ed;
    min-height: 500px;

    .calendar-day {
      background-color: white;
      min-height: 100px;
      padding: 8px;
      cursor: pointer;
      position: relative;
      transition: all 0.3s ease;

      &:hover {
        background-color: #f5f7fa;
        .quick-actions {
          opacity: 1;
        }
      }

      &.blank {
        background-color: #fafafa;
        cursor: default;
      }

      &.today {
        background-color: #ecf5ff;

        .day-number {
          color: #409eff;
          font-weight: bold;
        }
      }

      &.selected {
        background-color: #e1f3ff;
        box-shadow: 0 0 0 2px #409eff inset;
      }

      &.other-month {
        background-color: #fafafa;
        opacity: 0.5;
      }

      &.has-duties {
        background-color: #f0f9ff;
      }

      .day-number {
        font-size: 14px;
        color: #303133;
        margin-bottom: 8px;
        position: relative;

        .today-badge {
          position: absolute;
          top: -2px;
          right: -20px;
          background-color: #409eff;
          color: white;
          font-size: 10px;
          padding: 2px 4px;
          border-radius: 10px;
        }
      }

      .duty-info {
        .duty-item {
          background-color: #f0f2f5;
          border-radius: 4px;
          padding: 4px 6px;
          margin-bottom: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 12px;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          &.morning {
            background-color: #e1f3d1;
            border-left: 3px solid #67c23a;

            .shift-type {
              color: #67c23a;
            }
          }

          &.afternoon {
            background-color: #fdf6ec;
            border-left: 3px solid #e6a23c;

            .shift-type {
              color: #e6a23c;
            }
          }

          &.evening {
            background-color: #fef0f0;
            border-left: 3px solid #f56c6c;

            .shift-type {
              color: #f56c6c;
            }
          }

          &.night {
            background-color: #f4f4f5;
            border-left: 3px solid #909399;

            .shift-type {
              color: #909399;
            }
          }

          .duty-content {
            display: flex;
            justify-content: space-between;
            align-items: center;

            .personnel-name {
              font-weight: 500;
              color: #303133;
              flex: 1;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .shift-type {
              font-size: 10px;
              margin-left: 4px;
            }
          }
        }

        .more-duties {
          text-align: center;
          font-size: 12px;
          color: #909399;
          padding: 2px;
        }
      }

      .quick-actions {
        position: absolute;
        bottom: 8px;
        right: 8px;
        opacity: 0;
        transition: opacity 0.3s ease;

        .el-button {
          width: 28px;
          height: 28px;
        }
      }
    }
  }

  .drag-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    pointer-events: none;

    .drag-hint {
      background-color: white;
      padding: 20px 40px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      text-align: center;

      .el-icon {
        font-size: 48px;
        color: #409eff;
        margin-bottom: 12px;
      }

      p {
        margin: 0;
        color: #606266;
        font-size: 16px;
      }
    }
  }

  .calendar-legend {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-top: 20px;
    padding: 12px;
    background-color: #f5f7fa;
    border-radius: 4px;

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #606266;

      .legend-color {
        width: 16px;
        height: 16px;
        border-radius: 3px;

        &.morning {
          background-color: #e1f3d1;
          border-left: 3px solid #67c23a;
        }

        &.afternoon {
          background-color: #fdf6ec;
          border-left: 3px solid #e6a23c;
        }

        &.evening {
          background-color: #fef0f0;
          border-left: 3px solid #f56c6c;
        }

        &.night {
          background-color: #f4f4f5;
          border-left: 3px solid #909399;
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .duty-calendar {
    .calendar-grid {
      .calendar-day {
        min-height: 80px;
        padding: 4px;

        .day-number {
          font-size: 12px;
          margin-bottom: 4px;

          .today-badge {
            font-size: 8px;
            padding: 1px 3px;
          }
        }

        .duty-info {
          .duty-item {
            padding: 2px 4px;
            font-size: 11px;
            margin-bottom: 2px;

            .duty-content {
              .personnel-name {
                max-width: 60px;
              }
            }
          }
        }
      }
    }

    .calendar-legend {
      flex-wrap: wrap;
      gap: 12px;

      .legend-item {
        font-size: 11px;
      }
    }
  }
}
</style>
