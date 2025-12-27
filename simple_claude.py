import requests
import json

def ask_claude(prompt):
    """直接调用 Claude API 的简化版本"""
    api_key = "sk-vBIQ5YFAK6RW9mfcmI4dT2KLA71j3AVwg45VhhCHuw4GUzFC"
    url = " https://api.anthropic.com/v1/messages "
    
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "claude-3-haiku-20240307",  # 使用最稳定的模型
        "max_tokens": 2000,
        "messages": [{"role": "user", "content": prompt}]
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()["content"]["text"]
    except Exception as e:
        return f"错误: {str(e)}"

# 示例：生成代码并保存
if __name__ == "__main__":
    print("🛠️ Claude 代码生成器 (简易版)")
    print("----------------------------------")
    
    # 示例1：生成快速排序代码
    prompt = """请用Python实现快速排序算法，要求：
    1. 包含详细注释
    2. 包含测试用例
    3. 添加时间复杂度的说明"""
    
    print("\n正在生成快速排序代码...")
    code = ask_claude(prompt)
    with open("quick_sort.py", "w", encoding="utf-8") as f:
        f.write(code)
    print("✅ 已保存为 quick_sort.py")
    
    # 示例2：生成Flask API代码
    prompt = """用Python Flask创建一个REST API，要求：
    1. 包含/users端点
    2. 支持GET/POST方法
    3. 使用JSON格式返回数据"""
    
    print("\n正在生成Flask API代码...")
    code = ask_claude(prompt)
    with open("flask_api.py", "w", encoding="utf-8") as f:
        f.write(code)
    print("✅ 已保存为 flask_api.py")
    
    print("\n🎉 所有代码生成完成！")
