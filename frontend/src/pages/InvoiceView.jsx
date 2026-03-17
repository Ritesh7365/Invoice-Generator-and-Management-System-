import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { FiDownload, FiPrinter, FiArrowLeft, FiEdit } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function InvoiceView() {
  const { id } = useParams();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyDetails, setCompanyDetails] = useState(null);

  useEffect(() => {
    fetchInvoice();
    fetchCompanyDetails();
  }, [id]);

  const fetchCompanyDetails = async () => {
    try {
      if (user?.companyDetails) {
        setCompanyDetails(user.companyDetails);
      } else {
        const response = await api.get('/auth/me');
        if (response.data?.user?.companyDetails) {
          setCompanyDetails(response.data.user.companyDetails);
        }
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
    }
  };

  const fetchInvoice = async () => {
    if (!id || id === 'undefined') {
      toast.error('Invalid invoice ID');
      setLoading(false);
      return;
    }
    try {
      const response = await api.get(`/invoices/${id}`);
      setInvoice(response.data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!id || id === 'undefined') {
      toast.error('Invalid invoice ID');
      return;
    }
    try {
      const response = await api.get(`/invoices/${id}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoice?.invoiceId || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error(error.response?.data?.message || 'Failed to download PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Invoice not found</p>
        <Link to="/invoices" className="btn-primary mt-4 inline-block">Back to Invoices</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Invoice Details</h1>
          <p className="text-gray-600 mt-1">Invoice #{invoice.invoiceId}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePrint}
            className="btn-secondary flex items-center space-x-2"
          >
            <FiPrinter className="h-4 w-4" />
            <span>Print</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="btn-primary flex items-center space-x-2"
          >
            <FiDownload className="h-4 w-4" />
            <span>Download PDF</span>
          </button>
          <Link
            to={`/invoices/${id}/edit`}
            className="btn-secondary flex items-center space-x-2"
          >
            <FiEdit className="h-4 w-4" />
            <span>Edit</span>
          </Link>
          <Link
            to="/invoices"
            className="btn-secondary flex items-center space-x-2"
          >
            <FiArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Link>
        </div>
      </div>

      <div className="card p-8 print:p-0 print:shadow-none max-w-4xl mx-auto" id="invoice-print">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">TAX INVOICE</h2>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold mb-2">From:</h3>
            {companyDetails ? (
              <>
                {companyDetails.name && <p>{companyDetails.name}</p>}
                {companyDetails.address && <p>{companyDetails.address}</p>}
                {companyDetails.city && companyDetails.state && companyDetails.pincode && (
                  <p>{companyDetails.city}, {companyDetails.state} - {companyDetails.pincode}</p>
                )}
                {companyDetails.gstin && <p>GSTIN: {companyDetails.gstin}</p>}
                {companyDetails.phone && <p>Phone: {companyDetails.phone}</p>}
                {companyDetails.email && <p>Email: {companyDetails.email}</p>}
              </>
            ) : (
              <>
                <p className="text-gray-500 italic">Company details not configured</p>
                <p className="text-sm text-gray-400">Please update company details in profile settings</p>
              </>
            )}
          </div>
          <div>
            <h3 className="font-bold mb-2">Bill To:</h3>
            <p>{invoice.customer?.name || 'N/A'}</p>
            {invoice.customer?.companyName && <p>{invoice.customer.companyName}</p>}
            {invoice.customer?.address && (
              <p>
                {invoice.customer.address.street}, {invoice.customer.address.city}, {invoice.customer.address.state} - {invoice.customer.address.pincode}
              </p>
            )}
            {invoice.customer?.gstin && <p>GSTIN: {invoice.customer.gstin}</p>}
          </div>
        </div>

        <div className="mb-6">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <span className="font-medium">Invoice ID:</span> {invoice.invoiceId}
            </div>
            <div>
              <span className="font-medium">Date:</span> {format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}
            </div>
            {invoice.taxId && (
              <div>
                <span className="font-medium">Tax ID:</span> {invoice.taxId}
              </div>
            )}
          </div>
        </div>

        <table className="w-full mb-6">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Description</th>
              <th className="px-4 py-2 text-center">Qty</th>
              <th className="px-4 py-2 text-right">Rate</th>
              <th className="px-4 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="px-4 py-2">{item.description}</td>
                <td className="px-4 py-2 text-center">{item.quantity || 1}</td>
                <td className="px-4 py-2 text-right">₹{item.rate?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2 text-right">₹{item.amount?.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="w-64">
            <div className="flex justify-between py-2">
              <span>Subtotal:</span>
              <span>₹{invoice.subtotal?.toLocaleString('en-IN')}</span>
            </div>
            {invoice.gstApplicable && (
              <>
                {/* Show tax type indicator */}
                {invoice.igst > 0 ? (
                  <div className="flex justify-between py-2 text-sm text-gray-600 italic">
                    <span>Inter-state transaction (IGST applies)</span>
                  </div>
                ) : (invoice.cgst > 0 || invoice.sgst > 0) ? (
                  <div className="flex justify-between py-2 text-sm text-gray-600 italic">
                    <span>Intra-state transaction (CGST + SGST applies)</span>
                  </div>
                ) : null}
                
                {/* Show CGST and SGST only for intra-state */}
                {invoice.cgst > 0 && (
                  <div className="flex justify-between py-2">
                    <span>CGST ({invoice.gstRate / 2}%):</span>
                    <span>₹{invoice.cgst?.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {invoice.sgst > 0 && (
                  <div className="flex justify-between py-2">
                    <span>SGST ({invoice.gstRate / 2}%):</span>
                    <span>₹{invoice.sgst?.toLocaleString('en-IN')}</span>
                  </div>
                )}
                
                {/* Show IGST only for inter-state */}
                {invoice.igst > 0 && (
                  <div className="flex justify-between py-2">
                    <span>IGST ({invoice.gstRate}%):</span>
                    <span>₹{invoice.igst?.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between py-2 border-t-2 font-bold text-lg">
              <span>Total:</span>
              <span>₹{invoice.totalAmount?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {invoice.companyBankDetails && (
          <div className="mb-4">
            <h3 className="font-bold mb-2">Bank Details:</h3>
            <p>Account Number: {invoice.companyBankDetails.accountNumber}</p>
            <p>IFSC: {invoice.companyBankDetails.ifsc}</p>
            <p>Bank: {invoice.companyBankDetails.bankName}</p>
          </div>
        )}

        {invoice.notes && (
          <div className="mb-4">
            <h3 className="font-bold mb-2">Notes:</h3>
            <p>{invoice.notes}</p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t">
          <span className="font-medium">Payment Status: </span>
          <span className={`px-2 py-1 rounded-full text-sm ${
            invoice.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
            invoice.paymentStatus === 'partially-paid' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {invoice.paymentStatus.replace('-', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
}

