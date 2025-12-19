#!/bin/bash

# 智慧乡村平台测试环境搭建脚本
# 创建全面的自动化测试环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "命令 '$1' 未找到，请先安装"
        exit 1
    fi
}

# 安装Node.js依赖
install_nodejs() {
    log_info "检查Node.js环境..."

    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_success "Node.js已安装: $NODE_VERSION"

        # 检查npm版本
        if command -v npm &> /dev/null; then
            NPM_VERSION=$(npm --version)
            log_success "npm已安装: $NPM_VERSION"
        fi
    else
        log_error "Node.js未安装，请先安装Node.js"
        exit 1
    fi
}

# 安装测试依赖
install_test_dependencies() {
    log_info "安装测试依赖..."

    # 开发依赖
    npm install --save-dev jest @types/jest supertest jest-environment-node
    npm install --save-dev @testing-library/jest-dom @testing-library/vue
    npm install --save-dev @testing-library/user-event
    npm install --save-dev vue-test-utils

    # 测试工具
    npm install --save-dev nyc @istanbul/nyc-config-jest
    npm install --save-dev husky lint-staged
    npm install --save-dev start-server-and-test

    # 代码覆盖率
    npm install --save-dev jest coverage

    log_success "测试依赖安装完成"
}

# 配置Jest
configure_jest() {
    log_info "配置Jest测试框架..."

    # 创建Jest配置文件
    cat > jest.config.js << 'EOF'
module.exports = {
  preset: '@vue/cli-plugin-unit/jest',
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'clover'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js',
    '**/tests/e2e/**/*.test.js'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  testTimeout: 30000,
  maxWorkers: 1,
  forceExit: true
}
EOF

    log_success "Jest配置完成"
}

# 创建测试目录结构
create_test_structure() {
    log_info "创建测试目录结构..."

    mkdir -p tests/{unit,integration,e2e,fixtures,helpers,utils}
    mkdir -p tests/unit/{controllers,services,models,middleware,routes,utils}
    mkdir -p tests/integration/{api,database,auth}
    mkdir -p tests/e2e/{critical-workflows,user-journeys,compatibility}
    mkdir -p coverage

    log_success "测试目录结构创建完成"
}

# 创建测试设置文件
create_test_setup() {
    log_info "创建测试设置文件..."

    cat > tests/setup.js << 'EOF'
const { TextEncoder, TextDecoder } = require('util')

// 全局测试设置
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// 模拟环境变量
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.DB_URI = 'mongodb://localhost:27017/smart-village-test'

// 设置测试超时
jest.setTimeout(30000)

// 抑制console方法以避免测试输出干扰
const originalConsole = global.console
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

// 清理函数
afterAll(() => {
  global.console = originalConsole
})
EOF

    log_success "测试设置文件创建完成"
}

# 创建单元测试示例
create_unit_test_examples() {
    log_info "创建单元测试示例..."

    # 权限服务测试
    cat > tests/unit/services/permissionService.test.js << 'EOF'
const PermissionService = require('../../../src/services/permissionService')
const User = require('../../../src/models/User')

describe('PermissionService', () => {
  let permissionService

  beforeEach(() => {
    permissionService = new PermissionService()
  })

  describe('checkPermission', () => {
    test('应该允许管理员访问所有资源', async () => {
      const user = { role: 'super_admin' }

      const result = await permissionService.checkPermission(user, 'user', 'create')
      expect(result).toBe(true)
    })

    test('应该拒绝普通用户访问敏感操作', async () => {
      const user = { role: 'villager' }

      const result = await permissionService.checkPermission(user, 'system', 'config')
      expect(result).toBe(false)
    })
  })

  describe('getUserPermissions', () => {
    test('应该返回超级管理员的所有权限', async () => {
      const user = { role: 'super_admin' }

      const permissions = await permissionService.getUserPermissions(user)
      expect(permissions).toContain('user:create')
      expect(permissions).toContain('*:read')
    })
  })

  describe('sanitizeData', () => {
    test('应该对敏感数据进行脱敏', () => {
      const data = {
        idCard: '320123199001011234',
        phone: '13812345678',
        password: 'secret123'
      }

      const user = { role: 'villager' }
      const sanitized = permissionService.sanitizeData(data, user)

      expect(sanitized.password).toBe('***')
      expect(sanitized.idCard).toBe('320123********1234')
      expect(sanitized.phone).toBe('138****5678')
    })
  })
})
EOF

    log_success "权限服务单元测试示例创建完成"
}

