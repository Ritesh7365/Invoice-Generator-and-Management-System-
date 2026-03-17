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
    includeGst: false,
    companyBankDetails: '',
    customerBankDetails: '',
    notes: '',
    taxId: ''
  });

  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [banks, setBanks] = useState([]);
  const [companyBanks, setCompanyBanks] = useState([]);
  const [customerBanks, setCustomerBanks] = useState([]);
  const [gstRateType, setGstRateType] = useState('predefined');
  const [customGstRate, setCustomGstRate] = useState('');
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
      fetchCustomerBanks(formData.customer);
    } else {
      setCustomerBanks([]);
      setFormData(prev => ({ ...prev, customerBankDetails: '' }));
    }
  }, [formData.customer]);

  // Auto-select company bank on page load (only for new invoices)
  useEffect(() => {
    if (companyBanks.length > 0 && !formData.companyBankDetails && !isEdit) {
      const defaultBank = companyBanks.find(b => b.isDefault) || companyBanks[0];
      if (defaultBank) {
        const bankId = defaultBank.id || defaultBank._id;
        setFormData(prev => {
          // Only set if still empty (prevent race conditions)
          if (!prev.companyBankDetails) {
            return { ...prev, companyBankDetails: bankId };
          }
          return prev;
        });
      }
    }
  }, [companyBanks.length, isEdit]); // Only depend on length to avoid re-triggering

  // Auto-select customer bank when customer banks are loaded (only for new invoices)
  useEffect(() => {
    if (customerBanks.length > 0 && formData.customer && !isEdit) {
      const defaultBank = customerBanks.find(b => b.isDefault) || customerBanks[0];
      if (defaultBank) {
        const bankId = defaultBank.id || defaultBank._id;
        setFormData(prev => {
          // Only set if customer matches and bank is not already set
          if (prev.customer && !prev.customerBankDetails) {
            return { ...prev, customerBankDetails: bankId };
          }
          return prev;
        });
      }
    }
  }, [customerBanks.length, formData.customer, isEdit]); // Only depend on length to avoid re-triggering

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
      const allBanks = response.data || [];
      setBanks(allBanks);
      setCompanyBanks(allBanks.filter(b => b.isCompanyAccount));
      setCustomerBanks(allBanks.filter(b => !b.isCompanyAccount));
    } catch (error) {
      toast.error('Failed to fetch bank details');
    }
  };

  const fetchCustomerBanks = async (customerId) => {
    try {
      const response = await api.get(`/banks?customer=${customerId}`);
      const banks = response.data || [];
      setCustomerBanks(banks.filter(b => !b.isCompanyAccount));
    } catch (error) {
      console.error('Failed to fetch customer banks:', error);
      setCustomerBanks([]);
    }
  };

  const fetchInvoice = async () => {
    try {
      const response = await api.get(`/invoices/${id}`);
      const invoice = response.data;
      const invoiceGstRate = invoice.gstRate || 0;
      const isPredefined = invoiceGstRate === 12 || invoiceGstRate === 18;
      setGstRateType(isPredefined ? 'predefined' : 'custom');
      setCustomGstRate(isPredefined ? '' : invoiceGstRate.toString());
      
      setFormData({
        customer: invoice.customer?.id || invoice.customerId || invoice.customer?._id || invoice.customer || '',
        project: invoice.project?.id || invoice.projectId || invoice.project?._id || invoice.project || '',
        invoiceType: invoice.invoiceType,
        invoiceDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
        items: invoice.items,
        gstRate: invoiceGstRate,
        gstPaid: invoice.gstPaid,
        includeGst: invoice.invoiceType === 'non-tax-invoice' ? (invoice.gstApplicable && invoiceGstRate > 0) : false,
        companyBankDetails: invoice.companyBankDetails?.id || invoice.companyBankDetailsId || invoice.companyBankDetails?._id || invoice.companyBankDetails || '',
        customerBankDetails: invoice.customerBankDetails?.id || invoice.customerBankDetailsId || invoice.customerBankDetails?._id || invoice.customerBankDetails || '',
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
    
    // Validate GST rate when GST is required or selected
    let finalGstRate = formData.gstRate;
    const needsGstRate = formData.invoiceType === 'tax-invoice' ||
      formData.invoiceType === 'proforma' ||
      (formData.invoiceType === 'non-tax-invoice' && formData.includeGst);

    if (needsGstRate) {
      if (gstRateType === 'custom') {
        const customRate = parseFloat(customGstRate);
        if (isNaN(customRate) || customRate < 0 || customRate > 100) {
          toast.error('Please enter a valid GST rate between 0 and 100');
          return;
        }
        finalGstRate = customRate;
      } else if (!formData.gstRate || formData.gstRate === 0) {
        toast.error('Please select a GST rate');
        return;
      }
    }
    
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
      customer: formData.customer && formData.customer.toString().trim() !== '' ? formData.customer.toString().trim() : null,
      items: formData.items.map(item => ({
        description: item.description.trim(),
        quantity: parseFloat(item.quantity) || 1,
        rate: parseFloat(item.rate) || 0,
        amount: parseFloat(item.amount) || 0
      })),
      gstRate: parseFloat(finalGstRate) || 0,
      includeGst: formData.invoiceType === 'non-tax-invoice' ? formData.includeGst : undefined,
      // Convert empty strings to null for optional fields
      project: formData.project && formData.project.toString().trim() !== '' ? formData.project.toString().trim() : null,
      companyBankDetails: formData.companyBankDetails && formData.companyBankDetails.toString().trim() !== '' ? formData.companyBankDetails.toString().trim() : null,
      customerBankDetails: formData.customerBankDetails && formData.customerBankDetails.toString().trim() !== '' ? formData.customerBankDetails.toString().trim() : null,
      taxId: formData.taxId && formData.taxId.toString().trim() !== '' ? formData.taxId.toString().trim() : null,
      notes: formData.notes && formData.notes.toString().trim() !== '' ? formData.notes.toString().trim() : null
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
              onChange={(e) => {
                setFormData({ ...formData, customer: e.target.value, customerBankDetails: '' });
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              disabled={loading}
            >
              <option value="">Select Customer</option>
              {customers.length === 0 ? (
                <option value="" disabled>No customers available. Add a customer first.</option>
              ) : (
                customers.map((customer) => (
                  <option key={customer.id || customer._id} value={customer.id || customer._id}>
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
                <option key={project.id || project._id} value={project.id || project._id}>
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
              onChange={(e) => {
                const newType = e.target.value;
                setFormData({
                  ...formData,
                  invoiceType: newType,
                  includeGst: newType === 'non-tax-invoice' ? false : formData.includeGst
                });
                if (newType === 'non-tax-invoice') {
                  setGstRateType('predefined');
                  setCustomGstRate('');
                }
              }}
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

          {/* Non-Tax Invoice: Include GST option – shown first so user chooses before rate */}
          {formData.invoiceType === 'non-tax-invoice' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Include GST?</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="includeGst"
                    checked={!formData.includeGst}
                    onChange={() => setFormData({ ...formData, includeGst: false })}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Do not add GST</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="includeGst"
                    checked={formData.includeGst}
                    onChange={() => setFormData({ ...formData, includeGst: true, gstRate: formData.gstRate || 18 })}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Add GST</span>
                </label>
              </div>
            </div>
          )}

          {/* GST Rate – shown for Tax Invoice, Proforma, and Non-Tax (when Include GST) */}
          {(formData.invoiceType === 'tax-invoice' || formData.invoiceType === 'proforma' ||
            (formData.invoiceType === 'non-tax-invoice' && formData.includeGst)) && (
            <div>
              {formData.invoiceType === 'non-tax-invoice' && (
                <p className="text-xs text-gray-500 mb-1">GST will be calculated and added to the invoice.</p>
              )}
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST Rate (%) {formData.invoiceType === 'tax-invoice' ? '*' : ''}
              </label>
              <select
                required={formData.invoiceType === 'tax-invoice'}
                value={gstRateType === 'custom' ? 'custom' : formData.gstRate}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'custom') {
                    setGstRateType('custom');
                    setCustomGstRate('');
                    setFormData({ ...formData, gstRate: 0 });
                  } else {
                    setGstRateType('predefined');
                    setCustomGstRate('');
                    setFormData({ ...formData, gstRate: parseFloat(value) || 0 });
                  }
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="0">Select GST Rate</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="custom">Custom</option>
              </select>
              {gstRateType === 'custom' && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom GST Rate (%)</label>
                  <input
                    type="number"
                    required={formData.invoiceType === 'tax-invoice'}
                    min="0"
                    max="100"
                    step="0.01"
                    value={customGstRate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomGstRate(value);
                      setFormData({ ...formData, gstRate: parseFloat(value) || 0 });
                    }}
                    placeholder="Enter GST rate (0-100)"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              )}
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
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">Items *</label>
            <button
              type="button"
              onClick={addItem}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              + Add Item
            </button>
          </div>
          
          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-2 mb-2 px-1">
            <div className="col-span-5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Description
              </label>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Qty
              </label>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Rate
              </label>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Amount
              </label>
            </div>
            <div className="col-span-1"></div>
          </div>

          {/* Item Rows */}
          <div className="space-y-2">
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <input
                    type="text"
                    placeholder="Enter item description"
                    required
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="1"
                    value={item.quantity || 1}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    required
                    value={item.rate}
                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={item.amount}
                    readOnly
                    title="Auto-calculated (Qty × Rate)"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded p-1 transition-colors"
                      title="Remove item"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
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
              {companyBanks.map((bank) => (
                <option key={bank.id || bank._id} value={bank.id || bank._id}>
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
              disabled={!formData.customer}
            >
              <option value="">{formData.customer ? 'Select Bank' : 'Select Customer First'}</option>
              {customerBanks.map((bank) => (
                <option key={bank.id || bank._id} value={bank.id || bank._id}>
                  {bank.bankName} - {bank.accountNumber}
                </option>
              ))}
            </select>
            {formData.customer && customerBanks.length === 0 && (
              <p className="mt-1 text-sm text-gray-500">No bank details found for this customer</p>
            )}
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

