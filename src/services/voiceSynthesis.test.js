/**
 * 语音合成服务单元测试
 * 测试语音合成、播放队列管理、缓存等功能
 */

const VoiceSynthesisService = require('./voiceSynthesis');

describe('VoiceSynthesisService', () => {
  let voiceSynthesis;

  beforeEach(() => {
    // 创建服务实例
    voiceSynthesis = new VoiceSynthesisService();
  });

  describe('初始化', () => {
    test('应该正确初始化服务', () => {
      expect(voiceSynthesis).toBeInstanceOf(VoiceSynthesisService);
      expect(voiceSynthesis.config).toBeDefined();
      expect(voiceSynthesis.voices).toBeDefined();
      expect(voiceSynthesis.queue).toBeDefined();
      expect(voiceSynthesis.cache).toBeDefined();
      expect(voiceSynthesis.stats).toBeDefined();
    });

    test('应该支持多种音色', () => {
      const voices = voiceSynthesis.getSupportedVoices();
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(0);
      expect(voices[0]).toHaveProperty('language');
      expect(voices[0]).toHaveProperty('gender');
      expect(voices[0]).toHaveProperty('name');
    });

    test('应该支持多种音频格式', () => {
      const formats = voiceSynthesis.getSupportedFormats();
      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
      expect(formats[0]).toHaveProperty('format');
      expect(formats[0]).toHaveProperty('encoding');
    });
  });

  describe('getSupportedVoices', () => {
    test('应该返回音色列表', () => {
      const voices = voiceSynthesis.getSupportedVoices();
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(0);
    });

    test('应该包含普通话男声和女声', () => {
      const voices = voiceSynthesis.getSupportedVoices();
      const mandarinMale = voices.find(v => v.language === 'mandarin' && v.gender === 'male');
      const mandarinFemale = voices.find(v => v.language === 'mandarin' && v.gender === 'female');

      expect(mandarinMale).toBeDefined();
      expect(mandarinFemale).toBeDefined();
    });

    test('应该包含粤语', () => {
      const voices = voiceSynthesis.getSupportedVoices();
      const cantonese = voices.find(v => v.language === 'cantonese');
      expect(cantonese).toBeDefined();
    });
  });

  describe('getSupportedFormats', () => {
    test('应该返回支持的格式', () => {
      const formats = voiceSynthesis.getSupportedFormats();
      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
    });

    test('应该包含mp3和wav格式', () => {
      const formats = voiceSynthesis.getSupportedFormats();
      const mp3 = formats.find(f => f.format === 'mp3');
      const wav = formats.find(f => f.format === 'wav');

      expect(mp3).toBeDefined();
      expect(wav).toBeDefined();
    });
  });

  describe('generateCacheKey', () => {
    test('应该生成一致的缓存键', () => {
      const text = '测试文本';
      const options = { voice: 'mandarin', gender: 'female' };

      const key1 = voiceSynthesis.generateCacheKey(text, options);
      const key2 = voiceSynthesis.generateCacheKey(text, options);

      expect(key1).toBe(key2);
    });

    test('不同参数应该生成不同的缓存键', () => {
      const text = '测试文本';
      const options1 = { voice: 'mandarin', gender: 'female' };
      const options2 = { voice: 'cantonese', gender: 'female' };

      const key1 = voiceSynthesis.generateCacheKey(text, options1);
      const key2 = voiceSynthesis.generateCacheKey(text, options2);

      expect(key1).not.toBe(key2);
    });
  });

  describe('getStats', () => {
    test('应该返回初始统计信息', () => {
      const stats = voiceSynthesis.getStats();
      expect(stats.totalSyntheses).toBe(0);
      expect(stats.successfulSyntheses).toBe(0);
      expect(stats.failedSyntheses).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
      expect(stats.queueProcessed).toBe(0);
    });

    test('应该包含队列状态', () => {
      const stats = voiceSynthesis.getStats();
      expect(stats.queueStatus).toBeDefined();
      expect(stats.queueStatus).toHaveProperty('totalItems');
      expect(stats.queueStatus).toHaveProperty('isPlaying');
      expect(stats.queueStatus).toHaveProperty('isPaused');
    });

    test('应该计算成功率', () => {
      const stats = voiceSynthesis.getStats();
      expect(stats.successRate).toBe('0%');
    });
  });

  describe('resetStats', () => {
    test('应该重置统计信息', () => {
      // 模拟一些统计
      voiceSynthesis.stats.totalSyntheses = 10;
      voiceSynthesis.stats.successfulSyntheses = 8;
      voiceSynthesis.stats.failedSyntheses = 2;

      // 重置
      voiceSynthesis.resetStats();

      // 验证
      expect(voiceSynthesis.stats.totalSyntheses).toBe(0);
      expect(voiceSynthesis.stats.successfulSyntheses).toBe(0);
      expect(voiceSynthesis.stats.failedSyntheses).toBe(0);
      expect(voiceSynthesis.stats.cacheHits).toBe(0);
      expect(voiceSynthesis.stats.cacheMisses).toBe(0);
    });
  });

  describe('getQueueStatus', () => {
    test('应该返回队列状态', () => {
      const status = voiceSynthesis.getQueueStatus();
      expect(status).toBeDefined();
      expect(status).toHaveProperty('totalItems');
      expect(status).toHaveProperty('currentIndex');
      expect(status).toHaveProperty('remainingItems');
      expect(status).toHaveProperty('isPlaying');
      expect(status).toHaveProperty('isPaused');
    });

    test('应该返回队列统计', () => {
      const status = voiceSynthesis.getQueueStatus();
      expect(status.queueStats).toBeDefined();
      expect(status.queueStats).toHaveProperty('pending');
      expect(status.queueStats).toHaveProperty('processing');
      expect(status.queueStats).toHaveProperty('completed');
      expect(status.queueStats).toHaveProperty('failed');
    });
  });

  describe('clearQueue', () => {
    test('应该清空队列', () => {
      // 添加一些任务（模拟）
      voiceSynthesis.queue.items = [
        { id: 'task1', text: '测试1', status: 'pending' },
        { id: 'task2', text: '测试2', status: 'pending' }
      ];
      voiceSynthesis.queue.currentIndex = 1;
      voiceSynthesis.queue.paused = true;
      voiceSynthesis.queue.isPlaying = true;

      // 清空
      voiceSynthesis.clearQueue();

      // 验证
      expect(voiceSynthesis.queue.items).toEqual([]);
      expect(voiceSynthesis.queue.currentIndex).toBe(0);
      expect(voiceSynthesis.queue.paused).toBe(false);
      expect(voiceSynthesis.queue.isPlaying).toBe(false);
    });
  });

  describe('delay', () => {
    test('应该延迟指定时间', async () => {
      const start = Date.now();
      await voiceSynthesis.delay(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(95);
      expect(end - start).toBeLessThan(150);
    });
  });

  describe('synthesize - 参数验证', () => {
    test('应该拒绝空文本', async () => {
      await expect(voiceSynthesis.synthesize('')).rejects.toThrow('合成文本不能为空');
    });

    test('应该拒绝过长的文本', async () => {
      const longText = 'a'.repeat(10001);
      await expect(voiceSynthesis.synthesize(longText)).rejects.toThrow('合成文本长度不能超过10000个字符');
    });

    test('应该拒绝null文本', async () => {
      await expect(voiceSynthesis.synthesize(null)).rejects.toThrow('合成文本不能为空');
    });
  });

  describe('healthCheck', () => {
    test('如果没有配置应该返回错误', async () => {
      // 临时清空配置
      const originalConfig = { ...voiceSynthesis.config };
      voiceSynthesis.config.appId = null;
      voiceSynthesis.config.apiKey = null;
      voiceSynthesis.config.apiSecret = null;

      const health = await voiceSynthesis.healthCheck();
      expect(health.status).toBe('error');
      expect(health.message).toContain('配置缺失');

      // 恢复配置
      voiceSynthesis.config = originalConfig;
    });

    test('如果有配置应该返回健康', async () => {
      // 设置配置
      voiceSynthesis.config.appId = 'test_app_id';
      voiceSynthesis.config.apiKey = 'test_api_key';
      voiceSynthesis.config.apiSecret = 'test_api_secret';

      const health = await voiceSynthesis.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.config.hasAppId).toBe(true);
      expect(health.config.cacheEnabled).toBe(true);
      expect(health.config.queueEnabled).toBe(true);
    });
  });

  describe('队列操作', () => {
    test('pauseQueue应该标记暂停', () => {
      voiceSynthesis.queue.isPlaying = true;

      voiceSynthesis.pauseQueue();

      expect(voiceSynthesis.queue.paused).toBe(true);
    });

    test('resumeQueue应该恢复播放', () => {
      voiceSynthesis.queue.paused = true;
      voiceSynthesis.queue.isPlaying = true;

      voiceSynthesis.resumeQueue();

      expect(voiceSynthesis.queue.paused).toBe(false);
    });

    test('skipCurrent应该增加当前索引', () => {
      voiceSynthesis.queue.isPlaying = true;
      const initialIndex = voiceSynthesis.queue.currentIndex;

      voiceSynthesis.skipCurrent();

      expect(voiceSynthesis.queue.currentIndex).toBe(initialIndex + 1);
    });
  });

  describe('缓存管理', () => {
    test('clearExpiredCache应该清空缓存', () => {
      // 添加一些缓存
      voiceSynthesis.cache.set('key1', Buffer.from('test1'));
      voiceSynthesis.cache.set('key2', Buffer.from('test2'));

      expect(voiceSynthesis.cache.size).toBe(2);

      // 清理
      voiceSynthesis.clearExpiredCache();

      expect(voiceSynthesis.cache.size).toBe(0);
    });
  });

  describe('事件系统', () => {
    test('应该发出合成完成事件', (done) => {
      voiceSynthesis.on('synthesis-complete', (data) => {
        expect(data).toHaveProperty('text');
        expect(data).toHaveProperty('voice');
        done();
      });

      // 手动触发事件
      voiceSynthesis.emit('synthesis-complete', {
        text: '测试',
        voice: 'mandarin',
        duration: 100
      });
    });

    test('应该发出队列变更事件', (done) => {
      voiceSynthesis.on('queue-item-added', (data) => {
        expect(data).toHaveProperty('taskId');
        expect(data).toHaveProperty('queueLength');
        done();
      });

      // 手动触发事件
      voiceSynthesis.emit('queue-item-added', {
        taskId: 'task_123',
        queueLength: 1
      });
    });
  });

  describe('destroy', () => {
    test('应该清理所有资源', () => {
      // 添加一些数据
      voiceSynthesis.cache.set('key1', Buffer.from('test'));
      voiceSynthesis.queue.items = [{ id: 'task1', text: 'test' }];
      voiceSynthesis.queue.isPlaying = true;

      // 添加事件监听器
      voiceSynthesis.on('test', () => {});

      // 销毁
      voiceSynthesis.destroy();

      // 验证清理
      expect(voiceSynthesis.cache.size).toBe(0);
      expect(voiceSynthesis.queue.items).toEqual([]);
      expect(voiceSynthesis.queue.isPlaying).toBe(false);
    });
  });

  describe('集成测试', () => {
    test('应该完成完整的工作流程', async () => {
      // 1. 健康检查
      voiceSynthesis.config.appId = 'test';
      voiceSynthesis.config.apiKey = 'test';
      voiceSynthesis.config.apiSecret = 'test';
      const health = await voiceSynthesis.healthCheck();
      expect(health.status).toBe('healthy');

      // 2. 获取支持的音色
      const voices = voiceSynthesis.getSupportedVoices();
      expect(voices.length).toBeGreaterThan(0);

      // 3. 获取支持的格式
      const formats = voiceSynthesis.getSupportedFormats();
      expect(formats.length).toBeGreaterThan(0);

      // 4. 获取统计信息
      const stats = voiceSynthesis.getStats();
      expect(stats.totalSyntheses).toBe(0);

      // 5. 获取队列状态
      const queueStatus = voiceSynthesis.getQueueStatus();
      expect(queueStatus.totalItems).toBe(0);

      // 6. 清理临时文件
      const cleanupResult = await voiceSynthesis.cleanupTempFiles();
      expect(cleanupResult.success).toBe(true);
    });
  });

  describe('配置验证', () => {
    test('音色配置应该完整', () => {
      const languages = Object.keys(voiceSynthesis.voices);

      languages.forEach(language => {
        const genders = voiceSynthesis.voices[language];
        expect(genders).toBeDefined();

        const genderKeys = Object.keys(genders);
        genderKeys.forEach(gender => {
          const voice = genders[gender];
          expect(voice).toHaveProperty('name');
          expect(voice).toHaveProperty('gender');
          expect(voice).toHaveProperty('accent');
        });
      });
    });

    test('音频格式配置应该完整', () => {
      const formats = Object.keys(voiceSynthesis.audioFormats);

      formats.forEach(format => {
        const config = voiceSynthesis.audioFormats[format];
        expect(config).toHaveProperty('encoding');
        expect(config).toHaveProperty('aue');
      });
    });
  });

  describe('队列状态管理', () => {
    test('正确计算剩余任务数', () => {
      voiceSynthesis.queue.items = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'pending' },
        { id: '3', status: 'pending' }
      ];
      voiceSynthesis.queue.currentIndex = 1;

      const status = voiceSynthesis.getQueueStatus();
      expect(status.remainingItems).toBe(2);
    });

    test('正确统计各状态任务数', () => {
      voiceSynthesis.queue.items = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending' },
        { id: '3', status: 'processing' },
        { id: '4', status: 'completed' },
        { id: '5', status: 'failed' }
      ];

      const status = voiceSynthesis.getQueueStatus();
      expect(status.queueStats.pending).toBe(2);
      expect(status.queueStats.processing).toBe(1);
      expect(status.queueStats.completed).toBe(1);
      expect(status.queueStats.failed).toBe(1);
    });
  });
});

