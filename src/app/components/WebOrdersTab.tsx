/**
 * WebOrdersTab — extracted to a separate file so it can be lazy-loaded via React.lazy().
 * This component renders the orders management section (Bulk + Web) of the admin Operations Dashboard.
 * Recharts (PieChart for state distribution) is loaded as part of this chunk,
 * which is deferred until the admin visits the orders tab.
 *
 * Rules:
 * - This file uses a DEFAULT export (required by React.lazy).
 * - Do NOT import exceljs or file-saver here; those are loaded dynamically in click handlers
 *   passed in from the parent (handleExportCSV, handleExportBulkCSV).
 */
import React, { useState } from 'react';
import axios from 'axios';
import {
  Check, Clock, Package, Users, Activity, PieChart,
  Search, CalendarIcon, ChevronDown, CheckCircle2, XCircle,
  Trash2, Truck, PackageCheck, ClipboardList
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell,
  Tooltip as RechartsTooltip
} from 'recharts';
import { toast } from 'sonner';
import FocusTrap from 'focus-trap-react';
import { X } from 'lucide-react';

// ── Inline modal (copied from parent so this chunk is self-contained) ──────────
const Modal = ({ isOpen, onClose, title, children, maxWidthClass }: any) => {
  if (!isOpen) return null;
  return (
    <FocusTrap focusTrapOptions={{ initialFocus: false, allowOutsideClick: true }}>
      <div className="dash-modal-backdrop" onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
        <div role="dialog" aria-modal="true" className={`dash-modal ${maxWidthClass || ''}`}>
          <div className="dash-modal-header">
            <h3 className="text-sm font-bold uppercase tracking-widest text-paa-navy">{title}</h3>
            <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/6 text-paa-gray-text hover:text-paa-navy transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="dash-modal-body space-y-4">
            {children}
          </div>
        </div>
      </div>
    </FocusTrap>
  );
};

// ── Props interface ────────────────────────────────────────────────────────────
interface WebOrdersTabProps {
  orders: any[];
  stats: any;
  fetchOrders: (background?: boolean) => Promise<void>;
  API: string;
  handleExportCSV: () => Promise<void>;
  handleExportBulkCSV: () => Promise<void>;
  ordersMeta: any;
  ordersPage: number;
  setOrdersPage: React.Dispatch<React.SetStateAction<number>>;
}

