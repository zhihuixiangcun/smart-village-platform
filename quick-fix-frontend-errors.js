/**
 * 快速修复前端语法错误
 */

const fs = require('fs')
const path = require('path')

console.log('🔧 开始修复前端语法错误...\n')

// 1. 修复 OfflineManager.vue 中的 showMergeDialog 重复声明
const offlineManagerPath = path.join(__dirname, 'client/src/components/common/OfflineManager.vue')
if (fs.existsSync(offlineManagerPath)) {
  try {
    let content = fs.readFileSync(offlineManagerPath, 'utf8')

    // 找到第33行的 const showMergeDialog = ref(false)
    // 和第142行的 const showMergeDialog = (conflict) => {
    // 将第二个改为 showMergeDialogHandler

    content = content.replace(
      /const showMergeDialog = \(conflict\) => {/g,
      'const showMergeDialogHandler = (conflict) => {'
    )

    // 更新对应的调用
    content = content.replace(/showMergeDialog\(/g, 'showMergeDialogHandler(')

    fs.writeFileSync(offlineManagerPath, content)
    console.log('✅ 修复 OfflineManager.vue 中的 showMergeDialog 重复声明')
  } catch (error) {
    console.log('❌ 修复 OfflineManager.vue 失败:', error.message)
  }
}

// 2. 修复 ResidentsView.vue 中的意外 }
const residentsViewPath = path.join(__dirname, 'client/src/views/ResidentsView.vue')
if (fs.existsSync(residentsViewPath)) {
  try {
    let content = fs.readFileSync(residentsViewPath, 'utf8')

    // 查找并删除意外的 }
    content = content.replace(/\s*}\s*$/, '')

    fs.writeFileSync(residentsViewPath, content)
    console.log('✅ 修复 ResidentsView.vue 中的意外字符')
  } catch (error) {
    console.log('❌ 修复 ResidentsView.vue 失败:', error.message)
  }
}

// 3. 修复 FinanceExpensesView.vue 中的重复导入
const financeExpensesPath = path.join(__dirname, 'client/src/views/finance/FinanceExpensesView.vue')
if (fs.existsSync(financeExpensesPath)) {
  try {
    let content = fs.readFileSync(financeExpensesPath, 'utf8')

    // 移除重复的导入块
    const duplicateImportStart = content.indexOf('import { financeAPI }')
    if (duplicateImportStart > 0) {
      const beforeDuplicate = content.substring(0, duplicateImportStart)
      const afterDuplicate = content.substring(duplicateImportStart)

      // 找到重复导入块的结束位置
      const lines = afterDuplicate.split('\n')
      let endLine = 0
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('const userStore = useUserStore()')) {
          endLine = i + 1
          break
        }
      }

      if (endLine > 0) {
        const cleanedContent = beforeDuplicate + lines.slice(endLine).join('\n')
        fs.writeFileSync(financeExpensesPath, cleanedContent)
        console.log('✅ 修复 FinanceExpensesView.vue 中的重复导入')
      }
    }
  } catch (error) {
    console.log('❌ 修复 FinanceExpensesView.vue 失败:', error.message)
  }
}

console.log('\n🎉 语法错误修复完成！')
console.log('💡 请重新访问 http://localhost:3000 测试系统')