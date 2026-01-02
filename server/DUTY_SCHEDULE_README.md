# 智能值班表系统使用指南

## 系统概述

智能值班表系统为智慧乡村平台提供了完整的值班管理解决方案，支持多种排班算法、灵活的调班机制和完善的交接班流程。

## 核心功能

### 1. 排班算法

- **轮询制（Rotation）**: 按固定顺序循环排班，确保公平性
- **均衡制（Balanced）**: 智能分配值班任务，保证工作负荷均衡
- **优先级制（Priority）**: 根据人员优先级排班，重要岗位优先安排
- **自定义制（Custom）**: 根据人员偏好设置智能排班，提高满意度

### 2. 值班管理

- 月度值班表自动生成
- 支持多班次、多人员配置
- 特殊日期（节假日）处理
- 值班冲突检测和自动解决

### 3. 调班机制

- 在线调班申请
- 审批流程管理
- 紧急调班处理
- 临时调班支持

### 4. 交接班管理

- 电子交接班记录
- 工作内容交接
- 设备状态记录
- 照片证据上传

## API接口文档

### 1. 创建月度值班表

```http
POST /api/duty/schedule
Authorization: Bearer {token}
Content-Type: application/json

{
  "villageId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "year": 2024,
  "month": 1,
  "algorithm": "balanced",
  "shifts": [
    {
      "name": "早班",
      "startTime": "08:00",
      "endTime": "16:00",
      "requiredStaffCount": 2
    },
    {
      "name": "晚班",
      "startTime": "16:00",
      "endTime": "24:00",
      "requiredStaffCount": 1
    }
  ],
  "parameters": {
    "fairnessThreshold": 0.1,
    "consecutiveDaysLimit": 3,
    "restDaysBetweenDuty": 1
  }
}
```

### 2. 发布值班表

```http
PUT /api/duty/schedule/{scheduleId}/publish
Authorization: Bearer {token}
```

### 3. 获取月度值班表

```http
GET /api/duty/schedule?villageId={id}&year={year}&month={month}
Authorization: Bearer {token}
```

### 4. 申请调班

```http
POST /api/duty/schedule/swap
Authorization: Bearer {token}
Content-Type: application/json

{
  "scheduleId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "date": "2024-01-15",
  "shiftName": "早班",
  "originalStaffId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "newStaffId": "60f7b3b3b3b3b3b3b3b3b3b4",
  "reason": "家中有事",
  "isTemporary": false
}
```

### 5. 创建交接班记录

```http
POST /api/duty/handover
Authorization: Bearer {token}
Content-Type: application/json

{
  "scheduleId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "date": "2024-01-15",
  "shiftName": "早班",
  "fromStaffId": {
    "staffId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "张三"
  },
  "toStaffId": {
    "staffId": "60f7b3b3b3b3b3b3b3b3b3b4",
    "name": "李四"
  },
  "handoverContent": {
    "ongoingTasks": ["处理村民投诉"],
    "completedTasks": ["发放补贴"],
    "pendingIssues": ["网络设备故障"],
    "importantNotes": "注意查看系统消息"
  }
}
```

### 6. 生成值班报表

```http
GET /api/duty/report?villageId={id}&startDate={date}&endDate={date}&reportType={type}
Authorization: Bearer {token}
```

## 数据模型

### 1. 值班人员（DutyStaff）

```javascript
{
  userId: ObjectId,           // 关联用户ID
  name: String,              // 姓名
  position: String,          // 职务
  department: String,        // 部门
  contact: {                 // 联系方式
    phone: String,
    email: String
  },
  priority: Number,          // 优先级（1-10）
  maxDutyPerMonth: Number,   // 月度最大值班次数
  preferences: {             // 偏好设置
    preferredDays: [Number], // 偏好的星期几
    avoidedDays: [Number],   // 避免的星期几
    preferredShifts: [String], // 偏好的班次
    avoidedShifts: [String],   // 避免的班次
    customConstraints: [{     // 自定义约束
      date: Date,
      reason: String,
      type: String           // unavailable/preferred/avoid
    }]
  },
  statistics: {              // 统计信息
    thisMonthDutyCount: Number,
    totalDutyCount: Number,
    lastDutyDate: Date,
    averageRestDays: Number
  },
  isActive: Boolean,         // 是否激活
  villageId: ObjectId        // 所属村庄
}
```

### 2. 值班表（DutySchedule）

