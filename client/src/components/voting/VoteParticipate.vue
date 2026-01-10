<template>
  <div class="vote-participate" v-loading="loading">
    <div v-if="vote" class="participate-container">
      <!-- 投票信息头部 -->
      <div class="vote-header">
        <h1>{{ vote.title }}</h1>
        <div class="vote-info">
          <el-tag :type="getStatusType(vote)" size="medium">
            {{ getStatusText(vote) }}
          </el-tag>
          <span class="vote-type">{{ getVoteTypeText(vote.voteType) }}</span>
          <span class="anonymous-type">{{ getAnonymousTypeText(vote.anonymousType) }}</span>
        </div>
        <p class="vote-description">{{ vote.description }}</p>
      </div>

      <!-- 投票说明 -->
      <div class="vote-instructions">
        <el-alert
          :title="getInstructionTitle()"
          :description="getInstructionDescription()"
          type="info"
          :closable="false"
          show-icon
        ></el-alert>

        <div v-if="vote.userVoteStatus.hasVoted" class="modify-warning">
          <el-alert
            title="您已参与过此投票"
            :description="`投票时间: ${formatDate(vote.userVoteStatus.votedAt)}`"
            type="warning"
            :closable="false"
            show-icon
          >
            <div class="previous-vote">
              <p>您之前的选择:</p>
              <el-tag
                v-for="(selected, index) in vote.userVoteStatus.selectedOptions"
                :key="index"
                type="warning"
                size="small"
              >
                {{ getOptionTitle(selected.optionId) }}
                <span v-if="selected.rating"> ({{ selected.rating }}分)</span>
              </el-tag>
            </div>
            <p v-if="vote.userVoteStatus.canModify" class="modify-hint">
              您可以修改投票选择，提交后将覆盖之前的投票。
            </p>
          </el-alert>
        </div>
      </div>

      <!-- 投票表单 -->
      <div class="vote-form">
        <el-form ref="voteForm" :model="voteForm" :rules="voteRules" label-position="top">
          <!-- 投票选项 -->
          <el-form-item label="请选择您的投票选项" prop="selectedOptions">
            <div class="options-container">
              <!-- 单选投票 -->
              <el-radio-group
                v-if="vote.voteType === 'single_choice' || vote.voteType === 'yes_no'"
                v-model="singleChoice"
                @change="handleSingleChoiceChange"
              >
                <div
                  v-for="(option, index) in vote.options"
                  :key="option.optionId"
                  class="option-card"
                >
                  <el-radio :label="option.optionId" class="option-radio">
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
                  </el-radio>
                </div>
              </el-radio-group>

              <!-- 多选投票 -->
              <el-checkbox-group
                v-else-if="vote.voteType === 'multiple_choice'"
                v-model="multipleChoices"
                :max="vote.settings.maxChoices"
                @change="handleMultipleChoiceChange"
              >
                <div
                  v-for="(option, index) in vote.options"
                  :key="option.optionId"
                  class="option-card"
                >
                  <el-checkbox :label="option.optionId" class="option-checkbox">
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
                  </el-checkbox>
                </div>
              </el-checkbox-group>

              <!-- 评分投票 -->
              <div v-else-if="vote.voteType === 'rating'" class="rating-options">
                <div
                  v-for="(option, index) in vote.options"
                  :key="option.optionId"
                  class="rating-option-card"
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
                  <div class="rating-control">
                    <span class="rating-label">请评分 (1-10分):</span>
                    <el-rate
                      v-model="ratingScores[option.optionId]"
                      :max="10"
                      show-text
                      :texts="[
                        '1分',
                        '2分',
                        '3分',
                        '4分',
                        '5分',
                        '6分',
                        '7分',
                        '8分',
                        '9分',
                        '10分',
                      ]"
                      @change="handleRatingChange"
                    ></el-rate>
                  </div>
                </div>
              </div>

              <!-- 排序投票 -->
              <div v-else-if="vote.voteType === 'ranking'" class="ranking-options">
                <p class="ranking-instruction">
                  请拖拽下方选项进行排序，排在最上方的为最preferred选项:
                </p>
                <draggable
                  v-model="rankingOrder"
                  @change="handleRankingChange"
                  class="ranking-list"
                >
                  <div
                    v-for="(optionId, index) in rankingOrder"
                    :key="optionId"
                    class="ranking-item"
                  >
                    <div class="rank-number">{{ index + 1 }}</div>
                    <div class="option-content">
                      <h3>{{ getOptionTitle(optionId) }}</h3>
                      <p v-if="getOptionDescription(optionId)">
                        {{ getOptionDescription(optionId) }}
                      </p>
                    </div>
                    <div class="drag-handle">
                      <i class="el-icon-rank"></i>
                    </div>
                  </div>
                </draggable>
              </div>
            </div>
          </el-form-item>

          <!-- 投票理由 (如果需要) -->
          <el-form-item v-if="vote.settings.requireComment" label="投票理由" prop="comment">
            <el-input
              v-model="voteForm.comment"
              type="textarea"
              :rows="3"
              placeholder="请说明您的投票理由..."
              maxlength="1000"
              show-word-limit
            ></el-input>
          </el-form-item>

          <!-- 验证方式 -->
          <el-form-item label="验证方式" prop="verificationMethod">
            <el-radio-group v-model="voteForm.verificationMethod">
              <el-radio label="password">密码验证</el-radio>
              <el-radio label="sms" disabled>短信验证 (暂不可用)</el-radio>
              <el-radio label="face_recognition" disabled>人脸识别 (暂不可用)</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 位置信息 (可选) -->
          <el-form-item label="位置信息 (可选)">
            <el-switch
              v-model="enableLocation"
              active-text="包含位置信息"
              inactive-text="不包含位置信息"
            ></el-switch>
            <div v-if="enableLocation" class="location-info">
              <p class="location-hint">
                <i class="el-icon-location-information"></i>
                将记录您的大致位置信息以确保投票的真实性
              </p>
            </div>
          </el-form-item>

          <!-- 隐私提醒 -->
          <div class="privacy-notice">
            <el-alert title="隐私说明" :closable="false" type="info">
              <div class="privacy-content">
                <p v-if="vote.anonymousType === 'anonymous'">
                  <i class="el-icon-lock"></i>
                  本次投票为匿名投票，您的个人信息不会与投票选择关联显示。
                </p>
                <p v-else-if="vote.anonymousType === 'real_name'">
                  <i class="el-icon-view"></i>
                  本次投票为实名投票，您的姓名将与投票选择一同记录。
                </p>
                <p v-else>
                  <i class="el-icon-question"></i>
                  本次投票为半匿名投票，部分信息可能被管理员查看。
                </p>
                <p>
                  投票数据仅用于本次投票统计，不会用于其他用途。
                  投票记录将按照相关法律法规进行保存和管理。
                </p>
              </div>
            </el-alert>
          </div>

          <!-- 提交按钮 -->
          <div class="submit-actions">
            <el-button
              type="primary"
              size="large"
              @click="submitVote"
              :loading="submitting"
              :disabled="!canSubmit"
            >
              <i class="el-icon-check"></i>
              {{ vote.userVoteStatus.hasVoted ? '修改投票' : '提交投票' }}
            </el-button>
            <el-button size="large" @click="$router.go(-1)">
              <i class="el-icon-close"></i>
              取消
            </el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script>
