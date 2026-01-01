import requests
import json
import os

# 配置 Claude API
API_KEY = "sk-vBIQ5YFAK6RW9mfcmI4dT2KLA71j3AVwg45VhhCHuw4GUzFC"
BASE_URL = " https://club.claudemax.xyz "  # 或 " https://api.anthropic.com "
MODEL = "claude-3-sonnet-20240229"  # 使用可用模型

def generate_code(prompt, filename):
    """使用 Claude 生成代码并保存到文件"""
    url = f"{BASE_URL}/v1/messages"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": MODEL,
        "max_tokens": 4000,
        "messages": [{"role": "user", "content": prompt}]
    }
    
    try:
        print(f"请求 Claude 生成代码: {prompt}")
        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        
        # 解析响应
        result = response.json()
        code = result["content"]["text"]
        
        # 保存代码到文件
        with open(filename, "w", encoding="utf-8") as f:
            f.write(code)
        
        print(f"\n✅ 代码已保存到 {filename}")
        print("=" * 80)
        print(code)
        print("=" * 80)
        return True
    
    except Exception as e:
        print(f"❌ 请求出错: {str(e)}")
        if response:
            print(f"响应状态码: {response.status_code}")
            print(f"响应内容: {response.text}")
        return False

if __name__ == "__main__":
    # 示例1：生成快速排序算法
    generate_code(
        "请用Python实现快速排序算法，包含详细注释和测试用例",
        "quick_sort.py"
    )
    
    # 示例2：生成二叉树实现
    generate_code(
        "请用Python实现二叉树数据结构，包含插入、删除、前序/中序/后序遍历方法",
        "binary_tree.py"
    )
    
    # 示例3：生成Flask REST API
    generate_code(
        "请用Python Flask框架创建一个简单的REST API服务器，包含/users端点",
        "flask_server.py"
    )
    
    # 示例4：生成Django模型
    generate_code(
        "请用Django创建一个博客应用的模型，包含Post和Comment模型",
        "blog_models.py"
    )
