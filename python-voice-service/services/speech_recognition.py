"""
语音识别服务
支持百度语音识别API和多种方言
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import requests
import aiohttp
import base64
import hashlib
import time

class SpeechRecognitionService:
    """语音识别服务类"""

    def __init__(self, app_id: str, api_key: str, secret_key: str):
        """
        初始化语音识别服务

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
        self.request_count = 0
        self.success_count = 0
        self.error_count = 0

        # API配置
        self.api_url = "https://vop.baidu.com/server_api"
        self.token_url = "https://aip.baidubce.com/oauth/2.0/token"

        # 支持的方言映射
        self.dialect_mapping = {
            'zh': 1537,      # 普通话
            'yue': 1637,     # 粤语
            'nan': 1836,     # 闽南语
            'hak': 1837,     # 客家话
            'wuu': 1737,     # 吴语
            'hsn': 1838,     # 湘语
            'gan': 1839,     # 赣语
            'zh-northeast': 1636,  # 东北话
            'zh-sichuan': 1835,     # 四川话
            'zh-chongqing': 1635,   # 重庆话
            'zh-shaanxi': 1634,     # 陕西话
            'zh-shandong': 1633,    # 山东话
            'zh-henan': 1632,       # 河南话
            'zh-hubei': 1631,       # 湖北话
            'zh-jiangzhe': 1630,    # 江浙话
            'zh-anhui': 1629,       # 安徽话
            'zh-hebei': 1628,       # 河北话
            'zh-shanxi': 1627,      # 山西话
            'zh-neimeng': 1626,     # 内蒙古话
            'zh-gansu': 1625,       # 甘肃话
            'zh-ningxia': 1624,     # 宁夏话
            'zh-xinjiang': 1623,    # 新疆话
            'zh-xizang': 1622,      # 西藏话
            'zh-qinghai': 1621      # 青海话
        }

    async def get_access_token(self) -> str:
        """
        获取百度API访问令牌

        Returns:
            访问令牌
        """
        # 检查令牌是否过期
        current_time = time.time()
        if self.access_token and current_time < self.token_expires_at:
            return self.access_token

        try:
            params = {
                "grant_type": "client_credentials",
                "client_id": self.api_key,
                "client_secret": self.secret_key
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(self.token_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.access_token = data.get("access_token")
                        expires_in = data.get("expires_in", 2592000)  # 默认30天
                        self.token_expires_at = current_time + expires_in - 3600  # 提前1小时刷新

                        self.logger.info("成功获取百度API访问令牌")
                        return self.access_token
                    else:
                        raise Exception(f"获取访问令牌失败: {response.status}")

        except Exception as e:
            self.logger.error(f"获取访问令牌失败: {e}")
            raise

    async def recognize(self, audio_data: bytes, language: str = 'zh-CN',
                       dialect: str = 'zh', sample_rate: int = 16000) -> Dict[str, Any]:
        """
        语音识别

        Args:
            audio_data: 音频数据
            language: 语言代码
            dialect: 方言代码
            sample_rate: 采样率

        Returns:
            识别结果
        """
        self.request_count += 1
        start_time = time.time()

        try:
            # 获取访问令牌
            access_token = await self.get_access_token()

            # 音频编码
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            audio_length = len(audio_data)

            # 获取方言代码
            dialect_code = self.dialect_mapping.get(dialect, 1537)  # 默认普通话

            # 构建请求数据
            request_data = {
                "format": "wav",
                "rate": sample_rate,
                "channel": 1,
                "cuid": self._generate_cuid(),
                "token": access_token,
                "speech": audio_base64,
                "len": audio_length,
                "dev_pid": dialect_code
            }

            # 发送请求
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    json=request_data,
                    headers={"Content-Type": "application/json"}
                ) as response:

                    result = await response.json()

                    if response.status == 200:
                        recognition_result = self._parse_result(result, dialect)

                        duration = time.time() - start_time
                        self.success_count += 1

                        self.logger.info(
                            f"语音识别成功: {recognition_result.get('text', '')[:50]}... "
                            f"用时: {duration:.2f}s, 置信度: {recognition_result.get('confidence', 0):.2f}"
                        )

                        return recognition_result
                    else:
                        error_msg = result.get('error_msg', '未知错误')
                        raise Exception(f"百度API错误: {error_msg}")

        except Exception as e:
            self.error_count += 1
            self.logger.error(f"语音识别失败: {e}")

            # 返回错误结果
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "confidence": 0,
                "language": language,
                "dialect": dialect
            }

    def _parse_result(self, result: Dict, dialect: str) -> Dict[str, Any]:
        """
        解析百度API返回结果

        Args:
            result: API返回结果
            dialect: 方言代码

        Returns:
            解析后的结果
        """
        if result.get('err_no') != 0:
            error_msg = result.get('err_msg', '未知错误')
            raise Exception(f"百度识别错误: {error_msg}")

        # 获取识别结果
        result_data = result.get('result', [])
        if not result_data:
            return {
                "success": True,
                "text": "",
                "confidence": 0,
                "language": "zh-CN",
                "dialect": dialect,
                "alternatives": []
            }

        # 主要结果
        text = result_data[0].strip()

        # 备选结果
        alternatives = []
        for i, alt_text in enumerate(result_data[1:5], 1):  # 取前4个备选
            alternatives.append({
                "text": alt_text.strip(),
                "confidence": max(0, 1.0 - i * 0.1)  # 递减的置信度
            })

        # 估算置信度
        confidence = self._estimate_confidence(result)

        return {
            "success": True,
            "text": text,
            "confidence": confidence,
            "language": "zh-CN",
            "dialect": dialect,
            "alternatives": alternatives,
            "word_confidence": [],  # 逐字置信度（百度API不直接提供）
            "timestamps": []  # 时间戳（百度API不直接提供）
        }

    def _estimate_confidence(self, result: Dict) -> float:
        """
        估算识别置信度

        Args:
            result: API返回结果

        Returns:
            置信度
        """
        # 基于多个因素估算置信度
        confidence = 0.5  # 基础置信度

        # 如果有多个结果且第一个结果置信度较高
        if len(result.get('result', [])) > 0:
            confidence += 0.2

        # 检查是否有错误
        if result.get('err_no') == 0:
            confidence += 0.2

        # 基于结果长度调整置信度
        if result.get('result'):
            text_length = len(result['result'][0])
            if 5 <= text_length <= 100:  # 合理的文本长度
                confidence += 0.1

        return min(confidence, 1.0)

    def _generate_cuid(self) -> str:
        """
        生成唯一设备ID

        Returns:
            设备ID
        """
        import uuid
        return str(uuid.uuid4())[:16]

    def is_available(self) -> bool:
        """
        检查服务是否可用

        Returns:
            是否可用
        """
        return bool(self.app_id and self.api_key and self.secret_key)

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
            "token_expires_at": self.token_expires_at,
            "has_valid_token": bool(self.access_token and time.time() < self.token_expires_at)
        }

