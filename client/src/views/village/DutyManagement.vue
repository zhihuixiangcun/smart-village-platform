<template>
  <div class="duty-management">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="智能值班表"
      left-arrow
      @click-left="$router.go(-1)"
    >
      <template #right>
        <van-icon name="calendar-o" size="20" @click="showCalendarView = true" />
      </template>
    </van-nav-bar>

    <!-- 今日值班 -->
    <div class="today-duty">
      <van-cell-group inset title="今日值班">
        <van-loading v-if="loadingTodayDuty" size="24px" vertical>加载中...</van-loading>
        <van-empty v-else-if="!todayDutyData || todayDutyData.length === 0" description="今日无值班人员" />
        <template v-else>
          <van-cell
            v-for="schedule in todayDutyData"
            :key="schedule.scheduleId"
            :title="schedule.scheduleName"
          >
            <template #label>
              <div
                v-for="assignment in schedule.assignments"
                :key="assignment.userId"
                class="assignment-item"
              >
                <span>{{ assignment.userName }}</span>
                <van-tag :type="assignment.isPrimary ? 'primary' : 'default'" size="small">
                  {{ assignment.isPrimary ? '主值班' : '副值班' }}
                </van-tag>
                <span class="shift-info">
                  {{ assignment.shift?.shiftName || '' }} {{ assignment.shift?.startTime || '' }}-{{ assignment.shift?.endTime || '' }}
                </span>
              </div>
            </template>
          </van-cell>
        </template>
      </van-cell-group>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <van-button
        type="primary"
        size="large"
        icon="phone-o"
        @click="showCallDialog = true"
        class="emergency-button"
      >
        一键呼叫值班人员
      </van-button>
      <van-button
        type="success"
        size="large"
        icon="qr"
        @click="showQRScanner = true"
        class="qr-button"
      >
        扫码呼叫
      </van-button>
    </div>

    <!-- 本周排班 -->
    <div class="weekly-schedule">
      <van-cell-group inset title="本周排班">
        <van-collapse v-model="activeNames">
          <van-collapse-item
            v-for="(day, index) in weeklySchedule"
            :key="index"
            :title="day.date"
            :name="index"
          >
            <van-cell
              v-for="person in day.persons"
              :key="person.id"
              :title="person.name"
              :label="person.role + ' ' + person.time"
            >
              <template #left-icon>
                <van-icon :name="person.icon" />
              </template>
              <template #right-icon>
                <van-tag
                  :type="getTodayStatus(day.date)"
                  size="small"
                >
                  {{ getTodayStatus(day.date) === 'primary' ? '今天' : '' }}
                </van-tag>
              </template>
            </van-cell>
          </van-collapse-item>
        </van-collapse>
      </van-cell-group>
    </div>

    <!-- 值班历史 -->
    <div class="duty-history">
      <van-cell-group inset title="值班记录">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <van-cell
            v-for="record in dutyRecords"
            :key="record.id"
            :title="record.name"
            :label="formatRecordLabel(record)"
            is-link
            @click="viewRecord(record)"
          >
            <template #left-icon>
              <van-icon name="records" />
            </template>
            <template #right-icon>
              <van-tag :type="getRecordType(record.status)" size="small">
                {{ getRecordText(record.status) }}
              </van-tag>
            </template>
          </van-cell>
        </van-list>
      </van-cell-group>
    </div>

    <!-- 悬浮操作按钮 -->
    <van-floating-bubble
      axis="xy"
      icon="add"
      @click="showAddOptions = true"
    />

    <!-- 添加选项弹窗 -->
    <van-popup v-model:show="showAddOptions" position="bottom">
      <div class="add-options">
        <h3>添加值班</h3>
        <van-cell-group>
          <van-cell title="临时排班" icon="calendar-o" @click="addTempDuty" />
          <van-cell title="紧急值班" icon="warning-o" @click="addEmergencyDuty" />
          <van-cell title="替班申请" icon="exchange" @click="addSubstituteDuty" />
        </van-cell-group>
      </div>
    </van-popup>

    <!-- 排班表弹窗 -->
    <van-popup v-model:show="showSchedule" position="bottom" :style="{ height: '80%' }">
      <div class="schedule-popup">
        <div class="schedule-header">
          <h3>值班排班表</h3>
          <van-icon name="cross" @click="showSchedule = false" />
        </div>
        <div class="schedule-content">
          <van-calendar
            v-model="currentDate"
            :show-confirm="false"
            :min-date="minDate"
            :max-date="maxDate"
          />
        </div>
      </div>
    </van-popup>

    <!-- 日历视图弹窗 -->
    <van-popup v-model:show="showCalendarView" position="bottom" :style="{ height: '85%' }">
      <div class="calendar-view-popup">
        <div class="calendar-header">
          <h3>值班日历</h3>
          <div class="month-selector">
            <van-button size="small" icon="arrow-left" @click="prevMonth" />
            <span>{{ currentYear }}年{{ currentMonth }}月</span>
            <van-button size="small" icon="arrow" @click="nextMonth" />
          </div>
          <van-icon name="cross" @click="showCalendarView = false" />
        </div>
        <div class="calendar-content">
          <van-loading v-if="loadingCalendar" size="24px" vertical>加载中...</van-loading>
          <div v-else class="calendar-grid">
            <div class="calendar-weekdays">
              <span v-for="day in weekdays" :key="day">{{ day }}</span>
            </div>
            <div class="calendar-days">
              <div
                v-for="(day, index) in calendarDays"
                :key="index"
                :class="['calendar-day', { 'is-today': day.isToday, 'has-duty': day.hasDuty }]"
                @click="showDayDetail(day)"
              >
                <span class="day-number">{{ day.dayNumber }}</span>
                <div v-if="day.hasDuty" class=" duty-indicators">
                  <div
                    v-for="(event, i) in day.events.slice(0, 2)"
                    :key="i"
                    class="duty-dot"
                    :title="event.title"
                  />
                  <span v-if="day.events.length > 2" class="more-events">+{{ day.events.length - 2 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 呼叫对话框 -->
    <van-dialog v-model:show="showCallDialog" title="呼叫值班人员" show-cancel-button>
      <van-form @submit="submitCall">
        <van-cell-group inset>
          <van-field
            v-model="callForm.content"
            name="content"
            label="呼叫内容"
            type="textarea"
            placeholder="请输入呼叫内容"
            rows="3"
            :rules="[{ required: true, message: '请输入呼叫内容' }]"
          />
          <van-field name="urgency" label="紧急程度">
            <template #input>
              <van-radio-group v-model="callForm.urgency" direction="horizontal">
                <van-radio name="LOW">普通</van-radio>
                <van-radio name="MEDIUM">中等</van-radio>
                <van-radio name="HIGH">紧急</van-radio>
                <van-radio name="URGENT">非常紧急</van-radio>
              </van-radio-group>
            </template>
          </van-field>
        </van-cell-group>
        <div class="dialog-actions">
          <van-button round block type="primary" native-type="submit">
            发起呼叫
          </van-button>
        </div>
      </van-form>
    </van-dialog>

    <!-- 日详情弹窗 -->
    <van-popup v-model:show="showDayDetailPopup" position="bottom" round>
      <div class="day-detail-popup">
        <div class="day-detail-header">
          <h3>{{ selectedDayDate }}值班安排</h3>
          <van-icon name="cross" @click="showDayDetailPopup = false" />
        </div>
        <div class="day-detail-content">
          <van-empty v-if="!selectedDayEvents || selectedDayEvents.length === 0" description="当日无值班安排" />
          <van-cell v-else v-for="event in selectedDayEvents" :key="event.date" :title="event.userName">
            <template #label>
              <div>{{ event.shiftName }} ({{ event.startTime }}-{{ event.endTime }})</div>
              <div>{{ event.userPhone }}</div>
            </template>
            <template #right-icon>
              <van-tag :type="event.isPrimary ? 'primary' : 'default'">
                {{ event.isPrimary ? '主值班' : '副值班' }}
              </van-tag>
            </template>
          </van-cell>
        </div>
      </div>
    </van-popup>

    <!-- 智能排班弹窗 -->
    <van-popup v-model:show="showSmartSchedule" position="bottom" round>
      <div class="smart-schedule-popup">
        <div class="smart-schedule-header">
          <h3>智能排班</h3>
          <van-icon name="cross" @click="showSmartSchedule = false" />
        </div>
        <van-form @submit="generateSmartSchedule">
          <van-cell-group inset>
            <van-field
              v-model="scheduleForm.startDate"
              name="startDate"
              label="开始日期"
              placeholder="请选择开始日期"
              readonly
              is-link
              @click="showStartDatePicker = true"
            />
            <van-field
              v-model="scheduleForm.endDate"
              name="endDate"
              label="结束日期"
              placeholder="请选择结束日期"
              readonly
              is-link
              @click="showEndDatePicker = true"
            />
            <van-cell title="平衡工作量">
              <template #right-icon>
                <van-switch v-model="scheduleForm.balanceWorkload" />
              </template>
            </van-cell>
            <van-cell title="强制休息时间">
              <template #right-icon>
                <van-switch v-model="scheduleForm.enforceRestTime" />
              </template>
            </van-cell>
          </van-cell-group>
          <div class="smart-schedule-actions">
            <van-button round block type="primary" native-type="submit" :loading="generatingSchedule">
              开始智能排班
            </van-button>
          </div>
        </van-form>
      </div>
    </van-popup>

    <!-- 日期选择器 -->
    <van-date-picker
      v-model="startDate"
      :show="showStartDatePicker"
      @confirm="onStartDateConfirm"
      @cancel="showStartDatePicker = false"
    />
    <van-date-picker
      v-model="endDate"
      :show="showEndDatePicker"
      @confirm="onEndDateConfirm"
      @cancel="showEndDatePicker = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import dutyScheduleApi from '@/api/dutySchedule'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// ============ 响应式数据 ============
const loading = ref(false)
const loadingTodayDuty = ref(false)
const loadingCalendar = ref(false)
const finished = ref(false)
const activeNames = ref([0])
const showSchedule = ref(false)
const showCalendarView = ref(false)
const showCallDialog = ref(false)
const showQRScanner = ref(false)
const showDayDetailPopup = ref(false)
const showSmartSchedule = ref(false)
const showStartDatePicker = ref(false)
const showEndDatePicker = ref(false)
const generatingSchedule = ref(false)

const dutyRecords = ref([])
const todayDutyData = ref([])
const calendarEvents = ref([])
const selectedDayEvents = ref([])
const selectedDayDate = ref('')

// 当前选择的日期
const currentDate = ref(new Date())
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)

// 日期选择器值
const startDate = ref([])
const endDate = ref([])

// 周显示
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

// 呼叫表单
const callForm = reactive({
  content: '',
  urgency: 'LOW',
  location: {}
})

// 智能排班表单
const scheduleForm = reactive({
  startDate: '',
  endDate: '',
  balanceWorkload: true,
  enforceRestTime: true,
  considerPreferences: true
})

// 分页参数
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 村庄ID (从用户信息获取)
const villageId = computed(() => userStore.userInfo?.villageId || 'default-village-id')

// ============ 计算属性 ============
const minDate = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return date
})

