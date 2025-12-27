#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
人脸识别核心处理模块
负责人脸检测、特征提取、活体检测和比对
"""

import os
import json
import logging
import asyncio
import numpy as np
import cv2
import tensorflow as tf
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import hashlib
import base64
import io
from PIL import Image
import dlib
from scipy.spatial.distance import cosine
import joblib

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class FaceDetectionResult:
    """人脸检测结果"""
    bbox: Tuple[int, int, int, int]  # (x, y, width, height)
    confidence: float
    landmarks: np.ndarray  # 人脸关键点
    quality_score: float  # 图像质量评分

@dataclass
class FaceFeatures:
    """人脸特征"""
    feature_vector: np.ndarray
    feature_hash: str
    quality_score: float
    extraction_method: str
    timestamp: datetime

@dataclass
class LivenessResult:
    """活体检测结果"""
    is_live: bool
    confidence: float
    detection_methods: List[str]
    details: Dict[str, Any]

@dataclass
class FaceMatchResult:
    """人脸比对结果"""
    is_match: bool
    similarity: float
    confidence: float
    face_id: Optional[str] = None
    user_id: Optional[str] = None

class FaceProcessor:
    """人脸处理器核心类"""

    def __init__(self, config: Dict[str, Any]):
        """初始化人脸处理器"""
        self.config = config
        self.face_detector = None
        self.face_encoder = None
        self.liveness_detector = None
        self.quality_assessor = None

        # 模型路径
        self.model_dir = config.get('model_dir', './models')
        self.detector_model_path = os.path.join(self.model_dir, 'face_detector.tflite')
        self.encoder_model_path = os.path.join(self.model_dir, 'face_encoder.tflite')
        self.liveness_model_path = os.path.join(self.model_dir, 'liveness_detector.tflite')

        # 配置参数
        self.input_size = config.get('input_size', (160, 160))
        self.detection_threshold = config.get('detection_threshold', 0.7)
        self.recognition_threshold = config.get('recognition_threshold', 0.8)
        self.liveness_threshold = config.get('liveness_threshold', 0.85)

        # 初始化模型
        self._initialize_models()

    def _initialize_models(self):
        """初始化深度学习模型"""
        try:
            # 初始化人脸检测器
            self._initialize_face_detector()

            # 初始化人脸编码器
            self._initialize_face_encoder()

            # 初始化活体检测器
            self._initialize_liveness_detector()

            # 初始化图像质量评估器
            self._initialize_quality_assessor()

            logger.info("人脸处理器初始化完成")

        except Exception as e:
            logger.error(f"人脸处理器初始化失败: {e}")
            raise

    def _initialize_face_detector(self):
        """初始化人脸检测器"""
        try:
            # 使用OpenCV的DNN人脸检测器
            self.face_detector = cv2.dnn.readNetFromCaffe(
                os.path.join(self.model_dir, 'deploy.prototxt'),
                os.path.join(self.model_dir, 'res10_300x300_ssd_iter_140000.caffemodel')
            )
            logger.info("人脸检测器加载成功")
        except Exception as e:
            logger.error(f"人脸检测器加载失败: {e}")
            # 备用：使用OpenCV的Haar级联检测器
            self.face_detector = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )

    def _initialize_face_encoder(self):
        """初始化人脸编码器"""
        try:
            # 加载TensorFlow Lite模型
            if os.path.exists(self.encoder_model_path):
                interpreter = tf.lite.Interpreter(model_path=self.encoder_model_path)
                interpreter.allocate_tensors()
                self.face_encoder = interpreter
                logger.info("人脸编码器(TensorFlow Lite)加载成功")
            else:
                # 备用：使用dlib的人脸编码器
                self.face_encoder = dlib.face_recognition_model_v1(
                    os.path.join(self.model_dir, 'dlib_face_recognition_resnet_model_v1.dat')
                )
                logger.info("人脸编码器(dlib)加载成功")
        except Exception as e:
            logger.error(f"人脸编码器加载失败: {e}")
            # 创建一个简单的编码器作为备用
            self.face_encoder = self._create_simple_encoder()

    def _initialize_liveness_detector(self):
        """初始化活体检测器"""
        try:
            # 加载活体检测模型
            if os.path.exists(self.liveness_model_path):
                interpreter = tf.lite.Interpreter(model_path=self.liveness_model_path)
                interpreter.allocate_tensors()
                self.liveness_detector = interpreter
                logger.info("活体检测器(TensorFlow Lite)加载成功")
            else:
                # 创建基于规则的活体检测器
                self.liveness_detector = self._create_rule_based_liveness_detector()
                logger.info("活体检测器(基于规则)加载成功")
        except Exception as e:
            logger.error(f"活体检测器加载失败: {e}")
            self.liveness_detector = self._create_rule_based_liveness_detector()

    def _initialize_quality_assessor(self):
        """初始化图像质量评估器"""
        self.quality_assessor = ImageQualityAssessor()

    def _create_simple_encoder(self):
        """创建简单的人脸编码器（备用）"""
        class SimpleEncoder:
            def extract_features(self, face_image):
                # 简单的特征提取（基于图像统计特征）
                resized = cv2.resize(face_image, (64, 64))
                gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

                # 计算LBP特征
                lbp = self._calculate_lbp(gray)

                # 计算HOG特征
                hog = self._calculate_hog(gray)

                # 组合特征
                features = np.concatenate([lbp.flatten(), hog.flatten()])
                return features.astype(np.float32)

            def _calculate_lbp(self, image, radius=1, neighbors=8):
                # 简化的LBP计算
                h, w = image.shape
                lbp = np.zeros((h, w), dtype=np.uint8)

                for i in range(radius, h - radius):
                    for j in range(radius, w - radius):
                        center = image[i, j]
                        code = 0

                        for n in range(neighbors):
                            angle = 2 * np.pi * n / neighbors
                            x = i + radius * np.cos(angle)
                            y = j + radius * np.sin(angle)

                            x1, y1 = int(x), int(y)
                            x2, y2 = min(x1 + 1, h - 1), min(y1 + 1, w - 1)

                            # 双线性插值
                            val = (image[x1, y1] * (1 - (x - x1)) * (1 - (y - y1)) +
                                   image[x2, y1] * (x - x1) * (1 - (y - y1)) +
                                   image[x1, y2] * (1 - (x - x1)) * (y - y1) +
                                   image[x2, y2] * (x - x1) * (y - y1))

                            if val >= center:
                                code |= (1 << n)

                        lbp[i, j] = code

                return lbp

            def _calculate_hog(self, image):
                # 简化的HOG特征计算
                gx = cv2.Sobel(image, cv2.CV_32F, 1, 0)
                gy = cv2.Sobel(image, cv2.CV_32F, 0, 1)

                magnitude = np.sqrt(gx**2 + gy**2)
                angle = np.arctan2(gy, gx) * 180 / np.pi

                # 将角度量化到9个bin
                hist, _ = np.histogram(angle, bins=9, range=(-180, 180), weights=magnitude)
                return hist

        return SimpleEncoder()

    def _create_rule_based_liveness_detector(self):
        """创建基于规则的活体检测器（备用）"""
        class RuleBasedLivenessDetector:
            def detect(self, frames):
                # 基于多帧分析的简单活体检测
                if len(frames) < 3:
                    return LivenessResult(False, 0.0, [], {})

                # 计算帧间差异
                differences = []
                for i in range(1, len(frames)):
                    diff = cv2.absdiff(frames[i], frames[i-1])
                    diff_mean = np.mean(diff)
                    differences.append(diff_mean)

                avg_diff = np.mean(differences)

                # 简单的启发式规则
                is_live = avg_diff > 10  # 有一定的运动
                confidence = min(avg_diff / 50, 1.0)

                return LivenessResult(
                    is_live=is_live,
                    confidence=confidence,
                    detection_methods=['motion_analysis'],
                    details={'avg_frame_difference': avg_diff}
                )

        return RuleBasedLivenessDetector()

    def detect_faces(self, image: np.ndarray) -> List[FaceDetectionResult]:
        """检测图像中的人脸"""
        try:
            if isinstance(self.face_detector, cv2.CascadeClassifier):
                return self._detect_faces_haar(image)
            else:
                return self._detect_faces_dnn(image)
        except Exception as e:
            logger.error(f"人脸检测失败: {e}")
            return []

    def _detect_faces_haar(self, image: np.ndarray) -> List[FaceDetectionResult]:
        """使用Haar级联检测器检测人脸"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = self.face_detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )

        results = []
        for (x, y, w, h) in faces:
            # 计算置信度（简化）
            confidence = 1.0 - (min(w, h) / max(image.shape[:2])) * 0.5

            # 提取关键点（简化）
            landmarks = np.array([
                [x + w//2, y + h//3],      # 鼻子
                [x + w//3, y + h//2],      # 左眼
                [x + 2*w//3, y + h//2],    # 右眼
                [x + w//2, y + 2*h//3],    # 嘴巴
            ])

            # 计算质量分数
            face_img = image[y:y+h, x:x+w]
            quality_score = self._assess_face_quality(face_img)

            results.append(FaceDetectionResult(
                bbox=(x, y, w, h),
                confidence=confidence,
                landmarks=landmarks,
                quality_score=quality_score
            ))

        return results

    def _detect_faces_dnn(self, image: np.ndarray) -> List[FaceDetectionResult]:
        """使用DNN检测器检测人脸"""
        h, w = image.shape[:2]
        blob = cv2.dnn.blobFromImage(
            image, 1.0, (300, 300), [104, 117, 123], False, False
        )

        self.face_detector.setInput(blob)
        detections = self.face_detector.forward()

        results = []
        for i in range(detections.shape[2]):
            confidence = detections[0, 0, i, 2]

            if confidence > self.detection_threshold:
                x1 = int(detections[0, 0, i, 3] * w)
                y1 = int(detections[0, 0, i, 4] * h)
                x2 = int(detections[0, 0, i, 5] * w)
                y2 = int(detections[0, 0, i, 6] * h)

                bbox = (x1, y1, x2 - x1, y2 - y1)

                # 提取关键点（简化）
                landmarks = np.array([
                    [x1 + (x2-x1)//2, y1 + (y2-y1)//3],     # 鼻子
                    [x1 + (x2-x1)//3, y1 + (y2-y1)//2],     # 左眼
                    [x1 + 2*(x2-x1)//3, y1 + (y2-y1)//2],   # 右眼
                    [x1 + (x2-x1)//2, y1 + 2*(y2-y1)//3],   # 嘴巴
                ])

                # 计算质量分数
                face_img = image[y1:y2, x1:x2]
                quality_score = self._assess_face_quality(face_img)

                results.append(FaceDetectionResult(
                    bbox=bbox,
                    confidence=float(confidence),
                    landmarks=landmarks,
                    quality_score=quality_score
                ))

        return results

    def extract_features(self, face_image: np.ndarray) -> FaceFeatures:
        """提取人脸特征"""
        try:
            # 预处理图像
            processed_image = self._preprocess_face_image(face_image)

            # 提取特征
            if hasattr(self.face_encoder, 'extract_features'):
                feature_vector = self.face_encoder.extract_features(processed_image)
            elif hasattr(self.face_encoder, 'compute_face_descriptor'):
                # dlib方法
                rgb_image = cv2.cvtColor(processed_image, cv2.COLOR_BGR2RGB)
                shape = self._get_face_landmarks(rgb_image)
                feature_vector = np.array(self.face_encoder.compute_face_descriptor(rgb_image, shape))
            else:
                # TensorFlow Lite方法
                feature_vector = self._extract_features_tflite(processed_image)

            # 生成特征哈希
            feature_hash = hashlib.sha256(feature_vector.tobytes()).hexdigest()

            # 计算质量分数
            quality_score = self._assess_feature_quality(feature_vector)

            return FaceFeatures(
                feature_vector=feature_vector,
                feature_hash=feature_hash,
                quality_score=quality_score,
                extraction_method="deep_learning",
                timestamp=datetime.now()
            )

        except Exception as e:
            logger.error(f"特征提取失败: {e}")
            raise

    def _preprocess_face_image(self, face_image: np.ndarray) -> np.ndarray:
        """预处理人脸图像"""
        # 调整大小
        processed = cv2.resize(face_image, self.input_size)

        # 归一化
        processed = processed.astype(np.float32) / 255.0

        return processed

    def _get_face_landmarks(self, image: np.ndarray):
        """获取人脸关键点（简化版）"""
        h, w = image.shape[:2]
        # 返回简化的关键点
        return dlib.rectangle(0, 0, w, h)

    def _extract_features_tflite(self, image: np.ndarray) -> np.ndarray:
        """使用TensorFlow Lite提取特征"""
        # 获取输入输出索引
        input_details = self.face_encoder.get_input_details()
        output_details = self.face_encoder.get_output_details()

        # 设置输入
        self.face_encoder.set_tensor(input_details[0]['index'], [image])

        # 运行推理
        self.face_encoder.invoke()

        # 获取输出
        features = self.face_encoder.get_tensor(output_details[0]['index'])
        return features.flatten()

    def _assess_face_quality(self, face_image: np.ndarray) -> float:
        """评估人脸图像质量"""
        return self.quality_assessor.assess_quality(face_image)

    def _assess_feature_quality(self, feature_vector: np.ndarray) -> float:
        """评估特征质量"""
        # 基于特征向量的统计特性评估质量
        feature_norm = np.linalg.norm(feature_vector)
        feature_std = np.std(feature_vector)

        # 质量评分（简化）
        quality = min(feature_norm / 10, 1.0) * 0.5 + min(feature_std, 1.0) * 0.5
        return float(quality)

    def detect_liveness(self, frames: List[np.ndarray],
                       actions: List[str] = None) -> LivenessResult:
        """活体检测"""
        try:
            if hasattr(self.liveness_detector, 'detect'):
                return self.liveness_detector.detect(frames)
            else:
                return self._detect_liveness_tflite(frames, actions)
        except Exception as e:
            logger.error(f"活体检测失败: {e}")
            return LivenessResult(False, 0.0, [], {})

    def _detect_liveness_tflite(self, frames: List[np.ndarray],
                                actions: List[str] = None) -> LivenessResult:
        """使用TensorFlow Lite进行活体检测"""
        if not frames:
            return LivenessResult(False, 0.0, [], {})

        results = []
        for frame in frames:
            # 预处理
            processed = cv2.resize(frame, (64, 64))
            processed = processed.astype(np.float32) / 255.0

            # TensorFlow Lite推理
            input_details = self.liveness_detector.get_input_details()
            output_details = self.liveness_detector.get_output_details()

            self.liveness_detector.set_tensor(input_details[0]['index'], [processed])
            self.liveness_detector.invoke()

            output = self.liveness_detector.get_tensor(output_details[0]['index'])
            results.append(output[0])  # 假设输出为[prob_fake, prob_real]

        # 综合判断
        avg_confidence = np.mean([r[1] for r in results])  # 真实概率
        is_live = avg_confidence > self.liveness_threshold

        return LivenessResult(
            is_live=is_live,
            confidence=float(avg_confidence),
            detection_methods=['neural_network'],
            details={'frame_confidences': [float(r[1]) for r in results]}
        )

    def compare_faces(self, features1: FaceFeatures, features2: FaceFeatures,
                     threshold: float = None) -> FaceMatchResult:
        """比较两个人脸特征"""
        if threshold is None:
            threshold = self.recognition_threshold

        try:
            # 计算余弦相似度
            similarity = 1 - cosine(features1.feature_vector, features2.feature_vector)

            # 判断是否匹配
            is_match = similarity >= threshold

            # 计算置信度
            confidence = max(0, min(1, (similarity - threshold) / (1 - threshold) + 0.5))

            return FaceMatchResult(
                is_match=is_match,
                similarity=float(similarity),
                confidence=float(confidence)
            )

        except Exception as e:
            logger.error(f"人脸比对失败: {e}")
            return FaceMatchResult(False, 0.0, 0.0)

    def find_best_match(self, query_features: FaceFeatures,
                       database_features: List[Dict]) -> FaceMatchResult:
        """在数据库中查找最佳匹配"""
        if not database_features:
            return FaceMatchResult(False, 0.0, 0.0)

        best_match = None
        best_similarity = 0.0

        for record in database_features:
            stored_features = np.array(record['feature_vector'])
            stored_features_obj = FaceFeatures(
                feature_vector=stored_features,
                feature_hash=record['feature_hash'],
                quality_score=record['quality_score'],
                extraction_method=record['extraction_method'],
                timestamp=datetime.fromisoformat(record['timestamp'])
            )

            result = self.compare_faces(query_features, stored_features_obj)

            if result.similarity > best_similarity:
                best_similarity = result.similarity
                best_match = FaceMatchResult(
                    is_match=result.is_match,
                    similarity=result.similarity,
                    confidence=result.confidence,
                    face_id=record.get('face_id'),
                    user_id=record.get('user_id')
                )

        return best_match or FaceMatchResult(False, 0.0, 0.0)

class ImageQualityAssessor:
    """图像质量评估器"""

    def assess_quality(self, image: np.ndarray) -> float:
        """评估图像质量"""
        try:
            # 计算多个质量指标
            sharpness = self._calculate_sharpness(image)
            brightness = self._calculate_brightness(image)
            contrast = self._calculate_contrast(image)
            noise_level = self._calculate_noise_level(image)

            # 综合评分
            quality_score = (
                sharpness * 0.3 +
                brightness * 0.2 +
                contrast * 0.3 +
                (1 - noise_level) * 0.2
            )

            return float(quality_score)

        except Exception as e:
            logger.error(f"图像质量评估失败: {e}")
            return 0.5  # 默认中等质量

    def _calculate_sharpness(self, image: np.ndarray) -> float:
        """计算图像清晰度"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        sharpness = np.var(laplacian) / 1000  # 归一化
        return min(sharpness, 1.0)

    def _calculate_brightness(self, image: np.ndarray) -> float:
        """计算图像亮度"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        brightness = np.mean(gray) / 255.0
        # 理想亮度在0.3-0.7之间
        if 0.3 <= brightness <= 0.7:
            return 1.0
        else:
            return max(0, 1 - abs(brightness - 0.5) * 2)

    def _calculate_contrast(self, image: np.ndarray) -> float:
        """计算图像对比度"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        contrast = np.std(gray) / 128  # 归一化
        return min(contrast, 1.0)

    def _calculate_noise_level(self, image: np.ndarray) -> float:
        """计算噪声水平"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        # 使用高斯模糊估计噪声
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        noise = np.mean(cv2.absdiff(gray, blurred)) / 255.0
        return min(noise, 1.0)

# 工具函数
def base64_to_image(base64_string: str) -> np.ndarray:
    """将Base64字符串转换为OpenCV图像"""
    try:
        # 移除可能的前缀
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]

        # 解码
        image_data = base64.b64decode(base64_string)

        # 转换为图像
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        return image
    except Exception as e:
        logger.error(f"Base64转图像失败: {e}")
        raise

def image_to_base64(image: np.ndarray, format: str = 'JPEG') -> str:
    """将OpenCV图像转换为Base64字符串"""
    try:
        _, buffer = cv2.imencode(f'.{format.lower()}', image)
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/{format};base64,{image_base64}"
    except Exception as e:
        logger.error(f"图像转Base64失败: {e}")
        raise

def preprocess_image_from_bytes(image_bytes: bytes) -> np.ndarray:
    """从字节数据预处理图像"""
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return image

# 异步处理函数
async def async_detect_faces(processor: FaceProcessor, image: np.ndarray) -> List[FaceDetectionResult]:
    """异步人脸检测"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, processor.detect_faces, image)

async def async_extract_features(processor: FaceProcessor, face_image: np.ndarray) -> FaceFeatures:
    """异步特征提取"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, processor.extract_features, face_image)

async def async_detect_liveness(processor: FaceProcessor, frames: List[np.ndarray]) -> LivenessResult:
    """异步活体检测"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, processor.detect_liveness, frames)

if __name__ == "__main__":
    # 测试代码
    config = {
        'model_dir': './models',
        'detection_threshold': 0.7,
        'recognition_threshold': 0.8,
        'liveness_threshold': 0.85
    }

    processor = FaceProcessor(config)
    print("人脸处理器初始化完成")

    # 加载测试图像
    test_image = cv2.imread('test_face.jpg')
    if test_image is not None:
        # 检测人脸
        faces = processor.detect_faces(test_image)
        print(f"检测到 {len(faces)} 张人脸")

        # 提取特征
        if faces:
            x, y, w, h = faces[0].bbox
            face_img = test_image[y:y+h, x:x+w]
            features = processor.extract_features(face_img)
            print(f"特征提取完成，特征维度: {features.feature_vector.shape}")
    else:
        print("测试图像加载失败")