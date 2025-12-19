import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  FiFileText, 
  FiDollarSign, 
  FiTrendingUp, 
  FiAlertCircle,
  FiPlus,
  FiUsers,
  FiFolder,
  FiBarChart2
} from 'react-icons/fi';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/reports/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const chartData = [
    { name: 'Paid', value: stats?.paidInvoices || 0, color: '#10B981' },
    { name: 'Unpaid', value: stats?.unpaidInvoices || 0, color: '#EF4444' },
    { name: 'Partially Paid', value: stats?.partiallyPaidInvoices || 0, color: '#F59E0B' },
  ];

  const pieData = [
    { name: 'Tax Invoice', value: stats?.invoicesByType?.taxInvoice || 0, color: '#3B82F6' },
    { name: 'Proforma', value: stats?.invoicesByType?.proforma || 0, color: '#FFFFFF' },
    { name: 'Non-Tax', value: stats?.invoicesByType?.nonTaxInvoice || 0, color: '#6B7280' },
  ];

  const statCards = [
    {
      title: 'Total Invoices',
      value: stats?.totalInvoices || 0,
      icon: FiFileText,
      color: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-500'
    },
    {
      title: 'Total Billed',
      value: `₹${stats?.totalBilled?.toLocaleString('en-IN') || 0}`,
      icon: FiDollarSign,
      color: 'from-green-500 to-green-600',
      borderColor: 'border-green-500'
    },
    {
      title: 'Total Received',
      value: `₹${stats?.totalPaid?.toLocaleString('en-IN') || 0}`,
      icon: FiTrendingUp,
      color: 'from-purple-500 to-purple-600',
      borderColor: 'border-purple-500'
    },
    {
      title: 'Outstanding',
      value: `₹${stats?.outstanding?.toLocaleString('en-IN') || 0}`,
      icon: FiAlertCircle,
      color: 'from-red-500 to-red-600',
      borderColor: 'border-red-500'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your business overview.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`stat-card border-l-4 ${card.borderColor} hover:scale-105 transition-transform duration-200`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className={`text-3xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
                    {card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-gradient-to-br ${card.color} bg-opacity-10`}>
                  <Icon className={`h-6 w-6 ${
                    card.color.includes('blue') ? 'text-blue-600' : 
                    card.color.includes('green') ? 'text-green-600' : 
                    card.color.includes('purple') ? 'text-purple-600' : 'text-red-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Payment Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px'
                }} 
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Invoice Types</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total GST Collected</span>
              <span className="text-2xl font-bold text-green-600">
                ₹{stats?.totalGST?.toLocaleString('en-IN') || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/invoices/create"
            className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <FiFileText className="h-8 w-8 mb-2" />
            <span className="font-semibold">Create Invoice</span>
          </Link>
          <Link
            to="/customers/new"
            className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <FiUsers className="h-8 w-8 mb-2" />
            <span className="font-semibold">Add Customer</span>
          </Link>
          <Link
            to="/projects/new"
            className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <FiFolder className="h-8 w-8 mb-2" />
            <span className="font-semibold">Add Project</span>
          </Link>
          <Link
            to="/reports"
            className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <FiBarChart2 className="h-8 w-8 mb-2" />
            <span className="font-semibold">View Reports</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
