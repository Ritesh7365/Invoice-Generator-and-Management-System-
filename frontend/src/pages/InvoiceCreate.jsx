import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function InvoiceCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    customer: '',
    project: '',
    invoiceType: 'tax-invoice',
    invoiceDate: new Date().toISOString().split('T')[0],
    items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
    gstRate: 18,
    gstPaid: false,
    companyBankDetails: '',
    customerBankDetails: '',
    notes: '',
    taxId: ''
  });

  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchBanks();
    if (isEdit) {
      fetchInvoice();
    }
  }, [id]);

  useEffect(() => {
    if (formData.customer) {
      fetchProjects();
    }
  }, [formData.customer]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      if (response.data && Array.isArray(response.data)) {
        setCustomers(response.data);
        if (response.data.length === 0) {
          toast.error('No customers found. Please add a customer first.', { duration: 4000 });
        }
      } else {
        setCustomers([]);
        toast.error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch customers';
      toast.error(errorMessage);
      // If 401, redirect will happen via interceptor
      if (error.response?.status === 401) {
        return;
      }
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get(`/projects?customer=${formData.customer}`);
      setProjects(response.data);
    } catch (error) {
      setProjects([]);
    }
  };

  const fetchBanks = async () => {
    try {
      const response = await api.get('/banks');
      setBanks(response.data);
    } catch (error) {
      toast.error('Failed to fetch bank details');
    }
  };

  const fetchInvoice = async () => {
    try {
      const response = await api.get(`/invoices/${id}`);
      const invoice = response.data;
      setFormData({
        customer: invoice.customer._id || invoice.customer,
        project: invoice.project?._id || invoice.project || '',
        invoiceType: invoice.invoiceType,
        invoiceDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
        items: invoice.items,
        gstRate: invoice.gstRate,
        gstPaid: invoice.gstPaid,
        companyBankDetails: invoice.companyBankDetails?._id || invoice.companyBankDetails || '',
        customerBankDetails: invoice.customerBankDetails?._id || invoice.customerBankDetails || '',
        notes: invoice.notes || '',
        taxId: invoice.taxId || ''
      });
    } catch (error) {
      toast.error('Failed to fetch invoice');
      navigate('/invoices');
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    const numValue = field === 'quantity' || field === 'rate' || field === 'amount' 
      ? (value === '' ? '' : parseFloat(value) || 0) 
      : value;
    
    newItems[index][field] = numValue;
    
    // Auto-calculate amount if quantity or rate changes
    if (field === 'quantity' || field === 'rate') {
      const quantity = parseFloat(newItems[index].quantity) || 1;
      const rate = parseFloat(newItems[index].rate) || 0;
      newItems[index].amount = quantity * rate;
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, rate: 0, amount: 0 }]
    });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate items
    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    // Validate item fields
    const invalidItems = formData.items.filter(item => 
      !item.description || !item.description.trim() || 
      item.rate === '' || item.rate === null || item.rate === undefined ||
      item.amount === '' || item.amount === null || item.amount === undefined
    );

    if (invalidItems.length > 0) {
      toast.error('Please fill in all item fields (description, rate, and amount)');
      return;
    }

    // Prepare data - ensure numeric values and handle empty strings
    const submitData = {
      ...formData,
      items: formData.items.map(item => ({
        description: item.description.trim(),
        quantity: parseFloat(item.quantity) || 1,
        rate: parseFloat(item.rate) || 0,
        amount: parseFloat(item.amount) || 0
      })),
      gstRate: parseFloat(formData.gstRate) || 0,
      // Convert empty strings to null for optional fields
      project: formData.project || null,
      companyBankDetails: formData.companyBankDetails || null,
      customerBankDetails: formData.customerBankDetails || null,
      taxId: formData.taxId || null,
      notes: formData.notes || null
    };

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/invoices/${id}`, submitData);
        toast.success('Invoice updated successfully');
      } else {
        await api.post('/invoices', submitData);
        toast.success('Invoice created successfully');
      }
      navigate('/invoices');
    } catch (error) {
      console.error('Invoice save error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save invoice';
      const errorDetails = error.response?.data?.errors || error.response?.data?.details;
      
      if (errorDetails && Array.isArray(errorDetails)) {
        // Show validation errors
        errorDetails.forEach(err => {
          const msg = typeof err === 'string' ? err : err.msg || err.message;
          toast.error(msg, { duration: 4000 });
        });
      } else {
        toast.error(errorMessage, { duration: 4000 });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Invoice' : 'Create Invoice'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              required
              value={formData.customer}
              onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              disabled={loading}
            >
              <option value="">Select Customer</option>
              {customers.length === 0 ? (
                <option value="" disabled>No customers available. Add a customer first.</option>
              ) : (
                customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name} {customer.companyName && `- ${customer.companyName}`}
                  </option>
                ))
              )}
            </select>
            {customers.length === 0 && (
              <p className="mt-1 text-sm text-red-600">
                No customers found. <Link to="/customers/new" className="text-blue-600 hover:underline">Add a customer</Link>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={formData.project}
              onChange={(e) => setFormData({ ...formData, project: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Type *</label>
            <select
              required
              value={formData.invoiceType}
              onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="tax-invoice">Tax Invoice</option>
              <option value="proforma">Proforma</option>
              <option value="non-tax-invoice">Non-Tax Invoice</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
            <input
              type="date"
              required
              value={formData.invoiceDate}
              onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          {formData.invoiceType === 'tax-invoice' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate (%)</label>
              <input
                type="number"
                value={formData.gstRate}
                onChange={(e) => setFormData({ ...formData, gstRate: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                min="0"
                max="100"
                step="0.01"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
            <input
              type="text"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Items *</label>
            <button
              type="button"
              onClick={addItem}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Item
            </button>
          </div>
          <div className="space-y-2">
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <input
                    type="text"
                    placeholder="Description"
                    required
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity || 1}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Rate"
                    required
                    value={item.rate}
                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Amount"
                    value={item.amount}
                    readOnly
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50"
                  />
                </div>
                <div className="col-span-1">
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Bank Details</label>
            <select
              value={formData.companyBankDetails}
              onChange={(e) => setFormData({ ...formData, companyBankDetails: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Bank</option>
              {banks.filter(b => b.isCompanyAccount).map((bank) => (
                <option key={bank._id} value={bank._id}>
                  {bank.bankName} - {bank.accountNumber}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Bank Details</label>
            <select
              value={formData.customerBankDetails}
              onChange={(e) => setFormData({ ...formData, customerBankDetails: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Bank</option>
              {banks.filter(b => !b.isCompanyAccount).map((bank) => (
                <option key={bank._id} value={bank._id}>
                  {bank.bankName} - {bank.accountNumber}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="gstPaid"
            checked={formData.gstPaid}
            onChange={(e) => setFormData({ ...formData, gstPaid: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="gstPaid" className="ml-2 block text-sm text-gray-700">
            GST Paid
          </label>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}