```javascript
{
  villageId: ObjectId,       // 村庄ID
  year: Number,             // 年份
  month: Number,            // 月份
  algorithm: String,        // 排班算法
  shifts: [{                // 班次配置
    name: String,           // 班次名称
    startTime: String,      // 开始时间
    endTime: String,        // 结束时间
    requiredStaffCount: Number // 所需人数
  }],
  schedules: [{             // 每日排班
    date: Date,            // 日期
    shifts: [{             // 班次安排
      shiftName: String,   // 班次名称
      staff: [{            // 值班人员
        staffId: ObjectId,
        name: String,
        status: String,    // scheduled/confirmed/completed/absent
        checkInTime: Date,
        checkOutTime: Date,
        notes: String
      }]
    }]
  }],
  specialDates: [{          // 特殊日期
    date: Date,
    type: String,          // holiday/weekend/special_event
    description: String,
    staffingRequirements: [{
      shiftName: String,
      requiredCount: Number,
      minSeniority: Number
    }]
  }],
  parameters: {             // 排班参数
    fairnessThreshold: Number,
    consecutiveDaysLimit: Number,
    restDaysBetweenDuty: Number
  },
  status: String,           // draft/published/active/archived
  createdBy: ObjectId,      // 创建者
  publishedAt: Date,
  archivedAt: Date
}
```

## 使用示例

### 1. 初始化值班人员

```javascript
const staff = await DutyStaff.create({
  userId: user._id,
  name: '张三',
  position: '村干部',
  department: '村委会',
  contact: {
    phone: '13800138000',
    email: 'zhangsan@example.com'
  },
  priority: 5,
  maxDutyPerMonth: 8,
  preferences: {
    preferredDays: [1, 2, 3], // 周一到周三
    avoidedDays: [5, 6],      // 周五周六
    preferredShifts: ['早班'],
    avoidedShifts: ['夜班']
  },
  villageId: village._id
});
```

### 2. 创建值班表

```javascript
const schedule = await dutyScheduleService.createMonthlySchedule({
  villageId: village._id,
  year: 2024,
  month: 1,
  algorithm: 'custom', // 使用自定义算法
  shifts: [
    {
      name: '早班',
      startTime: '08:00',
      endTime: '16:00',
      requiredStaffCount: 2
    },
    {
      name: '晚班',
      startTime: '16:00',
      endTime: '24:00',
      requiredStaffCount: 1
    }
  ],
  parameters: {
    fairnessThreshold: 0.1,
    consecutiveDaysLimit: 3,
    restDaysBetweenDuty: 1
  },
  createdBy: admin._id
});
```

### 3. 申请调班

```javascript
const swap = await dutyRotationService.applyShiftSwap({
  scheduleId: schedule._id,
  date: new Date('2024-01-15'),
  shiftName: '早班',
  originalStaffId: staff1._id,
  newStaffId: staff2._id,
  reason: '家中有急事',
  applicantId: staff1.userId
});
```

### 4. 批准调班

```javascript
await dutyRotationService.approveShiftSwap(swap._id, managerId);
```

### 5. 生成值班报表

```javascript
const report = await dutyScheduleService.generateDutyReport({
  villageId: village._id,
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  reportType: 'summary'
});
```

## 最佳实践

### 1. 排班算法选择

- **日常值班**: 推荐使用均衡制算法
- **重要岗位**: 推荐使用优先级制算法
- **追求满意度**: 推荐使用自定义算法
- **简单场景**: 可以使用轮询制算法

### 2. 参数配置

- **公平性阈值**: 建议0.05-0.15，越小越公平
- **连续值班限制**: 建议2-3天
- **休息天数**: 建议1-2天

### 3. 人员偏好设置

- 合理设置偏好的日期和班次
- 使用自定义约束处理特殊情况
- 定期更新偏好设置

### 4. 调班管理

- 提前申请调班，便于安排
- 紧急情况使用紧急调班功能
- 及时确认交接班

## 性能优化

### 1. 数据缓存

- 使用Redis缓存月度值班表
- 缓存人员统计信息
- 缓存排班建议结果

### 2. 数据库优化

- 为常用查询添加索引
- 使用聚合查询优化统计
- 定期清理历史数据

### 3. 异步处理

- 排班生成使用异步处理
- 定时任务处理临时调班
- 批量操作使用队列

## 常见问题

### Q1: 如何处理节假日值班？

A: 在创建值班表时，通过specialDates字段配置特殊日期，系统会自动调整排班策略。

### Q2: 如何确保排班的公平性？

A: 使用均衡制算法，设置合适的公平性阈值，系统会自动优化排班分配。

### Q3: 支持哪些导出格式？

A: 支持Excel、CSV和PDF三种格式的数据导出。

### Q4: 如何处理人员请假？

A: 通过自定义约束设置不可用日期，系统会自动避开这些日期排班。

### Q5: 如何查看值班统计？

A: 使用报表接口可以生成详细的值班统计报表，包括人员出勤率、班次分布等。

## 版本更新日志

### v1.0.0
- 基础排班功能
- 四种排班算法
- 调班和交接班管理
- 值班报表生成

### 后续规划
- 移动端支持
- 智能推荐算法优化
- 更多导出格式支持
- 与考勤系统集成

## 技术支持

如有问题，请联系技术支持团队或提交Issue到项目仓库。