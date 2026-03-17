# Invoice Generator and Management System

A comprehensive invoice management system with Admin and CA (Chartered Accountant) roles, featuring GST compliance, payment tracking, and reporting capabilities. Built with MySQL, React, and Node.js.

## Features

- **Invoice Management**: Create, view, edit, and delete invoices with auto-generated invoice IDs (INV-YYYY-XXXX format)
- **GST Compliance**: 
  - Automatic GST calculation (CGST, SGST, IGST) based on customer and company state
  - **Inter-state transactions**: IGST applies when states differ
  - **Intra-state transactions**: CGST + SGST applies when states are the same
  - Clear tax type indicators in invoice view
  - GST rate selection (12% or 18%)
- **GSTIN Validation**: Validates 15-character GSTIN format with state code verification
- **IFSC Validation**: Validates 11-character IFSC code format (4 letters + 0 + 6 digits)
- **Customer & Project Management**: Maintain customer database with address and bank details, link invoices to projects
- **Payment Tracking**: Record payments and track invoice payment status (Paid/Unpaid/Partially Paid) with automatic status updates
- **Bank Details Management**: Store company and customer bank account details with validation
- **Reports & Dashboard**: View summaries, GST reports, and export to Excel
- **Role-Based Access**: Admin (full access) and CA (read-only access)
- **PDF Generation**: Download invoices as PDF with actual company details
- **Excel Export**: Export GST reports to Excel for CA review
- **Company Profile**: Manage company details that appear on invoices

## Technology Stack

### Backend
- Node.js + Express.js
- MySQL (mysql2) - Database
- JWT Authentication
- PDFKit for PDF generation
- ExcelJS for Excel export
- Raw SQL queries for database operations

### Frontend
- React.js (Vite)
- Tailwind CSS
- React Router
- Axios
- React Hot Toast for notifications
- date-fns for date formatting

## Prerequisites

- Node.js (v16 or higher)
- MySQL Server (XAMPP, WAMP, or standalone MySQL installation)
- npm or yarn

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Ritesh7365/Invoice-Generator-and-Management-System-.git
cd Invoice-Generator-and-Management-System--main
```

### 2. Database Setup

#### Option A: Using XAMPP (Recommended for Windows)

1. Start XAMPP and ensure MySQL is running
2. Open phpMyAdmin (http://localhost/phpmyadmin)
3. Create a new database named `invoice_management`
4. Import the schema file: `backend/database/schema.sql`

#### Option B: Using MySQL Command Line

```bash
mysql -u root -p
CREATE DATABASE invoice_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE invoice_management;
SOURCE backend/database/schema.sql;
```

#### Option C: Automatic Setup (Development)

The backend can auto-create tables if configured (see `.env` setup below).

### 3. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=invoice_management

# Optional: Auto-create tables in development
AUTO_CREATE_TABLES=false

# JWT Secret (Change in production!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

**Note**: Update `DB_PASSWORD` if your MySQL has a password. Leave empty for default XAMPP setup.

### 4. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory (optional):

```env
VITE_API_URL=http://localhost:5000/api
```

## Running the Application

### Quick Start (Windows PowerShell)

Use the provided PowerShell script:

```powershell
.\start-project.ps1
```

This script will:
- Check for Node.js and MySQL
- Start both backend and frontend servers
- Open the application in your browser

### Manual Start

#### 1. Start MySQL Server

**XAMPP**: Start MySQL from XAMPP Control Panel

**Standalone MySQL**: Ensure MySQL service is running

#### 2. Start Backend Server

```bash
cd backend
npm run dev
```

The backend server will run on `http://localhost:5000`

#### 3. Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

### First Time Setup

1. Open `http://localhost:3000` in your browser
2. Register a new account (Admin role)
3. Login with your credentials
4. **Important**: Update your company details via the profile/settings:
   - Company name
   - Company address
   - Company state (required for correct GST calculation)
   - Company GSTIN (validated format)
   - Company contact details
   - This information will appear on all invoices

