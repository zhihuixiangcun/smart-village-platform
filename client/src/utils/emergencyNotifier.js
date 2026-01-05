/**
 * Emergency Call Notification Utility
 *
 * Provides comprehensive notification capabilities for emergency calls:
 * - Browser notifications
 * - Audio alerts
 * - Vibration (mobile)
 * - Offline support
 */

class EmergencyNotifier {
  constructor() {
    this.permission = 'default';
    this.sounds = {
      emergency: '/sounds/emergency.mp3',
      urgent: '/sounds/urgent.mp3',
      normal: '/sounds/normal.mp3',
      response: '/sounds/response.mp3'
    };
    this.audioContext = null;
    this.isMuted = false;
    this.offlineQueue = [];
    this.isOnline = navigator.onLine;
    this.init();
  }

  /**
   * Initialize the notifier
   */
  async init() {
    // Request notification permission
    if ('Notification' in window) {
      this.permission = await this.requestPermission();
    }

    // Initialize Audio Context
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
    }

    // Setup online/offline listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Load offline queue from localStorage
    this.loadOfflineQueue();
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return 'denied';
  }

  /**
   * Show notification
   */
  showNotification(title, options = {}) {
    const defaultOptions = {
      icon: '/notification-icon.png',
      badge: '/badge-icon.png',
      tag: 'emergency-notification',
      requireInteraction: false,
      silent: false
    };

    const finalOptions = { ...defaultOptions, ...options };

    // If offline, queue the notification
    if (!this.isOnline) {
      this.queueOfflineNotification(title, finalOptions);
      return;
    }

    // Show browser notification
    if (this.permission === 'granted') {
      try {
        const notification = new Notification(title, finalOptions);

        // Handle notification click
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          notification.close();

          // Call custom click handler if provided
          if (finalOptions.onClick) {
            finalOptions.onClick();
          }
        };

        // Auto-close after timeout
        if (finalOptions.timeout) {
          setTimeout(() => {
            notification.close();
          }, finalOptions.timeout);
        }

        return notification;
      } catch (error) {
        console.error('Failed to show notification:', error);
      }
    }

    // Fallback to in-app notification
    this.showInAppNotification(title, finalOptions);
  }

  /**
   * Show in-app notification (fallback)
   */
  showInAppNotification(title, options) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'in-app-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-header">
          <img src="${options.icon}" alt="" class="notification-icon">
          <h4>${title}</h4>
        </div>
        ${options.body ? `<p class="notification-body">${options.body}</p>` : ''}
      </div>
      <button class="notification-close">&times;</button>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 15px;
      min-width: 300px;
      max-width: 400px;
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
    `;

    // Add to DOM
    document.body.appendChild(notification);

    // Handle close
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.onclick = () => {
      notification.remove();
    };

    // Auto-close
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, options.timeout || 5000);

    return notification;
  }

  /**
   * Play sound
   */
  playSound(type = 'normal', options = {}) {
    if (this.isMuted) return;

    const {
      volume = 1.0,
      loop = false,
      duration = null
    } = options;

    const soundFile = this.sounds[type];

    if (!soundFile) {
      console.warn(`Sound type "${type}" not found`);
      return;
    }

    // Create audio element
    const audio = new Audio(soundFile);
    audio.volume = Math.min(Math.max(volume, 0), 1);
    audio.loop = loop;

    // Play sound
    audio.play().catch(error => {
      console.error('Failed to play sound:', error);

      // Fallback to beep sound using AudioContext
      this.playBeep(type);
    });

    // Auto-stop after duration
    if (duration && !loop) {
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, duration);
    }

    return audio;
  }

  /**
   * Play beep sound (fallback)
   */
  playBeep(type) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Different frequencies for different urgency levels
    const frequencies = {
      emergency: 800,
      urgent: 600,
      normal: 400,
      response: 500
    };

    oscillator.frequency.value = frequencies[type] || 400;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + 0.5
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.5);
  }

  /**
   * Vibrate device (mobile only)
   */
  vibrate(pattern = [200, 100, 200]) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  /**
   * Show emergency alert with all notifications
   */
  emergencyAlert(title, message, options = {}) {
    const {
      sound = 'emergency',
      vibration = [500, 200, 500],
      requireInteraction = true,
      ...rest
    } = options;

    // Show notification
    this.showNotification(title, {
      body: message,
      requireInteraction,
      ...rest
    });

    // Play sound
    this.playSound(sound, {
      loop: true,
      volume: 1.0
    });

    // Vibrate
    this.vibrate(vibration);
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications() {
    if ('Notification' in window && this.permission === 'granted') {
      // Close all browser notifications
      // Note: There's no direct API to close all notifications
      // Notifications need to be stored and closed individually
    }

    // Remove all in-app notifications
    const inAppNotifications = document.querySelectorAll('.in-app-notification');
    inAppNotifications.forEach(notification => {
      notification.remove();
    });
  }

  /**
   * Mute all sounds
   */
  mute() {
    this.isMuted = true;
  }

  /**
   * Unmute sounds
   */
  unmute() {
    this.isMuted = false;
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * Queue offline notification
   */
  queueOfflineNotification(title, options) {
    const notification = {
      id: Date.now(),
      title,
      options,
      timestamp: new Date().toISOString()
    };

    this.offlineQueue.push(notification);
    this.saveOfflineQueue();

    // Show offline indicator
    this.showOfflineIndicator();
  }

  /**
   * Save offline queue to localStorage
   */
  saveOfflineQueue() {
    try {
      localStorage.setItem(
        'emergency_offline_queue',
        JSON.stringify(this.offlineQueue)
      );
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Load offline queue from localStorage
   */
  loadOfflineQueue() {
    try {
      const saved = localStorage.getItem('emergency_offline_queue');
      if (saved) {
        this.offlineQueue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.offlineQueue = [];
    }
  }

  /**
   * Show offline indicator
   */
  showOfflineIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'offline-indicator';
    indicator.textContent = `离线: ${this.offlineQueue.length} 条通知待发送`;
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #f56c6c;
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    `;

    document.body.appendChild(indicator);

    setTimeout(() => {
      indicator.remove();
    }, 3000);
  }

  /**
   * Handle online event
   */
  handleOnline() {
    this.isOnline = true;

    // Sync offline notifications
    this.syncOfflineNotifications();

    // Show online notification
    this.showNotification('网络已连接', {
      body: '已恢复在线状态',
      icon: '/online-icon.png'
    });
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    this.isOnline = false;

    this.showNotification('网络已断开', {
      body: '通知将在恢复连接后发送',
      icon: '/offline-icon.png',
      requireInteraction: true
    });
  }

  /**
   * Sync offline notifications
   */
  async syncOfflineNotifications() {
    if (this.offlineQueue.length === 0) return;

    // In a real implementation, you would send these to your server
    // For now, just show them
    const notifications = [...this.offlineQueue];
    this.offlineQueue = [];
    this.saveOfflineQueue();

    for (const notification of notifications) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.showNotification(notification.title, notification.options);
    }
  }

  /**
   * Get notification permission status
   */
  getPermission() {
    return this.permission;
  }

  /**
   * Check if notifications are supported
   */
  isSupported() {
    return 'Notification' in window;
  }

  /**
   * Create notification channel (for future PWA support)
   */
  createChannel(channelId, config = {}) {
    // This is for Service Worker / PWA notifications
    if ('serviceWorker' in navigator && 'Notification' in window) {
      navigator.serviceWorker.ready.then(registration => {
        // Channel configuration would go here
        console.log(`Notification channel "${channelId}" configured`);
      });
    }
  }

  /**
   * Register Service Worker for notifications (PWA)
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(
          '/service-worker.js'
        );

        console.log('Service Worker registered:', registration);

        // Request notification permission
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          this.permission = permission;
        }

        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Destroy the notifier
   */
  destroy() {
    // Clear all notifications
    this.clearAllNotifications();

    // Remove event listeners
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Create singleton instance
const emergencyNotifier = new EmergencyNotifier();

// Export both class and instance
export default emergencyNotifier;
export { EmergencyNotifier };

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .in-app-notification {
    animation: slideIn 0.3s ease-out;
  }

  .notification-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .notification-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .notification-icon {
    width: 24px;
    height: 24px;
    border-radius: 4px;
  }

  .notification-header h4 {
    margin: 0;
    font-size: 16px;
    color: #303133;
  }

  .notification-body {
    margin: 0;
    font-size: 14px;
    color: #606266;
    line-height: 1.5;
  }

  .notification-close {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #909399;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .notification-close:hover {
    color: #303133;
  }
`;

document.head.appendChild(style);