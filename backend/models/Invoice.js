import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    required: false, // Will be auto-generated in pre-save hook
    unique: true
  },
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  invoiceType: {
    type: String,
    enum: ['proforma', 'tax-invoice', 'non-tax-invoice'],
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  items: [{
    description: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    },
    rate: {
      type: Number,
      required: true
    },
    amount: {
      type: Number,
      required: true
    }
  }],
  subtotal: {
    type: Number,
    required: true
  },
  gstApplicable: {
    type: Boolean,
    default: false
  },
  gstRate: {
    type: Number,
    default: 0
  },
  cgst: {
    type: Number,
    default: 0
  },
  sgst: {
    type: Number,
    default: 0
  },
  igst: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  taxId: {
    type: String,
    trim: true
  },
  gstPaid: {
    type: Boolean,
    default: false
  },
  companyBankDetails: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankDetails'
  },
  customerBankDetails: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankDetails'
  },
  notes: {
    type: String,
    trim: true
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partially-paid', 'paid'],
    default: 'unpaid'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Generate invoice ID before saving (runs before validation)
invoiceSchema.pre('save', async function(next) {
  // Only generate if invoiceId is not already set
  if (!this.invoiceId || this.invoiceId === '') {
    try {
      const invoiceDate = this.invoiceDate || new Date();
      const year = new Date(invoiceDate).getFullYear();
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year + 1, 0, 1);
      
      // Count existing invoices for this year
      const count = await mongoose.model('Invoice').countDocuments({
        invoiceDate: {
          $gte: startOfYear,
          $lt: endOfYear
        }
      });
      
      // Generate invoice ID: INV-YYYY-XXXX
      this.invoiceId = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
      
      // Ensure invoiceId is set (required for validation)
      if (!this.invoiceId) {
        throw new Error('Failed to generate invoice ID');
      }
    } catch (error) {
      console.error('Error generating invoice ID:', error);
      // Fallback: use timestamp-based ID
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-6);
      this.invoiceId = `INV-${year}-${timestamp}`;
    }
  }
  next();
});

export default mongoose.model('Invoice', invoiceSchema);

