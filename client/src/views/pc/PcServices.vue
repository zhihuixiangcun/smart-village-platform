<!--
  PC端生活服务页面
  智慧乡村综合服务平台 - PC端生活服务
-->
<template>
  <div class="pc-services">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1>生活服务</h1>
        <p>便民服务、办事指南、申请记录、服务统计</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showNewService">
          <el-icon><Plus /></el-icon>
          新建服务
        </el-button>
        <el-button @click="showServiceGuide">
          <el-icon><Document /></el-icon>
          服务指南
        </el-button>
      </div>
    </header>

    <!-- 服务分类导航 -->
    <section class="category-section">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="8" :md="4" v-for="category in serviceCategories" :key="category.key">
          <div
            class="category-card"
            :class="{ active: activeCategory === category.key }"
            @click="selectCategory(category.key)"
          >
            <div class="category-icon" :style="{ background: category.gradient }">
              <el-icon :size="28" color="white">
                <component :is="category.icon" />
              </el-icon>
            </div>
            <div class="category-name">{{ category.name }}</div>
            <div class="category-count">{{ category.count }}项</div>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- 统计概览 -->
    <section class="stats-section">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="8" :md="4" v-for="stat in serviceStats" :key="stat.key">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" :style="{ background: stat.gradient }">
                <el-icon :size="24" color="white">
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
    </section>

    <!-- 主内容区域 -->
    <section class="main-section">
      <el-row :gutter="20">
        <!-- 左侧内容 -->
        <el-col :xs="24" :sm="24" :md="16" :lg="16">
          <el-card class="content-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><Grid /></el-icon>
                  办事大厅
                </span>
                <div class="card-actions">
                  <el-input
                    v-model="searchKeyword"
                    placeholder="搜索服务..."
                    prefix-icon="Search"
                    clearable
                    class="search-input"
                  />
                </div>
              </div>
            </template>

            <div class="services-grid">
              <div
                v-for="service in filteredServices"
                :key="service.id"
                class="service-card"
                @click="openService(service)"
              >
                <div class="service-icon" :style="{ background: service.gradient }">
                  <el-icon :size="32" color="white">
                    <component :is="service.icon" />
                  </el-icon>
                </div>
                <div class="service-info">
                  <h3>{{ service.name }}</h3>
                  <p>{{ service.description }}</p>
                  <div class="service-meta">
                    <el-tag :type="getServiceType(service.type)" size="small">
                      {{ service.type }}
                    </el-tag>
                    <span class="service-time">
                      <el-icon><Clock /></el-icon>
                      {{ service.duration }}
                    </span>
                  </div>
                </div>
                <div class="service-action">
                  <el-button type="primary" size="small" @click.stop="applyService(service)">
                    在线办理
                  </el-button>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 申请记录 -->
          <el-card class="records-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><List /></el-icon>
                  我的申请记录
                </span>
                <el-select v-model="statusFilter" placeholder="状态筛选" clearable size="small">
                  <el-option label="全部" value="" />
                  <el-option label="待审核" value="pending" />
                  <el-option label="已通过" value="approved" />
                  <el-option label="已驳回" value="rejected" />
                  <el-option label="已完成" value="completed" />
                </el-select>
              </div>
            </template>

            <el-table :data="filteredApplications" stripe style="width: 100%">
              <el-table-column prop="serviceName" label="服务名称" min-width="180" />
              <el-table-column prop="applicant" label="申请人" width="100" />
              <el-table-column prop="applyTime" label="申请时间" width="120">
                <template #default="{ row }">
                  {{ formatDate(row.applyTime) }}
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row.status)" size="small">
                    {{ getStatusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="handler" label="处理人" width="100" />
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" text @click="viewApplication(row)">查看</el-button>
                  <el-button
                    v-if="row.status === 'pending'"
                    size="small"
                    text
                    @click="cancelApplication(row)"
                    >撤销</el-button
                  >
                  <el-button
                    v-if="row.status === 'rejected'"
                    size="small"
                    text
                    type="primary"
                    @click="resubmit(row)"
                    >重新提交</el-button
                  >
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-container">
              <el-pagination
                v-model:current-page="pagination.currentPage"
                v-model:page-size="pagination.pageSize"
                :page-sizes="[10, 20, 50]"
                :total="pagination.total"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleSizeChange"
                @current-change="handlePageChange"
              />
            </div>
          </el-card>
        </el-col>

        <!-- 右侧侧边栏 -->
        <el-col :xs="24" :sm="24" :md="8" :lg="8">
          <!-- 服务统计图表 -->
          <el-card class="sidebar-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><DataAnalysis /></el-icon>
                  服务统计
                </span>
              </div>
            </template>
            <div ref="statsChartRef" class="chart-container"></div>
          </el-card>

          <!-- 服务排行 -->
          <el-card class="sidebar-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><Top /></el-icon>
                  热门服务
                </span>
              </div>
            </template>
            <div class="ranking-list">
              <div v-for="(service, index) in serviceRanking" :key="service.id" class="ranking-item">
                <div class="ranking-num" :class="`rank-${index + 1}`">{{ index + 1 }}</div>
                <div class="ranking-info">
                  <span class="ranking-name">{{ service.name }}</span>
                  <span class="ranking-count">{{ service.applications }}次申请</span>
                </div>
                <el-icon color="#909399"><ArrowRight /></el-icon>
              </div>
            </div>
          </el-card>

          <!-- 服务指南 -->
          <el-card class="sidebar-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><Warning /></el-icon>
                  办事指南
                </span>
              </div>
            </template>
            <div class="guide-list">
              <div v-for="guide in serviceGuides" :key="guide.id" class="guide-item" @click="viewGuide(guide)">
                <el-icon :size="20" :color="guide.color">
                  <component :is="guide.icon" />
                </el-icon>
                <span class="guide-title">{{ guide.title }}</span>
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <!-- 申请服务对话框 -->
    <el-dialog
      v-model="showApplyDialog"
      :title="`申请 - ${selectedService?.name}`"
      width="600px"
      destroy-on-close
    >
      <div class="service-detail" v-if="selectedService">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="服务名称">{{ selectedService.name }}</el-descriptions-item>
          <el-descriptions-item label="服务类型">
            <el-tag :type="getServiceType(selectedService.type)" size="small">
              {{ selectedService.type }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="预计时长" :span="2">{{ selectedService.duration }}</el-descriptions-item>
          <el-descriptions-item label="服务说明" :span="2">{{ selectedService.description }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <el-form :model="applyForm" label-width="100px" style="margin-top: 20px">
        <el-form-item label="申请人">
          <el-input v-model="applyForm.applicant" placeholder="请输入申请人姓名" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="applyForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="applyForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注说明"
          />
        </el-form-item>
        <el-form-item label="附件">
          <el-upload
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            multiple
          >
            <el-button type="primary">上传附件</el-button>
            <template #tip>
              <div class="el-upload__tip">支持jpg、png、pdf格式，单个文件不超过10MB</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showApplyDialog = false">取消</el-button>
        <el-button type="primary" @click="submitApplication" :loading="submitting">提交申请</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="申请详情" width="700px" destroy-on-close>
      <div class="detail-content" v-if="selectedApplication">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请编号">{{ selectedApplication.id }}</el-descriptions-item>
          <el-descriptions-item label="服务名称">{{ selectedApplication.serviceName }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ selectedApplication.applicant }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ selectedApplication.phone }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ formatDateTime(selectedApplication.applyTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getStatusType(selectedApplication.status)" size="small">
              {{ getStatusLabel(selectedApplication.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="处理人">{{ selectedApplication.handler || '-' }}</el-descriptions-item>
          <el-descriptions-item label="处理时间">
            {{ selectedApplication.handleTime ? formatDateTime(selectedApplication.handleTime) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ selectedApplication.remark || '无' }}</el-descriptions-item>
          <el-descriptions-item label="处理意见" :span="2">
            {{ selectedApplication.opinion || '暂无' }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedApplication.files && selectedApplication.files.length > 0" class="files-section">
          <h4>附件材料</h4>
          <div class="file-list">
            <div v-for="file in selectedApplication.files" :key="file.name" class="file-item">
              <el-icon><Document /></el-icon>
              <span>{{ file.name }}</span>
              <el-button size="small" text type="primary">下载</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import * as echarts from 'echarts';
import {
  Plus,
  Document,
  Grid,
  List,
  Clock,
  DataAnalysis,
  Top,
  ArrowRight,
  Warning,
} from '@element-plus/icons-vue';

interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
  type: string;
  duration: string;
  category: string;
}

interface Application {
  id: string;
  serviceName: string;
  applicant: string;
  phone: string;
  applyTime: Date;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  handler?: string;
  handleTime?: Date;
  remark?: string;
  opinion?: string;
  files?: { name: string; url: string }[];
}

interface Guide {
  id: string;
  title: string;
  icon: string;
  color: string;
}

const userStore = useUserStore();

const loading = ref(false);
const submitting = ref(false);
const activeCategory = ref('all');
const searchKeyword = ref('');
const statusFilter = ref('');
const showApplyDialog = ref(false);
const showDetailDialog = ref(false);
const selectedService = ref<Service | null>(null);
const selectedApplication = ref<Application | null>(null);

const statsChartRef = ref<HTMLDivElement | null>(null);
let statsChartInstance: echarts.ECharts | null = null;

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
});

const applyForm = reactive({
  applicant: '',
  phone: '',
  remark: '',
  files: [] as File[],
});

const serviceCategories = ref([
  { key: 'all', name: '全部服务', count: 24, icon: 'Grid', gradient: 'linear-gradient(135deg, #0369A1 0%, #0ea5e9 100%)' },
  { key: 'civil', name: '民政服务', count: 8, icon: 'User', gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' },
  { key: 'medical', name: '医疗卫生', count: 6, icon: 'FirstAid', gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' },
  { key: 'education', name: '教育服务', count: 4, icon: 'Reading', gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)' },
  { key: 'labor', name: '劳务服务', count: 3, icon: 'Work', gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)' },
  { key: 'security', name: '综治服务', count: 3, icon: 'Shield', gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' },
]);

const serviceStats = ref([
  { key: 'total', label: '服务总数', value: 156, icon: 'Service', gradient: 'linear-gradient(135deg, #0369A1 0%, #0ea5e9 100%)' },
  { key: 'pending', label: '待审核', value: 12, icon: 'Clock', gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)' },
  { key: 'completed', label: '已完成', value: 128, icon: 'CircleCheck', gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' },
  { key: 'satisfaction', label: '满意度', value: 98.5, icon: 'Star', gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' },
]);

const services = ref<Service[]>([
  {
    id: '1',
    name: '低保申请',
    description: '申请城乡居民最低生活保障',
    icon: 'UserFilled',
    gradient: 'linear-gradient(135deg, #0369A1 0%, #0ea5e9 100%)',
    type: '民政服务',
    duration: '15个工作日',
    category: 'civil',
  },
  {
    id: '2',
    name: '残疾证办理',
    description: '办理残疾人证、残疾补贴申请',
    icon: 'FirstAid',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    type: '民政服务',
    duration: '20个工作日',
    category: 'civil',
  },
  {
    id: '3',
    name: '新农合报销',
    description: '新型农村合作医疗报销申请',
    icon: 'FirstAid',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    type: '医疗卫生',
    duration: '10个工作日',
    category: 'medical',
  },
  {
    id: '4',
    name: '健康体检预约',
    description: '65岁以上老年人健康体检预约',
    icon: 'FirstAid',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
    type: '医疗卫生',
    duration: '即时预约',
    category: 'medical',
  },
  {
    id: '5',
    name: '义务教育报名',
    description: '适龄儿童义务教育报名',
    icon: 'Reading',
    gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
    type: '教育服务',
    duration: '7个工作日',
    category: 'education',
  },
  {
    id: '6',
    name: '职业介绍',
    description: '农村劳动力转移就业服务',
    icon: 'Work',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    type: '劳务服务',
    duration: '5个工作日',
    category: 'labor',
  },
  {
    id: '7',
    name: '户籍证明',
    description: '开具户籍证明、亲属关系证明',
    icon: 'UserFilled',
    gradient: 'linear-gradient(135deg, #0369A1 0%, #0ea5e9 100%)',
    type: '民政服务',
    duration: '3个工作日',
    category: 'civil',
  },
  {
    id: '8',
    name: '矛盾纠纷调解',
    description: '民事纠纷调解申请',
    icon: 'ChatLineSquare',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    type: '综治服务',
    duration: '10个工作日',
    category: 'security',
  },
]);

const applications = ref<Application[]>([
  {
    id: 'APP202412010001',
    serviceName: '低保申请',
    applicant: '张三',
    phone: '138****1234',
    applyTime: new Date(Date.now() - 86400000 * 3),
    status: 'pending',
    handler: '李村干部',
    remark: '家庭困难申请低保',
  },
  {
    id: 'APP202411280002',
    serviceName: '残疾证办理',
    applicant: '王五',
    phone: '139****5678',
    applyTime: new Date(Date.now() - 86400000 * 7),
    status: 'approved',
    handler: '张干部',
    handleTime: new Date(Date.now() - 86400000 * 2),
    opinion: '材料齐全，予以批准',
  },
  {
    id: 'APP202411250003',
    serviceName: '新农合报销',
    applicant: '赵六',
    phone: '137****9012',
    applyTime: new Date(Date.now() - 86400000 * 10),
    status: 'rejected',
    handler: '李村干部',
    handleTime: new Date(Date.now() - 86400000 * 5),
    opinion: '请补充医院发票原件',
  },
  {
    id: 'APP202412010004',
    serviceName: '健康体检预约',
    applicant: '孙七',
    phone: '136****3456',
    applyTime: new Date(Date.now() - 86400000),
    status: 'completed',
    handler: '村医',
    handleTime: new Date(),
    opinion: '体检已完成',
    files: [{ name: '体检报告.pdf', url: '' }],
  },
]);

const serviceRanking = ref([
  { id: '1', name: '低保申请', applications: 156 },
  { id: '2', name: '新农合报销', applications: 128 },
  { id: '3', name: '残疾证办理', applications: 89 },
  { id: '4', name: '健康体检预约', applications: 76 },
  { id: '5', name: '户籍证明', applications: 65 },
]);

const serviceGuides = ref<Guide[]>([
  { id: '1', title: '低保申请流程', icon: 'Document', color: '#409eff' },
  { id: '2', title: '医保报销须知', icon: 'Document', color: '#67c23a' },
  { id: '3', title: '办事材料清单', icon: 'Document', color: '#e6a23c' },
  { id: '4', title: '常见问题解答', icon: 'QuestionFilled', color: '#909399' },
]);

const filteredServices = computed(() => {
  return services.value.filter(service => {
    const matchCategory = activeCategory.value === 'all' || service.category === activeCategory.value;
    const matchSearch = !searchKeyword.value || service.name.includes(searchKeyword.value);
    return matchCategory && matchSearch;
  });
});

const filteredApplications = computed(() => {
  return applications.value.filter(app => {
    return !statusFilter.value || app.status === statusFilter.value;
  });
});

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateTime = (date: Date): string => {
  return `${formatDate(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getServiceType = (type: string): string => {
  const typeMap: Record<string, string> = {
    民政服务: 'primary',
    医疗卫生: 'success',
    教育服务: 'warning',
    劳务服务: 'info',
    综治服务: 'danger',
  };
  return typeMap[type] || 'info';
};

const getStatusType = (status: string): string => {
  const typeMap: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    completed: 'info',
  };
  return typeMap[status] || 'info';
};

const getStatusLabel = (status: string): string => {
  const labelMap: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已驳回',
    completed: '已完成',
  };
  return labelMap[status] || status;
};

const initStatsChart = () => {
  if (!statsChartRef.value) return;

  statsChartInstance = echarts.init(statsChartRef.value);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月'],
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '申请数',
        type: 'bar',
        data: [45, 52, 38, 65, 72, 58],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#0369A1' },
            { offset: 1, color: '#0ea5e9' },
          ]),
        },
      },
      {
        name: '完成数',
        type: 'bar',
        data: [38, 48, 35, 58, 65, 52],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#059669' },
            { offset: 1, color: '#10b981' },
          ]),
        },
      },
    ],
  };

  statsChartInstance.setOption(option);
};

const selectCategory = (category: string) => {
  activeCategory.value = category;
};

const showNewService = () => {
  ElMessage.info('新建服务功能开发中');
};

const showServiceGuide = () => {
  ElMessage.info('服务指南功能开发中');
};

const openService = (service: Service) => {
  ElMessage.info(`查看服务: ${service.name}`);
};

const applyService = (service: Service) => {
  selectedService.value = service;
  applyForm.applicant = userStore.userInfo?.name || '';
  applyForm.phone = '';
  applyForm.remark = '';
  applyForm.files = [];
  showApplyDialog.value = true;
};

const handleFileChange = (file: { raw: File }) => {
  applyForm.files.push(file.raw);
};

const submitApplication = async () => {
  if (!applyForm.applicant || !applyForm.phone) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  submitting.value = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newApplication: Application = {
      id: `APP${Date.now().toString().slice(0, 12)}`,
      serviceName: selectedService.value?.name || '',
      applicant: applyForm.applicant,
      phone: applyForm.phone,
      applyTime: new Date(),
      status: 'pending',
      remark: applyForm.remark,
    };

    applications.value.unshift(newApplication);
    ElMessage.success('申请提交成功');
    showApplyDialog.value = false;
  } finally {
    submitting.value = false;
  }
};

const viewApplication = (application: Application) => {
  selectedApplication.value = application;
  showDetailDialog.value = true;
};

const cancelApplication = async (application: Application) => {
  try {
    await ElMessageBox.confirm('确定要撤销该申请吗？', '撤销确认', {
      confirmButtonText: '确定撤销',
      cancelButtonText: '取消',
      type: 'warning',
    });
    applications.value = applications.value.filter(a => a.id !== application.id);
    ElMessage.success('申请已撤销');
  } catch {}
};

const resubmit = (application: Application) => {
  ElMessage.info(`重新提交: ${application.serviceName}`);
};

const viewGuide = (guide: Guide) => {
  ElMessage.info(`查看指南: ${guide.title}`);
};

const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
};

const handlePageChange = (page: number) => {
  pagination.currentPage = page;
};

onMounted(async () => {
  await nextTick();
  initStatsChart();

  window.addEventListener('resize', () => {
    statsChartInstance?.resize();
  });
});
</script>

<style lang="scss" scoped>
.pc-services {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

  .header-content {
    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }

    p {
      margin: 0;
      font-size: 14px;
      color: #909399;
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.category-section {
  margin-bottom: 24px;
}

.category-card {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  &.active {
    border: 2px solid #409eff;
  }

  .category-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
  }

  .category-name {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 4px;
  }

  .category-count {
    font-size: 12px;
    color: #909399;
  }
}

.stats-section {
  margin-bottom: 24px;
}

.stat-card {
  margin-bottom: 20px;

  .stat-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-info {
    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #303133;
    }

    .stat-label {
      font-size: 13px;
      color: #909399;
    }
  }
}

.main-section {
  .el-card {
    margin-bottom: 20px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.card-actions {
  .search-input {
    width: 240px;
  }
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.service-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: #409eff;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  }

  .service-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .service-info {
    flex: 1;
    min-width: 0;

    h3 {
      margin: 0 0 4px;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }

    p {
      margin: 0 0 8px;
      font-size: 13px;
      color: #909399;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .service-meta {
      display: flex;
      align-items: center;
      gap: 12px;

      .service-time {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #909399;
      }
    }
  }

  .service-action {
    display: flex;
    align-items: center;
  }
}

.records-card {
  .card-header {
    .card-title {
      font-size: 16px;
    }
  }
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.sidebar-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }
  }
}

.chart-container {
  height: 200px;
}

.ranking-list {
  .ranking-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #ebeef5;
    cursor: pointer;
    transition: background-color 0.3s;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background-color: #f5f7fa;
      margin: 0 -20px;
      padding: 12px 20px;
    }

    .ranking-num {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      color: #fff;

      &.rank-1 {
        background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%);
      }

      &.rank-2 {
        background: linear-gradient(135deg, #c0c0c0 0%, #a8a8a8 100%);
      }

      &.rank-3 {
        background: linear-gradient(135deg, #cd7f32 0%, #b87333 100%);
      }

      &.rank-4,
      &.rank-5 {
        background: #909399;
      }
    }

    .ranking-info {
      flex: 1;
      display: flex;
      flex-direction: column;

      .ranking-name {
        font-size: 14px;
        color: #303133;
      }

      .ranking-count {
        font-size: 12px;
        color: #909399;
      }
    }
  }
}

.guide-list {
  .guide-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #ebeef5;
    cursor: pointer;
    transition: all 0.3s;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      color: #409eff;

      .guide-title {
        color: #409eff;
      }
    }

    .guide-title {
      flex: 1;
      font-size: 14px;
      color: #303133;
    }
  }
}

.detail-content {
  .files-section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #ebeef5;

    h4 {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }

    .file-list {
      .file-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;

        span {
          flex: 1;
          font-size: 14px;
          color: #606266;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .services-grid {
    grid-template-columns: 1fr;
  }

  .category-section {
    .el-col {
      margin-bottom: 12px;
    }
  }
}
</style>
