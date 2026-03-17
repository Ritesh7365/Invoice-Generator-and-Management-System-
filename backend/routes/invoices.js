import express from 'express';
import { body, validationResult } from 'express-validator';
import Invoice from '../models/Invoice.js';
import InvoiceItem from '../models/InvoiceItem.js';
import Customer from '../models/Customer.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { calculateGST, getGSTRate } from '../utils/gstCalculator.js';
import { generateInvoicePDF } from '../utils/pdfGenerator.js';
import { formatDate } from '../utils/db.js';

const router = express.Router();

// Get all invoices
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, customer, project, startDate, endDate } = req.query;
    const where = {};

    if (req.user.role !== 'ca') {
      where.createdBy = req.user.id;
    }

    if (status) where.paymentStatus = status;
    if (type) where.invoiceType = type;
    if (customer) where.customerId = customer;
    if (project) where.projectId = project;
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = startDate;
      if (endDate) where.invoiceDate.lte = endDate;
    }

    const result = await Invoice.findAndCountAll(where, {
      orderBy: 'i.invoiceDate DESC',
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Get invoice items for each invoice
    const invoiceIds = result.rows.map(inv => inv.id);
    let itemsMap = {};
    if (invoiceIds.length > 0) {
      const allItems = await InvoiceItem.findAll({ invoiceId: invoiceIds });
      itemsMap = allItems.reduce((acc, item) => {
        if (!acc[item.invoiceId]) acc[item.invoiceId] = [];
        acc[item.invoiceId].push({
          id: item.id,
          description: item.description,
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate),
          amount: parseFloat(item.amount)
        });
        return acc;
      }, {});
    }

    // Transform items array for backward compatibility
    const transformedInvoices = result.rows.map(invoice => {
      const invoiceData = { ...invoice };
      invoiceData.items = itemsMap[invoice.id] || [];
      return invoiceData;
    });

    res.json({
      invoices: transformedInvoices,
      totalPages: Math.ceil(result.count / limit),
      currentPage: parseInt(page),
      total: result.count
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single invoice
router.get('/:id', authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (req.user.role !== 'ca' && invoice.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const invoiceData = { ...invoice };
    invoiceData.items = invoiceData.items || [];
    res.json(invoiceData);
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
      includeGst,
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

    // Calculate subtotal
    const subtotal = cleanedItems.reduce((sum, item) => sum + item.amount, 0);

    // Validate and get customer data for GST calculation
    if (!customer || customer.toString().trim() === '') {
      return res.status(400).json({ message: 'Customer is required' });
    }
    
    const customerData = await Customer.findById(customer.toString().trim());
    if (!customerData) {
      console.error('[Invoices] Customer not found:', customer);
      return res.status(404).json({ 
        message: 'Customer not found',
        error: `Customer with ID ${customer} does not exist in the database`
      });
    }

    // Get company state from user (flattened field)
    const companyState = req.user.companyState || '';

    // Calculate GST (all types support GST; non-tax-invoice uses includeGst flag)
    const effectiveGSTRate = getGSTRate(invoiceType, gstRate || 0, includeGst === true || includeGst === 'true');
    const gstApplicable = effectiveGSTRate > 0;
    
    let cgst = 0, sgst = 0, igst = 0, totalAmount = subtotal;

    if (gstApplicable) {
      const gstCalculation = calculateGST(
        subtotal,
        effectiveGSTRate,
        customerData.addressState || '',
        companyState
      );
      cgst = gstCalculation.cgst;
      sgst = gstCalculation.sgst;
      igst = gstCalculation.igst;
      totalAmount = gstCalculation.total;
    }

    // Create invoice
    const invoice = await Invoice.create({
      customerId: parseInt(customer.toString().trim()),
      projectId: project && project.toString().trim() !== '' ? parseInt(project.toString().trim()) : null,
      invoiceType,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      subtotal,
      gstApplicable,
      gstRate: effectiveGSTRate,
      cgst,
      sgst,
      igst,
      totalAmount,
      gstPaid: gstPaid || false,
      companyBankDetailsId: companyBankDetails && companyBankDetails.toString().trim() !== '' ? parseInt(companyBankDetails.toString().trim()) : null,
      customerBankDetailsId: customerBankDetails && customerBankDetails.toString().trim() !== '' ? parseInt(customerBankDetails.toString().trim()) : null,
      notes: notes?.trim() || '',
      taxId: taxId?.trim() || '',
      createdBy: req.user.id
    });

    // Create invoice items
    await Promise.all(
      cleanedItems.map(item =>
        InvoiceItem.create({
          invoiceId: invoice.id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount
        })
      )
    );

    // Fetch invoice with relations
    const invoiceWithRelations = await Invoice.findById(invoice.id);

    res.status(201).json(invoiceWithRelations);
  } catch (error) {
    console.error('[Invoices] Error creating invoice:', error);
    console.error('[Invoices] Error message:', error.message);
    console.error('[Invoices] Error code:', error.code);
    
    // Handle foreign key constraint errors
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.message.includes('foreign key constraint')) {
      return res.status(400).json({ 
        message: 'Invalid reference. Please check that the customer, project, or bank details exist.',
        error: error.message
      });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        code: error.code 
      })
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

    if (invoice.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      customer,
      project,
      invoiceType,
      items,
      gstRate,
      gstPaid,
      includeGst,
      companyBankDetails,
      customerBankDetails,
      notes,
      invoiceDate,
      taxId,
      paymentStatus
    } = req.body;

    // Recalculate if items changed
    if (items && Array.isArray(items)) {
      const subtotal = items.reduce((sum, item) => sum + (item.amount || item.rate * (item.quantity || 1)), 0);
      invoice.subtotal = subtotal;

      const customerData = await Customer.findById(customer || invoice.customerId);
      const companyState = req.user.companyState || '';
      const effectiveGSTRate = getGSTRate(
        invoiceType || invoice.invoiceType,
        gstRate ?? invoice.gstRate ?? 0,
        includeGst === true || includeGst === 'true'
      );
      const gstApplicable = effectiveGSTRate > 0;

      if (gstApplicable) {
        const gstCalculation = calculateGST(
          subtotal,
          effectiveGSTRate,
          customerData?.addressState || '',
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

      invoice.gstRate = effectiveGSTRate;
      invoice.gstApplicable = gstApplicable;

      // Delete existing items and create new ones
      await InvoiceItem.deleteByInvoiceId(invoice.id);
      await Promise.all(
        items.map(item =>
          InvoiceItem.create({
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity || 1,
            rate: item.rate,
            amount: item.amount || item.rate * (item.quantity || 1)
          })
        )
      );
    }

    const updateData = {};
    if (customer) updateData.customerId = customer;
    if (project !== undefined) updateData.projectId = project || null;
    if (invoiceType) updateData.invoiceType = invoiceType;
    if (gstPaid !== undefined) updateData.gstPaid = gstPaid;
    if (companyBankDetails !== undefined) updateData.companyBankDetailsId = companyBankDetails || null;
    if (customerBankDetails !== undefined) updateData.customerBankDetailsId = customerBankDetails || null;
    if (notes !== undefined) updateData.notes = notes;
    if (invoiceDate) updateData.invoiceDate = invoiceDate;
    if (taxId !== undefined) updateData.taxId = taxId;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    // Add calculated fields if items were updated
    if (items && Array.isArray(items)) {
      updateData.subtotal = invoice.subtotal;
      updateData.gstRate = invoice.gstRate;
      updateData.gstApplicable = invoice.gstApplicable;
      updateData.cgst = invoice.cgst;
      updateData.sgst = invoice.sgst;
      updateData.igst = invoice.igst;
      updateData.totalAmount = invoice.totalAmount;
    }

    await Invoice.update(req.params.id, updateData);

    // Fetch invoice with relations
    const invoiceWithRelations = await Invoice.findById(req.params.id);

    res.json(invoiceWithRelations);
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

    if (invoice.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Invoice.delete(req.params.id);
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate PDF
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const invoiceId = req.params.id;
    
    if (!invoiceId || invoiceId === 'undefined') {
      return res.status(400).json({ message: 'Invalid invoice ID' });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      console.error('[Invoices] PDF: Invoice not found:', invoiceId);
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (req.user.role !== 'ca' && invoice.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('[Invoices] Generating PDF for invoice:', invoiceId);
    const pdfBuffer = await generateInvoicePDF(invoiceId, req.user.id);
    
    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error('[Invoices] PDF generation returned empty buffer');
      return res.status(500).json({ message: 'Failed to generate PDF' });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceId || invoiceId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[Invoices] PDF generation error:', error);
    console.error('[Invoices] Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

export default router;
