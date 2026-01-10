/**
 * 紧急求助 Composable
 * 处理紧急呼叫逻辑、长按检测、震动反馈
 */
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { EmergencyContact } from '@/types/resident';

export function useEmergency() {
  const isCalling = ref(false);
  const countdown = ref(0);
  const callTimer = ref<NodeJS.Timeout | null>(null);

  /**
   * 触发紧急呼叫
   * 长按3秒后自动触发
   */
  const triggerEmergencyCall = async (contacts: EmergencyContact[]) => {
    if (isCalling.value) return;

    try {
      isCalling.value = true;

      // 震动反馈
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      // 播放提示音（可选）
      // playAlertSound()

      // 显示确认对话框
      await ElMessageBox.confirm('即将拨打紧急联系人电话，是否继续？', '紧急求助确认', {
        confirmButtonText: '立即呼叫',
        cancelButtonText: '取消',
        type: 'warning',
        customClass: 'emergency-dialog',
      });

      // 确认后拨打第一个联系人
      const primaryContact = contacts[0];
      if (primaryContact) {
        // 发送位置信息
        await sendLocationInfo(primaryContact);

        // 拨打电话
        window.location.href = `tel:${primaryContact.phone}`;

        ElMessage.success(`已呼叫 ${primaryContact.name}（${primaryContact.role}）`);

        // 记录操作日志
        await logEmergencyCall(primaryContact);
      }
    } catch (error) {
      // 用户取消或出错
      if (error !== 'cancel') {
        ElMessage.error('呼叫失败: ' + error);
      }
    } finally {
      isCalling.value = false;
      countdown.value = 0;
    }
  };

  /**
   * 开始长按倒计时
   */
  const startCountdown = (callback: () => void, duration: number = 3) => {
    countdown.value = duration;

    const timer = setInterval(() => {
      countdown.value--;

      if (countdown.value <= 0) {
        clearInterval(timer);
        callback();
      }
    }, 1000);

    return timer;
  };

  /**
   * 取消倒计时
   */
  const cancelCountdown = (timer: NodeJS.Timeout) => {
    clearInterval(timer);
    countdown.value = 0;
  };

  /**
   * 发送位置信息（带重试机制和降级方案）
   */
  const sendLocationInfo = async (contact: EmergencyContact, retryCount = 3) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      // 降级方案：发送短信通知位置
      await fallbackLocationSend(contact, new Error('Geolocation not supported'));
      return;
    }

    for (let i = 0; i < retryCount; i++) {
      try {
        const position = await getCurrentPositionWithTimeout(10000);
        const { latitude, longitude, accuracy } = position.coords;

        // 调用API发送位置信息
        const response = await fetch('/api/v1/emergency/location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({
            contactId: contact.id,
            contactName: contact.name,
            latitude,
            longitude,
            accuracy,
            timestamp: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('位置信息已发送:', result);
        return result;
      } catch (error) {
        console.error(`位置发送失败 (尝试 ${i + 1}/${retryCount}):`, error);

        // 最后一次重试失败
        if (i === retryCount - 1) {
          // 降级方案：发送短信或通知
          await fallbackLocationSend(contact, error);
          throw error;
        }

        // 等待后重试（指数退避）
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  };

  /**
   * 带超时的位置获取
   */
  const getCurrentPositionWithTimeout = (timeout: number = 10000): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error('Geolocation timeout'));
      }, timeout);

      navigator.geolocation.getCurrentPosition(
        position => {
          clearTimeout(timer);
          resolve(position);
        },
        error => {
          clearTimeout(timer);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: timeout,
          maximumAge: 0,
        }
      );
    });
  };

  /**
   * 降级方案：位置获取失败时发送通知
   */
  const fallbackLocationSend = async (contact: EmergencyContact, error: Error) => {
    try {
      // 发送通知给后端，由后台发送短信或推送通知
      await fetch('/api/v1/emergency/fallback-notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          contactId: contact.id,
          contactName: contact.name,
          contactPhone: contact.phone,
          message: `紧急求助！村民发起紧急呼叫，但无法获取精确位置信息。请立即联系确认。`,
          timestamp: new Date().toISOString(),
          error: error.message,
        }),
      });

      console.warn('已使用降级方案发送紧急通知');
    } catch (fallbackError) {
      console.error('降级方案也失败:', fallbackError);
      // 最后的降级：直接拨打电话
      window.location.href = `tel:${contact.phone}`;
    }
  };

  /**
   * 获取当前位置
   */
  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  };

  /**
   * 记录紧急呼叫日志
   */
  const logEmergencyCall = async (contact: EmergencyContact) => {
    try {
      // await api.post('/api/v1/emergency/log', {
      //   contactId: contact.id,
      //   contactName: contact.name,
      //   contactRole: contact.role,
      //   timestamp: new Date().toISOString(),
      //   location: await getCurrentPosition().then(p => ({
      //     latitude: p.coords.latitude,
      //     longitude: p.coords.longitude
      //   }))
      // })

      console.log('紧急呼叫已记录:', contact);
    } catch (error) {
      console.error('记录日志失败:', error);
    }
  };

  return {
    isCalling,
    countdown,
    triggerEmergencyCall,
    startCountdown,
    cancelCountdown,
  };
}
