const { Meeting, MeetingType, MeetingStatus } = require("../../models/Meeting");
const { CollabWorkspace } = require("../../models/CollabWorkspace");
const webSocketService = require("../../services/webSocketService");

exports.createMeeting = async (meetingData, organizerId) => {
  const { workspaceId, title, description, meetingType, scheduledStart, scheduledEnd, location, agenda } = meetingData;

  const workspace = await CollabWorkspace.findById(workspaceId);
  if (!workspace) throw new Error("协作空间不存在");

  const duration = Math.round((new Date(scheduledEnd) - new Date(scheduledStart)) / (1000 * 60));

  const meeting = new Meeting({
    workspaceId,
    villageId: workspace.villageId,
    title,
    description,
    meetingType,
    organizerId,
    scheduledStart,
    scheduledEnd,
    duration,
    location,
    agenda: agenda || [],
    participants: [{ userId: organizerId, role: "organizer", status: "accepted", isRequired: true }]
  });

  await meeting.save();
  await _notifyParticipants(meeting, "meeting_created");
  return meeting.populate("organizerId participants.userId");
};

exports.getWorkspaceMeetings = async (workspaceId, userId, options = {}) => {
  const workspace = await CollabWorkspace.findById(workspaceId);
  if (!workspace) throw new Error("协作空间不存在");

  const isMember = workspace.members.some(m => m.userId.toString() === userId.toString());
  if (!isMember) throw new Error("无权访问此协作空间");

  return Meeting.getWorkspaceMeetings(workspaceId, options);
};

exports.getUserMeetings = async (userId, options = {}) => {
  return Meeting.getUserMeetings(userId, options);
};

exports.getMeetingDetail = async (meetingId, userId) => {
  const meeting = await Meeting.findById(meetingId)
    .populate("organizerId", "name avatar")
    .populate("participants.userId", "name avatar")
    .populate("participants.committeeMemberId", "position")
    .lean();

  if (!meeting) throw new Error("会议不存在");

  const workspace = await CollabWorkspace.findById(meeting.workspaceId);
  const isMember = workspace.members.some(m => m.userId.toString() === userId.toString());
  if (!isMember) throw new Error("无权访问此会议");

  return meeting;
};

exports.respondToMeeting = async (meetingId, userId, response) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw new Error("会议不存在");

  await meeting.respond(userId, response);
  await _notifyOrganizer(meeting, "meeting_response", { userId, response });
  return meeting.populate("participants.userId");
};

exports.startMeeting = async (meetingId, userId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw new Error("会议不存在");

  if (meeting.organizerId.toString() !== userId.toString()) {
    throw new Error("只有组织者可以开始会议");
  }

  await meeting.start();
  await _notifyParticipants(meeting, "meeting_started");
  return meeting;
};

exports.endMeeting = async (meetingId, userId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw new Error("会议不存在");

  if (meeting.organizerId.toString() !== userId.toString()) {
    throw new Error("只有组织者可以结束会议");
  }

  await meeting.end();
  await _notifyParticipants(meeting, "meeting_ended");
  return meeting;
};

exports.addMinutes = async (meetingId, userId, content, decisions, actionItems) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw new Error("会议不存在");

  if (meeting.organizerId.toString() !== userId.toString()) {
    throw new Error("只有组织者可以添加会议纪要");
  }

  meeting.minutes = {
    content,
    decisions: decisions || [],
    actionItems: actionItems || [],
    writtenBy: userId,
    writtenAt: new Date()
  };
  await meeting.save();
  await _notifyParticipants(meeting, "minutes_added");
  return meeting;
};

async function _notifyParticipants(meeting, eventType) {
  if (webSocketService && webSocketService.notifyMeeting) {
    webSocketService.notifyMeeting(meeting.workspaceId.toString(), {
      meetingId: meeting._id,
      title: meeting.title,
      eventType,
      scheduledStart: meeting.scheduledStart
    });
  }
}

async function _notifyOrganizer(meeting, eventType, data) {
  if (webSocketService && webSocketService.notifyMeeting) {
    webSocketService.notifyMeeting(meeting.workspaceId.toString(), {
      meetingId: meeting._id,
      title: meeting.title,
      eventType,
      ...data
    });
  }
}

exports.checkMeetingReminders = async () => {
  const now = new Date();
  const upcoming = await Meeting.find({
    status: MeetingStatus.SCHEDULED,
    scheduledStart: { $gt: now }
  }).lean();

  const sent = [];
  for (const meeting of upcoming) {
    for (const reminder of meeting.reminders || []) {
      if (reminder.sent) continue;

      const shouldSend = (meeting.scheduledStart - now) <= reminder.minutesBefore * 60 * 1000;
      if (shouldSend) {
        if (webSocketService && webSocketService.notifyMeeting) {
          webSocketService.notifyMeeting(meeting.workspaceId.toString(), {
            meetingId: meeting._id,
            title: meeting.title,
            eventType: "reminder",
            minutesBefore: reminder.minutesBefore
          });
        }
        reminder.sent = true;
        sent.push(meeting._id);
      }
    }
  }
  return { sent: sent.length };
};
