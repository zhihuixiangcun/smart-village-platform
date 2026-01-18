# 移动端API集成指南

## 概述

已创建 `client/src/api/mobileApi.js`，为5个角色的移动端页面提供完整的后端API接口。

---

## 文件结构

```
client/src/api/
└── mobileApi.js          # 统一的移动端API服务
```

---

## API模块划分

### 1. 村民角色 (Resident)

#### residentProfileApi - 个人中心
```javascript
import { residentProfileApi } from '@/api/mobileApi';

// 获取个人信息
const profile = await residentProfileApi.getProfile();

// 更新个人信息
await residentProfileApi.updateProfile({ name: '张三', phone: '13800138000' });

// 上传头像
await residentProfileApi.uploadAvatar(file);

// 获取家庭成员
const family = await residentProfileApi.getFamilyMembers();

// 添加家庭成员
await residentProfileApi.addFamilyMember({
  name: '李四',
  relation: 'spouse',
  phone: '13900139000'
});
```

#### residentFeedbackApi - 意见反馈
```javascript
import { residentFeedbackApi } from '@/api/mobileApi';

// 提交反馈
await residentFeedbackApi.submitFeedback({
  type: 'bug_report',
  description: '登录时出现错误'
}, [imageFile1, imageFile2]);

// 获取反馈历史
const history = await residentFeedbackApi.getMyFeedbackHistory({
  page: 1,
  pageSize: 10
});

// 获取反馈详情
const detail = await residentFeedbackApi.getFeedbackDetail('feedback_id');
```

---

### 2. 村干部角色 (Village Cadre)

#### villageCadreResidentsApi - 村民管理
```javascript
import { villageCadreResidentsApi } from '@/api/mobileApi';

// 获取村民列表
const residents = await villageCadreResidentsApi.getResidentsList({
  page: 1,
  pageSize: 20,
  tag: 'low_income'
});

// 搜索村民
const results = await villageCadreResidentsApi.searchResidents('张三');

// 创建村民
await villageCadreResidentsApi.createResident({
  name: '王五',
  idCard: '330106199001011234',
  phone: '13700137000',
  address: '某某村1号'
});

// 添加特殊标签
await villageCadreResidentsApi.addSpecialTag('resident_id', {
  tag: 'low_income',
  reason: '家庭困难'
});

// 获取统计
const stats = await villageCadreResidentsApi.getResidentsStatistics();
```

---

### 3. 采购商角色 (Purchaser)

#### purchaserSuppliersApi - 供应商管理
```javascript
import { purchaserSuppliersApi } from '@/api/mobileApi';

// 获取供应商列表
const suppliers = await purchaserSuppliersApi.getSuppliersList({
  page: 1,
  pageSize: 20,
  category: 'agriculture'
});

// 搜索供应商
const results = await purchaserSuppliersApi.searchSuppliers('有机蔬菜');

// 创建供应商
await purchaserSuppliersApi.createSupplier({
  name: '绿色农场',
  category: 'agriculture',
  contact: '赵六',
  phone: '13600136000'
});

// 获取供应商产品
const products = await purchaserSuppliersApi.getSupplierProducts('supplier_id');

// 添加评价
await purchaserSuppliersApi.addSupplierReview('supplier_id', {
  rating: 5,
  comment: '产品质量很好'
});
```

---

### 4. 乡镇干部角色 (Township Official)

#### townshipAuditApi - 审核管理
```javascript
import { townshipAuditApi } from '@/api/mobileApi';

// 获取待审核列表
const pending = await townshipAuditApi.getPendingAudits({
  page: 1,
  pageSize: 20
});

// 通过审核
await townshipAuditApi.approveAudit('audit_id', {
  comment: '审核通过'
});

// 驳回审核
await townshipAuditApi.rejectAudit('audit_id', {
  reason: '材料不完整，请补充'
});

// 批量审核
await townshipAuditApi.batchAudit({
  auditIds: ['id1', 'id2'],
  action: 'approve',
  comment: '批量通过'
});

// 获取统计
const stats = await townshipAuditApi.getAuditStatistics();
```

---

### 5. 管理员角色 (Admin)

