/**
 * 会议管理模型
 * 村委会内部会议管理
 */

const mongoose = require('mongoose');

// 会议类型
const MeetingType = {
  REGULAR: 'regular',
  EMERGENCY: 'emergency',
  PROJECT: 'project',
  TRAINING: 'training',
  OTHER: 'other'
};

// 会议状态
const MeetingStatus = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// 参会状态
const AttendanceStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  ATTENDED: 'attended',
  ABSENT: 'absent'
};

const meetingSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollabWorkspace',
    required: true,
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 2000
  },
  meetingType: {
    type: String,
    enum: Object.values(MeetingType),
    default: MeetingType.REGULAR
  },
  status: {
    type: String,
    enum: Object.values(MeetingStatus),
    default: MeetingStatus.DRAFT,
    index: true
  },
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scheduledStart: {
    type: Date,
    required: true,
    index: true
  },
  scheduledEnd: {
    type: Date,
    required: true
  },
  actualStart: { type: Date },
  actualEnd: { type: Date },
  duration: { type: Number, default: 60 },
  location: {
    type: { type: String, enum: ['offline', 'online', 'hybrid'], default: 'offline' },
    address: String,
    onlineUrl: String,
    meetingId: String,
    password: String
  },
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    committeeMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommitteeMember' },
    role: { type: String, enum: ['organizer', 'host', 'speaker', 'attendee'], default: 'attendee' },
    status: { type: String, enum: Object.values(AttendanceStatus), default: AttendanceStatus.PENDING },
    responseTime: Date,
    joinTime: Date,
    leaveTime: Date,
    isRequired: { type: Boolean, default: false }
  }],
  participantStats: {
    total: { type: Number, default: 0 },
    accepted: { type: Number, default: 0 },
    declined: { type: Number, default: 0 },
    attended: { type: Number, default: 0 },
    absent: { type: Number, default: 0 }
  },
  agenda: [{
    order: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, maxlength: 500 },
    duration: { type: Number, default: 10 },
    presenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completed: { type: Boolean, default: false }
  }],
  minutes: {
    content: { type: String, maxlength: 10000 },
    writtenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    writtenAt: Date
  },
  decisions: [{
    title: { type: String, required: true },
    description: String,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dueDate: Date,
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' }
  }],
  actionItems: [{
    title: { type: String, required: true },
    description: String,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskAssignment' },
    dueDate: Date,
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' }
  }],
  reminders: [{ minutesBefore: { type: Number, required: true }, sent: { type: Boolean, default: false }, sentAt: Date }],
  recurrence: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
    interval: { type: Number, default: 1 },
    endDate: Date
  },
  tags: [{ type: String, maxlength: 20 }]
}, { timestamps: true, collection: 'meetings' });

meetingSchema.index({ workspaceId: 1, status: 1 });
meetingSchema.index({ 'participants.userId': 1, scheduledStart: -1 });

meetingSchema.methods.addParticipant = function(userId, committeeMemberId, options = {}) {
  if (this.participants.some(p => p.userId.toString() === userId.toString())) {
    throw new Error('用户已在参会名单中');
  }
  this.participants.push({ userId, committeeMemberId, ...options, status: AttendanceStatus.PENDING });
  this.participantStats.total = this.participants.length;
  return this.save();
};

meetingSchema.methods.respond = function(userId, response) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (!participant) throw new Error('用户不在参会名单中');
  participant.status = response;
  participant.responseTime = new Date();
  return this.save();
};

meetingSchema.methods.start = function() {
  if (this.status !== MeetingStatus.SCHEDULED) throw new Error('只有已安排的会议才能开始');
  this.status = MeetingStatus.IN_PROGRESS;
  this.actualStart = new Date();
  return this.save();
};

meetingSchema.methods.end = function() {
  if (this.status !== MeetingStatus.IN_PROGRESS) throw new Error('只有进行中的会议才能结束');
  this.status = MeetingStatus.COMPLETED;
  this.actualEnd = new Date();
  return this.save();
};

meetingSchema.statics.getWorkspaceMeetings = function(workspaceId, options = {}) {
  const query = { workspaceId, ...options };
  return this.find(query).populate('organizerId', 'name avatar').sort({ scheduledStart: -1 }).lean();
};

meetingSchema.statics.getUserMeetings = function(userId, options = {}) {
  const query = { 'participants.userId': userId, ...options };
  return this.find(query).populate('organizerId', 'name avatar').sort({ scheduledStart: 1 }).lean();
};

const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = { Meeting, MeetingType, MeetingStatus, AttendanceStatus };
