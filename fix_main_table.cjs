const fs = require('fs');
const file = 'src/app/components/OperationsDashboardPage.tsx';

try {
  let content = fs.readFileSync(file, 'utf8');

  // Remove rounded-2xl
  content = content.replace(
    '<div className="mt-2 border border-paa-navy/5 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500">',
    '<div className="mt-2 border border-black overflow-hidden shadow-sm animate-in fade-in duration-500">'
  );

  // Remove dash-table
  content = content.replace(
    '<table className="dash-table w-full text-left text-[11px]">',
    '<table className="w-full text-left text-[11px] border-collapse border-[1.5px] border-black">'
  );

  // Fix thead background
  content = content.replace(
    '<thead className="bg-indigo-50 border-b-2 border-indigo-100">',
    '<thead className="border-b-[1.5px] border-black">'
  );

  // Fix tbody divide
  content = content.replace(
    '<tbody className="divide-y divide-paa-navy/5 bg-white text-[11px]">',
    '<tbody className="bg-white text-[11px]">'
  );

  fs.writeFileSync(file, content);
  console.log('SUCCESS');
} catch (e) {
  console.error('ERROR', e);
}
