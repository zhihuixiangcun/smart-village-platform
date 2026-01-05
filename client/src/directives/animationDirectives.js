import { useMicroAnimations } from '@/composables/useMicroAnimations';

// 全局动画实例
const {
  animate,
  buttonClick,
  buttonHover,
  buttonUnhover,
  cardHover,
  cardUnhover,
  inputFocus,
  inputBlur,
  highlightTableRow,
  fadeIn,
  fadeOut,
  slideInLeft,
  slideInRight,
  shakeError,
  showSuccess
} = useMicroAnimations();

/**
 * 动画指令
 * 用法: v-animate="'fadeIn'" 或 v-animate="{ name: 'fadeIn', trigger: 'mount' }"
 */
export const animateDirective = {
  mounted(el, binding) {
    const { value } = binding;

    if (typeof value === 'string') {
      // 简单用法: v-animate="'fadeIn'"
      executeAnimation(el, value, 'mount');
    } else if (typeof value === 'object') {
      // 复杂用法: v-animate="{ name: 'fadeIn', trigger: 'mount', delay: 200 }"
      const { name, trigger = 'mount', delay = 0 } = value;

      if (trigger === 'mount') {
        if (delay > 0) {
          setTimeout(() => executeAnimation(el, name), delay);
        } else {
          executeAnimation(el, name);
        }
      }
    }
  },

  updated(el, binding) {
    const { value, oldValue } = binding;

    // 检测数据变化触发动画
    if (typeof value === 'object' && value.trigger === 'update' && value !== oldValue) {
      executeAnimation(el, value.name, 'update');
    }
  }
};

/**
 * 按钮动画指令
 * 自动添加点击和悬停效果
 */
export const buttonAnimateDirective = {
  mounted(el) {
    // 点击动画
    el.addEventListener('click', () => {
      buttonClick(el);
    });

    // 悬停动画
    el.addEventListener('mouseenter', () => {
      buttonHover(el);
    });

    el.addEventListener('mouseleave', () => {
      buttonUnhover(el);
    });

    // 存储清理函数
    el._buttonAnimationCleanup = () => {
      el.removeEventListener('click', buttonClick);
      el.removeEventListener('mouseenter', buttonHover);
      el.removeEventListener('mouseleave', buttonUnhover);
    };
  },

  unmounted(el) {
    if (el._buttonAnimationCleanup) {
      el._buttonAnimationCleanup();
    }
  }
};

/**
 * 卡片动画指令
 * 自动添加悬停效果
 */
export const cardAnimateDirective = {
  mounted(el) {
    el.addEventListener('mouseenter', () => {
      cardHover(el);
    });

    el.addEventListener('mouseleave', () => {
      cardUnhover(el);
    });

    el._cardAnimationCleanup = () => {
      el.removeEventListener('mouseenter', cardHover);
      el.removeEventListener('mouseleave', cardUnhover);
    };
  },

  unmounted(el) {
    if (el._cardAnimationCleanup) {
      el._cardAnimationCleanup();
    }
  }
};

/**
 * 输入框动画指令
 * 自动添加聚焦效果
 */
export const inputAnimateDirective = {
  mounted(el) {
    // 确保是输入元素
    const inputElement = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'
      ? el
      : el.querySelector('input, textarea');

    if (inputElement) {
      inputElement.addEventListener('focus', () => {
        inputFocus(inputElement);
      });

      inputElement.addEventListener('blur', () => {
        inputBlur(inputElement);
      });

      el._inputAnimationCleanup = () => {
        inputElement.removeEventListener('focus', inputFocus);
        inputElement.removeEventListener('blur', inputBlur);
      };
    }
  },

  unmounted(el) {
    if (el._inputAnimationCleanup) {
      el._inputAnimationCleanup();
    }
  }
};

/**
 * 表格行动画指令
 * 点击时高亮行
 */
export const tableRowAnimateDirective = {
  mounted(el) {
    el.addEventListener('click', () => {
      highlightTableRow(el);
    });

    el._tableRowAnimationCleanup = () => {
      el.removeEventListener('click', highlightTableRow);
    };
  },

  unmounted(el) {
    if (el._tableRowAnimationCleanup) {
      el._tableRowAnimationCleanup();
    }
  }
};

/**
 * 滚动触发动画指令
 * 元素进入视口时触发动画
 */
export const scrollAnimateDirective = {
  mounted(el, binding) {
    const { value = 'fadeIn' } = binding;
    const animationName = typeof value === 'string' ? value : value.name;
    const threshold = typeof value === 'object' ? value.threshold || 0.1 : 0.1;
    const once = typeof value === 'object' ? value.once !== false : true;

    // 创建 Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            executeAnimation(entry.target, animationName);

            if (once) {
              observer.unobserve(entry.target);
            }
          }
        });
      },
      { threshold }
    );

    observer.observe(el);

    // 存储观察器以便清理
    el._scrollObserver = observer;
  },

  unmounted(el) {
    if (el._scrollObserver) {
      el._scrollObserver.disconnect();
    }
  }
};

/**
 * 数字计数动画指令
 * 数字变化时自动播放计数动画
 */
export const countAnimateDirective = {
  mounted(el, binding) {
    el._previousValue = 0;
  },

  updated(el, binding) {
    const newValue = parseFloat(binding.value) || 0;
    const oldValue = el._previousValue || 0;

    if (newValue !== oldValue) {
      // 播放数字变化动画
      const startValue = oldValue;
      const endValue = newValue;
      const duration = Math.min(1000, Math.abs(endValue - startValue) * 50);

      animateNumber(el, startValue, endValue, duration);
      el._previousValue = newValue;
    }
  }
};

// 辅助函数
function executeAnimation(el, animationName, trigger = 'mount') {
  const animationMap = {
    fadeIn,
    fadeOut,
    slideInLeft,
    slideInRight,
    shakeError,
    showSuccess,
    buttonClick,
    cardHover,
    highlightTableRow
  };

  const animationFn = animationMap[animationName];
  if (animationFn) {
    animationFn(el);
  } else {
    // 使用通用 animate 方法
    animate(el, animationName);
  }
}

// 数字计数动画的辅助函数
function animateNumber(element, fromValue, toValue, duration = 1000) {
  if (!element) return;

  const startTime = Date.now();
  const difference = toValue - fromValue;

  const updateNumber = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // 使用缓动函数
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const currentValue = Math.round(fromValue + difference * easeOutQuart);

    element.textContent = currentValue.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    }
  };

  requestAnimationFrame(updateNumber);
}

// Vue 插件安装函数
export function installAnimationDirectives(app) {
  app.directive('animate', animateDirective);
  app.directive('button-animate', buttonAnimateDirective);
  app.directive('card-animate', cardAnimateDirective);
  app.directive('input-animate', inputAnimateDirective);
  app.directive('table-row-animate', tableRowAnimateDirective);
  app.directive('scroll-animate', scrollAnimateDirective);
  app.directive('count-animate', countAnimateDirective);
}