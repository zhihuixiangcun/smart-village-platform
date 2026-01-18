const mongoose = require('mongoose');

const repairOrderSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  serviceProviderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceProvider',
    required: true,
    index: true
  },
  
  serviceProvider: {
    name: String,
    phone: String
  },
  
  type: {
    type: String,
    required: true,
    enum: ['plumbing', 'electrical', 'appliance', 'carpentry', 'paint', 'other']
  },
  
  description: {
    type: String,
    required: true
  },
  
  contactName: {
    type: String,
    required: true
  },
  
  contactPhone: {
    type: String,
    required: true
  },
  
  address: {
    type: String,
    required: true
  },
  
  appointmentTime: {
    type: Date,
    required: true
  },
  
  photos: [{
    url: String,
    caption: String
  }],
  
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'diagnosing', 'quoting', 'repairing', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  timeline: [{
    action: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true
    },
    description: String,
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  diagnosis: {
    content: String,
    photos: [{
      url: String,
      caption: String
    }],
    createdAt: Date
  },
  
  solution: {
    content: String,
    photos: [{
      url: String,
      caption: String
    }]
  },
  
  quote: {
    laborCost: {
      type: Number,
      default: 0
    },
    partsCost: {
      type: Number,
      default: 0
    },
    parts: [{
      name: String,
      quantity: Number,
      unit: String,
      price: Number,
      totalPrice: Number
    }],
    subtotal: Number,
    discount: Number,
    total: Number,
    createdAt: Date
  },
  
  warranty: {
    duration: {
      type: Number,
      default: 0
    },
    unit: {
      type: String,
      enum: ['day', 'month'],
      default: 'day'
    },
    expiresAt: Date
  },
  
  payment: {
    status: {
      type: String,
      enum: ['unpaid', 'partial_paid', 'paid', 'refunded'],
      default: 'unpaid'
    },
    amount: {
      type: Number,
      default: 0
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    method: String,
    transactionId: String,
    paidAt: Date
  },
  
  evaluation: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: Date
  },
  
  cancelReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  
  completedAt: Date,
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

repairOrderSchema.index({ villageId: 1, userId: 1, status: 1 });
repairOrderSchema.index({ villageId: 1, serviceProviderId: 1, status: 1 });
repairOrderSchema.index({ appointmentTime: 1, status: 1 });

repairOrderSchema.methods.addTimeline = function(action, status, description, operator) {
  this.timeline.push({
    action,
    status,
    description,
    operator,
    createdAt: new Date()
  });
  this.status = status;
  this.updatedAt = new Date();
  return this.save();
};

repairOrderSchema.methods.updateStatus = function(newStatus, operator, description) {
  this.status = newStatus;
  this.updatedAt = new Date();
  if (description || operator) {
    this.timeline.push({
      action: `状态更新为${newStatus}`,
      status: newStatus,
      description,
      operator,
      createdAt: new Date()
    });
  }
  if (newStatus === 'completed') {
    this.completedAt = new Date();
    this.warranty.expiresAt = new Date(Date.now() + this.warranty.duration * (this.warranty.unit === 'month' ? 30 : 1) * 24 * 60 * 60 * 1000);
  }
  return this.save();
};

repairOrderSchema.methods.addPart = function(part) {
  if (!this.quote.parts) {
    this.quote.parts = [];
  }
  this.quote.parts.push(part);
  this.quote.partsCost = this.quote.parts.reduce((sum, p) => sum + (p.totalPrice || p.quantity * p.price), 0);
  this.quote.subtotal = this.quote.laborCost + this.quote.partsCost;
  this.quote.total = this.quote.subtotal - (this.quote.discount || 0);
  this.payment.amount = this.quote.total;
  return this.save();
};

module.exports = mongoose.model('RepairOrder', repairOrderSchema);
