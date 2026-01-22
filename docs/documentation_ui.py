"""
Swagger UI 和 ReDoc 文档界面配置
为各服务提供交互式 API 文档
"""

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse


def create_swagger_ui_html(openapi_url: str = "/openapi.json", title: str = "API Documentation") -> str:
    """
    创建 Swagger UI HTML 页面

    Args:
        openapi_url: OpenAPI 规范 URL
        title: 页面标题

    Returns:
        HTML 内容
    """
    return f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>
        html {{
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }}
        *, *:before, *:after {{
            box-sizing: inherit;
        }}
        body {{
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }}
        .swagger-ui {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px 10px 0 0;
            margin-bottom: 0;
        }}
        .header h1 {{
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }}
        .header p {{
            margin: 5px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🏘️ 智慧乡村综合服务平台</h1>
        <p>智慧乡村农技知识图谱 API 交互式文档</p>
    </div>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" charset="UTF-8"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
    <script>
    window.onload = function() {{
        const ui = SwaggerUIBundle({{
            url: '{openapi_url}',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
            ],
            layout: "BaseLayout",
            defaultModelsExpandDepth: 1,
            defaultModelExpandDepth: 1,
            displayRequestDuration: true,
            displayOperationId: true,
            filter: true,
            showExtensions: true,
            showCommonExtensions: true,
            tryItOutEnabled: true,
            requestInterceptor: (request) => {{
                // 可以在这里添加请求拦截器
                console.log('Request:', request);
                return request;
            }},
            responseInterceptor: (response) => {{
                // 可以在这里添加响应拦截器
                console.log('Response:', response);
                return response;
            }}
        }});
    }};
    </script>
</body>
</html>
"""


def create_redoc_html(openapi_url: str = "/openapi.json", title: str = "API Documentation") -> str:
    """
    创建 ReDoc HTML 页面

    Args:
        openapi_url: OpenAPI 规范 URL
        title: 页面标题

    Returns:
        HTML 内容
    """
    return f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }}
        .redoc {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        .header {{
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 30px;
            text-align: center;
            margin-bottom: 20px;
        }}
        .header h1 {{
            margin: 0;
            font-size: 32px;
            font-weight: 700;
        }}
        .header p {{
            margin: 10px 0 0 0;
            opacity: 0.95;
            font-size: 16px;
        }}
    </style>
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
        body {{
            margin: 0;
            padding: 0;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🏘️ 智慧乡村综合服务平台</h1>
        <p>智慧乡村农技知识图谱 API 文档 - ReDoc 版本</p>
    </div>
    <redoc spec-url='{openapi_url}'></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@2/bundles/redoc.standalone.js"></script>
</body>
</html>
"""


def setup_documentation(app: FastAPI, service_name: str):
    """
    为 FastAPI 应用设置文档端点

    Args:
        app: FastAPI 应用实例
        service_name: 服务名称
    """

    @app.get("/docs/swagger", include_in_schema=False, tags=["documentation"])
    async def swagger_ui():
        """Swagger UI 文档页面"""
        return HTMLResponse(
            content=create_swagger_ui_html(
                openapi_url="/openapi.json",
                title=f"{service_name} - Swagger UI"
            )
        )

    @app.get("/docs/redoc", include_in_schema=False, tags=["documentation"])
    async def redoc():
        """ReDoc 文档页面"""
        return HTMLResponse(
            content=create_redoc_html(
                openapi_url="/openapi.json",
                title=f"{service_name} - ReDoc"
            )
        )

    @app.get("/docs", include_in_schema=False, tags=["documentation"])
    async def docs_index():
        """文档首页"""
        return f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{service_name} - API 文档</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
        }}
        .container {{
            text-align: center;
            max-width: 800px;
            padding: 40px;
        }}
        .logo {{
            font-size: 80px;
            margin-bottom: 20px;
        }}
        h1 {{
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 15px;
        }}
        p {{
            font-size: 18px;
            margin-bottom: 40px;
            opacity: 0.9;
            line-height: 1.6;
        }}
        .docs-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            width: 100%;
        }}
        .doc-card {{
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 15px;
            padding: 30px;
            transition: all 0.3s ease;
            cursor: pointer;
        }}
        .doc-card:hover {{
            transform: translateY(-5px);
            background: rgba(255, 255, 255, 0.15);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }}
        .doc-icon {{
            font-size: 48px;
            margin-bottom: 15px;
        }}
        .doc-title {{
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
        }}
        .doc-desc {{
            font-size: 14px;
            opacity: 0.8;
        }}
        a {{
            color: white;
            text-decoration: none;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🏘️</div>
        <h1>智慧乡村综合服务平台</h1>
        <p>{service_name} API 文档中心 - 探索我们的开放接口，快速集成智慧乡村服务</p>

        <div class="docs-grid">
            <div class="doc-card">
                <div class="doc-icon">📚</div>
                <div class="doc-title">Swagger UI</div>
                <div class="doc-desc">交互式 API 文档，支持在线测试</div>
            </div>
            <a href="/docs/redoc" style="text-decoration: none;">
                <div class="doc-card">
                    <div class="doc-icon">📖</div>
                    <div class="doc-title">ReDoc</div>
                    <div class="doc-desc">美观的三栏式 API 文档</div>
                </div>
            </a>
            <a href="/openapi.json" style="text-decoration: none;">
                <div class="doc-card">
                    <div class="doc-icon">📄</div>
                    <div class="doc-title">OpenAPI JSON</div>
                    <div class="doc-desc">机器可读的 API 规范</div>
                </div>
            </a>
            <a href="/openapi.yaml" style="text-decoration: none;">
                <div class="doc-card">
                    <div class="doc-icon">📝</div>
                    <div class="doc-title">OpenAPI YAML</div>
                    <div class="doc-desc">人类友好的 API 规范</div>
                </div>
            </a>
        </div>

        <div style="margin-top: 40px; opacity: 0.7; font-size: 14px;">
            <p>© 2024 智慧乡村综合服务平台 | 版本 2.0.0</p>
        </div>
    </div>
</body>
</html>
        """

    return app


# 为 Flask 应用创建文档路由（用于语音服务）
def create_flask_docs_blueprint(app, service_name: str):
    """
    为 Flask 应用创建文档蓝图

    Args:
        app: Flask 应用实例
        service_name: 服务名称

    Returns:
        Flask Blueprint
    """
    from flask import Blueprint, render_template_string

    docs_bp = Blueprint('docs', __name__)

    @docs_bp.route('/docs')
    def docs_index():
        """文档首页"""
        return render_template_string(f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{service_name} - API 文档</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
        }}
        .container {{
            text-align: center;
            max-width: 800px;
            padding: 40px;
        }}
        .logo {{
            font-size: 80px;
            margin-bottom: 20px;
        }}
        h1 {{
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 15px;
        }}
        p {{
            font-size: 18px;
            margin-bottom: 40px;
            opacity: 0.9;
        }}
        .docs-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            width: 100%;
        }}
        .doc-card {{
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 15px;
            padding: 30px;
            transition: all 0.3s ease;
        }}
        .doc-card:hover {{
            transform: translateY(-5px);
            background: rgba(255, 255, 255, 0.15);
        }}
        .doc-icon {{
            font-size: 48px;
            margin-bottom: 15px;
        }}
        .doc-title {{
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
        }}
        .doc-desc {{
            font-size: 14px;
            opacity: 0.8;
        }}
        a {{
            color: white;
            text-decoration: none;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🏘️</div>
        <h1>智慧乡村综合服务平台</h1>
        <p>{service_name} API 文档中心</p>

        <div class="docs-grid">
            <div class="doc-card">
                <div class="doc-icon">📚</div>
                <div class="doc-title">API 参考</div>
                <div class="doc-desc">交互式 API 文档</div>
            </div>
            <a href="/openapi.json" style="text-decoration: none;">
                <div class="doc-card">
                    <div class="doc-icon">📄</div>
                    <div class="doc-title">OpenAPI JSON</div>
                    <div class="doc-desc">API 规范文档</div>
                </div>
            </a>
            <a href="/openapi.yaml" style="text-decoration: none;">
                <div class="doc-card">
                    <div class="doc-icon">📝</div>
                    <div class="doc-title">OpenAPI YAML</div>
                    <div class="doc-desc">YAML 格式规范</div>
                </div>
            </a>
        </div>
    </div>
</body>
</html>
        """)

    @docs_bp.route('/docs/swagger')
    def swagger_ui():
        """Swagger UI 文档页面"""
        return render_template_string(
            create_swagger_ui_html(
                openapi_url="/openapi.json",
                title=f"{service_name} - Swagger UI"
            )
        )

    @docs_bp.route('/docs/redoc')
    def redoc():
        """ReDoc 文档页面"""
        return render_template_string(
            create_redoc_html(
                openapi_url="/openapi.json",
                title=f"{service_name} - ReDoc"
            )
        )

    return docs_bp
