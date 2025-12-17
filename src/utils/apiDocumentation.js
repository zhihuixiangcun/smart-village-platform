/**
 * 智慧村庄平台 - API文档生成器
 * 自动生成和维护API接口文档
 */

const fs = require('fs');
const path = require('path');

class APIDocumentationGenerator {
  constructor() {
    this.apiEndpoints = new Map();
    this.schemas = new Map();
    this.examples = new Map();
  }

  /**
   * 注册API端点
   */
  registerEndpoint(method, path, config) {
    const key = `${method.toUpperCase()} ${path}`;
    this.apiEndpoints.set(key, {
      method: method.toUpperCase(),
      path,
      summary: config.summary || `${method} ${path}`,
      description: config.description || '',
      parameters: config.parameters || [],
      requestBody: config.requestBody || null,
      responses: config.responses || {},
      tags: config.tags || [],
      security: config.security || [],
      middleware: config.middleware || []
    });
  }

  /**
   * 注册数据模型
   */
  registerSchema(name, schema) {
    this.schemas.set(name, schema);
  }

  /**
   * 注册示例数据
   */
  registerExample(name, example) {
    this.examples.set(name, example);
  }

  /**
   * 生成OpenAPI 3.0规范文档
   */
  generateOpenAPIDocument() {
    const doc = {
      openapi: '3.0.3',
      info: {
        title: '智慧村庄平台 API',
        description: '智慧村庄平台RESTful API接口文档，提供用户管理、村务治理、财务管理、应急响应等功能',
        version: '1.0.0',
        contact: {
          name: 'Smart Village Team',
          email: 'support@smartvillage.com'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: process.env.API_BASE_URL || 'https://api.smartvillage.com/v1',
          description: '生产环境'
        },
        {
          url: 'https://staging-api.smartvillage.com/v1',
          description: '测试环境'
        },
        {
          url: 'http://localhost:3001/api/v1',
          description: '开发环境'
        }
      ],
      security: [
        {
          BearerAuth: []
        },
        {
          ApiKeyAuth: []
        }
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT身份验证令牌'
          },
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API密钥认证'
          }
        },
        schemas: this.generateSchemas(),
        examples: this.generateExamples()
      },
      paths: this.generatePaths(),
      tags: this.generateTags()
    };

    return doc;
  }

  /**
   * 生成数据模型定义
   */
  generateSchemas() {
    const schemas = {};

    // 用户模型
    schemas.User = {
      type: 'object',
      required: ['id', 'name', 'role'],
      properties: {
        id: {
          type: 'string',
          description: '用户唯一标识',
          example: 'user-001'
        },
        name: {
          type: 'string',
          description: '用户姓名',
          example: '张三'
        },
        email: {
          type: 'string',
          format: 'email',
          description: '电子邮箱',
          example: 'zhangsan@example.com'
        },
        phone: {
          type: 'string',
          description: '手机号码',
          example: '13812345678'
        },
        role: {
          type: 'string',
          enum: ['resident', 'village_admin', 'accountant', 'super_admin'],
          description: '用户角色',
          example: 'resident'
        },
        villageId: {
          type: 'string',
          description: '所属村庄ID',
          example: 'village-001'
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'suspended'],
          description: '账户状态',
          example: 'active'
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: '创建时间',
          example: '2025-01-01T00:00:00Z'
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: '更新时间',
          example: '2025-01-01T00:00:00Z'
        }
      }
    };

    // 公告模型
    schemas.Announcement = {
      type: 'object',
      required: ['id', 'title', 'content', 'authorId'],
      properties: {
        id: {
          type: 'string',
          description: '公告ID',
          example: 'announcement-001'
        },
        title: {
          type: 'string',
          description: '公告标题',
          example: '关于春节期间村务安排的通知'
        },
        content: {
          type: 'string',
          description: '公告内容',
          example: '各位村民朋友，春节期间村务安排如下...'
        },
        category: {
          type: 'string',
          enum: ['general', 'emergency', 'policy', 'activity'],
          description: '公告分类',
          example: 'general'
        },
        status: {
          type: 'string',
          enum: ['draft', 'published', 'archived'],
          description: '发布状态',
          example: 'published'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: '优先级',
          example: 'medium'
        },
        authorId: {
          type: 'string',
          description: '发布者ID',
          example: 'admin-001'
        },
        villageId: {
          type: 'string',
          description: '村庄ID',
          example: 'village-001'
        },
        publishedAt: {
          type: 'string',
          format: 'date-time',
          description: '发布时间',
          example: '2025-01-01T00:00:00Z'
        },
        expiresAt: {
          type: 'string',
          format: 'date-time',
          description: '过期时间',
          example: '2025-02-01T00:00:00Z'
        }
      }
    };

    // 交易模型
    schemas.Transaction = {
      type: 'object',
      required: ['id', 'type', 'amount', 'description'],
      properties: {
        id: {
          type: 'string',
          description: '交易ID',
          example: 'transaction-001'
        },
        type: {
          type: 'string',
          enum: ['income', 'expense', 'transfer'],
          description: '交易类型',
          example: 'expense'
        },
        amount: {
          type: 'number',
          format: 'decimal',
          description: '交易金额',
          example: 1000.00
        },
        currency: {
          type: 'string',
          description: '货币单位',
          example: 'CNY'
        },
        description: {
          type: 'string',
          description: '交易描述',
          example: '购买办公用品'
        },
        category: {
          type: 'string',
          enum: ['administrative', 'infrastructure', 'welfare', 'emergency'],
          description: '交易分类',
          example: 'administrative'
        },
        status: {
          type: 'string',
          enum: ['pending', 'approved', 'rejected', 'completed'],
          description: '审批状态',
          example: 'pending'
        },
        createdBy: {
          type: 'string',
          description: '创建者ID',
          example: 'user-001'
        },
        approvedBy: {
          type: 'string',
          description: '审批者ID',
          example: 'admin-001'
        },
        villageId: {
          type: 'string',
          description: '村庄ID',
          example: 'village-001'
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: '创建时间',
          example: '2025-01-01T00:00:00Z'
        },
        approvedAt: {
          type: 'string',
          format: 'date-time',
          description: '审批时间',
          example: '2025-01-02T00:00:00Z'
        }
      }
    };

    // 应急报告模型
    schemas.EmergencyReport = {
      type: 'object',
      required: ['id', 'type', 'description', 'location', 'reportedBy'],
      properties: {
        id: {
          type: 'string',
          description: '报告ID',
          example: 'emergency-001'
        },
        type: {
          type: 'string',
          enum: ['fire', 'medical', 'security', 'natural_disaster', 'infrastructure'],
          description: '应急类型',
          example: 'medical'
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: '严重程度',
          example: 'medium'
        },
        description: {
          type: 'string',
          description: '事件描述',
          example: '老人突发心脏病，需要紧急医疗救助'
        },
        location: {
          type: 'object',
          description: '事件位置',
          properties: {
            address: {
              type: 'string',
              example: '幸福路1号'
            },
            latitude: {
              type: 'number',
              example: 39.9042
            },
            longitude: {
              type: 'number',
              example: 116.4074
            }
          }
        },
        status: {
          type: 'string',
          enum: ['reported', 'in_progress', 'resolved', 'closed'],
          description: '处理状态',
          example: 'reported'
        },
        reportedBy: {
          type: 'string',
          description: '报告者ID',
          example: 'user-001'
        },
        assignedTo: {
          type: 'string',
          description: '处理人员ID',
          example: 'officer-001'
        },
        villageId: {
          type: 'string',
          description: '村庄ID',
          example: 'village-001'
        },
        reportedAt: {
          type: 'string',
          format: 'date-time',
          description: '报告时间',
          example: '2025-01-01T00:00:00Z'
        },
        resolvedAt: {
          type: 'string',
          format: 'date-time',
          description: '解决时间',
          example: '2025-01-01T01:00:00Z'
        }
      }
    };

    // 产品模型
    schemas.Product = {
      type: 'object',
      required: ['id', 'name', 'price', 'category'],
      properties: {
        id: {
          type: 'string',
          description: '产品ID',
          example: 'product-001'
        },
        name: {
          type: 'string',
          description: '产品名称',
          example: '有机蔬菜套装'
        },
        description: {
          type: 'string',
          description: '产品描述',
          example: '新鲜有机蔬菜，包含西红柿、黄瓜、青菜等'
        },
        price: {
          type: 'number',
          format: 'decimal',
          description: '产品价格',
          example: 29.99
        },
        currency: {
          type: 'string',
          description: '货币单位',
          example: 'CNY'
        },
        category: {
          type: 'string',
          enum: ['agriculture', 'handicraft', 'food', 'service'],
          description: '产品分类',
          example: 'agriculture'
        },
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'uri'
          },
          description: '产品图片',
          example: ['https://example.com/image1.jpg']
        },
        stock: {
          type: 'integer',
          description: '库存数量',
          example: 100
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'out_of_stock'],
          description: '产品状态',
          example: 'active'
        },
        sellerId: {
          type: 'string',
          description: '卖家ID',
          example: 'farmer-001'
        },
        villageId: {
          type: 'string',
          description: '村庄ID',
          example: 'village-001'
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: '创建时间',
          example: '2025-01-01T00:00:00Z'
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: '更新时间',
          example: '2025-01-01T00:00:00Z'
        }
      }
    };

    // 订单模型
    schemas.Order = {
      type: 'object',
      required: ['id', 'userId', 'items', 'totalAmount'],
      properties: {
        id: {
          type: 'string',
          description: '订单ID',
          example: 'order-001'
        },
        userId: {
          type: 'string',
          description: '用户ID',
          example: 'user-001'
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                example: 'product-001'
              },
              quantity: {
                type: 'integer',
                example: 2
              },
              price: {
                type: 'number',
                example: 29.99
              },
              subtotal: {
                type: 'number',
                example: 59.98
              }
            }
          },
          description: '订单项目'
        },
        totalAmount: {
          type: 'number',
          format: 'decimal',
          description: '订单总金额',
          example: 59.98
        },
        status: {
          type: 'string',
          enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
          description: '订单状态',
          example: 'pending'
        },
        paymentStatus: {
          type: 'string',
          enum: ['pending', 'paid', 'refunded'],
          description: '支付状态',
          example: 'pending'
        },
        shippingAddress: {
          type: 'object',
          description: '配送地址',
          properties: {
            street: {
              type: 'string',
              example: '幸福路1号'
            },
            city: {
              type: 'string',
              example: '智慧村'
            },
            province: {
              type: 'string',
              example: '江苏省'
            },
            postalCode: {
              type: 'string',
              example: '210000'
            }
          }
        },
        villageId: {
          type: 'string',
          description: '村庄ID',
          example: 'village-001'
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: '创建时间',
          example: '2025-01-01T00:00:00Z'
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: '更新时间',
          example: '2025-01-01T00:00:00Z'
        }
      }
    };

    // 通用响应模型
    schemas.APIResponse = {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: '请求是否成功',
          example: true
        },
        data: {
          description: '响应数据',
          example: null
        },
        message: {
          type: 'string',
          description: '响应消息',
          example: '操作成功'
        },
        error: {
          type: 'string',
          description: '错误信息',
          example: null
        },
        code: {
          type: 'string',
          description: '错误代码',
          example: null
        },
        pagination: {
          type: 'object',
          description: '分页信息',
          properties: {
            page: {
              type: 'integer',
              example: 1
            },
            limit: {
              type: 'integer',
              example: 20
            },
            total: {
              type: 'integer',
              example: 100
            }
          }
        }
      }
    };

    return schemas;
  }

  /**
   * 生成示例数据
   */
  generateExamples() {
    return {
      User: {
        value: {
          id: 'user-001',
          name: '张三',
          email: 'zhangsan@example.com',
          phone: '13812345678',
          role: 'resident',
          villageId: 'village-001',
          status: 'active',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        }
      },
      Announcement: {
        value: {
          id: 'announcement-001',
          title: '关于春节期间村务安排的通知',
          content: '各位村民朋友，春节期间村务安排如下...',
          category: 'general',
          status: 'published',
          priority: 'medium',
          authorId: 'admin-001',
          villageId: 'village-001',
          publishedAt: '2025-01-01T00:00:00Z',
          expiresAt: '2025-02-01T00:00:00Z'
        }
      },
      Transaction: {
        value: {
          id: 'transaction-001',
          type: 'expense',
          amount: 1000.00,
          currency: 'CNY',
          description: '购买办公用品',
          category: 'administrative',
          status: 'pending',
          createdBy: 'user-001',
          villageId: 'village-001',
          createdAt: '2025-01-01T00:00:00Z'
        }
      },
      EmergencyReport: {
        value: {
          id: 'emergency-001',
          type: 'medical',
          severity: 'medium',
          description: '老人突发心脏病，需要紧急医疗救助',
          location: {
            address: '幸福路1号',
            latitude: 39.9042,
            longitude: 116.4074
          },
          status: 'reported',
          reportedBy: 'user-001',
          villageId: 'village-001',
          reportedAt: '2025-01-01T00:00:00Z'
        }
      },
      Product: {
        value: {
          id: 'product-001',
          name: '有机蔬菜套装',
          description: '新鲜有机蔬菜，包含西红柿、黄瓜、青菜等',
          price: 29.99,
          currency: 'CNY',
          category: 'agriculture',
          images: ['https://example.com/image1.jpg'],
          stock: 100,
          status: 'active',
          sellerId: 'farmer-001',
          villageId: 'village-001',
          createdAt: '2025-01-01T00:00:00Z'
        }
      },
      Order: {
        value: {
          id: 'order-001',
          userId: 'user-001',
          items: [
            {
              productId: 'product-001',
              quantity: 2,
              price: 29.99,
              subtotal: 59.98
            }
          ],
          totalAmount: 59.98,
          status: 'pending',
          paymentStatus: 'pending',
          villageId: 'village-001',
          createdAt: '2025-01-01T00:00:00Z'
        }
      }
    };
  }

  /**
   * 生成API路径定义
   */
  generatePaths() {
    const paths = {};

    // 用户管理API
    paths['/users'] = {
      get: {
        tags: ['用户管理'],
        summary: '获取用户列表',
        description: '分页获取用户列表，支持搜索和筛选',
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: '页码',
            schema: { type: 'integer', default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            description: '每页数量',
            schema: { type: 'integer', default: 20 }
          },
          {
            name: 'search',
            in: 'query',
            description: '搜索关键词',
            schema: { type: 'string' }
          },
          {
            name: 'role',
            in: 'query',
            description: '用户角色筛选',
            schema: {
              type: 'string',
              enum: ['resident', 'village_admin', 'accountant', 'super_admin']
            }
          },
          {
            name: 'villageId',
            in: 'query',
            description: '村庄ID筛选',
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: '成功获取用户列表',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/APIResponse' },
                examples: {
                  userList: {
                    value: {
                      success: true,
                      data: {
                        users: [{ $ref: '#/components/examples/User/value' }],
                        total: 100
                      },
                      pagination: {
                        page: 1,
                        limit: 20,
                        total: 100
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['用户管理'],
        summary: '创建用户',
        description: '创建新的用户账户',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' }
            }
          }
        },
        responses: {
          201: {
            description: '用户创建成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/APIResponse' },
                examples: {
                  userCreated: {
                    value: {
                      success: true,
                      data: { $ref: '#/components/examples/User/value' },
                      message: '用户创建成功'
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    paths['/users/{id}'] = {
      get: {
        tags: ['用户管理'],
        summary: '获取用户详情',
        description: '根据用户ID获取用户详细信息',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: '用户ID',
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: '成功获取用户信息',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/APIResponse' },
                examples: {
                  userDetail: {
                    value: {
                      success: true,
                      data: { $ref: '#/components/examples/User/value' }
                    }
                  }
                }
              }
            }
          },
          404: {
            description: '用户不存在'
          }
        }
      },
      put: {
        tags: ['用户管理'],
        summary: '更新用户信息',
        description: '更新指定用户的信息',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: '用户ID',
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  role: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: '用户信息更新成功'
          },
          400: {
            description: '请求参数错误'
          },
          404: {
            description: '用户不存在'
          }
        }
      },
      delete: {
        tags: ['用户管理'],
        summary: '删除用户',
        description: '删除指定的用户账户',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: '用户ID',
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: '用户删除成功'
          },
          404: {
            description: '用户不存在'
          }
        }
      }
    };

    // 村务管理API
    paths['/village/announcements'] = {
      get: {
        tags: ['村务管理'],
        summary: '获取公告列表',
        description: '分页获取村庄公告列表',
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20 }
          },
          {
            name: 'category',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['general', 'emergency', 'policy', 'activity']
            }
          },
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['draft', 'published', 'archived']
            }
          }
        ],
        responses: {
          200: {
            description: '成功获取公告列表'
          }
        }
      },
      post: {
        tags: ['村务管理'],
        summary: '创建公告',
        description: '发布新的村庄公告',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Announcement' }
            }
          }
        },
        responses: {
          201: {
            description: '公告创建成功'
          }
        }
      }
    };

    return paths;
  }

  /**
   * 生成API标签
   */
  generateTags() {
    return [
      {
        name: '用户管理',
        description: '用户账户管理相关接口'
      },
      {
        name: '村务管理',
        description: '村庄事务管理相关接口'
      },
      {
        name: '财务管理',
        description: '财务透明化管理相关接口'
      },
      {
        name: '应急管理',
        description: '应急事件管理相关接口'
      },
      {
        name: '数据分析',
        description: '数据统计和分析相关接口'
      },
      {
        name: '电子商务',
        description: '农产品电子商务相关接口'
      },
      {
        name: '支付管理',
        description: '支付交易管理相关接口'
      },
      {
        name: '权限管理',
        description: '用户权限和角色管理相关接口'
      }
    ];
  }

  /**
   * 生成HTML格式的API文档
   */
  generateHTMLDocumentation() {
    const doc = this.generateOpenAPIDocument();

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${doc.info.title} - API文档</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
        .endpoint { background: #fff; border: 1px solid #ddd; margin-bottom: 20px; border-radius: 5px; }
        .endpoint-header { background: #007bff; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
        .method-get { background: #28a745; }
        .method-post { background: #007bff; }
        .method-put { background: #ffc107; color: #000; }
        .method-delete { background: #dc3545; }
        .endpoint-body { padding: 20px; }
        .parameter { background: #f8f9fa; padding: 10px; margin: 10px 0; border-left: 4px solid #007bff; }
        .response { background: #d4edda; padding: 10px; margin: 10px 0; border-left: 4px solid #28a745; }
        .schema { background: #e2e3e5; padding: 15px; margin: 10px 0; border-radius: 3px; }
        .example { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 3px; font-family: monospace; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${doc.info.title}</h1>
        <p>${doc.info.description}</p>
        <p><strong>版本:</strong> ${doc.info.version}</p>
        <p><strong>基础URL:</strong> ${doc.servers[0].url}</p>
    </div>

    <h2>认证方式</h2>
    <div class="endpoint">
        <div class="endpoint-header">Bearer Token 认证</div>
        <div class="endpoint-body">
            <p>在请求头中添加: <code>Authorization: Bearer &lt;your-jwt-token&gt;</code></p>
        </div>
    </div>

    <h2>主要功能模块</h2>
    ${doc.tags.map(tag => `
    <div class="endpoint">
        <div class="endpoint-header">${tag.name}</div>
        <div class="endpoint-body">
            <p>${tag.description}</p>
        </div>
    </div>
    `).join('')}

    <h2>API接口列表</h2>
    <div class="endpoint">
        <div class="endpoint-header method-get">GET /api/v1/users</div>
        <div class="endpoint-body">
            <h3>获取用户列表</h3>
            <p>分页获取用户列表，支持搜索和筛选</p>

            <h4>查询参数:</h4>
            <div class="parameter">
                <strong>page</strong> (integer): 页码，默认为1<br>
                <strong>limit</strong> (integer): 每页数量，默认为20<br>
                <strong>search</strong> (string): 搜索关键词<br>
                <strong>role</strong> (string): 用户角色筛选<br>
                <strong>villageId</strong> (string): 村庄ID筛选
            </div>

            <h4>响应示例:</h4>
            <div class="example">
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-001",
        "name": "张三",
        "email": "zhangsan@example.com",
        "role": "resident",
        "villageId": "village-001",
        "status": "active",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "total": 100
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
            </div>
        </div>
    </div>

    <div class="endpoint">
        <div class="endpoint-header method-post">POST /api/v1/users</div>
        <div class="endpoint-body">
            <h3>创建用户</h3>
            <p>创建新的用户账户</p>

            <h4>请求体:</h4>
            <div class="example">
{
  "name": "李四",
  "email": "lisi@example.com",
  "phone": "13812345679",
  "role": "resident",
  "villageId": "village-001"
}
            </div>

            <h4>响应示例:</h4>
            <div class="example">
{
  "success": true,
  "data": {
    "id": "user-002",
    "name": "李四",
    "email": "lisi@example.com",
    "role": "resident",
    "villageId": "village-001",
    "status": "active",
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "message": "用户创建成功"
}
            </div>
        </div>
    </div>

    <div class="endpoint">
        <div class="endpoint-header method-get">GET /api/v1/village/announcements</div>
        <div class="endpoint-body">
            <h3>获取公告列表</h3>
            <p>分页获取村庄公告列表</p>
        </div>
    </div>

    <div class="endpoint">
        <div class="endpoint-header method-post">POST /api/v1/village/announcements</div>
        <div class="endpoint-body">
            <h3>创建公告</h3>
            <p>发布新的村庄公告</p>
        </div>
    </div>

    <div class="endpoint">
        <div class="endpoint-header method-get">GET /api/v1/finance/transactions</div>
        <div class="endpoint-body">
            <h3>获取交易记录</h3>
            <p>获取村庄财务交易记录列表</p>
        </div>
    </div>

    <div class="endpoint">
        <div class="endpoint-header method-post">POST /api/v1/finance/transactions</div>
        <div class="endpoint-body">
            <h3>创建交易记录</h3>
            <p>记录新的财务交易</p>
        </div>
    </div>

    <h2>数据模型</h2>
    <div class="schema">
        <h3>用户模型 (User)</h3>
        <pre>${JSON.stringify(doc.components.schemas.User, null, 2)}</pre>
    </div>

    <div class="schema">
        <h3>公告模型 (Announcement)</h3>
        <pre>${JSON.stringify(doc.components.schemas.Announcement, null, 2)}</pre>
    </div>

    <div class="schema">
        <h3>交易模型 (Transaction)</h3>
        <pre>${JSON.stringify(doc.components.schemas.Transaction, null, 2)}</pre>
    </div>

    <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
        <p>API文档自动生成于 ${new Date().toLocaleString('zh-CN')}</p>
        <p>${doc.info.title} v${doc.info.version}</p>
    </footer>
</body>
</html>
    `;
  }

  /**
   * 保存文档到文件
   */
  saveDocumentation(outputPath) {
    const openAPIDoc = this.generateOpenAPIDocument();
    const htmlDoc = this.generateHTMLDocumentation();

    // 保存OpenAPI JSON文档
    fs.writeFileSync(
      path.join(outputPath, 'openapi.json'),
      JSON.stringify(openAPIDoc, null, 2),
      'utf8'
    );

    // 保存HTML文档
    fs.writeFileSync(
      path.join(outputPath, 'api-documentation.html'),
      htmlDoc,
      'utf8'
    );

    console.log('📄 API文档已生成:');
    console.log(`  - OpenAPI: ${path.join(outputPath, 'openapi.json')}`);
    console.log(`  - HTML: ${path.join(outputPath, 'api-documentation.html')}`);
  }

  /**
   * 生成Postman集合
   */
  generatePostmanCollection() {
    return {
      info: {
        name: '智慧村庄平台 API',
        description: '智慧村庄平台RESTful API接口集合',
        version: '1.0.0',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: '{{jwt_token}}',
            type: 'string'
          }
        ]
      },
      variable: [
        {
          key: 'base_url',
          value: 'http://localhost:3001/api/v1',
          type: 'string'
        },
        {
          key: 'jwt_token',
          value: 'your-jwt-token-here',
          type: 'string'
        }
      ],
      item: [
        {
          name: '用户管理',
          item: [
            {
              name: '获取用户列表',
              request: {
                method: 'GET',
                header: [],
                url: {
                  raw: '{{base_url}}/users?page=1&limit=20',
                  host: ['{{base_url}}'],
                  path: ['users'],
                  query: [
                    { key: 'page', value: '1' },
                    { key: 'limit', value: '20' }
                  ]
                }
              }
            },
            {
              name: '创建用户',
              request: {
                method: 'POST',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json'
                  }
                ],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({
                    name: '测试用户',
                    email: 'test@example.com',
                    phone: '13812345678',
                    role: 'resident',
                    villageId: 'village-001'
                  }, null, 2)
                },
                url: {
                  raw: '{{base_url}}/users',
                  host: ['{{base_url}}'],
                  path: ['users']
                }
              }
            }
          ]
        },
        {
          name: '村务管理',
          item: [
            {
              name: '获取公告列表',
              request: {
                method: 'GET',
                header: [],
                url: {
                  raw: '{{base_url}}/village/announcements',
                  host: ['{{base_url}}'],
                  path: ['village', 'announcements']
                }
              }
            },
            {
              name: '创建公告',
              request: {
                method: 'POST',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json'
                  }
                ],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({
                    title: '测试公告',
                    content: '这是一个测试公告内容',
                    category: 'general',
                    priority: 'medium'
                  }, null, 2)
                },
                url: {
                  raw: '{{base_url}}/village/announcements',
                  host: ['{{base_url}}'],
                  path: ['village', 'announcements']
                }
              }
            }
          ]
        }
      ]
    };
  }
}

// 创建全局实例
const apiDocGenerator = new APIDocumentationGenerator();

// 注册所有API端点
apiDocGenerator.registerEndpoint('get', '/users', {
  summary: '获取用户列表',
  description: '分页获取用户列表，支持搜索和筛选',
  tags: ['用户管理'],
  parameters: [
    { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
    { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
    { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
    { name: 'role', in: 'query', required: false, schema: { type: 'string' } }
  ],
  responses: {
    200: { description: '成功获取用户列表' },
    400: { description: '请求参数错误' },
    500: { description: '服务器内部错误' }
  }
});

apiDocGenerator.registerEndpoint('post', '/users', {
  summary: '创建用户',
  description: '创建新的用户账户',
  tags: ['用户管理'],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/User' }
      }
    }
  },
  responses: {
    201: { description: '用户创建成功' },
    400: { description: '请求参数错误' },
    500: { description: '服务器内部错误' }
  }
});

module.exports = {
  apiDocGenerator,
  APIDocumentationGenerator
};