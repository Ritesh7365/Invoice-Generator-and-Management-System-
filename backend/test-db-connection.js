// Test MySQL connection with different password options
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  const passwords = [
    process.env.DB_PASSWORD, // Current password from .env
    '', // Empty password
    'root', // Common default
    null // No password
  ];

  console.log('🔍 Testing MySQL connection...\n');
  console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`User: ${process.env.DB_USER || 'root'}`);
  console.log(`Database: ${process.env.DB_NAME || 'invoice_management'}\n`);

  for (const password of passwords) {
    try {
      console.log(`Testing with password: ${password === '' ? '(empty)' : password || '(null)'}...`);
      
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: password || '',
        connectTimeout: 2000
      });

      await connection.ping();
      await connection.end();
      
      console.log(`✅ SUCCESS! Password works: ${password === '' ? '(empty)' : password || '(null)'}\n`);
      console.log('📝 Update your .env file with the correct password (or remove DB_PASSWORD line if empty)\n');
      return;
    } catch (error) {
      if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log(`❌ Access denied\n`);
      } else {
        console.log(`❌ Error: ${error.message}\n`);
      }
    }
  }

  console.log('❌ None of the tested passwords worked.');
  console.log('\n📋 Next steps:');
  console.log('1. Open XAMPP Control Panel');
  console.log('2. Make sure MySQL is running');
  console.log('3. Open phpMyAdmin: http://localhost/phpmyadmin');
  console.log('4. Try to login and note the password');
  console.log('5. Update backend/.env with the correct password\n');
}

testConnection().catch(console.error);
