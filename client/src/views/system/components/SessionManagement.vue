<template>
  <div class="session-management">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索会话..."
          style="width: 300px"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="filterStatus"
          placeholder="会话状态"
          style="width: 120px; margin-left: 12px"
          clearable
          @change="handleFilter"
        >
          <el-option label="全部" value="" />
          <el-option label="活跃" value="active" />
          <el-option label="空闲" value="idle" />
          <el-option label="过期" value="expired" />
        </el-select>

        <el-select
          v-model="filterDevice"
          placeholder="设备类型"
          style="width: 120px; margin-left: 12px"
          clearable
          @change="handleFilter"
        >
          <el-option label="全部" value="" />
          <el-option label="PC" value="desktop" />
          <el-option label="移动端" value="mobile" />
          <el-option label="平板" value="tablet" />
        </el-select>
      </div>

      <div class="toolbar-right">
        <el-button type="danger" @click="batchTerminateSessions">
          <el-icon><Close /></el-icon>
          批量终止
        </el-button>
        <el-button @click="refreshSessions">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 会话统计 -->
    <el-row :gutter="24" class="stats-row">
      <el-col :span="6" v-for="stat in sessionStats" :key="stat.key">
        <el-card class="stat-card" :class="stat.type">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="32">
                <component :is="stat.icon" />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 会话列表 -->
    <el-card class="sessions-card">
      <template #header>
        <div class="card-header">
          <h3>活跃会话列表</h3>
          <div class="header-actions">
            <el-button-group>
              <el-button :type="viewMode === 'list' ? 'primary' : ''" @click="viewMode = 'list'">
                <el-icon><List /></el-icon>
                列表视图
              </el-button>
              <el-button :type="viewMode === 'map' ? 'primary' : ''" @click="viewMode = 'map'">
                <el-icon><Location /></el-icon>
                地图视图
              </el-button>
            </el-button-group>
          </div>
        </div>
      </template>

      <!-- 列表视图 -->
      <div v-if="viewMode === 'list'" class="list-view">
        <el-table
          :data="filteredSessions"
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" />

          <el-table-column prop="user" label="用户" width="150">
            <template #default="{ row }">
              <div class="user-cell">
                <el-avatar :size="32" :src="row.user.avatar">
                  {{ row.user.name.charAt(0) }}
                </el-avatar>
                <div class="user-info">
                  <div class="user-name">{{ row.user.name }}</div>
                  <div class="user-role">{{ row.user.role }}</div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="sessionId" label="会话ID" width="200">
            <template #default="{ row }">
              <el-link type="primary" @click="showSessionDetail(row)">
                {{ row.sessionId }}
              </el-link>
            </template>
          </el-table-column>

          <el-table-column prop="device" label="设备信息" width="200">
            <template #default="{ row }">
              <div class="device-info">
                <el-icon :color="getDeviceColor(row.device.type)">
                  <component :is="getDeviceIcon(row.device.type)" />
                </el-icon>
                <div>
                  <div>{{ row.device.name }}</div>
                  <div class="device-type">{{ getDeviceTypeLabel(row.device.type) }}</div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="location" label="位置" width="150">
            <template #default="{ row }">
              <div class="location-info">
                <el-icon><Location /></el-icon>
                <span>{{ row.location.city || '未知' }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)" size="small">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="loginTime" label="登录时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.loginTime) }}
            </template>
          </el-table-column>

          <el-table-column prop="lastActivity" label="最后活动" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.lastActivity) }}
            </template>
          </el-table-column>

          <el-table-column prop="duration" label="持续时间" width="100">
            <template #default="{ row }">
              {{ formatDuration(row.loginTime, row.lastActivity) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="showSessionDetail(row)">
                详情
              </el-button>
              <el-button
                type="warning"
                size="small"
                @click="extendSession(row)"
                v-if="row.status === 'idle'"
              >
                延长
              </el-button>
              <el-button type="danger" size="small" @click="terminateSession(row)">
                终止
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>

      <!-- 地图视图 -->
      <div v-else class="map-view">
        <div ref="sessionMap" class="map-container"></div>
      </div>
    </el-card>

    <!-- 会话详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="会话详情"
      width="900px"
      :destroy-on-close="true"
    >
      <div v-if="currentSession" class="session-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="会话ID">
            {{ currentSession.sessionId }}
          </el-descriptions-item>
          <el-descriptions-item label="用户">
            {{ currentSession.user.name }} ({{ currentSession.user.role }})
          </el-descriptions-item>
          <el-descriptions-item label="登录时间">
            {{ formatDateTime(currentSession.loginTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="最后活动">
            {{ formatDateTime(currentSession.lastActivity) }}
          </el-descriptions-item>
          <el-descriptions-item label="IP地址">
            {{ currentSession.ipAddress }}
          </el-descriptions-item>
          <el-descriptions-item label="地理位置">
            {{ currentSession.location.city }}, {{ currentSession.location.country }}
          </el-descriptions-item>
          <el-descriptions-item label="设备类型">
            {{ getDeviceTypeLabel(currentSession.device.type) }}
          </el-descriptions-item>
          <el-descriptions-item label="信任级别">
            <el-tag :type="getTrustTagType(currentSession.device.trustLevel)" size="small">
              {{ getTrustLabel(currentSession.device.trustLevel) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 活动历史 -->
        <div class="activity-section">
          <h4>活动历史</h4>
          <el-timeline>
            <el-timeline-item
              v-for="activity in currentSession.activities"
              :key="activity.id"
              :timestamp="formatDateTime(activity.timestamp)"
            >
              <div class="activity-content">
                <div class="activity-action">{{ activity.action }}</div>
                <div class="activity-detail">{{ activity.detail }}</div>
                <div class="activity-location">{{ activity.location }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- 安全信息 -->
        <div class="security-section">
          <h4>安全信息</h4>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-statistic
                title="异常检测"
                :value="currentSession.security?.anomalies || 0"
                suffix="次"
              />
            </el-col>
            <el-col :span="8">
              <el-statistic
                title="风险评分"
                :value="currentSession.security?.riskScore || 0"
                suffix="/100"
              />
            </el-col>
            <el-col :span="8">
              <el-statistic
                title="安全事件"
                :value="currentSession.security?.events || 0"
                suffix="次"
              />
            </el-col>
          </el-row>
        </div>
      </div>
    </el-dialog>

    <!-- 批量操作确认对话框 -->
    <el-dialog v-model="batchDialogVisible" title="批量终止会话" width="500px">
      <div class="batch-confirm">
        <el-alert
          title="确认操作"
          type="warning"
          :description="`确定要终止选中的 ${selectedSessions.length} 个会话吗？此操作不可恢复。`"
          show-icon
          :closable="false"
        />

        <div class="affected-users">
          <h5>受影响的用户：</h5>
          <el-tag
            v-for="session in selectedSessions"
            :key="session.sessionId"
            style="margin-right: 8px; margin-bottom: 8px"
          >
            {{ session.user.name }}
          </el-tag>
        </div>
      </div>

      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="executeBatchTerminate">确认终止</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Close, List, Location, Monitor, Iphone } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import enhancedPermissionService from '@/services/enhancedPermissionService';

// 响应式数据
const searchKeyword = ref('');
const filterStatus = ref('');
const filterDevice = ref('');
const viewMode = ref('list');
const detailDialogVisible = ref(false);
const batchDialogVisible = ref(false);
const currentSession = ref(null);
const selectedSessions = ref([]);

// 统计数据
const sessionStats = ref([
  {
    key: 'total',
    label: '总会话数',
    value: 156,
    icon: 'Monitor',
    type: 'primary',
  },
  {
    key: 'active',
    label: '活跃会话',
    value: 89,
    icon: 'Monitor',
    type: 'success',
  },
  {
    key: 'idle',
    label: '空闲会话',
    value: 45,
    icon: 'Monitor',
    type: 'warning',
  },
  {
    key: 'expired',
    label: '过期会话',
    value: 22,
    icon: 'Monitor',
    type: 'danger',
  },
]);

// 会话数据
const sessions = ref([]);

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0,
});

// 计算属性
const filteredSessions = computed(() => {
  let result = sessions.value;

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(
      session =>
        session.user.name.toLowerCase().includes(keyword) ||
        session.sessionId.toLowerCase().includes(keyword)
    );
  }

  if (filterStatus.value) {
    result = result.filter(session => session.status === filterStatus.value);
  }

  if (filterDevice.value) {
    result = result.filter(session => session.device.type === filterDevice.value);
  }

  pagination.total = result.length;

  // 分页
  const start = (pagination.currentPage - 1) * pagination.pageSize;
  const end = start + pagination.pageSize;
  return result.slice(start, end);
});

// 方法
const fetchSessions = async () => {
  try {
    // 生成模拟数据
    const mockSessions = [];
    const now = new Date();

    for (let i = 0; i < 100; i++) {
      const loginTime = new Date(now - Math.random() * 24 * 60 * 60 * 1000); // 24小时内
      const lastActivity = new Date(loginTime.getTime() + Math.random() * (now - loginTime));

      mockSessions.push({
        sessionId: `session_${i + 1}`,
        user: {
          id: `user_${i + 1}`,
          name: ['张三', '李四', '王五', '赵六'][i % 4] + (i + 1),
          role: ['村级管理员', '部门主管', '工作人员', '村民'][i % 4],
          avatar: '',
        },
        device: {
          type: ['desktop', 'mobile', 'tablet'][i % 3],
          name: ['Windows PC', 'iPhone', 'iPad'][i % 3],
          trustLevel: ['trusted', 'known', 'unknown'][i % 3],
        },
        location: {
          city: ['北京', '上海', '广州', '深圳'][i % 4],
          country: '中国',
          coordinates: [116.4074 + Math.random() * 10, 39.9042 + Math.random() * 10],
        },
        ipAddress: `192.168.1.${100 + (i % 155)}`,
        status: ['active', 'idle', 'expired'][Math.floor(Math.random() * 3)],
        loginTime,
        lastActivity,
        activities: generateActivities(loginTime, lastActivity),
        security: {
          anomalies: Math.floor(Math.random() * 5),
          riskScore: Math.floor(Math.random() * 100),
          events: Math.floor(Math.random() * 3),
        },
      });
    }

    sessions.value = mockSessions;
  } catch (error) {
    console.error('获取会话列表失败:', error);
    ElMessage.error('获取会话列表失败');
  }
};

const generateActivities = (loginTime, lastActivity) => {
  const activities = [];
  const actions = ['登录系统', '查看用户列表', '编辑权限', '访问财务模块', '生成报表'];

  activities.push({
    id: '1',
    action: '用户登录',
    detail: '从 ' + ['PC端', '移动端'][Math.floor(Math.random() * 2)] + ' 登录',
    location: '村委会办公室',
    timestamp: loginTime,
  });

  const activityCount = Math.floor(Math.random() * 5) + 1;
  for (let i = 1; i < activityCount; i++) {
    const timestamp = new Date(
      loginTime.getTime() + (lastActivity - loginTime) * (i / activityCount)
    );
    activities.push({
      id: (i + 1).toString(),
      action: actions[Math.floor(Math.random() * actions.length)],
      detail: '操作详情',
      location: '在线',
      timestamp,
    });
  }

  return activities;
};

const handleSearch = () => {
  pagination.currentPage = 1;
};

const handleFilter = () => {
  pagination.currentPage = 1;
};

const handleSelectionChange = selection => {
  selectedSessions.value = selection;
};

const handleSizeChange = size => {
  pagination.pageSize = size;
  pagination.currentPage = 1;
};

const handleCurrentChange = page => {
  pagination.currentPage = page;
};

const getDeviceIcon = type => {
  const icons = {
    desktop: Monitor,
    mobile: Iphone,
    tablet: Tablet,
  };
  return icons[type] || Monitor;
};

const getDeviceColor = type => {
  const colors = {
    desktop: '#409eff',
    mobile: '#67c23a',
    tablet: '#e6a23c',
  };
  return colors[type] || '#909399';
};

const getDeviceTypeLabel = type => {
  const labels = {
    desktop: 'PC',
    mobile: '手机',
    tablet: '平板',
  };
  return labels[type] || '未知';
};

const getStatusTagType = status => {
  const types = {
    active: 'success',
    idle: 'warning',
    expired: 'danger',
  };
  return types[status] || 'info';
};

const getStatusLabel = status => {
  const labels = {
    active: '活跃',
    idle: '空闲',
    expired: '过期',
  };
  return labels[status] || status;
};

const getTrustTagType = level => {
  const types = {
    trusted: 'success',
    known: 'warning',
    unknown: 'danger',
  };
  return types[level] || 'info';
};

const getTrustLabel = level => {
  const labels = {
    trusted: '可信',
    known: '已知',
    unknown: '未知',
  };
  return labels[level] || level;
};

const formatDateTime = date => {
  return new Date(date).toLocaleString();
};

const formatDuration = (startTime, endTime) => {
  const diff = endTime - startTime;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
};

const showSessionDetail = session => {
  currentSession.value = session;
  detailDialogVisible.value = true;
};

const extendSession = async session => {
  try {
    // 调用API延长会话
    ElMessage.success(`已延长用户 ${session.user.name} 的会话`);
    session.status = 'active';
  } catch (error) {
    ElMessage.error('延长会话失败');
  }
};

const terminateSession = async session => {
  try {
    await ElMessageBox.confirm(`确定要终止用户 ${session.user.name} 的会话吗？`, '确认终止', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const index = sessions.value.findIndex(s => s.sessionId === session.sessionId);
    sessions.value.splice(index, 1);

    ElMessage.success('会话已终止');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('终止会话失败');
    }
  }
};

const batchTerminateSessions = () => {
  if (selectedSessions.value.length === 0) {
    ElMessage.warning('请选择要终止的会话');
    return;
  }
  batchDialogVisible.value = true;
};

const executeBatchTerminate = async () => {
  try {
    selectedSessions.value.forEach(session => {
      const index = sessions.value.findIndex(s => s.sessionId === session.sessionId);
      if (index > -1) {
        sessions.value.splice(index, 1);
      }
    });

    ElMessage.success(`已终止 ${selectedSessions.value.length} 个会话`);
    selectedSessions.value = [];
    batchDialogVisible.value = false;
  } catch (error) {
    ElMessage.error('批量终止会话失败');
  }
};

const refreshSessions = () => {
  fetchSessions();
  ElMessage.success('会话列表已刷新');
};

const initSessionMap = () => {
  const chartDom = document.querySelector('[ref="sessionMap"]');
  if (!chartDom) return;

  const chart = echarts.init(chartDom);

  // 准备地图数据
  const mapData = sessions.value.map(session => ({
    name: session.user.name,
    value: session.location.coordinates,
    itemStyle: {
      color:
        session.status === 'active' ? '#67c23a' : session.status === 'idle' ? '#e6a23c' : '#f56c6c',
    },
  }));

  const option = {
    title: {
      text: '会话地理分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: params => {
        const session = sessions.value.find(s => s.user.name === params.name);
        if (session) {
          return `${session.user.name}<br/>
                  设备: ${getDeviceTypeLabel(session.device.type)}<br/>
                  状态: ${getStatusLabel(session.status)}<br/>
                  IP: ${session.ipAddress}`;
        }
        return params.name;
      },
    },
    geo: {
      map: 'china',
      roam: true,
      zoom: 1.2,
      center: [104.114129, 37.550339],
      itemStyle: {
        areaColor: '#e7e8ea',
        borderColor: '#404a59',
      },
      emphasis: {
        itemStyle: {
          areaColor: '#409eff',
        },
      },
    },
    series: [
      {
        name: '会话',
        type: 'scatter',
        coordinateSystem: 'geo',
        data: mapData,
        symbolSize: 12,
        encode: {
          value: 2,
        },
      },
    ],
  };

  // 注册中国地图（这里需要引入中国地图数据）
  // echarts.registerMap('china', chinaJson)

  chart.setOption(option);

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    chart.resize();
  });
};

// 生命周期
onMounted(async () => {
  await fetchSessions();

  if (viewMode.value === 'map') {
    await nextTick();
    initSessionMap();
  }
});
</script>

<style lang="scss" scoped>
.session-management {
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding: 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    .toolbar-left {
      display: flex;
      align-items: center;
    }

    .toolbar-right {
      display: flex;
      gap: 12px;
    }
  }

  .stats-row {
    margin-bottom: 24px;

    .stat-card {
      .stat-content {
        display: flex;
        align-items: center;
        gap: 16px;

        .stat-icon {
          color: #409eff;
        }

        .stat-info {
          .stat-value {
            font-size: 32px;
            font-weight: 600;
            color: #2c3e50;
            line-height: 1;
            margin-bottom: 4px;
          }

          .stat-label {
            font-size: 14px;
            color: #606266;
          }
        }
      }
    }
  }

  .sessions-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h3 {
        margin: 0;
        font-size: 16px;
        color: #2c3e50;
      }
    }

    .list-view {
      .user-cell {
        display: flex;
        align-items: center;
        gap: 12px;

        .user-info {
          .user-name {
            font-weight: 500;
            color: #2c3e50;
          }

          .user-role {
            font-size: 12px;
            color: #909399;
          }
        }
      }

      .device-info {
        display: flex;
        align-items: center;
        gap: 8px;

        .device-type {
          font-size: 12px;
          color: #909399;
        }
      }

      .location-info {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #606266;
      }

      .pagination-container {
        margin-top: 20px;
        text-align: right;
      }
    }

    .map-view {
      .map-container {
        height: 600px;
      }
    }
  }

  .session-detail {
    .activity-section,
    .security-section {
      margin-top: 24px;

      h4 {
        margin-bottom: 16px;
        color: #2c3e50;
      }

      .activity-content {
        .activity-action {
          font-weight: 500;
          color: #2c3e50;
          margin-bottom: 4px;
        }

        .activity-detail {
          color: #606266;
          margin-bottom: 4px;
        }

        .activity-location {
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }

  .batch-confirm {
    .affected-users {
      margin-top: 16px;

      h5 {
        margin-bottom: 12px;
        color: #2c3e50;
      }
    }
  }
}
</style>
