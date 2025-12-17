/**
 * 智慧村庄平台 - 批量创建缺失的Vue组件
 * 解决路由配置中的组件缺失问题
 */

const fs = require('fs')
const path = require('path')

// 定义所有需要创建的组件及其路径
const components = [
  // 认证相关组件
  {
    path: 'client/src/views/auth/LoginView.vue',
    template: 'auth',
    name: 'LoginView',
    title: '用户登录'
  },
  {
    path: 'client/src/views/auth/RegisterView.vue',
    template: 'auth',
    name: 'RegisterView',
    title: '用户注册'
  },
  {
    path: 'client/src/views/auth/ForgotPasswordView.vue',
    template: 'auth',
    name: 'ForgotPasswordView',
    title: '找回密码'
  },

  // 村民管理模块
  {
    path: 'client/src/views/residents/ResidentDetailView.vue',
    template: 'resident',
    name: 'ResidentDetailView',
    title: '村民详情'
  },
  {
    path: 'client/src/views/residents/ResidentAddView.vue',
    template: 'resident',
    name: 'ResidentAddView',
    title: '添加村民'
  },
  {
    path: 'client/src/views/residents/ResidentEditView.vue',
    template: 'resident',
    name: 'ResidentEditView',
    title: '编辑村民'
  },

  // 财务管理模块
  {
    path: 'client/src/views/finance/FinanceOverviewView.vue',
    template: 'finance',
    name: 'FinanceOverviewView',
    title: '财务概览'
  },
  {
    path: 'client/src/views/finance/FinanceBudgetView.vue',
    template: 'finance',
    name: 'FinanceBudgetView',
    title: '预算管理'
  },
  {
    path: 'client/src/views/finance/FinanceExpensesView.vue',
    template: 'finance',
    name: 'FinanceExpensesView',
    title: '支出管理'
  },
  {
    path: 'client/src/views/finance/FinanceApprovalView.vue',
    template: 'finance',
    name: 'FinanceApprovalView',
    title: '审批管理'
  },
  {
    path: 'client/src/views/finance/FinanceReportsView.vue',
    template: 'finance',
    name: 'FinanceReportsView',
    title: '财务报表'
  },

  // 村务治理模块
  {
    path: 'client/src/views/affairs/AnnouncementsView.vue',
    template: 'affairs',
    name: 'AnnouncementsView',
    title: '公告管理'
  },
  {
    path: 'client/src/views/affairs/VotingView.vue',
    template: 'affairs',
    name: 'VotingView',
    title: '投票管理'
  },
  {
    path: 'client/src/views/affairs/MeetingsView.vue',
    template: 'affairs',
    name: 'MeetingsView',
    title: '会议管理'
  },

  // 生活服务模块
  {
    path: 'client/src/views/services/ApplicationsView.vue',
    template: 'services',
    name: 'ApplicationsView',
    title: '办事服务'
  },
  {
    path: 'client/src/views/services/HouseholdCodesView.vue',
    template: 'services',
    name: 'HouseholdCodesView',
    title: '一户一码'
  },

  // 采购商管理模块
  {
    path: 'client/src/views/purchasers/PurchasersView.vue',
    template: 'purchasers',
    name: 'PurchasersView',
    title: '采购商管理'
  },

  // 组件管理模块
  {
    path: 'client/components/user/UserManagement.vue',
    template: 'component',
    name: 'UserManagement',
    title: '用户管理'
  },
  {
    path: 'client/components/village/VillageAnnouncement.vue',
    template: 'component',
    name: 'VillageAnnouncement',
    title: '村务公告'
  },
  {
    path: 'client/components/finance/TransactionList.vue',
    template: 'component',
    name: 'TransactionList',
    title: '财务管理'
  },
  {
    path: 'client/components/emergency/EmergencyManagement.vue',
    template: 'component',
    name: 'EmergencyManagement',
    title: '应急管理'
  },
  {
    path: 'client/components/analytics/Dashboard.vue',
    template: 'component',
    name: 'AnalyticsDashboard',
    title: '数据分析'
  },
  {
    path: 'client/components/ecommerce/ProductManagement.vue',
    template: 'component',
    name: 'ProductManagement',
    title: '商品管理'
  },

  // 应急管理模块 (已创建EventsListView，还需要其他)
  {
    path: 'client/src/views/emergency/ReportView.vue',
    template: 'emergency',
    name: 'ReportView',
    title: '事件上报'
  },
  {
    path: 'client/src/views/emergency/ContactsView.vue',
    template: 'emergency',
    name: 'ContactsView',
    title: '应急联系人'
  },

  // 系统管理模块
  {
    path: 'client/src/views/system/UsersView.vue',
    template: 'system',
    name: 'UsersView',
    title: '用户管理'
  },
  {
    path: 'client/src/views/system/RolesView.vue',
    template: 'system',
    name: 'RolesView',
    title: '角色管理'
  },
  {
    path: 'client/src/views/system/LogsView.vue',
    template: 'system',
    name: 'LogsView',
    title: '操作日志'
  },

  // 个人中心
  {
    path: 'client/src/views/profile/ProfileView.vue',
    template: 'profile',
    name: 'ProfileView',
    title: '个人中心'
  },

  // 测试相关
  {
    path: 'client/src/views/test/ConnectionTest.vue',
    template: 'test',
    name: 'ConnectionTest',
    title: '连接测试'
  },

  // 错误页面
  {
    path: 'client/src/views/error/403View.vue',
    template: 'error',
    name: 'Error403View',
    title: '访问禁止'
  },
  {
    path: 'client/src/views/error/404View.vue',
    template: 'error',
    name: 'Error404View',
    title: '页面未找到'
  },
  {
    path: 'client/src/views/error/500View.vue',
    template: 'error',
    name: 'Error500View',
    title: '服务器错误'
  }
]

