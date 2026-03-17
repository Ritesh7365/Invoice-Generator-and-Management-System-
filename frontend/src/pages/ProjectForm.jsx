import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { trimValue, validateProjectName, validateTotalBudget } from '../utils/formValidators';

export default function ProjectForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    customer: '',
    startDate: '',
    endDate: '',
    status: 'active',
    totalBudget: ''
  });

  const [errors, setErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
    if (isEdit) {
      fetchProject();
    }
  }, [id]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      toast.error('Failed to fetch customers');
    }
  };

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      const project = response.data;
      setFormData({
        name: project.name || '',
        description: project.description || '',
        customer: project.customer?.id || project.customerId || project.customer || '',
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
        status: project.status || 'active',
        totalBudget: project.totalBudget != null && project.totalBudget !== '' ? project.totalBudget : ''
      });
    } catch (error) {
      toast.error('Failed to fetch project');
      navigate('/projects');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const out = typeof value === 'string' ? trimValue(value) : value;
    setFormData({ ...formData, [name]: out });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'name') {
      const r = validateProjectName(value);
      if (!r.valid) setErrors((prev) => ({ ...prev, name: r.message }));
    } else if (name === 'totalBudget') {
      const r = validateTotalBudget(value);
      if (!r.valid) setErrors((prev) => ({ ...prev, totalBudget: r.message }));
    }
  };

  const runFormValidation = () => {
    const newErrors = {};
    const nameResult = validateProjectName(formData.name);
    if (!nameResult.valid) newErrors.name = nameResult.message;
    const budgetResult = validateTotalBudget(formData.totalBudget);
    if (!budgetResult.valid) newErrors.totalBudget = budgetResult.message;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!runFormValidation()) {
      toast.error('Please fix the validation errors before submitting.');
      return;
    }
    setLoading(true);
    const payload = {
      ...formData,
      name: trimValue(formData.name),
      description: trimValue(formData.description),
      totalBudget: Number(formData.totalBudget)
    };
    try {
      if (isEdit) {
        await api.put(`/projects/${id}`, payload);
        toast.success('Project updated successfully');
      } else {
        await api.post('/projects', payload);
        toast.success('Project created successfully');
      }
      navigate('/projects');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Project' : 'Add Project'}
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
              placeholder="Project name (alphabets and spaces)"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              name="customer"
              required
              value={formData.customer}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.companyName && `- ${customer.companyName}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Budget *</label>
            <input
              type="number"
              name="totalBudget"
              value={formData.totalBudget}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full border rounded-md px-3 py-2 ${errors.totalBudget ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter total project budget"
              min="0"
              step="0.01"
            />
            {errors.totalBudget && <p className="mt-1 text-sm text-red-600">{errors.totalBudget}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}

