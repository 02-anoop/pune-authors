const fs = require('fs');
let content = fs.readFileSync('src/app/components/OperationsDashboardPage.tsx', 'utf8');

// 1. Extract allCombinedEvents
const allCombinedEventsSource = `    const allCombinedEvents = events
      .map((e: any) => ({ ...e, isLegacy: e.status === "Legacy Archive" }))
      .sort((a: any, b: any) => {
        if (a.status === "Pending Approval" && b.status !== "Pending Approval")
          return -1;
        if (b.status === "Pending Approval" && a.status !== "Pending Approval")
          return 1;
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
      });`;
content = content.replace(allCombinedEventsSource, '');

// 2. Extract KPI calculations
const kpiSourceStart = 'const totalAuthorsBase = eventRegistrations.length;';
const kpiSourceEnd = '});\n      }';
const kpiIdxStart = content.indexOf(kpiSourceStart);
const kpiIdxEnd = content.indexOf(kpiSourceEnd, kpiIdxStart) + kpiSourceEnd.length;
const kpiSource = content.substring(kpiIdxStart, kpiIdxEnd);

content = content.replace(kpiSource, `      const {
        totalAuthorsBase = 0, totalListedBase = 0, totalSoldBase = 0, totalSaleBase = 0, totalTitlesBase = 0,
        pubAuthors = 0, pubListed = 0, pubSold = 0, pubSale = 0, pubTitles = 0,
        totalPaymentsBase = 0, maxSold = -1, bestSellingBook = "-"
      } = eventBreakdownKPIs || {};`);

// 3. Insert useMemos before renderEventsTab
const insertPos = content.indexOf('  const renderEventsTab = () => {');
const hooksToInsert = `  const allCombinedEvents = React.useMemo(() => {
    return events
      .map((e: any) => ({ ...e, isLegacy: e.status === "Legacy Archive" }))
      .sort((a: any, b: any) => {
        if (a.status === "Pending Approval" && b.status !== "Pending Approval")
          return -1;
        if (b.status === "Pending Approval" && a.status !== "Pending Approval")
          return 1;
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
      });
  }, [events]);

  const eventBreakdownKPIs = React.useMemo(() => {
    if (!selectedEventBreakdown) return null;
    
${kpiSource}

    return {
      totalAuthorsBase, totalListedBase, totalSoldBase, totalSaleBase, totalTitlesBase,
      pubAuthors, pubListed, pubSold, pubSale, pubTitles,
      totalPaymentsBase, maxSold, bestSellingBook
    };
  }, [selectedEventBreakdown, eventRegistrations]);

`;

content = content.substring(0, insertPos) + hooksToInsert + content.substring(insertPos);

fs.writeFileSync('src/app/components/OperationsDashboardPage.tsx', content, 'utf8');
console.log('Optimizations applied successfully!');