import { votingAPI } from '@/api/voting';
import { formatDate } from '@/utils/dateUtils';
import draggable from 'vuedraggable';

export default {
  name: 'VoteParticipate',
  components: {
    draggable,
  },
  data() {
    return {
      loading: false,
      submitting: false,
      vote: null,
      voteForm: {
        selectedOptions: [],
        comment: '',
        verificationMethod: 'password',
      },
      enableLocation: false,
      // 不同投票类型的选择状态
      singleChoice: '',
      multipleChoices: [],
      ratingScores: {},
      rankingOrder: [],
      voteRules: {
        selectedOptions: [{ required: true, message: '请选择投票选项', trigger: 'change' }],
        comment: [{ required: true, message: '请填写投票理由', trigger: 'blur' }],
      },
    };
  },
  computed: {
    voteId() {
      return this.$route.params.id;
    },
    canSubmit() {
      if (!this.vote) return false;

      switch (this.vote.voteType) {
        case 'single_choice':
        case 'yes_no':
          return !!this.singleChoice;
        case 'multiple_choice':
          return this.multipleChoices.length > 0;
        case 'rating':
          return (
            Object.keys(this.ratingScores).length > 0 &&
            Object.values(this.ratingScores).every(score => score >= 1 && score <= 10)
          );
        case 'ranking':
          return this.rankingOrder.length === this.vote.options.length;
        default:
          return false;
      }
    },
  },
  created() {
    this.loadVoteDetails();
  },
  methods: {
    async loadVoteDetails() {
      this.loading = true;
      try {
        const response = await votingAPI.getVoteDetails(this.voteId);

        if (response.data.success) {
          this.vote = response.data.data;
          this.initializeVoteForm();
        }
      } catch (error) {
        this.$message.error('加载投票详情失败');
        console.error(error);
        this.$router.go(-1);
      } finally {
        this.loading = false;
      }
    },

    initializeVoteForm() {
      // 如果用户已投票且可修改，预填充之前的选择
      if (this.vote.userVoteStatus.hasVoted && this.vote.userVoteStatus.canModify) {
        const previousSelections = this.vote.userVoteStatus.selectedOptions;

        switch (this.vote.voteType) {
          case 'single_choice':
          case 'yes_no':
            this.singleChoice = previousSelections[0]?.optionId || '';
            break;
          case 'multiple_choice':
            this.multipleChoices = previousSelections.map(s => s.optionId);
            break;
          case 'rating':
            previousSelections.forEach(s => {
              if (s.rating) {
                this.ratingScores[s.optionId] = s.rating;
              }
            });
            break;
          case 'ranking':
            this.rankingOrder = previousSelections
              .sort((a, b) => (a.ranking || 0) - (b.ranking || 0))
              .map(s => s.optionId);
            break;
        }
      } else {
        // 初始化排序投票的选项顺序
        if (this.vote.voteType === 'ranking') {
          this.rankingOrder = this.vote.options.map(opt => opt.optionId);
        }
      }

      // 设置表单验证规则
      if (this.vote.settings.requireComment) {
        this.voteRules.comment[0].required = true;
      }
    },

    handleSingleChoiceChange() {
      this.voteForm.selectedOptions = [
        {
          optionId: this.singleChoice,
        },
      ];
    },

    handleMultipleChoiceChange() {
      this.voteForm.selectedOptions = this.multipleChoices.map(optionId => ({
        optionId,
      }));
    },

    handleRatingChange() {
      this.voteForm.selectedOptions = Object.entries(this.ratingScores)
        .filter(([_, rating]) => rating > 0)
        .map(([optionId, rating]) => ({
          optionId,
          rating,
        }));
    },

    handleRankingChange() {
      this.voteForm.selectedOptions = this.rankingOrder.map((optionId, index) => ({
        optionId,
        ranking: index + 1,
      }));
    },

    async submitVote() {
      // 表单验证
      try {
        await this.$refs.voteForm.validate();
      } catch (error) {
        this.$message.error('请检查表单填写');
        return;
      }

      // 获取位置信息
      let location = null;
      if (this.enableLocation) {
        location = await this.getCurrentLocation();
      }

      this.submitting = true;
      try {
        const voteData = {
          selectedOptions: this.voteForm.selectedOptions,
          comment: this.voteForm.comment,
          verificationMethod: this.voteForm.verificationMethod,
          location,
        };

        const response = await votingAPI.castVote(this.voteId, voteData);

        if (response.data.success) {
          this.$message.success(response.data.message);
          // 跳转到结果页面或详情页面
          this.$router.push(`/voting/${this.voteId}/results`);
        }
      } catch (error) {
        const message = error.response?.data?.message || '投票提交失败';
        this.$message.error(message);
        console.error(error);
      } finally {
        this.submitting = false;
      }
    },

    async getCurrentLocation() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          position => {
            resolve({
              longitude: position.coords.longitude,
              latitude: position.coords.latitude,
            });
          },
          error => {
            console.warn('获取位置失败:', error);
            resolve(null);
          },
          {
            timeout: 10000,
            enableHighAccuracy: false,
          }
        );
      });
    },

    getOptionTitle(optionId) {
      const option = this.vote.options.find(opt => opt.optionId === optionId);
      return option ? option.title : '未知选项';
    },

    getOptionDescription(optionId) {
      const option = this.vote.options.find(opt => opt.optionId === optionId);
      return option ? option.description : '';
    },

    getInstructionTitle() {
      switch (this.vote.voteType) {
        case 'single_choice':
          return '单选投票说明';
        case 'multiple_choice':
          return '多选投票说明';
        case 'rating':
          return '评分投票说明';
        case 'ranking':
          return '排序投票说明';
        case 'yes_no':
          return '是否投票说明';
        default:
          return '投票说明';
      }
    },

    getInstructionDescription() {
      switch (this.vote.voteType) {
        case 'single_choice':
          return '请从以下选项中选择一个您最赞同的选项';
        case 'multiple_choice':
          return `请从以下选项中选择您赞同的选项，最多可选择 ${this.vote.settings.maxChoices} 个`;
        case 'rating':
          return '请为每个选项打分，分数范围为1-10分，您可以选择对部分或全部选项打分';
        case 'ranking':
          return '请通过拖拽对选项进行排序，排在最上方的为您最preferred的选项';
        case 'yes_no':
          return '请选择您对此事项的态度';
        default:
          return '请按照投票要求进行选择';
      }
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

    formatDate,
  },
};
</script>

