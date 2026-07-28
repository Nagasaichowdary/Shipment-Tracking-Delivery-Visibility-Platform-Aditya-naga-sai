import { useState } from 'react';
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import DashboardCard from "../../components/layout/DashboardCard";

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderUserManagement = () => (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-6">User Management</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-gray-600">Total Users</p>
          <p className="text-3xl font-bold text-blue-600">248</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-gray-600">Active Users</p>
          <p className="text-3xl font-bold text-green-600">196</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-gray-600">Inactive Users</p>
          <p className="text-3xl font-bold text-orange-600">52</p>
        </div>
      </div>
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">User ID</th>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Role</th>
            <th className="p-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b hover:bg-gray-50">
            <td className="p-3">U001</td>
            <td className="p-3">John Doe</td>
            <td className="p-3">john@example.com</td>
            <td className="p-3"><span className="bg-blue-100 text-blue-800 px-3 py-1 rounded">Admin</span></td>
            <td className="p-3"><span className="bg-green-100 text-green-800 px-3 py-1 rounded">Active</span></td>
          </tr>
          <tr className="border-b hover:bg-gray-50">
            <td className="p-3">U002</td>
            <td className="p-3">Sarah Smith</td>
            <td className="p-3">sarah@example.com</td>
            <td className="p-3"><span className="bg-purple-100 text-purple-800 px-3 py-1 rounded">Manager</span></td>
            <td className="p-3"><span className="bg-green-100 text-green-800 px-3 py-1 rounded">Active</span></td>
          </tr>
          <tr className="border-b hover:bg-gray-50">
            <td className="p-3">U003</td>
            <td className="p-3">Mike Johnson</td>
            <td className="p-3">mike@example.com</td>
            <td className="p-3"><span className="bg-gray-100 text-gray-800 px-3 py-1 rounded">User</span></td>
            <td className="p-3"><span className="bg-red-100 text-red-800 px-3 py-1 rounded">Inactive</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderShipmentMonitoring = () => (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-6">Shipment Monitoring</h2>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-indigo-50 p-4 rounded-lg">
          <p className="text-gray-600">Total Shipments</p>
          <p className="text-3xl font-bold text-indigo-600">450</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-gray-600">Delivered</p>
          <p className="text-3xl font-bold text-green-600">380</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-gray-600">In Transit</p>
          <p className="text-3xl font-bold text-yellow-600">55</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-gray-600">Delayed</p>
          <p className="text-3xl font-bold text-red-600">15</p>
        </div>
      </div>
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Tracking ID</th>
            <th className="p-3 text-left">Sender</th>
            <th className="p-3 text-left">Destination</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Date</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b hover:bg-gray-50">
            <td className="p-3">SHIP001</td>
            <td className="p-3">Mumbai</td>
            <td className="p-3">Delhi</td>
            <td className="p-3"><span className="bg-green-100 text-green-800 px-3 py-1 rounded">Delivered</span></td>
            <td className="p-3">2026-07-01</td>
          </tr>
          <tr className="border-b hover:bg-gray-50">
            <td className="p-3">SHIP002</td>
            <td className="p-3">Bangalore</td>
            <td className="p-3">Hyderabad</td>
            <td className="p-3"><span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded">In Transit</span></td>
            <td className="p-3">2026-07-02</td>
          </tr>
          <tr className="border-b hover:bg-gray-50">
            <td className="p-3">SHIP003</td>
            <td className="p-3">Pune</td>
            <td className="p-3">Chennai</td>
            <td className="p-3"><span className="bg-red-100 text-red-800 px-3 py-1 rounded">Delayed</span></td>
            <td className="p-3">2026-06-30</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderDeliveryAnalytics = () => (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-6">Delivery Analytics</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-50 p-4 rounded-lg">
          <p className="text-gray-600">On-Time Delivery Rate</p>
          <p className="text-3xl font-bold text-emerald-600">94.2%</p>
        </div>
        <div className="bg-sky-50 p-4 rounded-lg">
          <p className="text-gray-600">Avg Delivery Time</p>
          <p className="text-3xl font-bold text-sky-600">2.3 days</p>
        </div>
        <div className="bg-violet-50 p-4 rounded-lg">
          <p className="text-gray-600">Customer Satisfaction</p>
          <p className="text-3xl font-bold text-violet-600">4.8/5</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold mb-4">Delivery by Region</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>North India</span>
              <span className="font-bold">28%</span>
            </div>
            <div className="w-full bg-gray-200 rounded h-2">
              <div className="bg-blue-500 h-2 rounded" style={{ width: '28%' }}></div>
            </div>
            <div className="flex justify-between mt-4">
              <span>South India</span>
              <span className="font-bold">35%</span>
            </div>
            <div className="w-full bg-gray-200 rounded h-2">
              <div className="bg-green-500 h-2 rounded" style={{ width: '35%' }}></div>
            </div>
            <div className="flex justify-between mt-4">
              <span>East India</span>
              <span className="font-bold">22%</span>
            </div>
            <div className="w-full bg-gray-200 rounded h-2">
              <div className="bg-yellow-500 h-2 rounded" style={{ width: '22%' }}></div>
            </div>
            <div className="flex justify-between mt-4">
              <span>West India</span>
              <span className="font-bold">15%</span>
            </div>
            <div className="w-full bg-gray-200 rounded h-2">
              <div className="bg-red-500 h-2 rounded" style={{ width: '15%' }}></div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold mb-4">Monthly Trend</h3>
          <div className="space-y-3">
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span>June</span>
                <span>420 shipments</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-2">
                <div className="bg-indigo-500 h-2 rounded" style={{ width: '85%' }}></div>
              </div>
            </div>
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span>July (till now)</span>
                <span>450 shipments</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-2">
                <div className="bg-indigo-500 h-2 rounded" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRoutePerformance = () => (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-6">Route Performance</h2>
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Route</th>
            <th className="p-3 text-left">Total Shipments</th>
            <th className="p-3 text-left">Successful</th>
            <th className="p-3 text-left">Success Rate</th>
            <th className="p-3 text-left">Avg Time</th>
            <th className="p-3 text-left">Performance</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b hover:bg-gray-50">
            <td className="p-3">Mumbai - Delhi</td>
            <td className="p-3">85</td>
            <td className="p-3">82</td>
            <td className="p-3">96.5%</td>
            <td className="p-3">2.1 days</td>
            <td className="p-3"><span className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm">Excellent</span></td>
          </tr>
          <tr className="border-b hover:bg-gray-50">
            <td className="p-3">Bangalore - Chennai</td>
            <td className="p-3">72</td>
            <td className="p-3">70</td>
            <td className="p-3">97.2%</td>
            <td className="p-3">1.8 days</td>
            <td className="p-3"><span className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm">Excellent</span></td>
          </tr>
          <tr className="border-b hover:bg-gray-50">
            <td className="p-3">Pune - Hyderabad</td>
            <td className="p-3">58</td>
            <td className="p-3">54</td>
            <td className="p-3">93.1%</td>
            <td className="p-3">2.5 days</td>
            <td className="p-3"><span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm">Good</span></td>
          </tr>
          <tr className="border-b hover:bg-gray-50">
            <td className="p-3">Kolkata - Patna</td>
            <td className="p-3">45</td>
            <td className="p-3">42</td>
            <td className="p-3">93.3%</td>
            <td className="p-3">2.4 days</td>
            <td className="p-3"><span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm">Good</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderSystemMonitoring = () => (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-6">System Monitoring</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold mb-4">Server Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>API Server</span>
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
            </div>
            <div className="flex justify-between items-center">
              <span>Database</span>
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
            </div>
            <div className="flex justify-between items-center">
              <span>Cache Server</span>
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
            </div>
            <div className="flex justify-between items-center">
              <span>Mail Service</span>
              <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></span>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold mb-4">System Resources</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>CPU Usage</span>
                <span>42%</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-2">
                <div className="bg-orange-500 h-2 rounded" style={{ width: '42%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Memory Usage</span>
                <span>58%</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-2">
                <div className="bg-orange-500 h-2 rounded" style={{ width: '58%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Disk Usage</span>
                <span>72%</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-2">
                <div className="bg-red-500 h-2 rounded" style={{ width: '72%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Network</span>
                <span>35%</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-2">
                <div className="bg-green-500 h-2 rounded" style={{ width: '35%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReportsManagement = () => (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-6">Reports Management</h2>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold">Generate Daily Report</button>
        <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold">Export to Excel</button>
      </div>
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Report Name</th>
            <th className="p-3 text-left">Type</th>
            <th className="p-3 text-left">Generated Date</th>
            <th className="p-3 text-left">Period</th>
            <th className="p-3 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b hover:bg-gray-50">
            <td className="p-3">Shipment Summary</td>
            <td className="p-3"><span className="bg-blue-100 text-blue-800 px-3 py-1 rounded">Monthly</span></td>
            <td className="p-3">2026-07-01</td>
            <td className="p-3">June 2026</td>
            <td className="p-3"><button className="text-blue-600 hover:text-blue-800 font-semibold">Download</button></td>
          </tr>
          <tr className="border-b hover:bg-gray-50">
            <td className="p-3">Revenue Report</td>
            <td className="p-3"><span className="bg-green-100 text-green-800 px-3 py-1 rounded">Quarterly</span></td>
            <td className="p-3">2026-06-30</td>
            <td className="p-3">Q2 2026</td>
            <td className="p-3"><button className="text-blue-600 hover:text-blue-800 font-semibold">Download</button></td>
          </tr>
          <tr className="border-b hover:bg-gray-50">
            <td className="p-3">Performance Metrics</td>
            <td className="p-3"><span className="bg-purple-100 text-purple-800 px-3 py-1 rounded">Weekly</span></td>
            <td className="p-3">2026-06-28</td>
            <td className="p-3">Week 26</td>
            <td className="p-3"><button className="text-blue-600 hover:text-blue-800 font-semibold">Download</button></td>
          </tr>
          <tr className="hover:bg-gray-50">
            <td className="p-3">User Activity</td>
            <td className="p-3"><span className="bg-orange-100 text-orange-800 px-3 py-1 rounded">Daily</span></td>
            <td className="p-3">2026-07-02</td>
            <td className="p-3">Today</td>
            <td className="p-3"><button className="text-blue-600 hover:text-blue-800 font-semibold">Download</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex bg-gray-100">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
          
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${activeTab === 'overview' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${activeTab === 'users' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            >
              (i) User Management
            </button>
            <button
              onClick={() => setActiveTab('shipments')}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${activeTab === 'shipments' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            >
              (ii) Shipment Monitoring
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${activeTab === 'analytics' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            >
              (iii) Delivery Analytics
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${activeTab === 'routes' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            >
              (iv) Route Performance
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${activeTab === 'system' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            >
              (v) System Monitoring
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${activeTab === 'reports' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            >
              (vi) Reports Management
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-4 gap-6">
              <DashboardCard title="Total Shipments" count="450" />
              <DashboardCard title="Delivered" count="380" />
              <DashboardCard title="In Transit" count="55" />
              <DashboardCard title="Delayed" count="15" />
            </div>
          )}
          {activeTab === 'users' && renderUserManagement()}
          {activeTab === 'shipments' && renderShipmentMonitoring()}
          {activeTab === 'analytics' && renderDeliveryAnalytics()}
          {activeTab === 'routes' && renderRoutePerformance()}
          {activeTab === 'system' && renderSystemMonitoring()}
          {activeTab === 'reports' && renderReportsManagement()}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
