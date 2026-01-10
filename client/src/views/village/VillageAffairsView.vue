<template>
  <div class="village-affairs" :class="{ 'large-text-mode': largeTextMode }">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-bg"></div>
      <div class="header-content">
        <div class="header-info">
          <h1 class="page-title">智慧乡村工作台</h1>
          <p class="page-description">村务管理 + 生活服务，一站式综合平台</p>
          <div class="user-greeting">
            <span>欢迎，{{ userInfo.name || '村民' }}</span>
            <el-tag :type="getUserRoleType()" size="small">{{ getRoleLabel() }}</el-tag>
          </div>
        </div>
        <div class="header-actions">
          <el-button @click="showQRCode" :size="largeTextMode ? 'large' : 'default'" icon="User">
            我的二维码
          </el-button>
          <el-button
            @click="showPolicyCalculator"
            :size="largeTextMode ? 'large' : 'default'"
            :icon="Management"
          >
            政策计算器
          </el-button>
          <el-button
            @click="showVoiceAssistant"
            :size="largeTextMode ? 'large' : 'default'"
            icon="Microphone"
          >
            语音助手
          </el-button>
          <el-button
            @click="showSettings"
            :size="largeTextMode ? 'large' : 'default'"
            icon="Setting"
          >
            设置
          </el-button>
        </div>
      </div>
    </div>

    <!-- 功能分区导航 -->
    <div class="zone-tabs">
      <el-tabs v-model="activeZone" @tab-change="handleZoneChange">
        <el-tab-pane label="村务管理" name="village">
          <template #label>
            <div class="tab-label">
              <el-icon><Location /></el-icon>
              <span>村务管理</span>
            </div>
          </template>
        </el-tab-pane>
        <el-tab-pane label="生活服务" name="life">
          <template #label>
            <div class="tab-label">
              <el-icon><ShoppingBag /></el-icon>
              <span>生活服务</span>
            </div>
          </template>
        </el-tab-pane>
        <el-tab-pane label="家庭档案" name="family">
          <template #label>
            <div class="tab-label">
              <el-icon><User /></el-icon>
              <span>家庭档案</span>
            </div>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 村务管理区域 -->
    <div v-show="activeZone === 'village'" class="zone-content">
      <!-- 快捷功能入口 -->
      <div class="quick-access">
        <div class="access-container">
          <div
            v-for="access in quickAccessItems"
            :key="access.id"
            class="access-item"
            @click="handleQuickAccess(access)"
          >
            <div class="access-icon">{{ access.icon }}</div>
            <div class="access-info">
              <div class="access-title">{{ access.title }}</div>
              <div class="access-desc">{{ access.description }}</div>
            </div>
            <el-icon class="access-arrow"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>

      <!-- 积分展示 -->
      <div class="points-section">
        <el-card class="points-card">
          <div class="points-content">
            <div class="points-info">
              <div class="points-label">我的积分</div>
              <div class="points-value">{{ userPoints.total }}</div>
              <div class="points-rank">排名: 第 {{ userPoints.rank }} 名</div>
            </div>
            <div class="points-actions">
              <el-button
                type="primary"
                @click="showPointsDetail"
                :size="largeTextMode ? 'large' : 'default'"
              >
                查看详情
              </el-button>
              <el-button @click="showPointsMall" :size="largeTextMode ? 'large' : 'default'">
                积分商城
              </el-button>
            </div>
          </div>
          <div class="points-progress">
            <div class="progress-label">距离下一等级还需 {{ userPoints.nextLevelPoints }} 积分</div>
            <el-progress :percentage="userPoints.progress" :stroke-width="20" />
          </div>
        </el-card>
      </div>

      <!-- 信息分类导航 -->
      <div class="category-nav">
        <div class="nav-container">
          <div
            v-for="category in categories"
            :key="category.key"
            class="nav-item"
            :class="{ active: activeCategory === category.key }"
            @click="setActiveCategory(category.key)"
          >
            <div class="nav-icon">{{ category.icon }}</div>
            <span class="nav-label">{{ category.label }}</span>
            <el-badge v-if="category.count > 0" :value="category.count" class="nav-badge" />
          </div>
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="main-content">
        <el-row :gutter="24">
          <!-- 左侧信息列表 -->
          <el-col :xs="24" :lg="16">
            <!-- 搜索和筛选 -->
            <el-card class="search-card">
              <div class="search-container">
                <el-input
                  v-model="searchQuery"
                  placeholder="搜索村务信息..."
                  :size="largeTextMode ? 'large' : 'default'"
                  clearable
                  @keyup.enter="handleSearch"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>

                <el-select
                  v-model="timeFilter"
                  placeholder="时间范围"
                  :size="largeTextMode ? 'large' : 'default'"
                  @change="handleTimeFilter"
                >
                  <el-option label="全部时间" value="" />
                  <el-option label="今天" value="today" />
                  <el-option label="本周" value="week" />
                  <el-option label="本月" value="month" />
                  <el-option label="最近三月" value="quarter" />
                </el-select>

                <el-button
                  type="primary"
                  @click="handleSearch"
                  :size="largeTextMode ? 'large' : 'default'"
                  icon="Search"
                >
                  搜索
                </el-button>
              </div>
            </el-card>

            <!-- 信息列表 -->
            <el-card class="content-card">
              <template #header>
                <div class="card-header">
                  <span class="card-title">{{ getCurrentCategoryTitle() }}</span>
                  <div class="header-actions">
                    <el-button size="small" @click="refreshContent" icon="Refresh">
                      刷新
                    </el-button>
                  </div>
                </div>
              </template>

              <div class="affairs-list" v-loading="loading">
                <!-- 重要通知置顶 -->
                <div
                  v-for="item in importantNotices"
                  :key="'important-' + item.id"
                  class="affair-item important"
                  @click="viewDetail(item)"
                >
                  <div class="item-header">
                    <div class="item-title">
                      <el-icon class="important-icon" color="#f56c6c"><Warning /></el-icon>
                      <span class="title-text">{{ item.title }}</span>
                      <el-tag type="danger" size="small">重要</el-tag>
                    </div>
                    <div class="item-time">{{ formatTime(item.publishTime) }}</div>
                  </div>
                  <div class="item-summary">{{ item.summary }}</div>
                  <div class="item-footer">
                    <div class="item-meta">
                      <span class="meta-item">{{ item.category }}</span>
                      <span class="meta-item">阅读 {{ item.readCount }}</span>
                    </div>
                    <el-button type="text" size="small">查看详情</el-button>
                  </div>
                </div>

                <!-- 普通信息 -->
                <div
                  v-for="item in filteredAffairs"
                  :key="item.id"
                  class="affair-item"
                  @click="viewDetail(item)"
                >
                  <div class="item-header">
                    <div class="item-title">
                      <span class="title-text">{{ item.title }}</span>
                      <el-tag :type="getCategoryType(item.category)" size="small">
                        {{ item.category }}
                      </el-tag>
                    </div>
                    <div class="item-time">{{ formatTime(item.publishTime) }}</div>
                  </div>
                  <div class="item-summary">{{ item.summary }}</div>
                  <div class="item-footer">
                    <div class="item-meta">
                      <span class="meta-item">{{ item.publisher }}</span>
                      <span class="meta-item">阅读 {{ item.readCount }}</span>
                      <span class="meta-item" v-if="item.attachments.length > 0">
                        <el-icon><Paperclip /></el-icon> {{ item.attachments.length }}个附件
                      </span>
                    </div>
                    <div class="item-actions">
                      <el-button type="text" size="small" @click.stop="likeItem(item)">
                        <el-icon><StarFilled /></el-icon> {{ item.likeCount }}
                      </el-button>
                      <el-button type="text" size="small" @click.stop="shareItem(item)">
                        <el-icon><Share /></el-icon> 分享
                      </el-button>
                    </div>
                  </div>
                </div>

                <!-- 空状态 -->
                <el-empty
                  v-if="!loading && filteredAffairs.length === 0 && importantNotices.length === 0"
                  description="暂无相关村务信息"
                />

                <!-- 加载更多 -->
                <div class="load-more" v-if="hasMore">
                  <el-button @click="loadMore" :loading="loadingMore">
                    {{ loadingMore ? '加载中...' : '加载更多' }}
                  </el-button>
                </div>
              </div>
            </el-card>
          </el-col>

          <!-- 右侧边栏 -->
          <el-col :xs="24" :lg="8">
            <!-- 村情速览 -->
            <el-card class="village-info-card">
              <template #header>
                <div class="card-header">
                  <el-icon><Location /></el-icon>
                  <span>村情速览</span>
                </div>
              </template>

              <div class="village-info">
                <div class="info-row">
                  <span class="info-label">村庄名称:</span>
                  <span class="info-value">{{ villageInfo.name }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">总人口:</span>
                  <span class="info-value">{{ villageInfo.population }} 人</span>
                </div>
                <div class="info-row">
                  <span class="info-label">户数:</span>
                  <span class="info-value">{{ villageInfo.households }} 户</span>
                </div>
                <div class="info-row">
                  <span class="info-label">面积:</span>
                  <span class="info-value">{{ villageInfo.area }} 平方公里</span>
                </div>
                <el-button
                  type="primary"
                  @click="viewVillageMap"
                  style="width: 100%; margin-top: 12px"
                >
                  查看村情地图
                </el-button>
              </div>
            </el-card>

            <!-- 值班表 -->
            <el-card class="duty-card">
              <template #header>
                <div class="card-header">
                  <el-icon><Clock /></el-icon>
                  <span>今日值班</span>
                </div>
              </template>

              <div class="duty-info">
                <div class="duty-person">
                  <div class="person-avatar">
                    <el-avatar :size="50">{{ todayDuty.person?.name?.charAt(0) || '?' }}</el-avatar>
                  </div>
                  <div class="person-details">
                    <div class="person-name">{{ todayDuty.person?.name || '暂无值班人员' }}</div>
                    <div class="person-role">{{ todayDuty.person?.role || '' }}</div>
                    <div class="duty-time">
                      值班时间: {{ todayDuty.startTime }} - {{ todayDuty.endTime }}
                    </div>
                  </div>
                </div>
                <el-button
                  type="danger"
                  @click="callDuty"
                  style="width: 100%; margin-top: 12px"
                  icon="Phone"
                >
                  一键呼叫
                </el-button>
              </div>
            </el-card>

            <!-- 热门话题 -->
            <el-card class="hot-topics-card">
              <template #header>
                <div class="card-header">
                  <el-icon><TrendCharts /></el-icon>
                  <span>热门话题</span>
                </div>
              </template>

              <div class="hot-topics">
                <div
                  v-for="(topic, index) in hotTopics"
                  :key="topic.id"
                  class="topic-item"
                  @click="viewTopic(topic)"
                >
                  <div class="topic-rank" :class="`rank-${index + 1}`">{{ index + 1 }}</div>
                  <div class="topic-content">
                    <div class="topic-title">{{ topic.title }}</div>
                    <div class="topic-meta">
                      <span>{{ topic.discussCount }} 讨论</span>
                      <span>{{ topic.viewCount }} 浏览</span>
                    </div>
                  </div>
                  <div class="topic-trend" :class="topic.trend">
                    <el-icon v-if="topic.trend === 'up'"><TrendCharts /></el-icon>
                    <el-icon v-else-if="topic.trend === 'down'"><TrendCharts /></el-icon>
                    <el-icon v-else><Minus /></el-icon>
                  </div>
                </div>
              </div>
            </el-card>

            <!-- 政策解读 -->
            <el-card class="policy-card">
              <template #header>
                <div class="card-header">
                  <el-icon><Document /></el-icon>
                  <span>政策解读</span>
                </div>
              </template>

              <div class="policy-list">
                <div
                  v-for="policy in policyInterpretations"
                  :key="policy.id"
                  class="policy-item"
                  @click="viewPolicy(policy)"
                >
                  <div class="policy-icon">📋</div>
                  <div class="policy-content">
                    <div class="policy-title">{{ policy.title }}</div>
                    <div class="policy-desc">{{ policy.description }}</div>
                    <div class="policy-time">{{ formatTime(policy.publishTime) }}</div>
                  </div>
                </div>
              </div>
            </el-card>

            <!-- 意见反馈 -->
            <el-card class="feedback-card">
              <template #header>
                <div class="card-header">
                  <el-icon><ChatDotRound /></el-icon>
                  <span>意见反馈</span>
                </div>
              </template>

              <div class="feedback-section">
                <div class="feedback-stats">
                  <div class="stat-item">
                    <span class="stat-number">{{ feedbackStats.total }}</span>
                    <span class="stat-label">总反馈</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-number">{{ feedbackStats.replied }}</span>
                    <span class="stat-label">已回复</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-number">{{ feedbackStats.pending }}</span>
                    <span class="stat-label">待处理</span>
                  </div>
                </div>

                <el-button
                  type="primary"
                  @click="showFeedbackDialog"
                  :size="largeTextMode ? 'large' : 'default'"
                  style="width: 100%; margin-top: 16px"
                >
                  我要反馈
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </div>

    <!-- 生活服务区域 -->
    <div v-show="activeZone === 'life'" class="zone-content life-services-zone">
      <div class="life-services-container">
        <!-- 补贴查询区 -->
        <SubsidySection />

        <!-- 在线办事大厅 -->
        <ServiceHallSection />

        <!-- 附近好货 -->
        <NearbyProductsSection />

        <!-- 附近吃喝玩乐 -->
        <NearbyServicesSection />

        <!-- 附近招聘信息 -->
        <NearbyJobsSection />

        <!-- 交通出行 -->
        <TravelSection />

        <!-- 商品发布按钮 -->
        <MarketplacePublishSection />

        <!-- 政策公告区 -->
        <AnnouncementSection />
      </div>
    </div>

    <!-- 家庭档案区域 -->
    <div v-show="activeZone === 'family'" class="zone-content family-zone">
      <FamilySection />
    </div>

    <!-- 我的二维码对话框 -->
    <el-dialog
      v-model="qrcodeDialogVisible"
      title="我的二维码"
      width="450px"
      :close-on-click-modal="false"
      center
    >
      <div class="qrcode-content">
        <!-- 加载状态 -->
        <div v-if="qrCodeLoading" class="qrcode-loading">
          <el-icon class="is-loading" :size="40"><Loading /></el-icon>
          <p>正在生成二维码...</p>
        </div>

        <!-- 二维码显示 -->
        <div v-else-if="userQRCode" class="qrcode-display">
          <div class="qrcode-code">
            <img :src="userQRCode" alt="我的二维码" />
          </div>
          <div class="qrcode-info">
            <p class="user-name">
              <strong>{{ userInfo.name || '村民' }}</strong>
            </p>
            <p class="user-phone">{{ userInfo.phone || '' }}</p>
            <p class="user-village">{{ userInfo.village || '' }}</p>
            <p class="qrcode-tip">扫码查看我的家庭信息</p>
            <el-tag v-if="householdInfo" type="success" size="small">
              {{ householdInfo.memberCount || 0 }}人家庭
            </el-tag>
          </div>
        </div>

        <!-- 无家庭信息提示 -->
        <div v-else class="qrcode-empty">
          <el-empty description="未绑定家庭信息">
            <el-button type="primary" @click="qrcodeDialogVisible = false"> 我知道了 </el-button>
          </el-empty>
        </div>

        <!-- 操作按钮 -->
        <div v-if="userQRCode" class="qrcode-actions">
          <el-button type="primary" @click="downloadQRCode" :icon="Download">
            下载二维码
          </el-button>
          <el-button @click="shareQRCode" :icon="Share"> 分享户码 </el-button>
          <el-button @click="showQRCode" :icon="Refresh"> 刷新二维码 </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 政策计算器对话框 -->
    <el-dialog
      v-model="policyCalculatorVisible"
      title="政策计算器"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="policyForm" label-width="120px">
        <el-form-item label="补贴类型">
          <el-select v-model="policyForm.type" @change="calculatePolicy">
            <el-option label="耕地保护补贴" value="farmland" />
            <el-option label="农业保险补贴" value="insurance" />
            <el-option label="农机购置补贴" value="machinery" />
          </el-select>
        </el-form-item>
        <el-form-item label="耕地面积">
          <el-input-number
            v-model="policyForm.area"
            :min="0"
            :step="0.1"
            :precision="1"
            @change="calculatePolicy"
            style="width: 100%"
          />
          <span style="margin-left: 8px">亩</span>
        </el-form-item>
        <el-form-item label="家庭人口">
          <el-input-number
            v-model="policyForm.familyMembers"
            :min="1"
            :max="10"
            @change="calculatePolicy"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <div class="policy-result" v-if="policyResult.amount > 0">
        <el-alert type="success" :closable="false" show-icon>
          <template #title>
            预计补贴金额: <strong>{{ policyResult.amount }} 元</strong>
          </template>
          <div class="result-details">
            <p>计算依据: {{ policyResult.basis }}</p>
            <p>政策来源: {{ policyResult.source }}</p>
          </div>
        </el-alert>
      </div>
    </el-dialog>

    <!-- 语音助手对话框 -->
    <el-dialog
      v-model="voiceAssistantVisible"
      title="语音助手"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="voice-assistant">
        <div class="voice-status">
          <el-icon :size="48" :color="isListening ? '#67c23a' : '#909399'">
            <Microphone />
          </el-icon>
          <p>{{ isListening ? '正在听...' : '点击开始语音输入' }}</p>
        </div>

        <div class="voice-input-controls">
          <el-select
            v-model="voiceDialect"
            placeholder="选择方言"
            style="width: 100%; margin-bottom: 12px"
          >
            <el-option label="普通话" value="mandarin" />
            <el-option label="粤语" value="cantonese" />
            <el-option label="闽南语" value="hokkien" />
            <el-option label="客家话" value="hakka" />
            <el-option label="贵州话" value="guizhou" />
          </el-select>

          <el-button
            type="primary"
            :style="{ width: '100%' }"
            @click="toggleVoiceInput"
            :icon="isListening ? VideoPause : Microphone"
          >
            {{ isListening ? '停止录音' : '开始录音' }}
          </el-button>
        </div>

        <div v-if="voiceResult" class="voice-result">
          <div class="result-label">识别结果:</div>
          <el-input
            v-model="voiceResult"
            type="textarea"
            :rows="3"
            placeholder="语音识别结果将显示在这里"
          />
          <div class="result-actions" style="margin-top: 12px">
            <el-button type="primary" @click="searchByVoice">搜索</el-button>
            <el-button @click="clearVoiceResult">清除</el-button>
          </div>
        </div>

        <div class="voice-commands">
          <div class="commands-label">常用语音命令:</div>
          <div class="command-list">
            <el-tag
              v-for="cmd in voiceCommands"
              :key="cmd"
              @click="speakCommand(cmd)"
              style="margin: 4px; cursor: pointer"
            >
              {{ cmd }}
            </el-tag>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 积分详情对话框 -->
    <el-dialog v-model="pointsDetailVisible" title="积分详情" width="700px">
      <div class="points-detail">
        <el-tabs v-model="pointsTab">
          <el-tab-pane label="积分明细" name="history">
            <el-timeline>
              <el-timeline-item
                v-for="item in pointsHistory"
                :key="item.id"
                :timestamp="item.time"
                :type="item.type"
              >
                {{ item.description }} +item.points }}积分
              </el-timeline-item>
            </el-timeline>
          </el-tab-pane>
          <el-tab-pane label="积分商城" name="mall">
            <div class="mall-items">
              <div v-for="item in mallItems" :key="item.id" class="mall-item">
                <div class="item-image">{{ item.icon }}</div>
                <div class="item-info">
                  <div class="item-name">{{ item.name }}</div>
                  <div class="item-price">{{ item.points }} 积分</div>
                </div>
                <el-button size="small" @click="exchangeItem(item)">兑换</el-button>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="currentItem?.title"
      :width="largeTextMode ? '90%' : '80%'"
      :close-on-click-modal="false"
      custom-class="affair-detail-dialog"
    >
      <div class="detail-content" v-if="currentItem">
        <div class="detail-header">
          <div class="detail-meta">
            <el-tag :type="getCategoryType(currentItem.category)">
              {{ currentItem.category }}
            </el-tag>
            <span class="publish-info"> 发布者：{{ currentItem.publisher }} </span>
            <span class="publish-time">
              {{ formatTime(currentItem.publishTime) }}
            </span>
          </div>
          <div class="detail-stats">
            <span class="stat-item">
              <el-icon><View /></el-icon> {{ currentItem.readCount }}
            </span>
            <span class="stat-item">
              <el-icon><StarFilled /></el-icon> {{ currentItem.likeCount }}
            </span>
          </div>
        </div>

        <div class="detail-body" v-html="currentItem.content"></div>

        <!-- 附件列表 -->
        <div class="detail-attachments" v-if="currentItem.attachments?.length > 0">
          <h4>附件下载</h4>
          <div class="attachment-list">
            <div
              v-for="attachment in currentItem.attachments"
              :key="attachment.id"
              class="attachment-item"
              @click="downloadAttachment(attachment)"
            >
              <el-icon><Document /></el-icon>
              <span class="attachment-name">{{ attachment.name }}</span>
              <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
              <el-button type="text" size="small">下载</el-button>
            </div>
          </div>
        </div>

        <!-- 评论区 -->
        <div class="detail-comments">
          <h4>评论区 ({{ currentItem.comments?.length || 0 }})</h4>

          <div class="comment-input">
            <el-input
              v-model="newComment"
              type="textarea"
              :rows="3"
              placeholder="发表您的看法..."
              :size="largeTextMode ? 'large' : 'default'"
            />
            <el-button
              type="primary"
              @click="submitComment"
              :size="largeTextMode ? 'large' : 'default'"
              style="margin-top: 12px"
            >
              发表评论
            </el-button>
          </div>

          <div class="comment-list">
            <div v-for="comment in currentItem.comments" :key="comment.id" class="comment-item">
              <el-avatar :size="32" :src="comment.avatar">
                {{ comment.author?.charAt(0) }}
              </el-avatar>
              <div class="comment-content">
                <div class="comment-header">
                  <span class="comment-author">{{ comment.author }}</span>
                  <span class="comment-time">{{ formatTime(comment.time) }}</span>
                </div>
                <div class="comment-text">{{ comment.content }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 意见反馈对话框 -->
    <el-dialog
      v-model="feedbackDialogVisible"
      title="意见反馈"
      :width="largeTextMode ? '800px' : '600px'"
      :close-on-click-modal="false"
    >
      <el-form
        :model="feedbackForm"
        :rules="feedbackRules"
        ref="feedbackFormRef"
        label-width="80px"
      >
        <el-form-item label="反馈类型" prop="type">
          <el-select v-model="feedbackForm.type" :size="largeTextMode ? 'large' : 'default'">
            <el-option label="建议" value="suggestion" />
            <el-option label="投诉" value="complaint" />
            <el-option label="咨询" value="inquiry" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>

        <el-form-item label="标题" prop="title">
          <el-input
            v-model="feedbackForm.title"
            placeholder="请输入反馈标题"
            :size="largeTextMode ? 'large' : 'default'"
          />
        </el-form-item>

        <el-form-item label="内容" prop="content">
          <el-input
            v-model="feedbackForm.content"
            type="textarea"
            :rows="6"
            placeholder="请详细描述您的反馈内容..."
            :size="largeTextMode ? 'large' : 'default'"
          />
        </el-form-item>

        <el-form-item label="联系方式">
          <el-input
            v-model="feedbackForm.contact"
            placeholder="手机号或邮箱（可选）"
            :size="largeTextMode ? 'large' : 'default'"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="feedbackDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFeedback" :loading="submitting">
          提交反馈
        </el-button>
      </template>
    </el-dialog>

    <!-- 设置对话框 -->
    <el-dialog
      v-model="settingsDialogVisible"
      title="设置"
      :width="largeTextMode ? '800px' : '600px'"
    >
      <div class="settings-content">
        <div class="setting-item">
          <div class="setting-info">
            <h4>大字模式</h4>
            <p>适合老年用户，放大字体和按钮</p>
          </div>
          <el-switch
            v-model="largeTextMode"
            @change="toggleLargeTextMode"
            :size="largeTextMode ? 'large' : 'default'"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h4>语音播报</h4>
            <p>自动朗读村务信息内容</p>
          </div>
          <el-switch v-model="autoRead" :size="largeTextMode ? 'large' : 'default'" />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h4>消息推送</h4>
            <p>接收新村务信息推送通知</p>
          </div>
          <el-switch v-model="notificationEnabled" :size="largeTextMode ? 'large' : 'default'" />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h4>仅显示WiFi下图片</h4>
            <p>节省流量，WiFi环境下才显示图片</p>
          </div>
          <el-switch v-model="wifiOnly" :size="largeTextMode ? 'large' : 'default'" />
        </div>
      </div>

      <template #footer>
        <el-button @click="settingsDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import householdQRApi from '@/api/householdQR';
import {
  Search,
  Setting,
  Refresh,
  Warning,
  Paperclip,
  StarFilled,
  Share,
  TrendCharts,
  Document,
  ChatDotRound,
  View,
  Minus,
  Location,
  Clock,
  Phone,
  User,
  Management,
  Microphone,
  VideoPause,
  ArrowRight,
  Download,
  ShoppingBag,
  Loading,
} from '@element-plus/icons-vue';

// 异步加载生活服务组件
const SubsidySection = defineAsyncComponent(
  () => import('@/components/resident/SubsidySection.vue')
);
const ServiceHallSection = defineAsyncComponent(
  () => import('@/components/resident/ServiceHallSection.vue')
);
const NearbyProductsSection = defineAsyncComponent(
  () => import('@/components/resident/NearbyProductsSection.vue')
);
const NearbyServicesSection = defineAsyncComponent(
  () => import('@/components/resident/NearbyServicesSection.vue')
);
const NearbyJobsSection = defineAsyncComponent(
  () => import('@/components/resident/NearbyJobsSection.vue')
);
const TravelSection = defineAsyncComponent(() => import('@/components/resident/TravelSection.vue'));
const MarketplacePublishSection = defineAsyncComponent(
  () => import('@/components/resident/MarketplacePublishSection.vue')
);
const AnnouncementSection = defineAsyncComponent(
  () => import('@/components/resident/AnnouncementSection.vue')
);
const FamilySection = defineAsyncComponent(() => import('@/components/resident/FamilySection.vue'));

const router = useRouter();
const userStore = useUserStore();

// 用户信息 - 从userStore获取
const userInfo = computed(() => {
  const user = userStore.userInfo || {};
  return {
    name: user.profile?.firstName || user.username || '村民',
    phone: user.profile?.phone || user.phone || '未设置',
    village: user.villageName || '未设置村庄',
    role: user.role || 'resident',
  };
});

// 村庄信息 - 从userStore获取
const villageInfo = computed(() => {
  const user = userStore.userInfo || {};
  return {
    name: user.villageName || '未设置村庄',
    population: 1500,
    households: 350,
    area: 8.5,
  };
});

// 用户积分
const userPoints = reactive({
  total: 1250,
  rank: 15,
  progress: 65,
  nextLevelPoints: 250,
});

// 今日值班
const todayDuty = reactive({
  person: {
    name: '李明',
    role: '村主任',
    phone: '138****5678',
  },
  startTime: '08:00',
  endTime: '18:00',
});

// 响应式数据
const activeZone = ref('village'); // 当前激活的功能区：village/life/family
const largeTextMode = ref(false);
const autoRead = ref(false);
const notificationEnabled = ref(true);
const wifiOnly = ref(false);
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(true);
const detailDialogVisible = ref(false);
const feedbackDialogVisible = ref(false);
const settingsDialogVisible = ref(false);
const qrcodeDialogVisible = ref(false);
const policyCalculatorVisible = ref(false);
const voiceAssistantVisible = ref(false);
const pointsDetailVisible = ref(false);
const submitting = ref(false);
const isListening = ref(false);
const voiceDialect = ref('mandarin');

// 搜索和筛选
const searchQuery = ref('');
const timeFilter = ref('');
const activeCategory = ref('all');

// 当前查看的项目
const currentItem = ref(null);
const newComment = ref('');

// 表单引用
const feedbackFormRef = ref(null);

// 二维码
const userQRCode = ref('');
const qrCodeLoading = ref(false);
const householdInfo = ref(null);
const pointsTab = ref('history');

// 语音识别结果
const voiceResult = ref('');

// 政策计算表单
const policyForm = reactive({
  type: 'farmland',
  area: 5,
  familyMembers: 4,
});

// 政策计算结果
const policyResult = reactive({
  amount: 0,
  basis: '',
  source: '',
});

// 反馈表单
const feedbackForm = reactive({
  type: '',
  title: '',
  content: '',
  contact: '',
});

const feedbackRules = {
  type: [{ required: true, message: '请选择反馈类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入反馈标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入反馈内容', trigger: 'blur' }],
};

// 积分历史
const pointsHistory = reactive([
  {
    id: '1',
    description: '参与村务投票 +50',
    points: 50,
    type: 'primary',
    time: '2024-01-15 10:30',
  },
  {
    id: '2',
    description: '提交意见建议 +20',
    points: 20,
    type: 'success',
    time: '2024-01-14 15:20',
  },
  {
    id: '3',
    description: '参与环境整治 +30',
    points: 30,
    type: 'warning',
    time: '2024-01-13 09:15',
  },
]);

// 商城物品
const mallItems = reactive([
  { id: '1', name: '洗衣液', icon: '🧴', points: 500 },
  { id: '2', name: '大米10斤', icon: '🍚', points: 800 },
  { id: '3', name: '食用油5L', icon: '🫗', points: 600 },
  { id: '4', name: '纸巾提装', icon: '🧻', points: 300 },
]);

// 语音命令
const voiceCommands = ['查看财务公开', '我要反馈意见', '查看我的积分', '今日谁值班'];

// 快捷功能入口
const quickAccessItems = reactive([
  {
    id: 'qrcode',
    title: '我的二维码',
    description: '一户一码，信息数字化',
    icon: '📱',
    route: '/qrcode',
  },
  {
    id: 'policy',
    title: '政策计算器',
    description: '补贴金额一键计算',
    icon: '🧮',
    action: 'policy',
  },
  { id: 'map', title: '村情地图', description: '查看村庄地图', icon: '🗺️', route: '/map' },
  { id: 'duty', title: '今日值班', description: '一键呼叫值班人员', icon: '☎️', action: 'duty' },
  { id: 'mall', title: '积分商城', description: '积分兑换商品', icon: '🎁', route: '/mall' },
  { id: 'services', title: '在线办事', description: '证件办理等', icon: '📝', route: '/services' },
]);

// 信息分类
const categories = reactive([
  { key: 'all', label: '全部', icon: '📋', count: 156 },
  { key: 'notice', label: '通知公告', icon: '📢', count: 23 },
  { key: 'policy', label: '政策宣传', icon: '📜', count: 18 },
  { key: 'activity', label: '村务活动', icon: '🎉', count: 15 },
  { key: 'finance', label: '财务公开', icon: '💰', count: 28 },
  { key: 'project', label: '项目进展', icon: '🏗️', count: 12 },
  { key: 'meeting', label: '会议纪要', icon: '👥', count: 35 },
  { key: 'emergency', label: '应急信息', icon: '🚨', count: 8 },
]);

// 重要通知
const importantNotices = reactive([
  {
    id: '1',
    title: '关于加强新冠疫情防控的紧急通知',
    summary: '根据上级部门要求，即日起加强村内疫情防控措施，请村民配合做好相关工作...',
    category: '应急信息',
    publisher: '村委会',
    publishTime: '2024-01-16 09:00',
    readCount: 1256,
    content: '详细内容...',
  },
]);

// 村务信息列表
const affairsList = reactive([
  {
    id: '1',
    title: '2024年第一季度财务收支公示',
    summary: '本季度村集体经济收入总计56.8万元，支出42.3万元，主要用于基础设施建设...',
    category: '财务公开',
    publisher: '财务科',
    publishTime: '2024-01-15 14:30',
    readCount: 856,
    likeCount: 45,
    attachments: [{ id: '1', name: '2024年Q1财务报表.pdf', size: 2457600 }],
    comments: [
      {
        id: '1',
        author: '张三',
        content: '公开透明，做得很好！',
        time: '2024-01-15 15:00',
        avatar: '',
      },
    ],
    content: '<p>详细财务内容...</p>',
  },
  {
    id: '2',
    title: '村内道路硬化工程进展通报',
    summary: '目前主要道路硬化工程已完成80%，预计本月底全部完工，请村民注意出行安全...',
    category: '项目进展',
    publisher: '项目办',
    publishTime: '2024-01-14 10:15',
    readCount: 623,
    likeCount: 28,
    attachments: [],
    comments: [],
    content: '<p>工程详细进展...</p>',
  },
  {
    id: '3',
    title: '关于开展春节期间文化活动的通知',
    summary: '为丰富村民文化生活，村委会决定在春节期间举办系列文化活动，欢迎村民积极参与...',
    category: '村务活动',
    publisher: '文化站',
    publishTime: '2024-01-13 16:45',
    readCount: 445,
    likeCount: 67,
    attachments: [{ id: '2', name: '春节活动安排.docx', size: 532480 }],
    comments: [],
    content: '<p>活动详细安排...</p>',
  },
]);

// 热门话题
const hotTopics = reactive([
  {
    id: '1',
    title: '村口道路建设何时完工？',
    discussCount: 23,
    viewCount: 1456,
    trend: 'up',
  },
  {
    id: '2',
    title: '农村医保报销比例提高',
    discussCount: 18,
    viewCount: 987,
    trend: 'up',
  },
  {
    id: '3',
    title: '春季农作物种植补贴政策',
    discussCount: 15,
    viewCount: 765,
    trend: 'stable',
  },
]);

// 政策解读
const policyInterpretations = reactive([
  {
    id: '1',
    title: '2024年农业补贴政策解读',
    description: '详解各类农业补贴的申请条件和流程',
    publishTime: '2024-01-12 09:00',
  },
  {
    id: '2',
    title: '农村宅基地政策新变化',
    description: '最新宅基地管理政策要点说明',
    publishTime: '2024-01-10 14:30',
  },
]);

// 反馈统计
const feedbackStats = reactive({
  total: 156,
  replied: 128,
  pending: 28,
});

// 计算属性
const filteredAffairs = computed(() => {
  let filtered = affairsList;

  // 按分类筛选
  if (activeCategory.value !== 'all') {
    filtered = filtered.filter(item => item.category === getCategoryLabel(activeCategory.value));
  }

  // 按搜索关键词筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      item => item.title.toLowerCase().includes(query) || item.summary.toLowerCase().includes(query)
    );
  }

  // 按时间筛选
  if (timeFilter.value) {
    const now = new Date();
    filtered = filtered.filter(item => {
      const itemTime = new Date(item.publishTime);
      switch (timeFilter.value) {
        case 'today':
          return itemTime.toDateString() === now.toDateString();
        case 'week':
          return now - itemTime <= 7 * 24 * 60 * 60 * 1000;
        case 'month':
          return (
            itemTime.getMonth() === now.getMonth() && itemTime.getFullYear() === now.getFullYear()
          );
        case 'quarter':
          return now - itemTime <= 3 * 30 * 24 * 60 * 60 * 1000;
        default:
          return true;
      }
    });
  }

  return filtered;
});

