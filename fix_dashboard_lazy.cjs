const fs = require('fs');

let content = fs.readFileSync('src/app/components/OperationsDashboardPage.tsx', 'utf8');

// 1. Convert static import to lazy import
content = content.replace(
    "import { AdminOverviewTab } from './AdminOverviewTab';",
    "const AdminOverviewTab = React.lazy(() => import('./AdminOverviewTab').then(m => ({ default: m.AdminOverviewTab })));"
);

// 2. Wrap AdminOverviewTab with Suspense
const targetUsage = '<AdminOverviewTab refreshTrigger={lastRefreshTime} books={books} authors={authors} orders={orders} events={events} stats={stats} prevQueries={prevCountsRef.current?.queries || 0} API={API} setActiveTab={setActiveTab} setAuthorStatusFilter={setAuthorStatusFilter} />';
const replacementUsage = `<React.Suspense fallback={<div className="p-8 text-center text-gray-500 animate-pulse font-medium">Loading Dashboard Overview...</div>}>
                    ${targetUsage}
                  </React.Suspense>`;
content = content.replace(targetUsage, replacementUsage);

// 3. Add loading="lazy" to images that don't have it
content = content.replace(/<img(?![^>]*loading=)/g, '<img loading="lazy"');

// 4. Add width/height to logo if possible
content = content.replace(
    '<img loading="lazy" src="/logo.webp" alt="PAA Logo" className="h-6 w-auto object-contain md:hidden mr-1"',
    '<img loading="lazy" src="/logo.webp" alt="PAA Logo" width="100" height="24" className="h-6 w-auto object-contain md:hidden mr-1"'
);

fs.writeFileSync('src/app/components/OperationsDashboardPage.tsx', content, 'utf8');
console.log('Successfully lazy loaded AdminOverviewTab and optimized images.');
