<template>
  <div class="profile-search-form">
    <el-form ref="formRef" :model="formData" label-width="100px">
      <!-- 基本信息搜索 -->
      <div class="search-section">
        <h4>基本信息</h4>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="formData.name" placeholder="输入姓名进行搜索" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="性别" prop="gender">
              <el-select v-model="formData.gender" placeholder="选择性别" clearable>
                <el-option label="男" value="男" />
                <el-option label="女" value="女" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="年龄范围" prop="ageRange">
              <el-input-number
                v-model="formData.ageMin"
                :min="0"
                :max="150"
                placeholder="最小年龄"
                style="width: 45%"
              />
              <span style="margin: 0 5px">-</span>
              <el-input-number
                v-model="formData.ageMax"
                :min="0"
                :max="150"
                placeholder="最大年龄"
                style="width: 45%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="身份证号" prop="idCard">
              <el-input
                v-model="formData.idCard"
                placeholder="输入身份证号（支持模糊）"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="民族" prop="ethnicity">
              <el-select v-model="formData.ethnicity" placeholder="选择民族" clearable filterable>
                <el-option label="汉族" value="汉族" />
                <el-option label="壮族" value="壮族" />
                <el-option label="回族" value="回族" />
                <el-option label="满族" value="满族" />
                <el-option label="维吾尔族" value="维吾尔族" />
                <el-option label="苗族" value="苗族" />
                <el-option label="彝族" value="彝族" />
                <el-option label="土家族" value="土家族" />
                <el-option label="藏族" value="藏族" />
                <el-option label="蒙古族" value="蒙古族" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="政治面貌" prop="politicalStatus">
              <el-select v-model="formData.politicalStatus" placeholder="选择政治面貌" clearable>
                <el-option label="群众" value="群众" />
                <el-option label="中共党员" value="中共党员" />
                <el-option label="共青团员" value="共青团员" />
                <el-option label="民主党派" value="民主党派" />
                <el-option label="无党派人士" value="无党派人士" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 联系方式搜索 -->
      <div class="search-section">
        <h4>联系方式</h4>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="formData.phone" placeholder="输入手机号（支持模糊）" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="住址" prop="address">
              <el-input v-model="formData.address" placeholder="输入地址关键词" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="微信号" prop="wechat">
              <el-input v-model="formData.wechat" placeholder="输入微信号" clearable />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 教育就业搜索 -->
      <div class="search-section">
        <h4>教育就业</h4>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="学历" prop="education">
              <el-select v-model="formData.education" placeholder="选择学历" clearable>
                <el-option label="文盲" value="文盲" />
                <el-option label="小学" value="小学" />
                <el-option label="初中" value="初中" />
                <el-option label="高中" value="高中" />
                <el-option label="中专" value="中专" />
                <el-option label="大专" value="大专" />
                <el-option label="本科" value="本科" />
                <el-option label="研究生" value="研究生" />
                <el-option label="博士" value="博士" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="就业状态" prop="employment">
              <el-select v-model="formData.employment" placeholder="选择就业状态" clearable>
                <el-option label="在职" value="在职" />
                <el-option label="自由职业" value="自由职业" />
                <el-option label="待业" value="待业" />
                <el-option label="退休" value="退休" />
                <el-option label="学生" value="学生" />
                <el-option label="务农" value="务农" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="工作单位" prop="employer">
              <el-input v-model="formData.employer" placeholder="输入工作单位关键词" clearable />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 健康状况搜索 -->
      <div class="search-section">
        <h4>健康状况</h4>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="健康状况" prop="healthStatus">
              <el-select v-model="formData.healthStatus" placeholder="选择健康状况" clearable>
                <el-option label="健康" value="健康" />
                <el-option label="良好" value="良好" />
                <el-option label="一般" value="一般" />
                <el-option label="较差" value="较差" />
                <el-option label="残疾" value="残疾" />
                <el-option label="重病" value="重病" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="血型" prop="bloodType">
              <el-select v-model="formData.bloodType" placeholder="选择血型" clearable>
                <el-option label="A型" value="A型" />
                <el-option label="B型" value="B型" />
                <el-option label="O型" value="O型" />
                <el-option label="AB型" value="AB型" />
                <el-option label="RH阳性" value="RH阳性" />
                <el-option label="RH阴性" value="RH阴性" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="婚姻状况" prop="maritalStatus">
              <el-select v-model="formData.maritalStatus" placeholder="选择婚姻状况" clearable>
                <el-option label="未婚" value="未婚" />
                <el-option label="已婚" value="已婚" />
                <el-option label="离异" value="离异" />
                <el-option label="丧偶" value="丧偶" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 特殊标签搜索 -->
      <div class="search-section">
        <h4>特殊群体</h4>
        <el-form-item label="标签筛选" prop="tags">
          <el-checkbox-group v-model="formData.tags">
            <el-checkbox label="党员">党员</el-checkbox>
            <el-checkbox label="村干部">村干部</el-checkbox>
            <el-checkbox label="退役军人">退役军人</el-checkbox>
            <el-checkbox label="残疾人">残疾人</el-checkbox>
            <el-checkbox label="低保户">低保户</el-checkbox>
            <el-checkbox label="五保户">五保户</el-checkbox>
            <el-checkbox label="留守儿童">留守儿童</el-checkbox>
            <el-checkbox label="空巢老人">空巢老人</el-checkbox>
            <el-checkbox label="独居老人">独居老人</el-checkbox>
            <el-checkbox label="大病家庭">大病家庭</el-checkbox>
            <el-checkbox label="单亲家庭">单亲家庭</el-checkbox>
            <el-checkbox label="失独家庭">失独家庭</el-checkbox>
            <el-checkbox label="烈属">烈属</el-checkbox>
            <el-checkbox label="优抚对象">优抚对象</el-checkbox>
            <el-checkbox label="困难党员">困难党员</el-checkbox>
            <el-checkbox label="返乡创业">返乡创业</el-checkbox>
            <el-checkbox label="农民工">农民工</el-checkbox>
            <el-checkbox label="大学生">大学生</el-checkbox>
            <el-checkbox label="专业技术人才">专业技术人才</el-checkbox>
            <el-checkbox label="其他">其他</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </div>

      <!-- 家庭信息搜索 -->
      <div class="search-section">
        <h4>家庭信息</h4>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="家庭编码" prop="familyCode">
              <el-input v-model="formData.familyCode" placeholder="输入家庭编码" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="家庭类型" prop="familyType">
              <el-select v-model="formData.familyType" placeholder="选择家庭类型" clearable>
                <el-option label="普通户" value="普通户" />
                <el-option label="低保户" value="低保户" />
                <el-option label="特困户" value="特困户" />
                <el-option label="独生户" value="独生户" />
                <el-option label="双女户" value="双女户" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="家庭成员数" prop="familySize">
              <el-input-number
                v-model="formData.familySizeMin"
                :min="0"
                placeholder="最少人数"
                style="width: 45%"
              />
              <span style="margin: 0 5px">-</span>
              <el-input-number
                v-model="formData.familySizeMax"
                :min="0"
                placeholder="最多人数"
                style="width: 45%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 社会保障搜索 -->
      <div class="search-section">
        <h4>社会保障</h4>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="医保情况" prop="medicalInsurance">
              <el-select v-model="formData.medicalInsurance" placeholder="选择医保情况" clearable>
                <el-option label="有医保" value="true" />
                <el-option label="无医保" value="false" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="医保类型" prop="insuranceType">
              <el-select v-model="formData.insuranceType" placeholder="选择医保类型" clearable>
                <el-option label="城镇职工医保" value="城镇职工医保" />
                <el-option label="城乡居民医保" value="城乡居民医保" />
                <el-option label="新农合" value="新农合" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="养老保险" prop="pensionInsurance">
              <el-select v-model="formData.pensionInsurance" placeholder="选择养老保险" clearable>
                <el-option label="有养老" value="true" />
                <el-option label="无养老" value="false" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 更多选项 -->
      <el-collapse v-model="activeCollapse">
        <el-collapse-item title="更多搜索条件" name="more">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="创建时间" prop="createdAt">
                <el-date-picker
                  v-model="formData.createdAtRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="更新时间" prop="updatedAt">
                <el-date-picker
                  v-model="formData.updatedAtRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="档案状态" prop="status">
                <el-select v-model="formData.status" placeholder="选择档案状态" clearable>
                  <el-option label="正常" value="正常" />
                  <el-option label="已注销" value="已注销" />
                  <el-option label="已迁出" value="已迁出" />
                  <el-option label="待审核" value="待审核" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-collapse-item>
      </el-collapse>

      <!-- 操作按钮 -->
      <div class="search-actions">
        <el-button @click="handleReset" icon="Refresh"> 重置 </el-button>
        <el-button type="primary" @click="handleSearch" icon="Search"> 搜索 </el-button>
        <el-button type="success" @click="handleExport" icon="Download"> 导出结果 </el-button>
        <el-button @click="handleSaveTemplate" icon="Star"> 保存为模板 </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Download, Star } from '@element-plus/icons-vue';

