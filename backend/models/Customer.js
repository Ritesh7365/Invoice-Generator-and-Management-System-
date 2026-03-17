// Customer model - using raw MySQL queries
import { dbHelpers } from '../utils/db.js';

const tableName = 'customers';

export default {
  // Find all customers
  findAll: async (where = {}, options = {}) => {
    return await dbHelpers.findAll(tableName, where, options);
  },

  // Find customer by ID
  findById: async (id) => {
    return await dbHelpers.findById(tableName, id);
  },

  // Create customer
  create: async (customerData) => {
    // Normalize email if provided
    if (customerData.email) {
      customerData.email = customerData.email.toLowerCase().trim();
    }

    // Normalize GSTIN if provided
    if (customerData.gstin) {
      customerData.gstin = customerData.gstin.toUpperCase().trim();
    }

    return await dbHelpers.create(tableName, customerData);
  },

  // Update customer
  update: async (id, customerData) => {
    // Normalize email if provided
    if (customerData.email) {
      customerData.email = customerData.email.toLowerCase().trim();
    }

    // Normalize GSTIN if provided
    if (customerData.gstin) {
      customerData.gstin = customerData.gstin.toUpperCase().trim();
    }

    return await dbHelpers.update(tableName, id, customerData);
  },

  // Delete customer
  delete: async (id) => {
    return await dbHelpers.delete(tableName, id);
  },

  // Get address as object
  getAddress: (customer) => {
    if (!customer) return null;
    return {
      street: customer.addressStreet,
      city: customer.addressCity,
      state: customer.addressState,
      pincode: customer.addressPincode,
      country: customer.addressCountry || 'India'
    };
  },

  // Get bank details as object
  getBankDetails: (customer) => {
    if (!customer) return null;
    return {
      accountNumber: customer.bankAccountNumber,
      ifsc: customer.bankIfsc,
      bankName: customer.bankName,
      branch: customer.bankBranch
    };
  }
};
