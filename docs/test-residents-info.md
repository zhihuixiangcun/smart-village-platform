# 测试村民账号信息

由于数据库集合有JSON Schema验证,无法通过脚本直接创建。以下是准备好的测试村民账号信息,可以通过MongoDB Compass或API手动创建。

## 测试账号列表

### 1. 么扒村 - 岑方国

**用户账号:**
```json
{
  "username": "cengfangguo",
  "password": "Ceng123456!",
  "email": "cengfangguo@example.com",
  "role": "resident",
  "profile": {
    "firstName": "方国",
    "lastName": "岑",
    "phone": "13801234567",
    "address": "贵州省黔东南州从江县加榜乡么扒村"
  },
  "villageId": "695d2f0a1993c080b9fa520b",
  "status": "active"
}
```

**村民档案:**
```json
{
  "name": "岑方国",
  "idCard": "522633198503151234",
  "phone": "13801234567",
  "gender": "male",
  "birthDate": "1985-03-15T00:00:00.000Z",
  "age": 39,
  "household": {
    "householdNumber": "MBC001",
    "householderName": "岑方国",
    "householderId": "522633198503151234",
    "relationship": "householder",
    "householdType": "ordinary"
  },
  "address": {
    "province": "贵州省",
    "city": "黔东南州",
    "district": "从江县",
    "town": "加榜乡",
    "village": "么扒村",
    "detailAddress": "么扒村1组"
  },
  "location": {
    "type": "Point",
    "coordinates": [108.7189, 25.6854]
  },
  "villageId": "695d2f0a1993c080b9fa520b",
  "education": {
    "degree": "junior_high"
  },
  "occupation": "farmer",
  "health": {
    "healthStatus": "good"
  },
  "digital": {
    "hasSmartphone": true,
    "hasInternet": true,
    "digitalSkills": {
      "canUseSmartphone": true,
      "canUseWechat": true,
      "canOnlinePayment": false,
      "canOnlineShopping": false
    }
  },
  "status": "active"
}
```

---

### 2. 弄洋村 - 王定权

**用户账号:**
```json
{
  "username": "wangdingquan",
  "password": "Wang123456!",
  "email": "wangdingquan@example.com",
  "role": "resident",
  "profile": {
    "firstName": "定权",
    "lastName": "王",
    "phone": "13801234568",
    "address": "贵州省黔东南州从江县加榜乡弄洋村"
  },
  "villageId": "695da4e954f6af867bebc416",
  "status": "active"
}
```

**村民档案:**
```json
{
  "name": "王定权",
  "idCard": "522633197808201235",
  "phone": "13801234568",
  "gender": "male",
  "birthDate": "1978-08-20T00:00:00.000Z",
  "age": 46,
  "household": {
    "householdNumber": "NYC001",
    "householderName": "王定权",
    "householderId": "522633197808201235",
    "relationship": "householder",
    "householdType": "ordinary"
  },
  "address": {
    "province": "贵州省",
    "city": "黔东南州",
    "district": "从江县",
    "town": "加榜乡",
    "village": "弄洋村",
    "detailAddress": "弄洋村2组"
  },
  "location": {
    "type": "Point",
    "coordinates": [108.7256, 25.6912]
  },
  "villageId": "695da4e954f6af867bebc416",
  "education": {
    "degree": "primary"
  },
  "occupation": "farmer",
  "health": {
    "healthStatus": "good"
  },
  "digital": {
    "hasSmartphone": true,
    "hasInternet": false,
    "digitalSkills": {
      "canUseSmartphone": true,
      "canUseWechat": true,
      "canOnlinePayment": false,
      "canOnlineShopping": false
    }
  },
  "status": "active"
}
```

---

### 3. 者央村 - 岑小多

**用户账号:**
```json
{
  "username": "cengxiaoduo",
  "password": "Ceng123456!",
  "email": "cengxiaoduo@example.com",
  "role": "resident",
  "profile": {
    "firstName": "小多",
    "lastName": "岑",
    "phone": "13801234569",
    "address": "贵州省黔东南州从江县加榜乡者央村"
  },
  "villageId": "695da4e954f6af867bebc418",
  "status": "active"
}
```

