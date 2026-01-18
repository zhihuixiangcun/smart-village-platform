const mongoose = require('mongoose');

const serviceProviderSchema = new mongoose.Schema({
  villageId: {
    type: String,
    required: true,
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  type: {
    type: String,
    required: true,
    enum: ['housekeeping', 'repair', 'utility', 'property', 'transportation']
  },
  
  phone: {
    type: String,
    required: true,
    trim: true
  },
  
  address: {
    type: String,
    required: true
  },
  
  description: {
    type: String,
    default: ''
  },
  
  services: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      default: '次'
    }
  }],
  
  serviceArea: {
    type: String,
    default: '全村'
  },
  
  workHours: {
    start: {
      type: String,
      default: '08:00'
    },
    end: {
      type: String,
      default: '18:00'
    }
  },
  
  photos: [{
    type: String
  }],
  
  avatar: {
    type: String,
    default: ''
  },
  
  tags: [{
    type: String
  }],
  
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  
  orderCount: {
    type: Number,
    default: 0
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  isAvailable: {
    type: Boolean,
    default: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'inactive'],
    default: 'pending'
  },
  
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

serviceProviderSchema.index({ villageId: 1, type: 1, status: 1 });
serviceProviderSchema.index({ villageId: 1, isVerified: 1, isAvailable: 1 });

serviceProviderSchema.methods.updateRating = function(rating) {
  const { average, count } = this.rating;
  const newAverage = ((average * count) + rating) / (count + 1);
  this.rating = {
    average: Math.round(newAverage * 10) / 10,
    count: count + 1
  };
  return this.save();
};

serviceProviderSchema.methods.incrementOrderCount = function() {
  this.orderCount += 1;
  return this.save();
};

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema);
