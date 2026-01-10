<template>
  <el-dialog
    title="会议签到"
    :visible.sync="dialogVisible"
    width="50%"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="checkin-container">
      <div v-if="meeting" class="meeting-info">
        <h3>{{ meeting.title }}</h3>
        <div class="meeting-details">
          <div class="detail-item">
            <i class="el-icon-time"></i>
            <span>{{ formatDateTime(meeting.scheduledTime.startTime) }}</span>
          </div>
          <div class="detail-item">
            <i class="el-icon-location"></i>
            <span>{{ meeting.location.venue }}</span>
          </div>
          <div class="detail-item">
            <i class="el-icon-user"></i>
            <span>{{ meeting.organizer.realName }}</span>
          </div>
        </div>
      </div>

      <!-- 签到状态提示 -->
      <div v-if="checkInStatus" class="status-alert">
        <el-alert
          :title="checkInStatus.title"
          :description="checkInStatus.description"
          :type="checkInStatus.type"
          :closable="false"
          show-icon
        ></el-alert>
      </div>

      <!-- 签到方式选择 -->
      <div v-if="!hasCheckedIn" class="checkin-methods">
        <h4>选择签到方式</h4>
        <el-radio-group v-model="checkInMethod" @change="handleMethodChange">
          <el-radio label="qr_code">
            <div class="method-option">
              <i class="el-icon-qrcode"></i>
              <span>扫描二维码</span>
            </div>
          </el-radio>
          <el-radio label="manual">
            <div class="method-option">
              <i class="el-icon-edit"></i>
              <span>手动签到</span>
            </div>
          </el-radio>
          <el-radio label="face_recognition" disabled>
            <div class="method-option">
              <i class="el-icon-view"></i>
              <span>人脸识别（暂不可用）</span>
            </div>
          </el-radio>
        </el-radio-group>
      </div>

      <!-- 二维码签到 -->
      <div v-if="checkInMethod === 'qr_code' && !hasCheckedIn" class="qr-checkin">
        <div class="qr-scanner">
          <div v-if="!showScanner" class="scanner-placeholder">
            <i class="el-icon-camera"></i>
            <p>点击启动摄像头扫描二维码</p>
            <el-button type="primary" @click="startScanner"> 启动扫描 </el-button>
          </div>
          <div v-else class="scanner-container">
            <video ref="video" autoplay></video>
            <canvas ref="canvas" style="display: none"></canvas>
            <div class="scanner-overlay">
              <div class="scanner-frame"></div>
            </div>
            <div class="scanner-controls">
              <el-button @click="stopScanner">停止扫描</el-button>
              <el-button type="primary" @click="captureQR">识别二维码</el-button>
            </div>
          </div>
        </div>

        <!-- 手动输入二维码 -->
        <div class="manual-qr">
          <el-divider>或</el-divider>
          <el-input
            v-model="qrCode"
            placeholder="手动输入二维码内容"
            type="textarea"
            :rows="3"
          ></el-input>
        </div>
      </div>

      <!-- 手动签到 -->
      <div v-if="checkInMethod === 'manual' && !hasCheckedIn" class="manual-checkin">
        <el-form :model="checkInForm" label-width="100px">
          <el-form-item label="签到地点">
            <el-input
              v-model="checkInForm.location.venue"
              placeholder="确认您的签到地点"
            ></el-input>
          </el-form-item>
          <el-form-item label="备注信息">
            <el-input
              v-model="checkInForm.notes"
              type="textarea"
              :rows="3"
              placeholder="可填写备注信息（可选）"
            ></el-input>
          </el-form-item>
        </el-form>
      </div>

      <!-- 位置信息 -->
      <div v-if="!hasCheckedIn" class="location-info">
        <el-checkbox v-model="enableLocation"> 包含位置信息（用于验证签到地点） </el-checkbox>
        <div v-if="enableLocation && currentLocation" class="location-display">
          <p>
            <i class="el-icon-location-information"></i>
            当前位置: {{ currentLocation.address || '获取中...' }}
          </p>
        </div>
      </div>

      <!-- 已签到状态 -->
      <div v-if="hasCheckedIn" class="checked-in-status">
        <div class="success-icon">
          <i class="el-icon-circle-check"></i>
        </div>
        <h3>签到成功</h3>
        <div class="checkin-details">
          <p><strong>签到时间:</strong> {{ formatDateTime(userCheckIn.checkInTime) }}</p>
          <p><strong>签到方式:</strong> {{ getCheckInMethodText(userCheckIn.checkInMethod) }}</p>
          <p v-if="userCheckIn.isLate">
            <strong>迟到时间:</strong> {{ userCheckIn.lateMinutes }} 分钟
          </p>
        </div>
      </div>
    </div>

    <div slot="footer" class="dialog-footer">
      <el-button @click="handleClose">
        {{ hasCheckedIn ? '关闭' : '取消' }}
      </el-button>
      <el-button
        v-if="!hasCheckedIn"
        type="primary"
        @click="performCheckIn"
        :loading="checkingIn"
        :disabled="!canCheckIn"
      >
        确认签到
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
import { meetingAPI } from '@/api/meeting';
import { formatDateTime } from '@/utils/dateUtils';

