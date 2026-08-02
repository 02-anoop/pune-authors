const fs = require('fs');
const file = 'c:/Users/arvin/Desktop/pune-authors-app/src/app/components/OperationsDashboardPage.tsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split(/\r?\n/);

// Remove the inline SalesReportTab definition (lines 1621 to 2118 inclusive)
const startIdx = 1620;
const endIdx = 2117; // this is line 2118
lines.splice(startIdx, endIdx - startIdx + 1);

let newContent = lines.join('\n');

// Add import for SalesReportTabLazy
newContent = newContent.replace(
  "const AdminInvitationsTab = lazy(() => import('./AdminInvitationsTab').then(m => ({ default: m.AdminInvitationsTab })));",
  "const AdminInvitationsTab = lazy(() => import('./AdminInvitationsTab').then(m => ({ default: m.AdminInvitationsTab })));\nconst SalesReportTabLazy = lazy(() => import('./SalesReportTab').then(m => ({ default: m.SalesReportTab })));"
);

// Replace the JSX usage
newContent = newContent.replace(
  "{activeTab === 'sales_report' && <SalesReportTab refreshTrigger={lastRefreshTime} />}",
  "{activeTab === 'sales_report' && <Suspense fallback={<div className=\"p-10 text-center text-gray-500 font-medium animate-pulse\">Loading Sales Report...</div>}><SalesReportTabLazy refreshTrigger={lastRefreshTime} /></Suspense>}"
);

fs.writeFileSync(file, newContent);
console.log('done');
