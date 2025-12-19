<template>
  <div class="enhanced-permission-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon><Lock /></el-icon>
          权限管理中心
        </h1>
        <p class="page-description">
          基于RBAC和ABAC的增强权限管理系统，支持动态权限规则和权限继承
        </p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showPermissionAudit">
          <el-icon><View /></el-icon>
          权限审计
        </el-button>
        <el-button @click="refreshPermissionCache">
          <el-icon><Refresh /></el-icon>
          刷新缓存
        </el-button>
      </div>
    </div>

    <!-- 快速统计卡片 -->
    <el-row :gutter="24" class="stats-cards">
      <el-col :span="6" v-for="stat in permissionStats" :key="stat.key">
        <el-card class="stat-card" :class="stat.type">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="32"><component :is="stat.icon" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
          <div class="stat-trend" v-if="stat.trend">
            <el-icon :class="stat.trend > 0 ? 'trend-up' : 'trend-down'">
              <ArrowUp v-if="stat.trend > 0" />
              <ArrowDown v-else />
            </el-icon>
            <span>{{ Math.abs(stat.trend) }}%</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 权限管理标签页 -->
    <el-card class="main-tabs-card">
      <el-tabs v-model="activeTab" type="border-card" @tab-change="handleTabChange">
        <!-- 权限仪表板 -->
        <el-tab-pane label="权限仪表板" name="dashboard">
          <PermissionDashboard />
        </el-tab-pane>

        <!-- 角色管理 -->
        <el-tab-pane label="角色管理" name="roles">
          <RoleManagement />
        </el-tab-pane>

        <!-- 用户权限分配 -->
        <el-tab-pane label="用户权限" name="user-permissions">
          <UserPermissionAssignment />
        </el-tab-pane>

        <!-- 权限规则配置 -->
        <el-tab-pane label="权限规则" name="permission-rules">
          <PermissionRulesConfig />
        </el-tab-pane>

        <!-- 权限继承配置 -->
        <el-tab-pane label="权限继承" name="inheritance">
          <PermissionInheritanceConfig />
        </el-tab-pane>

        <!-- 权限审计日志 -->
        <el-tab-pane label="审计日志" name="audit-logs">
          <PermissionAuditLogs />
        </el-tab-pane>

        <!-- 权限模板管理 -->
        <el-tab-pane label="权限模板" name="templates">
          <PermissionTemplateManagement />
        </el-tab-pane>

        <!-- 会话管理 -->
        <el-tab-pane label="会话管理" name="sessions">
          <SessionManagement />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 权限审计对话框 -->
    <el-dialog
      v-model="auditDialogVisible"
      title="权限审计报告"
      width="80%"
      :destroy-on-close="true"
    >
      <PermissionAuditDialog @close="auditDialogVisible = false" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Lock, View, Refresh, ArrowUp, ArrowDown,
  User, UserFilled, Key, DataAnalysis,
  Shield, Connection, Document, Clock
} from '@element-plus/icons-vue'
import { usePermissionStore } from '@/stores/permissionStore'
import enhancedPermissionService from '@/services/enhancedPermissionService'

// 导入组件
import PermissionDashboard from './components/PermissionDashboard.vue'
import RoleManagement from './components/RoleManagement.vue'
import UserPermissionAssignment from './components/UserPermissionAssignment.vue'
import PermissionRulesConfig from './components/PermissionRulesConfig.vue'
import PermissionInheritanceConfig from './components/PermissionInheritanceConfig.vue'
import PermissionAuditLogs from './components/PermissionAuditLogs.vue'
import PermissionTemplateManagement from './components/PermissionTemplateManagement.vue'
import SessionManagement from './components/SessionManagement.vue'
import PermissionAuditDialog from './components/PermissionAuditDialog.vue'

const permissionStore = usePermissionStore()

// 响应式数据
const activeTab = ref('dashboard')
const auditDialogVisible = ref(false)
const permissionStats = ref([])

