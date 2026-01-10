<template>
  <div class="services-hall" :class="{ 'large-text-mode': largeTextMode }">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-bg"></div>
      <div class="header-content">
        <div class="header-info">
          <h1 class="page-title">在线办事大厅</h1>
          <p class="page-description">一站式在线服务，让办事更便捷</p>
        </div>
        <div class="header-actions">
          <el-button
            @click="showApplicationHistory"
            :size="largeTextMode ? 'large' : 'default'"
            icon="Document"
          >
            办事记录
          </el-button>
          <el-button
            type="primary"
            @click="showApplicationGuide"
            :size="largeTextMode ? 'large' : 'default'"
            icon="QuestionFilled"
          >
            办事指南
          </el-button>
        </div>
      </div>
    </div>

    <!-- 快速搜索 -->
    <div class="search-section">
      <el-card class="search-card">
        <div class="search-container">
          <el-input
            v-model="searchQuery"
            placeholder="搜索服务事项..."
            :size="largeTextMode ? 'large' : 'default'"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-button
            type="primary"
            @click="handleSearch"
            :size="largeTextMode ? 'large' : 'default'"
            icon="Search"
          >
            搜索服务
          </el-button>
        </div>

        <!-- 热门搜索 -->
        <div class="hot-searches">
          <span class="hot-label">热门搜索：</span>
          <el-tag
            v-for="tag in hotSearches"
            :key="tag"
            @click="quickSearch(tag)"
            class="hot-tag"
            :size="largeTextMode ? 'large' : 'default'"
          >
            {{ tag }}
          </el-tag>
        </div>
      </el-card>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <el-row :gutter="24">
        <!-- 左侧服务分类 -->
        <el-col :xs="24" :lg="6">
          <el-card class="category-card">
            <template #header>
              <div class="card-header">
                <el-icon><Menu /></el-icon>
                <span>服务分类</span>
              </div>
            </template>

            <div class="category-list">
              <div
                v-for="category in serviceCategories"
                :key="category.id"
                class="category-item"
                :class="{ active: activeCategory === category.id }"
                @click="setActiveCategory(category.id)"
              >
                <div class="category-icon">{{ category.icon }}</div>
                <div class="category-info">
                  <div class="category-name">{{ category.name }}</div>
                  <div class="category-count">{{ category.count }}项服务</div>
                </div>
                <el-icon class="category-arrow" v-if="activeCategory === category.id">
                  <ArrowRight />
                </el-icon>
              </div>
            </div>
          </el-card>

          <!-- 办事进度 -->
          <el-card class="progress-card">
            <template #header>
              <div class="card-header">
                <el-icon><Clock /></el-icon>
                <span>我的办事</span>
              </div>
            </template>

            <div class="progress-summary">
              <div class="progress-item">
                <div class="progress-number">{{ applicationStats.pending }}</div>
                <div class="progress-label">待办理</div>
              </div>
              <div class="progress-item">
                <div class="progress-number">{{ applicationStats.processing }}</div>
                <div class="progress-label">办理中</div>
              </div>
              <div class="progress-item">
                <div class="progress-number">{{ applicationStats.completed }}</div>
                <div class="progress-label">已完成</div>
              </div>
            </div>

            <el-button
              type="text"
              @click="showMyApplications"
              style="width: 100%; margin-top: 16px"
            >
              查看全部
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </el-card>
        </el-col>

        <!-- 右侧服务列表 -->
        <el-col :xs="24" :lg="18">
          <!-- 当前分类标题 -->
          <div class="category-title">
            <h2>{{ getCurrentCategoryName() }}</h2>
            <p>共 {{ filteredServices.length }} 项服务</p>
          </div>

          <!-- 服务卡片网格 -->
          <div class="services-grid" v-loading="loading">
            <div
              v-for="service in filteredServices"
              :key="service.id"
              class="service-card"
              @click="openService(service)"
            >
              <div class="service-header">
                <div class="service-icon">{{ service.icon }}</div>
                <div class="service-status" :class="service.status">
                  {{ getStatusText(service.status) }}
                </div>
              </div>

              <div class="service-content">
                <h3 class="service-title">{{ service.name }}</h3>
                <p class="service-desc">{{ service.description }}</p>

                <div class="service-info">
                  <div class="info-item">
                    <el-icon><User /></el-icon>
                    <span>办理人群：{{ service.targetUsers }}</span>
                  </div>
                  <div class="info-item">
                    <el-icon><Clock /></el-icon>
                    <span>办理时限：{{ service.timeLimit }}</span>
                  </div>
                  <div class="info-item" v-if="service.fee">
                    <el-icon><Money /></el-icon>
                    <span>费用：{{ service.fee }}</span>
                  </div>
                </div>

                <div class="service-tags">
                  <el-tag
                    v-for="tag in service.tags"
                    :key="tag"
                    size="small"
                    :type="getTagType(tag)"
                  >
                    {{ tag }}
                  </el-tag>
                </div>
              </div>

              <div class="service-footer">
                <el-button type="primary" size="small" @click.stop="applyService(service)">
                  立即办理
                </el-button>
                <el-button size="small" @click.stop="viewServiceDetail(service)">
                  查看详情
                </el-button>
              </div>
            </div>

            <!-- 空状态 -->
            <el-empty v-if="!loading && filteredServices.length === 0" description="暂无相关服务" />
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 服务详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="currentService?.name"
      :width="largeTextMode ? '90%' : '80%'"
      :close-on-click-modal="false"
      custom-class="service-detail-dialog"
    >
      <div class="service-detail" v-if="currentService">
        <el-tabs v-model="activeTab">
          <!-- 服务概述 -->
          <el-tab-pane label="服务概述" name="overview">
            <div class="detail-section">
              <h3>服务介绍</h3>
              <p>{{ currentService.fullDescription || currentService.description }}</p>

              <h3>办理条件</h3>
              <ul>
                <li v-for="condition in currentService.conditions" :key="condition">
                  {{ condition }}
                </li>
              </ul>

              <h3>办理材料</h3>
              <div class="materials-list">
                <div
                  v-for="material in currentService.materials"
                  :key="material.name"
                  class="material-item"
                >
                  <el-icon><Document /></el-icon>
                  <span>{{ material.name }}</span>
                  <el-tag size="small" :type="material.required ? 'danger' : 'info'">
                    {{ material.required ? '必需' : '可选' }}
                  </el-tag>
                </div>
              </div>

              <h3>办理流程</h3>
              <el-steps :active="100" finish-status="success" direction="vertical">
                <el-step
                  v-for="step in currentService.process"
                  :key="step.title"
                  :title="step.title"
                  :description="step.description"
                />
              </el-steps>
            </div>
          </el-tab-pane>

          <!-- 在线办理 -->
          <el-tab-pane label="在线办理" name="application">
            <div class="application-form">
              <el-form
                :model="applicationForm"
                :rules="applicationRules"
                ref="applicationFormRef"
                label-width="120px"
              >
                <el-form-item label="申请人姓名" prop="name">
                  <el-input
                    v-model="applicationForm.name"
                    :size="largeTextMode ? 'large' : 'default'"
                  />
                </el-form-item>

                <el-form-item label="身份证号" prop="idCard">
                  <el-input
                    v-model="applicationForm.idCard"
                    :size="largeTextMode ? 'large' : 'default'"
                  />
                </el-form-item>

                <el-form-item label="联系电话" prop="phone">
                  <el-input
                    v-model="applicationForm.phone"
                    :size="largeTextMode ? 'large' : 'default'"
                  />
                </el-form-item>

                <el-form-item label="家庭地址" prop="address">
                  <el-input
                    v-model="applicationForm.address"
                    :size="largeTextMode ? 'large' : 'default'"
                  />
                </el-form-item>

                <!-- 动态字段 -->
                <el-form-item
                  v-for="field in currentService?.formFields"
                  :key="field.name"
                  :label="field.label"
                  :prop="field.name"
                  :required="field.required"
                >
                  <el-input
                    v-if="field.type === 'text'"
                    v-model="applicationForm[field.name]"
                    :placeholder="field.placeholder"
                    :size="largeTextMode ? 'large' : 'default'"
                  />
                  <el-select
                    v-else-if="field.type === 'select'"
                    v-model="applicationForm[field.name]"
                    :placeholder="field.placeholder"
                    :size="largeTextMode ? 'large' : 'default'"
                  >
                    <el-option
                      v-for="option in field.options"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                  <el-date-picker
                    v-else-if="field.type === 'date'"
                    v-model="applicationForm[field.name]"
                    type="date"
                    :placeholder="field.placeholder"
                    :size="largeTextMode ? 'large' : 'default'"
                  />
                  <el-upload
                    v-else-if="field.type === 'file'"
                    class="upload-demo"
                    drag
                    action="#"
                    :auto-upload="false"
                    :on-change="handleFileChange"
                  >
                    <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                    <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
                    <template #tip>
                      <div class="el-upload__tip">
                        {{ field.tip || '支持jpg/png/pdf文件，不超过10MB' }}
                      </div>
                    </template>
                  </el-upload>
                </el-form-item>

                <el-form-item label="备注信息">
                  <el-input
                    v-model="applicationForm.remark"
                    type="textarea"
                    :rows="4"
                    placeholder="请输入其他需要说明的信息..."
                    :size="largeTextMode ? 'large' : 'default'"
                  />
                </el-form-item>
              </el-form>

              <div class="form-actions">
                <el-button @click="detailDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="submitApplication" :loading="submitting">
                  提交申请
                </el-button>
              </div>
            </div>
          </el-tab-pane>

          <!-- 常见问题 -->
          <el-tab-pane label="常见问题" name="faq">
            <div class="faq-list">
              <div v-for="(faq, index) in currentService?.faq" :key="index" class="faq-item">
                <div class="faq-question" @click="toggleFaq(index)">
                  <span>{{ faq.question }}</span>
                  <el-icon>
                    <ArrowDown v-if="expandedFaq === index" />
                    <ArrowRight v-else />
                  </el-icon>
                </div>
                <div class="faq-answer" v-show="expandedFaq === index">
                  {{ faq.answer }}
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>

    <!-- 办事指南对话框 -->
    <el-dialog
      v-model="guideDialogVisible"
      title="办事指南"
      :width="largeTextMode ? '800px' : '600px'"
    >
      <div class="guide-content">
        <div class="guide-section">
          <h3>办理流程</h3>
          <el-steps :active="1" finish-status="success">
            <el-step title="选择服务" description="浏览并选择需要办理的服务" />
            <el-step title="填写申请" description="在线填写申请表单" />
            <el-step title="提交材料" description="上传必要的证明材料" />
            <el-step title="等待审核" description="工作人员审核您的申请" />
            <el-step title="完成办理" description="办理完成后通知结果" />
          </el-steps>
        </div>

        <div class="guide-section">
          <h3>注意事项</h3>
          <ul>
            <li>请确保填写的个人信息真实有效</li>
            <li>上传的材料文件应清晰可见</li>
            <li>如有疑问可联系村委会咨询</li>
            <li>办理进度可在"我的办事"中查看</li>
          </ul>
        </div>

        <div class="guide-section">
          <h3>联系方式</h3>
          <p>服务热线：0571-12345678</p>
          <p>办公时间：周一至周五 8:30-17:30</p>
          <p>地址：智慧村便民服务中心</p>
        </div>
      </div>

      <template #footer>
        <el-button @click="guideDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search,
  QuestionFilled,
  Menu,
  Clock,
  ArrowRight,
  ArrowDown,
  User,
  Money,
  Document,
  UploadFilled,
} from '@element-plus/icons-vue';

