/**
 * 智慧村庄平台 - 最终组件完整性检查
 */

const fs = require('fs')
const path = require('path')

// 从路由配置文件中提取的所有组件路径
const allRouteComponents = [
  // 基础页面
  'client/src/views/Home.vue',
  'client/src/views/Dashboard.vue',
  'client/src/views/DashboardView.vue',

  // 认证相关
  'client/src/views/auth/LoginView.vue',
  'client/src/views/auth/RegisterView.vue',
  'client/src/views/auth/ForgotPasswordView.vue',

  // 村民管理
  'client/src/views/ResidentsView.vue',
  'client/src/views/residents/ResidentDetailView.vue',
  'client/src/views/residents/ResidentAddView.vue',
  'client/src/views/residents/ResidentEditView.vue',

  // 村委管理
  'client/src/views/CommitteeView.vue',

  // 财务管理
  'client/src/views/finance/FinanceOverviewView.vue',
  'client/src/views/finance/FinanceBudgetView.vue',
  'client/src/views/finance/FinanceExpensesView.vue',
  'client/src/views/finance/FinanceApprovalView.vue',
  'client/src/views/finance/FinanceReportsView.vue',

  // 村务治理
  'client/src/views/affairs/AnnouncementsView.vue',
  'client/src/views/affairs/VotingView.vue',
  'client/src/views/affairs/MeetingsView.vue',

  // 生活服务
  'client/src/views/services/ApplicationsView.vue',
  'client/src/views/services/HouseholdCodesView.vue',

  // 采购商管理
  'client/src/views/purchasers/PurchasersView.vue',

  // 组件管理
  'client/components/user/UserManagement.vue',
  'client/components/village/VillageAnnouncement.vue',
  'client/components/finance/TransactionList.vue',
  'client/components/emergency/EmergencyManagement.vue',
  'client/components/analytics/Dashboard.vue',
  'client/components/ecommerce/ProductManagement.vue',

  // 项目管理
  'client/src/views/projects/ProjectsListView.vue',
  'client/src/views/projects/ProjectDetailView.vue',
  'client/src/views/projects/ProjectAddView.vue',

  // 农产品管理
  'client/src/views/agriculture/ProductsListView.vue',
  'client/src/views/agriculture/OrdersListView.vue',
  'client/src/views/agriculture/FarmersListView.vue',

  // 应急管理
  'client/src/views/emergency/EventsListView.vue',
  'client/src/views/emergency/ReportView.vue',
  'client/src/views/emergency/ContactsView.vue',

  // 系统管理
  'client/src/views/system/UsersView.vue',
  'client/src/views/system/RolesView.vue',
  'client/src/views/system/LogsView.vue',

  // 个人中心
  'client/src/views/profile/ProfileView.vue',

  // 测试相关
  'client/src/views/test/ConnectionTest.vue',

  // 错误页面
  'client/src/views/error/403View.vue',
  'client/src/views/error/404View.vue',
  'client/src/views/error/500View.vue'
]

function checkComponentExists(componentPath) {
  const fullPath = path.join(__dirname, componentPath)
  return fs.existsSync(fullPath)
}

function main() {
  console.log('🔍 智慧村庄平台 - 最终组件完整性检查\n')

  let existingCount = 0
  let missingCount = 0
  const missingComponents = []

  console.log('📁 检查组件文件:')

  allRouteComponents.forEach(componentPath => {
    const exists = checkComponentExists(componentPath)
    if (exists) {
      existingCount++
      // 获取文件大小
      const fullPath = path.join(__dirname, componentPath)
      const stats = fs.statSync(fullPath)
      const size = `${(stats.size / 1024).toFixed(1)}KB`
      console.log(`   ✅ ${componentPath} (${size})`)
    } else {
      missingCount++
      missingComponents.push(componentPath)
      console.log(`   ❌ ${componentPath} (缺失)`)
    }
  })

  console.log('\n📊 检查结果统计:')
  console.log(`   ✅ 存在组件: ${existingCount}/${allRouteComponents.length}`)
  console.log(`   ❌ 缺失组件: ${missingCount}/${allRouteComponents.length}`)
  console.log(`   📈 完成率: ${((existingCount / allRouteComponents.length) * 100).toFixed(1)}%`)

  if (missingCount === 0) {
    console.log('\n🎉 恭喜！所有路由组件都已完整创建！')
    console.log('\n✨ 现在可以正常访问前端应用了：')
    console.log('   🔗 前端地址: http://localhost:3000')
    console.log('   🔗 主API: http://localhost:3001')
    console.log('   🔗 优化API: http://localhost:3010')
    console.log('   🔗 Socket.IO: http://localhost:5000')
    console.log('\n👤 登录账号:')
    console.log('   👨‍💼 管理员: admin / admin123')
    console.log('   👤 测试村民: test_villager / 123456')
    console.log('   👤 普通村民: 凤凰村_01 / 123456')
    console.log('\n🚀 系统功能模块:')
    console.log('   🏠 村民管理 | 🏛️ 村委管理 | 💰 财务管理')
    console.log('   📋 村务治理 | 🛠️ 生活服务 | 🚚 采购商管理')
    console.log('   🏗️ 项目管理 | 🌾 农产品管理 | 🚨 应急管理')
    console.log('   ⚙️ 系统管理 | 👤 个人中心 | 🔧 系统测试')
    console.log('\n💡 建议: 立即访问 http://localhost:3000 体验完整功能！')
  } else {
    console.log('\n⚠️  仍有组件缺失，需要继续创建:')
    missingComponents.forEach(component => {
      console.log(`   - ${component}`)
    })
    console.log('\n💡 建议: 运行组件创建脚本补全缺失组件')
  }
}

main()