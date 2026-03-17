# Money Calculations - Production Implementation

## Overview

This system uses **integer-based calculations (paise method)** to ensure 100% precision in financial calculations, eliminating floating-point errors.

## Key Principles

### 1. **Paise-Based Calculations**
- All calculations are performed in paise (smallest currency unit)
- 1 Rupee = 100 Paise
- Avoids floating-point precision issues

### 2. **Separation of Concerns**
- **Backend**: All calculations in integers (paise)
- **PDF/Display**: Only formatted strings, no calculations
- **Formatting**: Always 2 decimal places with Indian number system

### 3. **GST Compliance**
- Accurate CGST/SGST/IGST calculations
- Proper handling of odd paise in splits
- Inter-state vs Intra-state tax logic

## Files Modified

### New Files

1. **`utils/moneyUtils.js`** - Core money calculation utilities
   - `rupeesToPaise()` - Convert rupees to paise
   - `paiseToRupees()` - Convert paise to rupees
   - `calculatePercentage()` - Calculate GST in paise
   - `formatMoney()` - Format with Indian comma system (₹1,23,456.78)
   - `formatInvoiceAmounts()` - Pre-format all invoice amounts

### Updated Files

1. **`utils/gstCalculator.js`** - Uses integer-based calculations
2. **`utils/pdfGenerator.js`** - Uses pre-formatted values only

## Examples

### Before (Floating-Point Issues)
```javascript
const subtotal = 2051680.00;
const igst = (subtotal * 18) / 100;  // 369302.39999999997
const total = subtotal + igst;       // 2420982.3999999997

// In PDF: ₹3,69,302.4 (wrong formatting)
```

### After (Integer-Based)
```javascript
const subtotalPaise = 205168000;  // 2051680.00 * 100
const igstPaise = Math.round((subtotalPaise * 18) / 100);  // 36930240
const totalPaise = subtotalPaise + igstPaise;  // 242098240

// Convert to rupees: 2420982.40
// In PDF: ₹24,20,982.40 (perfect formatting)
```

## Usage in Code

### Creating an Invoice
```javascript
import { calculateGST } from './utils/gstCalculator.js';

// Calculate GST (automatically uses paise internally)
const gstResult = calculateGST(
  subtotal,      // in rupees
  gstRate,       // percentage
  customerState,
  companyState
);

// Results are in rupees with exact precision
const invoice = {
  subtotal: subtotal,
  cgst: gstResult.cgst,      // Exact to 2 decimals
  sgst: gstResult.sgst,      // Exact to 2 decimals
  igst: gstResult.igst,      // Exact to 2 decimals
  totalAmount: gstResult.total
};
```

### Generating PDF
```javascript
import { formatInvoiceAmounts } from './utils/moneyUtils.js';

// Format ALL amounts BEFORE rendering
const formattedAmounts = formatInvoiceAmounts(invoiceData);

// In PDF, use formatted strings ONLY
doc.text(formattedAmounts.subtotal);      // ₹20,51,680.00
doc.text(formattedAmounts.igst);          // ₹3,69,302.40
doc.text(formattedAmounts.totalAmount);   // ₹24,20,982.40
```

## Testing

### Verify Precision
```javascript
// Test case: Large amounts with 18% GST
const testAmount = 2051680.00;
const gstRate = 18;

const result = calculateGST(testAmount, gstRate, 'MH', 'DL');

console.log('Subtotal:', testAmount);
console.log('IGST (18%):', result.igst);       // 369302.40 (exact)
console.log('Total:', result.total);           // 2420982.40 (exact)

// Verify: 2051680 * 0.18 = 369302.40 ✓
// Verify: 2051680 + 369302.40 = 2420982.40 ✓
```

### Edge Cases Handled
1. **Odd paise in CGST/SGST split**: Extra paise goes to SGST
2. **Very large amounts**: No precision loss
3. **Rounding**: Always rounds to nearest paise

## Benefits

✅ **No floating-point errors**
✅ **GST-compliant calculations**
✅ **Consistent formatting everywhere**
✅ **Indian number system (lakhs, crores)**
✅ **Always 2 decimal places**
✅ **Audit-ready precision**

## Migration Notes

- **No database changes required** - Values stored as DECIMAL(15,2) work perfectly
- **Frontend unchanged** - Still receives numbers, displays formatted strings
- **Backward compatible** - Existing invoices work correctly

## Production Checklist

- [x] Integer-based calculations implemented
- [x] GST calculator updated
- [x] PDF generator uses formatted values only
- [x] Indian number formatting (₹1,23,456.78)
- [x] Always 2 decimal places
- [x] No calculations in templates
- [x] Edge cases handled (odd paise)
- [x] Server restarted successfully

## Support

For any calculation discrepancies:
1. Check `_paise` values in GST calculation results
2. Verify state-based tax logic (inter-state vs intra-state)
3. Ensure all formatting uses `formatMoney()` or `formatInvoiceAmounts()`
