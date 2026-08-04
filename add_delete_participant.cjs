const fs = require('fs');

try {
  let api = fs.readFileSync('server/routes/api.js', 'utf8');

  const approveEndpointMarker = "router.post('/api/admin/events/:eventId/author/:authorId/approve'";
  const deleteEndpoint = `router.delete('/api/admin/events/:eventId/author/:authorId', verifyToken, isAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const authorId = parseInt(req.params.authorId);
    
    await prisma.eventBook.deleteMany({
      where: { eventId, authorId }
    });
    
    await prisma.eventAuthor.deleteMany({
      where: { eventId, authorId }
    });
    
    invalidateCache('admin:dashboard-stats');
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
});

`;

  if (!api.includes("router.delete('/api/admin/events/:eventId/author/:authorId'")) {
    api = api.replace(approveEndpointMarker, deleteEndpoint + approveEndpointMarker);
    fs.writeFileSync('server/routes/api.js', api);
    console.log('Added DELETE participant endpoint to api.js');
  }

  let mgr = fs.readFileSync('src/app/components/EventExcelManager.tsx', 'utf8');

  // 1. Add Trash icon import
  mgr = mgr.replace(
    'import { CheckCircle, XCircle, Edit, Save, X } from "lucide-react";',
    'import { CheckCircle, XCircle, Edit, Save, X, Trash } from "lucide-react";'
  );

  // 2. Add handleDeleteParticipant function
  if (!mgr.includes("handleDeleteParticipant")) {
    mgr = mgr.replace(
      'const handleAddParticipant = async () => {',
      `const handleDeleteParticipant = async (authorId: string) => {
    if (!confirm("Are you sure you want to remove this participant?")) return;
    try {
      await axios.delete(\`\${API}/api/admin/events/\${eventBreakdown.id}/author/\${authorId}\`, {
        headers: { Authorization: \`Bearer \${localStorage.getItem("token")}\` }
      });
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to remove participant");
    }
  };

  const handleAddParticipant = async () => {`
    );
  }

  // 3. Replace N/A with a Delete button
  mgr = mgr.replace(
    '<span className="text-[9px] uppercase font-bold text-gray-400">N/A</span>',
    `<button 
                          onClick={() => handleDeleteParticipant(author.authorId)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm transition-colors flex items-center gap-1 mx-auto"
                        >
                          <Trash size={12} /> Remove
                        </button>`
  );

  // 4. Add Delete button next to Edit
  mgr = mgr.replace(
    '<Edit size={12} /> Edit\n                            </button>\n                          )}',
    `<Edit size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteParticipant(author.authorId)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 mt-1 rounded text-[10px] font-bold shadow-sm transition-colors flex items-center gap-1 mx-auto"
                            >
                              <Trash size={12} /> Remove
                            </button>
                          </div>)}`
  );
  
  // Fix the div structure that was broken in step 4 replace
  mgr = mgr.replace(
    '</div>)}',
    ')}</div>'
  );

  // Wait, I replaced `</button>\n                          )}` but there wasn't an opening <div> around the Edit button.
  // The original structure was just `<button ...> Edit </button>`. Let's fix this.
  
  // Let me re-read the file to ensure correct replacement.
  mgr = fs.readFileSync('src/app/components/EventExcelManager.tsx', 'utf8');

  mgr = mgr.replace(
    'import { CheckCircle, XCircle, Edit, Save, X } from "lucide-react";',
    'import { CheckCircle, XCircle, Edit, Save, X, Trash } from "lucide-react";'
  );

  if (!mgr.includes("handleDeleteParticipant")) {
    mgr = mgr.replace(
      'const handleAddParticipant = async () => {',
      `const handleDeleteParticipant = async (authorId: string) => {
    if (!confirm("Are you sure you want to remove this participant?")) return;
    try {
      await axios.delete(\`\${API}/api/admin/events/\${eventBreakdown.id}/author/\${authorId}\`, {
        headers: { Authorization: \`Bearer \${localStorage.getItem("token")}\` }
      });
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to remove participant");
    }
  };

  const handleAddParticipant = async () => {`
    );
  }

  mgr = mgr.replace(
    '<span className="text-[9px] uppercase font-bold text-gray-400">N/A</span>',
    `<button 
                          onClick={() => handleDeleteParticipant(author.authorId)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm transition-colors flex items-center gap-1 mx-auto"
                        >
                          <Trash size={12} /> Remove
                        </button>`
  );

  // Fix the "with books" action column
  mgr = mgr.replace(
    '<button\n                              onClick={() => setEditingAuthorId(author.authorId)}\n                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm transition-colors flex items-center gap-1 mx-auto"\n                            >\n                              <Edit size={12} /> Edit\n                            </button>',
    `<div className="flex flex-col gap-1 items-center">
                              <button
                                onClick={() => setEditingAuthorId(author.authorId)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm transition-colors flex items-center gap-1 w-full justify-center"
                              >
                                <Edit size={12} /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteParticipant(author.authorId)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm transition-colors flex items-center gap-1 w-full justify-center"
                              >
                                <Trash size={12} /> Remove
                              </button>
                            </div>`
  );

  fs.writeFileSync('src/app/components/EventExcelManager.tsx', mgr);
  console.log('EventExcelManager.tsx updated.');

} catch (e) {
  console.error(e);
}
