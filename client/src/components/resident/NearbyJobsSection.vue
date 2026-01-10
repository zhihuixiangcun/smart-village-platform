<template>
  <section class="nearby-jobs-section" aria-label="附近招聘信息">
    <!-- 区块标题 -->
    <div class="section-header">
      <div class="title-left">
        <el-icon class="section-icon"><Briefcase /></el-icon>
        <h2 class="section-title">附近招聘</h2>
        <span class="subtitle">{{ jobCount }}个职位</span>
      </div>
      <div class="header-actions">
        <el-button
          :type="showJobSeekers ? 'default' : 'primary'"
          @click="toggleView('jobs')"
          size="small"
        >
          招聘
        </el-button>
        <el-button
          :type="showJobSeekers ? 'primary' : 'default'"
          @click="toggleView('seekers')"
          size="small"
        >
          求职
        </el-button>
        <el-dropdown trigger="click" @command="handleSort">
          <el-button text>
            <el-icon><Sort /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="latest">最新发布</el-dropdown-item>
              <el-dropdown-item command="salary_high">薪资最高</el-dropdown-item>
              <el-dropdown-item command="distance">距离最近</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索职位、公司、技能"
        :prefix-icon="Search"
        clearable
        @input="handleSearch"
      />
    </div>

    <!-- 职位类型筛选 -->
    <div v-if="!showJobSeekers" class="job-type-tabs">
      <button
        v-for="type in jobTypes"
        :key="type.key"
        :class="['type-tab', { active: activeJobType === type.key }]"
        @click="selectJobType(type.key)"
      >
        <span class="icon">{{ type.icon }}</span>
        <span class="label">{{ type.label }}</span>
        <span v-if="type.count > 0" class="count">{{ type.count }}</span>
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="2" animated />
    </div>

    <!-- 招聘信息列表 -->
    <div v-else-if="!showJobSeekers && filteredJobs.length > 0" class="jobs-list">
      <div v-for="job in paginatedJobs" :key="job.id" class="job-card" @click="viewJobDetail(job)">
        <!-- 紧急标签 -->
        <div v-if="job.urgent" class="urgent-badge">
          <el-icon><Warning /></el-icon>
          急招
        </div>

        <!-- 职位头部 -->
        <div class="job-header">
          <h3 class="job-title">{{ job.title }}</h3>
          <div class="salary">
            <span class="amount">{{ formatSalary(job) }}</span>
            <span v-if="job.salaryType === 'negotiable'" class="negotiable">面议</span>
          </div>
        </div>

        <!-- 公司信息 -->
        <div class="company-info">
          <span class="company-name">{{ job.company }}</span>
          <el-tag size="small" effect="plain">
            {{ getCompanyTypeLabel(job.companyType) }}
          </el-tag>
        </div>

        <!-- 职位信息 -->
        <div class="job-info">
          <span class="info-item">
            <el-icon><Location /></el-icon>
            {{ job.location }}
            <span v-if="job.distance" class="distance">({{ formatDistance(job.distance) }})</span>
          </span>
          <span class="info-item">
            <el-icon><User /></el-icon>
            招{{ job.workerCount }}人
          </span>
          <span class="info-item">
            <el-icon><Clock /></el-icon>
            {{ formatTime(job.publishTime) }}
          </span>
        </div>

        <!-- 职位要求 -->
        <div class="requirements">
          <span
            v-for="(req, index) in job.requirements.slice(0, 3)"
            :key="index"
            class="requirement-tag"
          >
            {{ req }}
          </span>
          <span v-if="job.requirements.length > 3" class="more-reqs">
            +{{ job.requirements.length - 3 }}
          </span>
        </div>

        <!-- 福利标签 -->
        <div v-if="job.benefits && job.benefits.length" class="benefits">
          <el-tag
            v-for="benefit in job.benefits.slice(0, 4)"
            :key="benefit"
            size="small"
            type="success"
            effect="plain"
          >
            {{ benefit }}
          </el-tag>
        </div>

        <!-- 操作按钮 -->
        <div class="job-actions">
          <el-button type="primary" size="small" @click.stop="applyJob(job)">
            <el-icon><DocumentAdd /></el-icon>
            申请
          </el-button>
          <el-button size="small" @click.stop="contactEmployer(job)">
            <el-icon><Phone /></el-icon>
            联系
          </el-button>
          <el-button size="small" @click.stop="shareJob(job)">
            <el-icon><Share /></el-icon>
            分享
          </el-button>
        </div>
      </div>
    </div>

    <!-- 求职信息列表 -->
    <div v-else-if="showJobSeekers && filteredSeekers.length > 0" class="seekers-list">
      <div
        v-for="seeker in paginatedSeekers"
        :key="seeker.id"
        class="seeker-card"
        @click="viewSeekerDetail(seeker)"
      >
        <!-- 求职者头部 -->
        <div class="seeker-header">
          <el-avatar :src="seeker.avatar" :size="50">
            {{ seeker.name.charAt(0) }}
          </el-avatar>
          <div class="seeker-basic-info">
            <div class="name-row">
              <span class="name">{{ seeker.name }}</span>
              <el-tag v-if="seeker.verified" type="success" size="small">实名</el-tag>
              <span class="age">{{ seeker.age }}岁</span>
              <span class="gender">{{ seeker.gender === 'male' ? '男' : '女' }}</span>
            </div>
            <div class="expected-salary">
              期望: {{ seeker.expectedSalaryMin }}-{{ seeker.expectedSalaryMax }}元/{{
                getSalaryUnitLabel(seeker.expectedSalaryUnit)
              }}
            </div>
          </div>
        </div>

        <!-- 技能标签 -->
        <div class="skills">
          <el-tag
            v-for="skill in seeker.skills"
            :key="skill"
            size="small"
            type="primary"
            effect="plain"
          >
            {{ skill }}
          </el-tag>
        </div>

        <!-- 经验和位置 -->
        <div class="seeker-info">
          <span v-if="seeker.experience" class="info-item">
            <el-icon><Medal /></el-icon>
            {{ seeker.experience }}
          </span>
          <span class="info-item">
            <el-icon><Location /></el-icon>
            {{ seeker.location }}
          </span>
          <span class="info-item">
            <el-icon><Calendar /></el-icon>
            {{ seeker.availableDate }}可上岗
          </span>
        </div>

        <!-- 操作按钮 -->
        <div class="seeker-actions">
          <el-button type="primary" size="small" @click.stop="contactSeeker(seeker)">
            <el-icon><Phone /></el-icon>
            联系
          </el-button>
          <el-button size="small" @click.stop="inviteSeeker(seeker)">
            <el-icon><Message /></el-icon>
            邀请
          </el-button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="
        !loading && (showJobSeekers ? filteredSeekers.length === 0 : filteredJobs.length === 0)
      "
      class="empty-state"
    >
      <el-empty :description="showJobSeekers ? '暂无求职信息' : '暂无招聘信息'">
        <el-button type="primary" @click="refresh">刷新</el-button>
      </el-empty>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore" class="load-more">
      <el-button :loading="loadingMore" @click="loadMore" text> 加载更多 </el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Briefcase,
  Search,
  Sort,
  Location,
  User,
  Clock,
  Warning,
  DocumentAdd,
  Phone,
  Share,
  Medal,
  Calendar,
  Message,
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { JobPosting, JobSeeker, SortType } from '@/types/marketplace';

