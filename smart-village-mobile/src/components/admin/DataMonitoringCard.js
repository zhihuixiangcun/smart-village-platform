/**
 * 管理端数据监控卡片组件
 * 实时显示系统状态、关键指标、异常告警等
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  RefreshControl,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart, BarChart } from 'react-native-chart-kit';

import colors from '../../utils/colors';
import typography from '../../utils/typography';
import { monitoringApi } from '../../api/monitoring';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;

const DataMonitoringCard = ({ style, onAlertPress, onDetailPress }) => {
  const { user } = useAuth();
  const [systemStatus, setSystemStatus] = useState('healthy');
  const [metrics, setMetrics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [expandedSection, setExpandedSection] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // WebSocket连接实时数据
  const { lastMessage, connectionStatus } = useWebSocket('/monitoring');

  useEffect(() => {
    loadMonitoringData();
    startRealTimeUpdates();
    return () => stopRealTimeUpdates();
  }, []);

  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  useEffect(() => {
    if (alerts.some(alert => alert.severity === 'critical')) {
      startPulseAnimation();
    }
  }, [alerts]);

  const startRealTimeUpdates = () => {
    // 每30秒更新一次数据
    updateInterval = setInterval(loadMonitoringData, 30000);
  };

  const stopRealTimeUpdates = () => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const loadMonitoringData = async () => {
    try {
      const response = await monitoringApi.getSystemMetrics();
      if (response.success) {
        setMetrics(response.data);
        setSystemStatus(getOverallStatus(response.data));
      }
    } catch (error) {
      console.error('加载监控数据失败:', error);
      setSystemStatus('error');
    }
  };

  const handleWebSocketMessage = (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'metrics_update':
          setMetrics(prev => ({ ...prev, ...data.metrics }));
          break;
        case 'system_alert':
          setAlerts(prev => [data.alert, ...prev.slice(0, 9)]);
          break;
        case 'system_status':
          setSystemStatus(data.status);
          break;
      }
    } catch (error) {
      console.error('处理WebSocket消息失败:', error);
    }
  };

  const getOverallStatus = (data) => {
    const { cpu, memory, disk, network, database } = data;

    if (cpu?.usage > 90 || memory?.usage > 90 || database?.responseTime > 5000) {
      return 'critical';
    }
    if (cpu?.usage > 70 || memory?.usage > 70 || network?.latency > 1000) {
      return 'warning';
    }
    return 'healthy';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'critical':
      case 'error':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'healthy':
        return '正常';
      case 'warning':
        return '警告';
      case 'critical':
        return '严重';
      case 'error':
        return '错误';
      default:
        return '未知';
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMonitoringData();
    setRefreshing(false);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: getStatusColor(systemStatus) }
        ]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Icon
              name={systemStatus === 'healthy' ? 'check-circle' : 'warning'}
              size={20}
              color="#fff"
            />
          </Animated.View>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>系统监控</Text>
          <Text style={styles.headerStatus}>
            {getStatusText(systemStatus)} · {new Date().toLocaleTimeString('zh-CN')}
          </Text>
        </View>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.connectionStatus}
          onPress={() => Alert.alert('连接状态', `WebSocket: ${connectionStatus}`)}
        >
          <Icon
            name={connectionStatus === 'connected' ? 'wifi' : 'wifi-off'}
            size={16}
            color={connectionStatus === 'connected' ? colors.success : colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Icon
            name="refresh"
            size={20}
            color={colors.primary}
            style={{ transform: [{ rotate: refreshing ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSystemOverview = () => (
    <View style={styles.overviewContainer}>
      <View style={styles.overviewHeader}>
        <Text style={styles.overviewTitle}>系统概览</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['1h', '6h', '24h', '7d'].map(range => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                selectedTimeRange === range && styles.timeRangeButtonSelected
              ]}
              onPress={() => setSelectedTimeRange(range)}
            >
              <Text style={[
                styles.timeRangeText,
                selectedTimeRange === range && styles.timeRangeTextSelected
              ]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Icon name="memory" size={16} color={colors.primary} />
            <Text style={styles.metricLabel}>CPU使用率</Text>
          </View>
          <Text style={styles.metricValue}>
            {metrics.cpu?.usage || 0}%
          </Text>
          <Text style={[
            styles.metricStatus,
            { color: metrics.cpu?.usage > 70 ? colors.error : colors.success }
          ]}>
            {metrics.cpu?.usage > 70 ? '高负载' : '正常'}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Icon name="storage" size={16} color={colors.info} />
            <Text style={styles.metricLabel}>内存使用</Text>
          </View>
          <Text style={styles.metricValue}>
            {metrics.memory?.usage || 0}%
          </Text>
          <Text style={[
            styles.metricStatus,
            { color: metrics.memory?.usage > 80 ? colors.error : colors.success }
          ]}>
            {formatBytes(metrics.memory?.used || 0)}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Icon name="storage" size={16} color={colors.warning} />
            <Text style={styles.metricLabel}>磁盘使用</Text>
          </View>
          <Text style={styles.metricValue}>
            {metrics.disk?.usage || 0}%
          </Text>
          <Text style={styles.metricStatus}>
            {formatBytes(metrics.disk?.used || 0)}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Icon name="network-check" size={16} color={colors.success} />
            <Text style={styles.metricLabel}>网络延迟</Text>
          </View>
          <Text style={styles.metricValue}>
            {metrics.network?.latency || 0}ms
          </Text>
          <Text style={[
            styles.metricStatus,
            { color: metrics.network?.latency > 1000 ? colors.warning : colors.success }
          ]}>
            {formatNumber(metrics.network?.throughput || 0)}/s
          </Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Icon name="database" size={16} color={colors.error} />
            <Text style={styles.metricLabel}>数据库</Text>
          </View>
          <Text style={styles.metricValue}>
            {metrics.database?.connections || 0}
          </Text>
          <Text style={[
            styles.metricStatus,
            { color: metrics.database?.responseTime > 1000 ? colors.warning : colors.success }
          ]}>
            {metrics.database?.responseTime || 0}ms
          </Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Icon name="people" size={16} color={colors.primary} />
            <Text style={styles.metricLabel}>在线用户</Text>
          </View>
          <Text style={styles.metricValue}>
            {metrics.users?.online || 0}
          </Text>
          <Text style={styles.metricStatus}>
            今日: {metrics.users?.today || 0}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPerformanceChart = () => {
    if (!metrics.performanceData) return null;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>性能趋势</Text>
          <TouchableOpacity
            onPress={() => setExpandedSection(expandedSection === 'performance' ? null : 'performance')}
          >
            <Icon
              name={expandedSection === 'performance' ? 'expand-less' : 'expand-more'}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        <LineChart
          data={{
            labels: metrics.performanceData.labels,
            datasets: [
              {
                data: metrics.performanceData.cpu,
                color: colors.primary,
                strokeWidth: 2
              },
              {
                data: metrics.performanceData.memory,
                color: colors.info,
                strokeWidth: 2
              }
            ]
          }}
          width={chartWidth}
          height={180}
          chartConfig={{
            backgroundColor: 'transparent',
            decimalSeparator: '.',
            labelColor: colors.textSecondary,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '3',
              strokeWidth: '2'
            },
            legend: {
              labelColor: colors.text
            }
          }}
          bezier
          style={styles.chart}
        />
      </View>
  );
};

  const renderAlerts = () => (
    <View style={styles.alertsContainer}>
      <View style={styles.alertsHeader}>
        <Text style={styles.alertsTitle}>系统告警</Text>
        <TouchableOpacity onPress={() => setExpandedSection(expandedSection === 'alerts' ? null : 'alerts')}>
          <Icon
            name={expandedSection === 'alerts' ? 'expand-less' : 'expand-more'}
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {alerts.length === 0 ? (
        <View style={styles.noAlertsContainer}>
          <Icon name="check-circle" size={32} color={colors.success} />
          <Text style={styles.noAlertsText}>系统运行正常，暂无告警</Text>
        </View>
      ) : (
        alerts.slice(0, expandedSection === 'alerts' ? alerts.length : 3).map((alert, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.alertItem,
              { borderLeftColor: getStatusColor(alert.severity) }
            ]}
            onPress={() => onAlertPress?.(alert)}
          >
            <View style={styles.alertContent}>
              <View style={styles.alertHeader}>
                <Icon
                  name={alert.type === 'error' ? 'error' : 'warning'}
                  size={16}
                  color={getStatusColor(alert.severity)}
                />
                <Text style={styles.alertTitle} numberOfLines={1}>
                  {alert.title}
                </Text>
                <Text style={styles.alertTime}>
                  {new Date(alert.timestamp).toLocaleTimeString('zh-CN')}
                </Text>
              </View>
              <Text style={styles.alertMessage} numberOfLines={2}>
                {alert.message}
              </Text>
            </View>

            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.quickActionsTitle}>快捷操作</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => onDetailPress?.('logs')}
        >
          <Icon name="article" size={20} color={colors.primary} />
          <Text style={styles.quickActionText}>查看日志</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => onDetailPress?.('backup')}
        >
          <Icon name="backup" size={20} color={colors.info} />
          <Text style={styles.quickActionText}>数据备份</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => onDetailPress?.('restart')}
        >
          <Icon name="restart-alt" size={20} color={colors.warning} />
          <Text style={styles.quickActionText}>系统重启</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => onDetailPress?.('settings')}
        >
          <Icon name="settings" size={20} color={colors.textSecondary} />
          <Text style={styles.quickActionText}>系统设置</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!metrics) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <Icon name="monitor-heart" size={40} color={colors.primary} />
          <Text style={styles.loadingText}>加载监控数据...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, style]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {renderHeader()}
      {renderSystemOverview()}
      {renderPerformanceChart()}
      {renderAlerts()}
      {renderQuickActions()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  headerInfo: {
    flex: 1
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  headerStatus: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12
  },
  connectionStatus: {
    padding: 8
  },
  refreshButton: {
    padding: 8
  },
  overviewContainer: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  overviewHeader: {
    marginBottom: 16
  },
  overviewTitle: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.background,
    marginRight: 8
  },
  timeRangeButtonSelected: {
    backgroundColor: colors.primary
  },
  timeRangeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500'
  },
  timeRangeTextSelected: {
    color: colors.white
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    marginLeft: 6
  },
  metricValue: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2
  },
  metricStatus: {
    ...typography.caption,
    fontSize: 10
  },
  chartContainer: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  chartTitle: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  alertsContainer: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  alertsTitle: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  noAlertsContainer: {
    alignItems: 'center',
    paddingVertical: 24
  },
  noAlertsText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3
  },
  alertContent: {
    flex: 1
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  alertTitle: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginLeft: 8
  },
  alertTime: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10
  },
  alertMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 24,
    marginBottom: 2
  },
  quickActionsContainer: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  quickActionsTitle: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '22%',
    alignItems: 'center',
    paddingVertical: 12
  },
  quickActionText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6
  }
});

export default DataMonitoringCard;