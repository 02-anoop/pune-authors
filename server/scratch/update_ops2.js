const fs = require('fs');

let c = fs.readFileSync('src/app/components/OperationsDashboardPage.tsx', 'utf-8');

// 1. Add import EventExcelManager
if (!c.includes('import EventExcelManager')) {
  c = c.replace('import FocusTrap from "focus-trap-react";', 'import FocusTrap from "focus-trap-react";\nimport EventExcelManager from "./EventExcelManager";');
}

// 2. Hide old modal tables and show EventExcelManager
if (!c.includes('<EventExcelManager eventBreakdown')) {
  c = c.replace(
    '          {selectedAuthorForData ? (',
    '          <EventExcelManager eventBreakdown={selectedEventBreakdown} registrations={eventRegistrations} onRefresh={() => fetchEventRegistrations(selectedEventBreakdown.id)} API={API} />\n          <div style={{ display: "none" }}>\n          {selectedAuthorForData ? ('
  );
  
  // Close the hidden div before `const now = new Date();`
  c = c.replace(
    '        </div>\n      );\n    const now = new Date();',
    '        </div>\n        </div>\n      );\n    const now = new Date();'
  );
}

// 3. Update main Event Registry Table styling (yellow headers, bg colors)
const tableStartStr = '<div className="border border-gray-200 rounded-xl overflow-x-auto shadow-sm">';

if (c.includes(tableStartStr)) {
  const startIndex = c.indexOf(tableStartStr);
  let endIndex = c.indexOf('</table>', startIndex);
  endIndex = c.indexOf('</div>', endIndex) + 6; // Includes </div>
  
  const tableHtml = `
<div className="border-2 border-black overflow-x-auto shadow-sm">
  <table className="w-full min-w-[1100px] border-collapse text-[11px] font-sans">
    <thead className="bg-[#00ffff] border-2 border-black">
      <tr>
        <th colSpan={12} className="border border-black p-2 text-center text-[13px] font-bold uppercase tracking-wider text-black">
          LIST OF LITERARY EVENT/STALL ORGANISED AND PARTICIPATION IN BOOK FAIR, SINCE INCEPTION OF THIS GROUP
        </th>
      </tr>
      <tr className="bg-[#ffff00] text-black font-bold">
        <th className="border border-black p-1 text-center">S.No</th>
        <th className="border border-black p-1 text-center">Society/Institution Name</th>
        <th className="border border-black p-1 text-center">Format</th>
        <th className="border border-black p-1 text-center">Category</th>
        <th className="border border-black p-1 text-center">Address</th>
        <th className="border border-black p-1 text-center">Month<br/>Organised</th>
        <th className="border border-black p-1 text-center">Year</th>
        <th className="border border-black p-1 text-center">Duration of<br/>Event</th>
        <th className="border border-black p-1 text-center">No of Authors<br/>Participated</th>
        <th className="border border-black p-1 text-center">No of Books<br/>Sold</th>
        <th className="border border-black p-1 text-center">Year<br/>Wise</th>
        <th className="border border-black p-1 text-center w-24">Actions</th>
      </tr>
    </thead>
    <tbody>
      {(() => {
        let globalIndex = 1;
        let rows: any[] = [];
        
        // Ensure years are sorted properly just in case
        years.forEach(year => {
          const yearEvents = eventsByYear[year];
          if(!yearEvents) return;
          const yearTotalBooks = yearEvents.reduce((sum: number, evt: any) => sum + ((evt.aggSold != null ? evt.aggSold : evt.isLegacy ? 0 : (evt.eventBooks?.reduce((s: number, eb: any) => s + (eb.soldStock || 0), 0) || 0) + (evt.livePosSold || 0))), 0);
          yearEvents.forEach((evt: any, i: number) => {
            const isFirstInYear = i === 0;
            let mnt = "Unknown";
            if (evt.date || evt.startDate) {
              const d = new Date(evt.date || evt.startDate);
              mnt = d.toLocaleString('default', { month: 'short' }) + '-' + d.getDate();
            }
            
            const fmtColor = evt.eventType === 'Stall' ? 'bg-[#99ff99]' : 'bg-[#a6c8ff]';
            const catColor = evt.category === 'Housing Society' ? 'bg-[#ffcc99]' : evt.category === 'Book Fair' ? 'bg-[#99ff99]' : evt.category === 'Corporate Office' ? 'bg-[#ffff99]' : evt.category === 'College' ? 'bg-[#a6c8ff]' : 'bg-[#ffcc00]';
            const booksSold = evt.aggSold != null ? evt.aggSold : evt.isLegacy ? 'NA' : (evt.eventBooks?.reduce((s: number, eb: any) => s + (eb.soldStock || 0), 0) || 0) + (evt.livePosSold || 0);
            const authorsPart = evt.aggAuthors != null ? evt.aggAuthors : evt.isLegacy ? 'NA' : evt._count?.eventAuthors || 0;
            
            rows.push(
              <React.Fragment key={evt.id}>
                <tr className="hover:brightness-95 transition-all bg-white text-black text-center">
                  <td className="border border-black p-1">{globalIndex++}</td>
                  <td className="border border-black p-1 text-left font-semibold">{evt.name}</td>
                  <td className={\`border border-black p-1 \${fmtColor}\`}>{evt.eventType}</td>
                  <td className={\`border border-black p-1 \${catColor}\`}>{evt.category}</td>
                  <td className="border border-black p-1 text-left">{evt.location || "Pune"}</td>
                  <td className="border border-black p-1">{mnt}</td>
                  <td className="border border-black p-1 bg-[#00ffff] font-bold">{year}</td>
                  <td className="border border-black p-1">{evt.duration || (evt.durationDays ? \`\${evt.durationDays} Days\` : 'N/A')}</td>
                  <td className="border border-black p-1">{authorsPart}</td>
                  <td className="border border-black p-1">{booksSold}</td>
                  {isFirstInYear && <td rowSpan={yearEvents.length} className="border border-black p-1 bg-[#8faadc] font-bold text-center align-middle">{yearTotalBooks}</td>}
                  <td className="border border-black p-1 bg-white">
                    <div className="flex flex-col gap-1">
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedEventBreakdown(evt); setIsBreakdownModalOpen(true); }} className="bg-indigo-600 text-white text-[9px] px-2 py-1 font-bold rounded shadow-sm hover:bg-indigo-700 w-full">Manage Data</button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingEvent(evt); setTimeout(() => setIsEditEventModalOpen(true), 10); }} className="bg-emerald-600 text-white text-[9px] px-2 py-1 font-bold rounded shadow-sm hover:bg-emerald-700 w-full">Edit Event</button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteEventClick(evt.id); }} className="bg-red-600 text-white text-[9px] px-2 py-1 font-bold rounded shadow-sm hover:bg-red-700 w-full">Delete</button>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            );
          });
        });
        
        if (filteredTableEvents.length === 0) {
          rows.push(
            <tr key="empty">
              <td colSpan={12} className="border border-black p-4 text-center text-gray-500 italic">No events found.</td>
            </tr>
          );
        }
        
        return rows;
      })()}
    </tbody>
  </table>
</div>`;

  c = c.substring(0, startIndex) + tableHtml + c.substring(endIndex);
}

fs.writeFileSync('src/app/components/OperationsDashboardPage.tsx', c);
console.log('Update successful');
