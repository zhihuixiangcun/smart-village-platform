<template>
  <div class="meeting-list">
    <!-- 页面标题和操作 -->
    <div class="meeting-header">
      <h1>会议管理</h1>
      <div class="header-actions">
        <el-button
          type="primary"
          @click="showCreateDialog = true"
          v-if="canCreateMeeting"
        >
          <i class="el-icon-plus"></i>
          创建会议
        </el-button>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="meeting-filters">
      <el-row :gutter="16">
        <el-col :span="4">
          <el-select v-model="filters.status" @change="loadMeetings" placeholder="会议状态">
            <el-option label="全部" value="all"></el-option>
            <el-option label="草稿" value="draft"></el-option>
            <el-option label="已安排" value="scheduled"></el-option>
            <el-option label="已通知" value="notified"></el-option>
            <el-option label="进行中" value="in_progress"></el-option>
            <el-option label="已完成" value="completed"></el-option>
            <el-option label="已取消" value="cancelled"></el-option>
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.meetingType" @change="loadMeetings" placeholder="会议类型">
            <el-option label="全部" value=""></el-option>
            <el-option label="村委会议" value="committee_meeting"></el-option>
            <el-option label="村民大会" value="village_assembly"></el-option>
            <el-option label="专题会议" value="special_meeting"></el-option>
            <el-option label="紧急会议" value="emergency_meeting"></el-option>
            <el-option label="工作会议" value="work_meeting"></el-option>
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.timeRange" @change="loadMeetings" placeholder="时间范围">
            <el-option label="即将举行" value="upcoming"></el-option>
            <el-option label="已结束" value="past"></el-option>
            <el-option label="全部时间" value="all"></el-option>
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-input
            v-model="filters.search"
            @keyup.enter="loadMeetings"
            placeholder="搜索会议标题或内容"
            clearable
          >
            <template #append>
              <el-button @click="loadMeetings" icon="el-icon-search"></el-button>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-button @click="resetFilters">重置</el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 即将举行的会议提醒 -->
    <div v-if="upcomingMeetings.length > 0" class="upcoming-meetings">
      <el-alert
        title="即将举行的会议"
        type="warning"
        :closable="false"
        show-icon
      >
        <div class="upcoming-list">
          <div
            v-for="meeting in upcomingMeetings.slice(0, 3)"
            :key="meeting._id"
            class="upcoming-item"
            @click="viewMeeting(meeting._id)"
          >
            <div class="upcoming-info">
              <span class="meeting-title">{{ meeting.title }}</span>
              <span class="meeting-time">{{ formatDateTime(meeting.scheduledTime.startTime) }}</span>
            </div>
            <div class="time-remaining">
              {{ getTimeRemaining(meeting.scheduledTime.startTime) }}
            </div>
          </div>
        </div>
      </el-alert>
    </div>

    <!-- 会议列表 -->
    <div class="meeting-content" v-loading="loading">
      <el-empty v-if="meetings.length === 0 && !loading" description="暂无会议"></el-empty>

      <div class="meeting-grid" v-else>
        <div
          v-for="meeting in meetings"
          :key="meeting._id"
          class="meeting-card"
          :class="{
            'upcoming': meeting.isUpcoming,
            'active': meeting.isActive,
            'past': meeting.isPast,
            'urgent': meeting.priority === 'urgent'
          }"
        >
          <div class="meeting-card-header">
            <div class="meeting-status">
              <el-tag
                :type="getStatusType(meeting)"
                size="small"
              >
                {{ getStatusText(meeting.status) }}
              </el-tag>
              <el-tag
                v-if="meeting.hasCheckedIn"
                type="success"
                size="small"
              >
                已签到
              </el-tag>
              <el-tag
                v-if="meeting.priority === 'urgent'"
                type="danger"
                size="small"
              >
                紧急
              </el-tag>
            </div>
            <div class="meeting-type">
              <span class="type-text">{{ getMeetingTypeText(meeting.meetingType) }}</span>
            </div>
          </div>

          <div class="meeting-card-body">
            <h3 class="meeting-title" @click="viewMeeting(meeting._id)">
              {{ meeting.title }}
            </h3>
            <p class="meeting-description">{{ meeting.description }}</p>

            <div class="meeting-details">
              <div class="detail-item">
                <i class="el-icon-time"></i>
                <span>{{ formatDateTime(meeting.scheduledTime.startTime) }}</span>
              </div>
              <div class="detail-item">
                <i class="el-icon-location"></i>
                <span>{{ meeting.location.venue }}</span>
              </div>
              <div class="detail-item">
                <i class="el-icon-user"></i>
                <span>{{ meeting.organizer.realName }}</span>
              </div>
              <div class="detail-item">
                <i class="el-icon-s-data"></i>
                <span>{{ meeting.statistics.attendanceRate }}% 出席率</span>
              </div>
            </div>

            <div v-if="meeting.timeUntilStart" class="time-countdown">
              <el-progress
                :percentage="getTimeProgress(meeting)"
                :status="meeting.isUpcoming ? 'success' : 'warning'"
                :stroke-width="6"
              ></el-progress>
              <div class="countdown-text">
                {{ getTimeRemaining(meeting.scheduledTime.startTime) }}
              </div>
            </div>
          </div>

          <div class="meeting-card-footer">
            <div class="meeting-tags">
              <el-tag
                v-for="tag in meeting.tags"
                :key="tag"
                size="mini"
                type="info"
              >
                {{ tag }}
              </el-tag>
            </div>

            <div class="meeting-actions">
              <el-button
                size="small"
                @click="viewMeeting(meeting._id)"
              >
                查看详情
              </el-button>
              <el-button
                v-if="meeting.isUpcoming && !meeting.hasCheckedIn"
                type="primary"
                size="small"
                @click="checkInMeeting(meeting._id)"
              >
                立即签到
              </el-button>
              <el-button
                v-if="meeting.isActive"
                type="success"
                size="small"
                @click="joinMeeting(meeting._id)"
              >
                进入会议
              </el-button>
              <el-button
                v-if="canManageMeeting(meeting)"
                type="warning"
                size="small"
                @click="manageMeeting(meeting._id)"
              >
                管理
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="meeting-pagination" v-if="pagination.total > 0">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="pagination.page"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pagination.limit"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
        >
        </el-pagination>
      </div>
    </div>

    <!-- 创建会议对话框 -->
    <MeetingCreateDialog
      :visible.sync="showCreateDialog"
      @created="handleMeetingCreated"
    />

    <!-- 签到对话框 -->
    <MeetingCheckInDialog
      :visible.sync="showCheckInDialog"
      :meeting-id="selectedMeetingId"
      @checked-in="handleCheckedIn"
    />
  </div>
