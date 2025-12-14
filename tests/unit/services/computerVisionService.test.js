/**
 * 计算机视觉服务单元测试
 */

const computerVisionService = require('../../../src/services/computerVisionService');
const axios = require('axios');

// Mock dependencies
jest.mock('axios');
jest.mock('fs');
jest.mock('sharp');

describe('ComputerVisionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('faceRecognition', () => {
    it('应该成功识别人脸', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      const options = {
        provider: 'baidu',
        userId: 'user123'
      };

      const mockBaiduResponse = {
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: {
            face_list: [{
              face_token: 'face123',
              user_id: 'user123',
              user_info: '张三',
              probability: 99.5
            }]
          }
        }
      };

      axios.post.mockResolvedValue(mockBaiduResponse);

      const result = await computerVisionService.faceRecognition(imageBuffer, options);

      expect(axios.post).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.face_list).toHaveLength(1);
    });

    it('应该在未检测到人脸时返回失败', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      const options = {
        provider: 'baidu'
      };

      const mockBaiduResponse = {
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: {
            face_list: []
          }
        }
      };

      axios.post.mockResolvedValue(mockBaiduResponse);

      const result = await computerVisionService.faceRecognition(imageBuffer, options);

      expect(result.success).toBe(false);
      expect(result.message).toContain('未检测到人脸');
    });

    it('应该处理API错误', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      const options = {
        provider: 'baidu'
      };

      axios.post.mockRejectedValue(new Error('API Error'));

      const result = await computerVisionService.faceRecognition(imageBuffer, options);

      expect(result.success).toBe(false);
      expect(result.message).toContain('人脸识别失败');
    });

    it('应该支持腾讯云人脸识别', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      const options = {
        provider: 'tencent'
      };

      const mockTencentResponse = {
        data: {
          Response: {
            RequestId: 'req123',
            FaceInfos: [{
              FaceId: 'face123',
              Name: '张三',
              Confidence: 99
            }]
          }
        }
      };

      axios.post.mockResolvedValue(mockTencentResponse);

      const result = await computerVisionService.faceRecognition(imageBuffer, options);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('tencent');
    });
  });

  describe('ocrRecognition', () => {
    it('应该成功识别身份证', async () => {
      const imageBuffer = Buffer.from('fake-id-card-image');
      const options = {
        provider: 'baidu',
        type: 'id_card'
      };

      const mockBaiduResponse = {
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: {
            name: '张三',
            id_number: '330106199001011234',
            address: '浙江省杭州市余杭区瓶窑镇',
            birth: '1990-01-01',
            gender: '男',
            nation: '汉'
          }
        }
      };

      axios.post.mockResolvedValue(mockBencentResponse);

      const result = await computerVisionService.ocrRecognition(imageBuffer, options);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('张三');
      expect(result.data.id_number).toBe('330106199001011234');
    });

    it('应该识别驾驶证', async () => {
      const imageBuffer = Buffer.from('fake-driver-license-image');
      const options = {
        provider: 'baidu',
        type: 'driver_license'
      };

      const mockBaiduResponse = {
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: {
            name: '张三',
            license_number: '3301061234567890123',
            vehicle_class: 'C1',
            valid_from: '2020-01-01',
            valid_to: '2030-01-01'
          }
        }
      };

      axios.post.mockResolvedValue(mockBaiduResponse);

      const result = await computerVisionService.ocrRecognition(imageBuffer, options);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('张三');
      expect(result.data.vehicle_class).toBe('C1');
    });

    it('应该识别普通文档', async () => {
      const imageBuffer = Buffer.from('fake-document-image');
      const options = {
        provider: 'tencent',
        type: 'general'
      };

      const mockTencentResponse = {
        data: {
          Response: {
            RequestId: 'req123',
            TextDetections: [{
              DetectedText: '这是一份测试文档',
              Confidence: 95
            }]
          }
        }
      };

      axios.post.mockResolvedValue(mockTencentResponse);

      const result = await computerVisionService.ocrRecognition(imageBuffer, options);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('tencent');
    });

    it('应该处理OCR识别失败的情况', async () => {
      const imageBuffer = Buffer.from('fake-blurry-image');
      const options = {
        provider: 'baidu',
        type: 'general'
      };

      const mockBaiduResponse = {
        data: {
          error_code: 222202, // 图片模糊
          error_msg: 'image blur'
        }
      };

      axios.post.mockResolvedValue(mockBaiduResponse);

      const result = await computerVisionService.ocrRecognition(imageBuffer, options);

      expect(result.success).toBe(false);
      expect(result.error_code).toBe(222202);
    });
  });

  describe('cropDiseaseDetection', () => {
    it('应该成功检测作物病害', async () => {
      const imageBuffer = Buffer.from('fake-crop-image');
      const options = {
        provider: 'baidu',
        crop_type: 'rice'
      };

      const mockBaiduResponse = {
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: {
            disease_list: [{
              disease_name: '稻瘟病',
              probability: 85.2,
              description: '稻瘟病是一种常见的真菌性病害',
              treatment: '建议使用三环唑等药剂防治',
              prevention: '合理施肥，增强植株抗性'
            }]
          }
        }
      };

      axios.post.mockResolvedValue(mockBaiduResponse);

      const result = await computerVisionService.cropDiseaseDetection(imageBuffer, options);

      expect(result.success).toBe(true);
      expect(result.data.disease_list).toHaveLength(1);
      expect(result.data.disease_list[0].disease_name).toBe('稻瘟病');
    });

    it('应该在未检测到病害时返回健康状态', async () => {
      const imageBuffer = Buffer.from('fake-healthy-crop-image');
      const options = {
        provider: 'baidu',
        crop_type: 'wheat'
      };

      const mockBaiduResponse = {
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: {
            disease_list: [],
            health_status: 'healthy',
            confidence: 92.5
          }
        }
      };

      axios.post.mockResolvedValue(mockBaiduResponse);

      const result = await computerVisionService.cropDiseaseDetection(imageBuffer, options);

      expect(result.success).toBe(true);
      expect(result.data.health_status).toBe('healthy');
    });

    it('应该提供多种可能的病害诊断', async () => {
      const imageBuffer = Buffer.from('fake-crop-image-multiple');
      const options = {
        provider: 'tencent',
        crop_type: 'corn'
      };

      const mockTencentResponse = {
        data: {
          Response: {
            RequestId: 'req123',
            DiseaseList: [
              {
                Disease: '玉米大斑病',
                Confidence: 75
              },
              {
                Disease: '玉米小斑病',
                Confidence: 45
              }
            ]
          }
        }
      };

      axios.post.mockResolvedValue(mockTencentResponse);

      const result = await computerVisionService.cropDiseaseDetection(imageBuffer, options);

      expect(result.success).toBe(true);
      expect(result.data.DiseaseList.length).toBeGreaterThan(0);
    });
  });

  describe('constructionMonitoring', () => {
    it('应该成功分析工程进度', async () => {
      const imageBuffer = Buffer.from('fake-construction-image');
      const options = {
        provider: 'baidu',
        project_id: 'project123',
        expected_progress: 60
      };

      const mockAnalysis = {
        actual_progress: 55,
        progress_variance: -5,
        quality_score: 85,
        safety_issues: [
          {
            type: '未佩戴安全帽',
            location: [100, 200],
            severity: 'medium'
          }
        ],
        equipment_count: {
          excavator: 2,
          crane: 1,
          truck: 3
        },
        worker_count: 12,
        timestamp: new Date()
      };

      const mockBaiduResponse = {
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: mockAnalysis
        }
      };

      axios.post.mockResolvedValue(mockBaiduResponse);

      const result = await computerVisionService.constructionMonitoring(imageBuffer, options);

      expect(result.success).toBe(true);
      expect(result.data.actual_progress).toBe(55);
      expect(result.data.progress_variance).toBe(-5);
      expect(result.data.safety_issues).toHaveLength(1);
    });

    it('应该检测施工安全问题', async () => {
      const imageBuffer = Buffer.from('fake-construction-image');
      const options = {
        provider: 'tencent',
        safety_check: true
      };

      const mockTencentResponse = {
        data: {
          Response: {
            RequestId: 'req123',
            SafetyAnalysis: {
              Violations: [
                {
                  Type: '未佩戴安全帽',
                  Count: 3,
                  Severity: 'high',
                  Locations: [[150, 250], [300, 400], [450, 550]]
                },
                {
                  Type: '高空作业无防护',
                  Count: 1,
                  Severity: 'critical',
                  Locations: [[200, 300]]
                }
              ],
              SafetyScore: 65
            }
          }
        }
      };

      axios.post.mockResolvedValue(mockTencentResponse);

      const result = await computerVisionService.constructionMonitoring(imageBuffer, options);

      expect(result.success).toBe(true);
      expect(result.data.SafetyAnalysis.Violations).toHaveLength(2);
      expect(result.data.SafetyAnalysis.SafetyScore).toBe(65);
    });

    it('应该比较多张图片的进度变化', async () => {
      const imageBuffer1 = Buffer.from('before-image');
      const imageBuffer2 = Buffer.from('after-image');
      const options = {
        provider: 'baidu',
        compare_images: true,
        time_interval: 7 // 天
      };

      const mockBaiduResponse = {
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: {
            progress_change: 15,
            area_completed: 1200,
            efficiency_score: 88,
            recommendations: [
              '建议增加施工人员以加快进度',
              '注意雨季对施工的影响'
            ]
          }
        }
      };

      axios.post.mockResolvedValue(mockBaiduResponse);

      const result = await computerVisionService.constructionMonitoring(
        [imageBuffer1, imageBuffer2],
        options
      );

      expect(result.success).toBe(true);
      expect(result.data.progress_change).toBe(15);
      expect(result.data.recommendations).toHaveLength(2);
    });
  });

  describe('batchImageAnalysis', () => {
    it('应该批量处理多张图片', async () => {
      const imageBuffers = [
        Buffer.from('image1'),
        Buffer.from('image2'),
        Buffer.from('image3')
      ];
      const options = {
        analysis_type: 'crop_disease',
        provider: 'baidu',
        parallel: true
      };

      const mockResults = [
        { success: true, data: { disease: '病害1' } },
        { success: true, data: { disease: '病害2' } },
        { success: true, data: { disease: '病害3' } }
      ];

      // Mock individual analysis calls
      computerVisionService.cropDiseaseDetection
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const result = await computerVisionService.batchImageAnalysis(imageBuffers, options);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.summary.success_count).toBe(3);
      expect(result.summary.failed_count).toBe(0);
    });

    it('应该处理批量分析中的部分失败', async () => {
      const imageBuffers = [
        Buffer.from('valid-image'),
        Buffer.from('invalid-image'),
        Buffer.from('another-valid-image')
      ];
      const options = {
        analysis_type: 'ocr',
        provider: 'tencent'
      };

      computerVisionService.ocrRecognition
        .mockResolvedValueOnce({ success: true, data: { text: '识别成功' } })
        .mockRejectedValueOnce(new Error('识别失败'))
        .mockResolvedValueOnce({ success: true, data: { text: '再次成功' } });

      const result = await computerVisionService.batchImageAnalysis(imageBuffers, options);

      expect(result.success).toBe(true);
      expect(result.summary.success_count).toBe(2);
      expect(result.summary.failed_count).toBe(1);
    });
  });

  describe('imageProcessing', () => {
    it('应该优化图像质量', async () => {
      const imageBuffer = Buffer.from('low-quality-image');
      const options = {
        enhance: true,
        denoise: true,
        sharpen: true
      };

      // Mock image processing
      const mockProcessedImage = Buffer.from('processed-image-data');
      const mockSharp = {
        resize: jest.fn().mockReturnThis(),
        sharpen: jest.fn().mockReturnThis(),
        normalize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockResolvedValue(mockProcessedImage)
      };

      // Mock sharp import
      jest.doMock('sharp', () => jest.fn(() => mockSharp));

      const result = await computerVisionService.imageProcessing(imageBuffer, options);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProcessedImage);
    });

    it('应该调整图像尺寸', async () => {
      const imageBuffer = Buffer.from('large-image');
      const options = {
        resize: {
          width: 800,
          height: 600,
          fit: 'contain'
        }
      };

      const mockResizedImage = Buffer.from('resized-image');
      const mockSharp = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockResolvedValue(mockResizedImage)
      };

      jest.doMock('sharp', () => jest.fn(() => mockSharp));

      const result = await computerVisionService.imageProcessing(imageBuffer, options);

      expect(result.success).toBe(true);
      expect(mockSharp.resize).toHaveBeenCalledWith(800, 600, { fit: 'contain' });
    });
  });

  describe('serviceHealthCheck', () => {
    it('应该检查所有AI服务的健康状态', async () => {
      const mockBaiduHealth = {
        status: 'healthy',
        response_time: 150,
        quota_used: 8500,
        quota_limit: 10000
      };

      const mockTencentHealth = {
        status: 'healthy',
        response_time: 120,
        request_id: 'req123'
      };

      axios.get
        .mockResolvedValueOnce({ data: mockBaiduHealth })
        .mockResolvedValueOnce({ data: mockTencentHealth });

      const result = await computerVisionService.serviceHealthCheck();

      expect(result.baidu).toBeDefined();
      expect(result.tencent).toBeDefined();
      expect(result.overall).toBe('healthy');
    });

    it('应该检测到服务异常', async () => {
      axios.get
        .mockRejectedValueOnce(new Error('百度服务不可用'))
        .mockResolvedValueOnce({ data: { status: 'healthy' } });

      const result = await computerVisionService.serviceHealthCheck();

      expect(result.baidu.status).toBe('unhealthy');
      expect(result.tencent.status).toBe('healthy');
      expect(result.overall).toBe('degraded');
    });
  });

  describe('quotaManagement', () => {
    it('应该获取配额使用情况', async () => {
      const provider = 'baidu';

      const mockQuotaInfo = {
        daily_used: 8500,
        daily_limit: 10000,
        monthly_used: 125000,
        monthly_limit: 200000,
        remaining_daily: 1500,
        remaining_monthly: 75000,
        reset_time: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      axios.get.mockResolvedValue({ data: mockQuotaInfo });

      const result = await computerVisionService.getQuotaInfo(provider);

      expect(result.success).toBe(true);
      expect(result.data.daily_used).toBe(8500);
      expect(result.data.remaining_daily).toBe(1500);
    });

    it('应该在配额不足时预警', async () => {
      const provider = 'baidu';

      const mockQuotaInfo = {
        daily_used: 9800,
        daily_limit: 10000,
        remaining_daily: 200
      };

      axios.get.mockResolvedValue({ data: mockQuotaInfo });

      const result = await computerVisionService.getQuotaInfo(provider);

      expect(result.warning).toBe(true);
      expect(result.message).toContain('配额即将用尽');
    });
  });
});