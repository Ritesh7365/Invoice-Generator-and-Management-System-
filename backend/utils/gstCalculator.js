import { 
  rupeesToPaise, 
  paiseToRupees, 
  calculateGSTInPaise, 
  addPaise 
} from './moneyUtils.js';

/**
 * Calculate GST with integer-based precision
 * @param {number} amount - Base amount in rupees
 * @param {number} gstRate - GST rate percentage (e.g., 18)
 * @param {string} customerState - Customer's state
 * @param {string} companyState - Company's state
 * @returns {object} GST calculation with precise amounts
 */
export const calculateGST = (amount, gstRate, customerState, companyState) => {
  // Normalize states for comparison (trim and case-insensitive)
  const normalizedCustomerState = customerState ? customerState.trim().toUpperCase() : '';
  const normalizedCompanyState = companyState ? companyState.trim().toUpperCase() : '';
  
  const isInterState = normalizedCustomerState !== normalizedCompanyState && 
                       normalizedCustomerState !== '' && 
                       normalizedCompanyState !== '';
  
  // Convert to paise for precise calculation
  const amountPaise = rupeesToPaise(amount);
  
  // Determine tax type
  const taxType = isInterState ? 'IGST' : 'CGST+SGST';
  
  // Calculate GST in paise
  const gstResult = calculateGSTInPaise(amountPaise, gstRate, taxType);
  
  // Convert back to rupees with proper rounding
  const result = {
    cgst: paiseToRupees(gstResult.cgstPaise),
    sgst: paiseToRupees(gstResult.sgstPaise),
    igst: paiseToRupees(gstResult.igstPaise),
    total: paiseToRupees(gstResult.totalWithGSTPaise),
    isInterState: isInterState,
    taxType: taxType,
    
    // Store paise values for reference
    _paise: {
      cgst: gstResult.cgstPaise,
      sgst: gstResult.sgstPaise,
      igst: gstResult.igstPaise,
      total: gstResult.totalWithGSTPaise
    }
  };
  
  return result;
};

/**
 * Get effective GST rate based on invoice type
 * @param {string} invoiceType - Type of invoice
 * @param {number} gstRate - Proposed GST rate
 * @param {boolean} [includeGst] - For non-tax-invoice only: true = add GST, false = no GST
 * @returns {number} Effective GST rate
 */
export const getGSTRate = (invoiceType, gstRate, includeGst = false) => {
  // Tax Invoice: always use GST rate if provided
  if (invoiceType === 'tax-invoice') {
    return gstRate || 0;
  }
  // Proforma: use GST rate if provided (GST supported for all)
  if (invoiceType === 'proforma') {
    return gstRate || 0;
  }
  // Non-Tax Invoice: use GST only when includeGst is true and rate provided
  if (invoiceType === 'non-tax-invoice') {
    return (includeGst && gstRate) ? gstRate : 0;
  }
  return 0;
};
