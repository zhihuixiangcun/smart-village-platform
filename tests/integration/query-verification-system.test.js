/**
 * 查询验证系统综合测试
 * 测试血缘关系绑定、三重验证、特殊情形处理和人脸识别功能
 */

const FamilyRelationshipBinder = require('../../src/services/FamilyRelationshipBinder');
const TripleQueryVerification = require('../../src/services/TripleQueryVerification');
const SpecialCasesHandler = require('../../src/services/SpecialCasesHandler');
const FaceRecognitionService = require('../../src/services/FaceRecognitionService');

describe('查询验证系统测试套件', () => {
  let dbService;
  let relationshipBinder;
  let tripleVerification;
  let specialCasesHandler;
  let faceRecognitionService;

  const testFamilyData = {
    householdId: 'TEST_HOUSEHOLD_001',
    members: [
      {
        id: 1,
        memberId: 'MEMBER_001',
        memberName: '张三',
        memberIdCard: '110101197001010001',
        birthDate: '1970-01-01',
        phoneNumber: '13800138001',
        relationship: 'head',
        gender: 'male'
      },
      {
        id: 2,
        memberId: 'MEMBER_002',
        memberName: '李四',
        memberIdCard: '110101197501010002',
        birthDate: '1975-01-01',
        phoneNumber: '13800138002',
        relationship: 'spouse',
        gender: 'female'
      },
      {
        id: 3,
        memberId: 'MEMBER_003',
        memberName: '张小明',
        memberIdCard: '110101200001010003',
        birthDate: '2000-01-01',
        phoneNumber: '13800138003',
        relationship: 'child',
        gender: 'male'
      }
    ]
  };

  const testUser = {
    id: 'USER_001',
    name: '管理员',
    role: 'village_admin',
    villageId: 'VILLAGE_001'
  };

  beforeEach(() => {
    // 初始化数据库服务（模拟）
    dbService = {
      sqliteDB: {
        run: jest.fn(),
        get: jest.fn(),
        all: jest.fn()
      },
      getUserRoles: jest.fn()
    };

    // 初始化各个服务模块
    relationshipBinder = new FamilyRelationshipBinder(dbService);
    tripleVerification = new TripleQueryVerification(dbService, null);
    specialCasesHandler = new SpecialCasesHandler(dbService);
    faceRecognitionService = new FaceRecognitionService({ 
      dbService,
      confidenceThreshold: 0.8
    });
  });

  describe('血缘关系自动绑定测试', () => {
    test('应该成功自动绑定家庭成员关系', async () => {
      // 模拟获取家庭成员数据
      dbService.sqliteDB.all.mockReturnValue(testFamilyData.members);
      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });
      dbService.sqliteDB.get.mockReturnValue({ id: 1 });

      const result = await relationshipBinder.autoBindFamilyRelationships(
        testFamilyData.householdId
      );

      expect(result.success).toBe(true);
      expect(result.relationships).toBeDefined();
      expect(result.familyTree).toBeDefined();
      expect(dbService.sqliteDB.run).toHaveBeenCalled();
    });

    test('应该正确分析父子关系', async () => {
      const parent = testFamilyData.members[0]; // 张三，1970年生
      const child = testFamilyData.members[2];  // 张小明，2000年生

      const analysis = await relationshipBinder.analyzePairRelationship(parent, child);

      expect(analysis.relationship).toBe(FamilyRelationshipBinder.RELATIONSHIP_TYPES.PARENT_CHILD);
      expect(analysis.confidence).toBeGreaterThan(0.5);
      expect(analysis.evidences).toContainEqual(
        expect.objectContaining({
          type: 'name_similarity',
          sameSurname: true
        })
      );
    });

    test('应该正确分析配偶关系', async () => {
      const spouse1 = testFamilyData.members[0]; // 张三
      const spouse2 = testFamilyData.members[1]; // 李四

      const analysis = await relationshipBinder.analyzePairRelationship(spouse1, spouse2);

      expect(analysis.evidences).toContainEqual(
        expect.objectContaining({
          type: 'age_difference',
          possibleRelations: expect.arrayContaining([
            expect.objectContaining({
              type: FamilyRelationshipBinder.RELATIONSHIP_TYPES.SPOUSE
            })
          ])
        })
      );
    });

    test('应该正确分析身份证关系', async () => {
      const member1 = testFamilyData.members[0];
      const member2 = testFamilyData.members[2];

      const analysis = relationshipBinder.analyzeIdCardRelationship(member1, member2);

      expect(analysis.sameArea).toBe(true); // 相同地区码
      expect(analysis.evidence_strength).toBeGreaterThan(0);
    });

    test('应该成功手动绑定关系', async () => {
      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });
      dbService.sqliteDB.get.mockReturnValue({ id: 1 });

      const bindingData = {
        householdId: testFamilyData.householdId,
        member1Id: 1,
        member2Id: 2,
        relationshipType: FamilyRelationshipBinder.RELATIONSHIP_TYPES.SPOUSE,
        operatorId: testUser.id
      };

      const result = await relationshipBinder.manualBindRelationship(bindingData);

      expect(result.success).toBe(true);
      expect(result.bindingId).toBeDefined();
      expect(dbService.sqliteDB.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO family_relationship_bindings'),
        expect.any(Array)
      );
    });

    test('应该生成正确的家族树结构', async () => {
      // 设置 mock 返回家庭成员数据
      dbService.sqliteDB.all.mockReturnValue(testFamilyData.members);

      const relationships = [
        {
          member1Id: 1,
          member2Id: 2,
          relationshipType: FamilyRelationshipBinder.RELATIONSHIP_TYPES.SPOUSE,
          direction: '1->2'
        },
        {
          member1Id: 1,
          member2Id: 3,
          relationshipType: FamilyRelationshipBinder.RELATIONSHIP_TYPES.PARENT_CHILD,
          direction: '1->2'
        }
      ];

      const familyTree = await relationshipBinder.generateFamilyTree(
        testFamilyData.householdId,
        relationships
      );

      expect(familyTree.nodes).toHaveLength(testFamilyData.members.length);
      expect(familyTree.relationships).toBe(relationships.length);
      expect(familyTree.householdId).toBe(testFamilyData.householdId);
    });
  });

  describe('三重查询校验机制测试', () => {
    test('应该成功启动三重验证流程', async () => {
      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });
      dbService.sqliteDB.get.mockReturnValue({ id: 'VERIFY_001' });

      const queryRequest = {
        queryId: 'QUERY_001',
        requesterId: 'MEMBER_001',
        targetUserId: 'MEMBER_002',
        queryType: TripleQueryVerification.QUERY_TYPES.FAMILY_MEMBER,
        queryData: { fields: ['memberName', 'phoneNumber'] },
        requestReason: '查询家属信息',
        urgencyLevel: 'normal'
      };

      const result = await tripleVerification.initiateTripleVerification(queryRequest);

      expect(result.success).toBe(true);
      expect(result.verificationId).toBeDefined();
      expect(result.currentLevel).toBe(1);
      expect(result.estimatedCompletionTime).toBeGreaterThan(0);
    });

    test('第一层验证应该正确处理人脸识别', async () => {
      const verificationRecord = {
        id: 'VERIFY_001',
        requesterId: 'MEMBER_001',
        targetUserId: 'MEMBER_002',
        queryType: TripleQueryVerification.QUERY_TYPES.FAMILY_MEMBER
      };

      // 模拟用户信息
      dbService.sqliteDB.get.mockReturnValue({
        memberId: 'MEMBER_001',
        memberName: '张三',
        memberIdCard: '110101197001010001',
        phoneNumber: '13800138001'
      });

      // 模拟人脸识别成功
      jest.spyOn(tripleVerification, 'performFaceVerification')
        .mockResolvedValue({ success: true, confidence: 0.95 });
      jest.spyOn(tripleVerification, 'performIdCardVerification')
        .mockResolvedValue({ success: true });
      jest.spyOn(tripleVerification, 'performPhoneVerification')
        .mockResolvedValue({ success: true });

      const result = await tripleVerification.performLevel1Verification(verificationRecord);

      expect(result.status).toBe(TripleQueryVerification.VERIFICATION_STATUS.LEVEL_1_PASSED);
    });

    test('第二层验证应该正确匹配血缘关系', async () => {
      const verificationRecord = {
        id: 'VERIFY_001',
        requesterId: 'MEMBER_001',
        targetUserId: 'MEMBER_003',
        queryType: TripleQueryVerification.QUERY_TYPES.FAMILY_MEMBER
      };

      // 模拟血缘关系数据
      dbService.sqliteDB.get.mockReturnValue({
        member1Id: 1,
        member2Id: 3,
        relationshipType: 'parent_child',
        confidence: 0.9
      });

      jest.spyOn(tripleVerification, 'verifyRelationshipPermission')
        .mockResolvedValue({ hasPermission: true });
      jest.spyOn(tripleVerification, 'checkAutoApprovalConditions')
        .mockResolvedValue({ approved: true });

      const result = await tripleVerification.performLevel2Verification(verificationRecord);

      expect(result.status).toBe(TripleQueryVerification.VERIFICATION_STATUS.LEVEL_2_PASSED);
      expect(result.approved).toBe(true);
      expect(result.approvalMethod).toBe('automatic');
    });

    test('第三层验证应该创建管理员审批流程', async () => {
      const verificationRecord = {
        id: 'VERIFY_001',
        requesterId: 'MEMBER_001',
        targetUserId: 'MEMBER_002',
        queryType: TripleQueryVerification.QUERY_TYPES.SENSITIVE_DATA,
        urgencyLevel: 'normal'
      };

      jest.spyOn(tripleVerification, 'determineApprovalRequirements')
        .mockResolvedValue({ requiredApprovers: 1, estimatedTime: 30 });
      jest.spyOn(tripleVerification, 'findAvailableApprovers')
        .mockResolvedValue([{ id: 'admin1', name: '管理员1' }]);
      jest.spyOn(tripleVerification, 'createApprovalRequest')
        .mockResolvedValue({ id: 'approval_001' });

      const result = await tripleVerification.performLevel3Verification(verificationRecord);

      expect(result.status).toBe(TripleQueryVerification.VERIFICATION_STATUS.PENDING);
      expect(result.currentLevel).toBe(3);
      expect(result.approvalRequestId).toBeDefined();
    });

    test('应该正确处理管理员审批决定', async () => {
      dbService.sqliteDB.get
        .mockReturnValueOnce({ // 获取审批请求
          id: 'approval_001',
          verificationId: 'VERIFY_001',
          requiredApprovers: 1
        })
        .mockReturnValueOnce({ // 获取验证记录
          id: 'VERIFY_001',
          queryType: TripleQueryVerification.QUERY_TYPES.FAMILY_MEMBER,
          targetUserId: 'MEMBER_002',
          queryData: '{}'
        });

      jest.spyOn(tripleVerification, 'verifyApprovalPermission')
        .mockResolvedValue(true);
      jest.spyOn(tripleVerification, 'checkApprovalStatus')
        .mockResolvedValue({
          isComplete: false,  // 设置为false，使代码走审批分支
          finalDecision: 'approved',
          verificationRecord: {
            id: 'VERIFY_001',
            queryType: TripleQueryVerification.QUERY_TYPES.FAMILY_MEMBER,
            targetUserId: 'MEMBER_002',
            queryData: '{}'
          }
        });
      jest.spyOn(tripleVerification, 'executeAuthorizedQuery')
        .mockResolvedValue({ data: 'query_result' });

      const approvalDecision = {
        approvalRequestId: 'approval_001',
        approverId: 'admin1',
        decision: 'approved',
        reason: '血缘关系验证通过'
      };

      const result = await tripleVerification.processApprovalDecision(approvalDecision);

      expect(result.success).toBe(true);
      expect(result.decision).toBe('approved');
      expect(result.queryResult).toBeDefined();
    });

    test('应该正确执行授权查询', async () => {
      const verificationRecord = {
        queryType: TripleQueryVerification.QUERY_TYPES.SELF_INFO,
        targetUserId: 'MEMBER_001',
        queryData: JSON.stringify({ fields: ['memberName', 'phoneNumber'] })
      };

      jest.spyOn(tripleVerification, 'querySelfInfo')
        .mockResolvedValue({ userId: 'MEMBER_001', data: {} });

      const result = await tripleVerification.executeAuthorizedQuery(verificationRecord);

      expect(result).toBeDefined();
      expect(result.userId).toBe('MEMBER_001');
    });
  });

  describe('特殊情形处理测试', () => {
    test('应该成功处理收养关系', async () => {
      const adoptionData = {
        adopterId: 'ADOPTER_001',
        adopteeId: 'ADOPTEE_001',
        originalParentIds: ['PARENT_001'],
        adoptionType: 'full',
        adoptionDate: '2024-01-01',
        courtOrderNumber: 'COURT_001',
        documentFiles: [
          { type: 'adoption_certificate', file: 'cert.pdf' }
        ],
        operatorId: testUser.id
      };

      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });
      dbService.sqliteDB.get.mockReturnValue({ id: 1 });

      jest.spyOn(specialCasesHandler, 'validateAdoption')
        .mockResolvedValue({ valid: true });
      jest.spyOn(specialCasesHandler, 'processDocuments')
        .mockResolvedValue({ valid: true });

      const result = await specialCasesHandler.handleAdoptionCase(adoptionData);

      expect(result.success).toBe(true);
      expect(result.caseId).toBeDefined();
      expect(result.relationshipUpdates).toBeDefined();
      expect(result.adoptionCertificate).toBeDefined();
    });

    test('应该成功处理分户情况', async () => {
      const divisionData = {
        originalHouseholdId: 'HOUSEHOLD_001',
        newHouseholdId: 'HOUSEHOLD_002',
        newHouseholdHead: {
          memberId: 'MEMBER_003',
          memberName: '张小明'
        },
        transferMemberIds: ['MEMBER_003'],
        divisionReason: '结婚分户',
        divisionDate: '2024-01-01',
        documentFiles: [],
        operatorId: testUser.id
      };

      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });
      dbService.sqliteDB.get.mockReturnValue({ id: 1 });

      jest.spyOn(specialCasesHandler, 'validateHouseholdDivision')
        .mockResolvedValue({ valid: true });
      jest.spyOn(specialCasesHandler, 'createNewHousehold')
        .mockResolvedValue({ id: 1, householdId: 'HOUSEHOLD_002' });

      const result = await specialCasesHandler.handleHouseholdDivision(divisionData);

      expect(result.success).toBe(true);
      expect(result.caseId).toBeDefined();
      expect(result.newHouseholdId).toBe('HOUSEHOLD_002');
      expect(result.transferredMembers).toHaveLength(1);
    });

    test('应该成功处理重组家庭情况', async () => {
      const stepfamilyData = {
        marriageParties: [
          { memberId: 'SPOUSE_001', memberName: '张三' },
          { memberId: 'SPOUSE_002', memberName: '王五' }
        ],
        childrenFromPreviousMarriages: [
          { 
            memberId: 'CHILD_001', 
            memberName: '张小明',
            biologicalParentId: 'SPOUSE_001'
          }
        ],
        newHouseholdId: 'HOUSEHOLD_NEW',
        marriageDate: '2024-01-01',
        operatorId: testUser.id
      };

      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });
      dbService.sqliteDB.get.mockReturnValue({ id: 1 });

      const result = await specialCasesHandler.handleStepfamilyCase(stepfamilyData);

      expect(result.success).toBe(true);
      expect(result.caseId).toBeDefined();
      expect(result.marriageRelationship).toBeDefined();
      expect(result.stepchildRelationships).toBeDefined();
    });

    test('应该正确查询特殊情形记录', async () => {
      const mockRecords = [
        {
          id: 1,
          case_type: 'adoption',
          status: 'completed',
          primary_person_id: 'ADOPTEE_001',
          secondary_person_ids: 'ADOPTER_001,PARENT_001',
          case_data: '{}',
          operator_id: 'admin1'
        }
      ];

      dbService.sqliteDB.all.mockReturnValue(mockRecords);

      const queryParams = {
        caseType: SpecialCasesHandler.SPECIAL_CASE_TYPES.ADOPTION,
        status: SpecialCasesHandler.PROCESSING_STATUS.COMPLETED
      };

      const result = await specialCasesHandler.querySpecialCases(queryParams);

      expect(result).toHaveLength(1);
      expect(result[0].caseType).toBe('adoption');
      expect(result[0].secondaryPersonIds).toEqual(['ADOPTER_001', 'PARENT_001']);
    });

    test('收养验证应该正确识别无效情况', async () => {
      // 测试收养人和被收养人是同一人
      const invalidAdoptionData = {
        adopterId: 'SAME_PERSON',
        adopteeId: 'SAME_PERSON',
        adoptionType: 'full'
      };

      const result = await specialCasesHandler.validateAdoption(invalidAdoptionData);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('不能是同一人');
    });

    test('分户验证应该正确识别无效情况', async () => {
      const invalidDivisionData = {
        originalHouseholdId: 'NONEXISTENT',
        transferMemberIds: ['MEMBER_001'],
        newHouseholdHead: { memberId: 'MEMBER_002' } // 不在转移名单中
      };

      jest.spyOn(specialCasesHandler, 'getHouseholdInfo')
        .mockResolvedValue(null); // 原户不存在

      const result = await specialCasesHandler.validateHouseholdDivision(invalidDivisionData);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('原户籍不存在');
    });
  });

  describe('人脸识别验证测试', () => {
    test('应该成功进行人脸验证', async () => {
      const verificationData = {
        faceImage: Buffer.from('fake_face_image'),
        verificationType: FaceRecognitionService.VERIFICATION_TYPES.FACE_COMPARE,
        sessionId: 'SESSION_001',
        deviceInfo: { deviceId: 'DEVICE_001' }
      };

      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });
      dbService.sqliteDB.get.mockReturnValue({
        features: JSON.stringify(Array.from({length: 512}, () => 0.5))
      });

      jest.spyOn(faceRecognitionService, 'extractFaceFeatures')
        .mockResolvedValue({
          faceCount: 1,
          quality: 0.9,
          features: Array.from({length: 512}, () => 0.5)
        });

      const result = await faceRecognitionService.verifyFace('MEMBER_001', verificationData);

      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.verificationId).toBeDefined();
    });

    test('应该正确处理活体检测', async () => {
      const faceImage = Buffer.from('fake_face_image');

      jest.spyOn(faceRecognitionService, 'detectFaces')
        .mockResolvedValue({
          success: true,
          faces: [{ x: 100, y: 100, width: 200, height: 200, confidence: 0.95 }]
        });

      jest.spyOn(faceRecognitionService, 'analyzeLiveness')
        .mockResolvedValue({
          score: 0.9,
          eyeMovement: 0.8,
          mouthMovement: 0.7,
          headPose: { pitch: 0, yaw: 5, roll: -2 }
        });

      const result = await faceRecognitionService.performLivenessDetection(faceImage);

      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.status).toBe(FaceRecognitionService.VERIFICATION_STATUS.SUCCESS);
    });

    test('应该成功注册用户人脸特征', async () => {
      const faceImages = [
        Buffer.from('face_image_1'),
        Buffer.from('face_image_2'),
        Buffer.from('face_image_3')
      ];

      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });

      jest.spyOn(faceRecognitionService, 'extractFaceFeatures')
        .mockResolvedValue({
          faceCount: 1,
          quality: 0.85,
          features: Array.from({length: 512}, () => Math.random())
        });

      const result = await faceRecognitionService.registerUserFace(
        'MEMBER_001',
        faceImages,
        { registrationMethod: 'manual' }
      );

      expect(result.success).toBe(true);
      expect(result.featureCount).toBe(3);
      expect(result.averageQuality).toBeCloseTo(0.85, 2);
    });

    test('应该正确处理身份证人脸比对', async () => {
      const faceImage = Buffer.from('face_image');
      const idCardImage = Buffer.from('id_card_image');

      // 模拟用户信息
      dbService.sqliteDB.get.mockReturnValue({
        memberIdCard: '110101197001010001',
        memberName: '张三'
      });

      jest.spyOn(faceRecognitionService, 'analyzeIdCard')
        .mockResolvedValue({
          success: true,
          name: '张三',
          idNumber: '110101197001010001',
          faceImage: idCardImage,
          imageQuality: 0.8
        });

      jest.spyOn(faceRecognitionService, 'performFaceCompare')
        .mockResolvedValue({
          success: true,
          confidence: 0.92,
          status: FaceRecognitionService.VERIFICATION_STATUS.SUCCESS
        });

      const result = await faceRecognitionService.performIdCardCompare(
        'MEMBER_001',
        faceImage,
        idCardImage
      );

      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.idCardInfo).toBeDefined();
      expect(result.idCardInfo.name).toBe('张三');
    });

    test('应该正确处理多人脸检测失败情况', async () => {
      const faceImage = Buffer.from('multiple_faces_image');

      jest.spyOn(faceRecognitionService, 'extractFaceFeatures')
        .mockResolvedValue({
          faceCount: 2,
          quality: 0.8,
          features: null
        });

      const result = await faceRecognitionService.performFaceCompare(
        'MEMBER_001',
        faceImage,
        null
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe(FaceRecognitionService.VERIFICATION_STATUS.MULTIPLE_FACES);
      expect(result.faceCount).toBe(2);
    });

    test('应该成功批量处理人脸验证', async () => {
      const verificationRequests = [
        {
          userId: 'MEMBER_001',
          verificationData: { faceImage: Buffer.from('image1') }
        },
        {
          userId: 'MEMBER_002',
          verificationData: { faceImage: Buffer.from('image2') }
        }
      ];

      jest.spyOn(faceRecognitionService, 'verifyFace')
        .mockResolvedValue({ success: true, confidence: 0.9 });

      const result = await faceRecognitionService.batchVerifyFaces(verificationRequests);

      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    test('人脸相似度计算应该返回正确结果', async () => {
      const features1 = Array.from({length: 512}, () => 0.5);
      const features2 = Array.from({length: 512}, () => 0.5);
      const features3 = Array.from({length: 512}, () => 0.1);

      const similarity1 = await faceRecognitionService.calculateFaceSimilarity(features1, features2);
      const similarity2 = await faceRecognitionService.calculateFaceSimilarity(features1, features3);

      expect(similarity1).toBeCloseTo(1.0, 2); // 相同特征
      expect(similarity2).toBeLessThan(similarity1); // 不同特征
    });
  });

  describe('集成测试', () => {
    test('完整的查询验证流程应该正常工作', async () => {
      // 模拟完整流程：血缘关系绑定 -> 三重验证 -> 特殊情形处理 -> 人脸识别

      // 1. 血缘关系自动绑定
      dbService.sqliteDB.all.mockReturnValue(testFamilyData.members);
      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });
      dbService.sqliteDB.get.mockReturnValue({ id: 1 });

      const bindingResult = await relationshipBinder.autoBindFamilyRelationships(
        testFamilyData.householdId
      );
      expect(bindingResult.success).toBe(true);

      // 2. 启动三重验证
      const queryRequest = {
        queryId: 'QUERY_001',
        requesterId: 'MEMBER_001',
        targetUserId: 'MEMBER_003', // 查询子女信息
        queryType: TripleQueryVerification.QUERY_TYPES.FAMILY_MEMBER,
        queryData: { fields: ['memberName', 'birthDate'] },
        requestReason: '父亲查询子女信息'
      };

      const verificationResult = await tripleVerification.initiateTripleVerification(queryRequest);
      expect(verificationResult.success).toBe(true);

      // 3. 人脸识别验证
      // 更新mock以返回人脸特征数据
      dbService.sqliteDB.get.mockReturnValue({
        features: JSON.stringify(Array.from({length: 512}, () => 0.5))
      });

      const faceVerificationData = {
        faceImage: Buffer.from('father_face_image'),
        verificationType: FaceRecognitionService.VERIFICATION_TYPES.FACE_COMPARE,
        sessionId: 'SESSION_INTEGRATION',
        deviceInfo: { deviceId: 'DEVICE_001' }
      };

      jest.spyOn(faceRecognitionService, 'extractFaceFeatures')
        .mockResolvedValue({
          faceCount: 1,
          quality: 0.9,
          features: Array.from({length: 512}, () => 0.5)
        });

      const faceResult = await faceRecognitionService.verifyFace(
        'MEMBER_001',
        faceVerificationData
      );
      expect(faceResult.success).toBe(true);

      console.log('完整查询验证流程测试通过');
    });

    test('跨模块数据一致性应该得到保证', async () => {
      // 测试不同模块间的数据一致性

      // 1. 在血缘关系模块中创建关系
      const bindingData = {
        householdId: testFamilyData.householdId,
        member1Id: 1,
        member2Id: 3,
        relationshipType: FamilyRelationshipBinder.RELATIONSHIP_TYPES.PARENT_CHILD,
        operatorId: testUser.id
      };

      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });
      dbService.sqliteDB.get.mockReturnValue({ id: 1 });

      await relationshipBinder.manualBindRelationship(bindingData);

      // 2. 在三重验证中使用这个关系
      dbService.sqliteDB.get.mockReturnValue({
        member1Id: 1,
        member2Id: 3,
        relationshipType: 'parent_child',
        confidence: 1.0
      });

      const relationshipData = await tripleVerification.getRelationshipData(1, 3);
      expect(relationshipData.relationshipType).toBe('parent_child');

      // 3. 验证特殊情形处理中的数据一致性
      jest.spyOn(specialCasesHandler, 'getUserInfo')
        .mockResolvedValue(testFamilyData.members[0]);

      const userInfo = await specialCasesHandler.getUserInfo('MEMBER_001');
      expect(userInfo.memberName).toBe('张三');
    });
  });

  describe('错误处理和边界条件测试', () => {
    test('应该正确处理数据库连接失败', async () => {
      // Mock both run and all to throw errors
      dbService.sqliteDB.run.mockImplementation(() => {
        throw new Error('数据库连接失败');
      });
      dbService.sqliteDB.all.mockImplementation(() => {
        throw new Error('数据库连接失败');
      });

      await expect(
        relationshipBinder.autoBindFamilyRelationships(testFamilyData.householdId)
      ).rejects.toThrow('自动绑定血缘关系失败');
    });

    test('应该正确处理无效的验证数据', async () => {
      const invalidQueryRequest = {
        // 缺少必要字段
        queryId: 'INVALID_QUERY'
      };

      await expect(
        tripleVerification.initiateTripleVerification(invalidQueryRequest)
      ).rejects.toThrow();
    });

    test('应该正确处理人脸识别服务异常', async () => {
      jest.spyOn(faceRecognitionService, 'extractFaceFeatures')
        .mockImplementation(() => {
          throw new Error('人脸识别服务不可用');
        });

      const result = await faceRecognitionService.performFaceCompare(
        'MEMBER_001',
        Buffer.from('image'),
        null
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe(FaceRecognitionService.VERIFICATION_STATUS.ERROR);
    });

    test('应该正确处理并发访问冲突', async () => {
      // 模拟并发操作
      const promises = Array.from({length: 5}, (_, i) => 
        relationshipBinder.manualBindRelationship({
          householdId: testFamilyData.householdId,
          member1Id: 1,
          member2Id: i + 2,
          relationshipType: FamilyRelationshipBinder.RELATIONSHIP_TYPES.PARENT_CHILD,
          operatorId: testUser.id
        })
      );

      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });
      dbService.sqliteDB.get.mockReturnValue({ id: 1 });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      expect(successful).toBeGreaterThan(0);
    });
  });

  describe('性能测试', () => {
    test('大量血缘关系绑定的性能应该可接受', async () => {
      const largeFamilyMembers = Array.from({length: 100}, (_, i) => ({
        id: i + 1,
        memberId: `MEMBER_${i + 1}`,
        memberName: `成员${i + 1}`,
        memberIdCard: `11010119800101${String(i + 1).padStart(4, '0')}`,
        birthDate: `1980-01-${String((i % 30) + 1).padStart(2, '0')}`
      }));

      dbService.sqliteDB.all.mockReturnValue(largeFamilyMembers);
      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });
      dbService.sqliteDB.get.mockReturnValue({ id: 1 });

      const startTime = Date.now();
      const result = await relationshipBinder.autoBindFamilyRelationships(
        'LARGE_HOUSEHOLD',
        { forceRebind: true }
      );
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // 应该在10秒内完成
    });

    test('批量人脸验证的性能应该可接受', async () => {
      const batchRequests = Array.from({length: 50}, (_, i) => ({
        userId: `MEMBER_${i + 1}`,
        verificationData: {
          faceImage: Buffer.from(`fake_image_${i + 1}`)
        }
      }));

      jest.spyOn(faceRecognitionService, 'verifyFace')
        .mockResolvedValue({ success: true, confidence: 0.9 });

      const startTime = Date.now();
      const result = await faceRecognitionService.batchVerifyFaces(batchRequests);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(50);
      expect(endTime - startTime).toBeLessThan(30000); // 应该在30秒内完成
    });
  });
});