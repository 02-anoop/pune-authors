import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Download, Search, CheckSquare, Printer, MapPin, Edit2, Trash2, Bell, X, FileDown, Loader2 } from 'lucide-react';
import { AuthorRegistrationPage } from './AuthorRegistrationPage';
import { AuthorFullProfileView } from './AuthorFullProfileView';

export const AdminAuthorsTab = React.memo(({
  authors, API, selectedAuthorIds, setSelectedAuthorIds, isDownloadingPdf, setIsDownloadingPdf,
  authorSearchTerm: searchTerm, setAuthorSearchTerm: setSearchTerm, authorStatusFilter, setAuthorStatusFilter,
  setAuthorsPage, fetchAuthors, loadingAction, handleApproveAuthor, openRejectAuthorModal,
  handleViewEditAuthor, handleDeleteAuthor, handleRestoreAuthor, books, authorsMeta, authorsPage,
  selectedPendingAuthor, setSelectedPendingAuthor, selectedAuthor, setSelectedAuthor
}: any) => {
const [showArchived, setShowArchived] = useState(false);
const handleExportAuthorsCSV = async () => {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const dynamicKeys = Array.from(new Set<string>(
        authors.reduce((acc: string[], author: any) => {
          if (author.extraData) acc = acc.concat(Object.keys(author.extraData));
          return acc;
        }, [])
      ));
      const baseFields = ['Status', 'Name', 'Pen Name', 'Email', 'Phone', 'WhatsApp', 'Address', 'City', 'State', 'Aadhar/Voter ID/DL', 'Qualification', 'DOB', 'Experience', 'Skills', 'Hobbies', 'Why Joining', 'Transaction ID', 'Joined Date'];

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Authors Directory');
      
      const allHeaders = [...baseFields, ...dynamicKeys];
      
      sheet.mergeCells(1, 1, 1, allHeaders.length);
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = 'AUTHORS DIRECTORY EXPORT';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1A2E' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      const headerRow = sheet.addRow(allHeaders);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });
      
      authors.forEach(author => {
        const joinedDate = author.createdAt ? new Date(author.createdAt).toLocaleDateString() : '';
        const rowData = [
          author.status, author.name, author.penName, author.email, author.phone, author.whatsapp,
          author.address, author.city, author.state, author.aadharNumber, author.qualification,
          author.age, author.experience, author.skills, author.hobbies, author.whyJoining,
          author.transactionId, joinedDate
        ];
        dynamicKeys.forEach(col => {
          rowData.push(author.extraData && author.extraData[col] ? author.extraData[col] : '');
        });
        
        const addedRow = sheet.addRow(rowData);
        addedRow.eachCell((cell, colNumber) => {
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
          cell.font = { name: 'Arial', size: 10, color: { argb: '000000' } };
          
          let colBgColor = 'FFFFFF';
          if (colNumber === 1) colBgColor = 'FF8B8B'; // Light red
          else if (colNumber === 2) colBgColor = 'FFD2A3'; // Light orange
          else if (colNumber === 3) colBgColor = 'D4D8DD'; // Light gray
          else if (colNumber === 4) colBgColor = 'B3E5FC'; // Light cyan
          else if (colNumber === allHeaders.length) colBgColor = 'C8E6C9'; // Light green
          else colBgColor = 'DDA0DD'; // Lavender/Plum
          
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colBgColor } };
        });
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'master_authors_directory.xlsx');
    };
    const handleDownloadCatalogue = async (isPrintable = false) => {
      if (selectedAuthorIds.length === 0) return;
      setIsDownloadingPdf(true);
      const { downloadCataloguePDF } = await import('./CataloguePage');

      try {
        // Fetch full author data from the backend so we get all books, hobbies, skills, etc.
        const fullAuthorsData = await Promise.all(
          selectedAuthorIds.map(id =>
            axios.get(`${API}/api/admin/authors/${id}/dashboard-data`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
              .then(res => res.data.authorProfile)
          )
        );

        const formattedBooks: any[] = [];
        fullAuthorsData.forEach(author => {
          if (!author) return;
          let ed = author.extraData;
          if (typeof ed === 'string') {
            try { ed = JSON.parse(ed); } catch (e) { ed = {}; }
          }
          ed = ed || {};

          const authorBooks = author.books || [];

          if (authorBooks.length === 0) {
            formattedBooks.push({
              id: 'NO_BOOK',
              title: '',
              synopsis: '',
              mrp: null,
              mrpRaw: '',
              coverUrl: '',
              authorName: author.name || 'Unknown Author',
              authorBio: author.bio || '',
              authorPhotoUrl: author.photoUrl || '',
              authorInstagram: author.instagram || ed.instagram || '',
              authorFacebook: author.facebook || ed.facebook || '',
              authorWhatsapp: author.whatsapp || ed.whatsapp || '',
              authorQualification: author.qualification || ed.qualification || '',
              authorAge: author.age || ed.age || '',
              authorExperience: author.experience || ed.experience || '',
              authorSkills: author.skills || ed.skills || '',
              authorHobbies: author.hobbies || ed.hobbies || '',
              genre: '',
              subGenre: '',
              pages: null,
              language: '',
              isbn: '',
              publisher: '',
              publicationDate: '',
              edition: '',
              format: '',
              rating: 5,
              reviewsCount: 10
            });
          } else {
            authorBooks.forEach((book: any) => {
              formattedBooks.push({
                id: book.id || String(Math.random()),
                title: book.title || 'Untitled',
                synopsis: book.synopsis || '',
                mrp: parseFloat(book.mrp) || null,
                mrpRaw: String(book.mrp || ''),
                coverUrl: book.coverUrl || '',
                authorName: author.name || 'Unknown Author',
                authorBio: author.bio || '',
                authorPhotoUrl: author.photoUrl || '',
                authorInstagram: author.instagram || ed.instagram || '',
                authorFacebook: author.facebook || ed.facebook || '',
                authorWhatsapp: author.whatsapp || ed.whatsapp || '',
                authorQualification: author.qualification || ed.qualification || '',
                authorAge: author.age || ed.age || '',
                authorExperience: author.experience || ed.experience || '',
                authorSkills: author.skills || ed.skills || '',
                authorHobbies: author.hobbies || ed.hobbies || '',
                genre: book.genre || 'General',
                subGenre: book.subGenre || '',
                pages: parseInt(book.pages) || null,
                language: book.language || 'English',
                isbn: book.isbn || '',
                publisher: book.publisher || '',
                publicationDate: book.publicationDate || '',
                edition: book.edition || '',
                format: book.format || '',
                rating: 5,
                reviewsCount: 10
              });
            });
          }
        });

        downloadCataloguePDF('Exclusive', formattedBooks, setIsDownloadingPdf, {}, isPrintable, !isPrintable).then(() => {
          toast.success("PDF generated successfully!");
        }).catch(err => {
          console.error(err);
          toast.error("Error generating PDF catalogue.");
        });
      } catch (err) {
        console.error(err);
        toast.error("Error fetching full author details.");
        setIsDownloadingPdf(false);
      }
    };

    if (selectedPendingAuthor) {
      return (
        <div className="bg-white fixed inset-0 z-50 overflow-y-auto">
          <AuthorRegistrationPage
            initialData={selectedPendingAuthor}
            isAdminEdit={true}
            onAdminCancel={() => setSelectedPendingAuthor(null)}
            onAdminSave={() => {
              setSelectedPendingAuthor(null);
              fetchAuthors();
            }}
            onAdminReject={() => {
              openRejectAuthorModal(selectedPendingAuthor);
              setSelectedPendingAuthor(null);
            }}
          />
        </div>
      );
    }

    if (selectedAuthor) {
      return <AuthorFullProfileView author={selectedAuthor} onBack={() => setSelectedAuthor(null)} />;
    }

    return (
      <div className="bg-white border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out flex flex-col">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-serif font-semibold text-[#0b1a2e] tracking-tight">Authors Directory</h3>
            <span className="bg-[#0b1a2e]/10 text-[#0b1a2e] py-1 px-3 text-xs font-bold shadow-sm rounded-full">{authors.length} Total</span>
          </div>
          <div className="relative shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="SEARCH AUTHORS..."
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 text-[#0b1a2e] text-xs font-bold tracking-widest uppercase outline-none focus:border-[#0b1a2e] focus:bg-white transition-colors w-full sm:w-72 placeholder-gray-400 rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="p-3 bg-gray-50/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap sm:flex-nowrap gap-1.5">
            {(() => {
              const parseEd = (extraData: any) => typeof extraData === 'string' ? (() => { try { return JSON.parse(extraData); } catch (e) { return {}; } })() : (extraData || {});
              const counts = {
                'All': authors.length,
                'Reapplied': authors.filter(a => parseEd(a.extraData)?.isReapplied && a.status === 'Pending').length,
                'Pending': authors.filter(a => a.status === 'Pending' && !parseEd(a.extraData)?.isReapplied).length,
                'Edited': authors.filter(a => a.status === 'Edited').length,
                'Added New Book': authors.filter(a => a.status === 'Added New Book').length,
                'Active': authors.filter(a => a.status === 'Active').length,
                'Rejected': authors.filter(a => a.status === 'Rejected').length,
              };
              return ['All', 'Reapplied', 'Pending', 'Edited', 'Added New Book', 'Active', 'Rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setAuthorStatusFilter(status)}
                  className={`px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-all rounded-full whitespace-nowrap border shadow-sm shrink-0 ${authorStatusFilter === status ? 'bg-[#0b1a2e] text-white border-[#0b1a2e] shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:text-[#0b1a2e] hover:bg-gray-50 hover:border-gray-300'}`}
                >
                  {status === 'Reapplied' ? '🔄 Reapplied' : status} ({counts[status as keyof typeof counts]})
                </button>
              ))
            })()}
            <div className="w-[1px] h-6 bg-gray-300 mx-1 hidden sm:block"></div>
            <div 
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 cursor-pointer shrink-0 ml-1"
            >
              <div className={`relative w-8 h-4 rounded-full transition-colors ${showArchived ? 'bg-red-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform duration-200 ${showArchived ? 'translate-x-4' : 'translate-x-0'} shadow-sm`}></div>
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-gray-600">Archived</span>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2 shrink-0">
            <button onClick={() => handleDownloadCatalogue(false)} disabled={selectedAuthorIds.length === 0 || isDownloadingPdf} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:text-[#0b1a2e] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm">
              {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" aria-hidden="true" />} {isDownloadingPdf ? 'Generating...' : 'Download PDF'}
            </button>
            <button onClick={() => handleDownloadCatalogue(true)} disabled={selectedAuthorIds.length === 0 || isDownloadingPdf} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:text-[#0b1a2e] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm">
              {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" aria-hidden="true" />} {isDownloadingPdf ? 'Generating...' : 'Print PDF'}
            </button>
            <button onClick={handleExportAuthorsCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:text-[#0b1a2e] whitespace-nowrap shadow-sm">
              <Download className="w-3.5 h-3.5" aria-hidden="true" /> Export Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto w-full" style={{ contentVisibility: "auto", containIntrinsicSize: "800px" }}>
          <table className="dash-table">
            <thead className="bg-indigo-50 border-b-2 border-indigo-100">
              <tr>
                <th className="w-10 text-center !bg-transparent">
                  <input
                    type="checkbox"
                    checked={authors.length > 0 && selectedAuthorIds.length === authors.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAuthorIds(authors.map(a => a.id));
                      } else {
                        setSelectedAuthorIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-paa-navy focus:ring-paa-navy cursor-pointer"
                  />
                </th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent">Author Details</th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent">Contact</th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent">Location</th>
                <th style={{ textAlign: 'center' }} className="!text-[14px] !text-indigo-800 !bg-transparent">Status</th>
                <th style={{ textAlign: 'center' }} className="!text-[14px] !text-indigo-800 !bg-transparent">Participation</th>
                <th style={{ textAlign: 'center' }} className="!text-[14px] !text-indigo-800 !bg-transparent">Books</th>
                <th style={{ textAlign: 'center' }} className="!text-[14px] !text-indigo-800 !bg-transparent">Actions</th>
              </tr>
            </thead>
            <tbody>
              {authors.filter(a => {
                if (showArchived) return a.isArchived;
                if (a.isArchived) return false;
                const ed = typeof a.extraData === 'string' ? (() => { try { return JSON.parse(a.extraData); } catch (e) { return {}; } })() : (a.extraData || {});
                const isReapplied = ed?.isReapplied === true;
                const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || (a.email && a.email.toLowerCase().includes(searchTerm.toLowerCase())) || (a.books && a.books.some((b: any) => b.title.toLowerCase().includes(searchTerm.toLowerCase()) || (b.genre && b.genre.toLowerCase().includes(searchTerm.toLowerCase()))));
                if (!matchesSearch) return false;
                if (authorStatusFilter === 'All') return true;
                if (authorStatusFilter === 'Reapplied') return isReapplied && a.status === 'Pending';
                if (authorStatusFilter === 'Pending') return a.status === 'Pending' && !isReapplied;
                if (authorStatusFilter === 'Edited') return a.status === 'Edited';
                return a.status === authorStatusFilter;
              }).sort((a, b) => {
                const edA = typeof a.extraData === 'string' ? (() => { try { return JSON.parse(a.extraData); } catch (e) { return {}; } })() : (a.extraData || {});
                const edB = typeof b.extraData === 'string' ? (() => { try { return JSON.parse(b.extraData); } catch (e) { return {}; } })() : (b.extraData || {});
                if (edA?.isReapplied && !edB?.isReapplied) return -1;
                if (!edA?.isReapplied && edB?.isReapplied) return 1;
                if (a.status === 'Pending' && b.status !== 'Pending') return -1;
                if (a.status !== 'Pending' && b.status === 'Pending') return 1;
                return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
              }).map((author, idx) => (
                <tr key={author.id} className={`${selectedAuthorIds.includes(author.id) ? 'bg-indigo-100' : (idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]')} hover:bg-sky-100 transition-colors`}>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={selectedAuthorIds.includes(author.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAuthorIds(prev => [...prev, author.id]);
                        } else {
                          setSelectedAuthorIds(prev => prev.filter(id => id !== author.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-paa-navy focus:ring-paa-navy cursor-pointer"
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#f0f4f8] border border-paa-navy/5 text-paa-navy flex items-center justify-center font-bold font-serif text-lg">
                        {author.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-paa-navy flex items-center">
                          {author.name}
                          {(() => {
                            let ed = author.extraData;
                            if (typeof ed === 'string') {
                              try { ed = JSON.parse(ed); } catch (e) { }
                            }
                            const pendingBooksCount = books.filter(b => b.authorId === author.id && b.status === 'Pending').length;
                            if (pendingBooksCount > 0) {
                              return null; // The main status badge handles this now.
                            }
                            return ed?.hasPendingEdits && (
                              <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] uppercase tracking-wider font-bold rounded-full">Edited</span>
                            );
                          })()}
                        </p>
                        <p className="text-xs text-paa-gray-text flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" aria-hidden="true" /> Joined {author.joined}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="text-paa-navy font-medium">{author.email}</p>
                    <p className="text-paa-gray-text text-xs mt-0.5 font-medium">{author.phone}</p>
                  </td>
                  <td className="align-middle">
                    <div className="flex flex-col gap-2">
                      {author.city || author.state ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-paa-navy font-bold">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" aria-hidden="true" />
                          <span className="truncate max-w-[140px] uppercase tracking-wider">{[author.city, author.state].filter(Boolean).join(', ')}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold uppercase">No Location Info</span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {(() => {
                      const ed = typeof author.extraData === 'string' ? (() => { try { return JSON.parse(author.extraData); } catch (e) { return {}; } })() : (author.extraData || {});
                      const isReapplied = ed?.isReapplied === true && author.status === 'Pending';
                      const pendingBooksCount = books.filter(b => b.authorId === author.id && b.status === 'Pending').length;

                      if (isReapplied) {
                        return <span className="dash-badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid transparent' }}>🔄 Reapplied</span>;
                      }

                      if ((author.status === 'Edited' || author.status === 'Active') && pendingBooksCount > 0) {
                        return <span className="dash-badge" style={{ background: '#dbeafe', color: '#1e40af', border: '1px solid transparent' }}>+ {pendingBooksCount} Book{pendingBooksCount > 1 ? 's' : ''}</span>;
                      }

                      return (
                        <span className={`dash-badge ${author.status === 'Active' ? 'active' : author.status === 'Rejected' ? 'rejected' : 'pending'}`}>
                          {author.status}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {author.aggEligibleEvents > 0 ? (
                      <div>
                        <div className="font-bold text-paa-navy text-sm">{Math.round((author.aggParticipatedEvents / author.aggEligibleEvents) * 100)}%</div>
                        <div className="text-[10px] font-medium text-gray-500 uppercase">{author.aggParticipatedEvents}/{author.aggEligibleEvents} Events</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs font-bold uppercase">N/A</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }} className="font-bold text-paa-navy">
                    {author.totalBooks}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {(() => {
                        const ed = typeof author.extraData === 'string' ? (() => { try { return JSON.parse(author.extraData); } catch (e) { return {}; } })() : (author.extraData || {});
                        const isReapplied = ed?.isReapplied === true;
                        const hasPending = ed?.hasPendingEdits === true;
                        const pendingBooksCount = books.filter(b => b.authorId === author.id && b.status === 'Pending').length;
                        const needsApproval = author.status === 'Pending' || author.status === 'Edited' || isReapplied || hasPending || pendingBooksCount > 0;

                        if (needsApproval && !author.isArchived) {
                          return (
                            <>
                              <button onClick={() => handleApproveAuthor(author.id)} className="dash-btn dash-btn-success" title="Approve">
                                {loadingAction === 'approveAuthor_' + author.id ? '...' : 'Approve'}
                              </button>
                              <button onClick={() => openRejectAuthorModal(author)} className="dash-btn dash-btn-danger" title="Reject">
                                Reject
                              </button>
                            </>
                          );
                        }
                        return null;
                      })()}
                      {!author.isArchived && (
                        <button onClick={() => handleViewEditAuthor(author)} className="dash-btn dash-btn-success dash-btn-icon" title="View / Edit Application">
                          <Edit2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                      {author.isArchived ? (
                        <button onClick={() => handleRestoreAuthor && handleRestoreAuthor(author.id)} className="dash-btn !bg-amber-100 !text-amber-800 hover:!bg-amber-200 dash-btn-icon" title="Restore from Archive">
                          Undo Archive
                        </button>
                      ) : (
                        <button onClick={() => handleDeleteAuthor(author.id)} className="dash-btn dash-btn-danger dash-btn-icon" title="Archive">
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    {author.status === 'Rejected' && author.rejectionReason && (
                      <div className="mt-2 text-xs text-red-600 font-medium text-left leading-tight bg-red-50 p-2 rounded border border-red-100">
                        <span className="font-bold">Reason:</span> {author.rejectionReason}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {authors.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-paa-gray-text bg-white">No authors found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {authorsMeta?.totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">Showing page {authorsPage} of {authorsMeta.totalPages} (Total: {authorsMeta.total} authors)</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setAuthorsPage(p => Math.max(1, p - 1)); setTimeout(fetchAuthors, 0); }}
                disabled={authorsPage === 1}
                className="px-4 py-2 border border-gray-200 rounded text-sm text-paa-navy disabled:opacity-50 font-medium bg-white hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => { setAuthorsPage(p => Math.min(authorsMeta.totalPages, p + 1)); setTimeout(fetchAuthors, 0); }}
                disabled={authorsPage === authorsMeta.totalPages}
                className="px-4 py-2 border border-gray-200 rounded text-sm text-paa-navy disabled:opacity-50 font-medium bg-white hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
});