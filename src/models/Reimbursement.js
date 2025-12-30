const mongoose = require('mongoose');
const logger = require('../utils/logger');

const ReimbursementCategories = {
  OFFICE_SUPPLIES: 'office_supplies',
  ACTIVITY_EXPENSES: 'activity_expenses',
  PROJECT_COSTS: 'project_costs',
  PUBLIC_WELFARE: 'public_welfare',
  OTHER: 'other'
};

const ReimbursementStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  REVIEWING: 'reviewing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
  ARCHIVED: 'archived'
};

const ReimbursementAttachmentSchema = new mongoose.Schema({
  reimbursementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reimbursement',
    index: true
  },
  fileType: {
    type: String,
    enum: ['invoice', 'receipt', 'list', 'photo', 'approval_doc', 'other'],
    required: true
  },
  fileName: { type: String, required: true },
  originalName: String,
  filePath: { type: String, required: true },
  fileSize: Number,
  mimeType: String,
  ocrData: {
    amount: Number,
    date: Date,
    merchant: String,
    confidence: Number
  },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true,
  collection: 'reimbursement_attachments'
});

const ReimbursementSchema = new mongoose.Schema({
  reimbursementId: { type: String, unique: true, index: true },
  villageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', index: true },
  applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  applicantName: String,
  department: String,
  category: { type: String, enum: Object.values(ReimbursementCategories), required: true },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, maxlength: 2000 },
  occurrenceDate: Date,
  applicationDate: { type: Date, default: Date.now, index: true },
  materialsStatus: {
    required: [String],
    submitted: [String],
    missing: [String],
    completeness: { type: Number, default: 0, min: 0, max: 100 }
  },
  approvalFlow: [{
    role: String,
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    comment: String,
    timestamp: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: Object.values(ReimbursementStatus), default: 'pending', index: true },
  paymentInfo: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    paymentDate: Date,
    paymentVoucher: String
  },
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  collection: 'reimbursements'
});

ReimbursementSchema.index({ villageId: 1, applicationDate: -1 });
ReimbursementSchema.index({ applicantId: 1, status: 1 });
ReimbursementAttachmentSchema.index({ reimbursementId: 1, fileType: 1 });

ReimbursementSchema.statics.generateReimbursementId = async function() {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
                 (date.getMonth() + 1).toString().padStart(2, '0') +
                 date.getDate().toString().padStart(2, '0');
  const count = await this.countDocuments({
    applicationDate: { $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()) }
  });
  return 'RE' + dateStr + (count + 1).toString().padStart(4, '0');
};

ReimbursementSchema.methods.checkCompleteness = function() {
  const requiredMap = {
    office_supplies: ['invoice'],
    activity_expenses: ['invoice', 'approval_doc'],
    project_costs: ['invoice', 'approval_doc'],
    public_welfare: ['invoice'],
    other: ['invoice']
  };
  const required = requiredMap[this.category] || ['invoice'];
  const submitted = this.materialsStatus.submitted || [];
  const missing = required.filter(r => !submitted.includes(r));
  this.materialsStatus.required = required;
  this.materialsStatus.missing = missing;
  this.materialsStatus.completeness = Math.round((submitted.filter(s => required.includes(s)).length / required.length) * 100);
  return this.materialsStatus;
};

module.exports = {
  Reimbursement: mongoose.model('Reimbursement', ReimbursementSchema),
  ReimbursementAttachment: mongoose.model('ReimbursementAttachment', ReimbursementAttachmentSchema),
  ReimbursementCategories,
  ReimbursementStatus
};
