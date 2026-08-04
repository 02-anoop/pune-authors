const fs = require('fs');

try {
  let mgr = fs.readFileSync('src/app/components/EventExcelManager.tsx', 'utf8');

  // 1. Add amountPaid to author state update logic (create a handler)
  mgr = mgr.replace(
    'const handleMrpChange = (authorId: string, bIdx: number, val: string) => {',
    `const handleAmountPaidChange = (authorId: string, val: string) => {
    setAuthors(authors.map(a => {
      if (a.authorId === authorId) {
        return { ...a, amountPaid: val };
      }
      return a;
    }));
  };

  const handleMrpChange = (authorId: string, bIdx: number, val: string) => {`
  );

  // 2. Make amountPaid editable for AUTHORS WITH BOOKS
  mgr = mgr.replace(
    '{author.amountPaid ? `₹${author.amountPaid}` : "NA"}',
    `{isEditing ? (
                            <input
                              type="number"
                              className="w-full h-full p-1 bg-transparent border-none text-center outline-none font-bold text-black"
                              value={author.amountPaid || ""}
                              onChange={(e) => handleAmountPaidChange(author.authorId, e.target.value)}
                              placeholder="0"
                            />
                          ) : (
                            author.amountPaid ? \`₹\${author.amountPaid}\` : "NA"
                          )}`
  );

  // 3. Make amountPaid editable for AUTHORS WITHOUT BOOKS
  // First, find the "No books listed by author" cell and the action buttons for it.
  mgr = mgr.replace(
    `<td className="border-[1.5px] border-black text-gray-400 italic p-1 px-2 text-center" colSpan={3}>\n                        No books listed by author\n                      </td>`,
    `<td className="border-[1.5px] border-black text-gray-400 italic p-1 px-2 text-center">
                        No books listed
                      </td>
                      <td className="border-[1.5px] border-black bg-green-400 text-black font-bold text-center p-1">
                          {isEditing ? (
                            <input
                              type="number"
                              className="w-full h-full p-1 bg-transparent border-none text-center outline-none font-bold text-black"
                              value={author.amountPaid || ""}
                              onChange={(e) => handleAmountPaidChange(author.authorId, e.target.value)}
                              placeholder="0"
                            />
                          ) : (
                            author.amountPaid ? \`₹\${author.amountPaid}\` : "NA"
                          )}
                      </td>
                      <td className="border-[1.5px] border-black text-gray-400 italic p-1 px-2 text-center">
                        N/A
                      </td>`
  );
  
  // Also add the Edit button for authors without books
  mgr = mgr.replace(
    `<button \n                          onClick={() => handleDeleteParticipant(author.authorId)}\n                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm transition-colors flex items-center gap-1 mx-auto"\n                        >\n                          <Trash size={12} /> Remove\n                        </button>`,
    `{isEditing ? (
                            <div className="flex flex-col gap-1 px-1">
                              <button 
                                onClick={() => saveAuthorData(author.authorId)}
                                disabled={isSaving}
                                className="bg-emerald-600 text-white flex items-center justify-center gap-1 py-1 px-2 rounded shadow text-[9px] font-bold hover:bg-emerald-700 disabled:opacity-50 w-full"
                              >
                                <Save className="w-3 h-3" /> Save
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingAuthorId(null);
                                  onRefresh();
                                }}
                                disabled={isSaving}
                                className="bg-red-500 text-white flex items-center justify-center gap-1 py-1 px-2 rounded shadow text-[9px] font-bold hover:bg-red-600 disabled:opacity-50 w-full"
                              >
                                <X className="w-3 h-3" /> Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 w-full">
                              <button 
                                onClick={() => setEditingAuthorId(author.authorId)}
                                className="bg-indigo-600 text-white flex items-center justify-center gap-1 py-1.5 px-3 rounded shadow text-[10px] font-bold hover:bg-indigo-700 w-full"
                              >
                                <Edit className="w-3 h-3" /> Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteParticipant(author.authorId)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm transition-colors flex items-center gap-1 w-full justify-center"
                              >
                                <Trash size={12} /> Remove
                              </button>
                              {(author.optInStatus === "Pending Approval" || author.optInStatus === "Pending") && (
                                <div className="flex gap-1 mt-1 w-full">
                                  <button onClick={() => handleApprove(author.authorId)} className="bg-green-600 text-white w-full py-1 text-[9px] font-bold rounded hover:bg-green-700">✓</button>
                                  <button onClick={() => handleReject(author.authorId)} className="bg-red-600 text-white w-full py-1 text-[9px] font-bold rounded hover:bg-red-700">✗</button>
                                </div>
                              )}
                            </div>
                          )}`
  );

  // 4. Also add amountPaid to the saveAuthorData single-save payload
  mgr = mgr.replace(
    'optInStatus: author.optInStatus || "Registered"',
    'optInStatus: author.optInStatus || "Registered",\n        amountPaid: author.amountPaid || null'
  );

  // Add amountPaid to saveAllAuthorsData payload
  mgr = mgr.replace(
    'manualTotalRevenue: null',
    'manualTotalRevenue: null,\n          amountPaid: author.amountPaid || null'
  );

  // 5. Change Global Overrides bg color to bg-gray-100
  mgr = mgr.replace(
    'className="bg-[#FFE600] border-t-[1.5px] border-black p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"',
    'className="bg-gray-100 border-t-[1.5px] border-black p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"'
  );

  fs.writeFileSync('src/app/components/EventExcelManager.tsx', mgr);
  console.log('Done rewriting EventExcelManager.tsx');
} catch (e) {
  console.error(e);
}
