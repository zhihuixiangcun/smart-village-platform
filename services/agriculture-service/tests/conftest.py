"""
农业服务单元测试配置
"""

import pytest
from httpx import AsyncClient
from app import app


@pytest.fixture
def client():
    """创建测试客户端"""
    return AsyncClient(app=app, base_url="http://test")
