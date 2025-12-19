"""
智慧乡村语音交互服务 - Python AI处理模块
支持方言识别、语音合成、语音命令处理
"""

import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

# 添加项目根目录到Python路径
sys.path.append(str(Path(__file__).parent.parent))

from config.settings import *
from services.speech_recognition import SpeechRecognitionService
from services.text_to_speech import TextToSpeechService
from services.dialect_detection import DialectDetectionService
from services.voice_command import VoiceCommandService
from services.audio_preprocessor import AudioPreprocessor
from utils.logger import setup_logger
from utils.cache import CacheManager
from utils.validator import validate_audio_file, validate_request_data

# 创建Flask应用
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = SECURITY_CONFIG['max_file_size']

# 配置CORS
CORS(app, origins=SECURITY_CONFIG['allowed_origins'])

# 设置日志
logger = setup_logger('voice_service', LOGGING_CONFIG)

# 初始化缓存
cache_manager = CacheManager(CACHE_CONFIG)

# 初始化服务
try:
    speech_service = SpeechRecognitionService(BAIDU_APP_ID, BAIDU_API_KEY, BAIDU_SECRET_KEY)
    tts_service = TextToSpeechService(BAIDU_APP_ID, BAIDU_API_KEY, BAIDU_SECRET_KEY)
    dialect_service = DialectDetectionService()
    command_service = VoiceCommandService(COMMAND_CONFIG)
    audio_preprocessor = AudioPreprocessor(AUDIO_CONFIG)

    logger.info("✅ 所有语音服务初始化成功")
except Exception as e:
    logger.error(f"❌ 语音服务初始化失败: {e}")
    raise

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    try:
        status = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0.0',
            'services': {
                'speech_recognition': speech_service.is_available(),
                'text_to_speech': tts_service.is_available(),
                'dialect_detection': dialect_service.is_available(),
                'voice_command': command_service.is_available()
            },
            'cache': {
                'enabled': CACHE_CONFIG['enabled'],
                'size': cache_manager.size(),
                'type': CACHE_CONFIG['type']
            }
        }

        return jsonify({
            'success': True,
            'data': status
        })

    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return jsonify({
            'success': False,
            'error': 'health_check_failed',
            'message': str(e)
        }), 500

@app.route('/speech/recognize', methods=['POST'])
def recognize_speech():
    """语音识别接口"""
    try:
        # 验证请求数据
        data = request.get_json()
        if not validate_request_data(data, ['audio']):
            return jsonify({
                'success': False,
                'error': 'invalid_request',
                'message': '请求数据格式错误'
            }), 400

        # 解析音频数据
        audio_data = bytes(data['audio'])
        config = data.get('config', {})

        # 生成缓存键
        cache_key = f"recognition_{hash(audio_data)}_{json.dumps(config, sort_keys=True)}"

        # 检查缓存
        if CACHE_CONFIG['enabled']:
            cached_result = cache_manager.get(cache_key)
            if cached_result:
                logger.info("使用语音识别缓存结果")
                return jsonify({
                    'success': True,
                    'data': cached_result,
                    'cached': True
                })

        logger.info(f"开始语音识别，音频大小: {len(audio_data)} bytes")

        # 音频预处理
        processed_audio = audio_preprocessor.process(audio_data)

        # 方言检测（如果配置为自动检测）
        language = config.get('language', 'zh-CN')
        dialect = config.get('dialect', 'auto')

        if dialect == 'auto':
            dialect_result = await dialect_service.detect(processed_audio)
            dialect = dialect_result['dialect']
            confidence = dialect_result['confidence']
            logger.info(f"检测到方言: {dialect}, 置信度: {confidence}")

        # 语音识别
        result = await speech_service.recognize(
            processed_audio,
            language=language,
            dialect=dialect,
            sample_rate=config.get('sampleRate', AUDIO_CONFIG['sample_rate'])
        )

        # 添加方言信息
        if 'dialect' not in result:
            result['dialect'] = dialect

        logger.info(f"语音识别完成: {result.get('text', 'No text')}")

        # 缓存结果
        if CACHE_CONFIG['enabled']:
            cache_manager.set(cache_key, result, CACHE_CONFIG['ttl'])

        return jsonify({
            'success': True,
            'data': result
        })

    except Exception as e:
        logger.error(f"语音识别失败: {e}")
        return jsonify({
            'success': False,
            'error': 'recognition_failed',
            'message': str(e)
        }), 500