// 方法
const handleZoneChange = zoneName => {
  activeZone.value = zoneName;
  console.log('切换到功能区:', zoneName);
};

const getUserRoleType = () => {
  return 'success';
};

const getRoleLabel = () => {
  return '村民';
};

const getCurrentCategoryTitle = () => {
  const category = categories.find(cat => cat.key === activeCategory.value);
  return category ? category.label : '全部信息';
};

const getCategoryLabel = key => {
  const category = categories.find(cat => cat.key === key);
  return category ? category.label : key;
};

const getCategoryType = category => {
  const types = {
    通知公告: 'primary',
    政策宣传: 'success',
    村务活动: 'warning',
    财务公开: 'danger',
    项目进展: 'info',
    会议纪要: '',
    应急信息: 'danger',
  };
  return types[category] || '';
};

const setActiveCategory = key => {
  activeCategory.value = key;
};

const handleQuickAccess = access => {
  if (access.route) {
    router.push(access.route);
  } else if (access.action) {
    handleQuickAction(access.action);
  } else {
    ElMessage.info(`打开功能: ${access.title}`);
  }
};

const handleQuickAction = action => {
  switch (action) {
    case 'policy':
      showPolicyCalculator();
      break;
    case 'duty':
      callDuty();
      break;
    default:
      ElMessage.info(`打开功能: ${action}`);
  }
};

