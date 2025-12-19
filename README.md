# Invoice Generator and Management System

A comprehensive invoice management system with Admin and CA (Chartered Accountant) roles, featuring GST compliance, payment tracking, and reporting capabilities.

## Features

- **Invoice Management**: Create, view, edit, and delete invoices with auto-generated invoice IDs
- **GST Compliance**: Automatic GST calculation (CGST, SGST, IGST) based on customer location
- **Customer & Project Management**: Maintain customer database and link invoices to projects
- **Payment Tracking**: Record payments and track invoice payment status (Paid/Unpaid/Partially Paid)
- **Bank Details Management**: Store company and customer bank account details
- **Reports & Dashboard**: View summaries, GST reports, and export to Excel
- **Role-Based Access**: Admin (full access) and CA (read-only access)
- **PDF Generation**: Download invoices as PDF
- **Excel Export**: Export GST reports to Excel for CA review

## Technology Stack

### Backend
- Node.js + Express.js
- MongoDB with Mongoose
- JWT Authentication
- PDFKit for PDF generation
- ExcelJS for Excel export

### Frontend
- React.js
- Tailwind CSS
- React Router
- Axios
- Recharts for charts
- React Hot Toast for notifications

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd Invoice
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/invoice_management
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
FRONTEND_URL=http://localhost:3000
```

For MongoDB Atlas, use:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/invoice_management
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory (optional):

```env
VITE_API_URL=http://localhost:5000/api
```

## Running the Application

### Start MongoDB

If using local MongoDB:
```bash
mongod
```

Or ensure MongoDB Atlas connection is configured.

### Start Backend Server

```bash
cd backend
npm run dev
```

The backend server will run on `http://localhost:5000`

### Start Frontend Development Server

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
4. Update your company details in the profile/settings (for invoice generation)

### Creating an Invoice

1. Navigate to **Customers** and add a customer
2. Optionally, create a **Project** and link it to the customer
3. Go to **Invoices** → **Create Invoice**
4. Fill in invoice details:
   - Select customer and project
   - Choose invoice type (Tax Invoice/Proforma/Non-Tax Invoice)
   - Add items with descriptions, quantities, and rates
   - GST will be calculated automatically for Tax Invoices
5. Save the invoice

### Recording Payments

1. Go to **Payments** → **Record Payment**
2. Select the invoice
3. Enter payment amount, date, and mode
4. Payment status will be updated automatically

### Generating Reports

1. Navigate to **Reports**
2. Filter by date range (optional)
3. View GST summary
4. Export to Excel for CA review

### CA Access

1. Register a new user with **CA** role
2. CA users have read-only access to all invoices and reports
3. They can view and export reports but cannot create or edit invoices

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/company-details` - Update company details

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get single invoice
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `GET /api/invoices/:id/pdf` - Download invoice PDF

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get single customer
- `POST /api/customers` - Create customer
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
- `POST /api/banks` - Create bank details
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
Invoice/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth middleware
│   ├── utils/           # Utility functions
│   ├── server.js        # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context
│   │   ├── utils/       # Utility functions
│   │   └── App.jsx      # Main app component
│   └── package.json
└── README.md
```

## Security Notes

- Change `JWT_SECRET` in production to a strong random string
- Use environment variables for sensitive data
- Implement rate limiting in production
- Use HTTPS in production
- Regularly backup MongoDB database

## Future Enhancements

- Email notifications for invoice creation/payment
- Cloud storage integration for invoice PDFs
- Multi-currency support
- Advanced reporting and analytics
- Mobile app
- Invoice templates customization

## License

ISC

## Support

For issues or questions, please contact the development team.

