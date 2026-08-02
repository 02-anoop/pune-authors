import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Download, Activity, DollarSign, BookOpen, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

import { 
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, 
  Tooltip as RechartsTooltip, LabelList, PieChart as RechartsPieChart, Pie, Cell 
} from 'recharts';

export const SalesReportTab = ({ refreshTrigger }: { refreshTrigger?: number }) => {
  const [filterType, setFilterType] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonthValue, setSelectedMonthValue] = useState(new Date().toISOString().slice(0, 7));
  const [salesData, setSalesData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const prevStartDate = useRef('');
  const prevEndDate = useRef('');
  const hasLoadedInitialData = useRef(false);
  const [tableChannelFilter, setTableChannelFilter] = useState('All');
  const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (filterType === 'custom') return;
    const today = new Date();
    let end = new Date(today);
    let start = new Date(today);

    if (filterType === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (filterType === 'weekly') {
      start.setDate(today.getDate() - 7);
    } else if (filterType === 'monthly') {
      start.setDate(today.getDate() - 30);
    } else if (filterType === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (filterType === 'ytd') {
      start = new Date(today.getFullYear(), 0, 1);
    } else if (filterType === 'select_month') {
      if (selectedMonthValue) {
        const [yyyy, mm] = selectedMonthValue.split('-');
        start = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
        end = new Date(parseInt(yyyy), parseInt(mm), 0);
      } else {
        return;
      }
    } else if (filterType === 'lifetime') {
      start = new Date('2000-01-01');
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, [filterType, selectedMonthValue]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    let isMounted = true;

    const isDateChange = startDate !== prevStartDate.current || endDate !== prevEndDate.current;
    prevStartDate.current = startDate;
    prevEndDate.current = endDate;

    const fetchSalesData = async () => {
      const needsLoadingState = isDateChange || !hasLoadedInitialData.current;
      if (needsLoadingState) setIsLoading(true);
      try {
        const res = await axios.get(`${API}/api/admin/sales-report?startDate=${startDate}&endDate=${endDate}&filterType=${filterType}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (isMounted) {
          setSalesData(res.data);
          hasLoadedInitialData.current = true;
        }
      } catch (err) {
        if (isMounted && needsLoadingState) toast.error('Failed to load sales report');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchSalesData();
    return () => { isMounted = false; };
  }, [startDate, endDate, API, refreshTrigger]);

  const handleExport = async () => {
    if (!salesData?.tableData?.length) return;
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sales Report');
    
    // Add merged title row
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `SALES REPORT (${startDate} to ${endDate})`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2A4B6B' } }; // Deep Steel Blue
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;
    
    // Add headers (Bright Yellow with Black Text)
    const headers = ['Date', 'Order ID', 'Channel', 'Event', 'Author', 'Title', 'Quantity', 'Revenue'];
    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', bold: true, color: { argb: '000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Bright Yellow
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } }
      };
    });
    
    // Add data
    salesData.tableData.forEach((r: any) => {
      const rowData = [
        r.date,
        r.orderId,
        r.channel,
        r.event,
        r.author,
        r.title,
        r.qty,
        r.revenue
      ];
      const newRow = sheet.addRow(rowData);
      newRow.height = 20;

      newRow.eachCell((cell, colNumber) => {
        // Border (Thin Black)
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } }
        };

        cell.font = { name: 'Arial', size: 10, color: { argb: '000000' } };

        // Alignments
        if (colNumber === 1 || colNumber === 2) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 3 || colNumber === 4 || colNumber === 5) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (colNumber === 6) {
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        } else {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }

        // Column Background Colors
        let colBgColor = 'FFFFFF';
        if (colNumber === 1) colBgColor = 'FF8B8B'; // Solid light red
        else if (colNumber === 2) colBgColor = 'FFD2A3'; // Solid light orange
        else if (colNumber === 3) colBgColor = 'D4D8DD'; // Solid light gray/slate
        else if (colNumber === 4) colBgColor = 'FFDCA8'; // Solid light orange/peach
        else if (colNumber === 5) colBgColor = 'B3E5FC'; // Solid light cyan
        else if (colNumber === 6) colBgColor = 'C7D2FE'; // Solid light lavender
        else if (colNumber === 7) colBgColor = 'C8E6C9'; // Solid light green
        else if (colNumber === 8) colBgColor = 'E1BEE7'; // Solid light purple

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colBgColor } };
      });
    });
    
    // Auto-fit columns
    sheet.columns.forEach((column, colIndex) => {
      let maxLen = 10;
      column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber > 1 && cell.value) { // Skip title row
          const len = cell.value.toString().length;
          if (len > maxLen) maxLen = len;
        }
      });
      if (colIndex === 6) {
        column.width = Math.min(maxLen + 4, 30);
      } else {
        column.width = Math.min(maxLen + 4, 45);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `sales_report_${startDate}_to_${endDate}.xlsx`);
  };

  // Memoized filtered data to avoid recalculating on re-renders
  const filteredTableData = useMemo(() => {
    if (!salesData?.tableData) return [];
    return salesData.tableData.filter((r: any) => tableChannelFilter === 'All' || r.channel === tableChannelFilter);
  }, [salesData?.tableData, tableChannelFilter]);

  const channelCounts = useMemo(() => {
    if (!salesData?.tableData) return { All: 0, 'Web Orders': 0, 'Events': 0, 'Book Fairs': 0 };
    return {
      All: salesData.tableData.length,
      'Web Orders': salesData.tableData.filter((r: any) => r.channel === 'Web Orders').length,
      'Events': salesData.tableData.filter((r: any) => r.channel === 'Events').length,
      'Book Fairs': salesData.tableData.filter((r: any) => r.channel === 'Book Fairs').length,
    };
  }, [salesData?.tableData]);

  return (
    <div className="space-y-6">
      {/* Top Bar: Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h3 className="text-xl font-serif font-medium text-paa-navy mb-1 flex items-center gap-2">
            <Activity className="w-5 h-5 text-paa-gold" aria-hidden="true" /> Dynamic Sales Report
          </h3>
          <p className="text-xs text-gray-500 font-medium">Aggregate revenue data instantly across any date range.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <label htmlFor="filterType" className="sr-only">Date Range Filter</label>
          <select
            id="filterType"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs font-bold tracking-widest uppercase py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-paa-navy outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full sm:w-auto cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="weekly">Weekly (Last 7 Days)</option>
            <option value="monthly">Monthly (Last 30 Days)</option>
            <option value="this_month">This Month</option>
            <option value="ytd">Year to Date (YTD)</option>
            <option value="select_month">Specific Month</option>
            <option value="lifetime">Lifetime (All Time)</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {filterType === 'select_month' && (
            <div className="flex items-center gap-2 animate-fade-in">
              <label htmlFor="selectMonth" className="sr-only">Select Month</label>
              <input
                id="selectMonth"
                type="month"
                value={selectedMonthValue}
                onChange={(e) => setSelectedMonthValue(e.target.value)}
                className="text-xs font-bold tracking-widest uppercase py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-paa-navy outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
              />
            </div>
          )}

          {filterType === 'custom' && (
            <div className="flex items-center gap-2 animate-fade-in">
              <label htmlFor="startDate" className="sr-only">Start Date</label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold tracking-widest uppercase py-2 px-3 rounded-xl border border-gray-200 bg-white text-paa-navy outline-none focus:border-indigo-500"
              />
              <span className="text-gray-400 font-medium text-sm">to</span>
              <label htmlFor="endDate" className="sr-only">End Date</label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-bold tracking-widest uppercase py-2 px-3 rounded-xl border border-gray-200 bg-white text-paa-navy outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <button 
            onClick={handleExport} 
            disabled={!salesData?.tableData?.length || isLoading} 
            aria-label="Export Excel Sales Report"
            className="flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Download size={14} aria-hidden="true" /> Export Excel
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[140px] bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="h-8 w-8 bg-gray-100 animate-pulse rounded-lg"></div>
                </div>
                <div>
                  <div className="h-3 w-20 bg-gray-100 animate-pulse rounded mb-2"></div>
                  <div className="h-8 w-32 bg-gray-200 animate-pulse rounded"></div>
                </div>
                <div className="h-4 w-full bg-gray-50 animate-pulse rounded mt-2"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-[300px] bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col">
              <div className="h-4 w-40 bg-gray-200 animate-pulse rounded mb-6"></div>
              <div className="flex-1 w-full bg-gray-50 animate-pulse rounded-xl"></div>
            </div>
            <div className="h-[300px] bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col">
              <div className="h-4 w-32 bg-gray-200 animate-pulse rounded mb-2"></div>
              <div className="h-2 w-48 bg-gray-100 animate-pulse rounded mb-6"></div>
              <div className="flex-1 w-full bg-gray-50 animate-pulse rounded-full mx-10 my-4"></div>
              <div className="h-4 w-48 bg-gray-100 animate-pulse rounded mx-auto mt-4"></div>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden min-h-[200px]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-8 w-64 bg-gray-200 animate-pulse rounded-lg"></div>
            </div>
            <div className="p-5 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 w-full bg-gray-50 animate-pulse rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Row 1: KPI Summary Cards - rendered eagerly for LCP */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            <div className="dash-kpi-card green flex flex-col justify-between" style={{ contentVisibility: 'auto', containIntrinsicSize: '140px' }}>
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="dash-kpi-icon green"><DollarSign className="w-5 h-5" aria-hidden="true" /></div>
                </div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-paa-gray-text mb-1">Total Revenue</p>
                <h3 className="text-3xl font-black text-paa-navy tracking-tight">₹{(salesData?.kpis?.totalRevenue || 0).toLocaleString()}</h3>
              </div>
              {salesData?.kpis?.splits && (
                <div className="mt-4 pt-3 border-t border-green-100/50 flex justify-between text-[10px] font-bold uppercase tracking-widest text-green-800">
                  <span>Web: ₹{(salesData.kpis.splits.web?.revenue || 0).toLocaleString()}</span>
                  <span>Events: ₹{(salesData.kpis.splits.events?.revenue || 0).toLocaleString()}</span>
                  <span>Fairs: ₹{(salesData.kpis.splits.bookFairs?.revenue || 0).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="dash-kpi-card blue flex flex-col justify-between" style={{ contentVisibility: 'auto', containIntrinsicSize: '140px' }}>
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="dash-kpi-icon blue"><BookOpen className="w-5 h-5" aria-hidden="true" /></div>
                </div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-paa-gray-text mb-1">Total Books Sold</p>
                <h3 className="text-3xl font-black text-paa-navy tracking-tight">{salesData?.kpis?.totalBooksSold || 0} <span className="text-xs font-medium text-gray-400 lowercase tracking-normal">units</span></h3>
              </div>
              {salesData?.kpis?.splits && (
                <div className="mt-4 pt-3 border-t border-blue-100/50 flex justify-between text-[10px] font-bold uppercase tracking-widest text-blue-800">
                  <span>Web: {salesData.kpis.splits.web?.books || 0}</span>
                  <span>Events: {salesData.kpis.splits.events?.books || 0}</span>
                  <span>Fairs: {salesData.kpis.splits.bookFairs?.books || 0}</span>
                </div>
              )}
            </div>

            <div className="dash-kpi-card amber flex flex-col justify-between" style={{ contentVisibility: 'auto', containIntrinsicSize: '140px' }}>
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="dash-kpi-icon amber"><ShoppingCart className="w-5 h-5" aria-hidden="true" /></div>
                </div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-paa-gray-text mb-1">Total Orders</p>
                <h3 className="text-3xl font-black text-paa-navy tracking-tight">{salesData?.kpis?.totalOrders || 0}</h3>
              </div>
              {salesData?.kpis?.splits && (
                <div className="mt-4 pt-3 border-t border-amber-100/50 flex justify-between text-[10px] font-bold uppercase tracking-widest text-amber-800">
                  <span>Web: {salesData.kpis.splits.web?.orders || 0}</span>
                  <span>Events: {salesData.kpis.splits.events?.orders || 0}</span>
                  <span>Fairs: {salesData.kpis.splits.bookFairs?.orders || 0}</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Visualizations - Recharts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative min-h-[300px]">
              <div className="lg:col-span-2 border border-paa-navy/5 p-5 md:p-6 rounded-2xl bg-white shadow-sm flex flex-col">
                <h4 className="text-xs font-bold text-paa-navy uppercase tracking-widest mb-6">Revenue Over Time</h4>
                <div className="flex-1 w-full min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesData?.chartData || []} margin={{ top: 35, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        fontSize={10}
                        tick={{ fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        tickMargin={15}
                        minTickGap={20}
                        tickFormatter={(val) => {
                          if (typeof val === 'string' && val.length === 7) {
                            const [y, m] = val.split('-');
                            const d = new Date(parseInt(y), parseInt(m) - 1, 1);
                            return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
                          }
                          const d = new Date(val);
                          return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                        }}
                      />
                      <YAxis fontSize={10} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} width={60} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px' }}
                        itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                        labelStyle={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}
                        formatter={(value: number) => [`₹${value}`, 'Revenue']}
                        labelFormatter={(val) => {
                          if (typeof val === 'string' && val.length === 7) {
                            const [y, m] = val.split('-');
                            const d = new Date(parseInt(y), parseInt(m) - 1, 1);
                            return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                          }
                          const d = new Date(val as string);
                          return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        }}
                      />
                      <Line type="linear" dataKey="revenue" stroke="#06b6d4" strokeWidth={3} dot={(props: any) => { const { cx, cy, index } = props; const total = (salesData?.chartData || []).length; const maxLabels = typeof window !== 'undefined' && window.innerWidth < 768 ? 6 : 15; if (total <= maxLabels || index % Math.ceil(total / maxLabels) === 0 || index === total - 1) { return <circle cx={cx} cy={cy} r={4} fill="#fff" stroke="#06b6d4" strokeWidth={2} key={`dot-${index}`} />; } return null; }} activeDot={{ r: 6 }}>
                        <LabelList dataKey="revenue" position="top" content={(props: any) => {
                          const { x, y, value, index } = props;
                          const data = salesData?.chartData || [];
                          const total = data.length;
                          const maxLabels = typeof window !== 'undefined' && window.innerWidth < 768 ? 6 : 15;
                          if (total <= maxLabels || index % Math.ceil(total / maxLabels) === 0 || index === total - 1) {

                            const prev = data[index - 1]?.revenue;
                            const next = data[index + 1]?.revenue;

                            // Default above
                            let yPos = y - 12;

                            // If it's a valley, place below so the line doesn't cut through
                            if (prev !== undefined && next !== undefined && value <= prev && value <= next) {
                              yPos = y + 20;
                            } else if (prev !== undefined && value < prev && next === undefined) {
                              yPos = y + 20;
                            }

                            return (
                              <g>
                                <text x={x} y={yPos} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" fontSize="10px" fontWeight="bold" textAnchor="middle">₹{value}</text>
                                <text x={x} y={yPos} fill="#06b6d4" fontSize="10px" fontWeight="bold" textAnchor="middle">₹{value}</text>
                              </g>
                            );
                          }
                          return null;
                        }} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-paa-navy/5 p-5 md:p-6 rounded-2xl bg-white shadow-sm flex flex-col">
                <h4 className="text-xs font-bold text-paa-navy uppercase tracking-widest mb-2">Sales by Channel</h4>
                <p className="text-[10px] text-gray-400 mb-6 font-medium">Includes Legacy Archive & Airport Libraries</p>
                <div className="flex-1 w-full min-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={salesData?.channelData || []}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value"
                      >
                        {(salesData?.channelData || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.name === 'Web Orders' ? '#3b82f6' : entry.name === 'Events' ? '#f59e0b' : '#10b981'} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4 flex-wrap">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" aria-hidden="true"></div><span className="text-xs text-gray-600 font-bold tracking-wide uppercase">Web</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ebd8c0] shadow-sm" aria-hidden="true"></div><span className="text-xs text-gray-600 font-bold tracking-wide uppercase">Fairs</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" aria-hidden="true"></div><span className="text-xs text-gray-600 font-bold tracking-wide uppercase">Events</span></div>
                </div>
              </div>
            </div>

          {/* Row 3: Granular Data Table */}
          <div className="bg-white border border-paa-navy/5 rounded-2xl shadow-sm overflow-hidden relative min-h-[200px]" style={{ contentVisibility: 'auto' }}>
            <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
              <h4 className="text-xs font-bold text-paa-navy uppercase tracking-widest">Raw Sales Data</h4>
              <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Channel Filters">
                {(['All', 'Web Orders', 'Events', 'Book Fairs'] as const).map(ch => {
                  const tabCount = channelCounts[ch];
                  return (
                    <button
                      key={ch}
                      onClick={() => setTableChannelFilter(ch)}
                      aria-pressed={tableChannelFilter === ch}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5 ${tableChannelFilter === ch ? 'bg-paa-navy text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
                    >
                      {ch === 'Book Fairs' ? 'Fairs' : ch} <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tableChannelFilter === ch ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{tabCount}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="dash-table w-full text-left min-w-[950px]">
                <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                  <tr>
                    <th className="w-[5%] px-5 py-3 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100">S.No</th>
                    <th className="w-[12%] px-5 py-3 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100">Date</th>
                    <th className="w-[15%] px-5 py-3 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100">Order ID</th>
                    <th className="w-[12%] px-5 py-3 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100">Channel</th>
                    <th className="w-[20%] px-5 py-3 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100">Author</th>
                    <th className="w-[25%] px-5 py-3 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100">Book Title</th>
                    <th className="w-[8%] px-5 py-3 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100 text-right">Qty</th>
                    <th className="w-[10%] px-5 py-3 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100 text-right">Rev (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {!isLoading && filteredTableData.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-10 text-sm text-gray-400 font-medium italic">No sales recorded in this period for the selected filter.</td></tr>
                  )}
                  {filteredTableData.map((row: any, idx: number) => (
                    <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'} hover:bg-slate-200/60 transition-colors`}>
                      <td className="px-5 py-3 text-xs font-bold text-paa-gray-text">{idx + 1}</td>
                      <td className="px-5 py-3 text-xs font-semibold text-paa-navy truncate">{row.date}</td>
                      <td className="px-5 py-3 text-xs text-gray-500 font-mono truncate">{row.orderId}</td>
                      <td className="px-5 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${row.channel === 'Web Orders' ? 'bg-[#ebd8c0] text-blue-800 border-transparent shadow-sm' : row.channel === 'Events' ? 'bg-amber-100 text-amber-800 border-transparent shadow-sm' : 'bg-green-100 text-green-800 border-transparent shadow-sm'}`}>
                          {row.channel === 'Web Orders' ? 'Web' : row.channel === 'Events' ? 'Events' : 'Fairs'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs font-semibold text-paa-navy truncate pr-2" title={row.author}>{row.author}</td>
                      <td className="px-5 py-3 pr-2 text-xs text-paa-navy truncate" title={row.title}>{row.title}</td>
                      <td className="px-5 py-3 text-xs font-bold text-paa-navy text-right">{row.qty}</td>
                      <td className="px-5 py-3 text-xs font-black text-indigo-600 text-right">₹{row.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
