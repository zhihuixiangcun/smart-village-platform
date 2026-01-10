<template>
  <div class="family-section">
    <div class="section-header">
      <h2 class="section-title">
        <el-icon><UserFilled /></el-icon>
        我的家庭
      </h2>
      <el-button text @click="goToFamilyDetail">
        查看全家
        <el-icon><ArrowRight /></el-icon>
      </el-button>
    </div>

    <div class="section-divider"></div>

    <!-- 家庭成员横向滚动容器 -->
    <div class="family-scroll-container">
      <div class="family-cards-wrapper">
        <div
          v-for="member in familyMembers"
          :key="member.id"
          class="family-card"
          :class="{ 'is-self': member.isSelf }"
          @click="handleMemberClick(member)"
          role="button"
          tabindex="0"
          :aria-label="`${member.name}，${member.relation}`"
        >
          <div class="member-avatar">
            <img
              v-if="member.avatar"
              :src="member.avatar"
              :alt="member.name"
              class="avatar-image"
            />
            <div v-else class="avatar-placeholder">
              <el-icon :size="32"><User /></el-icon>
            </div>
            <div v-if="member.isSelf" class="self-badge">本人</div>
          </div>

          <div class="member-info">
            <h3 class="member-name">{{ member.name }}</h3>
            <p class="member-relation">{{ member.relation }}</p>
          </div>

          <div v-if="member.tags && member.tags.length > 0" class="member-tags">
            <el-tag
              v-for="tag in member.tags"
              :key="tag"
              :type="getTagType(tag)"
              size="small"
              class="family-tag"
            >
              {{ tag }}
            </el-tag>
          </div>

          <div v-if="member.healthStatus" class="health-status">
            <el-icon><CircleCheck /></el-icon>
            <span>{{ member.healthStatus }}</span>
          </div>
        </div>

        <!-- 添加成员卡片 -->
        <div
          class="family-card add-member-card"
          @click="handleAddMember"
          role="button"
          tabindex="0"
          aria-label="添加家庭成员"
        >
          <div class="add-icon">
            <el-icon :size="48"><Plus /></el-icon>
          </div>
          <div class="add-text">
            <h3>添加成员</h3>
          </div>
        </div>
      </div>
    </div>

    <!-- 家庭统计信息 -->
    <div class="family-stats">
      <div class="stat-item">
        <span class="stat-label">家庭人口</span>
        <span class="stat-value">{{ familyMembers.length }}人</span>
      </div>
      <el-divider direction="vertical" />
      <div class="stat-item">
        <span class="stat-label">特殊家庭</span>
        <span class="stat-value" :class="{ 'has-special': specialFamilyCount > 0 }">
          {{ specialFamilyType || '普通家庭' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { UserFilled, ArrowRight, User, Plus, CircleCheck } from '@element-plus/icons-vue';
import { useFontSize } from '@/composables/useFontSize';

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  avatar?: string;
  isSelf?: boolean;
  tags?: string[];
  healthStatus?: string;
  age?: number;
  phone?: string;
}

const router = useRouter();
const { isLargeText } = useFontSize();

// 家庭成员数据
const familyMembers = ref<FamilyMember[]>([
  {
    id: '1',
    name: '张三',
    relation: '户主',
    avatar: '',
    isSelf: true,
    tags: ['党员'],
    healthStatus: '健康',
    age: 45,
    phone: '138****1234',
  },
  {
    id: '2',
    name: '李四',
    relation: '配偶',
    avatar: '',
    tags: [],
    healthStatus: '健康',
    age: 43,
  },
  {
    id: '3',
    name: '张小明',
    relation: '长子',
    avatar: '',
    tags: ['学生'],
    healthStatus: '健康',
    age: 18,
  },
  {
    id: '4',
    name: '王奶奶',
    relation: '母亲',
    avatar: '',
    tags: ['独居老人', '高血压'],
    healthStatus: '需关注',
    age: 78,
  },
]);

// 特殊家庭标签统计
const specialFamilyCount = computed(() => {
  return familyMembers.value.reduce((count, member) => {
    return count + (member.tags?.length || 0);
  }, 0);
});

// 特殊家庭类型
const specialFamilyType = computed(() => {
  const allTags = familyMembers.value.flatMap(m => m.tags || []);
  if (allTags.includes('低保户')) return '低保家庭';
  if (allTags.includes('独居老人')) return '独居老人户';
  if (allTags.includes('残疾人')) return '残疾人家庭';
  if (allTags.includes('党员')) return '党员家庭';
  return null;
});

/**
 * 获取标签颜色类型
 */
const getTagType = (tag: string): 'success' | 'warning' | 'danger' | 'info' | 'primary' => {
  const typeMap: Record<string, string> = {
    党员: 'danger',
    低保户: 'warning',
    独居老人: 'danger',
    残疾人: 'info',
    学生: 'success',
    高血压: 'warning',
    糖尿病: 'warning',
  };
  return (typeMap[tag] as any) || 'info';
};

/**
 * 处理家庭成员卡片点击
 */
const handleMemberClick = (member: FamilyMember) => {
  router.push({
    path: '/family/member',
    query: { id: member.id },
  });
};

/**
 * 处理添加家庭成员
 */
const handleAddMember = () => {
  ElMessage.info('添加家庭成员功能开发中');
  // TODO: 实现添加家庭成员流程
  // 1. 人脸识别认证
  // 2. 填写成员信息
  // 3. 上传相关证件
};

/**
 * 跳转到家庭详情页面
 */
const goToFamilyDetail = () => {
  router.push('/family');
};
</script>

<style lang="scss" scoped>
.family-section {
  margin-bottom: 24px;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--font-size-h2, 20px);
      font-weight: 700;
      margin: 0;
      color: #303133;

      .el-icon {
        color: #9c27b0;
      }
    }

    .el-button {
      font-size: var(--font-size-small, 14px);
      color: #909399;

      &:hover {
        color: #409eff;
      }
    }
  }

  .section-divider {
    height: 2px;
    background: linear-gradient(90deg, #9c27b0 0%, transparent 100%);
    margin-bottom: 16px;
  }

  .family-scroll-container {
    overflow-x: auto;
    overflow-y: hidden;
    margin: 0 -16px;
    padding: 0 16px;

    // 隐藏滚动条但保留功能
    scrollbar-width: none; // Firefox
    -ms-overflow-style: none; // IE/Edge

    &::-webkit-scrollbar {
      display: none; // Chrome/Safari
    }

    .family-cards-wrapper {
      display: flex;
      gap: 12px;
      padding: 4px 0;
    }
  }

  .family-card {
    flex-shrink: 0;
    width: 140px;
    background: white;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
    }

    &:active {
      transform: translateY(-2px);
    }

    &.is-self {
      border: 2px solid #9c27b0;
    }

    .member-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      overflow: hidden;
      margin-bottom: 12px;
      position: relative;

      .avatar-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-placeholder {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }

      .self-badge {
        position: absolute;
        bottom: -4px;
        left: 50%;
        transform: translateX(-50%);
        background: #9c27b0;
        color: white;
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 10px;
        white-space: nowrap;
      }
    }

    .member-info {
      width: 100%;

      .member-name {
        font-size: var(--font-size-base, 16px);
        font-weight: 600;
        margin: 0 0 4px 0;
        color: #303133;
      }

      .member-relation {
        font-size: var(--font-size-small, 14px);
        color: #909399;
        margin: 0;
      }
    }

    .member-tags {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: center;

      .family-tag {
        font-size: 11px;
        height: 20px;
        line-height: 20px;
        padding: 0 6px;
      }
    }

    .health-status {
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: var(--font-size-small, 14px);
      color: #51cf66;

      .el-icon {
        font-size: 16px;
      }
    }

    &.add-member-card {
      background: #f5f7fa;
      border: 2px dashed #dcdfe6;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 180px;

      &:hover {
        border-color: #9c27b0;
        background: #f3e5f5;
      }

      .add-icon {
        color: #9c27b0;
        margin-bottom: 12px;
      }

      .add-text {
        h3 {
          font-size: var(--font-size-base, 16px);
          font-weight: 600;
          margin: 0;
          color: #606266;
        }
      }
    }
  }

  .family-stats {
    margin-top: 16px;
    padding: 16px;
    background: white;
    border-radius: 12px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;

      .stat-label {
        font-size: var(--font-size-small, 14px);
        color: #909399;
      }

      .stat-value {
        font-size: var(--font-size-h3, 18px);
        font-weight: 700;
        color: #303133;

        &.has-special {
          color: #ff9800;
        }
      }
    }
  }
}

// 大字模式适配
:deep(.large-text-mode) {
  .family-section {
    .section-title {
      font-size: var(--font-size-large-h2, 28px);
    }

    .family-card {
      .member-name {
        font-size: var(--font-size-large-base, 22px);
      }

      .member-relation {
        font-size: var(--font-size-large-small, 19px);
      }
    }

    .family-stats {
      .stat-label {
        font-size: var(--font-size-large-small, 19px);
      }

      .stat-value {
        font-size: var(--font-size-large-h3, 25px);
      }
    }
  }
}

// 响应式适配
@media (max-width: 480px) {
  .family-section {
    .family-card {
      width: 120px;

      .member-avatar {
        width: 56px;
        height: 56px;
      }
    }

    .family-stats {
      gap: 16px;

      .stat-item {
        .stat-label {
          font-size: var(--font-size-small, 14px);
        }

        .stat-value {
          font-size: var(--font-size-h3, 18px);
        }
      }
    }
  }
}
</style>