### Creating an Invoice

1. Navigate to **Customers** and add a customer with:
   - Customer details
   - Address (including state - required for GST calculation)
   - GSTIN (optional, validated if provided)
   - Bank details (optional)
2. Optionally, create a **Project** and link it to the customer
3. Go to **Invoices** → **Create Invoice**
4. Fill in invoice details:
   - Select customer and project
   - Choose invoice type (Tax Invoice/Proforma/Non-Tax Invoice)
   - For Tax Invoice: Select GST rate (12% or 18%)
   - Add items with descriptions, quantities, and rates
   - GST will be calculated automatically:
     - **Same state**: CGST + SGST (each = GST/2)
     - **Different states**: IGST (full GST rate)
5. Save the invoice

### Recording Payments

1. Go to **Payments** → **Record Payment**
2. Select the invoice
3. Enter payment amount, date, and mode
4. Payment status will be updated automatically (Unpaid → Partially Paid → Paid)

### Managing Bank Details

1. Navigate to **Banks** → **Add Bank Details**
2. Enter bank information:
   - Account holder name
   - Account number
   - **IFSC Code** (validated: 4 letters + 0 + 6 digits, e.g., SBIN0000456)
   - Bank name and branch
   - Account type (Savings/Current)
   - Mark as Company Account or Customer Account
   - Set as default (optional)
3. Bank details can be linked to invoices

### Generating Reports

1. Navigate to **Reports**
2. Filter by date range (optional)
3. View GST summary with:
   - Total CGST, SGST, IGST
   - Taxable value
   - Invoice breakdown
4. Export to Excel for CA review

### CA Access

1. Register a new user with **CA** role
2. CA users have read-only access to all invoices and reports
3. They can view and export reports but cannot create or edit invoices

## Validation Features

### GSTIN Validation
- Format: 15 characters
- Structure: 2 digits (State Code) + 10 chars (PAN) + 1 char (Entity) + Z + 1 char (Check digit)
- Example: `27AAAAA0000A1Z5`
- Validates state code (01-40)
- Applied to customer and company GSTIN fields

### IFSC Validation
- Format: 11 characters
- Structure: 4 letters + 0 + 6 digits
- Example: `SBIN0000456`
- Applied to bank details (company and customer)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/company-details` - Update company details

### Invoices
- `GET /api/invoices` - Get all invoices (with pagination)
- `GET /api/invoices/:id` - Get single invoice
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `GET /api/invoices/:id/pdf` - Download invoice PDF

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get single customer
- `POST /api/customers` - Create customer (with GSTIN validation)
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/invoice/:invoiceId` - Get payments for invoice
- `POST /api/payments` - Record payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

### Banks
- `GET /api/banks` - Get all bank details
- `GET /api/banks/:id` - Get single bank detail
- `POST /api/banks` - Create bank details (with IFSC validation)
- `PUT /api/banks/:id` - Update bank details
- `DELETE /api/banks/:id` - Delete bank details

### Reports
- `GET /api/reports/dashboard` - Get dashboard summary
- `GET /api/reports/gst` - Get GST report
- `GET /api/reports/gst/export/excel` - Export GST report to Excel
- `GET /api/reports/customer/:customerId` - Get customer-wise report
- `GET /api/reports/project/:projectId` - Get project-wise report

## Project Structure

