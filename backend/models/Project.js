// Project model - using raw MySQL queries
import { dbHelpers } from '../utils/db.js';

const tableName = 'projects';

// Find all projects with customer info
const findAllWithCustomer = async (where = {}, options = {}) => {
  let sql = `
    SELECT p.*,
      c.id as customer_id, c.name as customer_name, c.companyName as customer_companyName
    FROM ${tableName} p
    LEFT JOIN customers c ON p.customerId = c.id
  `;

  const params = [];
  const conditions = [];

  // Build WHERE clause
  if (Object.keys(where).length > 0) {
    Object.keys(where).forEach(key => {
      if (where[key] !== undefined && where[key] !== null) {
        conditions.push(`p.${key} = ?`);
        params.push(where[key]);
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
    sql += ` ORDER BY p.createdAt DESC`;
  }

  const results = await dbHelpers.raw(sql, params);
  
  // Transform results
  return results.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    customerId: row.customerId,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
    totalBudget: parseFloat(row.totalBudget),
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    customer: row.customer_id ? {
      id: row.customer_id,
      name: row.customer_name,
      companyName: row.customer_companyName
    } : null
  }));
};

export default {
  // Find all projects
  findAll: async (where = {}, options = {}) => {
    return await dbHelpers.findAll(tableName, where, options);
  },

  // Find all projects with customer
  findAllWithCustomer,

  // Find project by ID
  findById: async (id) => {
    return await dbHelpers.findById(tableName, id);
  },

  // Find project by ID with customer
  findByIdWithCustomer: async (id) => {
    let sql = `
      SELECT p.*,
        c.id as customer_id, c.name as customer_name, c.companyName as customer_companyName
      FROM ${tableName} p
      LEFT JOIN customers c ON p.customerId = c.id
      WHERE p.id = ?
      LIMIT 1
    `;
    const results = await dbHelpers.raw(sql, [id]);
    
    if (results.length === 0) {
      return null;
    }
    
    const row = results[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      customerId: row.customerId,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
      totalBudget: parseFloat(row.totalBudget),
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: row.customer_id ? {
        id: row.customer_id,
        name: row.customer_name,
        companyName: row.customer_companyName
      } : null
    };
  },

  // Create project
  create: async (projectData) => {
    return await dbHelpers.create(tableName, projectData);
  },

  // Update project
  update: async (id, projectData) => {
    return await dbHelpers.update(tableName, id, projectData);
  },

  // Delete project
  delete: async (id) => {
    return await dbHelpers.delete(tableName, id);
  }
};