#### adminUsersApi - 用户管理
```javascript
import { adminUsersApi } from '@/api/mobileApi';

// 获取用户列表
const users = await adminUsersApi.getUsersList({
  page: 1,
  pageSize: 20,
  role: 'resident'
});

// 搜索用户
const results = await adminUsersApi.searchUsers('张三');

// 创建用户
await adminUsersApi.createUser({
  name: '新用户',
  phone: '13500135000',
  role: 'resident',
  villageId: 'village_id'
});

// 启用/禁用用户
await adminUsersApi.toggleUserStatus('user_id', {
  status: 'disabled',
  reason: '违规操作'
});

// 更新用户角色
await adminUsersApi.updateUserRoles('user_id', {
  roles: ['resident', 'village_cadre']
});
```

---

### 通用API (All Roles)

#### uploadApi - 文件上传
```javascript
import { uploadApi } from '@/api/mobileApi';

// 上传图片
const result = await uploadApi.uploadImage(file);
// 返回: { url: 'https://...', fileId: '...' }

// 上传文件
const result = await uploadApi.uploadFile(file);

// 批量上传
const results = await uploadApi.uploadMultipleFiles([file1, file2, file3]);

// 删除文件
await uploadApi.deleteFile('file_id');
```

#### notificationApi - 通知管理
```javascript
import { notificationApi } from '@/api/mobileApi';

// 获取未读数量
const count = await notificationApi.getUnreadCount();

// 获取通知列表
const notifications = await notificationApi.getNotifications({
  page: 1,
  pageSize: 20
});

// 标记已读
await notificationApi.markAsRead('notification_id');

// 标记全部已读
await notificationApi.markAllAsRead();
```

#### statisticsApi - 统计数据
```javascript
import { statisticsApi } from '@/api/mobileApi';

// 获取首页统计
const dashboardStats = await statisticsApi.getDashboardStats();

// 获取趋势数据
const trend = await statisticsApi.getTrendData('visitors', {
  period: '7d'
});
```

---

## 组件集成示例

### Profile.vue 集成

```vue
<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { residentProfileApi } from '@/api/mobileApi';

const user = ref({});
const familyMembers = ref([]);
const loading = ref(false);

// 获取个人信息
const fetchProfile = async () => {
  loading.value = true;
  try {
    const data = await residentProfileApi.getProfile();
    user.value = data;
  } catch (error) {
    ElMessage.error('获取个人信息失败');
  } finally {
    loading.value = false;
  }
};

// 更新个人信息
const updateProfile = async (formData) => {
  try {
    await residentProfileApi.updateProfile(formData);
    ElMessage.success('更新成功');
    await fetchProfile();
  } catch (error) {
    ElMessage.error('更新失败');
  }
};

// 上传头像
const handleAvatarUpload = async (file) => {
  try {
    await residentProfileApi.uploadAvatar(file);
    ElMessage.success('头像上传成功');
    await fetchProfile();
  } catch (error) {
    ElMessage.error('上传失败');
  }
};

onMounted(() => {
  fetchProfile();
});
</script>
```

### Feedback.vue 集成

```vue
<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { residentFeedbackApi } from '@/api/mobileApi';

const feedbackHistory = ref([]);
const submitting = ref(false);

// 提交反馈
const submitFeedback = async (formData, images) => {
  submitting.value = true;
  try {
    await residentFeedbackApi.submitFeedback(formData, images);
    ElMessage.success('反馈提交成功');
    // 重置表单
    await fetchHistory();
  } catch (error) {
    ElMessage.error('提交失败');
  } finally {
    submitting.value = false;
  }
};

// 获取历史记录
const fetchHistory = async () => {
  try {
    const data = await residentFeedbackApi.getMyFeedbackHistory({
      page: 1,
      pageSize: 10
    });
    feedbackHistory.value = data.list || [];
  } catch (error) {
    ElMessage.error('获取历史记录失败');
  }
};

onMounted(() => {
  fetchHistory();
});
</script>
```

### Residents.vue (村干部) 集成

