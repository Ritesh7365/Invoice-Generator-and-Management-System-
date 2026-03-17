import express from 'express';
import { body, validationResult } from 'express-validator';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { formatDate, dbHelpers } from '../utils/db.js';

const router = express.Router();

// Get all payments (with totalInvoiceAmount, totalPaidAmount, amountRemaining per invoice)
router.get('/', authenticate, async (req, res) => {
  try {
    const { invoice, startDate, endDate } = req.query;
    const where = {};

    if (req.user.role !== 'ca') {
      where.receivedBy = req.user.id;
    }

    if (invoice) where.invoiceId = invoice;
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = startDate;
      if (endDate) where.paymentDate.lte = endDate;
    }

    const payments = await Payment.findAllWithInvoice(where);

    // Cumulative: totalPaidSoFar = sum of ALL payments for that invoice (use SQL for single source of truth)
    const whereClauses = [];
    const params = [];
    if (req.user.role !== 'ca') {
      whereClauses.push('receivedBy = ?');
      params.push(req.user.id);
    }
    if (invoice) {
      whereClauses.push('invoiceId = ?');
      params.push(invoice);
    }
    if (startDate) {
      whereClauses.push('paymentDate >= ?');
      params.push(formatDate(new Date(startDate)));
    }
    if (endDate) {
      whereClauses.push('paymentDate <= ?');
      params.push(formatDate(new Date(endDate)));
    }
    const whereSql = whereClauses.length ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    const totalsRows = await dbHelpers.raw(
      `SELECT invoiceId, SUM(amount) as totalPaid FROM payments${whereSql} GROUP BY invoiceId`,
      params
    );
    const totalPaidByInvoice = {};
    (totalsRows || []).forEach((row) => {
      const id = row.invoiceId != null ? Number(row.invoiceId) : null;
      if (id == null || isNaN(id)) return;
      totalPaidByInvoice[id] = Number(row.totalPaid) || 0;
    });

    // Enrich each payment: amountRemaining = totalInvoiceAmount - totalPaidSoFar (all payments for invoice)
    const enrichedPayments = payments.map((p) => {
      const totalInvoiceAmount = Number(p.invoice?.totalAmount) || 0;
      const invId = p.invoiceId != null ? Number(p.invoiceId) : null;
      const totalPaidSoFar = (invId != null && !isNaN(invId) ? totalPaidByInvoice[invId] : 0) || 0;
      const amountRemaining = Math.max(0, totalInvoiceAmount - totalPaidSoFar);

      return {
        ...p,
        amountPaid: Number(p.amount) || 0,
        totalInvoiceAmount,
        totalPaidAmount: totalPaidSoFar,
        amountRemaining
      };
    });

    res.json(enrichedPayments);
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

    if (req.user.role !== 'ca' && invoice.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const payments = await Payment.findByInvoiceId(req.params.invoiceId);

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const remaining = parseFloat(invoice.totalAmount) - totalPaid;

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

    // Validate invoice ID
    if (!req.body.invoice || req.body.invoice.toString().trim() === '') {
      return res.status(400).json({ message: 'Invoice is required' });
    }
    
    const invoiceId = req.body.invoice.toString().trim();
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      console.error('[Payments] Invoice not found:', invoiceId);
      return res.status(404).json({ 
        message: 'Invoice not found',
        error: `Invoice with ID ${invoiceId} does not exist in the database`
      });
    }

    if (invoice.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const payment = await Payment.create({
      invoiceId: parseInt(invoiceId),
      amount: parseFloat(req.body.amount) || 0,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
      paymentMode: req.body.paymentMode,
      transactionId: req.body.transactionId?.trim() || null,
      notes: req.body.notes?.trim() || null,
      receivedBy: req.user.id
    });

    // Update invoice payment status
    const allPayments = await Payment.findByInvoiceId(invoice.id);
    const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    let paymentStatus = 'unpaid';
    if (totalPaid >= parseFloat(invoice.totalAmount)) {
      paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'partially-paid';
    }

    await Invoice.update(invoice.id, { paymentStatus });

    const paymentWithInvoice = await Payment.findByIdWithInvoice(payment.id);

    res.status(201).json(paymentWithInvoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update payment
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const payment = await Payment.findByIdWithInvoice(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.receivedBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateData = {};
    if (req.body.amount !== undefined) updateData.amount = req.body.amount;
    if (req.body.paymentMode !== undefined) updateData.paymentMode = req.body.paymentMode;
    if (req.body.paymentDate !== undefined) updateData.paymentDate = req.body.paymentDate;
    if (req.body.transactionId !== undefined) updateData.transactionId = req.body.transactionId;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;

    await Payment.update(req.params.id, updateData);

    // Update invoice payment status
    const invoice = await Invoice.findById(payment.invoiceId);
    const allPayments = await Payment.findByInvoiceId(invoice.id);
    const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    let paymentStatus = 'unpaid';
    if (totalPaid >= parseFloat(invoice.totalAmount)) {
      paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'partially-paid';
    }

    await Invoice.update(invoice.id, { paymentStatus });

    const paymentWithInvoice = await Payment.findByIdWithInvoice(req.params.id);

    res.json(paymentWithInvoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete payment
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.receivedBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const invoiceId = payment.invoiceId;
    await Payment.delete(req.params.id);

    // Update invoice payment status
    const invoice = await Invoice.findById(invoiceId);
    const allPayments = await Payment.findByInvoiceId(invoiceId);
    const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    let paymentStatus = 'unpaid';
    if (totalPaid >= parseFloat(invoice.totalAmount)) {
      paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'partially-paid';
    }

    await Invoice.update(invoiceId, { paymentStatus });

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
