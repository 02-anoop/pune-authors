import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { TrendingUp, DollarSign, BookOpen, Activity, ChevronDown, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface PerformanceData {
  eventId: number;
  eventName: string;
  date: string;
  bookTitle: string;
  booksSold: number;
  revenue: number;
  investment: number;
}

const getBadgeColor = (title: string) => {
  if (title === 'Manual Aggregation' || title === 'No Sales Yet') return 'bg-gray-100 text-gray-700';
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-pink-100 text-pink-700',
    'bg-blue-100 text-blue-700',
    'bg-amber-100 text-amber-700',
    'bg-emerald-100 text-emerald-700',
    'bg-purple-100 text-purple-700',
    'bg-indigo-100 text-indigo-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700'
  ];
  return colors[Math.abs(hash) % colors.length];
};

const BookPerformance: React.FC = () => {
  const [data, setData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const token = () => localStorage.getItem('token');

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/author/book-performance`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      
      setData(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // KPIs Calculation
  const uniqueEvents = new Map<number, number>();
  const uniqueEventNames = new Map<number, string>();
  let totalRevenue = 0;
  
  // Data for the Graph
  const graphDataMap = new Map<string, any>();
  const allBookTitles = new Set<string>();

  // First pass: collect all unique channels and books
  data.forEach(row => {
    uniqueEvents.set(row.eventId, row.investment);
    uniqueEventNames.set(row.eventId, row.eventName);
    totalRevenue += row.revenue;

    if (!graphDataMap.has(row.eventName)) {
      graphDataMap.set(row.eventName, { name: row.eventName });
    }

    if (row.bookTitle !== 'No Sales Yet' && row.booksSold > 0) {
      allBookTitles.add(row.bookTitle);
    }
  });

  const uniqueBookTitlesArray = Array.from(allBookTitles);

  // Initialize all books to 0 for all channels to ensure continuous lines
  graphDataMap.forEach(channelObj => {
    uniqueBookTitlesArray.forEach(title => {
      channelObj[title] = 0;
    });
  });

  // Second pass: populate actual sales data
  data.forEach(row => {
    if (row.bookTitle !== 'No Sales Yet' && row.booksSold > 0) {
      const channelObj = graphDataMap.get(row.eventName);
      channelObj[row.bookTitle] += row.booksSold;
    }
  });

  const graphData = Array.from(graphDataMap.values());
  const bookColors = ['#16a34a', '#0284c7', '#9333ea', '#eab308', '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#ef4444', '#8b5cf6'];

  const totalFairs = uniqueEvents.size;
  let totalInvestment = 0;
  uniqueEvents.forEach(investment => {
    totalInvestment += investment;
  });

  const netROI = totalInvestment > 0 
    ? (((totalRevenue - totalInvestment) / totalInvestment) * 100).toFixed(2) 
    : '0.00';

  // Group data by book
  const groupedBooks = React.useMemo(() => {
    const map: Record<string, { title: string; totalSold: number; totalRev: number; events: PerformanceData[] }> = {};
    data.forEach(row => {
      if (!map[row.bookTitle]) {
        map[row.bookTitle] = { title: row.bookTitle, totalSold: 0, totalRev: 0, events: [] };
      }
      map[row.bookTitle].totalSold += row.booksSold;
      map[row.bookTitle].totalRev += row.revenue;
      map[row.bookTitle].events.push(row);
    });
    return Object.values(map).sort((a, b) => b.totalRev - a.totalRev);
  }, [data]);

  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>({});
  const toggleBook = (title: string) => {
    setExpandedBooks(prev => ({ ...prev, [title]: !prev[title] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up pb-20">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-serif text-paa-navy font-bold tracking-tight mb-2">Book Performance</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Analyze your ROI strictly by Book Title</p>
        </div>
      </div>

      {/* KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#2ecc71] rounded-2xl p-5 shadow-sm text-white flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={16} />
            <p className="text-xs font-bold uppercase tracking-widest">Sales Channels</p>
          </div>
          <h3 className="text-3xl font-black">{totalFairs}</h3>
        </div>
        
        <div className="bg-[#a55eea] rounded-2xl p-5 shadow-sm text-white flex flex-col justify-center relative group">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} />
            <p className="text-xs font-bold uppercase tracking-widest">Total Investment</p>
          </div>
          <h3 className="text-3xl font-black">₹{totalInvestment.toLocaleString()}</h3>
        </div>

        <div className="bg-[#4b7bec] rounded-2xl p-5 shadow-sm text-white flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} />
            <p className="text-xs font-bold uppercase tracking-widest">Total Revenue</p>
          </div>
          <h3 className="text-3xl font-black">₹{totalRevenue.toLocaleString()}</h3>
        </div>

        <div className={`rounded-2xl p-5 shadow-sm text-white flex flex-col justify-center ${parseFloat(netROI) >= 0 ? 'bg-[#20bf6b]' : 'bg-[#eb3b5a]'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} />
            <p className="text-xs font-bold uppercase tracking-widest">Net ROI</p>
          </div>
          <h3 className="text-3xl font-black">
            {parseFloat(netROI) > 0 && '+'}{netROI}%
          </h3>
        </div>
      </div>

      {/* Sales Channels Comparison Graph */}
      {graphData.length > 0 && (
        <div className="dash-panel p-6 mb-8 overflow-hidden">
          <div className="mb-4 border-b border-gray-100 pb-4">
            <h3 className="text-sm font-bold text-paa-navy uppercase tracking-widest">Sales Comparison by Channel</h3>
            <p className="text-[11px] text-gray-500 mt-1">Quantity of books sold across different Fairs and Web Orders</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', fontSize: '12px' }} 
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                {uniqueBookTitlesArray.map((title, idx) => (
                  <Line key={title} type="monotone" dataKey={title} stroke={bookColors[idx % bookColors.length]} strokeWidth={3} activeDot={{ r: 6 }} dot={{ strokeWidth: 2, r: 4 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* High-Contrast Vibrant Data Table */}
      <div className="dash-panel overflow-hidden mb-7">
        <div className="dash-panel-header">
          <h2 className="dash-panel-title">Book Performance Details</h2>
          <div className="flex items-center gap-4">
            <span className="dash-badge info">{groupedBooks.length} books</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="dash-table">
            <thead className="bg-indigo-50 border-b-2 border-indigo-100">
              <tr>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent text-left w-10"></th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent text-left">Book Title</th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent text-center">Channels Participated</th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent text-center">Total Units Sold</th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent text-right">Total Revenue (₹)</th>
              </tr>
            </thead>
            <tbody>
              {groupedBooks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-paa-gray-text italic text-sm">
                    No Book Fair performance data available.
                  </td>
                </tr>
              ) : (
                groupedBooks.map((group, index) => (
                  <React.Fragment key={group.title}>
                    <tr onClick={() => toggleBook(group.title)} className={`transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'}  cursor-pointer`}>
                      <td className="text-center text-indigo-600 pl-4">
                        {expandedBooks[group.title] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </td>
                      <td className="font-semibold text-paa-navy whitespace-normal py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-black uppercase tracking-wider ${getBadgeColor(group.title)}`}>
                          {group.title}
                        </span>
                      </td>
                      <td className="font-bold text-gray-700 text-center">
                        {group.events.length} Channels
                      </td>
                      <td className="font-bold text-indigo-600 text-center text-lg">
                        {group.totalSold}
                      </td>
                      <td className="font-black text-emerald-600 text-right text-xl pr-4">
                        ₹{group.totalRev.toLocaleString()}
                      </td>
                    </tr>
                    {expandedBooks[group.title] && (
                      <tr className="bg-indigo-50/30">
                        <td></td>
                        <td colSpan={4} className="p-0 border-b border-indigo-100">
                          <div className="py-4 pr-4 pl-0">
                            <table className="w-full text-sm rounded-lg overflow-hidden border border-indigo-100/50 bg-white">
                              <thead className="text-indigo-900 bg-indigo-50/50 text-[10px] uppercase tracking-widest border-b border-indigo-100/50">
                                <tr>
                                  <th className="text-left py-2 px-3 font-bold">Channel Name</th>
                                  <th className="text-center py-2 px-3 font-bold">Date</th>
                                  <th className="text-center py-2 px-3 font-bold">Units Sold</th>
                                  <th className="text-right py-2 px-3 font-bold">Revenue</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.events.map((ev, i) => (
                                  <tr key={i} className="border-b border-indigo-50 last:border-0 hover:bg-indigo-50/20 transition-colors">
                                    <td className="py-2.5 px-3 font-semibold text-gray-700">{ev.eventName}</td>
                                    <td className="py-2.5 px-3 text-center text-gray-500 font-medium">{ev.eventName === 'Web Orders' ? 'Ongoing' : new Date(ev.date).toLocaleDateString()}</td>
                                    <td className="py-2.5 px-3 text-center font-bold text-indigo-600">{ev.booksSold}</td>
                                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">₹{ev.revenue.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default BookPerformance;
