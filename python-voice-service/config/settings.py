"""
智慧乡村语音服务配置文件
"""

import os
from pathlib import Path

# 基础配置
BASE_DIR = Path(__file__).parent.parent
PORT = int(os.getenv('VOICE_SERVICE_PORT', 5001))
HOST = os.getenv('VOICE_SERVICE_HOST', '0.0.0.0')
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

# 百度语音API配置
BAIDU_APP_ID = os.getenv('BAIDU_APP_ID', '')
BAIDU_API_KEY = os.getenv('BAIDU_API_KEY', '')
BAIDU_SECRET_KEY = os.getenv('BAIDU_SECRET_KEY', '')

# 腾讯语音API配置（备用）
TENCENT_SECRET_ID = os.getenv('TENCENT_SECRET_ID', '')
TENCENT_SECRET_KEY = os.getenv('TENCENT_SECRET_KEY', '')

# 阿里云语音API配置（备用）
ALI_ACCESS_KEY_ID = os.getenv('ALI_ACCESS_KEY_ID', '')
ALI_ACCESS_KEY_SECRET = os.getenv('ALI_ACCESS_KEY_SECRET', '')

# 音频处理配置
AUDIO_CONFIG = {
    'sample_rate': 16000,
    'channels': 1,
    'bit_depth': 16,
    'format': 'wav',
    'max_duration': 60,  # 最大录音时长（秒）
    'silence_threshold': 0.01,  # 静音检测阈值
    'silence_duration': 2.0,  # 静音检测时长（秒）
}

# 方言配置
DIALECT_CONFIG = {
    'zh': {'name': '普通话', 'baidu_code': 1537},
    'yue': {'name': '粤语', 'baidu_code': 1637},
    'nan': {'name': '闽南语', 'baidu_code': 1836},
    'hak': {'name': '客家话', 'baidu_code': 1837},
    'wuu': {'name': '吴语', 'baidu_code': 1737},
    'hsn': {'name': '湘语', 'baidu_code': 1838},
    'gan': {'name': '赣语', 'baidu_code': 1839},
    'zh-northeast': {'name': '东北话', 'baidu_code': 1636},
    'zh-sichuan': {'name': '四川话', 'baidu_code': 1835},
    'zh-chongqing': {'name': '重庆话', 'baidu_code': 1635},
    'zh-shaanxi': {'name': '陕西话', 'baidu_code': 1634},
    'zh-shandong': {'name': '山东话', 'baidu_code': 1633},
    'zh-henan': {'name': '河南话', 'baidu_code': 1632},
    'zh-hubei': {'name': '湖北话', 'baidu_code': 1631},
    'zh-jiangzhe': {'name': '江浙话', 'baidu_code': 1630},
    'zh-anhui': {'name': '安徽话', 'baidu_code': 1629},
    'zh-hebei': {'name': '河北话', 'baidu_code': 1628},
    'zh-shanxi': {'name': '山西话', 'baidu_code': 1627},
    'zh-neimeng': {'name': '内蒙古话', 'baidu_code': 1626},
    'zh-gansu': {'name': '甘肃话', 'baidu_code': 1625},
    'zh-ningxia': {'name': '宁夏话', 'baidu_code': 1624},
    'zh-xinjiang': {'name': '新疆话', 'baidu_code': 1623},
    'zh-xizang': {'name': '西藏话', 'baidu_code': 1622},
    'zh-qinghai': {'name': '青海话', 'baidu_code': 1621}
}

# TTS配置
TTS_CONFIG = {
    'default_voice': 'zh_female_qingxin',  # 默认音色
    'voices': {
        'female': {
            'zh': ['zh_female_qingxin', 'zh_female_tianmei'],
            'yue': ['yue_female_yunmen'],
            'en': ['en_female_ava']
        },
        'male': {
            'zh': ['zh_male_xuanping'],
            'yue': ['yue_male_yinping'],
            'en': ['en_male_jack']
        }
    },
    'speed': 1.0,  # 语速
    'pitch': 1.0,  # 音调
    'volume': 1.0,  # 音量
    'emotion': 'neutral'  # 情感
}

# 语音命令配置
COMMAND_CONFIG = {
    'wake_words': ['小智', '村小助手', '智慧乡村', '村民助手'],
    'timeout': 5.0,  # 命令识别超时时间（秒）
    'confidence_threshold': 0.6,  # 置信度阈值
    'max_retries': 3,  # 最大重试次数
    'commands': {
        'query': ['查询', '显示', '看看', '找', '搜索'],
        'action': ['执行', '操作', '处理', '办理'],
        'navigate': ['打开', '进入', '跳转到', '切换到'],
        'help': ['帮助', '怎么用', '使用指南'],
        'emergency': ['紧急', '求救', '报警', '急救']
    }
}

# 缓存配置
CACHE_CONFIG = {
    'enabled': True,
    'type': 'memory',  # memory, redis
    'max_size': 1000,
    'ttl': 3600  # 缓存时间（秒）
}

# Redis配置（如果使用Redis缓存）
REDIS_CONFIG = {
    'host': os.getenv('REDIS_HOST', 'localhost'),
    'port': int(os.getenv('REDIS_PORT', 6379)),
    'db': int(os.getenv('REDIS_DB', 0)),
    'password': os.getenv('REDIS_PASSWORD', '')
}

# 日志配置
LOGGING_CONFIG = {
    'level': os.getenv('LOG_LEVEL', 'INFO'),
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'file': str(BASE_DIR / 'logs' / 'voice_service.log'),
    'max_bytes': 10 * 1024 * 1024,  # 10MB
    'backup_count': 5
}

# 性能配置
PERFORMANCE_CONFIG = {
    'max_concurrent_requests': 10,
    'request_timeout': 30,  # 秒
    'queue_size': 100,
    'worker_processes': 1  # 工作进程数
}

# 安全配置
SECURITY_CONFIG = {
    'allowed_origins': [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5000'
    ],
    'max_file_size': 10 * 1024 * 1024,  # 10MB
    'allowed_audio_formats': ['wav', 'mp3', 'webm', 'ogg'],
    'rate_limit': {
        'requests': 100,  # 请求数
        'window': 60  # 时间窗口（秒）
    }
}

# 模型配置
MODEL_CONFIG = {
    'speech_recognition_model': 'baidu_asr',  # baidu_asr, whisper
    'tts_model': 'baidu_tts',  # baidu_tts, azure_tts
    'dialect_detection_model': 'custom',  # custom, baidu
    'models_dir': str(BASE_DIR / 'models'),
    'cache_models': True
}

# 智能服务配置
AI_CONFIG = {
    'nlu_enabled': True,  # 自然语言理解
    'intent_classification': True,  # 意图分类
    'entity_extraction': True,  # 实体提取
    'dialogue_management': True,  # 对话管理
    'context_memory': 10  # 上下文记忆轮数
}

# 数据库配置（如果需要持久化）
DATABASE_CONFIG = {
    'type': 'sqlite',  # sqlite, mysql, postgresql
    'sqlite': {
        'path': str(BASE_DIR / 'data' / 'voice_service.db')
    },
    'mysql': {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 3306)),
        'user': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', ''),
        'database': os.getenv('DB_NAME', 'voice_service')
    }
}

# 监控配置
MONITORING_CONFIG = {
    'enabled': True,
    'metrics_port': 9001,
    'health_check_interval': 30,  # 秒
    'performance_tracking': True,
    'error_tracking': True
}