const router = useRouter();
const userStore = useUserStore();

// 响应式数据
const largeTextMode = ref(false);
const loading = ref(false);
const submitting = ref(false);
const searchQuery = ref('');
const activeCategory = ref('all');
const activeTab = ref('overview');
const detailDialogVisible = ref(false);
const guideDialogVisible = ref(false);
const expandedFaq = ref(-1);

// 当前服务
const currentService = ref(null);

// 表单引用
const applicationFormRef = ref(null);

// 热门搜索
const hotSearches = reactive(['身份证办理', '医保报销', '老年证', '生育证明', '住房申请']);

// 服务分类
const serviceCategories = reactive([
  { id: 'all', name: '全部服务', icon: '📋', count: 45 },
  { id: 'certificate', name: '证件办理', icon: '📄', count: 12 },
  { id: 'welfare', name: '福利保障', icon: '🎁', count: 8 },
  { id: 'medical', name: '医疗保障', icon: '🏥', count: 10 },
  { id: 'agriculture', name: '农业服务', icon: '🌾', count: 6 },
  { id: 'housing', name: '住房保障', icon: '🏠', count: 5 },
  { id: 'elderly', name: '养老助老', icon: '👴', count: 4 },
]);

// 服务列表
const servicesList = reactive([
  {
    id: '1',
    name: '身份证办理',
    category: 'certificate',
    icon: '📄',
    description: '居民身份证申领、换领、补领',
    fullDescription: '为智慧村村民提供身份证申领、换领、补领等一站式服务',
    status: 'available',
    targetUsers: '本村户籍居民',
    timeLimit: '15个工作日',
    fee: '首次申领免费，换领20元，补领40元',
    tags: ['热门', '常用'],
    conditions: ['具有智慧村户籍', '年满16周岁', '携带相关证明材料'],
    materials: [
      { name: '户口本', required: true },
      { name: '本人近期免冠照片', required: true },
      { name: '旧身份证（换领时）', required: false },
    ],
    process: [
      { title: '在线申请', description: '填写个人信息并选择办理类型' },
      { title: '材料审核', description: '工作人员审核提交的材料' },
      { title: '现场核验', description: '到村委会进行现场核验' },
      { title: '证件制作', description: '公安机关制作身份证' },
      { title: '领取证件', description: '到指定地点领取新身份证' },
    ],
    formFields: [
      {
        name: 'type',
        label: '办理类型',
        type: 'select',
        required: true,
        options: [
          { label: '首次申领', value: 'first' },
          { label: '换领', value: 'renew' },
          { label: '补领', value: 'replace' },
        ],
      },
      {
        name: 'reason',
        label: '申请原因',
        type: 'text',
        required: true,
        placeholder: '请说明办理原因',
      },
    ],
    faq: [
      {
        question: '办理身份证需要多长时间？',
        answer: '一般情况下15个工作日内可以完成办理。',
      },
      {
        question: '可以代办身份证吗？',
        answer: '年满16周岁需要本人办理，特殊情况可咨询村委会。',
      },
    ],
  },
  {
    id: '2',
    name: '医保报销申请',
    category: 'medical',
    icon: '🏥',
    description: '城乡居民医保医疗费用报销申请',
    fullDescription: '为参保村民提供医疗费用报销服务，支持住院、门诊等费用报销',
    status: 'available',
    targetUsers: '本村医保参保人员',
    timeLimit: '20个工作日',
    fee: '免费',
    tags: ['医疗', '保障'],
    conditions: ['已参加城乡居民医保', '在定点医疗机构就医', '费用符合医保报销范围'],
    materials: [
      { name: '医保卡', required: true },
      { name: '医疗费用发票', required: true },
      { name: '费用明细清单', required: true },
      { name: '出院小结', required: false },
    ],
    process: [
      { title: '提交申请', description: '在线提交报销申请和相关材料' },
      { title: '材料初审', description: '医保中心初审材料完整性' },
      { title: '费用审核', description: '审核报销费用是否符合政策' },
      { title: '资金拨付', description: '报销资金拨付到个人账户' },
    ],
    formFields: [
      { name: 'hospital', label: '就医医院', type: 'text', required: true },
      { name: 'treatmentDate', label: '就医日期', type: 'date', required: true },
      { name: 'totalAmount', label: '总费用', type: 'text', required: true },
      {
        name: 'receipts',
        label: '费用单据',
        type: 'file',
        required: true,
        tip: '请上传医疗费用发票和明细清单',
      },
    ],
    faq: [
      {
        question: '报销比例是多少？',
        answer: '根据就医医院等级和费用类型，报销比例在50%-90%之间。',
      },
      {
        question: '异地就医可以报销吗？',
        answer: '办理异地就医备案后，在备案地就医可以报销。',
      },
    ],
  },
  {
    id: '3',
    name: '老年优待证办理',
    category: 'elderly',
    icon: '👴',
    description: '60岁以上老年人优待证申领',
    fullDescription: '为智慧村60岁以上老年人办理优待证，享受各项优待政策',
    status: 'available',
    targetUsers: '60周岁以上老年人',
    timeLimit: '7个工作日',
    fee: '免费',
    tags: ['老年人', '优待'],
    conditions: ['年满60周岁', '具有智慧村户籍或居住证', '本人申请或代办'],
    materials: [
      { name: '身份证', required: true },
      { name: '户口本', required: true },
      { name: '近期免冠照片', required: true },
    ],
    process: [
      { title: '在线申请', description: '填写个人信息并上传材料' },
      { title: '审核材料', description: '村委会审核申请材料' },
      { title: '制作证件', description: '民政部门制作优待证' },
      { title: '发放证件', description: '到村委会领取优待证' },
    ],
    formFields: [
      { name: 'birthDate', label: '出生日期', type: 'date', required: true },
      {
        name: 'photo',
        label: '证件照片',
        type: 'file',
        required: true,
        tip: '请上传近期免冠白底照片',
      },
    ],
    faq: [
      {
        question: '老年优待证有哪些优待？',
        answer: '可免费乘坐公交车、参观公园、景区门票半价等。',
      },
    ],
  },
  {
    id: '4',
    name: '住房改造补贴申请',
    category: 'housing',
    icon: '🏠',
    description: '农村危房改造补贴资金申请',
    fullDescription: '为符合条件的困难家庭提供农村危房改造补贴',
    status: 'limited',
    targetUsers: '困难家庭、低保户等',
    timeLimit: '30个工作日',
    fee: '免费',
    tags: ['住房', '补贴'],
    conditions: ['家庭经济困难', '住房为危房', '具有改造意愿和能力'],
    materials: [
      { name: '家庭收入证明', required: true },
      { name: '房屋鉴定报告', required: true },
      { name: '改造方案', required: true },
    ],
    process: [
      { title: '提交申请', description: '在线提交补贴申请' },
      { title: '上门核查', description: '工作人员上门实地核查' },
      { title: '评审公示', description: '评审委员会评审并公示' },
      { title: '资金拨付', description: '改造验收后拨付补贴资金' },
    ],
    formFields: [
      { name: 'familyIncome', label: '家庭年收入', type: 'text', required: true },
      {
        name: 'houseCondition',
        label: '房屋状况',
        type: 'select',
        required: true,
        options: [
          { label: 'D级危房', value: 'D' },
          { label: 'C级危房', value: 'C' },
          { label: '需要改造', value: 'need' },
        ],
      },
      { name: 'reconstructionPlan', label: '改造方案', type: 'file', required: true },
    ],
    faq: [
      {
        question: '补贴标准是多少？',
        answer: '根据危房等级和家庭情况，补贴标准在1-3万元之间。',
      },
    ],
  },
]);

