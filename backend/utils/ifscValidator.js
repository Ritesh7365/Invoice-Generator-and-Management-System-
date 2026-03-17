// IFSC (Indian Financial System Code) validation utility
// IFSC format: 4 letters + 0 + 6 digits
// Example: SBIN0000456

export const validateIFSC = (ifsc) => {
  if (!ifsc) {
    return { valid: false, error: 'IFSC is required' };
  }

  // Remove spaces and convert to uppercase
  const cleanedIFSC = ifsc.trim().toUpperCase().replace(/\s/g, '');

  // Check length
  if (cleanedIFSC.length !== 11) {
    return { valid: false, error: 'IFSC must be exactly 11 characters' };
  }

  // Check format: 4 letters + 0 + 6 digits
  const ifscPattern = /^[A-Z]{4}0[0-9]{6}$/;
  if (!ifscPattern.test(cleanedIFSC)) {
    return { 
      valid: false, 
      error: 'Invalid IFSC format. Format: 4 letters + 0 + 6 digits (e.g., SBIN0000456)' 
    };
  }

  return { valid: true, cleaned: cleanedIFSC };
};

export const formatIFSC = (ifsc) => {
  if (!ifsc) return '';
  const cleaned = ifsc.trim().toUpperCase().replace(/\s/g, '');
  return cleaned;
};