# 创建集成测试示例
create_integration_test_examples() {
    log_info "创建集成测试示例..."

    # API集成测试
    cat > tests/integration/api/auth.test.js << 'EOF'
const request = require('supertest')
const app = require('../../../src/app')
const User = require('../../../src/models/User')

describe('Authentication API', () => {
  describe('POST /api/v1/auth/login', () => {
    let testUser

    beforeEach(async () => {
      testUser = new User({
        auth: {
          username: 'testuser',
          password: 'testpassword123'
        },
        profile: {
          displayName: 'Test User'
        }
      })

      await testUser.save()
    })

    afterEach(async () => {
      await User.deleteMany({})
    })

    test('应该成功登录有效用户', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser',
          password: 'testpassword123'
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user).toBeDefined()
      expect(response.body.data.token).toBeDefined()
    })

    test('应该拒绝无效凭据', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        })
        .expect(401)

      expect(response.body.success).toBe(false)
    })
  })
})
EOF

    log_success "API集成测试示例创建完成"
}

# 创建E2E测试示例
create_e2e_test_examples() {
    log_info "创建E2E测试示例..."

    # 用户登录流程测试
    cat > tests/e2e/user-journeys/login.test.js << 'EOF'
const { chromium } = require('playwright')

describe('用户登录流程', () => {
  let browser, page

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true })
    page = await browser.newPage()
  })

  afterAll(async () => {
    await browser.close()
  })

  test('应该成功完成登录流程', async () => {
    // 访问登录页
    await page.goto('http://localhost:3000/login')

    // 检查页面标题
    const title = await page.title()
    expect(title).toBe('智慧乡村管理平台')

    // 输入用户名
    await page.fill('#username', 'testuser')

    // 输入密码
    await page.fill('#password', 'testpassword123')

    // 点击登录按钮
    await page.click('#login-btn')

    // 等待页面跳转
    await page.waitForURL('**/dashboard')

    // 验证登录成功
    const url = page.url()
    expect(url).toContain('/dashboard')

    // 检查是否显示用户信息
    const userName = await page.textContent('.user-info')
    expect(userName).toContain('Test User')
  })

  test('应该在登录失败时显示错误信息', async () => {
    await page.goto('http://localhost:3000/login')

    // 输入错误的凭据
    await page.fill('#username', 'wronguser')
    await page.fill('#password', 'wrongpassword')

    // 点击登录按钮
    await page.click('#login-btn')

    // 等待错误信息显示
    await page.waitForSelector('.error-message')

    const errorMessage = await page.textContent('.error-message')
    expect(errorMessage).toContain('用户名或密码错误')
  })
})
EOF

    log_success "E2E测试示例创建完成"
}

# 创建测试工具类
create_test_helpers() {
    log_info "创建测试工具类..."

    # 测试数据库工具
    cat > tests/helpers/database.js << 'EOF'
const mongoose = require('mongoose')
const config = require('../../config/databaseOptimized')

class DatabaseHelper {
  constructor() {
    this.db = null
  }

  async connect() {
    try {
      this.db = new config.OptimizedDatabase({
        primaryUri: process.env.TEST_DB_URI || 'mongodb://localhost:27017/smart-village-test',
        maxPoolSize: 1,
        minPoolSize: 0
      })
      await this.db.connect()
    } catch (error) {
      console.error('Database connection failed:', error)
      throw error
    }
  }

  async disconnect() {
    if (this.db) {
      await this.db.disconnect()
    }
  }

  async clearDatabase() {
    const collections = mongoose.connection.collections
    for (const collection of collections) {
      await collection.deleteMany({})
    }
  }

  async seedTestData() {
    // 创建测试用户
    const User = require('../../models/User')
    const testUsers = [
      {
        role: 'super_admin',
        auth: {
          username: 'admin',
          password: '$2b$10$example.hash' // 需要实际的bcrypt hash
        },
        profile: {
          displayName: 'Admin User'
        }
      },
      {
        role: 'villager',
        auth: {
          username: 'villager',
          password: '$2b$10$example.hash'
        },
        profile: {
          displayName: 'Test Villager'
        }
      }
    ]

    await User.insertMany(testUsers)
  }
}

module.exports = DatabaseHelper
EOF

    # 测试HTTP工具
    cat > tests/helpers/http.js << 'EOF'
const request = require('supertest')

class HttpHelper {
  constructor(baseURL) {
    this.baseURL = baseURL
  }

  async get(path, options = {}) {
    return request(this.baseURL).get(path).set(options.headers || {})
  }

  async post(path, data = {}, options = {}) {
    return request(this.baseURL)
      .post(path)
      .send(data)
      .set(options.headers || {})
  }

  async put(path, data = {}, options = {}) {
    return request(this.baseURL)
      .put(path)
      .send(data)
      .set(options.headers || {})
  }

  async delete(path, options = {}) {
    return request(this.baseURL)
      .delete(path)
      .set(options.headers || {})
  }

  async upload(path, file, options = {}) {
    return request(this.baseURL)
      .post(path)
      .attach('file', file)
      .set(options.headers || {})
  }
}

module.exports = HttpHelper
EOF

    log_success "测试工具类创建完成"
}

