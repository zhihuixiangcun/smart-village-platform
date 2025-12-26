/**
 * Smart Village Platform - Analytics Routes
 * 智慧乡村综合服务平台 - 数据分析路由
 */

const express = require('express');
const router = express.Router();
const dataAnalyticsService = require('../services/analytics/dataAnalyticsService');
const logger = require('../utils/logger');

/**
 * GET /api/analytics/overview
 * Get system overview statistics
 */
router.get('/overview', async (req, res) => {
  try {
    const villageId = req.query.villageId || null;
    const timeRange = req.query.timeRange || '24h';

    const stats = await dataAnalyticsService.getOverviewStats(villageId, timeRange);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('[Analytics] Overview error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/population
 * Get population statistics
 */
router.get('/population', async (req, res) => {
  try {
    const villageId = req.query.villageId || null;
    const groupBy = req.query.groupBy || 'age';
    const includeTrends = req.query.includeTrends !== 'false';
    const timeRange = req.query.timeRange || '90d';

    const stats = await dataAnalyticsService.getPopulationStats(villageId, {
      groupBy,
      includeTrends,
      timeRange
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('[Analytics] Population error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/finance
 * Get financial statistics
 */
router.get('/finance', async (req, res) => {
  try {
    const villageId = req.query.villageId || null;
    const timeRange = req.query.timeRange || '30d';

    const stats = await dataAnalyticsService.getFinanceStats(villageId, timeRange);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('[Analytics] Finance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/user-activity
 * Get user activity statistics
 */
router.get('/user-activity', async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '7d';

    const stats = await dataAnalyticsService.getUserActivityStats(timeRange);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('[Analytics] User activity error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/predictions/:type
 * Get predictive analytics
 */
router.get('/predictions/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const villageId = req.query.villageId || null;

    const predictions = await dataAnalyticsService.getPredictions(type, villageId);

    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    logger.error('[Analytics] Predictions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/analytics/cache
 * Clear analytics cache
 */
router.delete('/cache', async (req, res) => {
  try {
    const pattern = req.query.pattern || '*';
    const cleared = await dataAnalyticsService.clearCache(pattern);

    res.json({
      success: true,
      message: `Cleared ${cleared} cache entries`
    });
  } catch (error) {
    logger.error('[Analytics] Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
