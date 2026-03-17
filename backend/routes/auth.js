import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { validateGSTIN } from '../utils/gstinValidator.js';

const router = express.Router();

// Register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().toLowerCase().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'ca']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, companyDetails } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Flatten companyDetails if provided
    const userData = {
      name,
      email,
      password,
      role: role || 'admin'
    };

    if (companyDetails) {
      userData.companyName = companyDetails.name;
      // Validate GSTIN if provided
      if (companyDetails.gstin && companyDetails.gstin.trim() !== '') {
        const gstinValidation = validateGSTIN(companyDetails.gstin);
        if (!gstinValidation.valid) {
          return res.status(400).json({ 
            message: 'Company GSTIN validation failed',
            error: gstinValidation.error 
          });
        }
        userData.companyGstin = gstinValidation.cleaned;
      }
      userData.companyAddress = companyDetails.address;
      userData.companyCity = companyDetails.city;
      userData.companyState = companyDetails.state;
      userData.companyPincode = companyDetails.pincode;
      userData.companyPhone = companyDetails.phone;
      userData.companyEmail = companyDetails.email;
    }

    const user = await User.create(userData);

    if (!user || !user.id) {
      console.error('User creation failed - no user or ID returned:', user);
      return res.status(500).json({ message: 'Failed to create user - no ID returned' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyDetails: User.getCompanyDetails(user)
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    
    // Provide more specific error messages
    let errorMessage = 'Server error';
    if (error.code === 'ER_DUP_ENTRY') {
      errorMessage = 'Email already exists';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      errorMessage = 'Database connection failed. Please check your database server.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      message: errorMessage, 
      error: error.message,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Login
router.post('/login', [
  body('email').trim().toLowerCase().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await User.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyDetails: User.getCompanyDetails(user)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByIdWithoutPassword(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ 
      user: {
        ...user,
        companyDetails: User.getCompanyDetails(user)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update company details
router.put('/company-details', authenticate, [
  body('companyDetails.name').optional().trim(),
  body('companyDetails.gstin').optional().trim(),
  body('companyDetails.address').optional().trim()
], async (req, res) => {
  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update company details
    if (req.body.companyDetails) {
      // Validate GSTIN if provided
      if (req.body.companyDetails.gstin && req.body.companyDetails.gstin.trim() !== '') {
        const gstinValidation = validateGSTIN(req.body.companyDetails.gstin);
        if (!gstinValidation.valid) {
          return res.status(400).json({ 
            message: 'Company GSTIN validation failed',
            error: gstinValidation.error 
          });
        }
        req.body.companyDetails.gstin = gstinValidation.cleaned;
      }
      
      user = User.setCompanyDetails(user, req.body.companyDetails);
      // Extract only company fields for update
      const updateData = {
        companyName: user.companyName,
        companyGstin: user.companyGstin,
        companyAddress: user.companyAddress,
        companyCity: user.companyCity,
        companyState: user.companyState,
        companyPincode: user.companyPincode,
        companyPhone: user.companyPhone,
        companyEmail: user.companyEmail
      };
      user = await User.update(req.user.id, updateData);
    }

    res.json({
      message: 'Company details updated',
      companyDetails: User.getCompanyDetails(user)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
