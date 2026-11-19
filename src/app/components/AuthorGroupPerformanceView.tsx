import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Users,
  BookOpen,
  Store,
  Calendar as CalendarIcon,
  Plane,
  Library,
  TrendingUp,
  Clock,
  Package,
  ShoppingCart,
  BarChart2,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  LabelList
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

interface GroupAnalyticsData {
  kpis: {
    totalAuthors: number;
    totalBooks: number;
    totalBookFairs: number;
    totalLiteraryEvents: number;
    totalAirportLibraries: number;
    totalOtherLibraries: number;
    totalRevenue: number;
    delayedOrdersRate: number;
    pendingOrdersCount: number;
    totalBooksSold: number;
  };
  topParticipatingAuthors: Array<{
    name: string;
    percentage: number;
    participated: number;
    total: number;
  }>;
  categoryChartData: Array<{
    name: string;
    sales: number;
  }>;
  eventsChartData: Array<{
    id: number;
    name: string;
    date: string;
    eventType: string;
    category: string;
    booksSold: number;
    revenue: number;
  }>;
}

export const AuthorGroupPerformanceView: React.FC = () => {
  const [data, setData] = useState<GroupAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Line chart filters
  const [eventYearFilter, setEventYearFilter] = useState<string>('2026');
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>('All');
  const [showBooksSold, setShowBooksSold] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/author/group-analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err: any) {
      console.error('Error fetching group analytics:', err);
      setError(err.response?.data?.error || 'Failed to load group performance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter events for line chart
  const availableYears = useMemo(() => {
    if (!data?.eventsChartData) return ['2026'];
    const years = new Set<string>();
    data.eventsChartData.forEach(evt => {
      if (evt.date) {
        const y = new Date(evt.date).getFullYear();
        if (!isNaN(y)) years.add(String(y));
      }
    });
    const sorted = Array.from(years).sort().reverse();
    return sorted.length > 0 ? sorted : ['2026'];
  }, [data]);

  const filteredEvents = useMemo(() => {
    if (!data?.eventsChartData) return [];
    return data.eventsChartData.filter(evt => {
      // Year filter
      if (eventYearFilter !== 'All') {
        const evtYear = evt.date ? String(new Date(evt.date).getFullYear()) : '';
        if (evtYear && evtYear !== eventYearFilter) return false;
      }
      // Category / Type filter
      if (eventCategoryFilter !== 'All') {
        const matchFormat = evt.eventType === eventCategoryFilter;
        const matchCategory = evt.category === eventCategoryFilter;
        if (!matchFormat && !matchCategory) return false;
      }
      return true;
    });
  }, [data, eventYearFilter, eventCategoryFilter]);

  const dateRangeString = useMemo(() => {
    if (eventYearFilter === 'All') return 'All Time';
    return `Jan ${eventYearFilter} - Dec ${eventYearFilter}`;
  }, [eventYearFilter]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center py-20 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-paa-navy animate-spin" />
        <p className="text-sm font-semibold text-gray-600">Loading association performance metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-red-100 shadow-sm text-center py-16 flex flex-col items-center justify-center gap-3">
        <p className="text-sm font-semibold text-red-600">{error || 'Unable to load performance data.'}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-paa-navy text-white text-xs font-bold rounded-lg hover:bg-opacity-90 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try Again
        </button>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Authors', value: data.kpis.totalAuthors, icon: Users, bg: '#3b82f6' },
    { label: 'Books Listed', value: data.kpis.totalBooks, icon: BookOpen, bg: '#22c55e' },
    { label: 'Book Fairs', value: data.kpis.totalBookFairs, icon: Store, bg: '#f97316' },
    { label: 'Literary Events', value: data.kpis.totalLiteraryEvents, icon: CalendarIcon, bg: '#a855f7' },
    { label: 'Airport Flybrary', value: data.kpis.totalAirportLibraries, icon: Plane, bg: '#06b6d4' },
    { label: 'Other Libraries', value: data.kpis.totalOtherLibraries, icon: Library, bg: '#14b8a6' },
    { label: 'Total Revenue', value: `₹${(data.kpis.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, bg: '#ef4444' },
    { label: 'Orders Delayed', value: `${data.kpis.delayedOrdersRate}%`, icon: Clock, bg: '#f59e0b' },
    { label: 'Pending Orders', value: data.kpis.pendingOrdersCount, icon: Package, bg: '#10b981' },
    { label: 'Books Sold', value: (data.kpis.totalBooksSold || 0).toLocaleString(), icon: ShoppingCart, bg: '#8b5cf6' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Group Performance Banner ── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-sm">
              Community Intelligence
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-serif font-bold tracking-tight text-white mt-1">
            Pune Authors' Association — Performance Overview
          </h2>
          <p className="text-xs text-blue-200 mt-1 max-w-2xl font-medium">
            Collective metrics, participation leaderboard, and sales volume across all literary events, book fairs, and libraries.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-all shrink-0 border border-white/15"
          title="Refresh statistics"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Stats
        </button>
      </div>

      {/* ── 10 Colorful KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="rounded-xl p-3 shadow-xs flex flex-col gap-1 transition-all hover:scale-[1.02]"
            style={{ background: kpi.bg }}
          >
            <kpi.icon className="w-4 h-4 text-white/90 shrink-0" />
            <h3 className="text-base xl:text-lg font-black text-white leading-none tracking-tight truncate">
              {kpi.value}
            </h3>
            <p className="text-[9px] xl:text-[10px] font-bold uppercase tracking-wide text-white/90 leading-tight truncate">
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Row 1: Top 20 by Participation & Popular by Category ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top 20 by Participation (2/3) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-serif font-bold text-paa-navy flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" /> Top 20 by Participation
            </h3>
            <span className="text-[11px] text-gray-500 font-medium hidden sm:inline">
              Ranked by % of eligible events attended
            </span>
          </div>
          <div className="w-full h-[280px]">
            {data.topParticipatingAuthors && data.topParticipatingAuthors.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topParticipatingAuthors} margin={{ top: 10, right: 10, left: -10, bottom: 65 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    fontSize={9}
                    tick={{ fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={70}
                  />
                  <YAxis
                    fontSize={9}
                    tick={{ fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                    formatter={(value: any, _name: any, props: any) => [
                      `${value}% (${props.payload.participated}/${props.payload.total} events)`,
                      'Participation'
                    ]}
                  />
                  <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                    {data.topParticipatingAuthors.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                No participation data available.
              </div>
            )}
          </div>
        </div>

        {/* Popular by Category (1/3) */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-serif font-bold text-paa-navy flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" /> Popular by Category
            </h3>
          </div>
          <div className="w-full h-[280px]">
            {data.categoryChartData && data.categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.categoryChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                  <XAxis type="number" fontSize={9} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    fontSize={10}
                    tick={{ fill: '#4B5563', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <RechartsTooltip
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '11px' }}
                    formatter={(value: any) => [`${value} books`, 'Books Sold / Listed']}
                  />
                  <Bar dataKey="sales" radius={[0, 4, 4, 0]} name="Books">
                    {data.categoryChartData.map((_entry, index) => (
                      <Cell key={`cat-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                No category data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: Events Performance Overview Line Chart ── */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h4 className="font-serif font-bold text-base text-paa-navy flex items-center gap-2">
              Events Performance Overview{' '}
              <span className="text-gray-500 font-sans font-normal text-xs tracking-wide">
                ({dateRangeString})
              </span>
            </h4>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Comparing book sales and author participation across all events.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            <select
              className="border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-paa-navy text-gray-700 bg-gray-50 text-xs font-semibold"
              value={eventYearFilter}
              onChange={(e) => setEventYearFilter(e.target.value)}
            >
              <option value="All">All Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              className="border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-paa-navy text-gray-700 bg-gray-50 text-xs font-semibold"
              value={eventCategoryFilter}
              onChange={(e) => setEventCategoryFilter(e.target.value)}
            >
              <option value="All">All types of event</option>
              <optgroup label="── By Format ──">
                <option value="Meet the Authors">Meet the Authors</option>
                <option value="Stall">Stall</option>
                <option value="Book Fair">Book Fair</option>
              </optgroup>
              <optgroup label="── By Category ──">
                <option value="Housing Society">Housing Society</option>
                <option value="School">School</option>
                <option value="Corporate Office">Corporate Office</option>
                <option value="College">College</option>
                <option value="University">University</option>
              </optgroup>
            </select>

            <div className="w-px h-6 bg-gray-200 hidden md:block"></div>

            <button
              type="button"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                showBooksSold ? 'bg-pink-50 text-pink-700 font-bold border border-pink-200' : 'text-gray-400 opacity-60'
              }`}
              onClick={() => setShowBooksSold(!showBooksSold)}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#ec4899]"></div>
              <span>Books Sold</span>
            </button>
          </div>
        </div>

        <div className="h-[380px] w-full">
          {filteredEvents.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredEvents}
                margin={{ top: 25, right: 15, left: -10, bottom: 85 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#6B7280' }}
                  angle={-45}
                  textAnchor="end"
                  dy={10}
                  interval={0}
                  height={80}
                  tickFormatter={(v: any) => (v && v.length > 18 ? v.substring(0, 18) + '...' : v || '')}
                />
                <YAxis
                  orientation="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                />
                <RechartsTooltip
                  cursor={{ stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '3 3' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px'
                  }}
                  formatter={(value: any, name: string) => [
                    `${value} ${name === 'Books Sold' ? 'copies' : ''}`,
                    name
                  ]}
                  labelFormatter={(label: any) => `Event: ${label}`}
                />
                {showBooksSold && (
                  <Line
                    type="linear"
                    dataKey="booksSold"
                    name="Books Sold"
                    stroke="#ec4899"
                    strokeWidth={2.5}
                    dot={(props: any) => {
                      const { cx, cy, index } = props;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={3.5}
                          fill="#ec4899"
                          stroke="#fff"
                          strokeWidth={1.5}
                          key={`dot-${index}`}
                        />
                      );
                    }}
                    activeDot={{ r: 6 }}
                  >
                    <LabelList
                      dataKey="booksSold"
                      position="top"
                      content={(props: any) => {
                        const { x, y, value } = props;
                        if (value === undefined || value === 0) return null;
                        return (
                          <text
                            x={x}
                            y={y - 8}
                            fill="#831843"
                            fontSize={9}
                            fontWeight={700}
                            textAnchor="middle"
                          >
                            {value}
                          </text>
                        );
                      }}
                    />
                  </Line>
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs">
              No events found matching the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
