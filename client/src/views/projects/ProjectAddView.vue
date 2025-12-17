<template>
  <div class="project-add">
    <el-container>
      <!-- 页面头部 -->
      <el-header class="page-header">
        <div class="header-content">
          <div class="title-section">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
              <el-breadcrumb-item :to="{ path: '/projects' }">项目管理</el-breadcrumb-item>
              <el-breadcrumb-item>新建项目</el-breadcrumb-item>
            </el-breadcrumb>
            <h1 class="page-title">
              <el-icon><Plus /></el-icon>
              新建项目
            </h1>
          </div>
          <div class="action-section">
            <el-button @click="$router.go(-1)">
              <el-icon><ArrowLeft /></el-icon>
              返回
            </el-button>
          </div>
        </div>
      </el-header>

      <!-- 页面主体 -->
      <el-main class="page-main">
        <el-card shadow="never">
          <el-form
            ref="projectFormRef"
            :model="projectForm"
            :rules="formRules"
            label-width="120px"
            size="large"
          >
            <!-- 基本信息 -->
            <div class="form-section">
              <h3 class="section-title">基本信息</h3>

              <el-row :gutter="24">
                <el-col :span="12">
                  <el-form-item label="项目名称" prop="name">
                    <el-input
                      v-model="projectForm.name"
                      placeholder="请输入项目名称"
                      clearable
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="项目类型" prop="type">
                    <el-select
                      v-model="projectForm.type"
                      placeholder="请选择项目类型"
                      style="width: 100%"
                    >
                      <el-option label="基础设施" value="infrastructure" />
                      <el-option label="教育培训" value="education" />
                      <el-option label="福利保障" value="welfare" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="项目描述" prop="description">
                <el-input
                  v-model="projectForm.description"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入项目描述"
                />
              </el-form-item>

              <el-row :gutter="24">
                <el-col :span="12">
                  <el-form-item label="项目负责人" prop="manager">
                    <el-input
                      v-model="projectForm.manager"
                      placeholder="请输入负责人姓名"
                      clearable
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="项目状态" prop="status">
                    <el-select
                      v-model="projectForm.status"
                      placeholder="请选择项目状态"
                      style="width: 100%"
                    >
                      <el-option label="规划中" value="planning" />
                      <el-option label="进行中" value="in_progress" />
                      <el-option label="已完成" value="completed" />
                      <el-option label="暂停" value="suspended" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
            </div>

            <!-- 时间信息 -->
            <div class="form-section">
              <h3 class="section-title">时间信息</h3>

              <el-row :gutter="24">
                <el-col :span="12">
                  <el-form-item label="开始时间" prop="startDate">
                    <el-date-picker
                      v-model="projectForm.startDate"
                      type="date"
                      placeholder="选择开始时间"
                      style="width: 100%"
                      format="YYYY-MM-DD"
                      value-format="YYYY-MM-DD"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="预计完成时间" prop="expectedEndDate">
                    <el-date-picker
                      v-model="projectForm.expectedEndDate"
                      type="date"
                      placeholder="选择预计完成时间"
                      style="width: 100%"
                      format="YYYY-MM-DD"
                      value-format="YYYY-MM-DD"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>

            <!-- 预算信息 -->
            <div class="form-section">
              <h3 class="section-title">预算信息</h3>

              <el-row :gutter="24">
                <el-col :span="12">
                  <el-form-item label="项目预算" prop="budget">
                    <el-input-number
                      v-model="projectForm.budget"
                      :min="0"
                      :precision="2"
                      style="width: 100%"
                      placeholder="请输入项目预算"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="已使用预算">
                    <el-input-number
                      v-model="projectForm.spent"
                      :min="0"
                      :precision="2"
                      style="width: 100%"
                      placeholder="请输入已使用预算"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>

            <!-- 进度信息 -->
            <div class="form-section">
              <h3 class="section-title">进度信息</h3>

              <el-form-item label="当前进度" prop="progress">
                <el-slider
                  v-model="projectForm.progress"
                  :max="100"
                  :step="5"
                  show-input
                  input-size="small"
                  :format-tooltip="(val) => `${val}%`"
                />
              </el-form-item>
            </div>

            <!-- 里程碑 -->
            <div class="form-section">
              <h3 class="section-title">项目里程碑</h3>

              <div v-for="(milestone, index) in projectForm.milestones" :key="index" class="milestone-item">
                <el-row :gutter="24">
                  <el-col :span="6">
                    <el-form-item :label="`里程碑${index + 1}名称`">
                      <el-input
                        v-model="milestone.name"
                        placeholder="里程碑名称"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="描述">
                      <el-input
                        v-model="milestone.description"
                        placeholder="里程碑描述"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="预计完成时间">
                      <el-date-picker
                        v-model="milestone.expectedDate"
                        type="date"
                        placeholder="选择时间"
                        style="width: 100%"
                        format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="4">
                    <el-form-item label="操作">
                      <el-button
                        type="danger"
                        size="small"
                        @click="removeMilestone(index)"
                        :disabled="projectForm.milestones.length <= 1"
                      >
                        删除
                      </el-button>
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>

              <el-button
                type="dashed"
                @click="addMilestone"
                style="width: 100%; margin-top: 10px;"
              >
                <el-icon><Plus /></el-icon>
                添加里程碑
              </el-button>
            </div>

            <!-- 表单操作 -->
            <div class="form-actions">
              <el-button size="large" @click="resetForm">
                重置
              </el-button>
              <el-button size="large" @click="saveDraft">
                保存草稿
              </el-button>
              <el-button
                type="primary"
                size="large"
                @click="submitForm"
                :loading="submitting"
              >
                创建项目
              </el-button>
            </div>
          </el-form>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowLeft } from '@element-plus/icons-vue'

