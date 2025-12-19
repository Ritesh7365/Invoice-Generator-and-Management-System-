import express from 'express';
import { body, validationResult } from 'express-validator';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all payments
router.get('/', authenticate, async (req, res) => {
  try {
    const { invoice, startDate, endDate } = req.query;
    const query = {};

    if (req.user.role !== 'ca') {
      query.receivedBy = req.user._id;
    }

    if (invoice) query.invoice = invoice;
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('invoice', 'invoiceId invoiceDate totalAmount customer')
      .populate('invoice.customer', 'name companyName')
      .sort({ paymentDate: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payments for an invoice
router.get('/invoice/:invoiceId', authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (req.user.role !== 'ca' && invoice.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const payments = await Payment.find({ invoice: req.params.invoiceId })
      .sort({ paymentDate: -1 });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = invoice.totalAmount - totalPaid;

    res.json({
      payments,
      totalPaid,
      remaining,
      invoiceTotal: invoice.totalAmount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create payment
router.post('/', authenticate, authorize('admin'), [
  body('invoice').notEmpty().withMessage('Invoice is required'),
  body('amount').isNumeric().withMessage('Amount must be numeric'),
  body('paymentMode').isIn(['online', 'offline', 'bank-transfer', 'upi', 'cheque', 'cash']).withMessage('Invalid payment mode'),
  body('paymentDate').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoice = await Invoice.findById(req.body.invoice);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const payment = new Payment({
      ...req.body,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
      receivedBy: req.user._id
    });

    await payment.save();

    // Update invoice payment status
    const allPayments = await Payment.find({ invoice: invoice._id });
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= invoice.totalAmount) {
      invoice.paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      invoice.paymentStatus = 'partially-paid';
    } else {
      invoice.paymentStatus = 'unpaid';
    }

    await invoice.save();

    await payment.populate('invoice', 'invoiceId invoiceDate totalAmount');

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update payment
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('invoice');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.receivedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    Object.assign(payment, req.body);
    if (req.body.paymentDate) {
      payment.paymentDate = new Date(req.body.paymentDate);
    }
    await payment.save();

    // Update invoice payment status
    const invoice = await Invoice.findById(payment.invoice._id);
    const allPayments = await Payment.find({ invoice: invoice._id });
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= invoice.totalAmount) {
      invoice.paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      invoice.paymentStatus = 'partially-paid';
    } else {
      invoice.paymentStatus = 'unpaid';
    }

    await invoice.save();
    await payment.populate('invoice', 'invoiceId invoiceDate totalAmount');

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete payment
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('invoice');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.receivedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const invoiceId = payment.invoice._id;
    await Payment.findByIdAndDelete(req.params.id);

    // Update invoice payment status
    const invoice = await Invoice.findById(invoiceId);
    const allPayments = await Payment.find({ invoice: invoiceId });
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= invoice.totalAmount) {
      invoice.paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      invoice.paymentStatus = 'partially-paid';
    } else {
      invoice.paymentStatus = 'unpaid';
    }

    await invoice.save();

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

