// Invoice model - using raw MySQL queries
import { dbHelpers } from '../utils/db.js';
import { formatDate } from '../utils/db.js';

const tableName = 'invoices';

// Generate invoice ID
const generateInvoiceId = async (invoiceDate) => {
  const date = invoiceDate ? new Date(invoiceDate) : new Date();
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);

  // Count existing invoices for this year using raw query
  const sql = `SELECT COUNT(*) as count FROM ${tableName} 
               WHERE invoiceDate >= ? AND invoiceDate < ?`;
  const results = await dbHelpers.raw(sql, [
    formatDate(startOfYear),
    formatDate(endOfYear)
  ]);
  const count = results[0].count;

  // Generate invoice ID: INV-YYYY-XXXX
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
};

// Find all invoices with joins
const findAll = async (where = {}, options = {}) => {
  let sql = `
    SELECT i.*,
      c.id as customer_id, c.name as customer_name, c.companyName as customer_companyName,
      c.email as customer_email, c.phone as customer_phone, c.gstin as customer_gstin,
      c.addressStreet as customer_addressStreet, c.addressCity as customer_addressCity,
      c.addressState as customer_addressState, c.addressPincode as customer_addressPincode,
      p.id as project_id, p.name as project_name,
      bd1.id as company_bank_id, bd1.accountNumber as company_accountNumber,
      bd1.ifsc as company_ifsc, bd1.bankName as company_bankName, bd1.branch as company_bank_branch,
      bd2.id as customer_bank_id, bd2.accountNumber as customer_accountNumber,
      bd2.ifsc as customer_ifsc, bd2.bankName as customer_bankName
    FROM ${tableName} i
    LEFT JOIN customers c ON i.customerId = c.id
    LEFT JOIN projects p ON i.projectId = p.id
    LEFT JOIN bank_details bd1 ON i.companyBankDetailsId = bd1.id
    LEFT JOIN bank_details bd2 ON i.customerBankDetailsId = bd2.id
  `;

  const params = [];
  const conditions = [];

  // Build WHERE clause
  if (Object.keys(where).length > 0) {
    Object.keys(where).forEach(key => {
      if (where[key] !== undefined && where[key] !== null) {
        if (key === 'invoiceDate' && typeof where[key] === 'object') {
          // Handle date range operators - support both single operator and multiple
          if (where[key].operator) {
            conditions.push(`i.invoiceDate ${where[key].operator} ?`);
            params.push(formatDate(where[key].value));
          }
          if (where[key].gte) {
            conditions.push(`i.invoiceDate >= ?`);
            params.push(formatDate(where[key].gte));
          }
          if (where[key].lte) {
            conditions.push(`i.invoiceDate <= ?`);
            params.push(formatDate(where[key].lte));
          }
        } else if (Array.isArray(where[key])) {
          const placeholders = where[key].map(() => '?').join(',');
          conditions.push(`i.${key} IN (${placeholders})`);
          params.push(...where[key]);
        } else {
          conditions.push(`i.${key} = ?`);
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
    sql += ` ORDER BY i.invoiceDate DESC`;
  }

  // Add LIMIT and OFFSET
  if (options.limit) {
    sql += ` LIMIT ?`;
    params.push(options.limit);
    if (options.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }
  }

  const results = await dbHelpers.raw(sql, params);
  
  // Transform results to match expected format
  return results.map(row => ({
    id: row.id,
    invoiceId: row.invoiceId,
    invoiceDate: row.invoiceDate,
    invoiceType: row.invoiceType,
    customerId: row.customerId,
    projectId: row.projectId,
    subtotal: parseFloat(row.subtotal),
    gstApplicable: Boolean(row.gstApplicable),
    gstRate: parseFloat(row.gstRate),
    cgst: parseFloat(row.cgst),
    sgst: parseFloat(row.sgst),
    igst: parseFloat(row.igst),
    totalAmount: parseFloat(row.totalAmount),
    taxId: row.taxId,
    gstPaid: Boolean(row.gstPaid),
    companyBankDetailsId: row.companyBankDetailsId,
    customerBankDetailsId: row.customerBankDetailsId,
    notes: row.notes,
    paymentStatus: row.paymentStatus,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    customer: row.customer_id ? {
      id: row.customer_id,
      name: row.customer_name,
      companyName: row.customer_companyName,
      email: row.customer_email,
      phone: row.customer_phone,
      gstin: row.customer_gstin,
      addressStreet: row.customer_addressStreet,
      addressCity: row.customer_addressCity,
      addressState: row.customer_addressState,
      addressPincode: row.customer_addressPincode
    } : null,
    project: row.project_id ? {
      id: row.project_id,
      name: row.project_name
    } : null,
    companyBankDetails: row.company_bank_id ? {
      id: row.company_bank_id,
      accountNumber: row.company_accountNumber,
      ifsc: row.company_ifsc,
      bankName: row.company_bankName,
      branch: row.company_bank_branch
    } : null,
    customerBankDetails: row.customer_bank_id ? {
      id: row.customer_bank_id,
      accountNumber: row.customer_accountNumber,
      ifsc: row.customer_ifsc,
      bankName: row.customer_bankName
    } : null
  }));
};

// Find invoice by ID with all relations
const findById = async (id) => {
  const invoices = await findAll({ id }, { limit: 1 });
  if (invoices.length === 0) return null;

  const invoice = invoices[0];
  
  // Get invoice items
  const InvoiceItem = (await import('./InvoiceItem.js')).default;
  const items = await InvoiceItem.findByInvoiceId(id);
  invoice.items = items.map(item => ({
    id: item.id,
    description: item.description,
    quantity: parseFloat(item.quantity),
    rate: parseFloat(item.rate),
    amount: parseFloat(item.amount)
  }));

  return invoice;
};

// Find and count all (for pagination)
const findAndCountAll = async (where = {}, options = {}) => {
  // Get count
  let countSql = `SELECT COUNT(*) as count FROM ${tableName} i`;
  const countParams = [];
  const countConditions = [];

  // Build WHERE clause for count
  if (Object.keys(where).length > 0) {
    Object.keys(where).forEach(key => {
      if (where[key] !== undefined && where[key] !== null) {
        if (key === 'invoiceDate' && typeof where[key] === 'object') {
          if (where[key].operator) {
            countConditions.push(`i.invoiceDate ${where[key].operator} ?`);
            countParams.push(formatDate(where[key].value));
          } else if (where[key].gte) {
            countConditions.push(`i.invoiceDate >= ?`);
            countParams.push(formatDate(where[key].gte));
          } else if (where[key].lte) {
            countConditions.push(`i.invoiceDate <= ?`);
            countParams.push(formatDate(where[key].lte));
          }
        } else if (Array.isArray(where[key])) {
          const placeholders = where[key].map(() => '?').join(',');
          countConditions.push(`i.${key} IN (${placeholders})`);
          countParams.push(...where[key]);
        } else {
          countConditions.push(`i.${key} = ?`);
          countParams.push(where[key]);
        }
      }
    });
    if (countConditions.length > 0) {
      countSql += ` WHERE ${countConditions.join(' AND ')}`;
    }
  }

  const countResult = await dbHelpers.raw(countSql, countParams);
  const count = countResult[0].count;

  // Get data
  const rows = await findAll(where, options);

  return { rows, count };
};

const Invoice = {
  findAll,
  findById,
  findAndCountAll,
  
  // Count invoices
  count: async (where = {}) => {
    return await dbHelpers.count(tableName, where);
  },

  // Create invoice
  create: async (invoiceData) => {
    // Generate invoice ID if not provided
    if (!invoiceData.invoiceId || invoiceData.invoiceId === '') {
      invoiceData.invoiceId = await generateInvoiceId(invoiceData.invoiceDate);
    }

    // Format dates
    if (invoiceData.invoiceDate) {
      invoiceData.invoiceDate = formatDate(invoiceData.invoiceDate);
    }

    const result = await dbHelpers.create(tableName, invoiceData);
    return await findById(result.id);
  },

  // Update invoice
  update: async (id, invoiceData) => {
    // Format dates
    if (invoiceData.invoiceDate) {
      invoiceData.invoiceDate = formatDate(invoiceData.invoiceDate);
    }

    await dbHelpers.update(tableName, id, invoiceData);
    return await findById(id);
  },

  // Delete invoice
  delete: async (id) => {
    return await dbHelpers.delete(tableName, id);
  }
};

export default Invoice;
