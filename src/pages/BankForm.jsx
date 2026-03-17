import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { validateIFSC } from '../utils/ifscValidator';
import { trimValue, validateBankName, validateAccountNumber } from '../utils/formValidators';

export default function BankForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifsc: '',
    bankName: '',
    branch: '',
    accountType: 'current',
    isDefault: false,
    isCompanyAccount: true,
    customer: ''
  });

  const [errors, setErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
    if (isEdit) {
      fetchBank();
    }
  }, [id]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      // Ignore error
    }
  };

  const fetchBank = async () => {
    if (!id || id === 'undefined') {
      toast.error('Invalid bank ID');
      navigate('/banks');
      return;
    }
    try {
      const response = await api.get(`/banks/${id}`);
      const bank = response.data;
      setFormData({
        accountHolderName: bank.accountHolderName,
        accountNumber: bank.accountNumber,
        ifsc: bank.ifsc,
        bankName: bank.bankName,
        branch: bank.branch || '',
        accountType: bank.accountType,
        isDefault: bank.isDefault,
        isCompanyAccount: bank.isCompanyAccount,
        customer: bank.customer?.id || bank.customerId || bank.customer?._id || bank.customer || ''
      });
    } catch (error) {
      console.error('Error fetching bank:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch bank details');
      navigate('/banks');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const out = type === 'checkbox' ? checked : (typeof value === 'string' ? trimValue(value) : value);
    setFormData({ ...formData, [name]: out });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateField = (name, value) => {
    if (name === 'bankName') {
      const r = validateBankName(value);
      return r.valid ? '' : r.message;
    }
    if (name === 'accountNumber') {
      const r = validateAccountNumber(value);
      return r.valid ? '' : r.message;
    }
    return '';
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const err = validateField(name, value);
    if (err) setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const runFormValidation = () => {
    const newErrors = {};
    const bankNameResult = validateBankName(formData.bankName);
    if (!bankNameResult.valid) newErrors.bankName = bankNameResult.message;
    const accResult = validateAccountNumber(formData.accountNumber);
    if (!accResult.valid) newErrors.accountNumber = accResult.message;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEdit && (!id || id === 'undefined')) {
      toast.error('Invalid bank ID');
      return;
    }
    if (!runFormValidation()) {
      toast.error('Please fix the validation errors before submitting.');
      return;
    }
    let ifscValue = trimValue(formData.ifsc);
    if (ifscValue) {
      const ifscValidation = validateIFSC(formData.ifsc);
      if (!ifscValidation.valid) {
        toast.error(ifscValidation.error);
        return;
      }
      ifscValue = ifscValidation.cleaned;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        accountHolderName: trimValue(formData.accountHolderName),
        accountNumber: trimValue(formData.accountNumber),
        bankName: trimValue(formData.bankName),
        ifsc: ifscValue,
        branch: trimValue(formData.branch),
        customer: formData.customer && formData.customer.toString().trim() !== '' ? formData.customer.toString().trim() : null
      };

      if (isEdit) {
        await api.put(`/banks/${id}`, submitData);
        toast.success('Bank details updated successfully');
      } else {
        await api.post('/banks', submitData);
        toast.success('Bank details created successfully');
      }
      navigate('/banks');
    } catch (error) {
      console.error('Bank form error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to save bank details';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Bank Details' : 'Add Bank Details'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name *</label>
            <input
              type="text"
              name="accountHolderName"
              required
              value={formData.accountHolderName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number *</label>
            <input
              type="text"
              name="accountNumber"
              required
              value={formData.accountNumber}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full border rounded-md px-3 py-2 ${errors.accountNumber ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="9-18 digits"
            />
            {errors.accountNumber && <p className="mt-1 text-sm text-red-600">{errors.accountNumber}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IFSC *</label>
            <input
              type="text"
              name="ifsc"
              required
              value={formData.ifsc}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
            <input
              type="text"
              name="bankName"
              required
              value={formData.bankName}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full border rounded-md px-3 py-2 ${errors.bankName ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Alphabets only"
            />
            {errors.bankName && <p className="mt-1 text-sm text-red-600">{errors.bankName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <input
              type="text"
              name="branch"
              value={formData.branch}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <select
              name="accountType"
              value={formData.accountType}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="savings">Savings</option>
              <option value="current">Current</option>
            </select>
          </div>

          {!formData.isCompanyAccount && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id || customer._id} value={customer.id || customer._id}>
                    {customer.name} {customer.companyName && `- ${customer.companyName}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isCompanyAccount"
              name="isCompanyAccount"
              checked={formData.isCompanyAccount}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isCompanyAccount" className="ml-2 block text-sm text-gray-700">
              Company Account
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              name="isDefault"
              checked={formData.isDefault}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
              Set as Default
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/banks')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Bank Details' : 'Create Bank Details'}
          </button>
        </div>
      </form>
    </div>
  );
}