const showQRCode = async () => {
  qrcodeDialogVisible.value = true;
  qrCodeLoading.value = true;

  try {
    // 获取用户的家庭ID
    let householdId = userStore.userInfo?.householdId;

    // 如果没有家庭ID，尝试从后端刷新用户信息
    if (!householdId) {
      console.log('⚠️ 用户信息中没有householdId,尝试刷新...');
      ElMessage.info('正在获取最新用户信息...');

      try {
        const updatedUser = await userStore.refreshUserInfo();
        householdId = updatedUser?.householdId;

        console.log('✅ 刷新后的用户信息:', updatedUser);
        console.log('✅ householdId:', householdId);
      } catch (refreshError) {
        console.error('❌ 刷新用户信息失败:', refreshError);
      }

      // 如果刷新后还是没有家庭ID，显示提示
      if (!householdId) {
        ElMessage.warning('您还未绑定家庭信息，请联系村委会');
        userQRCode.value = '';
        householdInfo.value = null;
        qrCodeLoading.value = false;
        return;
      }
    }

    console.log('🚀 开始生成二维码，householdId:', householdId);

    // 调用API生成二维码
    const response = await householdQRApi.generateQR(householdId, { includeImage: true });

    if (response.success) {
      userQRCode.value = response.data.qrImageUrl;
      householdInfo.value = response.data.household;
      ElMessage.success('二维码生成成功');
    } else {
      throw new Error(response.message || '生成二维码失败');
    }
  } catch (error) {
    console.error('生成二维码失败:', error);
    // 使用默认占位图
    userQRCode.value =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9aw==';
    householdInfo.value = null;
    ElMessage.error('生成二维码失败，请稍后重试');
  } finally {
    qrCodeLoading.value = false;
  }
};

