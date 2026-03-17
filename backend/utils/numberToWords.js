/**
 * Convert number to words in Indian Rupees format
 * Supports amounts up to 99 Crore with paise
 * @param {number} amount - Amount in rupees (can have decimals)
 * @returns {string} Amount in words (e.g., "Thirty-Five Thousand INR Only.")
 */
export const numberToWordsINR = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Zero INR Only.';
  }

  const num = Math.abs(Number(amount));
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  const convertUpTo99 = (n) => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    const ten = Math.floor(n / 10);
    const one = n % 10;
    return one === 0 ? tens[ten] : `${tens[ten]} ${ones[one]}`;
  };

  const convertUpTo999 = (n) => {
    if (n === 0) return '';
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let result = '';
    if (hundred > 0) result = ones[hundred] + ' Hundred';
    if (rest > 0) result += (result ? ' ' : '') + convertUpTo99(rest);
    return result;
  };

  const convertUpTo99999 = (n) => {
    if (n === 0) return '';
    const thousand = Math.floor(n / 1000);
    const rest = n % 1000;
    let result = '';
    if (thousand > 0) {
      result = convertUpTo999(thousand) + ' Thousand';
    }
    if (rest > 0) {
      result += (result ? ' ' : '') + convertUpTo999(rest);
    }
    return result;
  };

  const convertUpTo9999999 = (n) => {
    if (n === 0) return '';
    const lakh = Math.floor(n / 100000);
    const rest = n % 100000;
    let result = '';
    if (lakh > 0) {
      result = convertUpTo99(lakh) + ' Lakh';
    }
    if (rest > 0) {
      result += (result ? ' ' : '') + convertUpTo99999(rest);
    }
    return result;
  };

  const convertInteger = (n) => {
    if (n === 0) return 'Zero';
    const crore = Math.floor(n / 10000000);
    const rest = n % 10000000;
    let result = '';
    if (crore > 0) {
      result = convertUpTo999(crore) + ' Crore';
    }
    if (rest > 0) {
      result += (result ? ' ' : '') + convertUpTo9999999(rest);
    }
    return result.trim();
  };

  let words = convertInteger(integerPart) + ' INR';
  if (decimalPart > 0) {
    words += ' And ' + convertUpTo99(decimalPart) + ' Paise';
  }
  words += ' Only.';

  return words;
};
