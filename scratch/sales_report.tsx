const SalesReportTab = React.useMemo(() => {
    return function SalesReportTabComponent({ refreshTrigger }: { refreshTrigger?: number }) {
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
            const res = await axios.get(`${API}/api/admin/sales-report?startDate=${startDate}&endDate=${endDate}`, {
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

      return (
        <div className="space-y-6">
          {/* Top Bar: Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <h3 className="text-xl font-serif font-medium text-paa-navy mb-1 flex items-center gap-2">
                <Activity className="w-5 h-5 text-paa-gold" /> Dynamic Sales Report
              </h3>
              <p className="text-xs text-gray-500 font-medium">Aggregate revenue data instantly across any date range.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <select
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
                  <input
                    type="month"
                    value={selectedMonthValue}
                    onChange={(e) => setSelectedMonthValue(e.target.value)}
                    className="text-xs font-bold tracking-widest uppercase py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-paa-navy outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                  />
                </div>
              )}

              {filterType === 'custom' && (
                <div className="flex items-center gap-2 animate-fade-in">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs font-bold tracking-widest uppercase py-2 px-3 rounded-xl border border-gray-200 bg-white text-paa-navy outline-none focus:border-indigo-500"
                  />
                  <span className="text-gray-400 font-medium text-sm">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs font-bold tracking-widest uppercase py-2 px-3 rounded-xl border border-gray-200 bg-white text-paa-navy outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <button onClick={handleExport} disabled={!salesData?.tableData?.length || isLoading} className="flex items-center justify-center gap-2 bg-[#5cb85c] hover:bg-[#4cae4c] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                <Download size={14} /> Export Excel
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
              {/* Row 1: KPI Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">

                <div className="dash-kpi-card green flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="dash-kpi-icon green"><DollarSign className="w-5 h-5" /></div>
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

                <div className="dash-kpi-card blue flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="dash-kpi-icon blue"><BookOpen className="w-5 h-5" /></div>
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

                <div className="dash-kpi-card amber flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="dash-kpi-icon amber"><ShoppingCart className="w-5 h-5" /></div>
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

              {/* Row 2: Visualizations */}
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
                            const d = new Date(val);
                            return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                          }}
                        />
                        <YAxis fontSize={10} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} width={60} />
                        <RechartsTooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px' }}
                          itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                          labelStyle={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}
                          formatter={(value: number) => [`₹${value}`, 'Revenue']}
                          labelFormatter={(val) => {
                            const d = new Date(val as string);
                            return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                          }}
                        />
                        <Line type="linear" dataKey="revenue" stroke="#06b6d4" strokeWidth={3} dot={(props: any) => { const { cx, cy, index } = props; const total = (salesData?.chartData || []).length; if (total <= 30 || index % Math.ceil(total / 15) === 0 || index === total - 1) { return <circle cx={cx} cy={cy} r={4} fill="#fff" stroke="#06b6d4" strokeWidth={2} key={`dot-${index}`} />; } return null; }} activeDot={{ r: 6 }}>
                          <LabelList dataKey="revenue" position="top" content={(props: any) => {
                            const { x, y, value, index } = props;
                            const data = salesData?.chartData || [];
                            const total = data.length;
                            if (total <= 30 || index % Math.ceil(total / 15) === 0 || index === total - 1) {

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
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div><span className="text-xs text-gray-600 font-bold tracking-wide uppercase">Web</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ebd8c0]0 shadow-sm"></div><span className="text-xs text-gray-600 font-bold tracking-wide uppercase">Fairs</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm"></div><span className="text-xs text-gray-600 font-bold tracking-wide uppercase">Events</span></div>
                  </div>
                </div>
              </div>

              {/* Row 3: Granular Data Table */}
              <div className="bg-white border border-paa-navy/5 rounded-2xl shadow-sm overflow-hidden relative min-h-[200px]">
                <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
                  <h4 className="text-xs font-bold text-paa-navy uppercase tracking-widest">Raw Sales Data</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {['All', 'Web Orders', 'Events', 'Book Fairs'].map(ch => {
                      const tabCount = (salesData?.tableData?.filter((r: any) => ch === 'All' || r.channel === ch) || []).length;
                      return (
                      <button
                        key={ch}
                        onClick={() => setTableChannelFilter(ch)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5 ${tableChannelFilter === ch ? 'bg-paa-navy text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
                      >
                        {ch} <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tableChannelFilter === ch ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{tabCount}</span>
                      </button>
                    )})}
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
                      {!isLoading && (salesData?.tableData?.filter((r: any) => tableChannelFilter === 'All' || r.channel === tableChannelFilter) || []).length === 0 && (
                        <tr><td colSpan={8} className="text-center py-10 text-sm text-gray-400 font-medium italic">No sales recorded in this period for the selected filter.</td></tr>
                      )}
                      {(salesData?.tableData?.filter((r: any) => tableChannelFilter === 'All' || r.channel === tableChannelFilter) || []).map((row: any, idx: number) => (
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
  }, []);

  const LateAuthorsSystemTab = useMemo(() => {
    return function LateAuthorsTab({ orders, authors, fetchAuthors }: any) {
      const [activeTable, setActiveTable] = React.useState<'approvals' | 'suspended' | 'late' | 'history'>('late');
    const [fineModalAuthor, setFineModalAuthor] = React.useState<{ id: number, name: string, orderId?: string, count?: number, hours?: number, delayType?: string } | null>(null);
    const [fineAmount, setFineAmount] = React.useState('500');
    const [isSubmittingFine, setIsSubmittingFine] = React.useState(false);
    const [expandedCustomerRow, setExpandedCustomerRow] = React.useState<number | null>(null);

    // Reconstruct lateDeliveriesMap for active deliveries (to charge fine)
    const lateDeliveriesMap: Record<string, any> = {};
    orders.forEach((o: any) => {
      o.items?.forEach((it: any) => {
        if ((it.status === 'Pending Verification' || it.status === 'Pending' || it.status === 'Accepted') && it.createdAt) {
          const hours = (new Date().getTime() - new Date(it.createdAt).getTime()) / (1000 * 3600);

          const aId = it.authorId || it.book?.author?.id;
          const aName = it.authorName || it.book?.author?.name || 'Unknown Author';
          const aEmail = it.authorEmail || it.book?.author?.email;

          let ignoreForLate = false;
          const authorData = authors.find((a: any) => a.id === aId);
          if (authorData?.extraData?.lastFinePaidAt) {
            if (new Date(it.createdAt).getTime() < new Date(authorData.extraData.lastFinePaidAt).getTime()) {
              ignoreForLate = true;
            }
          }

          let isLate = false;
          let delayType = '';
          if ((it.status === 'Pending Verification' || it.status === 'Pending') && hours > 24) {
            isLate = true;
            delayType = 'Acceptance (>24h)';
          } else if (it.status === 'Accepted' && hours > 48) {
            isLate = true;
            delayType = 'Dispatch (>48h)';
          }

          if (isLate && aId && !ignoreForLate) {
            const key = `${aId}-${o.id}`;
            if (!lateDeliveriesMap[key]) {
              lateDeliveriesMap[key] = {
                authorId: aId,
                authorName: aName,
                authorEmail: aEmail,
                orderId: o.id,
                hours: Math.round(hours),
                count: 0,
                customerInfo: { name: o.customerName && o.customerName !== 'N/A' ? o.customerName : 'Guest Customer', phone: o.customerPhone || 'No Phone', email: o.customerEmail || 'No Email' },
                delayType,
                lateItems: []
              };
            }
            lateDeliveriesMap[key].count++;
            lateDeliveriesMap[key].lateItems.push({
              title: it.book?.title || 'Unknown Book',
              quantity: it.quantity || 1,
              price: it.book?.price || it.price || 0,
              status: it.status
            });

            if (Math.round(hours) > lateDeliveriesMap[key].hours) {
              lateDeliveriesMap[key].hours = Math.round(hours);
              lateDeliveriesMap[key].customerInfo = { name: o.customerName && o.customerName !== 'N/A' ? o.customerName : 'Guest Customer', phone: o.customerPhone || 'No Phone', email: o.customerEmail || 'No Email' };
              lateDeliveriesMap[key].delayType = delayType;
            }
          }
        }
      });
    });
    const lateDeliveries = Object.values(lateDeliveriesMap).sort((a: any, b: any) => b.hours - a.hours);

    // Identify pending fine approvals
    const pendingFineApprovals = authors.filter((a: any) =>
      (a.extraData?.fineStatus === 'Pending Verification' || (!a.extraData?.fineStatus && a.extraData?.finePaymentScreenshot))
      && a.extraData?.finePaymentScreenshot
    );
    // Identify fined authors (fine active)
    const activeFines = authors.filter((a: any) => a.extraData?.lateFines > 0 && a.extraData?.fineStatus !== 'Pending Verification');
    // Identify authors with fine history
    const historyAuthors = authors.filter((a: any) => a.extraData?.fineHistory && a.extraData.fineHistory.length > 0);

    const handleOpenFineModal = (authorId: number, authorName: string, ld?: any) => {
      setFineModalAuthor({ id: authorId, name: authorName, ...ld });
      setFineAmount('500');
    };

    const submitFine = async () => {
      if (!fineModalAuthor) return;
      const amount = parseInt(fineAmount);
      if (isNaN(amount) || amount <= 0) return toast.error('Invalid amount');
      setIsSubmittingFine(true);
      try {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/authors/${fineModalAuthor.id}/fine`, {
          amount,
          orderId: fineModalAuthor.orderId,
          count: fineModalAuthor.count,
          hours: fineModalAuthor.hours,
          delayType: fineModalAuthor.delayType
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success(`Fine of ₹${amount} charged successfully`);
        setFineModalAuthor(null);
        fetchAuthors();
      } catch (err) {
        toast.error('Failed to charge fine');
      } finally {
        setIsSubmittingFine(false);
      }
    };

    const handleApproveFine = async (authorId: number) => {
      try {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/authors/${authorId}/approve-fine`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success(`Fine payment approved.`);
        fetchAuthors();
      } catch (err) {
        toast.error('Failed to approve fine payment');
      }
    };

    const handleRejectFine = async (authorId: number) => {
      try {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/authors/${authorId}/reject-fine`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success(`Fine payment rejected.`);
        fetchAuthors();
      } catch (err) {
        toast.error('Failed to reject fine payment');
      }
    };

    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div className="shrink-0">
            <h2 className="text-2xl font-serif text-paa-navy tracking-tight">Late Authors System</h2>
            <p className="text-sm text-gray-500 mt-1 hidden xl:block">Manage delayed dispatches, charge fines, and approve fine payments.</p>
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto overflow-hidden">
            <div className="flex overflow-x-auto hide-scrollbar whitespace-nowrap bg-gray-100 rounded-xl p-1 w-full xl:w-auto gap-1 shrink-0 max-w-full">
              <button
                onClick={() => setActiveTable('late')}
                className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors rounded-lg flex items-center gap-2 shrink-0 ${activeTable === 'late' ? 'bg-white text-paa-navy shadow-sm' : 'text-gray-500 hover:text-paa-navy'}`}
              >
                <Clock size={14} /> Late Dispatches
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] min-w-[1.25rem] text-center leading-none ${activeTable === 'late' ? 'bg-paa-navy/10 text-paa-navy' : 'bg-gray-200 text-gray-600'}`}>{lateDeliveries.length}</span>
              </button>
              <button
                onClick={() => setActiveTable('approvals')}
                className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors rounded-lg flex items-center gap-2 shrink-0 ${activeTable === 'approvals' ? 'bg-white text-paa-navy shadow-sm' : 'text-gray-500 hover:text-paa-navy'}`}
              >
                <CheckCircle size={14} /> Approvals
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] min-w-[1.25rem] text-center leading-none ${activeTable === 'approvals' ? 'bg-paa-navy/10 text-paa-navy' : 'bg-gray-200 text-gray-600'}`}>{pendingFineApprovals.length}</span>
              </button>
              <button
                onClick={() => setActiveTable('suspended')}
                className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors rounded-lg flex items-center gap-2 shrink-0 ${activeTable === 'suspended' ? 'bg-white text-paa-navy shadow-sm' : 'text-gray-500 hover:text-paa-navy'}`}
              >
                <AlertCircle size={14} /> Suspended
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] min-w-[1.25rem] text-center leading-none ${activeTable === 'suspended' ? 'bg-paa-navy/10 text-paa-navy' : 'bg-gray-200 text-gray-600'}`}>{activeFines.length}</span>
              </button>
              <button
                onClick={() => setActiveTable('history')}
                className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors rounded-lg flex items-center gap-2 shrink-0 ${activeTable === 'history' ? 'bg-white text-paa-navy shadow-sm' : 'text-gray-500 hover:text-paa-navy'}`}
              >
                <FileText size={14} /> History
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] min-w-[1.25rem] text-center leading-none ${activeTable === 'history' ? 'bg-paa-navy/10 text-paa-navy' : 'bg-gray-200 text-gray-600'}`}>{historyAuthors.reduce((sum: number, a: any) => sum + (a.extraData?.fineHistory?.length || 0), 0)}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Pending Fine Approvals ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        {activeTable === 'approvals' && (
          <div className="bg-white p-6 rounded-xl border border-paa-navy/5 shadow-sm animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif font-semibold text-paa-navy flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" /> Pending Fine Payment Approvals
              </h3>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                  <tr>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">S. No</th>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Author Name</th>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Reason</th>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Screenshot</th>
                    <th className="px-4 py-3 font-bold text-center !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingFineApprovals.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 italic">No pending payments.</td></tr> : pendingFineApprovals.map((a: any, idx: number) => (
                    <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'} hover:bg-slate-200/60 transition-colors`}>
                      <td className="px-4 py-3 font-bold text-paa-gray-text">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-paa-navy">{a.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={a.extraData.finePaymentReason || 'No reason provided'}>
                        {a.extraData.finePaymentReason || <span className="italic text-gray-400">N/A</span>}
                      </td>
                      <td className="px-4 py-3">
                        <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${a.extraData.finePaymentScreenshot}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          <ImageIcon size={14} /> View Screenshot
                        </a>
                      </td>
                      <td className="px-4 py-3 text-center flex justify-center gap-2">
                        <button onClick={() => handleApproveFine(a.id)} className="dash-btn dash-btn-primary bg-green-600 hover:bg-green-700 border-none text-white text-xs px-3 py-1.5 h-auto">
                          Approve
                        </button>
                        <button onClick={() => handleRejectFine(a.id)} className="dash-btn dash-btn-primary bg-red-600 hover:bg-red-700 border-none text-white text-xs px-3 py-1.5 h-auto">
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Active Fines (Unpaid) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        {activeTable === 'suspended' && (
          <div className="bg-white p-6 rounded-xl border border-paa-navy/5 shadow-sm animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif font-semibold text-paa-navy flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" /> Currently Fined Authors (Suspended)
              </h3>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                  <tr>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">S. No</th>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Author Name</th>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Fine Amount</th>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Date Charged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeFines.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">No currently fined authors.</td></tr> : activeFines.map((a: any, idx: number) => (
                    <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'} hover:bg-slate-200/60 transition-colors`}>
                      <td className="px-4 py-3 font-bold text-paa-gray-text">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-paa-navy">{a.name}</td>
                      <td className="px-4 py-3 font-bold text-red-600">₹{a.extraData.lateFines}</td>
                      <td className="px-4 py-3 text-gray-600">{a.extraData.fineDate ? new Date(a.extraData.fineDate).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Late Deliveries Row (Charging) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        {activeTable === 'late' && (
          <div className="bg-white p-6 rounded-xl border border-paa-navy/5 shadow-sm animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif font-semibold text-paa-navy flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" /> Dispatches Pending &gt; 24 Hrs
              </h3>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                  <tr>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">S. No</th>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Latest Order ID</th>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Author Name</th>
                    <th className="px-4 py-3 font-bold text-center !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Unaccepted Items</th>
                    <th className="px-4 py-3 font-bold text-center !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Delay</th>
                    <th className="px-4 py-3 font-bold text-center !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lateDeliveries.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">No late deliveries currently.</td></tr> : lateDeliveries.map((ld, idx) => (
                    <React.Fragment key={idx}>
                      <tr className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'} hover:bg-slate-200/60 transition-colors`}>
                        <td className="px-4 py-3 font-bold text-paa-gray-text">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-paa-navy flex items-center gap-2">
                          <button onClick={() => setExpandedCustomerRow(expandedCustomerRow === idx ? null : idx)} className="text-gray-400 hover:text-paa-navy transition-colors focus:outline-none">
                            <ChevronDown size={16} className={`transition-transform duration-300 ${expandedCustomerRow === idx ? 'rotate-180' : ''}`} />
                          </button>
                          {ld.orderId}
                        </td>
                        <td className="px-4 py-3 font-medium text-paa-navy">{ld.authorName}</td>
                        <td className="px-4 py-3 text-center font-bold text-orange-600">{ld.count}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="font-bold text-orange-500 mb-1">{ld.hours} hrs</div>
                          {ld.delayType === 'Dispatch (>48h)' ? (
                            <span className="bg-purple-100 text-purple-700 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest shadow-sm inline-block">Dispatch Wait</span>
                          ) : (
                            <span className="bg-orange-100 text-orange-700 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest shadow-sm inline-block">Acceptance Wait</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center flex justify-center gap-2">
                          {(() => {
                            const authorInfo = authors.find((a: any) => a.id === ld.authorId);
                            const fineAmt = authorInfo?.extraData?.lateFines || 0;
                            const isPendingApprove = authorInfo?.extraData?.fineStatus === 'Pending Verification';

                            if (fineAmt > 0 && !isPendingApprove) {
                              return (
                                <span className="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                  <AlertCircle size={12} /> Fine Active
                                </span>
                              );
                            }
                            if (isPendingApprove) {
                              return (
                                <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                  <CheckCircle size={12} /> Reviewing Pmt
                                </span>
                              );
                            }

                            const notifiedDateStr = authorInfo?.extraData?.lateNotificationDate;
                            let diffDays = -1;
                            if (notifiedDateStr) {
                              diffDays = (new Date().getTime() - new Date(notifiedDateStr).getTime()) / (1000 * 3600 * 24);
                            }

                            if (diffDays >= 0 && diffDays <= 1) {
                              const daysLeft = Math.max(0, 1 - Math.floor(diffDays));
                              return (
                                <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                  <Check size={12} /> Notified ({daysLeft}d left)
                                </span>
                              );
                            } else {
                              return (
                                <>
                                  <button onClick={async () => {
                                    try {
                                      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/authors/${ld.authorId}/notify-late`, {
                                        orderId: ld.orderId, count: ld.count, hours: ld.hours, delayType: ld.delayType
                                      }, {
                                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                      });
                                      toast.success(`Notification sent to ${ld.authorName}`);
                                      fetchAuthors();
                                    } catch (err) {
                                      toast.error('Failed to notify author');
                                    }
                                  }} className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-[#ebd8c0] transition-colors shadow-sm border border-blue-100" title="Send 1-Day Warning">
                                    <Bell size={14} />
                                  </button>
                                  <button onClick={() => handleOpenFineModal(ld.authorId, ld.authorName, ld)} className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 font-bold text-xs shadow-sm border border-red-100 transition-colors" title="Charge Fine">
                                    ₹
                                  </button>
                                </>
                              );
                            }
                          })()}
                        </td>
                      </tr>
                      {expandedCustomerRow === idx && (
                        <tr className="bg-orange-50/30">
                          <td colSpan={5} className="px-8 py-4 border-b border-orange-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="flex flex-col gap-1 text-sm text-paa-navy">
                                <div className="font-semibold text-paa-gray-text text-xs uppercase tracking-widest mb-2">Customer Contact for {ld.orderId}</div>
                                <div className="flex items-center gap-2"><User size={14} className="text-orange-400" /> {ld.customerInfo.name}</div>
                                <div className="flex items-center gap-2"><Phone size={14} className="text-orange-400" /> {ld.customerInfo.phone}</div>
                                <div className="flex items-center gap-2"><Mail size={14} className="text-orange-400" /> {ld.customerInfo.email}</div>
                              </div>
                              <div className="flex flex-col gap-1 text-sm text-paa-navy">
                                <div className="font-semibold text-paa-gray-text text-xs uppercase tracking-widest mb-2">Delayed Items in {ld.orderId}</div>
                                <div className="space-y-1">
                                  {ld.lateItems.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center bg-white px-3 py-2 rounded shadow-sm border border-orange-100/50">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-paa-navy">{item.title}</span>
                                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{item.status}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-xs text-gray-500">Qty: {item.quantity}</span><br />
                                        <span className="font-bold text-orange-600">₹{item.price * item.quantity}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Fine History ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        {activeTable === 'history' && (
          <div className="bg-white p-6 rounded-xl border border-paa-navy/5 shadow-sm animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif font-semibold text-paa-navy flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" /> Fine Payment History
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                  <tr>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">S. No</th>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Author Name</th>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Fine Amount</th>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Payment Date</th>
                    <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">Approved Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyAuthors.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 italic">No fine history available.</td></tr> : historyAuthors.flatMap((a: any) =>
                    a.extraData.fineHistory.map((h: any, idx: number) => (
                      <tr key={`${a.id}-${idx}`} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'} hover:bg-slate-200/60 transition-colors`}>
                        <td className="px-4 py-3 font-bold text-paa-gray-text">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-paa-navy">{a.name}</td>
                        <td className="px-4 py-3 font-bold text-indigo-600">₹{h.amount}</td>
                        <td className="px-4 py-3 text-gray-600">{h.paidAt ? new Date(h.paidAt).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-4 py-3 text-gray-600">{h.approvedAt ? new Date(h.approvedAt).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {fineModalAuthor && (
          <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setFineModalAuthor(null)}>
            <div className="dash-modal" style={{ maxWidth: 400 }}>
              <div className="dash-modal-header">
                <h3 className="text-sm font-bold uppercase tracking-widest text-paa-navy">Charge Fine</h3>
                <button onClick={() => setFineModalAuthor(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/6 text-paa-gray-text transition-colors">ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢</button>
              </div>
              <div className="dash-modal-body flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-bold tracking-widest uppercase text-paa-gray-text mb-1 block">Author</label>
                  <p className="font-semibold text-paa-navy">{fineModalAuthor.name}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest uppercase text-paa-gray-text mb-1 block">Fine Amount (₹)</label>
                  <input type="number" min="1" className="dash-input text-xs w-full" value={fineAmount} onChange={e => setFineAmount(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setFineModalAuthor(null)} className="dash-btn dash-btn-ghost">Cancel</button>
                  <button onClick={submitFine} disabled={isSubmittingFine} className="dash-btn dash-btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50 border-none text-white">
                    {isSubmittingFine ? 'Processing...' : 'Charge Fine'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
}, []);

  const renderAuthorsTab = ({ refreshTrigger }: any) => {

    const handleExportAuthorsCSV = async () => {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const dynamicKeys = Array.from(new Set<string>(
        authors.reduce((acc: string[], author: any) => {
          if (author.extraData) acc = acc.concat(Object.keys(author.extraData));
          return acc;
        }, [])
      ));
      const baseFields = ['Status', 'Name', 'Pen Name', 'Email', 'Phone', 'WhatsApp', 'Address', 'City', 'State', 'Aadhar/Voter ID/DL', 'Qualification', 'DOB', 'Experience', 'Skills', 'Hobbies', 'Why Joining', 'Transaction ID', 'Joined Date'];

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Authors Directory');
      
      const allHeaders = [...baseFields, ...dynamicKeys];
      
      sheet.mergeCells(1, 1, 1, allHeaders.length);
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = 'AUTHORS DIRECTORY EXPORT';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1A2E' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      const headerRow = sheet.addRow(allHeaders);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });
      
      authors.forEach(author => {
        const joinedDate = author.createdAt ? new Date(author.createdAt).toLocaleDateString() : '';
        const rowData = [
          author.status, author.name, author.penName, author.email, author.phone, author.whatsapp,
          author.address, author.city, author.state, author.aadharNumber, author.qualification,
          author.age, author.experience, author.skills, author.hobbies, author.whyJoining,
          author.transactionId, joinedDate
        ];
        dynamicKeys.forEach(col => {
          rowData.push(author.extraData && author.extraData[col] ? author.extraData[col] : '');
        });
        
        const addedRow = sheet.addRow(rowData);
        addedRow.eachCell((cell, colNumber) => {
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
          cell.font = { name: 'Arial', size: 10, color: { argb: '000000' } };
          
          let colBgColor = 'FFFFFF';
          if (colNumber === 1) colBgColor = 'FF8B8B'; // Light red
          else if (colNumber === 2) colBgColor = 'FFD2A3'; // Light orange
          else if (colNumber === 3) colBgColor = 'D4D8DD'; // Light gray
          else if (colNumber === 4) colBgColor = 'B3E5FC'; // Light cyan
          else if (colNumber === allHeaders.length) colBgColor = 'C8E6C9'; // Light green
          else colBgColor = 'DDA0DD'; // Lavender/Plum
          
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colBgColor } };
        });
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'master_authors_directory.xlsx');
    };
    const handleDownloadCatalogue = async (isPrintable = false) => {
      if (selectedAuthorIds.length === 0) return;
      setIsDownloadingPdf(true);
      const { downloadCataloguePDF } = await import('./CataloguePage');

      try {
        // Fetch full author data from the backend so we get all books, hobbies, skills, etc.
        const fullAuthorsData = await Promise.all(
          selectedAuthorIds.map(id =>
            axios.get(`${API}/api/admin/authors/${id}/dashboard-data`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
              .then(res => res.data.authorProfile)
          )
        );

        const formattedBooks: any[] = [];
        fullAuthorsData.forEach(author => {
          if (!author) return;
          let ed = author.extraData;
          if (typeof ed === 'string') {
            try { ed = JSON.parse(ed); } catch (e) { ed = {}; }
          }
          ed = ed || {};

          const authorBooks = author.books || [];

          if (authorBooks.length === 0) {
            formattedBooks.push({
              id: 'NO_BOOK',
              title: '',
              synopsis: '',
              mrp: null,
              mrpRaw: '',
              coverUrl: '',
              authorName: author.name || 'Unknown Author',
              authorBio: author.bio || '',
              authorPhotoUrl: author.photoUrl || '',
              authorInstagram: author.instagram || ed.instagram || '',
              authorFacebook: author.facebook || ed.facebook || '',
              authorWhatsapp: author.whatsapp || ed.whatsapp || '',
              authorQualification: author.qualification || ed.qualification || '',
              authorAge: author.age || ed.age || '',
              authorExperience: author.experience || ed.experience || '',
              authorSkills: author.skills || ed.skills || '',
              authorHobbies: author.hobbies || ed.hobbies || '',
              genre: '',
              subGenre: '',
              pages: null,
              language: '',
              isbn: '',
              publisher: '',
              publicationDate: '',
              edition: '',
              format: '',
              rating: 5,
              reviewsCount: 10
            });
          } else {
            authorBooks.forEach((book: any) => {
              formattedBooks.push({
                id: book.id || String(Math.random()),
                title: book.title || 'Untitled',
                synopsis: book.synopsis || '',
                mrp: parseFloat(book.mrp) || null,
                mrpRaw: String(book.mrp || ''),
                coverUrl: book.coverUrl || '',
                authorName: author.name || 'Unknown Author',
                authorBio: author.bio || '',
                authorPhotoUrl: author.photoUrl || '',
                authorInstagram: author.instagram || ed.instagram || '',
                authorFacebook: author.facebook || ed.facebook || '',
                authorWhatsapp: author.whatsapp || ed.whatsapp || '',
                authorQualification: author.qualification || ed.qualification || '',
                authorAge: author.age || ed.age || '',
                authorExperience: author.experience || ed.experience || '',
                authorSkills: author.skills || ed.skills || '',
                authorHobbies: author.hobbies || ed.hobbies || '',
                genre: book.genre || 'General',
                subGenre: book.subGenre || '',
                pages: parseInt(book.pages) || null,
                language: book.language || 'English',
                isbn: book.isbn || '',
                publisher: book.publisher || '',
                publicationDate: book.publicationDate || '',
                edition: book.edition || '',
                format: book.format || '',
                rating: 5,
                reviewsCount: 10
              });
            });
          }
        });

        downloadCataloguePDF('Exclusive', formattedBooks, setIsDownloadingPdf, {}, isPrintable, !isPrintable).then(() => {
          toast.success("PDF generated successfully!");
        }).catch(err => {
          console.error(err);
          toast.error("Error generating PDF catalogue.");
        });
      } catch (err) {
        console.error(err);
        toast.error("Error fetching full author details.");
        setIsDownloadingPdf(false);
      }
    };

    if (selectedPendingAuthor) {
      return (
        <div className="bg-white fixed inset-0 z-50 overflow-y-auto">
          <AuthorRegistrationPage
            initialData={selectedPendingAuthor}
            isAdminEdit={true}
            onAdminCancel={() => setSelectedPendingAuthor(null)}
            onAdminSave={() => {
              setSelectedPendingAuthor(null);
              fetchAuthors();
            }}
            onAdminReject={() => {
              openRejectAuthorModal(selectedPendingAuthor);
              setSelectedPendingAuthor(null);
            }}
          />
        </div>
      );
    }

    if (selectedAuthor) {
      return <AuthorFullProfileView author={selectedAuthor} onBack={() => setSelectedAuthor(null)} />;
    }

    return (
      <div className="bg-white border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out flex flex-col">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-serif font-semibold text-[#0b1a2e] tracking-tight">Authors Directory</h3>
            <span className="bg-[#0b1a2e]/10 text-[#0b1a2e] py-1 px-3 text-xs font-bold shadow-sm rounded-full">{authors.length} Total</span>
          </div>
          <div className="relative shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="SEARCH AUTHORS..."
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 text-[#0b1a2e] text-xs font-bold tracking-widest uppercase outline-none focus:border-[#0b1a2e] focus:bg-white transition-colors w-full sm:w-72 placeholder-gray-400 rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="p-3 bg-gray-50/80 border-b border-gray-200 flex flex-row items-center justify-between gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar">
          <div className="flex flex-row gap-1.5 shrink-0">
            {(() => {
              const parseEd = (extraData: any) => typeof extraData === 'string' ? (() => { try { return JSON.parse(extraData); } catch (e) { return {}; } })() : (extraData || {});
              const counts = {
                'All': authors.length,
                'Reapplied': authors.filter(a => parseEd(a.extraData)?.isReapplied && a.status === 'Pending').length,
                'Pending': authors.filter(a => a.status === 'Pending' && !parseEd(a.extraData)?.isReapplied).length,
                'Edited': authors.filter(a => a.status === 'Edited').length,
                'Added New Book': authors.filter(a => a.status === 'Added New Book').length,
                'Active': authors.filter(a => a.status === 'Active').length,
                'Rejected': authors.filter(a => a.status === 'Rejected').length,
              };
              return ['All', 'Reapplied', 'Pending', 'Edited', 'Added New Book', 'Active', 'Rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setAuthorStatusFilter(status)}
                  className={`px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-all rounded-full whitespace-nowrap border shadow-sm shrink-0 ${authorStatusFilter === status ? 'bg-[#0b1a2e] text-white border-[#0b1a2e] shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:text-[#0b1a2e] hover:bg-gray-50 hover:border-gray-300'}`}
                >
                  {status === 'Reapplied' ? '🔄 Reapplied' : status} ({counts[status as keyof typeof counts]})
                </button>
              ));
            })()}
          </div>
          <div className="flex flex-row items-center gap-2 shrink-0">
            <button onClick={() => handleDownloadCatalogue(false)} disabled={selectedAuthorIds.length === 0 || isDownloadingPdf} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:text-[#0b1a2e] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm">
              {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} {isDownloadingPdf ? 'Generating...' : 'Download PDF'}
            </button>
            <button onClick={() => handleDownloadCatalogue(true)} disabled={selectedAuthorIds.length === 0 || isDownloadingPdf} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:text-[#0b1a2e] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm">
              {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />} {isDownloadingPdf ? 'Generating...' : 'Print PDF'}
            </button>
            <button onClick={handleExportAuthorsCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:text-[#0b1a2e] whitespace-nowrap shadow-sm">
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="dash-table">
            <thead className="bg-indigo-50 border-b-2 border-indigo-100">
              <tr>
                <th className="w-10 text-center !bg-transparent">
                  <input
                    type="checkbox"
                    checked={authors.length > 0 && selectedAuthorIds.length === authors.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAuthorIds(authors.map(a => a.id));
                      } else {
                        setSelectedAuthorIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-paa-navy focus:ring-paa-navy cursor-pointer"
                  />
                </th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent">Author Details</th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent">Contact</th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent">Location</th>
                <th style={{ textAlign: 'center' }} className="!text-[14px] !text-indigo-800 !bg-transparent">Status</th>
                <th style={{ textAlign: 'center' }} className="!text-[14px] !text-indigo-800 !bg-transparent">Participation</th>
                <th style={{ textAlign: 'center' }} className="!text-[14px] !text-indigo-800 !bg-transparent">Books</th>
                <th style={{ textAlign: 'center' }} className="!text-[14px] !text-indigo-800 !bg-transparent">Actions</th>
              </tr>
            </thead>
            <tbody>
              {authors.filter(a => {
                const ed = typeof a.extraData === 'string' ? (() => { try { return JSON.parse(a.extraData); } catch (e) { return {}; } })() : (a.extraData || {});
                const isReapplied = ed?.isReapplied === true;
                const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || (a.email && a.email.toLowerCase().includes(searchTerm.toLowerCase())) || (a.books && a.books.some((b: any) => b.title.toLowerCase().includes(searchTerm.toLowerCase()) || (b.genre && b.genre.toLowerCase().includes(searchTerm.toLowerCase()))));
                if (!matchesSearch) return false;
                if (authorStatusFilter === 'All') return true;
                if (authorStatusFilter === 'Reapplied') return isReapplied && a.status === 'Pending';
                if (authorStatusFilter === 'Pending') return a.status === 'Pending' && !isReapplied;
                if (authorStatusFilter === 'Edited') return a.status === 'Edited';
                return a.status === authorStatusFilter;
              }).sort((a, b) => {
                const edA = typeof a.extraData === 'string' ? (() => { try { return JSON.parse(a.extraData); } catch (e) { return {}; } })() : (a.extraData || {});
                const edB = typeof b.extraData === 'string' ? (() => { try { return JSON.parse(b.extraData); } catch (e) { return {}; } })() : (b.extraData || {});
                if (edA?.isReapplied && !edB?.isReapplied) return -1;
                if (!edA?.isReapplied && edB?.isReapplied) return 1;
                if (a.status === 'Pending' && b.status !== 'Pending') return -1;
                if (a.status !== 'Pending' && b.status === 'Pending') return 1;
                return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
              }).map((author, idx) => (
                <tr key={author.id} className={`${selectedAuthorIds.includes(author.id) ? 'bg-indigo-100' : (idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]')} hover:bg-sky-100 transition-colors`}>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={selectedAuthorIds.includes(author.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAuthorIds(prev => [...prev, author.id]);
                        } else {
                          setSelectedAuthorIds(prev => prev.filter(id => id !== author.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-paa-navy focus:ring-paa-navy cursor-pointer"
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#f0f4f8] border border-paa-navy/5 text-paa-navy flex items-center justify-center font-bold font-serif text-lg">
                        {author.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-paa-navy flex items-center">
                          {author.name}
                          {(() => {
                            let ed = author.extraData;
                            if (typeof ed === 'string') {
                              try { ed = JSON.parse(ed); } catch (e) { }
                            }
                            const pendingBooksCount = books.filter(b => b.authorId === author.id && b.status === 'Pending').length;
                            if (pendingBooksCount > 0) {
                              return null; // The main status badge handles this now.
                            }
                            return ed?.hasPendingEdits && (
                              <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] uppercase tracking-wider font-bold rounded-full">Edited</span>
                            );
                          })()}
                        </p>
                        <p className="text-xs text-paa-gray-text flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> Joined {author.joined}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="text-paa-navy font-medium">{author.email}</p>
                    <p className="text-paa-gray-text text-xs mt-0.5 font-medium">{author.phone}</p>
                  </td>
                  <td className="align-middle">
                    <div className="flex flex-col gap-2">
                      {author.city || author.state ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-paa-navy font-bold">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate max-w-[140px] uppercase tracking-wider">{[author.city, author.state].filter(Boolean).join(', ')}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold uppercase">No Location Info</span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {(() => {
                      const ed = typeof author.extraData === 'string' ? (() => { try { return JSON.parse(author.extraData); } catch (e) { return {}; } })() : (author.extraData || {});
                      const isReapplied = ed?.isReapplied === true && author.status === 'Pending';
                      const pendingBooksCount = books.filter(b => b.authorId === author.id && b.status === 'Pending').length;

                      if (isReapplied) {
                        return <span className="dash-badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid transparent' }}>🔄 Reapplied</span>;
                      }

                      if ((author.status === 'Edited' || author.status === 'Active') && pendingBooksCount > 0) {
                        return <span className="dash-badge" style={{ background: '#dbeafe', color: '#1e40af', border: '1px solid transparent' }}>+ {pendingBooksCount} Book{pendingBooksCount > 1 ? 's' : ''}</span>;
                      }

                      return (
                        <span className={`dash-badge ${author.status === 'Active' ? 'active' : author.status === 'Rejected' ? 'rejected' : 'pending'}`}>
                          {author.status}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {author.aggEligibleEvents > 0 ? (
                      <div>
                        <div className="font-bold text-paa-navy text-sm">{Math.round((author.aggParticipatedEvents / author.aggEligibleEvents) * 100)}%</div>
                        <div className="text-[10px] font-medium text-gray-500 uppercase">{author.aggParticipatedEvents}/{author.aggEligibleEvents} Events</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs font-bold uppercase">N/A</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }} className="font-bold text-paa-navy">
                    {author.totalBooks}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {(() => {
                        const ed = typeof author.extraData === 'string' ? (() => { try { return JSON.parse(author.extraData); } catch (e) { return {}; } })() : (author.extraData || {});
                        const isReapplied = ed?.isReapplied === true;
                        const hasPending = ed?.hasPendingEdits === true;
                        const pendingBooksCount = books.filter(b => b.authorId === author.id && b.status === 'Pending').length;
                        const needsApproval = author.status === 'Pending' || author.status === 'Edited' || isReapplied || hasPending || pendingBooksCount > 0;

                        if (needsApproval) {
                          return (
                            <>
                              <button onClick={() => handleApproveAuthor(author.id)} className="dash-btn dash-btn-success" title="Approve">
                                {loadingAction === 'approveAuthor_' + author.id ? '...' : 'Approve'}
                              </button>
                              <button onClick={() => openRejectAuthorModal(author)} className="dash-btn dash-btn-danger" title="Reject">
                                Reject
                              </button>
                            </>
                          );
                        }
                        return null;
                      })()}
                      <button onClick={() => handleViewEditAuthor(author)} className="dash-btn dash-btn-success dash-btn-icon" title="View / Edit Application">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteAuthor(author.id)} className="dash-btn dash-btn-danger dash-btn-icon" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {author.status === 'Rejected' && author.rejectionReason && (
                      <div className="mt-2 text-xs text-red-600 font-medium text-left leading-tight bg-red-50 p-2 rounded border border-red-100">
                        <span className="font-bold">Reason:</span> {author.rejectionReason}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {authors.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-paa-gray-text bg-white">No authors found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {authorsMeta?.totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">Showing page {authorsPage} of {authorsMeta.totalPages} (Total: {authorsMeta.total} authors)</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setAuthorsPage(p => Math.max(1, p - 1)); setTimeout(fetchAuthors, 0); }}
                disabled={authorsPage === 1}
                className="px-4 py-2 border border-gray-200 rounded text-sm text-paa-navy disabled:opacity-50 font-medium bg-white hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => { setAuthorsPage(p => Math.min(authorsMeta.totalPages, p + 1)); setTimeout(fetchAuthors, 0); }}
                disabled={authorsPage === authorsMeta.totalPages}
                className="px-4 py-2 border border-gray-200 rounded text-sm text-paa-navy disabled:opacity-50 font-medium bg-white hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const BooksTab = () => {
    const [bookSearchTerm, setBookSearchTerm] = useState('');
    const [expandedBookId, setExpandedBookId] = useState<number | null>(null);

    const handleExportBookCatalogue = async () => {
      try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Book Catalogue');

        const authorsMap: Record<string, any[]> = {};
        const activeBooks = books.filter(b => b.status === 'Approved');
        
        activeBooks.forEach(b => {
           const authorName = b.author?.name || b.authorName || 'Unknown Author';
           if (!authorsMap[authorName]) authorsMap[authorName] = [];
           authorsMap[authorName].push(b);
        });

        const authorNames = Object.keys(authorsMap).sort((a, b) => a.localeCompare(b));
        const maxBooks = Math.max(0, ...authorNames.map(name => authorsMap[name].length));

        const bannerRow = sheet.addRow(['', '', 'LIST OF BOOKS OF AUTHORS REGISTERED IN THIS GROUP']);
        bannerRow.getCell(3).font = { bold: true };
        bannerRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
        bannerRow.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        bannerRow.getCell(3).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        
        if (maxBooks > 0) {
          sheet.mergeCells(1, 3, 1, Math.max(3, maxBooks + 2));
        }

        const headers = ['S. No', 'AUTHOR NAME'];
        for (let i = 1; i <= maxBooks; i++) {
          headers.push(`BOOK-${i}`);
        }
        const headerRow = sheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        
        headerRow.eachCell((cell, colNumber) => {
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
          if (colNumber <= 2) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC99' } };
          }
        });
        
        authorNames.forEach((authorName, idx) => {
           const rowData = [idx + 1, authorName];
           const authorBooks = authorsMap[authorName];
           const row = sheet.addRow(rowData);
           
           row.getCell(1).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
           row.getCell(1).alignment = { horizontal: 'center' };
           row.getCell(2).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
           
           authorBooks.forEach((book, bookIdx) => {
              const cell = row.getCell(3 + bookIdx);
              cell.value = book.title;
              cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
              
              let color = 'FFFFFFFF';
              const genre = (book.genre || '').toLowerCase();
              
              if (genre.includes('non-fiction') || genre.includes('non fiction')) {
                 color = 'FF00FFFF'; // Blue / Cyan
              } else if (genre.includes('fiction')) {
                 color = 'FFFF66CC'; // Pink
              } else if (genre.includes('poetry') || genre.includes('poem')) {
                 color = 'FFFFFF00'; // Yellow
              } else if (genre.includes('children') || genre.includes('academic') || genre.includes('education') || genre.includes('textbook') || genre.includes('school')) {
                 color = 'FF00FF00'; // Green
              }
              
              if (color !== 'FFFFFFFF') {
                cell.fill = {
                   type: 'pattern',
                   pattern: 'solid',
                   fgColor: { argb: color }
                };
              }
           });
           
           for (let i = authorBooks.length + 3; i <= maxBooks + 2; i++) {
              row.getCell(i).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
           }
        });
        
        sheet.addRow([]);
        const legendRow = sheet.addRow(['', 'Colour code is for the Genre. Blue = NF, Pink = F, Yellow = P, Green = C']);
        legendRow.getCell(2).font = { bold: true };
        legendRow.getCell(2).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        sheet.mergeCells(legendRow.number, 2, legendRow.number, 5);

        sheet.columns.forEach((col, idx) => {
          col.width = idx === 1 ? 25 : 35;
        });
        sheet.getColumn(1).width = 8;

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Book_Catalogue_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Excel downloaded successfully!');
      } catch (err) {
        toast.error('Failed to generate Excel file');
        console.error(err);
      }
    };

    return (
      <div className="bg-white border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out flex flex-col">
        <div className="p-4 border-b border-paa-navy/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#e6f2eb]">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-serif font-semibold text-paa-navy tracking-tight">Book Catalogue</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-3xl-2xl p-1 overflow-x-auto whitespace-nowrap">
                {['All', 'Pending', 'Approved', 'Rejected'].map(status => {
                  const tabCount = status === 'All' ? books.length : books.filter(b => b.status === status).length;
                  return (
                  <button
                    key={status}
                    onClick={() => setBookStatusFilter(status)}
                    className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors rounded-3xl-2xl flex items-center gap-1.5 ${bookStatusFilter === status ? 'bg-white text-paa-navy shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out' : 'text-gray-500 hover:text-paa-navy'}`}
                  >
                    {status} <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${bookStatusFilter === status ? 'bg-gray-100 text-paa-navy' : 'bg-gray-200 text-gray-500'}`}>{tabCount}</span>
                  </button>
                )})}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-paa-gray-text" />
                <input type="text" placeholder="SEARCH BOOKS/AUTHORS..." value={bookSearchTerm} onChange={(e) => setBookSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 bg-white border border-paa-navy/20 text-xs font-bold tracking-widest uppercase outline-none focus:border-paa-navy transition-colors w-64" />
              </div>
            </div>
            <button onClick={handleExportBookCatalogue} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border border-paa-navy/20 text-paa-navy bg-white hover:bg-paa-navy hover:text-white shadow-sm whitespace-nowrap">
              <Download className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="dash-table w-full table-auto xl:table-fixed min-w-[900px] xl:min-w-0">
            <thead className="bg-indigo-50 border-b-2 border-indigo-100">
              <tr>
                <th className="w-[5%] !text-[14px] !text-indigo-800 !bg-transparent">S.No</th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent">Book Info</th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent">Author</th>
                <th style={{ textAlign: 'center' }} className="!text-[14px] !text-indigo-800 !bg-transparent">Status</th>
                <th style={{ textAlign: 'center' }} className="!text-[14px] !text-indigo-800 !bg-transparent">Price</th>
                <th style={{ textAlign: 'center' }} className="!text-[14px] !text-indigo-800 !bg-transparent">Details</th>
              </tr>
            </thead>
            <tbody>
              {books.filter(b => (bookStatusFilter === 'All' || b.status === bookStatusFilter))
                .filter(b => {
                  if (!bookSearchTerm) return true;
                  const term = bookSearchTerm.toLowerCase();
                  return (b.title && b.title.toLowerCase().includes(term)) || (b.authorName && b.authorName.toLowerCase().includes(term));
                })
                .sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }))
                .map((book, idx) => (
                  <React.Fragment key={book.id}>
                    <tr className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'} hover:bg-slate-200/60 transition-colors cursor-pointer`} onClick={() => setExpandedBookId(expandedBookId === book.id ? null : book.id)}>
                      <td className="font-bold text-paa-gray-text pl-4">{idx + 1}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1.5 flex-shrink-0">
                            {/* Front Cover */}
                            <div className="relative w-10 h-14 bg-gray-50 flex items-center justify-center rounded border border-gray-200 shadow-sm overflow-hidden select-none">
                              <span className="text-[8px] text-gray-400 text-center font-bold uppercase leading-tight px-1">
                                {book.coverUrl ? 'Broken Front' : 'No Front'}
                              </span>
                              {book.coverUrl && (
                                <img
                                  src={book.coverUrl.startsWith('http') ? book.coverUrl : `${API}${book.coverUrl.startsWith('/') ? '' : '/'}${book.coverUrl}`}
                                  alt="Front Cover"
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                              )}
                            </div>

                            {/* Back Cover */}
                            <div className="relative w-10 h-14 bg-gray-50 flex items-center justify-center rounded border border-gray-200 shadow-sm overflow-hidden select-none">
                              <span className="text-[8px] text-gray-400 text-center font-bold uppercase leading-tight px-1">
                                {book.backCoverUrl ? 'Broken Back' : 'No Back'}
                              </span>
                              {book.backCoverUrl && (
                                <img
                                  src={book.backCoverUrl.startsWith('http') ? book.backCoverUrl : `${API}${book.backCoverUrl.startsWith('/') ? '' : '/'}${book.backCoverUrl}`}
                                  alt="Back Cover"
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-paa-navy mb-1 flex items-center">
                              {book.title}
                              {(book.overpriced || book.isOverpriced) && <span className="ml-2 bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Overpriced (Warning)</span>}
                            </p>
                            <div className="flex items-center gap-2 text-xs font-medium">
                              <span className="text-[#5bc0de] font-bold uppercase">{book.genre}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-paa-navy font-bold">{book.authorName}</p>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`dash-badge ${book.status === 'Approved' ? 'approved' : book.status === 'Rejected' ? 'rejected' : 'pending'}`}>
                          {book.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-bold text-paa-navy">
                        ₹{book.mrp}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="p-1.5 rounded-full hover:bg-gray-100 text-paa-navy transition-colors mx-auto flex items-center justify-center" title="Toggle Details">
                          <ChevronDown size={16} className={`transition-transform duration-300 ${expandedBookId === book.id ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                    </tr>
                    {expandedBookId === book.id && (
                      <tr className="bg-indigo-50/10 border-b border-indigo-100/50 shadow-inner cursor-default" onClick={(e) => e.stopPropagation()}>
                        <td colSpan={6} className="p-0">
                          <div className="p-6 md:p-8 animate-fade-in-up">
                            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                              {book.coverUrl && (
                                <img src={book.coverUrl.startsWith('http') ? book.coverUrl : `${API}${book.coverUrl}`} alt="Cover" className="w-40 h-56 object-cover border border-paa-navy/20 shadow-md rounded" />
                              )}
                              <div className="flex-1">
                                <h3 className="text-3xl font-serif font-bold text-paa-navy mb-1">{book.title}</h3>
                                {book.subtitle && <p className="text-lg font-medium text-paa-gray-text mb-2">{book.subtitle}</p>}
                                <p className="text-base font-medium mb-2">Author: <span className="font-bold text-paa-navy">{book.authorName}</span></p>
                                <p className="text-xs font-bold uppercase tracking-widest text-paa-navy mt-2 bg-[#eef2f6] inline-block px-3 py-1">{book.genre} {book.subGenre && `> ${book.subGenre}`}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 border-t border-paa-navy/5 pt-6 mt-6">
                              <div><span className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text block mb-1">MRP</span><span className="text-lg font-black text-green-700">₹{book.mrp}</span></div>
                              <div><span className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text block mb-1">Language</span><span className="text-base font-bold text-paa-navy">{book.language || '-'}</span></div>
                              <div><span className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text block mb-1">Format</span><span className="text-base font-bold text-paa-navy">{book.format || '-'}</span></div>
                              <div><span className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text block mb-1">Print Format</span><span className="text-base font-bold text-paa-navy">{book.printFormat || '-'}</span></div>
                              <div><span className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text block mb-1">Pages</span><span className="text-base font-bold text-paa-navy">{book.pages || '-'}</span></div>
                              <div><span className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text block mb-1">Publisher</span><span className="text-base font-bold text-paa-navy">{book.publisher || '-'}</span></div>
                              <div><span className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text block mb-1">Edition</span><span className="text-base font-bold text-paa-navy">{book.edition || '-'}</span></div>
                              <div><span className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text block mb-1">Pub Date</span><span className="text-base font-bold text-paa-navy">{book.publicationDate || '-'}</span></div>
                              <div><span className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text block mb-1">ISBN</span><span className="text-base font-bold text-paa-navy">{book.isbn || '-'}</span></div>

                              <div><span className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text block mb-1">Current Stock</span><span className="text-lg font-black text-paa-navy">{book.stock}</span></div>
                              <div><span className="text-[10px] font-bold uppercase tracking-widest text-paa-gray-text block mb-1">Total Sales</span><span className="text-lg font-black text-paa-navy">{book.sales || 0}</span></div>
                            </div>

                            <div className="border-t border-paa-navy/5 pt-6 mt-6 space-y-6">
                              <div>
                                <span className="text-sm font-bold uppercase tracking-widest text-paa-navy block mb-3">Purpose of Writing</span>
                                <p className="text-sm text-paa-gray-text leading-relaxed whitespace-pre-wrap">{book.purpose || 'Not provided.'}</p>
                              </div>
                              <div>
                                <span className="text-sm font-bold uppercase tracking-widest text-paa-navy block mb-3">Synopsis</span>
                                <p className="text-sm text-paa-gray-text leading-relaxed whitespace-pre-wrap">{book.synopsis || 'No synopsis provided.'}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              {books.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-paa-gray-text bg-white">No books found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };





  const renderEventsTab = () => {
    const handleExportEventRegistrations = async () => {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Event Registrations');

      const headers = [
        'S.No', 'Author Name', 'City', 'Date Registered', 
        'Included in the Catalogue', 'Included in the Database', 
        'Donating Books to the Airport', 'Participating in Website'
      ];
      events.forEach(e => headers.push(`Participated in ${e.name.replace(/,/g, '')}`));
      headers.push(
        'No of Literary Events participated in', 
        'No of Literary Events Organised', 
        'No of Book Fair Stall Organised', 
        'Authors Offering Publishing Services'
      );

      sheet.mergeCells(1, 1, 1, headers.length);
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = 'EVENT REGISTRATIONS EXPORT';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1A2E' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      authors.forEach((author, idx) => {
        const city = author.address ? author.address.split(',').pop()?.trim() || '' : '';
        const registeredDate = new Date(author.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
        
        const rowData = [
          idx + 1, author.name, city, registeredDate, 'Yes', 'Yes', 'NA', 'Yes'
        ];

        const registeredEventIds = author.eventRegistrations ? author.eventRegistrations.map((r: any) => r.eventId) : [];
        let numEventsParticipated = registeredEventIds.length;

        events.forEach(e => {
          rowData.push(registeredEventIds.includes(e.id) ? 'Yes' : 'No');
        });

        const literaryParticipated = events.filter(e => registeredEventIds.includes(e.id) && e.eventType?.toLowerCase().includes('literary')).length;
        const bookFairs = events.filter(e => registeredEventIds.includes(e.id) && e.eventType?.toLowerCase().includes('fair')).length;
        
        rowData.push(numEventsParticipated, literaryParticipated, bookFairs, 'No');
        
        const addedRow = sheet.addRow(rowData);
        addedRow.eachCell((cell, colNumber) => {
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
          cell.font = { name: 'Arial', size: 10, color: { argb: '000000' } };
          
          let colBgColor = 'FFFFFF';
          if (colNumber === 2) colBgColor = 'FF8B8B'; // Light red (Author Name)
          else if (colNumber === 3) colBgColor = 'FFD2A3'; // Light orange (City)
          else if (colNumber === 4) colBgColor = 'D4D8DD'; // Light gray (Registration Date)
          else if (colNumber >= 9 && colNumber <= 8 + events.length) colBgColor = 'DDA0DD'; // Lavender (Events Participated)
          else if (colNumber > 8 + events.length) colBgColor = 'B3E5FC'; // Cyan for final columns
          
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colBgColor } };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'event_registrations.xlsx');
    };

    const handleExportEventsExcel = async () => {
      try {
        const toastId = toast.loading('Generating Excel file...');
        const res = await axios.get(`${API}/api/admin/events/export`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          responseType: 'blob',
        });
        toast.dismiss(toastId);
        toast.success('Excel generated successfully!');
        
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Events_Export.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (err) {
        toast.dismiss();
        toast.error('Failed to export Events to Excel');
        console.error(err);
      }
    };


    const handleOpenBreakdown = (evt: any) => {
      setSelectedEventBreakdown(evt);
      const isPastOrLegacy = evt.isLegacy || evt.status === 'Past' || evt.status === 'Legacy Archive';
      setShowAllPlatformAuthors(isPastOrLegacy);
      fetchEventRegistrations(evt.id);
      fetchAuthors(true);
      const slug = `${evt.id}-${evt.name.replace(/\s+/g, '-').toLowerCase()}`;
      navigate(`/operations/events/${slug}`);
      setTimeout(() => {
        const scrollEl = document.getElementById('admin-dashboard-scroll');
        if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'auto' });
        else window.scrollTo({ top: 0, behavior: 'auto' });
      }, 0);
    };

    const handleCloseBreakdown = () => {
      setSelectedEventBreakdown(null);
      setSelectedAuthorForData(null);
      navigate('/operations');
    };

    const handleSaveAggregateData = async () => {
      try {
        const formData = new FormData();
        formData.append('aggAuthors', selectedEventBreakdown.aggAuthors?.toString() || '0');
        formData.append('aggTitles', selectedEventBreakdown.aggTitles?.toString() || '0');
        formData.append('aggSent', selectedEventBreakdown.aggSent?.toString() || '0');
        formData.append('aggSold', selectedEventBreakdown.aggSold?.toString() || '0');
        formData.append('aggRevenue', selectedEventBreakdown.aggRevenue?.toString() || '0');
        formData.append('aggEligibleAuthors', selectedEventBreakdown.aggEligibleAuthors?.toString() || '0');

        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/events/${selectedEventBreakdown.id}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success('Aggregate stats saved!');
        fetchEvents();
      } catch (err) {
        toast.error('Failed to save aggregate stats');
      }
    };

    const handleGeneratePoster = async () => {
      const form = document.getElementById('create-event-form') as HTMLFormElement;
      if (!form) return;
      const name = (form.elements.namedItem('name') as HTMLInputElement)?.value;
      const date = (form.elements.namedItem('date') as HTMLInputElement)?.value;
      const location = (form.elements.namedItem('location') as HTMLInputElement)?.value;
      
      if (!name || !date || !location) {
          toast.error("Please enter Event Name, Date, and Location to generate poster");
          return;
      }
      
      setPosterData({ name, date, location });
      
      setTimeout(async () => {
          if (!posterRef.current) return;
          try {
              toast.loading("Generating poster...", { id: 'poster-toast' });
              // @ts-ignore
              const html2canvas = (await import('html2canvas')).default;
              const canvas = await html2canvas(posterRef.current, { scale: 2, useCORS: true });
              canvas.toBlob((blob) => {
                  if (blob) {
                      const file = new File([blob], 'event-poster.png', { type: 'image/png' });
                      setGeneratedPoster(file);
                      setGeneratedPosterPreview(URL.createObjectURL(file));
                      toast.success("Poster generated and set as banner!", { id: 'poster-toast' });
                  }
              });
          } catch (err) {
              console.error("Poster generation error:", err);
              toast.error("Failed to generate poster", { id: 'poster-toast' });
          }
      }, 500);
    };

    if (isEventModalOpen) {
      const isPastEvent = createEventStatus === 'Past' || createEventStatus === 'Legacy Archive';
      return (
        <div className="bg-white rounded-xl shadow-premium p-8 border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6 border-b pb-4">
            <h3 className="text-2xl font-serif text-paa-navy">Create New Event</h3>
            <button onClick={() => setIsEventModalOpen(false)} className="dash-btn bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors shadow-sm">Cancel & Go Back</button>
          </div>
          <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
            <div>
              <form id="create-event-form" className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                const target = e.target as any;
                setIsSubmittingEvent(true);
                try {
                  const fd = new FormData();
                  fd.append('name', target.name.value);
                  const createDateTypeVal = createDateType;
                  const createDateVal = createDateTypeVal === 'exact' ? target.date.value : (target.tentativeDateInput?.value || createTentativeDate);
                  fd.append('dateType', createDateTypeVal);
                  fd.append('date', createDateVal);
                  if (createDateTypeVal === 'tentative') {
                    fd.append('tentativeDate', createDateVal);
                  }
                  fd.append('location', target.location.value);

                  const days = target.durationDays.value;
                  const hours = target.durationHours.value;
                  let durationStr = [];
                  if (days && parseInt(days) > 0) durationStr.push(`${days} Days`);
                  if (hours && parseInt(hours) > 0) durationStr.push(`${hours} Hours`);
                  fd.append('duration', durationStr.length > 0 ? durationStr.join(', ') : '0 Days');

                  if (target.startTime?.value) fd.append('startTime', target.startTime.value);
                  if (target.endTime?.value) fd.append('endTime', target.endTime.value);
                  fd.append('eventType', target.eventType.value);
                  fd.append('category', target.category.value);
                  fd.append('registrationFee', target.registrationFee.value);
                  fd.append('feeType', target.feeType.value);
                  if (target.description.value) fd.append('description', target.description.value);
                  fd.append('livePosEnabled', target.livePosEnabled?.checked ? 'true' : 'false');
                  fd.append('notifyAllAuthors', target.notifyAllAuthors?.checked ? 'true' : 'false');
                  if (target.banner.files[0]) {
                    fd.append('banner', target.banner.files[0]);
                  } else if (generatedPoster) {
                    fd.append('banner', generatedPoster);
                  }

                  if (!hasGranularData) {
                    fd.append('aggAuthors', target.aggAuthors?.value || '0');
                    fd.append('aggSent', target.aggSent?.value || '0');
                    fd.append('aggSold', target.aggSold?.value || '0');
                    fd.append('aggRevenue', target.aggRevenue?.value || '0');
                    fd.append('aggEligibleAuthors', target.aggEligibleAuthors?.value || '0');
                  }

                  await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/events`, fd, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                  toast.success('Event Created Successfully!');
                  setIsEventModalOpen(false);
                } catch (err: any) {
                  toast.error(err.response?.data?.error || err.message);
                } finally {
                  setIsSubmittingEvent(false);
                }
              }}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2"><label className="dash-label">Event Name</label><input required name="name" type="text" className="dash-input" /></div>
                    <div>
                      <label className="dash-label">Event Status</label>
                      <select name="status" className="dash-input" value={createEventStatus} onChange={(e) => setCreateEventStatus(e.target.value)}>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Past">Past (Granular Data)</option>
                        <option value="Legacy Archive">Legacy Archive (Aggregate Data)</option>
                      </select>
                    </div>
                    <div>
                      <label className="dash-label">Event Banner (Optional)</label>
                      <div className="flex flex-col gap-2">
                        <input name="banner" type="file" accept="image/*" className="dash-input" />
                        <button type="button" onClick={handleGeneratePoster} className="px-3 py-1.5 bg-paa-gold text-paa-navy text-xs font-bold uppercase rounded border border-paa-gold hover:bg-white transition-colors">
                          Generate Event Poster
                        </button>
                      </div>
                      {generatedPosterPreview && (
                        <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                          <span className="text-[10px] text-paa-navy font-bold uppercase tracking-wider block mb-2">Generated Poster:</span>
                          <div className="relative group inline-block">
                            <a href={generatedPosterPreview} target="_blank" rel="noreferrer" title="Click to view full poster">
                              <img src={generatedPosterPreview} alt="Generated Poster" className="w-full max-w-[150px] h-auto object-contain border-2 border-white shadow-sm rounded hover:shadow-md transition-shadow cursor-pointer" />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded pointer-events-none">
                                <span className="text-white text-[10px] font-bold uppercase tracking-wider bg-black/50 px-2 py-1 rounded">View</span>
                              </div>
                            </a>
                            <button 
                              type="button" 
                              onClick={() => { setGeneratedPoster(null); setGeneratedPosterPreview(null); }} 
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition-colors z-10"
                              title="Remove Poster"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div><label className="dash-label">Event Description</label><textarea name="description" rows={3} className="dash-input resize-y" placeholder="Short details about the event..."></textarea></div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="dash-label">Format</label>
                      <select name="eventType" className="dash-input">
                        <option value="" disabled hidden>Select Format</option>
                        <option value="Meet the Authors">Meet the Authors</option>
                        <option value="Stall">Stall</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="dash-label">Category</label>
                      <select name="category" className="dash-input">
                        <option value="" disabled hidden>Select Category</option>
                        <option value="Housing Society">Housing Society</option>
                        <option value="College">College</option>
                        <option value="Book Fair">Book Fair</option>
                        <option value="Corporate Office">Corporate Office</option>
                        <option value="University">University</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div><label className="dash-label">Location (Venue)</label><input required name="location" type="text" className="dash-input" /></div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="dash-label !mb-0">Date</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-gray-600 hover:text-paa-navy transition-colors select-none">
                          <input
                            type="checkbox"
                            checked={createDateType === 'tentative'}
                            onChange={(e) => setCreateDateType(e.target.checked ? 'tentative' : 'exact')}
                            className="w-3.5 h-3.5 accent-paa-navy rounded cursor-pointer"
                          />
                          Tentative Date
                        </label>
                      </div>
                      {createDateType === 'exact' ? (
                        <>
                          <input required={createDateType === 'exact'} name="date" type="date" className="dash-input" value={createEventDate || ''} onChange={(e) => setCreateEventDate(e.target.value)} />
                          {createEventDate && (
                            <div className={`text-[10px] mt-1 font-bold ${isPastEvent ? 'text-orange-500' : 'text-emerald-500'}`}>
                              {isPastEvent ? '— Past Event' : '— Upcoming Event'}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <input
                            required={createDateType === 'tentative'}
                            name="tentativeDateInput"
                            type="text"
                            className="dash-input"
                            placeholder="e.g. August 2026, Coming Soon, Q4 2026"
                            value={createTentativeDate || ''}
                            onChange={(e) => setCreateTentativeDate(e.target.value)}
                          />
                          <span className="text-[10px] text-gray-500 mt-1 block font-medium">Freeform tentative date text</span>
                        </>
                      )}
                    </div>
                    <div>
                      <label className="dash-label">Duration</label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input required name="durationDays" type="number" min="0" className="dash-input" placeholder="Days" />
                        </div>
                        <div className="flex-1">
                          <input required name="durationHours" type="number" min="0" className="dash-input" placeholder="Hours" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><label className="dash-label">From Timing</label><input name="startTime" type="time" className="dash-input" /></div>
                    <div><label className="dash-label">To Timing</label><input name="endTime" type="time" className="dash-input" /></div>
                    <div><label className="dash-label">Registration Fee (₹)</label><input required name="registrationFee" type="number" defaultValue={0} className="dash-input" /></div>
                    <div>
                      <label className="dash-label">Fee Type</label>
                      <select name="feeType" className="dash-input">
                        <option value="Per Author">Per Author</option>
                        <option value="Per Title">Per Title</option>
                        <option value="Flat Fee">Flat Fee</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 p-4 bg-amber-50/50 rounded-xl border border-amber-200">
                  <input type="checkbox" name="notifyAllAuthors" id="notifyAllAuthors" className="w-4 h-4 text-amber-600 focus:ring-amber-500 rounded border-gray-300" defaultChecked={true} />
                  <label htmlFor="notifyAllAuthors" className="text-sm font-medium text-amber-900">Notify all authors about this event via email (Uncheck to save as Draft/Unpublished)</label>
                </div>

                <div className="flex items-center gap-2 mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <input type="checkbox" name="livePosEnabled" id="livePosEnabled" className="w-4 h-4 text-paa-navy focus:ring-paa-navy rounded border-gray-300" defaultChecked={!isPastEvent} />
                  <label htmlFor="livePosEnabled" className="text-sm font-medium text-paa-navy">Enable Live POS tracking for this event</label>
                </div>

                <div className="border-t border-gray-200 pt-6 mt-6">
                  {createEventStatus !== 'Legacy Archive' && (
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-sm text-blue-800">
                      * You can manage granular data for each author from the Event Breakdown view after creating this event.
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                  <button type="button" onClick={() => setIsEventModalOpen(false)} className="dash-btn dash-btn-ghost">Cancel</button>
                  <button type="submit" disabled={isSubmittingEvent} className="dash-btn dash-btn-primary min-w-[120px]">
                    {isSubmittingEvent ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span> : 'Save Event Details'}
                  </button>
                </div>
              </form>

              <div style={{ position: 'absolute', top: '0', left: '0', zIndex: -999, opacity: 0, pointerEvents: 'none' }}>
                <div ref={posterRef} className="w-[800px] h-[1200px] p-12 flex flex-col items-center justify-between relative overflow-hidden font-serif" style={{ background: 'linear-gradient(to bottom right, #0B1A2E, #312e81, #000000)', color: '#ffffff' }}>
                  {/* Background decorative elements */}
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-10 left-10 w-64 h-64 rounded-full mix-blend-overlay filter blur-3xl" style={{ backgroundColor: '#D4AF37' }}></div>
                    <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full mix-blend-overlay filter blur-3xl" style={{ backgroundColor: '#3b82f6' }}></div>
                  </div>

                  <div className="relative z-10 w-full flex flex-col items-center">
                    <div className="mb-8 w-40 h-40 rounded-full p-4 flex items-center justify-center" style={{ backgroundColor: '#ffffff', border: '4px solid #D4AF37' }}>
                      <img src="/logo.png" alt="PAA Logo" className="max-w-full max-h-full object-contain" crossOrigin="anonymous" />
                    </div>
                    
                    <h2 className="text-2xl font-bold tracking-widest uppercase mb-2" style={{ color: '#D4AF37' }}>Pune Authors Association</h2>
                    <div className="w-24 h-1 mb-16" style={{ backgroundColor: '#D4AF37' }}></div>

                    <h1 className="text-6xl font-black text-center mb-8 leading-tight" style={{ color: '#ffffff', textShadow: '0 4px 6px rgba(0,0,0,0.5)' }}>
                      {posterData?.name || 'LITERARY EVENT'}
                    </h1>
                  </div>

                  <div className="relative z-10 w-full backdrop-blur-md rounded-3xl p-10" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <div className="flex flex-col gap-8">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#D4AF37' }}>
                          <CalendarIcon className="w-8 h-8" style={{ color: '#0B1A2E' }} />
                        </div>
                        <div>
                          <p className="font-bold tracking-widest text-sm uppercase mb-1" style={{ color: '#D4AF37' }}>Date & Time</p>
                          <p className="text-3xl font-bold" style={{ color: '#ffffff' }}>
                            {posterData?.date ? new Date(posterData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'To Be Announced'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#D4AF37' }}>
                          <MapPin className="w-8 h-8" style={{ color: '#0B1A2E' }} />
                        </div>
                        <div>
                          <p className="font-bold tracking-widest text-sm uppercase mb-1" style={{ color: '#D4AF37' }}>Venue</p>
                          <p className="text-3xl font-bold leading-snug" style={{ color: '#ffffff' }}>
                            {posterData?.location || 'Venue TBA'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 w-full text-center mt-12">
                    <p className="text-xl font-medium italic mb-6" style={{ color: '#d1d5db' }}>"Empowering voices, inspiring readers."</p>
                    <p className="text-lg font-bold tracking-wider" style={{ color: '#ffffff' }}>WWW.PUNEAUTHORS.COM</p>
                  </div>
                </div>
              </div>
            </div>
          </FocusTrap>
        </div>
      );
    }

    const allCombinedEvents = events.map((e: any) => ({ ...e, isLegacy: e.status === 'Legacy Archive' })).sort((a: any, b: any) => {
      if (a.status === 'Pending Approval' && b.status !== 'Pending Approval') return -1;
      if (b.status === 'Pending Approval' && a.status !== 'Pending Approval') return 1;
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
    });


    const handleEditAuthorData = (m: any) => {
      const authorProfile = m.author || m;
      setSelectedAuthorForData(authorProfile);
      setCurrentOptInStatus(m.optInStatus || null);
      setManageRegStatus(m.optInStatus?.startsWith('Declined') ? 'Declined' : 'Registered');
      setManagePaymentStatus(m.paymentStatus || 'Unpaid');
      const expectedFee = selectedEventBreakdown?.feeType === 'Per Title' ? (m.books?.length || 0) * (selectedEventBreakdown.registrationFee || 0) : (selectedEventBreakdown?.registrationFee || 0);
      setManageAmountPaid(m.amountPaid || ((m.paymentStatus === 'Paid' || m.optInStatus?.startsWith('Registered')) ? expectedFee : 0));
      const isLegacyEvent = selectedEventBreakdown?.status === 'Legacy Archive' || selectedEventBreakdown?.isLegacy;
      setUseGlobalOverride(isLegacyEvent || (m.manualTotalSold !== null && m.manualTotalSold !== undefined));
      setGlobalSold(m.manualTotalSold || 0);
      setGlobalRevenue(m.manualTotalRevenue || 0);

      const globalBooks = authorProfile.books || [];
      const eventBooks = (m.books || []).filter((b: any) => b.bookId !== undefined);

      setManageAuthorBooks(globalBooks.map((gb: any) => {
        const evb = eventBooks.find((eb: any) => eb.bookId === gb.id);
        return {
          bookId: gb.id,
          title: gb.title || 'Unknown Book',
          mrp: parseFloat(gb.mrp) || 0,
          overrideMrp: evb?.overrideMrp || undefined,
          isSelected: !!evb,
          listedStock: evb ? (evb.listedStock || 0) : 0,
          soldStock: evb ? (evb.soldStock || 0) : 0,
          returnedStock: evb ? (evb.returnedStock || 0) : 0
        };
      }));
      setIsManageDataDirty(false);
    };

    const handlePublishData = async () => {
      try {
        setIsPublishingData(true);
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/events/${selectedEventBreakdown.id}/author/${selectedAuthorForData.id}/publish`, {
          registrationStatus: manageRegStatus,
          paymentStatus: managePaymentStatus,
          amountPaid: manageAmountPaid,
          booksData: manageAuthorBooks,
          useGlobalOverride,
          globalSold,
          globalRevenue
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        fetchEventRegistrations(selectedEventBreakdown.id);
        toast.success('Data Published! The author will now see these metrics in their dashboard.');
        setIsPublishingData(false);
        setIsManageDataDirty(false);
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to publish data.');
        if (err.response?.data?.stack) console.error(err.response.data.stack);
        setIsPublishingData(false);
      }
    };

    const handleSaveDraft = async () => {
      try {
        setIsSavingDraft(true);
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/events/${selectedEventBreakdown.id}/author/${selectedAuthorForData.id}/publish`, {
          registrationStatus: manageRegStatus,
          paymentStatus: managePaymentStatus,
          amountPaid: manageAmountPaid,
          booksData: manageAuthorBooks,
          useGlobalOverride,
          globalSold,
          globalRevenue,
          isDraft: true
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        await fetchEventRegistrations(selectedEventBreakdown.id);
        toast.success('Draft Saved! Data instantly reflected on the table.');
        setIsSavingDraft(false);
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to save draft.');
        setIsSavingDraft(false);
      }
    };
    const handleDownloadEventReport = async () => {
      if (!selectedEventBreakdown) return;

      const eventNameStr = (selectedEventBreakdown.name || "").toLowerCase();
      let staticFile = null;
      if (eventNameStr.includes("dehradun")) staticFile = "DehradunBookFair (5).xlsx";
      else if (eventNameStr.includes("goa")) staticFile = "GoaBookFair (2).xlsx";
      else if (eventNameStr.includes("jammu")) staticFile = "JammuBookFair (1).xlsx";
      else if (eventNameStr.includes("srinagar")) staticFile = "SrinagarBookFair (1).xlsx";

      if (staticFile) {
        const aLink = document.createElement('a');
        aLink.href = `/Events/${staticFile}`;
        aLink.download = staticFile;
        document.body.appendChild(aLink);
        aLink.click();
        document.body.removeChild(aLink);
        return;
      }

      const totalParticipants = eventRegistrations.length;
      const totalBooksListed = eventRegistrations.reduce((acc: number, a: any) => acc + (a.books?.reduce((s: number, b: any) => s + (b.listedStock || 0), 0) || (a.manualTotalListed || 0)), 0);
      const totalBooksSold = eventRegistrations.reduce((acc: number, a: any) => acc + ((a.books && a.books.length > 0) ? a.books.reduce((s: number, b: any) => s + (b.soldStock || 0), 0) : (a.manualTotalSold || 0)), 0);
      const totalSalesRevenue = eventRegistrations.reduce((acc: number, a: any) => acc + ((a.books && a.books.length > 0) ? a.books.reduce((s: number, b: any) => s + ((b.soldStock || 0) * (parseFloat(b.overrideMrp || b.book?.mrp || b.mrp) || 0)), 0) : (a.manualTotalRevenue || 0)), 0);
      const totalFeesReceived = eventRegistrations.reduce((acc: number, a: any) => {
        const fee = a.amountPaid != null ? parseFloat(a.amountPaid) : ((a.paymentStatus === 'Paid' || a.optInStatus?.startsWith('Registered')) ? parseFloat(selectedEventBreakdown.registrationFee || 0) : 0);
        return acc + (!isNaN(fee) ? fee : 0);
      }, 0);

      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Event Report');

      // Title & Summary styling
      sheet.mergeCells('A1:O1');
      sheet.getCell('A1').value = `Event Report: ${selectedEventBreakdown.name}`;
      sheet.getCell('A1').font = { size: 12, bold: true, color: { argb: 'FF000000' } };
      sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } }; // Cyan
      sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getCell('A1').border = { top: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' }, bottom: { style: 'medium' } };

      sheet.getCell('A2').value = 'Date/Duration:';
      sheet.getCell('B2').value = `${selectedEventBreakdown.date} / ${selectedEventBreakdown.duration}`;
      
      sheet.addRow([]);
      sheet.getCell('A4').value = 'Total Participants:';
      sheet.getCell('B4').value = totalParticipants;
      sheet.getCell('A5').value = 'Total Books Listed:';
      sheet.getCell('B5').value = totalBooksListed;
      sheet.getCell('A6').value = 'Total Books Sold:';
      sheet.getCell('B6').value = totalBooksSold;
      sheet.getCell('A7').value = 'Total Sales Revenue (MRP):';
      sheet.getCell('B7').value = `₹${totalSalesRevenue}`;
      sheet.getCell('A8').value = 'Total Fees Received:';
      sheet.getCell('B8').value = `₹${totalFeesReceived}`;
      
      ['A4','A5','A6','A7','A8'].forEach(cell => {
        sheet.getCell(cell).font = { bold: true };
      });

      sheet.addRow([]);

      // Headers
      const headers = ['S.No', 'Author Name', 'Phone', 'Email', 'Participated', 'Payment Status', 'Fees Paid', 'Book Title', 'MRP', 'Copies Received', 'Copies Sold', 'Revenue', 'Balance Remaining'];
      
      eventUniqueDates.forEach((date, i) => {
        headers.push(`Day ${i+1} (${date})`);
      });

      const headerRow = sheet.addRow(headers);
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      let sNo = 1;

      authors.forEach((author: any) => {
        const reg = eventRegistrations.find((r: any) => r.author?.id === author.id || r.authorId === author.id || r.id === author.id);
        const isParticipating = reg ? 'Yes' : 'No';
        const amountPaid = reg?.amountPaid != null ? reg.amountPaid : ((reg?.paymentStatus === 'Paid' || reg?.optInStatus?.startsWith('Registered')) ? (selectedEventBreakdown.registrationFee || 0) : 0);
        const paymentStatus = reg?.paymentStatus || 'NA';
        const authorName = author.name || '';
        const phone = author.phone || 'NA';
        const email = author.email || 'NA';

        if (reg && reg.books && reg.books.length > 0) {
          reg.books.forEach((b: any) => {
            const title = b.book?.title || b.title || 'Unknown';
            const mrp = b.overrideMrp || b.book?.mrp || b.mrp || 0;
            const listed = b.listedStock || 0;
            const sold = b.soldStock || 0;
            const balance = listed - sold;
            const revenue = sold * (parseFloat(mrp) || 0);

            const rowData = [sNo, authorName, phone, email, 'Yes', paymentStatus, amountPaid, title, mrp, listed, sold, revenue, balance];
            
            eventUniqueDates.forEach(date => {
              rowData.push(b.dailySales?.[date] || 0);
            });
            
            const addedRow = sheet.addRow(rowData);
            addedRow.eachCell((cell, colNumber) => {
              cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
              if (colNumber === 5) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cell.value === 'Yes' ? 'FFCCFFCC' : 'FFFFCCCC' } };
              } else if (colNumber === 6) {
                if (cell.value === 'Paid' || cell.value === 'Confirmed') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
                else if (cell.value === 'Pending') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } };
                else if (cell.value === 'NA') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
              } else if (colNumber === 9) {
                if (cell.value === 'NA') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
              }
            });
            sNo++;
          });
        } else if (reg) {
          const listed = reg.manualTotalListed || 'NA';
          const sold = reg.manualTotalSold || 0;
          const revenue = reg.manualTotalRevenue || 0;
          const rowData = [sNo, authorName, phone, email, 'Yes', paymentStatus, amountPaid, 'NA', 'NA', listed, sold, revenue, 'NA'];
          eventUniqueDates.forEach(() => rowData.push('NA'));
          const addedRow = sheet.addRow(rowData);
          addedRow.eachCell((cell, colNumber) => {
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            if (colNumber === 5) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cell.value === 'Yes' ? 'FFCCFFCC' : 'FFFFCCCC' } };
            } else if (colNumber === 6) {
              if (cell.value === 'Paid' || cell.value === 'Confirmed') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
              else if (cell.value === 'Pending') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } };
              else if (cell.value === 'NA') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
            } else if (colNumber === 9) {
              if (cell.value === 'NA') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
            }
          });
          sNo++;
        } else {
          const rowData = [sNo, authorName, phone, email, 'No', 'NA', 0, 'NA', 'NA', 0, 0, 0, 0];
          eventUniqueDates.forEach(() => rowData.push('NA'));
          const addedRow = sheet.addRow(rowData);
          addedRow.eachCell((cell, colNumber) => {
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            if (colNumber === 5) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cell.value === 'Yes' ? 'FFCCFFCC' : 'FFFFCCCC' } };
            } else if (colNumber === 6) {
              if (cell.value === 'Paid' || cell.value === 'Confirmed') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
              else if (cell.value === 'Pending') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } };
              else if (cell.value === 'NA') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
            } else if (colNumber === 9) {
              if (cell.value === 'NA') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
            }
          });
          sNo++;
        }
      });

      sheet.columns.forEach((col, i) => {
        col.width = (i === 1 || i === 3 || i === 7) ? 30 : 15;
      });

      workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const aLink = document.createElement('a');
        aLink.href = url;
        aLink.download = `${selectedEventBreakdown.name}.xlsx`;
        document.body.appendChild(aLink);
        aLink.click();
        document.body.removeChild(aLink);
        window.URL.revokeObjectURL(url);
      });
    };

    if (selectedEventBreakdown) {
      const isPastOrArchive = selectedEventBreakdown.isLegacy || selectedEventBreakdown.status === 'Past' || selectedEventBreakdown.status === 'Legacy Archive';

      const totalAuthorsBase = eventRegistrations.length;
      const totalListedBase = eventRegistrations.reduce((acc: number, a: any) => acc + (a.books?.reduce((s: number, b: any) => s + (b.listedStock || 0), 0) || 0), 0);
      const totalSoldBase = eventRegistrations.reduce((acc: number, a: any) => acc + ((a.books && a.books.length > 0) ? a.books.reduce((s: number, b: any) => s + (b.soldStock || 0), 0) : (a.manualTotalSold || 0)), 0);
      const totalSaleBase = eventRegistrations.reduce((acc: number, a: any) => acc + ((a.books && a.books.length > 0) ? a.books.reduce((s: number, b: any) => s + ((b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0)), 0) : (a.manualTotalRevenue || 0)), 0);
      const totalTitlesBase = eventRegistrations.reduce((acc: number, a: any) => acc + (a.books ? a.books.length : 0), 0);

      const pubRegs = eventRegistrations.filter((a: any) => a.optInStatus === 'Registered');
      const pubAuthors = pubRegs.length;
      const pubListed = pubRegs.reduce((acc: number, a: any) => acc + (a.books?.reduce((s: number, b: any) => s + (b.listedStock || 0), 0) || 0), 0);
      const pubSold = pubRegs.reduce((acc: number, a: any) => acc + ((a.books && a.books.length > 0) ? a.books.reduce((s: number, b: any) => s + (b.soldStock || 0), 0) : (a.manualTotalSold || 0)), 0);
      const pubSale = pubRegs.reduce((acc: number, a: any) => acc + ((a.books && a.books.length > 0) ? a.books.reduce((s: number, b: any) => s + ((b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0)), 0) : (a.manualTotalRevenue || 0)), 0);
      const pubTitles = pubRegs.reduce((acc: number, a: any) => acc + (a.books ? a.books.length : 0), 0);

      const totalRegistered = selectedEventBreakdown.aggEligibleAuthors != null ? selectedEventBreakdown.aggEligibleAuthors : (selectedEventBreakdown.isLegacy ? 'NA' : totalAuthorsBase);
      const totalAuthors = selectedEventBreakdown.aggAuthors != null ? selectedEventBreakdown.aggAuthors : (selectedEventBreakdown.isLegacy ? 'NA' : pubAuthors);
      const totalTitles = selectedEventBreakdown.aggTitles != null ? selectedEventBreakdown.aggTitles : (selectedEventBreakdown.isLegacy ? 'NA' : totalTitlesBase);
      const totalListed = selectedEventBreakdown.aggSent != null ? selectedEventBreakdown.aggSent : (selectedEventBreakdown.isLegacy ? 'NA' : totalListedBase);
      const totalSold = selectedEventBreakdown.aggSold != null ? selectedEventBreakdown.aggSold : (selectedEventBreakdown.isLegacy ? 'NA' : totalSoldBase);
      const totalSale = selectedEventBreakdown.aggRevenue != null ? selectedEventBreakdown.aggRevenue : (selectedEventBreakdown.isLegacy ? 'NA' : totalSaleBase);
      const totalPaymentsBase = eventRegistrations.reduce((acc: number, a: any) => acc + (a.amountPaid || 0), 0);
      const totalPayments = selectedEventBreakdown.aggPayments != null ? selectedEventBreakdown.aggPayments : (selectedEventBreakdown.isLegacy ? 'NA' : totalPaymentsBase);

      let maxSold = -1;
      let bestSellingBook = '-';
      if (!selectedEventBreakdown.isLegacy) {
        eventRegistrations.forEach((a: any) => {
          (a.books || []).forEach((b: any) => {
            if ((b.soldStock || 0) > maxSold) {
              maxSold = b.soldStock;
              bestSellingBook = b.title || b.book?.title || '';
            }
          });
        });
      }

      return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6 border-b pb-4">
            <div>
              <h3 className="text-2xl font-serif text-paa-navy mb-1">{selectedEventBreakdown.name}</h3>
              <p className="text-sm text-gray-500 font-medium">{selectedEventBreakdown.date} &bull; {selectedEventBreakdown.location || 'Location TBA'} &bull; {selectedEventBreakdown.duration || 'Duration N/A'}</p>
              {selectedEventBreakdown.description && (
                <p className="text-sm text-gray-600 mt-2 max-w-3xl leading-relaxed">{selectedEventBreakdown.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              {!selectedAuthorForData && (
                <>
                  {selectedEventBreakdown.broadcastStatus !== 'Published' ? (
                    <button onClick={async () => {
                      try {
                        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/events/${selectedEventBreakdown.id}/publish-all`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                        toast.success('Event Published to all Authors!');
                        setSelectedEventBreakdown({ ...selectedEventBreakdown, broadcastStatus: 'Published' });
                        fetchEvents();
                      } catch (err) {
                        toast.error('Failed to publish');
                      }
                    }} className="dash-btn bg-paa-gold text-paa-navy hover:brightness-110 shadow-sm font-bold flex items-center gap-2">
                      PUBLISH TO ALL AUTHORS
                    </button>
                  ) : (
                    <button onClick={async () => {
                      try {
                        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/events/${selectedEventBreakdown.id}/unpublish`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                        toast.success('Event unpublished from Author dashboards.');
                        setSelectedEventBreakdown({ ...selectedEventBreakdown, broadcastStatus: 'Draft' });
                        fetchEvents();
                      } catch (err) {
                        toast.error('Failed to unpublish');
                      }
                    }} className="dash-btn bg-gray-200 text-gray-700 hover:bg-red-100 hover:text-red-700 border border-gray-300 hover:border-red-300 transition-colors shadow-sm font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> PUBLISHED &bull; Click to Unpublish
                    </button>
                  )}
                  <button onClick={handleDownloadEventReport} className="dash-btn bg-[#ebd8c0] text-emerald-700 hover:bg-[#ebd8c0] border border-emerald-200 transition-colors shadow-sm font-bold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Download Report
                  </button>
                </>
              )}
              <button onClick={() => {
                if (selectedAuthorForData) {
                  setSelectedAuthorForData(null);
                } else {
                  handleCloseBreakdown();
                }
              }} className="dash-btn bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors shadow-sm">
                {selectedAuthorForData ? 'Back to Authors List' : 'Back to Events'}
              </button>
            </div>
          </div>
          {/* KPI Cards */}
          <div className="mb-2 flex justify-between items-center">
            <span className="text-xs text-gray-400">Event Summary</span>
            {(selectedEventBreakdown.isLegacy || selectedEventBreakdown.status === "Past" || selectedEventBreakdown.status === "Legacy Archive") && (isEditingKPIs ? (<div className="flex gap-2"><button onClick={() => setIsEditingKPIs(false)} className="text-xs font-bold text-gray-500 border border-gray-300 bg-white hover:bg-gray-50 px-4 py-1.5 rounded-full transition-colors">Cancel</button><button onClick={async () => { await handleSaveAggregateData(); setIsEditingKPIs(false); }} className="text-xs font-bold bg-paa-navy text-paa-cream px-4 py-1.5 rounded-full hover:bg-paa-gold hover:text-paa-navy transition-colors active:scale-95">Save Stats</button></div>) : (<button onClick={() => setIsEditingKPIs(true)} className="text-xs font-bold text-paa-navy border border-paa-navy/20 bg-gray-50 hover:bg-paa-navy/5 px-4 py-1.5 rounded-full transition-colors">Edit Stats</button>))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className={`bg-rose-500 border rounded-xl p-5 shadow-sm flex flex-col justify-between ${isEditingKPIs ? "border-rose-300 ring-2 ring-rose-200" : "border-rose-600"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-bold text-rose-100 uppercase tracking-wider mb-1">Participated</div>
                  {isEditingKPIs ? (
                    <input type="text" autoFocus className="text-4xl font-serif text-white font-bold bg-transparent border-0 border-b-2 border-rose-200 focus:border-white outline-none w-20 p-0" value={selectedEventBreakdown.aggAuthors == null ? "" : selectedEventBreakdown.aggAuthors} placeholder="NA" onChange={e => { const val = e.target.value; setSelectedEventBreakdown({ ...selectedEventBreakdown, aggAuthors: (val.toUpperCase() === "NA" || val === "") ? null : parseInt(val) || 0 }) }} />
                  ) : (
                    <div className="text-4xl font-serif text-white font-bold">{selectedEventBreakdown.aggAuthors != null ? selectedEventBreakdown.aggAuthors : (totalAuthors === 'NA' ? 'NA' : totalAuthors)}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-rose-200 uppercase tracking-wider mb-1">Registered</div>
                  {isEditingKPIs ? (
                    <input type="text" className="text-xl font-serif text-white font-bold bg-transparent border-0 border-b-2 border-rose-200 focus:border-white outline-none w-16 p-0 text-right" value={selectedEventBreakdown.aggEligibleAuthors == null ? "" : selectedEventBreakdown.aggEligibleAuthors} placeholder="NA" onChange={e => { const val = e.target.value; setSelectedEventBreakdown({ ...selectedEventBreakdown, aggEligibleAuthors: (val.toUpperCase() === "NA" || val === "") ? null : parseInt(val) || 0 }) }} />
                  ) : (
                    <div className="text-xl font-serif text-white font-bold">{selectedEventBreakdown.aggEligibleAuthors != null ? selectedEventBreakdown.aggEligibleAuthors : (totalRegistered === 'NA' ? 'NA' : totalRegistered)}</div>
                  )}
                </div>
              </div>
              {isPastOrArchive && !isEditingKPIs && totalAuthors !== 'NA' && (
                <div className="text-[10px] text-rose-100 font-bold uppercase mt-4 pt-2 border-t border-rose-400 flex justify-between">
                  <span>Plat. Part: <span className="text-white">{pubAuthors}</span></span>
                </div>
              )}
            </div>

            <div className={`bg-amber-500 border rounded-xl p-5 shadow-sm flex flex-col justify-between ${isEditingKPIs ? "border-amber-300 ring-2 ring-amber-200" : "border-amber-600"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-bold text-amber-100 uppercase tracking-wider mb-1">Total Titles</div>
                  {isEditingKPIs ? (
                    <input type="text" className="text-4xl font-serif text-white font-bold bg-transparent border-0 border-b-2 border-amber-200 focus:border-white outline-none w-20 p-0" value={selectedEventBreakdown.aggTitles == null ? "" : selectedEventBreakdown.aggTitles} placeholder="NA" onChange={e => { const val = e.target.value; setSelectedEventBreakdown({ ...selectedEventBreakdown, aggTitles: (val.toUpperCase() === "NA" || val === "") ? null : parseInt(val) || 0 }) }} />
                  ) : (
                    <div className="text-4xl font-serif text-white font-bold">{selectedEventBreakdown.aggTitles != null ? selectedEventBreakdown.aggTitles : (totalTitles === 'NA' ? 'NA' : totalTitles)}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-amber-200 uppercase tracking-wider mb-1">Listed</div>
                  {isEditingKPIs ? (
                    <input type="text" className="text-xl font-serif text-white font-bold bg-transparent border-0 border-b-2 border-amber-200 focus:border-white outline-none w-16 p-0 text-right" value={selectedEventBreakdown.aggSent == null ? "" : selectedEventBreakdown.aggSent} placeholder="NA" onChange={e => { const val = e.target.value; setSelectedEventBreakdown({ ...selectedEventBreakdown, aggSent: (val.toUpperCase() === "NA" || val === "") ? null : parseInt(val) || 0 }) }} />
                  ) : (
                    <div className="text-xl font-serif text-white font-bold">{selectedEventBreakdown.aggSent != null ? selectedEventBreakdown.aggSent : (totalListed === 'NA' ? 'NA' : totalListed)}</div>
                  )}
                </div>
              </div>
              {isPastOrArchive && !isEditingKPIs && totalTitlesBase > 0 && (
                <div className="text-[10px] text-amber-100 font-bold uppercase mt-4 pt-2 border-t border-amber-400 flex justify-between">
                  <span>Plat. Titles: <span className="text-white">{pubTitles}</span></span>
                  <span>Listed: <span className="text-white">{pubListed}</span></span>
                </div>
              )}
            </div>

            <div className={`bg-emerald-500 border rounded-xl p-5 shadow-sm flex flex-col justify-between ${isEditingKPIs ? "border-emerald-300 ring-2 ring-emerald-200" : "border-emerald-600"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider mb-1">Total Sale</div>
                  {isEditingKPIs ? (
                    <div className="flex items-center gap-0.5"><span className="text-3xl font-serif text-white font-bold">₹</span><input type="text" className="text-4xl font-serif text-white font-bold bg-transparent border-0 border-b-2 border-emerald-200 focus:border-white outline-none w-24 p-0" value={selectedEventBreakdown.aggRevenue == null ? "" : selectedEventBreakdown.aggRevenue} placeholder="NA" onChange={e => { const val = e.target.value; setSelectedEventBreakdown({ ...selectedEventBreakdown, aggRevenue: (val.toUpperCase() === "NA" || val === "") ? null : parseFloat(val) || 0 }) }} /></div>
                  ) : (
                    <div className="text-4xl font-serif text-white font-bold">₹{selectedEventBreakdown.aggRevenue != null ? selectedEventBreakdown.aggRevenue : (totalSale || "-")}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider mb-1">Books Sold</div>
                  {isEditingKPIs ? (
                    <input type="text" className="text-xl font-serif text-white font-bold bg-transparent border-0 border-b-2 border-emerald-200 focus:border-white outline-none w-16 p-0 text-right" value={selectedEventBreakdown.aggSold == null ? "" : selectedEventBreakdown.aggSold} placeholder="NA" onChange={e => { const val = e.target.value; setSelectedEventBreakdown({ ...selectedEventBreakdown, aggSold: (val.toUpperCase() === "NA" || val === "") ? null : parseInt(val) || 0 }) }} />
                  ) : (
                    <div className="text-xl font-serif text-white font-bold">{selectedEventBreakdown.aggSold != null ? selectedEventBreakdown.aggSold : (totalSold === 'NA' ? 'NA' : totalSold)}</div>
                  )}
                </div>
              </div>
              {isPastOrArchive && !isEditingKPIs && totalSale !== 'NA' && (
                <div className="text-[10px] text-emerald-100 font-bold uppercase mt-4 pt-2 border-t border-emerald-400 flex justify-between">
                  <span>Plat. Sale: <span className="text-white">₹{pubSale}</span></span>
                  <span>Sold: <span className="text-white">{pubSold}</span></span>
                </div>
              )}
            </div>

            <div className={`bg-cyan-500 border rounded-xl p-5 shadow-sm flex flex-col justify-between ${isEditingKPIs ? "border-cyan-300 ring-2 ring-cyan-200" : "border-cyan-600"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-bold text-cyan-100 uppercase tracking-wider mb-1">Payments Recv</div>
                  {isEditingKPIs ? (
                    <div className="flex items-center gap-0.5"><span className="text-3xl font-serif text-white font-bold">₹</span><input type="text" className="text-4xl font-serif text-white font-bold bg-transparent border-0 border-b-2 border-cyan-200 focus:border-white outline-none w-24 p-0" value={selectedEventBreakdown.aggPayments == null ? "" : selectedEventBreakdown.aggPayments} placeholder="NA" onChange={e => { const val = e.target.value; setSelectedEventBreakdown({ ...selectedEventBreakdown, aggPayments: (val.toUpperCase() === "NA" || val === "") ? null : parseFloat(val) || 0 }) }} /></div>
                  ) : (
                    <div className="text-4xl font-serif text-white font-bold">₹{selectedEventBreakdown.aggPayments != null ? selectedEventBreakdown.aggPayments : (totalPayments || "0")}</div>
                  )}
                </div>
                <div className="text-right max-w-[40%]">
                  <div className="text-[10px] font-bold text-cyan-200 uppercase tracking-wider mb-1">Top Book</div>
                  <div className="text-sm font-bold text-white truncate" title={bestSellingBook || "-"}>{bestSellingBook || "-"}</div>
                </div>
              </div>
              {isPastOrArchive && !isEditingKPIs && totalPayments !== 'NA' && (
                <div className="text-[10px] text-cyan-100 font-bold uppercase mt-4 pt-2 border-t border-cyan-400 flex justify-between">
                  <span>Plat. Recv: <span className="text-white">₹{totalPaymentsBase}</span></span>
                </div>
              )}
            </div>
          </div>


          {selectedAuthorForData ? (
            <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                  {selectedAuthorForData.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-paa-navy text-lg">{selectedAuthorForData.name}</h4>
                  <p className="text-xs text-gray-500 font-medium">Managing Event Data</p>
                </div>
              </div>

              <h4 className="font-semibold text-paa-navy mb-4 border-b border-gray-200 pb-2">Author Registration & Logistics</h4>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Event Participation</label>
                  <select className="w-full border border-gray-300 rounded p-2 text-sm font-semibold text-paa-navy" value={manageRegStatus} onChange={(e) => {
                    const newStatus = e.target.value;
                    setManageRegStatus(newStatus);
                    setIsManageDataDirty(true);
                    if (newStatus === 'Registered') {
                      setManagePaymentStatus('Paid');
                      if (manageAmountPaid === 0) {
                        const expectedFee = selectedEventBreakdown?.feeType === 'Per Title' ? (manageAuthorBooks.length || 0) * (selectedEventBreakdown.registrationFee || 0) : (selectedEventBreakdown?.registrationFee || 0);
                        setManageAmountPaid(expectedFee);
                      }
                    }
                  }}>
                    <option value="Registered">Participated</option>
                    <option value="Declined">Did Not Participate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Payment Status</label>
                  <select className="w-full border border-gray-300 rounded p-2 text-sm" value={managePaymentStatus} onChange={(e) => {
                    const newStatus = e.target.value;
                    setManagePaymentStatus(newStatus);
                    setIsManageDataDirty(true);
                    if (newStatus === 'Paid' && manageAmountPaid === 0) {
                      const expectedFee = selectedEventBreakdown?.feeType === 'Per Title' ? (manageAuthorBooks.length || 0) * (selectedEventBreakdown.registrationFee || 0) : (selectedEventBreakdown?.registrationFee || 0);
                      setManageAmountPaid(expectedFee);
                    }
                  }}>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="-">-</option>
                  </select>
                </div>
                {managePaymentStatus === 'Paid' && (
                  <div>
                    <label className="block text-xs font-bold text-emerald-600 mb-1">Amount Paid (₹)</label>
                    <input type="number" className="w-full border border-emerald-300 bg-[#ebd8c0] text-emerald-800 rounded p-2 text-sm font-bold" value={manageAmountPaid} onChange={(e) => { setManageAmountPaid(parseFloat(e.target.value) || 0); setIsManageDataDirty(true); }} />
                  </div>
                )}
              </div>

              <h4 className="font-semibold text-paa-navy mb-4 border-b border-gray-200 pb-2">Book Sales & Metrics</h4>

              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm font-bold text-paa-navy cursor-pointer bg-paa-gold/10 p-3 rounded-lg border border-paa-gold/30">
                  <input type="checkbox" className="w-4 h-4 rounded text-paa-navy" checked={useGlobalOverride} onChange={(e) => { setUseGlobalOverride(e.target.checked); setIsManageDataDirty(true); }} />
                  Use Global Override (No book-wise breakdown available)
                </label>
              </div>

              {useGlobalOverride ? (
                <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Total Books Sold (Overall)</label>
                    <input type="number" className="w-full border border-gray-300 rounded p-2 font-mono" value={globalSold} onChange={(e) => { setGlobalSold(parseInt(e.target.value) || 0); setIsManageDataDirty(true); }} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">Total Revenue (₹)</label>
                    <input type="number" className="w-full border border-emerald-200 bg-[#ebd8c0] text-emerald-700 rounded p-2 font-mono font-bold" value={globalRevenue} onChange={(e) => { setGlobalRevenue(parseInt(e.target.value) || 0); setIsManageDataDirty(true); }} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Iterating over authors books */}

                  {manageAuthorBooks.map((book: any, idx: number) => {
                    const mrpToUse = book.overrideMrp !== undefined && book.overrideMrp !== '' ? parseFloat(book.overrideMrp) : book.mrp;
                    const revenue = (mrpToUse || 0) * (book.soldStock || 0);
                    return (
                      <div key={idx} className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm hover:shadow transition-shadow">
                        <div className="flex justify-between items-center p-4 bg-white border-b border-gray-100">
                          <div className="font-medium text-sm text-gray-800 flex items-center gap-2">
                            {book.title}
                            <div className="flex items-center gap-1 text-xs text-gray-500 font-normal ml-2">
                              (MRP: ₹<input type="text" className="w-14 border border-gray-200 rounded p-0.5 text-xs text-center outline-none focus:border-paa-navy" value={book.overrideMrp !== undefined ? book.overrideMrp : (book.mrp || '')} onChange={(e) => {
                                const newBooks = [...manageAuthorBooks];
                                newBooks[idx].overrideMrp = e.target.value;
                                setManageAuthorBooks(newBooks);
                                setIsManageDataDirty(true);
                              }} />)
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                            <input type="checkbox" checked={book.isSelected} onChange={(e) => {
                              const newBooks = [...manageAuthorBooks];
                              newBooks[idx].isSelected = e.target.checked;
                              setManageAuthorBooks(newBooks);
                              setIsManageDataDirty(true);
                            }} className="rounded text-paa-navy w-4 h-4" /> Listed for this event
                          </label>
                        </div>
                        <div className="p-4 bg-gray-50 grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Quantities Listed</label>
                            <input type="number" value={book.listedStock} onChange={(e) => {
                              const newBooks = [...manageAuthorBooks];
                              newBooks[idx].listedStock = parseInt(e.target.value) || 0;
                              if (newBooks[idx].listedStock > 0) newBooks[idx].isSelected = true;
                              if (newBooks[idx].listedStock > 0 && newBooks[idx].soldStock > 0) newBooks[idx].returnedStock = Math.max(0, newBooks[idx].listedStock - newBooks[idx].soldStock);
                              setManageAuthorBooks(newBooks);
                              setIsManageDataDirty(true);
                            }} className="w-full border border-gray-300 rounded p-2 text-sm font-mono" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Manual Sold</label>
                            <input type="number" value={book.soldStock} onChange={(e) => {
                              const newBooks = [...manageAuthorBooks];
                              newBooks[idx].soldStock = parseInt(e.target.value) || 0;
                              if (newBooks[idx].soldStock > 0) newBooks[idx].isSelected = true;
                              if (newBooks[idx].listedStock > 0 && newBooks[idx].soldStock > 0) newBooks[idx].returnedStock = Math.max(0, newBooks[idx].listedStock - newBooks[idx].soldStock);
                              setManageAuthorBooks(newBooks);
                              setIsManageDataDirty(true);
                            }} className="w-full border border-gray-300 rounded p-2 text-sm font-mono" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Returned</label>
                            <input type="number" value={book.returnedStock} onChange={(e) => {
                              const newBooks = [...manageAuthorBooks];
                              newBooks[idx].returnedStock = parseInt(e.target.value) || 0;
                              setManageAuthorBooks(newBooks);
                              setIsManageDataDirty(true);
                            }} className="w-full border border-gray-300 rounded p-2 text-sm font-mono" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-emerald-600 mb-1 uppercase tracking-wider">Revenue (₹)</label>
                            <div className="w-full border border-emerald-200 bg-emerald-50 text-emerald-700 rounded p-2 text-sm font-mono font-bold">
                              ₹{revenue}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">POS Sold (Auto)</label>
                            <input type="number" defaultValue="0" disabled className="w-full border border-gray-200 bg-gray-100 text-gray-500 rounded p-2 text-sm font-mono" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

              )}
              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-3 items-center">
                <span className="text-xs text-gray-500 mr-auto font-medium">* Explicit publish required for authors to see past data in their dashboard.</span>
                <button onClick={handleSaveDraft} disabled={isPublishingData || isSavingDraft || (!isManageDataDirty && currentOptInStatus?.includes('-Draft'))} className="px-6 py-2.5 text-sm text-paa-navy border border-paa-navy rounded-lg font-bold hover:bg-paa-navy hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSavingDraft ? 'SAVING...' : (currentOptInStatus?.includes('-Draft') ? (isManageDataDirty ? 'RESAVE DRAFT' : 'SAVED AS DRAFT') : 'SAVE DRAFT')}
                </button>
                <button onClick={handlePublishData} disabled={isPublishingData || isSavingDraft || (!isManageDataDirty && currentOptInStatus && !currentOptInStatus.includes('-Draft') && currentOptInStatus !== 'Pending Approval' && currentOptInStatus !== 'Pending')} className="px-8 py-2.5 text-sm bg-paa-gold text-paa-navy rounded-lg font-black hover:brightness-110 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                  {isPublishingData ? 'PUBLISHING...' : (currentOptInStatus && !currentOptInStatus.includes('-Draft') && currentOptInStatus !== 'Pending Approval' && currentOptInStatus !== 'Pending' ? (isManageDataDirty ? 'REPUBLISH DATA' : 'PUBLISHED') : 'PUBLISH TO AUTHOR')}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="font-bold text-gray-700">Authors Participated / Registered
                    {eventRegistrations.filter((r: any) => r.optInStatus === 'Pending Approval').length > 0 && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 animate-pulse">
                        {eventRegistrations.filter((r: any) => r.optInStatus === 'Pending Approval').length} Pending Approval
                      </span>
                    )}
                  </h4>
                  {(selectedEventBreakdown.isLegacy || selectedEventBreakdown.status === 'Past') && (
                    <p className="text-xs text-gray-400 mt-0.5">Showing all platform-registered authors - fill in data for those who attended this event</p>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => fetchEventRegistrations(selectedEventBreakdown.id)}
                    className="text-[11px] font-bold text-paa-navy border border-paa-navy/20 bg-gray-50 hover:bg-paa-navy hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    title="Refresh registrations list"
                  >
                    ↻ Refresh
                  </button>
                <input
                  type="text"
                  placeholder="Search authors..."
                  className="border border-gray-300 rounded-lg p-2 text-sm w-64 outline-none focus:border-paa-navy"
                  value={authorSearch}
                  onChange={(e) => setAuthorSearch(e.target.value)}
                />
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                <table className="dash-table w-full min-w-[1100px]">
                  <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                    <tr>
                      <th className="!text-[14px] !text-indigo-800 !bg-indigo-50 sticky left-0 z-20 shadow-[1px_0_0_rgba(0,0,0,0.1)] px-4">Author Name</th>
                      <th className="!text-[14px] !text-indigo-800 !bg-transparent">Books Listed</th>
                      <th className="!text-[14px] !text-indigo-800 !bg-transparent">Quantities</th>
                      <th className="!text-[14px] !text-indigo-800 !bg-transparent">Books Sold</th>
                      <th className="!text-[14px] !text-indigo-800 !bg-transparent">Revenue</th>
                      {!selectedEventBreakdown.isLegacy && (
                        <th style={{ textAlign: 'center' }} className="!text-[14px] !text-indigo-800 !bg-transparent">Payment</th>
                      )}
                      <th className="!text-[14px] !text-indigo-800 !bg-transparent">Status</th>
                      <th style={{ textAlign: 'center' }} className="!text-[14px] !text-indigo-800 !bg-indigo-50 sticky right-0 z-20 shadow-[-1px_0_0_rgba(0,0,0,0.1)] px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(showAllPlatformAuthors ? authors : eventRegistrations).filter((a: any) => {
                      const nameMatches = (a.author?.name || a.name || '').toLowerCase().includes(authorSearch.toLowerCase());
                      return nameMatches;
                    })
                      .map((a: any) => {
                        const showAllAuthors = showAllPlatformAuthors;
                        let m = a;
                        if (showAllAuthors) {
                          const reg = eventRegistrations.find(r => r.authorId === a.id);
                          if (reg) m = { ...a, ...reg, author: a, id: a.id };
                        }
                        
                        let isLateJoiner = false;
                        if (showAllAuthors && selectedEventBreakdown.date && a.groupJoiningDate) {
                          const eventDate = new Date(selectedEventBreakdown.date);
                          const joinDate = new Date(a.groupJoiningDate);
                          const hasRegistration = eventRegistrations.some(r => r.authorId === a.id);
                          if (joinDate > eventDate && !hasRegistration) {
                            isLateJoiner = true;
                          }
                        }
                        return { a, m, showAllAuthors, isLateJoiner };
                      })
                      .sort((rowA: any, rowB: any) => {
                        // 1. Pending Approval always floats to the top
                        const isPendingA = rowA.m.optInStatus === 'Pending Approval';
                        const isPendingB = rowB.m.optInStatus === 'Pending Approval';
                        if (isPendingA && !isPendingB) return -1;
                        if (!isPendingA && isPendingB) return 1;
                        // 2. Authors with published data below
                        const isPubA = (rowA.m.books && rowA.m.books.length > 0) || rowA.m.manualTotalSold != null;
                        const isPubB = (rowB.m.books && rowB.m.books.length > 0) || rowB.m.manualTotalSold != null;
                        if (isPubA && !isPubB) return 1;
                        if (!isPubA && isPubB) return -1;
                        // 3. Alphabetical fallback
                        const nameA = (rowA.a.name || '').toLowerCase();
                        const nameB = (rowB.a.name || '').toLowerCase();
                        if (nameA < nameB) return -1;
                        if (nameA > nameB) return 1;
                        return 0;
                      })
                      .slice(0, 50).map(({ a, m, showAllAuthors, isLateJoiner }, i: number) => {
                        const authorData = showAllAuthors ? m : m.author;
                        const hasBooks = m.books && m.books.length > 0;
                        const listed = hasBooks ? m.books.reduce((s: number, b: any) => s + (b.listedStock || 0), 0) : 0;
                        const sold = hasBooks ? m.books.reduce((s: number, b: any) => s + (b.soldStock || 0), 0) : ((m.manualTotalSold !== null && m.manualTotalSold !== undefined) ? m.manualTotalSold : 0);
                        const rev = hasBooks ? m.books.reduce((s: number, b: any) => s + ((b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0)), 0) : ((m.manualTotalRevenue !== null && m.manualTotalRevenue !== undefined) ? m.manualTotalRevenue : 0);
                        const isExpanded = expandedAuthorId === (showAllAuthors ? m.id : m.authorId);
                        const status = (m.optInStatus || 'Unpublished').replace('-Draft', '');
                        const hasData = (m.books && m.books.length > 0) || m.manualTotalSold != null;
                        const validScreenshot = a.paymentScreenshot && typeof a.paymentScreenshot === 'string' && a.paymentScreenshot !== 'null' && a.paymentScreenshot !== 'undefined' && a.paymentScreenshot.trim() !== '';
                        const expectedFee = selectedEventBreakdown.feeType === 'Per Title' ? (m.books?.length || 0) * (selectedEventBreakdown.registrationFee || 0) : (selectedEventBreakdown.registrationFee || 0);
                        return (
                          <React.Fragment key={i}>
                            <tr className={`hover:bg-indigo-50/50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-sky-100'}`}>
                              <td className="sticky left-0 z-10 bg-inherit shadow-[1px_0_0_rgba(0,0,0,0.1)]">
                                <p className="font-bold text-paa-navy pl-4">{authorData?.name || 'Unknown'}</p>
                              </td>
                              <td className="p-3 text-sm text-gray-600">{m.books?.length || 0} Books</td>
                              <td className="p-3 font-mono text-sm text-gray-600">{listed}</td>
                              <td className="p-3 font-mono text-sm text-gray-600">{sold}</td>
                              <td className="p-3 font-mono text-sm text-emerald-600 font-bold">{'₹'}{rev}</td>
                              {!selectedEventBreakdown.isLegacy && (
                                <td className="p-3 text-center align-middle">
                                  <div className="flex flex-col items-center justify-center h-full">
                                    {selectedEventBreakdown.status === 'Past' ? (
                                      <div className="text-sm text-emerald-600 font-bold flex flex-col items-center">
                                        {m.amountPaid ? `₹${m.amountPaid}` : <span className="text-gray-400 font-normal">-</span>}
                                        {m.transactionId && <span className="text-[8px] text-gray-500 font-mono mt-0.5 break-all text-center max-w-[80px]">Txn: {m.transactionId}</span>}
                                      </div>
                                    ) : (
                                      <>
                                        {validScreenshot && (
                                          <a href={`${a.paymentScreenshot.startsWith('http') ? a.paymentScreenshot : API + a.paymentScreenshot}`} target="_blank" rel="noreferrer" className="block w-10 h-10 border border-gray-300 rounded overflow-hidden shadow-sm hover:opacity-80 mx-auto">
                                            <img src={`${a.paymentScreenshot.startsWith('http') ? a.paymentScreenshot : API + a.paymentScreenshot}`} className="w-full h-full object-cover" alt="Proof" />
                                          </a>
                                        )}
                                        {expectedFee > 0 && status !== 'Registered' && (
                                          <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Due: ₹{expectedFee}</div>
                                        )}
                                        {m.amountPaid ? (
                                          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Paid: ₹{m.amountPaid}</div>
                                        ) : status === 'Registered' && expectedFee > 0 ? (
                                          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Paid: ₹{expectedFee}</div>
                                        ) : (
                                          !validScreenshot && expectedFee === 0 && <span className="text-sm text-gray-400 font-bold">-</span>
                                        )}
                                        {(validScreenshot || m.transactionId) && (
                                          <div className="mt-1">
                                            <input
                                              type="text"
                                              placeholder="Txn ID"
                                              defaultValue={m.transactionId || ''}
                                              disabled={status === 'Past'}
                                              onBlur={(e) => updateTransactionId(m.eventId, m.authorId, e.target.value)}
                                              className="w-20 text-[9px] text-center p-0.5 border border-gray-200 bg-gray-50 rounded outline-none focus:border-paa-navy font-mono disabled:text-gray-500 disabled:bg-gray-100"
                                            />
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                              )}
                              <td className="p-3">
                                {isLateJoiner ? (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold uppercase flex items-center gap-1 w-max shadow-sm"><XCircle className="w-3 h-3" /> Joined After Event</span>
                                ) : status === 'Registered' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold uppercase flex items-center gap-1 w-max shadow-sm">
                                    {!m.optInStatus?.includes('-Draft') ? <CheckCircle className="w-3.5 h-3.5" /> : <Check className="w-3 h-3" />} Participated
                                  </span>
                                ) : (selectedEventBreakdown.isLegacy || selectedEventBreakdown.status === 'Past' || selectedEventBreakdown.status === 'Legacy Archive') ? (
                                  <span className="px-2 py-0.5 rounded-full bg-yellow-400 text-black text-[10px] font-bold uppercase flex items-center gap-1 w-max shadow-sm"><XCircle className="w-3 h-3" /> Not Participated</span>
                                ) : (status === 'Pending' || status === 'Pending Approval' || status === 'Unpublished') ? (
                                  <span className="px-3 py-1 rounded-full bg-yellow-400 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-max shadow-md ring-2 ring-yellow-400/30 animate-pulse">Pending Approval</span>
                                ) : status === 'Declined' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase flex items-center gap-1 w-max"><XCircle className="w-3 h-3" /> Hidden</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase flex items-center gap-1 w-max">{status}</span>
                                )}
                              </td>
                              <td className="p-3 text-center sticky right-0 z-10 bg-inherit shadow-[-1px_0_0_rgba(0,0,0,0.1)]">
                                <div className="flex gap-2 justify-center items-center">
                                  {!selectedEventBreakdown.isLegacy && (status === 'Pending' || status === 'Pending Approval') && (
                                    <>
                                      <button onClick={(e) => { e.stopPropagation(); openRejectEventModal(selectedEventBreakdown.id, m.authorId); }} className="px-3 py-1.5 text-xs font-black text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm transition-colors whitespace-nowrap">Reject</button>
                                      <button onClick={(e) => { e.stopPropagation(); handleApproveRegistration(selectedEventBreakdown.id, m.authorId); }} className="px-3 py-1.5 text-xs font-black text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-md transition-colors whitespace-nowrap">Approve</button>
                                    </>
                                  )}
                                  <button onClick={() => setExpandedAuthorId(isExpanded ? null : (showAllAuthors ? m.id : m.authorId))} className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-bold border border-gray-200 transition-colors shadow-sm">
                                    {isExpanded ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                                  </button>
                                  {showAllAuthors || status === 'Registered' ? (
                                    <button onClick={() => {
                                      handleEditAuthorData(m);
                                      if (selectedEventBreakdown.isLegacy && m.optInStatus) {
                                        setUseGlobalOverride(true);
                                        setGlobalSold(m.manualTotalSold || 0);
                                        setGlobalRevenue(m.manualTotalRevenue || 0);
                                        setManageRegStatus(m.optInStatus?.startsWith('Registered') ? 'Registered' : 'Declined');
                                      }
                                    }} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold border border-indigo-200 transition-colors shadow-sm whitespace-nowrap">
                                      Manage Data
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={8} className="p-0 border-b border-gray-200">
                                  <div className="bg-gray-50 p-4 border-l-4 border-paa-navy m-2 rounded-r-lg">
                                    <div className="flex gap-4">
                                      <div className="flex-1 w-full">
                                        <div className="flex justify-between items-center mb-3">
                                          <h5 className="text-xs font-bold text-gray-500 uppercase">Individual Book Breakdown</h5>
                                        </div>
                                        {m.books?.length > 0 ? (
                                          <div className="flex flex-col gap-3">
                                            {m.books.map((b: any, j: number) => (
                                              <div key={j} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                                                <div className="font-bold text-paa-navy flex-1 w-full text-base truncate" title={b.title || b.book?.title || 'Unknown Book'}>
                                                  {b.title || b.book?.title || 'Unknown Book'}
                                                  <span className="text-xs text-gray-400 font-medium ml-3 tracking-wider">(MRP: ₹{b.overrideMrp || b.mrp || b.book?.mrp || 'N/A'})</span>
                                                </div>
                                                <div className="flex font-mono text-sm text-gray-600 gap-8 md:gap-12 bg-gray-50/80 px-6 py-2 rounded-lg border border-gray-100 w-full md:w-auto justify-between md:justify-end">
                                                  <div className="flex flex-col items-center md:items-end">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Listed</span>
                                                    <span className="font-bold text-gray-700">{b.listedStock || 0}</span>
                                                  </div>
                                                  {!selectedEventBreakdown.isLegacy && (
                                                    <div className="flex flex-col items-center md:items-end">
                                                      <span className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Fee</span>
                                                      <span className="font-bold text-indigo-700">₹{(selectedEventBreakdown.feeType === 'Per Title' && (status === 'Registered' || status === 'Pending Approval')) ? (selectedEventBreakdown.registrationFee || 0) : 0}</span>
                                                    </div>
                                                  )}
                                                  <div className="flex flex-col items-center md:items-end">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Sold</span>
                                                    <span className="font-bold text-indigo-700">{b.soldStock || 0}</span>
                                                  </div>
                                                  <div className="flex flex-col items-center md:items-end">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Rev</span>
                                                    <span className="font-bold text-emerald-600">{b.soldStock ? `₹${(b.soldStock) * (b.overrideMrp || b.mrp || b.book?.mrp || 0)}` : '₹0'}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-gray-500">No books found for this author in this event.</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                  </tbody>
                </table>
                {authors.length > 50 && (
                  <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
                    Showing top 50 results. Use search to find specific authors.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (isRefreshing) return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-paa-navy/5 pb-4">
          <div className="h-8 w-64 bg-gray-200 animate-pulse rounded"></div>
          <div className="flex gap-3">
            <div className="h-10 w-40 bg-gray-200 animate-pulse rounded-lg"></div>
            <div className="h-10 w-36 bg-gray-200 animate-pulse rounded-lg"></div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-24 bg-gray-100 animate-pulse rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="h-3 w-2/3 bg-gray-200 rounded"></div>
              <div className="h-8 w-1/3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>

        <div className="h-72 bg-gray-100 animate-pulse rounded-xl mb-8 p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="h-5 w-40 bg-gray-200 rounded"></div>
            <div className="h-8 w-32 bg-gray-200 rounded"></div>
          </div>
          <div className="flex-1 w-full bg-gray-200/50 rounded-lg"></div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="h-6 w-40 bg-gray-200 animate-pulse rounded"></div>
          <div className="h-10 w-64 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>

        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="w-full bg-indigo-50/50 p-4 border-b-2 border-indigo-100 flex gap-4">
            <div className="h-4 w-[30%] bg-gray-200 animate-pulse rounded"></div>
            <div className="h-4 w-[10%] bg-gray-200 animate-pulse rounded"></div>
            <div className="h-4 w-[10%] bg-gray-200 animate-pulse rounded"></div>
            <div className="h-4 w-[10%] bg-gray-200 animate-pulse rounded"></div>
            <div className="h-4 w-[10%] bg-gray-200 animate-pulse rounded"></div>
            <div className="h-4 w-[10%] bg-gray-200 animate-pulse rounded"></div>
            <div className="h-4 flex-1 bg-gray-200 animate-pulse rounded"></div>
          </div>
          <div className="bg-white divide-y divide-gray-50">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="p-4 flex gap-4 items-center">
                <div className="w-[30%] flex flex-col gap-2">
                  <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded"></div>
                  <div className="h-3 w-1/2 bg-gray-100 animate-pulse rounded"></div>
                </div>
                <div className="w-[10%]"><div className="h-4 w-full bg-gray-100 animate-pulse rounded"></div></div>
                <div className="w-[10%]"><div className="h-4 w-full bg-gray-100 animate-pulse rounded"></div></div>
                <div className="w-[10%]"><div className="h-6 w-full bg-gray-200 animate-pulse rounded-full"></div></div>
                <div className="w-[10%]"><div className="h-4 w-full bg-gray-100 animate-pulse rounded"></div></div>
                <div className="w-[10%]"><div className="h-4 w-full bg-gray-100 animate-pulse rounded"></div></div>
                <div className="flex-1 flex justify-end gap-2">
                  <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-lg"></div>
                  <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
    const now = new Date();
    let chartEvents = allCombinedEvents.filter((e: any) => {
      const eventDate = new Date(e.date || e.startDate || 0);
      if (eventDate >= now) return false;

      if (eventGraphFilter === 'All') return true;
      if (eventGraphFilter === 'Literary Event') return e.eventType?.toLowerCase().includes('literary');
      if (eventGraphFilter === 'Book Fair') return e.eventType?.toLowerCase().includes('fair');
      if (eventGraphFilter === 'Meet the Authors / Other') return !e.eventType?.toLowerCase().includes('literary') && !e.eventType?.toLowerCase().includes('fair');
      return true;
    });

    chartEvents.sort((a: any, b: any) => {
      const dateA = new Date(a.date || a.startDate || 0);
      const dateB = new Date(b.date || b.startDate || 0);
      return dateA.getTime() - dateB.getTime();
    });

    if (eventTimeFilter === 'Last 15') {
      chartEvents = chartEvents.slice(-15);
    } else if (eventTimeFilter === 'Last Quarter') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      chartEvents = chartEvents.filter((e: any) => new Date(e.date || e.startDate) >= threeMonthsAgo);
    } else if (!isNaN(parseInt(eventTimeFilter))) {
      const targetYear = parseInt(eventTimeFilter);
      const startOfYear = new Date(targetYear, 0, 1);
      const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);
      chartEvents = chartEvents.filter((e: any) => {
        const d = new Date(e.date || e.startDate);
        return d >= startOfYear && d <= endOfYear;
      });
    }

    const currentYear = new Date().getFullYear();
    const availableYears = [];
    for (let y = currentYear; y >= 2025; y--) {
      availableYears.push(y);
    }

    const chartData = chartEvents.map((e: any) => ({
      name: e.name,
      booksSold: (e.isLegacy ? e.aggSold : e.eventBooks?.reduce((s: number, eb: any) => s + (eb.soldStock || 0), 0)) || 0
    }));

    let dateRangeString = 'All Time';
    if (chartEvents.length > 0) {
      const firstDate = new Date(chartEvents[0].date || chartEvents[0].startDate);
      const lastDate = new Date(chartEvents[chartEvents.length - 1].date || chartEvents[chartEvents.length - 1].startDate);
      const formatOpts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
      if (firstDate.getTime() === lastDate.getTime()) {
        dateRangeString = firstDate.toLocaleDateString(undefined, formatOpts);
      } else {
        dateRangeString = `${firstDate.toLocaleDateString(undefined, formatOpts)} - ${lastDate.toLocaleDateString(undefined, formatOpts)}`;
      }
    }

    let filteredTableEvents = allCombinedEvents.filter((e: any) => {
      if (eventGraphFilter === 'All') return true;
      // Format filters
      if (eventGraphFilter === 'Meet the Authors') return e.eventType === 'Meet the Authors';
      if (eventGraphFilter === 'Stall') return e.eventType === 'Stall';
      // Category filters
      if (eventGraphFilter === 'Housing Society') return e.category === 'Housing Society';
      if (eventGraphFilter === 'Corporate Office') return e.category === 'Corporate Office';
      if (eventGraphFilter === 'College') return e.category === 'College';
      if (eventGraphFilter === 'University') return e.category === 'University';
      if (eventGraphFilter === 'Book Fair') return e.category === 'Book Fair';

      return true;
    });

    if (eventSearch.trim()) {
      filteredTableEvents = filteredTableEvents.filter((e: any) => e.name.toLowerCase().includes(eventSearch.toLowerCase()));
    }

    if (eventRegistryFilter !== 'Proposed Events') {
      filteredTableEvents = filteredTableEvents.filter((e: any) => !e.isProposed);
    }

    if (eventRegistryFilter !== 'All Events') {
      if (eventRegistryFilter === 'Pending Approval') {
        filteredTableEvents = filteredTableEvents.filter((e: any) => (e.status === 'Upcoming' || e.status === 'Live' || e.status === 'Ongoing') && e.eventAuthors?.some((r: any) => r.optInStatus === 'Pending' || r.optInStatus === 'Pending Approval'));
      } else if (eventRegistryFilter === 'Upcoming & Live') {
        filteredTableEvents = filteredTableEvents.filter((e: any) => e.status === 'Upcoming' || e.status === 'Live' || e.status === 'Ongoing');
      } else if (eventRegistryFilter === 'Past Events') {
        filteredTableEvents = filteredTableEvents.filter((e: any) => e.status === 'Past');
      } else if (eventRegistryFilter === 'Legacy Archive') {
        filteredTableEvents = filteredTableEvents.filter((e: any) => e.isLegacy || e.status === 'Legacy Archive');
      } else if (eventRegistryFilter === 'Proposed Events') {
        filteredTableEvents = filteredTableEvents.filter((e: any) => e.isProposed);
      }
    }

    if (eventTimeFilter === 'Last 15') {
      filteredTableEvents = filteredTableEvents.slice(0, 15);
    } else if (eventTimeFilter === 'Last Quarter') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      filteredTableEvents = filteredTableEvents.filter((e: any) => new Date(e.date || e.startDate) >= threeMonthsAgo);
    } else if (!isNaN(parseInt(eventTimeFilter))) {
      const targetYear = parseInt(eventTimeFilter);
      const startOfYear = new Date(targetYear, 0, 1);
      const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);
      filteredTableEvents = filteredTableEvents.filter((e: any) => {
        const d = new Date(e.date || e.startDate);
        return d >= startOfYear && d <= endOfYear;
      });
    }

    const eventsChartData = filteredTableEvents.map(evt => {
      const isPastOrArchive = evt.isLegacy || evt.status === 'Past' || evt.status === 'Legacy Archive';
      const participated = isPastOrArchive ? (evt.aggAuthors || 0) : (evt._count?.eventAuthors || 0);
      // Use stored eligible count if available (verified ground truth), else compute dynamically
      const eligibleAuthorsCount = (evt.aggEligibleAuthors != null)
        ? evt.aggEligibleAuthors
        : authors.filter((a: any) => {
            const joinDate = a.groupJoiningDate ? new Date(a.groupJoiningDate) : new Date(a.createdAt);
            joinDate.setHours(0, 0, 0, 0);
            return parseEventDateHelper(evt.date || evt.startDate).getTime() >= joinDate.getTime();
          }).length;
      const participationPercentage = eligibleAuthorsCount === 0 ? 0 : Math.round((participated / (evt.aggEligibleAuthors || eligibleAuthorsCount)) * 100);
      
      return {
        name: evt.name,
        participationPercentage,
        participated,
        eligible: eligibleAuthorsCount
      };
    }).filter(evt => evt.participationPercentage > 0).sort((a, b) => b.participationPercentage - a.participationPercentage);

    const handleDownloadParticipantsList = async () => {
      const toastId = toast.loading('Generating Participants List...');
      try {
        const ExcelJS = (await import('exceljs')).default;
        const { saveAs } = await import('file-saver');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Participants List');

        const sortedEvents = [...allCombinedEvents].sort((a, b) => {
          let da = new Date(a.date).getTime();
          let db = new Date(b.date).getTime();
          if (isNaN(da)) da = new Date(a.createdAt).getTime();
          if (isNaN(db)) db = new Date(b.createdAt).getTime();
          return da - db;
        });

        const headers = ['S.No', 'Author Name'];
        sortedEvents.forEach(e => headers.push(e.name));
        
        const headerRow = sheet.addRow(headers);
        headerRow.eachCell((cell, colNumber) => {
          cell.font = { bold: true, color: { argb: 'FF000000' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
          
          if (colNumber <= 2) {
             cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
          } else {
             const evt = sortedEvents[colNumber - 3];
             const catLower = (evt.category || evt.eventType || evt.name || '').toLowerCase();
             let catColor = 'FFFFFFFF';
             if (catLower.includes('housing') || catLower.includes('college')) catColor = 'FFF4C2C2';
             else if (catLower.includes('corporate') || catLower.includes('university')) catColor = 'FFFFFF00';
             else if (catLower.includes('book fair')) catColor = 'FF00FF00';
             else if (catLower.includes('fair')) catColor = 'FF90EE90';
             else catColor = 'FFB0C4DE';
             cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catColor } };
          }
        });

        const columnSums = new Array(sortedEvents.length).fill(0);

        const authorsRes = await axios.get(`${API}/api/admin/authors?limit=10000`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        const allAuthors = authorsRes.data.data || [];

        allAuthors.forEach((author: any, idx: number) => {
          const rowData = [idx + 1, author.name];
          
          const participatedEventIds = author.eventParticipation ? author.eventParticipation.filter((r: any) => r.status !== 'Pending' && r.status !== 'Declined' && !r.status?.endsWith('-Draft')).map((r: any) => r.eventId) : [];
          
          sortedEvents.forEach((evt, eIdx) => {
             const isRegistered = participatedEventIds.includes(evt.id) || (evt.eventAuthors && evt.eventAuthors.some((ea: any) => ea.authorId === author.id && ea.optInStatus !== 'Pending' && ea.optInStatus !== 'Declined' && !ea.optInStatus?.endsWith('-Draft')));
             
             if (isRegistered) {
                rowData.push('PARTICIPATED');
                columnSums[eIdx]++;
             } else {
                rowData.push('');
             }
          });

          const addedRow = sheet.addRow(rowData);
          addedRow.eachCell((cell, colNumber) => {
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            if (colNumber > 2 && cell.value === 'PARTICIPATED') {
               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FF00' } };
               cell.font = { bold: true };
               cell.alignment = { horizontal: 'center' };
            } else if (colNumber === 2) {
               cell.font = { bold: true };
            }
          });
        });

        const sumRowData: any[] = ['-', 'TOTAL PARTICIPANTS'];
        columnSums.forEach(sum => sumRowData.push(sum));
        const sumRow = sheet.addRow(sumRowData);
        sumRow.eachCell((cell, colNumber) => {
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'center' };
          cell.border = { top: { style: 'thick' }, bottom: { style: 'thick' }, left: { style: 'thin' }, right: { style: 'thin' } };
          if (colNumber > 2) {
             const evt = sortedEvents[colNumber - 3];
             const catLower = (evt.category || evt.eventType || evt.name || '').toLowerCase();
             let catColor = 'FFFFFFFF';
             if (catLower.includes('housing') || catLower.includes('college')) catColor = 'FFF4C2C2';
             else if (catLower.includes('corporate') || catLower.includes('university')) catColor = 'FFFFFF00';
             else if (catLower.includes('book fair')) catColor = 'FF00FF00';
             else if (catLower.includes('fair')) catColor = 'FF90EE90';
             else catColor = 'FFB0C4DE';
             cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catColor } };
          } else {
             cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
          }
        });

        sheet.getColumn(1).width = 8;
        sheet.getColumn(2).width = 25;
        for (let i = 0; i < sortedEvents.length; i++) {
           sheet.getColumn(i + 3).width = 18;
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, 'participants_list.xlsx');
        toast.dismiss(toastId);
        toast.success('Participants List generated successfully!');
      } catch (err) {
        toast.dismiss(toastId);
        toast.error('Failed to generate Participants List');
        console.error(err);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-paa-navy/5 pb-4 gap-4">
          <h3 className="text-3xl font-serif font-bold text-paa-navy">Events & Fairs Ecosystem</h3>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleDownloadParticipantsList} className="dash-btn dash-btn-ghost flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              <Download className="w-4 h-4" /> Download Participants List
            </button>
            <button onClick={handleExportEventsExcel} className="dash-btn dash-btn-ghost flex items-center gap-2 border-green-200 text-green-700 hover:bg-green-50">
              <Download className="w-4 h-4" /> Event Summary
            </button>
            <button onClick={() => setIsEventModalOpen(true)} className="dash-btn dash-btn-primary bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
              <Plus className="w-4 h-4" /> Create New Event
            </button>
          </div>
        </div>

        {/* ── Two-column layout: left = KPI + chart, right = ranking table ── */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* LEFT COLUMN */}
          <div className="flex-1 min-w-0">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-none text-white rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider mb-1">Total Events Organized</p>
            <div className="text-2xl font-serif">{allCombinedEvents.filter(e => { const d = new Date(e.date).getTime(); return isNaN(d) || d <= Date.now(); }).length}</div>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 border-none text-white rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold text-rose-100 uppercase tracking-wider mb-1">Total Books Sold</p>
            <div className="text-2xl font-serif">{allCombinedEvents.reduce((acc, evt) => acc + ((evt.isLegacy ? evt.aggSold : evt.eventBooks?.reduce((s: number, eb: any) => s + (eb.soldStock || 0), 0)) || 0), 0)}</div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 border-none text-white rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold text-orange-100 uppercase tracking-wider mb-1">Forthcoming Events</p>
            <div className="text-2xl font-serif">{allCombinedEvents.filter(e => { const d = new Date(e.date).getTime(); return !isNaN(d) && d > Date.now(); }).length}</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 border-none text-white rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1">Total Gross Revenue</p>
            <div className="text-2xl font-serif font-bold">₹{allCombinedEvents.reduce((acc, evt) => acc + ((evt.isLegacy ? (evt.aggRevenue || ((evt.aggSold || 0) * 200) || 0) : evt.eventBooks?.reduce((s: number, eb: any) => s + ((eb.soldStock || 0) * (parseFloat(eb.book?.mrp) || 0)), 0)) || 0), 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h4 className="font-bold text-paa-navy">Events Performance Overview <span className="text-gray-500 font-normal ml-2 text-sm tracking-wide">({dateRangeString})</span></h4>
              <p className="text-xs text-gray-500 font-medium mt-1">Comparing book sales and author participation across all events.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
              <select
                className="border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-paa-navy text-gray-700 bg-gray-50"
                value={eventTimeFilter}
                onChange={(e) => setEventTimeFilter(e.target.value)}
              >
                <option value="Last 15">Last 15 Events</option>
                <option value="All">All Time</option>
                <option value="Last Quarter">Last Quarter</option>
                {availableYears.map(y => (
                  <option key={y} value={y.toString()}>{y}</option>
                ))}
              </select>
              <select
                className="border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-paa-navy text-gray-700 bg-gray-50"
                value={eventGraphFilter}
                onChange={(e) => setEventGraphFilter(e.target.value)}
              >
                <option value="All">All Events</option>
                <optgroup label="── By Format ──">
                  <option value="Meet the Authors">Meet the Authors</option>
                  <option value="Stall">Stall</option>
                </optgroup>
                <optgroup label="── By Category ──">
                  <option value="Housing Society">Housing Society</option>
                  <option value="Corporate Office">Corporate Office</option>
                  <option value="College">College</option>
                  <option value="University">University</option>
                  <option value="Book Fair">Book Fair</option>
                </optgroup>
              </select>
              <div className="w-px h-6 bg-gray-200 hidden md:block"></div>
              <div className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${!showBooksSold ? 'opacity-50' : ''}`} onClick={() => setShowBooksSold(!showBooksSold)}>
                <div className="w-3 h-3 rounded-sm bg-paa-navy"></div> Books Sold
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 25, right: 10, left: -20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} angle={-90} textAnchor="end" dy={10} interval={0} height={100} tickFormatter={(v) => v.length > 25 ? v.substring(0, 25) + '...' : v} />
                <YAxis orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <RechartsTooltip
                  cursor={{ stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '3 3' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                />
                {showBooksSold && (
                  <Line type="linear" dataKey="booksSold" name="Books Sold" stroke="#ec4899" strokeWidth={3} dot={(props: any) => { const { cx, cy, index } = props; return <circle cx={cx} cy={cy} r={4} fill="#ec4899" stroke="#fff" strokeWidth={2} key={`dot-${index}`} />; }} activeDot={{ r: 6 }}>
                    <LabelList dataKey="booksSold" position="top" content={(props: any) => {
                      const { x, y, value, index } = props;
                      const prev = chartData[index - 1]?.booksSold;
                      const next = chartData[index + 1]?.booksSold;

                      let yPos = y - 12;

                      if (prev !== undefined && next !== undefined && value <= prev && value <= next) {
                        yPos = y + 20;
                      } else if (prev !== undefined && value < prev && next === undefined) {
                        yPos = y + 20;
                      }

                      return (
                        <g>
                          <text x={x} y={yPos} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" fontSize="10px" fontWeight="bold" textAnchor="middle">{value}</text>
                          <text x={x} y={yPos} fill="#ec4899" fontSize="10px" fontWeight="bold" textAnchor="middle">{value}</text>
                        </g>
                      );
                    }} />
                  </Line>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        </div>{/* end left column */}

          {/* RIGHT COLUMN — Event Rankings */}
          <div className="w-full xl:w-80 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-full">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h4 className="text-sm font-bold text-paa-navy">Event Rankings</h4>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setRankingMode('participation')}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                      rankingMode === 'participation' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Part. %
                  </button>
                  <button
                    onClick={() => setRankingMode('books')}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                      rankingMode === 'books' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Books Sold
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '520px' }}>
                {(() => {
                  const validEvents = allCombinedEvents.filter((e: any) =>
                    e.isLegacy || e.status === 'Past' || e.status === 'Legacy Archive' || e.status === 'Live' || e.status === 'Ongoing' || e.status === 'Upcoming'
                  );
                  const ranked = validEvents.map((evt: any) => {
                    const books = evt.aggSold ?? (evt.eventBooks?.reduce((s: number, eb: any) => s + (eb.soldStock || 0), 0) || 0);
                    const participated = evt.aggAuthors ?? (evt._count?.eventAuthors || 0);
                    const eligible = evt.aggEligibleAuthors ?? 0;
                    const pct = eligible > 0 ? Math.round((participated / eligible) * 100) : 0;
                    return { name: evt.name, books, pct, participated, eligible };
                  });

                  const sorted = rankingMode === 'participation'
                    ? [...ranked].filter(e => e.pct > 0).sort((a, b) => b.pct - a.pct)
                    : [...ranked].filter(e => e.books > 0).sort((a, b) => b.books - a.books);

                  const maxVal = sorted[0]?.[rankingMode === 'participation' ? 'pct' : 'books'] || 1;

                  return sorted.map((evt, i) => {
                    const val = rankingMode === 'participation' ? evt.pct : evt.books;
                    const barW = Math.round((val / maxVal) * 100);
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                    return (
                      <div key={i} className={`px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} border-b border-gray-50`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-bold text-gray-400 w-5 text-center flex-shrink-0">
                              {medal || `#${i + 1}`}
                            </span>
                            <span className="text-[11px] font-semibold text-paa-navy truncate">{evt.name}</span>
                          </div>
                          <span className={`text-[11px] font-bold flex-shrink-0 ml-2 ${
                            rankingMode === 'participation' ? 'text-indigo-600' : 'text-rose-600'
                          }`}>
                            {rankingMode === 'participation' ? `${val}%` : val}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              rankingMode === 'participation'
                                ? i < 3 ? 'bg-indigo-500' : 'bg-indigo-300'
                                : i < 3 ? 'bg-rose-500' : 'bg-rose-300'
                            }`}
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                        {rankingMode === 'participation' && evt.eligible > 0 && (
                          <p className="text-[9px] text-gray-400 mt-0.5">{evt.participated} of {evt.eligible} authors</p>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>{/* end right column */}
        </div>{/* end two-col flex */}

        <div className="flex flex-col gap-4 mb-4 mt-8">
          <div className="flex justify-between items-center w-full">
            <h4 className="text-2xl font-serif font-bold text-paa-navy">Events Registry</h4>
            <input
              type="text"
              placeholder="Search events..."
              className="border border-gray-300 rounded-lg p-2 text-sm w-64 outline-none focus:border-paa-navy shadow-sm"
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
            />
          </div>
          <div className="hidden lg:flex bg-white rounded-lg p-1 border border-paa-navy/10 shadow-sm self-start">
              {['All Events', 'Pending Approval', 'Upcoming & Live', 'Past Events', 'Legacy Archive', 'Proposed Events'].map((st) => {
                let pendingCount = 0;
                if (st === 'Pending Approval') {
                  pendingCount = allCombinedEvents.reduce((acc, evt) => acc + ((evt.status === 'Upcoming' || evt.status === 'Live' || evt.status === 'Ongoing') && evt.eventAuthors?.filter((r: any) => r.optInStatus === 'Pending Approval').length > 0 ? evt.eventAuthors.filter((r: any) => r.optInStatus === 'Pending Approval').length : 0), 0);
                } else if (st === 'Proposed Events') {
                  pendingCount = allCombinedEvents.filter(e => e.isProposed).length;
                }
                return (
                  <button
                    key={st}
                    onClick={() => setEventRegistryFilter(st)}
                    className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all flex items-center ${eventRegistryFilter === st ? 'bg-paa-navy text-white shadow-sm' : 'text-gray-500 hover:text-paa-navy hover:bg-gray-50'}`}
                  >
                    {st}
                    {pendingCount > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-orange-500 text-black text-[9px] font-black shadow-sm">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>


        <div className="mt-2 border border-paa-navy/5 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500">
          <div className="w-full overflow-x-auto pb-2">
            <table className="dash-table w-full text-left text-[11px]">
              <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                <tr>
                  <th className="w-12 px-1 py-3 text-center !text-[11px] font-bold uppercase tracking-widest !text-indigo-800 !bg-indigo-50 border-b border-black/10">S.No</th>
                  <th className="px-2 py-3 !text-[11px] font-bold uppercase tracking-widest !text-indigo-800 !bg-indigo-50 border-b border-black/10">Event Name</th>
                  <th className="px-2 py-3 !text-[11px] font-bold uppercase tracking-widest !text-indigo-800 !bg-indigo-50 border-b border-black/10">Format</th>
                  <th className="px-2 py-3 !text-[11px] font-bold uppercase tracking-widest !text-indigo-800 !bg-indigo-50 border-b border-black/10">Category</th>
                  <th className="px-2 py-3 !text-[11px] font-bold uppercase tracking-widest !text-indigo-800 !bg-indigo-50 border-b border-black/10 text-right">Reg Fee</th>
                  <th className="px-2 py-3 !text-[11px] font-bold uppercase tracking-widest !text-indigo-800 !bg-indigo-50 border-b border-black/10">Status</th>
                  <th className="px-2 py-3 !text-[11px] font-bold uppercase tracking-widest !text-indigo-800 !bg-indigo-50 border-b border-black/10 text-center">POS</th>
                  <th className="px-2 py-3 !text-[11px] font-bold uppercase tracking-widest !text-indigo-800 !bg-indigo-50 border-b border-black/10 text-right">Authors</th>
                  <th className="px-2 py-3 !text-[11px] font-bold uppercase tracking-widest !text-indigo-800 !bg-indigo-50 border-b border-black/10 text-right">Part.%</th>
                  <th className="px-2 py-3 !text-[11px] font-bold uppercase tracking-widest !text-indigo-800 !bg-indigo-50 border-b border-black/10 text-right">Books</th>
                  <th className="px-2 py-3 !text-[11px] font-bold uppercase tracking-widest !text-indigo-800 !bg-indigo-50 border-b border-black/10 text-right">Revenue</th>
                  <th className="w-28 px-2 py-3 !text-[11px] font-bold uppercase tracking-widest !text-indigo-800 !bg-indigo-50 border-b border-black/10 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paa-navy/5 bg-white text-[11px]">
                {filteredTableEvents.map((evt: any, i: number) => {
                  const isPastOrArchive = evt.isLegacy || evt.status === 'Past' || evt.status === 'Legacy Archive';
                  const evtAuthors = evt.aggAuthors != null ? evt.aggAuthors : (evt.isLegacy ? 'NA' : (evt._count?.eventAuthors || 0));
                  
                  // Use stored eligible count if available (verified ground truth), else compute dynamically
                  const eligibleAuthorsCount = (evt.aggEligibleAuthors != null)
                    ? evt.aggEligibleAuthors
                    : (evt.isLegacy ? 'NA' : authors.filter((a: any) => {
                        const joinDate = a.groupJoiningDate ? new Date(a.groupJoiningDate) : new Date(a.createdAt);
                        joinDate.setHours(0, 0, 0, 0);
                        return parseEventDateHelper(evt.date || evt.startDate).getTime() >= joinDate.getTime();
                      }).length);
                  const participationPercentage = eligibleAuthorsCount === 'NA' || eligibleAuthorsCount === 0 || evtAuthors === 'NA' ? 0 : Math.round((Number(evtAuthors) / Number(eligibleAuthorsCount)) * 100);

                  const books = evt.aggSold != null ? evt.aggSold : (evt.isLegacy ? 'NA' : (evt.eventBooks?.reduce((s: number, eb: any) => s + (eb.soldStock || 0), 0) || 0));
                  const catRowColor = i % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]';
                  const revenueVal = evt.aggRevenue != null ? evt.aggRevenue : (evt.isLegacy ? 'NA' : (evt.eventBooks?.reduce((s: number, eb: any) => s + ((eb.soldStock || 0) * (parseFloat(eb.book?.mrp) || 0)), 0) || 0));
                  const revenue = revenueVal === 'NA' ? 'NA' : `₹${revenueVal}`;
                  return (
                    <React.Fragment key={i}>
                      <tr className={`${expandedEventIndex === i ? 'bg-indigo-50' : catRowColor}`}>
                       <td className="px-1 py-3 text-center align-middle" onClick={() => setExpandedEventIndex(expandedEventIndex === i ? null : i)}>
                          <div className="flex items-center justify-center gap-1 cursor-pointer">
                            <span className="font-bold text-xs text-paa-navy">{i + 1}</span>
                            <button className="text-gray-400">
                              {expandedEventIndex === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="text-base font-bold text-paa-navy mb-1 flex items-center gap-2">
                            {evt.name}
                            {(evt.status === 'Upcoming' || evt.status === 'Live' || evt.status === 'Ongoing') && evt.eventAuthors?.filter((r: any) => r.optInStatus === 'Pending Approval').length > 0 && (
                              <span className="bg-orange-500 text-black font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap" title={`${evt.eventAuthors.filter((r: any) => r.optInStatus === 'Pending Approval').length} Pending Approvals`}>
                                {evt.eventAuthors.filter((r: any) => r.optInStatus === 'Pending Approval').length} New
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-paa-gray-text uppercase tracking-widest">{evt.date}</div>
                        </td>
                        <td className="px-1 py-3 text-sm capitalize">
                          {evt.eventType ? (
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-widest shadow-sm ${
                              evt.eventType === 'Meet the Authors' ? 'bg-yellow-200 text-yellow-900 border border-yellow-300' :
                              evt.eventType === 'Stall' ? 'bg-pink-200 text-pink-900 border border-pink-300' :
                              'bg-gray-200 text-gray-700 border border-gray-300'
                            }`}>{evt.eventType}</span>
                          ) : <span className="text-gray-400">N/A</span>}
                        </td>
                        <td className="px-1 py-3 text-sm capitalize">
                          {evt.category ? (
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-widest shadow-sm ${
                              evt.category === 'Housing Society' ? 'bg-yellow-200 text-yellow-900 border border-yellow-300' :
                              evt.category === 'Corporate Office' ? 'bg-orange-200 text-orange-900 border border-orange-300' :
                              evt.category === 'Book Fair' ? 'bg-pink-200 text-pink-900 border border-pink-300' :

                              evt.category === 'College' ? 'bg-blue-200 text-blue-900 border border-blue-300' :
                              evt.category === 'University' ? 'bg-green-200 text-green-900 border border-green-300' :
                              'bg-gray-200 text-gray-700 border border-gray-300'
                            }`}>{evt.category}</span>
                          ) : <span className="text-gray-400">N/A</span>}
                        </td>
                        <td className="px-1 py-3 text-sm font-bold text-paa-navy text-right">
                          <div>₹{evt.registrationFee || 0}</div>
                          {evt.registrationFee > 0 && <div className="text-[9px] font-normal text-gray-500 uppercase tracking-widest mt-0.5">{evt.feeType || 'Per Author'}</div>}
                        </td>
                        <td className="px-1 py-3">
                          <div className="flex flex-col gap-1.5 items-start">
                            <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-widest shadow-sm ${evt.isLegacy ? 'bg-slate-500 text-white' : (evt.status === 'Pending Approval' ? 'bg-orange-500 text-white' : (evt.status === 'Live' || evt.status === 'Ongoing') ? 'bg-emerald-500 text-white shadow-emerald-500/20 animate-pulse' : evt.status === 'Upcoming' ? 'bg-cyan-500 text-white' : evt.status === 'Past' ? 'bg-purple-500 text-white' : 'bg-gray-300 text-black')}`}>
                              {evt.isLegacy ? 'Legacy Archive' : evt.status}
                            </span>
                            <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                              {evt.broadcastStatus === 'Published' ? (
                                <span className="text-emerald-600 flex items-center gap-1" title="Published to all authors"><CheckCircle2 className="w-3 h-3" /> All</span>
                              ) : (evt.registrations?.length > 0) ? (
                                <span className="text-orange-500 flex items-center gap-1" title="Published to individual authors"><CheckCircle2 className="w-3 h-3" /> Partial</span>
                              ) : (
                                <span className="text-gray-400 flex items-center gap-1" title="Not published"><XCircle className="w-3 h-3" /> Hidden</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-1 py-3 text-sm font-bold text-center">{evt.livePosEnabled && !evt.isPast && !evt.isLegacy && evt.status !== 'Legacy Archive' ? <span className="text-green-700 bg-green-100 border border-green-200 px-1.5 py-0.5 rounded font-bold shadow-sm">Enabled</span> : <span className="text-gray-400">-</span>}</td>
                        <td className="px-1 py-3 text-sm font-bold text-paa-navy text-right">
                          <div className="flex items-center justify-end gap-2">
                            {evtAuthors}
                          </div>
                        </td>
                        <td className="px-1 py-3 text-sm font-bold text-indigo-600 text-right">{participationPercentage}%</td>
                        <td className="px-1 py-3 text-sm font-bold text-paa-navy text-right">{books}</td>
                        <td className="px-1 py-3 text-sm font-bold text-green-700 text-right">{revenue}</td>
                        <td className="px-1 py-3 text-right">
                          <div className="flex gap-1 justify-end flex-wrap">
                            {evt.isProposed ? (
                                <button title="Discard Proposed Event" onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Delete this proposed event?')) {
                                    try {
                                      await axios.delete(`${API}/api/admin/queries/inq_${evt.id.replace('proposed_', '')}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                                      toast.success('Proposed event discarded');
                                      fetchEvents();
                                    } catch (err) { toast.error('Failed to discard proposed event'); }
                                  }
                                }} className="p-2 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white hover:border-red-600 rounded-lg border border-red-200 transition-colors shadow-sm">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                            ) : evt.status === 'Pending Approval' ? (
                              <>
                                <button title="Approve Event" onClick={async () => {
                                  if (window.confirm('Approve this event?')) {
                                    try {
                                      await axios.put(`${API}/api/admin/events/${evt.id}/status`, { status: 'Upcoming' }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                                      toast.success('Event approved');
                                      fetchEvents();
                                    } catch (err) { toast.error('Failed to approve'); }
                                  }
                                }} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 rounded-lg border border-emerald-200 transition-colors shadow-sm">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button title="Reject Event" onClick={async () => {
                                  if (window.confirm('Reject this event?')) {
                                    try {
                                      await axios.put(`${API}/api/admin/events/${evt.id}/status`, { status: 'Rejected' }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                                      toast.success('Event rejected');
                                      fetchEvents();
                                    } catch (err) { toast.error('Failed to reject'); }
                                  }
                                }} className="p-2 text-orange-600 bg-orange-50 hover:bg-orange-600 hover:text-white hover:border-orange-600 rounded-lg border border-orange-200 transition-colors shadow-sm">
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button title="View Breakdown" onClick={() => handleOpenBreakdown(evt)} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-lg shadow-sm transition-colors relative">
                                <Eye className="w-4 h-4" />
                                {evt.registrations?.filter((r: any) => r.optInStatus === 'Pending' || r.optInStatus === 'Pending Approval').length > 0 && (
                                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse shadow-sm">
                                    {evt.registrations.filter((r: any) => r.optInStatus === 'Pending' || r.optInStatus === 'Pending Approval').length}
                                  </span>
                                )}
                              </button>
                            )}
                            {!evt.isProposed && (
                              <>
                                <button title="Edit Event" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingEvent(evt); setTimeout(() => setIsEditEventModalOpen(true), 10); }} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg shadow-sm transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button title="Delete Event" onClick={() => handleDeleteEvent(evt.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg shadow-sm transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedEventIndex === i && (
                        <tr className="bg-[#f8fafc] border-b border-gray-100 shadow-inner">
                          <td colSpan={11} className="p-0">
                            <div className="flex flex-col md:flex-row gap-8 px-8 py-6 border-l-4 border-indigo-400 ml-6 my-4 bg-white rounded-r-xl shadow-sm mr-6">
                              <div className="flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Event Description</p>
                                <p className="text-sm text-paa-navy leading-relaxed">{evt.description || 'No description provided.'}</p>
                              </div>
                              <div className="w-px bg-gray-100 hidden md:block"></div>
                              <div className="flex flex-col gap-5 min-w-[150px]">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
                                  <p className="text-sm text-paa-navy font-semibold">{evt.location || evt.address || 'TBA'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> Duration</p>
                                  <p className="text-sm text-paa-navy font-semibold">{evt.duration || (evt.durationDays ? `${evt.durationDays} Days` : 'N/A')}</p>
                                </div>
                              </div>
                              <div className="w-px bg-gray-100 hidden md:block"></div>
                              <div className="min-w-[160px]">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Event Banner</p>
                                {evt.bannerUrl ? (
                                  <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm aspect-video w-40 relative group">
                                    <img src={evt.bannerUrl.startsWith('http') ? evt.bannerUrl : `${API}${evt.bannerUrl}`} alt="Banner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                  </div>
                                ) : (
                                  <div className="aspect-video w-40 bg-gray-50 rounded-lg border border-gray-200 border-dashed flex items-center justify-center text-[10px] text-gray-400 italic">No Banner Uploaded</div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredTableEvents.length === 0 && <tr><td colSpan={11} className="text-center py-6 text-sm text-paa-gray-text italic">No events found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };





  const AuthorDataTab = ({ refreshTrigger }: any) => {
    const [fields, setFields] = useState<any[]>([]);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [showColumnsMenu, setShowColumnsMenu] = useState(false);

    // Get all unique extraData keys from all authors to form table columns
    const dynamicKeys = Array.from(new Set<string>(
      authors.reduce((acc: string[], author: any) => {
        if (author.extraData) {
          const parsed = typeof author.extraData === 'string' ? (() => { try { return JSON.parse(author.extraData); } catch (e) { return {}; } })() : author.extraData;
          acc = acc.concat(Object.keys(parsed));
        }
        return acc;
      }, [])
    ));

    useEffect(() => {
      axios.get(`${API}/api/admin/author-fields`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(res => setFields(res.data));
    }, []);

    // Initialize all columns as selected
    useEffect(() => {
      if (selectedColumns.length === 0 && dynamicKeys.length > 0) {
        setSelectedColumns(dynamicKeys);
      }
    }, [dynamicKeys.length]);

    const [newField, setNewField] = useState({ name: '', type: 'text', requiredForRegistration: false });


    const saveFields = () => {
      axios.post(`${API}/api/admin/author-fields`, { fields }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(() => toast.success('Fields saved successfully!'))
        .catch(() => toast.error('Failed to save fields'));
    };

    const handleColumnToggle = (col: string) => {
      if (selectedColumns.includes(col)) {
        setSelectedColumns(selectedColumns.filter(c => c !== col));
      } else {
        setSelectedColumns([...selectedColumns, col]);
      }
    };


    const handleEscalateOrder = async (id: number) => {
      try {
        await axios.post(`${API}/api/admin/orders/${id}/escalate`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        toast.success("Escalation email sent to author!");
      } catch (err) {
        toast.error("Failed to escalate order");
      }
    };

    const handleExportCSV = async () => {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const baseFields = [
        'Status', 'Name', 'Pen Name', 'Email', 'Phone', 'WhatsApp',
        'Address', 'District', 'City', 'State', 'Pincode',
        'Aadhar/Voter ID/DL', 'DOB', 'Bio', 'Experience', 'Qualification', 'Skills', 'Hobbies', 'Why Joining',
        'Instagram', 'Facebook', 'LinkedIn', 'YouTube',
        'Conflict of Interest Signature', 'Agreed To Guidelines', 'Agreed To Info Doc',
        'Transaction ID', 'Payment Screenshot', 'Joined Date', 'Books Data'
      ];
      
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Authors Data');
      
      const allHeaders = [...baseFields, ...selectedColumns];
      
      sheet.mergeCells(1, 1, 1, allHeaders.length);
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = 'AUTHORS DATA EXPORT';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1A2E' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      const headerRow = sheet.addRow(allHeaders);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      authors.forEach(author => {
        const joinedDate = author.createdAt ? new Date(author.createdAt).toLocaleDateString() : '';
        const extra = typeof author.extraData === 'string' ? JSON.parse(author.extraData) : (author.extraData || {});

        let booksData = '';
        if (author.books && author.books.length > 0) {
          booksData = author.books.map((b: any, i: number) =>
            `Book ${i + 1}: ${b.title || 'NA'} | Subtitle: ${b.subtitle || 'NA'} | Genre: ${b.genre || 'NA'} (${b.subGenre || 'NA'}) | Synopsis: ${b.synopsis || 'NA'} | Pages: ${b.pages || 0} | MRP: ${b.mrp || 0} | Stock: ${b.stock || 0} | Language: ${b.language || 'NA'} | ISBN: ${b.isbn || 'NA'} | Publisher: ${b.publisher || 'NA'} | Pub Date: ${b.publicationDate || 'NA'} | Edition: ${b.edition || '1'} | Format: ${b.format || 'NA'} | Print: ${b.printFormat || 'NA'} | Purpose: ${b.purpose || 'NA'}`
          ).join('\n-----------------\n');
        }

        const rowData = [
          author.status, author.name, author.penName, author.email, author.phone, author.whatsapp,
          author.address, author.district, author.city, author.state, author.pincode,
          author.aadharNumber, author.age || author.dob, author.bio, author.experience, author.qualification, author.skills, author.hobbies, author.whyJoining,
          author.instagram, author.facebook, extra.linkedin, extra.youtube,
          extra.conflictOfInterestSignature, extra.agreedToGuidelines, extra.agreedToInfoDoc,
          author.transactionId, author.paymentScreenshot, joinedDate, booksData
        ];

        selectedColumns.forEach(col => {
          rowData.push(extra && extra[col] ? extra[col] : '');
        });
        
        const addedRow = sheet.addRow(rowData);
        addedRow.eachCell((cell) => {
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'author_extra_data_report.xlsx');
    };

    return (
      <div className="space-y-8 max-w-6xl">
        <div className="bg-white p-8 border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out rounded-3xl-2xl">
          <h3 className="text-xl font-serif font-medium text-paa-navy mb-1">Author Dynamic Fields Management</h3>
          <p className="text-paa-gray-text text-sm mb-6 border-b border-paa-navy/5 pb-4">Define extra information that all authors must provide. This will appear on their dashboard until filled.</p>

          <div className="flex flex-wrap gap-3 mb-6">
            {fields.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 border border-paa-navy/20 px-3 py-1.5 rounded-3xl-2xl shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out text-sm">
                <span className="font-bold text-paa-navy">{f.name}</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">({f.type})</span>
                {f.requiredForRegistration && <span className="text-[9px] bg-paa-navy text-white px-1.5 py-0.5 rounded-3xl-2xl uppercase tracking-widest font-bold">Registration</span>}
                <button onClick={() => setFields(fields.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 ml-2" title="Remove Field">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {fields.length === 0 && <p className="text-sm text-gray-500 italic w-full">No dynamic fields created yet.</p>}
          </div>

          <div className="bg-[#f0fdf4] border border-[#bbf7d0] p-4 rounded-3xl-2xl mb-6 flex flex-col md:flex-row gap-4 items-center">
            <input
              type="text"
              placeholder="New Field Name (e.g. Aadhar/Voter ID/DL)"
              className="border border-paa-navy/20 p-2 text-sm flex-1 outline-none focus:border-paa-navy bg-white rounded-3xl-2xl w-full md:w-auto"
              value={newField.name}
              onChange={e => setNewField({ ...newField, name: e.target.value })}
            />
            <select
              className="border border-paa-navy/20 p-2 text-sm outline-none focus:border-paa-navy bg-white rounded-3xl-2xl"
              value={newField.type}
              onChange={e => setNewField({ ...newField, type: e.target.value })}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
            </select>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-paa-navy cursor-pointer">
              <input
                type="checkbox"
                className="accent-paa-navy w-4 h-4"
                checked={newField.requiredForRegistration}
                onChange={e => setNewField({ ...newField, requiredForRegistration: e.target.checked })}
              />
              Require on Reg.
            </label>
            <button
              onClick={() => {
                if (!newField.name) return;
                setFields([...fields, { ...newField, required: true }]);
                setNewField({ name: '', type: 'text', requiredForRegistration: false });
              }}
              className="px-4 py-2 border border-paa-navy text-paa-navy bg-white text-xs font-bold uppercase tracking-widest hover:bg-paa-navy hover:text-white transition-colors rounded-3xl-2xl shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out whitespace-nowrap"
            >
              Add Field
            </button>
          </div>

          <div className="flex">
            <button onClick={saveFields} className="px-6 py-2 bg-paa-navy text-white text-xs font-bold uppercase tracking-widest hover:bg-paa-gold hover:text-paa-navy transition-colors rounded-3xl-2xl shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">Save Fields Settings</button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl-2xl border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-paa-navy uppercase tracking-widest flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-paa-gold" />
                Author Data Report
              </h2>
              <p className="text-sm text-paa-gray-text mt-1">View and export the custom fields data filled out by authors.</p>
            </div>
            <div className="flex gap-3 items-center">
              {dynamicKeys.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                    className="px-3 py-2 border border-paa-navy/20 bg-gray-50 hover:bg-gray-100 rounded-3xl-2xl text-paa-navy transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-1"
                  >
                    Columns <ChevronDown className="w-4 h-4" />
                  </button>
                  {showColumnsMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-xl rounded-3xl-2xl z-20 py-2">
                      {dynamicKeys.map(key => (
                        <label key={key} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-xs font-bold uppercase tracking-widest text-paa-navy cursor-pointer whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="accent-paa-navy"
                            checked={selectedColumns.includes(key)}
                            onChange={() => handleColumnToggle(key)}
                          />
                          {key}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button onClick={handleExportCSV} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase tracking-widest rounded-3xl-2xl transition-colors shadow rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">
                Export Excel
              </button>
              <button onClick={() => fetchAuthors()} className="p-2 border border-paa-navy/20 bg-gray-50 hover:bg-gray-100 rounded-3xl-2xl text-paa-navy transition-colors shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="border border-paa-navy/5 rounded-3xl-2xl shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out overflow-hidden">
            <div className="overflow-x-auto">
              <table className="dash-table">
                <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                  <tr>
                    <th className="!text-[14px] !text-indigo-800 !bg-transparent">Author Name</th>
                    <th className="!text-[14px] !text-indigo-800 !bg-transparent">Email</th>
                    {dynamicKeys.filter(k => selectedColumns.includes(k)).map(key => (
                      <th key={key} className="text-paa-gold !text-[14px] !text-indigo-800 !bg-transparent">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {authors.length === 0 ? (
                    <tr><td colSpan={selectedColumns.length + 2} className="px-6 py-8 text-center text-gray-500 italic">No authors found.</td></tr>
                  ) : authors.map(author => (
                    <tr key={author.id}>
                      <td className="font-medium text-paa-navy flex items-center">
                        {author.name}
                        {(() => {
                          let ed = author.extraData;
                          if (typeof ed === 'string') {
                            try { ed = JSON.parse(ed); } catch (e) { }
                          }
                          return ed?.hasPendingEdits && (
                            <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] uppercase tracking-wider font-bold rounded-full">Edited</span>
                          );
                        })()}
                      </td>
                      <td className="text-gray-500">{author.email}</td>
                      {dynamicKeys.filter(k => selectedColumns.includes(k)).map(key => (
                        <td key={key} className="text-gray-700">
                          {author.extraData && author.extraData[key] ? String(author.extraData[key]) : <span className="text-gray-300 italic">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };


  const FormsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-serif font-semibold text-paa-navy tracking-tight border-l-4 border-paa-navy pl-2">Forms Management</h3>
        <button
          onClick={() => setIsFormModalOpen(true)}
          className="px-4 py-2 bg-paa-navy text-paa-cream text-xs font-bold uppercase transition hover:bg-paa-gold"
        >
          Create Form
        </button>
      </div>

      {selectedFormResponses ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedFormResponses(null)}
              className="text-paa-navy hover:text-paa-gold"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h4 className="font-bold text-paa-navy">Responses for: {selectedFormResponses.formTitle}</h4>
          </div>
          <div className="overflow-x-auto bg-white border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out">
            <table className="dash-table">
              <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                <tr>
                  <th className="!text-[14px] !text-indigo-800 !bg-transparent">Author</th>
                  <th className="!text-[14px] !text-indigo-800 !bg-transparent">Date</th>
                  <th className="!text-[14px] !text-indigo-800 !bg-transparent">Answers</th>
                </tr>
              </thead>
              <tbody>
                {selectedFormResponses.responses.map((r: any) => (
                  <tr key={r.id}>
                    <td><p className="font-bold text-paa-navy">{r.author?.name}</p></td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="max-w-sm truncate text-xs text-paa-gray-text font-medium">
                      {JSON.stringify(r.answers)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forms.map((f: any) => (
            <div key={f.id} className="p-4 bg-white border border-paa-navy/5 flex flex-col gap-2 hover:shadow-md transition">
              <div className="font-bold text-paa-navy text-lg">{f.title}</div>
              <div className="text-sm text-paa-gray-text">{f.description}</div>
              <div className="text-xs text-paa-gray-text">Fields: {f.fields.length}</div>
              <div className="flex gap-2 mt-4">
                <button
                  className="px-3 py-1.5 bg-paa-navy/10 text-paa-navy text-xs font-bold uppercase hover:bg-paa-navy hover:text-white transition rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
                  onClick={() => {
                    axios.get(`${API}/api/admin/forms/${f.id}/responses`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
                      .then(res => setSelectedFormResponses({ formTitle: f.title, responses: res.data }));
                  }}
                >
                  View Responses
                </button>
                <button
                  className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold uppercase hover:bg-red-600 hover:text-white transition rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
                  onClick={() => {
                    if (window.confirm("Delete this form and all its responses?")) {
                      axios.delete(`${API}/api/admin/forms/${f.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
                        .then(() => fetchForms());
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderGalleryTab = () => {

    const handleCarouselUpload = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (carouselImages.length >= 10) return toast.error('Maximum 10 images allowed for the carousel.');

      setUploadingCarousel(true);
      const formData = new FormData();
      formData.append('image', file);
      try {
        await axios.post(`${API}/api/admin/carousel`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success('Carousel image uploaded.');
        fetchCarouselImages();
      } catch (err) {
        toast.error('Failed to upload image.');
      } finally {
        setUploadingCarousel(false);
      }
    };

    const handleCarouselMove = async (index: number, direction: 'left' | 'right') => {
      const newImages = [...carouselImages];
      if (direction === 'left' && index > 0) {
        [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
      } else if (direction === 'right' && index < newImages.length - 1) {
        [newImages[index + 1], newImages[index]] = [newImages[index], newImages[index + 1]];
      } else {
        return;
      }
      setCarouselImages(newImages);
      try {
        await axios.post(`${API}/api/admin/carousel/reorder`, {
          order: newImages.map(img => img.id)
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      } catch (err) {
        console.error(err);
        toast.error('Failed to save new order');
        fetchCarouselImages();
      }
    };

    const handleCarouselDelete = async (filename: string) => {
      try {
        await axios.delete(`${API}/api/admin/carousel/${filename}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success('Carousel image removed.');
        fetchCarouselImages();
      } catch (err) {
        toast.error('Failed to remove image.');
      }
    };

    const handleUploadGalleryImage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedGalleryEvent || galleryUploadFiles.length === 0) return;

      setIsUploadingGallery(true);
      try {
        const token = localStorage.getItem('token');
        const promises = galleryUploadFiles.map(file => {
          const formData = new FormData();
          formData.append('photo', file);
          if (galleryUploadCaption) formData.append('caption', galleryUploadCaption);
          formData.append('itemType', selectedGalleryEvent.itemType || 'Event');
          // Pass the raw event.id, the backend automatically resolves/creates the galleryEvent
          return axios.post(`${API}/api/admin/gallery/${selectedGalleryEvent.id}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
          });
        });

        const results = await Promise.all(promises);
        const newImages = results.map(r => r.data);

        toast.success('Images uploaded successfully. They are now live on the Customer Site!');
        setGalleryUploadFiles([]);
        setGalleryUploadCaption('');

        // Update the current view without closing it
        setSelectedGalleryEvent((prev: any) => ({
          ...prev,
          galleryEvent: {
            ...prev.galleryEvent,
            images: [...(prev.galleryEvent?.images || []), ...newImages]
          }
        }));
      } catch (err) {
        console.error(err);
        toast.error('Failed to upload image.');
      } finally {
        setIsUploadingGallery(false);
      }
    };

    const handleUploadBannerImage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedGalleryEvent || !bannerUploadFile) return;
      setIsUploadingBanner(true);
      try {
        const token = localStorage.getItem('token');
        const fd = new FormData();
        fd.append('banner', bannerUploadFile);

        const isLib = selectedGalleryEvent.itemType === 'Library';

        if (!isLib) {
          fd.append('name', selectedGalleryEvent.name);
          fd.append('location', selectedGalleryEvent.location);
          fd.append('date', selectedGalleryEvent.date);
          fd.append('duration', selectedGalleryEvent.duration);
          fd.append('status', selectedGalleryEvent.status);
          fd.append('eventType', selectedGalleryEvent.eventType);
        }

        const endpoint = isLib
          ? `${API}/api/admin/libraries/${selectedGalleryEvent.id}/banner`
          : `${API}/api/admin/events/${selectedGalleryEvent.id}`;

        const res = await axios.put(endpoint, fd, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
        });

        toast.success('Banner uploaded successfully!');
        setBannerUploadFile(null);

        // Update the current view without closing it
        setSelectedGalleryEvent((prev: any) => ({
          ...prev,
          bannerUrl: res.data.bannerUrl
        }));

        if (isLib) {
          fetchLibraries(true);
        } else {
          fetchEvents(true);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to upload banner.');
      } finally {
        setIsUploadingBanner(false);
      }
    };

    const handleDeleteBanner = async () => {
      if (!selectedGalleryEvent) return;
      if (!confirm('Are you sure you want to delete the current banner?')) return;
      setIsDeletingBanner(true);
      try {
        const token = localStorage.getItem('token');
        const isLib = selectedGalleryEvent.itemType === 'Library';
        const endpoint = isLib
          ? `${API}/api/admin/libraries/${selectedGalleryEvent.id}/banner`
          : `${API}/api/admin/events/${selectedGalleryEvent.id}/banner`;

        await axios.delete(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });

        toast.success('Banner deleted successfully!');
        setSelectedGalleryEvent((prev: any) => ({
          ...prev,
          bannerUrl: null
        }));

        if (isLib) {
          fetchLibraries(true);
        } else {
          fetchEvents(true);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete banner.');
      } finally {
        setIsDeletingBanner(false);
      }
    };

    const combinedGalleryItems = [
      ...events.map((e: any) => ({ ...e, itemType: 'Event' })),
      ...libraries.filter(l => l.type === 'Airport Library').map((l: any) => ({
        ...l,
        itemType: 'Library',
        eventType: l.type,
        date: l.createdAt,
        location: l.city,
      }))
    ];

    const filteredEvents = combinedGalleryItems.filter((e: any) => {
      const matchSearch = (e.name?.toLowerCase() || '').includes(galleryTabSearchTerm.toLowerCase()) || (e.location?.toLowerCase() || '').includes(galleryTabSearchTerm.toLowerCase());
      const matchType = galleryTabFilterType ? e.eventType === galleryTabFilterType : true;
      const matchDate = galleryTabFilterDate ? new Date(e.date).toISOString().startsWith(galleryTabFilterDate) : true;
      