export default {
  name: 'MeetingCheckInDialog',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    meetingId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      loading: false,
      checkingIn: false,
      meeting: null,
      checkInMethod: 'manual',
      showScanner: false,
      qrCode: '',
      enableLocation: true,
      currentLocation: null,
      stream: null,
      checkInForm: {
        location: {
          venue: '',
        },
        notes: '',
      },
    };
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible;
      },
      set(val) {
        this.$emit('update:visible', val);
      },
    },
    hasCheckedIn() {
      return this.meeting?.userCheckInStatus?.hasCheckedIn || false;
    },
    userCheckIn() {
      return this.meeting?.userCheckInStatus || {};
    },
    checkInStatus() {
      if (!this.meeting) return null;

      const now = new Date();
      const startTime = new Date(this.meeting.scheduledTime.startTime);
      const checkInStart = new Date(this.meeting.settings.checkIn.startTime);
      const checkInEnd = new Date(this.meeting.settings.checkIn.endTime);

      if (this.hasCheckedIn) {
        return {
          title: '您已成功签到',
          description: this.userCheckIn.isLate ? '签到成功，但已迟到' : '签到成功，准时到达',
          type: this.userCheckIn.isLate ? 'warning' : 'success',
        };
      }

      if (now < checkInStart) {
        return {
          title: '签到尚未开始',
          description: `签到将于 ${formatDateTime(checkInStart)} 开始`,
          type: 'info',
        };
      }

      if (now > checkInEnd && !this.meeting.settings.checkIn.allowLateCheckIn) {
        return {
          title: '签到已结束',
          description: '签到时间已过，无法进行签到',
          type: 'error',
        };
      }

      if (now > startTime) {
        return {
          title: '会议已开始',
          description: '您可以迟到签到，但会被标记为迟到',
          type: 'warning',
        };
      }

      return {
        title: '可以签到',
        description: '请选择签到方式完成签到',
        type: 'success',
      };
    },
    canCheckIn() {
      if (this.hasCheckedIn) return false;

      if (this.checkInMethod === 'qr_code') {
        return this.qrCode.trim().length > 0;
      }

      if (this.checkInMethod === 'manual') {
        return this.checkInForm.location.venue.trim().length > 0;
      }

      return false;
    },
  },
  watch: {
    visible(newVal) {
      if (newVal && this.meetingId) {
        this.loadMeetingDetails();
      } else {
        this.cleanup();
      }
    },
  },
  methods: {
    async loadMeetingDetails() {
      this.loading = true;
      try {
        const response = await meetingAPI.getMeetingDetails(this.meetingId);

        if (response.data.success) {
          this.meeting = response.data.data;
          this.checkInForm.location.venue = this.meeting.location.venue;
        }

        if (this.enableLocation) {
          this.getCurrentLocation();
        }
      } catch (error) {
        this.$message.error('加载会议信息失败');
        console.error(error);
      } finally {
        this.loading = false;
      }
    },

    async getCurrentLocation() {
      if (!navigator.geolocation) {
        console.warn('浏览器不支持地理位置');
        return;
      }

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: false,
          });
        });

        this.currentLocation = {
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
          address: '获取中...',
        };

        // 这里可以调用地理编码API获取地址
        // 简化处理，显示坐标
        this.currentLocation.address = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
      } catch (error) {
        console.warn('获取位置失败:', error);
        this.enableLocation = false;
      }
    },

    handleMethodChange() {
      this.qrCode = '';
      this.stopScanner();
    },

    async startScanner() {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        this.$refs.video.srcObject = this.stream;
        this.showScanner = true;
      } catch (error) {
        this.$message.error('无法启动摄像头');
        console.error(error);
      }
    },

    stopScanner() {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      this.showScanner = false;
    },

    captureQR() {
      // 简化的二维码识别，实际应该使用专业的二维码识别库
      const canvas = this.$refs.canvas;
      const video = this.$refs.video;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      // 这里应该调用二维码识别库
      this.$message.info('请手动输入二维码内容或使用专业扫码应用');
    },

    async performCheckIn() {
      this.checkingIn = true;
      try {
        const checkInData = {
          checkInMethod: this.checkInMethod,
          notes: this.checkInForm.notes,
        };

        if (this.checkInMethod === 'qr_code') {
          checkInData.qrCode = this.qrCode;
        }

        if (this.checkInMethod === 'manual') {
          checkInData.location = this.checkInForm.location;
        }

        if (this.enableLocation && this.currentLocation) {
          checkInData.location = {
            ...checkInData.location,
            coordinates: {
              longitude: this.currentLocation.longitude,
              latitude: this.currentLocation.latitude,
            },
          };
        }

        const response = await meetingAPI.checkInMeeting(this.meetingId, checkInData);

        if (response.data.success) {
          this.$message.success(response.data.message);
          this.$emit('checked-in', response.data.data);

          // 重新加载会议信息以更新签到状态
          await this.loadMeetingDetails();
        }
      } catch (error) {
        const message = error.response?.data?.message || '签到失败';
        this.$message.error(message);
        console.error(error);
      } finally {
        this.checkingIn = false;
      }
    },

    handleClose() {
      this.cleanup();
      this.dialogVisible = false;
    },

    cleanup() {
      this.stopScanner();
      this.qrCode = '';
      this.checkInForm = {
        location: { venue: '' },
        notes: '',
      };
      this.currentLocation = null;
      this.enableLocation = true;
      this.checkInMethod = 'manual';
    },

    getCheckInMethodText(method) {
      const methods = {
        qr_code: '二维码扫描',
        manual: '手动签到',
        face_recognition: '人脸识别',
        nfc: 'NFC签到',
      };
      return methods[method] || '未知方式';
    },

    formatDateTime,
  },
};
</script>

