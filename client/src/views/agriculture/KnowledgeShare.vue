<template>
  <div class="agriculture-knowledge">
    <!-- 头部 -->
    <div class="header">
      <el-page-header @back="goBack" title="返回">
        <template #content>
          <span class="text-large font-600">农业知识分享</span>
        </template>
        <template #extra>
          <el-button type="primary" @click="showPublishDialog">
            <el-icon><Plus /></el-icon>
            发布知识
          </el-button>
        </template>
      </el-page-header>
    </div>

    <!-- 分类标签 -->
    <el-card class="category-card" shadow="never">
      <el-radio-group v-model="activeCategory" @change="handleCategoryChange">
        <el-radio-button label="">全部</el-radio-button>
        <el-radio-button label="crop_farming">粮食种植</el-radio-button>
        <el-radio-button label="vegetable">蔬菜种植</el-radio-button>
        <el-radio-button label="fruit">果树种植</el-radio-button>
        <el-radio-button label="livestock">畜牧养殖</el-radio-button>
        <el-radio-button label="pest_control">病虫害防治</el-radio-button>
        <el-radio-button label="fertilizer">施肥技术</el-radio-button>
        <el-radio-button label="irrigation">灌溉技术</el-radio-button>
        <el-radio-button label="machinery">农机使用</el-radio-button>
        <el-radio-button label="processing">农产品加工</el-radio-button>
        <el-radio-button label="market_info">市场信息</el-radio-button>
        <el-radio-button label="policy">政策解读</el-radio-button>
      </el-radio-group>
    </el-card>

    <!-- 热门标签 -->
    <el-card class="tags-card" shadow="never" v-if="hotTags.length">
      <div class="tags-header">
        <span class="tags-title">热门标签：</span>
        <el-tag
          v-for="tag in hotTags"
          :key="tag._id"
          class="tag-item"
          @click="searchByTag(tag._id)"
        >
          {{ tag._id }} ({{ tag.count }})
        </el-tag>
      </div>
    </el-card>

    <!-- 内容区域 -->
    <el-row :gutter="20">
      <!-- 左侧：帖子列表 -->
      <el-col :span="16">
        <!-- 筛选栏 -->
        <div class="filter-bar">
          <el-select v-model="filter.cropType" placeholder="作物类型" clearable @change="fetchPosts" size="small">
            <el-option label="水稻" value="rice" />
            <el-option label="小麦" value="wheat" />
            <el-option label="玉米" value="corn" />
            <el-option label="番茄" value="tomato" />
            <el-option label="黄瓜" value="cucumber" />
          </el-select>
          <el-select v-model="filter.difficulty" placeholder="难度等级" clearable @change="fetchPosts" size="small">
            <el-option label="初级" value="beginner" />
            <el-option label="中级" value="intermediate" />
            <el-option label="高级" value="advanced" />
          </el-select>
          <el-select v-model="filter.sort" placeholder="排序方式" @change="fetchPosts" size="small">
            <el-option label="最新发布" value="-publishedAt" />
            <el-option label="最多浏览" value="-interactions.views" />
            <el-option label="最多点赞" value="-interactions.likes" />
          </el-select>
          <el-input
            v-model="filter.keyword"
            placeholder="搜索知识..."
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
            size="small"
            style="width: 200px"
          >
            <template #suffix>
              <el-icon class="el-input__icon" @click="handleSearch">
                <Search />
              </el-icon>
            </template>
          </el-input>
        </div>

        <!-- 帖子列表 -->
        <div class="post-list" v-loading="loading">
          <!-- 专家认证区 -->
          <div class="expert-section" v-if="expertPosts.length">
            <div class="section-header">
              <el-icon class="expert-icon"><Medal /></el-icon>
              <span class="section-title">专家认证</span>
            </div>
            <el-row :gutter="15">
              <el-col :span="12" v-for="post in expertPosts" :key="post._id">
                <el-card class="post-card expert-card" shadow="hover" @click="viewPost(post)">
                  <div class="expert-badge">
                    <el-icon><Medal /></el-icon>
                    专家认证
                  </div>
                  <div class="post-cover" v-if="post.content.images?.length">
                    <el-image :src="post.content.images[0].url" fit="cover" />
                  </div>
                  <div class="post-content">
                    <h4 class="post-title">{{ post.title }}</h4>
                    <p class="post-excerpt">{{ post.content.text?.substring(0, 80) }}...</p>
                    <div class="post-meta">
                      <span class="author">
                        <el-avatar :size="24" :src="post.author?.profile?.avatar" />
                        {{ post.author?.profile?.firstName || post.author?.username }}
                      </span>
                      <span class="stats">
                        <el-icon><View /></el-icon>
                        {{ post.interactions?.views || 0 }}
                      </span>
                      <span class="stats">
                        <el-icon><Star /></el-icon>
                        {{ post.interactions?.likes || 0 }}
                      </span>
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>

          <!-- 普通帖子 -->
          <div class="normal-section">
            <el-card
              v-for="post in postList"
              :key="post._id"
              class="post-card normal-card"
              shadow="hover"
              @click="viewPost(post)"
            >
              <el-row :gutter="15">
                <el-col :span="8" v-if="post.content.images?.length">
                  <div class="post-cover">
                    <el-image :src="post.content.images[0].url" fit="cover" />
                  </div>
                </el-col>
                <el-col :span="post.content.images?.length ? 16 : 24">
                  <div class="post-content">
                    <h4 class="post-title">
                      <el-tag v-if="post.expertVerified?.isVerified" type="warning" size="small" class="expert-tag">
                        <el-icon><Medal /></el-icon>
                        专家认证
                      </el-tag>
                      {{ post.title }}
                    </h4>
                    <p class="post-excerpt">{{ post.content.text?.substring(0, 100) }}...</p>
                    <div class="post-tags">
                      <el-tag size="small" type="info">{{ getCategoryLabel(post.category) }}</el-tag>
                      <el-tag size="small" type="success">{{ getDifficultyLabel(post.difficulty) }}</el-tag>
                      <el-tag size="small" v-for="tag in post.tags?.slice(0, 3)" :key="tag">{{ tag }}</el-tag>
                    </div>
                    <div class="post-meta">
                      <span class="author">
                        <el-avatar :size="24" :src="post.author?.profile?.avatar" />
                        {{ post.author?.profile?.firstName || post.author?.username }}
                      </span>
                      <span class="time">{{ formatRelativeTime(post.publishedAt) }}</span>
                      <span class="stats">
                        <el-icon><View /></el-icon>
                        {{ post.interactions?.views || 0 }}
                      </span>
                      <span class="stats">
                        <el-icon><Star /></el-icon>
                        {{ post.interactions?.likes || 0 }}
                      </span>
                      <span class="stats" v-if="post.usefulness">
                        <el-icon><Check /></el-icon>
                        {{ post.usefulness.usefulnessPercentage || 0 }}%有用
                      </span>
                    </div>
                  </div>
                </el-col>
              </el-row>
            </el-card>
          </div>

          <!-- 分页 -->
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :total="pagination.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="fetchPosts"
            @current-change="fetchPosts"
            class="pagination"
          />
        </div>
      </el-col>

      <!-- 右侧：热门推荐 -->
      <el-col :span="8">
        <el-card class="sidebar-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon><TrendCharts /></el-icon>
              <span>热门知识</span>
            </div>
          </template>
          <div class="hot-list">
            <div
              v-for="(post, index) in popularPosts"
              :key="post._id"
              class="hot-item"
              @click="viewPost(post)"
            >
              <span class="hot-rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</span>
              <span class="hot-title">{{ post.title }}</span>
              <span class="hot-views">{{ post.interactions?.views || 0 }}</span>
            </div>
          </div>
        </el-card>

        <!-- 发布者排行 -->
        <el-card class="sidebar-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon><Trophy /></el-icon>
              <span>知识达人</span>
            </div>
          </template>
          <div class="expert-list">
            <div v-for="expert in experts" :key="expert._id" class="expert-item">
              <el-avatar :size="40" :src="expert.avatar" />
              <div class="expert-info">
                <div class="expert-name">{{ expert.name }}</div>
                <div class="expert-stats">发布 {{ expert.postCount }} 篇</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 发布对话框 -->
    <el-dialog
      v-model="publishDialogVisible"
      title="发布农业知识"
      width="900px"
      :close-on-click-modal="false"
    >
      <el-form :model="postData" :rules="postRules" ref="postFormRef" label-width="120px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="postData.title" placeholder="请输入知识标题" maxlength="200" show-word-limit />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="分类" prop="category">
              <el-select v-model="postData.category" placeholder="请选择分类">
                <el-option label="粮食种植" value="crop_farming" />
                <el-option label="蔬菜种植" value="vegetable" />
                <el-option label="果树种植" value="fruit" />
                <el-option label="畜牧养殖" value="livestock" />
                <el-option label="病虫害防治" value="pest_control" />
                <el-option label="施肥技术" value="fertilizer" />
                <el-option label="灌溉技术" value="irrigation" />
                <el-option label="农机使用" value="machinery" />
                <el-option label="农产品加工" value="processing" />
                <el-option label="市场信息" value="market_info" />
                <el-option label="政策解读" value="policy" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="作物类型">
              <el-select v-model="postData.cropType" placeholder="请选择作物类型">
                <el-option label="水稻" value="rice" />
                <el-option label="小麦" value="wheat" />
                <el-option label="玉米" value="corn" />
                <el-option label="番茄" value="tomato" />
                <el-option label="黄瓜" value="cucumber" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="难度等级">
          <el-radio-group v-model="postData.difficulty">
            <el-radio-button label="beginner">初级</el-radio-button>
            <el-radio-button label="intermediate">中级</el-radio-button>
            <el-radio-button label="advanced">高级</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="postData.content"
            type="textarea"
            :rows="8"
            placeholder="请详细描述农业技术、经验或知识..."
            maxlength="5000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="图片">
          <el-upload
            v-model:file-list="imageList"
            action="#"
            list-type="picture-card"
            :auto-upload="false"
            :limit="6"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="技术要点">
          <div v-for="(tech, index) in postData.techniques" :key="index" class="technique-item">
            <el-input v-model="tech.name" placeholder="要点名称" style="width: 200px" />
            <el-input v-model="tech.description" placeholder="描述" style="width: 400px; margin-left: 10px" />
            <el-button type="danger" size="small" @click="removeTechnique(index)" style="margin-left: 10px">
              删除
            </el-button>
          </div>
          <el-button type="primary" size="small" @click="addTechnique">添加技术要点</el-button>
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="postData.tags"
            multiple
            filterable
            allow-create
            placeholder="请选择或输入标签"
            style="width: 100%"
          >
            <el-option
              v-for="tag in hotTags"
              :key="tag._id"
              :label="tag._id"
              :value="tag._id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePublish" :loading="publishing">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Plus, Search, Medal, View, Star, Check, TrendCharts, Trophy
} from '@element-plus/icons-vue'
import {
  getAgriculturePosts,
  getPopularPosts,
  getExpertVerifiedPosts,
  getTagCloud,
  createAgriculturePost
} from '@/api/agriculture'