@app.route('/speech/synthesize', methods=['POST'])
def synthesize_speech():
    """文本转语音接口"""
    try:
        # 验证请求数据
        data = request.get_json()
        if not validate_request_data(data, ['text']):
            return jsonify({
                'success': False,
                'error': 'invalid_request',
                'message': '请求数据格式错误'
            }), 400

        text = data['text']
        config = data.get('config', {})

        # 生成缓存键
        cache_key = f"tts_{hash(text)}_{json.dumps(config, sort_keys=True)}"

        # 检查缓存
        if CACHE_CONFIG['enabled']:
            cached_result = cache_manager.get(cache_key)
            if cached_result:
                logger.info("使用TTS缓存结果")
                return jsonify({
                    'success': True,
                    'data': cached_result,
                    'cached': True
                })

        logger.info(f"开始语音合成，文本: {text[:50]}...")

        # 合成配置
        voice = config.get('voice', 'female')
        language = config.get('language', 'zh')
        dialect = config.get('dialect', '普通话')
        speed = config.get('speed', TTS_CONFIG['speed'])
        pitch = config.get('pitch', TTS_CONFIG['pitch'])
        volume = config.get('volume', TTS_CONFIG['volume'])
        emotion = config.get('emotion', TTS_CONFIG['emotion'])

        # 选择音色
        voice_id = None
        if voice in TTS_CONFIG['voices'] and language in TTS_CONFIG['voices'][voice]:
            voices = TTS_CONFIG['voices'][voice][language]
            if voices:
                voice_id = voices[0]

        # 语音合成
        audio_data, duration = await tts_service.synthesize(
            text,
            voice_id=voice_id,
            speed=speed,
            pitch=pitch,
            volume=volume,
            emotion=emotion
        )

        result = {
            'audio': list(audio_data),
            'duration': duration,
            'config': {
                'voice': voice_id,
                'speed': speed,
                'pitch': pitch,
                'volume': volume,
                'emotion': emotion
            }
        }

        logger.info(f"语音合成完成，时长: {duration}秒")

        # 缓存结果
        if CACHE_CONFIG['enabled']:
            cache_manager.set(cache_key, result, CACHE_CONFIG['ttl'])

        return jsonify({
            'success': True,
            'data': result
        })

    except Exception as e:
        logger.error(f"语音合成失败: {e}")
        return jsonify({
            'success': False,
            'error': 'synthesis_failed',
            'message': str(e)
        }), 500

@app.route('/speech/detect-dialect', methods=['POST'])
def detect_dialect():
    """方言检测接口"""
    try:
        # 验证请求数据
        data = request.get_json()
        if not validate_request_data(data, ['audio']):
            return jsonify({
                'success': False,
                'error': 'invalid_request',
                'message': '请求数据格式错误'
            }), 400

        audio_data = bytes(data['audio'])

        logger.info(f"开始方言检测，音频大小: {len(audio_data)} bytes")

        # 音频预处理
        processed_audio = audio_preprocessor.process(audio_data)

        # 方言检测
        result = await dialect_service.detect(processed_audio)

        logger.info(f"方言检测完成: {result['dialect']} (置信度: {result['confidence']})")

        return jsonify({
            'success': True,
            'data': result
        })

    except Exception as e:
        logger.error(f"方言检测失败: {e}")
        return jsonify({
            'success': False,
            'error': 'dialect_detection_failed',
            'message': str(e)
        }), 500

@app.route('/voice/command', methods=['POST'])
def process_voice_command():
    """语音命令处理接口"""
    try:
        # 验证请求数据
        data = request.get_json()
        if not validate_request_data(data, ['text']):
            return jsonify({
                'success': False,
                'error': 'invalid_request',
                'message': '请求数据格式错误'
            }), 400

        text = data['text']
        context = data.get('context', {})

        logger.info(f"处理语音命令: {text}")

        # 命令解析
        result = await command_service.process(text, context)

        logger.info(f"命令处理完成: {result.get('intent', 'unknown')}")

        return jsonify({
            'success': True,
            'data': result
        })

    except Exception as e:
        logger.error(f"语音命令处理失败: {e}")
        return jsonify({
            'success': False,
            'error': 'command_processing_failed',
            'message': str(e)
        }), 500

@app.route('/voice/stream', methods=['GET'])
def stream_audio():
    """实时音频流处理（WebSocket代理）"""
    return jsonify({
        'success': False,
        'error': 'websocket_required',
        'message': '请使用WebSocket连接进行实时音频流处理',
        'websocket_url': f'ws://{HOST}:{PORT}/ws/stream'
    })

