<template>
  <div class="message-center">
    <!-- 操作工具栏 -->
    <div class="toolbar">
      <el-button-group>
        <el-button :type="currentTab === 'sms' ? 'primary' : 'default'" @click="switchTab('sms')">
          <i class="el-icon-message"></i>
          短信
        </el-button>
        <el-button
          :type="currentTab === 'voice' ? 'primary' : 'default'"
          @click="switchTab('voice')"
        >
          <i class="el-icon-phone"></i>
          语音
        </el-button>
        <el-button
          :type="currentTab === 'email' ? 'primary' : 'default'"
          @click="switchTab('email')"
        >
          <i class="el-icon-message"></i>
          邮件
        </el-button>
        <el-button :type="currentTab === 'push' ? 'primary' : 'default'" @click="switchTab('push')">
          <i class="el-icon-bell"></i>
          推送
        </el-button>
        <el-button
          :type="currentTab === 'broadcast' ? 'primary' : 'default'"
          @click="switchTab('broadcast')"
        >
          <i class="el-icon-bullhorn"></i>
          广播
        </el-button>
      </el-button-group>

      <el-divider direction="vertical" />

      <el-button type="success" icon="el-icon-plus" @click="showComposeDialog">
        发送消息
      </el-button>

      <el-button
        type="warning"
        icon="el-icon-warning"
        @click="showEmergencyDialog"
        v-if="userRole === 'admin'"
      >
        应急广播
      </el-button>
    </div>

    <!-- 短信发送 -->
    <div v-show="currentTab === 'sms'" class="sms-panel">
      <el-card header="短信发送">
        <el-form :model="smsForm" :rules="smsRules" ref="smsForm" label-width="100px">
          <el-form-item label="服务商" prop="provider">
            <el-select v-model="smsForm.provider" placeholder="选择短信服务商">
              <el-option label="阿里云" value="aliyun"></el-option>
              <el-option label="腾讯云" value="tencent"></el-option>
              <el-option label="华为云" value="huawei"></el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="接收者" prop="recipients">
            <el-input
              v-model="smsForm.recipients"
              type="textarea"
              :rows="3"
              placeholder="输入手机号，多个用逗号分隔"
            ></el-input>
            <div class="help-text">支持136****1234格式，多个手机号用英文逗号分隔</div>
          </el-form-item>

          <el-form-item label="模板类型" prop="templateType">
            <el-select v-model="smsForm.templateType" placeholder="选择模板类型">
              <el-option label="验证码" value="verification"></el-option>
              <el-option label="通知" value="notification"></el-option>
              <el-option label="营销" value="marketing"></el-option>
              <el-option label="自定义" value="custom"></el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="模板内容" prop="template" v-if="smsForm.templateType !== 'custom'">
            <el-select v-model="smsForm.templateCode" placeholder="选择短信模板">
              <el-option
                v-for="template in smsTemplates"
                :key="template.code"
                :label="template.name"
                :value="template.code"
              ></el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="自定义内容" prop="content" v-if="smsForm.templateType === 'custom'">
            <el-input
              v-model="smsForm.content"
              type="textarea"
              :rows="4"
              placeholder="输入短信内容"
              maxlength="500"
              show-word-limit
            ></el-input>
          </el-form-item>

          <el-form-item label="模板参数" v-if="selectedTemplate && selectedTemplate.params">
            <div v-for="param in selectedTemplate.params" :key="param.key" class="param-item">
              <el-input
                v-model="smsForm.templateParams[param.key]"
                :placeholder="param.label"
                size="small"
              ></el-input>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="sendSMS" :loading="sending"> 发送短信 </el-button>
            <el-button @click="resetSMSForm">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 语音通知 -->
    <div v-show="currentTab === 'voice'" class="voice-panel">
      <el-card header="语音通知">
        <el-form :model="voiceForm" :rules="voiceRules" ref="voiceForm" label-width="100px">
          <el-form-item label="接收者" prop="recipients">
            <el-input
              v-model="voiceForm.recipients"
              type="textarea"
              :rows="2"
              placeholder="输入手机号，多个用逗号分隔"
            ></el-input>
          </el-form-item>

          <el-form-item label="语音模板" prop="template">
            <el-select v-model="voiceForm.template" placeholder="选择语音模板">
              <el-option
                v-for="template in voiceTemplates"
                :key="template.code"
                :label="template.name"
                :value="template.code"
              ></el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="播放次数" prop="playTimes">
            <el-input-number v-model="voiceForm.playTimes" :min="1" :max="3"></el-input-number>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="sendVoice" :loading="sending"> 发送语音 </el-button>
            <el-button @click="resetVoiceForm">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 邮件发送 -->
    <div v-show="currentTab === 'email'" class="email-panel">
      <el-card header="邮件发送">
        <el-form :model="emailForm" :rules="emailRules" ref="emailForm" label-width="100px">
          <el-form-item label="收件人" prop="to">
            <el-input v-model="emailForm.to" placeholder="输入邮箱地址，多个用逗号分隔"></el-input>
          </el-form-item>

          <el-form-item label="主题" prop="subject">
            <el-input v-model="emailForm.subject" placeholder="输入邮件主题"></el-input>
          </el-form-item>

          <el-form-item label="内容类型" prop="contentType">
            <el-radio-group v-model="emailForm.contentType">
              <el-radio label="text">纯文本</el-radio>
              <el-radio label="html">HTML</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="邮件内容" prop="content">
            <el-input
              v-model="emailForm.content"
              type="textarea"
              :rows="8"
              placeholder="输入邮件内容"
            ></el-input>
          </el-form-item>

          <el-form-item label="附件" prop="attachments">
            <el-upload
              action="#"
              :auto-upload="false"
              :on-change="handleFileChange"
              :file-list="emailForm.attachments"
              multiple
            >
              <el-button size="small" type="primary">选择附件</el-button>
              <div slot="tip" class="el-upload__tip">支持多文件上传，单个文件不超过10MB</div>
            </el-upload>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="sendEmail" :loading="sending"> 发送邮件 </el-button>
            <el-button @click="resetEmailForm">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 推送通知 -->
    <div v-show="currentTab === 'push'" class="push-panel">
      <el-card header="推送通知">
        <el-form :model="pushForm" :rules="pushRules" ref="pushForm" label-width="100px">
          <el-form-item label="推送平台" prop="platform">
            <el-checkbox-group v-model="pushForm.platform">
              <el-checkbox label="android">Android</el-checkbox>
              <el-checkbox label="ios">iOS</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="接收者" prop="recipients">
            <el-input
              v-model="pushForm.recipients"
              type="textarea"
              :rows="2"
              placeholder="输入设备标识，多个用逗号分隔"
            ></el-input>
          </el-form-item>

          <el-form-item label="标题" prop="title">
            <el-input v-model="pushForm.title" placeholder="输入推送标题"></el-input>
          </el-form-item>

          <el-form-item label="内容" prop="content">
            <el-input
              v-model="pushForm.content"
              type="textarea"
              :rows="3"
              placeholder="输入推送内容"
            ></el-input>
          </el-form-item>

          <el-form-item label="扩展参数">
            <el-button size="small" @click="addPushExtraParam">添加参数</el-button>
            <div v-for="(param, index) in pushForm.extraParams" :key="index" class="param-row">
              <el-input
                v-model="param.key"
                placeholder="参数名"
                size="small"
                style="width: 150px; margin-right: 10px"
              ></el-input>
              <el-input
                v-model="param.value"
                placeholder="参数值"
                size="small"
                style="width: 200px; margin-right: 10px"
              ></el-input>
              <el-button
                type="danger"
                size="small"
                icon="el-icon-delete"
                @click="removePushExtraParam(index)"
              ></el-button>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="sendPush" :loading="sending"> 发送推送 </el-button>
            <el-button @click="resetPushForm">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 消息历史 -->
    <el-card header="发送历史" class="history-panel">
      <div class="history-filters">
        <el-form :inline="true" :model="historyFilters" size="small">
          <el-form-item label="消息类型">
            <el-select v-model="historyFilters.type" placeholder="全部" clearable>
              <el-option label="短信" value="sms"></el-option>
              <el-option label="语音" value="voice"></el-option>
              <el-option label="邮件" value="email"></el-option>
              <el-option label="推送" value="push"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="historyFilters.status" placeholder="全部" clearable>
              <el-option label="成功" value="success"></el-option>
              <el-option label="失败" value="failed"></el-option>
              <el-option label="发送中" value="pending"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="historyFilters.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
            ></el-date-picker>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadMessageHistory">查询</el-button>
            <el-button @click="resetHistoryFilters">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table :data="messageHistory" v-loading="loading" style="width: 100%">
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="getMessageTypeColor(row.type)">
              {{ getMessageTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="recipients" label="接收者" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatRecipients(row.recipients) }}
          </template>
        </el-table-column>
        <el-table-column prop="content.text" label="内容" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatMessageContent(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusColor(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="发送时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="mini" @click="viewMessageDetail(row)"> 详情 </el-button>
            <el-button
              v-if="row.status === 'failed'"
              size="mini"
              type="warning"
              @click="retryMessage(row)"
            >
              重试
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="pagination"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="pagination.page"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="pagination.limit"
        layout="total, sizes, prev, pager, next, jumper"
        :total="pagination.total"
      ></el-pagination>
    </el-card>

    <!-- 消息详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="消息详情" width="600px">
      <div v-if="selectedMessage" class="message-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="消息类型">
            {{ getMessageTypeLabel(selectedMessage.type) }}
          </el-descriptions-item>
          <el-descriptions-item label="服务商">
            {{ selectedMessage.provider }}
          </el-descriptions-item>
          <el-descriptions-item label="接收者" span="2">
            {{ selectedMessage.recipients.join(', ') }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusColor(selectedMessage.status)">
              {{ getStatusLabel(selectedMessage.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发送时间">
            {{ formatDateTime(selectedMessage.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="内容" span="2">
            <div class="message-content">{{ formatMessageContent(selectedMessage) }}</div>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedMessage.error" class="error-info">
          <h4>错误信息</h4>
          <el-alert
            :title="selectedMessage.error.message"
            type="error"
            :description="selectedMessage.error.details"
            show-icon
            :closable="false"
          ></el-alert>
        </div>

        <div v-if="selectedMessage.result" class="result-info">
          <h4>发送结果</h4>
          <pre>{{ JSON.stringify(selectedMessage.result, null, 2) }}</pre>
        </div>
      </div>
    </el-dialog>

    <!-- 应急广播对话框 -->
    <el-dialog
      v-model="emergencyDialogVisible"
      title="应急广播"
      width="800px"
      :before-close="closeEmergencyDialog"
    >
      <el-form
        :model="emergencyForm"
        :rules="emergencyRules"
        ref="emergencyForm"
        label-width="100px"
      >
        <el-form-item label="村庄" prop="villageId">
          <el-select v-model="emergencyForm.villageId" placeholder="选择村庄">
            <el-option
              v-for="village in villages"
              :key="village._id"
              :label="village.name"
              :value="village._id"
            ></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="广播类型" prop="type">
          <el-select v-model="emergencyForm.type" placeholder="选择广播类型">
            <el-option label="自然灾害" value="natural_disaster"></el-option>
            <el-option label="公共安全" value="public_safety"></el-option>
            <el-option label="卫生紧急" value="health_emergency"></el-option>
            <el-option label="基础设施" value="infrastructure"></el-option>
            <el-option label="天气预警" value="weather_warning"></el-option>
            <el-option label="其他" value="other"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="紧急程度" prop="urgency">
          <el-radio-group v-model="emergencyForm.urgency">
            <el-radio label="low">低</el-radio>
            <el-radio label="medium">中</el-radio>
            <el-radio label="high">高</el-radio>
            <el-radio label="critical">紧急</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="广播内容" prop="message">
          <el-input
            v-model="emergencyForm.message"
            type="textarea"
            :rows="4"
            placeholder="输入应急广播内容"
            maxlength="500"
            show-word-limit
          ></el-input>
        </el-form-item>

        <el-form-item label="发送渠道" prop="channels">
          <el-checkbox-group v-model="emergencyForm.channels">
            <el-checkbox label="sms">短信</el-checkbox>
            <el-checkbox label="voice">语音</el-checkbox>
            <el-checkbox label="push">推送</el-checkbox>
            <el-checkbox label="email">邮件</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeEmergencyDialog">取消</el-button>
          <el-button type="danger" @click="sendEmergencyBroadcast" :loading="sending">
            发送应急广播
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import communicationService from '@/services/communicationService';

export default {
  name: 'MessageCenter',
  props: {
    userRole: {
      type: String,
      default: 'user',
    },
  },
  setup() {
    // 响应式数据
    const currentTab = ref('sms');
    const sending = ref(false);
    const loading = ref(false);
    const detailDialogVisible = ref(false);
    const emergencyDialogVisible = ref(false);
    const selectedMessage = ref(null);

    // 表单数据
    const smsForm = reactive({
      provider: 'aliyun',
      recipients: '',
      templateType: 'notification',
      templateCode: '',
      content: '',
      templateParams: {},
    });

    const voiceForm = reactive({
      recipients: '',
      template: '',
      playTimes: 1,
    });

    const emailForm = reactive({
      to: '',
      subject: '',
      content: '',
      contentType: 'html',
      attachments: [],
    });

    const pushForm = reactive({
      platform: ['android', 'ios'],
      recipients: '',
      title: '',
      content: '',
      extraParams: [],
    });

    const emergencyForm = reactive({
      villageId: '',
      type: 'other',
      urgency: 'medium',
      message: '',
      channels: ['sms', 'voice', 'push'],
    });

    // 历史记录相关
    const historyFilters = reactive({
      type: '',
      status: '',
      dateRange: null,
    });

    const pagination = reactive({
      page: 1,
      limit: 20,
      total: 0,
    });

    const messageHistory = ref([]);
    const villages = ref([]);

    // 模板数据
    const smsTemplates = ref([
      { code: 'SMS_VERIFICATION', name: '验证码模板', params: [{ key: 'code', label: '验证码' }] },
      {
        code: 'SMS_NOTIFICATION',
        name: '通知模板',
        params: [
          { key: 'title', label: '标题' },
          { key: 'content', label: '内容' },
        ],
      },
      {
        code: 'SMS_BIRTHDAY',
        name: '生日祝福',
        params: [
          { key: 'name', label: '姓名' },
          { key: 'village', label: '村庄' },
        ],
      },
    ]);

    const voiceTemplates = ref([
      { code: 'VOICE_EMERGENCY', name: '紧急通知' },
      { code: 'VOICE_REMINDER', name: '提醒通知' },
      { code: 'VOICE_WEATHER', name: '天气播报' },
    ]);

    // 计算属性
    const selectedTemplate = computed(() => {
      if (smsForm.templateType !== 'custom' && smsForm.templateCode) {
        return smsTemplates.value.find(t => t.code === smsForm.templateCode);
      }
      return null;
    });

    // 表单验证规则
    const smsRules = {
      recipients: [{ required: true, message: '请输入接收者手机号', trigger: 'blur' }],
      templateType: [{ required: true, message: '请选择模板类型', trigger: 'change' }],
    };

    const voiceRules = {
      recipients: [{ required: true, message: '请输入接收者手机号', trigger: 'blur' }],
      template: [{ required: true, message: '请选择语音模板', trigger: 'change' }],
    };

    const emailRules = {
      to: [{ required: true, message: '请输入收件人邮箱', trigger: 'blur' }],
      subject: [{ required: true, message: '请输入邮件主题', trigger: 'blur' }],
      content: [{ required: true, message: '请输入邮件内容', trigger: 'blur' }],
    };

    const pushRules = {
      platform: [{ required: true, message: '请选择推送平台', trigger: 'change' }],
      recipients: [{ required: true, message: '请输入接收者', trigger: 'blur' }],
      title: [{ required: true, message: '请输入推送标题', trigger: 'blur' }],
      content: [{ required: true, message: '请输入推送内容', trigger: 'blur' }],
    };

    const emergencyRules = {
      villageId: [{ required: true, message: '请选择村庄', trigger: 'change' }],
      type: [{ required: true, message: '请选择广播类型', trigger: 'change' }],
      urgency: [{ required: true, message: '请选择紧急程度', trigger: 'change' }],
      message: [{ required: true, message: '请输入广播内容', trigger: 'blur' }],
      channels: [{ required: true, message: '请选择发送渠道', trigger: 'change' }],
    };

    // 方法
    const switchTab = tab => {
      currentTab.value = tab;
    };

    const sendSMS = async () => {
      try {
        sending.value = true;

        let template;
        if (smsForm.templateType !== 'custom') {
          template = {
            code: smsForm.templateCode,
            params: smsForm.templateParams,
          };
        }

        const result = await communicationService.sendMessage({
          type: 'sms',
          provider: smsForm.provider,
          recipients: smsForm.recipients.split(',').map(r => r.trim()),
          template,
          content: { text: smsForm.content },
        });

        ElMessage.success('短信发送成功');
        resetSMSForm();
        loadMessageHistory();
      } catch (error) {
        ElMessage.error(`短信发送失败: ${error.message}`);
      } finally {
        sending.value = false;
      }
    };

    const sendVoice = async () => {
      try {
        sending.value = true;

        const result = await communicationService.sendMessage({
          type: 'voice',
          provider: 'aliyun',
          recipients: voiceForm.recipients.split(',').map(r => r.trim()),
          template: { code: voiceForm.template },
          options: { playTimes: voiceForm.playTimes },
        });

        ElMessage.success('语音通知发送成功');
        resetVoiceForm();
        loadMessageHistory();
      } catch (error) {
        ElMessage.error(`语音通知发送失败: ${error.message}`);
      } finally {
        sending.value = false;
      }
    };

    const sendEmail = async () => {
      try {
        sending.value = true;

        const recipients = emailForm.to.split(',').map(r => r.trim());

        const result = await communicationService.sendMessage({
          type: 'email',
          recipients,
          content: {
            subject: emailForm.subject,
            body: emailForm.content,
            type: emailForm.contentType,
            attachments: emailForm.attachments,
          },
        });

        ElMessage.success('邮件发送成功');
        resetEmailForm();
        loadMessageHistory();
      } catch (error) {
        ElMessage.error(`邮件发送失败: ${error.message}`);
      } finally {
        sending.value = false;
      }
    };

    const sendPush = async () => {
      try {
        sending.value = true;

        const notification = {
          alert: pushForm.content,
          title: pushForm.title,
        };

        // 添加平台特定的配置
        if (pushForm.platform.includes('android')) {
          notification.android = {
            title: pushForm.title,
            alert: pushForm.content,
            extras: pushForm.extraParams.reduce((acc, param) => {
              acc[param.key] = param.value;
              return acc;
            }, {}),
          };
        }

        if (pushForm.platform.includes('ios')) {
          notification.ios = {
            title: pushForm.title,
            body: pushForm.content,
            badge: 1,
            sound: 'default',
          };
        }

        const result = await communicationService.sendMessage({
          type: 'push',
          provider: 'jiguang',
          recipients: pushForm.recipients.split(',').map(r => r.trim()),
          content: notification,
        });

        ElMessage.success('推送通知发送成功');
        resetPushForm();
        loadMessageHistory();
      } catch (error) {
        ElMessage.error(`推送通知发送失败: ${error.message}`);
      } finally {
        sending.value = false;
      }
    };

    const sendEmergencyBroadcast = async () => {
      try {
        await ElMessageBox.confirm(
          '确定要发送应急广播吗？此操作将立即向全村村民发送紧急通知。',
          '确认发送',
          {
            confirmButtonText: '确定发送',
            cancelButtonText: '取消',
            type: 'warning',
          }
        );

        sending.value = true;

        const result = await communicationService.sendEmergencyBroadcast(
          emergencyForm.villageId,
          emergencyForm.message,
          emergencyForm.channels
        );

        ElMessage.success('应急广播发送成功');
        closeEmergencyDialog();
        loadMessageHistory();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error(`应急广播发送失败: ${error.message}`);
        }
      } finally {
        sending.value = false;
      }
    };

    const loadMessageHistory = async () => {
      try {
        loading.value = true;

        const params = {
          type: historyFilters.type,
          status: historyFilters.status,
          page: pagination.page,
          limit: pagination.limit,
        };

        if (historyFilters.dateRange) {
          params.startDate = historyFilters.dateRange[0].toISOString();
          params.endDate = historyFilters.dateRange[1].toISOString();
        }

        const result = await communicationService.getMessageHistory(params);

        messageHistory.value = result.data.messages;
        pagination.total = result.data.pagination.total;
      } catch (error) {
        ElMessage.error(`加载消息历史失败: ${error.message}`);
      } finally {
        loading.value = false;
      }
    };

    const viewMessageDetail = message => {
      selectedMessage.value = message;
      detailDialogVisible.value = true;
    };

    const retryMessage = async message => {
      try {
        await ElMessageBox.confirm('确定要重试发送这条消息吗？', '确认重试', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        });

        // 实现重试逻辑
        ElMessage.success('消息重试成功');
        loadMessageHistory();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error(`消息重试失败: ${error.message}`);
        }
      }
    };

    // 表单重置
    const resetSMSForm = () => {
      smsForm.recipients = '';
      smsForm.templateType = 'notification';
      smsForm.templateCode = '';
      smsForm.content = '';
      smsForm.templateParams = {};
    };

    const resetVoiceForm = () => {
      voiceForm.recipients = '';
      voiceForm.template = '';
      voiceForm.playTimes = 1;
    };

    const resetEmailForm = () => {
      emailForm.to = '';
      emailForm.subject = '';
      emailForm.content = '';
      emailForm.contentType = 'html';
      emailForm.attachments = [];
    };

    const resetPushForm = () => {
      pushForm.platform = ['android', 'ios'];
      pushForm.recipients = '';
      pushForm.title = '';
      pushForm.content = '';
      pushForm.extraParams = [];
    };

    const resetHistoryFilters = () => {
      historyFilters.type = '';
      historyFilters.status = '';
      historyFilters.dateRange = null;
      pagination.page = 1;
      loadMessageHistory();
    };

    // 文件处理
    const handleFileChange = (file, fileList) => {
      emailForm.attachments = fileList;
    };

    // 参数管理
    const addPushExtraParam = () => {
      pushForm.extraParams.push({ key: '', value: '' });
    };

    const removePushExtraParam = index => {
      pushForm.extraParams.splice(index, 1);
    };

    // 对话框管理
    const showComposeDialog = () => {
      // 可以显示一个综合的消息发送对话框
      ElMessage.info('请选择具体的消息类型标签页进行发送');
    };

    const showEmergencyDialog = () => {
      emergencyDialogVisible.value = true;
    };

    const closeEmergencyDialog = () => {
      emergencyDialogVisible.value = false;
      emergencyForm.villageId = '';
      emergencyForm.type = 'other';
      emergencyForm.urgency = 'medium';
      emergencyForm.message = '';
      emergencyForm.channels = ['sms', 'voice', 'push'];
    };

    // 分页处理
    const handleSizeChange = val => {
      pagination.limit = val;
      pagination.page = 1;
      loadMessageHistory();
    };

    const handleCurrentChange = val => {
      pagination.page = val;
      loadMessageHistory();
    };

    // 格式化方法
    const formatRecipients = recipients => {
      if (Array.isArray(recipients)) {
        if (recipients.length > 3) {
          return `${recipients.slice(0, 3).join(', ')} 等${recipients.length}个`;
        }
        return recipients.join(', ');
      }
      return recipients;
    };

    const formatMessageContent = message => {
      if (message.content && message.content.text) {
        return message.content.text;
      }
      if (message.content && message.content.subject) {
        return message.content.subject;
      }
      return '无内容';
    };

    const formatDateTime = dateTime => {
      return new Date(dateTime).toLocaleString();
    };

    const getMessageTypeLabel = type => {
      const typeMap = {
        sms: '短信',
        voice: '语音',
        email: '邮件',
        push: '推送',
      };
      return typeMap[type] || type;
    };

    const getMessageTypeColor = type => {
      const colorMap = {
        sms: 'primary',
        voice: 'success',
        email: 'warning',
        push: 'info',
      };
      return colorMap[type] || 'default';
    };

    const getStatusLabel = status => {
      const statusMap = {
        success: '成功',
        failed: '失败',
        pending: '发送中',
        partial: '部分成功',
      };
      return statusMap[status] || status;
    };

    const getStatusColor = status => {
      const colorMap = {
        success: 'success',
        failed: 'danger',
        pending: 'warning',
        partial: 'info',
      };
      return colorMap[status] || 'default';
    };

    // 生命周期
    onMounted(() => {
      loadMessageHistory();
      // 这里可以加载村庄列表数据
    });

    return {
      // 响应式数据
      currentTab,
      sending,
      loading,
      detailDialogVisible,
      emergencyDialogVisible,
      selectedMessage,
      smsForm,
      voiceForm,
      emailForm,
      pushForm,
      emergencyForm,
      historyFilters,
      pagination,
      messageHistory,
      villages,
      smsTemplates,
      voiceTemplates,
      selectedTemplate,

      // 验证规则
      smsRules,
      voiceRules,
      emailRules,
      pushRules,
      emergencyRules,

      // 方法
      switchTab,
      sendSMS,
      sendVoice,
      sendEmail,
      sendPush,
      sendEmergencyBroadcast,
      loadMessageHistory,
      viewMessageDetail,
      retryMessage,
      resetSMSForm,
      resetVoiceForm,
      resetEmailForm,
      resetPushForm,
      resetHistoryFilters,
      handleFileChange,
      addPushExtraParam,
      removePushExtraParam,
      showComposeDialog,
      showEmergencyDialog,
      closeEmergencyDialog,
      handleSizeChange,
      handleCurrentChange,
      formatRecipients,
      formatMessageContent,
      formatDateTime,
      getMessageTypeLabel,
      getMessageTypeColor,
      getStatusLabel,
      getStatusColor,
    };
  },
};
</script>

<style scoped>
.message-center {
  padding: 20px;
}

.toolbar {
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 4px;
}

.help-text {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.param-item {
  margin-bottom: 10px;
}

.param-row {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}

.history-panel {
  margin-top: 20px;
}

.history-filters {
  margin-bottom: 20px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 4px;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.message-detail {
  max-height: 500px;
  overflow-y: auto;
}

.message-content {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-info,
.result-info {
  margin-top: 20px;
}

.error-info h4,
.result-info h4 {
  margin-bottom: 10px;
  color: #303133;
}

pre {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
}
</style>
