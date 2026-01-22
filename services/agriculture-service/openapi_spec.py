"""
智慧乡村农技知识图谱服务 - OpenAPI 3.0 规范
自动生成的完整 API 文档
"""

from fastapi.openapi.utils import get_openapi
from app import app


def custom_openapi():
    """
    自定义 OpenAPI 规范
    为 API 添加更详细的元数据和安全配置
    """
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="智慧乡村农技知识图谱API",
        version="2.0.0",
        description="""
        # 智慧乡村农技知识图谱 API

        提供作物推荐、病虫害识别、政策计算等农技服务。

        ## 功能特性
        - 🌾 **作物智能推荐**: 基于土壤类型、气候条件推荐适合的作物
        - 🐛 **病虫害识别**: AI 驱动的图像识别病虫害
        - 💰 **政策补贴计算**: 自动计算各类农业补贴
        - 📚 **知识库搜索**: 语义搜索农技知识

        ## 认证方式
        本 API 目前为公开接口，生产环境将添加 JWT 认证。

        ## 错误处理
        所有错误响应遵循统一格式：
        ```json
        {
          "success": false,
          "error": "error_code",
          "message": "详细错误信息"
        }
        ```
        """,
        routes=app.routes,
    )

    # 添加服务器配置
    openapi_schema["servers"] = [
        {
            "url": "http://localhost:8000",
            "description": "开发环境"
        },
        {
            "url": "https://api.smart-village.cn/agriculture",
            "description": "生产环境"
        }
    ]

    # 添加安全方案
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT 认证令牌"
        }
    }

    # 添加全局安全要求（开发环境可禁用）
    # openapi_schema["security"] = [{"bearerAuth": []}]

    # 添加标签
    openapi_schema["tags"] = [
        {
            "name": "作物推荐",
            "description": "作物智能推荐相关接口"
        },
        {
            "name": "病虫害识别",
            "description": "病虫害图像识别和防治方案"
        },
        {
            "name": "政策计算",
            "description": "农业政策补贴计算"
        },
        {
            "name": "知识库",
            "description": "农技知识库搜索"
        },
        {
            "name": "系统",
            "description": "系统健康检查和状态查询"
        }
    ]

    # 添加联系信息
    openapi_schema["info"]["contact"] = {
        "name": "智慧乡村技术支持",
        "email": "support@smart-village.cn",
        "url": "https://smart-village.cn"
    }

    # 添加许可证
    openapi_schema["info"]["license"] = {
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT"
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema


# 生成 OpenAPI JSON 文档
def generate_openapi_json(output_path: str = "docs/openapi.json") -> dict:
    """
    生成 OpenAPI JSON 文档

    Args:
        output_path: 输出文件路径

    Returns:
        OpenAPI 规范字典
    """
    schema = custom_openapi()

    import json
    import os

    # 确保目录存在
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # 写入 JSON 文件
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(schema, f, ensure_ascii=False, indent=2)

    print(f"✅ OpenAPI 规范已生成: {output_path}")
    return schema


# 生成 OpenAPI YAML 文档
def generate_openapi_yaml(output_path: str = "docs/openapi.yaml") -> str:
    """
    生成 OpenAPI YAML 文档

    Args:
        output_path: 输出文件路径

    Returns:
        OpenAPI 规范 YAML 字符串
    """
    schema = custom_openapi()

    try:
        import yaml
        yaml_content = yaml.dump(schema, allow_unicode=True, default_flow_style=False)

        import os
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(yaml_content)

        print(f"✅ OpenAPI YAML 规范已生成: {output_path}")
        return yaml_content
    except ImportError:
        print("⚠️  PyYAML 未安装，跳过 YAML 生成")
        return ""


# 添加端点以导出 OpenAPI 规范
@app.get("/openapi.json", include_in_schema=False)
async def get_openapi_json():
    """获取 OpenAPI JSON 规范"""
    return custom_openapi()


@app.get("/openapi.yaml", include_in_schema=False)
async def get_openapi_yaml():
    """获取 OpenAPI YAML 规范"""
    schema = custom_openapi()
    try:
        import yaml
        from fastapi.responses import PlainTextResponse
        yaml_content = yaml.dump(schema, allow_unicode=True, default_flow_style=False)
        return PlainTextResponse(yaml_content, media_type="text/yaml")
    except ImportError:
        return PlainTextResponse("PyYAML 未安装", status_code=500)


if __name__ == "__main__":
    # 直接运行此文件时生成文档
    generate_openapi_json()
    generate_openapi_yaml()
