const mongoose = require('mongoose');
const ApprovalWorkflow = require('../src/models/ApprovalWorkflow');
const VillageCommittee = require('../src/models/VillageCommittee');
const ApprovalWorkflowService = require('../src/services/ApprovalWorkflowService');

describe('Approval Workflow System (Unit Tests)', () => {
  let testVillageId;
  let testApplicantId;
  let testApproverId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/smart_village_test');
    }

    // Create test data
    testVillageId = new mongoose.Types.ObjectId();
    testApplicantId = new mongoose.Types.ObjectId();
    testApproverId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    // Clean up
    await ApprovalWorkflow.deleteMany({});
    await VillageCommittee.deleteMany({});
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await ApprovalWorkflow.deleteMany({});
  });

  describe('ApprovalWorkflow Model', () => {
    test('should create workflow with required fields', async () => {
      const workflowData = {
        workflowName: '测试工作流',
        businessType: 'village_finance',
        businessId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        villageName: '测试村',
        applicant: {
          applicantId: testApplicantId,
          applicantName: '测试申请人',
          applicationReason: '测试申请'
        },
        businessData: {
          amount: 1000,
          category: '办公用品',
          priority: 'medium'
        },
        workflowConfig: {
          stages: [{
            stageName: '村主任审批',
            stageOrder: 1,
            stageType: 'single_approver',
            requiredRole: 'village_director',
            timeLimit: 48,
            approverUsers: []
          }]
        }
      };

      const workflow = new ApprovalWorkflow(workflowData);
      await workflow.save();

      expect(workflow.workflowId).toBeDefined();
      expect(workflow.workflowId).toMatch(/^WFVF\d+$/);
      expect(workflow.currentStatus).toBe('draft');
      expect(workflow.progressPercentage).toBe(0);
    });

    test('should calculate progress percentage correctly', () => {
      const workflow = new ApprovalWorkflow({
        workflowName: '进度测试',
        businessType: 'village_finance',
        businessId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        applicant: { applicantId: testApplicantId },
        workflowConfig: {
          stages: new Array(4).fill({}) // 4 stages
        },
        currentStage: { stageIndex: 2 },
        currentStatus: 'in_progress'
      });

      expect(workflow.progressPercentage).toBe(50); // 2/4 * 100
    });

    test('should detect overdue workflows', () => {
      const workflow = new ApprovalWorkflow({
        workflowName: '超时测试',
        businessType: 'village_finance',
        businessId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        applicant: { applicantId: testApplicantId },
        currentStage: {
          stageIndex: 0,
          expectedEndTime: new Date(Date.now() - 3600000) // 1 hour ago
        },
        currentStatus: 'in_progress'
      });

      expect(workflow.isOverdue).toBe(true);
    });

    test('should calculate remaining hours correctly', () => {
      const futureTime = new Date(Date.now() + 2 * 3600000); // 2 hours from now
      const workflow = new ApprovalWorkflow({
        workflowName: '剩余时间测试',
        businessType: 'village_finance',
        businessId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        applicant: { applicantId: testApplicantId },
        currentStage: {
          stageIndex: 0,
          expectedEndTime: futureTime
        },
        currentStatus: 'in_progress'
      });

      expect(workflow.remainingHours).toBeGreaterThan(0);
      expect(workflow.remainingHours).toBeLessThanOrEqual(2);
    });
  });

  describe('ApprovalWorkflowService', () => {
    describe('getWorkflowTemplate', () => {
      test('should return financial workflow template', async () => {
        const businessData = { amount: 15000, category: 'infrastructure' };
        const template = await ApprovalWorkflowService.getWorkflowTemplate('village_finance', { businessData });

        expect(template.stages).toHaveLength(2); // medium amount: director + secretary
        expect(template.stages[0].requiredRole).toBe('village_director');
        expect(template.stages[1].requiredRole).toBe('village_secretary');
      });

      test('should return large amount workflow template', async () => {
        const businessData = { amount: 150000, category: 'major_project' };
        const template = await ApprovalWorkflowService.getWorkflowTemplate('village_finance', { businessData });

        expect(template.stages).toHaveLength(3); // large amount: financial + director + secretary
        expect(template.stages[0].requiredRole).toBe('financial_officer');
        expect(template.stages[1].requiredRole).toBe('village_director');
        expect(template.stages[2].requiredRole).toBe('village_secretary');
      });

      test('should return small amount workflow template', async () => {
        const businessData = { amount: 500, category: 'supplies' };
        const template = await ApprovalWorkflowService.getWorkflowTemplate('village_finance', { businessData });

        expect(template.stages).toHaveLength(1); // small amount: director only
        expect(template.stages[0].requiredRole).toBe('village_director');
      });

      test('should return project workflow template', async () => {
        const businessData = { amount: 50000, priority: 'medium' };
        const template = await ApprovalWorkflowService.getProjectWorkflowTemplate(businessData);

        expect(template.stages).toHaveLength(3); // basic project: village review + technical + budget
        expect(template.stages[0].stageName).toBe('村委会初审');
        expect(template.stages[1].stageName).toBe('技术评估');
        expect(template.stages[2].stageName).toBe('预算审核');
      });

      test('should return daily expense workflow template', async () => {
        const businessData = { amount: 1500, urgency: 'routine' };
        const template = await ApprovalWorkflowService.getDailyExpenseWorkflowTemplate(businessData);

        expect(template.stages).toHaveLength(2); // medium expense: director + secretary
        expect(template.stages[0].requiredRole).toBe('village_director');
        expect(template.stages[1].requiredRole).toBe('village_secretary');
      });
    });

    describe('createWorkflow', () => {
      test('should create workflow with proper configuration', async () => {
        const workflowData = {
          workflowName: '服务测试工作流',
          description: '测试ApprovalWorkflowService.createWorkflow',
          businessType: 'village_finance',
          businessId: new mongoose.Types.ObjectId(),
          villageId: testVillageId,
          villageName: '测试村',
          applicantId: testApplicantId,
          businessData: {
            amount: 8000,
            category: '办公设备',
            priority: 'medium'
          },
          applicationReason: '购买办公设备',
          urgency: 'routine'
        };

        const workflow = await ApprovalWorkflowService.createWorkflow(workflowData);

        expect(workflow).toBeDefined();
        expect(workflow.workflowName).toBe('服务测试工作流');
        expect(workflow.businessType).toBe('village_finance');
        expect(workflow.currentStatus).toBe('draft');
        expect(workflow.workflowConfig.stages.length).toBeGreaterThan(0);
      });

      test('should throw error for missing applicant', async () => {
        const workflowData = {
          workflowName: '错误测试',
          businessType: 'village_finance',
          businessId: new mongoose.Types.ObjectId(),
          villageId: testVillageId,
          villageName: '测试村',
          applicantId: new mongoose.Types.ObjectId(), // Non-existent applicant
          businessData: { amount: 1000, category: '测试' }
        };

        await expect(ApprovalWorkflowService.createWorkflow(workflowData))
          .rejects.toThrow('申请人不存在');
      });
    });
  });

  describe('Workflow Instance Methods', () => {
    let testWorkflow;

    beforeEach(async () => {
      testWorkflow = new ApprovalWorkflow({
        workflowName: '实例方法测试',
        businessType: 'daily_expense',
        businessId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        villageName: '测试村',
        applicant: {
          applicantId: testApplicantId,
          applicantName: '测试申请人'
        },
        businessData: {
          amount: 800,
          category: '办公用品',
          priority: 'low'
        },
        workflowConfig: {
          stages: [{
            stageName: '村主任审批',
            stageOrder: 1,
            stageType: 'single_approver',
            requiredRole: 'village_director',
            timeLimit: 24,
            approverUsers: [{
              userId: testApproverId,
              userName: '测试审批人',
              userRole: 'village_director',
              isPrimary: true
            }]
          }]
        },
        currentStage: {
          stageIndex: 0,
          currentApprovers: []
        }
      });

      await testWorkflow.save();
    });

    test('should submit workflow successfully', async () => {
      await testWorkflow.submit();

      expect(testWorkflow.currentStatus).toBe('in_progress');
      expect(testWorkflow.currentStage.stageName).toBe('村主任审批');
      expect(testWorkflow.currentStage.currentApprovers).toHaveLength(1);
      expect(testWorkflow.timeTracking.submittedDate).toBeDefined();
    });

    test('should move to next stage correctly', async () => {
      // Add a second stage for testing
      testWorkflow.workflowConfig.stages.push({
        stageName: '村支书审批',
        stageOrder: 2,
        stageType: 'single_approver',
        requiredRole: 'village_secretary',
        timeLimit: 48,
        approverUsers: [{
          userId: new mongoose.Types.ObjectId(),
          userName: '村支书',
          userRole: 'village_secretary'
        }]
      });

      await testWorkflow.submit();
      await testWorkflow.moveToNextStage();

      expect(testWorkflow.currentStage.stageIndex).toBe(1);
      expect(testWorkflow.currentStage.stageName).toBe('村支书审批');
    });

    test('should complete workflow when all stages done', async () => {
      await testWorkflow.submit();
      
      // Move to next stage (should complete since only one stage)
      testWorkflow.currentStage.stageIndex = 1;
      await testWorkflow.moveToNextStage();

      expect(testWorkflow.currentStatus).toBe('approved');
    });

    test('should handle approval correctly', async () => {
      await testWorkflow.submit();

      await testWorkflow.processApproval(
        testApproverId,
        '测试审批人',
        '村主任',
        'approve',
        '审批通过'
      );

      expect(testWorkflow.approvalHistory).toHaveLength(1);
      expect(testWorkflow.approvalHistory[0].action).toBe('approve');
      expect(testWorkflow.approvalHistory[0].comments).toBe('审批通过');
      expect(testWorkflow.currentStatus).toBe('approved');
    });

    test('should handle rejection correctly', async () => {
      await testWorkflow.submit();

      await testWorkflow.processApproval(
        testApproverId,
        '测试审批人',
        '村主任',
        'reject',
        '拒绝申请'
      );

      expect(testWorkflow.approvalHistory).toHaveLength(1);
      expect(testWorkflow.approvalHistory[0].action).toBe('reject');
      expect(testWorkflow.currentStatus).toBe('rejected');
    });

    test('should cancel workflow', async () => {
      await testWorkflow.cancel('测试取消');

      expect(testWorkflow.currentStatus).toBe('cancelled');
      expect(testWorkflow.finalResult.resultType).toBe('cancelled');
      expect(testWorkflow.notes).toBe('测试取消');
    });

    test('should restart workflow', async () => {
      // Complete the workflow first
      await testWorkflow.submit();
      await testWorkflow.processApproval(testApproverId, '测试审批人', '村主任', 'approve', '通过');

      // Now restart it
      await testWorkflow.restart();

      expect(testWorkflow.currentStatus).toBe('in_progress');
      expect(testWorkflow.currentStage.stageIndex).toBe(0);
      expect(testWorkflow.approvalHistory).toHaveLength(0);
      expect(testWorkflow.timeTracking.startProcessingDate).toBeNull();
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create some test workflows with different statuses
      const workflows = [
        {
          workflowName: '统计测试1',
          businessType: 'village_finance',
          currentStatus: 'approved',
          businessData: { amount: 1000 }
        },
        {
          workflowName: '统计测试2',
          businessType: 'village_finance',
          currentStatus: 'approved',
          businessData: { amount: 2000 }
        },
        {
          workflowName: '统计测试3',
          businessType: 'daily_expense',
          currentStatus: 'rejected',
          businessData: { amount: 500 }
        },
        {
          workflowName: '统计测试4',
          businessType: 'village_project',
          currentStatus: 'in_progress',
          businessData: { amount: 10000 }
        }
      ];

      for (const workflowData of workflows) {
        const workflow = new ApprovalWorkflow({
          ...workflowData,
          businessId: new mongoose.Types.ObjectId(),
          villageId: testVillageId,
          villageName: '测试村',
          applicant: {
            applicantId: testApplicantId,
            applicantName: '测试申请人'
          },
          timeTracking: {
            totalProcessingTime: 2 // hours
          }
        });
        
        await workflow.save();
      }
    });

    test('should return correct workflow statistics', async () => {
      const statistics = await ApprovalWorkflow.getWorkflowStatistics(testVillageId);

      expect(statistics).toHaveLength(3); // 3 business types
      
      // Should have village_finance, daily_expense, village_project
      const businessTypes = statistics.map(stat => stat._id);
      expect(businessTypes).toContain('village_finance');
      expect(businessTypes).toContain('daily_expense');
      expect(businessTypes).toContain('village_project');
    });

    test('should return pending approvals', async () => {
      // Create a workflow in progress with current approver
      const workflow = new ApprovalWorkflow({
        workflowName: '待审批测试',
        businessType: 'daily_expense',
        businessId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        villageName: '测试村',
        applicant: {
          applicantId: testApplicantId,
          applicantName: '测试申请人'
        },
        businessData: { amount: 800, priority: 'medium' },
        currentStatus: 'in_progress',
        currentStage: {
          stageIndex: 0,
          currentApprovers: [{
            userId: testApproverId,
            userName: '测试审批人',
            userRole: 'village_director'
          }]
        }
      });

      await workflow.save();

      const pendingApprovals = await ApprovalWorkflow.getPendingApprovals(testVillageId, testApproverId);

      expect(pendingApprovals).toHaveLength(1);
      expect(pendingApprovals[0].workflowName).toBe('待审批测试');
    });
  });
});

// Helper function for creating test committee members (if needed in the future)
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

module.exports = { createTestCommitteeMember };