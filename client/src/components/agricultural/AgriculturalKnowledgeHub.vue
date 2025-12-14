<template>
  <div class="agricultural-knowledge-hub">
    <!-- 头部导航 -->
    <div class="hub-header">
      <div class="header-content">
        <h1 class="hub-title">
          <i class="el-icon-s-data"></i>
          农业知识分享平台
        </h1>
        <div class="header-actions">
          <el-button 
            type="primary" 
            @click="showCreateDialog = true"
            icon="el-icon-edit"
            v-if="isLoggedIn"
          >
            发布分享
          </el-button>
          <el-button 
            type="success" 
            @click="showExpertConsult = true"
            icon="el-icon-user"
          >
            专家咨询
          </el-button>
        </div>
      </div>
    </div>

    <!-- 搜索和筛选栏 -->
    <div class="search-filters">
      <div class="search-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索农业知识、技术、经验..."
          prefix-icon="el-icon-search"
          @keyup.enter="handleSearch"
          class="search-input"
        />
        <el-button 
          type="primary" 
          @click="handleSearch"
          icon="el-icon-search"
        >
          搜索
        </el-button>
      </div>
      
      <div class="filter-section">
        <el-select v-model="filters.sortBy" @change="loadPosts" placeholder="排序方式">
          <el-option label="最新发布" value="latest"></el-option>
          <el-option label="热度排序" value="hot"></el-option>
          <el-option label="最受欢迎" value="popular"></el-option>
          <el-option label="最有用" value="helpful"></el-option>
          <el-option label="专家认证" value="expert_verified"></el-option>
        </el-select>
        
        <el-select v-model="filters.postType" @change="loadPosts" placeholder="内容类型">
          <el-option label="全部类型" value=""></el-option>
          <el-option label="农技教程" value="agricultural_tutorial"></el-option>
          <el-option label="作物记录" value="crop_record"></el-option>
          <el-option label="病虫害防治" value="pest_disease"></el-option>
          <el-option label="农机操作" value="machinery_operation"></el-option>
          <el-option label="农村生活" value="rural_life"></el-option>
          <el-option label="市场信息" value="market_info"></el-option>
          <el-option label="政策解读" value="policy_interpretation"></el-option>
          <el-option label="经验分享" value="experience_sharing"></el-option>
        </el-select>
        
        <el-select v-model="filters.cropCategory" @change="loadPosts" placeholder="作物分类">
          <el-option label="全部作物" value=""></el-option>
          <el-option label="粮食作物" value="grain_crops"></el-option>
          <el-option label="经济作物" value="cash_crops"></el-option>
          <el-option label="蔬菜类" value="vegetables"></el-option>
          <el-option label="水果类" value="fruits"></el-option>
          <el-option label="药材类" value="medicinal_herbs"></el-option>
          <el-option label="林业" value="forestry"></el-option>
          <el-option label="畜牧业" value="livestock"></el-option>
          <el-option label="水产养殖" value="aquaculture"></el-option>
        </el-select>
        
        <el-checkbox v-model="filters.onlyQuestions" @change="loadPosts">
          只看求助问题
        </el-checkbox>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="statistics-overview" v-if="statistics">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <i class="el-icon-document stat-icon"></i>
              <div class="stat-content">
                <div class="stat-value">{{ statistics.overview.totalPosts }}</div>
                <div class="stat-label">知识分享</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <i class="el-icon-chat-dot-round stat-icon"></i>
              <div class="stat-content">
                <div class="stat-value">{{ statistics.overview.totalComments }}</div>
                <div class="stat-label">互动评论</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <i class="el-icon-user stat-icon"></i>
              <div class="stat-content">
                <div class="stat-value">{{ statistics.overview.totalExperts }}</div>
                <div class="stat-label">认证专家</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <i class="el-icon-collection-tag stat-icon"></i>
              <div class="stat-content">
                <div class="stat-value">{{ statistics.overview.totalKnowledge }}</div>
                <div class="stat-label">知识库</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 帖子列表 -->
    <div class="posts-section">
      <el-card v-loading="loading" class="posts-container">
        <div v-if="posts.length === 0 && !loading" class="no-posts">
          <el-empty description="暂无相关内容">
            <el-button type="primary" @click="showCreateDialog = true" v-if="isLoggedIn">
              发布第一个分享
            </el-button>
          </el-empty>
        </div>
        
        <div v-else>
          <agricultural-post-card
            v-for="post in posts"
            :key="post._id"
            :post="post"
            @like="handleLike"
            @bookmark="handleBookmark"
            @vote="handleVote"
            @view-detail="viewPostDetail"
            class="post-item"
          />
        </div>
        
        <!-- 分页 -->
        <div class="pagination-wrapper" v-if="pagination.total > 0">
          <el-pagination
            @current-change="handlePageChange"
            :current-page="pagination.page"
            :page-size="pagination.limit"
            :total="pagination.total"
            layout="prev, pager, next, jumper, total"
          />
        </div>
      </el-card>
    </div>

    <!-- 创建帖子对话框 -->
    <agricultural-create-dialog
      :visible.sync="showCreateDialog"
      @success="handleCreateSuccess"
    />

    <!-- 专家咨询对话框 -->
    <expert-consultation-dialog
      :visible.sync="showExpertConsult"
    />

    <!-- 帖子详情对话框 -->
    <agricultural-post-detail
      :visible.sync="showPostDetail"
      :post-id="selectedPostId"
      @comment-added="handleCommentAdded"
    />
  </div>