<style scoped>
.vote-participate {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.vote-header {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.vote-header h1 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 24px;
}

.vote-info {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.vote-description {
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.vote-instructions {
  margin-bottom: 20px;
}

.modify-warning {
  margin-top: 15px;
}

.previous-vote {
  margin-top: 10px;
}

.previous-vote p {
  margin: 0 0 8px 0;
  color: #666;
}

.modify-hint {
  margin: 0;
  color: #e6a23c;
  font-size: 14px;
}

.vote-form {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.options-container {
  margin-bottom: 20px;
}

.option-card {
  border: 2px solid #eee;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  transition: all 0.3s ease;
}

.option-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.option-radio,
.option-checkbox {
  width: 100%;
}

.option-content {
  margin-left: 0;
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
  font-size: 14px;
}

.option-title {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.option-description {
  color: #666;
  line-height: 1.5;
  margin: 10px 0;
  font-size: 14px;
}

.option-image {
  max-width: 200px;
  max-height: 150px;
  border-radius: 4px;
  margin-top: 10px;
}

.rating-option-card {
  border: 2px solid #eee;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rating-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.rating-label {
  font-size: 14px;
  color: #666;
}

.ranking-instruction {
  color: #666;
  margin-bottom: 15px;
  line-height: 1.5;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 15px;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  cursor: move;
  transition: all 0.3s ease;
}

.ranking-item:hover {
  background: #e9ecef;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.rank-number {
  background: #409eff;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.ranking-item .option-content {
  flex: 1;
}

.ranking-item h3 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 16px;
}

.ranking-item p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.drag-handle {
  color: #999;
  cursor: move;
}

.location-info {
  margin-top: 10px;
}

.location-hint {
  color: #666;
  font-size: 14px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 5px;
}

.privacy-notice {
  margin: 20px 0;
}

.privacy-content p {
  margin: 5px 0;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  line-height: 1.5;
}

.submit-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .vote-participate {
    padding: 10px;
  }

  .vote-header,
  .vote-form {
    padding: 15px;
  }

  .vote-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .option-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .rating-option-card {
    flex-direction: column;
    gap: 15px;
  }

  .submit-actions {
    flex-direction: column;
  }
}
</style>
