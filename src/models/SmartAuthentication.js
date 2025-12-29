const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * z˝§¡!ã
 * /∫8∆+iyÅ§¡≤^„
 */

// iyÅ{ã
const BIOMETRIC_TYPE = {
  FACE: 'face',
  FINGERPRINT: 'fingerprint',
  IRIS: 'iris',
  VOICE: 'voice',
  PALM: 'palm'
};

// §¡∂
const AUTH_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  REVOKED: 'revoked'
};

// ∫8iyÅpn
const faceBiometricSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // ∫8yÅœ
  faceFeatures: {
    templateId: String,
    featureVector: [Number], // ∫8yÅœ512Ù128Ù	
    quality: {
      type: Number,
      min: 0,
      max: 1
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    }
  },

  // ∫8˛œ
  faceImages: [{
    imageId: String,
    imageUrl: String,
    angle: {
      type: String,
      enum: ['front', 'left', 'right', 'up', 'down']
    },
    quality: Number,
    capturedAt: Date,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],

  // ;S¿K
  livenessData: {
    enabled: {
      type: Boolean,
      default: true
    },
    method: {
      type: String,
      enum: ['blink', 'nod', 'mouth', 'head_turn', 'multi_action', '3d_depth'],
      default: 'blink'
    },
    lastVerified: Date,
    verificationScore: Number
  },

  // §¡Mn
  authConfig: {
    threshold: {
      type: Number,
      default: 0.8,
      min: 0.5,
      max: 0.99
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    lockoutDuration: {
      type: Number,
      default: 300 // “
    },
    requireLiveness: {
      type: Boolean,
      default: true
    }
  },

  // ∂
  status: {
    type: String,
    enum: Object.values(AUTH_STATUS),
    default: AUTH_STATUS.PENDING
  },

  // °8·o
  verification: {
    submittedAt: Date,
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verificationMethod: {
      type: String,
      enum: ['manual', 'automatic', 'id_card', 'community_confirm']
    },
    rejectionReason: String
  },

  // (ﬂ°
  usageStats: {
    totalAuthAttempts: {
      type: Number,
      default: 0
    },
    successfulAuths: {
      type: Number,
      default: 0
    },
    failedAuths: {
      type: Number,
      default: 0
    },
    lastAuthAt: Date,
    lastAuthSuccess: Boolean,
    averageAuthTime: Number // Î“
  },

  // âh∞U
  securityEvents: [{
    eventType: {
      type: String,
      enum: ['auth_success', 'auth_failure', 'spoof_attempt', 'template_update', 'account_locked', 'account_unlocked']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    deviceFingerprint: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    },
    details: mongoose.Schema.Types.Mixed
  }],

  // Cpn
  metadata: {
    deviceInfo: String,
    osVersion: String,
    appVersion: String,
    sdkVersion: String,
    provider: {
      type: String,
      enum: ['baidu', 'tencent', 'aliyun', 'face++', 'megvii', 'custom'],
      default: 'tencent'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// "
faceBiometricSchema.index({ userId: 1, status: 1 });
faceBiometricSchema.index({ villageId: 1, status: 1 });
faceBiometricSchema.index({ 'securityEvents.timestamp': -1 });
faceBiometricSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1t d«pn

// ZﬂWµ§¡üá
faceBiometricSchema.virtual('authSuccessRate').get(function() {
  const total = this.usageStats.totalAuthAttempts;
  if (total === 0) return 0;
  return (this.usageStats.successfulAuths / total * 100).toFixed(2) + '%';
});

// ûãπ’∞U§¡’
faceBiometricSchema.methods.recordAuthAttempt = function(success, authTime = 0, eventData = {}) {
  this.usageStats.totalAuthAttempts++;
  this.usageStats.lastAuthAt = new Date();
  this.usageStats.lastAuthSuccess = success;

  if (success) {
    this.usageStats.successfulAuths++;
  } else {
    this.usageStats.failedAuths++;
  }

  // Ù∞sG§¡ˆÙ
  if (authTime > 0) {
    const currentAvg = this.usageStats.averageAuthTime || 0;
    const totalSuccess = this.usageStats.successfulAuths;
    this.usageStats.averageAuthTime = ((currentAvg * (totalSuccess - 1)) + authTime) / totalSuccess;
  }

  // ∞Uâhãˆ
  this.securityEvents.push({
    eventType: success ? 'auth_success' : 'auth_failure',
    ...eventData
  });

  return this.save();
};

// ûãπ’¿Â/&´ö
faceBiometricSchema.methods.isLocked = function() {
  const recentFailures = this.securityEvents.filter(event => {
    return event.eventType === 'auth_failure' &&
           event.timestamp > new Date(Date.now() - this.authConfig.lockoutDuration * 1000);
  });

  return recentFailures.length >= this.authConfig.maxAttempts;
};

// ûãπ’Ù∞∫8yÅ
faceBiometricSchema.methods.updateFaceFeatures = async function(featureData) {
  this.faceFeatures = {
    ...this.faceFeatures,
    ...featureData,
    quality: featureData.quality || this.faceFeatures.quality,
    confidence: featureData.confidence || this.faceFeatures.confidence
  };

  this.securityEvents.push({
    eventType: 'template_update',
    timestamp: new Date()
  });

  return this.save();
};

// Yπ’∑÷(7∫8pn
faceBiometricSchema.statics.getUserFaceData = async function(userId) {
  return this.findOne({ userId, status: AUTH_STATUS.APPROVED });
};

// Yπ’«yÅœ"¯<∫8
faceBiometricSchema.statics.searchSimilarFaces = async function(featureVector, threshold = 0.8, villageId = null) {
  const query = { status: AUTH_STATUS.APPROVED };
  if (villageId) {
    query.villageId = villageId;
  }

  const allFaces = await this.find(query).lean();

  // ÄÑ¯<¶°óûEî(Ñœ¯<¶ó’	
  const results = allFaces.map(face => {
    const similarity = this.calculateSimilarity(featureVector, face.faceFeatures.featureVector);
    return {
      userId: face.userId,
      similarity,
      quality: face.faceFeatures.quality,
      confidence: face.faceFeatures.confidence
    };
  }).filter(result => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);

  return results;
};

// Yπ’°óyÅœ¯<¶
faceBiometricSchema.statics.calculateSimilarity = function(vector1, vector2) {
  if (!vector1 || !vector2 || vector1.length !== vector2.length) {
    return 0;
  }

  // Y&¯<¶
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    norm1 += vector1[i] * vector1[i];
    norm2 += vector2[i] * vector2[i];
  }

  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  return Math.max(0, Math.min(1, similarity));
};

/**
 * ≤^„àC
 */
const proxyAuthorizationSchema = new mongoose.Schema({
  principalUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  proxyUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // s˚·o
  relationship: {
    type: {
      type: String,
      enum: ['spouse', 'parent', 'child', 'sibling', 'grandparent', 'grandchild', 'other'],
      required: true
    },
    customRelation: String, // S type : 'other' ˆkô
    proofDocuments: [{
      documentType: String,
      documentUrl: String,
      verified: Boolean
    }]
  },

  // àCÙ
  authorizationScope: {
    allowedOperations: [{
      type: String,
      enum: [
        'view_profile',
        'view_health',
        'view_subsidies',
        'apply_services',
        'make_payments',
        'sign_documents',
        'vote',
        'view_location',
        'manage_points'
      ]
    }],
    resourceConstraints: [{
      resource: String,
      maxAmount: Number,
      requireVerification: Boolean
    }],
    timeConstraints: {
      validFrom: {
        type: Date,
        default: Date.now
      },
      validUntil: Date,
      allowedHours: {
        type: [[Number]], // [[start, end], ...] 24ˆ6
        default: null // null h:h)
      },
      allowedDays: {
        type: [Number], // 0-6, 0=hÂ
        default: [0, 1, 2, 3, 4, 5, 6]
      }
    }
  },

  // §¡Mn
  authentication: {
    requireFaceVerification: {
      type: Boolean,
      default: true
    },
    requirePrincipalConfirmation: {
      type: Boolean,
      default: false
    },
    notificationRequired: {
      type: Boolean,
      default: true
    },
    notifyChannels: [{
      type: String,
      enum: ['sms', 'email', 'app_push', 'wechat']
    }]
  },

  // ∂
  status: {
    type: String,
    enum: Object.values(AUTH_STATUS),
    default: AUTH_STATUS.PENDING
  },

  // °8·o
  verification: {
    submittedAt: {
      type: Date,
      default: Date.now
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectionReason: String,
    notes: String
  },

  // (∞U
  usageLog: [{
    operation: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    success: Boolean,
    ipAddress: String,
    userAgent: String,
    details: mongoose.Schema.Types.Mixed
  }],

  // § ·o
  revocation: {
    revokedAt: Date,
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  }
}, {
  timestamps: true
});

// "
proxyAuthorizationSchema.index({ principalUserId: 1, proxyUserId: 1 }, { unique: true });
proxyAuthorizationSchema.index({ villageId: 1, status: 1 });
proxyAuthorizationSchema.index({ 'authorizationScope.timeConstraints.validUntil': 1 });

// ûãπ’¿ÂàC/&	H
proxyAuthorizationSchema.methods.isValid = function() {
  if (this.status !== AUTH_STATUS.APPROVED) {
    return false;
  }

  const now = new Date();
  if (this.authorizationScope.timeConstraints.validUntil &&
      now > this.authorizationScope.timeConstraints.validUntil) {
    return false;
  }

  if (this.authorizationScope.timeConstraints.validFrom &&
      now < this.authorizationScope.timeConstraints.validFrom) {
    return false;
  }

  // ¿ÂÂP6
  const currentDay = now.getDay();
  if (!this.authorizationScope.timeConstraints.allowedDays.includes(currentDay)) {
    return false;
  }

  // ¿ÂˆÙP6
  if (this.authorizationScope.timeConstraints.allowedHours) {
    const currentHour = now.getHours();
    const isAllowed = this.authorizationScope.timeConstraints.allowedHours.some(
      ([start, end]) => currentHour >= start && currentHour < end
    );
    if (!isAllowed) {
      return false;
    }
  }

  return true;
};

// ûãπ’¿ÂÕ\CP
proxyAuthorizationSchema.methods.hasPermission = function(operation) {
  if (!this.isValid()) {
    return false;
  }

  return this.authorizationScope.allowedOperations.includes(operation);
};

// ûãπ’∞UÕ\
proxyAuthorizationSchema.methods.logOperation = function(operation, success, details = {}) {
  this.usageLog.push({
    operation,
    success,
    ...details
  });
  return this.save();
};

// ûãπ’§ àC
proxyAuthorizationSchema.methods.revoke = function(revokedBy, reason = '') {
  this.status = AUTH_STATUS.REVOKED;
  this.revocation = {
    revokedAt: new Date(),
    revokedBy,
    reason
  };
  return this.save();
};

// Yπ’∑÷(7Ñ„h
proxyAuthorizationSchema.statics.getUserProxies = async function(userId, type = 'principal') {
  const query = {};
  query[type + 'UserId'] = userId;
  query.status = AUTH_STATUS.APPROVED;

  return this.find(query)
    .populate(type === 'principal' ? 'proxyUserId' : 'principalUserId', 'name phone')
    .populate('villageId', 'name');
};

// Yπ’∑÷	HÑ„àC
proxyAuthorizationSchema.statics.getActiveAuthorizations = async function(principalUserId) {
  const authorizations = await this.find({
    principalUserId,
    status: AUTH_STATUS.APPROVED
  });

  return authorizations.filter(auth => auth.isValid());
};

/**
 * §¡›
 */
const authSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  authMethod: {
    type: String,
    enum: ['face', 'fingerprint', 'voice', 'palm', 'password', 'proxy'],
    required: true
  },
  proxyUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // §¡pn
  authData: {
    biometricId: String,
    confidence: Number,
    livenessPassed: Boolean,
    verificationTime: Number, // Î“
    deviceFingerprint: String
  },

  // ›·o
  sessionInfo: {
    ipAddress: String,
    userAgent: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    },
    deviceInfo: String
  },

  // ∂
  status: {
    type: String,
    enum: ['active', 'completed', 'failed', 'expired'],
    default: 'active'
  },

  // «ˆÙ
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24ˆ
    }
  },

  // ”ú
  result: {
    success: Boolean,
    failureReason: String,
    additionalInfo: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// "
authSessionSchema.index({ sessionId: 1 });
authSessionSchema.index({ userId: 1, createdAt: -1 });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Yπ’˙§¡›
authSessionSchema.statics.createSession = async function(sessionData) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  return this.create({ sessionId, ...sessionData });
};

// Yπ’∑÷;√›
authSessionSchema.statics.getActiveSession = async function(sessionId) {
  const session = await this.findOne({
    sessionId,
    status: 'active',
    expiresAt: { $gt: new Date() }
  });
  return session;
};

module.exports = {
  FaceBiometric: mongoose.model('FaceBiometric', faceBiometricSchema),
  ProxyAuthorization: mongoose.model('ProxyAuthorization', proxyAuthorizationSchema),
  AuthSession: mongoose.model('AuthSession', authSessionSchema),
  BIOMETRIC_TYPE,
  AUTH_STATUS
};
