
import React, { useState, useMemo } from 'react';
import { Users, Activity, Clock, ShoppingCart, BookOpen, Calendar as CalendarIcon, Library, TrendingUp, Eye, PieChart, BarChart2, AlertCircle, Package, Bell, X, MessageSquare, Edit, CheckCircle, Plane, Store } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, LabelList, ScatterChart, Scatter, ZAxis } from 'recharts';
import axios from 'axios';
import { toast } from 'sonner';
import { getAuthorParticipationStats } from './OperationsDashboardPage';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const AdminOverviewTab = React.memo(({ refreshTrigger, books, authors, orders, events, stats, prevQueries, lastAdminVisit, setActiveTab, setAuthorStatusFilter, API, libraries }: any) => {

  const [localDismissed, setLocalDismissed] = useState<string[]>(() => {
    const saved = localStorage.getItem('paa_dismissed_actions');
    return saved ? JSON.parse(saved) : [];
  });
  const [notifiedBooks, setNotifiedBooks] = useState<Record<string, { inv: number, time: number }>>(() => {
    const saved = localStorage.getItem('paa_notified_lowstock_v2');
    return saved ? JSON.parse(saved) : {};
  });

  const [dynamicRevenue, setDynamicRevenue] = useState<number | null>(null);
  const [dynamicBooksSold, setDynamicBooksSold] = useState<number | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const fetchLifetimeRevenue = async () => {
      try {
        const res = await axios.get(`${API}/api/admin/sales-report?startDate=2000-01-01&endDate=2099-12-31&filterType=lifetime`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (isMounted) {
          if (res.data?.kpis?.totalRevenue !== undefined) {
            setDynamicRevenue(res.data.kpis.totalRevenue);
          }
          if (res.data?.kpis?.totalBooksSold !== undefined) {
            setDynamicBooksSold(res.data.kpis.totalBooksSold);
          }
        }
      } catch (e) {
        console.error("Failed to fetch dynamic lifetime revenue", e);
      }
    };
    fetchLifetimeRevenue();
    return () => { isMounted = false; };
  }, [API, refreshTrigger]);

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
    lowStockBooks, pendingAuthors, pendingEdits, pendingEvents, newWebOrders, pendingBulkOrders, pendingOrdersCount, recentDispatchedOrders, recentDeliveredOrders, pendingQueries, pendingFines,
    delayedOrdersRate, avgParticipation, participationChartData, latestEventRate, categoryChartData,
    orderStatusData, topAuthorsData, topBooksData, revenueTrendData, totalBooksSoldWeb, totalRevenueWeb,
    completedOrders, topParticipatingAuthors
  } = useMemo(() => {
    // Low stock books (threshold < 10)
    // Exclude if inventory is same AND notified within 24 hours.
    const lowStockBooks = books.filter((b: any) => {
      const inv = b.stock !== undefined ? b.stock : (b.inventory !== undefined ? b.inventory : (b.currentStock !== undefined ? b.currentStock : (b.copies !== undefined ? b.copies : 0)));
      const id = b.id || b.dbId;
      if (inv >= 10 || (b.status && b.status !== 'Approved')) return false;
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
    const pendingEdits = authors.filter((a: any) => { const ed = typeof a.extraData === 'string' ? (() => { try { return JSON.parse(a.extraData) } catch (e) { return {} } })() : (a.extraData || {}); return a.status === 'Edited' || ed?.hasPendingEdits; }).length;
    const pendingEvents = authors.filter((a: any) => a.eventParticipation && a.eventParticipation.length > 0 && a.eventParticipation.some((e: any) => e.status === 'Pending Approval')).length;

    const newWebOrders = orders.filter((o: any) => !o.isArchived && !o.isBulk && ['Pending Verification', 'Pending'].includes(getAggregateStatusText(o))).length;
    const pendingBulkOrders = orders.filter((o: any) => !o.isArchived && o.isBulk && ['Bulk Req Pending', 'Pending Payment'].includes(getAggregateStatusText(o))).length;
    const pendingOrdersCount = (orders && orders.length > 0) ? (newWebOrders + pendingBulkOrders) : (stats?.globalPendingOrders !== undefined ? stats.globalPendingOrders : 0);

    const recentDispatchedOrders = lastAdminVisit ? orders.filter((o: any) => !o.isArchived && o.items?.some((it: any) => it.dispatchedAt && new Date(it.dispatchedAt).getTime() > lastAdminVisit)).length : 0;
    const recentDeliveredOrders = lastAdminVisit ? orders.filter((o: any) => !o.isArchived && o.items?.some((it: any) => it.deliveredAt && new Date(it.deliveredAt).getTime() > lastAdminVisit)).length : 0;
    const pendingQueries = prevQueries || 0;
    const pendingFines = authors.filter((a: any) => {
      const ed = typeof a.extraData === 'string' ? (() => { try { return JSON.parse(a.extraData) } catch (e) { return {} } })() : (a.extraData || {});
      return (ed?.fineStatus === 'Pending Verification' || (!ed?.fineStatus && ed?.finePaymentScreenshot)) && ed?.finePaymentScreenshot;
    }).length;

    const activeWebOrders = orders.filter((o: any) => !o.isArchived && !o.isBulk && o.status !== 'Cancelled');
    const delayedOrders = activeWebOrders.filter((o: any) => {
      if (o.status === 'Completed' || o.status === 'Dispatched' || o.status === 'Delivered') return false;
      if (o.status === 'Delayed' || o.isDelayed) return true;

      const now = Date.now();
      const orderTime = new Date(o.createdAt || o.date).getTime();
      const hours = (now - orderTime) / (1000 * 60 * 60);

      if (o.items && o.items.length > 0) {
        return o.items.some((it: any) => {
          const itemTime = it.createdAt ? new Date(it.createdAt).getTime() : orderTime;
          const itemHours = (now - itemTime) / (1000 * 60 * 60);
          if ((it.status === 'Pending Verification' || it.status === 'Pending') && itemHours > 24) return true;
          if (it.status === 'Accepted' && itemHours > 48) return true;
          return false;
        });
      }
      return (o.status === 'Pending' || o.status === 'Pending Verification') && hours > 24;
    }).length;
    const delayedOrdersRate = activeWebOrders.length ? Math.round((delayedOrders / activeWebOrders.length) * 100) : 0;

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
    const completedOrdersCount = orders.filter((o: any) => o.status === 'Completed' || o.status === 'Dispatched').length;
    const avgOrderValue = completedOrdersCount > 0 ? Math.round(totalRevenueWeb / completedOrdersCount) : 0;

    // Chart Data 5: Top 20 Authors by Participation
    const topParticipatingAuthors = [...authors]
      .map(a => {
        const stats = getAuthorParticipationStats(a, events);
        return { name: a.name, percentage: stats.percentage, participated: stats.participated, total: stats.total };
      })
      .sort((a, b) => b.percentage - a.percentage || b.participated - a.participated)
      .slice(0, 20);

    return {
      lowStockBooks, pendingAuthors, pendingEdits, pendingEvents, newWebOrders, pendingBulkOrders, pendingOrdersCount, recentDispatchedOrders, recentDeliveredOrders, pendingQueries: prevQueries, pendingFines,
      delayedOrdersRate, avgParticipation, participationChartData, latestEventRate, categoryChartData,
      orderStatusData, topAuthorsData, topBooksData, revenueTrendData, totalBooksSoldWeb, totalRevenueWeb,
      completedOrders: completedOrdersCount, topParticipatingAuthors
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
    { label: '% Orders Delayed', value: `${delayedOrdersRate}%`, desc: 'Of all web orders', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', tabId: 'web_orders' },
    { label: 'Pending Orders', value: pendingOrdersCount !== null && pendingOrdersCount !== undefined ? pendingOrdersCount : 0, desc: 'Orders requiring action', icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50', tabId: 'web_orders' },
    { label: 'Web Orders Received', value: totalBooksSoldWeb, desc: 'Total web orders received online', icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50', tabId: 'web_orders' },
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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        {[
          { label: 'Total Authors', value: authors ? authors.length : null, icon: Users, colorClass: 'blue', tabId: 'authors' },
          { label: 'Books Listed', value: books ? books.length : null, icon: BookOpen, colorClass: 'green', tabId: 'books' },
          {
            label: 'Book Fairs',
            value: (events && events.length > 0)
              ? events.filter((e: any) => {
                  const name = (e.name || e.title || '').toLowerCase();
                  return e.eventType === 'Book Fair' || name.includes('book fair') || name.includes('fair') || name.includes('srinagar') || name.includes('dehradun') || name.includes('bengali mela') || name.includes('diwali stall');
                }).length
              : (stats?.totalBookFairs !== undefined && stats?.totalBookFairs > 0)
                ? stats.totalBookFairs
                : (events ? 0 : null),
            icon: Store,
            colorClass: 'amber',
            tabId: 'events'
          },
          {
            label: 'Literary Events',
            value: (events && events.length > 0)
              ? events.filter((e: any) => {
                  const name = (e.name || e.title || '').toLowerCase();
                  const isFair = e.eventType === 'Book Fair' || name.includes('book fair') || name.includes('fair') || name.includes('srinagar') || name.includes('dehradun') || name.includes('bengali mela') || name.includes('diwali stall');
                  return !isFair;
                }).length
              : (stats?.totalLiteraryEvents !== undefined && stats?.totalLiteraryEvents > 0)
                ? stats.totalLiteraryEvents
                : (events ? 0 : null),
            icon: CalendarIcon,
            colorClass: 'purple',
            tabId: 'events'
          },
          {
            label: 'Airport Libraries',
            value: (libraries && libraries.length > 0)
              ? libraries.filter((l: any) => (l.type === 'Airport Library' || l.type === 'airport') && !l.isArchived).length
              : (stats?.totalAirportLibraries !== undefined && stats?.totalAirportLibraries > 0)
                ? stats.totalAirportLibraries
                : null,
            icon: Plane,
            colorClass: 'cyan',
            tabId: 'library_donations'
          },
          {
            label: 'Other Libraries',
            value: (libraries && libraries.length > 0)
              ? libraries.filter((l: any) => l.type !== 'Airport Library' && l.type !== 'airport' && !l.isArchived).length
              : (stats?.totalOtherLibraries !== undefined && stats?.totalOtherLibraries > 0)
                ? stats.totalOtherLibraries
                : null,
            icon: Library,
            colorClass: 'green',
            tabId: 'library_donations'
          },
          { 
            label: 'Total Revenue', 
            value: (dynamicRevenue !== null || stats?.totalRevenue !== undefined) 
              ? `₹${(dynamicRevenue !== null ? dynamicRevenue : (stats?.totalRevenue || 0)).toLocaleString()}` 
              : null, 
            icon: TrendingUp, 
            colorClass: 'red', 
            tabId: 'sales_report' 
          },
        ].map((kpi, i) => (
          <div key={i} onClick={() => kpi.tabId && setActiveTab(kpi.tabId)} className={`dash-kpi-card ${kpi.colorClass} !p-3.5 sm:!p-4 !rounded-xl cursor-pointer hover:scale-[1.02] transition-transform`}>
            <div className="flex items-start justify-between mb-2">
              <div className={`dash-kpi-icon ${kpi.colorClass} !w-8 sm:!w-9 !h-8 sm:!h-9 !rounded-lg`}><kpi.icon className="w-4 h-4" /></div>
            </div>
            <p className="text-[10px] font-bold tracking-wide uppercase text-paa-gray-text mb-0.5 truncate" title={kpi.label}>{kpi.label}</p>
            {kpi.value !== null && kpi.value !== undefined ? (
              <h3 className="text-lg sm:text-xl font-black text-paa-navy tracking-tight truncate">{kpi.value}</h3>
            ) : (
              <div className="h-6 sm:h-7 w-16 bg-gray-200/80 animate-pulse rounded-md my-0.5" />
            )}
          </div>
        ))}
      </div>

      {/* ════ Combined Insights & Participation Graph Row ════ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left Column: Stacked Mini Cards */}
        <div className="lg:col-span-1 flex flex-col gap-4 sm:gap-5">
          {insights.map((insight, idx) => (
            <div key={idx} onClick={() => insight.tabId && setActiveTab(insight.tabId)} className="p-4 rounded-2xl border border-paa-navy/5 bg-white shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between flex-1 cursor-pointer hover:scale-[1.02]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${insight.bg} ${insight.color}`}>
                    <insight.icon size={18} aria-hidden="true" />
                  </div>
                  {(insight as any).hoverData && <Eye size={14} className="cursor-pointer text-indigo-400 hover:text-indigo-600" />}
                </div>
                <h4 className="text-2xl font-black text-paa-navy tracking-tight mb-1">{insight.value}</h4>
                <p className="text-xs font-bold text-gray-800 mb-0.5">{insight.label}</p>
                <p className="text-[11px] text-paa-gray-text">{insight.desc}</p>
              </div>

              {(insight as any).hoverData && (
                <div className="absolute z-10 bottom-full left-0 mb-2 w-52 bg-white border border-gray-100 shadow-xl rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
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

          {/* Total Books Sold Mini Card */}
          <div onClick={() => setActiveTab('sales_report')} className="p-4 rounded-2xl border border-paa-navy/5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between flex-1 cursor-pointer hover:scale-[1.02]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BookOpen size={18} aria-hidden="true" />
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  All Channels
                </span>
              </div>
              <h4 className="text-2xl font-black text-paa-navy tracking-tight mb-1">
                {(dynamicBooksSold !== null ? dynamicBooksSold : (stats?.totalBooksSold || 0)).toLocaleString()}
              </h4>
              <p className="text-xs font-bold text-gray-800 mb-0.5">Total Books Sold</p>
              <p className="text-[11px] text-paa-gray-text">Across web orders, events &amp; book fairs</p>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab('sales_report'); }}
              className="mt-3 w-full text-xs font-bold text-white bg-paa-navy hover:bg-[#0c1e30] rounded-xl py-2 transition-all flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm"
            >
              <TrendingUp size={13} /> View Sales Report
            </button>
          </div>
        </div>

        {/* Right Column: Participation Graph */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm hover:shadow-md transition-all flex flex-col">
          <h3 className="text-base font-serif font-semibold text-paa-navy mb-4 flex items-center gap-2 shrink-0">
            <Users className="w-5 h-5 text-purple-500" aria-hidden="true" /> Top 20 Authors by Participation
          </h3>
          <div className="flex-1 w-full min-h-[320px]">
            {topParticipatingAuthors && topParticipatingAuthors.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topParticipatingAuthors} margin={{ top: 15, right: 10, left: 0, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" fontSize={11} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" interval={0} height={60} />
                  <YAxis fontSize={11} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                  <RechartsTooltip
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    formatter={(value: any, name: any, props: any) => {
                      return [`${value}% (${props.payload.participated}/${props.payload.total} events)`, 'Participation'];
                    }}
                  />
                  <Bar dataKey="percentage" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Participation">
                    {topParticipatingAuthors.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">No participation data available.</div>
            )}
          </div>
        </div>
      </div>

      {/* ════ Performance & Leaderboards Row — 3 Equal Responsive Columns ════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Popular Categories */}
        <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-sm font-serif font-semibold text-paa-navy mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-500" aria-hidden="true" /> Popular by Category &amp; Genre
          </h3>
          <div className="h-56 w-full">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} layout="vertical" margin={{ top: 5, right: 10, left: 35, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                  <XAxis type="number" fontSize={10} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" fontSize={10} tick={{ fill: '#4B5563', fontWeight: 600 }} axisLine={false} tickLine={false} width={75} />
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

        {/* Top Selling Authors */}
        <div className="bg-white p-5 rounded-2xl border border-paa-navy/5 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-sm font-serif font-semibold text-paa-navy mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" aria-hidden="true" /> Top Selling Authors
          </h3>
          <div className="space-y-2.5">
            {topAuthorsData.length > 0 ? topAuthorsData.map((a, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/40 border border-indigo-100/60 hover:bg-indigo-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-extrabold shrink-0">#{idx + 1}</div>
                  <p className="text-xs font-bold text-paa-navy truncate">{a.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-indigo-600">{a.sales}</span>
                  <span className="text-[10px] text-gray-500 ml-1">Sold</span>
                </div>
              </div>
            )) : <p className="text-xs text-gray-400 py-4 text-center">No completed sales yet.</p>}
          </div>
        </div>

        {/* Highest Selling Books */}
        <div className="bg-white p-5 rounded-2xl border border-paa-navy/5 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-sm font-serif font-semibold text-paa-navy mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-500" aria-hidden="true" /> Highest Selling Books
          </h3>
          <div className="space-y-2.5">
            {topBooksData.length > 0 ? topBooksData.map((b, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/40 border border-emerald-100/60 hover:bg-emerald-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-extrabold shrink-0">#{idx + 1}</div>
                  <p className="text-xs font-bold text-paa-navy truncate">{b.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-emerald-600">{b.sales}</span>
                  <span className="text-[10px] text-gray-500 ml-1">Sold</span>
                </div>
              </div>
            )) : <p className="text-xs text-gray-400 py-4 text-center">No completed sales yet.</p>}
          </div>
        </div>
      </div>

    </div>
  );
});