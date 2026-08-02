import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Megaphone, MapPin, Calendar, Clock, BookOpen, CheckCircle2, Package, Upload, Download, FileText, Landmark, FileSpreadsheet, ShieldCheck, BadgeAlert, Sparkles, ChevronRight, ChevronDown, ChevronUp, X, User, Phone, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
// exceljs and file-saver are dynamically imported inside export handlers
import qrCode from "./data/qr_code.jpeg";

export function AuthorDonationsTab({ dashboardData, onRefresh }: { dashboardData?: any, onRefresh?: () => void }) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [authorBooks, setAuthorBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState<number | null>(null);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
  const [selectedDetailRegistration, setSelectedDetailRegistration] = useState<any | null>(null);
  
  // For donation form
  const [selectedBooks, setSelectedBooks] = useState<{ bookId: number, qty: number }[]>([]);
  const [payAsYouWishAmount, setPayAsYouWishAmount] = useState<number>(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Payment upload states
  const [transactionId, setTransactionId] = useState('');
  const [paymentBlob, setPaymentBlob] = useState<File | null>(null);
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string | null>(null);

  const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

  const fetchMyRegistrations = async () => {
    try {
      const res = await axios.get(`${API}/api/author/donation-registrations`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setMyRegistrations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRegistration = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this donation registration? This action cannot be undone.")) return;
    try {
      await axios.delete(`${API}/api/author/donation-registrations/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success("Donation registration deleted");
      fetchMyRegistrations();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete registration");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [annRes, booksRes, regRes] = await Promise.all([
          axios.get(`${API}/api/author/donation-announcements`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          axios.get(`${API}/api/author/books`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          axios.get(`${API}/api/author/donation-registrations`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        ]);
        setAnnouncements(annRes.data);
        setAuthorBooks(booksRes.data.filter((b: any) => b.status === 'Approved'));
        setMyRegistrations(regRes.data);
      } catch (err) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleBookSelect = (bookId: number, qty: string) => {
    const parsedQty = parseInt(qty) || 0;
    const existing = selectedBooks.find(b => b.bookId === bookId);
    
    if (parsedQty <= 0) {
      setSelectedBooks(prev => prev.filter(b => b.bookId !== bookId));
    } else if (existing) {
      setSelectedBooks(prev => prev.map(b => b.bookId === bookId ? { ...b, qty: parsedQty } : b));
    } else {
      setSelectedBooks(prev => [...prev, { bookId, qty: parsedQty }]);
    }
  };

  const calculateFee = (ann: any) => {
    if (!ann || ann.feeType === 'Free') return 0;
    if (ann.feeType === 'Per Author') return ann.feeAmount || 0;
    if (ann.feeType === 'Per Title') return (ann.feeAmount || 0) * selectedBooks.length;
    if (ann.feeType === 'Pay As You Wish') return payAsYouWishAmount || 0;
    return 0;
  };

  const handleRegister = async (announcement: any) => {
    if (selectedBooks.length === 0) {
      toast.error('Please select at least one book to donate');
      return;
    }

    // Validation: check stock availability for all selected books
    for (const item of selectedBooks) {
      const book = authorBooks.find(b => b.id === item.bookId);
      if (book && item.qty > book.stock) {
        toast.error(`Cannot donate ${item.qty} copies of "${book.title}". Available stock: ${book.stock}`);
        return;
      }
    }

    const feeToPay = calculateFee(announcement);
    if (announcement.feeType === 'Pay As You Wish' && feeToPay <= 0) {
      toast.error('Please enter a valid donation amount');
      return;
    }

    if (feeToPay > 0) {
      if (!transactionId.trim()) {
        toast.error('UPI Transaction ID is required for paid registrations.');
        return;
      }
      if (!paymentBlob) {
        toast.error('Please upload your payment screenshot.');
        return;
      }
    }

    setIsProcessingPayment(true);
    try {
      const formData = new FormData();
      formData.append('announcementId', announcement.id.toString());
      formData.append('books', JSON.stringify(selectedBooks.map(b => ({ bookId: b.bookId, quantityDonated: b.qty }))));
      formData.append('feePaid', feeToPay.toString());
      formData.append('paymentStatus', feeToPay > 0 ? 'Pending' : 'Completed');
      if (transactionId) {
        formData.append('transactionId', transactionId);
      }
      if (paymentBlob) {
        formData.append('paymentScreenshot', paymentBlob);
      }

      await axios.post(`${API}/api/author/donations`, formData, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success(feeToPay > 0 
        ? 'Donation registered successfully! Awaiting payment verification by Admin.' 
        : 'Successfully registered for donation drive!'
      );
      
      setIsRegistering(null);
      setSelectedBooks([]);
      setPayAsYouWishAmount(0);
      setTransactionId('');
      setPaymentBlob(null);
      setPaymentScreenshotUrl(null);
      fetchMyRegistrations();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error('Failed to register donation');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Helper to format dates for donations Excel
  const formatDonationDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const dateObj = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
      if (isNaN(dateObj.getTime())) return dateStr;
      return dateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Excel Report Generator
  const handleExportMyDonationReport = async () => {
    const regs = myRegistrations;
    if (regs.length === 0) {
      toast.error('No donation records found to export');
      return;
    }

    const authorName = dashboardData?.authorProfile?.name || dashboardData?.name || 'Author';
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('My Donations');

    // Title Row (Merged A to F)
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'PUNE AUTHORS ASSOCIATION - LIBRARY DONATION REPORT';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2A4B6B' } }; // Deep Steel Blue
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Subtitle Row (Merged A to F)
    sheet.mergeCells('A2:F2');
    const subtitleCell = sheet.getCell('A2');
    const todayStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    subtitleCell.value = `Author: ${authorName}  |  Report Purpose: Personal Library Donation Tracking  |  Generated: ${todayStr}`;
    subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FFFFFFFF' } };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B6290' } }; // Muted Blue
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;

    // Blank row
    sheet.addRow([]);

    // Table Headers (6 columns) - Bright Yellow with Black Text like the reference
    const headers = [
      'Date',
      'Campaign',
      'Library Name',
      'Book Title',
      'MRP (₹)',
      'Qty Committed'
    ];
    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', bold: true, color: { argb: '000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Bright Yellow
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Data Rows
    regs.forEach((reg: any) => {
      const dateStr = formatDonationDate(reg.createdAt);
      const campaign = reg.announcement?.title || 'N/A';
      const libraryName = reg.announcement?.library?.name || 'N/A';

      reg.books.forEach((b: any) => {
        const title = b.book?.title || 'N/A';
        const mrp = b.book?.mrp || 0;
        const qty = b.quantityDonated || 0;

        const rowData = [
          dateStr,
          campaign,
          libraryName,
          title,
          mrp,
          qty
        ];
        const newRow = sheet.addRow(rowData);
        newRow.height = 20;

        newRow.eachCell((cell, colNumber) => {
          // Border (Thin Black like the reference)
          cell.border = {
            top: { style: 'thin', color: { argb: '000000' } },
            left: { style: 'thin', color: { argb: '000000' } },
            bottom: { style: 'thin', color: { argb: '000000' } },
            right: { style: 'thin', color: { argb: '000000' } }
          };

          cell.font = { name: 'Arial', size: 10, color: { argb: '000000' } };
          
          if (colNumber === 1) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber === 5 || colNumber === 6) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }

          // Distinct Solid Colors for columns based on the reference:
          let colBgColor = 'FFFFFF';
          if (colNumber === 1) colBgColor = 'FF8B8B'; // Solid light red
          else if (colNumber === 2) colBgColor = 'FFD2A3'; // Solid light orange
          else if (colNumber === 3) colBgColor = 'D4D8DD'; // Solid light gray/slate
          else if (colNumber === 4) colBgColor = 'B3E5FC'; // Solid light cyan/blue
          else if (colNumber === 5) colBgColor = 'C8E6C9'; // Solid light emerald green
          else if (colNumber === 6) colBgColor = 'E1BEE7'; // Solid light purple

          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colBgColor } };
        });
      });
    });

    // Auto-fit Columns (avoiding title and subtitle rows for width calculation)
    sheet.columns.forEach(column => {
      let maxLen = 12; // Min width to prevent date columns showing ###
      column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber > 3 && cell.value) {
          const len = cell.value.toString().length;
          if (len > maxLen) maxLen = len;
        }
      });
      column.width = Math.min(maxLen + 4, 45); // Limit maximum width to 45
    });

    // Write to Buffer and Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Library_Donations_Report_${authorName.replace(/\s+/g, '_')}.xlsx`);
  };

  // Stats Calculations
  const statsCampaigns = new Set(
    myRegistrations
      .filter((reg: any) => reg.status !== 'Rejected')
      .map((reg: any) => reg.announcement?.libraryId || reg.announcement?.library?.id)
      .filter(Boolean)
  ).size;
  const statsBooksPledged = myRegistrations.reduce(
    (sum: number, reg: any) => sum + reg.books.reduce((acc: number, b: any) => acc + (b.quantityDonated || 0), 0), 0
  ) || 0;
  const statsValue = myRegistrations.reduce(
    (sum: number, reg: any) => sum + reg.books.reduce((acc: number, b: any) => acc + ((b.quantityDonated || 0) * (b.book?.mrp || 0)), 0), 0
  ) || 0;
  const statsPending = myRegistrations.filter((r: any) => r.status === 'Pending' || r.status === 'Registered').length || 0;

  const getPipelineStatus = (reg: any) => {
    if (reg.status === 'Rejected') {
      return {
        step: 0,
        label: 'Rejected',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        description: 'Registration declined by admin'
      };
    }
    if (reg.status === 'Approved') {
      return {
        step: 4,
        label: 'Verified',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        description: 'Successfully verified by admin'
      };
    }
    if (reg.paymentStatus === 'Failed') {
      return {
        step: 0,
        label: 'Payment Failed',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        description: 'Payment failed'
      };
    }
    if (reg.paymentStatus === 'Pending' && (reg.feePaid || 0) > 0) {
      return {
        step: 1,
        label: 'Awaiting Payment Verification',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        description: 'Awaiting payment verification by admin'
      };
    }
    return {
      step: 2,
      label: 'Pending Verification',
      color: 'bg-yellow-50 text-yellow-750 border-yellow-200',
      description: 'Awaiting verification by admin'
    };
  };

  const filteredAnnouncements = announcements.filter(ann => {
    const term = searchTerm.toLowerCase();
    const titleMatch = ann.title && ann.title.toLowerCase().includes(term);
    const descMatch = ann.description && ann.description.toLowerCase().includes(term);
    const libMatch = ann.library && (
      (ann.library.name && ann.library.name.toLowerCase().includes(term)) ||
      (ann.library.city && ann.library.city.toLowerCase().includes(term)) ||
      (ann.library.state && ann.library.state.toLowerCase().includes(term))
    );
    return titleMatch || descMatch || libMatch;
  });

  const filteredHistoryRegistrations = myRegistrations.filter((reg: any) => {
    const term = historySearchTerm.toLowerCase();
    const titleMatch = reg.announcement?.title && reg.announcement.title.toLowerCase().includes(term);
    const libNameMatch = reg.announcement?.library?.name && reg.announcement.library.name.toLowerCase().includes(term);
    const cityMatch = reg.announcement?.library?.city && reg.announcement.library.city.toLowerCase().includes(term);
    const statusMatch = reg.status && reg.status.toLowerCase().includes(term);
    const booksMatch = reg.books?.some((b: any) => b.book?.title && b.book.title.toLowerCase().includes(term));
    return titleMatch || libNameMatch || cityMatch || statusMatch || booksMatch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3].map(n => <div key={n} className="h-28 bg-white border border-paa-navy/5 animate-pulse rounded-2xl shadow-sm"></div>)}
        </div>
        <div className="h-96 bg-white border border-paa-navy/5 animate-pulse rounded-2xl shadow-sm"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header and Report Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-paa-navy flex items-center gap-2">
            Library Donations Ecosystem <Sparkles className="w-5 h-5 text-paa-gold animate-pulse" />
          </h2>
          <p className="text-gray-500 text-sm mt-1">Donate your books to Airport Libraries, Public Libraries, and Cafes</p>
        </div>
        <button
          onClick={handleExportMyDonationReport}
          className="dash-btn bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-2 active:scale-95 transition-all"
        >
          <Download className="w-4 h-4 text-paa-gold" /> Export Donation Report
        </button>
      </div>

      {/* 3 Beautiful Statistical Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl border-none p-5 shadow-sm hover:shadow-md transition-shadow text-white">
          <div className="text-xs font-bold text-blue-100 uppercase tracking-widest mb-1">Library Donated</div>
          <div className="text-3xl font-bold font-serif">{statsCampaigns}</div>
          <p className="text-[10px] text-blue-100 mt-2">Active & legacy library involvements</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl border-none p-5 shadow-sm hover:shadow-md transition-shadow text-white">
          <div className="text-xs font-bold text-purple-100 uppercase tracking-widest mb-1">Total Books Donated</div>
          <div className="text-3xl font-bold font-serif">{statsBooksPledged}</div>
          <p className="text-[10px] text-purple-100 mt-2">Total copies committed to collections</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl border-none p-5 shadow-sm hover:shadow-md transition-shadow text-white">
          <div className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-1">Donation Value (MRP)</div>
          <div className="text-3xl font-bold font-serif">₹{statsValue.toLocaleString('en-IN')}</div>
          <p className="text-[10px] text-emerald-100 mt-2">Total value contributed at MRP</p>
        </div>
      </div>

      {/* Campaigns Listing */}
      <div className="space-y-5">
        <div className="border-b pb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-xl font-bold text-paa-navy font-serif flex items-center gap-2">
            Donation Campaigns <Megaphone className="w-5 h-5 text-purple-500" />
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 text-xs font-semibold outline-none focus:border-paa-navy transition-colors w-full rounded-full shadow-sm text-gray-700"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {filteredAnnouncements.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl p-12 text-center text-gray-500 border border-dashed border-gray-200">
              <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-base font-semibold">{searchTerm ? 'No campaigns match your search' : 'No Active Campaigns'}</p>
              <p className="text-sm text-gray-400 mt-1">{searchTerm ? 'Try adjusting your search keywords.' : 'We will notify you here when a new donation drive is launched.'}</p>
            </div>
          ) : (showAllCampaigns ? filteredAnnouncements : filteredAnnouncements.slice(0, 10)).map((ann, index) => {
            const registration = myRegistrations.find((reg: any) => reg.announcementId === ann.id);
            const hasParticipated = !!registration;
            
            const cardColors = ["#bfdbfe", "#e9d5ff", "#bbf7d0", "#fed7aa", "#fbcfe8", "#fef08a"];
            const cardBg = cardColors[index % cardColors.length];
            
            return (
              <div 
                key={ann.id} 
                style={{ background: cardBg }}
                className="rounded-3xl shadow-sm border border-paa-navy/15 overflow-hidden flex flex-col hover:shadow-md hover:scale-[1.02] transition-all duration-300"
              >
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3 gap-3">
                  <h4 className="text-sm font-bold text-paa-navy font-serif leading-snug">{ann.title}</h4>
                  {ann.visibility === 'Closed' ? (
                    <span className="shrink-0 px-2 py-0.5 bg-gray-250 border border-gray-300/30 text-gray-600 text-[9px] font-extrabold rounded-full uppercase tracking-wider">
                      Closed
                    </span>
                  ) : (
                    <span className="shrink-0 px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-extrabold rounded-full uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-gray-550 text-[11px] mb-4 flex-1 line-clamp-3 leading-relaxed" title={ann.description}>{ann.description}</p>
                
                <div className="space-y-2.5 mb-5 bg-white/70 backdrop-blur-xs p-3.5 rounded-2xl border border-white/50 shadow-xs flex-1">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-bold text-paa-navy leading-tight">{ann.library?.name}</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">{ann.library?.city}, {ann.library?.state}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-500 shrink-0" />
                    <p className="text-[11px] text-gray-700">Deadline: <span className="font-semibold text-purple-750">{new Date(ann.registrationEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
                  </div>
                  {ann.feeType && ann.feeType !== 'Free' ? (
                    <div className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-amber-500 shrink-0" />
                      <p className="text-[11px] text-gray-700">Fee: <span className="font-semibold text-amber-700">{ann.feeType}</span> {ann.feeAmount ? `(₹${ann.feeAmount})` : ''}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <p className="text-[11px] text-emerald-700 font-bold">Free Registration</p>
                    </div>
                  )}
                  {ann.collectionPoint && (
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-500 shrink-0" />
                      <p className="text-[11px] text-gray-700">Hub: <span className="font-semibold text-indigo-750">{ann.collectionPoint}</span></p>
                    </div>
                  )}
                </div>

                {isRegistering === ann.id ? (
                  <div className="border-t pt-5 space-y-5">
                    <div className="flex items-center justify-between border-b pb-2 mb-2">
                      <h5 className="font-bold text-paa-navy text-sm">Campaign Delivery & Contact Details</h5>
                      <button onClick={() => { setIsRegistering(null); setSelectedBooks([]); }} className="p-1 text-red-500 hover:bg-red-50 rounded-full"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/40 p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-4 animate-in fade-in duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Expected Collection Date</span>
                          <div className="text-gray-900 font-semibold text-xs flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>
                              {ann.expectedCollectionDate ? (() => {
                                const clean = ann.expectedCollectionDate.split('T')[0];
                                const d = new Date(clean);
                                return isNaN(d.getTime()) ? clean : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                              })() : 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Contact Person</span>
                          <div className="text-gray-900 font-semibold text-xs flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span>{ann.contactPerson || 'N/A'}</span>
                            </div>
                            {ann.contactNumber && (
                              <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                                <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span>{ann.contactNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Delivery Address</span>
                          <div className="text-gray-900 font-semibold text-xs flex items-start gap-2 leading-relaxed">
                            <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>
                              {ann.dispatchAddress || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-paa-navy text-sm">1. Select Books & Quantities</h5>
                    </div>
                    {authorBooks.length === 0 ? (
                      <p className="text-xs text-red-500 bg-red-50 border border-red-100 p-3 rounded-lg font-medium">You don't have any approved books in the catalog yet. Only approved books can be donated.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto mb-4 p-2 bg-gray-50 rounded-xl border border-gray-200">
                        {authorBooks.map(book => {
                          const isSelected = selectedBooks.some(b => b.bookId === book.id);
                          return (
                            <div key={book.id} className={`flex justify-between items-center bg-white p-3 rounded-lg border transition-colors ${isSelected ? 'border-paa-navy shadow-sm' : 'border-gray-200'}`}>
                              <div className="flex items-center gap-3 min-w-0">
                                <BookOpen className={`w-4 h-4 ${isSelected ? 'text-paa-navy' : 'text-gray-400'} shrink-0`} />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-semibold text-paa-navy truncate" title={book.title}>{book.title}</span>
                                  <span className="text-[10px] text-gray-400 font-bold">Stock: {book.stock}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Qty:</span>
                                <input 
                                  type="number" 
                                  min="0" 
                                  max={book.stock}
                                  placeholder="0"
                                  className="w-16 p-1 text-xs border rounded-lg text-center font-bold focus:border-paa-navy focus:ring-1 focus:ring-paa-navy outline-none"
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    if (val > book.stock) {
                                      toast.error(`Cannot donate more than available stock (${book.stock}) for "${book.title}"`);
                                      e.target.value = book.stock.toString();
                                      handleBookSelect(book.id, book.stock.toString());
                                    } else {
                                      handleBookSelect(book.id, e.target.value);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Fee and QR code payment scanner */}
                    {calculateFee(ann) > 0 && (
                      <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-5 space-y-4">
                        <div className="flex justify-between items-center border-b border-amber-200/50 pb-2">
                          <div className="text-xs font-bold text-amber-800 uppercase tracking-widest">2. Pay Application Fee</div>
                          <div className="text-base font-bold text-amber-900">Total: ₹{calculateFee(ann)}</div>
                        </div>

                        {ann.feeType === 'Pay As You Wish' && (
                          <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-amber-200">
                            <span className="text-xs font-bold text-amber-800">Enter custom donation amount:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-gray-400">₹</span>
                              <input 
                                type="number" 
                                min="1"
                                value={payAsYouWishAmount || ''}
                                onChange={e => setPayAsYouWishAmount(parseInt(e.target.value) || 0)}
                                className="w-20 p-1 text-xs border rounded text-right border-gray-300 focus:border-paa-navy outline-none font-bold"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col items-center py-2 bg-white rounded-xl border border-amber-100 shadow-sm">
                          <div className="p-1 bg-white border border-gray-100 rounded-lg shadow-sm">
                            <img src={qrCode} alt="Payment QR" className="w-36 h-36 object-cover rounded" />
                          </div>
                          <p className="text-[10px] font-bold tracking-widest text-paa-navy bg-paa-gold/20 px-3 py-1 rounded-full mt-2 uppercase">Scan to pay via UPI</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Transaction ID *</label>
                            <input 
                              type="text" 
                              required 
                              placeholder="UPI Ref No." 
                              value={transactionId} 
                              onChange={e => setTransactionId(e.target.value)} 
                              className="w-full bg-white border border-gray-300 p-2 rounded-lg text-xs font-semibold focus:border-paa-navy outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Screenshot *</label>
                            <div 
                              onClick={() => document.getElementById(`screenshot-uploader-${ann.id}`)?.click()}
                              className="border border-dashed border-gray-300 rounded-lg p-2.5 text-center bg-white hover:bg-gray-50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[52px]"
                            >
                              {paymentScreenshotUrl ? (
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">✓ Screenshot Attached</span>
                              ) : (
                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Upload className="w-3 h-3" /> Upload File</span>
                              )}
                            </div>
                            <input 
                              type="file" 
                              id={`screenshot-uploader-${ann.id}`}
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setPaymentBlob(file);
                                  setPaymentScreenshotUrl(URL.createObjectURL(file));
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-2 pt-3 border-t">
                      <button onClick={() => { setIsRegistering(null); setSelectedBooks([]); setTransactionId(''); setPaymentBlob(null); setPaymentScreenshotUrl(null); }} disabled={isProcessingPayment} className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
                      <button 
                        onClick={() => handleRegister(ann)}
                        disabled={selectedBooks.length === 0 || isProcessingPayment}
                        className="px-5 py-2 bg-paa-navy text-white rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-indigo-950 active:scale-95 flex items-center gap-2 shadow-sm transition-all"
                      >
                        {isProcessingPayment ? 'Processing...' : calculateFee(ann) > 0 ? `Pay ₹${calculateFee(ann)} & Register` : 'Register Donation'}
                      </button>
                    </div>
                  </div>
                ) : hasParticipated ? (
                  <button 
                    onClick={() => setSelectedDetailRegistration(registration)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition-all shadow-xs active:scale-95 text-center text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✓ Participated (Details)</span>
                  </button>
                ) : ann.visibility === 'Closed' ? (
                  <button 
                    disabled
                    className="w-full py-2 bg-gray-250 border border-gray-300 text-gray-500 font-bold rounded-xl cursor-not-allowed text-center text-xs tracking-wide shadow-inner"
                  >
                    Campaign Closed
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsRegistering(ann.id)}
                    className="w-full py-2 bg-paa-navy hover:bg-indigo-900 border-0 text-white font-extrabold rounded-xl transition-all shadow-xs active:scale-95 text-xs text-center"
                  >
                    Register / Donate Books
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>

        {filteredAnnouncements.length > 10 && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setShowAllCampaigns(!showAllCampaigns)}
              className="px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-paa-navy font-bold rounded-full shadow-sm transition-all flex items-center gap-2 text-sm"
            >
              {showAllCampaigns ? (
                <>Show Less <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>View All Campaigns ({filteredAnnouncements.length}) <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Donation History Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-paa-navy font-serif">Donation History & Tracker</h3>
            <p className="text-xs text-gray-500 mt-1">Real-time status updates of your library submissions</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search history..."
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 text-xs font-semibold outline-none focus:border-paa-navy transition-colors w-full rounded-full shadow-sm text-gray-700"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap min-w-max">
            <thead className="bg-indigo-50 border-b-2 border-indigo-100">
              <tr>
                <th className="p-4 !text-[14px] font-bold uppercase tracking-wider !text-indigo-800 !bg-transparent">Date</th>
                <th className="p-4 !text-[14px] font-bold uppercase tracking-wider !text-indigo-800 !bg-transparent">Campaign / Library</th>
                <th className="p-4 !text-[14px] font-bold uppercase tracking-wider !text-indigo-800 !bg-transparent">Book Details</th>
                <th className="p-4 text-center !text-[14px] font-bold uppercase tracking-wider !text-indigo-800 !bg-transparent">Qty &amp; Value</th>
                <th className="p-4 text-right !text-[14px] font-bold uppercase tracking-wider !text-indigo-800 !bg-transparent">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHistoryRegistrations.map((reg: any, index: number) => {
                const isEven = index % 2 === 0;
                const totalBooksQty = reg.books?.reduce((sum: number, b: any) => sum + (b.quantityDonated || 0), 0) || 0;
                return (
                  <tr 
                    key={reg.id} 
                    className={`${isEven ? 'bg-white' : 'bg-[#F4ECE1]'} hover:bg-[#EBDCCB] transition-colors`}
                  >
                    <td className="p-4 text-sm text-gray-600">{new Date(reg.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="p-4">
                      <div className="text-sm font-semibold text-paa-navy">{reg.announcement?.title}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {reg.announcement?.library?.name} ({reg.announcement?.library?.city})</div>
                    </td>
                    <td className="p-4 whitespace-normal max-w-xs">
                      <div className="flex flex-col gap-1.5">
                        {reg.books?.map((b: any, bi: number) => (
                          <div key={bi} className="text-xs bg-white/70 border border-gray-150 p-1.5 rounded-lg flex justify-between items-center gap-3 shadow-xs">
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-gray-800 truncate" title={b.book?.title}>{b.book?.title}</span>
                              <span className="text-[10px] text-gray-400 mt-0.5">MRP: ₹{b.book?.mrp}</span>
                            </div>
                            <span className="text-[11px] font-bold text-gray-600 bg-gray-100/80 px-2 py-0.5 rounded-md shrink-0">
                              Qty: {b.quantityDonated}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                       <div className="text-sm font-extrabold text-paa-navy">{totalBooksQty} copies</div>
                       <div className="text-[11px] font-bold text-gray-500 mt-0.5">₹{(reg.books?.reduce((sum: number, b: any) => sum + ((b.quantityDonated || 0) * (b.book?.mrp || 0)), 0) || 0).toLocaleString('en-IN')}</div>
                    </td>
                    <td className="p-4 text-sm text-right">
                      {reg.status !== 'Approved' ? (
                        <button
                          onClick={() => handleDeleteRegistration(reg.id)}
                          className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1 font-bold text-xs shadow-sm"
                          title="Delete Donation Registration"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1 select-none">Verified</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredHistoryRegistrations.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 text-sm">
                    {historySearchTerm ? 'No donation records match your search' : 'You haven\'t made any library donations yet. Active campaigns will appear above.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDetailRegistration && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h4 className="text-lg font-bold text-paa-navy font-serif">Donation Details</h4>
                <p className="text-xs text-gray-500 mt-1">{selectedDetailRegistration.announcement?.title}</p>
              </div>
              <button 
                onClick={() => setSelectedDetailRegistration(null)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Status Section */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Status</span>
                  <span className={`px-2.5 py-1 text-[11px] font-extrabold rounded-full border ${getPipelineStatus(selectedDetailRegistration).color}`}>
                    {getPipelineStatus(selectedDetailRegistration).label}
                  </span>
                </div>
                <div className="text-right sm:text-left">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Registered Date</span>
                  <span className="text-xs font-semibold text-gray-700">
                    {new Date(selectedDetailRegistration.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Delivery and Contacts */}
              <div className="grid grid-cols-1 gap-4">
                <div className="border border-gray-100 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Collection Point / Hub</span>
                  <div className="text-gray-900 font-semibold text-xs flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{selectedDetailRegistration.announcement?.collectionPoint || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Books Donated list */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Books Donated</span>
                <div className="space-y-2">
                  {selectedDetailRegistration.books?.map((b: any, index: number) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-4 h-4 text-paa-navy shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-paa-navy">{b.book?.title}</span>
                          <span className="text-[10px] text-gray-400">MRP: ₹{b.book?.mrp}</span>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1 rounded-lg">
                        Qty: {b.quantityDonated}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Quantity & Value Summary */}
              {(() => {
                const totalQty = selectedDetailRegistration.books?.reduce((sum: number, b: any) => sum + (b.quantityDonated || 0), 0) || 0;
                const totalAmt = selectedDetailRegistration.books?.reduce((sum: number, b: any) => sum + ((b.quantityDonated || 0) * (b.book?.mrp || 0)), 0) || 0;
                
                return (
                  <div className="bg-paa-navy/5 border border-paa-navy/10 p-4 rounded-xl grid grid-cols-2 gap-4">
                    <div className="text-center border-r border-paa-navy/10">
                      <span className="text-[10px] font-bold text-paa-navy/60 uppercase tracking-widest block mb-1">Total Books Donated</span>
                      <span className="text-sm font-extrabold text-paa-navy">{totalQty} copies</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-paa-navy/60 uppercase tracking-widest block mb-1">Total Value (MRP)</span>
                      <span className="text-sm font-extrabold text-paa-navy">₹{totalAmt.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Fee Receipt if any */}
              {selectedDetailRegistration.paymentScreenshot && (
                <div className="border border-amber-100 bg-amber-50/10 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block">Application Fee Payment</span>
                      <span className="text-xs text-amber-900 font-medium">Transaction ID: <span className="font-semibold font-mono">{selectedDetailRegistration.transactionId || 'N/A'}</span></span>
                    </div>
                  </div>
                  <button 
                    onClick={() => window.open(`${API}${selectedDetailRegistration.paymentScreenshot}`, '_blank')}
                    className="dash-btn bg-amber-500 text-white hover:bg-amber-600 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer"
                  >
                    <span>View Receipt</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button 
                onClick={() => setSelectedDetailRegistration(null)}
                className="px-5 py-2.5 bg-paa-navy hover:bg-indigo-950 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

