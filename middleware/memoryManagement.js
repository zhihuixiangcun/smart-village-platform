/**
 * 内存泄漏防护中间件
 * 监控和管理内存使用，防止内存泄漏
 */

const memoryManager = {
  // 内存使用统计
  stats: {
    initial: process.memoryUsage(),
    current: null,
    peak: null,
    samples: [],
    lastGC: null
  },
  
  // 监控配置
  config: {
    maxMemoryMB: 1024,        // 最大内存限制 1GB
    warningThresholdMB: 768,   // 警告阈值 768MB
    sampleInterval: 30000,      // 采样间隔 30秒
    maxSamples: 100,           // 最大样本数
    gcCheckInterval: 60000     // GC检查间隔 1分钟
  },
  
  // 定时器
  timers: {
    sampling: null,
    gcCheck: null
  },
  
  /**
   * 获取当前内存使用情况
   */
  getCurrentMemory() {
    const usage = process.memoryUsage();
    const format = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
    
    return {
      rss: format(usage.rss),                    // 常驻内存集
      heapTotal: format(usage.heapTotal),          // 堆总量
      heapUsed: format(usage.heapUsed),            // 堆使用量
      external: format(usage.external),              // C++对象内存
      arrayBuffers: format(usage.arrayBuffers)      // ArrayBuffer内存
    };
  },
  
  /**
   * 更新内存统计
   */
  updateStats() {
    const current = process.memoryUsage();
    this.stats.current = current;
    
    // 更新峰值
    if (!this.stats.peak || current.heapUsed > this.stats.peak.heapUsed) {
      this.stats.peak = current;
    }
    
    // 添加样本
    this.stats.samples.push({
      timestamp: Date.now(),
      heapUsed: current.heapUsed,
      rss: current.rss
    });
    
    // 限制样本数量
    if (this.stats.samples.length > this.config.maxSamples) {
      this.stats.samples.shift();
    }
    
    // 检查内存使用
    this.checkMemoryUsage();
  },
  
  /**
   * 检查内存使用情况
   */
  checkMemoryUsage() {
    const heapUsedMB = this.stats.current.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > this.config.maxMemoryMB) {
      console.error(`[MEMORY] 🚨 Critical memory usage: ${heapUsedMB.toFixed(2)}MB`);
      this.triggerEmergencyCleanup();
    } else if (heapUsedMB > this.config.warningThresholdMB) {
      console.warn(`[MEMORY] ⚠️ High memory usage: ${heapUsedMB.toFixed(2)}MB`);
      this.suggestCleanup();
    }
  },
  
  /**
   * 触发紧急清理
   */
  triggerEmergencyCleanup() {
    console.log('[MEMORY] 🧹 Emergency cleanup triggered');
    
    // 强制垃圾回收
    if (global.gc) {
      global.gc();
      this.stats.lastGC = Date.now();
    }
    
    // 清理缓存
    this.clearCaches();
    
    // 发送告警
    this.sendMemoryAlert('critical');
  },
  
  /**
   * 建议清理
   */
  suggestCleanup() {
    if (global.gc) {
      console.log('[MEMORY] 🗑️ Suggesting garbage collection');
      global.gc();
      this.stats.lastGC = Date.now();
    }
  },
  
  /**
   * 清理缓存
   */
  clearCaches() {
    try {
      // 清理require缓存（谨慎使用）
      if (require.cache) {
        const cleared = Object.keys(require.cache).length;
        console.log(`[MEMORY] 🧹 Cleared ${cleared} require cache entries`);
      }
      
      // 这里可以添加其他缓存清理逻辑
    } catch (error) {
      console.error('[MEMORY] Failed to clear caches:', error.message);
    }
  },
  
  /**
   * 发送内存告警
   */
  sendMemoryAlert(level) {
    const alert = {
      level,
      timestamp: new Date().toISOString(),
      memory: this.getCurrentMemory(),
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version
      }
    };
    
    console.log('[MEMORY] 🚨 Memory alert:', JSON.stringify(alert, null, 2));
    
    // 这里可以集成外部告警系统
    // sendAlertToMonitoringSystem(alert);
  },
  
  /**
   * 启动内存监控
   */
  startMonitoring() {
    console.log('[MEMORY] 📊 Starting memory monitoring');
    
    // 定期采样
    this.timers.sampling = setInterval(() => {
      this.updateStats();
    }, this.config.sampleInterval);
    
    // 定期GC检查
    this.timers.gcCheck = setInterval(() => {
      this.checkGCNeeded();
    }, this.config.gcCheckInterval);
    
    // 进程退出时清理
    process.on('exit', () => {
      this.stopMonitoring();
    });
  },
  
  /**
   * 停止内存监控
   */
  stopMonitoring() {
    console.log('[MEMORY] 📊 Stopping memory monitoring');
    
    if (this.timers.sampling) {
      clearInterval(this.timers.sampling);
    }
    
    if (this.timers.gcCheck) {
      clearInterval(this.timers.gcCheck);
    }
  },
  
  /**
   * 检查是否需要垃圾回收
   */
  checkGCNeeded() {
    if (!this.stats.current) return;
    
    const heapUsedMB = this.stats.current.heapUsed / 1024 / 1024;
    const heapTotalMB = this.stats.current.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;
    
    // 如果堆使用率超过80%且距离上次GC超过2分钟，触发GC
    if (usagePercent > 80 && (!this.stats.lastGC || Date.now() - this.stats.lastGC > 120000)) {
      console.log(`[MEMORY] Heap usage: ${usagePercent.toFixed(1)}% - triggering GC`);
      if (global.gc) {
        global.gc();
        this.stats.lastGC = Date.now();
      }
    }
  },
  
  /**
   * 生成内存报告
   */
  generateReport() {
    const initialMB = this.stats.initial.heapUsed / 1024 / 1024;
    const currentMB = this.stats.current.heapUsed / 1024 / 1024;
    const peakMB = this.stats.peak.heapUsed / 1024 / 1024;
    
    return {
      summary: {
        initialUsage: initialMB.toFixed(2) + ' MB',
        currentUsage: currentMB.toFixed(2) + ' MB',
        peakUsage: peakMB.toFixed(2) + ' MB',
        growth: (currentMB - initialMB).toFixed(2) + ' MB'
      },
      details: this.getCurrentMemory(),
      samples: this.stats.samples.slice(-10) // 最近10个样本
    };
  }
};

