const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const ApprovalWorkflow = require('../src/models/ApprovalWorkflow');
const VillageCommittee = require('../src/models/VillageCommittee');
const ApprovalWorkflowService = require('../src/services/ApprovalWorkflowService');

describe('Approval Workflow System', () => {
  let testVillageId;
  let testApplicantId;
  let testApproverId;
  let testWorkflowId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/smart_village_test');
    }

    // Create test village committee members
    const testApplicant = new VillageCommittee({
      realName: '测试申请人',
      position: '村民代表',
      phone: '13800138001',
      email: 'applicant@test.com',
      villageId: new mongoose.Types.ObjectId(),
      status: 'active'
    });
    await testApplicant.save();
    testApplicantId = testApplicant._id;
    testVillageId = testApplicant.villageId;

    const testApprover = new VillageCommittee({
      realName: '测试审批人',
      position: '村主任',
      phone: '13800138002',
      email: 'approver@test.com',
      villageId: testVillageId,
      status: 'active'
    });
    await testApprover.save();
    testApproverId = testApprover._id;
  });

  afterAll(async () => {
    // Clean up test data
    await ApprovalWorkflow.deleteMany({});
    await VillageCommittee.deleteMany({});
    await mongoose.connection.close();
  });

  afterEach(async () => {
    // Clean up workflows after each test
    await ApprovalWorkflow.deleteMany({});
  });

  describe('ApprovalWorkflowService', () => {
    describe('createWorkflow', () => {
      test('should create a financial workflow successfully', async () => {
        const workflowData = {
          workflowName: '测试财务审批',
          description: '测试财务审批流程',
          businessType: 'village_finance',
          businessId: new mongoose.Types.ObjectId(),
          villageId: testVillageId,
          villageName: '测试村',
          applicantId: testApplicantId,
          businessData: {
            amount: 15000,
            category: '基础建设',
            priority: 'medium'
          },
          applicationReason: '村道维修资金申请',
          urgency: 'routine'
        };

        const workflow = await ApprovalWorkflowService.createWorkflow(workflowData, 'village_finance');

        expect(workflow).toBeDefined();
        expect(workflow.workflowName).toBe('测试财务审批');
        expect(workflow.businessType).toBe('village_finance');
        expect(workflow.currentStatus).toBe('draft');
        expect(workflow.workflowConfig.stages).toHaveLength(2); // 中等金额：村主任 -> 村支书
      });

      test('should create appropriate stages based on amount', async () => {
        const largeAmountWorkflow = {
          workflowName: '大额财务审批',
          businessType: 'village_finance',
          businessId: new mongoose.Types.ObjectId(),
          villageId: testVillageId,
          villageName: '测试村',
          applicantId: testApplicantId,
          businessData: {
            amount: 150000, // 大额
            category: '重大项目',
            priority: 'high'
          }
        };

        const workflow = await ApprovalWorkflowService.createWorkflow(largeAmountWorkflow);

        expect(workflow.workflowConfig.stages).toHaveLength(3); // 大额：财务员 -> 村主任 -> 村支书
        expect(workflow.workflowConfig.stages[0].requiredRole).toBe('financial_officer');
        expect(workflow.workflowConfig.stages[1].requiredRole).toBe('village_director');
        expect(workflow.workflowConfig.stages[2].requiredRole).toBe('village_secretary');
      });
    });

    describe('processApproval', () => {
      beforeEach(async () => {
        // Create a test workflow for approval testing
        const workflowData = {
          workflowName: '测试审批流程',
          businessType: 'daily_expense',
          businessId: new mongoose.Types.ObjectId(),
          villageId: testVillageId,
          villageName: '测试村',
          applicantId: testApplicantId,
          businessData: {
            amount: 1000,
            category: '办公用品',
            priority: 'low'
          }
        };

        const workflow = await ApprovalWorkflowService.createWorkflow(workflowData);
        testWorkflowId = workflow._id;
        
        // Submit the workflow
        await ApprovalWorkflowService.submitWorkflow(testWorkflowId);
      });

      test('should process approval successfully', async () => {
        const result = await ApprovalWorkflowService.processApproval(
          testWorkflowId,
          testApproverId,
          'approve',
          '审批通过，同意支出'
        );

        expect(result.success).toBe(true);
        expect(result.message).toBe('审批通过');
        expect(result.workflow.currentStatus).toBe('approved');
        expect(result.workflow.approvalHistory).toHaveLength(1);
        expect(result.workflow.approvalHistory[0].action).toBe('approve');
      });

      test('should process rejection successfully', async () => {
        const result = await ApprovalWorkflowService.processApproval(
          testWorkflowId,
          testApproverId,
          'reject',
          '金额超出预算，拒绝申请'
        );

        expect(result.success).toBe(true);
        expect(result.message).toBe('审批拒绝');
        expect(result.workflow.currentStatus).toBe('rejected');
        expect(result.workflow.approvalHistory[0].action).toBe('reject');
      });

      test('should throw error for unauthorized approver', async () => {
        const unauthorizedApproverId = new mongoose.Types.ObjectId();

        await expect(
          ApprovalWorkflowService.processApproval(
            testWorkflowId,
            unauthorizedApproverId,
            'approve',
            '测试'
          )
        ).rejects.toThrow('您没有权限审批此工作流');
      });
    });

    describe('getUserPendingApprovals', () => {
      beforeEach(async () => {
        // Create multiple test workflows
        for (let i = 0; i < 3; i++) {
          const workflowData = {
            workflowName: `测试待审批${i + 1}`,
            businessType: 'daily_expense',
            businessId: new mongoose.Types.ObjectId(),
            villageId: testVillageId,
            villageName: '测试村',
            applicantId: testApplicantId,
            businessData: {
              amount: 500 + i * 100,
              category: '办公用品',
              priority: i === 0 ? 'urgent' : 'medium'
            }
          };

          const workflow = await ApprovalWorkflowService.createWorkflow(workflowData);
          await ApprovalWorkflowService.submitWorkflow(workflow._id);
        }
      });

      test('should return pending approvals for user', async () => {
        const pendingApprovals = await ApprovalWorkflowService.getUserPendingApprovals(
          testVillageId,
          testApproverId
        );

        expect(pendingApprovals).toHaveLength(3);
        expect(pendingApprovals[0].workflowName).toContain('测试待审批');
        expect(pendingApprovals[0].currentStage).toBeDefined();
        expect(pendingApprovals[0].urgency).toBeDefined();
      });

      test('should filter by business type', async () => {
        const pendingApprovals = await ApprovalWorkflowService.getUserPendingApprovals(
          testVillageId,
          testApproverId,
          { businessType: 'daily_expense' }
        );

        expect(pendingApprovals).toHaveLength(3);
        pendingApprovals.forEach(approval => {
          expect(approval.businessType).toBe('daily_expense');
        });
      });
    });

    describe('getWorkflowStatistics', () => {
      beforeEach(async () => {
        // Create workflows with different statuses
        const statuses = ['approved', 'approved', 'rejected', 'in_progress'];
        
        for (let i = 0; i < statuses.length; i++) {
          const workflowData = {
            workflowName: `统计测试${i + 1}`,
            businessType: 'village_finance',
            businessId: new mongoose.Types.ObjectId(),
            villageId: testVillageId,
            villageName: '测试村',
            applicantId: testApplicantId,
            businessData: {
              amount: 1000,
              category: '测试',
              priority: 'medium'
            }
          };

          const workflow = await ApprovalWorkflowService.createWorkflow(workflowData);
          workflow.currentStatus = statuses[i];
          workflow.timeTracking.totalProcessingTime = 2 + i;
          await workflow.save();
        }
      });

      test('should return correct statistics', async () => {
        const statistics = await ApprovalWorkflowService.getWorkflowStatistics(testVillageId);

        expect(statistics.summary.totalWorkflows).toBe(4);
        expect(statistics.summary.totalApproved).toBe(2);
        expect(statistics.summary.totalRejected).toBe(1);
        expect(statistics.summary.totalPending).toBe(1);
        expect(statistics.summary.approvalRate).toBe(50); // 2/4 * 100
      });
    });
  });

  describe('API Routes', () => {
    describe('POST /api/v1/approval-workflows', () => {
      test('should create workflow via API', async () => {
        const workflowData = {
          workflowName: 'API测试工作流',
          description: '通过API创建的测试工作流',
          businessType: 'village_finance',
          businessId: new mongoose.Types.ObjectId().toString(),
          villageId: testVillageId.toString(),
          villageName: '测试村',
          applicantId: testApplicantId.toString(),
          businessData: {
            amount: 5000,
            category: '办公用品',
            priority: 'medium'
          },
          applicationReason: 'API测试',
          urgency: 'routine'
        };

        const response = await request(app)
          .post('/api/v1/approval-workflows')
          .send(workflowData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.workflowName).toBe('API测试工作流');
        expect(response.body.data.currentStatus).toBe('draft');
      });

      test('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/v1/approval-workflows')
          .send({
            workflowName: 'Test'
            // Missing required fields
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('输入验证失败');
      });
    });

    describe('GET /api/v1/approval-workflows/pending', () => {
      beforeEach(async () => {
        // Create a submitted workflow
        const workflowData = {
          workflowName: 'API测试待审批',
          businessType: 'daily_expense',
          businessId: new mongoose.Types.ObjectId(),
          villageId: testVillageId,
          villageName: '测试村',
          applicantId: testApplicantId,
          businessData: {
            amount: 800,
            category: '办公用品',
            priority: 'medium'
          }
        };

        const workflow = await ApprovalWorkflowService.createWorkflow(workflowData);
        await ApprovalWorkflowService.submitWorkflow(workflow._id);
      });

      test('should return pending approvals via API', async () => {
        const response = await request(app)
          .get('/api/v1/approval-workflows/pending')
          .query({
            villageId: testVillageId.toString(),
            userId: testApproverId.toString()
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.workflows).toHaveLength(1);
        expect(response.body.data.workflows[0].workflowName).toBe('API测试待审批');
      });
    });

    describe('POST /api/v1/approval-workflows/:workflowId/approve', () => {
      let apiTestWorkflowId;

      beforeEach(async () => {
        const workflowData = {
          workflowName: 'API审批测试',
          businessType: 'daily_expense',
          businessId: new mongoose.Types.ObjectId(),
          villageId: testVillageId,
          villageName: '测试村',
          applicantId: testApplicantId,
          businessData: {
            amount: 600,
            category: '办公用品',
            priority: 'low'
          }
        };

        const workflow = await ApprovalWorkflowService.createWorkflow(workflowData);
        await ApprovalWorkflowService.submitWorkflow(workflow._id);
        apiTestWorkflowId = workflow._id;
      });

      test('should approve workflow via API', async () => {
        const response = await request(app)
          .post(`/api/v1/approval-workflows/${apiTestWorkflowId}/approve`)
          .send({
            action: 'approve',
            approverId: testApproverId.toString(),
            comments: 'API测试审批通过'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.currentStatus).toBe('approved');
      });

      test('should reject workflow via API', async () => {
        const response = await request(app)
          .post(`/api/v1/approval-workflows/${apiTestWorkflowId}/approve`)
          .send({
            action: 'reject',
            approverId: testApproverId.toString(),
            comments: 'API测试审批拒绝'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.currentStatus).toBe('rejected');
      });

      test('should validate approval action', async () => {
        const response = await request(app)
          .post(`/api/v1/approval-workflows/${apiTestWorkflowId}/approve`)
          .send({
            action: 'invalid_action',
            approverId: testApproverId.toString(),
            comments: '测试'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/approval-workflows/templates', () => {
      test('should return workflow templates', async () => {
        const response = await request(app)
          .get('/api/v1/approval-workflows/templates');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(4);
        
        const financeTemplate = response.body.data.find(t => t.templateType === 'village_finance');
        expect(financeTemplate).toBeDefined();
        expect(financeTemplate.templateName).toBe('村务财务审批');
      });
    });

    describe('GET /api/v1/approval-workflows/statistics/:villageId', () => {
      beforeEach(async () => {
        // Create some workflows for statistics
        const workflows = [
          { status: 'approved', businessType: 'village_finance' },
          { status: 'approved', businessType: 'daily_expense' },
          { status: 'rejected', businessType: 'village_finance' },
          { status: 'in_progress', businessType: 'village_project' }
        ];

        for (const workflowConfig of workflows) {
          const workflowData = {
            workflowName: `统计测试-${workflowConfig.businessType}`,
            businessType: workflowConfig.businessType,
            businessId: new mongoose.Types.ObjectId(),
            villageId: testVillageId,
            villageName: '测试村',
            applicantId: testApplicantId,
            businessData: {
              amount: 1000,
              category: '测试',
              priority: 'medium'
            }
          };

          const workflow = await ApprovalWorkflowService.createWorkflow(workflowData);
          workflow.currentStatus = workflowConfig.status;
          await workflow.save();
        }
      });

      test('should return workflow statistics via API', async () => {
        const response = await request(app)
          .get(`/api/v1/approval-workflows/statistics/${testVillageId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.summary.totalWorkflows).toBe(4);
        expect(response.body.data.summary.totalApproved).toBe(2);
        expect(response.body.data.summary.totalRejected).toBe(1);
        expect(response.body.data.summary.totalPending).toBe(1);
      });
    });
  });

  describe('Workflow Model', () => {
    test('should calculate progress percentage correctly', async () => {
      const workflow = new ApprovalWorkflow({
        workflowName: '进度测试',
        businessType: 'village_finance',
        businessId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        applicant: {
          applicantId: testApplicantId,
          applicantName: '测试用户'
        },
        workflowConfig: {
          stages: [{}, {}, {}] // 3 stages
        },
        currentStage: {
          stageIndex: 1
        },
        currentStatus: 'in_progress'
      });

      expect(workflow.progressPercentage).toBe(33); // 1/3 * 100, rounded
    });

    test('should detect overdue workflows', async () => {
      const workflow = new ApprovalWorkflow({
        workflowName: '超时测试',
        businessType: 'daily_expense',
        businessId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        applicant: {
          applicantId: testApplicantId,
          applicantName: '测试用户'
        },
        currentStage: {
          stageIndex: 0,
          expectedEndTime: new Date(Date.now() - 3600000) // 1 hour ago
        },
        currentStatus: 'in_progress'
      });

      expect(workflow.isOverdue).toBe(true);
    });

    test('should generate workflow ID correctly', async () => {
      const workflow = new ApprovalWorkflow({
        workflowName: 'ID测试',
        businessType: 'village_finance',
        businessId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        applicant: {
          applicantId: testApplicantId,
          applicantName: '测试用户'
        }
      });

      await workflow.save();
      
      expect(workflow.workflowId).toBeDefined();
      expect(workflow.workflowId).toMatch(/^WFVF\d{8}\d{4}$/);
    });
  });
});

// Integration test helper functions
const createTestWorkflow = async (overrides = {}) => {
  const defaultData = {
    workflowName: '集成测试工作流',
    businessType: 'daily_expense',
    businessId: new mongoose.Types.ObjectId(),
    villageId: new mongoose.Types.ObjectId(),
    villageName: '测试村',
    applicantId: new mongoose.Types.ObjectId(),
    businessData: {
      amount: 1000,
      category: '办公用品',
      priority: 'medium'
    },
    applicationReason: '测试申请',
    urgency: 'routine'
  };

  return ApprovalWorkflowService.createWorkflow({ ...defaultData, ...overrides });
};

const createTestCommitteeMember = async (position = '村主任', villageId = null) => {
  const member = new VillageCommittee({
    realName: `测试${position}`,
    position: position,
    phone: '13800138000',
    email: `${position}@test.com`,
    villageId: villageId || new mongoose.Types.ObjectId(),
    status: 'active'
  });
  
  await member.save();
  return member;
};

module.exports = {
  createTestWorkflow,
  createTestCommitteeMember
};