// 申请统计
const applicationStats = reactive({
  pending: 2,
  processing: 3,
  completed: 8,
});

// 申请表单
const applicationForm = reactive({
  name: '',
  idCard: '',
  phone: '',
  address: '',
  remark: '',
});

// 表单验证规则
const applicationRules = {
  name: [{ required: true, message: '请输入申请人姓名', trigger: 'blur' }],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    {
      pattern: /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[0-9Xx]$/,
      message: '请输入正确的身份证号',
      trigger: 'blur',
    },
  ],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' },
  ],
  address: [{ required: true, message: '请输入家庭地址', trigger: 'blur' }],
};

// 计算属性
const filteredServices = computed(() => {
  let filtered = servicesList;

  // 按分类筛选
  if (activeCategory.value !== 'all') {
    filtered = filtered.filter(service => service.category === activeCategory.value);
  }

  // 按搜索关键词筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      service =>
        service.name.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query) ||
        service.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  return filtered;
});

// 方法
const getCurrentCategoryName = () => {
  const category = serviceCategories.find(cat => cat.id === activeCategory.value);
  return category ? category.name : '全部服务';
};

const setActiveCategory = categoryId => {
  activeCategory.value = categoryId;
};

const handleSearch = () => {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
  }, 500);
};

const quickSearch = tag => {
  searchQuery.value = tag;
  handleSearch();
};

