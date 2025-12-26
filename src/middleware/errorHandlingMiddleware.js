/**
 * Error Handling Middleware
 * Provides unified error handling for the smart village platform
 */

const logger = require('../utils/logger');

class ErrorHandlingMiddleware {
  constructor(dbService = null, auditService = null) {
    this.dbService = dbService;
    this.auditService = auditService;
    this.errorCounts = new Map();
    this.integrationService = {
      isInitialized: true,
      once: (event, callback) => {
        // Stub for event emitter
        if (callback) setTimeout(callback, 0);
      }
    };
  }

  /**
   * Express error handler middleware
   */
  handler() {
    return (err, req, res, next) => {
      const requestId = req.requestId || 'unknown';
      const userId = req.user?.id || 'anonymous';

      // Log error
      logger.error('Request error:', {
        requestId,
        userId,
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
      });

      // Increment error count
      const errorKey = err.name || 'Error';
      this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

      // Send error response
      const statusCode = err.statusCode || err.status || 500;
      const response = {
        success: false,
        error: {
          message: err.message || 'Internal server error',
          code: err.code || 'INTERNAL_ERROR',
          requestId
        }
      };

      // Only include stack trace in development
      if (process.env.NODE_ENV === 'development') {
        response.error.stack = err.stack;
      }

      res.status(statusCode).json(response);

      // Audit log if service is available
      if (this.auditService) {
        this.auditService.logOperation({
          operationType: 'ERROR',
          error: err.message,
          userId,
          requestId
        }).catch(e => logger.error('Audit log failed:', e));
      }
    };
  }

  /**
   * 404 Not Found handler
   */
  notFoundHandler() {
    return (req, res, next) => {
      const error = new Error(`Route not found: ${req.method} ${req.path}`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      next(error);
    };
  }

  /**
   * Health check middleware
   */
  healthCheckMiddleware() {
    return (req, res, next) => {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        errorCounts: Object.fromEntries(this.errorCounts)
      });
    };
  }

  /**
   * Statistics middleware
   */
  getStatisticsMiddleware() {
    return (req, res, next) => {
      const stats = {
        totalErrors: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0),
        errorBreakdown: Object.fromEntries(this.errorCounts),
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: stats
      });
    };
  }

  /**
   * Async error wrapper for route handlers
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Create a standardized error
   */
  createError(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0),
      errorBreakdown: Object.fromEntries(this.errorCounts)
    };
  }

  /**
   * Reset error statistics
   */
  resetErrorStats() {
    this.errorCounts.clear();
  }

  /**
   * Get integration service (for compatibility with example code)
   */
  getIntegrationService() {
    return this.integrationService;
  }
}

module.exports = ErrorHandlingMiddleware;
