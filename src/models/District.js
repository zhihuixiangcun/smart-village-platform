const mongoose = require('mongoose');

const districtSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  provinceCode: {
    type: String,
    required: true,
    index: true
  },
  provinceName: {
    type: String,
    required: true,
    index: true
  },
  cityCode: {
    type: String,
    required: true,
    index: true
  },
  cityName: {
    type: String,
    required: true,
    index: true
  },
  level: {
    type: String,
    enum: ['county', 'district', 'banner', 'autonomous_county'],
    required: true
  },
  shortName: String,
  englishName: String,
  pinyin: String,
  type: String,
  area: Number,
  population: Number,
  GDP: Number,
  coordinates: {
    type: [Number]
  },
  children: [{
    type: String,
    ref: 'Township'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: mongoose.Schema.Types.Mixed,
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

districtSchema.index({ provinceCode: 1, cityCode: 1, isActive: 1 });
districtSchema.index({ pinyin: 1 });
districtSchema.index({ type: 1 });

module.exports = mongoose.model('District', districtSchema);
