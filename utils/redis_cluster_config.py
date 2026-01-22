"""
Redis Cluster 配置模块
支持农业服务、语音服务和人脸识别服务的 Redis Cluster 集成
"""

import os
from typing import List, Dict, Union


def get_redis_cluster_config(service_name: str = "smart-village") -> Dict[str, Union[str, int, List[Dict[str, int]], bool]]:
    """
    获取 Redis Cluster 配置

    Args:
        service_name: 服务名称（用于配置命名空间）

    Returns:
        Redis Cluster 配置字典
    """
    mode = os.getenv(f"{service_name.upper()}_REDIS_MODE", "standalone")

    if mode == "cluster":
        return {
            "mode": "cluster",
            "startup_nodes": [
                {"host": os.getenv(f"{service_name.upper()}_REDIS_NODE1_HOST", "localhost"),
                 "port": int(os.getenv(f"{service_name.upper()}_REDIS_NODE1_PORT", 7001))},
                {"host": os.getenv(f"{service_name.upper()}_REDIS_NODE2_HOST", "localhost"),
                 "port": int(os.getenv(f"{service_name.upper()}_REDIS_NODE2_PORT", 7002))},
                {"host": os.getenv(f"{service_name.upper()}_REDIS_NODE3_HOST", "localhost"),
                 "port": int(os.getenv(f"{service_name.upper()}_REDIS_NODE3_PORT", 7003))},
            ],
            "password": os.getenv(f"{service_name.upper()}_REDIS_PASSWORD", ""),
            "skip_full_coverage_check": os.getenv(f"{service_name.upper()}_REDIS_SKIP_FULL_COVERAGE", "false").lower() == "true",
            "max_connections": int(os.getenv(f"{service_name.upper()}_REDIS_MAX_CONNECTIONS", 50)),
            "socket_timeout": int(os.getenv(f"{service_name.upper()}_REDIS_SOCKET_TIMEOUT", 5)),
            "socket_connect_timeout": int(os.getenv(f"{service_name.upper()}_REDIS_SOCKET_CONNECT_TIMEOUT", 5))
        }
    else:
        return {
            "mode": "standalone",
            "host": os.getenv(f"{service_name.upper()}_REDIS_HOST", "localhost"),
            "port": int(os.getenv(f"{service_name.upper()}_REDIS_PORT", 6379)),
            "db": int(os.getenv(f"{service_name.upper()}_REDIS_DB", 0)),
            "password": os.getenv(f"{service_name.upper()}_REDIS_PASSWORD", ""),
            "socket_timeout": int(os.getenv(f"{service_name.upper()}_REDIS_SOCKET_TIMEOUT", 5)),
            "socket_connect_timeout": int(os.getenv(f"{service_name.upper()}_REDIS_SOCKET_CONNECT_TIMEOUT", 5))
        }


def get_redis_cluster_startup_nodes() -> List[Dict[str, int]]:
    """
    获取 Redis Cluster 启动节点列表（用于 docker-compose）

    Returns:
        启动节点列表
    """
    return [
        {"host": "redis-master-1", "port": 7001},
        {"host": "redis-master-2", "port": 7002},
        {"host": "redis-master-3", "port": 7003},
    ]


# 环境变量模板（用于 .env.example 文件）
REDIS_CLUSTER_ENV_TEMPLATE = """
# Redis Cluster Configuration
REDIS_MODE=cluster  # standalone or cluster

# Redis Cluster Nodes (when REDIS_MODE=cluster)
REDIS_NODE1_HOST=localhost
REDIS_NODE1_PORT=7001
REDIS_NODE2_HOST=localhost
REDIS_NODE2_PORT=7002
REDIS_NODE3_HOST=localhost
REDIS_NODE3_PORT=7003

# Redis Standalone (when REDIS_MODE=standalone)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Redis Authentication
REDIS_PASSWORD=your_redis_password_here

# Redis Connection Settings
REDIS_SKIP_FULL_COVERAGE=false  # Set to true for development only
REDIS_MAX_CONNECTIONS=50
REDIS_SOCKET_TIMEOUT=5
REDIS_SOCKET_CONNECT_TIMEOUT=5
"""
