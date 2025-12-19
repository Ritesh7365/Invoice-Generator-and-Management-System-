import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Reports() {
  const [gstReport, setGstReport] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);

  const fetchGSTReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/reports/gst?${params}`);
      setGstReport(response.data);
    } catch (error) {
      toast.error('Failed to fetch GST report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/reports/gst/export/excel?${params}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gst-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel report downloaded');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  useEffect(() => {
    fetchGSTReport();
  }, []);

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Reports</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">GST Report</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchGSTReport}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Filter
            </button>
          </div>
        </div>

        {gstReport && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-600">Total Taxable Value</div>
                <div className="text-2xl font-bold">₹{gstReport.totalTaxableValue?.toLocaleString('en-IN') || 0}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-600">Total CGST</div>
                <div className="text-2xl font-bold">₹{gstReport.totalCGST?.toLocaleString('en-IN') || 0}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-600">Total SGST</div>
                <div className="text-2xl font-bold">₹{gstReport.totalSGST?.toLocaleString('en-IN') || 0}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-600">Total IGST</div>
                <div className="text-2xl font-bold">₹{gstReport.totalIGST?.toLocaleString('en-IN') || 0}</div>
              </div>
            </div>

            <div className="mb-4">
              <button
                onClick={handleExportExcel}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
              >
                Export to Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GSTIN</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">CGST</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">SGST</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">IGST</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gstReport.invoices?.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                        No invoices found
                      </td>
                    </tr>
                  ) : (
                    gstReport.invoices?.map((invoice) => (
                      <tr key={invoice._id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {invoice.invoiceId}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {invoice.customer?.name || invoice.customer?.companyName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {invoice.customer?.gstin || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          ₹{invoice.subtotal?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          ₹{invoice.cgst?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          ₹{invoice.sgst?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          ₹{invoice.igst?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                          ₹{invoice.totalAmount?.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {gstReport.invoices?.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-sm font-bold text-gray-900">
                        TOTAL
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                        ₹{gstReport.totalTaxableValue?.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                        ₹{gstReport.totalCGST?.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                        ₹{gstReport.totalSGST?.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                        ₹{gstReport.totalIGST?.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                        ₹{(gstReport.totalTaxableValue + gstReport.totalGST)?.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

