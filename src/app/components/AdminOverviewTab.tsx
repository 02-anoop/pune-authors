
import React, { useState, useMemo } from 'react';
import { Users, Activity, ShoppingCart, BookOpen, Calendar as CalendarIcon, Library, TrendingUp, Eye, PieChart, BarChart2, AlertCircle, Package, Bell, X, MessageSquare, Edit, CheckCircle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, LabelList } from 'recharts';
import axios from 'axios';
import { toast } from 'sonner';
import { getAuthorParticipationStats } from './OperationsDashboardPage';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const AdminOverviewTab = React.memo(({ refreshTrigger, books, authors, orders, events, stats, prevQueries, lastAdminVisit, setActiveTab, setAuthorStatusFilter, API }: any) => {

    const [localDismissed, setLocalDismissed] = useState<string[]>(() => {
      const saved = localStorage.getItem('paa_dismissed_actions');
      return saved ? JSON.parse(saved) : [];
    });
    const [notifiedBooks, setNotifiedBooks] = useState<Record<string, { inv: number, time: number }>>(() => {
      const saved = localStorage.getItem('paa_notified_lowstock_v2');
      return saved ? JSON.parse(saved) : {};
    });

    const handleDismiss = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setLocalDismissed(prev => {
        const next = [...prev, id];
        localStorage.setItem('paa_dismissed_actions', JSON.stringify(next));
        return next;
      });
    };

    
    // Memoize heavy calculations to prevent layout thrashing and high main-thread execution time
    const { 
      lowStockBooks, pendingAuthors, pendingEdits, pendingEvents, newWebOrders, pendingBulkOrders, recentDispatchedOrders, recentDeliveredOrders, pendingQueries, pendingFines,
      orderCompletionRate, avgParticipation, participationChartData, latestEventRate, categoryChartData,
      orderStatusData, topAuthorsData, topBooksData, revenueTrendData, totalBooksSoldWeb, totalRevenueWeb,
      completedOrders
    } = useMemo(() => {
// Low stock books (threshold < 15)
    // Exclude if inventory is same AND notified within 24 hours.
    const lowStockBooks = books.filter((b: any) => {
      const inv = b.inventory || 0;
      const id = b.id || b.dbId;
      if (inv >= 15 || b.status !== 'Approved') return false;
      if (localDismissed.includes(`lowstock_${id}`)) return false;
      const notified = notifiedBooks[id];
      if (notified) {
        if (notified.inv !== inv) return true;
        if (Date.now() - notified.time > 24 * 60 * 60 * 1000) return true;
        return false;
      }
      return true;
    });



    const getAggregateStatusText = (ord: any) => {
      const { status: ordStatus, items } = ord;
      if (ordStatus === 'Cancelled') return 'Cancelled';
      if (ordStatus === 'Payment Not Received') return 'Payment Failed';
      if (items && items.length > 0) {
        if (items.every((it: any) => it.status === 'Completed' || it.status === 'Delivered')) return 'Delivered';
        if (items.some((it: any) => it.status === 'Dispatched' || it.status === 'Completed' || it.status === 'Delivered')) return 'Dispatched';
        if (items.some((it: any) => it.status === 'Accepted')) return 'Accepted';
        if (items.some((it: any) => it.status === 'Rejected')) return 'Rejected';
      }
      if (ord.isBulk) {
        if (ordStatus === 'Bulk Request Pending') return 'Bulk Req Pending';
        if (ordStatus === 'Approved - Pending Payment') return 'Pending Payment';
        if (ordStatus === 'Payment Verified') return 'Payment Verified';
        if (ordStatus === 'Dispatched') return 'Dispatched';
        if (ordStatus === 'Delivered' || ordStatus === 'Completed') return 'Delivered';
      }
      if (ordStatus === 'Pending Verification' || ordStatus === 'Pending') return 'Pending Verification';
      return ordStatus || 'Pending';
    };

    const pendingAuthors = authors.filter((a: any) => a.status === 'Pending').length;
    const pendingEdits = authors.filter((a: any) => { const ed = typeof a.extraData === 'string' ? (() => { try { return JSON.parse(a.extraData) } catch(e) { return {} } })() : (a.extraData || {}); return a.status === 'Edited' || ed?.hasPendingEdits; }).length;
    const pendingEvents = authors.filter((a: any) => a.eventParticipation && a.eventParticipation.length > 0 && a.eventParticipation.some((e: any) => e.status === 'Pending Approval')).length;
    
    const newWebOrders = orders.filter((o: any) => !o.isArchived && !o.isBulk && ['Pending Verification', 'Pending'].includes(getAggregateStatusText(o))).length;
    const pendingBulkOrders = orders.filter((o: any) => !o.isArchived && o.isBulk && ['Bulk Req Pending', 'Pending Payment'].includes(getAggregateStatusText(o))).length;
    
    const recentDispatchedOrders = lastAdminVisit ? orders.filter((o: any) => !o.isArchived && o.items?.some((it: any) => it.dispatchedAt && new Date(it.dispatchedAt).getTime() > lastAdminVisit)).length : 0;
    const recentDeliveredOrders = lastAdminVisit ? orders.filter((o: any) => !o.isArchived && o.items?.some((it: any) => it.deliveredAt && new Date(it.deliveredAt).getTime() > lastAdminVisit)).length : 0;
    const pendingQueries = prevQueries || 0;
    const pendingFines = authors.filter((a: any) => { 
        const ed = typeof a.extraData === 'string' ? (() => { try { return JSON.parse(a.extraData) } catch(e) { return {} } })() : (a.extraData || {}); 
        return (ed?.fineStatus === 'Pending Verification' || (!ed?.fineStatus && ed?.finePaymentScreenshot)) && ed?.finePaymentScreenshot; 
    }).length;

    const totalOrders = orders.length;
    const completedOrders = orders.filter((o: any) => o.status === 'Completed' || o.status === 'Dispatched').length;
    const orderCompletionRate = totalOrders ? Math.round((completedOrders / totalOrders) * 100) : 0;

    let totalPercentage = 0;
    const participationBuckets = { '0-25%': 0, '26-50%': 0, '51-75%': 0, '76-100%': 0 };
    authors.forEach((a: any) => {
      const stats = getAuthorParticipationStats(a, events);
      totalPercentage += stats.percentage;
      if (stats.percentage <= 25) participationBuckets['0-25%']++;
      else if (stats.percentage <= 50) participationBuckets['26-50%']++;
      else if (stats.percentage <= 75) participationBuckets['51-75%']++;
      else participationBuckets['76-100%']++;
    });
    const avgParticipation = authors.length ? Math.round(totalPercentage / authors.length) : 0;
    const participationChartData = Object.entries(participationBuckets).map(([name, value]) => ({ name, value }));

    const totalAuthorsCount = authors.length;

    const sortedEventsForAdoption = [...events].sort((a: any, b: any) => new Date(b.date || b.startDate).getTime() - new Date(a.date || a.startDate).getTime());
    const last3Events = sortedEventsForAdoption.slice(0, 3).map(ev => {
      let p = 0;
      if (ev.registrations) p = ev.registrations.filter((r: any) => r.optInStatus === 'Registered').length;
      else p = authors.filter((a: any) => a.eventParticipation?.some((ep: any) => ep.eventId === ev.id && (ep.status === 'Approved' || ep.optInStatus === 'Registered'))).length;
      return { name: ev.name || ev.title, rate: totalAuthorsCount ? Math.round((p / totalAuthorsCount) * 100) : 0 };
    });
    const latestEventRate = last3Events.length > 0 ? last3Events[0].rate : 0;

    const categoryChartData = (stats?.salesByGenre || [])
      .filter((g: any) => g.name !== 'Others' && g.name !== 'Uncategorized' && g.name !== 'N/A' && g.name !== 'Unknown')
      .map((g: any) => ({ name: g.name, sales: g.units }))
      .slice(0, 6);

    // Chart Data 2: Order Status
    const orderStatusMap: Record<string, number> = {};
    orders.forEach((o: any) => {
      const s = o.status || 'Pending';
      orderStatusMap[s] = (orderStatusMap[s] || 0) + 1;
    });
    const orderStatusData = Object.entries(orderStatusMap).map(([name, value]) => ({ name, value }));

    // Chart Data 3: Top Authors and Books
    const topAuthorsData = (stats?.salesByAuthor || [])
      .map((a: any) => ({ name: a.name, sales: a.units }))
      .slice(0, 5);

    const topBooksData = (stats?.topSellingBooks || [])
      .map((b: any) => ({ name: b.title, sales: b.units }))
      .slice(0, 5);

    // Chart Data 4: Revenue Trend
    const revenueTrendMap: Record<string, number> = {};
    orders.forEach((o: any) => {
      if (o.status === 'Completed' || o.status === 'Dispatched') {
        const d = o.date || 'Unknown';
        if (d !== 'Unknown') {
          revenueTrendMap[d] = (revenueTrendMap[d] || 0) + (o.total || 0);
        }
      }
    });
    const uniqueDates = Array.from(new Set<string>(orders.filter((o: any) => o.date).map((o: any) => o.date)));
    const recentDates = uniqueDates.slice(0, 7).reverse();
    const revenueTrendData = recentDates.map(d => ({ date: d, revenue: revenueTrendMap[d] || 0 }));

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    const totalBooksSoldWeb = (stats?.globalSuccessfulOrders || 0) + (stats?.globalPendingOrders || 0);
    const totalRevenueWeb = orders.reduce((sum: number, o: any) => (o.status === 'Completed' || o.status === 'Dispatched') ? sum + (o.total || 0) : sum, 0);
    const avgOrderValue = completedOrders > 0 ? Math.round(totalRevenueWeb / completedOrders) : 0;

    
      return {
        lowStockBooks, pendingAuthors, pendingEdits, pendingEvents, newWebOrders, pendingBulkOrders, recentDispatchedOrders, recentDeliveredOrders, pendingQueries: prevQueries, pendingFines,
        orderCompletionRate, avgParticipation, participationChartData, latestEventRate, categoryChartData,
        orderStatusData, topAuthorsData, topBooksData, revenueTrendData, totalBooksSoldWeb, totalRevenueWeb,
        completedOrders: orders.filter((o: any) => o.status === 'Completed' || o.status === 'Dispatched').length
      };
    }, [books, authors, orders, events, stats, localDismissed, notifiedBooks, prevQueries, lastAdminVisit]);

    const handleNotifyAllLowStock = async () => {
      setNotifiedBooks((prev: any) => {
        const next = { ...prev };
        lowStockBooks.forEach((b: any) => {
          next[b.id || b.dbId] = { inv: b.inventory || 0, time: Date.now() };
        });
        localStorage.setItem('paa_notified_lowstock_v2', JSON.stringify(next));
        return next;
      });
      toast.success(`Notified ${lowStockBooks.length} authors about low stock!`);

      for (const b of lowStockBooks) {
        try {
          await axios.post(`${API}/api/admin/authors/${b.authorId}/notify-low-stock`, { bookId: b.id || b.dbId, title: b.title }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        } catch (e) { }
      }
    };

    const handleNotifySingleBook = async (b: any) => {
      const id = b.id || b.dbId;
      const currentInventory = b.inventory || 0;
      setNotifiedBooks((prev: any) => {
        const next = { ...prev, [id]: { inv: currentInventory, time: Date.now() } };
        localStorage.setItem('paa_notified_lowstock_v2', JSON.stringify(next));
        return next;
      });
      toast.success('Author notified about low stock!');
      try {
        await axios.post(`${API}/api/admin/authors/${b.authorId}/notify-low-stock`, { bookId: id, title: b.title }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      } catch (e) { }
    };
const insights = [
      { label: 'Event Participation', value: `${avgParticipation}%`, desc: 'Avg author participation rate', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { label: 'Order Completion', value: `${orderCompletionRate}%`, desc: 'Of all web orders', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Web Orders Received', value: totalBooksSoldWeb, desc: 'Total web orders received online', icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    const pendingActionItems = [
      { id: 'authors', show: !localDismissed.includes('authors') && pendingAuthors > 0, icon: Users, color: 'bg-blue-50 text-blue-600 border-blue-200', label: 'Approve New Authors', count: pendingAuthors, unit: 'waiting', tab: 'authors', filter: null },
      { id: 'edits', show: !localDismissed.includes('edits') && pendingEdits > 0, icon: Edit, color: 'bg-orange-50 text-orange-600 border-orange-200', label: 'Profile Edits', count: pendingEdits, unit: 'pending', tab: 'authors', filter: 'Edited' },
      { id: 'events', show: !localDismissed.includes('events') && pendingEvents > 0, icon: CalendarIcon, color: 'bg-amber-50 text-amber-600 border-amber-200', label: 'Event Registrations', count: pendingEvents, unit: 'pending', tab: 'events', filter: null },
      { id: 'web_orders', show: !localDismissed.includes('web_orders') && newWebOrders > 0, icon: ShoppingCart, color: 'bg-emerald-50 text-emerald-600 border-emerald-200', label: 'New Web Orders', count: newWebOrders, unit: 'new orders', tab: 'web_orders', filter: null },
      { id: 'bulk_orders', show: !localDismissed.includes('bulk_orders') && pendingBulkOrders > 0, icon: Package, color: 'bg-cyan-50 text-cyan-600 border-cyan-200', label: 'Pending Bulk Orders', count: pendingBulkOrders, unit: 'to process', tab: 'web_orders', filter: null },
      { id: 'dispatched_orders', show: !localDismissed.includes('dispatched_orders') && recentDispatchedOrders > 0, icon: Package, color: 'bg-blue-50 text-blue-600 border-blue-200', label: 'Dispatched Orders', count: recentDispatchedOrders, unit: 'recently', tab: 'web_orders', filter: null },
      { id: 'delivered_orders', show: !localDismissed.includes('delivered_orders') && recentDeliveredOrders > 0, icon: CheckCircle, color: 'bg-green-50 text-green-600 border-green-200', label: 'Delivered Orders', count: recentDeliveredOrders, unit: 'recently', tab: 'web_orders', filter: null },
      { id: 'fines', show: !localDismissed.includes('fines') && pendingFines > 0, icon: AlertCircle, color: 'bg-red-50 text-red-600 border-red-200', label: 'Fine Payments', count: pendingFines, unit: 'received', tab: 'late_authors', filter: null },
      { id: 'helpdesk', show: !localDismissed.includes('helpdesk') && pendingQueries > 0, icon: MessageSquare, color: 'bg-purple-50 text-purple-600 border-purple-200', label: 'Author Queries', count: pendingQueries, unit: 'unread', tab: 'helpdesk', filter: null },
    ].filter(a => a.show);

    return (
      <div className="space-y-6">
        {/* ════ Pending Actions — Full Width Strip Above KPIs ════ */}
        <div className="bg-white rounded-2xl border border-paa-navy/5 shadow-sm px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" aria-hidden="true" />
            <h3 className="text-base font-serif font-semibold text-paa-navy">Pending Actions</h3>
            {pendingActionItems.length > 0 && (
              <span className="ml-1 text-xs font-bold bg-amber-100 text-amber-700 rounded-full px-2.5 py-0.5">{pendingActionItems.length}</span>
            )}
          </div>
          {pendingActionItems.length === 0 ? (
            <p className="text-sm text-paa-gray-text py-1">✓ All caught up — no pending actions.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {pendingActionItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => { if (item.filter) { setActiveTab(item.tab); setAuthorStatusFilter(item.filter); } else setActiveTab(item.tab); }}
                    className={`group relative flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 w-full sm:w-auto ${item.color}`}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <div className="leading-tight flex-1 min-w-0">
                      <p className="text-sm font-bold text-wrap break-words">{item.label}</p>
                      <p className="text-xs opacity-70">{item.count} {item.unit}</p>
                    </div>
                    <button
                      aria-label={`Dismiss ${item.label}`}
                      onClick={(e) => handleDismiss(e, item.id)}
                      className="ml-1 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-all"
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ════ High Level KPIs ════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {[
            { label: 'Total Authors', value: stats?.totalAuthors || 0, icon: Users, colorClass: 'blue' },
            { label: 'Books Listed', value: stats?.totalBooks || 0, icon: BookOpen, colorClass: 'green' },
            { label: 'No of Events', value: stats?.totalEvents || 0, icon: CalendarIcon, colorClass: 'amber' },
            { label: 'No of Flybraries', value: stats?.totalLibraries || 0, icon: Library, colorClass: 'purple' },
            { label: 'Total Revenue', value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, colorClass: 'red' },
          ].map((kpi, i) => (
            <div key={i} className={`dash-kpi-card ${kpi.colorClass}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`dash-kpi-icon ${kpi.colorClass}`}><kpi.icon className="w-5 h-5" /></div>
              </div>
              <p className="text-xs font-semibold tracking-wide uppercase text-paa-gray-text mb-1">{kpi.label}</p>
              <h3 className="text-3xl font-bold text-paa-navy tracking-tight">{kpi.value}</h3>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* ════ Visual Data Insights (col-span-2) ════ */}
          <div className="lg:col-span-2 space-y-5">
            {/* Mini Insight Cards — 3 cols so no empty gap */}
            <div className="grid grid-cols-3 gap-4">
              {insights.map((insight, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow relative group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 ${insight.bg} ${insight.color}`}>
                    <insight.icon size={16} aria-hidden="true" />
                  </div>
                  <h4 className="text-2xl font-bold text-paa-navy mb-1">{insight.value}</h4>
                  <p className="text-xs font-semibold text-gray-800 mb-1">{insight.label}</p>
                  <p className="text-[10px] text-paa-gray-text flex items-center justify-between">
                    {insight.desc}
                    {(insight as any).hoverData && <Eye size={12} className="cursor-pointer text-indigo-400 hover:text-indigo-600" />}
                  </p>

                  {(insight as any).hoverData && (
                    <div className="absolute z-10 bottom-full left-0 mb-2 w-48 bg-white border border-gray-100 shadow-xl rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text mb-2 border-b pb-1">Last 3 Events</p>
                      <div className="space-y-2">
                        {(insight as any).hoverData.map((ev: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="text-gray-600 truncate mr-2">{ev.name}</span>
                            <span className="font-bold text-paa-navy">{ev.rate}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Charts Row 1 — all 3 charts in one row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm">
                <h3 className="text-sm font-serif font-semibold text-paa-navy mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" aria-hidden="true" /> Recent Revenue Trend
                </h3>
                <div className="h-48 w-full">
                  {revenueTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueTrendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="date" fontSize={10} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} />
                        <YAxis fontSize={10} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                        <Line type="linear" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={(props: any) => { const { cx, cy, index } = props; const total = revenueTrendData.length; if (total <= 30 || index % Math.ceil(total / 15) === 0 || index === total - 1) { return <circle cx={cx} cy={cy} r={3} fill="#fff" stroke="#10b981" strokeWidth={2} key={`dot-${index}`} />; } return null; }} activeDot={{ r: 6 }} name="Revenue (₹)" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs">No revenue data.</div>
                  )}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm col-span-2">
                <h3 className="text-sm font-serif font-semibold text-paa-navy mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-500" aria-hidden="true" /> Order Status Distribution
                </h3>
                <div className="h-48 w-full flex items-center">
                  {orderStatusData.length > 0 ? (
                    <>
                      <div className="w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                              {orderStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-1/2 flex flex-col justify-center gap-2 pl-4 border-l border-gray-100">
                        {orderStatusData.map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                            {entry.name} ({entry.value})
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs w-full">No orders.</div>
                  )}
                </div>
              </div>
            </div>
            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm col-span-1">
                <h3 className="text-sm font-serif font-semibold text-paa-navy mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-500" aria-hidden="true" /> Popular by Category & Genre
                </h3>
                <div className="h-56 w-full">
                  {categoryChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChartData} layout="vertical" margin={{ top: 5, right: 10, left: 40, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                        <XAxis type="number" fontSize={10} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" fontSize={10} tick={{ fill: '#4B5563', fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
                        <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                        <Bar dataKey="sales" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Books Sold">
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs">No category data.</div>
                  )}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-paa-navy/5 shadow-sm">
                <h3 className="text-sm font-serif font-semibold text-paa-navy mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" aria-hidden="true" /> Top Selling Authors
                </h3>
                <div className="space-y-3">
                  {topAuthorsData.length > 0 ? topAuthorsData.map((a, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">#{idx + 1}</div>
                        <p className="text-sm font-bold text-paa-navy line-clamp-1">{a.name}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <span className="text-sm font-black text-indigo-600">{a.sales}</span>
                        <span className="text-[10px] text-gray-500 ml-1">Sold</span>
                      </div>
                    </div>
                  )) : <p className="text-xs text-gray-400">No completed sales yet.</p>}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-paa-navy/5 shadow-sm">
                <h3 className="text-sm font-serif font-semibold text-paa-navy mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-500" aria-hidden="true" /> Highest Selling Books
                </h3>
                <div className="space-y-3">
                  {topBooksData.length > 0 ? topBooksData.map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div className="w-8 h-8 rounded-full bg-[#ebd8c0] text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">#{idx + 1}</div>
                        <p className="text-sm font-bold text-paa-navy line-clamp-1">{b.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-emerald-600">{b.sales}</span>
                        <span className="text-[10px] text-gray-500 ml-1">Sold</span>
                      </div>
                    </div>
                  )) : <p className="text-xs text-gray-400">No completed sales yet.</p>}
                </div>
              </div>
            </div>
          </div>
          {/* ════ Low Stock (col-span-1) ════ */}
          <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif font-semibold text-paa-navy flex items-center gap-2">
                <Package className="w-5 h-5 text-red-500" aria-hidden="true" /> Low Stock Books Alert
              </h3>
              {lowStockBooks.length > 0 && (
                <button aria-label="Notify All Authors About Low Stock" onClick={handleNotifyAllLowStock} className="text-xs flex items-center gap-1 font-bold text-paa-navy bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors uppercase tracking-wider">
                  <Bell size={12} className="text-amber-500" /> Notify All
                </button>
              )}
            </div>
            {lowStockBooks.length === 0 ? (
              <div className="text-center py-8 text-sm text-paa-gray-text my-auto">All books have sufficient inventory or authors notified.</div>
            ) : (
              <>
                <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '420px' }}>
                  {lowStockBooks.map((b: any) => (
                    <div key={b.dbId || b.id} className="flex items-center justify-between p-3 rounded-xl border border-red-100 bg-red-50/30 group">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-bold text-paa-navy line-clamp-1">{b.title}</p>
                        <p className="text-xs text-paa-gray-text">by {b.authorName}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button aria-label="Notify Author About Low Stock" onClick={() => handleNotifySingleBook(b)} className="opacity-0 group-hover:opacity-100 p-1.5 bg-white text-gray-400 hover:text-amber-500 rounded-full shadow-sm transition-all" title="Notify Author">
                          <Bell size={14} aria-hidden="true" />
                        </button>
                        <button aria-label="Dismiss Low Stock Alert" onClick={(e) => handleDismiss(e, `lowstock_${b.dbId || b.id}`)} className="opacity-0 group-hover:opacity-100 p-1.5 bg-white text-gray-400 hover:text-red-500 rounded-full shadow-sm transition-all" title="Dismiss Alert">
                          <X size={14} aria-hidden="true" />
                        </button>
                        <div className="text-right">
                          <span className="text-lg font-black text-red-600">{b.inventory || 0}</span>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-red-400">Left</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className="mt-4 w-full text-xs font-bold text-paa-navy bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2"
                >
                  <Package size={13} /> View All Inventory
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
});