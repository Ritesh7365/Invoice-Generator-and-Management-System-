import express from 'express';
import { body, validationResult } from 'express-validator';
import BankDetails from '../models/BankDetails.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all bank details
router.get('/', authenticate, async (req, res) => {
  try {
    const query = {};
    
    if (req.user.role !== 'ca') {
      query.createdBy = req.user._id;
    }

    if (req.query.isCompanyAccount !== undefined) {
      query.isCompanyAccount = req.query.isCompanyAccount === 'true';
    }

    if (req.query.customer) {
      query.customer = req.query.customer;
    }

    const banks = await BankDetails.find(query)
      .populate('customer', 'name companyName')
      .sort({ isDefault: -1, createdAt: -1 });

    res.json(banks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single bank detail
router.get('/:id', authenticate, async (req, res) => {
  try {
    const bank = await BankDetails.findById(req.params.id).populate('customer');
    if (!bank) {
      return res.status(404).json({ message: 'Bank details not found' });
    }

    if (req.user.role !== 'ca' && bank.createdBy.toString() !== req.user._id.toString()) {
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
  body('accountNumber').trim().notEmpty().withMessage('Account number is required'),
  body('ifsc').trim().notEmpty().withMessage('IFSC is required'),
  body('bankName').trim().notEmpty().withMessage('Bank name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // If setting as default, unset other defaults
    if (req.body.isDefault) {
      await BankDetails.updateMany(
        { createdBy: req.user._id, isCompanyAccount: req.body.isCompanyAccount !== false },
        { $set: { isDefault: false } }
      );
    }

    const bank = new BankDetails({
      ...req.body,
      createdBy: req.user._id
    });

    await bank.save();
    await bank.populate('customer', 'name companyName');

    res.status(201).json(bank);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update bank details
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const bank = await BankDetails.findById(req.params.id);
    if (!bank) {
      return res.status(404).json({ message: 'Bank details not found' });
    }

    if (bank.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If setting as default, unset other defaults
    if (req.body.isDefault) {
      await BankDetails.updateMany(
        { 
          _id: { $ne: bank._id },
          createdBy: req.user._id,
          isCompanyAccount: bank.isCompanyAccount
        },
        { $set: { isDefault: false } }
      );
    }

    Object.assign(bank, req.body);
    await bank.save();
    await bank.populate('customer', 'name companyName');

    res.json(bank);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete bank details
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const bank = await BankDetails.findById(req.params.id);
    if (!bank) {
      return res.status(404).json({ message: 'Bank details not found' });
    }

    if (bank.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await BankDetails.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bank details deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