</template>

<script>
import { meetingAPI } from '@/api/meeting'
import MeetingCreateDialog from './MeetingCreateDialog.vue'
import MeetingCheckInDialog from './MeetingCheckInDialog.vue'
import { formatDate, formatDateTime } from '@/utils/dateUtils'

export default {
  name: 'MeetingList',
  components: {
    MeetingCreateDialog,
    MeetingCheckInDialog
  },
  data() {
    return {
      loading: false,
      showCreateDialog: false,
      showCheckInDialog: false,
      selectedMeetingId: null,
      meetings: [],
      upcomingMeetings: [],
      filters: {
        status: 'all',
        meetingType: '',
        timeRange: 'upcoming',
        search: ''
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      }
    }
  },
  computed: {
    canCreateMeeting() {
      return this.$store.getters.userRole === 'committee' || this.$store.getters.userRole === 'admin'
    }
  },
  mounted() {
    this.loadMeetings()
    this.loadUpcomingMeetings()
  },
  methods: {
    async loadMeetings() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          ...this.filters
        }

        const response = await meetingAPI.getMeetingList(params)

        if (response.data.success) {
          this.meetings = response.data.data.meetings
          this.pagination = response.data.data.pagination
        }
      } catch (error) {
        this.$message.error('加载会议列表失败')
        console.error(error)
      } finally {
        this.loading = false
      }
    },

    async loadUpcomingMeetings() {
      try {
        const response = await meetingAPI.getUpcomingMeetings(3)
        if (response.data.success) {
          this.upcomingMeetings = response.data.data.meetings
        }
      } catch (error) {
        console.error('加载即将举行的会议失败:', error)
      }
    },

    resetFilters() {
      this.filters = {
        status: 'all',
        meetingType: '',
        timeRange: 'upcoming',
        search: ''
      }
      this.pagination.page = 1
      this.loadMeetings()
    },

    handleSizeChange(newSize) {
      this.pagination.limit = newSize
      this.pagination.page = 1
      this.loadMeetings()
    },

    handleCurrentChange(newPage) {
      this.pagination.page = newPage
      this.loadMeetings()
    },

    handleMeetingCreated() {
      this.showCreateDialog = false
      this.loadMeetings()
      this.loadUpcomingMeetings()
    },

    handleCheckedIn() {
      this.showCheckInDialog = false
      this.loadMeetings()
    },

    viewMeeting(meetingId) {
      this.$router.push(`/meetings/${meetingId}`)
    },

    checkInMeeting(meetingId) {
      this.selectedMeetingId = meetingId
      this.showCheckInDialog = true
    },

    joinMeeting(meetingId) {
      this.$router.push(`/meetings/${meetingId}/session`)
    },

    manageMeeting(meetingId) {
      this.$router.push(`/meetings/${meetingId}/manage`)
    },

    canManageMeeting(meeting) {
      const userRole = this.$store.getters.userRole
      const userId = this.$store.getters.userId

      return userRole === 'admin' ||
             userRole === 'committee' ||
             meeting.organizer._id === userId
    },

    getStatusType(meeting) {
      switch (meeting.status) {
        case 'draft': return 'info'
        case 'scheduled': return 'warning'
        case 'notified': return 'primary'
        case 'in_progress': return 'success'
        case 'completed': return 'success'
        case 'cancelled': return 'danger'
        case 'postponed': return 'warning'
        default: return 'info'
      }
    },

    getStatusText(status) {
      const statusMap = {
        'draft': '草稿',
        'scheduled': '已安排',
        'notified': '已通知',
        'in_progress': '进行中',
        'completed': '已完成',
        'cancelled': '已取消',
        'postponed': '已延期'
      }
      return statusMap[status] || '未知'
    },

    getMeetingTypeText(meetingType) {
      const typeMap = {
        'committee_meeting': '村委会议',
        'village_assembly': '村民大会',
        'special_meeting': '专题会议',
        'emergency_meeting': '紧急会议',
        'work_meeting': '工作会议'
      }
      return typeMap[meetingType] || '其他会议'
    },

    getTimeRemaining(startTime) {
      const now = new Date()
      const start = new Date(startTime)
      const diff = start - now

      if (diff <= 0) return '已开始'

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (days > 0) return `${days}天${hours}小时`
      if (hours > 0) return `${hours}小时${minutes}分钟`
      return `${minutes}分钟`
    },

    getTimeProgress(meeting) {
      if (!meeting.timeUntilStart) return 100

      const now = new Date()
      const start = new Date(meeting.scheduledTime.startTime)
      const created = new Date(meeting.createdAt)

      const totalTime = start - created
      const elapsed = now - created

      return Math.max(0, Math.min(100, (elapsed / totalTime) * 100))
    },

    formatDate,
    formatDateTime
  }
}
</script>

