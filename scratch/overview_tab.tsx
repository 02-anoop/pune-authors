const OverviewTab = ({ refreshTrigger }: { refreshTrigger: number }) => {
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

    const handleNotifyAllLowStock = async () => {
      setNotifiedBooks(prev => {
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
      setNotifiedBooks(prev => {
        const next = { ...prev, [id]: { inv: currentInventory, time: Date.now() } };
        localStorage.setItem('paa_notified_lowstock_v2', JSON.stringify(next));
        return next;
      });
      toast.success('Author notified about low stock!');
      try {
        await axios.post(`${API}/api/admin/authors/${b.authorId}/notify-low-stock`, { bookId: id, title: b.title }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      } catch (e) { }
    };

    // KPIs & Insights
    const pendingAuthors = authors.filter((a: any) => a.status === 'Pending').length;
    const pendingEdits = authors.filter((a: any) => { const ed = typeof a.extraData === 'string' ? (() => { try { return JSON.parse(a.extraData) } catch(e) { return {} } })() : (a.extraData || {}); return a.status === 'Edited' || ed?.hasPendingEdits; }).length;
    const pendingEvents = authors.filter((a: any) => a.eventParticipation && a.eventParticipation.length > 0 && a.eventParticipation.some((e: any) => e.status === 'Pending')).length;
    const pendingOrders = orders.filter((o: any) => o.status === 'Pending Verification' || o.status === 'Processing').length;
    const pendingQueries = prevCountsRef.current?.queries || 0;
    const pendingFines = authors.filter((a: any) => { const ed = typeof a.extraData === 'string' ? (() => { try { return JSON.parse(a.extraData) } catch(e) { return {} } })() : (a.extraData || {}); return ed?.fineStatus === 'Pending Verification' || (!ed?.fineStatus && ed?.finePaymentScreenshot); }).length;

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

    const categorySalesMap: Record<string, number> = {};
    orders.forEach((o: any) => {
      if (o.status === 'Completed' || o.status === 'Dispatched') {
        o.items?.forEach((item: any) => {
          const book = books.find((b: any) => b.title === item.title || b.id === item.bookId);
          const catName = book && book.category ? book.category : 'Unknown';
          const genreName = book && book.genre ? book.genre : '';
          const cat = genreName || catName;
          if (cat && cat !== 'Unknown') {
            categorySalesMap[cat] = (categorySalesMap[cat] || 0) + (item.qty || 1);
          }
        });
      }
    });
    const categoryChartData = Object.entries(categorySalesMap)
      .filter(([name]) => name !== 'Others' && name !== 'Uncategorized' && name !== 'N/A' && name !== 'Unknown')
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 6);

    // Chart Data 2: Order Status
    const orderStatusMap: Record<string, number> = {};
    orders.forEach((o: any) => {
      const s = o.status || 'Pending';
      orderStatusMap[s] = (orderStatusMap[s] || 0) + 1;
    });
    const orderStatusData = Object.entries(orderStatusMap).map(([name, value]) => ({ name, value }));

    // Chart Data 3: Top Authors and Books
    const authorSalesMap: Record<string, number> = {};
    const bookSalesMap: Record<string, number> = {};
    orders.forEach((o: any) => {
      if (o.status === 'Completed' || o.status === 'Dispatched') {
        o.items?.forEach((it: any) => {
          const aName = it.authorName || 'Unknown Author';
          const bTitle = it.title || 'Unknown Book';
          authorSalesMap[aName] = (authorSalesMap[aName] || 0) + (it.qty || 1);
          bookSalesMap[bTitle] = (bookSalesMap[bTitle] || 0) + (it.qty || 1);
        });
      }
    });

    let totalDeliveryTime = 0;
    let deliveredCount = 0;
    orders.forEach((o: any) => {
      o.items?.forEach((it: any) => {
        if (it.status === 'Delivered' && it.dispatchedAt && it.deliveredAt) {
          const time = new Date(it.deliveredAt).getTime() - new Date(it.dispatchedAt).getTime();
          totalDeliveryTime += time;
          deliveredCount++;
        }
      });
    });
    const avgDeliveryDays = deliveredCount > 0 ? (totalDeliveryTime / deliveredCount / (1000 * 3600 * 24)).toFixed(1) : 0;

    const topAuthorsData = Object.entries(authorSalesMap)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    const topBooksData = Object.entries(bookSalesMap)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
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

    const insights = [
      { label: 'Event Participation', value: `${avgParticipation}%`, desc: 'Avg author participation rate', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { label: 'Order Completion', value: `${orderCompletionRate}%`, desc: 'Of all web orders', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Web Orders Received', value: totalBooksSoldWeb, desc: 'Total web orders received online', icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    return (
      <div className="space-y-6">
        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ High Level KPIs ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {[
            { label: 'Total Authors', value: stats?.totalAuthors || 0, icon: Users, colorClass: 'blue' },
            { label: 'Books Published', value: stats?.totalBooks || 0, icon: BookOpen, colorClass: 'green' },
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



        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Visual Data Insights (col-span-2) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mini Insight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {insights.map((insight, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow relative group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 ${insight.bg} ${insight.color}`}>
                    <insight.icon size={16} />
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

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm">
                <h3 className="text-sm font-serif font-semibold text-paa-navy mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Recent Revenue Trend
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

              <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm">
                <h3 className="text-sm font-serif font-semibold text-paa-navy mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-500" /> Order Status Distribution
                </h3>
                <div className="h-48 w-full">
                  {orderStatusData.length > 0 ? (
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
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs">No orders.</div>
                  )}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm">
                <h3 className="text-sm font-serif font-semibold text-paa-navy mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-500" /> Event Participation Distribution
                </h3>
                <div className="h-48 w-full">
                  {participationChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={participationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" fontSize={10} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} />
                        <YAxis fontSize={10} tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                        <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Authors" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs">No participation data.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm col-span-1">
                <h3 className="text-sm font-serif font-semibold text-paa-navy mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-500" /> Popular by Category & Genre
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
                  <Users className="w-4 h-4 text-indigo-500" /> Top Selling Authors
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
                  <BookOpen className="w-4 h-4 text-emerald-500" /> Highest Selling Books
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

          {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Pending Actions & Low Stock (col-span-1) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm">
              <h3 className="text-lg font-serif font-semibold text-paa-navy mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" /> Pending Actions
              </h3>
              <div className="space-y-3">
                {!localDismissed.includes('authors') && pendingAuthors > 0 && (
                  <div className="group relative flex items-center justify-between p-3 rounded-xl border border-paa-navy/10 hover:bg-paa-navy/5 transition-colors text-left cursor-pointer" onClick={() => setActiveTab('authors')}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Users size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-paa-navy">Approve New Authors</p>
                        <p className="text-xs text-paa-gray-text">{pendingAuthors} authors waiting for approval</p>
                      </div>
                    </div>
                    <button onClick={(e) => handleDismiss(e, 'authors')} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                      <X size={16} />
                    </button>
                  </div>
                )}

                {!localDismissed.includes('edits') && pendingEdits > 0 && (
                  <div className="group relative flex items-center justify-between p-3 rounded-xl border border-paa-navy/10 hover:bg-paa-navy/5 transition-colors text-left cursor-pointer" onClick={() => { setActiveTab('authors'); setAuthorStatusFilter('Edited'); }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Edit size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-paa-navy">Approve Profile Edits</p>
                        <p className="text-xs text-paa-gray-text">{pendingEdits} author profiles have pending edits</p>
                      </div>
                    </div>
                    <button onClick={(e) => handleDismiss(e, 'edits')} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                      <X size={16} />
                    </button>
                  </div>
                )}

                {!localDismissed.includes('events') && pendingEvents > 0 && (
                  <div className="group relative flex items-center justify-between p-3 rounded-xl border border-paa-navy/10 hover:bg-paa-navy/5 transition-colors text-left cursor-pointer" onClick={() => setActiveTab('events')}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <CalendarIcon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-paa-navy">Event Registrations</p>
                        <p className="text-xs text-paa-gray-text">{pendingEvents} new event participations pending</p>
                      </div>
                    </div>
                    <button onClick={(e) => handleDismiss(e, 'events')} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                      <X size={16} />
                    </button>
                  </div>
                )}

                {!localDismissed.includes('orders') && pendingOrders > 0 && (
                  <div className="group relative flex items-center justify-between p-3 rounded-xl border border-paa-navy/10 hover:bg-paa-navy/5 transition-colors text-left cursor-pointer" onClick={() => setActiveTab('web_orders')}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#ebd8c0] text-emerald-600 flex items-center justify-center shrink-0">
                        <ShoppingCart size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-paa-navy">Fulfill Web Orders</p>
                        <p className="text-xs text-paa-gray-text">{pendingOrders} orders pending verification or dispatch</p>
                      </div>
                    </div>
                    <button onClick={(e) => handleDismiss(e, 'orders')} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                      <X size={16} />
                    </button>
                  </div>
                )}

                {!localDismissed.includes('fines') && pendingFines > 0 && (
                  <div className="group relative flex items-center justify-between p-3 rounded-xl border border-paa-navy/10 hover:bg-paa-navy/5 transition-colors text-left cursor-pointer" onClick={() => setActiveTab('late_authors')}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                        <AlertCircle size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-paa-navy">Fine Payments Received</p>
                        <p className="text-xs text-paa-gray-text">{pendingFines} authors submitted fine payments</p>
                      </div>
                    </div>
                    <button onClick={(e) => handleDismiss(e, 'fines')} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                      <X size={16} />
                    </button>
                  </div>
                )}

                {!localDismissed.includes('helpdesk') && pendingQueries > 0 && (
                  <div className="group relative flex items-center justify-between p-3 rounded-xl border border-paa-navy/10 hover:bg-paa-navy/5 transition-colors text-left cursor-pointer" onClick={() => setActiveTab('helpdesk')}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <MessageSquare size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-paa-navy">Author Queries</p>
                        <p className="text-xs text-paa-gray-text">{pendingQueries} unread helpdesk queries</p>
                      </div>
                    </div>
                    <button onClick={(e) => handleDismiss(e, 'helpdesk')} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                      <X size={16} />
                    </button>
                  </div>
                )}

                {((localDismissed.includes('authors') || pendingAuthors === 0) &&
                  (localDismissed.includes('edits') || pendingEdits === 0) &&
                  (localDismissed.includes('events') || pendingEvents === 0) &&
                  (localDismissed.includes('orders') || pendingOrders === 0) &&
                  (localDismissed.includes('fines') || pendingFines === 0) &&
                  (localDismissed.includes('helpdesk') || pendingQueries === 0)) && (
                    <div className="text-center py-6 text-sm text-paa-gray-text">No pending actions to display.</div>
                  )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm flex flex-col h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-serif font-semibold text-paa-navy flex items-center gap-2">
                  <Package className="w-5 h-5 text-red-500" /> Low Stock Books Alert
                </h3>
                {lowStockBooks.length > 0 && (
                  <button onClick={handleNotifyAllLowStock} className="text-xs flex items-center gap-1 font-bold text-paa-navy bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors uppercase tracking-wider">
                    <Bell size={12} className="text-amber-500" /> Notify All
                  </button>
                )}
              </div>
              {lowStockBooks.length === 0 ? (
                <div className="text-center py-8 text-sm text-paa-gray-text my-auto">All books have sufficient inventory or authors notified.</div>
              ) : (
                <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                  {lowStockBooks.map((b: any) => (
                    <div key={b.dbId || b.id} className="flex items-center justify-between p-3 rounded-xl border border-red-100 bg-red-50/30 group">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-bold text-paa-navy line-clamp-1">{b.title}</p>
                        <p className="text-xs text-paa-gray-text">by {b.authorName}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button onClick={() => handleNotifySingleBook(b)} className="opacity-0 group-hover:opacity-100 p-1.5 bg-white text-gray-400 hover:text-amber-500 rounded-full shadow-sm transition-all" title="Notify Author">
                          <Bell size={14} />
                        </button>
                        <button onClick={(e) => handleDismiss(e, `lowstock_${b.dbId || b.id}`)} className="opacity-0 group-hover:opacity-100 p-1.5 bg-white text-gray-400 hover:text-red-500 rounded-full shadow-sm transition-all" title="Dismiss Alert">
                          <X size={14} />
                        </button>
                        <div className="text-right">
                          <span className="text-lg font-black text-red-600">{b.inventory || 0}</span>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-red-400">Left</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };


  