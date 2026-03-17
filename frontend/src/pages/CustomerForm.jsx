import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { validateGSTIN } from '../utils/gstinValidator';
import { validateIFSC } from '../utils/ifscValidator';
import {
  trimValue,
  validateCustomerName,
  validatePhone,
  validatePincode,
  validateBankName,
  validateAccountNumber
} from '../utils/formValidators';

export default function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    gstin: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    bankDetails: {
      accountNumber: '',
      ifsc: '',
      bankName: '',
      branch: ''
    }
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    if (!id || id === 'undefined') {
      toast.error('Invalid customer ID');
      navigate('/customers');
      return;
    }
    try {
      const response = await api.get(`/customers/${id}`);
      setFormData(response.data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch customer');
      navigate('/customers');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const trimmed = typeof value === 'string' ? trimValue(value) : value;
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        address: { ...formData.address, [field]: trimmed }
      });
      if (errors['address.pincode'] && field === 'pincode') setErrors((prev) => ({ ...prev, 'address.pincode': '' }));
    } else if (name.startsWith('bankDetails.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        bankDetails: { ...formData.bankDetails, [field]: trimmed }
      });
      const errKey = `bankDetails.${field}`;
      if (errors[errKey]) setErrors((prev) => ({ ...prev, [errKey]: '' }));
    } else {
      setFormData({ ...formData, [name]: trimmed });
    }
  };

  const validateField = (name, value) => {
    if (name === 'name') {
      const r = validateCustomerName(value);
      return r.valid ? '' : r.message;
    }
    if (name === 'phone') {
      const r = validatePhone(value);
      return r.valid ? '' : r.message;
    }
    if (name === 'address.pincode') {
      const r = validatePincode(value);
      return r.valid ? '' : r.message;
    }
    if (name === 'bankDetails.bankName') {
      if (!value || !String(value).trim()) return '';
      const r = validateBankName(value);
      return r.valid ? '' : r.message;
    }
    if (name === 'bankDetails.accountNumber') {
      if (!value || !String(value).trim()) return '';
      const r = validateAccountNumber(value);
      return r.valid ? '' : r.message;
    }
    return '';
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    let val = value;
    if (name.startsWith('address.')) val = formData.address.pincode;
    else if (name.startsWith('bankDetails.')) val = formData.bankDetails[name.split('.')[1]];
    const err = validateField(name, val);
    if (err) setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const runFormValidation = () => {
    const newErrors = {};
    const nameResult = validateCustomerName(formData.name);
    if (!nameResult.valid) newErrors.name = nameResult.message;
    const phoneResult = validatePhone(formData.phone);
    if (!phoneResult.valid) newErrors.phone = phoneResult.message;
    const pincodeResult = validatePincode(formData.address.pincode);
    if (!pincodeResult.valid) newErrors['address.pincode'] = pincodeResult.message;
    if (formData.bankDetails?.bankName?.trim()) {
      const bankNameResult = validateBankName(formData.bankDetails.bankName);
      if (!bankNameResult.valid) newErrors['bankDetails.bankName'] = bankNameResult.message;
    }
    if (formData.bankDetails?.accountNumber?.trim()) {
      const accResult = validateAccountNumber(formData.bankDetails.accountNumber);
      if (!accResult.valid) newErrors['bankDetails.accountNumber'] = accResult.message;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!runFormValidation()) {
      toast.error('Please fix the validation errors before submitting.');
      return;
    }

    const payload = {
      ...formData,
      name: trimValue(formData.name),
      companyName: trimValue(formData.companyName),
      email: trimValue(formData.email),
      phone: trimValue(formData.phone),
      gstin: trimValue(formData.gstin),
      address: {
        ...formData.address,
        street: trimValue(formData.address.street),
        city: trimValue(formData.address.city),
        state: trimValue(formData.address.state),
        pincode: trimValue(formData.address.pincode),
        country: formData.address.country || 'India'
      },
      bankDetails: {
        accountNumber: trimValue(formData.bankDetails?.accountNumber ?? ''),
        ifsc: trimValue(formData.bankDetails?.ifsc ?? ''),
        bankName: trimValue(formData.bankDetails?.bankName ?? ''),
        branch: trimValue(formData.bankDetails?.branch ?? '')
      }
    };

    if (payload.gstin) {
      const gstinValidation = validateGSTIN(payload.gstin);
      if (!gstinValidation.valid) {
        toast.error(gstinValidation.error);
        return;
      }
      payload.gstin = gstinValidation.cleaned;
    }
    if (payload.bankDetails?.ifsc) {
      const ifscValidation = validateIFSC(payload.bankDetails.ifsc);
      if (!ifscValidation.valid) {
        toast.error(ifscValidation.error);
        return;
      }
      payload.bankDetails.ifsc = ifscValidation.cleaned;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/customers/${id}`, payload);
        toast.success('Customer updated successfully');
      } else {
        await api.post('/customers', payload);
        toast.success('Customer created successfully');
      }
      navigate('/customers');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to save customer';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Customer' : 'Add Customer'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full border rounded-md px-3 py-2 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Customer name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={10}
              className={`w-full border rounded-md px-3 py-2 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="10 digit mobile number"
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
            <input
              type="text"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              style={{ textTransform: 'uppercase' }}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
              <input
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                name="address.state"
                value={formData.address.state}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              <input
                type="text"
                name="address.pincode"
                value={formData.address.pincode}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength={6}
                className={`w-full border rounded-md px-3 py-2 ${errors['address.pincode'] ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="6 digit pincode"
              />
              {errors['address.pincode'] && <p className="mt-1 text-sm text-red-600">{errors['address.pincode']}</p>}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">Bank Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
              <input
                type="text"
                name="bankDetails.accountNumber"
                value={formData.bankDetails.accountNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full border rounded-md px-3 py-2 ${errors['bankDetails.accountNumber'] ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="9-18 digits"
              />
              {errors['bankDetails.accountNumber'] && <p className="mt-1 text-sm text-red-600">{errors['bankDetails.accountNumber']}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IFSC</label>
              <input
                type="text"
                name="bankDetails.ifsc"
                value={formData.bankDetails.ifsc}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <input
                type="text"
                name="bankDetails.bankName"
                value={formData.bankDetails.bankName}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full border rounded-md px-3 py-2 ${errors['bankDetails.bankName'] ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Alphabets only"
              />
              {errors['bankDetails.bankName'] && <p className="mt-1 text-sm text-red-600">{errors['bankDetails.bankName']}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <input
                type="text"
                name="bankDetails.branch"
                value={formData.bankDetails.branch}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Customer' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}