const getStatusText = status => {
  const texts = {
    available: '可办理',
    limited: '限办理',
    unavailable: '暂停办理',
  };
  return texts[status] || '未知';
};

const getTagType = tag => {
  const types = {
    热门: 'danger',
    常用: 'warning',
    新上线: 'success',
    推荐: 'primary',
  };
  return types[tag] || '';
};

const openService = service => {
  currentService.value = service;
  activeTab.value = 'overview';
  detailDialogVisible.value = true;

  // 重置表单
  Object.assign(applicationForm, {
    name: userStore.userInfo?.name || '',
    phone: userStore.userInfo?.phone || '',
    address: userStore.userInfo?.address || '',
    idCard: '',
    remark: '',
  });
};

const applyService = service => {
  openService(service);
  activeTab.value = 'application';
};

const viewServiceDetail = service => {
  openService(service);
};

const toggleFaq = index => {
  expandedFaq.value = expandedFaq.value === index ? -1 : index;
};

const handleFileChange = file => {
  console.log('文件上传:', file);
};

const submitApplication = async () => {
  if (!applicationFormRef.value) return;

  try {
    await applicationFormRef.value.validate();

    submitting.value = true;

    // 模拟提交
    setTimeout(() => {
      submitting.value = false;
      detailDialogVisible.value = false;
      ElMessage.success('申请提交成功，请等待审核');
    }, 2000);
  } catch (error) {
    console.error('表单验证失败:', error);
  }
};

