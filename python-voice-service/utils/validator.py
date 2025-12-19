"""
请求验证工具
"""

import os
import mimetypes
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

def validate_audio_file(audio_data: bytes, allowed_formats: List[str] = None) -> Dict[str, Any]:
    """
    验证音频文件

    Args:
        audio_data: 音频数据
        allowed_formats: 允许的格式列表

    Returns:
        验证结果
    """
    result = {
        'valid': True,
        'error': None,
        'format': None,
        'size': len(audio_data),
        'duration': None
    }

    try:
        # 检查文件大小
        if len(audio_data) == 0:
            result['valid'] = False
            result['error'] = '音频文件为空'
            return result

        # 检查文件头识别格式
        audio_format = detect_audio_format(audio_data)
        result['format'] = audio_format

        # 验证格式
        if allowed_formats and audio_format not in allowed_formats:
            result['valid'] = False
            result['error'] = f'不支持的音频格式: {audio_format}'
            return result

        # 尝试获取音频信息
        try:
            import io
            import soundfile as sf

            with io.BytesIO(audio_data) as audio_file:
                info = sf.info(audio_file)
                result['duration'] = info.duration
                result['samplerate'] = info.samplerate
                result['channels'] = info.channels

                # 验证采样率
                if info.samplerate < 8000 or info.samplerate > 48000:
                    result['valid'] = False
                    result['error'] = f'不支持的采样率: {info.samplerate}'

        except Exception as e:
            logger.warning(f"无法解析音频信息: {e}")
            # 不影响验证结果，只是无法获取详细信息

    except Exception as e:
        logger.error(f"音频验证失败: {e}")
        result['valid'] = False
        result['error'] = f'音频验证失败: {str(e)}'

    return result

def detect_audio_format(audio_data: bytes) -> str:
    """
    检测音频格式

    Args:
        audio_data: 音频数据

    Returns:
        音频格式
    """
    if len(audio_data) < 12:
        return 'unknown'

    # 检查文件头
    header = audio_data[:12]

    # WAV格式
    if header[:4] == b'RIFF' and header[8:12] == b'WAVE':
        return 'wav'

    # MP3格式 (ID3v1/ID3v2)
    if header.startswith(b'ID3') or header[:3] == b'ID3':
        return 'mp3'

    # MP3格式 (无ID3标签)
    if len(audio_data) >= 2:
        # 检查MP3同步字 (11位全1)
        if (audio_data[0] == 0xFF and (audio_data[1] & 0xE0) == 0xE0):
            return 'mp3'

    # WebM格式
    if header[:4] == b'\x1A\x45\xDF\xA3':
        return 'webm'

    # OGG格式
    if header[:4] == b'OggS':
        return 'ogg'

    # FLAC格式
    if header[:4] == b'fLaC':
        return 'flac'

    # AAC格式 (ADTS)
    if len(audio_data) >= 2:
        if (audio_data[0] == 0xFF and (audio_data[1] & 0xF0) == 0xF0):
            return 'aac'

    return 'unknown'

def validate_request_data(data: Dict[str, Any], required_fields: List[str]) -> bool:
    """
    验证请求数据

    Args:
        data: 请求数据字典
        required_fields: 必需字段列表

    Returns:
        是否验证通过
    """
    if not isinstance(data, dict):
        return False

    for field in required_fields:
        if field not in data or data[field] is None:
            return False

    return True

def validate_text_input(text: str, max_length: int = 1000) -> Dict[str, Any]:
    """
    验证文本输入

    Args:
        text: 输入文本
        max_length: 最大长度

    Returns:
        验证结果
    """
    result = {
        'valid': True,
        'error': None,
        'length': 0
    }

    try:
        if text is None:
            result['valid'] = False
            result['error'] = '文本不能为None'
            return result

        text = str(text).strip()
        result['length'] = len(text)

        # 检查长度
        if result['length'] == 0:
            result['valid'] = False
            result['error'] = '文本不能为空'
        elif result['length'] > max_length:
            result['valid'] = False
            result['error'] = f'文本长度超过限制({max_length}字符)'

    except Exception as e:
        result['valid'] = False
        result['error'] = f'文本验证失败: {str(e)}'

    return result

