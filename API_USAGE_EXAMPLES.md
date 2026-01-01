# 智慧乡村平台 API 使用示例

## 一、快速开始

### 1. JavaScript/Node.js 使用示例

```javascript
// 安装SDK
// npm install smart-village-sdk

// 引入SDK
const { createSDK } = require('./sdks/smart-village-sdk.js');

// 初始化SDK
const client = createSDK({
  baseURL: 'https://api.smartvillage.com/api/v1',
  timeout: 30000
});

// 设置村庄ID
client.setVillageId('village_001');
```

### 2. Python 使用示例

```python
# 导入SDK
from smart_village_sdk import SmartVillageClient

# 初始化客户端
client = SmartVillageClient(
    base_url="https://api.smartvillage.com/api/v1",
    timeout=30
)

# 设置村庄ID
client.set_village_id('village_001')
```

## 二、认证授权

### 1. 用户注册（JavaScript）

```javascript
// 注册新用户
const registerResult = await client.auth.register({
  username: "zhangsan",
  email: "zhangsan@example.com",
  password: "SecurePass123!",
  villageId: "village_001",
  personalInfo: {
    name: "张三",
    phone: "13800138000",
    idCard: "330102199001011234"
  },
  faceImages: [
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
  ]
});

console.log("注册结果:", registerResult);
```

### 2. 用户登录（多种方式）

```javascript
// 密码登录
const loginResult = await client.auth.login({
  type: "password",
  username: "zhangsan@example.com",
  password: "SecurePass123!"
});

// 人脸识别登录
const faceLoginResult = await client.auth.login({
  type: "face",
  faceImage: "data:image/jpeg;base64,...",
  liveData: {
    challenge: "blink",
    liveness: true
  }
});

// 令牌自动保存，后续请求会自动携带认证信息
```

### 3. 刷新令牌（Python）

```python
# 刷新访问令牌
refresh_result = client.auth.refresh_token("refresh_token_here")
print("刷新结果:", refresh_result)
```

## 三、用户管理

### 1. 获取用户列表

```javascript
// 获取用户列表，支持分页和筛选
const users = await client.users.getUsers({
  page: 1,
  limit: 20,
  search: "张三",
  role: "resident",
  villageId: "village_001"
});

console.log("用户列表:", users);
```

```python
# Python版本
users = client.users.get_users(
    page=1,
    limit=20,
    search="张三",
    role="resident",
    village_id="village_001"
)
print("用户列表:", users)
```

### 2. 创建新用户

```javascript
// 创建村民用户
const newUser = await client.users.createUser({
  username: "lisi",
  email: "lisi@example.com",
  role: "resident",
  villageId: "village_001",
  profile: {
    name: "李四",
    phone: "13900139000",
    address: "幸福村123号"
  }
});
```

### 3. 更新用户信息

```javascript
// 更新用户资料
const updatedUser = await client.users.updateUser("user_001", {
  profile: {
    name: "张三丰",
    phone: "13700137000"
  }
});
```

## 四、语音交互服务

### 1. 语音转文字（支持22种方言）

```javascript
// 上传音频文件进行语音识别
const fileInput = document.getElementById('audio-file');
const audioFile = fileInput.files[0];

const speechResult = await client.voice.speechToText(audioFile, 'cantonese');

console.log("识别结果:", speechResult.data);
// 输出示例：
// {
//   text: "我要申请耕地补贴",
//   confidence: 0.95,
//   detectedDialect: "cantonese",
//   duration: 3.5
// }
```

### 2. 文字转语音（方言合成）

```javascript
// 将文字转换为方言语音
const ttsResult = await client.voice.textToSpeech("欢迎使用智慧乡村平台", {
  dialect: "cantonese",
  voiceStyle: "female"
});

// 播放生成的语音
const audio = new Audio(ttsResult.data.audioUrl);
audio.play();
```

### 3. 方言自动识别

```javascript
// 自动识别音频中的方言
const dialectResult = await client.voice.detectDialect(audioFile);

console.log("检测到的方言:", dialectResult.data.detectedDialect);
console.log("置信度:", dialectResult.data.confidence);
```

## 五、人脸识别服务

### 1. 人脸注册

```javascript
// 为用户注册人脸
const faceRegisterResult = await client.face.register(
  "user_001",  // 用户ID
  [
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
  ],
  {
    challenge: "blink",
    liveness: true
  }
);
```

### 2. 人脸验证登录

```javascript
// 使用人脸验证登录
const faceVerifyResult = await client.face.verify(
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "user_001",
  {
    challenge: "smile",
    liveness: true
  }
);

if (faceVerifyResult.data.verified) {
  console.log("人脸验证成功");
  console.log("置信度:", faceVerifyResult.data.confidence);
}
```

