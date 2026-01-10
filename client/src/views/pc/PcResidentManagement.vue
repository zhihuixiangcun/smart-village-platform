<!--
  PC端村民管理页面
  智慧乡村综合服务平台 - PC端村民管理
-->
<template>
  <div class="pc-resident-management">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1>村民管理</h1>
        <p>数字化村民档案管理，一户一码精准服务</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          添加村民
        </el-button>
        <el-button @click="showImportDialog">
          <el-icon><Upload /></el-icon>
          批量导入
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </div>
    </header>

    <!-- 统计概览 -->
    <section class="overview-section">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="8" :md="4" v-for="stat in statistics" :key="stat.key">
          <div class="overview-card" :class="stat.key">
            <div class="card-icon" :style="{ background: stat.gradient }">
              <el-icon :size="24" color="white">
                <component :is="stat.icon" />
              </el-icon>
            </div>
            <div class="card-info">
              <div class="card-value">{{ stat.value }}</div>
              <div class="card-label">{{ stat.label }}</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- 搜索筛选区域 -->
    <section class="filter-section">
      <el-card shadow="never">
        <div class="filter-content">
          <div class="search-area">
            <el-input
              v-model="searchParams.keyword"
              placeholder="搜索姓名、身份证、手机号、户号..."
              prefix-icon="Search"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
              class="search-input"
            />
          </div>
          <div class="filter-area">
            <el-select
              v-model="searchParams.householdType"
              placeholder="家庭类型"
              clearable
              @change="handleSearch"
            >
              <el-option label="全部" value="" />
              <el-option label="普通户" value="普通户" />
              <el-option label="低保户" value="低保户" />
              <el-option label="残疾户" value="残疾户" />
              <el-option label="军人家庭" value="军人家庭" />
            </el-select>
            <el-select
              v-model="searchParams.ageGroup"
              placeholder="年龄段"
              clearable
              @change="handleSearch"
            >
              <el-option label="全部" value="" />
              <el-option label="0-18岁" value="0-18" />
              <el-option label="19-35岁" value="19-35" />
              <el-option label="36-60岁" value="36-60" />
              <el-option label="60岁以上" value="60+" />
            </el-select>
            <el-select
              v-model="searchParams.status"
              placeholder="状态"
              clearable
              @change="handleSearch"
            >
              <el-option label="全部" value="" />
              <el-option label="正常" value="active" />
              <el-option label="迁出" value="moved" />
              <el-option label="死亡" value="deceased" />
            </el-select>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="resetFilters">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
            <el-button @click="showAdvancedFilter = !showAdvancedFilter">
              <el-icon><Filter /></el-icon>
              高级筛选
            </el-button>
          </div>
        </div>

        <!-- 高级筛选面板 -->
        <transition name="slide-down">
          <div v-if="showAdvancedFilter" class="advanced-filter">
            <el-row :gutter="20">
              <el-col :span="6">
                <el-form-item label="性别">
                  <el-select v-model="searchParams.gender" placeholder="请选择" clearable>
                    <el-option label="男" value="男" />
                    <el-option label="女" value="女" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="教育程度">
                  <el-select v-model="searchParams.education" placeholder="请选择" clearable>
                    <el-option label="小学及以下" value="小学及以下" />
                    <el-option label="初中" value="初中" />
                    <el-option label="高中" value="高中" />
                    <el-option label="大专" value="大专" />
                    <el-option label="本科及以上" value="本科及以上" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="政治面貌">
                  <el-select v-model="searchParams.politicalStatus" placeholder="请选择" clearable>
                    <el-option label="群众" value="群众" />
                    <el-option label="共青团员" value="共青团员" />
                    <el-option label="中共党员" value="中共党员" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="特殊群体">
                  <el-select v-model="searchParams.specialGroup" placeholder="请选择" clearable>
                    <el-option label="低保户" value="lowIncome" />
                    <el-option label="残疾人" value="disabled" />
                    <el-option label="独居老人" value="elderly" />
                    <el-option label="留守儿童" value="leftBehind" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </transition>
      </el-card>
    </section>

    <!-- 数据表格区域 -->
    <section class="table-section">
      <el-card shadow="never">
        <template #header>
          <div class="table-header">
            <span class="table-title">村民列表</span>
            <div class="table-actions">
              <span class="total-count">共 {{ pagination.total }} 条记录</span>
              <el-dropdown @command="handleBatchCommand" trigger="click">
                <el-button :disabled="selectedResidents.length === 0">
                  批量操作 ({{ selectedResidents.length }})
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="export">
                      <el-icon><Download /></el-icon>导出选中
                    </el-dropdown-item>
                    <el-dropdown-item command="print">
                      <el-icon><Printer /></el-icon>打印选中
                    </el-dropdown-item>
                    <el-dropdown-item command="message" divided>
                      <el-icon><Message /></el-icon>发送通知
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" :disabled="selectedResidents.length === 0">
                      <el-icon><Delete /></el-icon>删除选中
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button-group>
                <el-button
                  :type="viewMode === 'table' ? 'primary' : ''"
                  @click="viewMode = 'table'"
                >
                  <el-icon><List /></el-icon>
                </el-button>
                <el-button :type="viewMode === 'grid' ? 'primary' : ''" @click="viewMode = 'grid'">
                  <el-icon><Grid /></el-icon>
                </el-button>
              </el-button-group>
            </div>
          </div>
        </template>

        <!-- 表格视图 -->
        <el-table
          v-if="viewMode === 'table'"
          :data="residents"
          stripe
          style="width: 100%"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
          v-loading="loading"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column label="基本信息" min-width="200">
            <template #default="{ row }">
              <div class="resident-info">
                <el-avatar :size="44" :src="row.avatar">
                  {{ row.name.charAt(0) }}
                </el-avatar>
                <div class="info-content">
                  <div class="info-name">
                    {{ row.name }}
                    <el-tag v-if="row.isKeyPerson" type="danger" size="small">重点人员</el-tag>
                  </div>
                  <div class="info-meta">
                    <el-tag :type="row.gender === '男' ? 'primary' : 'danger'" size="small">
                      {{ row.gender }}
                    </el-tag>
                    <span class="age">{{ calculateAge(row.idCard) }}岁</span>
                    <span class="id-card">{{ maskIdCard(row.idCard) }}</span>
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="联系方式" min-width="150">
            <template #default="{ row }">
              <div class="contact-info">
                <div class="phone">
                  <el-icon><Phone /></el-icon>
                  {{ row.phone }}
                </div>
                <div class="address">{{ row.address }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="户号信息" min-width="140">
            <template #default="{ row }">
              <div class="household-info">
                <div class="household-code">{{ row.householdCode }}</div>
                <el-tag :type="getHouseholdTypeColor(row.householdType)" size="small">
                  {{ row.householdType }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="特殊标记" min-width="160">
            <template #default="{ row }">
              <div class="special-tags">
                <el-tag v-if="row.isLowIncome" type="warning" size="small">低保</el-tag>
                <el-tag v-if="row.isDisabled" type="info" size="small">残疾</el-tag>
                <el-tag v-if="row.isElderly" type="danger" size="small">独居</el-tag>
                <el-tag v-if="row.isPartyMember" type="success" size="small">党员</el-tag>
                <el-tag v-if="row.isCadre" size="small">干部</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button type="primary" size="small" @click="viewDetail(row)">详情</el-button>
                <el-button size="small" @click="editResident(row)">编辑</el-button>
                <el-dropdown @command="command => handleRowCommand(command, row)" trigger="click">
                  <el-button size="small">
                    更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="family">
                        <el-icon><HomeFilled /></el-icon>家庭成员
                      </el-dropdown-item>
                      <el-dropdown-item command="service">
                        <el-icon><Service /></el-icon>服务记录
                      </el-dropdown-item>
                      <el-dropdown-item command="qrcode">
                        <el-icon><Grid /></el-icon>户码管理
                      </el-dropdown-item>
                      <el-dropdown-item command="history">
                        <el-icon><Clock /></el-icon>变更历史
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" divided>
                        <el-icon><Delete /></el-icon>删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 网格视图 -->
        <div v-else class="grid-view">
          <el-row :gutter="20">
            <el-col
              :xs="24"
              :sm="12"
              :md="8"
              :lg="6"
              v-for="resident in residents"
              :key="resident.id"
            >
              <el-card class="resident-card" shadow="hover" @click="viewDetail(resident)">
                <div class="card-header">
                  <el-avatar :size="56" :src="resident.avatar">
                    {{ resident.name.charAt(0) }}
                  </el-avatar>
                  <div class="card-info">
                    <h3>{{ resident.name }}</h3>
                    <p>{{ resident.phone }}</p>
                  </div>
                </div>
                <div class="card-body">
                  <div class="info-row">
                    <span class="label">身份证:</span>
                    <span class="value">{{ maskIdCard(resident.idCard) }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">年龄:</span>
                    <span class="value">{{ calculateAge(resident.idCard) }}岁</span>
                  </div>
                  <div class="info-row">
                    <span class="label">户号:</span>
                    <span class="value">{{ resident.householdCode }}</span>
                  </div>
                </div>
                <div class="card-footer">
                  <el-tag :type="getHouseholdTypeColor(resident.householdType)" size="small">
                    {{ resident.householdType }}
                  </el-tag>
                  <el-tag :type="getStatusType(resident.status)" size="small">
                    {{ getStatusLabel(resident.status) }}
                  </el-tag>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>
    </section>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="showDetailDrawer"
      :title="`村民详情 - ${selectedResident?.name}`"
      size="600px"
      destroy-on-close
    >
      <div class="detail-content" v-if="selectedResident">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ selectedResident.name }}</el-descriptions-item>
          <el-descriptions-item label="性别">
            <el-tag :type="selectedResident.gender === '男' ? 'primary' : 'danger'" size="small">
              {{ selectedResident.gender }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="身份证号">{{
            selectedResident.idCard
          }}</el-descriptions-item>
          <el-descriptions-item label="年龄"
            >{{ calculateAge(selectedResident.idCard) }}岁</el-descriptions-item
          >
          <el-descriptions-item label="手机号">{{ selectedResident.phone }}</el-descriptions-item>
          <el-descriptions-item label="家庭住址">{{
            selectedResident.address
          }}</el-descriptions-item>
          <el-descriptions-item label="户号">{{
            selectedResident.householdCode
          }}</el-descriptions-item>
          <el-descriptions-item label="家庭类型">
            <el-tag :type="getHouseholdTypeColor(selectedResident.householdType)" size="small">
              {{ selectedResident.householdType }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="政治面貌">{{
            selectedResident.politicalStatus || '-'
          }}</el-descriptions-item>
          <el-descriptions-item label="教育程度">{{
            selectedResident.education || '-'
          }}</el-descriptions-item>
        </el-descriptions>

        <div class="special-section">
          <h4>特殊标记</h4>
          <div class="tags">
            <el-tag v-if="selectedResident.isLowIncome" type="warning">低保户</el-tag>
            <el-tag v-if="selectedResident.isDisabled" type="info">残疾人</el-tag>
            <el-tag v-if="selectedResident.isElderly" type="danger">独居老人</el-tag>
            <el-tag v-if="selectedResident.isPartyMember" type="success">中共党员</el-tag>
            <el-tag v-if="selectedResident.isCadre" type="primary">村干部</el-tag>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDetailDrawer = false">关闭</el-button>
        <el-button type="primary" @click="editResident(selectedResident)">编辑信息</el-button>
      </template>
    </el-drawer>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="showEditDialog"
      :title="isEditing ? '编辑村民信息' : '添加村民'"
      width="800px"
      destroy-on-close
    >
      <el-form :model="residentForm" :rules="formRules" ref="formRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="residentForm.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="residentForm.gender">
                <el-radio label="男">男</el-radio>
                <el-radio label="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="身份证号" prop="idCard">
              <el-input v-model="residentForm.idCard" placeholder="请输入身份证号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="residentForm.phone" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="家庭住址" prop="address">
          <el-input v-model="residentForm.address" placeholder="请输入家庭住址" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="户号" prop="householdCode">
              <el-input v-model="residentForm.householdCode" placeholder="户号" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="家庭类型" prop="householdType">
              <el-select v-model="residentForm.householdType" placeholder="请选择">
                <el-option label="普通户" value="普通户" />
                <el-option label="低保户" value="低保户" />
                <el-option label="残疾户" value="残疾户" />
                <el-option label="军人家庭" value="军人家庭" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="与户主关系">
              <el-select v-model="residentForm.relation" placeholder="请选择">
                <el-option label="户主" value="户主" />
                <el-option label="配偶" value="配偶" />
                <el-option label="子女" value="子女" />
                <el-option label="父母" value="父母" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="政治面貌">
              <el-select v-model="residentForm.politicalStatus" placeholder="请选择" clearable>
                <el-option label="群众" value="群众" />
                <el-option label="共青团员" value="共青团员" />
                <el-option label="中共党员" value="中共党员" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="教育程度">
              <el-select v-model="residentForm.education" placeholder="请选择" clearable>
                <el-option label="小学及以下" value="小学及以下" />
                <el-option label="初中" value="初中" />
                <el-option label="高中" value="高中" />
                <el-option label="大专" value="大专" />
                <el-option label="本科及以上" value="本科及以上" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态">
              <el-select v-model="residentForm.status" placeholder="请选择">
                <el-option label="正常" value="active" />
                <el-option label="迁出" value="moved" />
                <el-option label="死亡" value="deceased" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="saveResident" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import {
  Plus,
  Upload,
  Download,
  Search,
  Refresh,
  Filter,
  ArrowDown,
  List,
  Grid,
  Phone,
  HomeFilled,
  Service,
  Clock,
  Delete,
  Printer,
  Message,
} from '@element-plus/icons-vue';
import * as residentApi from '@/api/resident';

interface SearchParams {
  keyword: string;
  householdType: string;
  ageGroup: string;
  status: string;
  gender: string;
  education: string;
  politicalStatus: string;
  specialGroup: string;
}

interface Pagination {
  currentPage: number;
  pageSize: number;
  total: number;
}

interface Resident {
  id: string;
  name: string;
  gender: string;
  idCard: string;
  phone: string;
  address: string;
  householdCode: string;
  householdType: string;
  relation: string;
  education: string;
  politicalStatus: string;
  status: string;
  avatar: string;
  isLowIncome: boolean;
  isDisabled: boolean;
  isElderly: boolean;
  isPartyMember: boolean;
  isCadre: boolean;
  isKeyPerson: boolean;
}

const userStore = useUserStore();
const formRef = ref<FormInstance | null>(null);

const loading = ref(false);
const saving = ref(false);
const viewMode = ref<'table' | 'grid'>('table');
const showAdvancedFilter = ref(false);
const showDetailDrawer = ref(false);
const showEditDialog = ref(false);
const isEditing = ref(false);
const selectedResident = ref<Resident | null>(null);
const selectedResidents = ref<Resident[]>([]);

const searchParams = reactive<SearchParams>({
  keyword: '',
  householdType: '',
  ageGroup: '',
  status: '',
  gender: '',
  education: '',
  politicalStatus: '',
  specialGroup: '',
});

const pagination = reactive<Pagination>({
  currentPage: 1,
  pageSize: 20,
  total: 0,
});

const residents = ref<Resident[]>([]);

const statistics = ref([
  {
    key: 'total',
    label: '总人口',
    value: 0,
    icon: 'User',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    key: 'households',
    label: '总户数',
    value: 0,
    icon: 'HomeFilled',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    key: 'lowIncome',
    label: '低保户',
    value: 0,
    icon: 'Wallet',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  {
    key: 'elderly',
    label: '独居老人',
    value: 0,
    icon: 'UserFilled',
    gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  },
  {
    key: 'party',
    label: '党员',
    value: 0,
    icon: 'Flag',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  },
]);

const residentForm = reactive<Partial<Resident>>({
  name: '',
  gender: '男',
  idCard: '',
  phone: '',
  address: '',
  householdCode: '',
  householdType: '普通户',
  relation: '户主',
  education: '',
  politicalStatus: '',
  status: 'active',
});

const formRules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dX]$/, message: '请输入正确的身份证号', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  address: [{ required: true, message: '请输入家庭住址', trigger: 'blur' }],
  householdCode: [{ required: true, message: '请输入户号', trigger: 'blur' }],
};

const calculateAge = (idCard: string): number => {
  if (!idCard) return 0;
  const birth = idCard.substring(6, 14);
  const year = parseInt(birth.substring(0, 4));
  const now = new Date();
  let age = now.getFullYear() - year;
  if (
    now.getMonth() + 1 < parseInt(birth.substring(4, 6)) ||
    (now.getMonth() + 1 === parseInt(birth.substring(4, 6)) &&
      now.getDate() < parseInt(birth.substring(6, 8)))
  ) {
    age--;
  }
  return age;
};

const maskIdCard = (idCard: string): string => {
  if (!idCard) return '';
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
};

const getHouseholdTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    普通户: '',
    低保户: 'warning',
    残疾户: 'info',
    军人家庭: 'primary',
  };
  return colorMap[type] || '';
};

