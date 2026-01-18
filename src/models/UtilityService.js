const mongoose = require('mongoose');

const utilityServiceSchema = new mongoose.Schema({
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
  
  type: {
    type: String,
    required: true,
    enum: ['repair', 'cleaning', 'delivery', 'elderly', 'medical', 'education', 'other']
  },
  
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  contact: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    }
  },
  
  address: {
    area: String,
    building: String,
    unit: String,
    detail: String
  },
  
  photos: [{
    url: String,
    caption: String
  }],
  
  price: {
    type: Number,
    default: 0
  },
  
  priceUnit: {
    type: String,
    default: '元/次'
  },
  
  tags: [{
    type: String
  }],
  
  status: {
    type: String,
    enum: ['pending', 'active', 'paused', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  isPublic: {
    type: Boolean,
    default: true
  },
  
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  likeCount: {
    type: Number,
    default: 0
  },
  
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  commentCount: {
    type: Number,
    default: 0
  },
  
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
  
  views: {
    type: Number,
    default: 0
  },
  
  expireAt: {
    type: Date
  },
  
  completedAt: Date,
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

utilityServiceSchema.index({ villageId: 1, type: 1, status: 1 });
utilityServiceSchema.index({ villageId: 1, status: 1, createdAt: -1 });
utilityServiceSchema.index({ userId: 1, status: 1 });
utilityServiceSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

utilityServiceSchema.methods.addLike = function(userId) {
  const existingLike = this.likes.find(like => like.userId.toString() === userId.toString());
  if (!existingLike) {
    this.likes.push({ userId, createdAt: new Date() });
    this.likeCount = this.likes.length;
    return this.save();
  }
  return Promise.resolve(this);
};

utilityServiceSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.userId.toString() !== userId.toString());
  this.likeCount = this.likes.length;
  return this.save();
};

utilityServiceSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    userId,
    content,
    createdAt: new Date()
  });
  this.commentCount = this.comments.length;
  return this.save();
};

utilityServiceSchema.methods.updateRating = function(rating) {
  const { average, count } = this.rating;
  const newAverage = ((average * count) + rating) / (count + 1);
  this.rating = {
    average: Math.round(newAverage * 10) / 10,
    count: count + 1
  };
  return this.save();
};

utilityServiceSchema.statics.getServiceTypes = function(villageId) {
  return this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        status: { $in: ['active', 'completed'] }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        averagePrice: { $avg: '$price' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

utilityServiceSchema.statics.getServiceStatistics = function(villageId) {
  return this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId)
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likeCount' },
        totalComments: { $sum: '$commentCount' },
        avgRating: { $avg: '$rating.average' }
      }
    }
  ]);
};

module.exports = mongoose.model('UtilityService', utilityServiceSchema);
