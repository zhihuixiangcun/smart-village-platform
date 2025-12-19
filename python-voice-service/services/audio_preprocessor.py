"""
音频预处理服务
包括降噪、音量标准化、静音检测等功能
"""

import numpy as np
import librosa
import soundfile as sf
import noisereduce as nr
from scipy import signal
from typing import Dict, Any, Tuple, Optional
import logging
import io

class AudioPreprocessor:
    """音频预处理服务类"""

    def __init__(self, config: Dict[str, Any]):
        """
        初始化音频预处理器

        Args:
            config: 音频配置
        """
        self.config = config
        self.logger = logging.getLogger(__name__)

        # 音频参数
        self.sample_rate = config.get('sample_rate', 16000)
        self.channels = config.get('channels', 1)
        self.bit_depth = config.get('bit_depth', 16)
        self.format = config.get('format', 'wav')

        # 处理参数
        self.silence_threshold = config.get('silence_threshold', 0.01)
        self.silence_duration = config.get('silence_duration', 2.0)
        self.max_duration = config.get('max_duration', 60)

        # 降噪参数
        self.noise_reduction_strength = config.get('noise_reduction_strength', 0.1)
        self.noise_reduction_stationary = config.get('noise_reduction_stationary', True)

        # 标准化参数
        self.target_rms = config.get('target_rms', 0.1)
        self.normalize_peak = config.get('normalize_peak', True)

        # 滤波参数
        self.highpass_freq = config.get('highpass_freq', 80)  # 高通滤波频率
        self.lowpass_freq = config.get('lowpass_freq', 8000)  # 低通滤波频率

    def process(self, audio_data: bytes) -> Dict[str, Any]:
        """
        处理音频数据

        Args:
            audio_data: 原始音频数据

        Returns:
            处理后的音频数据和元信息
        """
        try:
            # 1. 加载音频
            audio, sr = self._load_audio(audio_data)

            # 2. 重采样到目标采样率
            if sr != self.sample_rate:
                audio = self._resample(audio, sr, self.sample_rate)

            # 3. 转换为单声道
            if len(audio.shape) > 1:
                audio = self._to_mono(audio)

            # 4. 去除直流偏置
            audio = self._remove_dc_offset(audio)

            # 5. 应用滤波器
            audio = self._apply_filters(audio)

            # 6. 降噪处理
            audio = self._reduce_noise(audio)

            # 7. 音量标准化
            audio = self._normalize_volume(audio)

            # 8. 静音检测和裁剪
            audio, segments = self._detect_and_trim_silence(audio)

            # 9. 限幅处理
            audio = self._apply_limiter(audio)

            # 10. 质量检查
            quality_metrics = self._assess_quality(audio)

            # 11. 编码音频
            processed_audio_data = self._encode_audio(audio)

            self.logger.info(
                f"音频预处理完成，原始时长: {len(audio)/self.sample_rate:.2f}s, "
                f"有效时长: {segments.get('total_duration', 0):.2f}s"
            )

            return {
                'audio': processed_audio_data,
                'sample_rate': self.sample_rate,
                'channels': 1,
                'bit_depth': self.bit_depth,
                'format': self.format,
                'duration': len(audio) / self.sample_rate,
                'segments': segments,
                'quality_metrics': quality_metrics
            }

        except Exception as e:
            self.logger.error(f"音频预处理失败: {e}")
            raise

    def _load_audio(self, audio_data: bytes) -> Tuple[np.ndarray, int]:
        """
        加载音频数据

        Args:
            audio_data: 音频字节数据

        Returns:
            (音频数组, 采样率)
        """
        try:
            # 使用soundfile从字节数据加载音频
            with io.BytesIO(audio_data) as audio_file:
                audio, sr = sf.read(audio_file)

            # 转换为float32
            if audio.dtype != np.float32:
                audio = audio.astype(np.float32)

            return audio, sr

        except Exception as e:
            self.logger.error(f"音频加载失败: {e}")
            # 尝试使用librosa作为备选
            try:
                audio, sr = librosa.load(io.BytesIO(audio_data), sr=None, mono=False)
                return audio, sr
            except Exception as e2:
                self.logger.error(f"备选音频加载也失败: {e2}")
                raise Exception(f"无法加载音频数据: {e}")

    def _resample(self, audio: np.ndarray, original_sr: int, target_sr: int) -> np.ndarray:
        """
        重采样音频

        Args:
            audio: 原始音频
            original_sr: 原始采样率
            target_sr: 目标采样率

        Returns:
            重采样后的音频
        """
        if original_sr == target_sr:
            return audio

        try:
            # 使用librosa进行高质量重采样
            resampled = librosa.resample(
                audio,
                orig_sr=original_sr,
                target_sr=target_sr,
                res_type='kaiser_best'
            )
            return resampled

        except Exception as e:
            self.logger.error(f"重采样失败: {e}")
            # 使用简单的线性插值作为备选
            ratio = target_sr / original_sr
            new_length = int(len(audio) * ratio)
            indices = np.linspace(0, len(audio) - 1, new_length)
            return np.interp(indices, np.arange(len(audio)), audio)

    def _to_mono(self, audio: np.ndarray) -> np.ndarray:
        """
        转换为单声道

        Args:
            audio: 多声道音频

        Returns:
            单声道音频
        """
        try:
            if len(audio.shape) == 1:
                return audio

            # 平均各个声道
            return np.mean(audio, axis=0)

        except Exception as e:
            self.logger.error(f"单声道转换失败: {e}")
            return audio[:, 0] if len(audio.shape) > 1 else audio

    def _remove_dc_offset(self, audio: np.ndarray) -> np.ndarray:
        """
        去除直流偏置

        Args:
            audio: 音频数据

        Returns:
            去除直流偏置后的音频
        """
        try:
            # 计算直流分量并减去
            dc_offset = np.mean(audio)
            return audio - dc_offset

        except Exception as e:
            self.logger.error(f"去除直流偏置失败: {e}")
            return audio

    def _apply_filters(self, audio: np.ndarray) -> np.ndarray:
        """
        应用滤波器

        Args:
            audio: 音频数据

        Returns:
            滤波后的音频
        """
        try:
            # 设计滤波器
            nyquist = self.sample_rate / 2

            # 高通滤波器（去除低频噪声）
            if self.highpass_freq > 0:
                highpass = signal.butter(
                    4,
                    self.highpass_freq / nyquist,
                    btype='high',
                    output='sos'
                )
                audio = signal.sosfilt(highpass, audio)

            # 低通滤波器（去除高频噪声）
            if self.lowpass_freq < nyquist:
                lowpass = signal.butter(
                    4,
                    self.lowpass_freq / nyquist,
                    btype='low',
                    output='sos'
                )
                audio = signal.sosfilt(lowpass, audio)

            return audio

        except Exception as e:
            self.logger.error(f"滤波处理失败: {e}")
            return audio

    def _reduce_noise(self, audio: np.ndarray) -> np.ndarray:
        """
        降噪处理

        Args:
            audio: 音频数据

        Returns:
            降噪后的音频
        """
        try:
            # 使用noisereduce库进行降噪
            reduced_noise = nr.reduce_noise(
                y=audio,
                sr=self.sample_rate,
                stationary=self.noise_reduction_stationary,
                prop_decrease=self.noise_reduction_strength
            )

            return reduced_noise

        except Exception as e:
            self.logger.error(f"降噪处理失败: {e}")
            # 使用简单的频域降噪作为备选
            return self._simple_noise_reduction(audio)

    def _simple_noise_reduction(self, audio: np.ndarray) -> np.ndarray:
        """
        简单的降噪处理（备选方案）

        Args:
            audio: 音频数据

        Returns:
            降噪后的音频
        """
        try:
            # 计算噪声门限
            noise_floor = np.percentile(np.abs(audio), 30)
            gate_threshold = noise_floor * 3

            # 应用噪声门
            audio = np.where(np.abs(audio) < gate_threshold, 0, audio)

            return audio

        except Exception as e:
            self.logger.error(f"简单降噪失败: {e}")
            return audio

    def _normalize_volume(self, audio: np.ndarray) -> np.ndarray:
        """
        音量标准化

        Args:
            audio: 音频数据

        Returns:
            标准化后的音频
        """
        try:
            # 计算当前RMS
            current_rms = np.sqrt(np.mean(audio ** 2))

            if current_rms > 0:
                # 计算增益
                gain = self.target_rms / current_rms

                # 限制增益范围
                gain = np.clip(gain, 0.1, 10.0)

                # 应用增益
                audio = audio * gain

                # 如果启用峰值标准化
                if self.normalize_peak:
                    peak = np.max(np.abs(audio))
                    if peak > 0.95:  # 防止削波
                        audio = audio * (0.95 / peak)

            return audio

        except Exception as e:
            self.logger.error(f"音量标准化失败: {e}")
            return audio

    def _detect_and_trim_silence(self, audio: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        静音检测和裁剪

        Args:
            audio: 音频数据

        Returns:
            (裁剪后的音频, 分段信息)
        """
        try:
            # 计算音频能量
            frame_length = int(0.025 * self.sample_rate)  # 25ms帧
            hop_length = int(0.010 * self.sample_rate)     # 10ms跳跃

            # 使用librosa检测静音
            intervals = librosa.effects.split(
                audio,
                top_db=int(-20 * np.log10(self.silence_threshold)),
                frame_length=frame_length,
                hop_length=hop_length
            )

            if len(intervals) == 0:
                # 没有检测到非静音段
                return audio, {
                    'segments': [],
                    'total_duration': 0,
                    'silence_ratio': 1.0
                }

            # 计算有效音频段
            total_valid_duration = 0
            segments = []

            for start, end in intervals:
                duration = (end - start) / self.sample_rate
                total_valid_duration += duration
                segments.append({
                    'start': start / self.sample_rate,
                    'end': end / self.sample_rate,
                    'duration': duration
                })

            # 如果有效时长太短，保留整个音频
            if total_valid_duration < 1.0:
                return audio, {
                    'segments': segments,
                    'total_duration': len(audio) / self.sample_rate,
                    'silence_ratio': 0.0
                }

            # 合并非静音段
            if len(intervals) > 0:
                # 保留第一个和最后一个静音段的一部分
                first_silence = min(intervals[0][0], int(0.1 * self.sample_rate))
                last_silence_end = min(
                    len(audio),
                    intervals[-1][1] + int(0.1 * self.sample_rate)
                )

                # 提取有效音频
                start_sample = max(0, intervals[0][0] - first_silence)
                end_sample = min(len(audio), last_silence_end)

                trimmed_audio = audio[start_sample:end_sample]

                return trimmed_audio, {
                    'segments': segments,
                    'total_duration': total_valid_duration,
                    'silence_ratio': 1.0 - (total_valid_duration / (len(audio) / self.sample_rate))
                }

            return audio, {
                'segments': segments,
                'total_duration': total_valid_duration,
                'silence_ratio': 0.0
            }

        except Exception as e:
            self.logger.error(f"静音检测失败: {e}")
            return audio, {
                'segments': [],
                'total_duration': len(audio) / self.sample_rate,
                'silence_ratio': 0.0
            }

    def _apply_limiter(self, audio: np.ndarray) -> np.ndarray:
        """
        应用限幅器防止削波

        Args:
            audio: 音频数据

        Returns:
            限幅后的音频
        """
        try:
            # 软限幅
            threshold = 0.95
            audio = np.tanh(audio / threshold) * threshold

            return audio

        except Exception as e:
            self.logger.error(f"限幅处理失败: {e}")
            return audio

    def _assess_quality(self, audio: np.ndarray) -> Dict[str, Any]:
        """
        评估音频质量

        Args:
            audio: 音频数据

        Returns:
            质量指标
        """
        try:
            metrics = {}

            # 计算RMS能量
            metrics['rms'] = float(np.sqrt(np.mean(audio ** 2)))

            # 计算峰值
            metrics['peak'] = float(np.max(np.abs(audio)))

            # 计算动态范围
            metrics['dynamic_range'] = float(20 * np.log10(metrics['peak'] / max(metrics['rms'], 1e-10)))

            # 计算信噪比（简化版本）
            signal_power = np.mean(audio ** 2)
            noise_estimate = np.percentile(np.abs(audio), 10) ** 2
            metrics['snr_db'] = float(10 * np.log10(signal_power / max(noise_estimate, 1e-10)))

            # 计算零交叉率
            zero_crossings = np.sum(np.diff(np.sign(audio)) != 0)
            metrics['zero_crossing_rate'] = float(zero_crossings / len(audio))

            # 音频时长
            metrics['duration'] = len(audio) / self.sample_rate

            # 质量评分（0-100）
            quality_score = 100

            # 基于RMS调整评分
            if metrics['rms'] < 0.01:
                quality_score -= 20  # 音量太小
            elif metrics['rms'] > 0.2:
                quality_score -= 10  # 音量太大

            # 基于SNR调整评分
            if metrics['snr_db'] < 10:
                quality_score -= 30  # 信噪比太低
            elif metrics['snr_db'] < 20:
                quality_score -= 15

            # 基于动态范围调整评分
            if metrics['dynamic_range'] < 10:
                quality_score -= 10  # 动态范围太小

            metrics['quality_score'] = max(0, quality_score)

            return metrics

        except Exception as e:
            self.logger.error(f"质量评估失败: {e}")
            return {
                'rms': 0.0,
                'peak': 0.0,
                'dynamic_range': 0.0,
                'snr_db': 0.0,
                'zero_crossing_rate': 0.0,
                'duration': 0.0,
                'quality_score': 0
            }

    def _encode_audio(self, audio: np.ndarray) -> bytes:
        """
        编码音频为字节数据

        Args:
            audio: 音频数据

        Returns:
            编码后的字节数据
        """
        try:
            # 使用soundfile编码为WAV格式
            with io.BytesIO() as buffer:
                sf.write(buffer, audio, self.sample_rate, format='WAV', subtype='PCM_16')
                return buffer.getvalue()

        except Exception as e:
            self.logger.error(f"音频编码失败: {e}")
            # 备选编码方法
            return self._fallback_encode(audio)

    def _fallback_encode(self, audio: np.ndarray) -> bytes:
        """
        备选音频编码方法

        Args:
            audio: 音频数据

        Returns:
            编码后的字节数据
        """
        try:
            # 转换为16位整数
            audio_int16 = (audio * 32767).astype(np.int16)

            # 创建简单的WAV头部
            sample_rate = self.sample_rate
            channels = 1
            bits_per_sample = 16
            byte_rate = sample_rate * channels * bits_per_sample // 8
            block_align = channels * bits_per_sample // 8

            # WAV文件头
            header = bytearray()
            header.extend(b'RIFF')
            header.extend((36 + len(audio_int16) * 2).to_bytes(4, 'little'))
            header.extend(b'WAVE')
            header.extend(b'fmt ')
            header.extend((16).to_bytes(4, 'little'))  # fmt chunk size
            header.extend((1).to_bytes(2, 'little'))   # PCM
            header.extend(channels.to_bytes(2, 'little'))
            header.extend(sample_rate.to_bytes(4, 'little'))
            header.extend(byte_rate.to_bytes(4, 'little'))
            header.extend(block_align.to_bytes(2, 'little'))
            header.extend(bits_per_sample.to_bytes(2, 'little'))
            header.extend(b'data')
            header.extend((len(audio_int16) * 2).to_bytes(4, 'little'))

            # 音频数据
            audio_bytes = audio_int16.tobytes()

            return bytes(header) + audio_bytes

        except Exception as e:
            self.logger.error(f"备选音频编码失败: {e}")
            raise Exception(f"音频编码失败: {e}")