<style scoped>
.checkin-container {
  padding: 20px 0;
}

.meeting-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.meeting-info h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.meeting-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.detail-item i {
  width: 16px;
  color: #409eff;
}

.status-alert {
  margin-bottom: 20px;
}

.checkin-methods h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.method-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
}

.method-option i {
  font-size: 18px;
  color: #409eff;
}

.qr-checkin {
  margin-top: 20px;
}

.scanner-placeholder {
  text-align: center;
  padding: 40px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 2px dashed #ddd;
}

.scanner-placeholder i {
  font-size: 48px;
  color: #ccc;
  margin-bottom: 10px;
}

.scanner-container {
  position: relative;
  text-align: center;
}

.scanner-container video {
  width: 100%;
  max-width: 400px;
  border-radius: 6px;
}

.scanner-overlay {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  height: 100%;
  pointer-events: none;
}

.scanner-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  border: 2px solid #409eff;
  border-radius: 8px;
}

.scanner-controls {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  justify-content: center;
}

.manual-qr {
  margin-top: 20px;
}

.manual-checkin {
  margin-top: 20px;
}

.location-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.location-display {
  margin-top: 10px;
  padding: 10px;
  background: #f0f9ff;
  border-radius: 4px;
}

.location-display p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.checked-in-status {
  text-align: center;
  padding: 30px;
}

.success-icon {
  margin-bottom: 15px;
}

.success-icon i {
  font-size: 64px;
  color: #67c23a;
}

.checked-in-status h3 {
  margin: 0 0 20px 0;
  color: #67c23a;
}

.checkin-details {
  text-align: left;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-top: 20px;
}

.checkin-details p {
  margin: 8px 0;
  font-size: 14px;
}

.dialog-footer {
  text-align: right;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .el-dialog {
    width: 95% !important;
  }

  .checkin-container {
    padding: 10px 0;
  }

  .scanner-container video {
    max-width: 100%;
  }

  .scanner-controls {
    flex-direction: column;
  }
}
</style>
