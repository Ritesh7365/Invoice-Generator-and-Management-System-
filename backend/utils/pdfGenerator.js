import PDFDocument from 'pdfkit';
import Invoice from '../models/Invoice.js';

export const generateInvoicePDF = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId)
    .populate('customer')
    .populate('project')
    .populate('companyBankDetails')
    .populate('customerBankDetails');

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const buffers = [];
  
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  // Header
  doc.fontSize(20).text('TAX INVOICE', { align: 'center' });
  doc.moveDown();

  // Invoice details
  doc.fontSize(10);
  doc.text(`Invoice ID: ${invoice.invoiceId}`, { continued: true, align: 'right' });
  doc.text(`Date: ${invoice.invoiceDate.toLocaleDateString()}`, { align: 'right' });
  if (invoice.taxId) {
    doc.text(`Tax ID: ${invoice.taxId}`, { align: 'right' });
  }
  doc.moveDown();

  // Company details (from user - would need to be passed)
  // For now, using placeholder
  doc.text('From:', { underline: true });
  doc.text('Your Company Name');
  doc.text('Address Line 1');
  doc.text('City, State - PIN');
  doc.text('GSTIN: XXXXXXXXXXXXX');
  doc.moveDown();

  // Customer details
  doc.text('Bill To:', { underline: true });
  doc.text(invoice.customer?.name || '');
  if (invoice.customer?.companyName) {
    doc.text(invoice.customer.companyName);
  }
  if (invoice.customer?.address) {
    const addr = invoice.customer.address;
    doc.text(`${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}`);
  }
  if (invoice.customer?.gstin) {
    doc.text(`GSTIN: ${invoice.customer.gstin}`);
  }
  doc.moveDown();

  // Items table
  const tableTop = doc.y;
  doc.fontSize(9);
  
  // Table header
  doc.text('Description', 50, tableTop);
  doc.text('Qty', 300, tableTop);
  doc.text('Rate', 350, tableTop, { align: 'right' });
  doc.text('Amount', 450, tableTop, { align: 'right' });
  
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
  
  let yPos = tableTop + 25;
  invoice.items.forEach(item => {
    doc.text(item.description || '', 50, yPos, { width: 240 });
    doc.text(String(item.quantity || 1), 300, yPos);
    doc.text(`₹${(item.rate || 0).toFixed(2)}`, 350, yPos, { align: 'right' });
    doc.text(`₹${(item.amount || 0).toFixed(2)}`, 450, yPos, { align: 'right' });
    yPos += 20;
  });

  // Totals
  yPos += 10;
  doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
  yPos += 10;
  
  doc.text('Subtotal:', 350, yPos, { align: 'right' });
  doc.text(`₹${invoice.subtotal.toFixed(2)}`, 450, yPos, { align: 'right' });
  yPos += 15;

  if (invoice.gstApplicable) {
    if (invoice.cgst > 0) {
      doc.text(`CGST (${invoice.gstRate / 2}%):`, 350, yPos, { align: 'right' });
      doc.text(`₹${invoice.cgst.toFixed(2)}`, 450, yPos, { align: 'right' });
      yPos += 15;
    }
    if (invoice.sgst > 0) {
      doc.text(`SGST (${invoice.gstRate / 2}%):`, 350, yPos, { align: 'right' });
      doc.text(`₹${invoice.sgst.toFixed(2)}`, 450, yPos, { align: 'right' });
      yPos += 15;
    }
    if (invoice.igst > 0) {
      doc.text(`IGST (${invoice.gstRate}%):`, 350, yPos, { align: 'right' });
      doc.text(`₹${invoice.igst.toFixed(2)}`, 450, yPos, { align: 'right' });
      yPos += 15;
    }
  }

  doc.fontSize(12);
  doc.font('Helvetica-Bold');
  doc.text('Total:', 350, yPos, { align: 'right' });
  doc.text(`₹${invoice.totalAmount.toFixed(2)}`, 450, yPos, { align: 'right' });
  doc.font('Helvetica');
  doc.fontSize(10);

  // Bank details
  if (invoice.companyBankDetails) {
    yPos += 30;
    doc.text('Bank Details:', { underline: true });
    const bank = invoice.companyBankDetails;
    doc.text(`Account Number: ${bank.accountNumber}`);
    doc.text(`IFSC: ${bank.ifsc}`);
    doc.text(`Bank: ${bank.bankName}${bank.branch ? `, ${bank.branch}` : ''}`);
  }

  // Notes
  if (invoice.notes) {
    yPos += 30;
    doc.text('Notes:', { underline: true });
    doc.text(invoice.notes);
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
  });
};

