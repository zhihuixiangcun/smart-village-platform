<template>
  <div class="household-card" :class="{ 'card-elevated': elevated }">
    <el-card class="household-card-content" shadow="hover">
      <!-- 卡片头部 -->
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <div class="household-code">
              <el-tag type="primary" size="small">{{ household.codeId }}</el-tag>
              <el-tag v-if="household.specialTags.length > 0"
                     v-for="tag in household.specialTags.slice(0, 2)"
                     :key="tag"
                     type="warning"
                     size="small"
                     class="ml-1">
                {{ tag }}
              </el-tag>
            </div>
            <div class="householder-info">
              <h3 class="householder-name">{{ household.householder.name }}</h3>
              <p class="householder-role">{{ household.householder.occupation || '村民' }}</p>
            </div>
          </div>
          <div class="header-right">
            <el-dropdown trigger="click" @command="handleCommand">
              <el-button type="text" class="action-btn">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="view">查看详情</el-dropdown-item>
                  <el-dropdown-item command="edit" v-if="canEdit">编辑信息</el-dropdown-item>
                  <el-dropdown-item command="qrcode" v-if="canGenerateQR">生成二维码</el-dropdown-item>
                  <el-dropdown-item command="verify" v-if="canVerify">血缘验证</el-dropdown-item>
                  <el-dropdown-item command="history" divided>变更历史</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </template>

      <!-- 卡片内容 -->
      <div class="card-body">
        <!-- 基本信息 -->
        <div class="basic-info">
          <div class="info-item">
            <el-icon class="info-icon"><User /></el-icon>
            <span class="info-label">家庭成员:</span>
            <span class="info-value">{{ household.totalMembers || household.members.length + 1 }}人</span>
          </div>
          <div class="info-item">
            <el-icon class="info-icon"><Location /></el-icon>
            <span class="info-label">住址:</span>
            <span class="info-value address">{{ formatAddress(household.address) }}</span>
          </div>
          <div class="info-item" v-if="household.householder.phone">
            <el-icon class="info-icon"><Phone /></el-icon>
            <span class="info-label">联系电话:</span>
            <span class="info-value">{{ formatPhone(household.householder.phone) }}</span>
          </div>
        </div>

        <!-- 家庭成员预览 -->
        <div class="members-preview" v-if="household.members && household.members.length > 0">
          <div class="section-title">
            <el-icon><Users /></el-icon>
            <span>家庭成员</span>
            <el-badge :value="household.members.length" type="info" />
          </div>
          <div class="members-list">
            <div v-for="member in household.members.slice(0, 3)"
                 :key="member.idCard"
                 class="member-item">
              <el-avatar :size="32" class="member-avatar">
                {{ member.name.charAt(0) }}
              </el-avatar>
              <div class="member-info">
                <span class="member-name">{{ member.name }}</span>
                <span class="member-relation">{{ member.relationship }}</span>
              </div>
            </div>
            <div v-if="household.members.length > 3" class="more-members">
              <span>+{{ household.members.length - 3 }}人</span>
            </div>
          </div>
        </div>

        <!-- 特殊标签 -->
        <div class="special-tags" v-if="household.specialTags && household.specialTags.length > 0">
          <div class="section-title">
            <el-icon><CollectionTag /></el-icon>
            <span>特殊标签</span>
          </div>
          <div class="tags-container">
            <el-tag v-for="tag in household.specialTags"
                    :key="tag"
                    :type="getTagType(tag)"
                    size="small"
                    effect="light">
              {{ tag }}
            </el-tag>
          </div>
        </div>

        <!-- 二维码状态 -->
        <div class="qr-status" v-if="household.qrCode">
          <div class="section-title">
            <el-icon><QrCode /></el-icon>
            <span>户一码状态</span>
          </div>
          <div class="qr-info">
            <el-progress
              :percentage="getQRUsagePercentage(household.qrCode)"
              :color="getQRUsageColor(household.qrCode)"
              :show-text="false"
              :stroke-width="6"
              class="qr-progress" />
            <div class="qr-details">
              <span>已使用: {{ household.qrCode.usageCount }}/{{ household.qrCode.maxUsage }}</span>
              <el-tag :type="isQRExpired(household.qrCode) ? 'danger' : 'success'" size="small">
                {{ isQRExpired(household.qrCode) ? '已过期' : '有效' }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 卡片底部操作 -->
      <template #footer>
        <div class="card-footer">
          <div class="footer-left">
            <el-button type="text" @click="handleViewDetails">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button type="text" @click="handleVerifyRelation" v-if="canVerify">
              <el-icon><Connection /></el-icon>
              验证关系
            </el-button>
          </div>
          <div class="footer-right">
            <el-button type="primary" @click="handleGenerateQR" v-if="canGenerateQR" size="small">
              <el-icon><QrCode /></el-icon>
              生成二维码
            </el-button>
          </div>
        </div>
      </template>
    </el-card>

    <!-- 详情弹窗 -->
    <HouseholdDetailDialog
      v-model="detailDialogVisible"
      :household="household"
      @updated="handleHouseholdUpdated" />

    <!-- 血缘关系验证弹窗 -->
    <BloodRelationVerifyDialog
      v-model="verifyDialogVisible"
      :household="household" />

    <!-- 二维码生成弹窗 -->
    <QRCodeGenerateDialog
      v-model="qrDialogVisible"
      :household="household"
      @generated="handleQRGenerated" />
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User, Location, Phone, Users, CollectionTag, QrCode,
  MoreFilled, View, Connection
} from '@element-plus/icons-vue'
import HouseholdDetailDialog from './HouseholdDetailDialog.vue'
import BloodRelationVerifyDialog from './BloodRelationVerifyDialog.vue'
import QRCodeGenerateDialog from './QRCodeGenerateDialog.vue'
import { useUserStore } from '@/stores/user'