const router = useRouter()
const loading = ref(false)
const publishing = ref(false)
const publishDialogVisible = ref(false)
const postFormRef = ref(null)

// 当前分类
const activeCategory = ref('')

// 筛选条件
const filter = ref({
  cropType: '',
  difficulty: '',
  sort: '-publishedAt',
  keyword: ''
})

// 分页
const pagination = ref({
  page: 1,
  limit: 10,
  total: 0
})

// 帖子列表
const postList = ref([])
const expertPosts = ref([])
const popularPosts = ref([])

// 热门标签
const hotTags = ref([])

// 图片列表
const imageList = ref([])

// 发布数据
const postData = ref({
  title: '',
  category: '',
  cropType: '',
  content: '',
  difficulty: 'beginner',
  techniques: [],
  tags: []
})

// 表单验证规则
const postRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

// 专家列表（模拟数据）
const experts = ref([
  { _id: '1', name: '张农技', avatar: 'https://example.com/avatar1.jpg', postCount: 45 },
  { _id: '2', name: '李种植', avatar: 'https://example.com/avatar2.jpg', postCount: 38 }
])

// 获取帖子列表
const fetchPosts = async () => {
  loading.value = true
  try {
    const params = {
      villageId: 'current-village-id',
      category: activeCategory.value || undefined,
      ...filter.value,
      ...pagination.value
    }
    const res = await getAgriculturePosts(params)
    if (res.success) {
      postList.value = res.data
      pagination.value.total = res.pagination?.total || 0
    }
  } catch (error) {
    ElMessage.error('获取帖子列表失败')
  } finally {
    loading.value = false
  }
}

