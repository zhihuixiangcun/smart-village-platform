<template>
  <el-dialog
    v-model="visible"
    title="新建项目"
    width="80%"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" @submit.prevent>
      <el-steps :active="currentStep" align-center class="steps-container">
        <el-step title="基本信息" />
        <el-step title="预算资金" />
        <el-step title="时间计划" />
        <el-step title="团队配置" />
        <el-step title="附件上传" />
      </el-steps>

      <!-- 步骤1: 基本信息 -->
      <div v-show="currentStep === 0" class="step-content">
        <h3>项目基本信息</h3>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="项目名称" prop="projectName">
              <el-input
                v-model="form.projectName"
                placeholder="请输入项目名称"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="项目类型" prop="projectType">
              <el-select v-model="form.projectType" placeholder="请选择项目类型">
                <el-option label="基础设施建设" value="infrastructure" />
                <el-option label="公共服务" value="public_service" />
                <el-option label="环境治理" value="environmental" />
                <el-option label="农业发展" value="agricultural" />
                <el-option label="文化建设" value="cultural" />
                <el-option label="民生福利" value="welfare" />
                <el-option label="经济发展" value="economic" />
                <el-option label="数字化建设" value="digital" />
                <el-option label="应急项目" value="emergency" />
                <el-option label="维护改造" value="maintenance" />
                <el-option label="教育培训" value="education" />
                <el-option label="医疗卫生" value="healthcare" />
                <el-option label="旅游发展" value="tourism" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="项目规模" prop="projectScale">
              <el-select v-model="form.projectScale" placeholder="请选择项目规模">
                <el-option label="小型" value="small" />
                <el-option label="中型" value="medium" />
                <el-option label="大型" value="large" />
                <el-option label="超大型" value="mega" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="form.priority" placeholder="请选择优先级">
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
                <el-option label="紧急" value="urgent" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="子分类" prop="subType">
              <el-input v-model="form.subType" placeholder="请输入子分类（可选）" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="项目描述" prop="projectDescription">
          <el-input
            v-model="form.projectDescription"
            type="textarea"
            :rows="4"
            placeholder="请详细描述项目内容、目标和预期效果"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="申请理由" prop="applicationReason">
          <el-input
            v-model="form.application.applicationReason"
            type="textarea"
            :rows="3"
            placeholder="请说明项目申请的理由和必要性"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="预期效益" prop="expectedBenefits">
          <el-select
            v-model="form.application.expectedBenefits"
            multiple
            filterable
            allow-create
            placeholder="请选择或输入预期效益"
          >
            <el-option label="改善基础设施" value="改善基础设施" />
            <el-option label="提升公共服务" value="提升公共服务" />
            <el-option label="增加村民收入" value="增加村民收入" />
            <el-option label="改善生活环境" value="改善生活环境" />
            <el-option label="促进经济发展" value="促进经济发展" />
            <el-option label="文化传承保护" value="文化传承保护" />
          </el-select>
        </el-form-item>
      </div>

      <!-- 步骤2: 预算资金 -->
      <div v-show="currentStep === 1" class="step-content">
        <h3>预算与资金</h3>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="项目总预算" prop="budgetInfo.totalBudget">
              <el-input-number
                v-model="form.budgetInfo.totalBudget"
                :min="0"
                :max="10000000"
                :precision="2"
                placeholder="请输入总预算金额"
                class="full-width"
              >
                <template #suffix>元</template>
              </el-input-number>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="资金来源">
          <div class="funding-sources">
            <div
              v-for="(source, index) in form.budgetInfo.fundingSources"
              :key="index"
              class="funding-source-item"
            >
              <el-row :gutter="10">
                <el-col :span="8">
                  <el-select v-model="source.source" placeholder="资金来源">
                    <el-option label="政府拨款" value="government" />
                    <el-option label="村集体资金" value="village_fund" />
                    <el-option label="社会捐赠" value="donation" />
                    <el-option label="银行贷款" value="loan" />
                    <el-option label="自筹资金" value="self_raised" />
                    <el-option label="企业投资" value="enterprise" />
                    <el-option label="NGO资助" value="ngo" />
                    <el-option label="其他" value="other" />
                  </el-select>
                </el-col>
                <el-col :span="6">
                  <el-input-number
                    v-model="source.amount"
                    :min="0"
                    :precision="2"
                    placeholder="金额"
                    class="full-width"
                  />
                </el-col>
                <el-col :span="6">
                  <el-select v-model="source.status" placeholder="状态">
                    <el-option label="已承诺" value="committed" />
                    <el-option label="待确认" value="pending" />
                    <el-option label="已到账" value="received" />
                  </el-select>
                </el-col>
                <el-col :span="4">
                  <el-button
                    type="danger"
                    size="small"
                    @click="removeFundingSource(index)"
                    :disabled="form.budgetInfo.fundingSources.length <= 1"
                  >
                    删除
                  </el-button>
                </el-col>
              </el-row>
              <el-input
                v-model="source.notes"
                placeholder="备注说明（可选）"
                class="source-notes"
              />
            </div>

            <el-button @click="addFundingSource" type="primary" plain>
              <el-icon><Plus /></el-icon>
              添加资金来源
            </el-button>
          </div>
        </el-form-item>
      </div>

      <!-- 步骤3: 时间计划 -->
      <div v-show="currentStep === 2" class="step-content">
        <h3>时间计划</h3>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="计划开始日期" prop="timeline.plannedStartDate">
              <el-date-picker
                v-model="form.timeline.plannedStartDate"
                type="date"
                placeholder="选择开始日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                class="full-width"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="计划结束日期" prop="timeline.plannedEndDate">
              <el-date-picker
                v-model="form.timeline.plannedEndDate"
                type="date"
                placeholder="选择结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                class="full-width"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="项目阶段">
          <div class="project-phases">
            <div v-for="(phase, index) in form.phases" :key="index" class="phase-item">
              <el-card>
                <template #header>
                  <div class="phase-header">
                    <span>阶段 {{ index + 1 }}</span>
                    <el-button
                      type="danger"
                      size="small"
                      text
                      @click="removePhase(index)"
                      :disabled="form.phases.length <= 1"
                    >
                      删除
                    </el-button>
                  </div>
                </template>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="阶段名称">
                      <el-input v-model="phase.phaseName" placeholder="阶段名称" />
                    </el-form-item>
                  </el-col>

                  <el-col :span="12">
                    <el-form-item label="阶段类型">
                      <el-select v-model="phase.phaseType" placeholder="选择类型">
                        <el-option label="规划阶段" value="planning" />
                        <el-option label="设计阶段" value="design" />
                        <el-option label="审批阶段" value="approval" />
                        <el-option label="准备阶段" value="preparation" />
                        <el-option label="实施阶段" value="implementation" />
                        <el-option label="测试阶段" value="testing" />
                        <el-option label="验收阶段" value="acceptance" />
                        <el-option label="维护阶段" value="maintenance" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="计划开始">
                      <el-date-picker
                        v-model="phase.plannedStartDate"
                        type="date"
                        placeholder="开始日期"
                        format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD"
                        class="full-width"
                      />
                    </el-form-item>
                  </el-col>

                  <el-col :span="12">
                    <el-form-item label="计划结束">
                      <el-date-picker
                        v-model="phase.plannedEndDate"
                        type="date"
                        placeholder="结束日期"
                        format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD"
                        class="full-width"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-form-item label="交付物">
                  <el-select
                    v-model="phase.deliverables"
                    multiple
                    filterable
                    allow-create
                    placeholder="输入或选择交付物"
                  >
                    <el-option label="设计方案" value="设计方案" />
                    <el-option label="技术文档" value="技术文档" />
                    <el-option label="实施报告" value="实施报告" />
                    <el-option label="验收报告" value="验收报告" />
                  </el-select>
                </el-form-item>
              </el-card>
            </div>

            <el-button @click="addPhase" type="primary" plain>
              <el-icon><Plus /></el-icon>
              添加阶段
            </el-button>
          </div>
        </el-form-item>
      </div>

      <!-- 步骤4: 团队配置 -->
      <div v-show="currentStep === 3" class="step-content">
        <h3>团队配置</h3>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="项目经理">
              <el-select
                v-model="form.projectTeam.projectManager.userId"
                placeholder="选择项目经理"
              >
                <el-option
                  v-for="member in availableMembers"
                  :key="member._id"
                  :label="member.realName"
                  :value="member._id"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="技术负责人">
              <el-select
                v-model="form.projectTeam.technicalLeader.userId"
                placeholder="选择技术负责人"
              >
                <el-option
                  v-for="member in availableMembers"
                  :key="member._id"
                  :label="member.realName"
                  :value="member._id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="团队成员">
          <div class="team-members">
            <div
              v-for="(member, index) in form.projectTeam.members"
              :key="index"
              class="member-item"
            >
              <el-row :gutter="10">
                <el-col :span="6">
                  <el-select v-model="member.userId" placeholder="选择成员">
                    <el-option
                      v-for="person in availableMembers"
                      :key="person._id"
                      :label="person.realName"
                      :value="person._id"
                    />
                  </el-select>
                </el-col>
                <el-col :span="6">
                  <el-input v-model="member.role" placeholder="角色职责" />
                </el-col>
                <el-col :span="8">
                  <el-input v-model="member.contact" placeholder="联系方式" />
                </el-col>
                <el-col :span="4">
                  <el-button type="danger" size="small" @click="removeMember(index)">
                    删除
                  </el-button>
                </el-col>
              </el-row>
            </div>

            <el-button @click="addMember" type="primary" plain>
              <el-icon><Plus /></el-icon>
              添加成员
            </el-button>
          </div>
        </el-form-item>
      </div>

      <!-- 步骤5: 附件上传 -->
      <div v-show="currentStep === 4" class="step-content">
        <h3>附件上传</h3>

        <el-form-item label="项目方案">
          <el-upload
            ref="proposalUpload"
            :file-list="proposalFiles"
            :auto-upload="false"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            @change="handleProposalChange"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">支持 PDF、Word、PPT 格式，单个文件不超过 20MB</div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item label="预算文档">
          <el-upload
            ref="budgetUpload"
            :file-list="budgetFiles"
            :auto-upload="false"
            multiple
            accept=".pdf,.xls,.xlsx,.doc,.docx"
            @change="handleBudgetChange"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">支持 Excel、PDF、Word 格式，单个文件不超过 20MB</div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item label="设计图纸">
          <el-upload
            ref="designUpload"
            :file-list="designFiles"
            :auto-upload="false"
            multiple
            accept=".pdf,.dwg,.jpg,.png,.gif"
            @change="handleDesignChange"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">支持 PDF、CAD、图片格式，单个文件不超过 20MB</div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item label="其他文档">
          <el-upload
            ref="otherUpload"
            :file-list="otherFiles"
            :auto-upload="false"
            multiple
            @change="handleOtherChange"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">其他相关文档，单个文件不超过 20MB</div>
            </template>
          </el-upload>
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button v-if="currentStep > 0" @click="prevStep"> 上一步 </el-button>
        <el-button v-if="currentStep < 4" type="primary" @click="nextStep"> 下一步 </el-button>
        <el-button
          v-if="currentStep === 4"
          type="primary"
          @click="submitForm"
          :loading="submitting"
        >
          创建项目
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { projectApi } from '@/api/project';
import { useUserStore } from '@/store/user';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'created']);

