<template>
  <div class="my-profile">
    <!-- 个人信息卡片 -->
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <span>个人档案</span>
          <el-button type="primary" icon="Edit" @click="showEditDialog = true">
            编辑资料
          </el-button>
        </div>
      </template>

      <div class="profile-content">
        <el-row :gutter="40">
          <el-col :span="6">
            <div class="avatar-section">
              <el-avatar :size="120" :src="profile?.personalInfo?.photo" class="profile-avatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              <div class="avatar-actions">
                <el-upload
                  :action="uploadUrl"
                  :headers="uploadHeaders"
                  :show-file-list="false"
                  :on-success="handleAvatarSuccess"
                  :before-upload="beforeAvatarUpload"
                >
                  <el-button size="small" icon="Camera"> 更换头像 </el-button>
                </el-upload>
              </div>
            </div>
          </el-col>
          <el-col :span="18">
            <div class="info-section">
              <h2>{{ profile?.personalInfo?.name }}</h2>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">性别：</span>
                  <span class="value">{{ profile?.personalInfo?.gender }}</span>
                </div>
                <div class="info-item">
                  <span class="label">年龄：</span>
                  <span class="value">{{ profile?.personalInfo?.age }}岁</span>
                </div>
                <div class="info-item">
                  <span class="label">身份证号：</span>
                  <span class="value">{{ maskIdCard(profile?.personalInfo?.idCard) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">民族：</span>
                  <span class="value">{{ profile?.personalInfo?.ethnicity }}</span>
                </div>
                <div class="info-item">
                  <span class="label">政治面貌：</span>
                  <span class="value">{{ profile?.personalInfo?.politicalStatus }}</span>
                </div>
                <div class="info-item">
                  <span class="label">婚姻状况：</span>
                  <span class="value">{{ profile?.personalInfo?.maritalStatus }}</span>
                </div>
                <div class="info-item">
                  <span class="label">健康状况：</span>
                  <span class="value">{{ profile?.personalInfo?.healthStatus }}</span>
                </div>
                <div class="info-item">
                  <span class="label">血型：</span>
                  <span class="value">{{ profile?.personalInfo?.bloodType || '未知' }}</span>
                </div>
              </div>

              <!-- 标签 -->
              <div class="tags-section" v-if="profile?.tags?.length > 0">
                <span class="label">特殊标签：</span>
                <el-tag
                  v-for="tag in profile.tags"
                  :key="tag"
                  :type="getTagType(tag)"
                  size="small"
                  style="margin-right: 8px"
                >
                  {{ tag }}
                </el-tag>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 联系信息 -->
    <el-card class="contact-card">
      <template #header>
        <span>联系方式</span>
      </template>

      <div class="contact-info">
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="contact-item">
              <div class="item-icon">
                <el-icon><Phone /></el-icon>
              </div>
              <div class="item-content">
                <div class="item-label">手机号码</div>
                <div class="item-value">{{ profile?.contact?.phone }}</div>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="contact-item">
              <div class="item-icon">
                <el-icon><Message /></el-icon>
              </div>
              <div class="item-content">
                <div class="item-label">电子邮箱</div>
                <div class="item-value">{{ profile?.contact?.email || '未填写' }}</div>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="contact-item">
              <div class="item-icon">
                <el-icon><Location /></el-icon>
              </div>
              <div class="item-content">
                <div class="item-label">家庭住址</div>
                <div class="item-value">{{ profile?.contact?.address }}</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 教育背景 -->
    <el-card class="education-card">
      <template #header>
        <span>教育背景</span>
      </template>

      <div class="education-info" v-if="profile?.education">
        <el-row :gutter="20">
          <el-col :span="6">
            <div class="edu-item">
              <span class="label">学历：</span>
              <span class="value">{{ profile.education.degree }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="edu-item">
              <span class="label">毕业学校：</span>
              <span class="value">{{ profile.education.school || '未填写' }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="edu-item">
              <span class="label">专业：</span>
              <span class="value">{{ profile.education.major || '未填写' }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="edu-item">
              <span class="label">毕业年份：</span>
              <span class="value">{{ profile.education.graduationYear || '未填写' }}</span>
            </div>
          </el-col>
        </el-row>
      </div>
      <el-empty v-else description="暂无教育信息" />
    </el-card>

    <!-- 就业信息 -->
    <el-card class="employment-card">
      <template #header>
        <span>就业信息</span>
      </template>

      <div class="employment-info" v-if="profile?.employment">
        <el-row :gutter="20">
          <el-col :span="6">
            <div class="emp-item">
              <span class="label">就业状态：</span>
              <span class="value">{{ profile.employment.status }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="emp-item">
              <span class="label">工作单位：</span>
              <span class="value">{{ profile.employment.employer || '未填写' }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="emp-item">
              <span class="label">职位：</span>
              <span class="value">{{ profile.employment.position || '未填写' }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="emp-item">
              <span class="label">月收入：</span>
              <span class="value">{{ formatIncome(profile.employment.income?.monthly) }}</span>
            </div>
          </el-col>
        </el-row>
      </div>
      <el-empty v-else description="暂无就业信息" />
    </el-card>

    <!-- 社会保障 -->
    <el-card class="social-card">
      <template #header>
        <span>社会保障</span>
      </template>

      <div class="social-info" v-if="profile?.socialSecurity">
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="social-item">
              <el-tag :type="profile.socialSecurity.hasMedicalInsurance ? 'success' : 'info'">
                {{ profile.socialSecurity.hasMedicalInsurance ? '有' : '无' }}医保
              </el-tag>
              <span class="detail">{{ profile.socialSecurity.medicalInsuranceType }}</span>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="social-item">
              <el-tag :type="profile.socialSecurity.hasPensionInsurance ? 'success' : 'info'">
                {{ profile.socialSecurity.hasPensionInsurance ? '有' : '无' }}养老
              </el-tag>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="social-item">
              <el-tag :type="profile.socialSecurity.hasUnemploymentInsurance ? 'success' : 'info'">
                {{ profile.socialSecurity.hasUnemploymentInsurance ? '有' : '无' }}失业
              </el-tag>
            </div>
          </el-col>
        </el-row>
      </div>
      <el-empty v-else description="暂无社会保障信息" />
    </el-card>

    <!-- 家庭关系 -->
    <el-card class="family-card" v-if="profile?.familyRelations?.length > 0">
      <template #header>
        <span>家庭成员</span>
      </template>

      <el-table :data="profile.familyRelations" style="width: 100%">
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="relationType" label="关系" width="100" />
        <el-table-column prop="age" label="年龄" width="80" align="center" />
        <el-table-column prop="phone" label="联系电话" width="150" />
        <el-table-column prop="occupation" label="职业" />
        <el-table-column prop="isCohabit" label="是否同住" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isCohabit ? 'success' : 'info'" size="small">
              {{ row.isCohabit ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="guardianFor" label="监护对象">
          <template #default="{ row }">
            <el-tag
              v-for="person in row.guardianFor"
              :key="person"
              size="small"
              style="margin-right: 5px"
            >
              {{ person }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑个人资料"
      width="800px"
      :close-on-click-modal="false"
    >
      <ProfileForm
        :profile="profile"
        mode="edit"
        @submit="handleProfileUpdate"
        @cancel="showEditDialog = false"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { User, Edit, Phone, Message, Location, Camera } from '@element-plus/icons-vue';
import { profileApi } from '@/api/residentProfile';
import ProfileForm from '@/components/resident/ProfileForm.vue';

// 响应式数据
const profile = ref(null);
const showEditDialog = ref(false);
const uploadUrl = import.meta.env.VITE_API_URL + '/api/v1/upload';
const uploadHeaders = {
  Authorization: 'Bearer ' + localStorage.getItem('token'),
};

// 加载个人资料
const loadProfile = async () => {
  try {
    const response = await profileApi.getMyProfile();
    profile.value = response.data;
  } catch (error) {
    ElMessage.error('加载个人资料失败');
    console.error(error);
  }
};

// 头像上传前验证
const beforeAvatarUpload = file => {
  const isImage = file.type.startsWith('image/');
  const isLt2M = file.size / 1024 / 1024 < 2;

  if (!isImage) {
    ElMessage.error('上传头像只能是图片格式!');
    return false;
  }
  if (!isLt2M) {
    ElMessage.error('上传头像大小不能超过 2MB!');
    return false;
  }
  return true;
};

// 头像上传成功
const handleAvatarSuccess = response => {
  ElMessage.success('头像上传成功');
  // 更新本地资料
  if (profile.value && response.data.data?.photo) {
    profile.value.personalInfo.photo = response.data.data.photo;
  }
};

// 身份证号脱敏
const maskIdCard = idCard => {
  if (!idCard) return '';
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
};

// 格式化收入
const formatIncome = income => {
  if (!income) return '未填写';
  return `${income.toLocaleString()} 元`;
};

// 获取标签类型
const getTagType = tag => {
  const tagTypeMap = {
    党员: 'danger',
    村干部: 'warning',
    退役军人: 'success',
    残疾人: 'info',
    低保户: 'danger',
    五保户: 'warning',
    留守儿童: 'primary',
    空巢老人: 'warning',
    独居老人: 'warning',
    大病家庭: 'danger',
    单亲家庭: 'info',
    失独家庭: 'danger',
    烈属: 'danger',
    优抚对象: 'success',
    困难党员: 'danger',
    返乡创业: 'success',
    农民工: '',
    大学生: 'primary',
    专业技术人才: 'success',
    其他: '',
  };
  return tagTypeMap[tag] || '';
};

// 更新资料
const handleProfileUpdate = async formData => {
  try {
    await profileApi.updateMyProfile(formData);
    ElMessage.success('更新成功');
    showEditDialog.value = false;
    loadProfile();
  } catch (error) {
    ElMessage.error('更新失败');
    console.error(error);
  }
};

// 生命周期
onMounted(() => {
  loadProfile();
});
</script>

<style lang="scss" scoped>
.my-profile {
  padding: 20px;

  .profile-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .profile-content {
      .avatar-section {
        text-align: center;

        .profile-avatar {
          margin-bottom: 15px;
        }

        .avatar-actions {
          margin-top: 10px;
        }
      }

      .info-section {
        h2 {
          margin: 0 0 20px 0;
          font-size: 24px;
          color: #303133;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 20px;

          .info-item {
            display: flex;
            align-items: center;

            .label {
              color: #909399;
              min-width: 80px;
              margin-right: 10px;
            }

            .value {
              color: #303133;
              font-weight: 500;
            }
          }
        }

        .tags-section {
          display: flex;
          align-items: center;
          margin-top: 20px;

          .label {
            color: #909399;
            margin-right: 10px;
          }
        }
      }
    }
  }

  .contact-card,
  .education-card,
  .employment-card,
  .social-card,
  .family-card {
    margin-bottom: 20px;

    .contact-info,
    .education-info,
    .employment-info,
    .social-info {
      .contact-item,
      .edu-item,
      .emp-item,
      .social-item {
        display: flex;
        align-items: center;

        .item-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: #f0f2f5;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;

          .el-icon {
            font-size: 18px;
            color: #409eff;
          }
        }

        .item-content {
          flex: 1;

          .item-label {
            color: #909399;
            font-size: 14px;
            margin-bottom: 5px;
          }

          .item-value {
            color: #303133;
            font-weight: 500;
          }
        }
      }
    }

    .family-card {
      :deep(.el-table) {
        margin-top: 10px;
      }
    }
  }
}
</style>
