import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Users,
  Calendar as CalendarIcon,
  RefreshCw
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
  topParticipatingAuthors: Array<{
    name: string;
    percentage: number;
    participated: number;
    total: number;
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── 1. Top 20 by Participation (Full Width) ── */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div>
            <h3 className="text-base font-serif font-bold text-paa-navy flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" /> Top 20 by Participation
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Ranked by percentage of eligible events attended since joining the association.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200/60">
              Top 20 Authors
            </span>
            <button
              onClick={fetchData}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-paa-navy hover:bg-gray-50 transition-all"
              title="Refresh statistics"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="w-full h-[320px]">
          {data.topParticipatingAuthors && data.topParticipatingAuthors.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topParticipatingAuthors} margin={{ top: 10, right: 15, left: -10, bottom: 65 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  fontSize={10}
                  tick={{ fill: '#4B5563', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={75}
                />
                <YAxis
                  fontSize={10}
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

      {/* ── 2. Events Performance Overview Line Chart (Full Width) ── */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h4 className="font-serif font-bold text-base text-paa-navy flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-pink-600" />
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