### 3. 人脸搜索

```javascript
// 根据人脸图片搜索村民信息
const searchResult = await client.face.search(
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  10  // 最多返回10个结果
);

console.log("匹配结果:", searchResult.data.matches);
// 输出示例：
// [
//   {
//     residentId: "resident_001",
//     name: "张三",
//     confidence: 0.98,
//     matchThreshold: 0.85
//   }
// ]
```

## 六、AI智能服务

### 1. 发票OCR识别

```javascript
// 识别发票信息
const fileInput = document.getElementById('invoice-file');
const invoiceFile = fileInput.files[0];

const ocrResult = await client.ai.recognizeInvoice(invoiceFile);

console.log("发票识别结果:", ocrResult.data);
// 输出示例：
// {
//   invoiceNumber: "INV20250101001",
//   date: "2025-01-01",
//   amount: 1500.00,
//   vendor: "农资供应公司",
//   category: "农资采购",
//   confidence: 0.96
// }
```

### 2. 智能填表

```javascript
// 使用语音和图片智能填写表单
const autoFillResult = await client.ai.autoFillForm({
  formType: "subsidy_application",
  voiceInput: "我要申请耕地补贴，我家有5亩地，种植水稻",
  imageData: [
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",  // 身份证
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."   // 土地证
  ]
});

console.log("自动填表结果:", autoFillResult.data);
// 输出示例：
// {
//   formId: "form_001",
//   fields: {
//     name: "张三",
//     idCard: "330102199001011234",
//     landArea: 5,
//     cropType: "水稻",
//     subsidyType: "耕地保护补贴"
//   },
//   needsReview: ["incomeLevel"]  // 需要人工审核的字段
// }
```

### 3. 政策补贴计算器

```javascript
// 计算政策补贴金额
const subsidyResult = await client.ai.calculatePolicySubsidy({
  householdSize: 4,
  landArea: 5,
  incomeLevel: "low",
  specialGroups: ["low_income", "one_child"],
  cropTypes: ["水稻", "蔬菜"]
});

console.log("补贴计算结果:", subsidyResult.data);
// 输出示例：
// {
//   eligibleSubsidies: [
//     {
//       name: "耕地保护补贴",
//       amount: 1500,
//       description: "每亩300元"
//     },
//     {
//       name: "独生子女补贴",
//       amount: 1200,
//       description: "每年300元"
//     }
//   ],
//   totalAmount: 2700
// }
```

## 七、村民管理

### 1. 获取村民列表

```javascript
// 获取村民列表，支持多种筛选条件
const residents = await client.residents.getResidents({
  page: 1,
  limit: 20,
  search: "张",
  householdType: "low_income",
  healthStatus: "chronic_disease"
});
```

### 2. 创建村民档案

```javascript
// 创建新的村民档案
const newResident = await client.residents.createResident({
  name: "王五",
  idCard: "330102199002021234",
  phone: "13600136000",
  address: "幸福村456号",
  householdId: "household_001",
  householdType: "low_income",
  healthStatus: "healthy",
  familyInfo: {
    spouse: "李花",
    children: ["王小明", "王小红"]
  }
});
```

### 3. 获取村民二维码

```javascript
// 生成村民专属二维码
const qrCode = await client.residents.getQRCode("resident_001");

// 显示二维码
document.getElementById('qr-code').src = qrCode.data.qrCodeUrl;
console.log("二维码数据:", qrCode.data.qrCodeData);
console.log("过期时间:", qrCode.data.expiresAt);
```

## 八、村情地图服务

### 1. 获取村情地图

```javascript
// 获取村庄地图信息，支持多个图层
const villageMap = await client.map.getVillageMap(
  "village_001",
  ["boundaries", "buildings", "roads", "utilities"]
);

console.log("地图数据:", villageMap.data);
// 输出示例：
// {
//   boundaries: [[120.123, 30.456], [120.124, 30.457], ...],
//   buildings: [
//     {
//       id: "building_001",
//       type: "residential",
//       location: { latitude: 30.456, longitude: 120.123 }
//     }
//   ]
// }
```

### 2. 获取村民位置（隐私保护）

```javascript
// 获取村民位置信息（普通情况下的脱敏位置）
const locations = await client.map.getResidentLocations("village_001", false);

// 紧急情况下获取精确位置
const emergencyLocations = await client.map.getResidentLocations("village_001", true);
```

### 3. 应急路径规划

