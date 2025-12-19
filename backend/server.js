import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import invoiceRoutes from './routes/invoices.js';
import customerRoutes from './routes/customers.js';
import projectRoutes from './routes/projects.js';
import paymentRoutes from './routes/payments.js';
import bankRoutes from './routes/banks.js';
import reportRoutes from './routes/reports.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice_management';
    
    // Check if MongoDB URI is set
    if (!process.env.MONGODB_URI) {
      console.log('⚠️  MONGODB_URI not set in .env file');
      console.log('📝 Using default: mongodb://localhost:27017/invoice_management');
      console.log('💡 Make sure MongoDB is running locally or set MONGODB_URI in .env');
    }
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('\n📋 Troubleshooting steps:');
    console.log('1. If using MongoDB Atlas:');
    console.log('   - Check your connection string in .env file');
    console.log('   - Ensure your IP is whitelisted in Atlas');
    console.log('   - Verify your username and password are correct');
    console.log('2. If using local MongoDB:');
    console.log('   - Make sure MongoDB service is running');
    console.log('   - Check if MongoDB is installed');
    console.log('   - Try: mongod (to start MongoDB)');
    console.log('\n⚠️  Server will continue but database operations will fail.\n');
  }
};

connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 API available at http://localhost:${PORT}/api`);
});

// Handle port already in use error
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.log('\n📋 To fix this:');
    console.log(`1. Find the process using port ${PORT}:`);
    console.log(`   netstat -ano | findstr :${PORT}`);
    console.log(`2. Kill the process:`);
    console.log(`   taskkill /PID <PID> /F`);
    console.log(`3. Or change the port in .env file: PORT=5001\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