// 状态
const loading = ref(true);
const loadingMore = ref(false);
const searchKeyword = ref('');
const activeJobType = ref<string>('all');
const currentSort = ref<SortType>('latest');
const jobs = ref<JobPosting[]>([]);
const seekers = ref<JobSeeker[]>([]);
const showJobSeekers = ref(false);
const page = ref(1);
const pageSize = ref(10);
const hasMore = ref(false);

// 职位类型
const jobTypes = ref([
  { key: 'all', label: '全部', icon: '📋', count: 0 },
  { key: 'farm', label: '农活', icon: '🌾', count: 0 },
  { key: 'factory', label: '工厂', icon: '🏭', count: 0 },
  { key: 'construction', label: '建筑', icon: '🏗️', count: 0 },
  { key: 'service', label: '服务', icon: '🍽️', count: 0 },
  { key: 'other', label: '其他', icon: '📦', count: 0 },
]);

// 计算属性
const filteredJobs = computed(() => {
  let result = jobs.value;

  // 类型筛选
  if (activeJobType.value !== 'all') {
    result = result.filter(j => j.companyType === activeJobType.value);
  }

  // 搜索筛选
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(
      j =>
        j.title.toLowerCase().includes(keyword) ||
        j.company.toLowerCase().includes(keyword) ||
        j.requirements.some(r => r.toLowerCase().includes(keyword))
    );
  }

  // 排序
  result = [...result].sort((a, b) => {
    switch (currentSort.value) {
      case 'salary_high':
        return b.salaryMax - a.salaryMax;
      case 'distance':
        return (a.distance || Infinity) - (b.distance || Infinity);
      case 'latest':
      default:
        return new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime();
    }
  });

  return result;
});