const showApplicationGuide = () => {
  guideDialogVisible.value = true;
};

const showApplicationHistory = () => {
  router.push('/my-applications');
};

const showMyApplications = () => {
  router.push('/my-applications');
};

onMounted(() => {
  console.log('在线办事大厅加载完成');
});
</script>

<style lang="scss" scoped>
.services-hall {
  min-height: 100vh;
  background-color: #f5f7fa;

  &.large-text-mode {
    font-size: 18px;

    .el-button {
      font-size: 16px;
      padding: 12px 24px;
    }

    .service-card {
      .service-title {
        font-size: 20px;
      }

      .service-desc {
        font-size: 16px;
      }
    }
  }
}

.page-header {
  position: relative;
  margin-bottom: 24px;

  .header-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 180px;
    background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
    border-radius: 0 0 20px 20px;
  }

  .header-content {
    position: relative;
    z-index: 2;
    padding: 40px 24px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-info {
    .page-title {
      margin: 0 0 8px 0;
      color: white;
      font-size: 32px;
      font-weight: bold;
    }

    .page-description {
      margin: 0;
      color: rgba(255, 255, 255, 0.9);
      font-size: 16px;
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.search-section {
  margin: 0 24px 24px;

  .search-card {
    .search-container {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;

      .el-input {
        flex: 1;
      }
    }

    .hot-searches {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;

      .hot-label {
        color: #666;
        font-size: 14px;
      }

      .hot-tag {
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          background-color: #409eff;
          color: white;
          border-color: #409eff;
        }
      }
    }
  }
}

.main-content {
  padding: 0 24px 24px;
}

.category-card,
.progress-card {
  margin-bottom: 16px;

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
  }
}

.category-list {
  .category-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-bottom: 8px;

    &:hover {
      background: #f8f9fa;
    }

    &.active {
      background: #e8f4fd;
      color: #4a90e2;
    }

    .category-icon {
      font-size: 24px;
    }

    .category-info {
      flex: 1;

      .category-name {
        font-weight: 500;
        margin-bottom: 2px;
      }

      .category-count {
        font-size: 12px;
        color: #999;
      }
    }

    .category-arrow {
      color: #4a90e2;
    }
  }
}