@app.route('/config/dialects', methods=['GET'])
def get_dialects():
    """获取支持的方言列表"""
    try:
        dialects = []
        for code, info in DIALECT_CONFIG.items():
            dialects.append({
                'code': code,
                'name': info['name'],
                'baidu_code': info['baidu_code']
            })

        return jsonify({
            'success': True,
            'data': {
                'dialects': dialects,
                'total': len(dialects)
            }
        })

    except Exception as e:
        logger.error(f"获取方言列表失败: {e}")
        return jsonify({
            'success': False,
            'error': 'get_dialects_failed',
            'message': str(e)
        }), 500

@app.route('/config/voices', methods=['GET'])
def get_voices():
    """获取支持的音色列表"""
    try:
        return jsonify({
            'success': True,
            'data': {
                'voices': TTS_CONFIG['voices'],
                'default_voice': TTS_CONFIG['default_voice']
            }
        })

    except Exception as e:
        logger.error(f"获取音色列表失败: {e}")
        return jsonify({
            'success': False,
            'error': 'get_voices_failed',
            'message': str(e)
        }), 500

@app.route('/config/commands', methods=['GET'])
def get_commands():
    """获取支持的语音命令列表"""
    try:
        return jsonify({
            'success': True,
            'data': {
                'wake_words': COMMAND_CONFIG['wake_words'],
                'commands': COMMAND_CONFIG['commands'],
                'confidence_threshold': COMMAND_CONFIG['confidence_threshold']
            }
        })

    except Exception as e:
        logger.error(f"获取命令列表失败: {e}")
        return jsonify({
            'success': False,
            'error': 'get_commands_failed',
            'message': str(e)
        }), 500

@app.route('/metrics', methods=['GET'])
def get_metrics():
    """获取服务指标"""
    try:
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'uptime': datetime.now().timestamp() - app.start_time,
            'requests': {
                'total': getattr(app, 'request_count', 0),
                'errors': getattr(app, 'error_count', 0)
            },
            'cache': {
                'hits': cache_manager.hits,
                'misses': cache_manager.misses,
                'size': cache_manager.size()
            },
            'services': {
                'speech_recognition': speech_service.get_metrics(),
                'text_to_speech': tts_service.get_metrics(),
                'dialect_detection': dialect_service.get_metrics(),
                'voice_command': command_service.get_metrics()
            }
        }

        return jsonify({
            'success': True,
            'data': metrics
        })

    except Exception as e:
        logger.error(f"获取服务指标失败: {e}")
        return jsonify({
            'success': False,
            'error': 'get_metrics_failed',
            'message': str(e)
        }), 500

@app.errorhandler(413)
def too_large(e):
    """文件过大错误处理"""
    return jsonify({
        'success': False,
        'error': 'file_too_large',
        'message': f'文件大小超过限制 ({SECURITY_CONFIG["max_file_size"]} bytes)'
    }), 413

@app.errorhandler(404)
def not_found(e):
    """404错误处理"""
    return jsonify({
        'success': False,
        'error': 'not_found',
        'message': '请求的接口不存在'
    }), 404

@app.errorhandler(500)
def internal_error(e):
    """500错误处理"""
    logger.error(f"内部服务器错误: {e}")
    return jsonify({
        'success': False,
        'error': 'internal_error',
        'message': '内部服务器错误'
    }), 500

# 请求计数中间件
@app.before_request
def before_request():
    """请求前处理"""
    app.request_count = getattr(app, 'request_count', 0) + 1

# 错误计数中间件
@app.after_request
def after_request(response):
    """请求后处理"""
    if response.status_code >= 400:
        app.error_count = getattr(app, 'error_count', 0) + 1
    return response

def main():
    """主函数"""
    try:
        # 创建必要的目录
        os.makedirs(BASE_DIR / 'logs', exist_ok=True)
        os.makedirs(BASE_DIR / 'data', exist_ok=True)
        os.makedirs(BASE_DIR / 'temp', exist_ok=True)

        # 记录启动时间
        app.start_time = datetime.now().timestamp()
        app.request_count = 0
        app.error_count = 0

        logger.info(f"🚀 启动智慧乡村语音服务...")
        logger.info(f"🌐 服务地址: http://{HOST}:{PORT}")
        logger.info(f"🏥 健康检查: http://{HOST}:{PORT}/health")
        logger.info(f"📊 服务指标: http://{HOST}:{PORT}/metrics")
        logger.info(f"🔧 调试模式: {DEBUG}")

        # 启动服务
        app.run(
            host=HOST,
            port=PORT,
            debug=DEBUG,
            threaded=True
        )

    except Exception as e:
        logger.error(f"❌ 服务启动失败: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()