// 运行测试
if (require.main === module) {
  console.log('运行语音合成服务测试...\n');

  // 简单的测试运行器
  const tests = [];
  let passed = 0;
  let failed = 0;

  function describe(name, fn) {
    console.log(`\n=== ${name} ===`);
    fn();
  }

  function test(name, fn) {
    tests.push({ name, fn });
  }

  function expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, but got ${actual}`);
        }
      },
      toBeDefined: () => {
        if (actual === undefined || actual === null) {
          throw new Error(`Expected to be defined, but got ${actual}`);
        }
      },
      toBeNull: () => {
        if (actual !== null) {
          throw new Error(`Expected null, but got ${actual}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected truthy, but got ${actual}`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected falsy, but got ${actual}`);
        }
      },
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected > ${expected}, but got ${actual}`);
        }
      },
      toBeLessThan: (expected) => {
        if (actual >= expected) {
          throw new Error(`Expected < ${expected}, but got ${actual}`);
        }
      },
      toBeGreaterThanOrEqual: (expected) => {
        if (actual < expected) {
          throw new Error(`Expected >= ${expected}, but got ${actual}`);
        }
      },
      toHaveProperty: (prop) => {
        if (!actual || !actual.hasOwnProperty(prop)) {
          throw new Error(`Expected to have property ${prop}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
        }
      },
      toMatch: (pattern) => {
        if (!pattern.test(actual)) {
          throw new Error(`Expected to match ${pattern}, but got ${actual}`);
        }
      },
      toContain: (expected) => {
        if (!actual || !actual.includes(expected)) {
          throw new Error(`Expected to contain ${expected}`);
        }
      },
      toThrow: (expectedError) => {
        return {
          catch: async (fn) => {
            try {
              await fn();
              throw new Error(`Expected to throw ${expectedError}, but no error was thrown`);
            } catch (error) {
              if (!error.message.includes(expectedError)) {
                throw new Error(`Expected error message to include "${expectedError}", but got "${error.message}"`);
              }
            }
          }
        };
      },
      not: {
        toBe: (expected) => {
          if (actual === expected) {
            throw new Error(`Expected not ${expected}, but got ${actual}`);
          }
        }
      }
    };
  }

  async function runTests() {
    for (const test of tests) {
      try {
        // 如果测试返回Promise，等待它完成
        const result = test.fn();
        if (result && typeof result.then === 'function') {
          await result;
        }
        passed++;
        console.log(`✓ ${test.name}`);
      } catch (error) {
        failed++;
        console.log(`✗ ${test.name}`);
        console.error(`  ${error.message}`);
      }
    }

    console.log(`\n========================================`);
    console.log(`总计: ${tests.length}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${failed}`);
    console.log(`成功率: ${((passed / tests.length) * 100).toFixed(2)}%`);
    console.log(`========================================`);
  }

  // 运行测试
  runTests().then(() => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

module.exports = { describe, test };