.progress-summary {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
  background: #f8f9fa;
  border-radius: 8px;

  .progress-item {
    text-align: center;

    .progress-number {
      font-size: 24px;
      font-weight: bold;
      color: #4a90e2;
      margin-bottom: 4px;
    }

    .progress-label {
      font-size: 14px;
      color: #666;
    }
  }
}

.category-title {
  margin-bottom: 20px;

  h2 {
    margin: 0 0 4px 0;
    color: #333;
    font-size: 20px;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;

  .service-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .service-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      .service-icon {
        font-size: 32px;
      }

      .service-status {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;

        &.available {
          background: #f0f9ff;
          color: #0ea5e9;
        }

        &.limited {
          background: #fef3c7;
          color: #d97706;
        }

        &.unavailable {
          background: #fef2f2;
          color: #dc2626;
        }
      }
    }

    .service-content {
      margin-bottom: 16px;

      .service-title {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .service-desc {
        margin: 0 0 12px 0;
        color: #666;
        font-size: 14px;
        line-height: 1.5;
      }

      .service-info {
        margin-bottom: 12px;

        .info-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #666;
          font-size: 12px;
          margin-bottom: 4px;

          .el-icon {
            font-size: 14px;
          }
        }
      }

      .service-tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
    }

    .service-footer {
      display: flex;
      gap: 8px;
    }
  }
}