// 获取专家认证帖子
const fetchExpertPosts = async () => {
  try {
    const res = await getExpertVerifiedPosts({ villageId: 'current-village-id', limit: 4 })
    if (res.success) {
      expertPosts.value = res.data
    }
  } catch (error) {
    console.error('获取专家认证帖子失败', error)
  }
}

// 获取热门帖子
const fetchPopularPosts = async () => {
  try {
    const res = await getPopularPosts({ villageId: 'current-village-id', limit: 10 })
    if (res.success) {
      popularPosts.value = res.data
    }
  } catch (error) {
    console.error('获取热门帖子失败', error)
  }
}

// 获取标签云
const fetchTagCloud = async () => {
  try {
    const res = await getTagCloud({ villageId: 'current-village-id', limit: 20 })
    if (res.success) {
      hotTags.value = res.data
    }
  } catch (error) {
    console.error('获取标签云失败', error)
  }
}

// 分类变化
const handleCategoryChange = () => {
  pagination.value.page = 1
  fetchPosts()
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
  fetchPosts()
}

// 按标签搜索
const searchByTag = (tag) => {
  filter.value.keyword = tag
  handleSearch()
}

// 查看帖子
const viewPost = (post) => {
  router.push(`/agriculture/knowledge/${post._id}`)
}

