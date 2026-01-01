#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
人脸识别API服务器
提供HTTP接口供Node.js后端调用
"""

import os
import json
import logging
import asyncio
import aiohttp
import aiohttp_cors
from aiohttp import web, WSMsgType
from datetime import datetime, timedelta
import numpy as np
import cv2
import base64
import traceback
from typing import Dict, List, Optional, Any
import jwt
import hashlib
import tempfile
import uuid

from face_processor import (
    FaceProcessor, FaceDetectionResult, FaceFeatures,
    LivenessResult, FaceMatchResult,
    base64_to_image, image_to_base64, preprocess_image_from_bytes
)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FaceRecognitionAPI:
    """人脸识别API服务器"""

    def __init__(self, config: Dict[str, Any]):
        """初始化API服务器"""
        self.config = config
        self.app = web.Application()
        self.processor = FaceProcessor(config)
        self.active_sessions = {}  # 活跃会话
        self.rate_limits = {}      # 访问频率限制

        # JWT密钥
        self.jwt_secret = config.get('jwt_secret', 'your-secret-key')
        self.jwt_algorithm = 'HS256'

        # 配置路由
        self._setup_routes()
        self._setup_cors()

        # 启动时初始化
        self.startup_tasks = []

    def _setup_routes(self):
        """设置API路由"""
        # 人脸检测
        self.app.router.add_post('/api/face/detect', self.detect_faces)
        self.app.router.add_post('/api/face/detect_batch', self.detect_faces_batch)

        # 人脸注册
        self.app.router.add_post('/api/face/register', self.register_face)
        self.app.router.add_post('/api/face/register_with_liveness', self.register_face_with_liveness)

        # 人脸验证 (1:1)
        self.app.router.add_post('/api/face/verify', self.verify_face)
        self.app.router.add_post('/api/face/verify_with_liveness', self.verify_face_with_liveness)

        # 人脸识别 (1:N)
        self.app.router.add_post('/api/face/identify', self.identify_face)
        self.app.router.add_post('/api/face/identify_with_liveness', self.identify_face_with_liveness)

        # 活体检测
        self.app.router.add_post('/api/liveness/detect', self.detect_liveness)
        self.app.router.add_post('/api/liveness/detect_stream', self.detect_liveness_stream)

        # 特征比较
        self.app.router.add_post('/api/face/compare', self.compare_faces)

        # 数据库操作
        self.app.router.add_get('/api/features/{user_id}', self.get_user_features)
        self.app.router.put('/api/features/{user_id}', self.update_user_features)
        self.app.router.delete('/api/features/{user_id}', self.delete_user_features)

        # 批量操作
        self.app.router.add_post('/api/face/batch_verify', self.batch_verify)
        self.app.router.add_post('/api/face/batch_identify', self.batch_identify)

        # 系统状态
        self.app.router.add_get('/api/health', self.health_check)
        self.app.router.add_get('/api/stats', self.get_stats)

        # WebSocket实时处理
        self.app.router.add_get('/ws/face_processing', self.websocket_handler)

    def _setup_cors(self):
        """设置CORS"""
        cors = aiohttp_cors.setup(self.app, defaults={
            "*": aiohttp_cors.ResourceOptions(
                allow_credentials=True,
                expose_headers="*",
                allow_headers="*",
                allow_methods="*"
            )
        })

        for route in list(self.app.router.routes()):
            cors.add(route)

    async def _authenticate_request(self, request: web.Request) -> Optional[Dict]:
        """验证请求身份"""
        try:
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return None

            token = auth_header.split(' ')[1]
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])

            # 检查token是否过期
            if payload.get('exp', 0) < datetime.utcnow().timestamp():
                return None

            return payload

        except jwt.InvalidTokenError:
            return None
        except Exception as e:
            logger.error(f"身份验证失败: {e}")
            return None

    async def _check_rate_limit(self, request: web.Request, limit: int = 100, window: int = 60) -> bool:
        """检查访问频率限制"""
        client_ip = request.remote
        current_time = datetime.utcnow().timestamp()

        if client_ip not in self.rate_limits:
            self.rate_limits[client_ip] = []

        # 清理过期记录
        self.rate_limits[client_ip] = [
            t for t in self.rate_limits[client_ip]
            if current_time - t < window
        ]

        # 检查是否超过限制
        if len(self.rate_limits[client_ip]) >= limit:
            return False

        # 记录当前访问
        self.rate_limits[client_ip].append(current_time)
        return True

    def _create_session(self, user_id: str, permissions: List[str] = None) -> str:
        """创建会话"""
        session_id = str(uuid.uuid4())
        self.active_sessions[session_id] = {
            'user_id': user_id,
            'permissions': permissions or [],
            'created_at': datetime.utcnow(),
            'last_activity': datetime.utcnow(),
            'operations': []
        }
        return session_id

    def _validate_session(self, session_id: str) -> bool:
        """验证会话"""
        if session_id not in self.active_sessions:
            return False

        session = self.active_sessions[session_id]
        last_activity = session['last_activity']

        # 会话超时时间（30分钟）
        if (datetime.utcnow() - last_activity).total_seconds() > 1800:
            del self.active_sessions[session_id]
            return False

        # 更新最后活动时间
        session['last_activity'] = datetime.utcnow()
        return True

    def _log_operation(self, session_id: str, operation: str, result: str, details: Dict = None):
        """记录操作日志"""
        if session_id in self.active_sessions:
            session = self.active_sessions[session_id]
            session['operations'].append({
                'operation': operation,
                'result': result,
                'timestamp': datetime.utcnow(),
                'details': details or {}
            })

    async def detect_faces(self, request: web.Request) -> web.Response:
        """检测人脸"""
        try:
            # 验证身份
            if not await self._check_rate_limit(request):
                return web.json_response({'error': '访问频率过高'}, status=429)

            auth_result = await self._authenticate_request(request)
            if not auth_result:
                return web.json_response({'error': '身份验证失败'}, status=401)

            # 解析请求数据
            data = await request.json()
            image_data = data.get('image')
            if not image_data:
                return web.json_response({'error': '缺少图像数据'}, status=400)

            # 转换图像
            image = base64_to_image(image_data)

            # 检测人脸
            faces = self.processor.detect_faces(image)

            # 格式化结果
            result = {
                'faces': [
                    {
                        'bbox': face.bbox,
                        'confidence': face.confidence,
                        'landmarks': face.landmarks.tolist(),
                        'quality_score': face.quality_score
                    }
                    for face in faces
                ],
                'face_count': len(faces),
                'processing_time': 0  # 实际应用中需要计算
            }

            return web.json_response(result)

        except Exception as e:
            logger.error(f"人脸检测失败: {e}")
            return web.json_response({'error': str(e)}, status=500)

    async def register_face(self, request: web.Request) -> web.Response:
        """注册人脸"""
        try:
            # 验证身份
            auth_result = await self._authenticate_request(request)
            if not auth_result:
                return web.json_response({'error': '身份验证失败'}, status=401)

            # 解析请求数据
            data = await request.json()
            image_data = data.get('image')
            user_id = data.get('user_id')
            village_id = data.get('village_id')

            if not all([image_data, user_id, village_id]):
                return web.json_response({'error': '缺少必要参数'}, status=400)

            # 转换图像
            image = base64_to_image(image_data)

            # 检测人脸
            faces = self.processor.detect_faces(image)
            if not faces:
                return web.json_response({'error': '未检测到人脸'}, status=400)

            # 选择最佳人脸
            best_face = max(faces, key=lambda f: f.quality_score)
            if best_face.quality_score < 0.7:
                return web.json_response({'error': '人脸质量过低'}, status=400)

            # 提取人脸区域
            x, y, w, h = best_face.bbox
            face_image = image[y:y+h, x:x+w]

            # 提取特征
            features = self.processor.extract_features(face_image)

            # 生成注册ID
            registration_id = str(uuid.uuid4())

            # 保存特征数据（实际应用中应保存到数据库）
            feature_data = {
                'registration_id': registration_id,
                'user_id': user_id,
                'village_id': village_id,
                'feature_vector': features.feature_vector.tolist(),
                'feature_hash': features.feature_hash,
                'quality_score': features.quality_score,
                'extraction_method': features.extraction_method,
                'timestamp': features.timestamp.isoformat(),
                'face_bbox': best_face.bbox,
                'face_quality': best_face.quality_score
            }

            # 这里应该保存到数据库
            # await self.database.save_face_features(feature_data)

            result = {
                'success': True,
                'registration_id': registration_id,
                'user_id': user_id,
                'quality_score': features.quality_score,
                'message': '人脸注册成功'
            }

            return web.json_response(result)

        except Exception as e:
            logger.error(f"人脸注册失败: {e}")
            return web.json_response({'error': str(e)}, status=500)

    async def register_face_with_liveness(self, request: web.Request) -> web.Response:
        """注册人脸（带活体检测）"""
        try:
            # 验证身份
            auth_result = await self._authenticate_request(request)
            if not auth_result:
                return web.json_response({'error': '身份验证失败'}, status=401)

            # 解析请求数据
            data = await request.json()
            frames_data = data.get('frames', [])
            user_id = data.get('user_id')
            village_id = data.get('village_id')
            actions = data.get('actions', ['blink', 'mouth', 'head'])

            if not all([frames_data, user_id, village_id]):
                return web.json_response({'error': '缺少必要参数'}, status=400)

            if len(frames_data) < 3:
                return web.json_response({'error': '帧数不足'}, status=400)

            # 转换帧数据
            frames = [base64_to_image(frame_data) for frame_data in frames_data]

            # 活体检测
            liveness_result = self.processor.detect_liveness(frames, actions)

            if not liveness_result.is_live:
                return web.json_response({
                    'error': '活体检测失败',
                    'liveness_result': {
                        'is_live': liveness_result.is_live,
                        'confidence': liveness_result.confidence,
                        'detection_methods': liveness_result.detection_methods
                    }
                }, status=400)

            # 选择最佳质量的帧进行人脸注册
            best_frame_idx = 0
            best_face_quality = 0

            for i, frame in enumerate(frames):
                faces = self.processor.detect_faces(frame)
                if faces:
                    quality = max(f.quality_score for f in faces)
                    if quality > best_face_quality:
                        best_face_quality = quality
                        best_frame_idx = i

            # 使用最佳帧进行注册
            best_frame = frames[best_frame_idx]
            faces = self.processor.detect_faces(best_frame)

            if not faces:
                return web.json_response({'error': '最佳帧未检测到人脸'}, status=400)

            best_face = max(faces, key=lambda f: f.quality_score)
            x, y, w, h = best_face.bbox
            face_image = best_frame[y:y+h, x:x+w]

            # 提取特征
            features = self.processor.extract_features(face_image)

            # 生成注册ID
            registration_id = str(uuid.uuid4())

            # 保存特征数据
            feature_data = {
                'registration_id': registration_id,
                'user_id': user_id,
                'village_id': village_id,
                'feature_vector': features.feature_vector.tolist(),
                'feature_hash': features.feature_hash,
                'quality_score': features.quality_score,
                'extraction_method': features.extraction_method,
                'timestamp': features.timestamp.isoformat(),
                'liveness_verified': True,
                'liveness_confidence': liveness_result.confidence,
                'liveness_methods': liveness_result.detection_methods
            }

            # 保存到数据库
            # await self.database.save_face_features(feature_data)

            result = {
                'success': True,
                'registration_id': registration_id,
                'user_id': user_id,
                'quality_score': features.quality_score,
                'liveness_result': {
                    'is_live': liveness_result.is_live,
                    'confidence': liveness_result.confidence,
                    'detection_methods': liveness_result.detection_methods
                },
                'message': '人脸注册成功（已通过活体检测）'
            }

            return web.json_response(result)

        except Exception as e:
            logger.error(f"带活体检测的人脸注册失败: {e}")
            return web.json_response({'error': str(e)}, status=500)

    async def verify_face(self, request: web.Request) -> web.Response:
        """人脸验证 (1:1)"""
        try:
            # 验证身份
            auth_result = await self._authenticate_request(request)
            if not auth_result:
                return web.json_response({'error': '身份验证失败'}, status=401)

            # 解析请求数据
            data = await request.json()
            image_data = data.get('image')
            user_id = data.get('user_id')

            if not all([image_data, user_id]):
                return web.json_response({'error': '缺少必要参数'}, status=400)

            # 转换图像
            image = base64_to_image(image_data)

            # 检测人脸
            faces = self.processor.detect_faces(image)
            if not faces:
                return web.json_response({'error': '未检测到人脸'}, status=400)

            # 选择最佳人脸
            best_face = max(faces, key=lambda f: f.quality_score)
            x, y, w, h = best_face.bbox
            face_image = image[y:y+h, x:x+w]

            # 提取特征
            query_features = self.processor.extract_features(face_image)

            # 从数据库获取用户特征
            # stored_features = await self.database.get_user_features(user_id)
            stored_features = None  # 模拟数据

            if not stored_features:
                return web.json_response({'error': '用户未注册人脸'}, status=404)

            # 转换存储的特征
            stored_features_obj = FaceFeatures(
                feature_vector=np.array(stored_features['feature_vector']),
                feature_hash=stored_features['feature_hash'],
                quality_score=stored_features['quality_score'],
                extraction_method=stored_features['extraction_method'],
                timestamp=datetime.fromisoformat(stored_features['timestamp'])
            )

            # 比较特征
            match_result = self.processor.compare_faces(query_features, stored_features_obj)

            result = {
                'success': True,
                'is_match': match_result.is_match,
                'similarity': match_result.similarity,
                'confidence': match_result.confidence,
                'user_id': user_id,
                'query_quality': query_features.quality_score,
                'stored_quality': stored_features.quality_score
            }

            return web.json_response(result)

        except Exception as e:
            logger.error(f"人脸验证失败: {e}")
            return web.json_response({'error': str(e)}, status=500)

    async def detect_liveness(self, request: web.Request) -> web.Response:
        """活体检测"""
        try:
            # 验证身份
            if not await self._check_rate_limit(request, limit=50):
                return web.json_response({'error': '访问频率过高'}, status=429)

            auth_result = await self._authenticate_request(request)
            if not auth_result:
                return web.json_response({'error': '身份验证失败'}, status=401)

            # 解析请求数据
            data = await request.json()
            frames_data = data.get('frames', [])
            actions = data.get('actions', ['blink', 'mouth'])

            if not frames_data or len(frames_data) < 3:
                return web.json_response({'error': '帧数不足'}, status=400)

            # 转换帧数据
            frames = [base64_to_image(frame_data) for frame_data in frames_data]

            # 活体检测
            liveness_result = self.processor.detect_liveness(frames, actions)

            result = {
                'success': True,
                'is_live': liveness_result.is_live,
                'confidence': liveness_result.confidence,
                'detection_methods': liveness_result.detection_methods,
                'details': liveness_result.details,
                'frame_count': len(frames)
            }

            return web.json_response(result)

        except Exception as e:
            logger.error(f"活体检测失败: {e}")
            return web.json_response({'error': str(e)}, status=500)

    async def compare_faces(self, request: web.Request) -> web.Response:
        """比较两个人脸"""
        try:
            # 验证身份
            auth_result = await self._authenticate_request(request)
            if not auth_result:
                return web.json_response({'error': '身份验证失败'}, status=401)

            # 解析请求数据
            data = await request.json()
            image1_data = data.get('image1')
            image2_data = data.get('image2')

            if not all([image1_data, image2_data]):
                return web.json_response({'error': '缺少图像数据'}, status=400)

            # 转换图像
            image1 = base64_to_image(image1_data)
            image2 = base64_to_image(image2_data)

            # 检测人脸
            faces1 = self.processor.detect_faces(image1)
            faces2 = self.processor.detect_faces(image2)

            if not faces1 or not faces2:
                return web.json_response({'error': '未检测到人脸'}, status=400)

            # 选择最佳人脸
            best_face1 = max(faces1, key=lambda f: f.quality_score)
            best_face2 = max(faces2, key=lambda f: f.quality_score)

            x1, y1, w1, h1 = best_face1.bbox
            x2, y2, w2, h2 = best_face2.bbox

            face1_img = image1[y1:y1+h1, x1:x1+w1]
            face2_img = image2[y2:y2+h2, x2:x2+w2]

            # 提取特征
            features1 = self.processor.extract_features(face1_img)
            features2 = self.processor.extract_features(face2_img)

            # 比较特征
            match_result = self.processor.compare_faces(features1, features2)

            result = {
                'success': True,
                'is_match': match_result.is_match,
                'similarity': match_result.similarity,
                'confidence': match_result.confidence,
                'face1_quality': features1.quality_score,
                'face2_quality': features2.quality_score,
                'face1_bbox': best_face1.bbox,
                'face2_bbox': best_face2.bbox
            }

            return web.json_response(result)

        except Exception as e:
            logger.error(f"人脸比较失败: {e}")
            return web.json_response({'error': str(e)}, status=500)

    async def health_check(self, request: web.Request) -> web.Response:
        """健康检查"""
        try:
            status = {
                'status': 'healthy',
                'timestamp': datetime.utcnow().isoformat(),
                'version': '1.0.0',
                'processor_status': 'initialized' if self.processor else 'not_initialized',
                'active_sessions': len(self.active_sessions),
                'memory_usage': self._get_memory_usage()
            }

            return web.json_response(status)

        except Exception as e:
            logger.error(f"健康检查失败: {e}")
            return web.json_response({
                'status': 'unhealthy',
                'error': str(e)
            }, status=500)

    async def get_stats(self, request: web.Request) -> web.Response:
        """获取统计信息"""
        try:
            stats = {
                'timestamp': datetime.utcnow().isoformat(),
                'active_sessions': len(self.active_sessions),
                'total_operations': sum(len(s['operations']) for s in self.active_sessions.values()),
                'processor_info': {
                    'model_dir': self.config.get('model_dir'),
                    'detection_threshold': self.config.get('detection_threshold'),
                    'recognition_threshold': self.config.get('recognition_threshold'),
                    'liveness_threshold': self.config.get('liveness_threshold')
                },
                'system_info': {
                    'memory_usage': self._get_memory_usage(),
                    'cpu_usage': self._get_cpu_usage()
                }
            }

            return web.json_response(stats)

        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return web.json_response({'error': str(e)}, status=500)

    async def websocket_handler(self, request: web.Request):
        """WebSocket处理器"""
        ws = web.WebSocketResponse()
        await ws.prepare(request)

        logger.info("WebSocket连接建立")

        try:
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        response = await self._handle_websocket_message(data, ws)
                        await ws.send_str(json.dumps(response))
                    except Exception as e:
                        error_response = {'error': str(e), 'type': 'error'}
                        await ws.send_str(json.dumps(error_response))

                elif msg.type == WSMsgType.ERROR:
                    logger.error(f'WebSocket错误: {ws.exception()}')

        except Exception as e:
            logger.error(f"WebSocket处理异常: {e}")

        finally:
            logger.info("WebSocket连接关闭")

        return ws

    async def _handle_websocket_message(self, data: Dict, ws: web.WebSocketResponse) -> Dict:
        """处理WebSocket消息"""
        message_type = data.get('type')
        session_id = data.get('session_id')

        if message_type == 'start_session':
            user_id = data.get('user_id')
            permissions = data.get('permissions', [])
            session_id = self._create_session(user_id, permissions)
            return {'type': 'session_started', 'session_id': session_id}

        elif message_type == 'process_frame':
            if not self._validate_session(session_id):
                return {'type': 'error', 'error': 'Invalid session'}

            image_data = data.get('image')
            if image_data:
                image = base64_to_image(image_data)
                faces = self.processor.detect_faces(image)

                return {
                    'type': 'frame_processed',
                    'faces': [
                        {
                            'bbox': face.bbox,
                            'confidence': face.confidence,
                            'quality_score': face.quality_score
                        }
                        for face in faces
                    ]
                }

        else:
            return {'type': 'error', 'error': 'Unknown message type'}

    def _get_memory_usage(self) -> float:
        """获取内存使用率"""
        try:
            import psutil
            return psutil.virtual_memory().percent
        except ImportError:
            return 0.0

    def _get_cpu_usage(self) -> float:
        """获取CPU使用率"""
        try:
            import psutil
            return psutil.cpu_percent(interval=1)
        except ImportError:
            return 0.0

    async def start_server(self, host: str = 'localhost', port: int = 8080):
        """启动服务器"""
        runner = web.AppRunner(self.app)
        await runner.setup()

        site = web.TCPSite(runner, host, port)
        await site.start()

        logger.info(f"人脸识别API服务器已启动: http://{host}:{port}")
        return runner

def create_app(config: Dict[str, Any] = None) -> web.Application:
    """创建应用实例"""
    if config is None:
        config = {
            'model_dir': './models',
            'detection_threshold': 0.7,
            'recognition_threshold': 0.8,
            'liveness_threshold': 0.85,
            'jwt_secret': 'your-secret-key-change-in-production'
        }

    api = FaceRecognitionAPI(config)
    return api.app

async def main():
    """主函数"""
    # 配置
    config = {
        'model_dir': os.environ.get('FACE_MODEL_DIR', './models'),
        'detection_threshold': float(os.environ.get('FACE_DETECTION_THRESHOLD', 0.7)),
        'recognition_threshold': float(os.environ.get('FACE_RECOGNITION_THRESHOLD', 0.8)),
        'liveness_threshold': float(os.environ.get('FACE_LIVENESS_THRESHOLD', 0.85)),
        'jwt_secret': os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production'),
        'host': os.environ.get('API_HOST', 'localhost'),
        'port': int(os.environ.get('API_PORT', 8080))
    }

    # 创建API实例
    api = FaceRecognitionAPI(config)

    # 启动服务器
    runner = await api.start_server(config['host'], config['port'])

    try:
        # 保持服务器运行
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("正在关闭服务器...")
    finally:
        await runner.cleanup()

if __name__ == '__main__':
    asyncio.run(main())