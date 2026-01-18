const mongoose = require('mongoose');

const housekeepingOrderSchema = new mongoose.Schema({
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
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    }
  },
  
  serviceType: {
    type: String,
    required: true,
    enum: ['cleaning', 'elderly', 'babysitter', 'cooking', 'laundry']
  },
  
  serviceItems: [{
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    },
    unit: {
      type: String,
      default: '次'
    },
    price: {
      type: Number,
      required: true
    }
  }],
  
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
  
  duration: {
    type: Number,
    default: 2
  },
  
  description: {
    type: String,
    default: ''
  },
  
  photos: [{
    url: String,
    caption: String
  }],
  
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
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
  
  rating: {
    score: {
      type: Number,
      min: 0,
      max: 5
    },
    comment: String,
    createdAt: Date
  },
  
  price: {
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      default: 0
    }
  },
  
  payment: {
    status: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid'
    },
    method: String,
    transactionId: String,
    paidAt: Date
  },
  
  cancelledReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  
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

housekeepingOrderSchema.index({ villageId: 1, userId: 1, status: 1 });
housekeepingOrderSchema.index({ villageId: 1, serviceProviderId: 1, status: 1 });
housekeepingOrderSchema.index({ appointmentTime: 1, status: 1 });

housekeepingOrderSchema.methods.addTimeline = function(action, status, description, operator) {
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

housekeepingOrderSchema.methods.updateStatus = function(newStatus, operator, description) {
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
  return this.save();
};

module.exports = mongoose.model('HousekeepingOrder', housekeepingOrderSchema);