const filteredSeekers = computed(() => {
  let result = seekers.value;

  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(
      s =>
        s.name.toLowerCase().includes(keyword) ||
        s.skills.some(skill => skill.toLowerCase().includes(keyword))
    );
  }

  return result;
});

const paginatedJobs = computed(() => {
  return filteredJobs.value.slice(0, page.value * pageSize.value);
});

const paginatedSeekers = computed(() => {
  return filteredSeekers.value.slice(0, page.value * pageSize.value);
});

const jobCount = computed(() => {
  return showJobSeekers.value ? filteredSeekers.value.length : filteredJobs.value.length;
});

// 方法
const toggleView = (view: 'jobs' | 'seekers') => {
  showJobSeekers.value = view === 'seekers';
  page.value = 1;
};

const handleSearch = () => {
  page.value = 1;
};

const handleSort = (sort: SortType) => {
  currentSort.value = sort;
};

const selectJobType = (type: string) => {
  activeJobType.value = type;
  page.value = 1;
};

const formatSalary = (job: JobPosting): string => {
  if (job.salaryType === 'negotiable') {
    return '面议';
  }

  const unitLabels: Record<string, string> = {
    hour: '时',
    day: '天',
    month: '月',
    year: '年',
    project: '项目',
  };

  if (job.salaryMin === job.salaryMax) {
    return `${job.salaryMin}元/${unitLabels[job.salaryUnit]}`;
  }
  return `${job.salaryMin}-${job.salaryMax}元/${unitLabels[job.salaryUnit]}`;
};

const getSalaryUnitLabel = (unit: string): string => {
  const labels: Record<string, string> = {
    hour: '时',
    day: '天',
    month: '月',
  };
  return labels[unit] || unit;
};

const getCompanyTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    farm: '农场',
    factory: '工厂',
    construction: '建筑',
    service: '服务',
    other: '其他',
  };
  return labels[type] || type;
};

const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
};

const formatTime = (time: string): string => {
  const date = new Date(time);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes === 0 ? '刚刚' : `${minutes}分钟前`;
    }
    return `${hours}小时前`;
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return `${days}天前`;
  }
  return `${date.getMonth() + 1}-${date.getDate()}`;
};

const viewJobDetail = (job: JobPosting) => {
  ElMessageBox.alert(
    `
    <div style="text-align: left;">
      <h3>${job.title}</h3>
      <p><strong>公司:</strong> ${job.company}</p>
      <p><strong>薪资:</strong> ${formatSalary(job)}</p>
      <p><strong>地点:</strong> ${job.location}</p>
      <p><strong>人数:</strong> ${job.workerCount}人</p>
      <p><strong>联系人:</strong> ${job.contactPerson}</p>
      <p><strong>要求:</strong></p>
      <ul>${job.requirements.map(r => `<li>${r}</li>`).join('')}</ul>
      ${job.benefits ? `<p><strong>福利:</strong> ${job.benefits.join(', ')}</p>` : ''}
    </div>
    `,
    '职位详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '申请职位',
    }
  ).then(() => {
    applyJob(job);
  });
};

const applyJob = (job: JobPosting) => {
  ElMessageBox.confirm(`申请 "${job.title}" 职位？\n公司将看到您的联系方式`, '确认申请', {
    confirmButtonText: '确认申请',
    cancelButtonText: '取消',
    type: 'info',
  })
    .then(() => {
      ElMessage.success('申请成功！请耐心等待企业联系');
    })
    .catch(() => {});
};

/**
 * 脱敏显示电话号码
 */