<style scoped>
.meeting-list {
  padding: 20px;
}

.meeting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.meeting-header h1 {
  margin: 0;
  color: #333;
}

.meeting-filters {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.upcoming-meetings {
  margin-bottom: 20px;
}

.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.upcoming-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.upcoming-item:hover {
  background: #f0f0f0;
}

.upcoming-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meeting-title {
  font-weight: bold;
  color: #333;
}

.meeting-time {
  font-size: 12px;
  color: #666;
}

.time-remaining {
  color: #e6a23c;
  font-weight: bold;
  font-size: 14px;
}

.meeting-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.meeting-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border-left: 4px solid #ddd;
}

.meeting-card.upcoming {
  border-left-color: #e6a23c;
}

.meeting-card.active {
  border-left-color: #67c23a;
}

.meeting-card.past {
  border-left-color: #909399;
}

.meeting-card.urgent {
  border-left-color: #f56c6c;
  background: linear-gradient(135deg, #fff2f0, #fff);
}

.meeting-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.meeting-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.meeting-status {
  display: flex;
  gap: 8px;
}

.type-text {
  font-size: 12px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 12px;
}

.meeting-title {
  margin: 0 0 10px 0;
  color: #333;
  cursor: pointer;
  transition: color 0.3s ease;
  font-size: 16px;
}

.meeting-title:hover {
  color: #409eff;
}

.meeting-description {
  color: #666;
  margin: 0 0 15px 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 14px;
}

.meeting-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.detail-item i {
  width: 16px;
  color: #409eff;
}

.time-countdown {
  margin-bottom: 15px;
}

.countdown-text {
  text-align: center;
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}

.meeting-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meeting-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.meeting-actions {
  display: flex;
  gap: 8px;
}

.meeting-pagination {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .meeting-list {
    padding: 10px;
  }

  .meeting-grid {
    grid-template-columns: 1fr;
  }

  .meeting-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .meeting-card {
    padding: 15px;
  }

  .meeting-details {
    font-size: 12px;
  }

  .meeting-card-footer {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .meeting-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>