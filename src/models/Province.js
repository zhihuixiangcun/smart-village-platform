const mongoose = require('mongoose');

const provinceSchema = new mongoose.Schema({
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
  level: {
    type: String,
    enum: ['province', 'municipality', 'autonomous_region', 'sar'],
    required: true
  },
  shortName: String,
  englishName: String,
  pinyin: String,
  pinyinShort: String,
  capital: String,
  area: Number,
  population: Number,
  GDP: Number,
  coordinates: {
    type: [Number]
  },
  children: [{
    type: String,
    ref: 'City'
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

provinceSchema.index({ level: 1, isActive: 1 });
provinceSchema.index({ pinyin: 1 });

module.exports = mongoose.model('Province', provinceSchema);