// 组件模板定义
const templates = {
  auth: `<template>
  <div class="auth-view">
    <div class="auth-container">
      <el-card class="auth-card" shadow="always">
        <div class="auth-header">
          <h1>{{ title }}</h1>
          <p>智慧村庄综合服务平台</p>
        </div>
        <div class="auth-content">
          <!-- {{ title }} 功能开发中 -->
          <el-empty description="功能开发中" />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('{{ title }}')
</script>

<style lang="scss" scoped>
.auth-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-container {
  width: 100%;
  max-width: 400px;
  padding: 0 20px;
}

.auth-card {
  border-radius: 16px;
  overflow: hidden;
}

.auth-header {
  text-align: center;
  margin-bottom: 30px;

  h1 {
    color: #303133;
    margin-bottom: 10px;
  }

  p {
    color: #909399;
    margin: 0;
  }
}

.auth-content {
  padding: 20px 0;
}
</style>`,

  resident: `<template>
  <div class="resident-view">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1 class="page-title">{{ title }}</h1>
          <el-button @click="$router.go(-1)">返回</el-button>
        </div>
      </el-header>
      <el-main class="page-main">
        <el-card>
          <el-empty description="功能开发中" />
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('{{ title }}')
</script>

<style lang="scss" scoped>
.resident-view {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.page-main {
  padding: 24px;
}
</style>`,

  finance: `<template>
  <div class="finance-view">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1 class="page-title">{{ title }}</h1>
          <div class="header-actions">
            <el-button type="primary">新建</el-button>
            <el-button>导出</el-button>
          </div>
        </div>
      </el-header>
      <el-main class="page-main">
        <el-row :gutter="24">
          <el-col :span="24">
            <el-card>
              <el-empty description="功能开发中" />
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('{{ title }}')
</script>

<style lang="scss" scoped>
.finance-view {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.page-main {
  padding: 24px;
}
</style>`,

  affairs: `<template>
  <div class="affairs-view">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1 class="page-title">{{ title }}</h1>
        </div>
      </el-header>
      <el-main class="page-main">
        <el-card>
          <el-empty description="功能开发中" />
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('{{ title }}')
</script>

<style lang="scss" scoped>
.affairs-view {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.page-main {
  padding: 24px;
}
</style>`,

  services: `<template>
  <div class="services-view">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1 class="page-title">{{ title }}</h1>
        </div>
      </el-header>
      <el-main class="page-main">
        <el-card>
          <el-empty description="功能开发中" />
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('{{ title }}')
</script>

<style lang="scss" scoped>
.services-view {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.page-main {
  padding: 24px;
}
</style>`,

  purchasers: `<template>
  <div class="purchasers-view">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1 class="page-title">{{ title }}</h1>
          <el-button type="primary">添加采购商</el-button>
        </div>
      </el-header>
      <el-main class="page-main">
        <el-card>
          <el-empty description="功能开发中" />
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('{{ title }}')
</script>

<style lang="scss" scoped>
.purchasers-view {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.page-main {
  padding: 24px;
}
</style>`,

  component: `<template>
  <div class="component-view">
    <div class="component-container">
      <h2>{{ title }}</h2>
      <el-card>
        <el-empty description="组件功能开发中" />
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('{{ title }}')
</script>

<style lang="scss" scoped>
.component-view {
  padding: 24px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.component-container {
  h2 {
    margin-bottom: 20px;
    color: #303133;
  }
}
</style>`,

  emergency: `<template>
  <div class="emergency-view">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1 class="page-title">{{ title }}</h1>
          <div class="header-actions">
            <el-button type="danger" v-if="name === 'ReportView'">紧急上报</el-button>
            <el-button type="primary" v-else>管理</el-button>
          </div>
        </div>
      </el-header>
      <el-main class="page-main">
        <el-card>
          <el-empty description="功能开发中" />
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('{{ title }}')
const name = ref('{{ name }}')
</script>

<style lang="scss" scoped>
.emergency-view {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.page-main {
  padding: 24px;
}
</style>`,

  system: `<template>
  <div class="system-view">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1 class="page-title">{{ title }}</h1>
          <div class="header-actions">
            <el-button type="primary" v-if="name === 'UsersView'">添加用户</el-button>
            <el-button type="primary" v-if="name === 'RolesView'">添加角色</el-button>
            <el-button>导出</el-button>
          </div>
        </div>
      </el-header>
      <el-main class="page-main">
        <el-card>
          <el-empty description="功能开发中" />
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('{{ title }}')
const name = ref('{{ name }}')
</script>

<style lang="scss" scoped>
.system-view {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.page-main {
  padding: 24px;
}
</style>`,

  profile: `<template>
  <div class="profile-view">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1 class="page-title">{{ title }}</h1>
          <el-button>编辑资料</el-button>
        </div>
      </el-header>
      <el-main class="page-main">
        <el-row :gutter="24">
          <el-col :span="8">
            <el-card>
              <el-empty description="用户信息" />
            </el-card>
          </el-col>
          <el-col :span="16">
            <el-card>
              <el-empty description="详细信息" />
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('{{ title }}')
</script>

<style lang="scss" scoped>
.profile-view {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.page-main {
  padding: 24px;
}
</style>`,

  test: `<template>
  <div class="test-view">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1 class="page-title">{{ title }}</h1>
          <el-button type="primary">运行测试</el-button>
        </div>
      </el-header>
      <el-main class="page-main">
        <el-card>
          <h3>系统连接状态测试</h3>
          <el-empty description="测试功能开发中" />
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('{{ title }}')
</script>

<style lang="scss" scoped>
.test-view {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.page-main {
  padding: 24px;
}
</style>`,

  error: `<template>
  <div class="error-view">
    <div class="error-container">
      <div class="error-content">
        <h1 class="error-code">{{ errorCode }}</h1>
        <h2 class="error-title">{{ title }}</h2>
        <p class="error-description">{{ description }}</p>
        <div class="error-actions">
          <el-button type="primary" @click="goHome">返回首页</el-button>
          <el-button @click="goBack">返回上一页</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const title = ref('{{ title }}')

const errorCode = computed(() => {
  if (title.value.includes('403')) return '403'
  if (title.value.includes('404')) return '404'
  if (title.value.includes('500')) return '500'
  return 'Error'
})

const description = computed(() => {
  if (title.value.includes('403')) return '抱歉，您没有权限访问此页面'
  if (title.value.includes('404')) return '抱歉，您访问的页面不存在'
  if (title.value.includes('500')) return '抱歉，服务器出现了错误'
  return '系统出现了未知错误'
})

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
.error-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-container {
  text-align: center;
  color: white;
}

.error-code {
  font-size: 120px;
  font-weight: bold;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.error-title {
  font-size: 32px;
  margin: 20px 0 10px;
}

.error-description {
  font-size: 18px;
  margin: 0 0 40px;
  opacity: 0.9;
}

.error-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}
</style>`
}

