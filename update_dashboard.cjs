const fs = require('fs');

let content = fs.readFileSync('src/app/components/OperationsDashboardPage.tsx', 'utf8');

const overviewStart = content.indexOf('  const OverviewTab = ({ refreshTrigger }: { refreshTrigger: number }) => {');
const overviewEnd = content.indexOf('  const SalesReportTab = React.useMemo(() => {');

if (overviewStart !== -1 && overviewEnd !== -1) {
    let newContent = content.substring(0, overviewStart) + content.substring(overviewEnd);
    
    // Add import
    const importStatement = "import { AdminOverviewTab } from './AdminOverviewTab';\n";
    const reactImportIdx = newContent.indexOf('import React');
    const insertIdx = newContent.indexOf('\n', reactImportIdx) + 1;
    newContent = newContent.substring(0, insertIdx) + importStatement + newContent.substring(insertIdx);
    
    // Replace usage
    const usageTarget = '<OverviewTab refreshTrigger={lastRefreshTime} />';
    const usageReplacement = '<AdminOverviewTab refreshTrigger={lastRefreshTime} books={books} authors={authors} orders={orders} events={events} stats={stats} prevQueries={prevCountsRef.current?.queries || 0} API={API} setActiveTab={setActiveTab} setAuthorStatusFilter={setAuthorStatusFilter} />';
    
    newContent = newContent.replace(usageTarget, usageReplacement);
    
    fs.writeFileSync('src/app/components/OperationsDashboardPage.tsx', newContent, 'utf8');
    console.log('Successfully removed OverviewTab and updated imports/usage.');
} else {
    console.log('Failed to find markers.');
}
