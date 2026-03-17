// Test registration to debug the issue
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function testRegistration() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'invoice_management'
    });

    console.log('✅ Connected to database\n');

    // Test data
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 10),
      role: 'admin'
    };

    console.log('Testing INSERT query...');
    const sql = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`;
    const [result] = await connection.execute(sql, [
      testUser.name,
      testUser.email,
      testUser.password,
      testUser.role
    ]);

    console.log('Insert result:', result);
    console.log('Insert ID:', result.insertId);
    console.log('Affected rows:', result.affectedRows);

    if (result.insertId) {
      console.log('\n✅ INSERT successful!');
      
      // Fetch the created user
      const [users] = await connection.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
      console.log('Created user:', users[0]);
      
      // Clean up - delete test user
      await connection.execute('DELETE FROM users WHERE id = ?', [result.insertId]);
      console.log('\n✅ Test user cleaned up');
    } else {
      console.log('\n❌ No insert ID returned');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('SQL State:', error.sqlState);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testRegistration();