```javascript
// 规划应急救援路径
const routeResult = await client.map.planEmergencyRoute({
  emergencyType: "fire",
  startPoint: {
    latitude: 30.456,
    longitude: 120.123
  },
  endPoint: {
    latitude: 30.457,
    longitude: 120.124
  },
  constraints: ["avoid_congestion"]
});

console.log("规划路径:", routeResult.data.route);
console.log("预计时间:", routeResult.data.estimatedTime);
```

### 4. 获取救援设备位置

```javascript
// 查找附近的灭火器
const fireExtinguishers = await client.map.getRescueEquipment(
  "fire_extinguisher",
  "village_001"
);

console.log("灭火器位置:", fireExtinguishers.data.equipment);
```

## 九、智能值班表

### 1. 获取值班表

```javascript
// 获取指定日期范围的值班表
const schedule = await client.duty.getSchedule({
  startDate: "2025-01-01",
  endDate: "2025-01-07",
  department: "admin"
});
```

### 2. 自动生成值班表

```javascript
// 自动生成值班表
const generatedSchedule = await client.duty.generateSchedule({
  startDate: "2025-01-01",
  endDate: "2025-01-31",
  staffIds: ["staff_001", "staff_002", "staff_003"],
  rules: [
    {
      type: "max_shifts",
      value: "8",
      priority: 10
    },
    {
      type: "rest_days",
      value: "2",
      priority: 9
    }
  ]
});

if (generatedSchedule.data.conflicts.length > 0) {
  console.log("排班冲突:", generatedSchedule.data.conflicts);
}
```

### 3. 紧急呼叫值班人员

```javascript
// 发起紧急呼叫
const emergencyCall = await client.duty.emergencyCall({
  emergencyType: "fire",
  location: {
    latitude: 30.456,
    longitude: 120.123,
    address: "幸福村123号"
  },
  description: "发现火情，需要紧急支援",
  urgency: "critical"
});

console.log("值班人员响应:", emergencyCall.data.onDutyStaff);
console.log("预计到达时间:", emergencyCall.data.responseTime);
```

## 十、应急管理

### 1. 获取应急报告

```javascript
// 获取应急报告列表
const reports = await client.emergency.getReports({
  page: 1,
  limit: 10,
  status: "pending",
  type: "natural_disaster"
});
```

### 2. 创建应急报告

```javascript
// 提交新的应急报告
const newReport = await client.emergency.createReport({
  type: "natural_disaster",
  title: "暴雨险情",
  description: "持续暴雨导致村东头低洼地带积水严重",
  location: {
    latitude: 30.456,
    longitude: 120.123,
    address: "幸福村东侧"
  },
  severity: "high",
  images: [
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
  ],
  contact: "13800138000"
});
```

### 3. 广播应急警报

```javascript
// 发布应急警报
const broadcast = await client.emergency.broadcastAlert({
  message: "紧急通知：暴雨红色预警，请村民立即转移到安全地带",
  severity: "critical",
  targetArea: "全村",
  channels: ["sms", "app_push", "broadcast", "wechat"]
});

console.log("通知发送结果:", broadcast.data);
// 输出示例：
// {
//   broadcastId: "broadcast_001",
//   reachedCount: 1250,
//   successRate: 0.98
// }
```

## 十一、实时监控

### 1. 获取系统状态

```javascript
// 获取系统监控状态
const status = await client.monitoring.getStatus();

console.log("系统状态:", status.data);
// 输出示例：
// {
//   uptime: 86400,
//   cpuUsage: 45.2,
//   memoryUsage: 67.8,
//   activeConnections: 156,
//   apiResponseTime: 125,
//   errorRate: 0.02,
//   services: {
//     database: "healthy",
//     redis: "healthy",
//     ai_service: "degraded"
//   }
// }
```

### 2. 订阅实时数据（SSE）

```javascript
// 订阅实时监控数据
const eventSource = await client.monitoring.subscribeRealtime(
  (data) => {
    console.log("实时数据:", data);
    // 处理实时数据更新
    if (data.type === 'alert') {
      showAlert(data.message);
    } else if (data.type === 'metric_update') {
      updateDashboard(data.metrics);
    }
  },
  (error) => {
    console.error("实时连接错误:", error);
  }
);

// 关闭连接
// eventSource.close();
```

## 十二、错误处理

### 1. 错误捕获和处理

```javascript
try {
  const result = await client.users.getUsers();
  console.log(result);
} catch (error) {
  if (error.status === 401) {
    // 处理认证错误
    console.log("认证失败，请重新登录");
    // 跳转到登录页面
    window.location.href = '/login';
  } else if (error.status === 403) {
    // 处理权限错误
    console.log("权限不足");
  } else if (error.code === 'TIMEOUT') {
    // 处理超时错误
    console.log("请求超时，请重试");
  } else {
    // 其他错误
    console.error("API错误:", error.message);
  }
}
```

