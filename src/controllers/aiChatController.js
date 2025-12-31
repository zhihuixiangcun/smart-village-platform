/**
 * AI Chat Controller
 * Handles AI-powered chat, voice input, and smart assistance features
 */

const aiService = require('../services/aiService');
const logger = require('../utils/logger');
const multer = require('multer');

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a',
      'audio/wav', 'audio/webm', 'audio/ogg',
      'video/webm'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP3, M4A, WAV, WEBM audio files are allowed.'));
    }
  }
});

/**
 * AI Chat Controller Class
 */
class AIChatController {
  /**
   * Text-based chat endpoint
   * POST /api/v1/ai/chat
   */
  async chat(req, res) {
    try {
      const { message, context = {} } = req.body;

      // Validate message input
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message is required'
        });
      }

      if (message.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Message is too long (max 2000 characters)'
        });
      }

      // Enhance context with user information
      const enhancedContext = {
        ...context,
        userId: req.user?.id,
        location: req.user?.villageId || context.location
      };

      // Call AI service
      const result = await aiService.chat(message, enhancedContext);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('AI chat error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'AI chat failed'
      });
    }
  }

  /**
   * Voice-based chat endpoint
   * POST /api/v1/ai/voice
   */
  async voiceChat(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Audio file is required'
        });
      }

      const { dialect = 'zh-CN' } = req.body;

      // Convert speech to text
      const sttResult = await aiService.speechToText(req.file.buffer, dialect);

      if (!sttResult.text || sttResult.text.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Could not recognize speech from audio',
          detectedIntent: sttResult.detectedIntent
        });
      }

      // Get AI response for recognized text
      const chatResult = await aiService.chat(sttResult.text, {
        userId: req.user?.id,
        location: req.user?.villageId
      });

      // Convert AI response to speech
      let audioData = null;
      try {
        audioData = await aiService.textToSpeech(
          chatResult.answer.substring(0, 200),
          dialect,
          5
        );
      } catch (ttsError) {
        logger.warn('TTS conversion error:', ttsError);
      }

      res.json({
        success: true,
        data: {
          recognizedText: sttResult.text,
          answer: chatResult.answer,
          detectedIntent: sttResult.detectedIntent,
          confidence: sttResult.confidence,
          audioResponse: audioData ? audioData.toString('base64') : null,
          sources: chatResult.source || [],
          relatedTopics: chatResult.relatedTopics || []
        }
      });
    } catch (error) {
      logger.error('Voice chat error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Voice chat failed'
      });
    }
  }

  /**
   * Policy subsidy calculator (smart helper)
   * POST /api/v1/ai/policy/calculate
   */
  async calculatePolicy(req, res) {
    try {
      const { policyType, applicantData } = req.body;

      if (!policyType || !applicantData) {
        return res.status(400).json({
          success: false,
          message: 'Policy type and applicant data are required'
        });
      }

      let calculatedAmount = 0;
      let breakdown = {};

      switch (policyType) {
        case 'cultivated_land_protection':
          const landArea = parseFloat(applicantData.landArea) || 0;
          calculatedAmount = landArea * 120;
          breakdown = {
            subsidy: calculatedAmount,
            rate: '120 yuan/mu',
            area: landArea
          };
          break;

        case 'grain_subsidy':
          const grainArea = parseFloat(applicantData.landArea) || 0;
          const cropType = applicantData.cropType || 'rice';
          const rateMap = { rice: 150, wheat: 130, corn: 120, soybean: 200 };
          const rate = rateMap[cropType] || 120;
          calculatedAmount = grainArea * rate;
          breakdown = {
            subsidy: calculatedAmount,
            rate: `${rate} yuan/mu`,
            crop: cropType,
            area: grainArea
          };
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid policy type'
          });
      }

      res.json({
        success: true,
        data: {
          policyType,
          calculatedAmount: parseFloat(calculatedAmount.toFixed(2)),
          breakdown,
          note: 'Calculated amount is for reference only. Actual subsidy may vary.'
        }
      });
    } catch (error) {
      logger.error('Policy calculation error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Policy calculation failed'
      });
    }
  }

  /**
   * AI-powered form filling assistant
   * POST /api/v1/ai/form/fill
   */
  async fillForm(req, res) {
    try {
      const { input, formType } = req.body;

      if (!input) {
        return res.status(400).json({
          success: false,
          message: 'Input data is required'
        });
      }

      const result = await aiService.fillForm(input, formType);

      res.json({
        success: result.success,
        data: result
      });
    } catch (error) {
      logger.error('AI form fill error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'AI form fill failed'
      });
    }
  }

  /**
   * Get conversation history
   * GET /api/v1/ai/history
   */
  async getConversationHistory(req, res) {
    try {
      const { limit = 10 } = req.query;

      res.json({
        success: true,
        data: {
          conversations: [],
          total: 0,
          hasMore: false
        }
      });
    } catch (error) {
      logger.error('Get history error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Get history failed'
      });
    }
  }

  /**
   * Search agriculture knowledge
   * GET /api/v1/ai/search/agriculture
   */
  async searchAgriculture(req, res) {
    try {
      const { keyword } = req.query;

      const results = [
        {
          id: '1',
          title: 'Rice pest control guide',
          category: 'planting',
          content: 'Detailed rice farming techniques...',
          tags: ['rice', 'pest', 'guide']
        }
      ];

      res.json({
        success: true,
        data: {
          results,
          total: results.length
        }
      });
    } catch (error) {
      logger.error('Search agriculture error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Search failed'
      });
    }
  }

  /**
   * Get popular Q&A
   * GET /api/v1/ai/popular
   */
  async getPopularQA(req, res) {
    try {
      const popularQA = [
        {
          question: 'How to apply for agricultural subsidy?',
          answer: 'Subsidy application process is...',
          category: 'policy'
        },
        {
          question: 'What is the rice price this year?',
          answer: '2024 rice price is around 2800-3200 yuan/ton...',
          category: 'market'
        }
      ];

      res.json({
        success: true,
        data: popularQA
      });
    } catch (error) {
      logger.error('Get popular Q&A error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Get popular Q&A failed'
      });
    }
  }

  /**
   * Submit feedback
   * POST /api/v1/ai/feedback
   */
  async submitFeedback(req, res) {
    try {
      const { helpful } = req.body;

      logger.info('AI feedback received:', { helpful });

      res.json({
        success: true,
        message: 'Feedback received'
      });
    } catch (error) {
      logger.error('Submit feedback error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Submit feedback failed'
      });
    }
  }

  /**
   * Get supported dialects
   * GET /api/v1/ai/dialects
   */
  async getSupportedDialects(req, res) {
    try {
      const dialects = aiService.getSupportedDialects();

      res.json({
        success: true,
        data: dialects
      });
    } catch (error) {
      logger.error('Get dialects error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Get dialects failed'
      });
    }
  }
}

// Export controller instance with upload middleware
const controller = new AIChatController();
controller.upload = upload;  // Export the upload object, not the single result
module.exports = controller;
