<template>
  <div v-if="show" class="video-call-overlay">
    <!-- 通话中界面 -->
    <div class="video-call-container">
      <!-- 远程视频 -->
      <video ref="remoteVideoRef" class="remote-video" autoplay playsinline></video>

      <!-- 本地视频（画中画） -->
      <video ref="localVideoRef" class="local-video" autoplay playsinline muted></video>

      <!-- 通话信息 -->
      <div class="call-info">
        <div class="avatar">{{ remoteUser?.avatar || '👤' }}</div>
        <div class="name">{{ remoteUser?.name || '对方' }}</div>
        <div class="status">{{ callStatus }}</div>
        <div class="duration">{{ formattedDuration }}</div>
      </div>

      <!-- 控制按钮 -->
      <div class="call-controls">
        <button class="control-btn" @click="toggleMute" :class="{ active: isMuted }">
          <span class="btn-icon">{{ isMuted ? '🔇' : '🎤' }}</span>
        </button>
        <button class="control-btn" @click="toggleVideo" :class="{ active: isVideoOff }">
          <span class="btn-icon">{{ isVideoOff ? '📵' : '📹' }}</span>
        </button>
        <button class="control-btn end-btn" @click="endCall">
          <span class="btn-icon">📞</span>
        </button>
        <button class="control-btn" @click="toggleCamera" :class="{ active: usingFrontCamera }">
          <span class="btn-icon">🔄</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  remoteUser: {
    type: Object,
    default: () => ({})
  },
  isInitiator: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close', 'ended', 'accepted'])

// 视频元素引用
const remoteVideoRef = ref(null)
const localVideoRef = ref(null)

// WebRTC 相关
let peerConnection = null
let localStream = null
let remoteStream = null

// 状态管理
const callStatus = ref('呼叫中')
const callDuration = ref(0)
const isMuted = ref(false)
const isVideoOff = ref(false)
const usingFrontCamera = ref(true)

// 计时器
let durationTimer = null

// 格式化通话时长
const formattedDuration = computed(() => {
  const minutes = Math.floor(callDuration.value / 60)
  const seconds = callDuration.value % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// 初始化 WebRTC
const initWebRTC = async () => {
  try {
    // 获取本地媒体流
    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: usingFrontCamera.value ? 'user' : 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: true
    })

    // 显示本地视频
    if (localVideoRef.value) {
      localVideoRef.value.srcObject = localStream
    }

    // 创建 RTCPeerConnection
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }

    peerConnection = new RTCPeerConnection(config)

    // 添加本地流到连接
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream)
    })

    // 监听远程流
    peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        remoteStream = event.streams[0]
        if (remoteVideoRef.value) {
          remoteVideoRef.value.srcObject = remoteStream
        }
      }
    }

    // ICE 候选
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // 发送 ICE 候选到信令服务器
        console.log('ICE candidate:', event.candidate)
      }
    }

    // 连接状态变化
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState)
      if (peerConnection.connectionState === 'connected') {
        callStatus.value = '通话中'
        startTimer()
      } else if (peerConnection.connectionState === 'disconnected') {
        callStatus.value = '连接断开'
      }
    }

    // 如果是发起方，创建 offer
    if (props.isInitiator) {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      // 发送 offer 到信令服务器
      console.log('Offer created:', offer)
    }

  } catch (error) {
    console.error('初始化 WebRTC 失败:', error)
    showToast('无法访问摄像头或麦克风', 'error')
    endCall()
  }
}

// 接受远程 offer
const acceptCall = async (offer) => {
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    // 发送 answer 到信令服务器
    console.log('Answer created:', answer)

    callStatus.value = '通话中'
    startTimer()
    emit('accepted')
  } catch (error) {
    console.error('接受通话失败:', error)
  }
}

// 切换静音
const toggleMute = () => {
  isMuted.value = !isMuted.value
  if (localStream) {
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !isMuted.value
    })
  }
}

// 切换视频
const toggleVideo = () => {
  isVideoOff.value = !isVideoOff.value
  if (localStream) {
    localStream.getVideoTracks().forEach(track => {
      track.enabled = !isVideoOff.value
    })
  }
}

// 切换摄像头
const toggleCamera = async () => {
  try {
    // 停止当前视频流
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.stop())
    }

    // 切换摄像头
    usingFrontCamera.value = !usingFrontCamera.value

    // 重新获取媒体流
    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: usingFrontCamera.value ? 'user' : 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: true
    })

    // 更新本地视频
    if (localVideoRef.value) {
      localVideoRef.value.srcObject = localStream
    }

    // 替换视频轨道
    const videoTrack = localStream.getVideoTracks()[0]
    const sender = peerConnection.getSenders().find(s =>
      s.track.kind === 'video'
    )
    if (sender) {
      sender.replaceTrack(videoTrack)
    }

  } catch (error) {
    console.error('切换摄像头失败:', error)
    showToast('切换摄像头失败', 'error')
  }
}

// 开始计时
const startTimer = () => {
  callDuration.value = 0
  durationTimer = setInterval(() => {
    callDuration.value++
  }, 1000)
}

// 停止计时
const stopTimer = () => {
  if (durationTimer) {
    clearInterval(durationTimer)
    durationTimer = null
  }
}

// 结束通话
const endCall = () => {
  stopTimer()

  // 停止本地流
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop())
  }

  // 关闭连接
  if (peerConnection) {
    peerConnection.close()
  }

  localStream = null
  remoteStream = null
  peerConnection = null

  emit('ended')
}

// 显示 Toast 提示
const showToast = (message, type = 'info') => {
  console.log(`${type.toUpperCase()}: ${message}`)
}

// 监听显示状态
watch(() => props.show, (newVal) => {
  if (newVal) {
    initWebRTC()
  } else {
    endCall()
  }
})

onUnmounted(() => {
  endCall()
})
</script>

<style lang="scss" scoped>
.video-call-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 3000;
  display: flex;
  flex-direction: column;
}

.video-call-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #1a1a1a;
}

.local-video {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 120px;
  height: 160px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.3);
  z-index: 10;
}

.call-info {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #fff;
  z-index: 20;

  .avatar {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .name {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .status {
    font-size: 16px;
    margin-bottom: 8px;
    opacity: 0.8;
  }

  .duration {
    font-size: 20px;
    font-weight: 500;
    opacity: 0.9;
  }
}

.call-controls {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  z-index: 20;

  .control-btn {
    width: 56px;
    height: 56px;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;

    &:active {
      transform: scale(0.9);
    }

    &.active {
      background: rgba(255, 255, 255, 0.4);
    }

    &.end-btn {
      background: #ff4d4f;
      width: 64px;
      height: 64px;

      &:active {
        background: #ff7875;
      }
    }

    .btn-icon {
      font-size: 24px;
    }
  }
}
</style>