// 确保目录存在
function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// 创建组件文件
function createComponent(component) {
  const fullPath = path.join(__dirname, component.path)

  // 确保目录存在
  ensureDirectoryExists(fullPath)

  // 获取模板
  const template = templates[component.template]
  if (!template) {
    console.log(`⚠️  模板类型 ${component.template} 不存在，跳过 ${component.name}`)
    return false
  }

  // 替换模板中的占位符
  let content = template
    .replace(/\{\{ title \}\}/g, component.title)
    .replace(/\{\{ name \}\}/g, component.name)

  // 写入文件
  try {
    fs.writeFileSync(fullPath, content, 'utf8')
    console.log(`✅ 创建组件: ${component.path}`)
    return true
  } catch (error) {
    console.log(`❌ 创建组件失败: ${component.path}`, error.message)
    return false
  }
}

// 主函数
function main() {
  console.log('🚀 开始批量创建Vue组件...\n')

  let successCount = 0
  let failCount = 0

  components.forEach(component => {
    if (createComponent(component)) {
      successCount++
    } else {
      failCount++
    }
  })

  console.log('\n📊 创建结果统计:')
  console.log(`   ✅ 成功创建: ${successCount} 个组件`)
  console.log(`   ❌ 创建失败: ${failCount} 个组件`)
  console.log(`   📁 总计: ${components.length} 个组件`)

  if (failCount === 0) {
    console.log('\n🎉 所有组件创建成功！现在可以访问前端了。')
    console.log('\n🔗 访问地址: http://localhost:3000')
    console.log('👤 登录账号: admin / admin123')
  } else {
    console.log('\n⚠️  部分组件创建失败，请检查错误信息')
  }
}

// 运行脚本
main()