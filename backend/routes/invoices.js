import express from 'express';
import { body, validationResult } from 'express-validator';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { calculateGST, getGSTRate } from '../utils/gstCalculator.js';
import { generateInvoicePDF } from '../utils/pdfGenerator.js';

const router = express.Router();

// Get all invoices
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, customer, project, startDate, endDate } = req.query;
    const query = {};

    if (req.user.role === 'ca') {
      // CA can view all invoices
    } else {
      query.createdBy = req.user._id;
    }

    if (status) query.paymentStatus = status;
    if (type) query.invoiceType = type;
    if (customer) query.customer = customer;
    if (project) query.project = project;
    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query)
      .populate('customer', 'name companyName email gstin')
      .populate('project', 'name')
      .populate('companyBankDetails', 'accountNumber ifsc bankName')
      .populate('customerBankDetails', 'accountNumber ifsc bankName')
      .sort({ invoiceDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Invoice.countDocuments(query);

    res.json({
      invoices,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single invoice
router.get('/:id', authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('project')
      .populate('companyBankDetails')
      .populate('customerBankDetails');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (req.user.role !== 'ca' && invoice.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create invoice
router.post('/', authenticate, authorize('admin'), [
  body('customer').notEmpty().withMessage('Customer is required'),
  body('invoiceType').isIn(['proforma', 'tax-invoice', 'non-tax-invoice']).withMessage('Invalid invoice type'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.description').notEmpty().withMessage('Item description is required'),
  body('items.*.rate').custom((value) => {
    if (value === '' || value === null || value === undefined) {
      throw new Error('Item rate is required');
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      throw new Error('Item rate must be a valid number');
    }
    return true;
  }),
  body('items.*.amount').custom((value) => {
    if (value === '' || value === null || value === undefined) {
      throw new Error('Item amount is required');
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      throw new Error('Item amount must be a valid number');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const {
      customer,
      project,
      invoiceType,
      items,
      gstRate,
      gstPaid,
      companyBankDetails,
      customerBankDetails,
      notes,
      invoiceDate,
      taxId
    } = req.body;

    // Clean up items - ensure numeric values
    const cleanedItems = items.map(item => ({
      description: item.description.trim(),
      quantity: parseFloat(item.quantity) || 1,
      rate: parseFloat(item.rate) || 0,
      amount: parseFloat(item.amount) || (parseFloat(item.rate) || 0) * (parseFloat(item.quantity) || 1)
    }));

    // Handle empty optional fields
    const invoiceData = {
      customer,
      invoiceType,
      items: cleanedItems,
      gstRate: parseFloat(gstRate) || 0,
      gstPaid: gstPaid || false,
      notes: notes?.trim() || '',
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      taxId: taxId?.trim() || '',
      createdBy: req.user._id
    };

    // Only add optional fields if they have values
    if (project && project !== '') {
      invoiceData.project = project;
    }
    if (companyBankDetails && companyBankDetails !== '') {
      invoiceData.companyBankDetails = companyBankDetails;
    }
    if (customerBankDetails && customerBankDetails !== '') {
      invoiceData.customerBankDetails = customerBankDetails;
    }

    // Calculate subtotal
    const subtotal = cleanedItems.reduce((sum, item) => sum + item.amount, 0);

    // Get customer state for GST calculation
    const customerData = await Customer.findById(customer);
    if (!customerData) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Get company state from user
    const companyState = req.user.companyDetails?.state || '';

    // Calculate GST
    const effectiveGSTRate = getGSTRate(invoiceType, gstRate || 0);
    const gstApplicable = invoiceType === 'tax-invoice' && effectiveGSTRate > 0;
    
    let cgst = 0, sgst = 0, igst = 0, totalAmount = subtotal;

    if (gstApplicable) {
      const gstCalculation = calculateGST(
        subtotal,
        effectiveGSTRate,
        customerData.address?.state || '',
        companyState
      );
      cgst = gstCalculation.cgst;
      sgst = gstCalculation.sgst;
      igst = gstCalculation.igst;
      totalAmount = gstCalculation.total;
    }

    const invoice = new Invoice({
      ...invoiceData,
      items: cleanedItems,
      subtotal,
      gstApplicable,
      gstRate: effectiveGSTRate,
      cgst,
      sgst,
      igst,
      totalAmount
    });

    await invoice.save();
    await invoice.populate('customer project companyBankDetails customerBankDetails');

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Invoice creation error:', error);
    // Handle duplicate invoice ID error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Invoice ID already exists. Please try again.',
        error: error.message 
      });
    }
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        error: error.message,
        details: Object.values(error.errors || {}).map(e => e.message)
      });
    }
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update invoice
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      customer,
      project,
      invoiceType,
      items,
      gstRate,
      gstPaid,
      companyBankDetails,
      customerBankDetails,
      notes,
      invoiceDate,
      taxId,
      paymentStatus
    } = req.body;

    // Recalculate if items changed
    if (items) {
      const subtotal = items.reduce((sum, item) => sum + (item.amount || item.rate * (item.quantity || 1)), 0);
      invoice.subtotal = subtotal;

      const customerData = await Customer.findById(customer || invoice.customer);
      const companyState = req.user.companyDetails?.state || '';
      const effectiveGSTRate = getGSTRate(invoiceType || invoice.invoiceType, gstRate || invoice.gstRate || 0);
      const gstApplicable = (invoiceType || invoice.invoiceType) === 'tax-invoice' && effectiveGSTRate > 0;

      if (gstApplicable) {
        const gstCalculation = calculateGST(
          subtotal,
          effectiveGSTRate,
          customerData.address?.state || '',
          companyState
        );
        invoice.cgst = gstCalculation.cgst;
        invoice.sgst = gstCalculation.sgst;
        invoice.igst = gstCalculation.igst;
        invoice.totalAmount = gstCalculation.total;
      } else {
        invoice.cgst = 0;
        invoice.sgst = 0;
        invoice.igst = 0;
        invoice.totalAmount = subtotal;
      }

      invoice.items = items;
      invoice.gstRate = effectiveGSTRate;
      invoice.gstApplicable = gstApplicable;
    }

    if (customer) invoice.customer = customer;
    if (project !== undefined) invoice.project = project;
    if (invoiceType) invoice.invoiceType = invoiceType;
    if (gstPaid !== undefined) invoice.gstPaid = gstPaid;
    if (companyBankDetails !== undefined) invoice.companyBankDetails = companyBankDetails;
    if (customerBankDetails !== undefined) invoice.customerBankDetails = customerBankDetails;
    if (notes !== undefined) invoice.notes = notes;
    if (invoiceDate) invoice.invoiceDate = new Date(invoiceDate);
    if (taxId !== undefined) invoice.taxId = taxId;
    if (paymentStatus) invoice.paymentStatus = paymentStatus;

    await invoice.save();
    await invoice.populate('customer project companyBankDetails customerBankDetails');

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete invoice
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate PDF
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (req.user.role !== 'ca' && invoice.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const pdfBuffer = await generateInvoicePDF(req.params.id);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

