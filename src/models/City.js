const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
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
  level: {
    type: String,
    enum: ['prefecture', 'sub_provincial', 'county_level'],
    required: true
  },
  shortName: String,
  englishName: String,
  pinyin: String,
  type: String,
  capital: {
    type: Boolean,
    default: false
  },
  area: Number,
  population: Number,
  GDP: Number,
  coordinates: {
    type: [Number]
  },
  children: [{
    type: String,
    ref: 'District'
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

citySchema.index({ provinceCode: 1, isActive: 1 });
citySchema.index({ pinyin: 1 });
citySchema.index({ capital: 1 });

module.exports = mongoose.model('City', citySchema);
