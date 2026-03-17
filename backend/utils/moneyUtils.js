/**
 * Money Utilities - Integer-based calculations for precision
 * All calculations done in paise (smallest unit) to avoid floating-point errors
 * 1 Rupee = 100 Paise
 */

/**
 * Convert rupees to paise (integer)
 * @param {number} rupees - Amount in rupees
 * @returns {number} Amount in paise (integer)
 */
export const rupeesToPaise = (rupees) => {
  return Math.round(rupees * 100);
};

/**
 * Convert paise to rupees
 * @param {number} paise - Amount in paise (integer)
 * @returns {number} Amount in rupees
 */
export const paiseToRupees = (paise) => {
  return paise / 100;
};

/**
 * Add two amounts in paise
 * @param {number} paise1 - First amount in paise
 * @param {number} paise2 - Second amount in paise
 * @returns {number} Sum in paise
 */
export const addPaise = (paise1, paise2) => {
  return paise1 + paise2;
};

/**
 * Multiply amount in paise by a number
 * @param {number} paise - Amount in paise
 * @param {number} multiplier - Multiplier
 * @returns {number} Result in paise
 */
export const multiplyPaise = (paise, multiplier) => {
  return Math.round(paise * multiplier);
};

/**
 * Calculate percentage of an amount in paise
 * @param {number} paise - Amount in paise
 * @param {number} percentage - Percentage (e.g., 18 for 18%)
 * @returns {number} Result in paise
 */
export const calculatePercentage = (paise, percentage) => {
  return Math.round((paise * percentage) / 100);
};

/**
 * Format paise to rupees string with 2 decimal places
 * @param {number} paise - Amount in paise
 * @param {boolean} includeSymbol - Include currency symbol (default: true)
 * @param {string} symbol - Currency symbol to use (default: 'Rs.')
 * @returns {string} Formatted string (e.g., "Rs.1,23,456.78")
 */
export const formatMoney = (paise, includeSymbol = true, symbol = 'Rs.') => {
  const rupees = paiseToRupees(paise);
  const formatted = rupees.toFixed(2);
  
  // Indian number formatting (lakhs, crores)
  const parts = formatted.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Format integer part with Indian comma system
  let formattedInteger = '';
  const reversedInteger = integerPart.split('').reverse().join('');
  
  for (let i = 0; i < reversedInteger.length; i++) {
    if (i === 3 || (i > 3 && (i - 3) % 2 === 0)) {
      formattedInteger = ',' + formattedInteger;
    }
    formattedInteger = reversedInteger[i] + formattedInteger;
  }
  
  const result = `${formattedInteger}.${decimalPart}`;
  return includeSymbol ? `${symbol}${result}` : result;
};

/**
 * Format a rupee amount to ensure 2 decimal places
 * @param {number} rupees - Amount in rupees
 * @param {boolean} includeSymbol - Include currency symbol (default: true)
 * @param {string} symbol - Currency symbol to use (default: 'Rs.')
 * @returns {string} Formatted string
 */
export const formatRupees = (rupees, includeSymbol = true, symbol = 'Rs.') => {
  const paise = rupeesToPaise(rupees);
  return formatMoney(paise, includeSymbol, symbol);
};

/**
 * Calculate item amount
 * @param {number} rate - Rate per item (in rupees)
 * @param {number} quantity - Quantity
 * @returns {object} { paiseAmount, formattedAmount }
 */
export const calculateItemAmount = (rate, quantity) => {
  const ratePaise = rupeesToPaise(rate);
  const amountPaise = multiplyPaise(ratePaise, quantity);
  
  return {
    paise: amountPaise,
    rupees: paiseToRupees(amountPaise),
    formatted: formatMoney(amountPaise)
  };
};

/**
 * Calculate GST on an amount
 * @param {number} amountPaise - Base amount in paise
 * @param {number} gstRate - GST rate percentage (e.g., 18 for 18%)
 * @param {string} taxType - 'IGST' or 'CGST+SGST'
 * @returns {object} GST breakdown
 */
export const calculateGSTInPaise = (amountPaise, gstRate, taxType) => {
  const totalGSTAmount = calculatePercentage(amountPaise, gstRate);
  
  if (taxType === 'IGST') {
    return {
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: totalGSTAmount,
      totalGSTPaise: totalGSTAmount,
      totalWithGSTPaise: addPaise(amountPaise, totalGSTAmount)
    };
  } else {
    // CGST + SGST (split equally, handle odd paise)
    const halfGST = Math.floor(totalGSTAmount / 2);
    const cgstPaise = halfGST;
    const sgstPaise = totalGSTAmount - halfGST; // Ensures total is exact
    
    return {
      cgstPaise: cgstPaise,
      sgstPaise: sgstPaise,
      igstPaise: 0,
      totalGSTPaise: totalGSTAmount,
      totalWithGSTPaise: addPaise(amountPaise, totalGSTAmount)
    };
  }
};

/**
 * Format invoice amounts for PDF/display
 * @param {object} invoice - Invoice data with amounts in rupees
 * @param {string} symbol - Currency symbol (default: 'Rs.' for PDF compatibility)
 * @returns {object} Formatted amounts
 * 
 * Note: We use 'Rs.' instead of '₹' symbol because:
 * - PDFKit's default fonts (Helvetica) don't support the ₹ Unicode character
 * - The ₹ symbol renders as "1" or other fallback characters in PDF
 * - 'Rs.' is the standard abbreviation and works across all PDF renderers
 */
export const formatInvoiceAmounts = (invoice, symbol = 'Rs.') => {
  return {
    subtotal: formatRupees(invoice.subtotal || 0, true, symbol),
    cgst: formatRupees(invoice.cgst || 0, true, symbol),
    sgst: formatRupees(invoice.sgst || 0, true, symbol),
    igst: formatRupees(invoice.igst || 0, true, symbol),
    totalAmount: formatRupees(invoice.totalAmount || 0, true, symbol),
    
    // Without symbol for calculations
    subtotalPlain: formatRupees(invoice.subtotal || 0, false),
    cgstPlain: formatRupees(invoice.cgst || 0, false),
    sgstPlain: formatRupees(invoice.sgst || 0, false),
    igstPlain: formatRupees(invoice.igst || 0, false),
    totalAmountPlain: formatRupees(invoice.totalAmount || 0, false),
    
    // Item amounts
    items: (invoice.items || []).map(item => ({
      ...item,
      rateFormatted: formatRupees(item.rate || 0, true, symbol),
      amountFormatted: formatRupees(item.amount || 0, true, symbol),
      ratePlain: formatRupees(item.rate || 0, false),
      amountPlain: formatRupees(item.amount || 0, false)
    }))
  };
};
