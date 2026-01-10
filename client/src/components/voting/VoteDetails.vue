<template>
  <div class="vote-details" v-loading="loading">
    <div v-if="vote" class="vote-container">
      <!-- 投票头部信息 -->
      <div class="vote-header">
        <div class="header-info">
          <h1>{{ vote.title }}</h1>
          <div class="vote-meta">
            <el-tag :type="getStatusType(vote)" size="medium">
              {{ getStatusText(vote) }}
            </el-tag>
            <span class="creator">创建者: {{ vote.creator.realName || vote.creator.name }}</span>
            <span class="created-time">{{ formatDate(vote.createdAt) }}</span>
          </div>
        </div>
        <div class="header-actions">
          <el-button @click="$router.go(-1)">
            <i class="el-icon-arrow-left"></i>
            返回列表
          </el-button>
        </div>
      </div>

      <!-- 投票状态和时间信息 -->
      <div class="vote-status-panel">
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="status-card">
              <h3>投票状态</h3>
              <div class="status-content">
                <el-tag :type="getStatusType(vote)" size="large">
                  {{ getStatusText(vote) }}
                </el-tag>
                <p v-if="vote.voteStatus.timeRemaining" class="time-remaining">
                  剩余时间: {{ formatTimeRemaining(vote.voteStatus.timeRemaining) }}
                </p>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="status-card">
              <h3>参与情况</h3>
              <div class="status-content">
                <div class="participation-stats">
                  <div class="stat-item">
                    <span class="label">已投票:</span>
                    <span class="value">{{ vote.statistics.totalVoted }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="label">总人数:</span>
                    <span class="value">{{ vote.statistics.totalEligibleVoters }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="label">参与率:</span>
                    <span class="value">{{ Math.round(vote.statistics.participationRate) }}%</span>
                  </div>
                </div>
                <el-progress
                  :percentage="Math.round(vote.statistics.participationRate)"
                  :stroke-width="8"
                  :text-inside="true"
                ></el-progress>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="status-card">
              <h3>投票设置</h3>
              <div class="status-content">
                <div class="setting-item">
                  <span class="label">投票类型:</span>
                  <span class="value">{{ getVoteTypeText(vote.voteType) }}</span>
                </div>
                <div class="setting-item">
                  <span class="label">匿名设置:</span>
                  <span class="value">{{ getAnonymousTypeText(vote.anonymousType) }}</span>
                </div>
                <div class="setting-item">
                  <span class="label">选民范围:</span>
                  <span class="value">{{
                    getEligibleVotersText(vote.settings.eligibleVoters)
                  }}</span>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 投票描述 -->
      <div class="vote-description">
        <h2>投票说明</h2>
        <div class="description-content" v-html="formattedDescription"></div>

        <div v-if="vote.tags && vote.tags.length" class="vote-tags">
          <span class="tags-label">标签:</span>
          <el-tag v-for="tag in vote.tags" :key="tag" size="small" type="info">
            {{ tag }}
          </el-tag>
        </div>
      </div>

      <!-- 投票选项 -->
      <div class="vote-options">
        <h2>投票选项</h2>
        <div class="options-list">
          <div
            v-for="(option, index) in vote.options"
            :key="option.optionId"
            class="option-item"
            :class="{ 'user-selected': isUserSelectedOption(option.optionId) }"
          >
            <div class="option-content">
              <div class="option-header">
                <span class="option-label">{{ String.fromCharCode(65 + index) }}.</span>
                <h3 class="option-title">{{ option.title }}</h3>
              </div>

              <p v-if="option.description" class="option-description">
                {{ option.description }}
              </p>

              <img
                v-if="option.imageUrl"
                :src="option.imageUrl"
                :alt="option.title"
                class="option-image"
              />
            </div>

            <!-- 投票结果显示（如果可见） -->
            <div v-if="showResults && option.voteCount !== undefined" class="option-result">
              <div class="result-bar">
                <div class="result-fill" :style="{ width: option.percentage + '%' }"></div>
                <div class="result-text">{{ option.voteCount }} 票 ({{ option.percentage }}%)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 用户投票状态 -->
      <div v-if="vote.userVoteStatus.hasVoted" class="user-vote-status">
        <el-alert
          type="success"
          :title="`您已于 ${formatDate(vote.userVoteStatus.votedAt)} 参与投票`"
          :closable="false"
          show-icon
        >
          <div class="voted-options">
            <span>您的选择: </span>
            <el-tag
              v-for="(selected, index) in vote.userVoteStatus.selectedOptions"
              :key="index"
              type="success"
              size="small"
            >
              {{ getOptionTitle(selected.optionId) }}
              <span v-if="selected.rating"> ({{ selected.rating }}分)</span>
            </el-tag>
          </div>
          <div v-if="vote.userVoteStatus.canModify" class="modify-hint">
            <p>您可以修改投票选择</p>
          </div>
        </el-alert>
      </div>

      <!-- 投票操作区域 -->
      <div class="vote-actions">
        <el-button
          v-if="canVote"
          type="primary"
          size="large"
          @click="participateVote"
          :loading="voting"
        >
          <i class="el-icon-check"></i>
          {{
            vote.userVoteStatus.hasVoted && vote.userVoteStatus.canModify ? '修改投票' : '立即投票'
          }}
        </el-button>

        <el-button v-if="canViewResults" type="success" size="large" @click="viewResults">
          <i class="el-icon-s-data"></i>
          查看结果
        </el-button>

        <el-button size="large" @click="refreshData" :loading="loading">
          <i class="el-icon-refresh"></i>
          刷新数据
        </el-button>
      </div>

      <!-- 投票时间线 -->
      <div class="vote-timeline">
        <h2>投票时间</h2>
        <el-timeline>
          <el-timeline-item
            timestamp="开始时间"
            :color="vote.voteStatus.isActive || vote.voteStatus.isExpired ? '#67c23a' : '#e6a23c'"
          >
            {{ formatDate(vote.settings.startTime) }}
          </el-timeline-item>
          <el-timeline-item
            timestamp="结束时间"
            :color="vote.voteStatus.isExpired ? '#67c23a' : '#e6a23c'"
          >
            {{ formatDate(vote.settings.endTime) }}
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>
  </div>
</template>

<script>
import { votingAPI } from '@/api/voting';
import { formatDate } from '@/utils/dateUtils';

export default {
  name: 'VoteDetails',
  data() {
    return {
      loading: false,
      voting: false,
      vote: null,
    };
  },
  computed: {
    voteId() {
      return this.$route.params.id;
    },
    showResults() {
      if (!this.vote) return false;
      return (
        this.vote.userVoteStatus.hasVoted ||
        this.vote.voteStatus.isExpired ||
        this.vote.settings.showResultsBeforeEnd
      );
    },
    canVote() {
      if (!this.vote) return false;
      return (
        this.vote.voteStatus.isActive &&
        (!this.vote.userVoteStatus.hasVoted || this.vote.userVoteStatus.canModify)
      );
    },
    canViewResults() {
      if (!this.vote) return false;
      return (
        this.vote.userVoteStatus.hasVoted ||
        this.vote.voteStatus.isExpired ||
        this.vote.settings.showResultsBeforeEnd
      );
    },
    formattedDescription() {
      if (!this.vote) return '';
      return this.vote.description.replace(/\n/g, '<br>');
    },
  },
  created() {
    this.loadVoteDetails();
  },
  methods: {
    async loadVoteDetails() {
      this.loading = true;
      try {
        const response = await votingAPI.getVoteDetails(this.voteId, {
          includeResults: this.showResults,
        });

        if (response.data.success) {
          this.vote = response.data.data;
        }
      } catch (error) {
        this.$message.error('加载投票详情失败');
        console.error(error);
      } finally {
        this.loading = false;
      }
    },

    async refreshData() {
      await this.loadVoteDetails();
      this.$message.success('数据已刷新');
    },

    participateVote() {
      this.$router.push(`/voting/${this.voteId}/participate`);
    },

    viewResults() {
      this.$router.push(`/voting/${this.voteId}/results`);
    },

    isUserSelectedOption(optionId) {
      if (!this.vote.userVoteStatus.hasVoted) return false;

      return this.vote.userVoteStatus.selectedOptions.some(
        selected => selected.optionId === optionId
      );
    },

    getOptionTitle(optionId) {
      const option = this.vote.options.find(opt => opt.optionId === optionId);
      return option ? option.title : '未知选项';
    },

    getStatusType(vote) {
      if (vote.voteStatus.isActive) return 'success';
      if (vote.voteStatus.isExpired) return 'info';
      return 'warning';
    },

    getStatusText(vote) {
      if (vote.voteStatus.isActive) return '进行中';
      if (vote.voteStatus.isExpired) return '已结束';
      return '即将开始';
    },

    getVoteTypeText(voteType) {
      const types = {
        single_choice: '单选投票',
        multiple_choice: '多选投票',
        ranking: '排序投票',
        rating: '评分投票',
        yes_no: '是否投票',
      };
      return types[voteType] || '未知类型';
    },

    getAnonymousTypeText(anonymousType) {
      const types = {
        real_name: '实名投票',
        anonymous: '匿名投票',
        semi_anonymous: '半匿名投票',
      };
      return types[anonymousType] || '未知类型';
    },

    getEligibleVotersText(eligibleVoters) {
      const types = {
        all_residents: '全体村民',
        household_heads: '户主',
        age_restricted: '年龄限制',
        custom_group: '自定义群体',
      };
      return types[eligibleVoters] || '未知范围';
    },

    formatTimeRemaining(timeRemaining) {
      if (!timeRemaining) return '';

      if (timeRemaining.days > 0) {
        return `${timeRemaining.days}天${timeRemaining.hours}小时`;
      } else if (timeRemaining.hours > 0) {
        return `${timeRemaining.hours}小时${timeRemaining.minutes}分钟`;
      } else {
        return `${timeRemaining.minutes}分钟`;
      }
    },

    formatDate,
  },
};
</script>

<style scoped>
.vote-details {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.vote-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.vote-header h1 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 28px;
}

.vote-meta {
  display: flex;
  align-items: center;
  gap: 15px;
  color: #666;
}

.vote-status-panel {
  margin-bottom: 30px;
}

.status-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  height: 100%;
}

.status-card h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.participation-stats {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
}

.stat-item,
.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  color: #666;
  font-size: 14px;
}

