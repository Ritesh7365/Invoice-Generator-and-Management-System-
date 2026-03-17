import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'invoice_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection and initialize database
const connectDB = async () => {
  try {
    // Test connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ MySQL connected successfully');
    
    // In development, optionally run schema if tables don't exist
    if (process.env.NODE_ENV === 'development' && process.env.AUTO_CREATE_TABLES === 'true') {
      try {
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        if (fs.existsSync(schemaPath)) {
          const schema = fs.readFileSync(schemaPath, 'utf8');
          // Execute schema (split by semicolons and execute each statement)
          const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
          for (const statement of statements) {
            if (statement.trim()) {
              await pool.execute(statement);
            }
          }
          console.log('✅ Database tables initialized');
        }
      } catch (schemaError) {
        console.log('⚠️  Schema auto-creation skipped (tables may already exist)');
      }
    }
  } catch (error) {
    console.error('❌ MySQL connection error:', error.message);
    console.log('\n📋 Troubleshooting steps:');
    console.log('1. Check your MySQL server is running (XAMPP MySQL)');
    console.log('2. Verify database credentials in .env file');
    console.log('3. Ensure database exists (run schema.sql manually or set AUTO_CREATE_TABLES=true)');
    console.log('4. Check MySQL user has proper permissions');
    console.log('5. Make sure XAMPP MySQL is started');
    console.log('\n⚠️  Server will continue but database operations will fail until connection is fixed.\n');
    // Don't exit - let server start but warn about database issues
    // process.exit(1);
  }
};

// Helper function to execute queries
const query = async (sql, params = []) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('[DB] Query error:', error.message);
    console.error('[DB] SQL:', sql.substring(0, 200)); // Log first 200 chars of SQL
    console.error('[DB] Params count:', params.length);
    console.error('[DB] Error code:', error.code);
    console.error('[DB] Error stack:', error.stack);
    throw error;
  }
};

// Helper function for transactions
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export { pool, connectDB, query, transaction };


