const fs = require('fs');
let code = fs.readFileSync('scratch/overview_code.tsx', 'utf8');

code = code.replace(/<button onClick=\{\(e\) => handleDismiss\(e, 'authors'\)\}/g, `<button aria-label="Dismiss Author Approval" onClick={(e) => handleDismiss(e, 'authors')}`);
code = code.replace(/<button onClick=\{\(e\) => handleDismiss\(e, 'edits'\)\}/g, `<button aria-label="Dismiss Edits Approval" onClick={(e) => handleDismiss(e, 'edits')}`);
code = code.replace(/<button onClick=\{\(e\) => handleDismiss\(e, 'events'\)\}/g, `<button aria-label="Dismiss Event Registrations" onClick={(e) => handleDismiss(e, 'events')}`);
code = code.replace(/<button onClick=\{\(e\) => handleDismiss\(e, 'orders'\)\}/g, `<button aria-label="Dismiss Web Orders" onClick={(e) => handleDismiss(e, 'orders')}`);
code = code.replace(/<button onClick=\{\(e\) => handleDismiss\(e, 'fines'\)\}/g, `<button aria-label="Dismiss Fine Payments" onClick={(e) => handleDismiss(e, 'fines')}`);
code = code.replace(/<button onClick=\{\(e\) => handleDismiss\(e, 'helpdesk'\)\}/g, `<button aria-label="Dismiss Author Queries" onClick={(e) => handleDismiss(e, 'helpdesk')}`);
code = code.replace(/<button onClick=\{handleNotifyAllLowStock\}/g, `<button aria-label="Notify All Authors About Low Stock" onClick={handleNotifyAllLowStock}`);
code = code.replace(/<button onClick=\{\(\) => handleNotifySingleBook\(b\)\}/g, `<button aria-label="Notify Author About Low Stock" onClick={() => handleNotifySingleBook(b)}`);
code = code.replace(/<button onClick=\{\(e\) => handleDismiss\(e, \`lowstock_\$\{b\.dbId \|\| b\.id\}\`\)\}/g, `<button aria-label="Dismiss Low Stock Alert" onClick={(e) => handleDismiss(e, \`lowstock_\${b.dbId || b.id}\`)}`);

code = code.replace(/ size=\{16\} \/>/g, ` size={16} aria-hidden="true" />`);
code = code.replace(/ size=\{18\} \/>/g, ` size={18} aria-hidden="true" />`);
code = code.replace(/ size=\{14\} \/>/g, ` size={14} aria-hidden="true" />`);
code = code.replace(/ size=\{12\} \/>/g, ` size={12} aria-hidden="true" />`);
code = code.replace(/ className="w-4 h-4 text-[^"]+" \/>/g, match => match.replace(' />', ` aria-hidden="true" />`));
code = code.replace(/ className="w-5 h-5 text-[^"]+" \/>/g, match => match.replace(' />', ` aria-hidden="true" />`));

// Remove COLORS from inside useMemo, we will add it outside
code = code.replace(/const COLORS = \['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'\];\n/g, '');

code = code.replace('const OverviewTab = ({ refreshTrigger }: { refreshTrigger: number }) => {', `
import React, { useState, useMemo } from 'react';
import { Users, Activity, ShoppingCart, BookOpen, Calendar as CalendarIcon, Library, TrendingUp, Eye, PieChart, BarChart2, AlertCircle, Package, Bell, X, MessageSquare, Edit } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, LabelList } from 'recharts';
import axios from 'axios';
import { toast } from 'sonner';
import { getAuthorParticipationStats } from './OperationsDashboardPage';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const AdminOverviewTab = React.memo(({ refreshTrigger, books, authors, orders, events, stats, prevQueries, setActiveTab, setAuthorStatusFilter, API }: any) => {
`);
code = code.replace(/prevCountsRef\.current\?\.queries/g, 'prevQueries');

const splitIdx = code.indexOf('// Low stock books');
const splitEnd = code.indexOf('const insights = [');

const before = code.substring(0, splitIdx);
const middle = code.substring(splitIdx, splitEnd);
const after = code.substring(splitEnd);

const fixedMiddle = `
    // Memoize heavy calculations to prevent layout thrashing and high main-thread execution time
    const { 
      lowStockBooks, pendingAuthors, pendingEdits, pendingEvents, pendingOrders, pendingQueries, pendingFines,
      orderCompletionRate, avgParticipation, participationChartData, latestEventRate, categoryChartData,
      orderStatusData, topAuthorsData, topBooksData, revenueTrendData, totalBooksSoldWeb, totalRevenueWeb,
      completedOrders
    } = useMemo(() => {
` + middle.replace(/const handleNotifyAllLowStock = async \(\) => \{[\s\S]*?\};\n\n/m, '')
            .replace(/const handleNotifySingleBook = async \(b: any\) => \{[\s\S]*?\};\n\n/m, '') + `
      return {
        lowStockBooks, pendingAuthors, pendingEdits, pendingEvents, pendingOrders, pendingQueries: prevQueries, pendingFines,
        orderCompletionRate, avgParticipation, participationChartData, latestEventRate, categoryChartData,
        orderStatusData, topAuthorsData, topBooksData, revenueTrendData, totalBooksSoldWeb, totalRevenueWeb,
        completedOrders: orders.filter((o: any) => o.status === 'Completed' || o.status === 'Dispatched').length
      };
    }, [books, authors, orders, events, stats, localDismissed, notifiedBooks, prevQueries]);

    const handleNotifyAllLowStock = async () => {
      setNotifiedBooks((prev: any) => {
        const next = { ...prev };
        lowStockBooks.forEach((b: any) => {
          next[b.id || b.dbId] = { inv: b.inventory || 0, time: Date.now() };
        });
        localStorage.setItem('paa_notified_lowstock_v2', JSON.stringify(next));
        return next;
      });
      toast.success(\`Notified \${lowStockBooks.length} authors about low stock!\`);

      for (const b of lowStockBooks) {
        try {
          await axios.post(\`\${API}/api/admin/authors/\${b.authorId}/notify-low-stock\`, { bookId: b.id || b.dbId, title: b.title }, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } });
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
        await axios.post(\`\${API}/api/admin/authors/\${b.authorId}/notify-low-stock\`, { bookId: id, title: b.title }, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } });
      } catch (e) { }
    };
`;

code = before + fixedMiddle + after;
// Properly close React.memo without truncating things
code = code.replace(/\s*};\s*$/, '\n});');

fs.writeFileSync('src/app/components/AdminOverviewTab.tsx', code, 'utf8');
console.log('Fixed AdminOverviewTab.tsx generation!');