class WhisperSpeechRecognitionService:
    """
    Whisper语音识别服务（备选方案）
    """

    def __init__(self, model_size: str = "base"):
        """
        初始化Whisper服务

        Args:
            model_size: 模型大小 (tiny, base, small, medium, large)
        """
        self.model_size = model_size
        self.model = None
        self.logger = logging.getLogger(__name__)

        # 尝试导入whisper
        try:
            import whisper
            self.whisper = whisper
            self.logger.info("Whisper库加载成功")
        except ImportError:
            self.logger.warning("Whisper库未安装，将尝试自动安装")
            self.whisper = None

    def load_model(self):
        """加载Whisper模型"""
        if self.model is None and self.whisper:
            try:
                self.model = self.whisper.load_model(self.model_size)
                self.logger.info(f"Whisper模型加载成功: {self.model_size}")
            except Exception as e:
                self.logger.error(f"Whisper模型加载失败: {e}")
                raise

    async def recognize(self, audio_data: bytes, language: str = 'zh',
                       dialect: str = 'zh') -> Dict[str, Any]:
        """
        使用Whisper进行语音识别

        Args:
            audio_data: 音频数据
            language: 语言代码
            dialect: 方言代码（Whisper不直接支持方言）

        Returns:
            识别结果
        """
        try:
            if self.whisper is None:
                raise Exception("Whisper库未安装")

            # 加载模型
            if self.model is None:
                self.load_model()

            # 保存音频到临时文件
            import tempfile
            import os

            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_path = temp_file.name

            try:
                # 进行识别
                result = self.model.transcribe(
                    temp_path,
                    language=language,
                    task="transcribe"
                )

                text = result.get('text', '').strip()

                return {
                    "success": True,
                    "text": text,
                    "confidence": result.get('avg_logprob', 0),
                    "language": language,
                    "dialect": dialect,
                    "alternatives": [],
                    "segments": result.get('segments', [])
                }

            finally:
                # 清理临时文件
                try:
                    os.unlink(temp_path)
                except:
                    pass

        except Exception as e:
            self.logger.error(f"Whisper识别失败: {e}")
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "confidence": 0,
                "language": language,
                "dialect": dialect
            }

    def is_available(self) -> bool:
        """检查服务是否可用"""
        return self.whisper is not None

    def get_metrics(self) -> Dict[str, Any]:
        """获取服务指标"""
        return {
            "model_size": self.model_size,
            "model_loaded": self.model is not None,
            "whisper_available": self.whisper is not None
        }