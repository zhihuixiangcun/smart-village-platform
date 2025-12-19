#!/usr/bin/env python3
"""
智慧乡村语音服务启动脚本
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 8):
        print("错误: 需要Python 3.8或更高版本")
        sys.exit(1)

def check_dependencies():
    """检查依赖包"""
    required_packages = [
        'flask',
        'librosa',
        'numpy',
        'scipy',
        'jieba',
        'aiohttp'
    ]

    missing_packages = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)

    if missing_packages:
        print(f"缺少依赖包: {', '.join(missing_packages)}")
        print("请运行: pip install -r requirements.txt")
        sys.exit(1)

def create_directories():
    """创建必要的目录"""
    directories = [
        'logs',
        'data',
        'models',
        'temp'
    ]

    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"创建目录: {directory}")

def install_dependencies():
    """安装依赖包"""
    print("正在安装依赖包...")
    try:
        subprocess.check_call([
            sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'
        ])
        print("依赖包安装完成")
    except subprocess.CalledProcessError as e:
        print(f"依赖包安装失败: {e}")
        sys.exit(1)

def setup_environment():
    """设置环境变量"""
    env_file = Path('.env')
    if not env_file.exists():
        # 创建示例环境变量文件
        example_env = """# 百度语音API配置
BAIDU_APP_ID=your_baidu_app_id
BAIDU_API_KEY=your_baidu_api_key
BAIDU_SECRET_KEY=your_baidu_secret_key

# 服务配置
VOICE_SERVICE_PORT=5001
VOICE_SERVICE_HOST=0.0.0.0
DEBUG=False

# Redis配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# 日志级别
LOG_LEVEL=INFO
"""
        with open(env_file, 'w', encoding='utf-8') as f:
            f.write(example_env)
        print(f"创建环境变量文件: {env_file}")
        print("请编辑 .env 文件并填入正确的配置")

def run_service(host=None, port=None, debug=None):
    """运行语音服务"""
    # 设置环境变量
    env = os.environ.copy()
    if host:
        env['VOICE_SERVICE_HOST'] = host
    if port:
        env['VOICE_SERVICE_PORT'] = str(port)
    if debug is not None:
        env['DEBUG'] = str(debug).lower()

    print(f"启动智慧乡村语音服务...")
    print(f"服务地址: http://{host or '0.0.0.0'}:{port or 5001}")
    print(f"健康检查: http://{host or 'localhost'}:{port or 5001}/health")
    print(f"按 Ctrl+C 停止服务")

    try:
        # 启动服务
        subprocess.run([sys.executable, 'src/app.py'], env=env)
    except KeyboardInterrupt:
        print("\n服务已停止")

def main():
    parser = argparse.ArgumentParser(description='智慧乡村语音服务')
    parser.add_argument('--install', action='store_true', help='安装依赖包')
    parser.add_argument('--setup', action='store_true', help='初始化环境')
    parser.add_argument('--host', default=None, help='服务主机地址')
    parser.add_argument('--port', type=int, default=None, help='服务端口')
    parser.add_argument('--debug', action='store_true', help='启用调试模式')
    parser.add_argument('--check', action='store_true', help='检查环境')

    args = parser.parse_args()

    print("=== 智慧乡村语音服务 ===")

    # 检查Python版本
    check_python_version()

    # 安装依赖
    if args.install:
        install_dependencies()
        return

    # 初始化环境
    if args.setup:
        create_directories()
        setup_environment()
        print("环境初始化完成")
        print("请编辑 .env 文件并填入正确的API密钥")
        return

    # 检查环境
    if args.check:
        check_dependencies()
        print("环境检查通过")
        return

    # 默认检查依赖
    check_dependencies()

    # 创建必要目录
    create_directories()

    # 设置环境变量文件
    setup_environment()

    # 运行服务
    run_service(
        host=args.host,
        port=args.port,
        debug=args.debug
    )

if __name__ == '__main__':
    main()