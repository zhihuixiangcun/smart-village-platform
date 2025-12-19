"""
文本转语音服务
支持百度语音合成API和多种音色
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
import aiohttp
import base64
import hashlib
import time
import tempfile
import os

class TextToSpeechService:
    """文本转语音服务类"""

    def __init__(self, app_id: str, api_key: str, secret_key: str):
        """
        初始化文本转语音服务

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
        self.api_url = "https://tsn.baidu.com/text2audio"
        self.token_url = "https://aip.baidubce.com/oauth/2.0/token"

        # 音色配置
        self.voice_mapping = {
            'zh_female_qingxin': 0,    # 女声-清新
            'zh_female_tianmei': 1,    # 女声-甜美
            'zh_female_zhizhen': 4,    # 女声-知性
            'zh_male_xuanping': 3,     # 男声-磁性
            'zh_male_qingman': 5,      # 男声-青年
            'zh_male_laokou': 103,     # 男声-老者
            'yue_female_yunmen': 6,    # 粤语女声
            'yue_male_yinping': 7,     # 粤语男声
            'en_female_ava': 101,      # 英语女声
            'en_male_jack': 102        # 英语男声
        }

        # 情感配置
        self.emotion_mapping = {
            'neutral': 0,      # 中性
            'happy': 1,        # 开心
            'sad': 2,          # 悲伤
            'angry': 3,        # 愤怒
            'excited': 4,      # 兴奋
            'gentle': 5        # 温柔
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

                        self.logger.info("成功获取百度TTS访问令牌")
                        return self.access_token
                    else:
                        raise Exception(f"获取访问令牌失败: {response.status}")

        except Exception as e:
            self.logger.error(f"获取TTS访问令牌失败: {e}")
            raise

    async def synthesize(self, text: str, voice_id: Optional[str] = None,
                        speed: float = 1.0, pitch: float = 1.0,
                        volume: float = 1.0, emotion: str = 'neutral',
                        format: str = 'wav') -> Tuple[bytes, float]:
        """
        文本转语音

        Args:
            text: 要合成的文本
            voice_id: 音色ID
            speed: 语速 (0.5-2.0)
            pitch: 音调 (0.5-2.0)
            volume: 音量 (0.0-1.0)
            emotion: 情感
            format: 音频格式

        Returns:
            (音频数据, 时长)
        """
        self.request_count += 1
        start_time = time.time()

        try:
            # 获取访问令牌
            access_token = await self.get_access_token()

            # 参数验证
            if not text or not text.strip():
                raise ValueError("文本不能为空")

            if len(text) > 1024:  # 百度API限制
                # 分段处理
                return await self._synthesize_long_text(text, voice_id, speed, pitch, volume, emotion, format)

            # 获取音色代码
            per = self.voice_mapping.get(voice_id, 0)  # 默认女声

            # 获取情感代码
            emotion_id = self.emotion_mapping.get(emotion, 0)

            # 构建请求参数
            params = {
                "tex": text,
                "tok": access_token,
                "cuid": self._generate_cuid(),
                "ctp": 1,  # 客户端类型
                "lan": "zh",  # 语言
                "per": per,  # 发音人
                "spd": int(speed * 5),  # 语速 0-9
                "pit": int(pitch * 5),  # 音调 0-9
                "vol": int(volume * 15),  # 音量 0-15
                "aue": 3 if format == 'mp3' else 6  # 音频格式
            }

            # 添加情感支持（如果支持）
            if emotion_id != 0:
                params["emo"] = emotion_id

            # 发送请求
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    params=params,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                ) as response:

                    if response.status == 200:
                        # 检查响应类型
                        content_type = response.headers.get('Content-Type', '')

                        if 'application/json' in content_type:
                            # 错误响应
                            error_data = await response.json()
                            error_msg = error_data.get('error_msg', '未知错误')
                            raise Exception(f"TTS合成错误: {error_msg}")
                        else:
                            # 音频响应
                            audio_data = await response.read()
                            duration = time.time() - start_time

                            # 估算音频时长
                            estimated_duration = self._estimate_duration(text, speed)

                            self.success_count += 1
                            self.logger.info(
                                f"TTS合成成功: {text[:30]}... "
                                f"音频大小: {len(audio_data)} bytes, "
                                f"用时: {duration:.2f}s"
                            )

                            return audio_data, estimated_duration
                    else:
                        raise Exception(f"HTTP错误: {response.status}")

        except Exception as e:
            self.error_count += 1
            self.logger.error(f"TTS合成失败: {e}")
            raise

    async def _synthesize_long_text(self, text: str, voice_id: Optional[str],
                                   speed: float, pitch: float, volume: float,
                                   emotion: str, format: str) -> Tuple[bytes, float]:
        """
        处理长文本分段合成

        Args:
            text: 长文本
            voice_id: 音色ID
            speed: 语速
            pitch: 音调
            volume: 音量
            emotion: 情感
            format: 音频格式

        Returns:
            (合并的音频数据, 总时长)
        """
        # 文本分段
        segments = self._split_text(text)
        audio_segments = []
        total_duration = 0.0

        for segment in segments:
            try:
                audio_data, duration = await self.synthesize(
                    segment, voice_id, speed, pitch, volume, emotion, format
                )
                audio_segments.append(audio_data)
                total_duration += duration
            except Exception as e:
                self.logger.warning(f"分段合成失败: {segment[:20]}... 错误: {e}")
                continue

        # 合并音频片段
        if audio_segments:
            merged_audio = self._merge_audio_segments(audio_segments)
            return merged_audio, total_duration
        else:
            raise Exception("所有分段合成都失败了")

    def _split_text(self, text: str, max_length: int = 500) -> list:
        """
        分割文本为适合合成的段落

        Args:
            text: 原始文本
            max_length: 每段最大长度

        Returns:
            分割后的文本列表
        """
        if len(text) <= max_length:
            return [text]

        segments = []
        current_segment = ""

        # 按标点符号分割
        sentences = text.replace('。', '。|||').replace('！', '！|||').replace('？', '？|||').split('|||')

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            if len(current_segment + sentence) <= max_length:
                current_segment += sentence
            else:
                if current_segment:
                    segments.append(current_segment)
                current_segment = sentence

        if current_segment:
            segments.append(current_segment)

        return segments

    def _merge_audio_segments(self, audio_segments: list) -> bytes:
        """
        合并音频片段

        Args:
            audio_segments: 音频片段列表

        Returns:
            合并后的音频数据
        """
        # 这里应该使用音频处理库（如pydub）来合并音频
        # 简单实现：直接拼接
        merged = b''
        for segment in audio_segments:
            merged += segment
        return merged

    def _estimate_duration(self, text: str, speed: float = 1.0) -> float:
        """
        估算语音时长

        Args:
            text: 文本
            speed: 语速

        Returns:
            估算的时长（秒）
        """
        # 中文平均语速：每分钟200-300字
        # 取中间值250字/分钟
        chars_per_second = 250 / 60
        estimated_seconds = len(text) / (chars_per_second * speed)
        return max(estimated_seconds, 1.0)  # 最少1秒

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
            "has_valid_token": bool(self.access_token and time.time() < self.token_expires_at),
            "available_voices": list(self.voice_mapping.keys()),
            "available_emotions": list(self.emotion_mapping.keys())
        }

