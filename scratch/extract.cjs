const fs = require('fs');
const lines = fs.readFileSync('c:/Users/arvin/Desktop/pune-authors-app/src/app/components/OperationsDashboardPage.tsx', 'utf8').split(/\r?\n/);
const tabLines = lines.slice(2088, 2548);
fs.writeFileSync('c:/Users/arvin/Desktop/pune-authors-app/scratch/authors_tab.tsx', tabLines.join('\n'));
console.log('Done extracting ' + tabLines.length + ' lines.');
