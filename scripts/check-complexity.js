#!/usr/bin/env node

// 代码复杂度检查脚本
// 用于CI/CD流水线中的代码质量门禁

const fs = require('fs');
const path = require('path');

// 复杂度阈值配置
const COMPLEXITY_THRESHOLDS = {
    maxComplexity: 10,      // 单个函数最大复杂度
    maxFileComplexity: 50,  // 单个文件最大复杂度
    avgComplexity: 5        // 平均复杂度
};

// 读取复杂度报告
function readComplexityReport(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  复杂度报告文件不存在: ${filePath}`);
            return null;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.log(`❌ 读取复杂度报告失败: ${error.message}`);
        return null;
    }
}

// 检查单个函数复杂度
function checkFunctionComplexity(reports) {
    console.log('\n📊 函数复杂度检查');
    console.log('==================');

    let highComplexityFunctions = [];
    let violations = 0;

    reports.forEach(report => {
        if (!report.reports) return;

        report.reports.forEach(fileReport => {
            if (!fileReport.aggregate) return;

            const filePath = fileReport.file;
            const complexity = fileReport.aggregate.complexity;

            if (complexity > COMPLEXITY_THRESHOLDS.maxComplexity) {
                violations++;
                highComplexityFunctions.push({
                    file: filePath,
                    complexity: complexity,
                    threshold: COMPLEXITY_THRESHOLDS.maxComplexity
                });
            }
        });
    });

    if (violations > 0) {
        console.log(`❌ 发现 ${violations} 个函数超过复杂度阈值 (${COMPLEXITY_THRESHOLDS.maxComplexity}):`);
        highComplexityFunctions.forEach(func => {
            console.log(`   - ${func.file}: 复杂度 ${func.complexity} (阈值: ${func.threshold})`);
        });
        return false;
    } else {
        console.log(`✅ 所有函数复杂度都在阈值范围内 (≤ ${COMPLEXITY_THRESHOLDS.maxComplexity})`);
        return true;
    }
}

// 检查文件复杂度
function checkFileComplexity(reports) {
    console.log('\n📁 文件复杂度检查');
    console.log('==================');

    let highComplexityFiles = [];
    let violations = 0;

    reports.forEach(report => {
        if (!report.reports) return;

        report.reports.forEach(fileReport => {
            if (!fileReport.aggregate) return;

            const filePath = fileReport.file;
            const complexity = fileReport.aggregate.complexity;

            if (complexity > COMPLEXITY_THRESHOLDS.maxFileComplexity) {
                violations++;
                highComplexityFiles.push({
                    file: filePath,
                    complexity: complexity,
                    threshold: COMPLEXITY_THRESHOLDS.maxFileComplexity
                });
            }
        });
    });

    if (violations > 0) {
        console.log(`❌ 发现 ${violations} 个文件超过复杂度阈值 (${COMPLEXITY_THRESHOLDS.maxFileComplexity}):`);
        highComplexityFiles.forEach(file => {
            console.log(`   - ${file.file}: 复杂度 ${file.complexity} (阈值: ${file.threshold})`);
        });
        return false;
    } else {
        console.log(`✅ 所有文件复杂度都在阈值范围内 (≤ ${COMPLEXITY_THRESHOLDS.maxFileComplexity})`);
        return true;
    }
}

// 检查平均复杂度
function checkAverageComplexity(reports) {
    console.log('\n📈 平均复杂度检查');
    console.log('==================');

    let totalComplexity = 0;
    let totalFiles = 0;

    reports.forEach(report => {
        if (!report.reports) return;

        report.reports.forEach(fileReport => {
            if (!fileReport.aggregate) return;

            totalComplexity += fileReport.aggregate.complexity;
            totalFiles++;
        });
    });

    if (totalFiles === 0) {
        console.log('⚠️  没有找到复杂度数据');
        return true;
    }

    const avgComplexity = totalComplexity / totalFiles;

    if (avgComplexity > COMPLEXITY_THRESHOLDS.avgComplexity) {
        console.log(`❌ 平均复杂度超过阈值: ${avgComplexity.toFixed(2)} (阈值: ${COMPLEXITY_THRESHOLDS.avgComplexity})`);
        return false;
    } else {
        console.log(`✅ 平均复杂度符合要求: ${avgComplexity.toFixed(2)} (≤ ${COMPLEXITY_THRESHOLDS.avgComplexity})`);
        return true;
    }
}

// 生成复杂度报告摘要
function generateSummary(reports) {
    console.log('\n📋 复杂度报告摘要');
    console.log('==================');

    let totalComplexity = 0;
    let totalFiles = 0;
    let maxComplexity = 0;
    let maxComplexityFile = '';

    reports.forEach(report => {
        if (!report.reports) return;

        report.reports.forEach(fileReport => {
            if (!fileReport.aggregate) return;

            const complexity = fileReport.aggregate.complexity;
            const filePath = fileReport.file;

            totalComplexity += complexity;
            totalFiles++;

            if (complexity > maxComplexity) {
                maxComplexity = complexity;
                maxComplexityFile = filePath;
            }
        });
    });

    if (totalFiles > 0) {
        const avgComplexity = totalComplexity / totalFiles;
        console.log(`📁 分析文件数量: ${totalFiles}`);
        console.log(`📊 总复杂度: ${totalComplexity}`);
        console.log(`📈 平均复杂度: ${avgComplexity.toFixed(2)}`);
        console.log(`🔺 最高复杂度: ${maxComplexity} (${maxComplexityFile})`);
    } else {
        console.log('⚠️  没有找到复杂度数据');
    }
}

// 主检查函数
function main() {
    console.log('🚪 代码复杂度质量门禁');
    console.log('=====================');

    // 读取主项目复杂度报告
    const mainReport = readComplexityReport('complexity-report.json');

    // 读取客户端复杂度报告
    const clientReport = readComplexityReport('client-complexity-report.json');

    const reports = [];
    if (mainReport) reports.push(mainReport);
    if (clientReport) reports.push(clientReport);

    if (reports.length === 0) {
        console.log('⚠️  没有找到复杂度报告文件，跳过复杂度检查');
        process.exit(0);
    }

    // 生成摘要
    generateSummary(reports);

    // 执行各项检查
    const functionCheck = checkFunctionComplexity(reports);
    const fileCheck = checkFileComplexity(reports);
    const avgCheck = checkAverageComplexity(reports);

    // 最终结果
    console.log('\n🎯 检查结果');
    console.log('============');
    console.log(`函数复杂度: ${functionCheck ? '✅ 通过' : '❌ 失败'}`);
    console.log(`文件复杂度: ${fileCheck ? '✅ 通过' : '❌ 失败'}`);
    console.log(`平均复杂度: ${avgCheck ? '✅ 通过' : '❌ 失败'}`);

    if (functionCheck && fileCheck && avgCheck) {
        console.log('\n✅ 所有复杂度检查通过！');
        process.exit(0);
    } else {
        console.log('\n❌ 复杂度检查失败，请优化代码后重试');
        process.exit(1);
    }
}

// 运行检查
main();