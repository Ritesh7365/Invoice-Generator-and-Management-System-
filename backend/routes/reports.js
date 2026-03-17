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
    const where = {};

    if (req.user.role !== 'ca') {
      where.createdBy = req.user.id;
    }

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = startDate;
      if (endDate) where.invoiceDate.lte = endDate;
    }

    const invoices = await Invoice.findAll(where);
    
    const paymentWhere = {};
    if (req.user.role !== 'ca') {
      paymentWhere.receivedBy = req.user.id;
    }
    if (startDate || endDate) {
      paymentWhere.paymentDate = {};
      if (startDate) paymentWhere.paymentDate.gte = startDate;
      if (endDate) paymentWhere.paymentDate.lte = endDate;
    }
    
    const payments = await Payment.findAll(paymentWhere);

    const totalInvoices = invoices.length;
    const totalBilled = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
    const totalGST = invoices.reduce((sum, inv) => sum + parseFloat(inv.cgst) + parseFloat(inv.sgst) + parseFloat(inv.igst), 0);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
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
    const where = {
      invoiceType: 'tax-invoice',
      gstApplicable: true
    };

    if (req.user.role !== 'ca') {
      where.createdBy = req.user.id;
    }

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = startDate;
      if (endDate) where.invoiceDate.lte = endDate;
    }

    const invoices = await Invoice.findAll(where, {
      orderBy: 'i.invoiceDate ASC'
    });

    const gstSummary = {
      totalCGST: invoices.reduce((sum, inv) => sum + parseFloat(inv.cgst), 0),
      totalSGST: invoices.reduce((sum, inv) => sum + parseFloat(inv.sgst), 0),
      totalIGST: invoices.reduce((sum, inv) => sum + parseFloat(inv.igst), 0),
      totalGST: invoices.reduce((sum, inv) => sum + parseFloat(inv.cgst) + parseFloat(inv.sgst) + parseFloat(inv.igst), 0),
      totalTaxableValue: invoices.reduce((sum, inv) => sum + parseFloat(inv.subtotal), 0),
      invoices: invoices
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
    const where = {
      invoiceType: 'tax-invoice',
      gstApplicable: true
    };

    if (req.user.role !== 'ca') {
      where.createdBy = req.user.id;
    }

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = startDate;
      if (endDate) where.invoiceDate.lte = endDate;
    }

    const invoices = await Invoice.findAll(where, {
      orderBy: 'i.invoiceDate ASC'
    });

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
        date: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : '',
        customer: invoice.customer?.name || invoice.customer?.companyName || 'N/A',
        gstin: invoice.customer?.gstin || 'N/A',
        taxable: parseFloat(invoice.subtotal),
        cgst: parseFloat(invoice.cgst),
        sgst: parseFloat(invoice.sgst),
        igst: parseFloat(invoice.igst),
        totalGST: parseFloat(invoice.cgst) + parseFloat(invoice.sgst) + parseFloat(invoice.igst),
        total: parseFloat(invoice.totalAmount)
      });
    });

    // Add summary row
    const totalTaxable = invoices.reduce((sum, inv) => sum + parseFloat(inv.subtotal), 0);
    const totalCGST = invoices.reduce((sum, inv) => sum + parseFloat(inv.cgst), 0);
    const totalSGST = invoices.reduce((sum, inv) => sum + parseFloat(inv.sgst), 0);
    const totalIGST = invoices.reduce((sum, inv) => sum + parseFloat(inv.igst), 0);
    const totalGST = totalCGST + totalSGST + totalIGST;
    const grandTotal = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

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

    const where = { customerId: req.params.customerId };
    if (req.user.role !== 'ca') {
      where.createdBy = req.user.id;
    }

    const invoices = await Invoice.findAll(where, {
      orderBy: 'i.invoiceDate DESC'
    });

    const invoiceIds = invoices.map(inv => inv.id);
    const payments = invoiceIds.length > 0 
      ? await Payment.findAll({ invoiceId: invoiceIds }, { orderBy: 'paymentDate DESC' })
      : [];

    const totalBilled = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const customerData = { ...customer };
    customerData.address = Customer.getAddress(customer);
    customerData.bankDetails = Customer.getBankDetails(customer);

    res.json({
      customer: customerData,
      invoices: invoices,
      payments: payments,
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
    const project = await Project.findByIdWithCustomer(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const where = { projectId: req.params.projectId };
    if (req.user.role !== 'ca') {
      where.createdBy = req.user.id;
    }

    const invoices = await Invoice.findAll(where, {
      orderBy: 'i.invoiceDate DESC'
    });

    const invoiceIds = invoices.map(inv => inv.id);
    const payments = invoiceIds.length > 0
      ? await Payment.findAll({ invoiceId: invoiceIds }, { orderBy: 'paymentDate DESC' })
      : [];

    const totalBilled = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    res.json({
      project: project,
      invoices: invoices,
      payments: payments,
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