const maskPhone = (phone: string): string => {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

const contactEmployer = async (job: JobPosting) => {
  try {
    await ElMessageBox.confirm(
      `联系 ${job.contactPerson} (${job.company})？\n\n查看联系方式前请确认`,
      '确认联系',
      {
        confirmButtonText: '查看联系方式',
        cancelButtonText: '取消',
        type: 'info',
      }
    );

    // 显示脱敏后的联系方式
    const maskedPhone = maskPhone(job.contactPhone);
    const wechatInfo = job.wechat ? `微信: ${job.wechat}` : '未提供微信';

    await ElMessageBox.alert(
      `<div style="text-align: left; line-height: 2;">
        <p style="font-size: 16px; margin: 10px 0;"><strong>电话:</strong> ${job.contactPhone}</p>
        ${job.wechat ? `<p style="font-size: 16px; margin: 10px 0;"><strong>微信:</strong> ${job.wechat}</p>` : ''}
        <p style="color: #909399; font-size: 13px; margin: 10px 0;">提示: 请在工作时间联系</p>
      </div>`,
      '联系方式',
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '复制电话',
        callback: () => {
          navigator.clipboard.writeText(job.contactPhone);
          ElMessage.success('电话号码已复制到剪贴板');
        },
      }
    );
  } catch {
    // 用户取消
  }
};

const shareJob = (job: JobPosting) => {
  const text = `${job.title} - ${job.company}\n薪资: ${formatSalary(job)}\n地点: ${job.location}`;
  if (navigator.share) {
    navigator.share({
      title: job.title,
      text: text,
    });
  } else {
    navigator.clipboard.writeText(text);
    ElMessage.success('职位信息已复制');
  }
};

const viewSeekerDetail = (seeker: JobSeeker) => {
  ElMessageBox.alert(
    `
    <div style="text-align: left;">
      <h3>${seeker.name} (${seeker.age}岁 ${seeker.gender === 'male' ? '男' : '女'})</h3>
      <p><strong>期望薪资:</strong> ${seeker.expectedSalaryMin}-${seeker.expectedSalaryMax}元/${getSalaryUnitLabel(seeker.expectedSalaryUnit)}</p>
      <p><strong>技能:</strong> ${seeker.skills.join(', ')}</p>
      ${seeker.experience ? `<p><strong>经验:</strong> ${seeker.experience}</p>` : ''}
      <p><strong>位置:</strong> ${seeker.location}</p>
      <p><strong>可上岗:</strong> ${seeker.availableDate}</p>
    </div>
    `,
    '求职者详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '联系',
    }
  ).then(() => {
    contactSeeker(seeker);
  });
};

const contactSeeker = (seeker: JobSeeker) => {
  ElMessage.success('联系方式: ' + seeker.phone);
};

const inviteSeeker = (seeker: JobSeeker) => {
  ElMessage.success('邀请已发送给求职者');
};

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return;

  loadingMore.value = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    page.value++;
  } finally {
    loadingMore.value = false;
  }
};

const refresh = async () => {
  loading.value = true;
  await loadData();
};

const loadData = async () => {
  loading.value = true;
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 模拟招聘数据
    jobs.value = [
      {
        id: 'j1',
        title: '果园采摘工',
        company: '李氏果园',
        companyType: 'farm',
        location: '李家村',
        distance: 500,
        position: '采摘工',
        salaryMin: 120,
        salaryMax: 150,
        salaryUnit: 'day',
        salaryType: 'fixed',
        description: '负责水果采摘、分类、包装工作',
        requirements: ['身体健康', '吃苦耐劳', '年龄20-55岁'],
        benefits: ['包午餐', '可预支工资', '长期有活'],
        contactPerson: '李老板',
        contactPhone: '138****1234',
        workerCount: 5,
        urgent: true,
        status: 'active',
        publishTime: new Date().toISOString(),
        viewCount: 56,
      },
      {
        id: 'j2',
        title: '餐厅服务员',
        company: '王记农家菜',
        companyType: 'service',
        location: '王家庄',
        distance: 1200,
        position: '服务员',
        salaryMin: 3000,
        salaryMax: 4000,
        salaryUnit: 'month',
        salaryType: 'fixed',
        description: '负责接待客人、点餐、上菜等工作',
        requirements: ['形象良好', '沟通能力强', '有经验者优先'],
        benefits: ['包吃住', '月休4天', '节日福利'],
        contactPerson: '王经理',
        contactPhone: '139****5678',
        workerCount: 2,
        urgent: false,
        status: 'active',
        publishTime: new Date(Date.now() - 86400000).toISOString(),
        viewCount: 34,
      },
    ];

    // 模拟求职数据
    seekers.value = [
      {
        id: 's1',
        name: '张三',
        gender: 'male',
        age: 35,
        phone: '137****9012',
        skills: ['电焊', '木工', '装修'],
        expectedSalaryMin: 200,
        expectedSalaryMax: 300,
        expectedSalaryUnit: 'day',
        availableDate: '随时',
        experience: '10年装修经验',
        location: '李家村',
        verified: true,
        status: 'seeking',
        publishTime: new Date().toISOString(),
      },
      {
        id: 's2',
        name: '李四',
        gender: 'female',
        age: 28,
        phone: '158****3456',
        skills: ['做饭', '保洁', '照顾老人'],
        expectedSalaryMin: 3500,
        expectedSalaryMax: 4500,
        expectedSalaryUnit: 'month',
        availableDate: '一周内',
        location: '王家庄',
        verified: true,
        status: 'seeking',
        publishTime: new Date(Date.now() - 172800000).toISOString(),
      },
    ];

    hasMore.value = true;

    // 更新职位类型计数
    updateJobTypeCounts();
  } catch (error) {
    console.error('加载失败:', error);
    ElMessage.error('加载失败，请重试');
  } finally {
    loading.value = false;
  }
};

