const fs = require('fs');
const file = 'src/app/components/OperationsDashboardPage.tsx';

try {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Text Replacements
  content = content.replace(/Events & Fairs Ecosystem/g, 'Event and Fairs');
  content = content.replace(/Events Registry/g, 'Event and Fairs History');
  
  // 2. Default graph filter
  content = content.replace('const [eventTimeFilter, setEventTimeFilter] = useState("All");', 'const [eventTimeFilter, setEventTimeFilter] = useState(new Date().getFullYear().toString());');
  content = content.replace('<option value="All">All Time</option>', '');

  // 3. Remove toggle buttons block
  const togglesStart = content.indexOf('<div className="hidden lg:flex flex-wrap bg-white rounded-lg p-1 border border-paa-navy/10 shadow-sm self-start gap-1">');
  if (togglesStart > -1) {
    // Find the end of this block
    const nextDiv = content.indexOf('<div className="mt-2 border border-paa-navy/5', togglesStart);
    if (nextDiv > -1) {
      content = content.substring(0, togglesStart) + content.substring(nextDiv);
    }
  }

  // 4. Remove KPI Cards
  const kpiStart = content.indexOf('{/* KPI Cards */}');
  if (kpiStart > -1) {
    const kpiEnd = content.indexOf('{selectedAuthorForData ? (', kpiStart);
    if (kpiEnd > -1) {
      content = content.substring(0, kpiStart) + content.substring(kpiEnd);
    }
  }

  fs.writeFileSync(file, content);
  console.log('SUCCESS');
} catch (e) {
  console.error('ERROR', e);
}
