"""
Redis Cluster 客户端适配器
支持自动重连、故障转移、连接池管理
"""

import json
import time
import logging
from typing import Any, Optional, List, Dict, Union
from contextlib import contextmanager
from redis.cluster import RedisCluster
from redis.exceptions import (
    RedisClusterException,
    ConnectionError,
    TimeoutError,
    ClusterDownError
)

logger = logging.getLogger(__name__)


class RedisClusterAdapter:
    """
    Redis Cluster 客户端适配器

    特性：
    - 自动重连和故障转移
    - 连接池管理
    - 健康检查
    - 负载均衡策略
    - 统计信息收集
    """

    def __init__(
        self,
        startup_nodes: List[Dict[str, Union[str, int]]],
        password: Optional[str] = None,
        skip_full_coverage_check: bool = False,
        max_connections: int = 50,
        **kwargs
    ):
        """
        初始化 Redis Cluster 客户端

        Args:
            startup_nodes: 启动节点列表 [{"host": "localhost", "port": 7001}, ...]
            password: Redis 密码
            skip_full_coverage_check: 跳过完整覆盖检查（生产环境应设为 False）
            max_connections: 最大连接数
            **kwargs: 其他 RedisCluster 参数
        """
        self.startup_nodes = startup_nodes
        self.password = password
        self.skip_full_coverage_check = skip_full_coverage_check
        self.max_connections = max_connections
        self.kwargs = kwargs

        # 统计信息
        self.stats = {
            'hits': 0,
            'misses': 0,
            'errors': 0,
            'reconnects': 0,
            'operations': 0
        }

        # 连接池配置
        self.connection_pool_kwargs = {
            'max_connections': max_connections,
            'retry_on_timeout': True,
            'socket_timeout': kwargs.get('socket_timeout', 5),
            'socket_connect_timeout': kwargs.get('socket_connect_timeout', 5),
            'socket_keepalive': True,
            'socket_keepalive_options': {
                1: 1,  # TCP_KEEPIDLE
                2: 3,  # TCP_KEEPINTVL
                3: 5   # TCP_KEEPCNT
            }
        }

        # 初始化客户端
        self._init_cluster()

    def _init_cluster(self) -> None:
        """初始化 Redis Cluster 连接"""
        try:
            self.client = RedisCluster(
                startup_nodes=self.startup_nodes,
                password=self.password,
                skip_full_coverage_check=self.skip_full_coverage_check,
                decode_responses=True,
                max_connections=self.max_connections,
                **self.connection_pool_kwargs,
                **self.kwargs
            )

            # 测试连接
            self.client.ping()
            logger.info(f"✅ Redis Cluster 连接成功，节点: {len(self.startup_nodes)}")

        except Exception as e:
            logger.error(f"❌ Redis Cluster 连接失败: {e}")
            raise

    @contextmanager
    def _handle_error(self, operation: str = "operation"):
        """
        错误处理上下文管理器

        Args:
            operation: 操作名称
        """
        try:
            yield
        except (ConnectionError, TimeoutError, ClusterDownError) as e:
            logger.error(f"Redis Cluster 连接异常 ({operation}): {e}")
            self.stats['errors'] += 1

            # 尝试重连
            try:
                self._reconnect()
            except Exception as reconnect_error:
                logger.error(f"重连失败: {reconnect_error}")
                raise
        except RedisClusterException as e:
            logger.error(f"Redis Cluster 异常 ({operation}): {e}")
            self.stats['errors'] += 1
            raise
        except Exception as e:
            logger.error(f"未知异常 ({operation}): {e}")
            self.stats['errors'] += 1
            raise

    def _reconnect(self) -> None:
        """重连到 Redis Cluster"""
        logger.warning("⚠️  尝试重连到 Redis Cluster...")
        self.stats['reconnects'] += 1

        # 关闭旧连接
        try:
            self.client.close()
        except Exception as e:
            logger.debug(f"关闭旧连接失败: {e}")

        # 重新初始化
        time.sleep(1)  # 等待后重连
        self._init_cluster()

    def ping(self) -> bool:
        """
        检查 Redis Cluster 健康状态

        Returns:
            是否健康
        """
        try:
            return self.client.ping()
        except Exception as e:
            logger.error(f"Ping 失败: {e}")
            return False

    def get(self, key: str) -> Optional[Any]:
        """
        获取值

        Args:
            key: 键

        Returns:
            值或 None
        """
        self.stats['operations'] += 1

        try:
            with self._handle_error("get"):
                value = self.client.get(key)

                if value is not None:
                    self.stats['hits'] += 1
                    # 尝试反序列化 JSON
                    try:
                        return json.loads(value)
                    except (json.JSONDecodeError, TypeError):
                        return value
                else:
                    self.stats['misses'] += 1
                    return None

        except Exception:
            self.stats['misses'] += 1
            return None

    def set(self, key: str, value: Any, ex: Optional[int] = None) -> bool:
        """
        设置值

        Args:
            key: 键
            value: 值
            ex: 过期时间（秒）

        Returns:
            是否成功
        """
        self.stats['operations'] += 1

        try:
            with self._handle_error("set"):
                # 序列化值
                if isinstance(value, (dict, list, tuple)):
                    serialized_value = json.dumps(value, ensure_ascii=False)
                else:
                    serialized_value = str(value)

                if ex is not None:
                    return self.client.setex(key, ex, serialized_value)
                else:
                    return self.client.set(key, serialized_value)

        except Exception as e:
            logger.error(f"设置缓存失败: {e}")
            return False

    def setex(self, key: str, time: int, value: str) -> bool:
        """
        设置值并指定过期时间（兼容 Redis 单节点 API）

        Args:
            key: 键
            time: 过期时间（秒）
            value: 值

        Returns:
            是否成功
        """
        return self.set(key, value, ex=time)

    def delete(self, *keys: str) -> int:
        """
        删除键

        Args:
            *keys: 键列表

        Returns:
            删除的键数量
        """
        self.stats['operations'] += 1

        try:
            with self._handle_error("delete"):
                return self.client.delete(*keys)
        except Exception as e:
            logger.error(f"删除缓存失败: {e}")
            return 0

    def exists(self, *keys: str) -> int:
        """
        检查键是否存在

        Args:
            *keys: 键列表

        Returns:
            存在的键数量
        """
        self.stats['operations'] += 1

        try:
            with self._handle_error("exists"):
                return self.client.exists(*keys)
        except Exception as e:
            logger.error(f"检查键存在性失败: {e}")
            return 0

    def expire(self, key: str, seconds: int) -> bool:
        """
        设置过期时间

        Args:
            key: 键
            seconds: 秒数

        Returns:
            是否成功
        """
        self.stats['operations'] += 1

        try:
            with self._handle_error("expire"):
                return self.client.expire(key, seconds)
        except Exception as e:
            logger.error(f"设置过期时间失败: {e}")
            return False

    def ttl(self, key: str) -> int:
        """
        获取剩余过期时间

        Args:
            key: 键

        Returns:
            剩余秒数，-1 表示永不过期，-2 表示不存在
        """
        self.stats['operations'] += 1

        try:
            with self._handle_error("ttl"):
                return self.client.ttl(key)
        except Exception as e:
            logger.error(f"获取 TTL 失败: {e}")
            return -2

    def incr(self, key: str, amount: int = 1) -> Optional[int]:
        """
        增加计数器

        Args:
            key: 键
            amount: 增加量

        Returns:
            新值
        """
        self.stats['operations'] += 1

        try:
            with self._handle_error("incr"):
                return self.client.incrby(key, amount)
        except Exception as e:
            logger.error(f"增加计数器失败: {e}")
            return None

    def decr(self, key: str, amount: int = 1) -> Optional[int]:
        """
        减少计数器

        Args:
            key: 键
            amount: 减少量

        Returns:
            新值
        """
        self.stats['operations'] += 1

        try:
            with self._handle_error("decr"):
                return self.client.decrby(key, amount)
        except Exception as e:
            logger.error(f"减少计数器失败: {e}")
            return None

    def keys(self, pattern: str = "*") -> List[str]:
        """
        查找键

        Args:
            pattern: 匹配模式

        Returns:
            键列表
        """
        self.stats['operations'] += 1

        try:
            with self._handle_error("keys"):
                return self.client.keys(pattern)
        except Exception as e:
            logger.error(f"查找键失败: {e}")
            return []

    def flushdb(self) -> bool:
        """
        清空当前数据库

        Returns:
            是否成功
        """
        self.stats['operations'] += 1

        try:
            with self._handle_error("flushdb"):
                self.client.flushdb()
                logger.warning("⚠️  Redis Cluster 数据库已清空")
                return True
        except Exception as e:
            logger.error(f"清空数据库失败: {e}")
            return False

    def dbsize(self) -> int:
        """
        获取数据库大小

        Returns:
            键数量
        """
        self.stats['operations'] += 1

        try:
            with self._handle_error("dbsize"):
                # 对于 Cluster，需要获取所有节点的键数总和
                cluster_info = self.client.cluster_info()
                total = 0
                for node_id, node_info in cluster_info.items():
                    if 'db0' in node_info:
                        total += node_info['db0'].get('keys', 0)
                return total
        except Exception as e:
            logger.error(f"获取数据库大小失败: {e}")
            return 0

    def get_cluster_info(self) -> Dict[str, Any]:
        """
        获取集群信息

        Returns:
            集群信息字典
        """
        try:
            with self._handle_error("cluster_info"):
                return self.client.cluster_info()
        except Exception as e:
            logger.error(f"获取集群信息失败: {e}")
            return {}

    def get_cluster_nodes(self) -> List[Dict[str, Any]]:
        """
        获取集群节点信息

        Returns:
            节点列表
        """
        try:
            with self._handle_error("cluster_nodes"):
                return self.client.cluster_nodes()
        except Exception as e:
            logger.error(f"获取集群节点失败: {e}")
            return []

    def get_stats(self) -> Dict[str, Any]:
        """
        获取统计信息

        Returns:
            统计信息字典
        """
        total_requests = self.stats['hits'] + self.stats['misses']
        hit_rate = (self.stats['hits'] / total_requests * 100) if total_requests > 0 else 0
        error_rate = (self.stats['errors'] / self.stats['operations'] * 100) if self.stats['operations'] > 0 else 0

        return {
            'operations': self.stats['operations'],
            'hits': self.stats['hits'],
            'misses': self.stats['misses'],
            'errors': self.stats['errors'],
            'reconnects': self.stats['reconnects'],
            'hit_rate': round(hit_rate, 2),
            'error_rate': round(error_rate, 2),
            'cluster_health': self.ping(),
            'startup_nodes': self.startup_nodes
        }

    def close(self) -> None:
        """关闭连接"""
        try:
            self.client.close()
            logger.info("Redis Cluster 连接已关闭")
        except Exception as e:
            logger.error(f"关闭连接失败: {e}")

    def __enter__(self):
        """上下文管理器入口"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """上下文管理器出口"""
        self.close()