// Props
const props = defineProps({
  filters: {
    type: Object,
    default: () => ({}),
  },
});

// Emits
const emit = defineEmits(['search', 'reset']);

// 表单引用
const formRef = ref(null);

// 折叠面板
const activeCollapse = ref(['']);

// 表单数据
const formData = reactive({
  // 基本信息
  name: '',
  gender: '',
  ageMin: null,
  ageMax: null,
  idCard: '',
  ethnicity: '',
  politicalStatus: '',

  // 联系方式
  phone: '',
  address: '',
  wechat: '',

  // 教育就业
  education: '',
  employment: '',
  employer: '',

  // 健康状况
  healthStatus: '',
  bloodType: '',
  maritalStatus: '',

  // 特殊标签
  tags: [],

  // 家庭信息
  familyCode: '',
  familyType: '',
  familySizeMin: null,
  familySizeMax: null,

  // 社会保障
  medicalInsurance: '',
  insuranceType: '',
  pensionInsurance: '',

  // 更多选项
  createdAtRange: [],
  updatedAtRange: [],
  status: '',
});

// 初始化表单数据
const initFormData = () => {
  if (props.filters) {
    Object.assign(formData, props.filters);
  }
};

// 搜索处理
const handleSearch = async () => {
  // 构建搜索条件
  const searchParams = {};

  // 处理基本信息
  if (formData.name) searchParams.name = formData.name;
  if (formData.gender) searchParams.gender = formData.gender;
  if (formData.ageMin !== null) searchParams.ageMin = formData.ageMin;
  if (formData.ageMax !== null) searchParams.ageMax = formData.ageMax;
  if (formData.idCard) searchParams.idCard = formData.idCard;
  if (formData.ethnicity) searchParams.ethnicity = formData.ethnicity;
  if (formData.politicalStatus) searchParams.politicalStatus = formData.politicalStatus;

  // 处理联系方式
  if (formData.phone) searchParams.phone = formData.phone;
  if (formData.address) searchParams.address = formData.address;
  if (formData.wechat) searchParams.wechat = formData.wechat;

  // 处理教育就业
  if (formData.education) searchParams.education = formData.education;
  if (formData.employment) searchParams.employment = formData.employment;
  if (formData.employer) searchParams.employer = formData.employer;

  // 处理健康状况
  if (formData.healthStatus) searchParams.healthStatus = formData.healthStatus;
  if (formData.bloodType) searchParams.bloodType = formData.bloodType;
  if (formData.maritalStatus) searchParams.maritalStatus = formData.maritalStatus;

  // 处理特殊标签
  if (formData.tags.length > 0) searchParams.tags = formData.tags;

  // 处理家庭信息
  if (formData.familyCode) searchParams.familyCode = formData.familyCode;
  if (formData.familyType) searchParams.familyType = formData.familyType;
  if (formData.familySizeMin !== null) searchParams.familySizeMin = formData.familySizeMin;
  if (formData.familySizeMax !== null) searchParams.familySizeMax = formData.familySizeMax;

  // 处理社会保障
  if (formData.medicalInsurance)
    searchParams.medicalInsurance = formData.medicalInsurance === 'true';
  if (formData.insuranceType) searchParams.insuranceType = formData.insuranceType;
  if (formData.pensionInsurance)
    searchParams.pensionInsurance = formData.pensionInsurance === 'true';

  // 处理日期范围
  if (formData.createdAtRange && formData.createdAtRange.length === 2) {
    searchParams.createdAtStart = formData.createdAtRange[0];
    searchParams.createdAtEnd = formData.createdAtRange[1];
  }
  if (formData.updatedAtRange && formData.updatedAtRange.length === 2) {
    searchParams.updatedAtStart = formData.updatedAtRange[0];
    searchParams.updatedAtEnd = formData.updatedAtRange[1];
  }

  // 处理状态
  if (formData.status) searchParams.status = formData.status;

  emit('search', searchParams);
};

