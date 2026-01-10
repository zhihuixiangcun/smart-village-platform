<template>
  <div class="official-register-container">
    <div class="register-wrapper">
      <!-- 左侧介绍区域 -->
      <div class="info-section">
        <div class="info-content">
          <div class="brand-header">
            <div class="logo-container">
              <div class="logo-shield">
                <el-icon class="official-icon" :size="48"><OfficeBuilding /></el-icon>
              </div>
              <h1 class="brand-title">乡镇干部申请</h1>
              <p class="brand-subtitle">服务乡村建设，促进乡村振兴</p>
            </div>
          </div>
          
          <div class="responsibility-section">
            <h3 class="section-title">主要职责</h3>
            <div class="responsibility-grid">
              <div class="responsibility-item">
                <div class="responsibility-icon">
                  <el-icon><Document /></el-icon>
                </div>
                <div class="responsibility-text">
                  <h4>村务管理</h4>
                  <p>负责村级日常事务管理和决策</p>
                </div>
              </div>
              
              <div class="responsibility-item">
                <div class="responsibility-icon">
                  <el-icon><UserGroup /></el-icon>
                </div>
                <div class="responsibility-text">
                  <h4>民生服务</h4>
                  <p>为村民提供便民服务和政策咨询</p>
                </div>
              </div>
              
              <div class="responsibility-item">
                <div class="responsibility-icon">
                  <el-icon><DataAnalysis /></el-icon>
                </div>
                <div class="responsibility-text">
                  <h4>数据统计</h4>
                  <p>收集整理村级数据和人口信息</p>
                </div>
              </div>
              
              <div class="responsibility-item">
                <div class="responsibility-icon">
                  <el-icon><Promotion /></el-icon>
                </div>
                <div class="responsibility-text">
                  <h4>政策执行</h4>
                  <p>传达执行上级政策和农业补贴</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="requirements-section">
            <h3 class="section-title">任职要求</h3>
            <ul class="requirements-list">
              <li><el-icon><Check /></el-icon>具有中华人民共和国国籍，年满18周岁</li>
              <li><el-icon><Check /></el-icon>具有良好的政治素质和道德品质</li>
              <li><el-icon><Check /></el-icon>熟悉当地村情，热爱农村工作</li>
              <li><el-icon><Check /></el-icon>具备基本的组织协调和沟通能力</li>
              <li><el-icon><Check /></el-icon>能够熟练使用智能手机和基本办公软件</li>
            </ul>
          </div>
        </div>
      </div>
      
      <!-- 右侧注册表单区域 -->
      <div class="form-section">
        <el-card class="register-card" shadow="never">
          <template #header>
            <div class="form-header">
              <div class="form-title">
                <h2>乡镇干部申请表</h2>
                <p class="form-subtitle">请如实填写以下信息，我们将严格审核您的申请</p>
              </div>
              <div class="official-badge">
                <el-tag type="warning" effect="plain" size="large">
                  <el-icon><Star /></el-icon>
                  乡镇干部
                </el-tag>
              </div>
            </div>
          </template>
          
          <el-form
            ref="officialFormRef"
            :model="officialForm"
            :rules="officialRules"
            label-position="top"
            size="large"
          >
            <!-- 个人基本信息 -->
            <div class="form-section-block">
              <h3 class="block-title">
                <el-icon><User /></el-icon>
                个人基本信息
              </h3>
              
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="真实姓名" prop="name">
                    <el-input
                      v-model="officialForm.name"
                      placeholder="请输入真实姓名"
                      clearable
                    >
                      <template #prefix>
                        <el-icon><User /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
                
                <el-col :span="12">
                  <el-form-item label="性别" prop="gender">
                    <el-select
                      v-model="officialForm.gender"
                      placeholder="请选择性别"
                      style="width: 100%"
                      clearable
                    >
                      <el-option label="男" value="male" />
                      <el-option label="女" value="female" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="手机号码" prop="phone">
                    <el-input
                      v-model="officialForm.phone"
                      placeholder="请输入11位手机号"
                      maxlength="11"
                      clearable
                    >
                      <template #prefix>
                        <el-icon><Phone /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
                
                <el-col :span="12">
                  <el-form-item label="电子邮箱" prop="email">
                    <el-input
                      v-model="officialForm.email"
                      placeholder="请输入电子邮箱"
                      clearable
                    >
                      <template #prefix>
                        <el-icon><Message /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
              </el-row>
              
              <el-form-item label="身份证号码" prop="idCard">
                <el-input
                  v-model="officialForm.idCard"
                  placeholder="请输入18位身份证号"
                  maxlength="18"
                  clearable
                >
                  <template #prefix>
                    <el-icon><Postcard /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </div>
            
            <!-- 工作信息 -->
            <div class="form-section-block">
              <h3 class="block-title">
                <el-icon><Briefcase /></el-icon>
                工作信息
              </h3>
              
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="申请职务" prop="position">
                    <el-select
                      v-model="officialForm.position"
                      placeholder="请选择申请职务"
                      style="width: 100%"
                      clearable
                    >
                      <el-option label="乡镇书记" value="乡镇书记" />
                      <el-option label="乡镇长" value="乡镇长" />
                      <el-option label="副乡镇长" value="副乡镇长" />
                      <el-option label="部门负责人" value="部门负责人" />
                      <el-option label="工作人员" value="工作人员" />
                    </el-select>
                  </el-form-item>
                </el-col>
                
                <el-col :span="12">
                  <el-form-item label="所属部门" prop="department">
                    <el-input
                      v-model="officialForm.department"
                      placeholder="如：乡镇办公室、财务部、民政部等"
                      clearable
                    />
                  </el-form-item>
                </el-col>
              </el-row>
              
              <el-form-item label="所属乡镇" prop="townshipId">
                <el-select
                  v-model="officialForm.townshipId"
                  placeholder="请选择所属乡镇"
                  style="width: 100%"
                  filterable
                  clearable
                  @change="onTownshipChange"
                >
                  <el-option
                    v-for="township in townships"
                    :key="township.id"
                    :label="township.name"
                    :value="township.id"
                  />
                </el-select>
              </el-form-item>
              
              <div v-if="villages.length > 0" style="margin-bottom: 20px;">
                <el-divider content-position="left" style="margin: 16px 0 8px 0;">
                  <span style="color: #909399; font-size: 12px;">请选择所属村庄（必填）</span>
                </el-divider>
                <el-form-item label="所属村庄" prop="villageId">
                  <el-select
                    v-model="officialForm.villageId"
                    placeholder="请选择所属村庄"
                    style="width: 100%"
                    filterable
                    clearable
                    @change="onVillageChange"
                  >
                    <el-option
                      v-for="village in villages"
                      :key="village._id || village.code"
                      :label="village.name"
                      :value="village._id || village.code"
                    />
                  </el-select>
                </el-form-item>
              </div>
              
              <el-form-item label="详细地址" prop="address" style="margin-top: 20px;">
                <el-input
                  v-model="officialForm.address"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入详细工作地址"
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>
              
              <div v-if="selectedVillageName" style="margin-top: 16px; padding: 12px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #409eff;">
                <div style="font-weight: 600; color: #303133; margin-bottom: 8px;">
                  <el-icon><Location /></el-icon>
                  已选择的行政区划
                </div>
                <div style="color: #606266; font-size: 14px; line-height: 1.6;">
                  <div style="margin-bottom: 4px;"><span style="color: #909399;">省份：</span>{{ officialForm.provinceName || '-' }}</div>
                  <div style="margin-bottom: 4px;"><span style="color: #909399;">城市：</span>{{ officialForm.cityName || '-' }}</div>
                  <div style="margin-bottom: 4px;"><span style="color: #909399;">区县：</span>{{ officialForm.districtName || '-' }}</div>
                  <div style="margin-bottom: 4px;"><span style="color: #909399;">乡镇：</span>{{ officialForm.townshipName || '-' }}</div>
                  <div><span style="color: #409eff; font-weight: 500;">村庄：</span>{{ selectedVillageName }}</div>
                </div>
              </div>
            </div>
            
            <!-- 申请材料 -->
            <div class="form-section-block">
              <h3 class="block-title">
                <el-icon><Document /></el-icon>
                申请材料
              </h3>
              
              <el-form-item label="申请理由" prop="reason">
                <el-input
                  v-model="officialForm.reason"
                  type="textarea"
                  :rows="4"
                  placeholder="请详细说明申请担任乡镇干部职务的理由、工作计划和个人优势（至少100字）"
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>
              
              <el-form-item label="工作经验" prop="experience">
                <el-input
                  v-model="officialForm.experience"
                  type="textarea"
                  :rows="3"
                  placeholder="请简述您的工作经验，特别是与村务管理、民生服务相关的经历"
                  maxlength="300"
                  show-word-limit
                />
              </el-form-item>
              
              <el-form-item label="个人特长" prop="skills">
                <el-checkbox-group v-model="officialForm.skills">
                  <el-checkbox v-for="skill in skillOptions" :key="skill" :label="skill">
                    {{ skill }}
                  </el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </div>
            
            <!-- 账户设置 -->
            <div class="form-section-block">
              <h3 class="block-title">
                <el-icon><Lock /></el-icon>
                账户设置
              </h3>
              
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="设置密码" prop="password">
                    <el-input
                      v-model="officialForm.password"
                      type="password"
                      placeholder="请设置8-20位密码"
                      show-password
                    @input="updatePasswordStrength"
                    >
                      <template #prefix>
                        <el-icon><Lock /></el-icon>
                      </template>
                    </el-input>
                    
                    <div v-if="officialForm.password" class="password-strength">
                      <div class="strength-bar-container">
                        <div class="strength-bar" :class="passwordStrength.class" :style="{ width: passwordStrength.width, background: passwordStrength.color }"></div>
                      </div>
                      <span class="strength-text" :style="{ color: passwordStrength.color }">{{ passwordStrength.text }}</span>
                    </div>
                  </el-form-item>
                </el-col>
                
                <el-col :span="12">
                  <el-form-item label="确认密码" prop="confirmPassword">
                    <el-input
                      v-model="officialForm.confirmPassword"
                      type="password"
                      placeholder="请再次输入密码"
                      show-password
                    >
                      <template #prefix>
                        <el-icon><Lock /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
              </el-row>
              
              <el-form-item label="手机验证码" prop="verifyCode">
                <div class="verify-code-container">
                  <el-input
                    v-model="officialForm.verifyCode"
                    placeholder="请输入6位验证码"
                    maxlength="6"
                  clearable
                  >
                    <template #prefix>
                      <el-icon><Postcard /></el-icon>
                    </template>
                  </el-input>
                  
                  <el-button
                    type="primary"
                    :disabled="!canSendCode || codeCountdown > 0"
                    @click="sendVerifyCode"
                  >
                    {{ codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码' }}
                  </el-button>
                </div>
                
                <el-alert
                  title="验证码已发送到您的手机"
                  type="info"
                  :closable="false"
                  v-if="codeSent"
                />
                
                <div class="verify-tips">
                  <p>• 验证码有效期为10分钟</p>
                  <p>• 同一手机号60秒内只能发送一次</p>
                  <p>• 请勿将验证码告知他人</p>
                </div>
              </el-form-item>
            </div>
            
            <!-- 服务协议 -->
            <div class="form-section-block agreement-section">
              <el-checkbox v-model="officialForm.agreement">
                <span>我已阅读并同意</span>
                <el-link type="primary" @click="showTerms = true">《用户服务协议》</el-link>
                <span>和</span>
                <el-link type="primary" @click="showPrivacy = true">《隐私政策》</el-link>
              </el-checkbox>
            </div>
            
            <el-form-item>
              <el-button
                type="primary"
                :loading="submitting"
                :disabled="!canSubmit"
                size="large"
                class="submit-btn"
                @click="handleSubmit"
              >
                <el-icon><UserFilled /></el-icon>
                {{ submitting ? '提交申请中...' : '提交申请' }}
              </el-button>
              
              <div class="submit-note">
                <el-icon><InfoFilled /></el-icon>
                提交后我们将进行审核，审核结果将通过短信通知您
              </div>
            </el-form-item>
          </el-form>
        </el-card>
        
        <div class="form-footer">
          <span>已有账号？</span>
          <el-link type="primary" @click="goToLogin">立即登录</el-link>
        </div>
      </div>
    </div>
    
    <!-- 服务协议对话框 -->
    <el-dialog
      v-model="showTerms"
      title="用户服务协议"
      width="600px"
      :before-close="handleDialogClose"
    >
      <div class="dialog-content">
        <terms-content />
      </div>
      <template #footer>
        <el-button type="primary" @click="showTerms = false">我已阅读</el-button>
      </template>
    </el-dialog>
    
    <el-dialog
      v-model="showPrivacy"
      title="隐私政策"
      width="600px"
      :before-close="handleDialogClose"
    >
      <div class="dialog-content">
        <privacy-content />
      </div>
      <template #footer>
        <el-button type="primary" @click="showPrivacy = false">我已阅读</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  User,
  Phone,
  Lock,
  UserFilled,
  OfficeBuilding,
  Postcard,
  Message,
  Document,
  UserGroup,
  DataAnalysis,
  Promotion,
  Briefcase,
  Star,
  Check,
  InfoFilled,
  Location
} from '@element-plus/icons-vue';
import villageUserApi from '@/api/villageUser';
import TermsContent from './TermsContent.vue';
import PrivacyContent from './PrivacyContent.vue';

const router = useRouter();
const submitting = ref(false);
const showTerms = ref(false);
const showPrivacy = ref(false);
const codeCountdown = ref(0);
const officialFormRef = ref(null);
const townships = ref([]);
const villages = ref([]);
const selectedVillageName = ref('');

const officialForm = reactive({
  name: '',
  phone: '',
  email: '',
  idCard: '',
  gender: '',
  position: '',
  department: '',
  townshipId: '',
  villageId: '',
  provinceName: '',
  cityName: '',
  districtName: '',
  townshipName: '',
  address: '',
  reason: '',
  experience: '',
  skills: [],
  password: '',
  confirmPassword: '',
  verifyCode: '',
  agreement: false,
  role: 'township_official',
});

const passwordStrength = reactive({
  score: 0,
  width: '0%',
  class: '',
  color: '',
  text: '',
});

const skillOptions = [
  '财务管理',
  '文书写作',
  '电脑操作',
  '沟通协调',
  '组织管理',
  '农业生产',
  '政策解读',
  '群众工作',
];

const staticTownships = [
  { id: '1', name: '鲁贡镇', district: '贞丰县' },
  { id: '2', name: '沙坪镇', district: '贞丰县' },
  { id: '3', name: '白层镇', district: '贞丰县' },
  { id: '4', name: '乐元镇', district: '望谟县' },
  { id: '5', name: '顶效镇', district: '兴义市' },
];

const staticVillages = {
  '1': [
    { id: '69620c30a56e5cb7d408a2fe', code: 'GZZXY1V001A', name: '绿化村' },
    { id: '69620c30a56e5cb7d408a303', code: 'GZZXY1V002A', name: '绿荫村' },
    { id: '69620c30a56e5cb7d408a307', code: 'GZZXY1V003A', name: '查白村' },
    { id: '69620c30a56e5cb7d408a30a', code: 'GZZXY1V004A', name: '楼纳村' }
  ],
  '2': [
    { id: '69620ba44261831e215211b3', code: 'GZZF01V001A', name: '么扒村' },
    { id: '69620ba44261831e215211be', code: 'GZZF01V002A', name: '弄洋村' },
    { id: '69620ba44261831e215211c1', code: 'GZZF01V003A', name: '者央村' },
    { id: '69620ba44261831e215211c4', code: 'GZZF01V004A', name: '林桃村' }
  ],
  '3': [
    { id: '69620d263aae7459331c0a01', code: 'GZZF02V003A', name: '兴龙村' },
    { id: '69620d263aae7459331c0a04', code: 'GZZF02V004A', name: '这年村' },
    { id: '69620d263aae7459331c0a07', code: 'GZZF02V005A', name: '者砍村' },
    { id: '69620d263aae7459331c0a0b', code: 'GZZF02V006A', name: '尼罗村' }
  ],
  '4': [
    { id: '69620ba44261831e215211c7', code: 'GZZW01V001A', name: '乐元村' },
    { id: '69620e87edd9c22fcd029c8d', code: 'GZZW01V002A', name: '里好村' },
    { id: '69620e87edd9c22fcd029c90', code: 'GZZW01V003A', name: '纳管村' },
    { id: '69620e87edd9c22fcd029c93', code: 'GZZW01V004A', name: '董万村' }
  ],
  '5': [
    { id: '69620c30a56e5cb7d408a2fe', code: 'GZZXY1V001A', name: '绿化村' },
    { id: '69620c30a56e5cb7d408a303', code: 'GZZXY1V002A', name: '绿荫村' },
    { id: '69620c30a56e5cb7d408a307', code: 'GZZXY1V003A', name: '查白村' },
    { id: '69620c30a56e5cb7d408a30a', code: 'GZZXY1V004A', name: '楼纳村' }
  ]
};

const officialRules = reactive({
  name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在2-20个字符', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入电子邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的电子邮箱', trigger: 'blur' },
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号', trigger: 'blur' },
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' },
  ],
  position: [
    { required: true, message: '请选择申请职务', trigger: 'change' },
  ],
  department: [
    { required: true, message: '请输入所属部门', trigger: 'blur' },
  ],
  townshipId: [
    { required: true, message: '请选择所属乡镇', trigger: 'change' },
  ],
  villageId: [
    { 
      validator: (rule, value, callback) => {
        if (villages.value.length > 0 && !value) {
          callback(new Error('请选择所属村庄'));
        } else {
          callback();
        }
      },
      trigger: 'change'
    },
  ],
  address: [
    { required: true, message: '请输入详细工作地址', trigger: 'blur' },
    { min: 5, message: '地址长度至少5个字符', trigger: 'blur' },
  ],
  reason: [
    { required: true, message: '请输入申请理由', trigger: 'blur' },
    { min: 100, message: '申请理由至少100字', trigger: 'blur' },
  ],
  experience: [
    { required: true, message: '请输入工作经验', trigger: 'blur' },
    { min: 20, message: '工作经验至少20字', trigger: 'blur' },
  ],
  skills: [
    { 
      type: 'array',
      required: true,
      message: '请选择个人特长',
      trigger: 'change'
    },
  ],
  password: [
    { required: true, message: '请设置密码', trigger: 'blur' },
    { min: 8, max: 20, message: '密码长度在8-20个字符', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (value && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,20}$/.test(value)) {
          callback(new Error('密码必须包含大小写字母和数字'));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== officialForm.password) {
          callback(new Error('两次输入的密码不一致'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
  verifyCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' },
  ],
  agreement: [
    {
      type: 'enum',
      enum: [true],
      message: '请阅读并同意用户协议和隐私政策',
      trigger: 'change',
    },
  ],
});

const canSendCode = computed(() => {
  return /^1[3-9]\d{9}$/.test(officialForm.phone) && codeCountdown.value === 0;
});

const canSubmit = computed(() => {
  const requiredFields = ['name', 'phone', 'idCard', 'gender', 'position', 'department', 
                          'townshipId', 'villageId', 'address', 'reason', 'experience', 'password', 
                          'confirmPassword', 'verifyCode'];
  const hasRequired = requiredFields.every(field => officialForm[field]);
  const hasSkills = officialForm.skills.length > 0;
  const hasAgreement = officialForm.agreement;
  const passwordsMatch = officialForm.password === officialForm.confirmPassword;
  
  return hasRequired && hasSkills && hasAgreement && passwordsMatch;
});

const updatePasswordStrength = () => {
  const pwd = officialForm.password;
  let score = 0;
  
  if (pwd.length >= 8) score += 25;
  if (/[A-Z]/.test(pwd)) score += 25;
  if (/[a-z]/.test(pwd)) score += 25;
  if (/[0-9]/.test(pwd)) score += 25;
  
  passwordStrength.score = score;
  
  if (score <= 25) {
    passwordStrength.width = '25%';
    passwordStrength.class = 'weak';
    passwordStrength.color = '#ef4444';
    passwordStrength.text = '弱';
  } else if (score <= 50) {
    passwordStrength.width = '50%';
    passwordStrength.class = 'fair';
    passwordStrength.color = '#f59e0b';
    passwordStrength.text = '中等';
  } else if (score <= 75) {
    passwordStrength.width = '75%';
    passwordStrength.class = 'good';
    passwordStrength.color = '#10b981';
    passwordStrength.text = '良好';
  } else {
    passwordStrength.width = '100%';
    passwordStrength.class = 'strong';
    passwordStrength.color = '#059669';
    passwordStrength.text = '很强';
  }
};

const sendVerifyCode = async () => {
  if (!canSendCode.value) {
    ElMessage.warning('请先输入正确的手机号码');
    return;
  }
  
  try {
    ElMessage.success('验证码已发送到您的手机');
    codeCountdown.value = 60;
    const timer = setInterval(() => {
      codeCountdown.value--;
      if (codeCountdown.value <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  } catch (error) {
    ElMessage.error('发送验证码失败，请重试');
  }
};

const handleSubmit = async () => {
  if (!officialFormRef.value) return;
  
  try {
    await officialFormRef.value.validate();
  } catch (error) {
    ElMessage.error('请检查表单信息是否完整');
    return;
  }
  
  submitting.value = true;
  try {
    const { confirmPassword, agreement, ...data } = officialForm;
    await villageUserApi.register(data);
    
    ElMessage.success('申请提交成功！审核结果将通过短信通知您。');
    setTimeout(() => {
      router.push('/auth/login');
    }, 2000);
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '提交申请失败，请重试');
  } finally {
    submitting.value = false;
  }
};

const handleDialogClose = (done) => {
  done();
};

const goToLogin = () => {
  router.push('/auth/login');
};

const goToRegister = () => {
  router.push('/auth/unified-register');
};

const onTownshipChange = async (id) => {
  if (!id) {
    villages.value = [];
    officialForm.villageId = '';
    officialForm.provinceName = '';
    officialForm.cityName = '';
    officialForm.districtName = '';
    officialForm.townshipName = '';
    selectedVillageName.value = '';
    return;
  }

  const township = townships.value.find(t => t.id === id);
  officialForm.townshipName = township?.name || '';
  officialForm.districtName = township?.district || '';
  officialForm.provinceName = '贵州省';
  officialForm.cityName = township?.district === '兴义市' ? '兴义市' : 
                    (township?.district === '贞丰县' ? '黔西南州' :
                    township?.district === '望谟县' ? '黔西南州' : '');

  loading.villages.value = true;
  try {
    const villageData = staticVillages[id] || [];
    villages.value = villageData;
    officialForm.villageId = '';
    selectedVillageName.value = '';
  } catch (error) {
    console.error('加载村庄数据失败:', error);
    ElMessage.error('加载村庄数据失败');
  } finally {
    loading.villages.value = false;
  }
};

const onVillageChange = (code) => {
  if (!code) {
    selectedVillageName.value = '';
    return;
  }

  const village = villages.value.find(v => (v._id || v.code) === code);
  if (village) {
    selectedVillageName.value = village.name;
    officialForm.villageName = village.name;
  }
};

onMounted(() => {
  townships.value = staticTownships;
});
</script>

<style scoped>
.official-register-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.register-wrapper {
  display: flex;
  max-width: 1200px;
  width: 100%;
  min-height: 700px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

/* 左侧信息区域 */
.info-section {
  flex: 1;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.brand-header {
  text-align: center;
  margin-bottom: 60px;
}

.logo-container {
  margin-bottom: 20px;
}

.logo-shield {
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.official-icon {
  color: white;
}

.brand-title {
  color: white;
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 16px 0;
}

.brand-subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  margin: 0;
}

/* 职责说明 */
.responsibility-section {
  margin-bottom: 40px;
}

.section-title {
  color: white;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  text-align: center;
}

.responsibility-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.responsibility-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 12px;
  transition: transform 0.3s ease;
}

.responsibility-item:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.15);
}

.responsibility-icon {
  color: #fbbf24;
  font-size: 32px;
  margin-bottom: 12px;
}

.responsibility-text h4 {
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.responsibility-text p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
}

/* 任职要求 */
.requirements-section {
  background: rgba(255, 255, 255, 0.1);
  padding: 30px;
  border-radius: 12px;
}

.requirements-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.requirements-list li {
  color: white;
  font-size: 15px;
  padding: 10px 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  opacity: 0.9;
}

.requirements-list .el-icon {
  color: #fbbf24;
  font-size: 16px;
  flex-shrink: 0;
}

/* 右侧表单区域 */
.form-section {
  flex: 1.2;
  padding: 40px;
  background: white;
  overflow-y: auto;
  max-height: 100vh;
}

.register-card {
  box-shadow: none;
  border: none;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f3f4f6;
}

.form-title h2 {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.form-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.official-badge {
  flex-shrink: 0;
}

/* 表单区块 */
.form-section-block {
  margin-bottom: 32px;
  padding: 20px;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.block-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.block-title .el-icon {
  color: #f59e0b;
}

/* 密码强度 */
.password-strength {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.strength-label {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}

.strength-bar-container {
  flex: 1;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.strength-bar {
  height: 100%;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.strength-bar.weak {
  background: #ef4444;
}

.strength-bar.fair {
  background: #f59e0b;
}

.strength-bar.good {
  background: #10b981;
}

.strength-bar.strong {
  background: #059669;
}

.strength-text {
  font-size: 12px;
  font-weight: 600;
}

/* 验证码输入 */
.verify-code-container {
  display: flex;
  gap: 12px;
}

.verify-tips {
  margin-top: 12px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}

.verify-tips p {
  margin: 4px 0;
  color: #606266;
  font-size: 12px;
  line-height: 1.5;
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none;
  transition: all 0.3s ease;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(245, 151, 11, 0.3);
}

.submit-note {
  margin-top: 12px;
  text-align: center;
  color: #909399;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* 对话框 */
.dialog-content {
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.6;
  color: #374151;
}

.form-footer {
  margin-top: 30px;
  text-align: center;
}

.form-footer span {
  color: #6b7280;
}

.form-footer .el-link {
  margin-left: 8px;
  font-size: 15px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .register-wrapper {
    flex-direction: column;
  }
  
  .info-section {
    padding: 30px 20px;
  }
  
  .form-section {
    padding: 30px 24px;
  }
}

@media (max-width: 640px) {
  .responsibility-grid {
    grid-template-columns: 1fr;
  }
  
  .register-wrapper {
    padding: 10px;
  }
}
</style>
