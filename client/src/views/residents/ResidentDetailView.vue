<template>
  <div class="resident-detail-view">
    <el-page-header @back="goBack" title="村民详情">
      <template #content>
        <span v-if="resident">{{ resident.name }} 的详细信息</span>
      </template>
      <template #extra>
        <el-button v-if="canEdit" type="primary" @click="editResident">
          编辑信息
        </el-button>
      </template>
    </el-page-header>

    <div class="content" v-if="resident">
      <el-row :gutter="20">
        <!-- 基本信息 -->
        <el-col :span="16">
          <el-card title="基本信息" class="info-card">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="姓名">{{ resident.name }}</el-descriptions-item>
              <el-descriptions-item label="性别">{{ resident.gender }}</el-descriptions-item>
              <el-descriptions-item label="年龄">{{ resident.age }}</el-descriptions-item>
              <el-descriptions-item label="身份证号">{{ maskedIdCard }}</el-descriptions-item>
              <el-descriptions-item label="手机号">{{ maskedPhone }}</el-descriptions-item>
              <el-descriptions-item label="住址">{{ resident.address }}</el-descriptions-item>
              <el-descriptions-item label="户籍类型">{{ resident.householdType }}</el-descriptions-item>
              <el-descriptions-item label="登记时间">{{ formatDate(resident.createdAt) }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>

        <!-- 状态信息 -->
        <el-col :span="8">
          <el-card title="状态信息" class="status-card">
            <div class="status-item">
              <span class="label">在村状态：</span>
              <el-tag :type="resident.status === '在村' ? 'success' : 'warning'">
                {{ resident.status || '在村' }}
              </el-tag>
            </div>
            <div class="status-item">
              <span class="label">是否党员：</span>
              <el-tag :type="resident.isPartyMember ? 'danger' : 'info'">
                {{ resident.isPartyMember ? '是' : '否' }}
              </el-tag>
            </div>
            <div class="status-item">
              <span class="label">健康状态：</span>
              <el-tag :type="getHealthStatusType(resident.healthStatus)">
                {{ resident.healthStatus || '良好' }}
              </el-tag>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 家庭信息 -->
      <el-card title="家庭信息" class="family-card">
        <template #extra>
          <el-button size="small" @click="manageFamilyMembers">管理家庭成员</el-button>
        </template>
        <div v-if="familyMembers.length > 0">
          <el-table :data="familyMembers" style="width: 100%">
            <el-table-column prop="name" label="姓名" />
            <el-table-column prop="relationship" label="关系" />
            <el-table-column prop="age" label="年龄" />
            <el-table-column prop="phone" label="手机号" />
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button size="small" @click="viewFamilyMember(scope.row)">
                  查看
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-empty v-else description="暂无家庭成员信息" />
      </el-card>
    </div>

    <div v-else-if="loading" class="loading">
      <el-skeleton :rows="8" animated />
    </div>

    <el-empty v-else description="未找到村民信息" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useResidentStore } from '@/stores/residentStore'
import { useUserStore } from '@/stores/userStore'

const route = useRoute()
const router = useRouter()
const residentStore = useResidentStore()
const userStore = useUserStore()

const resident = ref(null)
const familyMembers = ref([])
const loading = ref(true)

const residentId = route.params.id

// 权限检查
const canEdit = computed(() => {
  return userStore.hasPermission('resident:write')
})

// 脱敏处理
const maskedIdCard = computed(() => {
  if (!resident.value?.idCard) return '-'
  const idCard = resident.value.idCard
  return idCard.slice(0, 6) + '****' + idCard.slice(-4)
})

const maskedPhone = computed(() => {
  if (!resident.value?.phone) return '-'
  const phone = resident.value.phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
})

const getHealthStatusType = (status) => {
  const statusMap = {
    '良好': 'success',
    '一般': 'warning',
    '较差': 'danger'
  }
  return statusMap[status] || 'info'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const loadResidentDetail = async () => {
  try {
    loading.value = true
    resident.value = await residentStore.getResidentDetail(residentId)
    familyMembers.value = await residentStore.getFamilyMembers(residentId)
  } catch (error) {
    console.error('加载村民详情失败:', error)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.go(-1)
}

const editResident = () => {
  router.push(`/residents/${residentId}/edit`)
}

const manageFamilyMembers = () => {
  // 打开家庭成员管理对话框
  console.log('管理家庭成员')
}

const viewFamilyMember = (member) => {
  console.log('查看家庭成员:', member)
}

onMounted(() => {
  loadResidentDetail()
})
</script>

<style scoped>
.resident-detail-view {
  padding: 20px;
}

.content {
  margin-top: 20px;
}

.info-card,
.status-card,
.family-card {
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.status-item .label {
  width: 80px;
  color: #606266;
  font-size: 14px;
}

.loading {
  padding: 20px;
}
</style>