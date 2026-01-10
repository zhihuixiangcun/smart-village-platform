<template>
  <div
    class="household-code-enhanced"
    :class="{ 'large-text-mode': accessibilityStore.largeTextMode }"
  >
    <!-- 智能页面头部 -->
    <header class="enhanced-header">
      <div class="header-bg-pattern"></div>
      <div class="header-container">
        <el-page-header @back="$router.go(-1)" class="page-header">
          <template #content>
            <div class="header-title">
              <el-icon class="header-icon"><Wallet /></el-icon>
              <h1>一户一码管理</h1>
              <el-tag type="success" size="small" effect="light">智能数字化</el-tag>
            </div>
          </template>
          <template #extra>
            <div class="header-actions">
              <el-button
                @click="showMyQRCode"
                type="primary"
                :size="accessibilityStore.largeTextMode ? 'large' : 'default'"
                :icon="User"
              >
                我的户码
              </el-button>
              <el-button
                @click="showVoiceGuide"
                circle
                :size="accessibilityStore.largeTextMode ? 'large' : 'default'"
                icon="Microphone"
              />
            </div>
          </template>
        </el-page-header>

        <!-- 智能统计仪表板 -->
        <div class="stats-dashboard">
          <div class="stat-card primary">
            <div class="stat-icon">
              <el-icon><House /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ householdStats.totalHouseholds }}</div>
              <div class="stat-label">总户数</div>
            </div>
          </div>

          <div class="stat-card success">
            <div class="stat-icon">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ householdStats.totalMembers }}</div>
              <div class="stat-label">总人口</div>
            </div>
          </div>

          <div class="stat-card warning">
            <div class="stat-icon">
              <el-icon><Refresh /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ householdStats.todayScans }}</div>
              <div class="stat-label">今日扫码</div>
            </div>
          </div>

          <div class="stat-card info">
            <div class="stat-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ householdStats.activeRate }}%</div>
              <div class="stat-label">活跃率</div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="main-content">
      <!-- 我的户码卡片 -->
      <section class="my-household-section">
        <el-card v-if="myHousehold" class="household-card enhanced" shadow="hover">
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <h3 class="card-title">我的家庭信息</h3>
                <el-tag
                  :type="getHouseholdStatusType(myHousehold.status)"
                  size="small"
                  effect="light"
                >
                  {{ myHousehold.status }}
                </el-tag>
              </div>
              <div class="header-right">
                <el-button
                  @click="refreshHouseholdInfo"
                  :icon="Refresh"
                  circle
                  size="small"
                  :loading="refreshing"
                />
              </div>
            </div>
          </template>

          <div class="household-overview">
            <!-- 户码信息 -->
            <div class="household-main-info">
              <div class="code-display">
                <div class="code-visual">
                  <div class="code-icon">🏠</div>
                  <div class="code-number">{{ myHousehold.codeId }}</div>
                  <el-tag type="primary" size="small">{{ myHousehold.memberCount }}人家庭</el-tag>
                </div>
              </div>

              <div class="household-details">
                <div class="detail-row">
                  <span class="label">户主姓名：</span>
                  <span class="value">{{ myHousehold.householder }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">家庭地址：</span>
                  <span class="value">{{ myHousehold.address }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">联系电话：</span>
                  <span class="value">{{ maskPhone(myHousehold.contactPhone) }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">创建时间：</span>
                  <span class="value">{{ formatDate(myHousehold.createdAt) }}</span>
                </div>
              </div>
            </div>

            <!-- 家庭标签 -->
            <div class="household-tags">
              <h4 class="tags-title">家庭标签</h4>
              <div class="tags-container">
                <el-tag
                  v-for="tag in myHousehold.tags"
                  :key="tag"
                  :type="getTagType(tag)"
                  size="small"
                  effect="light"
                  class="household-tag"
                >
                  {{ tag }}
                </el-tag>
                <el-button
                  @click="showTagManager = true"
                  size="small"
                  type="primary"
                  plain
                  icon="Plus"
                >
                  添加标签
                </el-button>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="action-buttons">
              <el-button
                @click="showQRDialog = true"
                type="primary"
                :size="accessibilityStore.largeTextMode ? 'large' : 'default'"
                icon="View"
              >
                查看二维码
              </el-button>
              <el-button
                @click="showMemberManager = true"
                :size="accessibilityStore.largeTextMode ? 'large' : 'default'"
                icon="User"
              >
                成员管理
              </el-button>
              <el-button
                @click="showUpdateDialog = true"
                :size="accessibilityStore.largeTextMode ? 'large' : 'default'"
                icon="Edit"
              >
                更新信息
              </el-button>
              <el-button
                @click="showHistoryDialog = true"
                :size="accessibilityStore.largeTextMode ? 'large' : 'default'"
                icon="List"
              >
                变更历史
              </el-button>
            </div>
          </div>
        </el-card>

        <!-- 空状态 -->
        <el-card v-else class="empty-household-card" shadow="never">
          <div class="empty-content">
            <el-empty description="暂无户码信息">
              <template #image>
                <el-icon :size="80" color="#c0c4cc"><House /></el-icon>
              </template>
              <div class="empty-actions">
                <el-button type="primary" @click="loadMyHousehold" :loading="loading">
                  重新加载
                </el-button>
                <el-button @click="showCreateDialog = true"> 申请户码 </el-button>
              </div>
            </el-empty>
          </div>
        </el-card>
      </section>

      <!-- 智能功能中心 -->
      <section class="smart-functions">
        <h3 class="section-title">智能功能中心</h3>

        <div class="functions-grid">
          <div
            v-for="func in smartFunctions"
            :key="func.id"
            class="function-card"
            @click="handleFunctionClick(func)"
          >
            <div class="function-icon" :style="{ backgroundColor: func.color }">
              <el-icon :size="32"><component :is="func.icon" /></el-icon>
            </div>
            <div class="function-content">
              <h4 class="function-title">{{ func.title }}</h4>
              <p class="function-desc">{{ func.description }}</p>
              <div class="function-meta">
                <el-tag v-if="func.badge" :type="func.badge.type" size="small">
                  {{ func.badge.text }}
                </el-tag>
                <span class="function-tips">{{ func.tips }}</span>
              </div>
            </div>
            <div class="function-arrow">
              <el-icon><ArrowRight /></el-icon>
            </div>
          </div>
        </div>
      </section>

      <!-- 邻里互助区域 -->
      <section class="community-section">
        <div class="section-header">
          <h3 class="section-title">邻里互助</h3>
          <el-button @click="showHelpDialog = true" type="primary" size="small">
            发布求助
          </el-button>
        </div>

        <div class="community-grid">
          <div
            v-for="help in communityHelps"
            :key="help.id"
            class="help-card"
            @click="viewHelpDetail(help)"
          >
            <div class="help-header">
              <el-avatar :size="40" :src="help.avatar">
                {{ help.helper?.charAt(0) }}
              </el-avatar>
              <div class="help-info">
                <h4 class="help-title">{{ help.title }}</h4>
                <p class="help-time">{{ formatTime(help.createdAt) }}</p>
              </div>
              <el-tag :type="getHelpStatusType(help.status)" size="small">
                {{ help.status }}
              </el-tag>
            </div>
            <p class="help-desc">{{ help.description }}</p>
            <div class="help-footer">
              <div class="help-rewards">
                <el-tag type="warning" size="small">
                  <el-icon><Coin /></el-icon>
                  {{ help.points }}积分
                </el-tag>
              </div>
              <div class="help-actions">
                <el-button size="small" @click.stop="acceptHelp(help)"> 接受帮助 </el-button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 积分排行榜 -->
      <section class="points-ranking">
        <div class="section-header">
          <h3 class="section-title">积分排行榜</h3>
          <el-select v-model="rankingType" size="small" style="width: 120px">
            <el-option label="本周" value="week" />
            <el-option label="本月" value="month" />
            <el-option label="总榜" value="all" />
          </el-select>
        </div>

        <div class="ranking-list">
          <div
            v-for="(user, index) in rankingList"
            :key="user.id"
            class="ranking-item"
            :class="{ 'top-three': index < 3 }"
          >
            <div class="ranking-number" :class="`rank-${index + 1}`">
              {{ index + 1 }}
            </div>
            <el-avatar :size="40" :src="user.avatar">
              {{ user.name?.charAt(0) }}
            </el-avatar>
            <div class="ranking-info">
              <h4 class="ranking-name">{{ user.name }}</h4>
              <p class="ranking-household">{{ user.householdCode }}</p>
            </div>
            <div class="ranking-points">
              <span class="points-value">{{ user.points }}</span>
              <span class="points-label">积分</span>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- 二维码显示对话框 -->
    <QRCodeDialog
      v-model:visible="showQRDialog"
      :household="myHousehold"
      @refresh="refreshQRCode"
    />

    <!-- 成员管理对话框 -->
    <MemberManagerDialog
      v-model:visible="showMemberManager"
      :household="myHousehold"
      @updated="onMembersUpdated"
    />

    <!-- 标签管理对话框 -->
    <TagManagerDialog
      v-model:visible="showTagManager"
      :household="myHousehold"
      @updated="onTagsUpdated"
    />

    <!-- 信息更新对话框 -->
    <UpdateHouseholdDialog
      v-model:visible="showUpdateDialog"
      :household="myHousehold"
      @updated="onHouseholdUpdated"
    />

    <!-- 变更历史对话框 -->
    <HistoryDialog v-model:visible="showHistoryDialog" :household="myHousehold" />

    <!-- 语音引导对话框 -->
    <VoiceGuideDialog v-model:visible="showVoiceGuideDialog" />

    <!-- 创建户码对话框 -->
    <CreateHouseholdDialog v-model:visible="showCreateDialog" @created="onHouseholdCreated" />

    <!-- 求助对话框 -->
    <HelpDialog v-model:visible="showHelpDialog" @submitted="onHelpSubmitted" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { ElMessage, ElNotification } from 'element-plus';
import {
  Wallet,
  User,
  Microphone,
  House,
  Refresh,
  TrendCharts,
  View,
  Edit,
  List,
  Plus,
  ArrowRight,
  Coin,
  Grid,
  Document,
  DataAnalysis,
  Phone,
  MapLocation,
  Star,
} from '@element-plus/icons-vue';

// 异步加载组件
const QRCodeDialog = defineAsyncComponent(() => import('./components/QRCodeDialog.vue'));
const MemberManagerDialog = defineAsyncComponent(
  () => import('./components/MemberManagerDialog.vue')
);
const TagManagerDialog = defineAsyncComponent(() => import('./components/TagManagerDialog.vue'));
const UpdateHouseholdDialog = defineAsyncComponent(
  () => import('./components/UpdateHouseholdDialog.vue')
);
const HistoryDialog = defineAsyncComponent(() => import('./components/HistoryDialog.vue'));
const VoiceGuideDialog = defineAsyncComponent(() => import('./components/VoiceGuideDialog.vue'));
const CreateHouseholdDialog = defineAsyncComponent(
  () => import('./components/CreateHouseholdDialog.vue')
);
const HelpDialog = defineAsyncComponent(() => import('./components/HelpDialog.vue'));

const router = useRouter();
const userStore = useUserStore();
const accessibilityStore = useAccessibilityStore();

// ========== 响应式数据 ==========
const myHousehold = ref(null);
const loading = ref(false);
const refreshing = ref(false);
const rankingType = ref('week');

// 弹窗控制
const showQRDialog = ref(false);
const showMemberManager = ref(false);
const showTagManager = ref(false);
const showUpdateDialog = ref(false);
const showHistoryDialog = ref(false);
const showVoiceGuideDialog = ref(false);
const showCreateDialog = ref(false);
const showHelpDialog = ref(false);

// ========== 统计数据 ==========
const householdStats = reactive({
  totalHouseholds: 350,
  totalMembers: 1250,
  todayScans: 156,
  activeRate: 78,
});

// ========== 智能功能列表 ==========
const smartFunctions = reactive([
  {
    id: 'scan',
    title: '扫码查看',
    description: '扫描他人户码查看家庭信息',
    icon: 'Grid',
    color: '#409eff',
    tips: '快速查看',
    action: () => showScanDialog(),
  },
  {
    id: 'neighbor',
    title: '邻里互助',
    description: '发布求助信息，帮助邻里',
    icon: 'Star',
    color: '#67c23a',
    badge: { type: 'success', text: '热门' },
    tips: '积分奖励',
    action: () => (showHelpDialog.value = true),
  },
  {
    id: 'emergency',
    title: '紧急呼叫',
    description: '一键呼叫村干部或值班人员',
    icon: 'Phone',
    color: '#f56c6c',
    badge: { type: 'danger', text: '紧急' },
    tips: '24小时',
    action: () => emergencyCall(),
  },
  {
    id: 'map',
    title: '户码地图',
    description: '查看村庄户码分布地图',
    icon: 'MapLocation',
    color: '#e6a23c',
    tips: '实时定位',
    action: () => router.push('/household-map'),
  },
  {
    id: 'statistics',
    title: '统计分析',
    description: '查看家庭数据统计分析',
    icon: 'DataAnalysis',
    color: '#909399',
    tips: '智能分析',
    action: () => showStatistics(),
  },
  {
    id: 'documents',
    title: '证件管理',
    description: '家庭证件数字化管理',
    icon: 'Document',
    color: '#606266',
    tips: '安全存储',
    action: () => showDocumentManager(),
  },
]);

// ========== 邻里互助数据 ==========
const communityHelps = reactive([
  {
    id: '1',
    title: '需要帮忙收稻谷',
    description: '家里老人行动不便，希望有年轻人能帮忙收一下稻田里的稻谷...',
    helper: '张大妈',
    status: 'pending',
    points: 50,
    createdAt: '2024-01-16 08:30',
    avatar: '',
  },
  {
    id: '2',
    title: '协助办理医保',
    description: '不太会使用智能手机办理医保，希望有人能指导一下...',
    helper: '李大爷',
    status: 'ongoing',
    points: 30,
    createdAt: '2024-01-16 07:15',
    avatar: '',
  },
  {
    id: '3',
    title: '修理农具',
    description: '耕地机坏了，需要修理，有会修农具的村民吗？',
    helper: '王大哥',
    status: 'completed',
    points: 40,
    createdAt: '2024-01-15 16:20',
    avatar: '',
  },
]);

// ========== 积分排行榜 ==========
const rankingList = reactive([
  {
    id: '1',
    name: '李明',
    householdCode: 'HH001',
    points: 2580,
    avatar: '',
  },
  {
    id: '2',
    name: '王芳',
    householdCode: 'HH015',
    points: 2340,
    avatar: '',
  },
  {
    id: '3',
    name: '张强',
    householdCode: 'HH008',
    points: 2180,
    avatar: '',
  },
  {
    id: '4',
    name: '刘洋',
    householdCode: 'HH023',
    points: 1950,
    avatar: '',
  },
  {
    id: '5',
    name: '陈丽',
    householdCode: 'HH012',
    points: 1820,
    avatar: '',
  },
]);

// ========== 方法定义 ==========

/**
 * 加载我的户码信息
 */
const loadMyHousehold = async () => {
  loading.value = true;
  try {
    const householdId = userStore.userInfo?.householdId;
    if (!householdId) {
      ElMessage.warning('您还未绑定家庭信息，请联系村委会');
      return;
    }

    // 模拟API调用
    setTimeout(() => {
      myHousehold.value = {
        id: householdId,
        codeId: 'HH0012024',
        householder: '张三',
        address: '幸福路123号',
        contactPhone: '13812345678',
        memberCount: 4,
        status: '正常',
        tags: ['党员家庭', '文明家庭', '安全家庭'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-15',
      };
      loading.value = false;
    }, 1000);
  } catch (error) {
    console.error('加载户码失败:', error);
    ElMessage.error('加载失败，请稍后重试');
    loading.value = false;
  }
};

/**
 * 刷新家庭信息
 */
const refreshHouseholdInfo = async () => {
  refreshing.value = true;
  try {
    await loadMyHousehold();
    ElMessage.success('刷新成功');
  } catch (error) {
    ElMessage.error('刷新失败');
  } finally {
    refreshing.value = false;
  }
};

/**
 * 显示我的二维码
 */
const showMyQRCode = () => {
  if (!myHousehold.value) {
    ElMessage.warning('请先加载户码信息');
    return;
  }
  showQRDialog.value = true;
};

/**
 * 显示语音引导
 */
const showVoiceGuide = () => {
  showVoiceGuideDialog.value = true;
};

/**
 * 处理功能点击
 */
const handleFunctionClick = func => {
  if (func.action) {
    func.action();
  }
};

/**
 * 显示扫码对话框
 */
const showScanDialog = () => {
  ElMessage.info('扫码功能开发中');
};

/**
 * 紧急呼叫
 */
const emergencyCall = () => {
  ElMessage.success('正在连接值班人员...');
  // 实现紧急呼叫逻辑
};

/**
 * 显示统计分析
 */
const showStatistics = () => {
  router.push('/household-statistics');
};

/**
 * 显示证件管理
 */
const showDocumentManager = () => {
  router.push('/document-manager');
};

/**
 * 查看求助详情
 */
const viewHelpDetail = help => {
  ElMessage.info(`查看求助: ${help.title}`);
};

/**
 * 接受帮助
 */
const acceptHelp = help => {
  ElMessage.success(`已接受帮助: ${help.title}`);
  help.status = 'ongoing';
};

/**
 * 获取家庭状态类型
 */
const getHouseholdStatusType = status => {
  const typeMap = {
    正常: 'success',
    待审核: 'warning',
    已冻结: 'danger',
    已注销: 'info',
  };
  return typeMap[status] || 'info';
};

/**
 * 获取标签类型
 */
const getTagType = tag => {
  const typeMap = {
    党员家庭: 'danger',
    军属家庭: 'primary',
    文明家庭: 'success',
    安全家庭: 'warning',
    低保家庭: 'info',
  };
  return typeMap[tag] || '';
};

/**
 * 获取求助状态类型
 */
const getHelpStatusType = status => {
  const typeMap = {
    pending: 'warning',
    ongoing: 'primary',
    completed: 'success',
  };
  return typeMap[status] || '';
};

/**
 * 手机号脱敏
 */
const maskPhone = phone => {
  if (!phone) return '未设置';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

/**
 * 格式化日期
 */
const formatDate = date => {
  if (!date) return '未设置';
  return new Date(date).toLocaleDateString('zh-CN');
};

/**
 * 格式化时间
 */
const formatTime = time => {
  const date = new Date(time);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

  return date.toLocaleDateString('zh-CN');
};

/**
 * 刷新二维码
 */
const refreshQRCode = () => {
  ElMessage.success('二维码已刷新');
};

/**
 * 成员更新回调
 */
const onMembersUpdated = () => {
  ElMessage.success('成员信息已更新');
  loadMyHousehold();
};

/**
 * 标签更新回调
 */
const onTagsUpdated = () => {
  ElMessage.success('标签已更新');
  loadMyHousehold();
};

/**
 * 家庭信息更新回调
 */
const onHouseholdUpdated = () => {
  ElMessage.success('家庭信息已更新');
  loadMyHousehold();
};

/**
 * 创建家庭回调
 */
const onHouseholdCreated = () => {
  ElMessage.success('户码创建成功');
  loadMyHousehold();
};

/**
 * 求助提交回调
 */
const onHelpSubmitted = () => {
  ElMessage.success('求助信息已发布');
};

// ========== 生命周期 ==========
onMounted(() => {
  loadMyHousehold();

  // 监听键盘事件
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

/**
 * 处理键盘事件
 */
const handleKeydown = event => {
  // Ctrl/Cmd + Q 快速显示二维码
  if ((event.ctrlKey || event.metaKey) && event.key === 'q') {
    event.preventDefault();
    showMyQRCode();
  }

  // Ctrl/Cmd + S 扫码
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault();
    showScanDialog();
  }
};
</script>

<style scoped>
.household-code-enhanced {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

/* ========== 增强头部样式 ========== */
.enhanced-header {
  position: relative;
  background: white;
  border-radius: 0 0 25px 25px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.header-bg-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 25% 50%, rgba(64, 158, 255, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 75% 50%, rgba(103, 194, 58, 0.08) 0%, transparent 50%);
  z-index: 0;
}

.header-container {
  position: relative;
  z-index: 1;
  padding: 30px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  background: transparent;
  padding: 0;
  margin-bottom: 25px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-icon {
  color: #409eff;
  font-size: 28px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* ========== 统计仪表板样式 ========== */
.stats-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 15px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stat-card.primary {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
}

.stat-card.success {
  background: linear-gradient(135deg, #67c23a 0%, #95d475 100%);
  color: white;
}

.stat-card.warning {
  background: linear-gradient(135deg, #e6a23c 0%, #ebb563 100%);
  color: white;
}

.stat-card.info {
  background: linear-gradient(135deg, #909399 0%, #a6a9ad 100%);
  color: white;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

/* ========== 主要内容样式 ========== */
.main-content {
  max-width: 1400px;
  margin: 30px auto;
  padding: 0 30px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.my-household-section {
  width: 100%;
}

.household-card.enhanced {
  border-radius: 15px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  gap: 8px;
}

.household-overview {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.household-main-info {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 30px;
  align-items: start;
}

.code-display {
  display: flex;
  justify-content: center;
}

.code-visual {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
  padding: 25px;
  border-radius: 15px;
  text-align: center;
  min-width: 180px;
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.3);
}

.code-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.code-number {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  font-family: monospace;
  letter-spacing: 1px;
}

.household-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-row .label {
  font-weight: 600;
  color: #606266;
  min-width: 100px;
}

.detail-row .value {
  color: #303133;
  font-size: 15px;
}

.household-tags {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.tags-title {
  margin: 0 0 15px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.tags-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.household-tag {
  margin: 0;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* ========== 空状态样式 ========== */
.empty-household-card {
  text-align: center;
  border-radius: 15px;
}

.empty-content {
  padding: 40px;
}

.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

/* ========== 智能功能区域样式 ========== */
.smart-functions {
  width: 100%;
}

.section-title {
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  position: relative;
  padding-left: 15px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border-radius: 2px;
}

.functions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
}

.function-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.function-card:hover {
  border-color: #409eff;
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(64, 158, 255, 0.15);
}

.function-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.function-content {
  flex: 1;
}

.function-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.function-desc {
  margin: 0 0 12px;
  font-size: 14px;
  color: #606266;
  line-height: 1.4;
}

.function-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.function-tips {
  font-size: 12px;
  color: #909399;
}

.function-arrow {
  color: #c0c4cc;
  transition: all 0.3s;
}

.function-card:hover .function-arrow {
  color: #409eff;
  transform: translateX(5px);
}

/* ========== 邻里互助区域样式 ========== */
.community-section {
  width: 100%;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.community-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.help-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #f0f2f5;
}

.help-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.1);
  transform: translateY(-2px);
}

.help-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.help-info {
  flex: 1;
}

.help-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.help-time {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.help-desc {
  margin: 0 0 15px;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.help-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.help-rewards .el-tag {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ========== 积分排行榜样式 ========== */
.points-ranking {
  width: 100%;
}

.ranking-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px 20px;
  border-bottom: 1px solid #f0f2f5;
  transition: all 0.3s;
}

.ranking-item:last-child {
  border-bottom: none;
}

.ranking-item:hover {
  background: #f8f9fa;
}

.ranking-item.top-three {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 215, 0, 0.02) 100%);
}

.ranking-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  background: #f0f2f5;
  color: #606266;
  flex-shrink: 0;
}

.ranking-number.rank-1 {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: white;
}

.ranking-number.rank-2 {
  background: linear-gradient(135deg, #c0c0c0 0%, #d8d8d8 100%);
  color: white;
}

.ranking-number.rank-3 {
  background: linear-gradient(135deg, #cd7f32 0%, #e4a853 100%);
  color: white;
}

.ranking-info {
  flex: 1;
}

.ranking-name {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.ranking-household {
  margin: 0;
  font-size: 12px;
  color: #909399;
  font-family: monospace;
}

.ranking-points {
  text-align: right;
}

.points-value {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
  line-height: 1;
}

.points-label {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

/* ========== 响应式设计 ========== */
@media (max-width: 1200px) {
  .household-main-info {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .code-display {
    order: 2;
  }

  .household-details {
    order: 1;
  }
}

@media (max-width: 768px) {
  .header-container {
    padding: 20px;
  }

  .header-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .stats-dashboard {
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }

  .main-content {
    padding: 0 20px;
  }

  .functions-grid {
    grid-template-columns: 1fr;
  }

  .community-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .el-button {
    width: 100%;
  }

  .function-card {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }

  .function-content {
    text-align: center;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .header-container {
    padding: 15px;
  }

  .stats-dashboard {
    grid-template-columns: 1fr;
  }

  .main-content {
    padding: 0 15px;
  }

  .stat-card {
    padding: 15px;
  }

  .stat-value {
    font-size: 24px;
  }

  .code-visual {
    min-width: 150px;
    padding: 20px;
  }

  .help-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .help-footer {
    flex-direction: column;
    gap: 10px;
  }

  .ranking-item {
    padding: 12px 15px;
  }

  .points-value {
    font-size: 16px;
  }
}

/* ========== 大字模式样式 ========== */
.large-text-mode .header-title h1 {
  font-size: 28px;
}

.large-text-mode .section-title {
  font-size: 24px;
}

.large-text-mode .card-title {
  font-size: 20px;
}

.large-text-mode .function-title {
  font-size: 18px;
}

.large-text-mode .function-desc {
  font-size: 16px;
}

.large-text-mode .stat-value {
  font-size: 32px;
}

.large-text-mode .points-value {
  font-size: 22px;
}

/* ========== 无障碍设计 ========== */
.household-code-enhanced:focus-within .function-card,
.household-code-enhanced:focus-within .help-card {
  outline: 2px solid #409eff;
  outline-offset: 2px;
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .household-code-enhanced {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  }

  .enhanced-header {
    background: #1f1f1f;
    color: #ffffff;
  }

  .stat-card {
    background: #2a2a2a;
    color: #ffffff;
  }

  .function-card,
  .help-card,
  .ranking-list {
    background: #2a2a2a;
    color: #ffffff;
    border-color: #3a3a3a;
  }

  .household-tags {
    background: #2a2a2a;
  }
}
</style>
