<template>
  <div class="meeting-minutes">
    <div class="minutes-header">
      <h3>会议纪要</h3>
      <div class="header-actions">
        <el-button v-if="canEditMinutes" type="primary" size="small" @click="showEditDialog = true">
          编辑纪要
        </el-button>
        <el-button
          v-if="minutes && minutes.status === 'completed'"
          size="small"
          @click="exportMinutes"
        >
          导出纪要
        </el-button>
      </div>
    </div>

    <!-- 纪要内容 -->
    <div v-if="minutes" class="minutes-content">
      <!-- 会议基本信息 -->
      <div class="meeting-info-section">
        <h4>会议基本信息</h4>
        <div class="info-grid">
          <div class="info-item">
            <label>会议主题：</label>
            <span>{{ meeting.title }}</span>
          </div>
          <div class="info-item">
            <label>会议时间：</label>
            <span>{{ formatDateTime(meeting.scheduledTime.startTime) }}</span>
          </div>
          <div class="info-item">
            <label>会议地点：</label>
            <span>{{ meeting.location.venue }}</span>
          </div>
          <div class="info-item">
            <label>主持人：</label>
            <span>{{ meeting.chairperson?.realName || meeting.organizer.realName }}</span>
          </div>
          <div class="info-item">
            <label>记录人：</label>
            <span>{{ minutes.recordedBy?.realName }}</span>
          </div>
          <div class="info-item">
            <label>参会人数：</label>
            <span>{{ minutes.attendees?.length || 0 }}人</span>
          </div>
        </div>
      </div>

      <!-- 出席人员 -->
      <div v-if="minutes.attendees && minutes.attendees.length > 0" class="attendees-section">
        <h4>出席人员</h4>
        <div class="attendees-grid">
          <div
            v-for="attendee in minutes.attendees"
            :key="attendee.userId._id"
            class="attendee-item"
          >
            <div class="attendee-info">
              <span class="attendee-name">{{ attendee.userId.realName }}</span>
              <span class="attendee-role">{{ attendee.role }}</span>
            </div>
            <el-tag :type="attendee.status === 'present' ? 'success' : 'warning'" size="mini">
              {{ getAttendanceText(attendee.status) }}
            </el-tag>
          </div>
        </div>
      </div>

      <!-- 议程讨论 -->
      <div
        v-if="minutes.agendaDiscussions && minutes.agendaDiscussions.length > 0"
        class="agenda-discussions"
      >
        <h4>议程讨论</h4>
        <div
          v-for="(discussion, index) in minutes.agendaDiscussions"
          :key="index"
          class="discussion-item"
        >
          <div class="discussion-header">
            <h5>{{ discussion.agendaTitle }}</h5>
            <span class="discussion-time">{{ discussion.duration }}分钟</span>
          </div>

          <div v-if="discussion.keyPoints && discussion.keyPoints.length > 0" class="key-points">
            <h6>主要观点：</h6>
            <ul>
              <li v-for="(point, idx) in discussion.keyPoints" :key="idx">
                <strong>{{ point.speaker }}：</strong>{{ point.content }}
              </li>
            </ul>
          </div>

          <div v-if="discussion.decisions && discussion.decisions.length > 0" class="decisions">
            <h6>形成决议：</h6>
            <ul>
              <li v-for="(decision, idx) in discussion.decisions" :key="idx">
                {{ decision.content }}
                <el-tag v-if="decision.voteResult" type="success" size="mini">
                  {{ decision.voteResult }}
                </el-tag>
              </li>
            </ul>
          </div>

          <div
            v-if="discussion.actionItems && discussion.actionItems.length > 0"
            class="action-items"
          >
            <h6>行动事项：</h6>
            <div class="action-list">
              <div v-for="(action, idx) in discussion.actionItems" :key="idx" class="action-item">
                <div class="action-content">{{ action.content }}</div>
                <div class="action-meta">
                  <span class="responsible">负责人：{{ action.responsible }}</span>
                  <span class="deadline">期限：{{ formatDate(action.deadline) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 会议总结 -->
      <div v-if="minutes.summary" class="summary-section">
        <h4>会议总结</h4>
        <div class="summary-content">{{ minutes.summary }}</div>
      </div>

      <!-- 下次会议安排 -->
      <div v-if="minutes.nextMeeting" class="next-meeting-section">
        <h4>下次会议安排</h4>
        <div class="next-meeting-info">
          <div v-if="minutes.nextMeeting.topic" class="next-topic">
            <label>议题：</label>
            <span>{{ minutes.nextMeeting.topic }}</span>
          </div>
          <div v-if="minutes.nextMeeting.scheduledTime" class="next-time">
            <label>时间：</label>
            <span>{{ formatDateTime(minutes.nextMeeting.scheduledTime) }}</span>
          </div>
        </div>
      </div>

      <!-- 附件 -->
      <div v-if="minutes.attachments && minutes.attachments.length > 0" class="attachments-section">
        <h4>会议附件</h4>
        <div class="attachments-list">
          <el-link
            v-for="attachment in minutes.attachments"
            :key="attachment.name"
            :href="attachment.url"
            target="_blank"
            type="primary"
            class="attachment-link"
          >
            <i class="el-icon-paperclip"></i>
            {{ attachment.name }}
          </el-link>
        </div>
      </div>

      <!-- 审核状态 -->
      <div class="approval-section">
        <h4>审核状态</h4>
        <div class="approval-info">
          <el-tag :type="getApprovalType(minutes.status)" size="small">
            {{ getApprovalText(minutes.status) }}
          </el-tag>
          <span v-if="minutes.approvedAt" class="approval-time">
            审核时间：{{ formatDateTime(minutes.approvedAt) }}
          </span>
          <span v-if="minutes.approvedBy" class="approval-by">
            审核人：{{ minutes.approvedBy.realName }}
          </span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty v-else description="暂无会议纪要">
      <el-button v-if="canEditMinutes" type="primary" @click="showEditDialog = true">
        创建纪要
      </el-button>
    </el-empty>

    <!-- 编辑对话框 -->
    <el-dialog
      title="编辑会议纪要"
      :visible.sync="showEditDialog"
      width="80%"
      :close-on-click-modal="false"
      custom-class="minutes-edit-dialog"
    >
      <div class="edit-minutes">
        <el-form ref="minutesForm" :model="editingMinutes" label-width="120px" size="small">
          <!-- 基本信息 -->
          <div class="form-section">
            <h4>基本信息</h4>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="记录人" required>
                  <el-select v-model="editingMinutes.recordedBy" placeholder="选择记录人">
                    <el-option
                      v-for="participant in meetingParticipants"
                      :key="participant._id"
                      :label="participant.realName"
                      :value="participant._id"
                    ></el-option>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="会议类型">
                  <el-input v-model="editingMinutes.meetingType" readonly></el-input>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 出席人员 -->
          <div class="form-section">
            <h4>出席人员</h4>
            <div class="attendees-edit">
              <div
                v-for="(attendee, index) in editingMinutes.attendees"
                :key="index"
                class="attendee-edit-item"
              >
                <el-select
                  v-model="attendee.userId"
                  placeholder="选择参会人员"
                  style="width: 200px"
                >
                  <el-option
                    v-for="participant in meetingParticipants"
                    :key="participant._id"
                    :label="participant.realName"
                    :value="participant._id"
                  ></el-option>
                </el-select>
                <el-input
                  v-model="attendee.role"
                  placeholder="职务/角色"
                  style="width: 150px; margin-left: 10px"
                ></el-input>
                <el-select v-model="attendee.status" style="width: 100px; margin-left: 10px">
                  <el-option label="出席" value="present"></el-option>
                  <el-option label="迟到" value="late"></el-option>
                  <el-option label="早退" value="early_leave"></el-option>
                  <el-option label="缺席" value="absent"></el-option>
                </el-select>
                <el-button
                  type="danger"
                  size="mini"
                  @click="removeAttendee(index)"
                  style="margin-left: 10px"
                >
                  删除
                </el-button>
              </div>
              <el-button type="primary" size="mini" @click="addAttendee"> 添加参会人员 </el-button>
            </div>
          </div>

          <!-- 议程讨论 -->
          <div class="form-section">
            <h4>议程讨论</h4>
            <div
              v-for="(discussion, index) in editingMinutes.agendaDiscussions"
              :key="index"
              class="discussion-edit"
            >
              <div class="discussion-edit-header">
                <el-input
                  v-model="discussion.agendaTitle"
                  placeholder="议程标题"
                  style="width: 300px"
                ></el-input>
                <el-input-number
                  v-model="discussion.duration"
                  :min="1"
                  :max="300"
                  controls-position="right"
                  style="width: 120px; margin-left: 10px"
                ></el-input-number>
                <span style="margin-left: 5px">分钟</span>
                <el-button
                  type="danger"
                  size="mini"
                  @click="removeDiscussion(index)"
                  style="margin-left: 10px"
                >
                  删除议程
                </el-button>
              </div>

              <!-- 主要观点 -->
              <div class="key-points-edit">
                <label>主要观点：</label>
                <div
                  v-for="(point, pointIndex) in discussion.keyPoints"
                  :key="pointIndex"
                  class="key-point-item"
                >
                  <el-input
                    v-model="point.speaker"
                    placeholder="发言人"
                    style="width: 120px"
                  ></el-input>
                  <el-input
                    v-model="point.content"
                    type="textarea"
                    placeholder="观点内容"
                    :rows="2"
                    style="width: 400px; margin-left: 10px"
                  ></el-input>
                  <el-button
                    type="danger"
                    size="mini"
                    @click="removeKeyPoint(index, pointIndex)"
                    style="margin-left: 10px"
                  >
                    删除
                  </el-button>
                </div>
                <el-button type="primary" size="mini" @click="addKeyPoint(index)">
                  添加观点
                </el-button>
              </div>

              <!-- 形成决议 -->
              <div class="decisions-edit">
                <label>形成决议：</label>
                <div
                  v-for="(decision, decisionIndex) in discussion.decisions"
                  :key="decisionIndex"
                  class="decision-item"
                >
                  <el-input
                    v-model="decision.content"
                    type="textarea"
                    placeholder="决议内容"
                    :rows="2"
                    style="width: 400px"
                  ></el-input>
                  <el-input
                    v-model="decision.voteResult"
                    placeholder="表决结果（可选）"
                    style="width: 150px; margin-left: 10px"
                  ></el-input>
                  <el-button
                    type="danger"
                    size="mini"
                    @click="removeDecision(index, decisionIndex)"
                    style="margin-left: 10px"
                  >
                    删除
                  </el-button>
                </div>
                <el-button type="primary" size="mini" @click="addDecision(index)">
                  添加决议
                </el-button>
              </div>

              <!-- 行动事项 -->
              <div class="action-items-edit">
                <label>行动事项：</label>
                <div
                  v-for="(action, actionIndex) in discussion.actionItems"
                  :key="actionIndex"
                  class="action-item-edit"
                >
                  <el-input
                    v-model="action.content"
                    placeholder="行动事项内容"
                    style="width: 300px"
                  ></el-input>
                  <el-input
                    v-model="action.responsible"
                    placeholder="负责人"
                    style="width: 120px; margin-left: 10px"
                  ></el-input>
                  <el-date-picker
                    v-model="action.deadline"
                    type="date"
                    placeholder="完成期限"
                    style="width: 150px; margin-left: 10px"
                  ></el-date-picker>
                  <el-button
                    type="danger"
                    size="mini"
                    @click="removeActionItem(index, actionIndex)"
                    style="margin-left: 10px"
                  >
                    删除
                  </el-button>
                </div>
                <el-button type="primary" size="mini" @click="addActionItem(index)">
                  添加行动事项
                </el-button>
              </div>
            </div>

            <el-button type="primary" @click="addDiscussion"> 添加议程讨论 </el-button>
          </div>

          <!-- 会议总结 -->
          <div class="form-section">
            <h4>会议总结</h4>
            <el-form-item>
              <el-input
                v-model="editingMinutes.summary"
                type="textarea"
                placeholder="请输入会议总结"
                :rows="4"
              ></el-input>
            </el-form-item>
          </div>

          <!-- 下次会议安排 -->
          <div class="form-section">
            <h4>下次会议安排</h4>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="议题">
                  <el-input
                    v-model="editingMinutes.nextMeeting.topic"
                    placeholder="下次会议议题"
                  ></el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="时间">
                  <el-date-picker
                    v-model="editingMinutes.nextMeeting.scheduledTime"
                    type="datetime"
                    placeholder="选择时间"
                    style="width: 100%"
                  ></el-date-picker>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 附件上传 -->
          <div class="form-section">
            <h4>会议附件</h4>
            <el-upload
              :action="uploadUrl"
              :headers="uploadHeaders"
              :on-success="onAttachmentUploaded"
              :on-remove="onAttachmentRemoved"
              :file-list="editingMinutes.attachments"
              multiple
            >
              <el-button size="small" type="primary">选择文件</el-button>
            </el-upload>
          </div>
        </el-form>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button @click="saveDraft" :loading="saving">保存草稿</el-button>
        <el-button type="primary" @click="saveMinutes" :loading="saving"> 提交审核 </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { meetingAPI } from '@/api/meeting';
import { formatDate, formatDateTime } from '@/utils/dateUtils';

export default {
  name: 'MeetingMinutes',
  props: {
    meeting: {
      type: Object,
      required: true,
    },
    minutes: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      showEditDialog: false,
      saving: false,
      editingMinutes: this.getDefaultMinutes(),
      meetingParticipants: [],
    };
  },
  computed: {
    canEditMinutes() {
      const userRole = this.$store.getters.userRole;
      const userId = this.$store.getters.userId;

      return (
        userRole === 'admin' ||
        userRole === 'committee' ||
        this.meeting.organizer._id === userId ||
        this.meeting.secretary?._id === userId
      );
    },
    uploadUrl() {
      return `/api/v1/meetings/${this.meeting._id}/attachments`;
    },
    uploadHeaders() {
      return {
        Authorization: `Bearer ${this.$store.getters.token}`,
      };
    },
  },
  watch: {
    showEditDialog(newVal) {
      if (newVal) {
        this.initEditingMinutes();
        this.loadMeetingParticipants();
      }
    },
  },
  methods: {
    getDefaultMinutes() {
      return {
        recordedBy: null,
        meetingType: '',
        attendees: [],
        agendaDiscussions: [],
        summary: '',
        nextMeeting: {
          topic: '',
          scheduledTime: null,
        },
        attachments: [],
        status: 'draft',
      };
    },

    initEditingMinutes() {
      if (this.minutes) {
        this.editingMinutes = JSON.parse(JSON.stringify(this.minutes));
      } else {
        this.editingMinutes = this.getDefaultMinutes();
        this.editingMinutes.meetingType = this.meeting.meetingType;
      }

      // 确保必要的数组字段存在
      if (!this.editingMinutes.attendees) this.editingMinutes.attendees = [];
      if (!this.editingMinutes.agendaDiscussions) this.editingMinutes.agendaDiscussions = [];
      if (!this.editingMinutes.attachments) this.editingMinutes.attachments = [];
      if (!this.editingMinutes.nextMeeting) {
        this.editingMinutes.nextMeeting = { topic: '', scheduledTime: null };
      }
    },

    async loadMeetingParticipants() {
      // 从会议参与者中获取
      const participants = [];

      if (this.meeting.participants?.required) {
        participants.push(...this.meeting.participants.required.map(p => p.userId));
      }

      if (this.meeting.participants?.optional) {
        participants.push(...this.meeting.participants.optional.map(p => p.userId));
      }

      this.meetingParticipants = participants;
    },

    // 出席人员管理
    addAttendee() {
      this.editingMinutes.attendees.push({
        userId: null,
        role: '',
        status: 'present',
      });
    },

    removeAttendee(index) {
      this.editingMinutes.attendees.splice(index, 1);
    },

    // 议程讨论管理
    addDiscussion() {
      this.editingMinutes.agendaDiscussions.push({
        agendaTitle: '',
        duration: 30,
        keyPoints: [],
        decisions: [],
        actionItems: [],
      });
    },

    removeDiscussion(index) {
      this.editingMinutes.agendaDiscussions.splice(index, 1);
    },

    // 主要观点管理
    addKeyPoint(discussionIndex) {
      this.editingMinutes.agendaDiscussions[discussionIndex].keyPoints.push({
        speaker: '',
        content: '',
      });
    },

    removeKeyPoint(discussionIndex, pointIndex) {
      this.editingMinutes.agendaDiscussions[discussionIndex].keyPoints.splice(pointIndex, 1);
    },

    // 决议管理
    addDecision(discussionIndex) {
      this.editingMinutes.agendaDiscussions[discussionIndex].decisions.push({
        content: '',
        voteResult: '',
      });
    },

    removeDecision(discussionIndex, decisionIndex) {
      this.editingMinutes.agendaDiscussions[discussionIndex].decisions.splice(decisionIndex, 1);
    },

    // 行动事项管理
    addActionItem(discussionIndex) {
      this.editingMinutes.agendaDiscussions[discussionIndex].actionItems.push({
        content: '',
        responsible: '',
        deadline: null,
      });
    },

    removeActionItem(discussionIndex, actionIndex) {
      this.editingMinutes.agendaDiscussions[discussionIndex].actionItems.splice(actionIndex, 1);
    },

    // 文件上传处理
    onAttachmentUploaded(response) {
      if (response.success) {
        this.editingMinutes.attachments.push({
          name: response.data.fileName,
          url: response.data.fileUrl,
          size: response.data.fileSize,
        });
      }
    },

    onAttachmentRemoved(file) {
      const index = this.editingMinutes.attachments.findIndex(
        attachment => attachment.name === file.name
      );
      if (index > -1) {
        this.editingMinutes.attachments.splice(index, 1);
      }
    },

    // 保存草稿
    async saveDraft() {
      this.saving = true;
      try {
        this.editingMinutes.status = 'draft';
        const response = await meetingAPI.saveMeetingMinutes(this.meeting._id, this.editingMinutes);

        if (response.data.success) {
          this.$message.success('纪要草稿保存成功');
          this.$emit('minutes-updated', response.data.data);
        }
      } catch (error) {
        this.$message.error('保存草稿失败');
        console.error(error);
      } finally {
        this.saving = false;
      }
    },

    // 提交审核
    async saveMinutes() {
      // 基本验证
      if (!this.editingMinutes.recordedBy) {
        this.$message.error('请选择记录人');
        return;
      }

      if (!this.editingMinutes.summary.trim()) {
        this.$message.error('请填写会议总结');
        return;
      }

      this.saving = true;
      try {
        this.editingMinutes.status = 'pending_approval';
        const response = await meetingAPI.saveMeetingMinutes(this.meeting._id, this.editingMinutes);

        if (response.data.success) {
          this.$message.success('会议纪要已提交审核');
          this.showEditDialog = false;
          this.$emit('minutes-updated', response.data.data);
        }
      } catch (error) {
        this.$message.error('提交纪要失败');
        console.error(error);
      } finally {
        this.saving = false;
      }
    },

    // 导出纪要
    async exportMinutes() {
      try {
        const response = await meetingAPI.exportMeetingMinutes(this.meeting._id);

        // 创建下载链接
        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.meeting.title}_会议纪要.docx`;
        link.click();
        window.URL.revokeObjectURL(url);

        this.$message.success('纪要导出成功');
      } catch (error) {
        this.$message.error('导出纪要失败');
        console.error(error);
      }
    },

    // 状态相关方法
    getAttendanceText(status) {
      const statusMap = {
        present: '出席',
        late: '迟到',
        early_leave: '早退',
        absent: '缺席',
      };
      return statusMap[status] || '未知';
    },

    getApprovalType(status) {
      switch (status) {
        case 'draft':
          return 'info';
        case 'pending_approval':
          return 'warning';
        case 'completed':
          return 'success';
        case 'rejected':
          return 'danger';
        default:
          return 'info';
      }
    },

    getApprovalText(status) {
      const statusMap = {
        draft: '草稿',
        pending_approval: '待审核',
        completed: '已审核',
        rejected: '被驳回',
      };
      return statusMap[status] || '未知';
    },

    formatDate,
    formatDateTime,
  },
};
</script>

<style scoped>
.meeting-minutes {
  padding: 20px;
}

.minutes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.minutes-header h3 {
  margin: 0;
  color: #333;
}

.minutes-content {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.meeting-info-section h4,
.attendees-section h4,
.agenda-discussions h4,
.summary-section h4,
.next-meeting-section h4,
.attachments-section h4,
.approval-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  border-bottom: 2px solid #409eff;
  padding-bottom: 5px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item label {
  font-weight: bold;
  color: #666;
  min-width: 100px;
}

.attendees-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.attendee-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
}

.attendee-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.attendee-name {
  font-weight: bold;
  color: #333;
}

.attendee-role {
  font-size: 12px;
  color: #666;
}

.discussion-item {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.discussion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.discussion-header h5 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.discussion-time {
  color: #666;
  font-size: 14px;
}

.key-points h6,
.decisions h6,
.action-items h6 {
  margin: 15px 0 10px 0;
  color: #333;
  font-size: 14px;
}

.key-points ul,
.decisions ul {
  margin: 0;
  padding-left: 20px;
}

.key-points li,
.decisions li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-item {
  background: white;
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid #409eff;
}

.action-content {
  font-weight: bold;
  margin-bottom: 5px;
}

.action-meta {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #666;
}

.summary-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  line-height: 1.6;
  border-left: 4px solid #67c23a;
}

.next-meeting-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.next-topic,
.next-time {
  display: flex;
  align-items: center;
}

.next-topic label,
.next-time label {
  font-weight: bold;
  color: #666;
  min-width: 60px;
}

.attachments-list {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.attachment-link {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 6px;
}

.approval-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.approval-time,
.approval-by {
  font-size: 14px;
  color: #666;
}

/* 编辑对话框样式 */
.minutes-edit-dialog {
  max-height: 90vh;
}

.edit-minutes {
  max-height: 70vh;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.form-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.attendees-edit {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.attendee-edit-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.discussion-edit {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 15px;
}

.discussion-edit-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.key-points-edit,
.decisions-edit,
.action-items-edit {
  margin-bottom: 15px;
}

.key-points-edit label,
.decisions-edit label,
.action-items-edit label {
  display: block;
  margin-bottom: 10px;
  font-weight: bold;
  color: #333;
}

.key-point-item,
.decision-item,
.action-item-edit {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .meeting-minutes {
    padding: 10px;
  }

  .minutes-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .attendees-grid {
    grid-template-columns: 1fr;
  }

  .discussion-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .action-meta {
    flex-direction: column;
    gap: 5px;
  }

  .approval-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .attendee-edit-item,
  .discussion-edit-header,
  .key-point-item,
  .decision-item,
  .action-item-edit {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>
