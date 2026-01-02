#!/bin/bash

# 智能值班表系统测试运行脚本
# 用于快速运行值班模块的所有测试

echo "========================================"
echo "智能值班表系统测试套件"
echo "========================================"
echo ""

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "[错误] 未找到Node.js，请先安装Node.js"
    exit 1
fi

echo "[信息] Node.js版本:"
node -v
echo ""

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "[信息] 正在安装依赖..."
    npm install
    echo ""
fi

# 显示菜单
echo "请选择要运行的测试："
echo ""
echo "1. 运行所有值班模块测试"
echo "2. 只运行单元测试"
echo "3. 只运行集成测试"
echo "4. 只运行E2E测试"
echo "5. 运行特定测试文件"
echo "6. 运行测试并生成覆盖率报告"
echo "7. 监听模式（开发时使用）"
echo "8. 退出"
echo ""

read -p "请输入选项 (1-8): " choice

case $choice in
    1)
        echo ""
        echo "[运行] 所有值班模块测试..."
        echo ""
        npm test -- tests/unit/duty tests/integration/duty tests/e2e/dutyCompleteFlow.test.js
        ;;
    2)
        echo ""
        echo "[运行] 单元测试..."
        echo ""
        npm test -- tests/unit/duty
        ;;
    3)
        echo ""
        echo "[运行] 集成测试..."
        echo ""
        npm test -- tests/integration/duty
        ;;
    4)
        echo ""
        echo "[运行] E2E测试..."
        echo ""
        npm test -- tests/e2e/dutyCompleteFlow.test.js
        ;;
    5)
        echo ""
        echo "可用的测试文件："
        echo "1. dutyPersonnel.test.js - 值班人员管理单元测试"
        echo "2. dutySchedule.test.js - 值班表单元测试"
        echo "3. emergencyCall.test.js - 紧急呼叫集成测试"
        echo "4. dutyRotation.test.js - 调班功能集成测试"
        echo "5. dutyCompleteFlow.test.js - 端到端测试"
        echo ""
        read -p "请选择测试文件 (1-5): " test_choice

        case $test_choice in
            1) test_file="tests/unit/duty/dutyPersonnel.test.js" ;;
            2) test_file="tests/unit/duty/dutySchedule.test.js" ;;
            3) test_file="tests/integration/duty/emergencyCall.test.js" ;;
            4) test_file="tests/integration/duty/dutyRotation.test.js" ;;
            5) test_file="tests/e2e/dutyCompleteFlow.test.js" ;;
            *)
                echo "[错误] 无效的选项"
                exit 1
                ;;
        esac

        echo ""
        echo "[运行] $test_file..."
        echo ""
        npm test -- "$test_file"
        ;;
    6)
        echo ""
        echo "[运行] 测试并生成覆盖率报告..."
        echo ""
        npm run test:coverage -- tests/unit/duty tests/integration/duty
        echo ""
        echo "[信息] 覆盖率报告已生成到 coverage/ 目录"
        if command -v open &> /dev/null; then
            open coverage/lcov-report/index.html
        elif command -v xdg-open &> /dev/null; then
            xdg-open coverage/lcov-report/index.html
        else
            echo "请手动打开 coverage/lcov-report/index.html 查看报告"
        fi
        ;;
    7)
        echo ""
        echo "[运行] 监听模式（Ctrl+C 退出）..."
        echo ""
        npm run test:watch -- tests/duty
        ;;
    8)
        echo "退出"
        exit 0
        ;;
    *)
        echo "[错误] 无效的选项"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo "测试完成！"
echo "========================================"
