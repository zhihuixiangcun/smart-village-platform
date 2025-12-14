<template>
  <el-dialog
    title="发布农业知识分享"
    :visible.sync="dialogVisible"
    width="800px"
    :before-close="handleClose"
    class="create-post-dialog"
  >
    <el-form
      ref="postForm"
      :model="postForm"
      :rules="formRules"
      label-width="100px"
      class="post-form"
    >
      <!-- 标题 -->
      <el-form-item label="分享标题" prop="title">
        <el-input
          v-model="postForm.title"
          placeholder="请输入分享标题，简洁明了"
          maxlength="100"
          show-word-limit
          clearable
        />
      </el-form-item>

      <!-- 内容类型 -->
      <el-form-item label="内容类型" prop="postType">
        <el-select v-model="postForm.postType" placeholder="选择内容类型">
          <el-option label="农技教程" value="agricultural_tutorial"></el-option>
          <el-option label="作物记录" value="crop_record"></el-option>
          <el-option label="病虫害防治" value="pest_disease"></el-option>
          <el-option label="农机操作" value="machinery_operation"></el-option>
          <el-option label="农村生活" value="rural_life"></el-option>
          <el-option label="市场信息" value="market_info"></el-option>
          <el-option label="政策解读" value="policy_interpretation"></el-option>
          <el-option label="经验分享" value="experience_sharing"></el-option>
        </el-select>
      </el-form-item>

      <!-- 作物分类 -->
      <el-form-item label="作物分类" prop="cropCategory">
        <el-select v-model="postForm.cropCategory" placeholder="选择作物分类" clearable>
          <el-option label="粮食作物" value="grain_crops"></el-option>
          <el-option label="经济作物" value="cash_crops"></el-option>
          <el-option label="蔬菜类" value="vegetables"></el-option>
          <el-option label="水果类" value="fruits"></el-option>
          <el-option label="药材类" value="medicinal_herbs"></el-option>
          <el-option label="林业" value="forestry"></el-option>
          <el-option label="畜牧业" value="livestock"></el-option>
          <el-option label="水产养殖" value="aquaculture"></el-option>
          <el-option label="其他" value="other"></el-option>
        </el-select>
      </el-form-item>

      <!-- 具体作物 -->
      <el-form-item label="具体作物" v-if="postForm.cropCategory">
        <el-input
          v-model="postForm.cropName"
          placeholder="如：水稻、小麦、番茄等"
          clearable
        />
      </el-form-item>

      <!-- 适用季节 -->
      <el-form-item label="适用季节">
        <el-select v-model="postForm.season" placeholder="选择适用季节" clearable>
          <el-option label="春季" value="spring"></el-option>
          <el-option label="夏季" value="summer"></el-option>
          <el-option label="秋季" value="autumn"></el-option>
          <el-option label="冬季" value="winter"></el-option>
          <el-option label="全年" value="all_year"></el-option>
        </el-select>
      </el-form-item>

      <!-- 标签 -->
      <el-form-item label="标签">
        <div class="tag-input-container">
          <el-tag
            v-for="tag in postForm.tags"
            :key="tag"
            closable
            @close="removeTag(tag)"
            class="tag-item"
          >
            {{ tag }}
          </el-tag>
          <el-input
            v-if="inputVisible"
            ref="saveTagInput"
            v-model="inputValue"
            size="small"
            @keyup.enter.native="handleInputConfirm"
            @blur="handleInputConfirm"
            class="tag-input"
          />
          <el-button
            v-else
            class="button-new-tag"
            size="small"
            @click="showInput"
            icon="el-icon-plus"
          >
            添加标签
          </el-button>
        </div>
        <div class="tag-suggestions">
          <span class="suggestion-label">推荐标签：</span>
          <el-tag
            v-for="tag in suggestedTags"
            :key="tag"
            size="mini"
            type="info"
            @click="addSuggestedTag(tag)"
            class="suggested-tag"
          >
            {{ tag }}
          </el-tag>
        </div>
      </el-form-item>

      <!-- 是否为求助问题 -->
      <el-form-item label="内容性质">
        <el-checkbox v-model="postForm.isQuestion">
          这是一个求助问题
        </el-checkbox>
      </el-form-item>

      <!-- 问题详情（仅当是问题时显示） -->
      <div v-if="postForm.isQuestion" class="question-details">
        <el-form-item label="紧急程度">
          <el-select v-model="questionDetails.urgency" placeholder="选择紧急程度">
            <el-option label="一般" value="low"></el-option>
            <el-option label="较急" value="medium"></el-option>
            <el-option label="紧急" value="high"></el-option>
            <el-option label="非常紧急" value="urgent"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="作物阶段">
          <el-input
            v-model="questionDetails.cropStage"
            placeholder="如：幼苗期、开花期、结果期等"
          />
        </el-form-item>

        <el-form-item label="症状描述">
          <el-input
            type="textarea"
            v-model="questionDetails.symptomsText"
            placeholder="请详细描述遇到的问题症状"
            :rows="3"
          />
        </el-form-item>
      </div>

      <!-- 内容编辑器 -->
      <el-form-item label="详细内容" prop="content">
        <el-input
          type="textarea"
          v-model="postForm.content"
          placeholder="请详细描述您的分享内容，包括经验、方法、注意事项等"
          :rows="8"
          maxlength="5000"
          show-word-limit
        />
      </el-form-item>

      <!-- 媒体上传 -->
      <el-form-item label="图片视频">
        <div class="media-upload-section">
          <!-- 图片上传 -->
          <div class="upload-section">
            <div class="upload-label">上传图片</div>
            <el-upload
              ref="imageUpload"
              action="/api/upload/images"
              list-type="picture-card"
              :file-list="imageList"
              :on-success="handleImageSuccess"
              :on-remove="handleImageRemove"
              :before-upload="beforeImageUpload"
              :headers="uploadHeaders"
              multiple
              :limit="9"
              accept="image/*"
            >
              <i class="el-icon-plus"></i>
              <div slot="tip" class="el-upload__tip">
                只能上传jpg/png文件，且不超过2MB，最多9张
              </div>
            </el-upload>
          </div>

          <!-- 视频上传 -->
          <div class="upload-section">
            <div class="upload-label">上传视频</div>
            <el-upload
              ref="videoUpload"
              action="/api/upload/videos"
              list-type="picture-card"
              :file-list="videoList"
              :on-success="handleVideoSuccess"
              :on-remove="handleVideoRemove"
              :before-upload="beforeVideoUpload"
              :headers="uploadHeaders"
              :limit="3"
              accept="video/*"
            >
              <i class="el-icon-video-camera"></i>
              <div slot="tip" class="el-upload__tip">
                只能上传mp4文件，且不超过50MB，最多3个
              </div>
            </el-upload>
          </div>
        </div>
      </el-form-item>

      <!-- 位置信息 -->
      <el-form-item label="位置信息">
        <el-input
          v-model="postForm.locationDescription"
          placeholder="可选：描述具体位置，如地区、气候特点等"
        />
      </el-form-item>
    </el-form>

    <div slot="footer" class="dialog-footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button @click="saveDraft" :loading="saving">保存草稿</el-button>
      <el-button type="primary" @click="submitPost" :loading="submitting">
        发布分享
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'AgriculturalCreateDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      dialogVisible: false,
      submitting: false,
      saving: false,
      inputVisible: false,
      inputValue: '',
      imageList: [],
      videoList: [],
      postForm: {
        title: '',
        content: '',
        postType: '',
        cropCategory: '',
        cropName: '',
        season: '',
        tags: [],
        isQuestion: false,
        locationDescription: ''
      },
      questionDetails: {
        urgency: 'medium',
        cropStage: '',
        symptomsText: ''
      },
      formRules: {
        title: [
          { required: true, message: '请输入分享标题', trigger: 'blur' },
          { max: 100, message: '标题不能超过100个字符', trigger: 'blur' }
        ],
        content: [
          { required: true, message: '请输入分享内容', trigger: 'blur' },
          { max: 5000, message: '内容不能超过5000个字符', trigger: 'blur' }
        ],
        postType: [
          { required: true, message: '请选择内容类型', trigger: 'change' }
        ]
      },
      suggestedTags: []
    }
  },
  computed: {
    uploadHeaders() {
      const token = this.$store.getters['auth/token']
      return token ? { Authorization: `Bearer ${token}` } : {}
    }
  },
  watch: {
    visible(newVal) {
      this.dialogVisible = newVal
    },
    dialogVisible(newVal) {
      this.$emit('update:visible', newVal)
    },
    'postForm.postType'() {
      this.updateSuggestedTags()
    },
    'postForm.cropCategory'() {
      this.updateSuggestedTags()
    }
  },
  methods: {
    handleClose() {
      if (this.hasUnsavedChanges()) {
        this.$confirm('有未保存的内容，确定要关闭吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.resetForm()
          this.dialogVisible = false
        })
      } else {
        this.resetForm()
        this.dialogVisible = false
      }
    },
    
    hasUnsavedChanges() {
      return this.postForm.title || this.postForm.content || this.imageList.length > 0
    },
    
    resetForm() {
      this.$refs.postForm.clearValidate()
      this.postForm = {
        title: '',
        content: '',
        postType: '',
        cropCategory: '',
        cropName: '',
        season: '',
        tags: [],
        isQuestion: false,
        locationDescription: ''
      }
      this.questionDetails = {
        urgency: 'medium',
        cropStage: '',
        symptomsText: ''
      }
      this.imageList = []
      this.videoList = []
      this.inputVisible = false
      this.inputValue = ''
    },
    
    async submitPost() {
      try {
        const valid = await this.$refs.postForm.validate()
        if (!valid) return
        
        this.submitting = true
        
        const postData = {
          ...this.postForm,
          media: {
            images: this.imageList.map((item, index) => ({
              url: item.url,
              caption: item.caption || '',
              order: index
            })),
            videos: this.videoList.map((item, index) => ({
              url: item.url,
              thumbnail: item.thumbnail || '',
              duration: item.duration || 0,
              caption: item.caption || '',
              order: index
            }))
          },
          location: this.postForm.locationDescription ? {
            description: this.postForm.locationDescription
          } : undefined
        }
        
        // 如果是问题类型，添加问题详情
        if (this.postForm.isQuestion) {
          postData.questionDetails = {
            ...this.questionDetails,
            symptoms: this.questionDetails.symptomsText ? 
              this.questionDetails.symptomsText.split(/[，,；;。.！!]/).filter(s => s.trim()) : 
              [],
            hasImages: this.imageList.length > 0
          }
        }
        
        const response = await this.$api.agricultural.createPost(postData)
        
        if (response.data.success) {
          this.$message.success('发布成功！')
          this.$emit('success', response.data.data)
          this.resetForm()
          this.dialogVisible = false
        }
      } catch (error) {
        this.$message.error('发布失败：' + error.message)
      } finally {
        this.submitting = false
      }
    },
    
    async saveDraft() {
      try {
        this.saving = true
        // 实现草稿保存逻辑
        // 可以保存到本地存储或发送到服务器
        localStorage.setItem('agricultural_post_draft', JSON.stringify({
          postForm: this.postForm,
          questionDetails: this.questionDetails,
          imageList: this.imageList,
          videoList: this.videoList,
          savedAt: new Date().toISOString()
        }))
        
        this.$message.success('草稿已保存')
      } catch (error) {
        this.$message.error('保存草稿失败：' + error.message)
      } finally {
        this.saving = false
      }
    },
    
    loadDraft() {
      const draft = localStorage.getItem('agricultural_post_draft')
      if (draft) {
        try {
          const draftData = JSON.parse(draft)
          this.postForm = draftData.postForm || this.postForm
          this.questionDetails = draftData.questionDetails || this.questionDetails
          this.imageList = draftData.imageList || []
          this.videoList = draftData.videoList || []
          
          this.$message.info('已加载草稿内容')
        } catch (error) {
          console.error('加载草稿失败:', error)
        }
      }
    },
    
    // 标签相关方法
    removeTag(tag) {
      this.postForm.tags = this.postForm.tags.filter(t => t !== tag)
    },
    
    showInput() {
      this.inputVisible = true
      this.$nextTick(() => {
        this.$refs.saveTagInput.$refs.input.focus()
      })
    },
    
    handleInputConfirm() {
      const inputValue = this.inputValue.trim()
      if (inputValue && !this.postForm.tags.includes(inputValue)) {
        this.postForm.tags.push(inputValue)
      }
      this.inputVisible = false
      this.inputValue = ''
    },
    
    addSuggestedTag(tag) {
      if (!this.postForm.tags.includes(tag)) {
        this.postForm.tags.push(tag)
      }
    },
    
    updateSuggestedTags() {
      const allSuggestions = {
        agricultural_tutorial: ['教程', '技术', '方法', '步骤'],
        crop_record: ['记录', '生长', '观察', '数据'],
        pest_disease: ['防治', '病虫害', '农药', '预防'],
        machinery_operation: ['农机', '操作', '维护', '使用'],
        rural_life: ['生活', '文化', '传统', '风俗'],
        market_info: ['价格', '市场', '行情', '销售'],
        policy_interpretation: ['政策', '补贴', '法规', '解读'],
        experience_sharing: ['经验', '分享', '心得', '技巧'],
        
        grain_crops: ['水稻', '小麦', '玉米', '粮食'],
        cash_crops: ['棉花', '油菜', '甘蔗', '经济'],
        vegetables: ['蔬菜', '种植', '大棚', '露地'],
        fruits: ['果树', '水果', '果园', '采摘'],
        medicinal_herbs: ['中药材', '药用', '种植', '加工'],
        livestock: ['畜牧', '养殖', '牛', '羊', '猪'],
        aquaculture: ['水产', '养鱼', '虾', '蟹']
      }
      
      const suggestions = new Set()
      
      if (this.postForm.postType && allSuggestions[this.postForm.postType]) {
        allSuggestions[this.postForm.postType].forEach(tag => suggestions.add(tag))
      }
      
      if (this.postForm.cropCategory && allSuggestions[this.postForm.cropCategory]) {
        allSuggestions[this.postForm.cropCategory].forEach(tag => suggestions.add(tag))
      }
      
      this.suggestedTags = Array.from(suggestions).filter(tag => 
        !this.postForm.tags.includes(tag)
      ).slice(0, 6)
    },
    
    // 文件上传相关方法
    beforeImageUpload(file) {
      const isValidType = ['image/jpeg', 'image/png', 'image/gif'].includes(file.type)
      const isLt2M = file.size / 1024 / 1024 < 2
      
      if (!isValidType) {
        this.$message.error('只能上传JPG、PNG、GIF格式的图片!')
        return false
      }
      if (!isLt2M) {
        this.$message.error('图片大小不能超过2MB!')
        return false
      }
      return true
    },
    
    beforeVideoUpload(file) {
      const isValidType = ['video/mp4', 'video/avi', 'video/mov'].includes(file.type)
      const isLt50M = file.size / 1024 / 1024 < 50
      
      if (!isValidType) {
        this.$message.error('只能上传MP4、AVI、MOV格式的视频!')
        return false
      }
      if (!isLt50M) {
        this.$message.error('视频大小不能超过50MB!')
        return false
      }
      return true
    },
    
    handleImageSuccess(response, file, fileList) {
      if (response.success) {
        this.imageList = fileList.map(item => ({
          ...item,
          url: item.response?.data?.url || item.url,
          caption: ''
        }))
      }
    },
    
    handleImageRemove(file, fileList) {
      this.imageList = fileList
    },
    
    handleVideoSuccess(response, file, fileList) {
      if (response.success) {
        this.videoList = fileList.map(item => ({
          ...item,
          url: item.response?.data?.url || item.url,
          thumbnail: item.response?.data?.thumbnail || '',
          duration: item.response?.data?.duration || 0,
          caption: ''
        }))
      }
    },
    
    handleVideoRemove(file, fileList) {
      this.videoList = fileList
    }
  },
  
  mounted() {
    // 检查是否有草稿
    this.loadDraft()
  }
}
</script>