```vue
<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { villageCadreResidentsApi } from '@/api/mobileApi';

const residents = ref([]);
const searchKeyword = ref('');
const activeTag = ref('all');
const loading = ref(false);

// 获取村民列表
const fetchResidents = async () => {
  loading.value = true;
  try {
    const params = { page: 1, pageSize: 20 };
    if (activeTag.value !== 'all') {
      params.tag = activeTag.value;
    }
    const data = await villageCadreResidentsApi.getResidentsList(params);
    residents.value = data.list || [];
  } catch (error) {
    ElMessage.error('获取列表失败');
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = async () => {
  if (!searchKeyword.value) {
    await fetchResidents();
    return;
  }
  try {
    const data = await villageCadreResidentsApi.searchResidents(searchKeyword.value);
    residents.value = data.list || [];
  } catch (error) {
    ElMessage.error('搜索失败');
  }
};

// 添加特殊标签
const addTag = async (residentId, tag) => {
  try {
    await villageCadreResidentsApi.addSpecialTag(residentId, { tag });
    ElMessage.success('标签添加成功');
    await fetchResidents();
  } catch (error) {
    ElMessage.error('添加失败');
  }
};

onMounted(() => {
  fetchResidents();
});
</script>
```

---

## 后端路由配置

需要在后端添加以下路由（示例）：

###村民路由
```javascript
// /api/v1/mobile/resident/*
router.get('/profile', residentController.getProfile);
router.put('/profile', residentController.updateProfile);
router.post('/avatar', residentController.uploadAvatar);
router.get('/family', residentController.getFamily);
router.post('/family', residentController.addFamilyMember);
router.get('/feedback/types', feedbackController.getTypes);
router.post('/feedback', feedbackController.submit);
router.get('/feedback/history', feedbackController.getHistory);
```

### 村干部路由
```javascript
// /api/v1/mobile/village-cadre/residents/*
router.get('/', villageCadreController.getResidents);
router.get('/search', villageCadreController.searchResidents);
router.post('/', villageCadreController.createResident);
router.put('/:id', villageCadreController.updateResident);
router.delete('/:id', villageCadreController.deleteResident);
router.post('/:id/tags', villageCadreController.addTag);
```

### 采购商路由
```javascript
// /api/v1/mobile/purchaser/suppliers/*
router.get('/', purchaserController.getSuppliers);
router.get('/search', purchaserController.searchSuppliers);
router.post('/', purchaserController.createSupplier);
router.get('/:id/products', purchaserController.getProducts);
router.post('/:id/reviews', purchaserController.addReview);
```

### 乡镇干部路由
```javascript
// /api/v1/mobile/township/audit/*
router.get('/pending', auditController.getPending);
router.post('/:id/approve', auditController.approve);
router.post('/:id/reject', auditController.reject);
router.post('/batch', auditController.batchAudit);
```

### 管理员路由
```javascript
// /api/v1/mobile/admin/users/*
router.get('/', adminController.getUsers);
router.get('/search', adminController.searchUsers);
router.post('/', adminController.createUser);
router.put('/:id/status', adminController.toggleStatus);
router.put('/:id/roles', adminController.updateRoles);
```

### 通用路由
```javascript
// /api/v1/mobile/upload/*
router.post('/image', uploadController.image);
router.post('/file', uploadController.file);
router.delete('/file/:id', uploadController.deleteFile);

// /api/v1/mobile/notifications/*
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/', notificationController.getList);
router.put('/:id/read', notificationController.markAsRead);
```

---

## 错误处理

所有API调用都应该进行错误处理：

```javascript
try {
  const data = await someApi.method();
  // 成功处理
} catch (error) {
  // 错误处理
  if (error.response) {
    // 服务器返回错误
    const { status, data } = error.response;
    switch (status) {
      case 401:
        // 未授权，需要登录
        break;
      case 403:
        // 无权限
        break;
      case 404:
        // 资源不存在
        break;
      case 500:
        // 服务器错误
        break;
    }
  } else if (error.request) {
    // 请求发送但没有收到响应
  } else {
    // 其他错误
  }
}
```

---

## 下一步

1. ✅ API服务文件已创建 (`client/src/api/mobileApi.js`)
2. ⏳ 在各个Vue组件中集成API调用
3. ⏳ 创建后端路由和控制器
4. ⏳ 测试API连接
5. ⏳ 添加错误处理和加载状态

---

**文档创建时间**: 2026-01-16
