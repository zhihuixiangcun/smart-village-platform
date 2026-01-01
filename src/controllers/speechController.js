/**
 * 语音识别控制器
 * 处理语音识别、合成、方言检测等请求
 */

const DialectSpeechService = require('../services/dialectSpeechService');
const multer = require('multer');
const logger = require('../config/logger');
const path = require('path');
const fs = require('fs');

// 初始化语音服务
const speechService = new DialectSpeechService();

// 配置文件上传
const upload = multer({
  dest: path.join(__dirname, '../uploads/audio/'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/x-wav',
      'audio/ogg'
    ];
    cb(null, allowedMimes.includes(file.mimetype));
  }
});

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads/audio');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

class SpeechController {
  /**
   * 语音识别
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async recognizeSpeech(req, res) {
    try {
      const { dialect = 'auto', accent, domain = 'iat', proficiency = 1 } = req.body;

      // 检查音频文件
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传音频文件'
        });
      }

      // 读取音频文件
      const audioBuffer = fs.readFileSync(req.file.path);

      // 清理上传的文件
      fs.unlinkSync(req.file.path);

      // 进行语音识别
      const result = await speechService.recognizeSpeech(audioBuffer, {
        dialect,
        accent,
        domain,
        proficiency
      });

      res.json({
        success: true,
        data: result,
        message: result.success ? '语音识别成功' : '语音识别失败'
      });

    } catch (error) {
      logger.error('语音识别控制器错误:', error);
      res.status(500).json({
        success: false,
        message: '语音识别失败',
        error: error.message
      });
    }
  }

  /**
   * 语音合成
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async synthesizeSpeech(req, res) {
    try {
      const { text, voice = 'mandarin', speed, pitch, volume, emotion, format = 'mp3' } = req.body;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: '请输入要合成的文本'
        });
      }

      // 限制文本长度
      if (text.length > 500) {
        return res.status(400).json({
          success: false,
          message: '文本长度不能超过500字符'
        });
      }

      // 进行语音合成
      const audioBuffer = await speechService.synthesizeSpeech(text, {
        voice,
        speed,
        pitch,
        volume,
        emotion,
        format
      });

      // 设置响应头
      const contentType = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400');

      // 发送音频数据
      res.send(audioBuffer);

    } catch (error) {
      logger.error('语音合成控制器错误:', error);
      res.status(500).json({
        success: false,
        message: '语音合成失败',
        error: error.message
      });
    }
  }

  /**
   * 方言检测
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async detectDialect(req, res) {
    try {
      // 检查音频文件
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传音频文件'
        });
      }

      // 读取音频文件
      const audioBuffer = fs.readFileSync(req.file.path);

      // 清理上传的文件
      fs.unlinkSync(req.file.path);

      // 检测方言
      const result = await speechService.detectDialect(audioBuffer);

      res.json({
        success: true,
        data: result,
        message: result.success ? '方言检测成功' : '方言检测失败'
      });

    } catch (error) {
      logger.error('方言检测控制器错误:', error);
      res.status(500).json({
        success: false,
        message: '方言检测失败',
        error: error.message
      });
    }
  }

  /**
   * 方言翻译
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async translateDialect(req, res) {
    try {
      const { text, fromDialect, toDialect } = req.body;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: '请输入要翻译的文本'
        });
      }

      if (!fromDialect || !toDialect) {
        return res.status(400).json({
          success: false,
          message: '请指定源方言和目标方言'
        });
      }

      // 进行方言翻译
      const translatedText = await speechService.translateDialect(text, fromDialect, toDialect);

      res.json({
        success: true,
        data: {
          originalText: text,
          translatedText,
          fromDialect,
          toDialect
        },
        message: '方言翻译完成'
      });

    } catch (error) {
      logger.error('方言翻译控制器错误:', error);
      res.status(500).json({
        success: false,
        message: '方言翻译失败',
        error: error.message
      });
    }
  }

  /**
   * 获取支持的方言列表
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getSupportedDialects(req, res) {
    try {
      const dialects = speechService.getSupportedDialects();

      res.json({
        success: true,
        data: dialects,
        message: '获取方言列表成功'
      });

    } catch (error) {
      logger.error('获取方言列表控制器错误:', error);
      res.status(500).json({
        success: false,
        message: '获取方言列表失败',
        error: error.message
      });
    }
  }

  /**
   * 获取语音服务统计信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getStats(req, res) {
    try {
      const stats = speechService.getStats();

      res.json({
        success: true,
        data: stats,
        message: '获取统计信息成功'
      });

    } catch (error) {
      logger.error('获取统计信息控制器错误:', error);
      res.status(500).json({
        success: false,
        message: '获取统计信息失败',
        error: error.message
      });
    }
  }

  /**
   * 实时语音识别WebSocket处理
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async handleRealTimeRecognition(req, res) {
    try {
      const { dialect = 'auto', interimResults = true, silenceTimeout = 2000 } = req.query;

      // 升级HTTP连接为WebSocket
      const ws = req.ws;

      if (!ws) {
        return res.status(400).json({
          success: false,
          message: 'WebSocket连接失败'
        });
      }

      // 启动实时识别
      const recognitionSession = speechService.startRealTimeRecognition({
        dialect,
        interimResults: interimResults === 'true',
        silenceTimeout: parseInt(silenceTimeout)
      });

      // 处理WebSocket事件
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          switch (message.type) {
          case 'audio':
            if (message.data) {
              const audioData = Buffer.from(message.data, 'base64');
              recognitionSession.sendAudio(audioData);
            }
            break;

          case 'stop':
            speechService.stopRealTimeRecognition();
            ws.close();
            break;

          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: '未知消息类型'
            }));
          }
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            message: '消息格式错误'
          }));
        }
      });

      ws.on('close', () => {
        speechService.stopRealTimeRecognition();
      });

      // 转发识别事件到WebSocket客户端
      recognitionSession.on('start', (data) => {
        ws.send(JSON.stringify({
          type: 'start',
          data
        }));
      });

      recognitionSession.on('interim-result', (data) => {
        ws.send(JSON.stringify({
          type: 'interim-result',
          data
        }));
      });

      recognitionSession.on('final-result', (data) => {
        ws.send(JSON.stringify({
          type: 'final-result',
          data
        }));
      });

      recognitionSession.on('error', (error) => {
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      });

      recognitionSession.on('end', () => {
        ws.send(JSON.stringify({
          type: 'end'
        }));
        ws.close();
      });

    } catch (error) {
      logger.error('实时语音识别控制器错误:', error);
      if (req.ws) {
        req.ws.send(JSON.stringify({
          type: 'error',
          message: '实时识别启动失败'
        }));
        req.ws.close();
      }
    }
  }

  /**
   * 清理语音服务缓存
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async clearCache(req, res) {
    try {
      speechService.clearCache();

      res.json({
        success: true,
        message: '缓存清理成功'
      });

    } catch (error) {
      logger.error('清理缓存控制器错误:', error);
      res.status(500).json({
        success: false,
        message: '缓存清理失败',
        error: error.message
      });
    }
  }

  /**
   * 重置统计信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async resetStats(req, res) {
    try {
      speechService.resetStats();

      res.json({
        success: true,
        message: '统计信息重置成功'
      });

    } catch (error) {
      logger.error('重置统计信息控制器错误:', error);
      res.status(500).json({
        success: false,
        message: '统计信息重置失败',
        error: error.message
      });
    }
  }

  /**
   * 批量语音识别
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async batchRecognizeSpeech(req, res) {
    try {
      const { files, dialect = 'auto' } = req.body;

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供音频文件列表'
        });
      }

      if (files.length > 10) {
        return res.status(400).json({
          success: false,
          message: '批量识别最多支持10个文件'
        });
      }

      const results = [];

      for (const file of files) {
        try {
          const audioBuffer = fs.readFileSync(file.path);
          const result = await speechService.recognizeSpeech(audioBuffer, { dialect });

          results.push({
            fileName: file.originalname,
            ...result
          });

          // 清理文件
          fs.unlinkSync(file.path);

        } catch (error) {
          results.push({
            fileName: file.originalname,
            success: false,
            error: error.message
          });

          // 清理文件
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }

      res.json({
        success: true,
        data: {
          totalFiles: files.length,
          results
        },
        message: '批量识别完成'
      });

    } catch (error) {
      logger.error('批量语音识别控制器错误:', error);
      res.status(500).json({
        success: false,
        message: '批量识别失败',
        error: error.message
      });
    }
  }

  /**
   * 获取音频处理配置
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getAudioConfig(req, res) {
    try {
      const config = {
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16,
        maxFileSize: '10MB',
        supportedFormats: ['wav', 'mp3', 'mpeg', 'ogg'],
        maxDuration: 60, // 秒
        minDuration: 1, // 秒
        silenceThreshold: 0.01,
        silenceTimeout: 2000
      };

      res.json({
        success: true,
        data: config,
        message: '获取音频配置成功'
      });

    } catch (error) {
      logger.error('获取音频配置控制器错误:', error);
      res.status(500).json({
        success: false,
        message: '获取音频配置失败',
        error: error.message
      });
    }
  }
}

module.exports = new SpeechController();
module.exports.upload = upload;