<style scoped>
.create-post-dialog :deep(.el-dialog) {
  margin-top: 5vh;
}

.post-form {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 16px;
}

.tag-input-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.tag-item {
  margin-right: 8px;
  margin-bottom: 4px;
}

.tag-input {
  width: 120px;
}

.button-new-tag {
  height: 24px;
  line-height: 22px;
  padding: 0 8px;
}

.tag-suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.suggestion-label {
  font-size: 12px;
  color: #909399;
}

.suggested-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.suggested-tag:hover {
  background-color: #67C23A;
  color: white;
}

.question-details {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 16px;
  margin: 16px 0;
  border-left: 4px solid #409EFF;
}

.media-upload-section {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  padding: 16px;
}

.upload-section {
  margin-bottom: 20px;
}

.upload-section:last-child {
  margin-bottom: 0;
}

.upload-label {
  font-weight: 500;
  margin-bottom: 8px;
  color: #606266;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-upload--picture-card) {
  width: 80px;
  height: 80px;
  line-height: 80px;
}

:deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 80px;
  height: 80px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .create-post-dialog :deep(.el-dialog) {
    width: 95% !important;
    margin: 2vh auto;
  }
  
  .tag-input-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .tag-input {
    width: 100%;
    margin-top: 8px;
  }
  
  .media-upload-section {
    padding: 12px;
  }
  
  :deep(.el-form-item__label) {
    width: 80px !important;
  }
  
  :deep(.el-form-item__content) {
    margin-left: 80px !important;
  }
}
</style>