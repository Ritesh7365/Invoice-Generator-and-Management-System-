/**
 * Shared form validation rules and helpers.
 * Used for real-time and submit-time validation across Customer, Bank, and Project forms.
 */

// Regex patterns
export const PATTERNS = {
  customerName: /^[A-Za-z\s]{2,50}$/,
  phoneIndian: /^[6-9][0-9]{9}$/,
  pincodeIndian: /^[1-9][0-9]{5}$/,
  bankName: /^[A-Za-z\s]{3,60}$/,
  accountNumber: /^[0-9]{9,18}$/,
  projectName: /^[A-Za-z\s]{3,100}$/
};

export const MESSAGES = {
  customerName: 'Customer name must contain only alphabets and spaces.',
  phone: 'Enter a valid 10 digit mobile number.',
  pincode: 'Enter a valid 6 digit pincode.',
  bankName: 'Bank name must contain only alphabets.',
  accountNumber: 'Account number must contain only digits and be between 9 and 18 digits.',
  projectName: 'Project name must contain only alphabets and spaces.',
  totalBudget: 'Enter a valid project budget greater than zero.'
};

/**
 * Trim string (and trim each part if it's a multi-line or structured value).
 */
export function trimValue(value) {
  if (value == null) return '';
  return String(value).trim();
}

export function validateCustomerName(value) {
  const trimmed = trimValue(value);
  if (trimmed.length < 2) return { valid: false, message: MESSAGES.customerName };
  if (trimmed.length > 50) return { valid: false, message: MESSAGES.customerName };
  if (!PATTERNS.customerName.test(trimmed)) return { valid: false, message: MESSAGES.customerName };
  return { valid: true, cleaned: trimmed };
}

export function validatePhone(value) {
  const trimmed = trimValue(value);
  if (!trimmed) return { valid: true, cleaned: '' }; // optional field
  if (!PATTERNS.phoneIndian.test(trimmed)) return { valid: false, message: MESSAGES.phone };
  return { valid: true, cleaned: trimmed };
}

export function validatePincode(value) {
  const trimmed = trimValue(value);
  if (!trimmed) return { valid: true, cleaned: '' }; // optional
  if (!PATTERNS.pincodeIndian.test(trimmed)) return { valid: false, message: MESSAGES.pincode };
  return { valid: true, cleaned: trimmed };
}

export function validateBankName(value) {
  const trimmed = trimValue(value);
  if (!trimmed) return { valid: false, message: MESSAGES.bankName };
  if (trimmed.length < 3 || trimmed.length > 60) return { valid: false, message: MESSAGES.bankName };
  if (!PATTERNS.bankName.test(trimmed)) return { valid: false, message: MESSAGES.bankName };
  return { valid: true, cleaned: trimmed };
}

export function validateAccountNumber(value) {
  const trimmed = trimValue(value);
  if (!trimmed) return { valid: false, message: MESSAGES.accountNumber };
  if (!PATTERNS.accountNumber.test(trimmed)) return { valid: false, message: MESSAGES.accountNumber };
  return { valid: true, cleaned: trimmed };
}

export function validateProjectName(value) {
  const trimmed = trimValue(value);
  if (trimmed.length < 3) return { valid: false, message: MESSAGES.projectName };
  if (trimmed.length > 100) return { valid: false, message: MESSAGES.projectName };
  if (!PATTERNS.projectName.test(trimmed)) return { valid: false, message: MESSAGES.projectName };
  return { valid: true, cleaned: trimmed };
}

export function validateTotalBudget(value) {
  if (value === '' || value == null) return { valid: false, message: MESSAGES.totalBudget };
  const num = Number(value);
  if (Number.isNaN(num)) return { valid: false, message: MESSAGES.totalBudget };
  if (num <= 0) return { valid: false, message: MESSAGES.totalBudget };
  return { valid: true, cleaned: num };
}
