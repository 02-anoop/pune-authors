const { execSync } = require('child_process');
const fs = require('fs');
const file = 'src/app/components/OperationsDashboardPage.tsx';

try {
  // Get original file from HEAD
  let content = execSync('git show HEAD:' + file, { encoding: 'utf8' });
  
  // 1. Remove notifyAllAuthors append
  content = content.replace(/fd\.append\(\s*"notifyAllAuthors"[\s\S]*?\);\n/, '');
  
  // 2. Remove notifyAllAuthors checkbox block
  content = content.replace(/<div className="flex items-center gap-2 mt-4 p-4 bg-amber-50\/50[\s\S]*?<\/div>\n/, '');

  // 3. Remove PUBLISHED button logic
  const pStart = content.indexOf('{selectedEventBreakdown.broadcastStatus !== "Published" ? (');
  if (pStart > -1) {
    const pEnd = content.indexOf('<button\n                    onClick={handleDownloadEventReport}', pStart);
    if (pEnd > -1) {
      const lineStart = content.lastIndexOf('\n', pStart);
      content = content.substring(0, lineStart + 1) + content.substring(pEnd);
    }
  }

  // 4. Decouple eventTimeFilter from filteredTableEvents
  // USE lastIndexOf to target the second occurrence!
  const tStart = content.lastIndexOf('if (eventTimeFilter === "Last 15") {');
  if (tStart > -1) {
    const tEnd = content.indexOf('const eventsChartData = filteredTableEvents', tStart);
    if (tEnd > -1) {
      content = content.substring(0, tStart) + content.substring(tEnd);
    }
  }

  fs.writeFileSync(file, content);
  console.log('SUCCESS');
} catch (e) {
  console.error('ERROR', e);
}
