// InvoiceItem model - using raw MySQL queries
import { dbHelpers } from '../utils/db.js';

const tableName = 'invoice_items';

export default {
  // Find all invoice items
  findAll: async (where = {}, options = {}) => {
    // Handle array of invoiceIds specially
    if (where.invoiceId && Array.isArray(where.invoiceId)) {
      const sql = `SELECT * FROM ${tableName} WHERE invoiceId IN (${where.invoiceId.map(() => '?').join(',')})`;
      return await dbHelpers.raw(sql, where.invoiceId);
    }
    return await dbHelpers.findAll(tableName, where, options);
  },

  // Find invoice items by invoice ID
  findByInvoiceId: async (invoiceId) => {
    return await dbHelpers.findAll(tableName, { invoiceId });
  },

  // Create invoice item
  create: async (itemData) => {
    return await dbHelpers.create(tableName, itemData);
  },

  // Create multiple invoice items
  createMany: async (items) => {
    if (items.length === 0) return [];
    
    const keys = Object.keys(items[0]);
    const columns = keys.join(', ');
    const placeholders = items.map(() => `(${keys.map(() => '?').join(', ')})`).join(', ');
    const values = items.flatMap(item => keys.map(key => item[key]));

    const sql = `INSERT INTO ${tableName} (${columns}) VALUES ${placeholders}`;
    await dbHelpers.raw(sql, values);
    
    // Return created items (we'll need to fetch them)
    const invoiceId = items[0].invoiceId;
    return await dbHelpers.findAll(tableName, { invoiceId });
  },

  // Delete invoice items by invoice ID
  deleteByInvoiceId: async (invoiceId) => {
    await dbHelpers.raw(`DELETE FROM ${tableName} WHERE invoiceId = ?`, [invoiceId]);
    return true;
  },

  // Delete invoice item by ID
  delete: async (id) => {
    return await dbHelpers.delete(tableName, id);
  }
};