const downloadQRCode = () => {
  if (!userQRCode.value) {
    ElMessage.warning('请先生成二维码');
    return;
  }

  try {
    // 创建下载链接
    const link = document.createElement('a');
    link.href = userQRCode.value;
    link.download = `我的二维码_${userInfo.value.name || '村民'}.png`;
    link.click();
    ElMessage.success('二维码已下载');
  } catch (error) {
    console.error('下载失败:', error);
    ElMessage.error('下载失败，请稍后重试');
  }
};

const shareQRCode = async () => {
  if (!householdInfo.value) {
    ElMessage.warning('请先生成二维码');
    return;
  }

  try {
    // 复制户码到剪贴板
    const householdId = userStore.userInfo?.householdId;
    if (householdId) {
      await navigator.clipboard.writeText(householdId);
      ElMessage.success('户码已复制到剪贴板');
    } else {
      ElMessage.warning('户码不存在');
    }
  } catch (error) {
    console.error('分享失败:', error);
    ElMessage.error('分享失败，请稍后重试');
  }
};

const showPolicyCalculator = () => {
  policyCalculatorVisible.value = true;
  calculatePolicy();
};

const calculatePolicy = () => {
  const { type, area, familyMembers } = policyForm;

  // 简单的计算逻辑
  let rate = 0;
  let basis = '';
  let source = '';

  switch (type) {
    case 'farmland':
      rate = 120; // 每亩120元
      basis = `${area}亩 × ${rate}元/亩`;
      source = '耕地地力保护补贴政策';
      policyResult.amount = Math.floor(area * rate);
      break;
    case 'insurance':
      rate = 30; // 每人30元
      basis = `${familyMembers}人 × ${rate}元/人`;
      source = '农业保险补贴政策';
      policyResult.amount = Math.floor(familyMembers * rate);
      break;
    case 'machinery':
      rate = 500;
      basis = '农机购置补贴30%';
      source = '农机购置补贴政策';
      policyResult.amount = rate;
      break;
  }
};

