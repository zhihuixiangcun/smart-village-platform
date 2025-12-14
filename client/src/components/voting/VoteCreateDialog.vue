<template>
  <el-dialog
    title="创建投票"
    :visible.sync="dialogVisible"
    width="80%"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="voteForm"
      :model="voteForm"
      :rules="voteRules"
      label-width="120px"
      v-loading="submitting"
    >
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item label="投票标题" prop="title">
            <el-input
              v-model="voteForm.title"
              placeholder="请输入投票标题"
              maxlength="200"
              show-word-limit
            ></el-input>
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="投票描述" prop="description">
            <el-input
              v-model="voteForm.description"
              type="textarea"
              :rows="4"
              placeholder="请详细描述投票内容和背景..."
              maxlength="2000"
              show-word-limit
            ></el-input>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="投票分类" prop="category">
            <el-select v-model="voteForm.category" placeholder="请选择分类">
              <el-option label="村务事项" value="village_affairs"></el-option>
              <el-option label="基础设施" value="infrastructure"></el-option>
              <el-option label="财务决策" value="finance"></el-option>
              <el-option label="政策表决" value="policy"></el-option>
              <el-option label="选举投票" value="election"></el-option>
              <el-option label="其他" value="other"></el-option>
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="投票类型" prop="voteType">
            <el-select v-model="voteForm.voteType" @change="handleVoteTypeChange">
              <el-option label="单选投票" value="single_choice"></el-option>
              <el-option label="多选投票" value="multiple_choice"></el-option>
              <el-option label="评分投票" value="rating"></el-option>
              <el-option label="排序投票" value="ranking"></el-option>
              <el-option label="是否投票" value="yes_no"></el-option>
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="匿名设置" prop="anonymousType">
            <el-select v-model="voteForm.anonymousType">
              <el-option label="实名投票" value="real_name"></el-option>
              <el-option label="匿名投票" value="anonymous"></el-option>
              <el-option label="半匿名投票" value="semi_anonymous"></el-option>
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="选民范围" prop="eligibleVoters">
            <el-select v-model="voteForm.eligibleVoters">
              <el-option label="全体村民" value="all_residents"></el-option>
              <el-option label="户主" value="household_heads"></el-option>
              <el-option label="年龄限制" value="age_restricted"></el-option>
              <el-option label="自定义群体" value="custom_group"></el-option>
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="12" v-if="voteForm.voteType === 'multiple_choice'">
          <el-form-item label="最大选择数" prop="maxChoices">
            <el-input-number
              v-model="voteForm.maxChoices"
              :min="1"
              :max="10"
              placeholder="最多可选几项"
            ></el-input-number>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="开始时间" prop="startTime">
            <el-date-picker
              v-model="voteForm.startTime"
              type="datetime"
              placeholder="选择开始时间"
              format="yyyy-MM-dd HH:mm:ss"
              value-format="yyyy-MM-dd HH:mm:ss"
              style="width: 100%"
            ></el-date-picker>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="结束时间" prop="endTime">
            <el-date-picker
              v-model="voteForm.endTime"
              type="datetime"
              placeholder="选择结束时间"
              format="yyyy-MM-dd HH:mm:ss"
              value-format="yyyy-MM-dd HH:mm:ss"
              style="width: 100%"
            ></el-date-picker>
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="投票选项" prop="options">
            <div class="options-container">
              <div
                v-for="(option, index) in voteForm.options"
                :key="index"
                class="option-item"
              >
                <div class="option-header">
                  <span class="option-label">{{ String.fromCharCode(65 + index) }}</span>
                  <el-button
                    type="danger"
                    size="mini"
                    icon="el-icon-delete"
                    circle
                    @click="removeOption(index)"
                    :disabled="voteForm.options.length <= 2"
                  ></el-button>
                </div>
                <el-input
                  v-model="option.title"
                  placeholder="请输入选项标题"
                  maxlength="200"
                  style="margin-bottom: 10px"
                ></el-input>
                <el-input
                  v-model="option.description"
                  type="textarea"
                  :rows="2"
                  placeholder="选项描述 (可选)"
                  maxlength="500"
                ></el-input>
              </div>
              <el-button
                type="dashed"
                icon="el-icon-plus"
                @click="addOption"
                :disabled="voteForm.options.length >= 20"
                style="width: 100%; margin-top: 10px"
              >
                添加选项 ({{ voteForm.options.length }}/20)
              </el-button>
            </div>
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="投票设置">
            <el-checkbox v-model="voteForm.allowChangeVote">允许修改投票</el-checkbox>
            <el-checkbox v-model="voteForm.requireComment">要求投票理由</el-checkbox>
            <el-checkbox v-model="voteForm.showResultsBeforeEnd">投票期间显示结果</el-checkbox>
            <el-checkbox v-model="voteForm.showVoterNames">显示投票者姓名</el-checkbox>
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="标签" prop="tags">
            <el-tag
              v-for="tag in voteForm.tags"
              :key="tag"
              closable
              @close="removeTag(tag)"
              style="margin-right: 10px"
            >
              {{ tag }}
            </el-tag>
            <el-input
              v-if="tagInputVisible"
              ref="tagInput"
              v-model="tagInputValue"
              size="small"
              @keyup.enter.native="addTag"
              @blur="addTag"
              style="width: 100px"
            ></el-input>
            <el-button
              v-else
              size="small"
              @click="showTagInput"
            >
              + 添加标签
            </el-button>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <div slot="footer" class="dialog-footer">
      <el-button @click="handleClose">取 消</el-button>
      <el-button type="primary" @click="submitVote" :loading="submitting">
        创建投票
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
import { votingAPI } from '@/api/voting'