const maxDate = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date
})

// 生成日历网格数据
const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startWeekday = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const today = new Date()

  const days = []

  // 填充月初空白
  for (let i = 0; i < startWeekday; i++) {
    days.push({ dayNumber: '', isToday: false, hasDuty: false, events: [] })
  }

  // 填充日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayEvents = calendarEvents.value.filter(e => {
      const eventDate = new Date(e.date)
      return eventDate.getDate() === day &&
             eventDate.getMonth() === month - 1 &&
             eventDate.getFullYear() === year
    })
    const isToday = today.getDate() === day &&
                   today.getMonth() === month - 1 &&
                   today.getFullYear() === year

    days.push({
      dayNumber: day,
      date: dateStr,
      isToday,
      hasDuty: dayEvents.length > 0,
      events: dayEvents
    })
  }

  return days
})

// ============ API 调用方法 ============
/**
 * 加载今日值班数据
 */
const loadTodayDuty = async () => {
  loadingTodayDuty.value = true
  try {
    const response = await dutyScheduleApi.getTodayDuty(villageId.value)
    if (response.success) {
      todayDutyData.value = response.data.duties || []
    } else {
      showToast(response.message || '加载失败')
    }
  } catch (error) {
    console.error('加载今日值班失败:', error)
    showToast('加载今日值班失败')
  } finally {
    loadingTodayDuty.value = false
  }
}

