import express from 'express';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import Project from '../models/Project.js';
import { authenticate } from '../middleware/auth.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const router = express.Router();

// Dashboard summary
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (req.user.role !== 'ca') {
      query.createdBy = req.user._id;
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query);
    const payments = await Payment.find({
      receivedBy: req.user.role === 'ca' ? { $exists: true } : req.user._id,
      paymentDate: startDate || endDate ? {
        ...(startDate && { $gte: new Date(startDate) }),
        ...(endDate && { $lte: new Date(endDate) })
      } : { $exists: true }
    });

    const totalInvoices = invoices.length;
    const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalGST = invoices.reduce((sum, inv) => sum + inv.cgst + inv.sgst + inv.igst, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = totalBilled - totalPaid;

    const paidInvoices = invoices.filter(inv => inv.paymentStatus === 'paid').length;
    const unpaidInvoices = invoices.filter(inv => inv.paymentStatus === 'unpaid').length;
    const partiallyPaidInvoices = invoices.filter(inv => inv.paymentStatus === 'partially-paid').length;

    res.json({
      totalInvoices,
      totalBilled,
      totalGST,
      totalPaid,
      outstanding,
      paidInvoices,
      unpaidInvoices,
      partiallyPaidInvoices,
      invoicesByType: {
        proforma: invoices.filter(inv => inv.invoiceType === 'proforma').length,
        taxInvoice: invoices.filter(inv => inv.invoiceType === 'tax-invoice').length,
        nonTaxInvoice: invoices.filter(inv => inv.invoiceType === 'non-tax-invoice').length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GST Report
router.get('/gst', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {
      invoiceType: 'tax-invoice',
      gstApplicable: true
    };

    if (req.user.role !== 'ca') {
      query.createdBy = req.user._id;
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query)
      .populate('customer', 'name companyName gstin')
      .sort({ invoiceDate: 1 });

    const gstSummary = {
      totalCGST: invoices.reduce((sum, inv) => sum + inv.cgst, 0),
      totalSGST: invoices.reduce((sum, inv) => sum + inv.sgst, 0),
      totalIGST: invoices.reduce((sum, inv) => sum + inv.igst, 0),
      totalGST: invoices.reduce((sum, inv) => sum + inv.cgst + inv.sgst + inv.igst, 0),
      totalTaxableValue: invoices.reduce((sum, inv) => sum + inv.subtotal, 0),
      invoices
    };

    res.json(gstSummary);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export GST Report to Excel
router.get('/gst/export/excel', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {
      invoiceType: 'tax-invoice',
      gstApplicable: true
    };

    if (req.user.role !== 'ca') {
      query.createdBy = req.user._id;
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query)
      .populate('customer', 'name companyName gstin')
      .sort({ invoiceDate: 1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GST Report');

    worksheet.columns = [
      { header: 'Invoice ID', key: 'invoiceId', width: 15 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Customer', key: 'customer', width: 30 },
      { header: 'GSTIN', key: 'gstin', width: 20 },
      { header: 'Taxable Value', key: 'taxable', width: 15 },
      { header: 'CGST', key: 'cgst', width: 12 },
      { header: 'SGST', key: 'sgst', width: 12 },
      { header: 'IGST', key: 'igst', width: 12 },
      { header: 'Total GST', key: 'totalGST', width: 15 },
      { header: 'Total Amount', key: 'total', width: 15 }
    ];

    invoices.forEach(invoice => {
      worksheet.addRow({
        invoiceId: invoice.invoiceId,
        date: invoice.invoiceDate.toISOString().split('T')[0],
        customer: invoice.customer?.name || invoice.customer?.companyName || 'N/A',
        gstin: invoice.customer?.gstin || 'N/A',
        taxable: invoice.subtotal,
        cgst: invoice.cgst,
        sgst: invoice.sgst,
        igst: invoice.igst,
        totalGST: invoice.cgst + invoice.sgst + invoice.igst,
        total: invoice.totalAmount
      });
    });

    // Add summary row
    const totalTaxable = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
    const totalCGST = invoices.reduce((sum, inv) => sum + inv.cgst, 0);
    const totalSGST = invoices.reduce((sum, inv) => sum + inv.sgst, 0);
    const totalIGST = invoices.reduce((sum, inv) => sum + inv.igst, 0);
    const totalGST = totalCGST + totalSGST + totalIGST;
    const grandTotal = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    worksheet.addRow({
      invoiceId: 'TOTAL',
      date: '',
      customer: '',
      gstin: '',
      taxable: totalTaxable,
      cgst: totalCGST,
      sgst: totalSGST,
      igst: totalIGST,
      totalGST: totalGST,
      total: grandTotal
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=gst-report.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Customer-wise report
router.get('/customer/:customerId', authenticate, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const query = { customer: req.params.customerId };
    if (req.user.role !== 'ca') {
      query.createdBy = req.user._id;
    }

    const invoices = await Invoice.find(query)
      .populate('project', 'name')
      .sort({ invoiceDate: -1 });

    const payments = await Payment.find({
      invoice: { $in: invoices.map(inv => inv._id) }
    }).sort({ paymentDate: -1 });

    const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      customer,
      invoices,
      payments,
      summary: {
        totalInvoices: invoices.length,
        totalBilled,
        totalPaid,
        outstanding: totalBilled - totalPaid
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Project-wise report
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate('customer');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const query = { project: req.params.projectId };
    if (req.user.role !== 'ca') {
      query.createdBy = req.user._id;
    }

    const invoices = await Invoice.find(query).sort({ invoiceDate: -1 });
    const payments = await Payment.find({
      invoice: { $in: invoices.map(inv => inv._id) }
    }).sort({ paymentDate: -1 });

    const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      project,
      invoices,
      payments,
      summary: {
        totalInvoices: invoices.length,
        totalBilled,
        totalPaid,
        outstanding: totalBilled - totalPaid
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;




