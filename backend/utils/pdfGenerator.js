import PDFDocument from 'pdfkit';
import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import { formatInvoiceAmounts } from './moneyUtils.js';
import { numberToWordsINR } from './numberToWords.js';

// Page dimensions
const MARGIN = 50;
const PAGE_WIDTH = 595;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const RIGHT_EDGE = MARGIN + CONTENT_WIDTH;

// Extract state code from GSTIN (first 2 digits)
const getStateCodeFromGstin = (gstin) => {
  if (!gstin || typeof gstin !== 'string') return '';
  return gstin.substring(0, 2);
};

// Extract PAN from GSTIN (positions 2-12, 10 chars)
const getPanFromGstin = (gstin) => {
  if (!gstin || typeof gstin !== 'string' || gstin.length < 12) return '';
  return gstin.substring(2, 12).toUpperCase();
};

// Default HSN/SAC for services (IT/Digital Marketing)
const DEFAULT_HSN = '998365';

export const generateInvoicePDF = async (invoiceId, userId = null) => {
  const invoice = await Invoice.findById(invoiceId);

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const invoiceData = { ...invoice };
  invoiceData.items = invoiceData.items || [];

  const formattedAmounts = formatInvoiceAmounts(invoiceData);

  let companyDetails = null;
  if (userId) {
    const user = await User.findById(userId);
    if (user) {
      companyDetails = User.getCompanyDetails(user);
    }
  }

  const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  let yPos = MARGIN;
  const leftColEnd = MARGIN + CONTENT_WIDTH / 2;
  const colGap = 8;
  const rightColWidth = CONTENT_WIDTH / 2 - colGap - 10;
  const headerBoxPadding = 10;

  // Draw outer border (A4 height 842, leave bottom margin)
  doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, 742).stroke();

  yPos += 12;

  // 1. Header - Title (centered, bold uppercase)
  doc.fontSize(18);
  doc.font('Helvetica-Bold');
  const title = invoiceData.invoiceType === 'proforma' ? 'PROFORMA INVOICE' : 'TAX INVOICE';
  doc.text(title, MARGIN, yPos, { width: CONTENT_WIDTH, align: 'center' });
  doc.font('Helvetica');
  yPos += 28;

  // 2. Header box - Company (left) | Invoice details (right) - bordered
  const headerStartY = yPos;
  const headerBoxHeight = 125;
  doc.rect(MARGIN, yPos, CONTENT_WIDTH, headerBoxHeight).stroke();
  doc.moveTo(leftColEnd, yPos).lineTo(leftColEnd, yPos + headerBoxHeight).stroke();

  // LEFT COLUMN - Company (inside bordered box)
  doc.fontSize(9);
  let leftY = yPos + headerBoxPadding;
  if (companyDetails?.name) {
    doc.font('Helvetica-Bold');
    doc.text(companyDetails.name, MARGIN + headerBoxPadding, leftY, { width: leftColEnd - MARGIN - 2 * headerBoxPadding });
    doc.font('Helvetica');
    leftY += doc.heightOfString(companyDetails.name, { width: leftColEnd - MARGIN - 2 * headerBoxPadding }) + 4;
  }
  const companyLines = [];
  if (companyDetails?.address) companyLines.push(companyDetails.address);
  const addr2 = [companyDetails?.city, companyDetails?.state, companyDetails?.pincode].filter(Boolean).join(', ');
  if (addr2) companyLines.push(addr2);
  if (companyDetails?.gstin) companyLines.push(`GSTIN/UIN: ${companyDetails.gstin}`);
  const stateCode = getStateCodeFromGstin(companyDetails?.gstin);
  if (companyDetails?.state && stateCode) {
    companyLines.push(`State Name: ${companyDetails.state}, Code: ${stateCode}`);
  }
  if (companyDetails?.email) companyLines.push(`Email: ${companyDetails.email}`);

  if (companyLines.length === 0) {
    companyLines.push('Company details not configured');
  }

  companyLines.forEach((line) => {
    doc.text(line, MARGIN + headerBoxPadding, leftY, { width: leftColEnd - MARGIN - 2 * headerBoxPadding });
    leftY += doc.heightOfString(line, { width: leftColEnd - MARGIN - 2 * headerBoxPadding }) + 2;
  });

  // RIGHT COLUMN - Invoice details (Row1: Invoice No | Dated, Row2: Mode/Terms, Row3: Supplier's Ref | Other Ref)
  const invDate = invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate) : new Date();
  const dateStr = invDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
  const rightMid = leftColEnd + (RIGHT_EDGE - leftColEnd) / 2;

  let rightY = headerStartY + headerBoxPadding;
  doc.font('Helvetica-Bold');
  doc.text('Invoice No:', leftColEnd + colGap, rightY, { lineBreak: false });
  doc.font('Helvetica');
  doc.text(invoiceData.invoiceId || '-', rightMid - colGap - doc.widthOfString(invoiceData.invoiceId || '-'), rightY, { lineBreak: false });
  doc.font('Helvetica-Bold');
  doc.text('Dated:', rightMid, rightY, { lineBreak: false });
  doc.font('Helvetica');
  doc.text(dateStr, RIGHT_EDGE - colGap - doc.widthOfString(dateStr), rightY, { lineBreak: false });
  rightY += 14;

  doc.font('Helvetica-Bold');
  doc.text('Mode/Terms of Payment:', leftColEnd + colGap, rightY, { lineBreak: false });
  doc.font('Helvetica-Bold');
  doc.text('Online', RIGHT_EDGE - colGap - doc.widthOfString('Online'), rightY, { lineBreak: false });
  doc.font('Helvetica');
  rightY += 14;

  doc.font('Helvetica-Bold');
  doc.text("Supplier's Ref:", leftColEnd + colGap, rightY);
  doc.font('Helvetica');
  const suppRef = invoiceData.customer?.companyName || invoiceData.customer?.name || '-';
  const suppRefWidth = rightMid - leftColEnd - 2 * colGap;
  const suppRefHeight = doc.heightOfString(suppRef, { width: suppRefWidth });
  doc.text(suppRef, leftColEnd + colGap, rightY + 12, { width: suppRefWidth });
  rightY += 12 + suppRefHeight + 6;

  doc.font('Helvetica-Bold');
  doc.text('Other Reference(s):', leftColEnd + colGap, rightY);
  doc.font('Helvetica');
  const otherRef = invoiceData.project?.name || '-';
  const otherRefWidth = RIGHT_EDGE - leftColEnd - 2 * colGap;
  doc.text(otherRef, leftColEnd + colGap, rightY + 12, { width: otherRefWidth });

  yPos = headerStartY + headerBoxHeight + 12;

  // 3. Buyer section - two columns with bordered box
  const buyerStartY = yPos;

  // LEFT - Buyer details
  doc.font('Helvetica-Bold');
  doc.text('Buyer,', MARGIN + 8, yPos);
  doc.font('Helvetica');
  yPos += 14;

  const buyerName = (invoiceData.customer?.companyName || invoiceData.customer?.name || '-').toUpperCase();
  const buyerNameWidth = leftColEnd - MARGIN - 20;
  const buyerNameHeight = doc.heightOfString(buyerName, { width: buyerNameWidth });
  doc.text(buyerName, MARGIN + 8, yPos, { width: buyerNameWidth });
  yPos += buyerNameHeight + 4;

  const addrParts = [];
  if (invoiceData.customer?.addressStreet) addrParts.push(invoiceData.customer.addressStreet);
  if (invoiceData.customer?.addressCity || invoiceData.customer?.addressState || invoiceData.customer?.addressPincode) {
    addrParts.push([invoiceData.customer.addressCity, invoiceData.customer.addressState, invoiceData.customer.addressPincode].filter(Boolean).join(', '));
  }
  const buyerAddr = addrParts.length > 0 ? `ADDRESS: ${addrParts.join(', ')}` : '';
  if (buyerAddr) {
    const addrWidth = leftColEnd - MARGIN - 20;
    const addrHeight = doc.heightOfString(buyerAddr, { width: addrWidth });
    doc.text(buyerAddr, MARGIN + 8, yPos, { width: addrWidth });
    yPos += addrHeight + 6;
  }
  if (invoiceData.customer?.gstin) {
    doc.text(`GSTIN/UIN: ${invoiceData.customer.gstin}`, MARGIN + 8, yPos);
    yPos += 12;
  }
  if (invoiceData.customer?.email) {
    doc.text(`E-mail id: ${invoiceData.customer.email}`, MARGIN + 8, yPos);
    yPos += 12;
  }
  if (invoiceData.customer?.phone) {
    doc.text(`Mob: ${invoiceData.customer.phone}`, MARGIN + 8, yPos);
    yPos += 12;
  }
  const custState = invoiceData.customer?.addressState || companyDetails?.state || '';
  if (custState) {
    doc.text(`State Name: ${custState},`, MARGIN + 8, yPos);
    yPos += 12;
  }
  const placeOfSupply = invoiceData.customer?.addressState || companyDetails?.state || custState || '-';
  doc.text(`Place of Supply: ${placeOfSupply}`, MARGIN + 8, yPos);
  yPos += 14;

  const buyerColBottom = yPos;
  yPos = buyerStartY;

  // RIGHT - Terms of Delivery (bullet list)
  const termsText = invoiceData.notes || 'This is a Proforma Invoice. If required, we can provide a GST Invoice.\nTax invoice is valid for 30 days from the date of issue that\'s why shared the proforma invoice.';
  const termsLines = termsText.split('\n').filter(Boolean);
  doc.font('Helvetica-Bold');
  doc.text('Terms of Delivery:', leftColEnd + colGap, yPos);
  doc.font('Helvetica');
  yPos += 14;

  termsLines.forEach((line) => {
    doc.text(`• ${line.trim()}`, leftColEnd + colGap, yPos, { width: rightColWidth });
    yPos += 12;
  });

  const buyerBoxBottom = Math.max(buyerColBottom, yPos) + 10;
  doc.rect(MARGIN, buyerStartY, CONTENT_WIDTH, buyerBoxBottom - buyerStartY).stroke();
  doc.moveTo(leftColEnd, buyerStartY).lineTo(leftColEnd, buyerBoxBottom).stroke();
  yPos = buyerBoxBottom + 10;

  // 4. Items table - bordered, grey header with white text
  const tableTopY = yPos;
  const partColWidth = (CONTENT_WIDTH - 40) * 0.55;
  const hsnColWidth = 70;
  const amtColWidth = CONTENT_WIDTH - 40 - partColWidth - hsnColWidth;

  const partX = MARGIN + 20;
  const hsnX = partX + partColWidth;
  const amtX = hsnX + hsnColWidth;
  const tableLeft = partX - 4;
  const tableRight = RIGHT_EDGE - 20;

  // Table header - grey background with white text
  const headerRowHeight = 20;
  doc.rect(tableLeft, yPos, tableRight - tableLeft, headerRowHeight).fill('#6b7280');
  doc.fillColor('#ffffff');
  doc.fontSize(9);
  doc.font('Helvetica-Bold');
  doc.text('Particulars', partX, yPos + 5, { width: partColWidth - 4, lineBreak: false });
  doc.text('HSN/SAC', hsnX + (hsnColWidth - doc.widthOfString('HSN/SAC')) / 2, yPos + 5, { lineBreak: false });
  doc.text('Amount', amtX + amtColWidth - doc.widthOfString('Amount'), yPos + 5, { lineBreak: false });
  doc.fillColor('#000000');
  doc.font('Helvetica');
  yPos += headerRowHeight;
  doc.rect(tableLeft, yPos - headerRowHeight, tableRight - tableLeft, headerRowHeight).stroke();
  doc.moveTo(hsnX - 2, yPos - headerRowHeight).lineTo(hsnX - 2, yPos).stroke();
  doc.moveTo(amtX - 2, yPos - headerRowHeight).lineTo(amtX - 2, yPos).stroke();
  yPos += 6;

  // Table rows - items + tax breakdown
  const gstRate = parseFloat(invoiceData.gstRate || 0);
  const halfRate = gstRate / 2;
  const hasCgstSgst = parseFloat(invoiceData.cgst || 0) > 0 || parseFloat(invoiceData.sgst || 0) > 0;
  const hasIgst = parseFloat(invoiceData.igst || 0) > 0;

  if (formattedAmounts.items.length === 0) {
    doc.text('-', partX, yPos, { lineBreak: false });
    doc.text(DEFAULT_HSN, hsnX + (hsnColWidth - doc.widthOfString(DEFAULT_HSN)) / 2, yPos, { lineBreak: false });
    doc.text(formattedAmounts.subtotalPlain, amtX + amtColWidth - doc.widthOfString(formattedAmounts.subtotalPlain), yPos, { lineBreak: false });
    yPos += 18;
  } else {
    formattedAmounts.items.forEach((item) => {
      const desc = item.description || '';
      const hsn = item.hsn || item.hsnSac || DEFAULT_HSN;
      const lineHeight = 12;
      const descHeight = doc.heightOfString(desc, { width: partColWidth - 4 });
      const rowHeight = Math.max(descHeight + 4, 18);
      doc.text(desc, partX, yPos, { width: partColWidth - 4 });
      doc.text(hsn, hsnX + (hsnColWidth - doc.widthOfString(hsn)) / 2, yPos, { lineBreak: false });
      doc.text(item.amountPlain, amtX + amtColWidth - doc.widthOfString(item.amountPlain), yPos, { lineBreak: false });
      yPos += rowHeight;
    });
  }

  if (invoiceData.gstApplicable) {
    if (hasCgstSgst) {
      doc.font('Helvetica-Bold');
      doc.text(`SGST (${halfRate.toFixed(2)}%)`, partX, yPos, { lineBreak: false });
      doc.font('Helvetica');
      doc.text(formattedAmounts.sgstPlain, amtX + amtColWidth - doc.widthOfString(formattedAmounts.sgstPlain), yPos, { lineBreak: false });
      yPos += 14;
      doc.font('Helvetica-Bold');
      doc.text(`CGST (${halfRate.toFixed(2)}%)`, partX, yPos, { lineBreak: false });
      doc.font('Helvetica');
      doc.text(formattedAmounts.cgstPlain, amtX + amtColWidth - doc.widthOfString(formattedAmounts.cgstPlain), yPos, { lineBreak: false });
      yPos += 14;
    }
    if (hasIgst) {
      doc.text(`IGST (${gstRate.toFixed(2)}%)`, partX, yPos, { lineBreak: false });
      doc.text(formattedAmounts.igstPlain, amtX + amtColWidth - doc.widthOfString(formattedAmounts.igstPlain), yPos, { lineBreak: false });
      yPos += 14;
    }
  }

  yPos += 5;
  doc.moveTo(tableLeft, yPos).lineTo(tableRight, yPos).stroke();
  doc.moveTo(hsnX - 2, yPos - 5).lineTo(hsnX - 2, yPos).stroke();
  doc.moveTo(amtX - 2, yPos - 5).lineTo(amtX - 2, yPos).stroke();
  yPos += 6;

  // 5. Net Payable Amount - grey background row, bold
  const totalRowHeight = 22;
  doc.rect(tableLeft, yPos, tableRight - tableLeft, totalRowHeight).fill('#9ca3af');
  doc.fillColor('#000000');
  doc.font('Helvetica-Bold');
  doc.fontSize(10);
  doc.text('Net Payable Amount', partX, yPos + 6, { lineBreak: false });
  doc.text(formattedAmounts.totalAmountPlain, amtX + amtColWidth - doc.widthOfString(formattedAmounts.totalAmountPlain), yPos + 6, { lineBreak: false });
  doc.font('Helvetica');
  doc.rect(tableLeft, yPos, tableRight - tableLeft, totalRowHeight).stroke();
  const tableBottomY = yPos + totalRowHeight;
  doc.moveTo(tableLeft, tableTopY).lineTo(tableLeft, tableBottomY).stroke();
  doc.moveTo(tableRight, tableTopY).lineTo(tableRight, tableBottomY).stroke();
  doc.moveTo(hsnX - 2, tableTopY).lineTo(hsnX - 2, tableBottomY).stroke();
  doc.moveTo(amtX - 2, tableTopY).lineTo(amtX - 2, tableBottomY).stroke();
  yPos = tableBottomY + 15;

  // 6. Amount in Words (label regular, value bold)
  const amountInWords = numberToWordsINR(invoiceData.totalAmount || 0);
  doc.fontSize(9);
  const amountLabel = 'Amount (In Words):';
  doc.text(amountLabel, MARGIN + 20, yPos, { lineBreak: false });
  doc.font('Helvetica-Bold');
  doc.text(` ${amountInWords}`, MARGIN + 20 + doc.widthOfString(amountLabel), yPos, { lineBreak: false });
  doc.font('Helvetica');
  yPos += 22;

  // 7. Bottom section - bordered box, two columns: Remarks + PAN (left) | Bank details + Signature (right)
  const bottomStartY = yPos;
  const bottomBoxHeight = 75;
  doc.rect(MARGIN, yPos, CONTENT_WIDTH, bottomBoxHeight).stroke();
  doc.moveTo(leftColEnd, yPos).lineTo(leftColEnd, yPos + bottomBoxHeight).stroke();

  const bottomPadding = 12;
  let bottomLeftY = yPos + bottomPadding;
  doc.font('Helvetica-Bold');
  doc.text('Remarks:', MARGIN + bottomPadding, bottomLeftY);
  doc.font('Helvetica');
  bottomLeftY += 12;
  doc.text('', MARGIN + bottomPadding, bottomLeftY);
  bottomLeftY += 12;
  const companyPan = getPanFromGstin(companyDetails?.gstin);
  if (companyPan) {
    doc.font('Helvetica-Bold');
    doc.text('Company PAN:', MARGIN + bottomPadding, bottomLeftY);
    doc.text(` ${companyPan}`, MARGIN + bottomPadding + doc.widthOfString('Company PAN:'), bottomLeftY, { lineBreak: false });
    doc.font('Helvetica');
    bottomLeftY += 14;
  }

  let bottomRightY = yPos + bottomPadding;
  doc.font('Helvetica-Bold');
  doc.text("Company's Bank Details", leftColEnd + bottomPadding, bottomRightY);
  doc.font('Helvetica');
  bottomRightY += 14;

  const bank = invoiceData.companyBankDetails;
  const bankBoxLeft = leftColEnd + bottomPadding;
  const bankBoxWidth = CONTENT_WIDTH / 2 - 2 * bottomPadding;
  const bankBoxHeight = 45;
  doc.rect(bankBoxLeft, bottomRightY, bankBoxWidth, bankBoxHeight).stroke();
  let bankTextY = bottomRightY + 8;
  if (bank) {
    doc.text(`Bank Name : ${bank.bankName || ''}${bank.branch ? `, ${bank.branch}` : ''}`, bankBoxLeft + 6, bankTextY);
    bankTextY += 12;
    doc.text(`A/c No : ${bank.accountNumber || ''}`, bankBoxLeft + 6, bankTextY);
    bankTextY += 12;
    doc.text(`Branch & IFSC Code: ${bank.ifsc || ''}`, bankBoxLeft + 6, bankTextY);
  } else {
    doc.text('Bank details not configured', bankBoxLeft + 6, bankTextY);
  }

  // 8. Signature section - bordered box (bottom right of page)
  const sigBoxWidth = bankBoxWidth;
  const sigBoxHeight = 50;
  const sigBoxTop = yPos + bottomBoxHeight + 10;
  const sigBoxLeft = RIGHT_EDGE - sigBoxWidth - bottomPadding;
  doc.rect(sigBoxLeft, sigBoxTop, sigBoxWidth, sigBoxHeight).stroke();
  const companyName = companyDetails?.name || 'Company';
  doc.font('Helvetica-Bold');
  doc.text(`By ${companyName}`, sigBoxLeft, sigBoxTop + 10, { width: sigBoxWidth, align: 'center' });
  doc.text('Authorized Signatory', sigBoxLeft, sigBoxTop + 32, { width: sigBoxWidth, align: 'center' });
  doc.font('Helvetica');

  yPos = sigBoxTop + sigBoxHeight + 15;

  // 9. Footer - "Note: " bold, " - This Invoice is Computer-generated." regular, left-aligned
  doc.fontSize(8);
  doc.font('Helvetica-Bold');
  const noteLabel = 'Note: ';
  doc.text(noteLabel, MARGIN, yPos, { lineBreak: false });
  const noteLabelWidth = doc.widthOfString(noteLabel);
  doc.font('Helvetica');
  doc.text('- This Invoice is Computer-generated.', MARGIN + noteLabelWidth, yPos, { lineBreak: false });

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
  });
};