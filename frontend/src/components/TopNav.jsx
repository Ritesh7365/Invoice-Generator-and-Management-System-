import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiFileText, 
  FiUsers, 
  FiFolder, 
  FiDollarSign, 
  FiCreditCard, 
  FiBarChart2,
  FiMenu
} from 'react-icons/fi';

export default function TopNav({ onMenuClick }) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: FiHome },
    { path: '/invoices', label: 'Invoices', icon: FiFileText },
    { path: '/customers', label: 'Customers', icon: FiUsers },
    { path: '/projects', label: 'Projects', icon: FiFolder },
    { path: '/payments', label: 'Payments', icon: FiDollarSign },
    { path: '/banks', label: 'Banks', icon: FiCreditCard },
    { path: '/reports', label: 'Reports', icon: FiBarChart2 },
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gradient">Invoice System</h1>
            </div>
            {/* Navigation Links */}
            <div className="hidden md:ml-8 md:flex md:space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Hamburger Menu Button */}
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200"
            aria-label="Open profile menu"
          >
            <FiMenu className="h-6 w-6" />
          </button>
        </div>
      </div>
    </nav>
  );
}

