const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Security configuration
const securityConfig = {
  // Helmet configuration for security headers
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "wss:", "ws:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: {
      action: 'deny'
    },
    xssFilter: true
  },

  // Rate limiting configurations
  rateLimit: {
    // General API rate limit
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
    },

    // Authentication rate limit
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 auth requests per windowMs
      message: {
        error: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
      },
      skipSuccessfulRequests: true,
    },

    // File upload rate limit
    upload: {
      windowMs: 60 * 1000, // 1 minute
      max: 10, // limit each IP to 10 file uploads per minute
      message: {
        error: 'Too many file uploads, please try again later.',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
      }
    },

    // Search rate limit
    search: {
      windowMs: 60 * 1000, // 1 minute
      max: 100, // limit each IP to 100 search requests per minute
      message: {
        error: 'Too many search requests, please try again later.',
        code: 'SEARCH_RATE_LIMIT_EXCEEDED'
      }
    }
  },

  // Password policies
  passwordPolicy: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPatterns: [
      'password',
      '123456',
      'qwerty',
      'admin',
      'root'
    ]
  },

  // JWT configuration
  jwt: {
    algorithm: 'HS256',
    expiresIn: '24h',
    issuer: 'smart-village',
    audience: 'smart-village-users',
    refreshTokenExpiresIn: '7d'
  },

  // Encryption configuration
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
    saltLength: 32
  },

  // Session security
  session: {
    secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict'
    }
  }
};

// Custom security middleware
const securityMiddleware = {
  // Input sanitization
  sanitizeInput: (req, res, next) => {
    // Sanitize body
    if (req.body) {
      req.body = mongoSanitize(req.body);
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = xss(req.body[key]);
        }
      });
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = mongoSanitize(req.query);
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = xss(req.query[key]);
        }
      });
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = mongoSanitize(req.params);
      Object.keys(req.params).forEach(key => {
        if (typeof req.params[key] === 'string') {
          req.params[key] = xss(req.params[key]);
        }
      });
    }

    next();
  },

  // Validate email addresses
  validateEmail: (email) => {
    return validator.isEmail(email) && validator.isLength(email, { min: 5, max: 254 });
  },

  // Validate passwords
  validatePassword: (password) => {
    const { minLength, maxLength, requireUppercase, requireLowercase, requireNumbers, requireSpecialChars, forbiddenPatterns } = securityConfig.passwordPolicy;

    if (!validator.isLength(password, { min: minLength, max: maxLength })) {
      return { valid: false, message: `Password must be between ${minLength} and ${maxLength} characters` };
    }

    if (requireUppercase && !/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (requireNumbers && !/\d/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }

    if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }

    for (const pattern of forbiddenPatterns) {
      if (password.toLowerCase().includes(pattern)) {
        return { valid: false, message: `Password cannot contain the pattern: ${pattern}` };
      }
    }

    return { valid: true };
  },

  // Encrypt sensitive data
  encryptData: (data, key) => {
    const iv = crypto.randomBytes(securityConfig.encryption.ivLength);
    const cipher = crypto.createCipher(securityConfig.encryption.algorithm, key, iv);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      tag: tag.toString('hex')
    };
  },

  // Decrypt sensitive data
  decryptData: (encryptedData, key) => {
    const decipher = crypto.createDecipher(
      securityConfig.encryption.algorithm,
      key,
      Buffer.from(encryptedData.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  },

  // Generate secure tokens
  generateSecureToken: (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
  },

  // Hash password securely
  hashPassword: async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  },

  // Verify password
  verifyPassword: async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
  },

  // Generate JWT tokens
  generateTokens: (payload) => {
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      algorithm: securityConfig.jwt.algorithm,
      expiresIn: securityConfig.jwt.expiresIn,
      issuer: securityConfig.jwt.issuer,
      audience: securityConfig.jwt.audience
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      algorithm: securityConfig.jwt.algorithm,
      expiresIn: securityConfig.jwt.refreshTokenExpiresIn,
      issuer: securityConfig.jwt.issuer,
      audience: securityConfig.jwt.audience
    });

    return { accessToken, refreshToken };
  },

  // Verify JWT token
  verifyToken: (token, type = 'access') => {
    const secret = type === 'refresh' ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET;

    return jwt.verify(token, secret, {
      algorithm: securityConfig.jwt.algorithm,
      issuer: securityConfig.jwt.issuer,
      audience: securityConfig.jwt.audience
    });
  },

  // IP whitelist middleware
  ipWhitelist: (allowedIPs) => {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

      if (allowedIPs.includes(clientIP)) {
        next();
      } else {
        res.status(403).json({
          error: 'Access denied from this IP address',
          code: 'IP_NOT_ALLOWED'
        });
      }
    };
  },

  // CORS configuration
  corsOptions: {
    origin: function (origin, callback) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:3000'];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200
  },

  // Audit logging
  auditLog: (req, res, next) => {
    const auditData = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.originalUrl,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
      query: JSON.stringify(req.query),
      params: JSON.stringify(req.params)
    };

    // Log to security audit system
    console.log('AUDIT:', JSON.stringify(auditData));

    // Store in database for security analysis
    // This should be implemented with your audit logging system

    next();
  },

  // Security headers middleware
  securityHeaders: (req, res, next) => {
    // Remove server information
    res.removeHeader('Server');

    // Prevent caching of sensitive data
    if (req.path.includes('/api/') || req.path.includes('/auth/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }

    next();
  }
};

// Security monitoring utilities
const securityMonitoring = {
  // Detect suspicious activities
  detectSuspiciousActivity: (req, res, next) => {
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /<script/i,  // XSS attempts
      /union.*select/i,  // SQL injection attempts
      /javascript:/i,  // JavaScript protocol
      /data:/i,  // Data protocol
      /vbscript:/i  // VBScript protocol
    ];

    const checkValue = (value) => {
      if (typeof value === 'string') {
        return suspiciousPatterns.some(pattern => pattern.test(value));
      }
      return false;
    };

    const isSuspicious = [
      req.url,
      req.headers['user-agent'],
      JSON.stringify(req.query),
      JSON.stringify(req.params),
      JSON.stringify(req.body)
    ].some(checkValue);

    if (isSuspicious) {
      console.warn('SUSPICIOUS ACTIVITY DETECTED:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        timestamp: new Date().toISOString()
      });

      // Could implement IP blocking here
    }

    next();
  },

  // Failed login attempt tracking
  trackFailedLogin: (req, res, next) => {
    const key = `failed_login:${req.ip}`;
    // Implement Redis or memory-based tracking
    // Block after too many failed attempts
    next();
  }
};

module.exports = {
  securityConfig,
  securityMiddleware,
  securityMonitoring,
  // Helper function to apply all security middleware
  applySecurity: (app) => {
    // Apply security headers
    app.use(helmet(securityConfig.helmet));

    // Apply custom security headers
    app.use(securityMiddleware.securityHeaders);

    // Apply input sanitization
    app.use(securityMiddleware.sanitizeInput);

    // Apply audit logging
    app.use(securityMiddleware.auditLog);

    // Apply suspicious activity detection
    app.use(securityMonitoring.detectSuspiciousActivity);

    // Apply rate limiting
    app.use('/api/', rateLimit(securityConfig.rateLimit.api));
    app.use('/api/auth/', rateLimit(securityConfig.rateLimit.auth));
    app.use('/api/upload/', rateLimit(securityConfig.rateLimit.upload));
    app.use('/api/search/', rateLimit(securityConfig.rateLimit.search));

    console.log('🔒 Security middleware applied successfully');
  }
};