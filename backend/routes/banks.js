import express from 'express';
import { body, validationResult } from 'express-validator';
import BankDetails from '../models/BankDetails.js';
import Customer from '../models/Customer.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

const BANK_NAME_REGEX = /^[A-Za-z\s]{3,60}$/;
const ACCOUNT_NUMBER_REGEX = /^[0-9]{9,18}$/;

// Get all bank details
router.get('/', authenticate, async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const where = {};
    
    if (req.user.role !== 'ca') {
      where.createdBy = req.user.id;
    }

    if (req.query.isCompanyAccount !== undefined) {
      where.isCompanyAccount = req.query.isCompanyAccount === 'true';
    }

    if (req.query.customer) {
      where.customerId = req.query.customer;
    }

    console.log('[Banks] Fetching banks with where clause:', where);
    console.log('[Banks] User:', { id: req.user.id, role: req.user.role });
    
    const banks = await BankDetails.findAllWithCustomer(where, {
      orderBy: 'b.isDefault DESC, b.createdAt DESC'
    });

    res.json(banks);
  } catch (error) {
    console.error('[Banks] Error fetching banks:', error);
    console.error('[Banks] Error message:', error.message);
    console.error('[Banks] Error code:', error.code);
    console.error('[Banks] Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        code: error.code 
      })
    });
  }
});

// Get single bank detail
router.get('/:id', authenticate, async (req, res) => {
  try {
    const bank = await BankDetails.findByIdWithCustomer(req.params.id);
    if (!bank) {
      return res.status(404).json({ message: 'Bank details not found' });
    }

    if (req.user.role !== 'ca' && bank.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(bank);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create bank details
router.post('/', authenticate, authorize('admin'), [
  body('accountHolderName').trim().notEmpty().withMessage('Account holder name is required'),
  body('accountNumber').trim().notEmpty().withMessage('Account number is required')
    .matches(ACCOUNT_NUMBER_REGEX).withMessage('Account number must contain only digits and be between 9 and 18 digits.'),
  body('ifsc').trim().notEmpty().withMessage('IFSC is required'),
  body('bankName').trim().notEmpty().withMessage('Bank name is required')
    .matches(BANK_NAME_REGEX).withMessage('Bank name must contain only alphabets.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.array().map(e => e.msg).join(' ');
      return res.status(400).json({ message: msg, errors: errors.array() });
    }

    // Extract customer field and map it to customerId, exclude customer from data
    const { customer, ...bankData } = req.body;
    bankData.accountNumber = (bankData.accountNumber || '').toString().trim();
    bankData.bankName = (bankData.bankName || '').toString().trim();
    
    // Validate customer exists if provided
    let customerId = null;
    if (customer) {
      const customerIdValue = customer.toString().trim();
      if (customerIdValue && customerIdValue !== '') {
        const customerExists = await Customer.findById(customerIdValue);
        if (!customerExists) {
          return res.status(400).json({ 
            message: 'Invalid customer selected',
            error: `Customer with ID ${customerIdValue} does not exist`
          });
        }
        customerId = parseInt(customerIdValue);
        // One customer → one bank account: prevent duplicate bank for same customer
        const existingBanks = await BankDetails.findAll({ customerId }, { limit: 1 });
        if (existingBanks.length > 0) {
          return res.status(400).json({
            message: 'This customer already has bank details registered.'
          });
        }
      }
    }

    // If setting as default, unset other defaults
    if (req.body.isDefault) {
      await BankDetails.unsetOtherDefaults(
        req.user.id,
        req.body.isCompanyAccount !== false
      );
    }
    
    const bank = await BankDetails.create({
      ...bankData,
      customerId: customerId,
      createdBy: req.user.id
    });

    // If this is set as default, unset others (now that we have the ID)
    if (req.body.isDefault) {
      await BankDetails.unsetOtherDefaults(
        req.user.id,
        bank.isCompanyAccount,
        bank.id
      );
    }

    const bankWithCustomer = await BankDetails.findByIdWithCustomer(bank.id);

    res.status(201).json(bankWithCustomer);
  } catch (error) {
    console.error('[Banks] Error creating bank:', error);
    console.error('[Banks] Error message:', error.message);
    console.error('[Banks] Error code:', error.code);
    
    // Handle foreign key constraint errors specifically
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.message.includes('foreign key constraint')) {
      return res.status(400).json({ 
        message: 'Invalid customer selected. Please select a valid customer or leave it empty for company accounts.',
        error: 'The selected customer does not exist in the database'
      });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        code: error.code 
      })
    });
  }
});

// Update bank details
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const bank = await BankDetails.findById(req.params.id);
    if (!bank) {
      return res.status(404).json({ message: 'Bank details not found' });
    }

    if (bank.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate bank name and account number if provided
    if (req.body.bankName !== undefined) {
      const bn = (req.body.bankName || '').toString().trim();
      if (!bn || !BANK_NAME_REGEX.test(bn)) {
        return res.status(400).json({ message: 'Bank name must contain only alphabets.' });
      }
    }
    if (req.body.accountNumber !== undefined) {
      const an = (req.body.accountNumber || '').toString().trim();
      if (!an || !ACCOUNT_NUMBER_REGEX.test(an)) {
        return res.status(400).json({ message: 'Account number must contain only digits and be between 9 and 18 digits.' });
      }
    }

    // If setting as default, unset other defaults
    if (req.body.isDefault) {
      await BankDetails.unsetOtherDefaults(
        req.user.id,
        bank.isCompanyAccount,
        bank.id
      );
    }

    // Extract customer field and map it to customerId, exclude customer from updateData
    const { customer, ...restBody } = req.body;
    
    const updateData = {};
    Object.keys(restBody).forEach(key => {
      if (restBody[key] !== undefined && key !== 'id') {
        const v = restBody[key];
        updateData[key] = typeof v === 'string' ? v.trim() : v;
      }
    });
    
    // Validate and map customer to customerId if provided
    if (customer !== undefined) {
      if (customer && customer.toString().trim() !== '') {
        const customerIdValue = customer.toString().trim();
        const customerExists = await Customer.findById(customerIdValue);
        if (!customerExists) {
          return res.status(400).json({ 
            message: 'Invalid customer selected',
            error: `Customer with ID ${customerIdValue} does not exist`
          });
        }
        updateData.customerId = parseInt(customerIdValue);
      } else {
        updateData.customerId = null;
      }
    }

    await BankDetails.update(req.params.id, updateData);

    const bankWithCustomer = await BankDetails.findByIdWithCustomer(req.params.id);

    res.json(bankWithCustomer);
  } catch (error) {
    console.error('[Banks] Error updating bank:', error);
    console.error('[Banks] Error message:', error.message);
    console.error('[Banks] Error code:', error.code);
    
    // Handle foreign key constraint errors specifically
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.message.includes('foreign key constraint')) {
      return res.status(400).json({ 
        message: 'Invalid customer selected. Please select a valid customer or leave it empty for company accounts.',
        error: 'The selected customer does not exist in the database'
      });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        code: error.code 
      })
    });
  }
});

// Delete bank details
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const bank = await BankDetails.findById(req.params.id);
    if (!bank) {
      return res.status(404).json({ message: 'Bank details not found' });
    }

    if (bank.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await BankDetails.delete(req.params.id);
    res.json({ message: 'Bank details deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