// 重置表单
const handleReset = () => {
  formRef.value.resetFields();

  // 重置数组类型的数据
  formData.tags = [];
  formData.createdAtRange = [];
  formData.updatedAtRange = [];

  emit('reset');
};

// 导出结果
const handleExport = () => {
  ElMessage.info('导出功能开发中...');
};

// 保存为模板
const handleSaveTemplate = () => {
  ElMessageBox.prompt('请输入模板名称', '保存搜索模板', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /^.{1,20}$/,
    inputErrorMessage: '模板名称长度在1到20个字符',
  })
    .then(({ value }) => {
      // 保存模板到本地存储
      const templates = JSON.parse(localStorage.getItem('searchTemplates') || '[]');
      templates.push({
        name: value,
        filters: { ...formData },
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('searchTemplates', JSON.stringify(templates));
      ElMessage.success('模板保存成功');
    })
    .catch(() => {
      // 用户取消
    });
};

// 初始化
initFormData();
</script>

<style lang="scss" scoped>
.profile-search-form {
  .search-section {
    margin-bottom: 25px;
    padding-bottom: 15px;
    border-bottom: 1px solid #e4e7ed;

    h4 {
      margin: 0 0 15px 0;
      color: #409eff;
      font-size: 14px;
      font-weight: 500;
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .search-actions {
    margin-top: 30px;
    text-align: center;

    .el-button {
      margin: 0 10px;
      min-width: 100px;
    }
  }
}

:deep(.el-checkbox-group) {
  .el-checkbox {
    margin-right: 15px;
    margin-bottom: 10px;
  }
}
</style>