export default {
  name: 'VoteCreateDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      submitting: false,
      tagInputVisible: false,
      tagInputValue: '',
      voteForm: {
        title: '',
        description: '',
        category: 'village_affairs',
        voteType: 'single_choice',
        anonymousType: 'real_name',
        eligibleVoters: 'all_residents',
        maxChoices: 1,
        startTime: '',
        endTime: '',
        options: [
          { title: '', description: '' },
          { title: '', description: '' }
        ],
        allowChangeVote: false,
        requireComment: false,
        showResultsBeforeEnd: false,
        showVoterNames: false,
        tags: []
      },
      voteRules: {
        title: [
          { required: true, message: '请输入投票标题', trigger: 'blur' },
          { min: 1, max: 200, message: '标题长度在 1 到 200 个字符', trigger: 'blur' }
        ],
        description: [
          { required: true, message: '请输入投票描述', trigger: 'blur' },
          { min: 1, max: 2000, message: '描述长度在 1 到 2000 个字符', trigger: 'blur' }
        ],
        category: [
          { required: true, message: '请选择投票分类', trigger: 'change' }
        ],
        voteType: [
          { required: true, message: '请选择投票类型', trigger: 'change' }
        ],
        anonymousType: [
          { required: true, message: '请选择匿名设置', trigger: 'change' }
        ],
        eligibleVoters: [
          { required: true, message: '请选择选民范围', trigger: 'change' }
        ],
        startTime: [
          { required: true, message: '请选择开始时间', trigger: 'change' }
        ],
        endTime: [
          { required: true, message: '请选择结束时间', trigger: 'change' }
        ],
        options: [
          {
            required: true,
            validator: this.validateOptions,
            trigger: 'change'
          }
        ]
      }
    }
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      }
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.initForm()
      }
    }
  },
  methods: {
    initForm() {
      // 设置默认时间
      const now = new Date()
      const startTime = new Date(now.getTime() + 60 * 60 * 1000) // 1小时后开始
      const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7天后结束

      this.voteForm.startTime = this.formatDateTime(startTime)
      this.voteForm.endTime = this.formatDateTime(endTime)
    },

    formatDateTime(date) {
      return date.toISOString().slice(0, 19).replace('T', ' ')
    },

    handleVoteTypeChange(voteType) {
      if (voteType === 'yes_no') {
        // 是否投票固定两个选项
        this.voteForm.options = [
          { title: '同意', description: '' },
          { title: '反对', description: '' }
        ]
      }
    },

    addOption() {
      if (this.voteForm.options.length < 20) {
        this.voteForm.options.push({ title: '', description: '' })
      }
    },

    removeOption(index) {
      if (this.voteForm.options.length > 2) {
        this.voteForm.options.splice(index, 1)
      }
    },

    showTagInput() {
      this.tagInputVisible = true
      this.$nextTick(() => {
        this.$refs.tagInput.$refs.input.focus()
      })
    },

    addTag() {
      const tag = this.tagInputValue.trim()
      if (tag && !this.voteForm.tags.includes(tag) && this.voteForm.tags.length < 10) {
        this.voteForm.tags.push(tag)
      }
      this.tagInputVisible = false
      this.tagInputValue = ''
    },

    removeTag(tag) {
      const index = this.voteForm.tags.indexOf(tag)
      if (index !== -1) {
        this.voteForm.tags.splice(index, 1)
      }
    },

    validateOptions(rule, value, callback) {
      // 检查选项数量
      if (value.length < 2) {
        callback(new Error('至少需要2个投票选项'))
        return
      }

      if (value.length > 20) {
        callback(new Error('投票选项不能超过20个'))
        return
      }

      // 检查选项标题
      for (let i = 0; i < value.length; i++) {
        if (!value[i].title.trim()) {
          callback(new Error(`第${i + 1}个选项标题不能为空`))
          return
        }
      }

      // 检查重复选项
      const titles = value.map(opt => opt.title.trim())
      const uniqueTitles = [...new Set(titles)]
      if (titles.length !== uniqueTitles.length) {
        callback(new Error('选项标题不能重复'))
        return
      }

      callback()
    },

    async submitVote() {
      // 表单验证
      try {
        await this.$refs.voteForm.validate()
      } catch (error) {
        this.$message.error('请检查表单填写')
        return
      }

      // 时间验证
      const startTime = new Date(this.voteForm.startTime)
      const endTime = new Date(this.voteForm.endTime)
      const now = new Date()

      if (startTime < now) {
        this.$message.error('开始时间不能早于当前时间')
        return
      }

      if (endTime <= startTime) {
        this.$message.error('结束时间必须晚于开始时间')
        return
      }

      // 提交数据
      this.submitting = true
      try {
        const voteData = {
          ...this.voteForm,
          options: this.voteForm.options.filter(opt => opt.title.trim())
        }

        const response = await votingAPI.createVote(voteData)

        if (response.data.success) {
          this.$message.success('投票创建成功')
          this.$emit('created', response.data.data)
          this.handleClose()
        }
      } catch (error) {
        const message = error.response?.data?.message || '创建投票失败'
        this.$message.error(message)
        console.error(error)
      } finally {
        this.submitting = false
      }
    },

    handleClose() {
      this.dialogVisible = false
      this.resetForm()
    },

    resetForm() {
      this.$refs.voteForm.resetFields()
      this.voteForm = {
        title: '',
        description: '',
        category: 'village_affairs',
        voteType: 'single_choice',
        anonymousType: 'real_name',
        eligibleVoters: 'all_residents',
        maxChoices: 1,
        startTime: '',
        endTime: '',
        options: [
          { title: '', description: '' },
          { title: '', description: '' }
        ],
        allowChangeVote: false,
        requireComment: false,
        showResultsBeforeEnd: false,
        showVoterNames: false,
        tags: []
      }
      this.tagInputVisible = false
      this.tagInputValue = ''
    }
  }
}
</script>

<style scoped>
.options-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 15px;
  background: #fafafa;
}

.option-item {
  background: white;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 10px;
  position: relative;
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.option-label {
  background: #409eff;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.dialog-footer {
  text-align: right;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .el-dialog {
    width: 95% !important;
  }
}
</style>