def validate_config(config: Dict[str, Any], schema: Dict[str, Any]) -> Dict[str, Any]:
    """
    验证配置

    Args:
        config: 配置字典
        schema: 配置模式

    Returns:
        验证结果
    """
    result = {
        'valid': True,
        'errors': [],
        'warnings': []
    }

    try:
        for field_name, field_schema in schema.items():
            field_value = config.get(field_name)

            # 检查必需字段
            if field_schema.get('required', False) and field_value is None:
                result['valid'] = False
                result['errors'].append(f'缺少必需字段: {field_name}')
                continue

            # 跳过空值验证
            if field_value is None:
                continue

            # 类型验证
            expected_type = field_schema.get('type')
            if expected_type and not isinstance(field_value, expected_type):
                result['valid'] = False
                result['errors'].append(
                    f'字段 {field_name} 类型错误，期望 {expected_type.__name__}，实际 {type(field_value).__name__}'
                )
                continue

            # 范围验证
            min_value = field_schema.get('min')
            max_value = field_schema.get('max')
            if isinstance(field_value, (int, float)):
                if min_value is not None and field_value < min_value:
                    result['valid'] = False
                    result['errors'].append(f'字段 {field_name} 值太小，最小值: {min_value}')
                if max_value is not None and field_value > max_value:
                    result['valid'] = False
                    result['errors'].append(f'字段 {field_name} 值太大，最大值: {max_value}')

            # 字符串长度验证
            if isinstance(field_value, str):
                min_length = field_schema.get('min_length')
                max_length = field_schema.get('max_length')
                if min_length is not None and len(field_value) < min_length:
                    result['valid'] = False
                    result['errors'].append(f'字段 {field_name} 长度太短，最小长度: {min_length}')
                if max_length is not None and len(field_value) > max_length:
                    result['valid'] = False
                    result['errors'].append(f'字段 {field_name} 长度太长，最大长度: {max_length}')

            # 枚举值验证
            allowed_values = field_schema.get('allowed_values')
            if allowed_values and field_value not in allowed_values:
                result['valid'] = False
                result['errors'].append(f'字段 {field_name} 值不在允许范围内: {allowed_values}')

    except Exception as e:
        result['valid'] = False
        result['errors'].append(f'配置验证失败: {str(e)}')

    return result

def sanitize_filename(filename: str) -> str:
    """
    清理文件名，移除不安全字符

    Args:
        filename: 原始文件名

    Returns:
        清理后的文件名
    """
    if not filename:
        return "unknown"

    # 移除路径分隔符
    filename = os.path.basename(filename)

    # 移除不安全字符
    unsafe_chars = '<>:"/\\|?*'
    for char in unsafe_chars:
        filename = filename.replace(char, '_')

    # 限制长度
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:255-len(ext)] + ext

    return filename

def validate_api_key(api_key: str, pattern: str = None) -> bool:
    """
    验证API密钥格式

    Args:
        api_key: API密钥
        pattern: 验证模式

    Returns:
        是否有效
    """
    if not api_key or not isinstance(api_key, str):
        return False

    # 检查长度
    if len(api_key) < 16:
        return False

    # 检查字符组成（只允许字母数字和部分特殊字符）
    import re
    if pattern:
        return bool(re.match(pattern, api_key))
    else:
        # 默认模式：字母数字和下划线
        return bool(re.match(r'^[a-zA-Z0-9_-]+$', api_key))

def validate_rate_limit(request_count: int, window: int, max_requests: int) -> Dict[str, Any]:
    """
    验证速率限制

    Args:
        request_count: 请求计数
        window: 时间窗口
        max_requests: 最大请求数

    Returns:
        验证结果
    """
    result = {
        'allowed': True,
        'remaining': max(0, max_requests - request_count),
        'reset_time': window,
        'retry_after': None
    }

    if request_count >= max_requests:
        result['allowed'] = False
        result['retry_after'] = window

    return result