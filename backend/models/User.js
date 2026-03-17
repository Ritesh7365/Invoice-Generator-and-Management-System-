// User model - using raw MySQL queries
import bcrypt from 'bcryptjs';
import { dbHelpers } from '../utils/db.js';

const tableName = 'users';

export default {
  // Find user by email
  findByEmail: async (email) => {
    return await dbHelpers.findOne(tableName, { email: email.toLowerCase().trim() });
  },

  // Find user by ID
  findById: async (id) => {
    return await dbHelpers.findById(tableName, id);
  },

  // Find user by ID excluding password
  findByIdWithoutPassword: async (id) => {
    const user = await dbHelpers.findById(tableName, id);
    if (user) {
      delete user.password;
    }
    return user;
  },

  // Create user
  create: async (userData) => {
    // Hash password before saving
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    // Normalize email
    if (userData.email) {
      userData.email = userData.email.toLowerCase().trim();
    }

    const result = await dbHelpers.create(tableName, userData);
    delete result.password; // Don't return password
    return result;
  },

  // Update user
  update: async (id, userData) => {
    // Hash password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    // Normalize email if provided
    if (userData.email) {
      userData.email = userData.email.toLowerCase().trim();
    }

    const result = await dbHelpers.update(tableName, id, userData);
    if (result) {
      delete result.password; // Don't return password
    }
    return result;
  },

  // Compare password
  comparePassword: async (candidatePassword, hashedPassword) => {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  },

  // Get company details as object
  getCompanyDetails: (user) => {
    if (!user) return null;
    return {
      name: user.companyName,
      gstin: user.companyGstin,
      address: user.companyAddress,
      city: user.companyCity,
      state: user.companyState,
      pincode: user.companyPincode,
      phone: user.companyPhone,
      email: user.companyEmail
    };
  },

  // Set company details from object
  setCompanyDetails: (user, companyDetails) => {
    if (!companyDetails || !user) return user;
    
    return {
      ...user,
      companyName: companyDetails.name || user.companyName,
      companyGstin: companyDetails.gstin || user.companyGstin,
      companyAddress: companyDetails.address || user.companyAddress,
      companyCity: companyDetails.city || user.companyCity,
      companyState: companyDetails.state || user.companyState,
      companyPincode: companyDetails.pincode || user.companyPincode,
      companyPhone: companyDetails.phone || user.companyPhone,
      companyEmail: companyDetails.email || user.companyEmail
    };
  }
};