const getStatusType = (status: string): string => {
  const typeMap: Record<string, string> = {
    active: 'success',
    moved: 'warning',
    deceased: 'info',
  };
  return typeMap[status] || '';
};

const getStatusLabel = (status: string): string => {
  const labelMap: Record<string, string> = {
    active: '正常',
    moved: '迁出',
    deceased: '死亡',
  };
  return labelMap[status] || status;
};

const fetchResidents = async () => {
  loading.value = true;
  try {
    const response = await residentApi.getResidents({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      ...searchParams,
    });
    if (response.success) {
      residents.value = response.data.items;
      pagination.total = response.data.total;
    }
  } catch (error) {
    console.error('获取村民数据失败:', error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.currentPage = 1;
  fetchResidents();
};

const resetFilters = () => {
  Object.keys(searchParams).forEach(key => {
    searchParams[key as keyof SearchParams] = '';
  });
  handleSearch();
};

const handleSelectionChange = (selection: Resident[]) => {
  selectedResidents.value = selection;
};

const handleSortChange = ({ prop, order }: { prop: string; order: string }) => {
  console.log('排序字段:', prop, '排序方式:', order);
};

const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
  fetchResidents();
};

const handlePageChange = (page: number) => {
  pagination.currentPage = page;
  fetchResidents();
};

const handleBatchCommand = (command: string) => {
  switch (command) {
    case 'export':
      ElMessage.info('导出选中数据');
      break;
    case 'print':
      ElMessage.info('打印选中数据');
      break;
    case 'message':
      ElMessage.info('发送通知');
      break;
    case 'delete':
      handleBatchDelete();
      break;
  }
};

const handleRowCommand = (command: string, row: Resident) => {
  switch (command) {
    case 'family':
      ElMessage.info(`查看 ${row.name} 的家庭成员`);
      break;
    case 'service':
      ElMessage.info(`查看 ${row.name} 的服务记录`);
      break;
    case 'qrcode':
      ElMessage.info(`管理 ${row.name} 的户码`);
      break;
    case 'history':
      ElMessage.info(`查看 ${row.name} 的变更历史`);
      break;
    case 'delete':
      deleteResident(row);
      break;
  }
};

const showAddDialog = () => {
  isEditing.value = false;
  resetForm();
  showEditDialog.value = true;
};

const showImportDialog = () => {
  ElMessage.info('批量导入功能开发中');
};

const viewDetail = (resident: Resident) => {
  selectedResident.value = resident;
  showDetailDrawer.value = true;
};

const editResident = (resident: Resident | null) => {
  if (!resident) return;
  isEditing.value = true;
  Object.assign(residentForm, resident);
  showDetailDrawer.value = false;
  showEditDialog.value = true;
};

const handleExport = () => {
  ElMessage.info('导出数据功能开发中');
};

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedResidents.value.length} 位村民吗？`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    ElMessage.success('批量删除功能开发中');
  } catch {}
};

const deleteResident = async (resident: Resident) => {
  try {
    await ElMessageBox.confirm(`确定要删除村民 ${resident.name} 吗？`, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    ElMessage.success('删除功能开发中');
  } catch {}
};

const resetForm = () => {
  Object.assign(residentForm, {
    name: '',
    gender: '男',
    idCard: '',
    phone: '',
    address: '',
    householdCode: '',
    householdType: '普通户',
    relation: '户主',
    education: '',
    politicalStatus: '',
    status: 'active',
  });
};

const saveResident = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    saving.value = true;
    ElMessage.success(isEditing.value ? '更新成功' : '添加成功');
    showEditDialog.value = false;
    fetchResidents();
  } catch {
    console.error('表单验证失败');
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  fetchResidents();
});
</script>

<style lang="scss" scoped>
.pc-resident-management {
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

.overview-section {
  margin-bottom: 24px;
}

.overview-card {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;

  .card-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-info {
    .card-value {
      font-size: 28px;
      font-weight: 600;
      color: #303133;
    }

    .card-label {
      font-size: 13px;
      color: #909399;
    }
  }
}

.filter-section {
  margin-bottom: 24px;

  .filter-content {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    align-items: center;
  }

  .search-area {
    flex: 1;
    min-width: 280px;

    .search-input {
      width: 100%;
    }
  }

  .filter-area {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}

.advanced-filter {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.table-section {
  .table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .table-title {
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }

    .table-actions {
      display: flex;
      align-items: center;
      gap: 16px;

      .total-count {
        font-size: 14px;
        color: #909399;
      }
    }
  }
}

.resident-info {
  display: flex;
  align-items: center;
  gap: 12px;

  .info-content {
    .info-name {
      font-weight: 500;
      color: #303133;
      margin-bottom: 4px;
    }

    .info-meta {
      display: flex;
      align-items: center;
      gap: 8px;

      .age {
        font-size: 13px;
        color: #606266;
      }

      .id-card {
        font-size: 12px;
        color: #909399;
      }
    }
  }
}

.contact-info {
  .phone {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #303133;
    margin-bottom: 4px;
  }

  .address {
    font-size: 13px;
    color: #606266;
  }
}

.household-info {
  .household-code {
    font-weight: 500;
    color: #303133;
    margin-bottom: 4px;
  }
}

.special-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.grid-view {
  .resident-card {
    margin-bottom: 20px;
    cursor: pointer;
    transition:
      transform 0.3s,
      box-shadow 0.3s;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;

      h3 {
        margin: 0 0 4px;
        font-size: 16px;
        font-weight: 500;
        color: #303133;
      }

      p {
        margin: 0;
        font-size: 13px;
        color: #909399;
      }
    }

    .card-body {
      margin-bottom: 16px;

      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #ebeef5;

        &:last-child {
          border-bottom: none;
        }

        .label {
          color: #909399;
        }

        .value {
          color: #303133;
        }
      }
    }

    .card-footer {
      display: flex;
      gap: 8px;
    }
  }
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.detail-content {
  .special-section {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #ebeef5;

    h4 {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .filter-content {
    flex-direction: column;
  }

  .filter-area {
    width: 100%;
  }
}
</style>