// ── Component ──────────────────────────────────────────────────────────────────
function WebOrdersTab({
  orders,
  stats,
  fetchOrders,
  API,
  handleExportCSV,
  handleExportBulkCSV,
  ordersMeta,
  ordersPage,
  setOrdersPage,
}: WebOrdersTabProps) {
  const [fineModalAuthor, setFineModalAuthor] = useState<{ id: number, name: string } | null>(null);
  const [fineAmount, setFineAmount] = useState('500');
  const [isSubmittingFine, setIsSubmittingFine] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [webSearchTerm, setWebSearchTerm] = useState('');
  const [webStatusFilter, setWebStatusFilter] = useState('All');
  const [bulkSearchTerm, setBulkSearchTerm] = useState('');
  const [bulkStatusFilter, setBulkStatusFilter] = useState('All');
  const [showAllBulkOrders, setShowAllBulkOrders] = useState(false);
  const [showArchivedWeb, setShowArchivedWeb] = useState(false);
  const [showArchivedBulk, setShowArchivedBulk] = useState(false);

  const getAggregateStatus = (ord: any) => {
    const { status: ordStatus, items } = ord;
    if (ordStatus === 'Cancelled') return { text: 'Cancelled', style: 'bg-red-500 text-white border-transparent shadow-md' };
    if (ordStatus === 'Payment Not Received') return { text: 'Payment Failed', style: 'bg-red-500 text-white border-transparent shadow-md' };

    if (items && items.length > 0) {
      const allCompleted = items.every((it: any) => it.status === 'Completed' || it.status === 'Delivered');
      const anyDispatched = items.some((it: any) => it.status === 'Dispatched' || it.status === 'Completed' || it.status === 'Delivered');
      const anyAccepted = items.some((it: any) => it.status === 'Accepted');
      const anyRejected = items.some((it: any) => it.status === 'Rejected');

      if (allCompleted) return { text: 'Delivered', style: 'bg-green-500 text-white border-transparent shadow-md' };
      if (anyDispatched) return { text: 'Dispatched', style: 'bg-blue-500 text-white border-transparent shadow-md' };
      if (anyAccepted) return { text: 'Accepted', style: 'bg-purple-500 text-white border-transparent shadow-md' };
      if (anyRejected) return { text: 'Rejected', style: 'bg-red-500 text-white border-transparent shadow-md' };
    }

    if (ord.isBulk) {
      if (ordStatus === 'Bulk Request Pending') return { text: 'Bulk Req Pending', style: 'bg-amber-500 text-white border-transparent shadow-md' };
      if (ordStatus === 'Approved - Pending Payment') return { text: 'Pending Payment', style: 'bg-indigo-500 text-white border-transparent shadow-md' };
      if (ordStatus === 'Payment Verified') return { text: 'Payment Verified', style: 'bg-emerald-500 text-white border-transparent shadow-md' };
      if (ordStatus === 'Dispatched') return { text: 'Dispatched', style: 'bg-blue-500 text-white border-transparent shadow-md' };
      if (ordStatus === 'Delivered' || ordStatus === 'Completed') return { text: 'Delivered', style: 'bg-green-500 text-white border-transparent shadow-md' };
    }

    if (ordStatus === 'Pending Verification' || ordStatus === 'Pending') {
      return { text: 'Pending Verification', style: 'bg-yellow-400 text-black border-transparent shadow-md' };
    }

    return { text: ordStatus || 'Pending', style: 'bg-gray-500 text-white border-transparent shadow-md' };
  };

  const filterOrders = (sourceOrders: any[], term: string, statFilter: string, showArchived: boolean) => {
    return sourceOrders.filter((ord: any) => {
      if (showArchived) return ord.isArchived;
      if (ord.isArchived) return false;
      if (statFilter !== 'All') {
        const statusText = getAggregateStatus(ord).text;
        if (statFilter === 'Pending' && !['Pending Verification', 'Pending', 'Bulk Req Pending', 'Pending Payment'].includes(statusText)) return false;
        if (statFilter === 'Accepted' && !['Accepted', 'Payment Confirmed', 'Payment Verified'].includes(statusText)) return false;
        if (statFilter === 'Dispatched' && statusText !== 'Dispatched') return false;
        if (statFilter === 'Completed' && statusText !== 'Delivered') return false;
        if (statFilter === 'Cancelled' && !['Cancelled', 'Rejected', 'Payment Failed'].includes(statusText)) return false;
      }
      if (!term) return true;
      const t = term.toLowerCase();
      return (
        (ord.id && ord.id.toLowerCase().includes(t)) ||
        (ord.customer && ord.customer.toLowerCase().includes(t)) ||
        (ord.customerEmail && ord.customerEmail.toLowerCase().includes(t)) ||
        (ord.customerPhone && ord.customerPhone.toLowerCase().includes(t)) ||
        (ord.address && ord.address.toLowerCase().includes(t)) ||
        (ord.items && ord.items.some((it: any) =>
          (it.title && it.title.toLowerCase().includes(t)) ||
          (it.authorName && it.authorName.toLowerCase().includes(t))
        ))
      );
    });
  };

  const webOrders = orders.filter((o: any) => !o.isBulk);
  const bulkOrders = orders.filter((o: any) => o.isBulk);

  const filteredWebOrders = filterOrders(webOrders, webSearchTerm, webStatusFilter, showArchivedWeb);
  const filteredBulkOrders = filterOrders(bulkOrders, bulkSearchTerm, bulkStatusFilter, showArchivedBulk);
  const filteredOrders = [...filteredWebOrders, ...filteredBulkOrders];

  const successfulWeb = webOrders.filter((o: any) => getAggregateStatus(o).text === 'Delivered').length;
  const successfulBulk = bulkOrders.filter((o: any) => getAggregateStatus(o).text === 'Delivered').length;
  const successfulOrders = successfulWeb + successfulBulk;

  const toApproveWeb = webOrders.filter((o: any) => ['Pending Verification', 'Pending'].includes(getAggregateStatus(o).text)).length;
  const toApproveBulk = bulkOrders.filter((o: any) => ['Bulk Req Pending', 'Pending Payment'].includes(getAggregateStatus(o).text)).length;
  const toApproveOrders = toApproveWeb + toApproveBulk;

  const underDeliveryWeb = webOrders.filter((o: any) => getAggregateStatus(o).text === 'Dispatched').length;
  const underDeliveryBulk = bulkOrders.filter((o: any) => getAggregateStatus(o).text === 'Dispatched').length;
  const underDeliveryOrders = underDeliveryWeb + underDeliveryBulk;

  const returnedOrdersCount = webOrders.filter((o: any) => ['Returned', 'Cancelled', 'Rejected', 'Payment Failed'].includes(getAggregateStatus(o).text)).length;

  const totalRevenueWebOrders = filteredOrders.reduce((sum: number, o: any) => (o.status === 'Completed' || o.status === 'Dispatched') ? sum + (o.total || 0) : sum, 0);

  // Additional Insights
  const totalCustomersWeb = new Set(webOrders.map((o: any) => o.customerEmail).filter(Boolean)).size;
  const totalCustomersBulk = new Set(bulkOrders.map((o: any) => o.customerEmail).filter(Boolean)).size;
  const totalCustomers = new Set(orders.map((o: any) => o.customerEmail).filter(Boolean)).size;

  let totalDeliveryTime = 0;
  let deliveredCount = 0;

  const lateDeliveriesMap: Record<number, { authorName: string, authorEmail: string, orderId: string, hours: number, count: number }> = {};

  filteredOrders.forEach((o: any) => {
    o.items?.forEach((it: any) => {
      if (it.status === 'Delivered' && it.dispatchedAt && it.deliveredAt) {
        const time = new Date(it.deliveredAt).getTime() - new Date(it.dispatchedAt).getTime();
        totalDeliveryTime += time;
        deliveredCount++;
      }
    });
  });
  const avgDeliveryDays = deliveredCount > 0 ? (totalDeliveryTime / deliveredCount / (1000 * 3600 * 24)).toFixed(1) : 0;

  const handleDeleteOrder = async (id: number) => {
    if (window.confirm('Are you sure you want to archive this order?')) {
      try {
        await axios.delete(`${API}/api/admin/orders/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchOrders();
        toast.success('Order archived successfully');
      } catch (err) {
        toast.error('Failed to archive order');
      }
    }
  };

  const handleRestoreOrder = async (id: number) => {
    if (window.confirm('Are you sure you want to restore this order?')) {
      try {
        await axios.put(`${API}/api/admin/orders/${id}/restore`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchOrders();
        toast.success('Order restored successfully');
      } catch (err) {
        toast.error('Failed to restore order');
      }
    }
  };

  const handleApproveBulk = async (id: number) => {
    if (window.confirm('Approve this bulk order?')) {
      try {
        await axios.post(`${API}/api/admin/orders/${id}/approve-bulk`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchOrders();
        toast.success('Bulk order approved');
      } catch (err) {
        toast.error('Failed to approve bulk order');
      }
    }
  };

  const handleUpdateBulkStatus = async (id: number, status: string, message: string) => {
    if (window.confirm(message)) {
      try {
        await axios.put(`${API}/api/admin/orders/${id}/status`, { status }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchOrders();
        toast.success(`Bulk order marked as ${status}`);
      } catch (err) {
        toast.error(`Failed to update order status`);
      }
    }
  };

  // State Distribution Extraction
  const stateCounts: Record<string, number> = {};
  filteredOrders.forEach((o: any) => {
    if (o.address) {
      const parts = o.address.split(',');
      const lastPart = parts[parts.length - 1]; // e.g. " Maharashtra - 411001"
      if (lastPart) {
        const stateStr = lastPart.split('-')[0].trim();
        if (stateStr) {
          stateCounts[stateStr] = (stateCounts[stateStr] || 0) + 1;
        }
      }
    }
  });

  const sortedStates = Object.entries(stateCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const topStates = sortedStates.slice(0, 6);
  const othersCount = sortedStates.slice(6).reduce((sum, s) => sum + s.value, 0);
  if (othersCount > 0) {
    topStates.push({ name: 'Others', value: othersCount });
  }
  const pieColors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#9CA3AF'];

  return (
    <div className="space-y-6">
      {/* Order Tracking KPIs & State Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-[11px] font-bold tracking-widest uppercase text-paa-gray-text flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" /> Order KPIs
          </h3>
          <div className="grid grid-cols-2 gap-4 h-[calc(100%-2rem)]">
            {[
              { label: 'Successful Orders', value: successfulOrders, breakdown: `${successfulWeb} Web • ${successfulBulk} Bulk`, icon: Check, colorClass: 'green' },
              { label: 'Pending Verification', value: toApproveOrders, breakdown: `${toApproveWeb} Web • ${toApproveBulk} Bulk`, icon: Clock, colorClass: 'amber' },
              { label: 'Under Delivery', value: underDeliveryOrders, breakdown: `${underDeliveryWeb} Web • ${underDeliveryBulk} Bulk`, icon: Package, colorClass: 'blue' },
              { label: 'Total Customers', value: totalCustomers, breakdown: `${totalCustomersWeb} Web • ${totalCustomersBulk} Bulk`, icon: Users, colorClass: 'red' },
            ].map((kpi, i) => (
              <div key={i} className={`dash-kpi-card ${kpi.colorClass} flex flex-col justify-center items-start gap-1`}>
                <div className={`dash-kpi-icon ${kpi.colorClass} mb-1`}>
                  <kpi.icon size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-paa-gray-text mb-0.5">{kpi.label}</p>
                  <h3 className="text-3xl font-black text-paa-navy tracking-tight leading-none mb-1">{kpi.value}</h3>
                  <p className={`text-[9px] font-bold uppercase tracking-widest rounded-full inline-block px-1.5 py-0.5 ${
                    kpi.colorClass === 'green' ? 'bg-green-100 text-green-700' :
                    kpi.colorClass === 'amber' ? 'bg-amber-100 text-amber-700' :
                    kpi.colorClass === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {kpi.breakdown}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1 bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex flex-col hover:shadow-md transition-shadow">
          <h3 className="text-[11px] font-bold tracking-widest uppercase text-paa-gray-text mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-500" /> State Distribution (Current Page)
          </h3>
          <div className="flex-1 w-full min-h-[160px]">
            {topStates.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={topStates}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {topStates.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontWeight: 'bold' }}
                    itemStyle={{ color: '#1a1a2e' }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-medium">No location data available</div>
            )}
          </div>
          {topStates.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {topStates.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pieColors[idx % pieColors.length] }}></span>
                  {entry.name} ({entry.value})
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {[{ title: 'Bulk Orders', data: filteredBulkOrders, showFilters: true, isBulkSection: true, searchTerm: bulkSearchTerm, setSearchTerm: setBulkSearchTerm, statusFilter: bulkStatusFilter, setStatusFilter: setBulkStatusFilter }, { title: 'Web Orders', data: filteredWebOrders, showFilters: true, isBulkSection: false, searchTerm: webSearchTerm, setSearchTerm: setWebSearchTerm, statusFilter: webStatusFilter, setStatusFilter: setWebStatusFilter }].map((section, sectionIdx) => {
        const displayData = (section.isBulkSection && !showAllBulkOrders) ? section.data.slice(0, 5) : section.data;
        return (
      <div key={sectionIdx} className="bg-white border border-paa-navy/5 shadow-premium hover:shadow-premium-hover transition-all duration-500 ease-out flex flex-col mb-8">
        <div className="p-4 border-b border-paa-navy/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#f0f4f8]">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-serif font-semibold text-paa-navy tracking-tight">{section.title}</h3>
          </div>
          {section.showFilters && (
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              <div className="flex flex-wrap bg-white rounded-lg p-1 border border-paa-navy/10 shadow-sm">
                {['All', 'Pending', 'Accepted', 'Dispatched', 'Completed'].map((st) => {
                  const tabCount = st === 'All' ? section.data.length : section.data.filter((ord: any) => {
                    const statusText = getAggregateStatus(ord).text;
                    if (st === 'Pending' && ['Pending Verification', 'Pending', 'Bulk Req Pending', 'Pending Payment'].includes(statusText)) return true;
                    if (st === 'Accepted' && ['Accepted', 'Payment Confirmed', 'Payment Verified'].includes(statusText)) return true;
                    if (st === 'Dispatched' && statusText === 'Dispatched') return true;
                    if (st === 'Completed' && statusText === 'Delivered') return true;
                    return false;
                  }).length;
                  return (
                  <button
                    key={st}
                    onClick={() => section.setStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 ${section.statusFilter === st ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'}`}
                  >
                    {st} <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${section.statusFilter === st ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-500'}`}>{tabCount}</span>
                  </button>
                )})}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-paa-gray-text" />
                <input
                  type="text"
                  placeholder="SEARCH ORDERS..."
                  value={section.searchTerm}
                  onChange={(e) => section.setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-paa-navy/20 text-xs font-bold tracking-widest uppercase outline-none focus:border-paa-navy transition-colors w-full sm:w-64 rounded-full"
                />
              </div>
              {section.isBulkSection ? (
                <button onClick={handleExportBulkCSV} className="flex items-center justify-center gap-2 px-4 py-2 bg-[#5cb85c] text-white text-xs font-bold tracking-widest uppercase hover:bg-green-600 transition-colors shadow-premium rounded-full whitespace-nowrap">
                  <ClipboardList className="w-4 h-4" /> Bulk Orders Summary
                </button>
              ) : (
                <button onClick={handleExportCSV} className="flex items-center justify-center gap-2 px-4 py-2 bg-[#5cb85c] text-white text-xs font-bold tracking-widest uppercase hover:bg-green-600 transition-colors shadow-premium rounded-full whitespace-nowrap">
                  <ClipboardList className="w-4 h-4" /> Web Orders Summary
                </button>
              )}
              <div className="w-[1px] h-6 bg-gray-300 mx-1 hidden sm:block"></div>
              <div 
                onClick={() => section.isBulkSection ? setShowArchivedBulk(!showArchivedBulk) : setShowArchivedWeb(!showArchivedWeb)}
                className="flex items-center gap-2 cursor-pointer shrink-0 ml-1"
              >
                <div className={`relative w-8 h-4 rounded-full transition-colors ${(section.isBulkSection ? showArchivedBulk : showArchivedWeb) ? 'bg-red-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform duration-200 ${(section.isBulkSection ? showArchivedBulk : showArchivedWeb) ? 'translate-x-4' : 'translate-x-0'} shadow-sm`}></div>
                </div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-gray-600">Archived</span>
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:block w-full overflow-x-auto">
          <table className="dash-table w-full table-auto xl:table-fixed min-w-[900px] xl:min-w-0">
            <thead>
              <tr className="bg-indigo-50 border-b-2 border-indigo-100">
                <th className="w-[5%] !text-indigo-800 !bg-transparent !text-[14px]">S.No</th>
                <th className="w-[15%] !text-indigo-800 !bg-transparent !text-[14px]">Order ID & Date</th>
                <th className="w-[15%] !text-indigo-800 !bg-transparent !text-[14px]">Customer</th>
                <th className="w-[25%] !text-indigo-800 !bg-transparent !text-[14px]">Items / Books</th>
                <th className="w-[8%] !text-indigo-800 !bg-transparent !text-[14px]" style={{ textAlign: 'center' }}>Amount</th>
                <th className="w-[17%] !text-indigo-800 !bg-transparent !text-[14px]" style={{ textAlign: 'center' }}>Status</th>
                <th className="w-[15%] !text-indigo-800 !bg-transparent !text-[14px]" style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((ord: any, idx: number) => {
                const statusText = getAggregateStatus(ord).text;
                return (
                  <React.Fragment key={ord.dbId}>
                    <tr onClick={() => setExpandedOrderId(expandedOrderId === ord.dbId ? null : ord.dbId)} className={`cursor-pointer transition-colors ${expandedOrderId === ord.dbId ? 'bg-[#E8DCC8]' : (idx % 2 === 0 ? 'bg-white' : 'bg-[#F2ECE4]')} hover:bg-[#E8DCC8]`}>
                      <td className="font-bold text-paa-gray-text pl-4">{idx + 1}</td>
                      <td className="truncate">
                        <p className="font-bold text-paa-navy mb-1 truncate">{ord.id}</p>
                        <p className="text-xs text-paa-gray-text flex items-center gap-1 font-medium"><CalendarIcon className="w-3 h-3 shrink-0" /> {ord.date}</p>
                      </td>
                      <td className="font-bold text-paa-navy truncate pr-2" title={ord.customer}>{ord.customer}</td>
                      <td className="truncate pr-2">
                        <ul className="text-xs text-paa-gray-text font-medium space-y-1">
                          {ord.items.slice(0, 2).map((it: any, idx: number) => (
                            <li key={idx} className="flex gap-2 items-center truncate">
                              <span className="text-paa-navy font-bold shrink-0">{it.qty}x</span>
                              <span className="truncate">{it.title} <span className="text-gray-400 italic">by {it.authorName}</span></span>
                            </li>
                          ))}
                          {ord.items.length > 2 && <li className="text-indigo-500 font-bold text-[10px] uppercase tracking-widest">+ {ord.items.length - 2} more items</li>}
                        </ul>
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-bold text-paa-navy">₹{ord.total}</td>
                      <td style={{ textAlign: 'center' }} className="px-2">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {ord.isBulk ? (
                            <select
                              value={statusText}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                const val = e.target.value;
                                if (statusText === 'Bulk Request Pending' && val === 'Approved - Pending Payment') {
                                  handleApproveBulk(ord.dbId);
                                } else {
                                  handleUpdateBulkStatus(ord.dbId, val, `Change bulk order status to ${val}?`);
                                }
                              }}
                              className={`w-full text-[9px] font-bold uppercase tracking-widest px-2 py-1.5 rounded-full border text-center outline-none cursor-pointer appearance-none ${getAggregateStatus(ord).style}`}
                            >
                              <option value="Bulk Request Pending" className="bg-white text-gray-800">Bulk Req Pending</option>
                              <option value="Approved - Pending Payment" className="bg-white text-gray-800">Pending Payment</option>
                              <option value="Payment Verified" className="bg-white text-gray-800">Payment Verified</option>
                              <option value="Dispatched" className="bg-white text-gray-800">Dispatched</option>
                              <option value="Delivered" className="bg-white text-gray-800">Delivered</option>
                              <option value="Cancelled" className="bg-white text-gray-800">Cancelled</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center justify-center w-full px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full border ${getAggregateStatus(ord).style}`}>
                              {statusText}
                            </span>
                          )}
                          {['Dispatched', 'Delivered', 'Completed'].includes(statusText) && ord.items.some((it: any) => it.dispatchedAt) && (
                            <span className="text-[9px] text-gray-500 font-bold tracking-wider uppercase">
                              Disp: {new Date(Math.max(...ord.items.filter((it: any) => it.dispatchedAt).map((it: any) => new Date(it.dispatchedAt).getTime()))).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                          {['Delivered', 'Completed'].includes(statusText) && ord.items.some((it: any) => it.deliveredAt) && (
                            <span className="text-[9px] text-gray-500 font-bold tracking-wider uppercase">
                              Del: {new Date(Math.max(...ord.items.filter((it: any) => it.deliveredAt).map((it: any) => new Date(it.deliveredAt).getTime()))).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }} className="px-2">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {ord.isBulk && statusText === 'Bulk Request Pending' && (
                            <button onClick={(e) => { e.stopPropagation(); handleApproveBulk(ord.dbId); }} className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold bg-indigo-600 text-white border-none rounded shadow hover:bg-indigo-700 transition-colors" title="Approve Bulk Order">
                              Approve Request
                            </button>
                          )}
                          {ord.isBulk && statusText === 'Approved - Pending Payment' && (
                            <button onClick={(e) => { e.stopPropagation(); handleUpdateBulkStatus(ord.dbId, 'Payment Verified', 'Verify Payment for this bulk order?'); }} className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold bg-emerald-600 text-white border-none rounded shadow hover:bg-emerald-700 transition-colors" title="Verify Payment">
                              Verify Payment
                            </button>
                          )}
                          {ord.isBulk && statusText === 'Payment Verified' && (
                            <button onClick={(e) => { e.stopPropagation(); handleUpdateBulkStatus(ord.dbId, 'Dispatched', 'Mark this bulk order as Dispatched?'); }} className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold bg-blue-600 text-white border-none rounded shadow hover:bg-blue-700 transition-colors" title="Mark as Dispatched">
                              Dispatch
                            </button>
                          )}
                          {ord.isBulk && statusText === 'Dispatched' && (
                            <button onClick={(e) => { e.stopPropagation(); handleUpdateBulkStatus(ord.dbId, 'Delivered', 'Mark this bulk order as Delivered?'); }} className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold bg-purple-600 text-white border-none rounded shadow hover:bg-purple-700 transition-colors" title="Mark as Delivered">
                              Deliver
                            </button>
                          )}
                          {!ord.isBulk && statusText === 'Pending Verification' && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleUpdateBulkStatus(ord.dbId, 'Accepted', 'Accept this Web Order?'); }} className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold bg-purple-600 text-white border-none rounded shadow hover:bg-purple-700 transition-colors" title="Accept Order">
                                Accept
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleUpdateBulkStatus(ord.dbId, 'Rejected', 'Reject this Web Order?'); }} className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold bg-red-600 text-white border-none rounded shadow hover:bg-red-700 transition-colors" title="Reject Order">
                                Reject
                              </button>
                            </>
                          )}
                          {ord.isArchived ? (
                            <button onClick={(e) => { e.stopPropagation(); handleRestoreOrder(ord.dbId); }} className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold bg-amber-100 text-amber-800 border-none rounded shadow hover:bg-amber-200 transition-colors" title="Restore Order">
                              Restore
                            </button>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteOrder(ord.dbId); }} className="p-1.5 rounded-full hover:bg-red-50 text-red-500 transition-colors" title="Archive Order">
                              <Trash2 size={16} />
                            </button>
                          )}
                          <button className="text-gray-400 p-1.5 rounded-full hover:bg-gray-100 transition-colors" title="Toggle Details">
                            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${expandedOrderId === ord.dbId ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedOrderId === ord.dbId && (
                      <tr className="bg-indigo-50/10 border-b border-indigo-100/50 shadow-inner">
                        <td colSpan={7} className="p-0">
                          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in-up">
                            {/* Order Details Column */}
                            <div className="space-y-4">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 border-b border-indigo-100 pb-2">Order Details</h4>
                              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <p className="text-sm font-bold text-paa-navy mb-1">{ord.customer}</p>
                                <p className="text-xs text-gray-500 mb-0.5">{ord.customerEmail}</p>
                                <p className="text-xs text-gray-500 mb-3">{ord.customerPhone}</p>
                                <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mb-3">
                                  <span className="font-bold text-paa-navy block mb-1">Shipping Address:</span>
                                  {ord.address}
                                </div>
                                {ord.items.some((it: any) => it.trackingNumber && it.trackingNumber !== 'N/A') && (
                                  <div className="text-xs text-indigo-800 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                                    <span className="font-bold block mb-1">Tracking Details:</span>
                                    <ul className="space-y-1">
                                      {ord.items.filter((it: any) => it.trackingNumber && it.trackingNumber !== 'N/A').map((it: any, idx: number) => (
                                        <li key={idx}><strong className="text-paa-navy">{it.title}:</strong> {it.trackingNumber}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
                                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Order Timeline</h5>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-medium">Placed On</span>
                                    <span className="font-bold text-paa-navy">{new Date(ord.date).toLocaleString('en-IN')}</span>
                                  </div>
                                  {ord.items.some((it: any) => it.acceptedAt) && (
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-500 font-medium">Accepted</span>
                                      <span className="font-bold text-paa-navy">{new Date(Math.max(...ord.items.filter((it: any) => it.acceptedAt).map((it: any) => new Date(it.acceptedAt).getTime()))).toLocaleString('en-IN')}</span>
                                    </div>
                                  )}
                                  {ord.items.some((it: any) => it.dispatchedAt) && (
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-500 font-medium">Dispatched</span>
                                      <span className="font-bold text-paa-navy">{new Date(Math.max(...ord.items.filter((it: any) => it.dispatchedAt).map((it: any) => new Date(it.dispatchedAt).getTime()))).toLocaleString('en-IN')}</span>
                                    </div>
                                  )}
                                  {ord.items.some((it: any) => it.deliveredAt) && (
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-500 font-medium">Delivered</span>
                                      <span className="font-bold text-green-600">{new Date(Math.max(...ord.items.filter((it: any) => it.deliveredAt).map((it: any) => new Date(it.deliveredAt).getTime()))).toLocaleString('en-IN')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Order Items Column */}
                            <div className="space-y-4">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 border-b border-indigo-100 pb-2">Order Items</h4>
                              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm max-h-56 overflow-y-auto">
                                <ul className="space-y-3">
                                  {ord.items.map((it: any, idx: number) => (
                                    <li key={idx} className="flex gap-3 text-sm">
                                      <span className="font-bold text-paa-navy bg-gray-50 px-2 py-1 rounded-md border border-gray-100 h-fit shrink-0">{it.qty}x</span>
                                      <div>
                                        <p className="font-bold text-paa-navy leading-tight">{it.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">by {it.authorName}</p>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Bill Summary Column */}
                            <div className="space-y-4">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 border-b border-indigo-100 pb-2">Bill Summary</h4>
                              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-2 text-sm">
                                <div className="flex justify-between text-gray-600">
                                  <span>Subtotal</span>
                                  <span className="font-semibold text-paa-navy">₹{ord.subtotal}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>Logistics Fees (Delivery)</span>
                                  <span className="font-semibold text-paa-navy">₹{ord.deliveryCharges}</span>
                                </div>
                                {ord.bundleDiscount > 0 && (
                                  <div className="flex justify-between text-green-600">
                                    <span>Promotional Discount</span>
                                    <span className="font-semibold">-₹{ord.bundleDiscount}</span>
                                  </div>
                                )}
                                <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between items-center">
                                  <span className="font-bold text-paa-navy">Final Payable Amount</span>
                                  <span className="text-lg font-black text-indigo-600">₹{ord.total}</span>
                                </div>
                              </div>
                              
                              {ord.isBulk && (
                                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 shadow-sm mt-4">
                                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-3 border-b border-indigo-200 pb-2">Author Amount Split</h4>
                                  <div className="space-y-2 text-xs">
                                    {Object.entries(
                                      ord.items.reduce((acc: any, it: any) => {
                                        const author = it.authorName || 'Unknown';
                                        acc[author] = (acc[author] || 0) + ((it.qty || 1) * (it.mrp || 0));
                                        return acc;
                                      }, {})
                                    ).map(([author, amount]: any, idx) => (
                                      <div key={idx} className="flex justify-between items-center">
                                        <span className="font-semibold text-paa-navy truncate max-w-[150px]">{author}</span>
                                        <span className="font-bold text-indigo-700 bg-indigo-100/50 px-2 py-0.5 rounded border border-indigo-100">₹{amount}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {displayData.length === 0 && <tr><td colSpan={6} className="text-center py-8">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50">
          {displayData.map((ord: any) => {
            const statusText = getAggregateStatus(ord).text;
            const borderClass = statusText === 'Delivered'
              ? 'border-l-4 border-l-green-500'
              : statusText === 'Dispatched'
                ? 'border-l-4 border-l-blue-500'
                : ['Pending Verification', 'Pending', 'Accepted'].includes(statusText)
                  ? 'border-l-4 border-l-amber-500'
                  : 'border-l-4 border-l-red-500';

            return (
              <div key={ord.dbId} className={`bg-white p-4 rounded-xl shadow-sm border border-paa-navy/10 flex flex-col gap-3 ${borderClass}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-paa-navy text-sm">{ord.id}</p>
                    <p className="text-[10px] text-paa-gray-text flex items-center gap-1 font-medium"><CalendarIcon className="w-3 h-3" /> {ord.date}</p>
                    {['Dispatched', 'Delivered', 'Completed'].includes(statusText) && ord.items.some((it: any) => it.dispatchedAt) && (
                      <span className="text-[10px] text-gray-500 font-bold uppercase block">
                        Disp: {new Date(Math.max(...ord.items.filter((it: any) => it.dispatchedAt).map((it: any) => new Date(it.dispatchedAt).getTime()))).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                    {['Delivered', 'Completed'].includes(statusText) && ord.items.some((it: any) => it.deliveredAt) && (
                      <span className="text-[10px] text-gray-500 font-bold uppercase block">
                        Del: {new Date(Math.max(...ord.items.filter((it: any) => it.deliveredAt).map((it: any) => new Date(it.deliveredAt).getTime()))).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {ord.isBulk ? (
                      <select
                        value={statusText}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          const val = e.target.value;
                          if (statusText === 'Bulk Request Pending' && val === 'Approved - Pending Payment') {
                            handleApproveBulk(ord.dbId);
                          } else {
                            handleUpdateBulkStatus(ord.dbId, val, `Change bulk order status to ${val}?`);
                          }
                        }}
                        className={`text-[9px] px-2 py-1.5 rounded-full font-bold uppercase tracking-widest border text-center outline-none cursor-pointer appearance-none ${getAggregateStatus(ord).style}`}
                      >
                        <option value="Bulk Request Pending" className="bg-white text-gray-800">Bulk Req Pending</option>
                        <option value="Approved - Pending Payment" className="bg-white text-gray-800">Pending Payment</option>
                        <option value="Payment Verified" className="bg-white text-gray-800">Payment Verified</option>
                        <option value="Dispatched" className="bg-white text-gray-800">Dispatched</option>
                        <option value="Delivered" className="bg-white text-gray-800">Delivered</option>
                        <option value="Cancelled" className="bg-white text-gray-800">Cancelled</option>
                      </select>
                    ) : (
                      <span className={`text-[9px] px-2 py-1 rounded-full font-bold uppercase tracking-widest border ${getAggregateStatus(ord).style}`}>
                        {statusText}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-paa-gray-text font-bold uppercase tracking-widest mb-0.5">Customer</p>
                  <p className="text-sm font-bold text-paa-navy">{ord.customer}</p>
                </div>
                <div>
                  <p className="text-[10px] text-paa-gray-text font-bold uppercase tracking-widest mb-1">Items</p>
                  <ul className="text-xs text-paa-gray-text font-medium space-y-1 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                    {ord.items.map((it: any, idx: number) => (
                      <li key={idx} className="flex gap-2"><span className="text-paa-navy font-bold">{it.qty}x</span> <span>{it.title}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-1 cursor-pointer" onClick={() => setExpandedOrderId(expandedOrderId === ord.dbId ? null : ord.dbId)}>
                  <div className="text-base font-black text-indigo-600">₹{ord.total}</div>
                  <div className="flex items-center gap-2">
                    {ord.isBulk && statusText === 'Bulk Request Pending' && (
                      <button onClick={(e) => { e.stopPropagation(); handleApproveBulk(ord.dbId); }} className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold bg-indigo-600 text-white border-none rounded shadow hover:bg-indigo-700 transition-colors" title="Approve Bulk Order">
                        Approve Request
                      </button>
                    )}
                    {ord.isBulk && statusText === 'Approved - Pending Payment' && (
                      <button onClick={(e) => { e.stopPropagation(); handleUpdateBulkStatus(ord.dbId, 'Payment Verified', 'Verify Payment for this bulk order?'); }} className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold bg-emerald-600 text-white border-none rounded shadow hover:bg-emerald-700 transition-colors" title="Verify Payment">
                        Verify Payment
                      </button>
                    )}
                    {ord.isBulk && statusText === 'Payment Verified' && (
                      <button onClick={(e) => { e.stopPropagation(); handleUpdateBulkStatus(ord.dbId, 'Dispatched', 'Mark this bulk order as Dispatched?'); }} className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold bg-blue-600 text-white border-none rounded shadow hover:bg-blue-700 transition-colors" title="Mark as Dispatched">
                        Dispatch
                      </button>
                    )}
                    {ord.isBulk && statusText === 'Dispatched' && (
                      <button onClick={(e) => { e.stopPropagation(); handleUpdateBulkStatus(ord.dbId, 'Delivered', 'Mark this bulk order as Delivered?'); }} className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold bg-purple-600 text-white border-none rounded shadow hover:bg-purple-700 transition-colors" title="Mark as Delivered">
                        Deliver
                      </button>
                    )}
                    {!ord.isBulk && statusText === 'Pending Verification' && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); handleUpdateBulkStatus(ord.dbId, 'Accepted', 'Accept this Web Order?'); }} className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold bg-purple-600 text-white border-none rounded shadow hover:bg-purple-700 transition-colors" title="Accept Order">
                          Accept
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleUpdateBulkStatus(ord.dbId, 'Rejected', 'Reject this Web Order?'); }} className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold bg-red-600 text-white border-none rounded shadow hover:bg-red-700 transition-colors" title="Reject Order">
                          Reject
                        </button>
                      </>
                    )}
                    {ord.isArchived ? (
                      <button onClick={(e) => { e.stopPropagation(); handleRestoreOrder(ord.dbId); }} className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold bg-amber-100 text-amber-800 border-none rounded shadow hover:bg-amber-200 transition-colors" title="Restore Order">
                        Restore
                      </button>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteOrder(ord.dbId); }} className="p-1.5 rounded-full hover:bg-red-50 text-red-500 transition-colors" title="Archive Order">
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button className="p-1 rounded-full hover:bg-gray-100 text-paa-navy font-bold flex items-center gap-1 text-[10px] uppercase tracking-wider" title="Toggle Details">
                      Details
                      <ChevronDown size={14} className={`transition-transform duration-200 ${expandedOrderId === ord.dbId ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Mobile Expanded Details */}
                {expandedOrderId === ord.dbId && (
                  <div className="mt-2 pt-4 border-t border-dashed border-gray-200 space-y-4 animate-fade-in-up">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-1">Shipping Details</p>
                      <p className="text-xs text-gray-500">{ord.customerEmail} • {ord.customerPhone}</p>
                      <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mb-2">{ord.address}</p>
                      {ord.items.some((it: any) => it.trackingNumber && it.trackingNumber !== 'N/A') && (
                        <div className="text-[11px] text-indigo-800 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                          <span className="font-bold block mb-1">Tracking Numbers:</span>
                          <ul className="space-y-1">
                            {ord.items.filter((it: any) => it.trackingNumber && it.trackingNumber !== 'N/A').map((it: any, idx: number) => (
                              <li key={idx}><strong>{it.title}:</strong> {it.trackingNumber}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Order Timeline</h5>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-gray-500 font-medium">Placed On</span>
                          <span className="font-bold text-paa-navy">{new Date(ord.date).toLocaleString('en-IN')}</span>
                        </div>
                        {ord.items.some((it: any) => it.acceptedAt) && (
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-500 font-medium">Accepted</span>
                            <span className="font-bold text-paa-navy">{new Date(Math.max(...ord.items.filter((it: any) => it.acceptedAt).map((it: any) => new Date(it.acceptedAt).getTime()))).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {ord.items.some((it: any) => it.dispatchedAt) && (
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-500 font-medium">Dispatched</span>
                            <span className="font-bold text-paa-navy">{new Date(Math.max(...ord.items.filter((it: any) => it.dispatchedAt).map((it: any) => new Date(it.dispatchedAt).getTime()))).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {ord.items.some((it: any) => it.deliveredAt) && (
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-500 font-medium">Delivered</span>
                            <span className="font-bold text-green-600">{new Date(Math.max(...ord.items.filter((it: any) => it.deliveredAt).map((it: any) => new Date(it.deliveredAt).getTime()))).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-2">Bill Summary</p>
                      <div className="flex justify-between text-gray-600"><span>Subtotal</span> <span className="font-semibold text-paa-navy">₹{ord.subtotal}</span></div>
                      <div className="flex justify-between text-gray-600"><span>Delivery</span> <span className="font-semibold text-paa-navy">₹{ord.deliveryCharges}</span></div>
                      {ord.bundleDiscount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span> <span className="font-semibold">-₹{ord.bundleDiscount}</span></div>}
                    </div>

                    {ord.isBulk && (
                      <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-2">Author Amount Split</p>
                        <div className="space-y-2 text-xs bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                          {Object.entries(
                            ord.items.reduce((acc: any, it: any) => {
                              const author = it.authorName || 'Unknown';
                              acc[author] = (acc[author] || 0) + ((it.qty || 1) * (it.mrp || 0));
                              return acc;
                            }, {})
                          ).map(([author, amount]: any, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="font-semibold text-paa-navy truncate max-w-[120px]">{author}</span>
                              <span className="font-bold text-indigo-700 bg-indigo-100/50 px-2 py-0.5 rounded border border-indigo-100">₹{amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {displayData.length === 0 && <div className="text-center py-8 text-sm text-gray-500 italic">No matching orders found.</div>}
        </div>
        {section.isBulkSection && section.data.length > 5 && (
          <div className="p-4 flex justify-center bg-gray-50 border-t border-gray-100 rounded-b-2xl">
            <button onClick={() => setShowAllBulkOrders(!showAllBulkOrders)} className="text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 px-6 py-2.5 rounded-full shadow-sm border border-indigo-100 flex items-center gap-2">
              {showAllBulkOrders ? 'Show Less Bulk Orders' : `View All Bulk Orders (${section.data.length})`}
            </button>
          </div>
        )}
      </div>
      );})}

        {ordersMeta?.totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">Showing page {ordersPage} of {ordersMeta.totalPages} (Total: {ordersMeta.total} orders)</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setOrdersPage(p => Math.max(1, p - 1)); setTimeout(fetchOrders, 0); }}
                disabled={ordersPage === 1}
                className="px-4 py-2 border border-gray-200 rounded text-sm text-paa-navy disabled:opacity-50 font-medium bg-white hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => { setOrdersPage(p => Math.min(ordersMeta.totalPages, p + 1)); setTimeout(fetchOrders, 0); }}
                disabled={ordersPage === ordersMeta.totalPages}
                className="px-4 py-2 border border-gray-200 rounded text-sm text-paa-navy disabled:opacity-50 font-medium bg-white hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

// Default export required for React.lazy()
export default WebOrdersTab;