# 创建测试配置文件
create_test_configs() {
    log_info "创建测试配置文件..."

    # Jest配置
    cat > jest.config.minimal.js << 'EOF'
module.exports = {
  testEnvironment: 'node',
  testTimeout: 10000,
  forceExit: true
}
EOF

    # 简化Jest配置
    cat > jest.config.standalone.js << 'EOF'
module.exports = {
  testEnvironment: 'node',
  rootDir: 'tests',
  testMatch: ['<rootDir>/test-*.js'],
  collectCoverage: false,
  verbose: true
}
EOF

    # 通知配置
    cat > jest.config.notifications.js << 'EOF'
module.exports = {
  testEnvironment: 'node',
  notify: true,
  notifyMode: 'failure-change',
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
}
EOF

    log_success "测试配置文件创建完成"
}

# 创建测试数据库配置
create_test_database() {
    log_info "创建测试数据库配置..."

    cat > tests/config/test-database.js << 'EOF'
const mongoose = require('mongoose')

const testDatabase = {
  connect: async () => {
    try {
      await mongoose.connect(
        process.env.TEST_DB_URI || 'mongodb://localhost:27017/smart-village-test',
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          maxPoolSize: 5,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        }
      )

      console.log('Test database connected successfully')
    } catch (error) {
      console.error('Test database connection failed:', error)
      throw error
    }
  },

  disconnect: async () => {
    await mongoose.connection.close()
    console.log('Test database disconnected')
  },

  clear: async () => {
    const collections = mongoose.connection.collections
    for (const collection of collections) {
      await collection.deleteMany({})
    }
    console.log('Test database cleared')
  }
}

module.exports = testDatabase
EOF

    log_success "测试数据库配置创建完成"
}

# 创建测试运行脚本
create_test_scripts() {
    log_info "创建测试运行脚本..."

    # 主测试脚本
    cat > scripts/test.sh << 'EOF'
#!/bin/bash

# 主测试运行脚本
echo "🧪 开始运行测试..."

# 设置环境变量
export NODE_ENV=test
export TEST_DB_URI=mongodb://localhost:27017/smart-village-test

# 检查数据库连接
if ! node -e "require('./tests/config/test-database').connect()" 2>/dev/null; then
  echo "❌ 数据库连接失败，请先启动MongoDB"
  exit 1
fi

echo "✅ 数据库连接成功"

# 运行所有测试
npm test

# 检查测试覆盖率
if [ -f "coverage/lcov-report/index.html" ]; then
  echo "📊 测试覆盖率报告已生成: coverage/lcov-report/index.html"
fi

# 退出数据库连接
node -e "require('./tests/config/test-database').disconnect()"

echo "✅ 测试运行完成"
EOF

    chmod +x scripts/test.sh

    # 单元测试脚本
    cat > scripts/test-unit.sh << 'EOF
#!/bin/bash

echo "🧪 运行单元测试..."

# 运行单元测试
npm test -- tests/unit

echo "✅ 单元测试完成"
EOF

    chmod +x scripts/test-unit.sh

    # 集成测试脚本
    cat > scripts/test-integration.sh << 'EOF
#!/bin/bash

echo "🧪 运行集成测试..."

# 检查数据库连接
if ! node -e "require('./tests/config/test-database').connect()" 2>/dev/null; then
  echo "❌ 数据库连接失败，请先启动MongoDB"
  exit 1
fi

# 运行集成测试
npm test -- tests/integration

# 退出数据库连接
node -e "require('./tests/config/test-database').disconnect()"

echo "✅ 集成测试完成"
EOF

    chmod +x scripts/test-integration.sh

    # E2E测试脚本
    cat > scripts/test-e2e.sh << 'EOF
#!/bin/bash

echo "🧪 运行E2E测试..."

# 检查服务器是否运行
if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
  echo "❌ 应用服务器未运行，请先启动应用"
  exit 1
fi

# 检查Playwright是否安装
if ! npx playwright --version > /dev/null 2>&1; then
  echo "❌ Playwright未安装，运行: npm install playwright"
  exit 1
fi

# 安装Playwright浏览器
npx playwright install

# 运行E2E测试
npm test -- tests/e2e

echo "✅ E2E测试完成"
EOF

    chmod +x scripts/e2e.sh

    log_success "测试脚本创建完成"
}