const userStore = useUserStore();
const formRef = ref();
const currentStep = ref(0);
const submitting = ref(false);

// 文件列表
const proposalFiles = ref([]);
const budgetFiles = ref([]);
const designFiles = ref([]);
const otherFiles = ref([]);

// 可用成员列表（需要从后端获取）
const availableMembers = ref([]);

// 表单数据
const form = reactive({
  projectName: '',
  projectDescription: '',
  projectType: '',
  subType: '',
  projectScale: 'small',
  priority: 'medium',
  villageId: computed(() => userStore.currentVillage?._id),
  budgetInfo: {
    totalBudget: 0,
    fundingSources: [
      {
        source: '',
        amount: 0,
        status: 'pending',
        notes: '',
      },
    ],
  },
  timeline: {
    plannedStartDate: '',
    plannedEndDate: '',
  },
  phases: [
    {
      phaseName: '规划阶段',
      phaseType: 'planning',
      plannedStartDate: '',
      plannedEndDate: '',
      deliverables: [],
    },
  ],
  projectTeam: {
    projectManager: {
      userId: '',
    },
    technicalLeader: {
      userId: '',
    },
    members: [],
  },
  application: {
    applicationReason: '',
    expectedBenefits: [],
  },
});

// 表单验证规则
const rules = {
  projectName: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 2, max: 200, message: '项目名称长度在 2 到 200 个字符', trigger: 'blur' },
  ],
  projectDescription: [
    { required: true, message: '请输入项目描述', trigger: 'blur' },
    { min: 10, max: 2000, message: '项目描述长度在 10 到 2000 个字符', trigger: 'blur' },
  ],
  projectType: [{ required: true, message: '请选择项目类型', trigger: 'change' }],
  projectScale: [{ required: true, message: '请选择项目规模', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  'budgetInfo.totalBudget': [
    { required: true, message: '请输入项目总预算', trigger: 'blur' },
    { type: 'number', min: 1, message: '预算金额必须大于0', trigger: 'blur' },
  ],
  'timeline.plannedStartDate': [
    { required: true, message: '请选择计划开始日期', trigger: 'change' },
  ],
  'timeline.plannedEndDate': [{ required: true, message: '请选择计划结束日期', trigger: 'change' }],
};

// 计算属性
const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

// 监听弹窗显示
watch(visible, newVal => {
  if (newVal) {
    loadAvailableMembers();
  }
});

// 方法
const loadAvailableMembers = async () => {
  try {
    // 这里应该调用 API 获取村委成员列表
    // const response = await villageCommitteeApi.getMembers(userStore.currentVillage._id)
    // availableMembers.value = response.data

    // 模拟数据
    availableMembers.value = [
      { _id: '1', realName: '张三', position: '村主任' },
      { _id: '2', realName: '李四', position: '村会计' },
      { _id: '3', realName: '王五', position: '技术员' },
    ];
  } catch (error) {
    console.error('加载成员列表失败:', error);
  }
};

const nextStep = () => {
  // 验证当前步骤
  if (!validateCurrentStep()) {
    return;
  }

  if (currentStep.value < 4) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const validateCurrentStep = () => {
  // 根据当前步骤验证不同的字段
  const stepFields = {
    0: ['projectName', 'projectDescription', 'projectType', 'projectScale', 'priority'],
    1: ['budgetInfo.totalBudget'],
    2: ['timeline.plannedStartDate', 'timeline.plannedEndDate'],
    3: [], // 团队配置可选
    4: [], // 附件上传可选
  };

  const fieldsToValidate = stepFields[currentStep.value] || [];

  if (fieldsToValidate.length === 0) return true;

  return new Promise(resolve => {
    formRef.value.validateField(fieldsToValidate, valid => {
      resolve(valid);
    });
  });
};

// 资金来源管理
const addFundingSource = () => {
  form.budgetInfo.fundingSources.push({
    source: '',
    amount: 0,
    status: 'pending',
    notes: '',
  });
};

const removeFundingSource = index => {
  form.budgetInfo.fundingSources.splice(index, 1);
};

// 阶段管理
const addPhase = () => {
  form.phases.push({
    phaseName: '',
    phaseType: 'implementation',
    plannedStartDate: '',
    plannedEndDate: '',
    deliverables: [],
  });
};

const removePhase = index => {
  form.phases.splice(index, 1);
};

// 团队成员管理
const addMember = () => {
  form.projectTeam.members.push({
    userId: '',
    role: '',
    contact: '',
  });
};

const removeMember = index => {
  form.projectTeam.members.splice(index, 1);
};

// 文件上传处理
const handleProposalChange = (file, fileList) => {
  proposalFiles.value = fileList;
};

const handleBudgetChange = (file, fileList) => {
  budgetFiles.value = fileList;
};

const handleDesignChange = (file, fileList) => {
  designFiles.value = fileList;
};

const handleOtherChange = (file, fileList) => {
  otherFiles.value = fileList;
};

// 提交表单
const submitForm = async () => {
  try {
    const valid = await formRef.value.validate();
    if (!valid) return;

    submitting.value = true;

    // 准备表单数据
    const formData = new FormData();

    // 添加基本信息
    Object.keys(form).forEach(key => {
      if (typeof form[key] === 'object' && form[key] !== null) {
        formData.append(key, JSON.stringify(form[key]));
      } else {
        formData.append(key, form[key]);
      }
    });

    // 添加文件
    proposalFiles.value.forEach(file => {
      formData.append('proposalDocuments', file.raw);
    });
    budgetFiles.value.forEach(file => {
      formData.append('budgetDocuments', file.raw);
    });
    designFiles.value.forEach(file => {
      formData.append('designDocuments', file.raw);
    });
    otherFiles.value.forEach(file => {
      formData.append('otherDocuments', file.raw);
    });

    await projectApi.createProject(formData);

    ElMessage.success('项目创建成功');
    emit('created');
    handleClose();
  } catch (error) {
    ElMessage.error('创建项目失败：' + error.message);
  } finally {
    submitting.value = false;
  }
};

const handleClose = () => {
  visible.value = false;
  currentStep.value = 0;
  formRef.value?.resetFields();

  // 清理文件列表
  proposalFiles.value = [];
  budgetFiles.value = [];
  designFiles.value = [];
  otherFiles.value = [];
};
</script>

<style scoped>
.steps-container {
  margin-bottom: 40px;
}

.step-content {
  min-height: 400px;
  padding: 20px 0;
}

.step-content h3 {
  margin-bottom: 24px;
  color: #303133;
  border-bottom: 2px solid #409eff;
  padding-bottom: 8px;
}

.full-width {
  width: 100%;
}

.funding-sources,
.project-phases,
.team-members {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 16px;
  background-color: #fafafa;
}

.funding-source-item,
.member-item {
  margin-bottom: 16px;
  padding: 12px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.source-notes {
  margin-top: 12px;
}

.phase-item {
  margin-bottom: 16px;
}

.phase-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-footer {
  text-align: right;
}

.dialog-footer .el-button {
  margin-left: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .el-dialog {
    width: 95% !important;
    margin: 5px auto !important;
  }

  .step-content {
    padding: 16px 0;
  }

  .funding-source-item .el-row,
  .member-item .el-row {
    flex-direction: column;
  }

  .funding-source-item .el-col,
  .member-item .el-col {
    margin-bottom: 12px;
  }
}
</style>
