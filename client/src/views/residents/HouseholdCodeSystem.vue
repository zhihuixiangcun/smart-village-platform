<template>
  <div class="household-code-system">
    <!-- 一户一码管理主界面 -->
    <div class="household-manager">
      <div class="manager-header">
        <div class="header-left">
          <h2>
            <el-icon><QrCode /></el-icon>
            一户一码管理系统
          </h2>
          <p>智能生成 • 便民服务 • 信息透明 • 数据安全</p>
        </div>
        <div class="header-right">
          <el-button @click="showBatchGenerator = true" icon="Plus" type="primary">
            批量生成户码
          </el-button>
          <el-button @click="exportAllCodes" icon="Download" type="success">
            导出所有户码
          </el-button>
          <el-button @click="showCodeScanner = true" icon="Search">
            扫码查询
          </el-button>
          <el-button @click="showStatistics = true" icon="TrendCharts">
            使用统计
          </el-button>
        </div>
      </div>

      <!-- 搜索过滤区域 -->
      <div class="search-area">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="户码查询">
            <el-input
              v-model="searchForm.householdCode"
              placeholder="输入户码或扫码查询"
              clearable
              style="width: 200px;"
            >
              <template #append>
                <el-button @click="scanCode" icon="QrCode">扫码</el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="户主姓名">
            <el-input v-model="searchForm.householderName" placeholder="户主姓名" clearable />
          </el-form-item>
          <el-form-item label="生成状态">
            <el-select v-model="searchForm.status" placeholder="全部" clearable>
              <el-option label="已生成" value="generated" />
              <el-option label="未生成" value="not_generated" />
              <el-option label="已激活" value="activated" />
              <el-option label="已停用" value="disabled" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button @click="searchHouseholds" type="primary" icon="Search">搜索</el-button>
            <el-button @click="resetSearch" icon="Refresh">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 数据统计面板 -->
      <div class="stats-panel">
        <el-row :gutter="20">
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-icon total">
                <el-icon size="32"><House /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats.totalHouseholds }}</div>
                <div class="stat-label">总户数</div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-icon generated">
                <el-icon size="32"><QrCode /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats.generatedCodes }}</div>
                <div class="stat-label">已生成户码</div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-icon activated">
                <el-icon size="32"><CircleCheck /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats.activatedCodes }}</div>
                <div class="stat-label">已激活</div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-icon scan-count">
                <el-icon size="32"><View /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats.totalScans }}</div>
                <div class="stat-label">总扫码次数</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 户码数据表格 -->
      <div class="household-table">
        <el-table
          :data="households"
          v-loading="loading"
          @selection-change="handleSelectionChange"
          row-key="id"
          stripe
        >
          <el-table-column type="selection" width="55" />

          <el-table-column prop="householdCode" label="户码" width="180">
            <template #default="scope">
              <div class="household-code-cell">
                <el-tag v-if="scope.row.householdCode" type="primary" size="small">
                  {{ scope.row.householdCode }}
                </el-tag>
                <el-tag v-else type="warning" size="small">未生成</el-tag>
                <el-button
                  v-if="scope.row.householdCode"
                  @click="showQrCode(scope.row)"
                  text
                  size="small"
                  icon="QrCode"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="householderName" label="户主姓名" width="120" />

          <el-table-column prop="memberCount" label="家庭人数" width="100">
            <template #default="scope">
              <el-tag type="info" size="small">{{ scope.row.memberCount }}人</el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />

          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag
                :type="getStatusTagType(scope.row.status)"
                size="small"
              >
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="scanCount" label="扫码次数" width="100" />

          <el-table-column prop="lastScanTime" label="最近扫码" width="150">
            <template #default="scope">
              <span v-if="scope.row.lastScanTime">
                {{ formatDateTime(scope.row.lastScanTime) }}
              </span>
              <span v-else class="text-muted">未扫码</span>
            </template>
          </el-table-column>

          <el-table-column prop="createdAt" label="生成时间" width="150">
            <template #default="scope">
              {{ formatDateTime(scope.row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right">
            <template #default="scope">
              <el-space>
                <el-button
                  v-if="!scope.row.householdCode"
                  @click="generateHouseholdCode(scope.row)"
                  type="primary"
                  size="small"
                  icon="Plus"
                >
                  生成户码
                </el-button>

                <el-button
                  v-if="scope.row.householdCode"
                  @click="viewHouseholdDetails(scope.row)"
                  type="info"
                  size="small"
                  icon="View"
                >
                  查看
                </el-button>

                <el-dropdown @command="(command) => handleRowAction(command, scope.row)">
                  <el-button size="small" icon="MoreFilled" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item v-if="scope.row.householdCode" command="print" icon="Printer">
                        打印户码
                      </el-dropdown-item>
                      <el-dropdown-item v-if="scope.row.householdCode" command="download" icon="Download">
                        下载户码
                      </el-dropdown-item>
                      <el-dropdown-item command="history" icon="Clock">
                        扫码记录
                      </el-dropdown-item>
                      <el-dropdown-item command="edit" icon="Edit">
                        编辑信息
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="scope.row.householdCode && scope.row.status === 'activated'"
                        command="disable"
                        icon="CircleClose"
                        divided
                      >
                        停用户码
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="scope.row.householdCode && scope.row.status === 'disabled'"
                        command="enable"
                        icon="CircleCheck"
                      >
                        启用户码
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" icon="Delete" divided>
                        删除户码
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </el-space>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :total="pagination.total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="loadHouseholds"
            @size-change="loadHouseholds"
          />
        </div>
      </div>
    </div>

    <!-- 二维码显示对话框 -->
    <el-dialog
      v-model="showQrDialog"
      title="户码二维码"
      width="500px"
      center
      class="qr-dialog"
    >
      <div v-if="currentHousehold" class="qr-content">
        <div class="qr-code-container">
          <div ref="qrCodeRef" class="qr-code"></div>
        </div>

        <div class="household-info">
          <h3>{{ currentHousehold.householderName }}户</h3>
          <p><strong>户码：</strong>{{ currentHousehold.householdCode }}</p>
          <p><strong>地址：</strong>{{ currentHousehold.address }}</p>
          <p><strong>家庭人数：</strong>{{ currentHousehold.memberCount }}人</p>
          <p><strong>生成时间：</strong>{{ formatDateTime(currentHousehold.createdAt) }}</p>
        </div>

        <div class="qr-actions">
          <el-button @click="downloadQrCode" type="primary" icon="Download">
            下载二维码
          </el-button>
          <el-button @click="printQrCode" icon="Printer">
            打印二维码
          </el-button>
          <el-button @click="shareQrCode" icon="Share">
            分享户码
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 户码详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="户码详细信息"
      width="800px"
      class="detail-dialog"
    >
      <div v-if="currentHousehold" class="household-detail">
        <el-tabs v-model="activeDetailTab">
          <!-- 基本信息 -->
          <el-tab-pane label="基本信息" name="basic">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="户码">
                <el-tag type="primary">{{ currentHousehold.householdCode }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="户主姓名">
                {{ currentHousehold.householderName }}
              </el-descriptions-item>
              <el-descriptions-item label="家庭人数">
                <el-tag type="info">{{ currentHousehold.memberCount }}人</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="getStatusTagType(currentHousehold.status)">
                  {{ getStatusText(currentHousehold.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="居住地址" :span="2">
                {{ currentHousehold.address }}
              </el-descriptions-item>
              <el-descriptions-item label="联系电话">
                {{ currentHousehold.phone || '未填写' }}
              </el-descriptions-item>
              <el-descriptions-item label="房屋性质">
                {{ getHouseTypeText(currentHousehold.houseType) }}
              </el-descriptions-item>
              <el-descriptions-item label="生成时间">
                {{ formatDateTime(currentHousehold.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="最近更新">
                {{ formatDateTime(currentHousehold.updatedAt) }}
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- 家庭成员 -->
          <el-tab-pane label="家庭成员" name="members">
            <div class="members-list">
              <div class="members-header">
                <h4>家庭成员列表 ({{ householdMembers.length }}人)</h4>
                <el-button @click="addFamilyMember" type="primary" size="small" icon="Plus">
                  添加成员
                </el-button>
              </div>

              <el-table :data="householdMembers" border size="small">
                <el-table-column prop="name" label="姓名" />
                <el-table-column prop="gender" label="性别">
                  <template #default="scope">
                    <el-tag :type="scope.row.gender === 'male' ? 'primary' : 'danger'" size="small">
                      {{ scope.row.gender === 'male' ? '男' : '女' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="age" label="年龄" />
                <el-table-column prop="relationship" label="与户主关系" />
                <el-table-column prop="idCard" label="身份证号">
                  <template #default="scope">
                    <span>{{ maskIdCard(scope.row.idCard) }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="120">
                  <template #default="scope">
                    <el-button @click="editMember(scope.row)" type="primary" size="small">编辑</el-button>
                    <el-button @click="removeMember(scope.row)" type="danger" size="small">移除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <!-- 使用记录 -->
          <el-tab-pane label="使用记录" name="usage">
            <div class="usage-records">
              <div class="usage-stats">
                <el-row :gutter="20">
                  <el-col :span="8">
                    <el-statistic title="总扫码次数" :value="currentHousehold.scanCount || 0" />
                  </el-col>
                  <el-col :span="8">
                    <el-statistic title="本月扫码" :value="getCurrentMonthScans()" />
                  </el-col>
                  <el-col :span="8">
                    <el-statistic title="最近扫码" :value="getLastScanDays()" suffix="天前" />
                  </el-col>
                </el-row>
              </div>

              <div class="scan-history">
                <h4>扫码记录</h4>
                <el-table :data="scanHistory" size="small">
                  <el-table-column prop="scanTime" label="扫码时间" width="150">
                    <template #default="scope">
                      {{ formatDateTime(scope.row.scanTime) }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="scanUser" label="扫码人" />
                  <el-table-column prop="scanLocation" label="扫码地点" />
                  <el-table-column prop="scanPurpose" label="扫码目的" />
                  <el-table-column prop="scanDevice" label="设备信息" />
                </el-table>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>

    <!-- 批量生成对话框 -->
    <el-dialog
      v-model="showBatchGenerator"
      title="批量生成户码"
      width="600px"
    >
      <div class="batch-generator">
        <el-form :model="batchForm" label-width="120px">
          <el-form-item label="生成方式">
            <el-radio-group v-model="batchForm.method">
              <el-radio label="all">为所有未生成户码的户生成</el-radio>
              <el-radio label="selected">为选中的户生成</el-radio>
              <el-radio label="condition">按条件生成</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="batchForm.method === 'condition'" label="生成条件">
            <el-checkbox-group v-model="batchForm.conditions">
              <el-checkbox label="has_members">有家庭成员的户</el-checkbox>
              <el-checkbox label="has_phone">有联系电话的户</el-checkbox>
              <el-checkbox label="complete_address">地址信息完整的户</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="户码格式">
            <el-select v-model="batchForm.format" style="width: 200px">
              <el-option label="数字码 (8位)" value="numeric_8" />
              <el-option label="数字码 (12位)" value="numeric_12" />
              <el-option label="字母数字混合" value="alphanumeric" />
              <el-option label="自定义格式" value="custom" />
            </el-select>
          </el-form-item>

          <el-form-item v-if="batchForm.format === 'custom'" label="自定义格式">
            <el-input
              v-model="batchForm.customFormat"
              placeholder="例如：HH{YYYY}{MM}{DD}{NNNN}"
            />
            <div class="format-help">
              <small>
                格式说明：{YYYY}年份，{MM}月份，{DD}日期，{NNNN}序号，{X}随机字母，{9}随机数字
              </small>
            </div>
          </el-form-item>

          <el-form-item label="生成数量预览">
            <el-tag type="info">预计生成 {{ getEstimatedCount() }} 个户码</el-tag>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="showBatchGenerator = false">取消</el-button>
        <el-button @click="executeBatchGeneration" type="primary" :loading="generating">
          开始生成
        </el-button>
      </template>
    </el-dialog>

    <!-- 使用统计对话框 -->
    <el-dialog
      v-model="showStatistics"
      title="使用统计分析"
      width="900px"
    >
      <div class="statistics-content">
        <div class="stats-overview">
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="overview-card">
                <div class="card-header">总体概况</div>
                <div class="card-content">
                  <div class="big-number">{{ stats.totalHouseholds }}</div>
                  <div class="label">总户数</div>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="overview-card">
                <div class="card-header">生成率</div>
                <div class="card-content">
                  <div class="big-number">{{ getGenerationRate() }}%</div>
                  <div class="label">户码生成率</div>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="overview-card">
                <div class="card-header">激活率</div>
                <div class="card-content">
                  <div class="big-number">{{ getActivationRate() }}%</div>
                  <div class="label">户码激活率</div>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="overview-card">
                <div class="card-header">使用率</div>
                <div class="card-content">
                  <div class="big-number">{{ getUsageRate() }}%</div>
                  <div class="label">户码使用率</div>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>

        <div class="charts-section">
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="chart-container">
                <h4>月度扫码趋势</h4>
                <div ref="monthlyTrendRef" class="chart"></div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="chart-container">
                <h4>扫码目的分布</h4>
                <div ref="purposeDistributionRef" class="chart"></div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  QrCode, House, CircleCheck, View, Plus, Download, Search,
  TrendCharts, Printer, Edit, Delete, MoreFilled, Share,
  CircleClose, Clock, Refresh
} from '@element-plus/icons-vue'
import QRCode from 'qrcode'
import * as echarts from 'echarts'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue'])

// 响应式数据
const loading = ref(false)
const generating = ref(false)
const showQrDialog = ref(false)
const showDetailDialog = ref(false)
const showBatchGenerator = ref(false)
const showStatistics = ref(false)
const showCodeScanner = ref(false)
const activeDetailTab = ref('basic')

const qrCodeRef = ref()
const monthlyTrendRef = ref()
const purposeDistributionRef = ref()

// 搜索表单
const searchForm = reactive({
  householdCode: '',
  householderName: '',
  status: ''
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 批量生成表单
const batchForm = reactive({
  method: 'all',
  conditions: [],
  format: 'numeric_8',
  customFormat: 'HH{YYYY}{MM}{DD}{NNNN}'
})

// 户码数据
const households = ref([])
const selectedHouseholds = ref([])
const currentHousehold = ref(null)
const householdMembers = ref([])
const scanHistory = ref([])

// 统计数据
const stats = reactive({
  totalHouseholds: 0,
  generatedCodes: 0,
  activatedCodes: 0,
  totalScans: 0
})

// 计算属性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 方法
const loadHouseholds = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 模拟数据
    households.value = [
      {
        id: 1,
        householdCode: 'HH20250101001',
        householderName: '张三',
        memberCount: 4,
        address: '新村路123号',
        status: 'activated',
        scanCount: 15,
        lastScanTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        phone: '13800138001',
        houseType: 'owned'
      },
      {
        id: 2,
        householdCode: 'HH20250101002',
        householderName: '李四',
        memberCount: 3,
        address: '新村路124号',
        status: 'generated',
        scanCount: 0,
        lastScanTime: null,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        phone: '13800138002',
        houseType: 'rented'
      },
      {
        id: 3,
        householdCode: null,
        householderName: '王五',
        memberCount: 2,
        address: '新村路125号',
        status: 'not_generated',
        scanCount: 0,
        lastScanTime: null,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        phone: null,
        houseType: 'owned'
      }
    ]

    pagination.total = 50

    // 更新统计数据
    updateStats()

  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const updateStats = () => {
  stats.totalHouseholds = 50
  stats.generatedCodes = 35
  stats.activatedCodes = 28
  stats.totalScans = 156
}

const searchHouseholds = () => {
  console.log('搜索户码:', searchForm)
  loadHouseholds()
}

const resetSearch = () => {
  Object.assign(searchForm, {
    householdCode: '',
    householderName: '',
    status: ''
  })
  loadHouseholds()
}

const generateHouseholdCode = async (household) => {
  try {
    const newCode = generateCode()

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))

    household.householdCode = newCode
    household.status = 'generated'
    household.updatedAt = new Date()

    ElMessage.success(`户码生成成功: ${newCode}`)
    updateStats()
  } catch (error) {
    ElMessage.error('户码生成失败')
  }
}

const generateCode = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')

  return `HH${year}${month}${day}${random}`
}

const showQrCode = async (household) => {
  currentHousehold.value = household
  showQrDialog.value = true

  await nextTick()
  await generateQRCode(household.householdCode)
}

const generateQRCode = async (code) => {
  try {
    const canvas = await QRCode.toCanvas(qrCodeRef.value, code, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  } catch (error) {
    console.error('生成二维码失败:', error)
  }
}

const viewHouseholdDetails = (household) => {
  currentHousehold.value = household
  showDetailDialog.value = true

  // 加载家庭成员数据
  loadHouseholdMembers(household.id)
  // 加载扫码记录
  loadScanHistory(household.id)
}

const loadHouseholdMembers = (householdId) => {
  // 模拟家庭成员数据
  householdMembers.value = [
    { id: 1, name: '张三', gender: 'male', age: 45, relationship: '户主', idCard: '320123197812345678' },
    { id: 2, name: '李梅', gender: 'female', age: 42, relationship: '配偶', idCard: '320123198012345678' },
    { id: 3, name: '张小明', gender: 'male', age: 18, relationship: '子女', idCard: '320123200512345678' },
    { id: 4, name: '张小红', gender: 'female', age: 15, relationship: '子女', idCard: '320123200812345678' }
  ]
}

const loadScanHistory = (householdId) => {
  // 模拟扫码记录
  scanHistory.value = [
    {
      scanTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      scanUser: '村委工作人员',
      scanLocation: '村委会服务大厅',
      scanPurpose: '证明开具',
      scanDevice: 'Android Phone'
    },
    {
      scanTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      scanUser: '快递员',
      scanLocation: '门口',
      scanPurpose: '包裹投递',
      scanDevice: 'iPhone'
    }
  ]
}

const handleSelectionChange = (selection) => {
  selectedHouseholds.value = selection
}

const handleRowAction = async (command, household) => {
  switch (command) {
    case 'print':
      printQrCode(household)
      break
    case 'download':
      downloadQrCode(household)
      break
    case 'history':
      viewScanHistory(household)
      break
    case 'edit':
      editHousehold(household)
      break
    case 'disable':
      await toggleHouseholdStatus(household, 'disabled')
      break
    case 'enable':
      await toggleHouseholdStatus(household, 'activated')
      break
    case 'delete':
      await deleteHousehold(household)
      break
  }
}

const toggleHouseholdStatus = async (household, newStatus) => {
  try {
    await ElMessageBox.confirm(
      `确定要${newStatus === 'disabled' ? '停用' : '启用'}该户码吗？`,
      '状态变更确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    household.status = newStatus
    household.updatedAt = new Date()

    ElMessage.success(`户码已${newStatus === 'disabled' ? '停用' : '启用'}`)
    updateStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('状态变更失败')
    }
  }
}

const deleteHousehold = async (household) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除户码 ${household.householdCode} 吗？删除后无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error'
      }
    )

    const index = households.value.findIndex(h => h.id === household.id)
    if (index > -1) {
      households.value.splice(index, 1)
    }

    ElMessage.success('户码删除成功')
    updateStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const executeBatchGeneration = async () => {
  generating.value = true
  try {
    const count = getEstimatedCount()

    // 模拟批量生成
    await new Promise(resolve => setTimeout(resolve, 2000))

    ElMessage.success(`批量生成完成，共生成 ${count} 个户码`)
    showBatchGenerator.value = false
    loadHouseholds()
  } catch (error) {
    ElMessage.error('批量生成失败')
  } finally {
    generating.value = false
  }
}

const getEstimatedCount = () => {
  if (batchForm.method === 'all') {
    return stats.totalHouseholds - stats.generatedCodes
  } else if (batchForm.method === 'selected') {
    return selectedHouseholds.value.filter(h => !h.householdCode).length
  }
  return 0
}

const downloadQrCode = (household = currentHousehold.value) => {
  if (!household) return

  try {
    const canvas = qrCodeRef.value
    const link = document.createElement('a')
    link.download = `户码_${household.householderName}_${household.householdCode}.png`
    link.href = canvas.toDataURL()
    link.click()

    ElMessage.success('二维码下载成功')
  } catch (error) {
    ElMessage.error('下载失败')
  }
}

const printQrCode = (household = currentHousehold.value) => {
  if (!household) return

  const printWindow = window.open('', '_blank')
  const canvas = qrCodeRef.value

  printWindow.document.write(`
    <html>
      <head>
        <title>户码打印 - ${household.householderName}户</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
          }
          .qr-print-container {
            border: 1px solid #ddd;
            padding: 20px;
            display: inline-block;
            margin: 20px;
          }
          .household-info {
            margin-top: 15px;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <div class="qr-print-container">
          <h2>${household.householderName}户</h2>
          <img src="${canvas.toDataURL()}" alt="户码二维码" />
          <div class="household-info">
            <p><strong>户码：</strong>${household.householdCode}</p>
            <p><strong>地址：</strong>${household.address}</p>
            <p><strong>家庭人数：</strong>${household.memberCount}人</p>
          </div>
        </div>
      </body>
    </html>
  `)

  printWindow.document.close()
  printWindow.print()
}

const shareQrCode = (household = currentHousehold.value) => {
  if (!household) return

  if (navigator.share) {
    navigator.share({
      title: `${household.householderName}户户码`,
      text: `户码：${household.householdCode}`,
      url: window.location.origin + `/household/${household.householdCode}`
    })
  } else {
    // 复制到剪贴板
    navigator.clipboard.writeText(`户码：${household.householdCode}\n地址：${household.address}`)
    ElMessage.success('户码信息已复制到剪贴板')
  }
}

const exportAllCodes = () => {
  ElMessage.info('导出功能开发中...')
}

const scanCode = () => {
  ElMessage.info('扫码功能开发中...')
}

// 工具方法
const getStatusTagType = (status) => {
  const typeMap = {
    not_generated: 'info',
    generated: 'warning',
    activated: 'success',
    disabled: 'danger'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    not_generated: '未生成',
    generated: '已生成',
    activated: '已激活',
    disabled: '已停用'
  }
  return textMap[status] || '未知'
}

const getHouseTypeText = (type) => {
  const textMap = {
    owned: '自有房屋',
    rented: '租赁房屋',
    public: '公房',
    other: '其他'
  }
  return textMap[type] || '未知'
}

const maskIdCard = (idCard) => {
  if (!idCard) return ''
  return idCard.replace(/^(.{6})(.*)(.{4})$/, '$1********$3')
}

const formatDateTime = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString()
}

const getCurrentMonthScans = () => {
  // 模拟当月扫码次数
  return Math.floor(Math.random() * 20) + 5
}

const getLastScanDays = () => {
  if (!currentHousehold.value?.lastScanTime) return 0
  const days = Math.floor((Date.now() - new Date(currentHousehold.value.lastScanTime)) / (24 * 60 * 60 * 1000))
  return days
}

const getGenerationRate = () => {
  if (stats.totalHouseholds === 0) return 0
  return Math.round((stats.generatedCodes / stats.totalHouseholds) * 100)
}

const getActivationRate = () => {
  if (stats.generatedCodes === 0) return 0
  return Math.round((stats.activatedCodes / stats.generatedCodes) * 100)
}

const getUsageRate = () => {
  if (stats.activatedCodes === 0) return 0
  // 模拟使用率计算
  return Math.round(Math.random() * 30 + 60)
}

// 生命周期
onMounted(() => {
  loadHouseholds()
})
</script>

<style lang="scss" scoped>
.household-code-system {
  .household-manager {
    .manager-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      color: white;

      .header-left {
        h2 {
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 24px;
        }

        p {
          margin: 0;
          opacity: 0.9;
        }
      }

      .header-right {
        display: flex;
        gap: 12px;
      }
    }

    .search-area {
      margin-bottom: 20px;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .stats-panel {
      margin-bottom: 20px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;

          &.total { background: rgba(64, 158, 255, 0.1); color: #409eff; }
          &.generated { background: rgba(103, 194, 58, 0.1); color: #67c23a; }
          &.activated { background: rgba(230, 162, 60, 0.1); color: #e6a23c; }
          &.scan-count { background: rgba(245, 108, 108, 0.1); color: #f56c6c; }
        }

        .stat-content {
          .stat-number {
            font-size: 32px;
            font-weight: bold;
            color: #303133;
            margin-bottom: 4px;
          }

          .stat-label {
            color: #606266;
            font-size: 14px;
          }
        }
      }
    }

    .household-table {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;

      .household-code-cell {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .pagination-container {
        padding: 20px;
        display: flex;
        justify-content: center;
      }
    }
  }

  .qr-content {
    text-align: center;

    .qr-code-container {
      margin-bottom: 20px;
      display: flex;
      justify-content: center;
    }

    .household-info {
      text-align: left;
      margin-bottom: 20px;
      padding: 16px;
      background: #f5f7fa;
      border-radius: 6px;

      h3 {
        margin: 0 0 12px 0;
        color: #303133;
      }

      p {
        margin: 6px 0;
        color: #606266;
      }
    }

    .qr-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
  }

  .household-detail {
    .members-list {
      .members-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        h4 {
          margin: 0;
          color: #303133;
        }
      }
    }

    .usage-records {
      .usage-stats {
        margin-bottom: 24px;
        padding: 16px;
        background: #f5f7fa;
        border-radius: 6px;
      }

      .scan-history {
        h4 {
          margin: 0 0 16px 0;
          color: #303133;
        }
      }
    }
  }

  .batch-generator {
    .format-help {
      margin-top: 8px;
      color: #909399;
    }
  }

  .statistics-content {
    .stats-overview {
      margin-bottom: 24px;

      .overview-card {
        background: white;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        border: 1px solid #ebeef5;

        .card-header {
          color: #909399;
          font-size: 14px;
          margin-bottom: 12px;
        }

        .card-content {
          .big-number {
            font-size: 32px;
            font-weight: bold;
            color: #303133;
            margin-bottom: 4px;
          }

          .label {
            color: #606266;
            font-size: 14px;
          }
        }
      }
    }

    .charts-section {
      .chart-container {
        background: white;
        border-radius: 8px;
        padding: 20px;
        border: 1px solid #ebeef5;

        h4 {
          margin: 0 0 16px 0;
          color: #303133;
        }

        .chart {
          height: 300px;
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .household-code-system {
    .household-manager {
      .manager-header {
        flex-direction: column;
        gap: 16px;
        text-align: center;

        .header-right {
          flex-wrap: wrap;
          justify-content: center;
        }
      }
    }

    .stats-panel {
      .el-col {
        margin-bottom: 12px;
      }
    }
  }
}
</style>