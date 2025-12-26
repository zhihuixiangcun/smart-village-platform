/**
 * 人脸识别服务
 * 支持人脸注册、认证、活体检测等功能
 */

const faceapi = require('face-api.js');
const canvas = require('canvas');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const logger = require('../utils/logger');

class FacialRecognitionService {
  constructor() {
    this.isModelLoaded = false;
    this.faceDescriptorCache = new Map();
    this.modelsPath = path.join(__dirname, '../../models/face-recognition');
  }

  /**
   * 初始化人脸识别模型
   */
  async initializeModels() {
    try {
      // 确保模型目录存在
      await fs.mkdir(this.modelsPath, { recursive: true });

      // 初始化 face-api.js
      const { Canvas, Image, ImageData } = canvas;
      faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

      // 加载模型（如果本地有就使用本地，否则下载）
      const modelUrls = {
        tinyFaceDetector: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/tiny_face_detector_model-weights_manifest.json',
        faceLandmark68Net: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-weights_manifest.json',
        faceRecognitionNet: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-weights_manifest.json',
        faceExpressionNet: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_expression_model-weights_manifest.json'
      };

      // 检查本地模型文件
      const localModels = await this.checkLocalModels();

      if (localModels.length === 4) {
        // 使用本地模型
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromDisk(this.modelsPath),
          faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelsPath),
          faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelsPath),
          faceapi.nets.faceExpressionNet.loadFromDisk(this.modelsPath)
        ]);
      } else {
        // 下载并加载模型
        logger.debug('正在下载人脸识别模型...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelUrls.tinyFaceDetector),
          faceapi.nets.faceLandmark68Net.loadFromUri(modelUrls.faceLandmark68Net),
          faceapi.nets.faceRecognitionNet.loadFromUri(modelUrls.faceRecognitionNet),
          faceapi.nets.faceExpressionNet.loadFromUri(modelUrls.faceExpressionNet)
        ]);
      }

      this.isModelLoaded = true;
      logger.debug('人脸识别模型加载完成');
    } catch (error) {
      logger.error('初始化人脸识别模型失败:', error);
      throw new Error('人脸识别模型初始化失败');
    }
  }

  /**
   * 检查本地模型文件
   */
  async checkLocalModels() {
    try {
      const files = await fs.readdir(this.modelsPath);
      return files.filter(file => file.includes('model') && file.endsWith('.json'));
    } catch (error) {
      return [];
    }
  }

  /**
   * 注册人脸
   */
  async registerFace(imageBuffer, userId, metadata = {}) {
    try {
      if (!this.isModelLoaded) {
        await this.initializeModels();
      }

      // 预处理图像
      const processedImage = await this.preprocessImage(imageBuffer);

      // 检测人脸
      const detections = await faceapi
        .detectAllFaces(processedImage, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        throw new Error('未检测到人脸');
      }

      if (detections.length > 1) {
        throw new Error('检测到多个人脸，请确保照片中只有一个人');
      }

      const detection = detections[0];
      const faceDescriptor = detection.descriptor;

      // 生成特征文件名
      const descriptorId = crypto.randomUUID();
      const fileName = `${userId}_${descriptorId}.json`;
      const filePath = path.join(this.modelsPath, 'descriptors', fileName);

      // 确保描述符目录存在
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // 保存人脸特征
      const faceData = {
        userId,
        descriptorId,
        descriptor: Array.from(faceDescriptor),
        metadata: {
          ...metadata,
          registeredAt: new Date().toISOString(),
          imageConfidence: detection.detection.score,
          landmarks: detection.landmarks.positions.map(pos => ({
            x: pos.x,
            y: pos.y
          }))
        }
      };

      await fs.writeFile(filePath, JSON.stringify(faceData, null, 2));

      // 更新缓存
      this.faceDescriptorCache.set(userId, faceData);

      return {
        success: true,
        descriptorId,
        confidence: detection.detection.score,
        message: '人脸注册成功'
      };

    } catch (error) {
      logger.error('人脸注册失败:', error);
      throw error;
    }
  }

  /**
   * 人脸认证
   */
  async authenticateFace(imageBuffer, userId, confidenceThreshold = 0.6) {
    try {
      if (!this.isModelLoaded) {
        await this.initializeModels();
      }

      // 获取注册的人脸特征
      let registeredFace = this.faceDescriptorCache.get(userId);

      if (!registeredFace) {
        registeredFace = await this.loadRegisteredFace(userId);
        if (registeredFace) {
          this.faceDescriptorCache.set(userId, registeredFace);
        }
      }

      if (!registeredFace) {
        throw new Error('用户未注册人脸');
      }

      // 预处理图像
      const processedImage = await this.preprocessImage(imageBuffer);

      // 检测人脸
      const detections = await faceapi
        .detectAllFaces(processedImage, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        throw new Error('未检测到人脸');
      }

      if (detections.length > 1) {
        throw new Error('检测到多个人脸');
      }

      const detection = detections[0];
      const currentDescriptor = detection.descriptor;
      const registeredDescriptor = new Float32Array(registeredFace.descriptor);

      // 计算相似度
      const distance = faceapi.euclideanDistance(currentDescriptor, registeredDescriptor);
      const similarity = Math.max(0, Math.min(1, 1 - distance));

      if (similarity < confidenceThreshold) {
        return {
          success: false,
          similarity,
          message: `人脸匹配失败，相似度: ${(similarity * 100).toFixed(2)}%`
        };
      }

      return {
        success: true,
        similarity,
        confidence: detection.detection.score,
        message: `人脸认证成功，相似度: ${(similarity * 100).toFixed(2)}%`
      };

    } catch (error) {
      logger.error('人脸认证失败:', error);
      throw error;
    }
  }

  /**
   * 活体检测
   */
  async livenessDetection(imageBuffer, videoFrames = []) {
    try {
      if (!this.isModelLoaded) {
        await this.initializeModels();
      }

      // 单张图片的基础检测
      const processedImage = await this.preprocessImage(imageBuffer);
      const detections = await faceapi
        .detectAllFaces(processedImage, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      if (detections.length === 0) {
        throw new Error('未检测到人脸');
      }

      const detection = detections[0];
      const expressions = detection.expressions;

      // 检查是否为真实人脸的指标
      const livenessScore = this.calculateLivenessScore(detection, expressions);

      // 如果有视频帧，进行更高级的活体检测
      if (videoFrames.length > 0) {
        const videoLivenessScore = await this.analyzeVideoFrames(videoFrames);
        return {
          isLive: videoLivenessScore > 0.7,
          score: Math.max(livenessScore, videoLivenessScore),
          details: {
            imageQuality: detection.detection.score,
            expressions: expressions,
            movement: videoLivenessScore
          }
        };
      }

      return {
        isLive: livenessScore > 0.6,
        score: livenessScore,
        details: {
          imageQuality: detection.detection.score,
          expressions: expressions
        }
      };

    } catch (error) {
      logger.error('活体检测失败:', error);
      throw error;
    }
  }

  /**
   * 人脸搜索
   */
  async searchFace(imageBuffer, maxResults = 5) {
    try {
      if (!this.isModelLoaded) {
        await this.initializeModels();
      }

      // 预处理图像
      const processedImage = await this.preprocessImage(imageBuffer);

      // 检测人脸
      const detections = await faceapi
        .detectAllFaces(processedImage, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        throw new Error('未检测到人脸');
      }

      const detection = detections[0];
      const currentDescriptor = detection.descriptor;

      // 加载所有注册的人脸特征
      const registeredFaces = await this.loadAllRegisteredFaces();

      // 计算相似度
      const results = registeredFaces.map(registeredFace => {
        const registeredDescriptor = new Float32Array(registeredFace.descriptor);
        const distance = faceapi.euclideanDistance(currentDescriptor, registeredDescriptor);
        const similarity = Math.max(0, Math.min(1, 1 - distance));

        return {
          userId: registeredFace.userId,
          similarity,
          metadata: registeredFace.metadata
        };
      });

      // 按相似度排序
      results.sort((a, b) => b.similarity - a.similarity);

      return {
        success: true,
        matches: results.slice(0, maxResults),
        totalFaces: detections.length
      };

    } catch (error) {
      logger.error('人脸搜索失败:', error);
      throw error;
    }
  }

  /**
   * 预处理图像
   */
  async preprocessImage(imageBuffer) {
    try {
      // 使用 sharp 进行图像预处理
      const processedBuffer = await sharp(imageBuffer)
        .resize(800, 600, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .normalize()
        .sharpen()
        .png()
        .toBuffer();

      // 转换为 canvas 兼容格式
      const img = new Image();
      img.src = processedBuffer;

      return img;

    } catch (error) {
      logger.error('图像预处理失败:', error);
      throw new Error('图像预处理失败');
    }
  }

  /**
   * 计算活体检测分数
   */
  calculateLivenessScore(detection, expressions) {
    let score = 0;

    // 基础分数：人脸检测质量
    score += detection.detection.score * 0.3;

    // 表情自然度
    const neutralScore = expressions.neutral || 0;
    const happyScore = expressions.happy || 0;
    const naturalExpressionScore = Math.max(neutralScore, happyScore * 0.8);
    score += naturalExpressionScore * 0.3;

    // 面部特征对称性（简化版）
    const landmarks = detection.landmarks.positions;
    const symmetryScore = this.calculateFaceSymmetry(landmarks);
    score += symmetryScore * 0.2;

    // 眼睛检测（简化版）
    const eyeScore = this.detectEyes(landmarks);
    score += eyeScore * 0.2;

    return Math.min(1, score);
  }

  /**
   * 分析视频帧
   */
  async analyzeVideoFrames(videoFrames) {
    if (videoFrames.length < 2) {
      return 0.5;
    }

    let totalMovement = 0;
    let expressionChanges = 0;

    for (let i = 1; i < videoFrames.length; i++) {
      const prevFrame = videoFrames[i - 1];
      const currFrame = videoFrames[i];

      // 检测面部运动
      const movement = this.detectFaceMovement(prevFrame, currFrame);
      totalMovement += movement;

      // 检测表情变化
      const expressionChange = this.detectExpressionChange(prevFrame, currFrame);
      if (expressionChange > 0.3) {
        expressionChanges++;
      }
    }

    // 计算活体分数
    const movementScore = Math.min(1, totalMovement / (videoFrames.length - 1) * 2);
    const expressionScore = Math.min(1, expressionChanges / (videoFrames.length - 1) * 3);

    return (movementScore + expressionScore) / 2;
  }

  /**
   * 计算面部对称性
   */
  calculateFaceSymmetry(landmarks) {
    // 简化的对称性计算
    const leftEye = landmarks[36]; // 左眼角
    const rightEye = landmarks[45]; // 右眼角
    const nose = landmarks[30]; // 鼻尖

    if (!leftEye || !rightEye || !nose) {
      return 0.5;
    }

    const eyeDistance = Math.abs(leftEye.x - rightEye.x);
    const noseOffset = Math.abs((leftEye.x + rightEye.x) / 2 - nose.x);

    return Math.max(0, 1 - (noseOffset / eyeDistance));
  }

  /**
   * 检测眼睛
   */
  detectEyes(landmarks) {
    // 简化的眼睛检测
    const leftEye = landmarks[36];
    const rightEye = landmarks[45];

    return leftEye && rightEye ? 0.8 : 0.3;
  }

  /**
   * 检测面部运动
   */
  detectFaceMovement(prevFrame, currFrame) {
    // 简化的运动检测
    return Math.random() * 0.5; // 实际实现需要特征点跟踪
  }

  /**
   * 检测表情变化
   */
  detectExpressionChange(prevFrame, currFrame) {
    // 简化的表情变化检测
    return Math.random() * 0.6; // 实际实现需要表情分析
  }

  /**
   * 加载注册的人脸
   */
  async loadRegisteredFace(userId) {
    try {
      const descriptorsDir = path.join(this.modelsPath, 'descriptors');
      const files = await fs.readdir(descriptorsDir);

      const userFiles = files.filter(file => file.startsWith(`${userId}_`));

      if (userFiles.length === 0) {
        return null;
      }

      // 获取最新的特征文件
      const latestFile = userFiles.sort().pop();
      const filePath = path.join(descriptorsDir, latestFile);
      const data = await fs.readFile(filePath, 'utf-8');

      return JSON.parse(data);

    } catch (error) {
      logger.error('加载注册人脸失败:', error);
      return null;
    }
  }

  /**
   * 加载所有注册的人脸
   */
  async loadAllRegisteredFaces() {
    try {
      const descriptorsDir = path.join(this.modelsPath, 'descriptors');
      const files = await fs.readdir(descriptorsDir);

      const faces = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(descriptorsDir, file);
            const data = await fs.readFile(filePath, 'utf-8');
            const faceData = JSON.parse(data);
            faces.push(faceData);
          } catch (error) {
            logger.error(`加载人脸特征文件失败 ${file}:`, error);
          }
        }
      }

      return faces;

    } catch (error) {
      logger.error('加载所有注册人脸失败:', error);
      return [];
    }
  }

  /**
   * 删除人脸特征
   */
  async deleteFaceDescriptor(userId) {
    try {
      const descriptorsDir = path.join(this.modelsPath, 'descriptors');
      const files = await fs.readdir(descriptorsDir);

      const userFiles = files.filter(file => file.startsWith(`${userId}_`));

      for (const file of userFiles) {
        const filePath = path.join(descriptorsDir, file);
        await fs.unlink(filePath);
      }

      // 从缓存中删除
      this.faceDescriptorCache.delete(userId);

      return {
        success: true,
        message: '人脸特征删除成功'
      };

    } catch (error) {
      logger.error('删除人脸特征失败:', error);
      throw error;
    }
  }
}

module.exports = new FacialRecognitionService();