# 创建测试数据生成器
create_test_fixtures() {
    log_info "创建测试数据生成器..."

    cat > tests/fixtures/userData.js << 'EOF'
// 测试用户数据
const users = [
  {
    role: 'super_admin',
    auth: {
      username: 'admin',
      password: 'admin123456'
    },
    profile: {
      displayName: '超级管理员',
      email: 'admin@smartvillage.com',
      phone: '13800138000'
    },
    village: {
      villageId: 'test-village-001',
      villageName: '测试村庄1'
    }
  },
  {
    role: 'village_admin',
    auth: {
      username: 'villageadmin',
      password: 'admin123456'
    },
    profile: {
      displayName: '村管理员',
      email: 'villageadmin@smartvillage.com',
      phone: '13800138001'
    },
    village: {
      villageId: 'test-village-002',
      villageName: '测试村庄2'
    }
  },
  {
    role: 'staff',
    auth: {
      username: 'staff',
      password: 'staff123456'
    },
    profile: {
      displayName: '工作人员',
      email: 'staff@smartvillage.com',
      phone: '13800138002'
    },
    village: {
      villageId: 'test-village-001',
      villageName: '测试村庄1'
    }
  },
  {
    role: 'villager',
    auth: {
      username: 'villager',
      password: 'villager123456'
    },
    profile: {
      displayName: '村民',
      email: 'villager@smartvillage.com',
      phone: '13800138003'
    },
    village: {
      villageId: 'test-village-001',
      villageName: 'main'
    }
  }
]

module.exports = { users }
EOF

    log_success "测试数据生成器创建完成"
}

# 创建package.json测试脚本
update_package_json() {
    log_info "更新package.json测试脚本..."

    # 更新根package.json
    if [ -f "package.json" ]; then
      npm pkg set --json '{
        "scripts": {
          "test": "jest",
          "test:unit": "jest -- tests/unit",
          "test:integration": "jest -- tests/integration",
          "test:e2e": "jest -- tests/e2e",
          "test:watch": "jest --watch",
          "test:coverage": "jest --coverage",
          "test:ci": "jest --ci --coverage --watchAll=false",
          "test:clean": "jest --clearCache",
          "lint:test": "eslint tests/ --ext .js",
          "pretest": "npm run lint:test",
          "posttest": "npm run test:coverage"
        }
      }'
    fi
}

# 创建.gitignore测试规则
create_gitignore() {
    log_info "创建.gitignore测试规则..."

    cat >> .gitignore << 'EOF'
# 测试文件和目录
/tests/coverage/
/tests/jest/
/logs/
/jest.config.js
/jest.minimal.js
/report.html
/test-results.xml
playwright-report/
test-results/
nyc_output/
.env.test
.env.local
.env.test.local
EOF
}

# 主函数
main() {
    log_info "开始搭建测试环境..."
    log_info "=========================================="

    # 检查系统要求
    log_info "检查系统要求..."
    check_command node
    check_command npm

    # 安装依赖
    install_nodejs
    install_test_dependencies

    # 配置测试框架
    configure_jest

    # 创建测试结构
    create_test_structure
    create_test_setup
    create_test_configs
    create_test_database

    # 创建测试示例
    create_unit_test_examples
    create_integration_test_examples
    create_e2e_test_examples
    create_test_helpers
    create_test_scripts
    create_test_fixtures

    # 更新package.json
    update_package_json

    # 创建.gitignore规则
    create_gitignore

    log_success "=========================================="
    log_success "测试环境搭建完成！"
    log_info ""
    log_info "可用的测试命令："
    log_info "- npm test                    - 运行所有测试"
    log_info "- npm run test:unit            - 运行单元测试"
    log_info "- npm run test:integration     - 运行集成测试"
    log_info "- npm run test:e2e              - 运行E2E测试"
    log_info "- npm run test:watch          - 监控模式运行测试"
    log_info "- npm run test:coverage        - 生成测试覆盖率报告"
    log_info "- npm run test:ci              - CI模式运行测试"
    log_info ""
    log_info "脚本命令："
    log_info "- ./scripts/test.sh           - 运行完整测试套件"
    log_info "- ./scripts/test-unit.sh       - 仅运行单元测试"
    log_info "- ./scripts/test-integration.sh  - 仅运行集成测试"
    log_info "- ./scripts/test-e2e.sh         - 仅运行E2E测试"
    log_info ""
    log_info "下一步："
    log_info "1. 启动MongoDB: mongod"
    log_info "2. 运行测试: npm test"
    log_info "3. 查看报告: open coverage/lcov-report/index.html"
}

# 执行主函数
main "$@"