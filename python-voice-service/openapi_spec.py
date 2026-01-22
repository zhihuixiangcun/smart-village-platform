"""
语音服务 OpenAPI 3.0 规范
自动生成的完整 API 文档
"""

from flask import Blueprint, jsonify
import json
from typing import Dict, Any


openapi_blueprint = Blueprint('openapi', __name__)


# 手动构建 OpenAPI 3.0 规范（Flask 没有 FastAPI 的自动生成功能）
OPENAPI_SPEC = {
    "openapi": "3.0.3",
    "info": {
        "title": "智慧乡村语音交互服务 API",
        "version": "1.0.0",
        "description": """
        # 智慧乡村语音交互服务 API

        提供语音识别、文本转语音、方言检测、语音命令处理等 AI 功能。

        ## 功能特性
        - 🎙️ **语音识别**: 支持多种方言的语音转文字
        - 🔊 **文本转语音**: 多种音色和情感的可定制 TTS
        - 🌍 **方言检测**: 自动识别中文方言
        - 💬 **语音命令**: 自然语言理解和命令处理

        ## 认证方式
        本 API 目前为公开接口，生产环境将添加 API Key 认证。

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
        "contact": {
            "name": "智慧乡村技术支持",
            "email": "support@smart-village.cn",
            "url": "https://smart-village.cn"
        },
        "license": {
            "name": "MIT",
            "url": "https://opensource.org/licenses/MIT"
        }
    },
    "servers": [
        {
            "url": "http://localhost:5001",
            "description": "开发环境"
        },
        {
            "url": "https://api.smart-village.cn/voice",
            "description": "生产环境"
        }
    ],
    "tags": [
        {
            "name": "语音识别",
            "description": "语音转文字相关接口"
        },
        {
            "name": "语音合成",
            "description": "文本转语音相关接口"
        },
        {
            "name": "方言检测",
            "description": "方言识别相关接口"
        },
        {
            "name": "语音命令",
            "description": "自然语言命令处理接口"
        },
        {
            "name": "配置",
            "description": "服务配置查询接口"
        },
        {
            "name": "系统",
            "description": "系统健康检查和监控接口"
        }
    ],
    "paths": {
        "/health": {
            "get": {
                "tags": ["系统"],
                "summary": "健康检查",
                "description": "检查服务是否正常运行",
                "responses": {
                    "200": {
                        "description": "服务健康",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/HealthCheckResponse"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/speech/recognize": {
            "post": {
                "tags": ["语音识别"],
                "summary": "语音识别",
                "description": "将语音转换为文字，支持多种方言",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/SpeechRecognitionRequest"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "识别成功",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/SpeechRecognitionResponse"
                                }
                            }
                        }
                    },
                    "400": {
                        "description": "请求参数错误",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    },
                    "500": {
                        "description": "服务器内部错误",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/speech/synthesize": {
            "post": {
                "tags": ["语音合成"],
                "summary": "文本转语音",
                "description": "将文本转换为语音，支持多种音色和情感",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/SpeechSynthesisRequest"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "合成成功",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/SpeechSynthesisResponse"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/speech/detect-dialect": {
            "post": {
                "tags": ["方言检测"],
                "summary": "方言检测",
                "description": "识别音频中的方言类型",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/DialectDetectionRequest"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "检测成功",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/DialectDetectionResponse"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/voice/command": {
            "post": {
                "tags": ["语音命令"],
                "summary": "语音命令处理",
                "description": "解析和处理自然语言命令",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/VoiceCommandRequest"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "处理成功",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/VoiceCommandResponse"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/config/dialects": {
            "get": {
                "tags": ["配置"],
                "summary": "获取方言列表",
                "description": "获取所有支持的方言类型",
                "responses": {
                    "200": {
                        "description": "成功",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/DialectsListResponse"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/config/voices": {
            "get": {
                "tags": ["配置"],
                "summary": "获取音色列表",
                "description": "获取所有支持的 TTS 音色",
                "responses": {
                    "200": {
                        "description": "成功",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/VoicesListResponse"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/config/commands": {
            "get": {
                "tags": ["配置"],
                "summary": "获取命令列表",
                "description": "获取支持的语音命令",
                "responses": {
                    "200": {
                        "description": "成功",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/CommandsListResponse"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/metrics": {
            "get": {
                "tags": ["系统"],
                "summary": "获取服务指标",
                "description": "获取服务的性能指标和统计信息",
                "responses": {
                    "200": {
                        "description": "成功",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/MetricsResponse"
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "components": {
        "schemas": {
            "HealthCheckResponse": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "data": {
                        "type": "object",
                        "properties": {
                            "status": {"type": "string"},
                            "timestamp": {"type": "string"},
                            "version": {"type": "string"},
                            "services": {
                                "type": "object",
                                "properties": {
                                    "speech_recognition": {"type": "boolean"},
                                    "text_to_speech": {"type": "boolean"},
                                    "dialect_detection": {"type": "boolean"},
                                    "voice_command": {"type": "boolean"}
                                }
                            }
                        }
                    }
                }
            },
            "SpeechRecognitionRequest": {
                "type": "object",
                "required": ["audio"],
                "properties": {
                    "audio": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "音频数据（字节数组）"
                    },
                    "config": {
                        "type": "object",
                        "properties": {
                            "language": {"type": "string", "default": "zh-CN"},
                            "dialect": {"type": "string", "default": "auto"}
                        }
                    }
                }
            },
            "SpeechRecognitionResponse": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "data": {
                        "type": "object",
                        "properties": {
                            "text": {"type": "string"},
                            "confidence": {"type": "number"},
                            "language": {"type": "string"},
                            "dialect": {"type": "string"}
                        }
                    }
                }
            },
            "SpeechSynthesisRequest": {
                "type": "object",
                "required": ["text"],
                "properties": {
                    "text": {"type": "string"},
                    "config": {
                        "type": "object",
                        "properties": {
                            "voice": {"type": "string"},
                            "language": {"type": "string"},
                            "speed": {"type": "number"},
                            "pitch": {"type": "number"},
                            "volume": {"type": "number"}
                        }
                    }
                }
            },
            "SpeechSynthesisResponse": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "data": {
                        "type": "object",
                        "properties": {
                            "audio": {"type": "array", "items": {"type": "integer"}},
                            "duration": {"type": "number"},
                            "config": {"type": "object"}
                        }
                    }
                }
            },
            "DialectDetectionRequest": {
                "type": "object",
                "required": ["audio"],
                "properties": {
                    "audio": {
                        "type": "array",
                        "items": {"type": "integer"}
                    }
                }
            },
            "DialectDetectionResponse": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "data": {
                        "type": "object",
                        "properties": {
                            "dialect": {"type": "string"},
                            "confidence": {"type": "number"}
                        }
                    }
                }
            },
            "VoiceCommandRequest": {
                "type": "object",
                "required": ["text"],
                "properties": {
                    "text": {"type": "string"},
                    "context": {"type": "object"}
                }
            },
            "VoiceCommandResponse": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "data": {
                        "type": "object",
                        "properties": {
                            "intent": {"type": "string"},
                            "entities": {"type": "object"},
                            "action": {"type": "string"},
                            "confidence": {"type": "number"}
                        }
                    }
                }
            },
            "ErrorResponse": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "error": {"type": "string"},
                    "message": {"type": "string"}
                }
            },
            "DialectsListResponse": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "data": {
                        "type": "object",
                        "properties": {
                            "dialects": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "code": {"type": "string"},
                                        "name": {"type": "string"},
                                        "baidu_code": {"type": "integer"}
                                    }
                                }
                            },
                            "total": {"type": "integer"}
                        }
                    }
                }
            },
            "VoicesListResponse": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "data": {
                        "type": "object",
                        "properties": {
                            "voices": {"type": "object"},
                            "default_voice": {"type": "string"}
                        }
                    }
                }
            },
            "CommandsListResponse": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "data": {
                        "type": "object",
                        "properties": {
                            "wake_words": {"type": "array", "items": {"type": "string"}},
                            "commands": {"type": "object"},
                            "confidence_threshold": {"type": "number"}
                        }
                    }
                }
            },
            "MetricsResponse": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "data": {
                        "type": "object",
                        "properties": {
                            "timestamp": {"type": "string"},
                            "uptime": {"type": "number"},
                            "requests": {
                                "type": "object",
                                "properties": {
                                    "total": {"type": "integer"},
                                    "errors": {"type": "integer"}
                                }
                            },
                            "cache": {
                                "type": "object",
                                "properties": {
                                    "hits": {"type": "integer"},
                                    "misses": {"type": "integer"},
                                    "size": {"type": "integer"}
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}


@openapi_blueprint.route('/openapi.json')
def get_openapi_json():
    """获取 OpenAPI JSON 规范"""
    return jsonify(OPENAPI_SPEC)


@openapi_blueprint.route('/openapi.yaml')
def get_openapi_yaml():
    """获取 OpenAPI YAML 规范"""
    try:
        import yaml
        from flask import Response
        yaml_content = yaml.dump(OPENAPI_SPEC, allow_unicode=True, default_flow_style=False)
        return Response(yaml_content, content_type='text/yaml')
    except ImportError:
        return jsonify({"error": "PyYAML 未安装"}), 500


def generate_openapi_files(output_dir: str = "docs"):
    """
    生成 OpenAPI 文档文件

    Args:
        output_dir: 输出目录
    """
    import os
    os.makedirs(output_dir, exist_ok=True)

    # 生成 JSON 文件
    json_path = os.path.join(output_dir, "openapi-voice.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(OPENAPI_SPEC, f, ensure_ascii=False, indent=2)
    print(f"✅ OpenAPI JSON 规范已生成: {json_path}")

    # 生成 YAML 文件
    try:
        import yaml
        yaml_path = os.path.join(output_dir, "openapi-voice.yaml")
        with open(yaml_path, 'w', encoding='utf-8') as f:
            yaml.dump(OPENAPI_SPEC, f, allow_unicode=True, default_flow_style=False)
        print(f"✅ OpenAPI YAML 规范已生成: {yaml_path}")
    except ImportError:
        print("⚠️  PyYAML 未安装，跳过 YAML 生成")


if __name__ == "__main__":
    generate_openapi_files()
