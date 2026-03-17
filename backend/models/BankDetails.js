// BankDetails model - using raw MySQL queries
import { dbHelpers } from '../utils/db.js';
import { validateIFSC } from '../utils/ifscValidator.js';

const tableName = 'bank_details';

// Find all bank details with customer info
const findAllWithCustomer = async (where = {}, options = {}) => {
  try {
    let sql = `
      SELECT b.*,
        c.id as customer_id, c.name as customer_name, c.companyName as customer_companyName
      FROM ${tableName} b
      LEFT JOIN customers c ON b.customerId = c.id
    `;

    const params = [];
    const conditions = [];

    // Build WHERE clause
    if (Object.keys(where).length > 0) {
      Object.keys(where).forEach(key => {
        // Handle boolean values explicitly - include false values
        if (where[key] !== undefined && where[key] !== null) {
          conditions.push(`b.${key} = ?`);
          // Convert boolean to number for MySQL (0 or 1)
          const value = typeof where[key] === 'boolean' ? (where[key] ? 1 : 0) : where[key];
          params.push(value);
        }
      });
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    // Add ORDER BY
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    } else {
      sql += ` ORDER BY b.isDefault DESC, b.createdAt DESC`;
    }

    console.log('[BankDetails] Executing SQL:', sql.substring(0, 200));
    console.log('[BankDetails] With params:', params);
    
    const results = await dbHelpers.raw(sql, params);
    
    // Transform results
    return results.map(row => ({
      id: row.id,
      accountHolderName: row.accountHolderName,
      accountNumber: row.accountNumber,
      ifsc: row.ifsc,
      bankName: row.bankName,
      branch: row.branch,
      accountType: row.accountType,
      isDefault: Boolean(row.isDefault),
      isCompanyAccount: Boolean(row.isCompanyAccount),
      customerId: row.customerId,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: row.customer_id ? {
        id: row.customer_id,
        name: row.customer_name,
        companyName: row.customer_companyName
      } : null
    }));
  } catch (error) {
    console.error('[BankDetails] Error in findAllWithCustomer:', error);
    console.error('[BankDetails] Error message:', error.message);
    console.error('[BankDetails] Error code:', error.code);
    throw error;
  }
};

export default {
  // Find all bank details
  findAll: async (where = {}, options = {}) => {
    return await dbHelpers.findAll(tableName, where, options);
  },

  // Find all bank details with customer
  findAllWithCustomer,

  // Find bank details by ID
  findById: async (id) => {
    return await dbHelpers.findById(tableName, id);
  },

  // Find bank details by ID with customer
  findByIdWithCustomer: async (id) => {
    const banks = await findAllWithCustomer({ id: id }, { limit: 1 });
    return banks[0] || null;
  },

  // Create bank details
  create: async (bankData) => {
    // Validate and normalize IFSC if provided
    if (bankData.ifsc) {
      const ifscValidation = validateIFSC(bankData.ifsc);
      if (!ifscValidation.valid) {
        throw new Error(ifscValidation.error);
      }
      bankData.ifsc = ifscValidation.cleaned;
    }

    return await dbHelpers.create(tableName, bankData);
  },

  // Update bank details
  update: async (id, bankData) => {
    // Validate and normalize IFSC if provided
    if (bankData.ifsc) {
      const ifscValidation = validateIFSC(bankData.ifsc);
      if (!ifscValidation.valid) {
        throw new Error(ifscValidation.error);
      }
      bankData.ifsc = ifscValidation.cleaned;
    }

    return await dbHelpers.update(tableName, id, bankData);
  },

  // Delete bank details
  delete: async (id) => {
    return await dbHelpers.delete(tableName, id);
  },

  // Update multiple records (for setting defaults)
  updateMany: async (where, data) => {
    const conditions = [];
    const params = [];

    Object.keys(where).forEach(key => {
      if (where[key] !== undefined && where[key] !== null) {
        if (key === 'id' && where[key].operator === '!=') {
          conditions.push(`${key} != ?`);
          params.push(where[key].value);
        } else {
          conditions.push(`${key} = ?`);
          params.push(where[key]);
        }
      }
    });

    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);

    const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${conditions.join(' AND ')}`;
    return await dbHelpers.raw(sql, [...values, ...params]);
  },

  // Unset defaults for other banks
  unsetOtherDefaults: async (createdBy, isCompanyAccount, excludeId = null) => {
    let sql = `UPDATE ${tableName} SET isDefault = false WHERE createdBy = ? AND isCompanyAccount = ?`;
    const params = [createdBy, isCompanyAccount ? 1 : 0];
    
    if (excludeId) {
      sql += ` AND id != ?`;
      params.push(excludeId);
    }
    
    return await dbHelpers.raw(sql, params);
  }
};
