import React, { useState, useEffect } from "react";
import axios from "axios";
import { CheckCircle, XCircle, Edit, Save, X } from "lucide-react";

export default function EventExcelManager({
  eventBreakdown,
  registrations,
  onRefresh,
  API
}: {
  eventBreakdown: any;
  registrations: any[];
  onRefresh: () => void;
  API: string;
}) {
  const [authors, setAuthors] = useState<any[]>([]);
  const [editingAuthorId, setEditingAuthorId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Generate date columns
  const durationMatch = eventBreakdown.duration ? String(eventBreakdown.duration).match(/(\d+)\s*(days?)/i) : null;
  const duration = durationMatch ? parseInt(durationMatch[1]) : (eventBreakdown.durationDays || 1);
  const startDate = new Date(eventBreakdown.date || eventBreakdown.startDate);
  const dayColumns = [];
  if (duration > 1) {
    for (let i = 0; i < duration; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dayColumns.push({
        label: `Day-${i + 1}`,
        dateStr: isNaN(d.getTime()) ? `Day ${i + 1}` : d.toDateString()
      });
    }
  }

  useEffect(() => {
    // Process registrations into a mutable state
    const processed = registrations.map(reg => {
      let books = reg.books && reg.books.length > 0 ? [...reg.books] : [];
      // Deep copy manualDailySales to allow editing
      books = books.map((b: any) => ({
        ...b,
        manualDailySales: b.manualDailySales ? JSON.parse(JSON.stringify(b.manualDailySales)) : {},
        actualSent: b.listedStock || 0
      }));

      return {
        ...reg,
        authorName: reg.author?.name || reg.name || "Unknown",
        books
      };
    });
    
    setAuthors(processed);
  }, [registrations]);

  const handleCellChange = (authorId: string, bookIdx: number, dateStr: string, value: string) => {
    setAuthors(prev => {
      const next = [...prev];
      const aIdx = next.findIndex(a => a.authorId === authorId);
      if (aIdx === -1) return prev;
      
      const author = { ...next[aIdx] };
      const book = { ...author.books[bookIdx] };
      
      const val = value ? parseInt(value) || 0 : undefined;
      const mrpToUse = parseFloat(book.overrideMrp) || parseFloat(book.mrp) || parseFloat(book.book?.mrp) || 0;
      
      book.manualDailySales = { ...book.manualDailySales };
      book.manualDailySales[dateStr] = { 
        ...(book.manualDailySales[dateStr] || {}), 
        sold: val, 
        revenue: val !== undefined ? val * mrpToUse : undefined 
      };

      // Recalculate total sold
      let bookTotalSold = 0;
      Object.values(book.manualDailySales).forEach((d: any) => {
        bookTotalSold += (d.sold || 0);
      });
      
      book.soldStock = bookTotalSold;
      author.books[bookIdx] = book;
      next[aIdx] = author;
      return next;
    });
  };

  const handleActualSentChange = (authorId: string, bookIdx: number, value: string) => {
    setAuthors(prev => {
      const next = [...prev];
      const aIdx = next.findIndex(a => a.authorId === authorId);
      if (aIdx === -1) return prev;
      const author = { ...next[aIdx] };
      author.books[bookIdx] = { ...author.books[bookIdx], actualSent: parseInt(value) || 0 };
      next[aIdx] = author;
      return next;
    });
  };
  const handleMrpChange = (authorId: string, bookIdx: number, value: string) => {
    setAuthors(prev => {
      const next = [...prev];
      const aIdx = next.findIndex(a => a.authorId === authorId);
      if (aIdx === -1) return prev;
      const author = { ...next[aIdx] };
      const book = { ...author.books[bookIdx] };
      
      const newMrp = value === "" ? "" : parseFloat(value);
      book.overrideMrp = newMrp;
      
      if (book.manualDailySales) {
        const mrpToUse = newMrp || parseFloat(book.mrp) || parseFloat(book.book?.mrp) || 0;
        book.manualDailySales = { ...book.manualDailySales };
        Object.keys(book.manualDailySales).forEach(dateStr => {
          if (book.manualDailySales[dateStr].sold !== undefined) {
            book.manualDailySales[dateStr].revenue = book.manualDailySales[dateStr].sold * mrpToUse;
          }
        });
      }
      
      author.books[bookIdx] = book;
      next[aIdx] = author;
      return next;
    });
  };

  const saveAuthorData = async (authorId: string) => {
    setIsSaving(true);
    try {
      const author = authors.find(a => a.authorId === authorId);
      if (!author) return;

      const payload = {
        eventId: eventBreakdown.id,
        authorId: authorId,
        books: author.books.map((b: any) => ({
          ...b,
          returnedStock: Math.max(0, (b.actualSent || 0) - (b.soldStock || 0))
        })),
        optInStatus: author.optInStatus || "Registered",
        manualTotalSold: null,
        manualTotalRevenue: null
      };
      
      await axios.post(`${API}/api/admin/events/registration`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      setEditingAuthorId(null);
      alert("Author data saved successfully");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to save author data");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async (authorId: string) => {
    try {
      await axios.post(`${API}/api/admin/events/${eventBreakdown.id}/author/${authorId}/approve`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      alert("Author approved successfully.");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to approve author.");
    }
  };

  const handleReject = async (authorId: string) => {
    const reason = prompt("Enter reason for rejection (optional):");
    if (reason === null) return; // cancelled
    try {
      await axios.post(`${API}/api/admin/events/${eventBreakdown.id}/author/${authorId}/reject`, { reason }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      alert("Author rejected successfully.");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to reject author.");
    }
  };

  const saveAllAuthorsData = async () => {
    setIsSaving(true);
    try {
      await Promise.all(authors.map(author => {
        const payload = {
          eventId: eventBreakdown.id,
          authorId: author.authorId,
          books: author.books.map((b: any) => ({
            ...b,
            returnedStock: Math.max(0, (b.actualSent || 0) - (b.soldStock || 0))
          })),
          optInStatus: author.optInStatus || "Registered",
          manualTotalSold: null,
          manualTotalRevenue: null
        };
        return axios.post(`${API}/api/admin/events/registration`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
      }));
      alert("All changes saved successfully");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col mt-8 border-[1.5px] border-black shadow-sm overflow-hidden bg-white">
      <div className="flex justify-between items-center bg-[#00D8F5] p-2 border-b-[1.5px] border-black font-bold">
        <h2 className="text-black uppercase text-[13px] m-0">
          LIST OF BOOKS FOR {eventBreakdown.name} ({startDate.toLocaleDateString()}) - {registrations.length} REGISTERED AUTHORS
        </h2>
        <button 
          onClick={saveAllAuthorsData}
          disabled={isSaving}
          className="bg-black text-white px-4 py-1.5 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50"
        >
          {isSaving ? "SAVING..." : "SAVE ALL CHANGES"}
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] font-sans border-collapse whitespace-nowrap">
          <thead>
            <tr>
              <th rowSpan={2} className="border-[1.5px] border-black bg-[#FFE600] p-1 w-10">S.No</th>
              <th rowSpan={2} className="border-[1.5px] border-black bg-[#FFE600] p-1 w-48 text-left px-2">Book Title</th>
              <th rowSpan={2} className="border-[1.5px] border-black bg-[#FFE600] p-1 w-20">Amount<br/>Paid</th>
              <th rowSpan={2} className="border-[1.5px] border-black bg-[#FFE600] p-1 w-16">MRP</th>
              <th rowSpan={2} className="border-[1.5px] border-black bg-[#FFE600] p-1 w-32 text-left px-2">Author Name</th>
              <th rowSpan={2} className="border-[1.5px] border-black bg-[#FFE600] p-1 w-24">Suggested<br/>Number of<br/>Copies</th>
              <th rowSpan={2} className="border-[1.5px] border-black bg-[#FFE600] p-1 w-24">Actual<br/>Number of<br/>Copies</th>
              {dayColumns.length > 0 && (
                <th colSpan={dayColumns.length} className="border-[1.5px] border-black bg-[#FFE600] p-1 text-center">
                  Sales Record
                </th>
              )}
              <th rowSpan={2} className="border-[1.5px] border-black bg-[#FFE600] p-1 w-20">Total<br/>Number of<br/>Books Sold</th>
              <th rowSpan={2} className="border-[1.5px] border-black bg-[#FFE600] p-1 w-24">Status</th>
              <th rowSpan={2} className="border-[1.5px] border-black bg-[#FFE600] p-1 w-24">Actions</th>
            </tr>
            {dayColumns.length > 0 && (
              <tr>
                {dayColumns.map(dc => (
                  <th key={dc.label} className="border-[1.5px] border-black bg-[#FFE600] p-1 w-16">{dc.label}</th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {authors.length === 0 ? (
              <tr>
                <td colSpan={11 + dayColumns.length} className="p-4 text-center text-gray-500 italic border-[1.5px] border-black">
                  No authors registered for this event.
                </td>
              </tr>
            ) : (
              authors.map((author, aIdx) => {
                const isEditing = editingAuthorId === author.authorId;
                
                if (!author.books || author.books.length === 0) {
                  return (
                    <tr key={author.authorId} className="hover:bg-gray-50 transition-all bg-gray-100/50">
                      <td className="border-[1.5px] border-black text-black font-bold text-center p-1">{aIdx + 1}</td>
                      <td className="border-[1.5px] border-black text-gray-400 italic p-1 px-2 text-center" colSpan={3}>
                        No books listed by author
                      </td>
                      <td className="border-[1.5px] border-black bg-[#00ffff] text-black font-bold p-1 px-2 truncate max-w-[150px]">
                        {author.authorName}
                      </td>
                      <td className="border-[1.5px] border-black text-gray-400 p-1" colSpan={3 + dayColumns.length}></td>
                      <td className="border-[1.5px] border-black bg-white text-center p-1 font-bold">
                        <span className={`px-2 py-0.5 text-[9px] rounded-full text-black whitespace-nowrap ${author.optInStatus === 'Pending Approval' ? 'bg-yellow-300' : author.optInStatus === 'Rejected' ? 'bg-red-300' : 'bg-green-300'}`}>
                          {author.optInStatus || "Registered"}
                        </span>
                      </td>
                      <td className="border-[1.5px] border-black bg-white p-1 text-center">
                        <span className="text-[9px] uppercase font-bold text-gray-400">N/A</span>
                      </td>
                    </tr>
                  );
                }

                return author.books.map((book: any, bIdx: number) => {
                  const mrp = parseFloat(book.overrideMrp) || parseFloat(book.mrp) || parseFloat(book.book?.mrp) || 0;
                  const isFirstBook = bIdx === 0;
                  const rowSpan = author.books.length;

                  return (
                    <tr key={`${author.authorId}-${bIdx}`} className="hover:brightness-95 transition-all">
                      {isFirstBook && (
                        <td rowSpan={rowSpan} className="border-[1.5px] border-black bg-red-600 text-white font-bold text-center p-1">
                          {aIdx + 1}
                        </td>
                      )}
                      
                      <td className="border-[1.5px] border-black bg-[#ffcccc] text-black font-bold p-1 px-2 truncate max-w-[200px] text-left" title={book.title || book.book?.title}>
                        {book.title || book.book?.title || "Unknown"}
                      </td>
                      
                      {isFirstBook && (
                        <td rowSpan={rowSpan} className="border-[1.5px] border-black bg-green-400 text-black font-bold text-center p-1">
                          {author.amountPaid ? `₹${author.amountPaid}` : "NA"}
                        </td>
                      )}
                      
                      <td className={`border-[1.5px] border-black p-0 ${isEditing ? 'bg-white' : 'bg-[#ffddaa]'} text-black font-mono font-bold`}>
                        {isEditing ? (
                          <input
                            type="number"
                            className="w-full h-full p-1 bg-transparent border-none text-center outline-none font-bold font-mono"
                            value={book.overrideMrp !== undefined && book.overrideMrp !== "" ? book.overrideMrp : mrp}
                            onChange={(e) => handleMrpChange(author.authorId, bIdx, e.target.value)}
                          />
                        ) : (
                          <div className="p-1 text-center">{mrp}</div>
                        )}
                      </td>
                      
                      {isFirstBook && (
                        <td rowSpan={rowSpan} className="border-[1.5px] border-black bg-[#00ffff] text-black font-bold p-1 px-2 truncate max-w-[150px] text-left">
                          {author.authorName}
                        </td>
                      )}
                      
                      <td className="border-[1.5px] border-black bg-[#ffddaa] text-black text-center p-1 font-bold">
                        {book.listedStock || 0}
                      </td>
                      
                      <td className={`border-[1.5px] border-black text-black ${isEditing ? 'p-0' : 'p-1 text-center font-bold'} bg-white`}>
                        {isEditing ? (
                          <input 
                            type="number"
                            className="w-full h-full p-1 bg-transparent border-none text-center outline-none font-bold"
                            value={book.actualSent}
                            onChange={(e) => handleActualSentChange(author.authorId, bIdx, e.target.value)}
                          />
                        ) : (
                          book.actualSent
                        )}
                      </td>
                      
                      {dayColumns.map(dc => (
                        <td key={dc.label} className={`border-[1.5px] border-black ${isEditing ? 'p-0' : 'p-1 text-center font-bold'} bg-white`}>
                          {isEditing ? (
                            <input 
                              type="number"
                              className="w-full h-full p-1 bg-transparent border-none text-center outline-none font-bold"
                              value={book.manualDailySales?.[dc.dateStr]?.sold ?? ""}
                              onChange={(e) => handleCellChange(author.authorId, bIdx, dc.dateStr, e.target.value)}
                            />
                          ) : (
                            book.manualDailySales?.[dc.dateStr]?.sold ?? ""
                          )}
                        </td>
                      ))}
                      
                      <td className="border-[1.5px] border-black bg-white text-black text-center font-bold p-1">
                        {book.soldStock}
                      </td>

                      {isFirstBook && (
                        <td rowSpan={rowSpan} className="border-[1.5px] border-black bg-white p-1 text-center font-bold">
                          {author.optInStatus || "Registered"}
                        </td>
                      )}
                      
                      {isFirstBook && (
                        <td rowSpan={rowSpan} className="border-[1.5px] border-black bg-gray-50 p-1 text-center">
                          {isEditing ? (
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
                              
                              {(author.optInStatus === "Pending Approval" || author.optInStatus === "Pending") && (
                                <div className="flex gap-1 mt-1 w-full">
                                  <button onClick={() => handleApprove(author.authorId)} className="bg-green-600 text-white w-full py-1 text-[9px] font-bold rounded hover:bg-green-700">✓</button>
                                  <button onClick={() => handleReject(author.authorId)} className="bg-red-600 text-white w-full py-1 text-[9px] font-bold rounded hover:bg-red-700">✗</button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                });
              })
            )}
          </tbody>
        </table>
      </div>
      
      
    </div>
  );
}
