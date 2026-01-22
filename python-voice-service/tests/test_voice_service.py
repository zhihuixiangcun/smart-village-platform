"""
语音服务单元测试
测试语音识别、TTS、方言检测、语音命令处理等功能
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from flask import Flask


@pytest.fixture
def app():
    """创建 Flask 应用实例"""
    from src.app import app as voice_app
    voice_app.config['TESTING'] = True
    return voice_app


@pytest.fixture
def client(app):
    """创建测试客户端"""
    return app.test_client()


class TestHealthCheck:
    """健康检查测试"""

    def test_health_check_success(self, client):
        """测试健康检查成功"""
        response = client.get('/health')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'data' in data
        assert 'status' in data['data']
        assert data['data']['status'] == 'healthy'


class TestSpeechRecognition:
    """语音识别测试"""

    @patch('src.app.speech_service')
    def test_speech_recognize_success(self, mock_speech_service, client):
        """测试语音识别成功"""
        # 模拟语音服务返回
        mock_speech_service.recognize.return_value = {
            'text': '你好世界',
            'confidence': 0.95,
            'language': 'zh-CN'
        }
        mock_speech_service.is_available.return_value = True

        request_data = {
            'audio': list('mock_audio_data'),
            'config': {
                'language': 'zh-CN',
                'dialect': 'auto'
            }
        }

        response = client.post('/speech/recognize',
                               data=json.dumps(request_data),
                               content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'data' in data

    def test_speech_recognize_missing_audio(self, client):
        """测试缺少音频参数"""
        request_data = {'config': {'language': 'zh-CN'}}

        response = client.post('/speech/recognize',
                               data=json.dumps(request_data),
                               content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'error' in data

    def test_speech_recognize_invalid_format(self, client):
        """测试无效的数据格式"""
        response = client.post('/speech/recognize',
                               data='invalid json',
                               content_type='application/json')

        assert response.status_code in [400, 500]


class TestTextToSpeech:
    """文本转语音测试"""

    @patch('src.app.tts_service')
    def test_speech_synthesize_success(self, mock_tts_service, client):
        """测试语音合成成功"""
        # 模拟 TTS 服务返回
        mock_tts_service.synthesize.return_value = (bytes([1, 2, 3]), 2.5)
        mock_tts_service.is_available.return_value = True

        request_data = {
            'text': '你好，世界',
            'config': {
                'voice': 'female',
                'language': 'zh',
                'speed': 1.0
            }
        }

        response = client.post('/speech/synthesize',
                               data=json.dumps(request_data),
                               content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'data' in data

    def test_speech_synthesize_missing_text(self, client):
        """测试缺少文本参数"""
        request_data = {'config': {'voice': 'female'}}

        response = client.post('/speech/synthesize',
                               data=json.dumps(request_data),
                               content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False

    @patch('src.app.tts_service')
    def test_speech_synthesize_with_custom_voice(self, mock_tts_service, client):
        """测试自定义音色的语音合成"""
        mock_tts_service.synthesize.return_value = (bytes([1, 2, 3]), 2.5)
        mock_tts_service.is_available.return_value = True

        request_data = {
            'text': '测试文本',
            'config': {
                'voice': 'male',
                'language': 'zh',
                'pitch': 1.2,
                'volume': 1.5
            }
        }

        response = client.post('/speech/synthesize',
                               data=json.dumps(request_data),
                               content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True


class TestDialectDetection:
    """方言检测测试"""

    @patch('src.app.dialect_service')
    @patch('src.app.audio_preprocessor')
    def test_dialect_detect_success(self, mock_preprocessor, mock_dialect_service, client):
        """测试方言检测成功"""
        mock_preprocessor.process.return_value = b'processed_audio'
        mock_dialect_service.detect.return_value = {
            'dialect': 'yue',
            'confidence': 0.88,
            'name': '粤语'
        }
        mock_dialect_service.is_available.return_value = True

        request_data = {
            'audio': list('mock_audio_data')
        }

        response = client.post('/speech/detect-dialect',
                               data=json.dumps(request_data),
                               content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'data' in data

    def test_dialect_detect_missing_audio(self, client):
        """测试缺少音频参数"""
        request_data = {}

        response = client.post('/speech/detect-dialect',
                               data=json.dumps(request_data),
                               content_type='application/json')

        assert response.status_code == 400


class TestVoiceCommand:
    """语音命令测试"""

    @patch('src.app.command_service')
    def test_voice_command_process_success(self, mock_command_service, client):
        """测试语音命令处理成功"""
        mock_command_service.process.return_value = {
            'intent': 'query',
            'entities': {'item': '天气'},
            'action': 'get_weather',
            'confidence': 0.92
        }
        mock_command_service.is_available.return_value = True

        request_data = {
            'text': '查询明天天气',
            'context': {'user_id': '123'}
        }

        response = client.post('/voice/command',
                               data=json.dumps(request_data),
                               content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'data' in data

    def test_voice_command_missing_text(self, client):
        """测试缺少文本参数"""
        request_data = {'context': {}}

        response = client.post('/voice/command',
                               data=json.dumps(request_data),
                               content_type='application/json')

        assert response.status_code == 400


class TestConfigurationEndpoints:
    """配置端点测试"""

    def test_get_dialects(self, client):
        """测试获取方言列表"""
        response = client.get('/config/dialects')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'data' in data
        assert 'dialects' in data['data']
        assert len(data['data']['dialects']) > 0

    def test_get_voices(self, client):
        """测试获取音色列表"""
        response = client.get('/config/voices')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'data' in data
        assert 'voices' in data['data']

    def test_get_commands(self, client):
        """测试获取命令列表"""
        response = client.get('/config/commands')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'data' in data
        assert 'commands' in data['data']
        assert 'wake_words' in data['data']


class TestMetrics:
    """指标端点测试"""

    @patch('src.app.cache_manager')
    @patch('src.app.speech_service')
    @patch('src.app.tts_service')
    @patch('src.app.dialect_service')
    @patch('src.app.command_service')
    def test_get_metrics(self, mock_command, mock_dialect, mock_tts,
                        mock_speech, mock_cache, client):
        """测试获取服务指标"""
        # 模拟各服务返回
        for service in [mock_speech, mock_tts, mock_dialect, mock_command]:
            service.is_available.return_value = True
            service.get_metrics.return_value = {'requests': 10, 'errors': 0}

        mock_cache.size.return_value = 100
        mock_cache.hits = 80
        mock_cache.misses = 20

        response = client.get('/metrics')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'data' in data
        assert 'timestamp' in data['data']
        assert 'uptime' in data['data']
        assert 'cache' in data['data']
        assert 'services' in data['data']


class TestErrorHandling:
    """错误处理测试"""

    def test_file_too_large_error(self, client):
        """测试文件过大错误"""
        # Flask 测试环境可能不支持此功能
        # 这里仅演示错误处理结构
        pass

    def test_not_found_error(self, client):
        """测试 404 错误"""
        response = client.get('/nonexistent-endpoint')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'error' in data

    def test_internal_server_error(self, app, client):
        """测试 500 错误"""
        # 通过触发一个未捕获的异常来测试
        with app.app_context():
            # 这里需要模拟一个会抛出异常的路由
            pass


class TestCacheManager:
    """缓存管理器测试"""

    def test_cache_manager_initialization(self):
        """测试缓存管理器初始化"""
        from utils.cache import CacheManager

        config = {
            'enabled': True,
            'type': 'memory',
            'max_size': 100,
            'ttl': 3600
        }

        cache = CacheManager(config)
        assert cache.enabled is True
        assert cache.cache_type == 'memory'
        assert cache.max_size == 100

    def test_cache_manager_get_set(self):
        """测试缓存读写"""
        from utils.cache import CacheManager

        config = {
            'enabled': True,
            'type': 'memory',
            'max_size': 100,
            'ttl': 60
        }

        cache = CacheManager(config)

        # 设置缓存
        cache.set('test_key', {'data': 'test_value'})
        assert cache.size() > 0

        # 获取缓存
        value = cache.get('test_key')
        assert value == {'data': 'test_value'}

    def test_cache_manager_delete(self):
        """测试缓存删除"""
        from utils.cache import CacheManager

        config = {'enabled': True, 'type': 'memory'}
        cache = CacheManager(config)

        cache.set('test_key', 'value')
        assert cache.size() > 0

        cache.delete('test_key')
        # 验证已删除
        value = cache.get('test_key')
        assert value is None

    def test_cache_manager_clear(self):
        """测试清空缓存"""
        from utils.cache import CacheManager

        config = {'enabled': True, 'type': 'memory'}
        cache = CacheManager(config)

        cache.set('key1', 'value1')
        cache.set('key2', 'value2')
        assert cache.size() == 2

        cache.clear()
        assert cache.size() == 0

    def test_cache_manager_generate_key(self):
        """测试生成缓存键"""
        from utils.cache import CacheManager

        config = {'enabled': True, 'type': 'memory'}
        cache = CacheManager(config)

        key1 = cache.generate_key('prefix', 'arg1', 'arg2', param1='value1')
        key2 = cache.generate_key('prefix', 'arg1', 'arg2', param1='value1')
        key3 = cache.generate_key('prefix', 'arg1', 'arg2', param1='value2')

        # 相同参数生成相同键
        assert key1 == key2

        # 不同参数生成不同键
        assert key1 != key3


class TestValidator:
    """验证器测试"""

    def test_validate_request_data_valid(self):
        """测试验证有效的请求数据"""
        from utils.validator import validate_request_data

        data = {'audio': b'fake_data', 'config': {}}
        required_fields = ['audio']

        result = validate_request_data(data, required_fields)
        assert result is True

    def test_validate_request_data_missing_field(self):
        """测试验证缺少字段"""
        from utils.validator import validate_request_data

        data = {'config': {}}
        required_fields = ['audio']

        result = validate_request_data(data, required_fields)
        assert result is False

    def test_validate_audio_file_valid(self):
        """测试验证有效的音频文件"""
        from utils.validator import validate_audio_file

        # 这里需要模拟一个有效的音频文件
        # 实际测试中需要传入真实的文件对象或字节流
        pass


class TestLogger:
    """日志工具测试"""

    def test_setup_logger(self):
        """测试设置日志"""
        from utils.logger import setup_logger
        import logging

        logger = setup_logger('test_logger', {'level': 'INFO'})
        assert logger.name == 'test_logger'
        assert logger.level == logging.INFO
