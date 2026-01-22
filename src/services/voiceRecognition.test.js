/**
 * 语音识别服务单元测试
 * 测试服务的基本功能和错误处理
 */

const VoiceRecognitionService = require('./voiceRecognition');
const fs = require('fs');
const path = require('path');

describe('VoiceRecognitionService', () => {
  let voiceRecognition;

  beforeEach(() => {
    // 创建服务实例
    voiceRecognition = new VoiceRecognitionService();
  });

  describe('初始化', () => {
    test('应该正确初始化服务', () => {
      expect(voiceRecognition).toBeInstanceOf(VoiceRecognitionService);
      expect(voiceRecognition.config).toBeDefined();
      expect(voiceRecognition.dialects).toBeDefined();
      expect(voiceRecognition.retryConfig).toBeDefined();
    });

    test('应该支持22种方言', () => {
      const dialects = voiceRecognition.getSupportedDialects();
      expect(dialects.length).toBe(22);
      expect(dialects[0]).toHaveProperty('key');
      expect(dialects[0]).toHaveProperty('name');
      expect(dialects[0]).toHaveProperty('accent');
    });
  });

  describe('getSupportedDialects', () => {
    test('应该返回方言列表', () => {
      const dialects = voiceRecognition.getSupportedDialects();
      expect(Array.isArray(dialects)).toBe(true);
      expect(dialects.length).toBeGreaterThan(0);
    });

    test('应该包含普通话和粤语', () => {
      const dialects = voiceRecognition.getSupportedDialects();
      const mandarin = dialects.find(d => d.key === 'mandarin');
      const cantonese = dialects.find(d => d.key === 'cantonese');

      expect(mandarin).toBeDefined();
      expect(mandarin.name).toBe('普通话');
      expect(cantonese).toBeDefined();
      expect(cantonese.name).toBe('粤语');
    });
  });

  describe('getStats', () => {
    test('应该返回初始统计信息', () => {
      const stats = voiceRecognition.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.retryCount).toBe(0);
      expect(stats.successRate).toBe('0%');
      expect(stats.averageRetries).toBe('0');
    });

    test('应该包含方言使用统计', () => {
      const stats = voiceRecognition.getStats();
      expect(stats.dialectUsage).toBeDefined();
      expect(typeof stats.dialectUsage).toBe('object');
    });
  });

  describe('resetStats', () => {
    test('应该重置统计信息', () => {
      // 模拟一些统计
      voiceRecognition.stats.totalRequests = 10;
      voiceRecognition.stats.successfulRequests = 8;
      voiceRecognition.stats.failedRequests = 2;

      // 重置
      voiceRecognition.resetStats();

      // 验证
      expect(voiceRecognition.stats.totalRequests).toBe(0);
      expect(voiceRecognition.stats.successfulRequests).toBe(0);
      expect(voiceRecognition.stats.failedRequests).toBe(0);
    });
  });

  describe('isRetryableError', () => {
    test('应该识别可重试的网络错误', () => {
      const retryableErrors = [
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'EPIPE',
        'network error'
      ];

      retryableErrors.forEach(error => {
        const isRetryable = voiceRecognition.isRetryableError(error);
        expect(isRetryable).toBe(true);
      });
    });

    test('不应该识别不可重试的错误', () => {
      const nonRetryableErrors = [
        'authentication failed',
        'invalid credentials',
        'bad request'
      ];

      nonRetryableErrors.forEach(error => {
        const isRetryable = voiceRecognition.isRetryableError(error);
        expect(isRetryable).toBe(false);
      });
    });
  });

  describe('generateAuthUrl', () => {
    test('应该生成有效的WebSocket URL', () => {
      const url = voiceRecognition.generateAuthUrl();
      expect(url).toBeDefined();
      expect(url).toMatch(/^wss:\/\/iat-api\.xfyun\.cn\/v2\/iat/);
      expect(url).toContain('authorization=');
      expect(url).toContain('date=');
      expect(url).toContain('host=');
    });
  });

  describe('updateDialectUsage', () => {
    test('应该更新方言使用统计', () => {
      const initialUsage = voiceRecognition.stats.dialectUsage['mandarin'] || 0;

      voiceRecognition.updateDialectUsage('mandarin');
      voiceRecognition.updateDialectUsage('mandarin');

      expect(voiceRecognition.stats.dialectUsage['mandarin']).toBe(initialUsage + 2);
    });
  });

  describe('healthCheck', () => {
    test('如果没有配置应该返回错误', async () => {
      // 临时清空配置
      const originalConfig = { ...voiceRecognition.config };
      voiceRecognition.config.appId = null;
      voiceRecognition.config.apiKey = null;
      voiceRecognition.config.apiSecret = null;

      const health = await voiceRecognition.healthCheck();
      expect(health.status).toBe('error');
      expect(health.message).toContain('配置缺失');

      // 恢复配置
      voiceRecognition.config = originalConfig;
    });

    test('如果有配置应该返回健康', async () => {
      // 设置配置
      voiceRecognition.config.appId = 'test_app_id';
      voiceRecognition.config.apiKey = 'test_api_key';
      voiceRecognition.config.apiSecret = 'test_api_secret';

      const health = await voiceRecognition.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.config.hasAppId).toBe(true);
      expect(health.config.supportedDialects).toBe(22);
    });
  });

  describe('cleanupTempFiles', () => {
    test('应该清理临时文件', async () => {
      // 创建测试临时文件
      const tempFile = path.join(voiceRecognition.tempDir, 'test.txt');
      fs.writeFileSync(tempFile, 'test');

      // 清理
      const result = await voiceRecognition.cleanupTempFiles();

      // 验证（文件可能因为时间不被删除）
      expect(result.success).toBe(true);
    });

    test('如果临时目录不存在应该返回错误', async () => {
      // 临时修改目录
      const originalDir = voiceRecognition.tempDir;
      voiceRecognition.tempDir = '/nonexistent/directory';

      const result = await voiceRecognition.cleanupTempFiles();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // 恢复目录
      voiceRecognition.tempDir = originalDir;
    });
  });

  describe('speechToText - 错误处理', () => {
    test('应该处理空音频数据', async () => {
      const result = await voiceRecognition.speechToText(Buffer.alloc(0));

      expect(result.success).toBe(false);
      expect(result.error).toContain('音频数据为空');
    });

    test('应该处理不存在的文件', async () => {
      const result = await voiceRecognition.speechToText('./nonexistent.wav');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('应该处理无效的音频数据', async () => {
      const invalidBuffer = Buffer.from('invalid audio data');
      const result = await voiceRecognition.speechToText(invalidBuffer, {
        enableRetry: false
      });

      expect(result).toBeDefined();
    });
  });

  describe('delay', () => {
    test('应该延迟指定时间', async () => {
      const start = Date.now();
      await voiceRecognition.delay(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(95);
      expect(end - start).toBeLessThan(150);
    });
  });

  describe('集成测试', () => {
    test('应该完成完整的工作流程', async () => {
      // 1. 健康检查
      voiceRecognition.config.appId = 'test';
      voiceRecognition.config.apiKey = 'test';
      voiceRecognition.config.apiSecret = 'test';
      const health = await voiceRecognition.healthCheck();
      expect(health.status).toBe('healthy');

      // 2. 获取方言列表
      const dialects = voiceRecognition.getSupportedDialects();
      expect(dialects.length).toBe(22);

      // 3. 获取统计
      const stats = voiceRecognition.getStats();
      expect(stats.totalRequests).toBe(0);

      // 4. 清理临时文件
      const cleanupResult = await voiceRecognition.cleanupTempFiles();
      expect(cleanupResult.success).toBe(true);
    });
  });

  describe('方言配置', () => {
    test('每种方言应该有正确的配置', () => {
      const dialects = voiceRecognition.dialects;

      Object.keys(dialects).forEach(key => {
        const dialect = dialects[key];
        expect(dialect).toHaveProperty('code');
        expect(dialect).toHaveProperty('name');
        expect(dialect).toHaveProperty('accent');

        expect(dialect.code).toBe('zh_cn');
        expect(dialect.name).toBeDefined();
        expect(dialect.name.length).toBeGreaterThan(0);
        expect(dialect.accent).toBeDefined();
      });
    });
  });

  describe('重试配置', () => {
    test('应该有默认的重试配置', () => {
      const retryConfig = voiceRecognition.retryConfig;

      expect(retryConfig.maxRetries).toBe(3);
      expect(retryConfig.retryDelay).toBe(1000);
      expect(retryConfig.backoffMultiplier).toBe(2);
      expect(Array.isArray(retryConfig.retryableErrors)).toBe(true);
      expect(retryConfig.retryableErrors.length).toBeGreaterThan(0);
    });
  });

  describe('音频配置', () => {
    test('应该有默认的音频配置', () => {
      const audioConfig = voiceRecognition.audioConfig;

      expect(audioConfig.sampleRate).toBe(16000);
      expect(audioConfig.channels).toBe(1);
      expect(audioConfig.bitDepth).toBe(16);
      expect(audioConfig.frameSize).toBe(1280);
    });
  });
});

// 运行测试
if (require.main === module) {
  console.log('运行语音识别服务测试...\n');

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
      toMatch: (pattern) => {
        if (!pattern.test(actual)) {
          throw new Error(`Expected to match ${pattern}, but got ${actual}`);
        }
      },
      toHaveProperty: (prop) => {
        if (!actual || !actual.hasOwnProperty(prop)) {
          throw new Error(`Expected to have property ${prop}`);
        }
      },
      toContain: (expected) => {
        if (!actual || !actual.includes(expected)) {
          throw new Error(`Expected to contain ${expected}`);
        }
      }
    };
  }

  async function runTests() {
    for (const test of tests) {
      try {
        await test.fn();
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