</template>

<script>
import AgriculturalPostCard from './AgriculturalPostCard.vue'
import AgriculturalCreateDialog from './AgriculturalCreateDialog.vue'
import AgriculturalPostDetail from './AgriculturalPostDetail.vue'
import ExpertConsultationDialog from './ExpertConsultationDialog.vue'

export default {
  name: 'AgriculturalKnowledgeHub',
  components: {
    AgriculturalPostCard,
    AgriculturalCreateDialog,
    AgriculturalPostDetail,
    ExpertConsultationDialog
  },
  data() {
    return {
      searchQuery: '',
      posts: [],
      loading: false,
      statistics: null,
      showCreateDialog: false,
      showExpertConsult: false,
      showPostDetail: false,
      selectedPostId: null,
      filters: {
        sortBy: 'latest',
        postType: '',
        cropCategory: '',
        onlyQuestions: false
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      }
    }
  },
  computed: {
    isLoggedIn() {
      return this.$store.getters['auth/isLoggedIn']
    }
  },
  created() {
    this.loadPosts()
    this.loadStatistics()
  },
  methods: {
    async loadPosts() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          sortBy: this.filters.sortBy,
          postType: this.filters.postType,
          cropCategory: this.filters.cropCategory,
          isQuestion: this.filters.onlyQuestions || undefined
        }
        
        // 过滤空参数
        Object.keys(params).forEach(key => {
          if (params[key] === '' || params[key] === undefined) {
            delete params[key]
          }
        })
        
        const response = await this.$api.agricultural.getPosts(params)
        
        if (response.data.success) {
          this.posts = response.data.data.posts
          this.pagination = response.data.data.pagination
        }
      } catch (error) {
        this.$message.error('加载帖子列表失败：' + error.message)
      } finally {
        this.loading = false
      }
    },
    
    async loadStatistics() {
      try {
        const response = await this.$api.agricultural.getStatistics()
        if (response.data.success) {
          this.statistics = response.data.data
        }
      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    },
    
    async handleSearch() {
      if (!this.searchQuery.trim()) {
        this.loadPosts()
        return
      }
      
      this.loading = true
      try {
        const params = {
          q: this.searchQuery,
          page: 1,
          limit: this.pagination.limit,
          postType: this.filters.postType,
          cropCategory: this.filters.cropCategory
        }
        
        const response = await this.$api.agricultural.searchPosts(params)
        
        if (response.data.success) {
          this.posts = response.data.data.posts
          this.pagination = response.data.data.pagination
          this.pagination.page = 1
        }
      } catch (error) {
        this.$message.error('搜索失败：' + error.message)
      } finally {
        this.loading = false
      }
    },
    
    handlePageChange(page) {
      this.pagination.page = page
      this.loadPosts()
    },
    
    async handleLike(postId) {
      if (!this.isLoggedIn) {
        this.$message.warning('请先登录')
        return
      }
      
      try {
        const response = await this.$api.agricultural.toggleLike(postId)
        if (response.data.success) {
          const post = this.posts.find(p => p._id === postId)
          if (post) {
            post.engagement.likes = response.data.data.likesCount
            post.userInteractions = post.userInteractions || {}
            post.userInteractions.hasLiked = response.data.data.isLiked
          }
          this.$message.success(response.data.message)
        }
      } catch (error) {
        this.$message.error('操作失败：' + error.message)
      }
    },
    
    async handleBookmark(postId) {
      if (!this.isLoggedIn) {
        this.$message.warning('请先登录')
        return
      }
      
      try {
        const response = await this.$api.agricultural.toggleBookmark(postId)
        if (response.data.success) {
          const post = this.posts.find(p => p._id === postId)
          if (post) {
            post.engagement.bookmarks = response.data.data.bookmarksCount
            post.userInteractions = post.userInteractions || {}
            post.userInteractions.hasBookmarked = response.data.data.isBookmarked
          }
          this.$message.success(response.data.message)
        }
      } catch (error) {
        this.$message.error('操作失败：' + error.message)
      }
    },
    
    async handleVote(postId, voteType) {
      if (!this.isLoggedIn) {
        this.$message.warning('请先登录')
        return
      }
      
      try {
        const response = await this.$api.agricultural.vote(postId, voteType)
        if (response.data.success) {
          const post = this.posts.find(p => p._id === postId)
          if (post) {
            post.engagement.helpfulVotes = response.data.data.helpfulVotes
            post.engagement.unhelpfulVotes = response.data.data.unhelpfulVotes
            post.userInteractions = post.userInteractions || {}
            post.userInteractions.userVote = response.data.data.userVote
          }
          this.$message.success('投票成功')
        }
      } catch (error) {
        this.$message.error('投票失败：' + error.message)
      }
    },
    
    viewPostDetail(postId) {
      this.selectedPostId = postId
      this.showPostDetail = true
    },
    
    handleCreateSuccess() {
      this.$message.success('发布成功')
      this.showCreateDialog = false
      this.loadPosts()
      this.loadStatistics()
    },
    
    handleCommentAdded() {
      // 刷新当前帖子列表中的评论数
      this.loadPosts()
    }
  }
}
</script>

<style scoped>
.agricultural-knowledge-hub {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.hub-header {
  background: linear-gradient(135deg, #67C23A 0%, #85CE61 100%);
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 20px;
  color: white;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hub-title {
  font-size: 28px;
  font-weight: bold;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-filters {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.search-section {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
  max-width: 400px;
}

.filter-section {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-section .el-select {
  width: 140px;
}

.statistics-overview {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 32px;
  color: #67C23A;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.posts-container {
  border-radius: 8px;
  min-height: 400px;
}

.post-item {
  margin-bottom: 16px;
}

.post-item:last-child {
  margin-bottom: 0;
}

.no-posts {
  text-align: center;
  padding: 60px 20px;
}

.pagination-wrapper {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #EBEEF5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .agricultural-knowledge-hub {
    padding: 10px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .search-section {
    flex-direction: column;
  }
  
  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-section .el-select {
    width: 100%;
    margin-bottom: 8px;
  }
  
  .hub-title {
    font-size: 22px;
  }
}
</style>