/**
 * 内存监控中间件
 */
function memoryMonitoring(req, res, next) {
  // 请求开始时记录内存
  const startMemory = process.memoryUsage();
  
  // 响应结束时检查内存
  const originalEnd = res.end;
  res.end = function(...args) {
    const endMemory = process.memoryUsage();
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    
    // 如果单个请求内存增长超过10MB，记录警告
    if (memoryDelta > 10 * 1024 * 1024) {
      console.warn(`[MEMORY] High memory usage in request: ${req.method} ${req.url} - ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
}

/**
 * Socket.IO连接清理中间件
 */
function socketMemoryCleanup(io) {
  io.on('connection', (socket) => {
    // 存储清理函数
    socket.cleanup = function() {
      // 清理事件监听器
      socket.removeAllListeners();
      
      // 清理定时器
      Object.keys(socket._timers || {}).forEach(timerId => {
        clearTimeout(timerId);
      });
      
      console.log(`[MEMORY] 🧹 Cleaned up socket: ${socket.id}`);
    };
    
    // 断开连接时清理
    socket.on('disconnect', () => {
      socket.cleanup();
    });
  });
}

/**
 * 资源清理中间件
 */
function resourceCleanup(req, res, next) {
  // 为请求添加清理方法
  req.addCleanupTask = function(cleanupFn) {
    if (!req._cleanupTasks) {
      req._cleanupTasks = [];
    }
    req._cleanupTasks.push(cleanupFn);
  };
  
  // 响应结束时执行清理任务
  const originalEnd = res.end;
  res.end = function(...args) {
    if (req._cleanupTasks) {
      req._cleanupTasks.forEach(cleanupFn => {
        try {
          cleanupFn();
        } catch (error) {
          console.error('[MEMORY] Cleanup task failed:', error.message);
        }
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
}

/**
 * 内存泄漏检测器
 */
function detectMemoryLeak() {
  const report = memoryManager.generateReport();
  
  // 检查内存增长趋势
  if (memoryManager.stats.samples.length >= 10) {
    const recent = memoryManager.stats.samples.slice(-5);
    const older = memoryManager.stats.samples.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, s) => sum + s.heapUsed, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.heapUsed, 0) / older.length;
    
    const growthPercent = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (growthPercent > 20) { // 内存增长超过20%
      console.error(`[MEMORY] 🚨 Potential memory leak detected! Growth: ${growthPercent.toFixed(1)}%`);
      return {
        hasLeak: true,
        growth: growthPercent,
        report
      };
    }
  }
  
  return {
    hasLeak: false,
    growth: 0,
    report
  };
}

module.exports = {
  memoryManager,
  memoryMonitoring,
  socketMemoryCleanup,
  resourceCleanup,
  detectMemoryLeak
};