// Props
const props = defineProps({
  household: {
    type: Object,
    required: true
  },
  elevated: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['updated', 'qr-generated', 'relation-verified'])

// Store
const userStore = useUserStore()

// Refs
const detailDialogVisible = ref(false)
const verifyDialogVisible = ref(false)
const qrDialogVisible = ref(false)

// Computed
const canEdit = computed(() => {
  return userStore.hasRole(['village_admin', 'department_head']) ||
         userStore.villageId === props.household.villageId
})

const canGenerateQR = computed(() => {
  return userStore.hasRole(['village_admin', 'department_head']) ||
         (userStore.hasRole(['villager']) && userStore.villageId === props.household.villageId)
})

const canVerify = computed(() => {
  return userStore.hasRole(['villager', 'village_admin', 'department_head'])
})

// Methods
const formatAddress = (address) => {
  if (!address) return '未知地址'
  const parts = [
    address.province,
    address.city,
    address.county,
    address.township,
    address.village,
    address.detailed
  ].filter(Boolean)
  return parts.join(' ') || '地址信息不完整'
}

const formatPhone = (phone) => {
  if (!phone) return '未提供'
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const getTagType = (tag) => {
  const typeMap = {
    '党员家庭': 'danger',
    '军属家庭': 'warning',
    '低保户': 'info',
    '五保户': 'info',
    '文明家庭': 'success',
    '卫生家庭': 'success',
    '安全家庭': 'success'
  }
  return typeMap[tag] || 'primary'
}

const getQRUsagePercentage = (qrCode) => {
  if (!qrCode || !qrCode.maxUsage) return 0
  return Math.round((qrCode.usageCount / qrCode.maxUsage) * 100)
}

const getQRUsageColor = (qrCode) => {
  const percentage = getQRUsagePercentage(qrCode)
  if (percentage >= 80) return '#f56c6c'
  if (percentage >= 60) return '#e6a23c'
  return '#67c23a'
}

const isQRExpired = (qrCode) => {
  if (!qrCode || !qrCode.expiryDate) return false
  return new Date() > new Date(qrCode.expiryDate)
}

const handleCommand = (command) => {
  switch (command) {
    case 'view':
      handleViewDetails()
      break
    case 'edit':
      handleEdit()
      break
    case 'qrcode':
      handleGenerateQR()
      break
    case 'verify':
      handleVerifyRelation()
      break
    case 'history':
      handleViewHistory()
      break
  }
}

const handleViewDetails = () => {
  detailDialogVisible.value = true
}

const handleEdit = () => {
  // 这里可以跳转到编辑页面或打开编辑弹窗
  emit('edit', props.household)
}

const handleGenerateQR = () => {
  qrDialogVisible.value = true
}

const handleVerifyRelation = () => {
  verifyDialogVisible.value = true
}

const handleViewHistory = () => {
  // 查看变更历史
  emit('view-history', props.household)
}

const handleHouseholdUpdated = (updatedHousehold) => {
  emit('updated', updatedHousehold)
  ElMessage.success('家庭信息更新成功')
}

const handleQRGenerated = (qrData) => {
  emit('qr-generated', qrData)
  ElMessage.success('二维码生成成功')
}

const handleRelationVerified = (verificationResult) => {
  emit('relation-verified', verificationResult)
}
</script>

<style scoped>
.household-card {
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.card-elevated {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.household-card-content {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  flex: 1;
}

.household-code {
  margin-bottom: 8px;
}

.householder-info {
  margin: 0;
}

.householder-name {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.householder-role {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.header-right {
  margin-left: 12px;
}

.action-btn {
  padding: 4px;
  color: #909399;
}

.action-btn:hover {
  color: #409eff;
  background-color: #f5f7fa;
}

.card-body {
  padding: 0;
}

.basic-info {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.info-icon {
  margin-right: 8px;
  color: #909399;
  font-size: 16px;
}

.info-label {
  color: #606266;
  margin-right: 8px;
  min-width: 70px;
}

.info-value {
  color: #303133;
  flex: 1;
}

.address {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.members-preview,
.special-tags,
.qr-status {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.section-title .el-icon {
  margin-right: 6px;
  color: #409eff;
}

.members-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 500;
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.member-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.member-relation {
  font-size: 12px;
  color: #909399;
}

.more-members {
  align-self: center;
  font-size: 12px;
  color: #909399;
  padding: 0 8px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.qr-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qr-progress {
  margin-bottom: 4px;
}

.qr-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0 0 0;
  border-top: 1px solid #f0f0f0;
}

.footer-left {
  display: flex;
  gap: 8px;
}

.footer-right {
  display: flex;
  gap: 8px;
}

.ml-1 {
  margin-left: 4px;
}
</style>