// 响应式数据
const router = useRouter()
const projectFormRef = ref()
const submitting = ref(false)

const projectForm = reactive({
  name: '',
  type: '',
  description: '',
  manager: '',
  status: 'planning',
  startDate: '',
  expectedEndDate: '',
  budget: 0,
  spent: 0,
  progress: 0,
  milestones: [
    {
      name: '',
      description: '',
      expectedDate: ''
    }
  ]
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 2, max: 50, message: '项目名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择项目类型', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入项目描述', trigger: 'blur' },
    { min: 10, max: 500, message: '项目描述长度在 10 到 500 个字符', trigger: 'blur' }
  ],
  manager: [
    { required: true, message: '请输入项目负责人', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择项目状态', trigger: 'change' }
  ],
  startDate: [
    { required: true, message: '请选择开始时间', trigger: 'change' }
  ],
  expectedEndDate: [
    { required: true, message: '请选择预计完成时间', trigger: 'change' }
  ],
  budget: [
    { required: true, message: '请输入项目预算', trigger: 'blur' },
    { type: 'number', min: 0, message: '预算必须大于等于0', trigger: 'blur' }
  ]
}

// 方法
const addMilestone = () => {
  projectForm.milestones.push({
    name: '',
    description: '',
    expectedDate: ''
  })
}

const removeMilestone = (index) => {
  projectForm.milestones.splice(index, 1)
}

const resetForm = () => {
  projectFormRef.value?.resetFields()
  projectForm.milestones = [
    {
      name: '',
      description: '',
      expectedDate: ''
    }
  ]
}

const saveDraft = () => {
  ElMessage.success('草稿保存成功（功能开发中）')
}

const submitForm = async () => {
  try {
    // 表单验证
    const valid = await projectFormRef.value?.validate()
    if (!valid) return

    // 日期验证
    if (projectForm.startDate && projectForm.expectedEndDate) {
      if (new Date(projectForm.startDate) > new Date(projectForm.expectedEndDate)) {
        ElMessage.error('开始时间不能晚于预计完成时间')
        return
      }
    }

    // 预算验证
    if (projectForm.spent > projectForm.budget) {
      ElMessage.error('已使用预算不能超过总预算')
      return
    }

    submitting.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500))

    ElMessage.success('项目创建成功')
    router.push('/projects')

  } catch (error) {
    console.error('Submit form error:', error)
    ElMessage.error('创建失败，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.project-add {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0;
  height: auto;
  min-height: 80px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.title-section {
  flex: 1;
  min-width: 300px;
}

.page-title {
  display: flex;
  align-items: center;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 8px 0;

  .el-icon {
    margin-right: 8px;
    color: #409eff;
  }
}

.action-section {
  display: flex;
  gap: 12px;
}

.page-main {
  padding: 24px;
}

.form-section {
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 24px;
  padding-bottom: 8px;
  border-bottom: 2px solid #409eff;
  display: inline-block;
}

.milestone-item {
  margin-bottom: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
  }

  .action-section {
    justify-content: center;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions .el-button {
    width: 100%;
  }
}
</style>