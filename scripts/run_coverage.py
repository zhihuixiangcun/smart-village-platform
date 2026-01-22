"""
测试覆盖率报告生成脚本
运行测试并生成详细的覆盖率报告
"""

import os
import sys
import subprocess
from pathlib import Path


def run_tests_with_coverage():
    """运行测试并生成覆盖率报告"""
    print("🧪 开始运行测试套件...")

    # 定义测试目录
    test_dirs = [
        "python-voice-service/tests",
        "services/agriculture-service/tests"
    ]

    # 基础 pytest 命令
    base_cmd = [
        sys.executable, "-m", "pytest",
        "-v",
        "--cov-report=term",
        "--cov-report=html:htmlcov",
        "--cov-report=xml:coverage.xml",
        "--cov-report=json:coverage.json",
        "--cov-fail-under=80",
        "--tb=short"
    ]

    # 为每个服务运行测试
    coverage_results = {}

    for test_dir in test_dirs:
        if not os.path.exists(test_dir):
            print(f"⚠️  测试目录不存在: {test_dir}")
            continue

        print(f"\n📂 测试目录: {test_dir}")

        # 确定源码目录
        if "voice-service" in test_dir:
            source_dir = "python-voice-service"
        elif "agriculture-service" in test_dir:
            source_dir = "services/agriculture-service"
        else:
            source_dir = "."

        # 运行测试
        cmd = base_cmd + [
            f"--cov={source_dir}",
            test_dir
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300
            )

            # 输出测试结果
            print(result.stdout)
            if result.stderr:
                print(result.stderr, file=sys.stderr)

            # 保存结果
            coverage_results[source_dir] = {
                "exit_code": result.returncode,
                "passed": result.returncode == 0
            }

        except subprocess.TimeoutExpired:
            print(f"❌ 测试超时: {test_dir}")
            coverage_results[source_dir] = {
                "exit_code": -1,
                "passed": False,
                "error": "timeout"
            }

    # 生成汇总报告
    print("\n" + "="*60)
    print("📊 测试覆盖率汇总报告")
    print("="*60)

    all_passed = True
    for source_dir, result in coverage_results.items():
        status = "✅ 通过" if result["passed"] else "❌ 失败"
        print(f"{source_dir}: {status}")
        if not result["passed"]:
            all_passed = False

    print("\n" + "="*60)

    # 检查 HTML 报告
    htmlcov_path = Path("htmlcov")
    if htmlcov_path.exists():
        print(f"📈 HTML 覆盖率报告: {htmlcov_path.absolute()}")

    # 检查 XML 报告
    xml_path = Path("coverage.xml")
    if xml_path.exists():
        print(f"📄 XML 覆盖率报告: {xml_path.absolute()}")

    # 检查 JSON 报告
    json_path = Path("coverage.json")
    if json_path.exists():
        print(f"📊 JSON 覆盖率报告: {json_path.absolute()}")

    return 0 if all_passed else 1


def parse_coverage_json():
    """解析覆盖率 JSON 报告"""
    import json

    json_path = Path("coverage.json")
    if not json_path.exists():
        print("⚠️  覆盖率 JSON 报告不存在")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print("\n📊 详细覆盖率信息:")
    print(f"总覆盖率: {data['totals']['percent_covered']:.2f}%")
    print(f"覆盖的行数: {data['totals']['covered_lines']}")
    print(f"总行数: {data['totals']['num_statements']}")
    print(f"缺失的行数: {data['totals']['missing_lines']}")

    if 'files' in data:
        print("\n📁 各文件覆盖率:")
        for file_info in data['files'][:10]:  # 只显示前10个文件
            print(f"  {file_info['name']}: {file_info['summary']['percent_covered']:.2f}%")


if __name__ == "__main__":
    exit_code = run_tests_with_coverage()

    if exit_code == 0:
        parse_coverage_json()
        print("\n✅ 所有测试通过！")
    else:
        print("\n❌ 部分测试失败，请查看详细报告。")

    sys.exit(exit_code)