const updateJobTypeCounts = () => {
  const counts: Record<string, number> = {
    all: jobs.value.length,
    farm: 0,
    factory: 0,
    construction: 0,
    service: 0,
    other: 0,
  };

  jobs.value.forEach(job => {
    counts[job.companyType]++;
  });

  jobTypes.value.forEach(type => {
    type.count = counts[type.key] || 0;
  });
};

// 生命周期
onMounted(async () => {
  await loadData();
});
</script>

<style lang="scss" scoped>
.nearby-jobs-section {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .title-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .section-icon {
      font-size: 24px;
      color: #e6a23c;
    }

    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }

    .subtitle {
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }
}

.search-bar {
  margin-bottom: 12px;
}

.job-type-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 16px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  .type-tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    border: 1px solid var(--el-border-color);
    border-radius: 20px;
    background: #fff;
    cursor: pointer;
    transition: all 0.3s;
    white-space: nowrap;

    &:hover {
      border-color: var(--el-color-primary);
    }

    &.active {
      background: var(--el-color-primary);
      border-color: var(--el-color-primary);
      color: #fff;
    }

    .icon {
      font-size: 16px;
    }

    .label {
      font-size: 14px;
    }

    .count {
      font-size: 11px;
      opacity: 0.8;
    }
  }
}

.jobs-list,
.seekers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.job-card {
  position: relative;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
  }

  .urgent-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--el-color-danger);
    color: #fff;
    font-size: 12px;
    border-radius: 4px;
  }

  .job-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    padding-right: 60px;

    .job-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }

    .salary {
      text-align: right;

      .amount {
        font-size: 18px;
        font-weight: 600;
        color: var(--el-color-danger);
      }

      .negotiable {
        font-size: 13px;
        color: var(--el-text-color-secondary);
      }
    }
  }

  .company-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    .company-name {
      font-size: 14px;
      font-weight: 500;
    }
  }

  .job-info {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 12px;

    .info-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: var(--el-text-color-secondary);

      .distance {
        color: var(--el-color-primary);
      }
    }
  }

  .requirements {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 12px;

    .requirement-tag {
      padding: 4px 10px;
      background: var(--el-fill-color-light);
      border-radius: 4px;
      font-size: 12px;
      color: var(--el-text-color-regular);
    }

    .more-reqs {
      padding: 4px 10px;
      background: var(--el-fill-color);
      border-radius: 4px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .benefits {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .job-actions {
    display: flex;
    gap: 8px;

    .el-button {
      flex: 1;
    }
  }
}

.seeker-card {
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
  }

  .seeker-header {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;

    .seeker-basic-info {
      flex: 1;

      .name-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;

        .name {
          font-size: 16px;
          font-weight: 600;
        }

        .age,
        .gender {
          font-size: 13px;
          color: var(--el-text-color-secondary);
        }
      }

      .expected-salary {
        font-size: 14px;
        color: var(--el-color-danger);
        font-weight: 500;
      }
    }
  }

  .skills {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .seeker-info {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 12px;

    .info-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .seeker-actions {
    display: flex;
    gap: 8px;

    .el-button {
      flex: 1;
    }
  }
}

.loading-container,
.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.load-more {
  padding: 16px;
  text-align: center;
}

// 大字模式适配
.large-text-mode {
  .job-card .job-header .job-title {
    font-size: 18px;
  }

  .seeker-card .seeker-header .seeker-basic-info .name-row .name {
    font-size: 18px;
  }
}
</style>