const showVoiceAssistant = () => {
  voiceAssistantVisible.value = true;
};

const toggleVoiceInput = async () => {
  if (!('webkitSpeechRecognition' in window)) {
    ElMessage.error('您的浏览器不支持语音识别');
    return;
  }

  if (isListening.value) {
    stopVoiceRecognition();
  } else {
    startVoiceRecognition();
  }
};

const startVoiceRecognition = () => {
  const recognition = new webkitSpeechRecognition();
  recognition.lang = voiceDialect.value === 'mandarin' ? 'zh-CN' : 'yue-Hant-HK';

  recognition.onresult = event => {
    voiceResult.value = event.results[0][0].transcript;
    stopVoiceRecognition();
  };

  recognition.onerror = () => {
    ElMessage.error('语音识别失败，请重试');
    stopVoiceRecognition();
  };

  recognition.onend = () => {
    isListening.value = false;
  };

  recognition.start();
  isListening.value = true;
};

const stopVoiceRecognition = () => {
  // 停止录音的逻辑会在onend中处理
};

const speakCommand = command => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(command);
    utterance.lang = voiceDialect.value === 'mandarin' ? 'zh-CN' : 'yue-Hant-HK';
    speechSynthesis.speak(utterance);
  }
};

const searchByVoice = () => {
  if (voiceResult.value) {
    searchQuery.value = voiceResult.value;
    handleSearch();
  }
};