// 获取权限统计数据
const fetchPermissionStats = async () => {
  try {
    const stats = await enhancedPermissionService.getPermissionStats()
    permissionStats.value = [
      {
        key: 'totalUsers',
        label: '总用户数',
        value: stats.totalUsers || 0,
        icon: 'User',
        type: 'primary',
        trend: stats.userGrowth || 0
      },
      {
        key: 'totalRoles',
        label: '角色数量',
        value: stats.totalRoles || 0,
        icon: 'UserFilled',
        type: 'success',
        trend: stats.roleGrowth || 0
      },
      {
        key: 'activePolicies',
        label: '活跃策略',
        value: stats.activePolicies || 0,
        icon: 'Shield',
        type: 'warning'
      },
      {
        key: 'dailyChecks',
        label: '今日检查',
        value: stats.dailyPermissionChecks || 0,
        icon: 'Key',
        type: 'info',
        trend: stats.checkGrowth || 0
      }
    ]
  } catch (error) {
    console.error('获取权限统计失败:', error)
    ElMessage.error('获取统计数据失败')
  }
}

// 刷新权限缓存
const refreshPermissionCache = async () => {
  try {
    await ElMessageBox.confirm(
      '刷新权限缓存将重新加载所有权限规则，是否继续？',
      '确认刷新',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const result = await enhancedPermissionService.clearPermissionCache()
    if (result.success) {
      ElMessage.success('权限缓存刷新成功')
      await fetchPermissionStats()
    } else {
      ElMessage.error('权限缓存刷新失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('刷新权限缓存失败:', error)
      ElMessage.error('刷新缓存失败')
    }
  }
}

// 显示权限审计
const showPermissionAudit = () => {
  auditDialogVisible.value = true
}

// 标签页切换
const handleTabChange = (tabName) => {
  console.log('切换到标签页:', tabName)
}

// 生命周期
onMounted(() => {
  fetchPermissionStats()

  // 定期刷新统计数据
  const timer = setInterval(fetchPermissionStats, 30000) // 30秒刷新一次

  // 组件卸载时清除定时器
  onUnmounted(() => {
    clearInterval(timer)
  })
})
</script>

<style lang="scss" scoped>
.enhanced-permission-management {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding: 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

  .header-content {
    flex: 1;

    .page-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 28px;
      font-weight: 600;
      color: #2c3e50;
      margin: 0 0 8px 0;

      .el-icon {
        color: #409eff;
      }
    }

    .page-description {
      font-size: 14px;
      color: #606266;
      margin: 0;
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.stats-cards {
  margin-bottom: 24px;

  .stat-card {
    position: relative;
    transition: all 0.3s ease;
    border: none;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;

      .stat-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        border-radius: 12px;
        background: rgba(64, 158, 255, 0.1);
        color: #409eff;
      }

      .stat-info {
        flex: 1;

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

    .stat-trend {
      position: absolute;
      top: 20px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      font-weight: 500;

      .trend-up {
        color: #67c23a;
      }

      .trend-down {
        color: #f56c6c;
      }
    }

    &.primary .stat-icon {
      background: rgba(64, 158, 255, 0.1);
      color: #409eff;
    }

    &.success .stat-icon {
      background: rgba(103, 194, 58, 0.1);
      color: #67c23a;
    }

    &.warning .stat-icon {
      background: rgba(230, 162, 60, 0.1);
      color: #e6a23c;
    }

    &.info .stat-icon {
      background: rgba(144, 147, 153, 0.1);
      color: #909399;
    }
  }
}

.main-tabs-card {
  .el-tabs {
    :deep(.el-tabs__header) {
      margin: 0;
      background: white;
      border-radius: 8px 8px 0 0;
    }

    :deep(.el-tabs__content) {
      padding: 0;
      background: white;
    }

    :deep(.el-tab-pane) {
      padding: 24px;
    }
  }
}
</style>