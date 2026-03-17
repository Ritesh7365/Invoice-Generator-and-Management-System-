// Payment model - using raw MySQL queries
import { dbHelpers } from '../utils/db.js';
import { formatDate } from '../utils/db.js';

const tableName = 'payments';

// Find all payments with invoice and customer info
const findAllWithInvoice = async (where = {}, options = {}) => {
  let sql = `
    SELECT p.*,
      i.id as invoice_id, i.invoiceId as invoice_invoiceId, i.invoiceDate as invoice_invoiceDate,
      i.totalAmount as invoice_totalAmount, i.customerId as invoice_customerId,
      c.id as customer_id, c.name as customer_name, c.companyName as customer_companyName
    FROM ${tableName} p
    LEFT JOIN invoices i ON p.invoiceId = i.id
    LEFT JOIN customers c ON i.customerId = c.id
  `;

  const params = [];
  const conditions = [];

  // Build WHERE clause
  if (Object.keys(where).length > 0) {
    Object.keys(where).forEach(key => {
      if (where[key] !== undefined && where[key] !== null) {
        if (key === 'paymentDate' && typeof where[key] === 'object') {
          if (where[key].gte) {
            conditions.push(`p.paymentDate >= ?`);
            params.push(formatDate(where[key].gte));
          }
          if (where[key].lte) {
            conditions.push(`p.paymentDate <= ?`);
            params.push(formatDate(where[key].lte));
          }
        } else {
          conditions.push(`p.${key} = ?`);
          params.push(where[key]);
        }
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
    sql += ` ORDER BY p.paymentDate DESC`;
  }

  const results = await dbHelpers.raw(sql, params);
  
  // Transform results
  return results.map(row => ({
    id: row.id,
    invoiceId: row.invoiceId,
    amount: parseFloat(row.amount),
    paymentDate: row.paymentDate,
    paymentMode: row.paymentMode,
    transactionId: row.transactionId,
    notes: row.notes,
    receivedBy: row.receivedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    invoice: row.invoice_id ? {
      id: row.invoice_id,
      invoiceId: row.invoice_invoiceId,
      invoiceDate: row.invoice_invoiceDate,
      totalAmount: parseFloat(row.invoice_totalAmount),
      customerId: row.invoice_customerId,
      customer: row.customer_id ? {
        id: row.customer_id,
        name: row.customer_name,
        companyName: row.customer_companyName
      } : null
    } : null
  }));
};

export default {
  // Find all payments
  findAll: async (where = {}, options = {}) => {
    // Handle array of invoiceIds specially
    if (where.invoiceId && Array.isArray(where.invoiceId)) {
      let sql = `SELECT * FROM ${tableName} WHERE invoiceId IN (${where.invoiceId.map(() => '?').join(',')})`;
      if (options.orderBy) {
        sql += ` ORDER BY ${options.orderBy}`;
      }
      return await dbHelpers.raw(sql, where.invoiceId);
    }
    return await dbHelpers.findAll(tableName, where, options);
  },

  // Find all payments with invoice
  findAllWithInvoice,

  // Find payment by ID
  findById: async (id) => {
    return await dbHelpers.findById(tableName, id);
  },

  // Find payment by ID with invoice
  findByIdWithInvoice: async (id) => {
    const payments = await findAllWithInvoice({ id: id }, { limit: 1 });
    return payments[0] || null;
  },

  // Find payments by invoice ID
  findByInvoiceId: async (invoiceId) => {
    return await dbHelpers.findAll(tableName, { invoiceId }, { orderBy: 'paymentDate DESC' });
  },

  // Create payment
  create: async (paymentData) => {
    if (paymentData.paymentDate) {
      paymentData.paymentDate = formatDate(paymentData.paymentDate);
    }
    return await dbHelpers.create(tableName, paymentData);
  },

  // Update payment
  update: async (id, paymentData) => {
    if (paymentData.paymentDate) {
      paymentData.paymentDate = formatDate(paymentData.paymentDate);
    }
    return await dbHelpers.update(tableName, id, paymentData);
  },

  // Delete payment
  delete: async (id) => {
    return await dbHelpers.delete(tableName, id);
  }
};
