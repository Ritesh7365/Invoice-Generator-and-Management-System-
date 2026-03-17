// Database setup script
// Run this to create the database and tables manually
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  let connection;
  
  try {
    // Connect without database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('✅ Connected to MySQL server');

    // Create database
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'invoice_management'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ Database '${process.env.DB_NAME || 'invoice_management'}' created or already exists`);

    // Use the database
    await connection.query(`USE ${process.env.DB_NAME || 'invoice_management'}`);

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Split by semicolons and execute each statement
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.toLowerCase().startsWith('create database') && !stmt.toLowerCase().startsWith('use '));

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await connection.query(statement);
          } catch (error) {
            // Ignore "table already exists" errors
            if (!error.message.includes('already exists')) {
              console.error('Error executing statement:', error.message);
              console.error('Statement:', statement.substring(0, 100));
            }
          }
        }
      }
      console.log('✅ Database tables created');
    } else {
      console.log('⚠️  Schema file not found');
    }

    console.log('\n✅ Database setup complete!');
    console.log('You can now start the server with: npm run dev\n');

  } catch (error) {
    console.error('❌ Database setup error:', error.message);
    console.log('\n📋 Troubleshooting:');
    console.log('1. Make sure XAMPP MySQL is running');
    console.log('2. Check your .env file credentials');
    console.log('3. Verify MySQL user has proper permissions\n');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
