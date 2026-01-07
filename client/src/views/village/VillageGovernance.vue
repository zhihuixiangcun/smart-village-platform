<template>
  <div class="village-governance">
    <!-- 顶部导航 -->
    <div class="governance-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/village/home' }">智慧乡村</el-breadcrumb-item>
        <el-breadcrumb-item>村务治理</el-breadcrumb-item>
      </el-breadcrumb>
      <div class="header-actions">
        <el-button type="primary" @click="showNewProjectDialog">
          <el-icon><Plus /></el-icon> 新建项目
        </el-button>
        <el-button type="success" @click="exportFinanceReport">
          <el-icon><Download /></el-icon> 财务报表
        </el-button>
      </div>
    </div>

    <!-- 功能模块选项卡 -->
    <el-tabs v-model="activeTab" class="governance-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="财务管理" name="finance">
        <div class="finance-module">
          <!-- 财务概览 -->
          <el-row :gutter="24" class="finance-overview">
            <el-col :span="6">
              <el-card class="overview-card income">
                <div class="card-content">
                  <div class="amount">¥ 1,258,600</div>
                  <div class="label">本月收入</div>
                  <div class="trend up">+12.5%</div>
                </div>
                <el-icon class="card-icon"><Money /></el-icon>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="overview-card expense">
                <div class="card-content">
                  <div class="amount">¥ 868,420</div>
                  <div class="label">本月支出</div>
                  <div class="trend down">+8.3%</div>
                </div>
                <el-icon class="card-icon"><CreditCard /></el-icon>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="overview-card balance">
                <div class="card-content">
                  <div class="amount">¥ 3,890,180</div>
                  <div class="label">账户余额</div>
                  <div class="trend stable">0.0%</div>
                </div>
                <el-icon class="card-icon"><Wallet /></el-icon>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="overview-card budget">
                <div class="card-content">
                  <div class="amount">78%</div>
                  <div class="label">预算执行率</div>
                  <div class="trend up">+5.2%</div>
                </div>
                <el-icon class="card-icon"><PieChart /></el-icon>
              </el-card>
            </el-col>
          </el-row>

          <!-- 财务操作区 -->
          <div class="finance-actions">
            <el-row :gutter="16">
              <el-col :span="8">
                <el-button type="primary" size="large" @click="showIncomeDialog">
                  <el-icon><Plus /></el-icon> 记录收入
                </el-button>
              </el-col>
              <el-col :span="8">
                <el-button type="warning" size="large" @click="showExpenseDialog">
                  <el-icon><Minus /></el-icon> 记录支出
                </el-button>
              </el-col>
              <el-col :span="8">
                <el-button type="success" size="large" @click="showBudgetDialog">
                  <el-icon><EditPen /></el-icon> 预算管理
                </el-button>
              </el-col>
            </el-row>
          </div>

          <!-- 财务明细表格 -->
          <el-card class="finance-table-card">
            <template #header>
              <div class="table-header">
                <span>财务明细</span>
                <div class="filter-controls">
                  <el-select v-model="financeFilter.type" placeholder="类型" style="width: 120px; margin-right: 12px;">
                    <el-option label="全部" value="" />
                    <el-option label="收入" value="income" />
                    <el-option label="支出" value="expense" />
                  </el-select>
                  <el-date-picker
                    v-model="financeFilter.dateRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                  />
                  <el-button type="primary" @click="loadFinanceData">查询</el-button>
                </div>
              </div>
            </template>

            <el-table :data="financeData" stripe style="width: 100%">
              <el-table-column prop="date" label="日期" width="120" />
              <el-table-column prop="type" label="类型" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.type === 'income' ? 'success' : 'danger'">
                    {{ row.type === 'income' ? '收入' : '支出' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="category" label="分类" width="120" />
              <el-table-column prop="description" label="说明" />
              <el-table-column prop="amount" label="金额" width="120" align="right">
                <template #default="{ row }">
                  <span :class="row.type === 'income' ? 'income-amount' : 'expense-amount'">
                    {{ row.type === 'income' ? '+' : '-' }}¥{{ row.amount.toLocaleString() }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="operator" label="经手人" width="100" />
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button type="primary" link size="small" @click="viewFinanceDetail(row)">查看</el-button>
                  <el-button type="warning" link size="small" @click="editFinanceRecord(row)">编辑</el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="table-pagination">
              <el-pagination
                v-model:current-page="financePage.current"
                v-model:page-size="financePage.size"
                :page-sizes="[10, 20, 50, 100]"
                :total="financePage.total"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="loadFinanceData"
                @current-change="loadFinanceData"
              />
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="项目管理" name="projects">
        <div class="projects-module">
          <!-- 项目统计 -->
          <el-row :gutter="24" class="project-stats">
            <el-col :span="6">
              <el-card class="stat-card">
                <div class="stat-content">
                  <div class="stat-number">{{ projectStats.total }}</div>
                  <div class="stat-label">项目总数</div>
                </div>
                <el-icon class="stat-icon"><FolderOpened /></el-icon>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="stat-card">
                <div class="stat-content">
                  <div class="stat-number">{{ projectStats.inProgress }}</div>
                  <div class="stat-label">进行中</div>
                </div>
                <el-icon class="stat-icon"><Loading /></el-icon>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="stat-card">
                <div class="stat-content">
                  <div class="stat-number">{{ projectStats.completed }}</div>
                  <div class="stat-label">已完成</div>
                </div>
                <el-icon class="stat-icon"><CircleCheck /></el-icon>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="stat-card">
                <div class="stat-content">
                  <div class="stat-number">{{ projectStats.overdue }}</div>
                  <div class="stat-label">已逾期</div>
                </div>
                <el-icon class="stat-icon"><Warning /></el-icon>
              </el-card>
            </el-col>
          </el-row>

          <!-- 项目筛选 -->
          <div class="project-filters">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-select v-model="projectFilter.status" placeholder="项目状态">
                  <el-option label="全部状态" value="" />
                  <el-option label="规划中" value="planning" />
                  <el-option label="进行中" value="in_progress" />
                  <el-option label="已完成" value="completed" />
                  <el-option label="已暂停" value="paused" />
                  <el-option label="已取消" value="cancelled" />
                </el-select>
              </el-col>
              <el-col :span="6">
                <el-select v-model="projectFilter.priority" placeholder="优先级">
                  <el-option label="全部优先级" value="" />
                  <el-option label="紧急" value="urgent" />
                  <el-option label="高" value="high" />
                  <el-option label="中" value="medium" />
                  <el-option label="低" value="low" />
                </el-select>
              </el-col>
              <el-col :span="6">
                <el-select v-model="projectFilter.category" placeholder="项目类别">
                  <el-option label="全部类别" value="" />
                  <el-option label="基础设施" value="infrastructure" />
                  <el-option label="环境整治" value="environment" />
                  <el-option label="公共服务" value="public_service" />
                  <el-option label="产业发展" value="industry" />
                </el-select>
              </el-col>
              <el-col :span="6">
                <el-input
                  v-model="projectFilter.keyword"
                  placeholder="搜索项目名称"
                  @keyup.enter="loadProjects"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </el-col>
            </el-row>
          </div>

          <!-- 项目列表 -->
          <div class="project-list">
            <el-row :gutter="24">
              <el-col :span="8" v-for="project in projectData" :key="project.id">
                <el-card class="project-card" shadow="hover">
                  <div class="project-header">
                    <h4 class="project-title">{{ project.name }}</h4>
                    <el-tag :type="getProjectStatusType(project.status)" size="small">
                      {{ getProjectStatusText(project.status) }}
                    </el-tag>
                  </div>

                  <div class="project-info">
                    <div class="info-item">
                      <span class="label">项目类别：</span>
                      <span class="value">{{ getProjectCategoryText(project.category) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">负责人：</span>
                      <span class="value">{{ project.manager }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">预算：</span>
                      <span class="value">¥{{ project.budget.toLocaleString() }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">截止日期：</span>
                      <span class="value">{{ project.deadline }}</span>
                    </div>
                  </div>

                  <div class="project-progress">
                    <div class="progress-header">
                      <span>进度</span>
                      <span>{{ project.progress }}%</span>
                    </div>
                    <el-progress
                      :percentage="project.progress"
                      :status="project.progress === 100 ? 'success' : ''"
                      :stroke-width="8"
                    />
                  </div>

                  <div class="project-actions">
                    <el-button type="primary" link size="small" @click="viewProjectDetail(project)">
                      查看详情
                    </el-button>
                    <el-button type="success" link size="small" @click="updateProjectProgress(project)">
                      更新进度
                    </el-button>
                    <el-dropdown trigger="click">
                      <el-button type="info" link size="small">
                        更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item @click="editProject(project)">编辑项目</el-dropdown-item>
                          <el-dropdown-item @click="pauseProject(project)" v-if="project.status === 'in_progress'">暂停项目</el-dropdown-item>
                          <el-dropdown-item @click="resumeProject(project)" v-if="project.status === 'paused'">恢复项目</el-dropdown-item>
                          <el-dropdown-item @click="completeProject(project)" v-if="project.status !== 'completed'">完成项目</el-dropdown-item>
                          <el-dropdown-item divided @click="deleteProject(project)">删除项目</el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>

          <!-- 分页 -->
          <div class="pagination">
            <el-pagination
              v-model:current-page="projectPage.current"
              v-model:page-size="projectPage.size"
              :page-sizes="[9, 18, 36, 72]"
              :total="projectPage.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="loadProjects"
              @current-change="loadProjects"
            />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="任务调度" name="tasks">
        <div class="tasks-module">
          <!-- 任务概览 -->
          <el-row :gutter="24" class="task-overview">
            <el-col :span="8">
              <el-card class="task-summary-card">
                <div class="task-summary">
                  <div class="summary-icon emergency">
                    <el-icon><WarningFilled /></el-icon>
                  </div>
                  <div class="summary-content">
                    <div class="summary-number">{{ taskStats.emergency }}</div>
                    <div class="summary-label">紧急任务</div>
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card class="task-summary-card">
                <div class="task-summary">
                  <div class="summary-icon today">
                    <el-icon><Clock /></el-icon>
                  </div>
                  <div class="summary-content">
                    <div class="summary-number">{{ taskStats.today }}</div>
                    <div class="summary-label">今日待办</div>
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card class="task-summary-card">
                <div class="task-summary">
                  <div class="summary-icon completed">
                    <el-icon><CircleCheckFilled /></el-icon>
                  </div>
                  <div class="summary-content">
                    <div class="summary-number">{{ taskStats.completed }}</div>
                    <div class="summary-label">本周完成</div>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <!-- 快速调度面板 -->
          <el-card class="quick-dispatch">
            <template #header>
              <div class="dispatch-header">
                <span>一键调度</span>
                <el-button type="danger" size="small" @click="showEmergencyDispatch">
                  <el-icon><Warning /></el-icon> 紧急调度
                </el-button>
              </div>
            </template>

            <div class="dispatch-options">
              <el-row :gutter="16">
                <el-col :span="6">
                  <div class="dispatch-option" @click="dispatchTask('safety')">
                    <el-icon class="option-icon"><Lock /></el-icon>
                    <div class="option-text">
                      <div class="option-title">安全生产</div>
                      <div class="option-desc">一键呼叫安全巡查</div>
                    </div>
                    <div class="option-count">12人在线</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="dispatch-option" @click="dispatchTask('epidemic')">
                    <el-icon class="option-icon"><FirstAidKit /></el-icon>
                    <div class="option-text">
                      <div class="option-title">疫情防控</div>
                      <div class="option-desc">启动防控预案</div>
                    </div>
                    <div class="option-count">8人在线</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="dispatch-option" @click="dispatchTask('disaster')">
                    <el-icon class="option-icon"><Umbrella /></el-icon>
                    <div class="option-text">
                      <div class="option-title">防灾减灾</div>
                      <div class="option-desc">灾害应急响应</div>
                    </div>
                    <div class="option-count">15人在线</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="dispatch-option" @click="dispatchTask('environment')">
                    <el-icon class="option-icon"><Brush /></el-icon>
                    <div class="option-text">
                      <div class="option-title">环境整治</div>
                      <div class="option-desc">组织清洁行动</div>
                    </div>
                    <div class="option-count">20人在线</div>
                  </div>
                </el-col>
              </el-row>
            </div>
          </el-card>

          <!-- 任务列表 -->
          <el-card class="task-list-card">
            <template #header>
              <div class="task-list-header">
                <span>任务列表</span>
                <div class="task-controls">
                  <el-select v-model="taskFilter.status" placeholder="状态" style="width: 100px; margin-right: 12px;">
                    <el-option label="全部" value="" />
                    <el-option label="待办" value="pending" />
                    <el-option label="进行中" value="in_progress" />
                    <el-option label="已完成" value="completed" />
                  </el-select>
                  <el-button type="primary" @click="showCreateTaskDialog">
                    <el-icon><Plus /></el-icon> 创建任务
                  </el-button>
                </div>
              </div>
            </template>

            <el-table :data="taskData" stripe>
              <el-table-column prop="title" label="任务标题" min-width="200" />
              <el-table-column prop="type" label="类型" width="100">
                <template #default="{ row }">
                  <el-tag :type="getTaskTypeColor(row.type)" size="small">
                    {{ getTaskTypeText(row.type) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="priority" label="优先级" width="100">
                <template #default="{ row }">
                  <el-tag :type="getPriorityType(row.priority)" size="small">
                    {{ getPriorityText(row.priority) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="assignee" label="负责人" width="120" />
              <el-table-column prop="deadline" label="截止时间" width="150" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getTaskStatusType(row.status)" size="small">
                    {{ getTaskStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200">
                <template #default="{ row }">
                  <el-button type="primary" link size="small" @click="viewTaskDetail(row)">查看</el-button>
                  <el-button type="success" link size="small" @click="completeTask(row)" v-if="row.status !== 'completed'">完成</el-button>
                  <el-button type="warning" link size="small" @click="editTask(row)" v-if="row.status !== 'completed'">编辑</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 新建项目对话框 -->
    <el-dialog v-model="projectDialog.visible" title="新建项目" width="800px">
      <el-form :model="projectForm" :rules="projectRules" ref="projectFormRef" label-width="120px">
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="项目名称" prop="name">
              <el-input v-model="projectForm.name" placeholder="请输入项目名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="项目类别" prop="category">
              <el-select v-model="projectForm.category" placeholder="请选择项目类别">
                <el-option label="基础设施" value="infrastructure" />
                <el-option label="环境整治" value="environment" />
                <el-option label="公共服务" value="public_service" />
                <el-option label="产业发展" value="industry" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="项目负责人" prop="manager">
              <el-select v-model="projectForm.manager" placeholder="请选择负责人">
                <el-option label="张书记" value="张书记" />
                <el-option label="李主任" value="李主任" />
                <el-option label="王委员" value="王委员" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="projectForm.priority" placeholder="请选择优先级">
                <el-option label="紧急" value="urgent" />
                <el-option label="高" value="high" />
                <el-option label="中" value="medium" />
                <el-option label="低" value="low" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="预算金额" prop="budget">
              <el-input-number
                v-model="projectForm.budget"
                :min="0"
                :step="1000"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="截止日期" prop="deadline">
              <el-date-picker
                v-model="projectForm.deadline"
                type="date"
                placeholder="选择截止日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="项目描述">
          <el-input
            v-model="projectForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入项目描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="projectDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="createProject">确定</el-button>
      </template>
    </el-dialog>

    <!-- 收入记录对话框 -->
    <el-dialog v-model="incomeDialog.visible" title="记录收入" width="500px">
      <el-form :model="incomeForm" :rules="incomeRules" ref="incomeFormRef" label-width="100px">
        <el-form-item label="收入金额" prop="amount">
          <el-input-number
            v-model="incomeForm.amount"
            :min="0"
            :step="100"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="收入分类" prop="category">
          <el-select v-model="incomeForm.category" placeholder="请选择收入分类" style="width: 100%">
            <el-option label="财政补贴" value="subsidy" />
            <el-option label="项目资金" value="project_fund" />
            <el-option label="集体收入" value="collective_income" />
            <el-option label="捐赠收入" value="donation" />
            <el-option label="其他收入" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="收入说明" prop="description">
          <el-input
            v-model="incomeForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入收入说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="incomeDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveIncome">确定</el-button>
      </template>
    </el-dialog>

    <!-- 支出记录对话框 -->
    <el-dialog v-model="expenseDialog.visible" title="记录支出" width="500px">
      <el-form :model="expenseForm" :rules="expenseRules" ref="expenseFormRef" label-width="100px">
        <el-form-item label="支出金额" prop="amount">
          <el-input-number
            v-model="expenseForm.amount"
            :min="0"
            :step="100"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="支出分类" prop="category">
          <el-select v-model="expenseForm.category" placeholder="请选择支出分类" style="width: 100%">
            <el-option label="基础设施" value="infrastructure" />
            <el-option label="环境整治" value="environment" />
            <el-option label="公共服务" value="public_service" />
            <el-option label="行政支出" value="administrative" />
            <el-option label="其他支出" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="支出说明" prop="description">
          <el-input
            v-model="expenseForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入支出说明"
          />
        </el-form-item>
        <el-form-item label="相关凭证">
          <el-upload
            action="#"
            :auto-upload="false"
            :on-preview="handlePreview"
            :on-remove="handleRemove"
            multiple
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">
                支持上传发票、收据等凭证文件
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="expenseDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveExpense">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import {
  Plus, Download, Money, CreditCard, Wallet, PieChart,
  EditPen, Minus, FolderOpened, Loading, CircleCheck,
  Warning, Search, ArrowDown, Clock, Lock, FirstAidKit,
  Umbrella, Brush, WarningFilled, CircleCheckFilled
} from '@element-plus/icons-vue'

const router = useRouter()

// 数据状态
const activeTab = ref('finance')

// 财务数据
const financeData = ref([
  {
    id: 1,
    date: '2024-01-15',
    type: 'income',
    category: '财政补贴',
    description: '第一季度村级运转经费',
    amount: 50000,
    operator: '张会计'
  },
  {
    id: 2,
    date: '2024-01-18',
    type: 'expense',
    category: '基础设施',
    description: '村内道路维修材料费',
    amount: 12800,
    operator: '李主任'
  },
  {
    id: 3,
    date: '2024-01-20',
    type: 'income',
    category: '项目资金',
    description: '美丽乡村建设补助款',
    amount: 200000,
    operator: '王书记'
  }
])

const financeFilter = reactive({
  type: '',
  dateRange: []
})

const financePage = reactive({
  current: 1,
  size: 10,
  total: 0
})

// 项目数据
const projectStats = reactive({
  total: 24,
  inProgress: 12,
  completed: 8,
  overdue: 4
})

const projectData = ref([
  {
    id: 1,
    name: '村内道路硬化工程',
    category: 'infrastructure',
    manager: '张主任',
    budget: 280000,
    deadline: '2024-03-15',
    progress: 65,
    status: 'in_progress',
    priority: 'high'
  },
  {
    id: 2,
    name: '垃圾分类处理站建设',
    category: 'environment',
    manager: '李委员',
    budget: 150000,
    deadline: '2024-04-20',
    progress: 30,
    status: 'in_progress',
    priority: 'medium'
  },
  {
    id: 3,
    name: '文化活动中心改造',
    category: 'public_service',
    manager: '王主任',
    budget: 120000,
    deadline: '2024-02-28',
    progress: 100,
    status: 'completed',
    priority: 'medium'
  }
])

const projectFilter = reactive({
  status: '',
  priority: '',
  category: '',
  keyword: ''
})

const projectPage = reactive({
  current: 1,
  size: 9,
  total: 0
})

// 任务数据
const taskStats = reactive({
  emergency: 3,
  today: 8,
  completed: 15
})

const taskData = ref([
  {
    id: 1,
    title: '安全生产大检查',
    type: 'safety',
    priority: 'urgent',
    assignee: '张网格员',
    deadline: '2024-01-25 18:00',
    status: 'pending'
  },
  {
    id: 2,
    title: '疫情防控物资配送',
    type: 'epidemic',
    priority: 'high',
    assignee: '李志愿者',
    deadline: '2024-01-24 12:00',
    status: 'in_progress'
  },
  {
    id: 3,
    title: '河道环境巡查',
    type: 'environment',
    priority: 'medium',
    assignee: '王巡查员',
    deadline: '2024-01-26 17:00',
    status: 'pending'
  }
])

const taskFilter = reactive({
  status: ''
})

// 对话框状态
const projectDialog = reactive({
  visible: false
})

const incomeDialog = reactive({
  visible: false
})

const expenseDialog = reactive({
  visible: false
})

// 表单数据
const projectForm = reactive({
  name: '',
  category: '',
  manager: '',
  priority: '',
  budget: 0,
  deadline: '',
  description: ''
})

const incomeForm = reactive({
  amount: 0,
  category: '',
  description: ''
})

const expenseForm = reactive({
  amount: 0,
  category: '',
  description: ''
})

// 表单验证规则
const projectRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择项目类别', trigger: 'change' }],
  manager: [{ required: true, message: '请选择项目负责人', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  budget: [{ required: true, message: '请输入预算金额', trigger: 'blur' }],
  deadline: [{ required: true, message: '请选择截止日期', trigger: 'change' }]
}

const incomeRules = {
  amount: [{ required: true, message: '请输入收入金额', trigger: 'blur' }],
  category: [{ required: true, message: '请选择收入分类', trigger: 'change' }],
  description: [{ required: true, message: '请输入收入说明', trigger: 'blur' }]
}

const expenseRules = {
  amount: [{ required: true, message: '请输入支出金额', trigger: 'blur' }],
  category: [{ required: true, message: '请选择支出分类', trigger: 'change' }],
  description: [{ required: true, message: '请输入支出说明', trigger: 'blur' }]
}

// 方法
const handleTabChange = (tabName) => {
  console.log('切换到标签页:', tabName)
}

const loadFinanceData = () => {
  // 模拟加载财务数据
  financePage.total = 156
}

const loadProjects = () => {
  // 模拟加载项目数据
  projectPage.total = 87
}

const showNewProjectDialog = () => {
  Object.assign(projectForm, {
    name: '',
    category: '',
    manager: '',
    priority: '',
    budget: 0,
    deadline: '',
    description: ''
  })
  projectDialog.visible = true
}

const createProject = () => {
  // 创建项目逻辑
  ElMessage.success('项目创建成功')
  projectDialog.visible = false
  loadProjects()
}

const showIncomeDialog = () => {
  Object.assign(incomeForm, {
    amount: 0,
    category: '',
    description: ''
  })
  incomeDialog.visible = true
}

const saveIncome = () => {
  // 保存收入记录
  ElMessage.success('收入记录保存成功')
  incomeDialog.visible = false
  loadFinanceData()
}

const showExpenseDialog = () => {
  Object.assign(expenseForm, {
    amount: 0,
    category: '',
    description: ''
  })
  expenseDialog.visible = true
}

const saveExpense = () => {
  // 保存支出记录
  ElMessage.success('支出记录保存成功')
  expenseDialog.visible = false
  loadFinanceData()
}

const exportFinanceReport = () => {
  ElMessage.info('正在生成财务报表...')
}

const showBudgetDialog = () => {
  ElMessage.info('预算管理功能开发中')
}

const viewFinanceDetail = (record) => {
  ElMessage.info('查看财务详情')
}

const editFinanceRecord = (record) => {
  ElMessage.info('编辑财务记录')
}

const getProjectStatusType = (status) => {
  const types = {
    planning: 'info',
    in_progress: 'primary',
    completed: 'success',
    paused: 'warning',
    cancelled: 'danger'
  }
  return types[status] || 'info'
}

const getProjectStatusText = (status) => {
  const texts = {
    planning: '规划中',
    in_progress: '进行中',
    completed: '已完成',
    paused: '已暂停',
    cancelled: '已取消'
  }
  return texts[status] || '未知'
}

const getProjectCategoryText = (category) => {
  const texts = {
    infrastructure: '基础设施',
    environment: '环境整治',
    public_service: '公共服务',
    industry: '产业发展'
  }
  return texts[category] || '其他'
}

const viewProjectDetail = (project) => {
  ElMessage.info(`查看项目详情: ${project.name}`)
}

const updateProjectProgress = (project) => {
  ElMessage.info(`更新项目进度: ${project.name}`)
}

const editProject = (project) => {
  ElMessage.info(`编辑项目: ${project.name}`)
}

const pauseProject = (project) => {
  ElMessage.success(`项目已暂停: ${project.name}`)
}

const resumeProject = (project) => {
  ElMessage.success(`项目已恢复: ${project.name}`)
}

const completeProject = (project) => {
  ElMessage.success(`项目已完成: ${project.name}`)
}

const deleteProject = (project) => {
  ElMessageBox.confirm(`确定要删除项目"${project.name}"吗？`, '确认删除', {
    type: 'warning'
  }).then(() => {
    ElMessage.success('项目删除成功')
    loadProjects()
  }).catch(() => {})
}

const dispatchTask = (type) => {
  const typeNames = {
    safety: '安全生产',
    epidemic: '疫情防控',
    disaster: '防灾减灾',
    environment: '环境整治'
  }
  ElMessage.success(`${typeNames[type]}任务已调度，相关人员将立即响应`)
}

const showEmergencyDispatch = () => {
  ElMessage.warning('紧急调度功能已启动，所有在线人员将收到通知')
}

const showCreateTaskDialog = () => {
  ElMessage.info('创建任务功能开发中')
}

const getTaskTypeColor = (type) => {
  const colors = {
    safety: 'danger',
    epidemic: 'warning',
    environment: 'success',
    routine: 'info'
  }
  return colors[type] || 'info'
}

const getTaskTypeText = (type) => {
  const texts = {
    safety: '安全',
    epidemic: '防疫',
    environment: '环境',
    routine: '日常'
  }
  return texts[type] || '其他'
}

const getPriorityType = (priority) => {
  const types = {
    urgent: 'danger',
    high: 'warning',
    medium: 'primary',
    low: 'info'
  }
  return types[priority] || 'info'
}

const getPriorityText = (priority) => {
  const texts = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低'
  }
  return texts[priority] || '普通'
}

const getTaskStatusType = (status) => {
  const types = {
    pending: 'warning',
    in_progress: 'primary',
    completed: 'success'
  }
  return types[status] || 'info'
}

const getTaskStatusText = (status) => {
  const texts = {
    pending: '待办',
    in_progress: '进行中',
    completed: '已完成'
  }
  return texts[status] || '未知'
}

const viewTaskDetail = (task) => {
  ElMessage.info(`查看任务详情: ${task.title}`)
}

const completeTask = (task) => {
  ElMessageBox.confirm(`确定要完成任务"${task.title}"吗？`, '确认完成', {
    type: 'success'
  }).then(() => {
    ElMessage.success('任务已完成')
  }).catch(() => {})
}

const editTask = (task) => {
  ElMessage.info(`编辑任务: ${task.title}`)
}

const handlePreview = (file) => {
  ElMessage.info('预览文件')
}

const handleRemove = (file) => {
  ElMessage.info('移除文件')
}

// 初始化
onMounted(() => {
  loadFinanceData()
  loadProjects()
})
</script>

<style scoped>
.village-governance {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 64px);
}

.governance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.governance-tabs {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

/* 财务模块样式 */
.finance-overview {
  margin-bottom: 24px;
}

.overview-card {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.overview-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.overview-card .card-content {
  position: relative;
  z-index: 2;
}

.overview-card .amount {
  font-size: 28px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 8px;
}

.overview-card .label {
  color: #7f8c8d;
  font-size: 14px;
  margin-bottom: 8px;
}

.overview-card .trend {
  font-size: 12px;
  font-weight: bold;
}

.overview-card .trend.up {
  color: #67c23a;
}

.overview-card .trend.down {
  color: #f56c6c;
}

.overview-card .trend.stable {
  color: #909399;
}

.overview-card .card-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 48px;
  color: rgba(0, 0, 0, 0.1);
}

.overview-card.income {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  color: white;
}

.overview-card.income .amount,
.overview-card.income .label {
  color: white;
}

.overview-card.expense {
  background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
  color: white;
}

.overview-card.expense .amount,
.overview-card.expense .label {
  color: white;
}

.overview-card.balance {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
}

.overview-card.balance .amount,
.overview-card.balance .label {
  color: white;
}

.overview-card.budget {
  background: linear-gradient(135deg, #e6a23c 0%, #ebb563 100%);
  color: white;
}

.overview-card.budget .amount,
.overview-card.budget .label {
  color: white;
}

.finance-actions {
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
}

.finance-actions .el-button {
  width: 100%;
  height: 56px;
  font-size: 16px;
  font-weight: 500;
}

.finance-table-card {
  margin-top: 24px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-controls {
  display: flex;
  align-items: center;
}

.income-amount {
  color: #67c23a;
  font-weight: bold;
}

.expense-amount {
  color: #f56c6c;
  font-weight: bold;
}

.table-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* 项目模块样式 */
.project-stats {
  margin-bottom: 24px;
}

.stat-card {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stat-content {
  position: relative;
  z-index: 2;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 8px;
}

.stat-label {
  color: #7f8c8d;
  font-size: 14px;
}

.stat-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40px;
  color: rgba(0, 0, 0, 0.1);
}

.project-filters {
  margin-bottom: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.project-list {
  margin-bottom: 24px;
}

.project-card {
  margin-bottom: 24px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.project-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.project-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.project-info {
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  margin-bottom: 8px;
}

.info-item .label {
  min-width: 80px;
  color: #7f8c8d;
  font-size: 14px;
}

.info-item .value {
  color: #2c3e50;
  font-weight: 500;
}

.project-progress {
  margin-bottom: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.project-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

/* 任务模块样式 */
.task-overview {
  margin-bottom: 24px;
}

.task-summary-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.task-summary-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.task-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.summary-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.summary-icon.emergency {
  background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
}

.summary-icon.today {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
}

.summary-icon.completed {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
}

.summary-content {
  text-align: center;
}

.summary-number {
  font-size: 28px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 4px;
}

.summary-label {
  color: #7f8c8d;
  font-size: 14px;
}

.quick-dispatch {
  margin-bottom: 24px;
}

.dispatch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dispatch-options {
  margin-top: 20px;
}

.dispatch-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.dispatch-option:hover {
  background: white;
  border-color: #409eff;
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.option-icon {
  font-size: 32px;
  color: #409eff;
  width: 60px;
  height: 60px;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.option-text {
  flex: 1;
}

.option-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.option-desc {
  font-size: 14px;
  color: #7f8c8d;
}

.option-count {
  font-size: 14px;
  color: #67c23a;
  font-weight: 500;
  background: rgba(103, 194, 58, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
}

.task-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .village-governance {
    padding: 16px;
  }

  .governance-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .finance-actions .el-row .el-col {
    margin-bottom: 12px;
  }

  .table-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .filter-controls {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .project-filters .el-row .el-col {
    margin-bottom: 12px;
  }

  .dispatch-option {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .task-list-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .task-controls {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
}
</style>