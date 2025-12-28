/**
 * 批量导入功能测试
 */

const ResidentBatchImportService = require('./src/services/batch-import/ResidentBatchImportService');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 初始化服务
const batchImportService = new ResidentBatchImportService();

async function runTests() {
  console.log('========================================');
  console.log('村民批量导入功能测试');
  console.log('========================================\n');

  // 测试1: 生成导入模板
  console.log('测试1: 生成导入模板');
  try {
    const template = batchImportService.generateTemplate();
    const templatePath = path.join(__dirname, 'test-import-template.xlsx');
    fs.writeFileSync(templatePath, template);
    console.log('✅ 模板生成成功:', templatePath);
    console.log('文件大小:', (template.length / 1024).toFixed(2), 'KB\n');
  } catch (error) {
    console.log('❌ 模板生成失败:', error.message, '\n');
  }

  // 测试2: 创建测试数据
  console.log('测试2: 创建测试数据');
  const testData = [
    {
      '姓名': '张三',
      '身份证号': '110101199001011234',
      '手机号': '13800138000',
      '性别': '男',
      '出生日期': '1990-01-01',
      '家庭住址': '某某村某某组',
      '村ID': 'test_village_001',
      '户主姓名': '张父',
      '与户主关系': '子女'
    },
    {
      '姓名': '李四',
      '身份证号': '110101199002022345',
      '手机号': '13900139000',
      '性别': '女',
      '出生日期': '1990-02-02',
      '家庭住址': '某某村某某组',
      '村ID': 'test_village_001',
      '户主姓名': '李父',
      '与户主关系': '子女'
    },
    {
      '姓名': '王五',
      '身份证号': '110101198503033456',
      '手机号': '13700137000',
      '性别': '男',
      '出生日期': '1985-03-03',
      '家庭住址': '某某村某某组',
      '村ID': 'test_village_001',
      '户主姓名': '',
      '与户主关系': ''
    },
    {
      '姓名': '',
      '身份证号': '1234567890',
      '手机号': '12345',
      '性别': '男',
      '出生日期': '1995-05-05',
      '家庭住址': '测试地址',
      '村ID': 'test_village_001',
      '户主姓名': '',
      '与户主关系': ''
    }
  ];

  // 创建测试Excel文件
  const worksheet = XLSX.utils.json_to_sheet(testData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '测试数据');
  const testFilePath = path.join(__dirname, 'test-import-data.xlsx');
  XLSX.writeFile(workbook, testFilePath);
  console.log('✅ 测试数据文件创建成功:', testFilePath);
  console.log('包含', testData.length, '条记录 (3条有效, 1条错误)\n');

  // 测试3: 解析文件
  console.log('测试3: 解析Excel文件');
  try {
    const data = await batchImportService.parseFile(testFilePath);
    console.log('✅ 文件解析成功');
    console.log('解析出', data.length, '条记录\n');
  } catch (error) {
    console.log('❌ 文件解析失败:', error.message, '\n');
  }

  // 测试4: 数据验证（不需要数据库连接）
  console.log('测试4: 数据验证逻辑');
  console.log('测试身份证号验证...');

  // 测试正确的身份证号
  const validId = '110101199001011234';
  const idResult1 = batchImportService.validateIdCard(validId);
  console.log('  身份证号', validId, ':', idResult1.valid ? '✅ 有效' : '❌ ' + idResult1.message);

  // 测试错误的身份证号
  const invalidId1 = '1234567890';
  const idResult2 = batchImportService.validateIdCard(invalidId1);
  console.log('  身份证号', invalidId1, ':', idResult2.valid ? '✅ 有效' : '❌ ' + idResult2.message);

  // 测试手机号验证
  console.log('\n测试手机号验证...');
  const validPhone = '13800138000';
  const phoneResult1 = batchImportService.validatePhone(validPhone);
  console.log('  手机号', validPhone, ':', phoneResult1.valid ? '✅ 有效' : '❌ ' + phoneResult1.message);

  const invalidPhone = '12345';
  const phoneResult2 = batchImportService.validatePhone(invalidPhone);
  console.log('  手机号', invalidPhone, ':', phoneResult2.valid ? '✅ 有效' : '❌ ' + phoneResult2.message);

  // 测试5: 字段转换
  console.log('\n测试5: 字段转换');
  const testRecord = {
    '姓名': '测试用户',
    '身份证号': '110101199001011234',
    '手机号': '13800138000',
    '性别': '男',
    '出生日期': '1990-01-01',
    '家庭住址': '测试地址'
  };

  const transformed = batchImportService.transformRecord(testRecord);
  console.log('✅ 字段转换成功:');
  console.log('  原始字段 -> 数据库字段');
  console.log('  姓名 -> realName:', transformed.realName);
  console.log('  身份证号 -> idCard:', transformed.idCard);
  console.log('  手机号 -> phone:', transformed.phone);
  console.log('  性别 -> gender:', transformed.gender, '(原值: 男)');
  console.log('  出生日期 -> birthDate:', transformed.birthDate);
  console.log('  家庭住址 -> address:', transformed.address);
  console.log('  status:', transformed.status);
  console.log('  createdAt:', transformed.createdAt);

  // 测试6: 创建导入任务
  console.log('\n测试6: 创建导入任务');
  try {
    const mockFileInfo = {
      originalname: 'test-import-data.xlsx',
      path: testFilePath,
      size: fs.statSync(testFilePath).size
    };

    const taskId = await batchImportService.createImportTask('test-user', mockFileInfo);
    console.log('✅ 导入任务创建成功');
    console.log('  任务ID:', taskId);

    const taskStatus = batchImportService.getTaskStatus(taskId);
    console.log('  任务状态:', taskStatus.status);
    console.log('  文件名:', taskStatus.fileName);
    console.log('  进度:', taskStatus.progress + '%');
  } catch (error) {
    console.log('❌ 创建任务失败:', error.message);
  }

  // 测试7: 获取所有任务
  console.log('\n测试7: 获取所有任务');
  const allTasks = batchImportService.getAllTasks();
  console.log('✅ 任务列表获取成功');
  console.log('  任务总数:', allTasks.length);
  allTasks.forEach(task => {
    console.log('  -', task.id, ':', task.status, '-', task.fileName);
  });

  // 清理测试文件
  console.log('\n清理测试文件...');
  try {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('✅ 已删除:', testFilePath);
    }
  } catch (error) {
    console.log('⚠️  删除测试文件失败:', error.message);
  }

  console.log('\n========================================');
  console.log('测试完成!');
  console.log('========================================');
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
