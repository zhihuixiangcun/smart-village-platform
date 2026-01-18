import { ref } from 'vue';

const toastInstances = [];
const toasts = ref([]);

function createToastElement(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.3s ease;
    background: ${type === 'success' ? '#52c41a' : type === 'error' ? '#ff4d4f' : type === 'info' ? '#1890ff' : '#faad14'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 80%;
    text-align: center;
  `;
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });
  
  return toast;
}

function showToast(message, type = 'info', duration = 3000) {
  const existingToast = toastInstances.find(t => t.message === message && t.type === type);
  if (existingToast) {
    clearTimeout(existingToast.timeout);
    existingToast.element.remove();
  }
  
  const element = createToastElement(message, type);
  const timeout = setTimeout(() => {
    element.style.opacity = '0';
    setTimeout(() => element.remove(), 300);
    const index = toastInstances.findIndex(t => t.element === element);
    if (index > -1) toastInstances.splice(index, 1);
  }, duration);
  
  const toastObj = { message, type, element, timeout };
  toastInstances.push(toastObj);
  toasts.value = [...toastInstances];
  return toastObj;
}

function removeToast(toastObj) {
  if (toastObj && toastObj.element) {
    toastObj.element.style.opacity = '0';
    setTimeout(() => {
      if (toastObj.element && toastObj.element.parentNode) {
        toastObj.element.remove();
      }
    }, 300);
    const index = toastInstances.indexOf(toastObj);
    if (index > -1) toastInstances.splice(index, 1);
    toasts.value = [...toastInstances];
  }
}

export const useToast = () => ({
  success: (message) => showToast(message, 'success'),
  error: (message) => showToast(message, 'error'),
  info: (message) => showToast(message, 'info'),
  warning: (message) => showToast(message, 'warning'),
  remove: removeToast
});

export const state = {
  get toasts() {
    return toasts.value;
  }
};

export { removeToast };

export default {
  success: (message) => showToast(message, 'success'),
  error: (message) => showToast(message, 'error'),
  info: (message) => showToast(message, 'info'),
  warning: (message) => showToast(message, 'warning')
};
