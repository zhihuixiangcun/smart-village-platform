<template>
  <div class="calendar-view">
    <el-calendar v-model="currentDate">
      <template #date-cell="{ data }">
        <div class="calendar-cell">
          <div class="date">{{ data.day.split('-').slice(2).join('/') }}</div>
          <div class="activities">
            <div v-for="activity in getActivitiesForDate(data.day)" :key="activity.id" class="activity-item" @click="viewActivity(activity.id)">
              <div class="activity-dot" :style="{ backgroundColor: getColorByType(activity.type) }"></div>
              <span class="activity-name">{{ activity.title }}</span>
            </div>
          </div>
        </div>
      </template>
    </el-calendar>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { communityApi } from '@/api/community';

const router = useRouter();
const currentDate = ref(new Date());
const activities = ref([]);

const loadActivities = async () => {
  try {
    const response = await communityApi.getActivityCalendar();
    if (response.data.success) {
      activities.value = response.data.data || [];
    }
  } catch (error) {
    ElMessage.error('加载活动失败');
  }
};

const getActivitiesForDate = (date) => {
  return activities.value.filter(a => {
    const activityDate = new Date(a.startTime).toISOString().split('T')[0];
    return activityDate === date;
  });
};

const getColorByType = (type) => {
  const colors = {
    sports: '#67c23a',
    training: '#409eff',
    volunteer: '#e6a23c',
    festival: '#f56c6c',
  };
  return colors[type] || '#909399';
};

const viewActivity = (id) => {
  router.push(`/community/activities/${id}`);
};

loadActivities();
</script>

<style lang="scss" scoped>
.calendar-view {
  padding: 24px;

  :deep(.el-calendar) {
    .el-calendar__header {
      padding: 12px 20px;
      border-bottom: 1px solid #e4e7ed;
    }

    .el-calendar-table {
      td.is-selected {
        background: #ecf5ff;
      }
    }

    .el-calendar-table .el-calendar-day {
      height: 120px;
      padding: 8px;
    }
  }

  .calendar-cell {
    height: 100%;
    display: flex;
    flex-direction: column;

    .date {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .activities {
      flex: 1;
      overflow-y: auto;

      .activity-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px;
        margin-bottom: 4px;
        background: #f8fafc;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;

        &:hover {
          background: #e2e8f0;
        }

        .activity-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .activity-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }
}
</style>