// 详情对话框样式
:deep(.service-detail-dialog) {
  .el-dialog__body {
    padding: 0 24px 24px;
  }
}

.service-detail {
  .detail-section {
    margin-bottom: 24px;

    h3 {
      margin: 0 0 12px 0;
      color: #333;
      font-size: 16px;
      font-weight: 600;
    }

    p {
      line-height: 1.6;
      color: #666;
    }

    ul {
      padding-left: 20px;

      li {
        margin-bottom: 8px;
        color: #666;
        line-height: 1.5;
      }
    }
  }

  .materials-list {
    .material-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 4px;
      margin-bottom: 8px;
    }
  }

  .application-form {
    .form-actions {
      text-align: right;
      padding-top: 20px;
      border-top: 1px solid #f0f0f0;
      margin-top: 20px;
    }
  }

  .faq-list {
    .faq-item {
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      .faq-question {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 0;
        cursor: pointer;
        font-weight: 500;
        color: #333;

        &:hover {
          color: #4a90e2;
        }
      }

      .faq-answer {
        padding: 0 0 16px 0;
        color: #666;
        line-height: 1.6;
      }
    }
  }
}

.guide-content {
  .guide-section {
    margin-bottom: 24px;

    h3 {
      margin: 0 0 12px 0;
      color: #333;
      font-size: 16px;
      font-weight: 600;
    }

    p {
      margin: 4px 0;
      color: #666;
      line-height: 1.5;
    }

    ul {
      padding-left: 20px;

      li {
        margin-bottom: 8px;
        color: #666;
        line-height: 1.5;
      }
    }
  }
}

@media (max-width: 768px) {
  .page-header {
    .header-content {
      flex-direction: column;
      gap: 16px;
      text-align: center;
    }
  }

  .search-section {
    margin: 0 16px 16px;

    .search-container {
      flex-direction: column;
      gap: 8px;
    }
  }

  .main-content {
    padding: 0 16px 16px;
  }

  .services-grid {
    grid-template-columns: 1fr;
  }

  .service-card {
    .service-footer {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
