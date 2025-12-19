"""
智慧乡村平台 Python SDK
版本: 1.0.0
描述: 提供智慧乡村平台API的Python封装
"""

import json
import time
import hashlib
import requests
from typing import Dict, List, Optional, Union, Any, BinaryIO
from dataclasses import dataclass
from enum import Enum
import logging
from urllib.parse import urljoin

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HTTPMethod(Enum):
    """HTTP方法枚举"""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"


@dataclass
class APIError(Exception):
    """API错误类"""
    message: str
    status_code: int = 500
    code: str = "UNKNOWN_ERROR"
    details: Dict = None

    def __init__(self, message: str, status_code: int = 500, code: str = "UNKNOWN_ERROR", details: Dict = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details or {}


class SmartVillageSDK:
    """智慧乡村平台SDK核心类"""

    def __init__(
        self,
        base_url: str = "https://api.smartvillage.com/api/v1",
        api_key: Optional[str] = None,
        timeout: int = 30,
        village_id: Optional[str] = None
    ):
        """
        初始化SDK

        Args:
            base_url: API基础URL
            api_key: API密钥
            timeout: 请求超时时间(秒)
            village_id: 村庄ID
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.village_id = village_id
        self.token = None
        self.session = requests.Session()

        # 设置默认请求头
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'SmartVillage-Python-SDK/1.0.0'
        })

    def set_token(self, token: str) -> None:
        """设置认证令牌"""
        self.token = token
        self.session.headers['Authorization'] = f'Bearer {token}'

    def clear_token(self) -> None:
        """清除认证令牌"""
        self.token = None
        if 'Authorization' in self.session.headers:
            del self.session.headers['Authorization']

    def set_village_id(self, village_id: str) -> None:
        """设置村庄ID"""
        self.village_id = village_id
        self.session.headers['X-Village-Id'] = village_id

    def set_api_key(self, api_key: str) -> None:
        """设置API密钥"""
        self.api_key = api_key
        self.session.headers['X-API-Key'] = api_key

    def _build_url(self, endpoint: str) -> str:
        """构建完整URL"""
        return urljoin(self.base_url + '/', endpoint.lstrip('/'))

    def _prepare_headers(self, headers: Optional[Dict] = None) -> Dict:
        """准备请求头"""
        final_headers = self.session.headers.copy()
        if headers:
            final_headers.update(headers)
        return final_headers

    def _handle_response(self, response: requests.Response) -> Dict:
        """处理API响应"""
        try:
            if response.headers.get('content-type', '').startswith('application/json'):
                data = response.json()
            else:
                data = {'success': False, 'data': response.content}
        except ValueError:
            data = {'success': False, 'error': 'Invalid JSON response'}

        if not response.ok:
            error_code = data.get('code', 'UNKNOWN_ERROR')
            error_message = data.get('error', response.reason)
            raise APIError(
                message=error_message,
                status_code=response.status_code,
                code=error_code,
                details=data
            )

        return data

    def request(
        self,
        method: HTTPMethod,
        endpoint: str,
        data: Optional[Union[Dict, str]] = None,
        params: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        files: Optional[Dict] = None
    ) -> Dict:
        """
        发送HTTP请求

        Args:
            method: HTTP方法
            endpoint: API端点
            data: 请求数据
            params: URL参数
            headers: 额外的请求头
            files: 上传的文件

        Returns:
            API响应数据

        Raises:
            APIError: API请求失败
        """
        url = self._build_url(endpoint)
        final_headers = self._prepare_headers(headers)

        # 文件上传时不需要Content-Type头
        if files:
            final_headers.pop('Content-Type', None)

        try:
            logger.info(f"发送 {method.value} 请求到: {url}")

            response = self.session.request(
                method=method.value,
                url=url,
                json=data if not files else None,
                data=data if files else None,
                params=params,
                headers=final_headers,
                files=files,
                timeout=self.timeout
            )

            return self._handle_response(response)

        except requests.exceptions.Timeout:
            raise APIError("请求超时", 408, "TIMEOUT")
        except requests.exceptions.ConnectionError:
            raise APIError("连接错误", 503, "CONNECTION_ERROR")
        except requests.exceptions.RequestException as e:
            raise APIError(f"请求失败: {str(e)}", 500, "REQUEST_ERROR")

    def get(self, endpoint: str, params: Optional[Dict] = None, **kwargs) -> Dict:
        """GET请求"""
        return self.request(HTTPMethod.GET, endpoint, params=params, **kwargs)

    def post(self, endpoint: str, data: Optional[Dict] = None, **kwargs) -> Dict:
        """POST请求"""
        return self.request(HTTPMethod.POST, endpoint, data=data, **kwargs)

    def put(self, endpoint: str, data: Optional[Dict] = None, **kwargs) -> Dict:
        """PUT请求"""
        return self.request(HTTPMethod.PUT, endpoint, data=data, **kwargs)

    def delete(self, endpoint: str, **kwargs) -> Dict:
        """DELETE请求"""
        return self.request(HTTPMethod.DELETE, endpoint, **kwargs)

    def patch(self, endpoint: str, data: Optional[Dict] = None, **kwargs) -> Dict:
        """PATCH请求"""
        return self.request(HTTPMethod.PATCH, endpoint, data=data, **kwargs)

    def upload_file(
        self,
        endpoint: str,
        file_path: str,
        file_key: str = "file",
        additional_data: Optional[Dict] = None,
        **kwargs
    ) -> Dict:
        """
        上传文件

        Args:
            endpoint: 上传端点
            file_path: 文件路径
            file_key: 文件字段名
            additional_data: 额外的表单数据

        Returns:
            上传结果
        """
        files = {}
        additional_data = additional_data or {}

        try:
            with open(file_path, 'rb') as f:
                files[file_key] = f
                return self.request(HTTPMethod.POST, endpoint, data=additional_data, files=files, **kwargs)
        except FileNotFoundError:
            raise APIError(f"文件不存在: {file_path}", 400, "FILE_NOT_FOUND")
        except Exception as e:
            raise APIError(f"文件读取失败: {str(e)}", 500, "FILE_READ_ERROR")

    def upload_binary(
        self,
        endpoint: str,
        file_data: BinaryIO,
        filename: str,
        file_key: str = "file",
        additional_data: Optional[Dict] = None,
        **kwargs
    ) -> Dict:
        """
        上传二进制数据

        Args:
            endpoint: 上传端点
            file_data: 文件数据流
            filename: 文件名
            file_key: 文件字段名
            additional_data: 额外的表单数据

        Returns:
            上传结果
        """
        files = {file_key: (filename, file_data)}
        additional_data = additional_data or {}
        return self.request(HTTPMethod.POST, endpoint, data=additional_data, files=files, **kwargs)


class AuthAPI:
    """认证相关API"""

    def __init__(self, sdk: SmartVillageSDK):
        self.sdk = sdk

    def login(self, credentials: Dict) -> Dict:
        """
        用户登录

        Args:
            credentials: 登录凭据

        Returns:
            登录结果
        """
        response = self.sdk.post('/auth/login', credentials)
        if response.get('success') and response['data'].get('accessToken'):
            self.sdk.set_token(response['data']['accessToken'])
        return response

    def register(self, user_data: Dict) -> Dict:
        """
        用户注册

        Args:
            user_data: 用户数据

        Returns:
            注册结果
        """
        response = self.sdk.post('/auth/register', user_data)
        if response.get('success') and response['data'].get('accessToken'):
            self.sdk.set_token(response['data']['accessToken'])
        return response

    def refresh_token(self, refresh_token: str) -> Dict:
        """
        刷新令牌

        Args:
            refresh_token: 刷新令牌

        Returns:
            刷新结果
        """
        response = self.sdk.post('/auth/refresh', {'refreshToken': refresh_token})
        if response.get('success') and response['data'].get('accessToken'):
            self.sdk.set_token(response['data']['accessToken'])
        return response

    def logout(self) -> Dict:
        """退出登录"""
        self.sdk.clear_token()
        return {'success': True, 'message': '已退出登录'}


class UserAPI:
    """用户管理API"""

    def __init__(self, sdk: SmartVillageSDK):
        self.sdk = sdk

    def get_users(
        self,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        role: Optional[str] = None,
        village_id: Optional[str] = None
    ) -> Dict:
        """
        获取用户列表

        Args:
            page: 页码
            limit: 每页数量
            search: 搜索关键词
            role: 用户角色
            village_id: 村庄ID

        Returns:
            用户列表
        """
        params = {
            'page': page,
            'limit': limit
        }
        if search:
            params['search'] = search
        if role:
            params['role'] = role
        if village_id:
            params['villageId'] = village_id

        return self.sdk.get('/users', params=params)

    def get_user(self, user_id: str) -> Dict:
        """
        获取用户详情

        Args:
            user_id: 用户ID

        Returns:
            用户详情
        """
        return self.sdk.get(f'/users/{user_id}')

    def create_user(self, user_data: Dict) -> Dict:
        """
        创建用户

        Args:
            user_data: 用户数据

        Returns:
            创建结果
        """
        return self.sdk.post('/users', user_data)

    def update_user(self, user_id: str, user_data: Dict) -> Dict:
        """
        更新用户信息

        Args:
            user_id: 用户ID
            user_data: 更新数据

        Returns:
            更新结果
        """
        return self.sdk.put(f'/users/{user_id}', user_data)

    def delete_user(self, user_id: str) -> Dict:
        """
        删除用户

        Args:
            user_id: 用户ID

        Returns:
            删除结果
        """
        return self.sdk.delete(f'/users/{user_id}')


class VoiceAPI:
    """语音交互API"""

    def __init__(self, sdk: SmartVillageSDK):
        self.sdk = sdk

    def speech_to_text(
        self,
        audio_file_path: str,
        dialect: str = 'mandarin'
    ) -> Dict:
        """
        语音转文字

        Args:
            audio_file_path: 音频文件路径
            dialect: 方言类型

        Returns:
            识别结果
        """
        additional_data = {'dialect': dialect}
        return self.sdk.upload_file('/voice/speech-to-text', audio_file_path, additional_data=additional_data)

    def speech_to_text_binary(
        self,
        audio_data: BinaryIO,
        filename: str,
        dialect: str = 'mandarin'
    ) -> Dict:
        """
        语音转文字（二进制数据）

        Args:
            audio_data: 音频数据流
            filename: 文件名
            dialect: 方言类型

        Returns:
            识别结果
        """
        additional_data = {'dialect': dialect}
        return self.sdk.upload_binary('/voice/speech-to-text', audio_data, filename, additional_data=additional_data)

    def text_to_speech(
        self,
        text: str,
        dialect: str = 'mandarin',
        voice_style: str = 'female'
    ) -> Dict:
        """
        文字转语音

        Args:
            text: 文字内容
            dialect: 方言类型
            voice_style: 声音风格

        Returns:
            合成结果
        """
        data = {
            'text': text,
            'dialect': dialect,
            'voiceStyle': voice_style
        }
        return self.sdk.post('/voice/text-to-speech', data)

    def detect_dialect(self, audio_file_path: str) -> Dict:
        """
        方言自动识别

        Args:
            audio_file_path: 音频文件路径

        Returns:
            识别结果
        """
        return self.sdk.upload_file('/voice/dialect-detect', audio_file_path)


class FaceAPI:
    """人脸识别API"""

    def __init__(self, sdk: SmartVillageSDK):
        self.sdk = sdk

    def register(
        self,
        user_id: str,
        face_images: List[str],
        live_data: Optional[Dict] = None
    ) -> Dict:
        """
        人脸注册

        Args:
            user_id: 用户ID
            face_images: 人脸图片数据(base64)
            live_data: 活体检测数据

        Returns:
            注册结果
        """
        data = {
            'userId': user_id,
            'faceImages': face_images,
            'liveData': live_data or {}
        }
        return self.sdk.post('/face/register', data)

    def verify(
        self,
        face_image: str,
        user_id: str,
        live_data: Optional[Dict] = None
    ) -> Dict:
        """
        人脸验证

        Args:
            face_image: 人脸图片数据(base64)
            user_id: 用户ID
            live_data: 活体检测数据

        Returns:
            验证结果
        """
        data = {
            'faceImage': face_image,
            'userId': user_id,
            'liveData': live_data or {}
        }
        return self.sdk.post('/face/verify', data)

    def liveness(self, video_file_path: str, challenge: str) -> Dict:
        """
        活体检测

        Args:
            video_file_path: 视频文件路径
            challenge: 挑战动作

        Returns:
            检测结果
        """
        additional_data = {'challenge': challenge}
        return self.sdk.upload_file('/face/liveness', video_file_path, additional_data=additional_data)

    def search(self, face_image: str, max_results: int = 10) -> Dict:
        """
        人脸搜索

        Args:
            face_image: 人脸图片数据(base64)
            max_results: 最大结果数

        Returns:
            搜索结果
        """
        data = {
            'faceImage': face_image,
            'maxResults': max_results
        }
        return self.sdk.post('/face/search', data)


class AIServiceAPI:
    """AI智能服务API"""

    def __init__(self, sdk: SmartVillageSDK):
        self.sdk = sdk

    def recognize_invoice(self, image_file_path: str) -> Dict:
        """
        发票OCR识别

        Args:
            image_file_path: 发票图片路径

        Returns:
            识别结果
        """
        return self.sdk.upload_file('/ai/ocr/invoice', image_file_path)

    def auto_fill_form(self, form_data: Dict) -> Dict:
        """
        智能填表

        Args:
            form_data: 表单数据

        Returns:
            填表结果
        """
        return self.sdk.post('/ai/form/auto-fill', form_data)

    def calculate_policy_subsidy(self, calculation_data: Dict) -> Dict:
        """
        政策补贴计算

        Args:
            calculation_data: 计算数据

        Returns:
            计算结果
        """
        return self.sdk.post('/ai/policy-calculator', calculation_data)


class ResidentAPI:
    """村民管理API"""

    def __init__(self, sdk: SmartVillageSDK):
        self.sdk = sdk

    def get_residents(
        self,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        household_type: Optional[str] = None,
        health_status: Optional[str] = None
    ) -> Dict:
        """
        获取村民列表

        Args:
            page: 页码
            limit: 每页数量
            search: 搜索关键词
            household_type: 家庭类型
            health_status: 健康状态

        Returns:
            村民列表
        """
        params = {
            'page': page,
            'limit': limit
        }
        if search:
            params['search'] = search
        if household_type:
            params['householdType'] = household_type
        if health_status:
            params['healthStatus'] = health_status

        return self.sdk.get('/residents', params=params)

    def create_resident(self, resident_data: Dict) -> Dict:
        """
        创建村民档案

        Args:
            resident_data: 村民数据

        Returns:
            创建结果
        """
        return self.sdk.post('/residents', resident_data)

    def get_qr_code(self, resident_id: str) -> Dict:
        """
        获取村民二维码

        Args:
            resident_id: 村民ID

        Returns:
            二维码数据
        """
        return self.sdk.get(f'/residents/{resident_id}/qrcode')


class VillageMapAPI:
    """村情地图API"""

    def __init__(self, sdk: SmartVillageSDK):
        self.sdk = sdk

    def get_village_map(self, village_id: str, layers: List[str] = None) -> Dict:
        """
        获取村情地图信息

        Args:
            village_id: 村庄ID
            layers: 地图图层

        Returns:
            地图信息
        """
        params = {'villageId': village_id}
        if layers:
            params['layers'] = ','.join(layers)

        return self.sdk.get('/map/village-info', params=params)

    def get_resident_locations(self, village_id: str, emergency: bool = False) -> Dict:
        """
        获取村民位置

        Args:
            village_id: 村庄ID
            emergency: 是否紧急情况

        Returns:
            位置信息
        """
        params = {
            'villageId': village_id,
            'emergency': emergency
        }
        return self.sdk.get('/map/resident-location', params=params)

    def plan_emergency_route(self, route_data: Dict) -> Dict:
        """
        应急路径规划

        Args:
            route_data: 路径规划数据

        Returns:
            路径规划结果
        """
        return self.sdk.post('/map/emergency-route', route_data)

    def get_rescue_equipment(self, equipment_type: str, village_id: str) -> Dict:
        """
        获取救援设备位置

        Args:
            equipment_type: 设备类型
            village_id: 村庄ID

        Returns:
            设备位置信息
        """
        params = {
            'equipmentType': equipment_type,
            'villageId': village_id
        }
        return self.sdk.get('/map/rescue-equipment', params=params)


class DutyScheduleAPI:
    """智能值班表API"""

    def __init__(self, sdk: SmartVillageSDK):
        self.sdk = sdk

    def get_schedule(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        department: Optional[str] = None
    ) -> Dict:
        """
        获取值班表

        Args:
            start_date: 开始日期
            end_date: 结束日期
            department: 部门

        Returns:
            值班表数据
        """
        params = {}
        if start_date:
            params['startDate'] = start_date
        if end_date:
            params['endDate'] = end_date
        if department:
            params['department'] = department

        return self.sdk.get('/duty/schedule', params=params)

    def generate_schedule(self, schedule_data: Dict) -> Dict:
        """
        生成值班表

        Args:
            schedule_data: 排班数据

        Returns:
            生成结果
        """
        return self.sdk.post('/duty/schedule', schedule_data)

    def emergency_call(self, emergency_data: Dict) -> Dict:
        """
        紧急呼叫值班人员

        Args:
            emergency_data: 紧急呼叫数据

        Returns:
            呼叫结果
        """
        return self.sdk.post('/duty/emergency-call', emergency_data)


class EmergencyAPI:
    """应急管理API"""

    def __init__(self, sdk: SmartVillageSDK):
        self.sdk = sdk

    def get_reports(
        self,
        page: int = 1,
        limit: int = 20,
        status: Optional[str] = None,
        type: Optional[str] = None
    ) -> Dict:
        """
        获取应急报告

        Args:
            page: 页码
            limit: 每页数量
            status: 状态
            type: 类型

        Returns:
            应急报告列表
        """
        params = {
            'page': page,
            'limit': limit
        }
        if status:
            params['status'] = status
        if type:
            params['type'] = type

        return self.sdk.get('/emergency/reports', params=params)

    def create_report(self, report_data: Dict) -> Dict:
        """
        创建应急报告

        Args:
            report_data: 报告数据

        Returns:
            创建结果
        """
        return self.sdk.post('/emergency/reports', report_data)

    def broadcast_alert(self, broadcast_data: Dict) -> Dict:
        """
        广播应急警报

        Args:
            broadcast_data: 广播数据

        Returns:
            广播结果
        """
        return self.sdk.post('/emergency/broadcast', broadcast_data)


class MonitoringAPI:
    """监控API"""

    def __init__(self, sdk: SmartVillageSDK):
        self.sdk = sdk

    def get_status(self) -> Dict:
        """
        获取系统监控状态

        Returns:
            监控状态
        """
        return self.sdk.get('/monitoring/status')

    def subscribe_realtime(self, callback_func=None):
        """
        订阅实时数据

        Args:
            callback_func: 回调函数

        Returns:
            SSE事件流
        """
        # 注意：这是简化实现，实际生产环境建议使用专门的SSE客户端库
        import sseclient

        url = self.sdk._build_url('/monitoring/realtime')
        headers = self.sdk._prepare_headers()

        try:
            response = requests.get(
                url,
                headers=headers,
                stream=True,
                timeout=self.sdk.timeout
            )

            if not response.ok:
                raise APIError("Failed to subscribe to realtime data", response.status_code)

            client = sseclient.SSEClient(response)

            for event in client.events():
                if event.data:
                    try:
                        data = json.loads(event.data)
                        if callback_func:
                            callback_func(data)
                        yield data
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON in SSE event: {event.data}")

        except Exception as e:
            raise APIError(f"Realtime subscription failed: {str(e)}")


class SmartVillageClient:
    """智慧乡村平台客户端"""

    def __init__(self, **kwargs):
        """
        初始化客户端

        Args:
            base_url: API基础URL
            api_key: API密钥
            timeout: 请求超时时间(秒)
            village_id: 村庄ID
        """
        self.sdk = SmartVillageSDK(**kwargs)

        # 初始化API模块
        self.auth = AuthAPI(self.sdk)
        self.users = UserAPI(self.sdk)
        self.voice = VoiceAPI(self.sdk)
        self.face = FaceAPI(self.sdk)
        self.ai = AIServiceAPI(self.sdk)
        self.residents = ResidentAPI(self.sdk)
        self.map = VillageMapAPI(self.sdk)
        self.duty = DutyScheduleAPI(self.sdk)
        self.emergency = EmergencyAPI(self.sdk)
        self.monitoring = MonitoringAPI(self.sdk)

    # 便捷方法
    def set_token(self, token: str) -> None:
        """设置认证令牌"""
        self.sdk.set_token(token)

    def clear_token(self) -> None:
        """清除认证令牌"""
        self.sdk.clear_token()

    def set_village_id(self, village_id: str) -> None:
        """设置村庄ID"""
        self.sdk.set_village_id(village_id)

    def set_api_key(self, api_key: str) -> None:
        """设置API密钥"""
        self.sdk.set_api_key(api_key)


# 使用示例和测试代码
if __name__ == "__main__":
    # 创建客户端实例
    client = SmartVillageClient(
        base_url="http://localhost:3001/api/v1",
        timeout=30
    )

    try:
        # 示例1：用户登录
        print("=== 用户登录示例 ===")
        login_result = client.auth.login({
            "type": "password",
            "username": "admin@smartvillage.com",
            "password": "admin123"
        })
        print("登录结果:", login_result)

        # 示例2：获取用户列表
        print("\n=== 获取用户列表示例 ===")
        users_result = client.users.get_users(page=1, limit=10)
        print("用户列表:", users_result)

        # 示例3：语音转文字
        print("\n=== 语音识别示例 ===")
        # 注意：需要提供真实的音频文件路径
        # speech_result = client.voice.speech_to_text("test_audio.wav", dialect="mandarin")
        # print("语音识别结果:", speech_result)

        # 示例4：获取村情地图
        print("\n=== 获取村情地图示例 ===")
        map_result = client.map.get_village_map(
            village_id="village_001",
            layers=["boundaries", "buildings", "roads"]
        )
        print("地图信息:", map_result)

        # 示例5：获取系统监控状态
        print("\n=== 系统监控示例 ===")
        monitoring_result = client.monitoring.get_status()
        print("监控状态:", monitoring_result)

    except APIError as e:
        print(f"API错误: {e.message}")
        print(f"状态码: {e.status_code}")
        print(f"错误代码: {e.code}")
        if e.details:
            print(f"详细信息: {e.details}")
    except Exception as e:
        print(f"未知错误: {str(e)}")