// 显示发布对话框
const showPublishDialog = () => {
  postData.value = {
    title: '',
    category: '',
    cropType: '',
    content: '',
    difficulty: 'beginner',
    techniques: [],
    tags: []
  }
  imageList.value = []
  publishDialogVisible.value = true
}

// 添加技术要点
const addTechnique = () => {
  postData.value.techniques.push({ name: '', description: '' })
}

// 删除技术要点
const removeTechnique = (index) => {
  postData.value.techniques.splice(index, 1)
}

// 发布
const handlePublish = async () => {
  await postFormRef.value.validate()
  publishing.value = true
  try {
    const data = {
      ...postData.value,
      villageId: 'current-village-id',
      content: {
        text: postData.value.content,
        images: imageList.value.map(file => ({
          url: file.response?.url || file.url,
          order: file.order || 0
        }))
      }
    }
    const res = await createAgriculturePost(data)
    if (res.success) {
      ElMessage.success('发布成功，等待审核')
      publishDialogVisible.value = false
      fetchPosts()
    }
  } catch (error) {
    ElMessage.error('发布失败')
  } finally {
    publishing.value = false
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 分类标签
const getCategoryLabel = (category) => {
  const map = {
    crop_farming: '粮食种植',
    vegetable: '蔬菜种植',
    fruit: '果树种植',
    livestock: '畜牧养殖',
    pest_control: '病虫害防治',
    fertilizer: '施肥技术',
    irrigation: '灌溉技术',
    machinery: '农机使用',
    processing: '农产品加工',
    market_info: '市场信息',
    policy: '政策解读'
  }
  return map[category] || category
}

// 难度标签
const getDifficultyLabel = (difficulty) => {
  const map = {
    beginner: '初级',
    intermediate: '中级',
    advanced: '高级'
  }
  return map[difficulty] || difficulty
}

// 相对时间
const formatRelativeTime = (date) => {
  if (!date) return ''
  const now = new Date()
  const postDate = new Date(date)
  const diff = now - postDate
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return postDate.toLocaleDateString('zh-CN')
}

onMounted(() => {
  fetchPosts()
  fetchExpertPosts()
  fetchPopularPosts()
  fetchTagCloud()
})
</script>

<style scoped lang="scss">
.agriculture-knowledge {
  padding: 20px;

  .header {
    margin-bottom: 20px;
  }

  .category-card,
  .tags-card {
    margin-bottom: 20px;
  }

  .tags-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;

    .tags-title {
      font-weight: 600;
      color: #606266;
    }

    .tag-item {
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }
    }
  }

  .filter-bar {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .post-list {
    .expert-section {
      margin-bottom: 30px;

      .section-header {
        display: flex;
        align-items: center;
        margin-bottom: 15px;

        .expert-icon {
          font-size: 24px;
          color: #f59e0b;
          margin-right: 8px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #303133;
        }
      }

      .expert-card {
        cursor: pointer;
        transition: all 0.3s;
        position: relative;

        &:hover {
          transform: translateY(-4px);
        }

        .expert-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .post-cover {
          height: 160px;
          overflow: hidden;
          border-radius: 4px;
          margin-bottom: 12px;

          .el-image {
            width: 100%;
            height: 100%;
          }
        }

        .post-title {
          font-size: 16px;
          margin-bottom: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .post-excerpt {
          color: #909399;
          font-size: 14px;
          margin-bottom: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      }
    }

    .normal-card {
      margin-bottom: 15px;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .post-cover {
        height: 140px;
        border-radius: 4px;
        overflow: hidden;

        .el-image {
          width: 100%;
          height: 100%;
        }
      }

      .post-content {
        .post-title {
          font-size: 16px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;

          .expert-tag {
            flex-shrink: 0;
          }
        }

        .post-excerpt {
          color: #606266;
          font-size: 14px;
          margin-bottom: 12px;
          line-height: 1.6;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .post-tags {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .post-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          color: #909399;
          font-size: 13px;

          .author {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .stats {
            display: flex;
            align-items: center;
            gap: 4px;
          }
        }
      }
    }

    .pagination {
      margin-top: 20px;
      display: flex;
      justify-content: center;
    }
  }

  .sidebar-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }

    .hot-list {
      .hot-item {
        display: flex;
        align-items: center;
        padding: 10px 0;
        cursor: pointer;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .hot-rank {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-right: 10px;

          &.rank-1 { background: #ff4757; color: white; }
          &.rank-2 { background: #ff6b81; color: white; }
          &.rank-3 { background: #ff7f50; color: white; }
        }

        .hot-title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hot-views {
          color: #909399;
          font-size: 12px;
        }
      }
    }

    .expert-list {
      .expert-item {
        display: flex;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .expert-info {
          margin-left: 12px;
          flex: 1;

          .expert-name {
            font-weight: 500;
            margin-bottom: 4px;
          }

          .expert-stats {
            font-size: 12px;
            color: #909399;
          }
        }
      }
    }
  }

  .technique-item {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }

  .text-large {
    font-size: 18px;
  }

  .font-600 {
    font-weight: 600;
  }
}
</style>