const clearVoiceResult = () => {
  voiceResult.value = '';
};

const viewVillageMap = () => {
  router.push('/village/map');
};

const callDuty = () => {
  ElMessageBox.confirm(
    `确定要呼叫值班人员 ${todayDuty.person.name} 吗？\n电话: ${todayDuty.person.phone}`,
    '呼叫确认',
    {
      confirmButtonText: '确定呼叫',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      ElMessage.success('正在呼叫...');
      // 实际项目中可以集成tel:链接
    })
    .catch(() => {});
};

const showPointsDetail = () => {
  pointsDetailVisible.value = true;
};

const showPointsMall = () => {
  pointsDetailVisible.value = true;
  pointsTab.value = 'mall';
};

const exchangeItem = item => {
  if (userPoints.total >= item.points) {
    ElMessageBox.confirm(`确定要兑换 ${item.name} 吗？需要 ${item.points} 积分`, '兑换确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    })
      .then(() => {
        userPoints.total -= item.points;
        ElMessage.success(`成功兑换 ${item.name}！`);
      })
      .catch(() => {});
  } else {
    ElMessage.warning('积分不足');
  }
};

const handleSearch = () => {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
  }, 500);
};

const handleTimeFilter = () => {
  handleSearch();
};

const refreshContent = () => {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
    ElMessage.success('内容已刷新');
  }, 1000);
};

const loadMore = () => {
  loadingMore.value = true;
  setTimeout(() => {
    loadingMore.value = false;
    hasMore.value = false;
  }, 1000);
};

const viewDetail = item => {
  currentItem.value = item;
  detailDialogVisible.value = true;

  // 增加阅读计数
  item.readCount++;

  // 自动朗读
  if (autoRead.value) {
    startTextToSpeech(item.title + '。' + item.summary);
  }
};

const likeItem = item => {
  item.likeCount++;
  ElMessage.success('点赞成功');
  // 增加积分
  userPoints.total += 5;
};

const shareItem = item => {
  ElMessage.success('分享链接已复制到剪贴板');
};

const viewTopic = topic => {
  ElMessage.info(`查看话题: ${topic.title}`);
};

const viewPolicy = policy => {
  ElMessage.info(`查看政策: ${policy.title}`);
};

const submitComment = () => {
  if (!newComment.value.trim()) {
    ElMessage.warning('请输入评论内容');
    return;
  }

  const comment = {
    id: Date.now().toString(),
    author: userStore.userInfo?.name || '村民',
    content: newComment.value,
    time: new Date().toISOString(),
    avatar: '',
  };

  if (!currentItem.value.comments) {
    currentItem.value.comments = [];
  }
  currentItem.value.comments.push(comment);
  newComment.value = '';

  // 评论获得积分
  userPoints.total += 10;
  ElMessage.success('评论发表成功，获得10积分');
};

const downloadAttachment = attachment => {
  ElMessage.info(`下载附件: ${attachment.name}`);
};

const showFeedbackDialog = () => {
  feedbackDialogVisible.value = true;
};

const submitFeedback = async () => {
  if (!feedbackFormRef.value) return;

  try {
    await feedbackFormRef.value.validate();

    submitting.value = true;

    // 模拟提交
    setTimeout(() => {
      submitting.value = false;
      feedbackDialogVisible.value = false;
      ElMessage.success('反馈提交成功，我们会尽快处理');

      // 反馈获得积分
      userPoints.total += 20;
      feedbackStats.total++;
      feedbackStats.replied++;

      // 重置表单
      Object.assign(feedbackForm, {
        type: '',
        title: '',
        content: '',
        contact: '',
      });
    }, 1500);
  } catch (error) {
    console.error('表单验证失败:', error);
  }
};

const subscribeNotifications = () => {
  ElMessage.success('已订阅村务信息通知');
};

const showSettings = () => {
  settingsDialogVisible.value = true;
};

const toggleLargeTextMode = value => {
  if (value) {
    document.body.classList.add('large-text-mode');
    ElMessage.success('已开启大字模式');
  } else {
    document.body.classList.remove('large-text-mode');
    ElMessage.info('已关闭大字模式');
  }
};

const startTextToSpeech = text => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    speechSynthesis.speak(utterance);
  }
};

const formatTime = timeString => {
  const date = new Date(timeString);
  const now = new Date();
  const diff = now - date;

  if (diff < 60 * 1000) {
    return '刚刚';
  } else if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))}分钟前`;
  } else if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
  } else if (diff < 7 * 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`;
  } else {
    return date.toLocaleDateString();
  }
};

