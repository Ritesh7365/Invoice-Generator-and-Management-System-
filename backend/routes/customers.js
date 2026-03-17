import express from 'express';
import { body, validationResult } from 'express-validator';
import Customer from '../models/Customer.js';
import BankDetails from '../models/BankDetails.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateGSTIN } from '../utils/gstinValidator.js';

const router = express.Router();

// Get all customers
router.get('/', authenticate, async (req, res) => {
  try {
    const where = {};
    if (req.user.role !== 'ca') {
      where.createdBy = req.user.id;
    }

    const customers = await Customer.findAll(where, {
      orderBy: 'createdAt DESC'
    });
    
    // Transform to include address and bankDetails as objects for backward compatibility
    const transformedCustomers = customers.map(customer => {
      const customerData = { ...customer };
      customerData.address = Customer.getAddress(customer);
      customerData.bankDetails = Customer.getBankDetails(customer);
      return customerData;
    });
    
    res.json(transformedCustomers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single customer
router.get('/:id', authenticate, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (req.user.role !== 'ca' && customer.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const customerData = { ...customer };
    customerData.address = Customer.getAddress(customer);
    customerData.bankDetails = Customer.getBankDetails(customer);
    res.json(customerData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Validation regexes (align with frontend)
const CUSTOMER_NAME_REGEX = /^[A-Za-z\s]{2,50}$/;
const PHONE_REGEX = /^[6-9][0-9]{9}$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const BANK_NAME_REGEX = /^[A-Za-z\s]{3,60}$/;
const ACCOUNT_NUMBER_REGEX = /^[0-9]{9,18}$/;

// Create customer
router.post('/', authenticate, authorize('admin'), [
  body('name').trim().notEmpty().withMessage('Name is required')
    .matches(CUSTOMER_NAME_REGEX).withMessage('Customer name must contain only alphabets and spaces.'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim().custom((val) => {
    if (!val) return true;
    if (!PHONE_REGEX.test(val)) throw new Error('Enter a valid 10 digit mobile number.');
    return true;
  }),
  body('address.pincode').optional().trim().custom((val) => {
    if (!val) return true;
    if (!PINCODE_REGEX.test(val)) throw new Error('Enter a valid 6 digit pincode.');
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.array().map(e => e.msg).join(' ');
      return res.status(400).json({ message: msg, errors: errors.array() });
    }

    const { address, bankDetails, ...customerData } = req.body;
    customerData.name = (customerData.name || '').trim();
    customerData.phone = (customerData.phone || '').trim();
    if (address?.pincode !== undefined) address.pincode = (address.pincode || '').trim();
    
    // Validate GSTIN if provided
    if (customerData.gstin && customerData.gstin.trim() !== '') {
      const gstinValidation = validateGSTIN(customerData.gstin);
      if (!gstinValidation.valid) {
        return res.status(400).json({ 
          message: 'GSTIN validation failed',
          error: gstinValidation.error 
        });
      }
      customerData.gstin = gstinValidation.cleaned;
    }
    
    // Flatten address if provided
    if (address) {
      customerData.addressStreet = address.street;
      customerData.addressCity = address.city;
      customerData.addressState = address.state;
      customerData.addressPincode = address.pincode;
      customerData.addressCountry = address.country || 'India';
    }

    // Flatten bankDetails if provided (for customer record compatibility)
    if (bankDetails) {
      customerData.bankAccountNumber = bankDetails.accountNumber;
      customerData.bankIfsc = bankDetails.ifsc;
      customerData.bankName = bankDetails.bankName;
      customerData.bankBranch = bankDetails.branch;
    }

    const customer = await Customer.create({
      ...customerData,
      createdBy: req.user.id
    });

    // If bank details provided (accountNumber + ifsc required for bank_details table), validate and create record
    const accNum = bankDetails?.accountNumber?.toString().trim() || '';
    const ifscVal = bankDetails?.ifsc?.toString().trim() || '';
    const bankNameVal = bankDetails?.bankName?.toString().trim() || '';
    const hasBankDetails = accNum !== '' && ifscVal !== '';

    if (hasBankDetails) {
      if (bankNameVal && !BANK_NAME_REGEX.test(bankNameVal)) {
        return res.status(400).json({ message: 'Bank name must contain only alphabets.' });
      }
      if (!ACCOUNT_NUMBER_REGEX.test(accNum)) {
        return res.status(400).json({ message: 'Account number must contain only digits and be between 9 and 18 digits.' });
      }
      try {
        const accountHolderName = (customerData.name || customerData.companyName || 'Customer').toString().trim() || 'Customer';
        await BankDetails.create({
          accountHolderName,
          accountNumber: accNum,
          ifsc: ifscVal,
          bankName: (bankDetails.bankName || '').toString().trim() || 'N/A',
          branch: (bankDetails.branch || '').toString().trim() || null,
          customerId: customer.id,
          createdBy: req.user.id,
          isCompanyAccount: false
        });
        // Bank record is now in bank_details table - appears in Banks list and invoice bank selection
      } catch (bankError) {
        console.error('[Customers] Failed to create bank record for customer:', bankError);
        await Customer.delete(customer.id);
        return res.status(400).json({
          message: 'Invalid bank details. Please check Account Number, IFSC, and Bank Name.',
          error: bankError.message
        });
      }
    }

    const customerResponse = { ...customer };
    customerResponse.address = Customer.getAddress(customer);
    customerResponse.bankDetails = Customer.getBankDetails(customer);
    res.status(201).json(customerResponse);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update customer
router.put('/:id', authenticate, authorize('admin'), [
  body('name').optional().trim().matches(CUSTOMER_NAME_REGEX).withMessage('Customer name must contain only alphabets and spaces.'),
  body('phone').optional().trim().custom((val) => {
    if (!val) return true;
    if (!PHONE_REGEX.test(val)) throw new Error('Enter a valid 10 digit mobile number.');
    return true;
  }),
  body('address.pincode').optional().trim().custom((val) => {
    if (!val) return true;
    if (!PINCODE_REGEX.test(val)) throw new Error('Enter a valid 6 digit pincode.');
    return true;
  })
], async (req, res) => {
  try {
    const valErrors = validationResult(req);
    if (!valErrors.isEmpty()) {
      const msg = valErrors.array().map(e => e.msg).join(' ');
      return res.status(400).json({ message: msg, errors: valErrors.array() });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { address, bankDetails, ...customerData } = req.body;
    if (customerData.name !== undefined) customerData.name = (customerData.name || '').trim();
    if (customerData.phone !== undefined) customerData.phone = (customerData.phone || '').trim();
    if (address?.pincode !== undefined) address.pincode = (address.pincode || '').trim();

    // Validate GSTIN if provided
    if (customerData.gstin !== undefined && customerData.gstin.trim() !== '') {
      const gstinValidation = validateGSTIN(customerData.gstin);
      if (!gstinValidation.valid) {
        return res.status(400).json({ 
          message: 'GSTIN validation failed',
          error: gstinValidation.error 
        });
      }
      customerData.gstin = gstinValidation.cleaned;
    }

    // Prepare update data
    const updateData = { ...customerData };

    // Update address if provided
    if (address) {
      if (address.street !== undefined) updateData.addressStreet = address.street;
      if (address.city !== undefined) updateData.addressCity = address.city;
      if (address.state !== undefined) updateData.addressState = address.state;
      if (address.pincode !== undefined) updateData.addressPincode = address.pincode;
      if (address.country !== undefined) updateData.addressCountry = address.country;
    }

    // Update bankDetails if provided (customer flattened fields + bank_details record)
    if (bankDetails) {
      if (bankDetails.accountNumber !== undefined) updateData.bankAccountNumber = bankDetails.accountNumber;
      if (bankDetails.ifsc !== undefined) updateData.bankIfsc = bankDetails.ifsc;
      if (bankDetails.bankName !== undefined) updateData.bankName = bankDetails.bankName;
      if (bankDetails.branch !== undefined) updateData.bankBranch = bankDetails.branch;

      // Sync to bank_details table if accountNumber and ifsc provided
      const accNum = bankDetails.accountNumber?.toString().trim() || '';
      const ifscVal = bankDetails.ifsc?.toString().trim() || '';
      const bankNameVal = (bankDetails.bankName || '').toString().trim() || 'N/A';
      if (accNum !== '' && ifscVal !== '') {
        if (bankNameVal !== 'N/A' && !BANK_NAME_REGEX.test(bankNameVal)) {
          return res.status(400).json({ message: 'Bank name must contain only alphabets.' });
        }
        if (!ACCOUNT_NUMBER_REGEX.test(accNum)) {
          return res.status(400).json({ message: 'Account number must contain only digits and be between 9 and 18 digits.' });
        }
        const existingBanks = await BankDetails.findAll({ customerId: req.params.id }, { limit: 1 });
        const accountHolderName = (updateData.name || updateData.companyName || customer.name || customer.companyName || 'Customer').toString().trim() || 'Customer';
        const bankPayload = {
          accountHolderName,
          accountNumber: accNum,
          ifsc: ifscVal,
          bankName: bankNameVal,
          branch: (bankDetails.branch || '').toString().trim() || null,
          customerId: parseInt(req.params.id),
          isCompanyAccount: false
        };
        if (existingBanks.length > 0) {
          await BankDetails.update(existingBanks[0].id, {
            accountHolderName: bankPayload.accountHolderName,
            accountNumber: bankPayload.accountNumber,
            ifsc: bankPayload.ifsc,
            bankName: bankPayload.bankName,
            branch: bankPayload.branch
          });
        } else {
          await BankDetails.create({ ...bankPayload, createdBy: req.user.id });
        }
      }
    }

    const updatedCustomer = await Customer.update(req.params.id, updateData);

    const customerResponse = { ...updatedCustomer };
    customerResponse.address = Customer.getAddress(updatedCustomer);
    customerResponse.bankDetails = Customer.getBankDetails(updatedCustomer);
    res.json(customerResponse);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete customer
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Customer.delete(req.params.id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
