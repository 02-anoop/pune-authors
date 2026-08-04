const fs = require('fs');

try {
  let mgr = fs.readFileSync('src/app/components/EventExcelManager.tsx', 'utf8');

  // 1. Add platformAuthors to props
  mgr = mgr.replace(
    'isLoading?: boolean;\n}) {',
    'isLoading?: boolean;\n  platformAuthors?: any[];\n}) {'
  );

  // 2. Add states for Add Participant and Globals
  mgr = mgr.replace(
    'const [isSaving, setIsSaving] = useState(false);',
    `const [isSaving, setIsSaving] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState("");
  const [globalSold, setGlobalSold] = useState(eventBreakdown.aggSold || "");
  const [globalRevenue, setGlobalRevenue] = useState(eventBreakdown.aggRevenue || "");
  const [globalAuthors, setGlobalAuthors] = useState(eventBreakdown.aggAuthors || "");
  const [isSavingGlobals, setIsSavingGlobals] = useState(false);
  
  useEffect(() => {
    setGlobalSold(eventBreakdown.aggSold || "");
    setGlobalRevenue(eventBreakdown.aggRevenue || "");
    setGlobalAuthors(eventBreakdown.aggAuthors || "");
  }, [eventBreakdown]);
  
  const handleAddParticipant = async () => {
    if (!selectedAuthorId) return;
    setIsSaving(true);
    try {
      const payload = {
        eventId: eventBreakdown.id,
        authorId: selectedAuthorId,
        books: [],
        optInStatus: "Registered",
        manualTotalSold: null,
        manualTotalRevenue: null
      };
      await axios.post(\`\${API}/api/admin/events/registration\`, payload, {
        headers: { Authorization: \`Bearer \${localStorage.getItem("token")}\` }
      });
      alert("Participant added successfully");
      setShowAddParticipant(false);
      setSelectedAuthorId("");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to add participant");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGlobals = async () => {
    setIsSavingGlobals(true);
    try {
      const fd = new FormData();
      if (globalSold !== "") fd.append("aggSold", globalSold);
      if (globalRevenue !== "") fd.append("aggRevenue", globalRevenue);
      if (globalAuthors !== "") fd.append("aggAuthors", globalAuthors);
      
      await axios.put(\`\${API}/api/admin/events/\${eventBreakdown.id}\`, fd, {
        headers: { Authorization: \`Bearer \${localStorage.getItem("token")}\` }
      });
      alert("Global overrides saved successfully");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to save global overrides");
    } finally {
      setIsSavingGlobals(false);
    }
  };`
  );

  // 3. Update Header UI for Add Participant
  mgr = mgr.replace(
    '<button \n          onClick={saveAllAuthorsData}',
    `<div className="flex gap-2 items-center">
          {showAddParticipant ? (
            <div className="flex gap-1 items-center bg-white p-1 rounded border-[1.5px] border-black">
              <select 
                className="text-xs p-1 outline-none font-normal" 
                value={selectedAuthorId} 
                onChange={(e) => setSelectedAuthorId(e.target.value)}
              >
                <option value="">Select Author...</option>
                {platformAuthors?.filter((a: any) => !authors.find(reg => reg.authorId === a.id)).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name} {a.penName ? \`(\${a.penName})\` : ''}</option>
                ))}
              </select>
              <button onClick={handleAddParticipant} className="bg-green-500 text-black font-bold px-3 py-1 text-xs border-[1.5px] border-black hover:bg-green-400">ADD</button>
              <button onClick={() => setShowAddParticipant(false)} className="bg-red-500 text-white font-bold px-3 py-1 text-xs border-[1.5px] border-black hover:bg-red-600">X</button>
            </div>
          ) : (
            <button onClick={() => setShowAddParticipant(true)} className="bg-white text-black px-4 py-1.5 text-xs font-bold uppercase tracking-widest border-[1.5px] border-black hover:bg-gray-100">
              + ADD PARTICIPANT
            </button>
          )}
          <button 
            onClick={saveAllAuthorsData}`
  );

  // Add closing div for the flex container we just started around the buttons
  mgr = mgr.replace(
    '{isSaving ? "SAVING..." : "SAVE ALL CHANGES"}\n        </button>\n      </div>',
    '{isSaving ? "SAVING..." : "SAVE ALL CHANGES"}\n          </button>\n        </div>\n      </div>'
  );

  // 4. Add Global Overrides UI at the bottom of the table
  mgr = mgr.replace(
    '</tbody>\n        </table>\n      </div>\n    </div>\n  );\n}',
    `</tbody>
        </table>
      </div>
      
      {/* GLOBAL OVERRIDES */}
      <div className="bg-[#FFE600] border-t-[1.5px] border-black p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-black text-[13px] uppercase tracking-widest m-0">Global Overrides</h3>
          <p className="text-[10px] font-bold text-gray-800 m-0 mt-0.5">For events without individual breakdown (Overrides computed totals).</p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col">
            <label className="text-[10px] font-black uppercase text-black mb-1">Total Authors</label>
            <input type="number" value={globalAuthors} onChange={e => setGlobalAuthors(e.target.value)} className="border-[1.5px] border-black p-1.5 text-xs w-24 outline-none font-bold text-center" placeholder="Auto" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-black uppercase text-black mb-1">Total Books Sold</label>
            <input type="number" value={globalSold} onChange={e => setGlobalSold(e.target.value)} className="border-[1.5px] border-black p-1.5 text-xs w-24 outline-none font-bold text-center" placeholder="Auto" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-black uppercase text-black mb-1">Total Revenue (₹)</label>
            <input type="number" value={globalRevenue} onChange={e => setGlobalRevenue(e.target.value)} className="border-[1.5px] border-black p-1.5 text-xs w-28 outline-none font-bold text-center" placeholder="Auto" />
          </div>
          <button onClick={handleSaveGlobals} disabled={isSavingGlobals} className="bg-black text-white px-4 py-1.5 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 border-[1.5px] border-black h-[33px]">
            {isSavingGlobals ? "SAVING..." : "SAVE GLOBALS"}
          </button>
        </div>
      </div>
    </div>
  );
}`
  );

  fs.writeFileSync('src/app/components/EventExcelManager.tsx', mgr);
  console.log('EventExcelManager updated.');

  let dash = fs.readFileSync('src/app/components/OperationsDashboardPage.tsx', 'utf8');

  // Pass platformAuthors
  dash = dash.replace(
    'isLoading={isRefreshing}\n              />',
    'isLoading={isRefreshing}\n                 platformAuthors={authors}\n              />'
  );

  fs.writeFileSync('src/app/components/OperationsDashboardPage.tsx', dash);
  console.log('OperationsDashboardPage updated.');

} catch (e) {
  console.error(e);
}
