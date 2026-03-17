// Database query helper utilities
import { query, pool } from '../config/database.js';

// Generic CRUD operations
export const dbHelpers = {
  // Find all records
  findAll: async (table, where = {}, options = {}) => {
    let sql = `SELECT * FROM ${table}`;
    const params = [];
    const conditions = [];

    // Build WHERE clause
    if (Object.keys(where).length > 0) {
      Object.keys(where).forEach(key => {
        if (where[key] !== undefined && where[key] !== null) {
          if (typeof where[key] === 'object' && where[key].operator) {
            // Handle operators like { operator: '>=', value: date }
            conditions.push(`${key} ${where[key].operator} ?`);
            params.push(where[key].value);
          } else if (Array.isArray(where[key])) {
            // Handle IN clause
            const placeholders = where[key].map(() => '?').join(',');
            conditions.push(`${key} IN (${placeholders})`);
            params.push(...where[key]);
          } else {
            conditions.push(`${key} = ?`);
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

    return await query(sql, params);
  },

  // Find one record
  findOne: async (table, where = {}) => {
    const results = await dbHelpers.findAll(table, where, { limit: 1 });
    return results[0] || null;
  },

  // Find by ID
  findById: async (table, id) => {
    const results = await query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return results[0] || null;
  },

  // Create record
  create: async (table, data) => {
    try {
      const keys = Object.keys(data).filter(key => data[key] !== undefined);
      const values = keys.map(key => data[key]);
      const placeholders = keys.map(() => '?').join(', ');
      const columns = keys.join(', ');

      const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
      console.log(`[DB] Creating record in ${table}:`, { columns, valuesCount: values.length });
      
      const result = await query(sql, values);
      
      // mysql2 execute returns [rows, fields], query() already extracts rows
      // For INSERT, rows is a ResultSetHeader object with insertId property
      const insertId = result?.insertId;
      
      if (!insertId) {
        console.error('[DB] Insert failed - no insertId:', result);
        console.error('[DB] Full result object:', JSON.stringify(result, null, 2));
        throw new Error(`Failed to get insert ID from database. Result: ${JSON.stringify(result)}`);
      }
      
      console.log(`[DB] Record created with ID: ${insertId}`);
      
      // Fetch the created record to return complete data with all fields
      const created = await dbHelpers.findById(table, insertId);
      if (!created) {
        console.warn(`[DB] Created record not found after insert (ID: ${insertId}), returning fallback`);
        return { id: insertId, ...data };
      }
      return created;
    } catch (error) {
      console.error(`[DB] Error creating record in ${table}:`, error.message);
      console.error('[DB] Error stack:', error.stack);
      throw error;
    }
  },

  // Update record
  update: async (table, id, data) => {
    const keys = Object.keys(data).filter(key => data[key] !== undefined && key !== 'id');
    const values = keys.map(key => data[key]);
    const setClause = keys.map(key => `${key} = ?`).join(', ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    await query(sql, [...values, id]);
    return await dbHelpers.findById(table, id);
  },

  // Delete record
  delete: async (table, id) => {
    await query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    return true;
  },

  // Count records
  count: async (table, where = {}) => {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const params = [];
    const conditions = [];

    if (Object.keys(where).length > 0) {
      Object.keys(where).forEach(key => {
        if (where[key] !== undefined && where[key] !== null) {
          if (typeof where[key] === 'object' && where[key].operator) {
            conditions.push(`${key} ${where[key].operator} ?`);
            params.push(where[key].value);
          } else {
            conditions.push(`${key} = ?`);
            params.push(where[key]);
          }
        }
      });
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    const results = await query(sql, params);
    return results[0].count;
  },

  // Execute raw query
  raw: async (sql, params = []) => {
    return await query(sql, params);
  }
};

// Helper to build date range conditions
export const buildDateRange = (field, startDate, endDate) => {
  const conditions = {};
  if (startDate) {
    conditions[field] = { operator: '>=', value: new Date(startDate) };
  }
  if (endDate) {
    const endField = endDate ? { operator: '<=', value: new Date(endDate) } : null;
    if (endField) {
      // For date ranges, we need to handle this differently
      return { start: conditions[field], end: endField };
    }
  }
  return conditions;
};

// Helper to format date for MySQL
export const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};