const formatFileSize = bytes => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

onMounted(async () => {
  console.log('村务公开页面加载完成');

  // 获取村庄信息
  await fetchVillageInfo();
});

/**
 * 获取村庄信息 - 从数据库现有村庄映射
 */
const fetchVillageInfo = async () => {
  try {
    const villageId = userStore.userInfo?.villageId;
    if (!villageId) {
      console.log('[村庄信息] 未找到villageId');
      return;
    }

    const villageMap = {
      '695d2f0a1993c080b9fa520b': '贵州省贞丰县鲁贡镇么扒村',
      '695da4e954f6af867bebc416': '贵州省贞丰县鲁贡镇弄洋村',
      '695da4e954f6af867bebc417': '贵州省贞丰县鲁贡镇林桃村',
      '695da4e954f6af867bebc418': '贵州省贞丰县鲁贡镇者央村',
      '69620ba44261831e215211b3': '贵州省贞丰县鲁贡镇么扒村',
      '69620ba44261831e215211be': '贵州省贞丰县鲁贡镇弄洋村',
      '69620ba44261831e215211c1': '贵州省贞丰县鲁贡镇者央村',
      '69620ba44261831e215211c4': '贵州省贞丰县鲁贡镇林桃村',
      '69620ba44261831e215211c7': '贵州省望谟县乐元镇乐元村',
      '69620c30a56e5cb7d408a2fe': '贵州省兴义市顶效镇绿化村',
      '69620c30a56e5cb7d408a303': '贵州省兴义市顶效镇绿荫村',
      '69620c30a56e5cb7d408a307': '贵州省兴义市顶效镇查白村',
      '69620c30a56e5cb7d408a30a': '贵州省兴义市顶效镇楼纳村',
      '69620d263aae7459331c09fe': '贵州省贞丰县沙坪镇者索村',
      '69620d263aae7459331c0a01': '贵州省贞丰县沙坪镇板昌村',
      '69620d263aae7459331c0a04': '贵州省贞丰县沙坪镇这年村',
      '69620d263aae7459331c0a07': '贵州省贞丰县沙坪镇者砍村',
      '69620e87edd9c22fcd029c81': '贵州省贞丰县白层镇兴龙村',
      '69620e87edd9c22fcd029c84': '贵州省贞丰县白层镇坝桥村',
      '69620e87edd9c22fcd029c87': '贵州省贞丰县白层镇坡们村',
      '69620e87edd9c22fcd029c8a': '贵州省贞丰县白层镇纳杠村',
      '69620e87edd9c22fcd029c8d': '贵州省望谟县乐元镇里好村',
      '69620e87edd9c22fcd029c90': '贵州省望谟县乐元镇纳管村',
      '69620e87edd9c22fcd029c93': '贵州省望谟县乐元镇董万村',
    };

    const villageName = villageMap[villageId];
    if (villageName) {
      // 更新用户信息中的村庄名称
      const updatedUserInfo = {
        ...userStore.userInfo,
        villageName: villageName,
      };
      userStore.setUserInfo(updatedUserInfo);
      console.log('[村庄信息] 已更新:', villageName);
    } else {
      console.log('[村庄信息] 未找到villageId对应的村庄名称:', villageId);
    }
  } catch (error) {
    console.error('[村庄信息] 获取失败:', error);
  }
};
</script>

<style lang="scss" scoped>
.village-affairs {
  min-height: 100vh;
  background-color: #f5f7fa;

  &.large-text-mode {
    font-size: 18px;

    .el-button {
      font-size: 16px;
      padding: 12px 24px;
    }

    .nav-item {
      padding: 16px 12px;

      .nav-label {
        font-size: 16px;
      }
    }

    .affair-item {
      padding: 20px;

      .title-text {
        font-size: 18px;
      }

      .item-summary {
        font-size: 16px;
      }
    }
  }
}

.page-header {
  position: relative;
  margin-bottom: 24px;

  .header-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: linear-gradient(135deg, #4a90e2 0%, #7b68ee 100%);
    border-radius: 0 0 20px 20px;
  }

  .header-content {
    position: relative;
    z-index: 2;
    padding: 40px 24px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;

    @media (max-width: 768px) {
      flex-direction: column;
      gap: 16px;
      text-align: center;
    }
  }

  .header-info {
    .page-title {
      margin: 0 0 8px 0;
      color: white;
      font-size: 32px;
      font-weight: bold;

      @media (max-width: 768px) {
        font-size: 24px;
      }
    }

    .page-description {
      margin: 0 0 12px 0;
      color: rgba(255, 255, 255, 0.9);
      font-size: 16px;
    }

    .user-greeting {
      display: flex;
      align-items: center;
      gap: 8px;
      color: rgba(255, 255, 255, 0.9);

      span {
        font-size: 14px;
      }
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;

    @media (max-width: 768px) {
      justify-content: center;
    }
  }
}

.quick-access {
  background: white;
  border-radius: 12px;
  margin: 0 24px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .access-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    padding: 20px;
  }

  .access-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: #e8f4fd;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(74, 144, 226, 0.2);
    }

    .access-icon {
      font-size: 32px;
    }

    .access-info {
      flex: 1;

      .access-title {
        font-weight: 500;
        color: #333;
        font-size: 16px;
        margin-bottom: 4px;
      }

      .access-desc {
        font-size: 13px;
        color: #666;
      }
    }

    .access-arrow {
      color: #4a90e2;
    }
  }
}

.points-section {
  margin: 0 24px 24px;

  .points-card {
    .points-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .points-info {
      .points-label {
        font-size: 14px;
        color: #666;
        margin-bottom: 4px;
      }

      .points-value {
        font-size: 32px;
        font-weight: bold;
        color: #f39c12;
      }

      .points-rank {
        font-size: 14px;
        color: #666;
      }
    }

    .points-actions {
      display: flex;
      gap: 8px;
    }

    .points-progress {
      .progress-label {
        font-size: 13px;
        color: #666;
        margin-bottom: 8px;
      }
    }
  }
}

.category-nav {
  background: white;
  border-radius: 12px;
  margin: 0 24px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .nav-container {
    display: flex;
    padding: 16px 24px;
    gap: 8px;
    overflow-x: auto;
  }

  .nav-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 80px;
    background: transparent;
    border: 2px solid transparent;

    &:hover {
      background: #f8f9fa;
    }

    &.active {
      background: #e8f4fd;
      border-color: #4a90e2;
      color: #4a90e2;
    }

    .nav-icon {
      font-size: 24px;
    }

    .nav-label {
      font-size: 14px;
      font-weight: 500;
      text-align: center;
      line-height: 1.2;
    }

    .nav-badge {
      position: absolute;
      top: 8px;
      right: 8px;
    }
  }
}

.main-content {
  padding: 0 24px 24px;
}

.search-card {
  margin-bottom: 16px;

  .search-container {
    display: flex;
    gap: 12px;
    align-items: center;

    .el-input {
      flex: 1;
    }

    .el-select {
      width: 120px;
    }
  }
}

.content-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .card-title {
      font-weight: bold;
      font-size: 16px;
    }
  }
}

.affairs-list {
  .affair-item {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: #f8f9fa;
    }

    &.important {
      background: #fef2f2;
      border-left: 4px solid #f56c6c;
    }

    &:last-child {
      border-bottom: none;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;

      .item-title {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;

        .title-text {
          font-weight: 500;
          color: #333;
          font-size: 16px;
          line-height: 1.4;
        }

        .important-icon {
          color: #f56c6c;
        }
      }

      .item-time {
        color: #999;
        font-size: 14px;
        white-space: nowrap;
      }
    }

    .item-summary {
      color: #666;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 12px;
    }

    .item-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .item-meta {
        display: flex;
        gap: 16px;

        .meta-item {
          color: #999;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }

      .item-actions {
        display: flex;
        gap: 8px;
      }
    }
  }
}