.value {
  color: #333;
  font-weight: 500;
}

.time-remaining {
  margin-top: 10px;
  color: #e6a23c;
  font-weight: 500;
}

.vote-description,
.vote-options,
.vote-timeline {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.vote-description h2,
.vote-options h2,
.vote-timeline h2 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 20px;
  border-bottom: 2px solid #409eff;
  padding-bottom: 10px;
}

.description-content {
  line-height: 1.8;
  color: #666;
  font-size: 16px;
  margin-bottom: 20px;
}

.vote-tags {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tags-label {
  color: #999;
  font-size: 14px;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.option-item {
  border: 2px solid #eee;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s ease;
}

.option-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.option-item.user-selected {
  border-color: #67c23a;
  background: #f0f9ff;
}

.option-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.option-label {
  background: #409eff;
  color: white;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
}

.option-title {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.option-description {
  color: #666;
  line-height: 1.6;
  margin: 10px 0;
}

.option-image {
  max-width: 200px;
  max-height: 150px;
  border-radius: 4px;
  margin-top: 10px;
}

.option-result {
  margin-top: 15px;
}

.result-bar {
  position: relative;
  background: #f0f0f0;
  border-radius: 10px;
  height: 30px;
  overflow: hidden;
}

.result-fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  transition: width 0.5s ease;
}

.result-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

.user-vote-status {
  margin-bottom: 20px;
}

.voted-options {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.modify-hint p {
  margin: 0;
  color: #e6a23c;
  font-size: 14px;
}

.vote-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin: 30px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .vote-details {
    padding: 10px;
  }

  .vote-header {
    flex-direction: column;
    gap: 15px;
  }

  .vote-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .vote-actions {
    flex-direction: column;
  }

  .status-card {
    margin-bottom: 15px;
  }

  .option-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
