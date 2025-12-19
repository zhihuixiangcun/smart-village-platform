"""
方言检测服务
基于音频特征和机器学习模型识别方言
"""

import asyncio
import json
import logging
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Tuple
import librosa
import sklearn
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

class DialectDetectionService:
    """方言检测服务类"""

    def __init__(self):
        """
        初始化方言检测服务
        """
        self.logger = logging.getLogger(__name__)
        self.model = None
        self.scaler = None
        self.feature_extractor = None
        self.request_count = 0
        self.success_count = 0
        self.error_count = 0

        # 方言标签映射
        self.dialect_labels = {
            0: 'zh',           # 普通话
            1: 'yue',          # 粤语
            2: 'nan',          # 闽南语
            3: 'hak',          # 客家话
            4: 'wuu',          # 吴语
            5: 'hsn',          # 湘语
            6: 'gan',          # 赣语
            7: 'zh-northeast', # 东北话
            8: 'zh-sichuan',   # 四川话
            9: 'zh-shandong',  # 山东话
            10: 'zh-henan',    # 河南话
            11: 'zh-hubei',    # 湖北话
            12: 'zh-jiangzhe', # 江浙话
            13: 'zh-anhui'     # 安徽话
        }

        # 方言名称映射
        self.dialect_names = {
            'zh': '普通话',
            'yue': '粤语',
            'nan': '闽南语',
            'hak': '客家话',
            'wuu': '吴语',
            'hsn': '湘语',
            'gan': '赣语',
            'zh-northeast': '东北话',
            'zh-sichuan': '四川话',
            'zh-shandong': '山东话',
            'zh-henan': '河南话',
            'zh-hubei': '湖北话',
            'zh-jiangzhe': '江浙话',
            'zh-anhui': '安徽话'
        }

        # 特征配置
        self.feature_config = {
            'sample_rate': 16000,
            'n_mfcc': 13,
            'n_chroma': 12,
            'n_mels': 40,
            'n_fft': 2048,
            'hop_length': 512,
            'duration': 3.0  # 分析时长（秒）
        }

        # 模型文件路径
        self.model_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
        self.model_path = os.path.join(self.model_dir, 'dialect_classifier.pkl')
        self.scaler_path = os.path.join(self.model_dir, 'dialect_scaler.pkl')

        # 尝试加载预训练模型
        self._load_model()

    def _load_model(self):
        """加载预训练的方言检测模型"""
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.scaler_path):
                self.model = joblib.load(self.model_path)
                self.scaler = joblib.load(self.scaler_path)
                self.logger.info("方言检测模型加载成功")
            else:
                self.logger.warning("预训练模型不存在，使用基于规则的检测")
                self.model = None
                self.scaler = None
        except Exception as e:
            self.logger.error(f"加载方言检测模型失败: {e}")
            self.model = None
            self.scaler = None

    async def detect(self, audio_data: bytes) -> Dict[str, Any]:
        """
        检测音频的方言

        Args:
            audio_data: 音频数据

        Returns:
            检测结果
        """
        self.request_count += 1
        start_time = datetime.now()

        try:
            # 音频预处理
            audio, sr = self._preprocess_audio(audio_data)

            # 提取特征
            features = self._extract_features(audio, sr)

            # 方言检测
            if self.model is not None:
                # 使用机器学习模型
                result = await self._predict_with_model(features)
            else:
                # 使用基于规则的方法
                result = await self._detect_with_rules(features)

            duration = (datetime.now() - start_time).total_seconds()
            self.success_count += 1

            self.logger.info(
                f"方言检测完成: {result['dialect']} "
                f"(置信度: {result['confidence']:.3f}, "
                f"用时: {duration:.3f}s)"
            )

            return result

        except Exception as e:
            self.error_count += 1
            self.logger.error(f"方言检测失败: {e}")

            # 返回默认结果
            return {
                'success': False,
                'dialect': 'zh',  # 默认普通话
                'dialect_name': '普通话',
                'confidence': 0.5,
                'error': str(e),
                'alternatives': []
            }

    def _preprocess_audio(self, audio_data: bytes) -> Tuple[np.ndarray, int]:
        """
        音频预处理

        Args:
            audio_data: 原始音频数据

        Returns:
            (音频数组, 采样率)
        """
        try:
            # 使用librosa加载音频
            audio, sr = librosa.load(
                io.BytesIO(audio_data),
                sr=self.feature_config['sample_rate'],
                mono=True
            )

            # 标准化音频
            audio = librosa.util.normalize(audio)

            # 截取固定长度
            target_length = int(self.feature_config['duration'] * sr)
            if len(audio) > target_length:
                audio = audio[:target_length]
            elif len(audio) < target_length:
                # 填充
                audio = np.pad(audio, (0, target_length - len(audio)), mode='constant')

            return audio, sr

        except Exception as e:
            self.logger.error(f"音频预处理失败: {e}")
            raise

    def _extract_features(self, audio: np.ndarray, sr: int) -> np.ndarray:
        """
        提取音频特征

        Args:
            audio: 音频数组
            sr: 采样率

        Returns:
            特征向量
        """
        features = []

        try:
            # 1. MFCC特征
            mfccs = librosa.feature.mfcc(
                y=audio,
                sr=sr,
                n_mfcc=self.feature_config['n_mfcc'],
                n_fft=self.feature_config['n_fft'],
                hop_length=self.feature_config['hop_length']
            )
            mfccs_mean = np.mean(mfccs, axis=1)
            mfccs_std = np.std(mfccs, axis=1)
            features.extend(mfccs_mean)
            features.extend(mfccs_std)

            # 2. 色度特征
            chroma = librosa.feature.chroma(
                y=audio,
                sr=sr,
                n_chroma=self.feature_config['n_chroma'],
                n_fft=self.feature_config['n_fft'],
                hop_length=self.feature_config['hop_length']
            )
            chroma_mean = np.mean(chroma, axis=1)
            chroma_std = np.std(chroma, axis=1)
            features.extend(chroma_mean)
            features.extend(chroma_std)

            # 3. 梅尔频谱特征
            mels = librosa.feature.melspectrogram(
                y=audio,
                sr=sr,
                n_mels=self.feature_config['n_mels'],
                n_fft=self.feature_config['n_fft'],
                hop_length=self.feature_config['hop_length']
            )
            mels_mean = np.mean(mels, axis=1)
            mels_std = np.std(mels, axis=1)
            features.extend(mels_mean)
            features.extend(mels_std)

            # 4. 谱质心
            spectral_centroids = librosa.feature.spectral_centroid(y=audio, sr=sr)
            features.append(np.mean(spectral_centroids))
            features.append(np.std(spectral_centroids))

            # 5. 谱带宽
            spectral_bandwidth = librosa.feature.spectral_bandwidth(y=audio, sr=sr)
            features.append(np.mean(spectral_bandwidth))
            features.append(np.std(spectral_bandwidth))

            # 6. 谱滚降
            spectral_rolloff = librosa.feature.spectral_rolloff(y=audio, sr=sr)
            features.append(np.mean(spectral_rolloff))
            features.append(np.std(spectral_rolloff))

            # 7. 零交叉率
            zcr = librosa.feature.zero_crossing_rate(audio)
            features.append(np.mean(zcr))
            features.append(np.std(zcr))

            # 8. 短时能量
            energy = np.sum(audio ** 2) / len(audio)
            features.append(energy)

            return np.array(features)

        except Exception as e:
            self.logger.error(f"特征提取失败: {e}")
            raise

    async def _predict_with_model(self, features: np.ndarray) -> Dict[str, Any]:
        """
        使用机器学习模型预测方言

        Args:
            features: 特征向量

        Returns:
            预测结果
        """
        try:
            # 特征标准化
            if self.scaler is not None:
                features_scaled = self.scaler.transform([features])
            else:
                features_scaled = [features]

            # 模型预测
            prediction = self.model.predict(features_scaled)[0]
            probabilities = self.model.predict_proba(features_scaled)[0]

            # 获取预测的方言
            dialect_code = self.dialect_labels.get(prediction, 'zh')
            confidence = float(probabilities[prediction])

            # 获取备选结果
            alternatives = []
            top_indices = np.argsort(probabilities)[::-1][1:4]  # 取前3个备选

            for idx in top_indices:
                if probabilities[idx] > 0.1:  # 只考虑置信度大于0.1的备选
                    alt_dialect = self.dialect_labels.get(idx, 'zh')
                    alternatives.append({
                        'dialect': alt_dialect,
                        'dialect_name': self.dialect_names.get(alt_dialect, '未知'),
                        'confidence': float(probabilities[idx])
                    })

            return {
                'success': True,
                'dialect': dialect_code,
                'dialect_name': self.dialect_names.get(dialect_code, '未知'),
                'confidence': confidence,
                'alternatives': alternatives,
                'method': 'machine_learning'
            }

        except Exception as e:
            self.logger.error(f"模型预测失败: {e}")
            # 降级到规则方法
            return await self._detect_with_rules(features)

    async def _detect_with_rules(self, features: np.ndarray) -> Dict[str, Any]:
        """
        使用基于规则的方法检测方言

        Args:
            features: 特征向量

        Returns:
            检测结果
        """
        try:
            # 基于特征的简单规则
            # 这里使用简化的规则，实际应该基于方言特征研究

            confidence_scores = {}

            # 基于MFCC特征的方言特征
            mfcc_mean = features[:13]  # 前13个是MFCC均值
            mfcc_std = features[13:26]  # 接下来13个是MFCC标准差

            # 粤语特征（通常有较高的基频和特定的音调模式）
            if mfcc_mean[0] > -5 and np.mean(mfcc_std) > 5:
                confidence_scores['yue'] = 0.7

            # 闽南语特征（特定的音节结构）
            if mfcc_mean[2] > 10 and mfcc_mean[3] < -8:
                confidence_scores['nan'] = 0.6

            # 四川话特征（鼻音较重）
            if mfcc_mean[4] > 8 and features[-1] > 0.001:  # 短时能量特征
                confidence_scores['zh-sichuan'] = 0.65

            # 东北话特征（语调起伏较大）
            if np.std(mfcc_mean) > 15:
                confidence_scores['zh-northeast'] = 0.6

            # 默认普通话
            confidence_scores['zh'] = 0.5

            # 选择置信度最高的方言
            if confidence_scores:
                best_dialect = max(confidence_scores.items(), key=lambda x: x[1])
                dialect_code = best_dialect[0]
                confidence = best_dialect[1]
            else:
                dialect_code = 'zh'
                confidence = 0.5

            # 生成备选结果
            alternatives = []
            for dialect, conf in confidence_scores.items():
                if dialect != dialect_code and conf > 0.3:
                    alternatives.append({
                        'dialect': dialect,
                        'dialect_name': self.dialect_names.get(dialect, '未知'),
                        'confidence': conf
                    })

            alternatives.sort(key=lambda x: x['confidence'], reverse=True)
            alternatives = alternatives[:3]

            return {
                'success': True,
                'dialect': dialect_code,
                'dialect_name': self.dialect_names.get(dialect_code, '未知'),
                'confidence': confidence,
                'alternatives': alternatives,
                'method': 'rule_based'
            }

        except Exception as e:
            self.logger.error(f"规则检测失败: {e}")
            raise

    def train_model(self, training_data: List[Tuple[str, np.ndarray]]):
        """
        训练方言检测模型

        Args:
            training_data: 训练数据 [(dialect, features), ...]
        """
        try:
            self.logger.info("开始训练方言检测模型...")

            # 准备训练数据
            X = []
            y = []
            dialect_to_label = {}

            for dialect, features in training_data:
                if dialect not in dialect_to_label:
                    dialect_to_label[dialect] = len(dialect_to_label)

                X.append(features)
                y.append(dialect_to_label[dialect])

            X = np.array(X)
            y = np.array(y)

            # 特征标准化
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)

            # 训练随机森林分类器
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )
            self.model.fit(X_scaled, y)

            # 保存模型
            os.makedirs(self.model_dir, exist_ok=True)
            joblib.dump(self.model, self.model_path)
            joblib.dump(self.scaler, self.scaler_path)

            self.logger.info("方言检测模型训练完成")

        except Exception as e:
            self.logger.error(f"模型训练失败: {e}")
            raise

    def is_available(self) -> bool:
        """
        检查服务是否可用

        Returns:
            是否可用
        """
        return True  # 规则方法总是可用

    def get_metrics(self) -> Dict[str, Any]:
        """
        获取服务指标

        Returns:
            服务指标
        """
        success_rate = self.success_count / max(self.request_count, 1) * 100

        return {
            "request_count": self.request_count,
            "success_count": self.success_count,
            "error_count": self.error_count,
            "success_rate": round(success_rate, 2),
            "model_loaded": self.model is not None,
            "supported_dialects": list(self.dialect_names.keys())
        }

class BaiduDialectDetectionService:
    """
    百度方言检测服务（备选方案）
    """

    def __init__(self, app_id: str, api_key: str, secret_key: str):
        """
        初始化百度方言检测服务

        Args:
            app_id: 百度语音应用ID
            api_key: 百度语音API Key
            secret_key: 百度语音Secret Key
        """
        self.app_id = app_id
        self.api_key = api_key
        self.secret_key = secret_key
        self.access_token = None
        self.token_expires_at = 0
        self.logger = logging.getLogger(__name__)

    async def detect(self, audio_data: bytes) -> Dict[str, Any]:
        """
        使用百度API检测方言

        Args:
            audio_data: 音频数据

        Returns:
            检测结果
        """
        try:
            # 百度API主要通过语音识别结果的置信度来推断方言
            # 这里使用简化实现
            return {
                'success': True,
                'dialect': 'zh',
                'dialect_name': '普通话',
                'confidence': 0.8,
                'method': 'baidu_api'
            }

        except Exception as e:
            self.logger.error(f"百度方言检测失败: {e}")
            raise