**村民档案:**
```json
{
  "name": "岑小多",
  "idCard": "522633199512105678",
  "phone": "13801234569",
  "gender": "female",
  "birthDate": "1995-12-10T00:00:00.000Z",
  "age": 29,
  "household": {
    "householdNumber": "ZYC001",
    "householderName": "岑小多",
    "householderId": "522633199512105678",
    "relationship": "householder",
    "householdType": "ordinary"
  },
  "address": {
    "province": "贵州省",
    "city": "黔东南州",
    "district": "从江县",
    "town": "加榜乡",
    "village": "者央村",
    "detailAddress": "者央村3组"
  },
  "location": {
    "type": "Point",
    "coordinates": [108.7323, 25.6987]
  },
  "villageId": "695da4e954f6af867bebc418",
  "education": {
    "degree": "senior_high"
  },
  "occupation": "teacher",
  "health": {
    "healthStatus": "excellent"
  },
  "digital": {
    "hasSmartphone": true,
    "hasInternet": true,
    "digitalSkills": {
      "canUseSmartphone": true,
      "canUseWechat": true,
      "canOnlinePayment": true,
      "canOnlineShopping": true
    }
  },
  "status": "active"
}
```

---

### 4. 林桃村 - 毛光情

**用户账号:**
```json
{
  "username": "maoguangqing",
  "password": "Mao123456!",
  "email": "maoguangqing@example.com",
  "role": "resident",
  "profile": {
    "firstName": "光情",
    "lastName": "毛",
    "phone": "13801234570",
    "address": "贵州省黔东南州从江县加榜乡林桃村"
  },
  "villageId": "695da4e954f6af867bebc417",
  "status": "active"
}
```

**村民档案:**
```json
{
  "name": "毛光情",
  "idCard": "522633198807254567",
  "phone": "13801234570",
  "gender": "male",
  "birthDate": "1988-07-25T00:00:00.000Z",
  "age": 36,
  "household": {
    "householdNumber": "LTC001",
    "householderName": "毛光情",
    "householderId": "522633198807254567",
    "relationship": "householder",
    "householdType": "ordinary"
  },
  "address": {
    "province": "贵州省",
    "city": "黔东南州",
    "district": "从江县",
    "town": "加榜乡",
    "village": "林桃村",
    "detailAddress": "林桃村4组"
  },
  "location": {
    "type": "Point",
    "coordinates": [108.7398, 25.7045]
  },
  "villageId": "695da4e954f6af867bebc417",
  "education": {
    "degree": "college"
  },
  "occupation": "business",
  "workplace": {
    "name": "林桃村农产品合作社",
    "address": "林桃村村委会旁",
    "industry": "农业"
  },
  "annualIncome": 80000,
  "health": {
    "healthStatus": "good"
  },
  "digital": {
    "hasSmartphone": true,
    "hasInternet": true,
    "digitalSkills": {
      "canUseSmartphone": true,
      "canUseWechat": true,
      "canOnlinePayment": true,
      "canOnlineShopping": true
    }
  },
  "villageParticipation": {
    "isCommitteeMember": true,
    "position": "村委委员",
    "partyMember": false
  },
  "status": "active"
}
```

---

## 快速登录信息汇总

| # | 姓名 | 用户名 | 密码 | 村庄 | 电话 |
|---|------|--------|------|------|------|
| 1 | 岑方国 | cengfangguo | Ceng123456! | 么扒村 | 13801234567 |
| 2 | 王定权 | wangdingquan | Wang123456! | 弄洋村 | 13801234568 |
| 3 | 岑小多 | cengxiaoduo | Ceng123456! | 者央村 | 13801234569 |
| 4 | 毛光情 | maoguangqing | Mao123456! | 林桃村 | 13801234570 |

---

## 手动创建方法

### 方法1: 通过MongoDB Compass

1. 打开MongoDB Compass
2. 连接到数据库
3. 进入`users`集合,插入用户账号JSON(需要先对密码进行bcrypt加密)
4. 进入`residents`集合,插入村民档案JSON

### 方法2: 通过后端API

**注册API** (如果可用):
```bash
POST http://localhost:3001/api/v1/auth/register
Content-Type: application/json

{
  "username": "cengfangguo",
  "password": "Ceng123456!",
  "email": "cengfangguo@example.com",
  ...其他字段
}
```

### 方法3: 禁用数据库验证(临时)

在MongoDB中临时禁用JSON Schema验证:
```javascript
db.runCommand({
  collMod: "users",
  validator: {}
})
db.runCommand({
  collMod: "residents",
  validator: {}
})
```

然后运行脚本,创建完成后再恢复验证规则。

---

**注意**:
- 密码已经经过bcrypt加密处理,插入时需要使用加密后的密码
- 所有村民的身份证号和电话号码都是测试用的虚拟号码
- villageId 使用的是数据库中已存在的村庄ID
