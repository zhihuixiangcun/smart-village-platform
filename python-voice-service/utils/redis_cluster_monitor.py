"""
Redis Cluster 健康检查和监控指标模块
提供集群健康状态检查和性能监控
"""

import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum


logger = logging.getLogger(__name__)


class HealthStatus(Enum):
    """健康状态枚举"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class NodeHealth:
    """节点健康信息"""
    node_id: str
    host: str
    port: int
    status: HealthStatus
    role: str = "unknown"  # master, replica
    ping_latency_ms: float = 0
    connected_clients: int = 0
    used_memory_mb: float = 0
    keys_count: int = 0
    last_check: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "node_id": self.node_id,
            "host": self.host,
            "port": self.port,
            "status": self.status.value,
            "role": self.role,
            "ping_latency_ms": self.ping_latency_ms,
            "connected_clients": self.connected_clients,
            "used_memory_mb": self.used_memory_mb,
            "keys_count": self.keys_count,
            "last_check": self.last_check.isoformat() if self.last_check else None
        }


@dataclass
class ClusterMetrics:
    """集群指标"""
    total_keys: int = 0
    total_memory_mb: float = 0
    total_operations: int = 0
    total_connections: int = 0
    hit_rate: float = 0.0
    error_rate: float = 0.0
    operations_per_second: float = 0.0
    avg_latency_ms: float = 0.0

    # 节点统计
    total_nodes: int = 0
    healthy_nodes: int = 0
    degraded_nodes: int = 0
    unhealthy_nodes: int = 0
    master_nodes: int = 0
    replica_nodes: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "total_keys": self.total_keys,
            "total_memory_mb": self.total_memory_mb,
            "total_operations": self.total_operations,
            "total_connections": self.total_connections,
            "hit_rate": self.hit_rate,
            "error_rate": self.error_rate,
            "operations_per_second": self.operations_per_second,
            "avg_latency_ms": self.avg_latency_ms,
            "nodes": {
                "total": self.total_nodes,
                "healthy": self.healthy_nodes,
                "degraded": self.degraded_nodes,
                "unhealthy": self.unhealthy_nodes,
                "master": self.master_nodes,
                "replica": self.replica_nodes
            }
        }


class RedisClusterMonitor:
    """Redis Cluster 监控器"""

    def __init__(self, redis_cluster_adapter):
        """
        初始化监控器

        Args:
            redis_cluster_adapter: Redis Cluster 适配器实例
        """
        self.adapter = redis_cluster_adapter
        self.nodes_health: Dict[str, NodeHealth] = {}
        self.last_check_time: Optional[datetime] = None
        self.check_interval_seconds: int = 30
        self.latency_threshold_ms: float = 100  # 延迟阈值
        self.memory_threshold_mb: float = 4000  # 内存阈值

        # 性能历史数据（用于计算速率）
        self.operations_history: List[tuple] = []  # [(timestamp, count), ...]
        self.max_history_points: int = 100

    def check_health(self) -> Dict[str, Any]:
        """
        执行健康检查

        Returns:
            健康检查结果字典
        """
        try:
            # 检查集群连接
            cluster_healthy = self.adapter.ping()

            # 获取集群节点信息
            nodes = self.adapter.get_cluster_nodes()

            # 更新节点健康信息
            self._update_nodes_health(nodes)

            # 计算整体健康状态
            overall_status = self._calculate_overall_status()

            # 收集集群指标
            metrics = self._collect_cluster_metrics(nodes)

            # 更新最后检查时间
            self.last_check_time = datetime.now()

            return {
                "status": overall_status.value,
                "cluster_healthy": cluster_healthy,
                "timestamp": self.last_check_time.isoformat(),
                "nodes": {node_id: node.to_dict() for node_id, node in self.nodes_health.items()},
                "metrics": metrics.to_dict(),
                "adapter_stats": self.adapter.get_stats()
            }

        except Exception as e:
            logger.error(f"健康检查失败: {e}")
            return {
                "status": HealthStatus.UNHEALTHY.value,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    def _update_nodes_health(self, nodes: List[Dict[str, Any]]) -> None:
        """更新节点健康信息"""
        start_time = time.time()

        for node in nodes:
            node_id = node.get("id", "unknown")
            host = node.get("host", "unknown")
            port = node.get("port", 0)
            role = node.get("role", "unknown")

            # 检查节点连接状态
            try:
                # 模拟 ping（实际应该连接到特定节点）
                ping_start = time.time()
                # 这里简化处理，实际应该 ping 特定节点
                is_healthy = self.adapter.ping()
                ping_latency_ms = (time.time() - ping_start) * 1000
            except Exception as e:
                logger.warning(f"节点 {node_id} ping 失败: {e}")
                is_healthy = False
                ping_latency_ms = 9999

            # 确定节点状态
            if not is_healthy:
                status = HealthStatus.UNHEALTHY
            elif ping_latency_ms > self.latency_threshold_ms:
                status = HealthStatus.DEGRADED
            else:
                status = HealthStatus.HEALTHY

            # 创建或更新节点健康信息
            if node_id in self.nodes_health:
                node_health = self.nodes_health[node_id]
                node_health.status = status
                node_health.ping_latency_ms = ping_latency_ms
                node_health.last_check = datetime.now()
            else:
                self.nodes_health[node_id] = NodeHealth(
                    node_id=node_id,
                    host=host,
                    port=port,
                    status=status,
                    role=role,
                    ping_latency_ms=ping_latency_ms,
                    last_check=datetime.now()
                )

    def _calculate_overall_status(self) -> HealthStatus:
        """计算整体健康状态"""
        if not self.nodes_health:
            return HealthStatus.UNKNOWN

        unhealthy_count = sum(
            1 for node in self.nodes_health.values()
            if node.status == HealthStatus.UNHEALTHY
        )
        degraded_count = sum(
            1 for node in self.nodes_health.values()
            if node.status == HealthStatus.DEGRADED
        )
        total_count = len(self.nodes_health)

        # 如果超过半数节点不健康，整体状态为不健康
        if unhealthy_count > total_count // 2:
            return HealthStatus.UNHEALTHY

        # 如果有节点不健康或降级，整体状态为降级
        if unhealthy_count > 0 or degraded_count > 0:
            return HealthStatus.DEGRADED

        return HealthStatus.HEALTHY

    def _collect_cluster_metrics(self, nodes: List[Dict[str, Any]]) -> ClusterMetrics:
        """收集集群指标"""
        metrics = ClusterMetrics()

        # 收集适配器统计信息
        adapter_stats = self.adapter.get_stats()
        metrics.total_operations = adapter_stats.get('operations', 0)
        metrics.hit_rate = adapter_stats.get('hit_rate', 0)
        metrics.error_rate = adapter_stats.get('error_rate', 0)

        # 计算操作速率
        self._calculate_operation_rate(metrics.total_operations)

        # 统计节点信息
        metrics.total_nodes = len(nodes)
        for node in nodes:
            node_id = node.get("id", "")
            if node_id in self.nodes_health:
                node_health = self.nodes_health[node_id]

                # 更新统计
                if node_health.status == HealthStatus.HEALTHY:
                    metrics.healthy_nodes += 1
                elif node_health.status == HealthStatus.DEGRADED:
                    metrics.degraded_nodes += 1
                else:
                    metrics.unhealthy_nodes += 1

                if node_health.role == "master":
                    metrics.master_nodes += 1
                elif node_health.role == "replica":
                    metrics.replica_nodes += 1

                # 累加指标
                metrics.total_keys += node_health.keys_count
                metrics.total_memory_mb += node_health.used_memory_mb
                metrics.total_connections += node_health.connected_clients

        # 计算平均延迟
        if self.nodes_health:
            avg_latency = sum(
                node.ping_latency_ms for node in self.nodes_health.values()
            ) / len(self.nodes_health)
            metrics.avg_latency_ms = avg_latency

        return metrics

    def _calculate_operation_rate(self, total_operations: int) -> None:
        """计算操作速率"""
        now = datetime.now()

        # 添加当前数据点
        self.operations_history.append((now, total_operations))

        # 保持历史数据在限制范围内
        if len(self.operations_history) > self.max_history_points:
            self.operations_history.pop(0)

        # 如果至少有两个数据点，计算速率
        if len(self.operations_history) >= 2:
            first_time, first_ops = self.operations_history[0]
            last_time, last_ops = self.operations_history[-1]

            time_diff_seconds = (last_time - first_time).total_seconds()
            if time_diff_seconds > 0:
                ops_per_sec = (last_ops - first_ops) / time_diff_seconds
                self.operations_per_second = ops_per_sec

    def get_metrics_history(self, minutes: int = 5) -> List[Dict[str, Any]]:
        """
       获取指标历史数据

        Args:
            minutes: 获取最近多少分钟的数据

        Returns:
            历史数据列表
        """
        cutoff_time = datetime.now() - timedelta(minutes=minutes)

        return [
            {
                "timestamp": timestamp.isoformat(),
                "operations": operations,
                "operations_per_second": self._calculate_rate_at_time(timestamp, operations)
            }
            for timestamp, operations in self.operations_history
            if timestamp >= cutoff_time
        ]

    def _calculate_rate_at_time(self, timestamp: datetime, operations: int) -> float:
        """计算特定时间点的操作速率"""
        # 找到该时间点附近的数据点
        window_start = timestamp - timedelta(seconds=60)
        window_end = timestamp + timedelta(seconds=60)

        relevant_points = [
            (ts, ops) for ts, ops in self.operations_history
            if window_start <= ts <= window_end
        ]

        if len(relevant_points) < 2:
            return 0.0

        first_ts, first_ops = relevant_points[0]
        last_ts, last_ops = relevant_points[-1]

        time_diff = (last_ts - first_ts).total_seconds()
        if time_diff > 0:
            return (last_ops - first_ops) / time_diff
        return 0.0

    def get_cluster_summary(self) -> Dict[str, Any]:
        """
        获取集群摘要信息

        Returns:
            摘要字典
        """
        return {
            "last_check": self.last_check_time.isoformat() if self.last_check_time else None,
            "check_interval_seconds": self.check_interval_seconds,
            "total_nodes_monitored": len(self.nodes_health),
            "latency_threshold_ms": self.latency_threshold_ms,
            "memory_threshold_mb": self.memory_threshold_mb,
            "monitoring_active": self.last_check_time is not None
        }


def create_health_check_endpoint(monitor: RedisClusterMonitor):
    """
    创建健康检查端点（用于 FastAPI/Flask）

    Args:
        monitor: 监控器实例

    Returns:
        健康检查函数
    """
    def health_check():
        """健康检查端点"""
        health = monitor.check_health()
        status_code = 200 if health["status"] == "healthy" else 503
        return health, status_code

    return health_check


def create_metrics_endpoint(monitor: RedisClusterMonitor):
    """
    创建 Prometheus 格式的指标端点

    Args:
        monitor: 监控器实例

    Returns:
        指标端点函数
    """
    def metrics():
        """Prometheus 指标端点"""
        health = monitor.check_health()
        metrics_data = health.get("metrics", {})

        # 生成 Prometheus 格式的指标
        prometheus_metrics = []

        # 集群健康状态
        prometheus_metrics.append(f'# HELP redis_cluster_health Cluster health status (1=healthy, 0=unhealthy)')
        prometheus_metrics.append(f'# TYPE redis_cluster_health gauge')
        prometheus_metrics.append(f'redis_cluster_health {{cluster="smart-village"}} 1' if health["status"] == "healthy" else f'redis_cluster_health {{cluster="smart-village"}} 0')

        # 总键数
        prometheus_metrics.append(f'# HELP redis_cluster_keys_total Total number of keys in cluster')
        prometheus_metrics.append(f'# TYPE redis_cluster_keys_total gauge')
        prometheus_metrics.append(f'redis_cluster_keys_total {{cluster="smart-village"}} {metrics_data.get("total_keys", 0)}')

        # 内存使用
        prometheus_metrics.append(f'# HELP redis_cluster_memory_mb_total Total memory usage in MB')
        prometheus_metrics.append(f'# TYPE redis_cluster_memory_mb_total gauge')
        prometheus_metrics.append(f'redis_cluster_memory_mb_total {{cluster="smart-village"}} {metrics_data.get("total_memory_mb", 0)}')

        # 操作速率
        prometheus_metrics.append(f'# HELP redis_cluster_ops_per_second Operations per second')
        prometheus_metrics.append(f'# TYPE redis_cluster_ops_per_second gauge')
        prometheus_metrics.append(f'redis_cluster_ops_per_second {{cluster="smart-village"}} {metrics_data.get("operations_per_second", 0):.2f}')

        # 命中率
        prometheus_metrics.append(f'# HELP redis_cluster_hit_rate Cache hit rate percentage')
        prometheus_metrics.append(f'# TYPE redis_cluster_hit_rate gauge')
        prometheus_metrics.append(f'redis_cluster_hit_rate {{cluster="smart-village"}} {metrics_data.get("hit_rate", 0)}')

        # 错误率
        prometheus_metrics.append(f'# HELP redis_cluster_error_rate Error rate percentage')
        prometheus_metrics.append(f'# TYPE redis_cluster_error_rate gauge')
        prometheus_metrics.append(f'redis_cluster_error_rate {{cluster="smart-village"}} {metrics_data.get("error_rate", 0)}')

        # 节点统计
        prometheus_metrics.append(f'# HELP redis_cluster_nodes_total Total number of nodes')
        prometheus_metrics.append(f'# TYPE redis_cluster_nodes_total gauge')
        prometheus_metrics.append(f'redis_cluster_nodes_total {{cluster="smart-village"}} {metrics_data.get("nodes", {}).get("total", 0)}')

        prometheus_metrics.append(f'# HELP redis_cluster_nodes_healthy Number of healthy nodes')
        prometheus_metrics.append(f'# TYPE redis_cluster_nodes_healthy gauge')
        prometheus_metrics.append(f'redis_cluster_nodes_healthy {{cluster="smart-village"}} {metrics_data.get("nodes", {}).get("healthy", 0)}')

        return "\n".join(prometheus_metrics), 200, {"Content-Type": "text/plain"}

    return metrics
