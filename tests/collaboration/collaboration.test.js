/**
 * 村委协作平台测试
 * 测试工作空间、任务、会议、工作日志和审批功能
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');

// Mock外部依赖
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() }))
}));

jest.mock('../../src/services/webSocketService', () => ({
  notifyWorkspace: jest.fn(),
  notifyTask: jest.fn(),
  notifyMeeting: jest.fn(),
  notifyApproval: jest.fn(),
  notifyMemberChange: jest.fn(),
  broadcastToUser: jest.fn(),
  broadcastToRoom: jest.fn()
}));

describe('村委协作平台 API 测试', () => {
  let testUser;
  let testWorkspace;
  let testTask;
  let testMeeting;
  let authToken;
  let db;

  // 生成测试用JWT Token
  const generateTestToken = (userId, role = 'member') => {
    return Buffer.from(JSON.stringify({
      userId: userId.toString(),
      role,
      villageId: new mongoose.Types.ObjectId().toString()
    })).toString('base64');
  };

  beforeAll(async () => {
    // 连接测试数据库
    const mongoUri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/smart-village-test';
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    db = mongoose.connection;

    // 创建测试用户
    const User = mongoose.model('User');
    testUser = await User.create({
      name: '测试村委',
      username: 'test_committee',
      phone: '13800138000',
      role: 'committee_member',
      villageId: new mongoose.Types.ObjectId()
    });

    authToken = generateTestToken(testUser._id);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // 清理测试数据
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      if (['collabworkspaces', 'taskassignments', 'meetings', 'worklogs', 'approvalrequests'].includes(key.toLowerCase())) {
        await collections[key].deleteMany({});
      }
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('工作空间管理', () => {
    describe('POST /api/v1/committee-collab/workspaces', () => {
      test('应该成功创建工作空间', async () => {
        const workspaceData = {
          name: '村委会工作空间',
          description: '用于村委内部协作',
          villageId: testUser.villageId,
          type: 'general',
          settings: {
            isPublic: false,
            allowGuestView: false
          }
        };

        const response = await request(app)
          .post('/api/v1/committee-collab/workspaces')
          .set('Authorization', `Bearer ${authToken}`)
          .send(workspaceData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(workspaceData.name);
        expect(response.body.data.creatorId).toBe(testUser._id.toString());

        testWorkspace = response.body.data;
      });

      test('缺少必需字段时应返回错误', async () => {
        const response = await request(app)
          .post('/api/v1/committee-collab/workspaces')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: '测试空间' })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/committee-collab/workspaces', () => {
      test('应该获取用户的工作空间列表', async () => {
        const response = await request(app)
          .get('/api/v1/committee-collab/workspaces')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/v1/committee-collab/workspaces/:workspaceId', () => {
      test('应该获取工作空间详情', async () => {
        // 首先创建工作空间
        const CollabWorkspace = mongoose.model('CollabWorkspace');
        testWorkspace = await CollabWorkspace.create({
          name: '测试空间',
          description: '测试描述',
          villageId: testUser.villageId,
          creatorId: testUser._id,
          members: [{
            userId: testUser._id,
            role: 'admin',
            status: 'active',
            joinedAt: new Date()
          }]
        });

        const response = await request(app)
          .get(`/api/v1/committee-collab/workspaces/${testWorkspace._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data._id).toBe(testWorkspace._id.toString());
      });

      test('工作空间不存在时应返回404', async () => {
        const fakeId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .get(`/api/v1/committee-collab/workspaces/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/v1/committee-collab/workspaces/:workspaceId/members', () => {
      test('管理员应该能够添加成员', async () => {
        const CollabWorkspace = mongoose.model('CollabWorkspace');
        const newMemberId = new mongoose.Types.ObjectId();

        testWorkspace = await CollabWorkspace.create({
          name: '测试空间',
          villageId: testUser.villageId,
          creatorId: testUser._id,
          members: [{
            userId: testUser._id,
            role: 'admin',
            status: 'active',
            joinedAt: new Date()
          }]
        });

        const response = await request(app)
          .post(`/api/v1/committee-collab/workspaces/${testWorkspace._id}/members`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            userId: newMemberId.toString(),
            role: 'member'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('任务管理', () => {
    beforeEach(async () => {
      // 创建测试工作空间
      const CollabWorkspace = mongoose.model('CollabWorkspace');
      testWorkspace = await CollabWorkspace.create({
        name: '任务测试空间',
        villageId: testUser.villageId,
        creatorId: testUser._id,
        members: [{
          userId: testUser._id,
          role: 'admin',
          status: 'active',
          joinedAt: new Date()
        }]
      });
    });

    describe('POST /api/v1/committee-collab/tasks', () => {
      test('应该成功创建任务', async () => {
        const taskData = {
          workspaceId: testWorkspace._id.toString(),
          title: '完成村务报告',
          description: '撰写本月村务工作报告',
          assigneeId: testUser._id.toString(),
          priority: 'high',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          checkpoints: [
            { title: '收集数据', order: 1 },
            { title: '撰写报告', order: 2 }
          ]
        };

        const response = await request(app)
          .post('/api/v1/committee-collab/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send(taskData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe(taskData.title);

        testTask = response.body.data;
      });

      test('应该支持批量创建任务', async () => {
        const tasksData = {
          workspaceId: testWorkspace._id.toString(),
          tasks: [
            { title: '任务1', assigneeId: testUser._id.toString() },
            { title: '任务2', assigneeId: testUser._id.toString() }
          ]
        };

        const response = await request(app)
          .post('/api/v1/committee-collab/tasks/batch')
          .set('Authorization', `Bearer ${authToken}`)
          .send(tasksData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.created).toBe(2);
      });
    });

    describe('PUT /api/v1/committee-collab/tasks/:taskId/progress', () => {
      test('应该能够更新任务进度', async () => {
        const TaskAssignment = mongoose.model('TaskAssignment');
        testTask = await TaskAssignment.create({
          workspaceId: testWorkspace._id,
          villageId: testUser.villageId,
          title: '测试任务',
          assignerId: testUser._id,
          assigneeId: testUser._id,
          status: 'in_progress',
          progress: 30
        });

        const response = await request(app)
          .put(`/api/v1/committee-collab/tasks/${testTask._id}/progress`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ progress: 60, notes: '已完成60%' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.progress).toBe(60);
      });
    });

    describe('POST /api/v1/committee-collab/tasks/:taskId/complete', () => {
      test('应该能够完成任务', async () => {
        const TaskAssignment = mongoose.model('TaskAssignment');
        testTask = await TaskAssignment.create({
          workspaceId: testWorkspace._id,
          villageId: testUser.villageId,
          title: '测试任务',
          assignerId: testUser._id,
          assigneeId: testUser._id,
          status: 'in_progress'
        });

        const response = await request(app)
          .post(`/api/v1/committee-collab/tasks/${testTask._id}/complete`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ notes: '任务已完成' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('completed');
      });
    });

    describe('GET /api/v1/committee-collab/workspaces/:workspaceId/tasks/statistics', () => {
      test('应该获取任务统计数据', async () => {
        const TaskAssignment = mongoose.model('TaskAssignment');
        await TaskAssignment.create([
          {
            workspaceId: testWorkspace._id,
            title: '任务1',
            assigneeId: testUser._id,
            status: 'pending',
            priority: 'high'
          },
          {
            workspaceId: testWorkspace._id,
            title: '任务2',
            assigneeId: testUser._id,
            status: 'completed',
            priority: 'medium'
          }
        ]);

        const response = await request(app)
          .get(`/api/v1/committee-collab/workspaces/${testWorkspace._id}/tasks/statistics`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.total).toBe(2);
      });
    });
  });

  describe('会议管理', () => {
    beforeEach(async () => {
      const CollabWorkspace = mongoose.model('CollabWorkspace');
      testWorkspace = await CollabWorkspace.create({
        name: '会议测试空间',
        villageId: testUser.villageId,
        creatorId: testUser._id,
        members: [{
          userId: testUser._id,
          role: 'admin',
          status: 'active',
          joinedAt: new Date()
        }]
      });
    });

    describe('POST /api/v1/committee-collab/meetings', () => {
      test('应该成功创建会议', async () => {
        const scheduledStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const scheduledEnd = new Date(Date.now() + 25 * 60 * 60 * 1000);

        const meetingData = {
          workspaceId: testWorkspace._id.toString(),
          title: '村委例会',
          description: '讨论本月工作计划',
          meetingType: 'regular',
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
          location: '村委会会议室',
          agenda: [
            { title: '工作回顾', duration: 30 },
            { title: '计划讨论', duration: 60 }
          ],
          participants: [{
            userId: testUser._id.toString(),
            role: 'attendee',
            isRequired: true
          }]
        };

        const response = await request(app)
          .post('/api/v1/committee-collab/meetings')
          .set('Authorization', `Bearer ${authToken}`)
          .send(meetingData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe(meetingData.title);

        testMeeting = response.body.data;
      });
    });

    describe('POST /api/v1/committee-collab/meetings/:meetingId/respond', () => {
      test('应该能够响应会议邀请', async () => {
        const Meeting = mongoose.model('Meeting');
        testMeeting = await Meeting.create({
          workspaceId: testWorkspace._id,
          villageId: testUser.villageId,
          title: '测试会议',
          meetingType: 'regular',
          organizerId: testUser._id,
          scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
          scheduledEnd: new Date(Date.now() + 25 * 60 * 60 * 1000),
          participants: [{
            userId: testUser._id,
            role: 'attendee',
            isRequired: true,
            status: 'pending'
          }]
        });

        const response = await request(app)
          .post(`/api/v1/committee-collab/meetings/${testMeeting._id}/respond`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ response: 'accepted', comment: '准时参加' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/v1/committee-collab/meetings/:meetingId/minutes', () => {
      test('应该能够添加会议纪要', async () => {
        const Meeting = mongoose.model('Meeting');
        testMeeting = await Meeting.create({
          workspaceId: testWorkspace._id,
          villageId: testUser.villageId,
          title: '测试会议',
          meetingType: 'regular',
          organizerId: testUser._id,
          scheduledStart: new Date(),
          scheduledEnd: new Date(),
          status: 'completed',
          participants: [{
            userId: testUser._id,
            role: 'organizer'
          }]
        });

        const minutesData = {
          content: '会议纪要内容',
          decisions: ['决定1', '决定2'],
          actionItems: [
            { task: '待办事项1', assignee: testUser._id.toString(), dueDate: new Date() }
          ]
        };

        const response = await request(app)
          .post(`/api/v1/committee-collab/meetings/${testMeeting._id}/minutes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(minutesData)
          .expect(201);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('工作日志管理', () => {
    beforeEach(async () => {
      const CollabWorkspace = mongoose.model('CollabWorkspace');
      testWorkspace = await CollabWorkspace.create({
        name: '日志测试空间',
        villageId: testUser.villageId,
        creatorId: testUser._id,
        members: [{
          userId: testUser._id,
          role: 'admin',
          status: 'active',
          joinedAt: new Date()
        }]
      });
    });

    describe('POST /api/v1/committee-collab/work-logs', () => {
      test('应该成功创建工作日志', async () => {
        const logData = {
          workspaceId: testWorkspace._id.toString(),
          logType: 'daily',
          content: {
            summary: '今日工作总结',
            completedTasks: [
              { task: '完成报表', result: '已提交', progress: 100 }
            ],
            ongoingTasks: [
              { task: '项目跟进', progress: 50, nextStep: '联系相关部门' }
            ],
            issues: [],
            nextPlan: '明日继续推进项目'
          }
        };

        const response = await request(app)
          .post('/api/v1/committee-collab/work-logs')
          .set('Authorization', `Bearer ${authToken}`)
          .send(logData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.logType).toBe('daily');
      });
    });

    describe('POST /api/v1/committee-collab/work-logs/:logId/submit', () => {
      test('应该能够提交工作日志', async () => {
        const WorkLog = mongoose.model('WorkLog');
        const testLog = await WorkLog.create({
          workspaceId: testWorkspace._id,
          villageId: testUser.villageId,
          authorId: testUser._id,
          logType: 'daily',
          content: { summary: '工作日志' },
          status: 'draft'
        });

        const response = await request(app)
          .post(`/api/v1/committee-collab/work-logs/${testLog._id}/submit`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('submitted');
      });
    });
  });

  describe('审批管理', () => {
    beforeEach(async () => {
      const CollabWorkspace = mongoose.model('CollabWorkspace');
      testWorkspace = await CollabWorkspace.create({
        name: '审批测试空间',
        villageId: testUser.villageId,
        creatorId: testUser._id,
        members: [{
          userId: testUser._id,
          role: 'admin',
          status: 'active',
          joinedAt: new Date()
        }]
      });
    });

    describe('POST /api/v1/committee-collab/approvals', () => {
      test('应该成功创建审批请求', async () => {
        const approvalData = {
          workspaceId: testWorkspace._id.toString(),
          title: '资金使用审批',
          description: '申请使用活动经费',
          approvalType: 'finance',
          amount: 5000,
          workflow: {
            nodes: [
              {
                nodeId: 'node1',
                nodeName: '村主任审批',
                approverId: testUser._id.toString(),
                order: 1,
                type: 'serial'
              }
            ]
          },
          formData: {
            purpose: '活动经费',
            amount: 5000,
            account: 'XXX'
          }
        };

        const response = await request(app)
          .post('/api/v1/committee-collab/approvals')
          .set('Authorization', `Bearer ${authToken}`)
          .send(approvalData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe(approvalData.title);
      });
    });

    describe('GET /api/v1/committee-collab/users/pending-approvals', () => {
      test('应该获取待审批列表', async () => {
        const response = await request(app)
          .get('/api/v1/committee-collab/users/pending-approvals')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('POST /api/v1/committee-collab/approvals/:approvalId/approve', () => {
      test('应该能够批准审批请求', async () => {
        const ApprovalRequest = mongoose.model('ApprovalRequest');
        const testApproval = await ApprovalRequest.create({
          workspaceId: testWorkspace._id,
          villageId: testUser.villageId,
          applicantId: testUser._id,
          title: '测试审批',
          approvalType: 'finance',
          workflow: {
            nodes: [{
              nodeId: 'node1',
              nodeName: '审批',
              approverId: testUser._id,
              order: 1
            }],
            currentNodeIndex: 0
          },
          status: 'pending'
        });

        const response = await request(app)
          .post(`/api/v1/committee-collab/approvals/${testApproval._id}/approve`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ comments: '同意' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/v1/committee-collab/approvals/:approvalId/reject', () => {
      test('应该能够拒绝审批请求', async () => {
        const ApprovalRequest = mongoose.model('ApprovalRequest');
        const testApproval = await ApprovalRequest.create({
          workspaceId: testWorkspace._id,
          villageId: testUser.villageId,
          applicantId: testUser._id,
          title: '测试审批',
          approvalType: 'finance',
          workflow: {
            nodes: [{
              nodeId: 'node1',
              nodeName: '审批',
              approverId: testUser._id,
              order: 1
            }],
            currentNodeIndex: 0
          },
          status: 'pending'
        });

        const response = await request(app)
          .post(`/api/v1/committee-collab/approvals/${testApproval._id}/reject`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ reason: '不符合要求' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('rejected');
      });
    });
  });

  describe('统计数据', () => {
    describe('GET /api/v1/committee-collab/workspaces/:workspaceId/stats', () => {
      test('应该获取工作空间统计', async () => {
        const CollabWorkspace = mongoose.model('CollabWorkspace');
        testWorkspace = await CollabWorkspace.create({
          name: '统计测试空间',
          villageId: testUser.villageId,
          creatorId: testUser._id,
          members: [{
            userId: testUser._id,
            role: 'admin',
            status: 'active',
            joinedAt: new Date()
          }]
        });

        const response = await request(app)
          .get(`/api/v1/committee-collab/workspaces/${testWorkspace._id}/stats`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('tasks');
        expect(response.body.data).toHaveProperty('members');
      });
    });
  });

  describe('权限测试', () => {
    test('非工作空间成员应被拒绝访问', async () => {
      const CollabWorkspace = mongoose.model('CollabWorkspace');
      const otherUser = new mongoose.Types.ObjectId();

      testWorkspace = await CollabWorkspace.create({
        name: '私有空间',
        villageId: testUser.villageId,
        creatorId: otherUser,
        members: [{
          userId: otherUser,
          role: 'admin',
          status: 'active'
        }]
      });

      const otherToken = generateTestToken(otherUser);

      const response = await request(app)
        .get(`/api/v1/committee-collab/workspaces/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('访客角色只读权限测试', async () => {
      const CollabWorkspace = mongoose.model('CollabWorkspace');
      const guestId = new mongoose.Types.ObjectId();

      testWorkspace = await CollabWorkspace.create({
        name: '访客测试空间',
        villageId: testUser.villageId,
        creatorId: testUser._id,
        members: [
          { userId: testUser._id, role: 'admin', status: 'active' },
          { userId: guestId, role: 'guest', status: 'active' }
        ]
      });

      const guestToken = generateTestToken(guestId);

      // 访客可以查看
      const viewResponse = await request(app)
        .get(`/api/v1/committee-collab/workspaces/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${guestToken}`)
        .expect(200);

      expect(viewResponse.body.success).toBe(true);

      // 访客不能创建任务
      const createResponse = await request(app)
        .post('/api/v1/committee-collab/tasks')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          workspaceId: testWorkspace._id.toString(),
          title: '测试任务',
          assigneeId: guestId.toString()
        })
        .expect(403);

      expect(createResponse.body.success).toBe(false);
    });
  });
});