.load-more {
  text-align: center;
  padding: 20px 0;
}

.village-info-card,
.duty-card,
.hot-topics-card,
.policy-card,
.feedback-card {
  margin-bottom: 16px;

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
  }
}

.village-info {
  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px dashed #e0e0e0;

    &:last-child {
      border-bottom: none;
    }

    .info-label {
      color: #666;
      font-size: 14px;
    }

    .info-value {
      font-weight: 500;
      color: #333;
    }
  }
}

.duty-info {
  .duty-person {
    display: flex;
    gap: 12px;
    padding: 12px 0;

    .person-avatar {
      flex-shrink: 0;
    }

    .person-details {
      flex: 1;

      .person-name {
        font-weight: 500;
        color: #333;
        margin-bottom: 4px;
      }

      .person-role {
        font-size: 13px;
        color: #666;
        margin-bottom: 4px;
      }

      .duty-time {
        font-size: 12px;
        color: #999;
      }
    }
  }
}

.hot-topics {
  .topic-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: #f8f9fa;
    }

    &:last-child {
      border-bottom: none;
    }

    .topic-rank {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      color: white;

      &.rank-1 {
        background: #f56c6c;
      }

      &.rank-2 {
        background: #e6a23c;
      }

      &.rank-3 {
        background: #f39c12;
      }

      &:not(.rank-1):not(.rank-2):not(.rank-3) {
        background: #909399;
      }
    }

    .topic-content {
      flex: 1;

      .topic-title {
        font-size: 14px;
        color: #333;
        margin-bottom: 4px;
      }

      .topic-meta {
        font-size: 12px;
        color: #999;

        span {
          margin-right: 12px;
        }
      }
    }

    .topic-trend {
      &.up {
        color: #67c23a;
      }

      &.down {
        color: #f56c6c;
        transform: rotate(180deg);
      }

      &.stable {
        color: #909399;
      }
    }
  }
}

.policy-list {
  .policy-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: #f8f9fa;
    }

    &:last-child {
      border-bottom: none;
    }

    .policy-icon {
      font-size: 20px;
      margin-top: 2px;
    }

    .policy-content {
      flex: 1;

      .policy-title {
        font-size: 14px;
        color: #333;
        margin-bottom: 4px;
        font-weight: 500;
      }

      .policy-desc {
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
        line-height: 1.4;
      }

      .policy-time {
        font-size: 12px;
        color: #999;
      }
    }
  }
}

.feedback-section {
  .feedback-stats {
    display: flex;
    justify-content: space-around;
    padding: 16px 0;
    background: #f8f9fa;
    border-radius: 8px;

    .stat-item {
      text-align: center;

      .stat-number {
        display: block;
        font-size: 24px;
        font-weight: bold;
        color: #4a90e2;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 14px;
        color: #666;
      }
    }
  }
}

// 二维码对话框样式
.qrcode-content {
  text-align: center;

  .qrcode-code {
    margin: 0 auto 20px;
    width: 200px;
    height: 200px;
    background: #f8f9fa;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;

    img {
      max-width: 100%;
      max-height: 100%;
    }
  }

  .qrcode-info {
    margin-bottom: 20px;

    p {
      margin: 4px 0;
    }

    .qrcode-tip {
      color: #999;
      font-size: 13px;
    }
  }

  .qrcode-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }
}

// 语音助手样式
.voice-assistant {
  .voice-status {
    text-align: center;
    padding: 20px 0;
  }

  .voice-input-controls {
    margin: 20px 0;
  }

  .voice-result {
    margin: 20px 0;
  }

  .voice-commands {
    margin-top: 20px;

    .commands-label {
      font-weight: 500;
      margin-bottom: 8px;
      color: #333;
    }

    .command-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
}

// 积分详情
.points-detail {
  .mall-items {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 16px;

    .mall-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 12px;
      text-align: center;

      .item-image {
        font-size: 40px;
        margin-bottom: 8px;
      }

      .item-name {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 4px;
      }

      .item-price {
        color: #f39c12;
        font-weight: bold;
        margin-bottom: 8px;
      }
    }
  }
}

// 详情对话框样式
:deep(.affair-detail-dialog) {
  .el-dialog__body {
    padding: 0 24px 24px;
  }
}

.detail-content {
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 16px;

    .detail-meta {
      display: flex;
      align-items: center;
      gap: 12px;

      .publish-info,
      .publish-time {
        color: #666;
        font-size: 14px;
      }
    }

    .detail-stats {
      display: flex;
      gap: 16px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #666;
        font-size: 14px;
      }
    }
  }

  .detail-body {
    line-height: 1.6;
    color: #333;
    margin-bottom: 24px;
  }

  .detail-attachments {
    margin-bottom: 24px;

    h4 {
      margin-bottom: 12px;
      color: #333;
    }

    .attachment-list {
      .attachment-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f8f9fa;
        border-radius: 4px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          background: #e8f4fd;
        }

        .attachment-name {
          flex: 1;
          font-size: 14px;
        }

        .attachment-size {
          color: #999;
          font-size: 12px;
        }
      }
    }
  }

  .detail-comments {
    h4 {
      margin-bottom: 16px;
      color: #333;
    }

    .comment-input {
      margin-bottom: 24px;
    }

    .comment-list {
      .comment-item {
        display: flex;
        gap: 12px;
        padding: 16px 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .comment-content {
          flex: 1;

          .comment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;

            .comment-author {
              font-weight: 500;
              color: #333;
            }

            .comment-time {
              color: #999;
              font-size: 12px;
            }
          }

          .comment-text {
            color: #666;
            line-height: 1.5;
          }
        }
      }
    }
  }
}

.settings-content {
  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .setting-info {
      h4 {
        margin: 0 0 4px 0;
        color: #333;
        font-size: 16px;
      }

      p {
        margin: 0;
        color: #666;
        font-size: 14px;
      }
    }
  }
}

@media (max-width: 768px) {
  .points-section {
    margin: 0 16px 16px;
  }

  .category-nav {
    margin: 0 16px 16px;

    .nav-container {
      padding: 12px 16px;
    }
  }

  .main-content {
    padding: 0 16px 16px;
  }

  .search-container {
    flex-direction: column;
    gap: 8px;

    .el-input,
    .el-select,
    .el-button {
      width: 100%;
    }
  }

  .affair-item {
    .item-header {
      flex-direction: column;
      gap: 8px;
    }

    .item-footer {
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
  }
}

// 功能区样式
.zone-tabs {
  background: white;
  margin: 0 24px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 24px;
  }

  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }

  :deep(.el-tabs__item) {
    height: 60px;
    line-height: 60px;
    font-size: 16px;
    font-weight: 500;

    .tab-label {
      display: flex;
      align-items: center;
      gap: 8px;

      .el-icon {
        font-size: 20px;
      }
    }

    &.is-active {
      color: #4a90e2;
    }
  }

  :deep(.el-tabs__active-bar) {
    background-color: #4a90e2;
    height: 3px;
  }
}

.zone-content {
  animation: fadeIn 0.3s ease-in-out;

  &.life-services-zone {
    .life-services-container {
      padding: 0 24px 24px;

      > * {
        margin-bottom: 24px;
      }
    }
  }

  &.family-zone {
    padding: 0 24px 24px;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 移动端适配
@media (max-width: 768px) {
  .zone-tabs {
    margin: 0 16px 16px;

    :deep(.el-tabs__header) {
      padding: 0 16px;
    }

    :deep(.el-tabs__item) {
      height: 50px;
      line-height: 50px;
      font-size: 14px;
    }
  }

  .zone-content {
    &.life-services-zone {
      .life-services-container {
        padding: 0 16px 16px;
      }
    }

    &.family-zone {
      padding: 0 16px 16px;
    }
  }
}
</style>
