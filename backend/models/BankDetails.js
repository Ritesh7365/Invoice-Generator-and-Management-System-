import mongoose from 'mongoose';

const bankDetailsSchema = new mongoose.Schema({
  accountHolderName: {
    type: String,
    required: true,
    trim: true
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true
  },
  ifsc: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  branch: {
    type: String,
    trim: true
  },
  accountType: {
    type: String,
    enum: ['savings', 'current'],
    default: 'current'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isCompanyAccount: {
    type: Boolean,
    default: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model('BankDetails', bankDetailsSchema);