### 2. Python错误处理

```python
try:
    users = client.users.get_users()
    print(users)
except APIError as e:
    if e.status_code == 401:
        print("认证失败，请重新登录")
    elif e.status_code == 403:
        print("权限不足")
    elif e.code == "TIMEOUT":
        print("请求超时，请重试")
    else:
        print(f"API错误: {e.message}")
except Exception as e:
    print(f"未知错误: {str(e)}")
```

## 十三、最佳实践

### 1. 令牌管理

```javascript
// 自动刷新令牌
client.sdk.addResponseInterceptor((response) => {
  if (response.code === 'TOKEN_EXPIRED') {
    // 使用refresh_token刷新
    return client.auth.refreshToken(refreshToken);
  }
  return response;
});
```

### 2. 请求重试机制

```javascript
async function requestWithRetry(requestFunc, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFunc();
    } catch (error) {
      if (error.status >= 500 && i < maxRetries - 1) {
        // 服务器错误时重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}

// 使用示例
const users = await requestWithRetry(() => client.users.getUsers());
```

### 3. 批量操作

```javascript
// 批量创建村民
async function batchCreateResidents(residentList) {
  const results = [];
  const batchSize = 10;

  for (let i = 0; i < residentList.length; i += batchSize) {
    const batch = residentList.slice(i, i + batchSize);
    const promises = batch.map(resident =>
      client.residents.createResident(resident)
        .catch(error => ({ error, resident }))
    );

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }

  return results;
}
```

### 4. 缓存策略

```javascript
// 简单的内存缓存
const cache = new Map();

async function getCachedData(key, fetchFunc, ttl = 60000) {
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await fetchFunc();
  cache.set(key, {
    data,
    timestamp: Date.now()
  });

  return data;
}

// 使用示例
const users = await getCachedData(
  'users_page1',
  () => client.users.getUsers({ page: 1 }),
  300000  // 缓存5分钟
);
```

## 十四、测试示例

### 1. 单元测试（Jest）

```javascript
const { createSDK } = require('../sdks/smart-village-sdk');

describe('SmartVillageSDK', () => {
  let client;

  beforeEach(() => {
    client = createSDK({
      baseURL: 'http://localhost:3001/api/v1'
    });
  });

  test('用户登录成功', async () => {
    const result = await client.auth.login({
      type: 'password',
      username: 'test@example.com',
      password: 'test123'
    });

    expect(result.success).toBe(true);
    expect(result.data.accessToken).toBeDefined();
  });

  test('获取用户列表', async () => {
    client.setToken('test_token');

    const result = await client.users.getUsers();

    expect(result.success).toBe(true);
    expect(result.data.items).toBeInstanceOf(Array);
  });
});
```

### 2. 集成测试

```python
import unittest
from smart_village_sdk import SmartVillageClient

class TestSmartVillageAPI(unittest.TestCase):
    def setUp(self):
        self.client = SmartVillageClient(
            base_url="http://localhost:3001/api/v1"
        )

    def test_user_login(self):
        """测试用户登录"""
        result = self.client.auth.login({
            "type": "password",
            "username": "test@example.com",
            "password": "test123"
        })

        self.assertTrue(result["success"])
        self.assertIn("accessToken", result["data"])

    def test_get_users(self):
        """测试获取用户列表"""
        self.client.set_token("test_token")

        result = self.client.users.get_users()

        self.assertTrue(result["success"])
        self.assertIsInstance(result["data"]["items"], list)

if __name__ == "__main__":
    unittest.main()
```

## 十五、部署配置

### 1. 环境变量配置

```bash
# .env 文件
SMART_VILLAGE_API_URL=https://api.smartvillage.com/api/v1
SMART_VILLAGE_API_KEY=your_api_key_here
SMART_VILLAGE_TIMEOUT=30000
SMART_VILLAGE_VILLAGE_ID=village_001
```

### 2. 配置文件（Python）

```python
# config.py
import os
from dataclasses import dataclass

@dataclass
class SmartVillageConfig:
    api_url: str = os.getenv("SMART_VILLAGE_API_URL", "https://api.smartvillage.com/api/v1")
    api_key: str = os.getenv("SMART_VILLAGE_API_KEY")
    timeout: int = int(os.getenv("SMART_VILLAGE_TIMEOUT", "30"))
    village_id: str = os.getenv("SMART_VILLAGE_VILLAGE_ID")
```

这些示例涵盖了智慧乡村平台API的主要功能使用场景，开发者可以根据具体需求进行调整和扩展。