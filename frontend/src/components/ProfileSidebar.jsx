import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiLogOut,
  FiUser,
  FiMail,
  FiShield,
  FiX
} from 'react-icons/fi';

export default function ProfileSidebar({ isOpen, onClose }) {
  const { user, logout, updateCompanyDetails } = useAuth();
  const navigate = useNavigate();
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState(() => ({
    name: user?.companyDetails?.name || '',
    address: user?.companyDetails?.address || '',
    city: user?.companyDetails?.city || '',
    state: user?.companyDetails?.state || '',
    pincode: user?.companyDetails?.pincode || '',
    gstin: user?.companyDetails?.gstin || '',
    email: user?.companyDetails?.email || user?.email || '',
    phone: user?.companyDetails?.phone || ''
  }));

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
    onClose();
  };

  const startEditingCompany = () => {
    setCompanyForm({
      name: user?.companyDetails?.name || '',
      address: user?.companyDetails?.address || '',
      city: user?.companyDetails?.city || '',
      state: user?.companyDetails?.state || '',
      pincode: user?.companyDetails?.pincode || '',
      gstin: user?.companyDetails?.gstin || '',
      email: user?.companyDetails?.email || user?.email || '',
      phone: user?.companyDetails?.phone || ''
    });
    setIsEditingCompany(true);
  };

  const handleCompanyChange = (e) => {
    const { name, value } = e.target;
    setCompanyForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    try {
      await updateCompanyDetails(companyForm);
      toast.success('Company details updated');
      setIsEditingCompany(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update company details');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Profile Sidebar */}
      <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <h2 className="text-xl font-bold text-gray-900">Profile</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-12 relative min-h-0">
          {/* Profile Avatar and Name */}
          <div className="flex flex-col items-center mb-6 pb-6 border-b border-gray-200">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-4">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {user?.name || 'User'}
            </h3>
            <p className="text-sm text-gray-500">
              {user?.email || ''}
            </p>
          </div>

          {/* Profile Info */}
          <div className="space-y-4">
            {/* Role */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center text-gray-700">
                  <FiShield className="mr-2 h-5 w-5 text-blue-600" />
                  <span className="font-medium">Role</span>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                  {user?.role === 'admin' ? 'Administrator' : 'Chartered Accountant'}
                </span>
              </div>
            </div>

            {/* Email */}
            {user?.email && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center text-gray-700 mb-2">
                  <FiMail className="mr-2 h-5 w-5 text-gray-500" />
                  <span className="font-medium">Email</span>
                </div>
                <p className="text-sm text-gray-600 ml-7">{user.email}</p>
              </div>
            )}

            {/* Company Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center text-gray-700">
                  <FiUser className="mr-2 h-5 w-5 text-gray-500" />
                  <span className="font-medium">Company Details</span>
                </div>
                {user?.role === 'admin' && !isEditingCompany && (
                  <button
                    onClick={startEditingCompany}
                    className="text-xs px-2 py-1 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                  >
                    {user?.companyDetails?.name ? 'Edit' : 'Add'}
                  </button>
                )}
              </div>

              {!isEditingCompany && (
                <>
                  {user?.companyDetails?.name ? (
                    <div className="text-sm text-gray-600 ml-7 space-y-1">
                      <p className="font-semibold">{user.companyDetails.name}</p>
                      {user.companyDetails.address && <p>{user.companyDetails.address}</p>}
                      {(user.companyDetails.city || user.companyDetails.state || user.companyDetails.pincode) && (
                        <p>
                          {[user.companyDetails.city, user.companyDetails.state, user.companyDetails.pincode]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                      {user.companyDetails.gstin && <p>GSTIN: {user.companyDetails.gstin}</p>}
                      {user.companyDetails.phone && <p>Phone: {user.companyDetails.phone}</p>}
                      {user.companyDetails.email && <p>Email: {user.companyDetails.email}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 ml-7 italic">
                      Company details not configured. Click &quot;Add&quot; to set company name, address, GSTIN, etc.
                    </p>
                  )}
                  {user?.role !== 'admin' && (
                    <p className="text-xs text-gray-400 ml-7 mt-2">
                      Only administrators can update company details.
                    </p>
                  )}
                </>
              )}

              {isEditingCompany && user?.role === 'admin' && (
                <form onSubmit={handleCompanySubmit} className="mt-2 space-y-2 text-sm">
                  <div>
                    <label className="block text-gray-600 mb-1">Company Name</label>
                    <input
                      name="name"
                      value={companyForm.name}
                      onChange={handleCompanyChange}
                      className="w-full border rounded-md px-2 py-1 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Address</label>
                    <textarea
                      name="address"
                      value={companyForm.address}
                      onChange={handleCompanyChange}
                      className="w-full border rounded-md px-2 py-1 text-sm"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-600 mb-1">City</label>
                      <input
                        name="city"
                        value={companyForm.city}
                        onChange={handleCompanyChange}
                        className="w-full border rounded-md px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">State</label>
                      <input
                        name="state"
                        value={companyForm.state}
                        onChange={handleCompanyChange}
                        className="w-full border rounded-md px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-600 mb-1">Pincode</label>
                      <input
                        name="pincode"
                        value={companyForm.pincode}
                        onChange={handleCompanyChange}
                        className="w-full border rounded-md px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">GSTIN</label>
                      <input
                        name="gstin"
                        value={companyForm.gstin}
                        onChange={handleCompanyChange}
                        className="w-full border rounded-md px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-600 mb-1">Phone</label>
                      <input
                        name="phone"
                        value={companyForm.phone}
                        onChange={handleCompanyChange}
                        className="w-full border rounded-md px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Email</label>
                      <input
                        name="email"
                        type="email"
                        value={companyForm.email}
                        onChange={handleCompanyChange}
                        className="w-full border rounded-md px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingCompany(false)}
                      className="px-3 py-1 rounded-md text-xs border border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-md text-xs bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Logout Button */}
        <div className="flex-none p-6 border-t border-gray-200 bg-white">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <FiLogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}