```
Invoice-Generator-and-Management-System--main/
├── backend/
│   ├── config/
│   │   └── database.js          # MySQL connection configuration
│   ├── database/
│   │   └── schema.sql           # Database schema
│   ├── middleware/
│   │   └── auth.js             # JWT authentication middleware
│   ├── models/                  # Data models (using raw SQL)
│   │   ├── BankDetails.js
│   │   ├── Customer.js
│   │   ├── Invoice.js
│   │   ├── InvoiceItem.js
│   │   ├── Payment.js
│   │   ├── Project.js
│   │   └── User.js
│   ├── routes/                  # API routes
│   │   ├── auth.js
│   │   ├── banks.js
│   │   ├── customers.js
│   │   ├── invoices.js
│   │   ├── payments.js
│   │   ├── projects.js
│   │   └── reports.js
│   ├── utils/                   # Utility functions
│   │   ├── db.js               # Database helper functions
│   │   ├── gstCalculator.js    # GST calculation logic
│   │   ├── gstinValidator.js   # GSTIN validation
│   │   ├── ifscValidator.js    # IFSC validation
│   │   └── pdfGenerator.js     # PDF generation
│   ├── server.js               # Express server
│   ├── setup-database.js       # Database setup script
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── ProfileSidebar.jsx
│   │   │   └── TopNav.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Authentication context
│   │   ├── pages/              # Page components
│   │   │   ├── Banks.jsx
│   │   │   ├── BankForm.jsx
│   │   │   ├── Customers.jsx
│   │   │   ├── CustomerForm.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── InvoiceCreate.jsx
│   │   │   ├── InvoiceView.jsx
│   │   │   ├── Invoices.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Payments.jsx
│   │   │   ├── ProjectForm.jsx
│   │   │   ├── Projects.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Reports.jsx
│   │   ├── utils/
│   │   │   ├── api.js          # Axios API client
│   │   │   ├── gstinValidator.js
│   │   │   └── ifscValidator.js
│   │   ├── App.jsx             # Main app component
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
├── start-project.ps1           # Quick start script (Windows)
└── README.md
```

## Database Schema

The system uses MySQL with the following main tables:
- `users` - User accounts and company details
- `customers` - Customer information
- `projects` - Project management
- `bank_details` - Bank account information
- `invoices` - Invoice records
- `invoice_items` - Invoice line items
- `payments` - Payment records

See `backend/database/schema.sql` for complete schema.

## Key Features & Improvements

### ✅ Recent Improvements

1. **MySQL Migration**: Complete migration from MongoDB to MySQL
2. **ID Fixes**: Fixed all `_id` to `id` references for MySQL compatibility
3. **GSTIN Validation**: 15-character format validation with state code verification
4. **IFSC Validation**: 11-character format validation (4 letters + 0 + 6 digits)
5. **Tax Logic Visibility**: Clear indicators for inter-state (IGST) vs intra-state (CGST+SGST)
6. **Company Data**: Real company details in invoices (replaced placeholders)
7. **GST Rate Selection**: Dropdown with 12% and 18% options
8. **Enhanced Error Handling**: Better error messages and validation
9. **Payment Tracking**: Automatic invoice status updates
10. **PDF Generation**: Uses actual company data from user profile

## Security Notes

- Change `JWT_SECRET` in production to a strong random string
- Use environment variables for sensitive data (database credentials)
- Implement rate limiting in production
- Use HTTPS in production
- Regularly backup MySQL database
- Keep database credentials secure
- Validate all user inputs (GSTIN, IFSC, etc.)

## Troubleshooting

### Database Connection Issues

1. Ensure MySQL server is running
2. Check database credentials in `.env` file
3. Verify database exists: `SHOW DATABASES;`
4. Run schema manually if auto-creation fails: `mysql -u root -p < backend/database/schema.sql`

### Port Already in Use

If port 5000 or 3000 is already in use:
- Backend: Change `PORT` in `backend/.env`
- Frontend: Vite will automatically use next available port

### Common Issues

- **404 errors**: Ensure IDs are using `id` not `_id` (MySQL uses numeric IDs)
- **GST calculation wrong**: Verify company state and customer state are set correctly
- **Validation errors**: Check GSTIN/IFSC format matches requirements

## Future Enhancements

- Email notifications for invoice creation/payment
- Cloud storage integration for invoice PDFs
- Multi-currency support
- Advanced reporting and analytics
- Mobile app
- Invoice templates customization
- Bulk invoice generation
- Recurring invoices
- Payment reminders

## License

ISC

## Support

For issues or questions, please open an issue on GitHub or contact the development team.

## ContributingContributions are welcome! Please feel free to submit a Pull Request.