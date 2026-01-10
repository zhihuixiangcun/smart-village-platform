const mongoose = require('mongoose');

const townshipSchema = new mongoose.Schema({
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
  districtCode: {
    type: String,
    required: true,
    index: true
  },
  districtName: {
    type: String,
    required: true,
    index: true
  },
  level: {
    type: String,
    enum: ['town', 'township', 'subdistrict', 'ethnic_township', 'ethnic_town'],
    required: true
  },
  shortName: String,
  englishName: String,
  pinyin: String,
  type: String,
  area: Number,
  population: Number,
  coordinates: {
    type: [Number]
  },
  children: [{
    type: String,
    ref: 'Village'
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

townshipSchema.index({ provinceCode: 1, cityCode: 1, districtCode: 1, isActive: 1 });
townshipSchema.index({ pinyin: 1 });
townshipSchema.index({ type: 1 });

module.exports = mongoose.model('Township', townshipSchema);