/**
 * 加载日历数据
 */
const loadCalendarData = async () => {
  loadingCalendar.value = true
  try {
    const response = await dutyScheduleApi.getCalendarData({
      year: currentYear.value,
      month: currentMonth.value
    })
    if (response.success) {
      calendarEvents.value = response.data.events || []
    } else {
      showToast(response.message || '加载日历数据失败')
    }
  } catch (error) {
    console.error('加载日历数据失败:', error)
    showToast('加载日历数据失败')
  } finally {
    loadingCalendar.value = false
  }
}

/**
 * 提交呼叫请求
 */
const submitCall = async () => {
  if (!callForm.content) {
    showToast('请输入呼叫内容')
    return
  }

  loading.value = true
  try {
    const response = await dutyScheduleApi.scanAndCall({
      qrCodeData: `smartvillage://duty/${villageId.value}/default`,
      urgency: callForm.urgency,
      content: callForm.content,
      location: callForm.location
    })

    if (response.success) {
      showToast('呼叫已发送，值班人员将尽快联系您')
      showCallDialog.value = false
      // 重置表单
      callForm.content = ''
      callForm.urgency = 'LOW'
    } else {
      showToast(response.message || '呼叫失败')
    }
  } catch (error) {
    console.error('呼叫失败:', error)
    showToast(error.message || '呼叫失败')
  } finally {
    loading.value = false
  }
}

