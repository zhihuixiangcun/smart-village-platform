"""
缓存管理工具
支持内存缓存和Redis缓存
"""

import json
import time
import hashlib
from typing import Any, Optional, Dict
import logging

logger = logging.getLogger(__name__)

class CacheManager:
    """缓存管理器"""

    def __init__(self, config: dict):
        """
        初始化缓存管理器

        Args:
            config: 缓存配置
        """
        self.config = config
        self.enabled = config.get('enabled', True)
        self.cache_type = config.get('type', 'memory')
        self.max_size = config.get('max_size', 1000)
        self.default_ttl = config.get('ttl', 3600)

        if not self.enabled:
            return

        if self.cache_type == 'memory':
            self.cache = {}
            self.expiry_times = {}
            self.access_times = {}
        elif self.cache_type == 'redis':
            self._init_redis()
        else:
            logger.warning(f"不支持的缓存类型: {self.cache_type}")
            self.enabled = False

        # 统计信息
        self.hits = 0
        self.misses = 0

    def _init_redis(self):
        """初始化Redis连接（支持单节点和Cluster）"""
        try:
            from config.settings import REDIS_CONFIG
            redis_mode = REDIS_CONFIG.get('mode', 'standalone')

            if redis_mode == 'cluster':
                # 使用 Redis Cluster
                from utils.redis_cluster_adapter import RedisClusterAdapter

                startup_nodes = REDIS_CONFIG.get('startup_nodes', [])
                if not startup_nodes:
                    logger.error("Redis Cluster 模式需要配置 startup_nodes，将使用内存缓存")
                    self.cache_type = 'memory'
                    self.cache = {}
                    self.expiry_times = {}
                    self.access_times = {}
                    return

                self.redis_client = RedisClusterAdapter(
                    startup_nodes=startup_nodes,
                    password=REDIS_CONFIG.get('password'),
                    skip_full_coverage_check=REDIS_CONFIG.get('skip_full_coverage_check', False),
                    max_connections=REDIS_CONFIG.get('max_connections', 50),
                    socket_timeout=REDIS_CONFIG.get('socket_timeout', 5),
                    socket_connect_timeout=REDIS_CONFIG.get('socket_connect_timeout', 5)
                )
                logger.info(f"✅ Redis Cluster 缓存连接成功，启动节点: {len(startup_nodes)}")

            else:
                # 使用单节点 Redis
                import redis

                self.redis_client = redis.Redis(
                    host=REDIS_CONFIG['host'],
                    port=REDIS_CONFIG['port'],
                    db=REDIS_CONFIG['db'],
                    password=REDIS_CONFIG.get('password'),
                    decode_responses=True,
                    socket_timeout=REDIS_CONFIG.get('socket_timeout', 5),
                    socket_connect_timeout=REDIS_CONFIG.get('socket_connect_timeout', 5)
                )

                # 测试连接
                self.redis_client.ping()
                logger.info("✅ Redis 单节点缓存连接成功")

        except ImportError:
            logger.error("Redis库未安装，将使用内存缓存")
            self.cache_type = 'memory'
            self.cache = {}
            self.expiry_times = {}
            self.access_times = {}
        except Exception as e:
            logger.error(f"Redis连接失败: {e}，将使用内存缓存")
            self.cache_type = 'memory'
            self.cache = {}
            self.expiry_times = {}
            self.access_times = {}

    def get(self, key: str) -> Optional[Any]:
        """
        获取缓存值

        Args:
            key: 缓存键

        Returns:
            缓存值或None
        """
        if not self.enabled:
            return None

        try:
            if self.cache_type == 'memory':
                return self._get_memory(key)
            elif self.cache_type == 'redis':
                return self._get_redis(key)
        except Exception as e:
            logger.error(f"缓存获取失败: {e}")
            self.misses += 1
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        设置缓存值

        Args:
            key: 缓存键
            value: 缓存值
            ttl: 过期时间（秒）

        Returns:
            是否设置成功
        """
        if not self.enabled:
            return False

        try:
            if ttl is None:
                ttl = self.default_ttl

            if self.cache_type == 'memory':
                return self._set_memory(key, value, ttl)
            elif self.cache_type == 'redis':
                return self._set_redis(key, value, ttl)
        except Exception as e:
            logger.error(f"缓存设置失败: {e}")
            return False

    def delete(self, key: str) -> bool:
        """
        删除缓存

        Args:
            key: 缓存键

        Returns:
            是否删除成功
        """
        if not self.enabled:
            return False

        try:
            if self.cache_type == 'memory':
                return self._delete_memory(key)
            elif self.cache_type == 'redis':
                return self._delete_redis(key)
        except Exception as e:
            logger.error(f"缓存删除失败: {e}")
            return False

    def clear(self) -> bool:
        """
        清空缓存

        Returns:
            是否清空成功
        """
        if not self.enabled:
            return False

        try:
            if self.cache_type == 'memory':
                self.cache.clear()
                self.expiry_times.clear()
                self.access_times.clear()
                return True
            elif self.cache_type == 'redis':
                self.redis_client.flushdb()
                return True
        except Exception as e:
            logger.error(f"缓存清空失败: {e}")
            return False

    def size(self) -> int:
        """
        获取缓存大小

        Returns:
            缓存项数量
        """
        if not self.enabled:
            return 0

        try:
            if self.cache_type == 'memory':
                return len(self.cache)
            elif self.cache_type == 'redis':
                return self.redis_client.dbsize()
        except Exception as e:
            logger.error(f"获取缓存大小失败: {e}")
            return 0

    def _get_memory(self, key: str) -> Optional[Any]:
        """内存缓存获取"""
        # 检查是否过期
        if key in self.expiry_times:
            if time.time() > self.expiry_times[key]:
                self._delete_memory(key)
                self.misses += 1
                return None

        # 检查是否存在
        if key in self.cache:
            self.access_times[key] = time.time()
            self.hits += 1
            return self.cache[key]

        self.misses += 1
        return None

    def _set_memory(self, key: str, value: Any, ttl: int) -> bool:
        """内存缓存设置"""
        # 检查大小限制
        if len(self.cache) >= self.max_size:
            self._evict_lru()

        # 序列化值
        try:
            if isinstance(value, (dict, list, tuple)):
                serialized_value = json.dumps(value, ensure_ascii=False)
            else:
                serialized_value = value
        except (TypeError, ValueError):
            logger.error(f"无法序列化缓存值: {value}")
            return False

        # 设置缓存
        self.cache[key] = serialized_value
        self.expiry_times[key] = time.time() + ttl
        self.access_times[key] = time.time()
        return True

    def _delete_memory(self, key: str) -> bool:
        """内存缓存删除"""
        deleted = False
        if key in self.cache:
            del self.cache[key]
            deleted = True
        if key in self.expiry_times:
            del self.expiry_times[key]
            deleted = True
        if key in self.access_times:
            del self.access_times[key]
            deleted = True
        return deleted

    def _evict_lru(self):
        """淘汰最近最少使用的缓存项"""
        if not self.access_times:
            return

        # 找到最久未访问的键
        lru_key = min(self.access_times.items(), key=lambda x: x[1])[0]
        self._delete_memory(lru_key)

    def _get_redis(self, key: str) -> Optional[Any]:
        """Redis缓存获取"""
        try:
            value = self.redis_client.get(key)
            if value is not None:
                self.hits += 1
                # 尝试反序列化JSON
                try:
                    return json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    return value
            else:
                self.misses += 1
                return None
        except Exception as e:
            logger.error(f"Redis获取失败: {e}")
            self.misses += 1
            return None

    def _set_redis(self, key: str, value: Any, ttl: int) -> bool:
        """Redis缓存设置"""
        try:
            # 序列化值
            if isinstance(value, (dict, list, tuple)):
                serialized_value = json.dumps(value, ensure_ascii=False)
            else:
                serialized_value = str(value)

            # 设置到Redis（适配单节点和Cluster）
            if hasattr(self.redis_client, 'setex'):
                return self.redis_client.setex(key, ttl, serialized_value)
            else:
                # RedisClusterAdapter 使用 set 方法
                return self.redis_client.set(key, serialized_value, ex=ttl)
        except Exception as e:
            logger.error(f"Redis设置失败: {e}")
            return False

    def _delete_redis(self, key: str) -> bool:
        """Redis缓存删除"""
        try:
            return bool(self.redis_client.delete(key))
        except Exception as e:
            logger.error(f"Redis删除失败: {e}")
            return False

    def generate_key(self, prefix: str, *args, **kwargs) -> str:
        """
        生成缓存键

        Args:
            prefix: 键前缀
            *args: 位置参数
            **kwargs: 关键字参数

        Returns:
            缓存键
        """
        # 创建键的组成部分
        parts = [prefix]

        # 添加位置参数
        for arg in args:
            if isinstance(arg, (bytes, bytearray)):
                parts.append(hashlib.md5(arg).hexdigest()[:8])
            else:
                parts.append(str(arg))

        # 添加关键字参数（排序确保一致性）
        if kwargs:
            sorted_kwargs = sorted(kwargs.items())
            for k, v in sorted_kwargs:
                parts.append(f"{k}={v}")

        # 生成最终键
        key_string = ":".join(parts)
        if len(key_string) > 200:  # 限制键长度
            key_hash = hashlib.md5(key_string.encode()).hexdigest()
            return f"{prefix}:{key_hash}"
        else:
            return key_string

    def get_stats(self) -> dict:
        """
        获取缓存统计信息

        Returns:
            统计信息字典
        """
        total_requests = self.hits + self.misses
        hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0

        return {
            'enabled': self.enabled,
            'type': self.cache_type,
            'size': self.size(),
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': round(hit_rate, 2),
            'max_size': self.max_size if self.cache_type == 'memory' else 'unlimited'
        }