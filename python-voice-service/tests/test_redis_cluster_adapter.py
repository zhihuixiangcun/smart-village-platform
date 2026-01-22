"""
Redis Cluster 集成测试
测试 Redis Cluster 客户端适配器的功能
"""

import pytest
import time
from unittest.mock import Mock, patch, MagicMock
from utils.redis_cluster_adapter import RedisClusterAdapter
from redis.exceptions import ConnectionError, ClusterDownError, TimeoutError


class TestRedisClusterAdapter:
    """Redis Cluster 适配器测试"""

    @pytest.fixture
    def startup_nodes(self):
        """测试启动节点"""
        return [
            {"host": "localhost", "port": 7001},
            {"host": "localhost", "port": 7002},
            {"host": "localhost", "port": 7003}
        ]

    @pytest.fixture
    def mock_redis_cluster(self):
        """模拟 Redis Cluster 客户端"""
        with patch('utils.redis_cluster_adapter.RedisCluster') as mock:
            yield mock

    def test_init_with_password(self, startup_nodes, mock_redis_cluster):
        """测试使用密码初始化"""
        adapter = RedisClusterAdapter(
            startup_nodes=startup_nodes,
            password="test_password"
        )

        assert adapter.password == "test_password"
        assert adapter.startup_nodes == startup_nodes
        assert adapter.max_connections == 50

    def test_init_custom_max_connections(self, startup_nodes):
        """测试自定义最大连接数"""
        adapter = RedisClusterAdapter(
            startup_nodes=startup_nodes,
            max_connections=100
        )

        assert adapter.max_connections == 100
        assert adapter.connection_pool_kwargs['max_connections'] == 100

    def test_ping_success(self, startup_nodes, mock_redis_cluster):
        """测试 Ping 成功"""
        mock_client = MagicMock()
        mock_client.ping.return_value = True
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        assert adapter.ping() is True

    def test_get_success(self, startup_nodes, mock_redis_cluster):
        """测试获取值成功"""
        mock_client = MagicMock()
        mock_client.get.return_value = '{"key": "value"}'
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        result = adapter.get("test_key")

        assert result == {"key": "value"}
        assert adapter.stats['hits'] == 1
        assert adapter.stats['misses'] == 0

    def test_get_miss(self, startup_nodes, mock_redis_cluster):
        """测试获取值未命中"""
        mock_client = MagicMock()
        mock_client.get.return_value = None
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        result = adapter.get("non_existent_key")

        assert result is None
        assert adapter.stats['misses'] == 1
        assert adapter.stats['hits'] == 0

    def test_set_dict_value(self, startup_nodes, mock_redis_cluster):
        """测试设置字典值"""
        mock_client = MagicMock()
        mock_client.setex.return_value = True
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        result = adapter.set("test_key", {"nested": {"data": "value"}}, ex=3600)

        assert result is True
        mock_client.setex.assert_called_once()

    def test_set_string_value(self, startup_nodes, mock_redis_cluster):
        """测试设置字符串值"""
        mock_client = MagicMock()
        mock_client.set.return_value = True
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        result = adapter.set("test_key", "string_value")

        assert result is True
        mock_client.set.assert_called_once()

    def test_delete_success(self, startup_nodes, mock_redis_cluster):
        """测试删除成功"""
        mock_client = MagicMock()
        mock_client.delete.return_value = 1
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        result = adapter.delete("test_key", "test_key2")

        assert result == 1

    def test_exists(self, startup_nodes, mock_redis_cluster):
        """测试检查键是否存在"""
        mock_client = MagicMock()
        mock_client.exists.return_value = 2
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        result = adapter.exists("key1", "key2", "key3")

        assert result == 2

    def test_expire(self, startup_nodes, mock_redis_cluster):
        """测试设置过期时间"""
        mock_client = MagicMock()
        mock_client.expire.return_value = True
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        result = adapter.expire("test_key", 600)

        assert result is True

    def test_ttl(self, startup_nodes, mock_redis_cluster):
        """测试获取 TTL"""
        mock_client = MagicMock()
        mock_client.ttl.return_value = 300
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        result = adapter.ttl("test_key")

        assert result == 300

    def test_incr(self, startup_nodes, mock_redis_cluster):
        """测试增加计数器"""
        mock_client = MagicMock()
        mock_client.incrby.return_value = 5
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        result = adapter.incr("counter", 5)

        assert result == 5

    def test_decr(self, startup_nodes, mock_redis_cluster):
        """测试减少计数器"""
        mock_client = MagicMock()
        mock_client.decrby.return_value = -3
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        result = adapter.decr("counter", 3)

        assert result == -3

    def test_keys(self, startup_nodes, mock_redis_cluster):
        """测试查找键"""
        mock_client = MagicMock()
        mock_client.keys.return_value = ["key1", "key2", "key3"]
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        result = adapter.keys("user:*")

        assert result == ["key1", "key2", "key3"]

    def test_flushdb(self, startup_nodes, mock_redis_cluster):
        """测试清空数据库"""
        mock_client = MagicMock()
        mock_client.flushdb.return_value = True
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        result = adapter.flushdb()

        assert result is True
        mock_client.flushdb.assert_called_once()

    def test_get_stats(self, startup_nodes, mock_redis_cluster):
        """测试获取统计信息"""
        mock_client = MagicMock()
        mock_client.ping.return_value = True
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)

        # 执行一些操作
        adapter.get("test_key")
        adapter.set("test_key", "value")

        stats = adapter.get_stats()

        assert 'operations' in stats
        assert 'hits' in stats
        assert 'misses' in stats
        assert 'errors' in stats
        assert 'hit_rate' in stats
        assert 'cluster_health' in stats
        assert stats['operations'] >= 2

    def test_connection_error_reconnect(self, startup_nodes, mock_redis_cluster):
        """测试连接错误时自动重连"""
        mock_client = MagicMock()
        mock_client.ping.side_effect = [ConnectionError("Connection lost"), True]
        mock_redis_cluster.return_value = mock_client

        with patch.object(RedisClusterAdapter, '_reconnect') as mock_reconnect:
            adapter = RedisClusterAdapter(startup_nodes=startup_nodes)

            # 第一次 ping 失败
            adapter.ping()
            assert adapter.stats['errors'] == 1

            # 第二次 ping 成功
            assert adapter.ping() is True

    def test_cluster_down_error(self, startup_nodes, mock_redis_cluster):
        """测试集群宕机错误"""
        mock_client = MagicMock()
        mock_client.get.side_effect = ClusterDownError("Cluster is down")
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        result = adapter.get("test_key")

        assert result is None
        assert adapter.stats['errors'] == 1

    def test_context_manager(self, startup_nodes, mock_redis_cluster):
        """测试上下文管理器"""
        mock_client = MagicMock()
        mock_redis_cluster.return_value = mock_client

        with RedisClusterAdapter(startup_nodes=startup_nodes) as adapter:
            assert adapter is not None
            adapter.set("test", "value")

        # 验证连接已关闭
        mock_client.close.assert_called_once()

    def test_get_cluster_info(self, startup_nodes, mock_redis_cluster):
        """测试获取集群信息"""
        mock_client = MagicMock()
        mock_client.cluster_info.return_value = {
            "cluster_state": "ok",
            "cluster_slots_assigned": 16384
        }
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        info = adapter.get_cluster_info()

        assert info["cluster_state"] == "ok"

    def test_get_cluster_nodes(self, startup_nodes, mock_redis_cluster):
        """测试获取集群节点"""
        mock_client = MagicMock()
        mock_client.cluster_nodes.return_value = [
            {"id": "node1", "host": "localhost", "port": 7001},
            {"id": "node2", "host": "localhost", "port": 7002}
        ]
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        nodes = adapter.get_cluster_nodes()

        assert len(nodes) == 2

    def test_setex_compatibility(self, startup_nodes, mock_redis_cluster):
        """测试 setex 方法兼容性"""
        mock_client = MagicMock()
        mock_client.setex.return_value = True
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)
        result = adapter.setex("test_key", 3600, "value")

        assert result is True

    def test_json_serialization(self, startup_nodes, mock_redis_cluster):
        """测试 JSON 序列化"""
        mock_client = MagicMock()
        mock_client.set.return_value = True
        mock_client.get.return_value = '{"list": [1, 2, 3], "dict": {"nested": "value"}}'
        mock_redis_cluster.return_value = mock_client

        adapter = RedisClusterAdapter(startup_nodes=startup_nodes)

        # 设置复杂对象
        complex_value = {
            "list": [1, 2, 3],
            "dict": {"nested": "value"}
        }
        adapter.set("complex_key", complex_value)

        # 获取并验证
        result = adapter.get("complex_key")
        assert result == complex_value

    @pytest.mark.skip(reason="需要真实的 Redis Cluster 环境")
    def test_real_cluster_connection(self, startup_nodes):
        """测试真实集群连接（需要真实环境）"""
        adapter = RedisClusterAdapter(
            startup_nodes=startup_nodes,
            skip_full_coverage_check=True
        )

        # 测试基本操作
        assert adapter.ping() is True
        assert adapter.set("test_key", "test_value") is True
        assert adapter.get("test_key") == "test_value"
        assert adapter.delete("test_key") == 1

        adapter.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=utils.redis_cluster_adapter", "--cov-report=html"])