/**
 * 智能排班
 */
const generateSmartSchedule = async () => {
  if (!scheduleForm.startDate || !scheduleForm.endDate) {
    showToast('请选择排班日期范围')
    return
  }

  generatingSchedule.value = true
  try {
    // 这里需要一个有效的scheduleId，实际应用中应该从值班表列表选择
    const scheduleId = 'default-schedule-id'
    const response = await dutyScheduleApi.generateSmartSchedule(scheduleId, scheduleForm)

    if (response.success) {
      showToast(`智能排班成功！已生成 ${response.data.totalAssignments} 条排班记录`)
      showSmartSchedule.value = false
      // 重新加载日历数据
      await loadCalendarData()
    } else {
      showToast(response.message || '智能排班失败')
    }
  } catch (error) {
    console.error('智能排班失败:', error)
    showToast(error.message || '智能排班失败')
  } finally {
    generatingSchedule.value = false
  }
}

// ============ 日历相关方法 ============
/**
 * 上一月
 */
const prevMonth = () => {
  if (currentMonth.value === 1) {
    currentYear.value -= 1
    currentMonth.value = 12
  } else {
    currentMonth.value -= 1
  }
  loadCalendarData()
}

/**
 * 下一月
 */
const nextMonth = () => {
  if (currentMonth.value === 12) {
    currentYear.value += 1
    currentMonth.value = 1
  } else {
    currentMonth.value += 1
  }
  loadCalendarData()
}

/**
 * 显示日详情
 */
const showDayDetail = (day) => {
  if (!day.hasDuty) return
  selectedDayDate.value = day.date
  selectedDayEvents.value = day.events
  showDayDetailPopup.value = true
}

// ============ 日期选择器方法 ============
/**
 * 开始日期确认
 */
const onStartDateConfirm = ({ selectedValues }) => {
  scheduleForm.startDate = selectedValues.join('-')
  showStartDatePicker.value = false
}

/**
 * 结束日期确认
 */
const onEndDateConfirm = ({ selectedValues }) => {
  scheduleForm.endDate = selectedValues.join('-')
  showEndDatePicker.value = false
}

// ============ 其他方法 ============
const getRecordType = (status) => {
  const typeMap = {
    'completed': 'success',
    'absent': 'danger',
    'late': 'warning',
    'early_leave': 'warning'
  }
  return typeMap[status] || 'default'
}

