export const calculateGST = (amount, gstRate, customerState, companyState) => {
  const isInterState = customerState !== companyState;
  
  if (isInterState) {
    // IGST for inter-state
    const igst = (amount * gstRate) / 100;
    return {
      cgst: 0,
      sgst: 0,
      igst: parseFloat(igst.toFixed(2)),
      total: parseFloat((amount + igst).toFixed(2))
    };
  } else {
    // CGST + SGST for intra-state
    const gstAmount = (amount * gstRate) / 100;
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;
    return {
      cgst: parseFloat(cgst.toFixed(2)),
      sgst: parseFloat(sgst.toFixed(2)),
      igst: 0,
      total: parseFloat((amount + gstAmount).toFixed(2))
    };
  }
};

export const getGSTRate = (invoiceType, gstRate) => {
  if (invoiceType === 'non-tax-invoice' || invoiceType === 'proforma') {
    return 0;
  }
  return gstRate || 0;
};

