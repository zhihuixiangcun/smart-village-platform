<template>
  <div
    class="household-code-container"
    :class="{ 'large-text-mode': accessibilityStore?.largeTextMode }"
  >
    <!-- 智能页面头部 -->
    <header class="smart-header">
      <div class="header-bg"></div>
      <div class="header-content">
        <el-page-header @back="$router.go(-1)">
          <template #content>
            <div class="header-title">
              <el-icon class="title-icon"><Wallet /></el-icon>
              <h1>一户一码管理系统</h1>
              <el-tag type="primary" size="small" effect="light">智慧乡村</el-tag>
            </div>
          </template>
          <template #extra>
            <div class="header-actions">
              <el-button
                @click="showMyQRCode"
                type="primary"
                :size="isMobile ? 'small' : 'default'"
                :icon="User"
              >
                我的户码
              </el-button>
              <el-button
                @click="toggleVoiceMode"
                circle
                :size="isMobile ? 'small' : 'default'"
                :icon="voiceMode ? Microphone : MicrophoneSlash"
              />
              <el-button
                @click="toggleLargeText"
                circle
                :size="isMobile ? 'small' : 'default'"
                icon="FontSize"
              />
            </div>
          </template>
        </el-page-header>

        <!-- 实时统计仪表板 -->
        <div class="stats-dashboard">
          <div class="stat-card total">
            <div class="stat-icon">
              <el-icon><House /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ dashboardStats.totalHouseholds }}</div>
              <div class="stat-label">总户数</div>
            </div>
          </div>
          <div class="stat-card active">
            <div class="stat-icon">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ dashboardStats.totalMembers }}</div>
              <div class="stat-label">总人口</div>
            </div>
          </div>
          <div class="stat-card scan">
            <div class="stat-icon">
              <el-icon><View /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ dashboardStats.todayScans }}</div>
              <div class="stat-label">今日扫码</div>
            </div>
          </div>
          <div class="stat-card help">
            <div class="stat-icon">
              <el-icon><Handshake /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ dashboardStats.activeHelpRequests }}</div>
              <div class="stat-label">互助请求</div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 我的户码 -->
      <section class="my-household-section">
        <el-card v-if="myHousehold" class="household-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <h3>我的家庭</h3>
                <el-tag :type="getHouseholdTagType(myHousehold.category)" effect="light">
                  {{ getCategoryText(myHousehold.category) }}
                </el-tag>
              </div>
              <div class="header-right">
                <el-dropdown @command="handleQuickAction">
                  <el-button :icon="MoreFilled" circle />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="refresh">刷新信息</el-dropdown-item>
                      <el-dropdown-item command="download">下载二维码</el-dropdown-item>
                      <el-dropdown-item command="print">打印户码</el-dropdown-item>
                      <el-dropdown-item command="history" divided>更新历史</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </template>

          <div class="household-info">
            <el-row :gutter="20">
              <el-col :xs="24" :md="8">
                <div class="qr-code-preview">
                  <el-image
                    v-if="myHousehold.qrCode"
                    :src="myHousehold.qrCode"
                    fit="contain"
                    :preview-src-list="[myHousehold.qrCode]"
                    class="qr-image"
                  />
                  <div class="qr-code-text">
                    <p class="code-id">{{ myHousehold.code }}</p>
                    <p class="scan-tip">扫码查看家庭信息</p>
                  </div>
                </div>
              </el-col>
              <el-col :xs="24" :md="16">
                <div class="household-details">
                  <div class="detail-item">
                    <span class="label">户主：</span>
                    <span class="value">{{ myHousehold.householder }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">地址：</span>
                    <span class="value">{{ myHousehold.address }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">人口：</span>
                    <span class="value">{{ myHousehold.population }}人</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">联系方式：</span>
                    <span class="value">{{ maskPhone(myHousehold.phone) }}</span>
                  </div>
                  <div class="household-tags" v-if="myHousehold.tags?.length">
                    <el-tag
                      v-for="tag in myHousehold.tags"
                      :key="tag"
                      size="small"
                      class="tag-item"
                    >
                      {{ tag }}
                    </el-tag>
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>

          <div class="household-actions">
            <el-button type="primary" @click="showQRDialog = true" :icon="View">
              查看二维码
            </el-button>
            <el-button @click="showMembersDialog = true" :icon="Users"> 家庭成员 </el-button>
            <el-button @click="showUpdateDialog = true" :icon="Edit"> 更新信息 </el-button>
          </div>
        </el-card>

        <!-- 空状态 -->
        <el-card v-else class="empty-card" shadow="never">
          <el-empty description="暂无家庭信息">
            <el-button type="primary" @click="loadMyHousehold">
              <el-icon><Refresh /></el-icon>
              重新加载
            </el-button>
          </el-empty>
        </el-card>
      </section>

      <!-- 邻里互助 -->
      <section class="neighborhood-help-section">
        <el-card class="help-card" shadow="hover">
          <template #header>
            <div class="section-header">
              <div class="header-left">
                <h3>
                  <el-icon><Handshake /></el-icon>
                  邻里互助
                </h3>
                <el-badge :value="helpRequests.length" type="danger" v-if="helpRequests.length" />
              </div>
              <div class="header-right">
                <el-button type="primary" size="small" @click="showHelpDialog = true">
                  <el-icon><Plus /></el-icon>
                  发起求助
                </el-button>
                <el-button size="small" @click="loadHelpRequests">
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
              </div>
            </div>
          </template>

          <!-- 帮助分类标签 -->
          <div class="help-categories">
            <el-radio-group v-model="selectedHelpCategory" @change="filterHelpRequests">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="life">生活帮助</el-radio-button>
              <el-radio-button label="farm">农事协助</el-radio-button>
              <el-radio-button label="emergency">紧急救援</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 帮助请求列表 -->
          <div class="help-requests">
            <div v-if="filteredHelpRequests.length === 0" class="empty-help">
              <el-empty description="暂无求助信息" />
            </div>
            <div
              v-else
              v-for="request in filteredHelpRequests"
              :key="request.id"
              class="help-request-item"
              :class="{ urgent: request.priority === 'high' }"
            >
              <div class="request-header">
                <div class="request-info">
                  <el-tag :type="getHelpCategoryType(request.category)" size="small">
                    {{ getHelpCategoryText(request.category) }}
                  </el-tag>
                  <span class="request-title">{{ request.title }}</span>
                  <el-tag v-if="request.priority === 'high'" type="danger" size="small">
                    紧急
                  </el-tag>
                </div>
                <div class="request-time">
                  {{ formatTime(request.createdAt) }}
                </div>
              </div>
              <div class="request-content">
                <p>{{ request.description }}</p>
              </div>
              <div class="request-footer">
                <div class="requester-info">
                  <el-icon><User /></el-icon>
                  <span>{{ request.requesterName }}</span>
                  <el-tag type="info" size="small">{{ request.points }}积分</el-tag>
                </div>
                <div class="request-actions">
                  <el-button
                    type="primary"
                    size="small"
                    @click="handleHelpResponse(request)"
                    v-if="request.status === 'pending'"
                  >
                    我来帮忙
                  </el-button>
                  <el-button size="small" @click="viewHelpDetail(request)"> 查看详情 </el-button>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </section>

      <!-- 功能菜单 -->
      <section class="functions-section">
        <el-card class="functions-card" shadow="hover">
          <template #header>
            <h3>功能菜单</h3>
          </template>

          <el-row :gutter="16">
            <el-col :xs="12" :sm="8" :md="6" v-for="func in functionMenus" :key="func.id">
              <div class="function-item" @click="handleFunctionClick(func)">
                <div class="function-icon">
                  <el-icon :size="32">
                    <component :is="func.icon" />
                  </el-icon>
                </div>
                <div class="function-text">{{ func.text }}</div>
                <el-badge v-if="func.badge" :value="func.badge" class="function-badge" />
              </div>
            </el-col>
          </el-row>
        </el-card>
      </section>

      <!-- 互助排行榜 -->
      <section class="leaderboard-section">
        <el-card class="leaderboard-card" shadow="hover">
          <template #header>
            <div class="section-header">
              <h3>
                <el-icon><Trophy /></el-icon>
                互助排行榜
              </h3>
              <el-radio-group v-model="leaderboardType" size="small">
                <el-radio-button label="monthly">本月</el-radio-button>
                <el-radio-button label="total">总榜</el-radio-button>
              </el-radio-group>
            </div>
          </template>

          <el-table :data="leaderboardData" stripe>
            <el-table-column type="index" width="50" />
            <el-table-column prop="rank" label="排名" width="80">
              <template #default="scope">
                <el-tag :type="getRankType(scope.row.rank)" size="small" v-if="scope.row.rank <= 3">
                  {{ scope.row.rank }}
                </el-tag>
                <span v-else>{{ scope.row.rank }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="姓名" />
            <el-table-column prop="helpCount" label="帮助次数" />
            <el-table-column prop="totalPoints" label="总积分">
              <template #default="scope">
                <el-tag type="success">{{ scope.row.totalPoints }}分</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="level" label="等级">
              <template #default="scope">
                <el-tag :type="getLevelType(scope.row.level)">
                  {{ getLevelText(scope.row.level) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </section>
    </main>

    <!-- 二维码显示对话框 -->
    <el-dialog
      v-model="showQRDialog"
      title="家庭二维码"
      width="450px"
      center
      :close-on-click-modal="false"
    >
      <div class="qr-dialog-content">
        <div v-if="qrLoading" class="qr-loading">
          <el-icon class="is-loading" :size="50"><Loading /></el-icon>
          <p>正在生成二维码...</p>
        </div>
        <div v-else-if="qrImageUrl" class="qr-display">
          <div class="qr-image">
            <img :src="qrImageUrl" alt="家庭二维码" />
          </div>
          <div class="qr-info">
            <p class="code-text">{{ myHousehold?.code }}</p>
            <p class="scan-tip">扫码查看家庭信息</p>
          </div>
        </div>
        <div v-else class="qr-error">
          <el-result icon="error" title="生成失败">
            <template #extra>
              <el-button type="primary" @click="generateQR">重新生成</el-button>
            </template>
          </el-result>
        </div>
      </div>
      <template #footer>
        <el-button @click="showQRDialog = false">关闭</el-button>
        <el-button type="primary" @click="downloadQR" :disabled="!qrImageUrl">
          <el-icon><Download /></el-icon>
          下载二维码
        </el-button>
      </template>
    </el-dialog>

    <!-- 家庭成员对话框 -->
    <el-dialog v-model="showMembersDialog" title="家庭成员" width="600px" center>
      <el-table v-if="myHousehold?.members?.length" :data="myHousehold.members" stripe>
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="relation" label="关系" width="100" />
        <el-table-column prop="gender" label="性别" width="80" />
        <el-table-column prop="birthDate" label="出生日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.birthDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" />
        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button size="small" @click="viewMemberDetail(scope.row)"> 查看 </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无成员信息" />
      <template #footer>
        <el-button @click="showMembersDialog = false">关闭</el-button>
        <el-button type="primary" @click="showAddMemberDialog = true">
          <el-icon><Plus /></el-icon>
          添加成员
        </el-button>
      </template>
    </el-dialog>

    <!-- 更新信息对话框 -->
    <el-dialog v-model="showUpdateDialog" title="更新家庭信息" width="600px" center>
      <el-form :model="updateForm" label-width="100px">
        <el-tabs v-model="updateTab">
          <el-tab-pane label="基本信息" name="basic">
            <el-form-item label="联系电话">
              <el-input v-model="updateForm.phone" placeholder="请输入联系电话" />
            </el-form-item>
            <el-form-item label="家庭地址">
              <el-input v-model="updateForm.address" type="textarea" placeholder="请输入详细地址" />
            </el-form-item>
          </el-tab-pane>
          <el-tab-pane label="家庭标签" name="tags">
            <el-form-item label="标签">
              <el-checkbox-group v-model="updateForm.tags">
                <el-checkbox label="党员家庭">党员家庭</el-checkbox>
                <el-checkbox label="军属家庭">军属家庭</el-checkbox>
                <el-checkbox label="文明家庭">文明家庭</el-checkbox>
                <el-checkbox label="安全家庭">安全家庭</el-checkbox>
                <el-checkbox label="五好家庭">五好家庭</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      <template #footer>
        <el-button @click="showUpdateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateInfo">保存</el-button>
      </template>
    </el-dialog>

    <!-- 发起求助对话框 -->
    <el-dialog v-model="showHelpDialog" title="发起邻里互助" width="500px" center>
      <el-form :model="helpForm" :rules="helpRules" ref="helpFormRef" label-width="100px">
        <el-form-item label="求助类型" prop="category">
          <el-select v-model="helpForm.category" placeholder="请选择类型">
            <el-option label="生活帮助" value="life" />
            <el-option label="农事协助" value="farm" />
            <el-option label="紧急救援" value="emergency" />
          </el-select>
        </el-form-item>
        <el-form-item label="求助标题" prop="title">
          <el-input v-model="helpForm.title" placeholder="请输入求助标题" />
        </el-form-item>
        <el-form-item label="详细描述" prop="description">
          <el-input
            v-model="helpForm.description"
            type="textarea"
            :rows="4"
            placeholder="请详细描述您的需求"
          />
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-radio-group v-model="helpForm.priority">
            <el-radio label="normal">普通</el-radio>
            <el-radio label="high">紧急</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="积分奖励">
          <el-input-number v-model="helpForm.points" :min="5" :max="100" />
          <span class="help-tip">（设置积分奖励，吸引更多邻居帮助）</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showHelpDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitHelp" :loading="submittingHelp">
          发布求助
        </el-button>
      </template>
    </el-dialog>

    <!-- 添加成员对话框 -->
    <el-dialog v-model="showAddMemberDialog" title="添加家庭成员" width="500px" center>
      <el-form :model="memberForm" label-width="100px">
        <el-form-item label="姓名" required>
          <el-input v-model="memberForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="关系" required>
          <el-select v-model="memberForm.relation" placeholder="请选择关系">
            <el-option label="配偶" value="配偶" />
            <el-option label="子女" value="子女" />
            <el-option label="父母" value="父母" />
            <el-option label="兄弟姐妹" value="兄弟姐妹" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="身份证号" required>
          <el-input v-model="memberForm.idCard" placeholder="请输入身份证号" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="memberForm.phone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="memberForm.gender">
            <el-radio label="男">男</el-radio>
            <el-radio label="女">女</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddMemberDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddMember">确定</el-button>
      </template>
    </el-dialog>

    <!-- 语音交互模式 -->
    <div v-if="voiceMode" class="voice-overlay" @click="closeVoiceMode">
      <div class="voice-panel" @click.stop>
        <div class="voice-header">
          <h3>语音助手</h3>
          <el-button @click="closeVoiceMode" circle :icon="Close" />
        </div>
        <div class="voice-content">
          <div class="voice-visualizer">
            <el-icon class="voice-icon is-pulsing" :size="60"><Microphone /></el-icon>
          </div>
          <p class="voice-tip">请说出您的需求...</p>
          <div class="voice-commands">
            <p>支持的命令：</p>
            <ul>
              <li>"查看我的户码"</li>
              <li>"发起求助"</li>
              <li>"查看邻居求助"</li>
              <li>"更新家庭信息"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Wallet,
  User,
  Users,
  House,
  View,
  Edit,
  Plus,
  Download,
  Refresh,
  Handshake,
  Trophy,
  Microphone,
  MicrophoneSlash,
  MoreFilled,
  Loading,
  Close,
  FontSize,
} from '@element-plus/icons-vue';
import householdQRApi from '@/api/householdQR';

const router = useRouter();

// 响应式数据
const myHousehold = ref(null);
const qrImageUrl = ref('');
const qrLoading = ref(false);
const isMobile = ref(false);
const voiceMode = ref(false);
const accessibilityStore = ref({ largeTextMode: false });

// 对话框控制
const showQRDialog = ref(false);
const showMembersDialog = ref(false);
const showUpdateDialog = ref(false);
const showHelpDialog = ref(false);
const showAddMemberDialog = ref(false);

// 表单数据
const updateForm = reactive({
  phone: '',
  address: '',
  tags: [],
});
const updateTab = ref('basic');

const helpForm = reactive({
  category: '',
  title: '',
  description: '',
  priority: 'normal',
  points: 10,
});

const memberForm = reactive({
  name: '',
  relation: '',
  idCard: '',
  phone: '',
  gender: '男',
});

// 统计数据
const dashboardStats = ref({
  totalHouseholds: 486,
  totalMembers: 1856,
  todayScans: 89,
  activeHelpRequests: 12,
});

// 邻里互助数据
const helpRequests = ref([
  {
    id: 1,
    category: 'life',
    title: '需要帮忙购买生活用品',
    description: '因腿脚不便，需要邻居帮忙购买一些日常用品',
    requesterName: '张大妈',
    points: 15,
    priority: 'normal',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: 2,
    category: 'farm',
    title: '收割水稻需要人手',
    description: '明天开始收割水稻，需要2-3个邻居帮忙',
    requesterName: '李大哥',
    points: 30,
    priority: 'high',
    status: 'pending',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
]);

const selectedHelpCategory = ref('all');
const submittingHelp = ref(false);
const helpFormRef = ref();

// 功能菜单
const functionMenus = ref([
  { id: 'scan', text: '扫码查看', icon: View },
  { id: 'help', text: '邻里互助', icon: Handshake, badge: helpRequests.value.length },
  { id: 'members', text: '家庭成员', icon: Users },
  { id: 'update', text: '更新信息', icon: Edit },
  { id: 'history', text: '更新历史', icon: Refresh },
  { id: 'export', text: '导出数据', icon: Download },
]);

// 排行榜数据
const leaderboardType = ref('monthly');
const leaderboardData = ref([
  { rank: 1, name: '王小明', helpCount: 28, totalPoints: 420, level: 'gold' },
  { rank: 2, name: '张大妈', helpCount: 25, totalPoints: 380, level: 'gold' },
  { rank: 3, name: '李大哥', helpCount: 22, totalPoints: 330, level: 'silver' },
  { rank: 4, name: '赵大姐', helpCount: 18, totalPoints: 270, level: 'silver' },
  { rank: 5, name: '陈大爷', helpCount: 15, totalPoints: 225, level: 'bronze' },
]);

// 表单验证规则
const helpRules = {
  category: [{ required: true, message: '请选择求助类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入求助标题', trigger: 'blur' }],
  description: [{ required: true, message: '请输入详细描述', trigger: 'blur' }],
};

// 计算属性
const filteredHelpRequests = computed(() => {
  if (selectedHelpCategory.value === 'all') {
    return helpRequests.value;
  }
  return helpRequests.value.filter(req => req.category === selectedHelpCategory.value);
});

// 方法
const loadMyHousehold = async () => {
  try {
    // 模拟数据
    myHousehold.value = {
      id: 'HH001',
      code: 'HH-2024-0001',
      householder: '张三',
      address: '幸福村幸福路123号',
      population: 4,
      phone: '13812345678',
      category: 'normal',
      tags: ['党员家庭', '文明家庭'],
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=HH-2024-0001',
      members: [
        {
          name: '张三',
          relation: '户主',
          gender: '男',
          birthDate: '1975-05-15',
          phone: '13812345678',
        },
        {
          name: '李四',
          relation: '配偶',
          gender: '女',
          birthDate: '1978-08-20',
          phone: '13887654321',
        },
      ],
    };
  } catch (error) {
    ElMessage.error('加载失败');
  }
};

const showMyQRCode = () => {
  if (!myHousehold.value) {
    ElMessage.warning('请先加载家庭信息');
    return;
  }
  showQRDialog.value = true;
  generateQR();
};

const generateQR = async () => {
  qrLoading.value = true;
  try {
    // 模拟二维码生成
    setTimeout(() => {
      qrImageUrl.value = myHousehold.value.qrCode;
      qrLoading.value = false;
    }, 1000);
  } catch (error) {
    qrLoading.value = false;
    ElMessage.error('生成失败');
  }
};

const downloadQR = () => {
  if (!qrImageUrl.value) {
    ElMessage.warning('请先生成二维码');
    return;
  }
  const link = document.createElement('a');
  link.href = qrImageUrl.value;
  link.download = `户码_${myHousehold.value.code}.png`;
  link.click();
  ElMessage.success('下载成功');
};

const handleQuickAction = command => {
  switch (command) {
    case 'refresh':
      loadMyHousehold();
      break;
    case 'download':
      downloadQR();
      break;
    case 'print':
      ElMessage.info('打印功能开发中');
      break;
    case 'history':
      ElMessage.info('更新历史功能开发中');
      break;
  }
};

const handleFunctionClick = func => {
  switch (func.id) {
    case 'scan':
      ElMessage.info('扫码功能开发中');
      break;
    case 'help':
      showHelpDialog.value = true;
      break;
    case 'members':
      showMembersDialog.value = true;
      break;
    case 'update':
      showUpdateDialog.value = true;
      break;
    case 'history':
      ElMessage.info('更新历史功能开发中');
      break;
    case 'export':
      ElMessage.info('导出功能开发中');
      break;
  }
};

const handleSubmitHelp = async () => {
  if (!helpFormRef.value) return;

  await helpFormRef.value.validate(async valid => {
    if (valid) {
      submittingHelp.value = true;
      try {
        const newRequest = {
          id: helpRequests.value.length + 1,
          ...helpForm,
          requesterName: myHousehold.value.householder,
          status: 'pending',
          createdAt: new Date(),
        };
        helpRequests.value.unshift(newRequest);

        ElMessage.success('求助发布成功');
        showHelpDialog.value = false;

        // 重置表单
        Object.assign(helpForm, {
          category: '',
          title: '',
          description: '',
          priority: 'normal',
          points: 10,
        });
      } catch (error) {
        ElMessage.error('发布失败');
      } finally {
        submittingHelp.value = false;
      }
    }
  });
};

const handleHelpResponse = request => {
  ElMessageBox.confirm(`确定要响应 ${request.requesterName} 的求助吗？`, '确认响应', {
    type: 'warning',
  }).then(() => {
    request.status = 'responded';
    ElMessage.success('响应成功');
  });
};

const viewHelpDetail = request => {
  ElMessageBox.alert(
    `
    <div style="text-align: left;">
      <p><strong>求助类型：</strong>${getHelpCategoryText(request.category)}</p>
      <p><strong>求助标题：</strong>${request.title}</p>
      <p><strong>详细描述：</strong>${request.description}</p>
      <p><strong>求助人：</strong>${request.requesterName}</p>
      <p><strong>积分奖励：</strong>${request.points}分</p>
      <p><strong>发布时间：</strong>${formatTime(request.createdAt)}</p>
    </div>
  `,
    '求助详情',
    { dangerouslyUseHTMLString: true }
  );
};

const handleAddMember = async () => {
  try {
    ElMessage.success('成员添加成功');
    showAddMemberDialog.value = false;
    // 重置表单
    Object.assign(memberForm, {
      name: '',
      relation: '',
      idCard: '',
      phone: '',
      gender: '男',
    });
  } catch (error) {
    ElMessage.error('添加失败');
  }
};

const handleUpdateInfo = async () => {
  try {
    ElMessage.success('信息更新成功');
    showUpdateDialog.value = false;
  } catch (error) {
    ElMessage.error('更新失败');
  }
};

const viewMemberDetail = member => {
  ElMessageBox.alert(
    `
    <div style="text-align: left;">
      <p><strong>姓名：</strong>${member.name}</p>
      <p><strong>关系：</strong>${member.relation}</p>
      <p><strong>性别：</strong>${member.gender}</p>
      <p><strong>出生日期：</strong>${formatDate(member.birthDate)}</p>
      <p><strong>联系电话：</strong>${member.phone || '未设置'}</p>
    </div>
  `,
    '成员详情',
    { dangerouslyUseHTMLString: true }
  );
};

const toggleVoiceMode = () => {
  voiceMode.value = !voiceMode.value;
};

const closeVoiceMode = () => {
  voiceMode.value = false;
};

const toggleLargeText = () => {
  accessibilityStore.value.largeTextMode = !accessibilityStore.value.largeTextMode;
};

const loadHelpRequests = () => {
  ElMessage.success('刷新成功');
};

const filterHelpRequests = () => {
  // 触发重新计算
};

// 辅助函数
const getHouseholdTagType = category => {
  const typeMap = {
    normal: 'primary',
    lowIncome: 'danger',
    singleChild: 'success',
    elderly: 'warning',
    disabled: 'info',
  };
  return typeMap[category] || 'primary';
};

const getCategoryText = category => {
  const textMap = {
    normal: '普通住户',
    lowIncome: '低保户',
    singleChild: '独生子女户',
    elderly: '独居老人',
    disabled: '残疾家庭',
  };
  return textMap[category] || category;
};

const getHelpCategoryType = category => {
  const typeMap = {
    life: 'success',
    farm: 'warning',
    emergency: 'danger',
  };
  return typeMap[category] || 'info';
};

const getHelpCategoryText = category => {
  const textMap = {
    life: '生活帮助',
    farm: '农事协助',
    emergency: '紧急救援',
  };
  return textMap[category] || category;
};

const getRankType = rank => {
  if (rank === 1) return 'danger';
  if (rank === 2) return 'warning';
  if (rank === 3) return 'success';
  return 'info';
};

const getLevelType = level => {
  const typeMap = {
    gold: 'danger',
    silver: 'warning',
    bronze: 'success',
  };
  return typeMap[level] || 'info';
};

const getLevelText = level => {
  const textMap = {
    gold: '金牌',
    silver: '银牌',
    bronze: '铜牌',
  };
  return textMap[level] || level;
};

const maskPhone = phone => {
  if (!phone) return '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

const formatTime = date => {
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours}小时前`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;

  return date.toLocaleDateString();
};

const formatDate = date => {
  if (!date) return '未设置';
  return new Date(date).toLocaleDateString('zh-CN');
};

// 生命周期
onMounted(() => {
  isMobile.value = window.innerWidth < 768;
  loadMyHousehold();
});
</script>

<style lang="scss" scoped>
.household-code-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);

  &.large-text-mode {
    font-size: 1.2em;
  }
}

.smart-header {
  background: white;
  border-radius: 0 0 30px 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  overflow: hidden;

  .header-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    opacity: 0.1;
  }

  .header-content {
    position: relative;
    padding: 20px;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 24px;
    font-weight: 600;
    color: #2c3e50;

    .title-icon {
      color: #667eea;
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }

  .stats-dashboard {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-top: 30px;

    .stat-card {
      background: white;
      border-radius: 15px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 15px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      transition:
        transform 0.3s,
        box-shadow 0.3s;

      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
      }

      .stat-icon {
        width: 50px;
        height: 50px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
      }

      &.total .stat-icon {
        background: linear-gradient(135deg, #667eea, #764ba2);
      }
      &.active .stat-icon {
        background: linear-gradient(135deg, #f093fb, #f5576c);
      }
      &.scan .stat-icon {
        background: linear-gradient(135deg, #4facfe, #00f2fe);
      }
      &.help .stat-icon {
        background: linear-gradient(135deg, #43e97b, #38f9d7);
      }

      .stat-content {
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #2c3e50;
          line-height: 1;
        }

        .stat-label {
          font-size: 14px;
          color: #7f8c8d;
          margin-top: 5px;
        }
      }
    }
  }
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.my-household-section {
  .household-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;

        h3 {
          margin: 0;
          color: #2c3e50;
        }
      }
    }

    .household-info {
      margin: 20px 0;

      .qr-code-preview {
        text-align: center;

        .qr-image {
          width: 150px;
          height: 150px;
          margin: 0 auto 15px;
          border-radius: 10px;
          overflow: hidden;
          border: 2px solid #e1e8ed;
        }

        .qr-code-text {
          .code-id {
            font-family: monospace;
            font-size: 16px;
            font-weight: 600;
            color: #667eea;
            margin: 0;
          }

          .scan-tip {
            font-size: 12px;
            color: #7f8c8d;
            margin: 5px 0 0;
          }
        }
      }

      .household-details {
        .detail-item {
          display: flex;
          margin-bottom: 12px;

          .label {
            font-weight: 600;
            color: #7f8c8d;
            min-width: 80px;
          }

          .value {
            color: #2c3e50;
            flex: 1;
          }
        }

        .household-tags {
          margin-top: 15px;

          .tag-item {
            margin-right: 8px;
            margin-bottom: 8px;
          }
        }
      }
    }

    .household-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      border-top: 1px solid #e1e8ed;
      padding-top: 20px;
    }
  }
}

.neighborhood-help-section {
  .help-card {
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;

        h3 {
          margin: 0;
          color: #2c3e50;
          display: flex;
          align-items: center;
          gap: 8px;
        }
      }

      .header-right {
        display: flex;
        gap: 12px;
      }
    }

    .help-categories {
      margin-bottom: 20px;
    }

    .help-requests {
      max-height: 400px;
      overflow-y: auto;

      .help-request-item {
        border: 1px solid #e1e8ed;
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 15px;
        background: white;
        transition: all 0.3s;

        &:hover {
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        &.urgent {
          border-color: #e74c3c;
          background: linear-gradient(135deg, rgba(231, 76, 60, 0.05), rgba(231, 76, 60, 0.1));
        }

        .request-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;

          .request-info {
            display: flex;
            align-items: center;
            gap: 8px;

            .request-title {
              font-weight: 600;
              color: #2c3e50;
            }
          }

          .request-time {
            font-size: 12px;
            color: #7f8c8d;
          }
        }

        .request-content {
          margin-bottom: 10px;

          p {
            margin: 0;
            color: #34495e;
            font-size: 14px;
            line-height: 1.5;
          }
        }

        .request-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .requester-info {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #7f8c8d;
            font-size: 14px;
          }

          .request-actions {
            display: flex;
            gap: 8px;
          }
        }
      }
    }
  }
}

.functions-section {
  .functions-card {
    .function-item {
      text-align: center;
      padding: 20px;
      border: 1px solid #e1e8ed;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;
      margin-bottom: 15px;

      &:hover {
        border-color: #667eea;
        box-shadow: 0 2px 10px rgba(102, 126, 234, 0.2);
        transform: translateY(-2px);
      }

      .function-icon {
        color: #667eea;
        margin-bottom: 10px;
      }

      .function-text {
        font-size: 14px;
        color: #2c3e50;
      }

      .function-badge {
        position: absolute;
        top: 10px;
        right: 10px;
      }
    }
  }
}

.leaderboard-section {
  .leaderboard-card {
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h3 {
        margin: 0;
        color: #2c3e50;
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
  }
}

// 对话框样式
.qr-dialog-content {
  text-align: center;

  .qr-loading,
  .qr-display,
  .qr-error {
    padding: 20px 0;
  }

  .qr-image img {
    width: 250px;
    height: 250px;
    border: 1px solid #e1e8ed;
    border-radius: 10px;
    padding: 10px;
    background: white;
  }

  .qr-info {
    margin-top: 20px;

    .code-text {
      font-family: monospace;
      font-size: 18px;
      font-weight: 600;
      color: #667eea;
      margin: 0 0 8px;
    }

    .scan-tip {
      font-size: 14px;
      color: #7f8c8d;
      margin: 0;
    }
  }
}

// 表单样式
.help-tip {
  font-size: 12px;
  color: #7f8c8d;
  margin-left: 8px;
}

// 语音交互样式
.voice-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;

  .voice-panel {
    background: white;
    border-radius: 20px;
    width: 400px;
    padding: 30px;
    text-align: center;

    .voice-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;

      h3 {
        margin: 0;
        color: #2c3e50;
      }
    }

    .voice-content {
      .voice-visualizer {
        margin-bottom: 20px;

        .voice-icon {
          color: #667eea;
          animation: pulse 1.5s ease-in-out infinite;
        }
      }

      .voice-tip {
        color: #7f8c8d;
        margin-bottom: 20px;
      }

      .voice-commands {
        text-align: left;
        background: #f8f9fa;
        border-radius: 10px;
        padding: 15px;

        p {
          margin: 0 0 10px;
          font-weight: 600;
          color: #2c3e50;
        }

        ul {
          margin: 0;
          padding-left: 20px;
          color: #7f8c8d;

          li {
            margin-bottom: 5px;
          }
        }
      }
    }
  }
}

// 动画
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .smart-header {
    .header-title {
      font-size: 18px;
    }

    .stats-dashboard {
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;

      .stat-card {
        padding: 15px;

        .stat-icon {
          width: 40px;
          height: 40px;
          font-size: 20px;
        }

        .stat-content .stat-value {
          font-size: 22px;
        }
      }
    }
  }

  .main-content {
    padding: 0 15px 30px;
  }

  .household-actions {
    flex-direction: column;

    .el-button {
      width: 100%;
    }
  }

  .functions-section {
    .function-item {
      padding: 15px;
    }
  }

  .voice-panel {
    width: 90%;
    margin: 20px;
  }
}
</style>