const getRecordText = (status) => {
  const textMap = {
    'completed': '正常',
    'absent': '缺勤',
    'late': '迟到',
    'early_leave': '早退'
  }
  return textMap[status] || status
}

const formatRecordLabel = (record) => {
  const labels = []
  if (record.date) {
    labels.push(`日期: ${formatDate(record.date)}`)
  }
  if (record.timeRange) {
    labels.push(`时间: ${record.timeRange}`)
  }
  if (record.duration) {
    labels.push(`时长: ${record.duration}`)
  }
  return labels.join(' • ')
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const viewRecord = (record) => {
  router.push(`/village/duty/${record.id}`)
}

const onLoad = () => {
  loadDutyRecords()
}

const loadDutyRecords = async (reset = false) => {
  if (reset) {
    pagination.page = 1
    dutyRecords.value = []
    finished.value = false
  }

  loading.value = true
  try {
    // 使用真实API获取呼叫记录
    const response = await dutyScheduleApi.getCallerLogs({
      limit: pagination.limit,
      skip: (pagination.page - 1) * pagination.limit
    })

    if (response.success) {
      const newRecords = response.data.logs || []
      if (reset) {
        dutyRecords.value = newRecords
      } else {
        dutyRecords.value.push(...newRecords)
      }
      pagination.total = response.data.total || 0
      pagination.page += 1
      finished.value = dutyRecords.value.length >= pagination.total
    } else {
      showToast(response.message || '加载失败')
    }
  } catch (error) {
    console.error('加载值班记录失败:', error)
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

// ============ 监听日历显示 ============
watch(showCalendarView, (newVal) => {
  if (newVal) {
    loadCalendarData()
  }
})

// ============ 生命周期 ============
onMounted(() => {
  loadTodayDuty()
  loadDutyRecords(true)
})
</script>

<style scoped>
.duty-management {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.today-duty {
  margin-bottom: 16px;
}

.assignment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.shift-info {
  color: #969799;
  font-size: 12px;
}

.quick-actions {
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
}

.emergency-button,
.qr-button {
  flex: 1;
  height: 56px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
}

.weekly-schedule {
  margin-bottom: 16px;
}

.duty-history {
  margin-bottom: 80px;
}

/* 对话框样式 */
.dialog-actions {
  padding: 16px;
}

/* 日历视图样式 */
.calendar-view-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.month-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 600;
}

.calendar-header h3 {
  margin: 0;
  font-size: 16px;
}

.calendar-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.calendar-grid {
  background: white;
  border-radius: 8px;
  padding: 16px;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
  margin-bottom: 8px;
}

.calendar-weekdays span {
  color: #969799;
  font-size: 12px;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 8px 4px;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
}

.calendar-day:hover {
  background-color: #f7f8fa;
}

.calendar-day.is-today {
  background-color: #1989fa;
  color: white;
}

.calendar-day.has-duty {
  background-color: #e8f4ff;
}

.calendar-day.is-today.has-duty {
  background-color: #1989fa;
}

.day-number {
  font-size: 14px;
  font-weight: 500;
}

.duty-indicators {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  justify-content: center;
  margin-top: 4px;
}

.duty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #1989fa;
}

.calendar-day.is-today .duty-dot {
  background-color: white;
}

.more-events {
  font-size: 10px;
  color: #969799;
}

.calendar-day.is-today .more-events {
  color: white;
}

/* 日详情弹窗样式 */
.day-detail-popup {
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.day-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.day-detail-header h3 {
  margin: 0;
  font-size: 16px;
}

.day-detail-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

/* 智能排班弹窗样式 */
.smart-schedule-popup {
  max-height: 80vh;
  overflow: auto;
}

.smart-schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.smart-schedule-header h3 {
  margin: 0;
  font-size: 16px;
}

.smart-schedule-actions {
  padding: 16px;
}

/* 旧样式保留 */
.add-options {
  padding: 16px;
}

.add-options h3 {
  text-align: center;
  margin: 0 0 16px 0;
  font-size: 16px;
}

.schedule-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.schedule-header h3 {
  margin: 0;
  font-size: 16px;
}

.schedule-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}
</style>