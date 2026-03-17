-- Invoice Management System Database Schema
-- For MySQL/MariaDB (XAMPP)

CREATE DATABASE IF NOT EXISTS invoice_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE invoice_management;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'ca') DEFAULT 'admin',
  companyName VARCHAR(255),
  companyGstin VARCHAR(255),
  companyAddress TEXT,
  companyCity VARCHAR(255),
  companyState VARCHAR(255),
  companyPincode VARCHAR(255),
  companyPhone VARCHAR(255),
  companyEmail VARCHAR(255),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  companyName VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(255),
  gstin VARCHAR(255),
  addressStreet VARCHAR(255),
  addressCity VARCHAR(255),
  addressState VARCHAR(255),
  addressPincode VARCHAR(255),
  addressCountry VARCHAR(255) DEFAULT 'India',
  bankAccountNumber VARCHAR(255),
  bankIfsc VARCHAR(255),
  bankName VARCHAR(255),
  bankBranch VARCHAR(255),
  createdBy INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_createdBy (createdBy),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  customerId INT NOT NULL,
  startDate DATE,
  endDate DATE,
  status ENUM('active', 'completed', 'on-hold', 'cancelled') DEFAULT 'active',
  totalBudget DECIMAL(15, 2) DEFAULT 0,
  createdBy INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_customerId (customerId),
  INDEX idx_createdBy (createdBy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bank details table
CREATE TABLE IF NOT EXISTS bank_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  accountHolderName VARCHAR(255) NOT NULL,
  accountNumber VARCHAR(255) NOT NULL,
  ifsc VARCHAR(255) NOT NULL,
  bankName VARCHAR(255) NOT NULL,
  branch VARCHAR(255),
  accountType ENUM('savings', 'current') DEFAULT 'current',
  isDefault BOOLEAN DEFAULT FALSE,
  isCompanyAccount BOOLEAN DEFAULT TRUE,
  customerId INT,
  createdBy INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_createdBy (createdBy),
  INDEX idx_customerId (customerId),
  INDEX idx_isCompanyAccount (isCompanyAccount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceId VARCHAR(255) UNIQUE,
  invoiceDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  invoiceType ENUM('proforma', 'tax-invoice', 'non-tax-invoice') NOT NULL,
  customerId INT NOT NULL,
  projectId INT,
  subtotal DECIMAL(15, 2) NOT NULL,
  gstApplicable BOOLEAN DEFAULT FALSE,
  gstRate DECIMAL(5, 2) DEFAULT 0,
  cgst DECIMAL(15, 2) DEFAULT 0,
  sgst DECIMAL(15, 2) DEFAULT 0,
  igst DECIMAL(15, 2) DEFAULT 0,
  totalAmount DECIMAL(15, 2) NOT NULL,
  taxId VARCHAR(255),
  gstPaid BOOLEAN DEFAULT FALSE,
  companyBankDetailsId INT,
  customerBankDetailsId INT,
  notes TEXT,
  paymentStatus ENUM('unpaid', 'partially-paid', 'paid') DEFAULT 'unpaid',
  createdBy INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (companyBankDetailsId) REFERENCES bank_details(id) ON DELETE SET NULL,
  FOREIGN KEY (customerBankDetailsId) REFERENCES bank_details(id) ON DELETE SET NULL,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_invoiceId (invoiceId),
  INDEX idx_customerId (customerId),
  INDEX idx_projectId (projectId),
  INDEX idx_createdBy (createdBy),
  INDEX idx_invoiceDate (invoiceDate),
  INDEX idx_paymentStatus (paymentStatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceId INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) DEFAULT 1,
  rate DECIMAL(15, 2) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE,
  INDEX idx_invoiceId (invoiceId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceId INT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  paymentDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paymentMode ENUM('online', 'offline', 'bank-transfer', 'upi', 'cheque', 'cash') NOT NULL,
  transactionId VARCHAR(255),
  notes TEXT,
  receivedBy INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (receivedBy) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_invoiceId (invoiceId),
  INDEX idx_receivedBy (receivedBy),
  INDEX idx_paymentDate (paymentDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