class AzureTextToSpeechService:
    """
    Azure认知服务文本转语音（备选方案）
    """

    def __init__(self, api_key: str, region: str):
        """
        初始化Azure TTS服务

        Args:
            api_key: Azure API密钥
            region: Azure区域
        """
        self.api_key = api_key
        self.region = region
        self.logger = logging.getLogger(__name__)
        self.request_count = 0
        self.success_count = 0
        self.error_count = 0

        # Azure语音服务配置
        self.api_url = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"

        # 音色配置
        self.voice_mapping = {
            'zh_female': 'zh-CN-XiaoxiaoNeural',
            'zh_male': 'zh-CN-YunyangNeural',
            'yue_female': 'zh-HK-HiuMaanNeural',
            'en_female': 'en-US-JennyNeural',
            'en_male': 'en-US-GuyNeural'
        }

    async def synthesize(self, text: str, voice_id: str = 'zh_female',
                        speed: float = 1.0, pitch: float = 1.0,
                        volume: float = 1.0, emotion: str = 'neutral',
                        format: str = 'wav') -> Tuple[bytes, float]:
        """
        使用Azure进行文本转语音

        Args:
            text: 要合成的文本
            voice_id: 音色ID
            speed: 语速
            pitch: 音调
            volume: 音量
            emotion: 情感
            format: 音频格式

        Returns:
            (音频数据, 时长)
        """
        self.request_count += 1
        start_time = time.time()

        try:
            # 获取音色
            voice = self.voice_mapping.get(voice_id, self.voice_mapping['zh_female'])

            # 构建SSML
            ssml = f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
    <voice name="{voice}">
        <prosody rate="{speed}" pitch="{pitch}" volume="{volume}">
            {text}
        </prosody>
    </voice>
</speak>"""

            # 构建请求
            headers = {
                'Ocp-Apim-Subscription-Key': self.api_key,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm' if format == 'wav' else 'audio-16khz-128kbitrate-mono-mp3'
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(self.api_url, headers=headers, data=ssml) as response:

                    if response.status == 200:
                        audio_data = await response.read()
                        duration = time.time() - start_time
                        estimated_duration = self._estimate_duration(text, speed)

                        self.success_count += 1
                        self.logger.info(f"Azure TTS合成成功: {text[:30]}...")

                        return audio_data, estimated_duration
                    else:
                        error_text = await response.text()
                        raise Exception(f"Azure TTS错误: {response.status} - {error_text}")

        except Exception as e:
            self.error_count += 1
            self.logger.error(f"Azure TTS合成失败: {e}")
            raise

    def _estimate_duration(self, text: str, speed: float = 1.0) -> float:
        """估算语音时长"""
        chars_per_second = 250 / 60
        return max(len(text) / (chars_per_second * speed), 1.0)

    def is_available(self) -> bool:
        """检查服务是否可用"""
        return bool(self.api_key and self.region)

    def get_metrics(self) -> Dict[str, Any]:
        """获取服务指标"""
        success_rate = self.success_count / max(self.request_count, 1) * 100

        return {
            "request_count": self.request_count,
            "success_count": self.success_count,
            "error_count": self.error_count,
            "success_rate": round(success_rate, 2),
            "available_voices": list(self.voice_mapping.keys())
        }