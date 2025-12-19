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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
    onClose();
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
      <div className="fixed top-0 right-0 h-screen w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <h2 className="text-xl font-bold text-gray-900">Profile</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="p-6 overflow-y-auto h-full pb-24">
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
            {user?.companyDetails?.name && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center text-gray-700 mb-2">
                  <FiUser className="mr-2 h-5 w-5 text-gray-500" />
                  <span className="font-medium">Company</span>
                </div>
                <p className="text-sm text-gray-600 ml-7">{user.companyDetails.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 bg-white">
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



