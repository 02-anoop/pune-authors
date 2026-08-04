const fs = require('fs');

try {
  let mgr = fs.readFileSync('src/app/components/EventExcelManager.tsx', 'utf8');

  // Add isLoading prop
  mgr = mgr.replace(
    'API: string;\n}) {',
    'API: string;\n  isLoading?: boolean;\n}) {'
  );

  // Add Revenue TH
  mgr = mgr.replace(
    '<th rowSpan={2} className="border-[1.5px] border-black bg-[#FFE600] p-1 w-20">Total<br/>Number of<br/>Books Sold</th>',
    '<th rowSpan={2} className="border-[1.5px] border-black bg-[#FFE600] p-1 w-20">Total<br/>Number of<br/>Books Sold</th>\n              <th rowSpan={2} className="border-[1.5px] border-black bg-[#FFE600] p-1 w-20">Revenue</th>'
  );

  // Add Revenue TD
  mgr = mgr.replace(
    '<td className="border-[1.5px] border-black bg-white text-black text-center font-bold p-1">\n                        {book.soldStock}\n                      </td>',
    '<td className="border-[1.5px] border-black bg-white text-black text-center font-bold p-1">\n                        {book.soldStock}\n                      </td>\n                      <td className="border-[1.5px] border-black bg-[#e6f4ea] text-black text-center font-bold p-1">\n                        ₹{(book.soldStock || 0) * mrp}\n                      </td>'
  );
  
  // Add another replacement for the empty td when no books
  mgr = mgr.replace(
    '<td className="border-[1.5px] border-black text-gray-400 p-1" colSpan={3 + dayColumns.length}></td>',
    '<td className="border-[1.5px] border-black text-gray-400 p-1" colSpan={4 + dayColumns.length}></td>'
  );
  
  // Also adjust colSpan for No authors registered
  mgr = mgr.replace(
    '<td colSpan={11 + dayColumns.length} className="p-4 text-center text-gray-500 italic border-[1.5px] border-black">',
    '<td colSpan={12 + dayColumns.length} className="p-4 text-center text-gray-500 italic border-[1.5px] border-black">'
  );

  // Add skeleton loader
  mgr = mgr.replace(
    '{authors.length === 0 ? (',
    '{isLoading ? (\n              <tr>\n                <td colSpan={12 + dayColumns.length} className="p-4 border-[1.5px] border-black bg-white">\n                  <div className="flex flex-col gap-3">\n                    {[1, 2, 3, 4, 5].map(i => (\n                      <div key={i} className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>\n                    ))}\n                  </div>\n                </td>\n              </tr>\n            ) : authors.length === 0 ? ('
  );

  fs.writeFileSync('src/app/components/EventExcelManager.tsx', mgr);
  console.log('EventExcelManager updated.');

  let dash = fs.readFileSync('src/app/components/OperationsDashboardPage.tsx', 'utf8');

  // Pass isLoading
  dash = dash.replace(
    'API={import.meta.env.VITE_API_URL || "http://localhost:3001"}\n              />',
    'API={import.meta.env.VITE_API_URL || "http://localhost:3001"}\n                 isLoading={isRefreshing}\n              />'
  );
  
  // Update revenue calculations (handle variations of parseFloat(eb.book?.mrp))
  dash = dash.replace(
    /parseFloat\(eb\.book\?\.mrp\)/g,
    '(parseFloat(eb.overrideMrp) || parseFloat(eb.mrp) || parseFloat(eb.book?.mrp))'
  );

  fs.writeFileSync('src/app/components/OperationsDashboardPage.tsx', dash);
  console.log('OperationsDashboardPage updated.');

} catch (e) {
  console.error(e);
}
