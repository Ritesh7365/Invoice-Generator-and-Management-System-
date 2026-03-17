// GSTIN (GST Identification Number) validation utility for frontend

export const validateGSTIN = (gstin) => {
  if (!gstin) {
    return { valid: false, error: 'GSTIN is required' };
  }

  // Remove spaces and convert to uppercase
  const cleanedGSTIN = gstin.trim().toUpperCase().replace(/\s/g, '');

  // Check length
  if (cleanedGSTIN.length !== 15) {
    return { valid: false, error: 'GSTIN must be exactly 15 characters' };
  }

  // Check format: 2 digits + 10 alphanumeric + 1 alphanumeric + 1 letter (usually Z) + 1 alphanumeric
  const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
  if (!gstinPattern.test(cleanedGSTIN)) {
    return { 
      valid: false, 
      error: 'Invalid GSTIN format. Format: 2 digits (State) + 10 chars (PAN) + 1 char (Entity) + Z + 1 char (Check digit)' 
    };
  }

  // Validate state code (01-37, 38-40 for union territories)
  const stateCode = parseInt(cleanedGSTIN.substring(0, 2));
  if (stateCode < 1 || stateCode > 40) {
    return { valid: false, error: 'Invalid state code in GSTIN' };
  }

  return { valid: true, cleaned: cleanedGSTIN };
};

export const formatGSTIN = (gstin) => {
  if (!gstin) return '';
  const cleaned = gstin.trim().toUpperCase().replace(/\s/g, '');
  return cleaned;
};
