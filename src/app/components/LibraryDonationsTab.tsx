import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
// exceljs and file-saver are dynamically imported inside export handlers
import { Download, Edit, Trash2, Megaphone, MapPin, Search, Calendar, Package, Plus, X, List, CheckCircle, CheckCircle2, XCircle, FileDown, BookOpen, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, LabelList } from 'recharts';
import FocusTrap from 'focus-trap-react';

export function LibraryDonationsTab() {
  const [drives, setDrives] = useState<any[]>([]);
  const [libraries, setLibraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isLibraryMasterOpen, setIsLibraryMasterOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedDriveBreakdown, setSelectedDriveBreakdown] = useState<any>(null);
  const [driveSearch, setDriveSearch] = useState('');
  const [driveStatusFilter, setDriveStatusFilter] = useState<'All' | 'Open' | 'Closed'>('All');
  const [graphFilter, setGraphFilter] = useState<'both' | 'books' | 'authors'>('both');
  const [donationTimeFilter, setDonationTimeFilter] = useState<string>('All');
  const [showArchivedDrives, setShowArchivedDrives] = useState(false);

  // Editing States
  const [editingDrive, setEditingDrive] = useState<any>(null);
  const [editingLib, setEditingLib] = useState<any>(null);

  // Registry/Authors State
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [registrySearch, setRegistrySearch] = useState('');

  // Logs State
  const [globalLogs, setGlobalLogs] = useState<any[]>([]);
  const [logsSearch, setLogsSearch] = useState('');

  // Manual Registration State
  const [adminAuthors, setAdminAuthors] = useState<any[]>([]);
  const [isManualRegOpen, setIsManualRegOpen] = useState(false);
  const [manualRegAuthorSearch, setManualRegAuthorSearch] = useState('');
  const [manualRegAuthorId, setManualRegAuthorId] = useState<number | null>(null);
  const [manualRegBooks, setManualRegBooks] = useState<{ bookId: number, qty: number }[]>([]);
  const [manualRegFeePaid, setManualRegFeePaid] = useState<number>(0);
  const [manualRegPaymentStatus, setManualRegPaymentStatus] = useState('Completed');
  const [selectedAirportId, setSelectedAirportId] = useState('');
  const [editingAuthorReg, setEditingAuthorReg] = useState<any>(null);
  const [granularData, setGranularData] = useState<any[]>([]);

  // Temporary State for Modal Logic
  const [currentFeeType, setCurrentFeeType] = useState('Free');
  const [breakdownTab, setBreakdownTab] = useState<'All' | 'Registered' | 'NotRegistered'>('All');
  const [expandedAuthorId, setExpandedAuthorId] = useState<number | null>(null);

  // Stats Overrides States
  const [statsOverrides, setStatsOverrides] = useState<any>({ drivesOverride: null, booksOverride: null, authorsOverride: null, librariesOverride: null });
  const [isEditingStats, setIsEditingStats] = useState(false);
  const [overrideDrives, setOverrideDrives] = useState<any>('');
  const [overrideBooks, setOverrideBooks] = useState<any>('');
  const [overrideAuthors, setOverrideAuthors] = useState<any>('');
  const [overrideLibraries, setOverrideLibraries] = useState<any>('');

  const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

  const getPipelineStatus = (reg: any) => {
    if (reg.status === 'Rejected') {
      return {
        step: 0,
        label: 'Rejected',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        description: 'Registration declined'
      };
    }
    
    // Step 4: Received at Library
    if (
      reg.status === 'Approved' && 
      (reg.receivedStatus === 'Received' || reg.receivedStatus === 'Delivered' || reg.dispatchStatus === 'Delivered')
    ) {
      return {
        step: 4,
        label: 'Received at Library',
        color: 'bg-[#ebd8c0] text-emerald-700 border-emerald-200',
        description: 'Books confirmed and received at library'
      };
    }

    // Step 3: Dispatched
    if (reg.status === 'Approved' && reg.dispatchStatus === 'Dispatched') {
      return {
        step: 3,
        label: 'Dispatched',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        description: 'Books in transit to library'
      };
    }

    // Step 2: Collected (Received to the person who is collecting / hub)
    if (reg.status === 'Approved' && reg.dispatchStatus === 'Received at Hub') {
      return {
        step: 2,
        label: 'Collected / Received at Hub',
        color: 'bg-sky-50 text-sky-700 border-sky-200',
        description: 'Books collected and received at hub'
      };
    }

    // Between Step 1 and Step 2 (Approved but dispatchStatus is Pending)
    if (reg.status === 'Approved' && reg.dispatchStatus === 'Pending') {
      return {
        step: 1.5,
        label: 'Awaiting Collection',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        description: 'Approved! Awaiting collection by hub'
      };
    }

    // Step 1: Verification
    return {
      step: 1,
      label: 'Awaiting Verification',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      description: 'Awaiting admin verification'
    };
  };

  const fetchStatsOverrides = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/library-stats-overrides`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setStatsOverrides(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveStatsOverrides = async () => {
    try {
      const res = await axios.post(`${API}/api/admin/library-stats-overrides`, {
        drivesOverride: overrideDrives === '' ? null : overrideDrives,
        booksOverride: null,
        authorsOverride: overrideAuthors === '' ? null : overrideAuthors,
        librariesOverride: overrideLibraries === '' ? null : overrideLibraries
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setStatsOverrides(res.data);
      setIsEditingStats(false);
      toast.success('Library stats overrides updated');
    } catch (err) {
      toast.error('Failed to save stats overrides');
    }
  };

  // Specific Drive Overrides States
  const [isEditingDriveStats, setIsEditingDriveStats] = useState(false);
  const [overrideDriveAuthors, setOverrideDriveAuthors] = useState<any>('');
  const [overrideDriveBooks, setOverrideDriveBooks] = useState<any>('');
  const [overrideDriveDispatched, setOverrideDriveDispatched] = useState<any>('');

  const handleSaveDriveStatsOverrides = async () => {
    if (!selectedDriveBreakdown) return;
    try {
      const res = await axios.post(`${API}/api/admin/library-stats-overrides/drive/${selectedDriveBreakdown.id}`, {
        authorsOverride: overrideDriveAuthors === '' ? null : overrideDriveAuthors,
        booksOverride: overrideDriveBooks === '' ? null : overrideDriveBooks,
        dispatchedOverride: null
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setStatsOverrides(res.data);
      setIsEditingDriveStats(false);
      toast.success('Campaign stats overrides updated');
    } catch (err) {
      toast.error('Failed to save campaign stats overrides');
    }
  };

  const fetchLibraries = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/libraries`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setLibraries(res.data);
    } catch (err) { toast.error('Failed to fetch libraries'); }
  };

  const fetchDrives = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/donation-announcements`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setDrives(res.data);
    } catch (err) { toast.error('Failed to fetch donation drives'); }
    setLoading(false);
  };

  const fetchRegistrations = async (driveId: number) => {
    try {
      const res = await axios.get(`${API}/api/admin/donation-registrations?announcementId=${driveId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setRegistrations(res.data);
    } catch (err) { toast.error('Failed to fetch registrations for this drive'); }
  };

  const fetchGlobalLogs = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/donation-registrations`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setGlobalLogs(res.data);
    } catch (err) { toast.error('Failed to fetch global logs'); }
  };

  const fetchAuthors = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/authors?limit=10000`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setAdminAuthors(res.data.data || res.data);
    } catch (err) { }
  };

  useEffect(() => {
    fetchLibraries();
    fetchDrives();
    fetchGlobalLogs();
    fetchAuthors();
    fetchStatsOverrides();
  }, []);


  // --- DRIVE FORM HANDLER ---
  const handleSaveDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(fd.entries());

    // Formatting dates
    ['eventDate', 'announcementDate', 'expectedDispatchDate', 'registrationStartDate', 'registrationEndDate', 'expectedCollectionDate'].forEach(f => {
      if (data[f]) data[f] = new Date(data[f] as string).toISOString();
      else delete data[f]; // If empty, don't send empty string
    });

    // Auto-fill removed dates so backend validation passes
    const today = new Date().toISOString();
    if (!data.announcementDate) data.announcementDate = today;
    if (!data.registrationStartDate) data.registrationStartDate = today;
    if (!data.registrationEndDate) data.registrationEndDate = data.expectedDispatchDate || today;
    if (!data.expectedCollectionDate) data.expectedCollectionDate = data.expectedDispatchDate || today;

    data.libraryId = parseInt(data.libraryId as string) as any;
    if (data.feeAmount) data.feeAmount = parseInt(data.feeAmount as string) as any;

    try {
      if (editingDrive) {
        await axios.put(`${API}/api/admin/donation-announcements/${editingDrive.id}`, data, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        toast.success('Donation Drive updated');
      } else {
        await axios.post(`${API}/api/admin/donation-announcements`, data, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        toast.success('Donation Drive created');
      }
      setIsDriveModalOpen(false);
      setEditingDrive(null);
      fetchDrives();
    } catch (err) { toast.error('Failed to save drive'); }
  };

  // --- MANUAL REGISTRATION HANDLER ---
  const handleManualRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRegAuthorId || manualRegBooks.length === 0) {
      toast.error('Please select an author and at least one book');
      return;
    }

    try {
      await axios.post(`${API}/api/admin/donation-registrations/manual`, {
        announcementId: selectedDriveBreakdown.id,
        authorId: manualRegAuthorId,
        books: manualRegBooks.map(b => ({ bookId: b.bookId, quantityDonated: b.qty })),
        feePaid: manualRegFeePaid,
        paymentStatus: manualRegPaymentStatus
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

      toast.success('Manual registration added successfully');
      setIsManualRegOpen(false);
      setManualRegAuthorId(null);
      setManualRegBooks([]);
      setManualRegFeePaid(0);
      setManualRegPaymentStatus('Completed');
      fetchRegistrations(selectedDriveBreakdown.id);
      fetchGlobalLogs();
    } catch (err) {
      toast.error('Failed to add manual registration');
    }
  };

  // --- LIBRARY FORM HANDLER ---
  const handleSaveLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(fd.entries()) as any;
    data.name = data.libName; delete data.libName; // Map form name to DB name
    if (!data.country) data.country = 'India'; // Auto-fill required field

    try {
      if (editingLib) {
        await axios.put(`${API}/api/admin/libraries/${editingLib.id}`, data, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        toast.success('Library updated');
      } else {
        await axios.post(`${API}/api/admin/libraries`, data, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        toast.success('Library added');
      }
      setEditingLib(null);
      fetchLibraries();
    } catch (err) { toast.error('Failed to save library'); }
  };

  const handleDeleteLibrary = async (id: number) => {
    if (!window.confirm('Delete this library?')) return;
    try {
      await axios.delete(`${API}/api/admin/libraries/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success('Library deleted');
      fetchLibraries();
    } catch (err) { toast.error('Failed to delete library'); }
  };

  const handleDeleteRegistration = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this registration? This will restore the author's book inventory stock.")) return;
    try {
      await axios.delete(`${API}/api/author/donation-registrations/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Registration deleted successfully');
      if (selectedDriveBreakdown) {
        fetchRegistrations(selectedDriveBreakdown.id);
      }
      fetchGlobalLogs();
      fetchAuthors();
    } catch (err) {
      toast.error('Failed to delete registration');
    }
  };

  // --- REGISTRY HANDLERS ---
  const updateRegistrationStatus = async (id: number, status: string) => {
    try {
      await axios.patch(`${API}/api/admin/donation-registrations/${id}/status`, { status }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success('Status updated');
      fetchRegistrations(selectedDriveBreakdown.id);
      fetchGlobalLogs();
    } catch (err) { toast.error('Update failed'); }
  };

  const updateDispatchDetails = async (id: number, dispatchStatus: string, courierPartner: string, trackingNumber: string) => {
    try {
      await axios.patch(`${API}/api/admin/donation-registrations/${id}/dispatch`, { dispatchStatus, courierPartner, trackingNumber }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success('Dispatch details updated');
      fetchRegistrations(selectedDriveBreakdown.id);
      fetchGlobalLogs();
    } catch (err) { toast.error('Update failed'); }
  };

  const updateReceivedStatus = async (id: number, receivedStatus: string) => {
    try {
      await axios.patch(`${API}/api/admin/donation-registrations/${id}/dispatch`, { receivedStatus }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success('Received status updated');
      fetchRegistrations(selectedDriveBreakdown.id);
      fetchGlobalLogs();
    } catch (err) { toast.error('Update failed'); }
  };

  const handleDeleteDrive = async (id: number) => {
    if (!window.confirm('Archive this donation drive?')) return;
    try {
      await axios.delete(`${API}/api/admin/donation-announcements/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success('Donation drive archived');
      fetchDrives();
    } catch (err) { toast.error('Failed to archive drive'); }
  };

  const handleRestoreDrive = async (id: number) => {
    if (!window.confirm('Restore this donation drive?')) return;
    try {
      await axios.put(`${API}/api/admin/donation-announcements/${id}/restore`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success('Donation drive restored');
      fetchDrives();
    } catch (err) { toast.error('Failed to restore drive'); }
  };

  const publishCampaign = async (id: number) => {
    try {
      await axios.post(`${API}/api/admin/donation-announcements/${id}/publish-all`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success('Campaign published to all authors!');
      fetchDrives();
    } catch (err) {
      toast.error('Failed to publish campaign');
    }
  };

  const unpublishCampaign = async (id: number) => {
    try {
      await axios.post(`${API}/api/admin/donation-announcements/${id}/unpublish`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success('Campaign unpublished!');
      fetchDrives();
    } catch (err) {
      toast.error('Failed to unpublish campaign');
    }
  };

  const handlePublishData = async (regId: number) => {
    try {
      await axios.post(`${API}/api/admin/donation-registrations/${regId}/publish`, {
        registrationStatus: editingAuthorReg?.status,
        paymentStatus: editingAuthorReg?.paymentStatus,
        receivedStatus: 'Received',
        useGlobalOverride: false, // Explicitly false as per user preference
        booksData: granularData.map((b: any) => ({
          ...b,
          libraryConfirmation: 'Confirmed'
        }))
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success('Donation data saved and published to author!');
      setEditingAuthorReg(null);
      if (selectedDriveBreakdown) {
        fetchRegistrations(selectedDriveBreakdown.id);
      }
    } catch (err) {
      toast.error('Failed to publish author data');
    }
  };

  const handleExportGlobalRegistry = async () => {
    // Collect all authors who participated in any drive
    const allAuthorsMap = new Map();
    globalLogs.forEach((log: any) => {
      if (!allAuthorsMap.has(log.authorId)) {
        allAuthorsMap.set(log.authorId, {
          id: log.authorId,
          name: log.author?.name || 'Unknown',
          city: log.author?.city || 'Unknown',
          regDate: log.author?.createdAt || '',
          drives: {}
        });
      }
      const authorData = allAuthorsMap.get(log.authorId);

      const driveId = log.announcementId;
      if (!authorData.drives[driveId]) {
        authorData.drives[driveId] = { participated: 'Yes', totalBooks: 0 };
      }
      const driveBooks = log.books?.reduce((acc: number, b: any) => acc + (b.quantityDonated || 0), 0) || 0;
      authorData.drives[driveId].totalBooks += driveBooks;
    });

    const authors = Array.from(allAuthorsMap.values());
    if (authors.length === 0) {
      toast.error('No registry records found to export');
      return;
    }

    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Global Registry');

    const totalCols = 5 + drives.length;
    const getColLetter = (n: number) => {
      let result = '';
      while (n > 0) {
        let m = (n - 1) % 26;
        result = String.fromCharCode(65 + m) + result;
        n = Math.floor((n - m) / 26);
      }
      return result;
    };
    const lastColLetter = getColLetter(totalCols);

    // Title Row
    sheet.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'PUNE AUTHORS ASSOCIATION - LIBRARY DONATION GLOBAL REGISTRY';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2A4B6B' } }; // Deep Steel Blue
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Subtitle Row
    sheet.mergeCells(`A2:${lastColLetter}2`);
    const subtitleCell = sheet.getCell('A2');
    const todayStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    subtitleCell.value = `Report Type: Ecosystem Global Registry Summary  |  Total Registered Authors: ${authors.length}  |  Generated: ${todayStr}`;
    subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FFFFFFFF' } };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B6290' } }; // Muted Blue
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;

    // Blank row
    sheet.addRow([]);

    // Table Headers
    const headers = ['Author Name', 'City', 'Registration Date', 'Drives Participated'];
    drives.forEach(d => {
      const dateObj = new Date(d.expectedDispatchDate || d.eventDate || d.createdAt);
      const monthName = dateObj.toLocaleDateString('en-IN', { month: 'short' });
      const yearTwoDigits = dateObj.getFullYear().toString().slice(-2);
      const monthStr = `${monthName} ${yearTwoDigits}`;
      const driveLabel = `${d.library?.name || 'Library'} (${monthStr})`;
      headers.push(driveLabel);
    });
    headers.push('Total Books Donated');

    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', bold: true, color: { argb: '000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Bright Yellow
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Populate rows
    authors.forEach((a: any) => {
      const drivesParticipated = Object.keys(a.drives).length;
      const totalBooks = Object.values(a.drives).reduce((sum: number, d: any) => sum + d.totalBooks, 0);
      
      const formattedRegDate = a.regDate 
        ? new Date(a.regDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'N/A';

      const rowData = [
        a.name,
        a.city,
        formattedRegDate,
        drivesParticipated
      ];

      drives.forEach(d => {
        const driveData = a.drives[d.id];
        rowData.push(driveData ? driveData.totalBooks : 0);
      });

      rowData.push(totalBooks);

      const newRow = sheet.addRow(rowData);
      newRow.height = 20;

      newRow.eachCell((cell, colNumber) => {
        // Border (Thin Black)
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } }
        };

        cell.font = { name: 'Arial', size: 10, color: { argb: '000000' } };

        // Alignments & Colors
        let colBgColor = 'FFFFFF';
        if (colNumber === 1) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          colBgColor = 'FF8B8B'; // Solid light red
        } else if (colNumber === 2) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          colBgColor = 'FFD2A3'; // Solid light orange
        } else if (colNumber === 3) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          colBgColor = 'D4D8DD'; // Solid light gray/slate
        } else if (colNumber === 4) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          colBgColor = 'B3E5FC'; // Solid light cyan
        } else if (colNumber === totalCols) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          colBgColor = 'C8E6C9'; // Solid light green for the total column
        } else {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          colBgColor = 'E1BEE7'; // Solid light purple for drive details
        }

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colBgColor } };
      });
    });

    // Auto-fit Columns (avoiding title length)
    sheet.columns.forEach((column, colIndex) => {
      let maxLen = 10;
      column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber > 3 && cell.value) { // Skip title/subtitle/blank rows
          const len = cell.value.toString().length;
          if (len > maxLen) maxLen = len;
        }
      });
      column.width = Math.min(maxLen + 4, 45);
    });

    // Buffer and Save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `airport_donation_registry_global_${todayStr.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleExportCampaignReport = () => {
    if (!selectedDriveBreakdown) return;

    const driveNameStr = (selectedDriveBreakdown.library?.name || selectedDriveBreakdown.campaignName || "").toLowerCase();
    let staticFile = null;
    if (driveNameStr.includes("kolkata")) staticFile = "KolkataAirport (2).xlsx";
    else if (driveNameStr.includes("mangalor")) staticFile = "MangalorAirport (1).xlsx";
    else if (driveNameStr.includes("pune")) staticFile = "PuneAirport (1).xlsx";
    else if (driveNameStr.includes("thiruvananthapuram")) staticFile = "THIRUVANANTHAPURAM AIRPORT (1).xlsx";

    if (staticFile) {
        const aLink = document.createElement('a');
        aLink.href = `/Airports/${staticFile}`;
        aLink.download = staticFile;
        document.body.appendChild(aLink);
        aLink.click();
        document.body.removeChild(aLink);
        return;
    }

    let csvContent = 'Author Name,Library Name,Book Title,Genre,Qty Committed,Qty Collected,Qty Dispatched,Qty Received,Pending Qty,Library Confirmation Status,Donation Value (MRP)\n';

    registrations.forEach((reg: any) => {
      const authorName = reg.author?.name || 'Unknown';
      const libName = selectedDriveBreakdown.library?.name || 'Unknown';

      reg.books.forEach((b: any) => {
        const title = b.book?.title?.replace(/,/g, ' ') || 'Unknown';
        const genre = b.book?.genre || 'Unknown';
        const committed = b.quantityDonated || 0;
        const collected = b.qtyCollected || 0;
        const dispatched = b.qtyDispatched || 0;
        const received = b.qtyReceived || 0;
        const pending = committed - received;
        const conf = b.libraryConfirmation || 'Pending';
        const val = (b.book?.mrp || 0) * committed;

        csvContent += `"${authorName}","${libName}","${title}","${genre}",${committed},${collected},${dispatched},${received},${pending},${conf},${val}\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `campaign_report_${selectedDriveBreakdown.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAirportWiseReport = () => {
    let csvContent = 'Airport/Library Name,Total Participating Authors,Total Titles Donated,Total Books Received,Donation Value (MRP)\n';

    libraries.forEach(lib => {
      const libDrives = drives.filter(d => d.libraryId === lib.id);
      const libLogs = globalLogs.filter((log: any) => libDrives.some(d => d.id === log.announcementId));

      const totalAuthors = new Set(libLogs.map((l: any) => l.authorId)).size;
      let totalTitles = 0;
      let totalBooksReceived = 0;
      let totalValue = 0;

      libLogs.forEach((log: any) => {
        log.books?.forEach((b: any) => {
          totalTitles += 1;
          totalBooksReceived += (b.qtyReceived || 0);
          totalValue += (b.qtyReceived || 0) * (b.book?.mrp || 0);
        });
      });

      csvContent += `"${lib.name}",${totalAuthors},${totalTitles},${totalBooksReceived},${totalValue}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'airport_wise_donation_report.csv');
    document.body.appendChild(link);
    link.click();
  };
 
  const downloadAirportReport = async (airportId: number) => {
    const lib = libraries.find(l => l.id === airportId);
    if (!lib) return;

    const libDrives = drives.filter(d => d.libraryId === airportId);
    const libLogs = globalLogs.filter((log: any) => libDrives.some(d => d.id === log.announcementId));

    const uniqueMonths = new Set<string>();
    const bookDataMap = new Map<number, any>();

    libLogs.forEach((log: any) => {
      const driveDate = log.announcement?.expectedDispatchDate || log.announcement?.eventDate || log.createdAt;
      const dateObj = new Date(typeof driveDate === 'string' && !driveDate.includes('T') ? `${driveDate}T00:00:00` : driveDate);
      const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
      const yearTwoDigits = dateObj.getFullYear().toString().slice(-2);
      const monthKey = `${monthName} ${yearTwoDigits}`; // e.g. "Mar 26"

      uniqueMonths.add(monthKey);

      log.books?.forEach((b: any) => {
        if (!b.book) return;
        const bookId = b.bookId;
        const qty = b.quantityDonated || 0;
        
        if (!bookDataMap.has(bookId)) {
          const isChildrens = b.book.genre === "Children's Books";
          const childrensVal = isChildrens ? "Children's" : "";
          let genreVal = b.book.genre;
          if (isChildrens) {
            const subLower = (b.book.subGenre || '').toLowerCase();
            const isNonFiction = subLower.includes('science') || 
                                subLower.includes('biograph') || 
                                subLower.includes('math') || 
                                subLower.includes('knowledge') || 
                                subLower.includes('learning') || 
                                subLower.includes('alphabet') || 
                                subLower.includes('number') || 
                                subLower.includes('activity') || 
                                subLower.includes('coloring') || 
                                subLower.includes('puzzle') || 
                                subLower.includes('coding') || 
                                subLower.includes('words');
            genreVal = isNonFiction ? "Non-Fiction" : "Fiction";
          }

          bookDataMap.set(bookId, {
            title: b.book.title,
            childrens: childrensVal,
            genre: genreVal,
            authorName: log.author?.name || 'Unknown',
            monthlyQuantities: {},
            totalQuantity: 0
          });
        }

        const data = bookDataMap.get(bookId);
        data.monthlyQuantities[monthKey] = (data.monthlyQuantities[monthKey] || 0) + qty;
        data.totalQuantity += qty;
      });
    });

    const monthsArray = Array.from(uniqueMonths).sort((a, b) => {
      const parseDate = (str: string) => {
        const [m, y] = str.split(' ');
        const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
        return new Date(2000 + parseInt(y), months[m as keyof typeof months] || 0);
      };
      return parseDate(a).getTime() - parseDate(b).getTime();
    });

    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Airport Report');

    const totalCols = 6 + monthsArray.length;
    const getColLetter = (n: number) => {
      let result = '';
      while (n > 0) {
        let m = (n - 1) % 26;
        result = String.fromCharCode(65 + m) + result;
        n = Math.floor((n - m) / 26);
      }
      return result;
    };
    const lastColLetter = getColLetter(totalCols);

    // Title Row (Merged)
    sheet.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = sheet.getCell('A1');
    const airportLabel = (lib.name || 'AIRPORT').toUpperCase();
    titleCell.value = `LIST OF BOOKS FOR ${airportLabel} LIBRARY`;
    titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2A4B6B' } }; // Deep Steel Blue
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Table Headers
    const headers = [
      'S.No',
      'Book Title',
      'Children\'s',
      'Genre',
      'Author Name',
      ...monthsArray.map(m => `Quantity Sent in ${m}`),
      'Total No of Books Donated'
    ];
    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', bold: true, color: { argb: '000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Bright Yellow
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Populate data
    let sNo = 1;
    bookDataMap.forEach((data) => {
      const rowData = [
        sNo,
        data.title,
        data.childrens,
        data.genre,
        data.authorName,
        ...monthsArray.map(m => data.monthlyQuantities[m] || ''),
        data.totalQuantity
      ];
      const newRow = sheet.addRow(rowData);
      newRow.height = 20;

      newRow.eachCell((cell, colNumber) => {
        // Border (Thin Black)
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } }
        };

        cell.font = { name: 'Arial', size: 10, color: { argb: '000000' } };

        // Alignments
        if (colNumber === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 2) {
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        } else if (colNumber === 3 || colNumber === 4) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 5) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }

        // Distinct solid colors based on the reference:
        let colBgColor = 'FFFFFF';
        if (colNumber === 1) colBgColor = 'FF8B8B'; // Solid light red
        else if (colNumber === 2) colBgColor = 'FFD2A3'; // Solid light orange
        else if (colNumber === 3) colBgColor = 'FFFFFF'; // White
        else if (colNumber === 4) colBgColor = 'D4D8DD'; // Solid light gray/slate
        else if (colNumber === 5) colBgColor = 'B3E5FC'; // Solid light cyan
        else if (colNumber >= 6) colBgColor = 'C8E6C9';  // Solid light green for quantities & total

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colBgColor } };
      });

      sNo++;
    });

    // Auto-fit Columns (avoiding title length)
    sheet.columns.forEach((column, colIndex) => {
      let maxLen = 10;
      column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber > 1 && cell.value) { // Skip title row
          const len = cell.value.toString().length;
          if (len > maxLen) maxLen = len;
        }
      });
      // Cap book title column so wrapping makes it neat
      if (colIndex === 2) {
        column.width = Math.min(maxLen + 4, 35);
      } else {
        column.width = Math.min(maxLen + 4, 45);
      }
    });

    // Buffer and Save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${lib.name.toLowerCase().replace(/\s+/g, '_')}_donation_report.xlsx`);
  };

  const handleExportAuthorDonationReport = async () => {
    const authorLogsMap = new Map();
    globalLogs.forEach((log: any) => {
      if (!authorLogsMap.has(log.authorId)) {
        authorLogsMap.set(log.authorId, {
          name: log.author?.name || 'Unknown',
          campaigns: new Set(),
          libraries: new Set(),
          donatedTitles: new Set(),
          totalBooks: 0,
          totalValue: 0
        });
      }

      const authorData = authorLogsMap.get(log.authorId);
      authorData.campaigns.add(log.announcementId);

      const drive = drives.find((d: any) => d.id === log.announcementId);
      if (drive && drive.libraryId) {
        authorData.libraries.add(drive.libraryId);
      }

      log.books?.forEach((b: any) => {
        const qty = b.quantityDonated || 0;
        authorData.totalBooks += qty;
        authorData.totalValue += qty * (b.book?.mrp || 0);
        if (b.book?.title) {
          authorData.donatedTitles.add(b.book.title);
        }
      });
    });

    if (authorLogsMap.size === 0) {
      toast.error('No donation records found to export');
      return;
    }

    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Author Donations Report');

    // Title Row
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'PUNE AUTHORS ASSOCIATION - MASTER AUTHOR LIBRARY DONATION REPORT';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2A4B6B' } }; // Deep Steel Blue
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Subtitle Row
    sheet.mergeCells('A2:G2');
    const subtitleCell = sheet.getCell('A2');
    const todayStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    subtitleCell.value = `Report Type: Admin Master Summary  |  Total Participating Authors: ${authorLogsMap.size}  |  Generated: ${todayStr}`;
    subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FFFFFFFF' } };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B6290' } }; // Muted Blue
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;

    // Blank row
    sheet.addRow([]);

    // Table Headers (7 columns) - Bright Yellow with Black Text
    const headers = [
      'Author Name',
      'Donation Campaigns Participated',
      'Libraries Donated To',
      'Registered Book Titles (System)',
      'Donated Book Titles',
      'Total Books Donated',
      'Total Donation Value (MRP)'
    ];
    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', bold: true, color: { argb: '000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Bright Yellow
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Populate rows
    authorLogsMap.forEach((data: any, authorId: number) => {
      const systemAuthor = adminAuthors?.find((a: any) => a.id === authorId);
      const systemTitles = systemAuthor?.books?.map((b: any) => b.title) || [];
      const uniqueSystemTitles = Array.from(new Set(systemTitles));
      
      const systemTitlesStr = uniqueSystemTitles.join('\n');
      const donatedTitlesStr = Array.from(data.donatedTitles).join('\n');

      const rowData = [
        data.name,
        data.campaigns.size,
        data.libraries.size,
        systemTitlesStr,
        donatedTitlesStr,
        data.totalBooks,
        data.totalValue
      ];

      const newRow = sheet.addRow(rowData);

      newRow.eachCell((cell, colNumber) => {
        // Border
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } }
        };

        cell.font = { name: 'Arial', size: 10, color: { argb: '000000' } };

        // Alignment (vertical 'top' lets Excel auto-expand rows cleanly)
        if (colNumber === 1) {
          cell.alignment = { horizontal: 'left', vertical: 'top' };
        } else if (colNumber === 2 || colNumber === 3) {
          cell.alignment = { horizontal: 'right', vertical: 'top' };
        } else if (colNumber === 4 || colNumber === 5) {
          cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        } else {
          cell.alignment = { horizontal: 'right', vertical: 'top' };
        }

        // Distinct solid colors based on the reference:
        let colBgColor = 'FFFFFF';
        if (colNumber === 1) colBgColor = 'FF8B8B'; // Solid light red
        else if (colNumber === 2) colBgColor = 'FFD2A3'; // Solid light orange
        else if (colNumber === 3) colBgColor = 'D4D8DD'; // Solid light gray/slate
        else if (colNumber === 4) colBgColor = 'B3E5FC'; // Solid light cyan
        else if (colNumber === 5) colBgColor = 'C7D2FE'; // Solid light lavender/blue
        else if (colNumber === 6) colBgColor = 'C8E6C9'; // Solid light emerald green
        else if (colNumber === 7) colBgColor = 'E1BEE7'; // Solid light purple

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colBgColor } };
      });
    });

    // Auto-fit column widths (avoiding subtitle/title length)
    sheet.columns.forEach((column, colIndex) => {
      let maxLen = 12;
      column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber > 3 && cell.value) {
          const len = cell.value.toString().length;
          if (len > maxLen) maxLen = len;
        }
      });
      // Cap long text columns so wrapping makes it neat
      if (colIndex === 4 || colIndex === 5) {
        column.width = Math.min(maxLen + 4, 30);
      } else {
        column.width = Math.min(maxLen + 4, 45);
      }
    });

    // Buffer and Save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Admin_Author_Donations_Report_${todayStr.replace(/\s+/g, '_')}.xlsx`);
  };


  // ==========================================
  // RENDER: CREATE/EDIT DRIVE MODAL
  // ==========================================
  if (isDriveModalOpen) {
    return (
      <div className="bg-white rounded-xl shadow-premium p-8 border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <h3 className="text-2xl font-serif text-paa-navy">{editingDrive ? 'Edit Donation Drive' : 'Create New Donation Drive'}</h3>
          <button onClick={() => { setIsDriveModalOpen(false); setEditingDrive(null); setCurrentFeeType('Free'); }} className="dash-btn bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors shadow-sm">Cancel & Go Back</button>
        </div>
        <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
<form onSubmit={handleSaveDrive} className="space-y-6">
          <section>
            <h4 className="font-semibold text-paa-navy border-b pb-2 mb-3">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="dash-label">Title *</label>
                <input name="title" defaultValue={editingDrive?.title} required className="dash-input" />
              </div>
              <div className="md:col-span-1">
                <label className="dash-label">Select Library *</label>
                <select name="libraryId" defaultValue={editingDrive?.libraryId} required className="dash-input">
                  <option value="">-- Choose Library --</option>
                  {libraries.map(lib => (
                    <option key={lib.id} value={lib.id}>{lib.name} ({lib.city})</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="dash-label">Visibility</label>
                <select name="visibility" defaultValue={editingDrive?.visibility || 'Draft'} className="dash-input">
                  <option>Draft</option>
                  <option>Published</option>
                  <option>Closed</option>
                </select>
              </div>
              <div className="md:col-span-4">
                <label className="dash-label">Description *</label>
                <textarea name="description" defaultValue={editingDrive?.description} required className="dash-input resize-y" rows={2}></textarea>
              </div>
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-paa-navy border-b pb-2 mb-3">Timeline & Fees</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <label className="dash-label">Announcement Date</label>
                <input type="date" name="eventDate" defaultValue={editingDrive?.eventDate ? new Date(editingDrive.eventDate).toISOString().split('T')[0] : ''} className="dash-input" />
              </div>
              <div className="md:col-span-1">
                <label className="dash-label">Expected Dispatch *</label>
                <input type="date" name="expectedDispatchDate" defaultValue={editingDrive?.expectedDispatchDate ? new Date(editingDrive.expectedDispatchDate).toISOString().split('T')[0] : ''} required className="dash-input" />
              </div>
              <div className="md:col-span-1">
                <label className="dash-label">Expected Collection</label>
                <input type="date" name="expectedCollectionDate" defaultValue={editingDrive?.expectedCollectionDate ? new Date(editingDrive.expectedCollectionDate).toISOString().split('T')[0] : ''} className="dash-input" />
              </div>

              <div className="md:col-span-2 mt-4 md:mt-0">
                <label className="dash-label">Fee Structure</label>
                <select name="feeType" defaultValue={editingDrive?.feeType || 'Free'} className="dash-input" onChange={(e) => setCurrentFeeType(e.target.value)}>
                  <option>Free</option>
                  <option>Per Author</option>
                  <option>Per Title</option>
                  <option>Pay As You Wish</option>
                </select>
              </div>
              <div className="md:col-span-2 mt-4 md:mt-0">
                <label className="dash-label">Fee Amount (₹)</label>
                <input type="number" name="feeAmount" defaultValue={editingDrive?.feeAmount} min="0" className="dash-input" disabled={currentFeeType === 'Free' || currentFeeType === 'Pay As You Wish'} placeholder={currentFeeType === 'Free' ? "N/A" : currentFeeType === 'Pay As You Wish' ? "Determined by author" : "Enter fee"} />
              </div>
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-paa-navy border-b pb-2 mb-3">Shipping & Contact Info</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="dash-label">Contact Person *</label>
                <input name="contactPerson" defaultValue={editingDrive?.contactPerson} required className="dash-input" />
              </div>
              <div>
                <label className="dash-label">Contact Number *</label>
                <input name="contactNumber" defaultValue={editingDrive?.contactNumber} required className="dash-input" />
              </div>
              <div className="md:col-span-2">
                <label className="dash-label">Collection Point</label>
                <input name="collectionPoint" defaultValue={editingDrive?.collectionPoint} className="dash-input" />
              </div>
              <div className="md:col-span-2">
                <label className="dash-label">Dispatch Address *</label>
                <textarea name="dispatchAddress" defaultValue={editingDrive?.dispatchAddress} required className="dash-input" rows={2}></textarea>
              </div>
              <div className="md:col-span-2">
                <label className="dash-label">Additional Instructions</label>
                <textarea name="additionalInstructions" defaultValue={editingDrive?.additionalInstructions} className="dash-input" rows={2}></textarea>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <button type="submit" className="dash-btn dash-btn-primary min-w-[120px]">
              {editingDrive ? 'Update Drive Details' : 'Create Donation Drive'}
            </button>
          </div>
        </form>
</FocusTrap>
      </div>
    );
  }

  // ==========================================
  // RENDER: DRIVE BREAKDOWN (REGISTRY)
  // ==========================================
  if (selectedDriveBreakdown) {
    const totalAuthors = new Set(registrations.map(r => r.authorId)).size;
    const totalBooks = registrations.reduce((acc, r) => acc + r.books.reduce((sum: number, b: any) => sum + b.quantityDonated, 0), 0);
    const totalDispatched = new Set(registrations.filter(r => r.dispatchStatus === 'Dispatched' || r.dispatchStatus === 'Delivered').map(r => r.authorId)).size;

    return (
      <div className="bg-white rounded-none sm:rounded-xl shadow-sm py-4 sm:p-6 border-y sm:border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 border-b pb-4 gap-4 px-6 sm:px-0">
          <div>
            <h3 className="text-2xl font-serif text-paa-navy mb-1">{selectedDriveBreakdown.title}</h3>
            <p className="text-sm text-gray-500 font-medium">
              {selectedDriveBreakdown.library?.name} &bull; {selectedDriveBreakdown.library?.city}, {selectedDriveBreakdown.library?.state} &bull;
              Deadline: {new Date(selectedDriveBreakdown.registrationEndDate).toLocaleDateString()}
            </p>
            {selectedDriveBreakdown.description && (
              <p className="text-sm text-gray-600 mt-2 max-w-3xl leading-relaxed">{selectedDriveBreakdown.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportCampaignReport} className="dash-btn bg-[#ebd8c0] text-emerald-700 hover:bg-[#ebd8c0] border border-emerald-200 transition-colors shadow-sm flex items-center gap-2">
              <Download className="w-4 h-4" /> Download Report
            </button>
            <button onClick={() => {
              setSelectedDriveBreakdown(null);
              fetchDrives(); // Refresh drives list when going back
            }} className="dash-btn bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors shadow-sm">
              Back to Drives List
            </button>
          </div>
        </div>

        {/* Event Summary Heading & Edit Stats Button */}
        <div className="mb-2 flex justify-between items-center px-6 sm:px-0">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Event Summary</span>
          {isEditingDriveStats ? (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingDriveStats(false)}
                className="text-xs font-bold text-gray-500 border border-gray-300 bg-white hover:bg-gray-50 px-4 py-1.5 rounded-full transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDriveStatsOverrides}
                className="text-xs font-bold bg-paa-navy text-white px-4 py-1.5 rounded-full hover:bg-paa-navy/90 transition-colors active:scale-95"
              >
                Save Stats
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const curOverrides = statsOverrides.driveOverrides?.[selectedDriveBreakdown.id] || {};
                setOverrideDriveAuthors(curOverrides.authorsOverride !== undefined && curOverrides.authorsOverride !== null ? curOverrides.authorsOverride : totalAuthors);
                setOverrideDriveBooks(curOverrides.booksOverride !== undefined && curOverrides.booksOverride !== null ? curOverrides.booksOverride : totalBooks);
                setOverrideDriveDispatched(curOverrides.dispatchedOverride !== undefined && curOverrides.dispatchedOverride !== null ? curOverrides.dispatchedOverride : totalDispatched);
                setIsEditingDriveStats(true);
              }}
              className="text-xs font-bold text-paa-navy border border-paa-navy/20 bg-gray-50 hover:bg-paa-navy/5 px-4 py-1.5 rounded-full transition-colors"
            >
              Edit Stats
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 px-6 sm:px-0">
          <div className={`bg-gray-50 border rounded-xl p-4 shadow-sm ${isEditingDriveStats ? "border-paa-navy/40 ring-1 ring-paa-navy/10" : "border-gray-200"}`}>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Authors Registered</div>
            {isEditingDriveStats ? (
              <input
                type="text"
                autoFocus
                className="text-xl font-serif text-paa-navy font-bold bg-transparent border-0 border-b-2 border-paa-navy/30 focus:border-paa-navy outline-none w-full p-0"
                value={overrideDriveAuthors}
                placeholder="NA"
                onChange={e => setOverrideDriveAuthors(e.target.value)}
              />
            ) : (
              <div className="text-xl font-serif text-paa-navy font-bold">
                {statsOverrides.driveOverrides?.[selectedDriveBreakdown.id]?.authorsOverride !== undefined && statsOverrides.driveOverrides?.[selectedDriveBreakdown.id]?.authorsOverride !== null
                  ? statsOverrides.driveOverrides?.[selectedDriveBreakdown.id]?.authorsOverride
                  : totalAuthors}
              </div>
            )}
          </div>
          <div className={`bg-blue-50 border rounded-xl p-4 shadow-sm ${isEditingDriveStats ? "border-blue-400 ring-1 ring-blue-100" : "border-blue-200"}`}>
            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Total Books Pledged</div>
            {isEditingDriveStats ? (
              <input
                type="text"
                className="text-xl font-serif text-blue-800 font-bold bg-transparent border-0 border-b-2 border-blue-300 focus:border-blue-600 outline-none w-full p-0"
                value={overrideDriveBooks}
                placeholder="NA"
                onChange={e => setOverrideDriveBooks(e.target.value)}
              />
            ) : (
              <div className="text-xl font-serif text-blue-800 font-bold">
                {statsOverrides.driveOverrides?.[selectedDriveBreakdown.id]?.booksOverride !== undefined && statsOverrides.driveOverrides?.[selectedDriveBreakdown.id]?.booksOverride !== null
                  ? statsOverrides.driveOverrides?.[selectedDriveBreakdown.id]?.booksOverride
                  : totalBooks}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 px-6 sm:px-0">
          <div>
            <h4 className="font-bold text-gray-700">Author Registry</h4>
            <p className="text-xs text-gray-400 mt-0.5">Manage author registrations and dispatch details for this drive</p>
          </div>
          <input
            type="text"
            placeholder="Search authors..."
            className="border border-gray-300 rounded-lg p-2 text-sm w-full md:w-64 outline-none focus:border-paa-navy"
            value={registrySearch}
            onChange={(e) => setRegistrySearch(e.target.value)}
          />
        </div>

        {/* Tab Switcher */}
        {(() => {
          const uniqueRegisteredCount = new Set(registrations.map(r => r.authorId)).size;
          const uniqueNotRegisteredCount = adminAuthors.filter(a => !registrations.some(r => r.authorId === a.id)).length;
          
          return (
            <div className="flex flex-wrap mb-6 bg-gray-100 p-1.5 rounded-2xl gap-2 w-[calc(100%-3rem)] sm:w-max shadow-inner mx-6 sm:mx-0">
              <button
                onClick={() => setBreakdownTab('All')}
                className={`py-2.5 px-6 text-xs font-extrabold rounded-xl transition-all duration-300 ${breakdownTab === 'All'
                    ? 'bg-paa-navy text-white shadow-lg shadow-paa-navy/25'
                    : 'text-gray-500 hover:text-paa-navy hover:bg-white/50'
                  }`}
              >
                All Authors ({adminAuthors.length})
              </button>
              <button
                onClick={() => setBreakdownTab('Registered')}
                className={`py-2.5 px-6 text-xs font-extrabold rounded-xl transition-all duration-300 ${breakdownTab === 'Registered'
                    ? 'bg-paa-navy text-white shadow-lg shadow-paa-navy/25'
                    : 'text-gray-500 hover:text-paa-navy hover:bg-white/50'
                  }`}
              >
                Registered ({uniqueRegisteredCount})
              </button>
              <button
                onClick={() => setBreakdownTab('NotRegistered')}
                className={`py-2.5 px-6 text-xs font-extrabold rounded-xl transition-all duration-300 ${breakdownTab === 'NotRegistered'
                    ? 'bg-paa-navy text-white shadow-lg shadow-paa-navy/25'
                    : 'text-gray-500 hover:text-paa-navy hover:bg-white/50'
                  }`}
              >
                Not Registered ({uniqueNotRegisteredCount})
              </button>
            </div>
          );
        })()}

        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left bg-white whitespace-nowrap min-w-max">
            <thead className="bg-indigo-50 border-b-2 border-indigo-100">
              <tr>
                <th className="p-3 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase">Author Name</th>
                <th className="p-3 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase">Books Donating</th>
                <th className="p-3 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase">Payment</th>
                <th className="p-3 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase">Donation Value</th>
                <th className="p-3 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(() => {
                // Filter authors based on search
                const filteredAuthors = adminAuthors.filter((a: any) => 
                  a.name.toLowerCase().includes(registrySearch.toLowerCase())
                );

                // Sort authors alphabetically by name
                const sortedAuthors = [...filteredAuthors].sort((a: any, b: any) => 
                  (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
                );

                // Build list of items to render
                const itemsToRender: { author: any, reg: any }[] = [];
                
                sortedAuthors.forEach((author: any) => {
                  const authorRegs = registrations.filter((r: any) => r.authorId === author.id);
                  
                  if (authorRegs.length > 0) {
                    if (breakdownTab !== 'NotRegistered') {
                      authorRegs.forEach(reg => {
                        itemsToRender.push({ author, reg });
                      });
                    }
                  } else {
                    if (breakdownTab !== 'Registered') {
                      itemsToRender.push({ author, reg: null });
                    }
                  }
                });

                if (itemsToRender.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        No entries found in this section.
                      </td>
                    </tr>
                  );
                }

                return itemsToRender.map(({ author, reg }, idx) => {
                  const isRegistered = !!reg;
                  const totalQty = isRegistered ? reg.books.reduce((acc: any, b: any) => acc + (b.quantityDonated || 0), 0) : 0;
                  const totalValue = isRegistered ? reg.books.reduce((acc: any, b: any) => acc + ((b.quantityDonated || 0) * (b.book?.mrp || 0)), 0) : 0;
                  const isExpanded = isRegistered && expandedAuthorId === reg.id;

                  return (
                    <React.Fragment key={isRegistered ? reg.id : `not-reg-${author.id}`}>
                      <tr className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'} hover:bg-slate-200/60 transition-colors animate-in fade-in duration-300`}>
                        <td className="p-3">
                          <div className="font-medium text-paa-navy">{author.name}</div>
                          <div className="text-xs text-gray-500">{new Date(author.createdAt || Date.now()).toLocaleDateString()}</div>
                        </td>
                        <td className="p-3 text-center">
                          {isRegistered ? (
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-paa-navy text-sm">{reg.books.length} Titles</span>
                              <span className="text-xs text-gray-500">{totalQty} total books</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>

                        {/* PAYMENT COLUMN */}
                        <td className="p-3">
                          {isRegistered ? (
                            <div className="flex items-center gap-3">
                              {reg.paymentScreenshot ? (
                                <a
                                  href={reg.paymentScreenshot.startsWith('http') ? reg.paymentScreenshot : `${API}${reg.paymentScreenshot}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block w-10 h-10 border border-gray-300 rounded overflow-hidden shadow-sm hover:opacity-80 transition-opacity bg-gray-50 animate-in zoom-in-50 duration-300"
                                  title="View Receipt"
                                >
                                  <img
                                    src={reg.paymentScreenshot.startsWith('http') ? reg.paymentScreenshot : `${API}${reg.paymentScreenshot}`}
                                    className="w-full h-full object-cover"
                                    alt="Receipt"
                                  />
                                </a>
                              ) : (
                                <div className="w-10 h-10 border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-300 text-[10px]" title="No Receipt Uploaded">
                                  N/A
                                </div>
                              )}
                              <div className="flex flex-col text-[10px] text-gray-600 gap-0.5">
                                <div><span className="font-semibold text-gray-400">Amt:</span> <span className="font-bold text-paa-navy">₹{reg.feePaid || 0}</span></div>
                                {reg.transactionId && (
                                  <div className="truncate max-w-[100px] font-mono text-[9px]" title={reg.transactionId}>
                                    <span className="font-semibold text-gray-400">Txn:</span> {reg.transactionId}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>

                        <td className="p-3">
                          {isRegistered ? (
                            <div className="flex flex-col gap-2 min-w-[120px]">
                              <div className="flex items-center gap-2 text-[10px]">
                                <span className="font-semibold text-gray-400">Status:</span>
                                <select
                                  className={`text-[10px] font-bold rounded-md px-1.5 py-0.5 border-0 focus:ring-1 outline-none cursor-pointer ${
                                    reg.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                    reg.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                  }`}
                                  value={reg.status}
                                  onChange={(e) => updateRegistrationStatus(reg.id, e.target.value)}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Approved">Approved</option>
                                  <option value="Rejected">Rejected</option>
                                </select>
                              </div>
                              <div className="text-xs font-bold text-paa-navy">
                                Val: ₹{totalValue}
                              </div>
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 text-[10px] font-bold bg-gray-100 text-gray-500 rounded-lg select-none">Not Registered</span>
                          )}
                        </td>

                        <td className="p-3 text-right align-middle">
                          <div className="flex gap-2 justify-end items-center">
                            {isRegistered && (
                              <button
                                onClick={() => setExpandedAuthorId(isExpanded ? null : reg.id)}
                                className={`text-xs p-2 rounded-lg font-bold border transition-all cursor-pointer ${isExpanded
                                    ? 'bg-paa-navy text-white border-paa-navy shadow-md'
                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200 shadow-sm'
                                  }`}
                                title="Toggle Book Details"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                            {isRegistered ? (
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  <button
                                    onClick={() => {
                                      setEditingAuthorReg(reg);
                                      setGranularData(reg.books.map((b: any) => ({
                                        id: b.id,
                                        bookId: b.bookId,
                                        qtyCommitted: b.quantityDonated,
                                        qtyCollected: b.qtyCollected || 0,
                                        qtyDispatched: b.qtyDispatched || 0,
                                        qtyReceived: b.qtyReceived || 0,
                                        libraryConfirmation: b.libraryConfirmation || 'Pending',
                                        remarks: b.remarks || ''
                                      })));
                                    }}
                                    className="text-[10px] font-bold bg-paa-navy text-white px-2.5 py-1.5 rounded hover:bg-paa-gold hover:text-paa-navy transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                                  >
                                    MANAGE DATA
                                  </button>
                                  <button
                                    onClick={() => {
                                      setManualRegAuthorId(author.id);
                                      setManualRegBooks([]);
                                      setManualRegFeePaid(0);
                                      setManualRegPaymentStatus('Completed');
                                      setIsManualRegOpen(true);
                                    }}
                                    className="text-[10px] font-bold bg-emerald-600 text-white px-2.5 py-1.5 rounded hover:bg-emerald-700 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                                    title="Add another registration for this author"
                                  >
                                    REGISTER MORE
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRegistration(reg.id)}
                                    className="p-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded transition-all cursor-pointer active:scale-95"
                                    title="Delete Registration"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {reg.broadcastStatus === 'Published' && (
                                  <span className="text-[9px] font-bold text-emerald-600 bg-[#ebd8c0] rounded px-2 py-0.5 border border-emerald-100 uppercase tracking-wide">
                                    PUBLISHED
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setManualRegAuthorId(author.id);
                                  setManualRegBooks([]);
                                  setManualRegFeePaid(0);
                                  setManualRegPaymentStatus('Completed');
                                  setIsManualRegOpen(true);
                                }}
                                className="text-[10px] font-bold bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-paa-gold hover:text-paa-navy transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                              >
                                REGISTER AUTHOR
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDABLE INDIVIDUAL BOOK BREAKDOWN ROW */}
                      {isExpanded && isRegistered && (
                        <tr>
                          <td colSpan={5} className="p-4 bg-gray-50/20 border-b border-gray-100">
                            <div className="bg-gray-50/70 p-5 border-l-4 border-paa-navy rounded-r-2xl shadow-inner animate-in slide-in-from-top-2 duration-300">
                              <div className="flex items-center justify-between mb-4 border-b border-gray-200/50 pb-2">
                                <span className="text-xs font-bold text-paa-navy uppercase tracking-widest flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-paa-gold" />
                                  Individual Book Breakdown
                                </span>
                              </div>
                              {reg.books?.length > 0 ? (
                                <div className="flex flex-col gap-3">
                                  {reg.books.map((b: any, j: number) => (
                                    <div key={j} className="bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                      <div className="flex-1 min-w-0">
                                        <div className="font-serif font-bold text-paa-navy text-base truncate" title={b.book?.title || 'Unknown Book'}>
                                          {b.book?.title || 'Unknown Book'}
                                        </div>
                                        <div className="text-xs text-gray-550 font-medium mt-1 flex items-center gap-1.5">
                                          <span>{b.book?.genre}</span>
                                          <span>&bull;</span>
                                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold">MRP: ₹{b.book?.mrp || 'N/A'}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center px-4 py-2 bg-indigo-50 rounded-lg shadow-sm border border-indigo-100/40 text-xs font-bold">
                                        <span className="text-gray-500 mr-2">Quantity Donated:</span>
                                        <span className="font-mono font-extrabold text-indigo-900 text-sm">{b.quantityDonated || 0}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 italic">No books found in this registration.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        {/* Manual Registration Modal */}
        {isManualRegOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-premium p-8 border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-6 border-b pb-4">
                <h3 className="text-2xl font-serif text-paa-navy font-bold">Add Manual Registration</h3>
                <button onClick={() => setIsManualRegOpen(false)} className="p-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
<form onSubmit={handleManualRegistrationSubmit} className="space-y-6">
                {/* Selected Author Display */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Registering Author</div>
                  <div className="text-lg font-serif text-paa-navy font-bold">{adminAuthors.find(a => a.id === manualRegAuthorId)?.name}</div>
                  <div className="text-sm text-gray-600">{adminAuthors.find(a => a.id === manualRegAuthorId)?.email}</div>
                </div>

                {/* Books Selection */}
                {manualRegAuthorId && (
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <h4 className="font-semibold text-paa-navy mb-3">Select Books to Donate</h4>
                    {(!adminAuthors.find(a => a.id === manualRegAuthorId)?.books || adminAuthors.find(a => a.id === manualRegAuthorId)?.books.length === 0) ? (
                      <p className="text-sm text-red-500">This author has no registered books in the database.</p>
                    ) : (
                      <div className="space-y-3">
                        {adminAuthors.find(a => a.id === manualRegAuthorId)?.books.map((book: any) => {
                          const existing = manualRegBooks.find(b => b.bookId === book.id);
                          return (
                            <div key={book.id} className="flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                              <div className="flex-1">
                                <div className="font-bold text-sm text-paa-navy">{book.title}</div>
                                <div className="text-xs text-gray-500">{book.genre} &bull; MRP: ₹{book.mrp}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-gray-600">Qty:</label>
                                <input
                                  type="number"
                                  min="0"
                                  className="w-20 dash-input !py-1 !px-2 text-sm"
                                  value={existing?.qty || ''}
                                  onChange={(e) => {
                                    const qty = parseInt(e.target.value) || 0;
                                    if (qty <= 0) {
                                      setManualRegBooks(prev => prev.filter(b => b.bookId !== book.id));
                                    } else if (existing) {
                                      setManualRegBooks(prev => prev.map(b => b.bookId === book.id ? { ...b, qty } : b));
                                    } else {
                                      setManualRegBooks(prev => [...prev, { bookId: book.id, qty }]);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Details */}
                {selectedDriveBreakdown.feeType !== 'Free' && (
                  <div className="bg-[#ebd8c0]/50 p-4 rounded-xl border border-emerald-100">
                    <h4 className="font-semibold text-paa-navy mb-3">3. Payment Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-3 mb-2">
                        <p className="text-sm text-gray-600 font-medium">Drive Fee Structure: <span className="font-bold text-paa-navy">{selectedDriveBreakdown.feeType}</span> {selectedDriveBreakdown.feeAmount ? `(₹${selectedDriveBreakdown.feeAmount})` : ''}</p>
                      </div>
                      <div>
                        <label className="dash-label">Amount Paid (₹)</label>
                        <input type="number" min="0" value={manualRegFeePaid} onChange={e => setManualRegFeePaid(parseInt(e.target.value) || 0)} className="dash-input" />
                      </div>
                      <div>
                        <label className="dash-label">Payment Status</label>
                        <select value={manualRegPaymentStatus} onChange={e => setManualRegPaymentStatus(e.target.value)} className="dash-input">
                          <option>Pending</option>
                          <option>Completed</option>
                          <option>Failed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t gap-3">
                  <button type="button" onClick={() => setIsManualRegOpen(false)} className="dash-btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={!manualRegAuthorId || manualRegBooks.length === 0} className="dash-btn dash-btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed">
                    Save Manual Registration
                  </button>
                </div>
              </form>
</FocusTrap>
            </div>
          </div>
        )}

        {/* ==========================================
                   RENDER: GRANULAR TRACKING MODAL
                   ========================================== */}
        {editingAuthorReg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-premium p-8 border border-gray-200 w-full max-w-6xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-6 border-b pb-4">
                <div>
                  <h3 className="text-2xl font-serif text-paa-navy">Author Data: {editingAuthorReg.author?.name}</h3>
                  <p className="text-sm text-gray-500 font-medium mt-1">Manage granular book tracking and publish updates to the author's dashboard.</p>
                </div>
                <button onClick={() => setEditingAuthorReg(null)} className="p-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6 flex gap-4">
                <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Registration Status</label>
                  <select
                    className="w-full text-sm border-0 rounded p-2 focus:ring-1 focus:ring-paa-navy outline-none cursor-pointer"
                    value={editingAuthorReg.status}
                    onChange={(e) => setEditingAuthorReg({ ...editingAuthorReg, status: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="text-[10px] font-bold text-gray-550 uppercase block mb-1">Payment Status</label>
                  <select
                    className="w-full text-sm border-0 rounded p-2 focus:ring-1 focus:ring-paa-navy outline-none cursor-pointer"
                    value={editingAuthorReg.paymentStatus || 'Pending'}
                    onChange={(e) => setEditingAuthorReg({ ...editingAuthorReg, paymentStatus: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                <table className="w-full text-left min-w-max">
                  <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                    <tr>
                      <th className="p-3 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase">Book Title</th>
                      <th className="p-3 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase text-center">Committed</th>
                      <th className="p-3 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {granularData.map((b: any, index: number) => {
                      const originalBook = editingAuthorReg.books.find((ob: any) => ob.id === b.id);
                      return (
                        <tr key={index}>
                          <td className="p-3">
                            <div className="font-bold text-sm text-paa-navy max-w-[250px] truncate" title={originalBook?.book?.title}>{originalBook?.book?.title}</div>
                            <div className="text-xs text-gray-500">₹{originalBook?.book?.price || originalBook?.book?.mrp || '0'}</div>
                          </td>
                          <td className="p-3 text-center bg-blue-50/30 font-bold text-blue-700">{b.qtyCommitted}</td>
                          <td className="p-3">
                            <input type="text" placeholder="Remarks..." className="w-full text-sm border border-gray-300 rounded p-1.5" value={b.remarks || ''} onChange={e => {
                              const newData = [...granularData];
                              newData[index].remarks = e.target.value;
                              setGranularData(newData);
                            }} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4 border-t gap-3">
                <button onClick={() => setEditingAuthorReg(null)} className="dash-btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={() => handlePublishData(editingAuthorReg.id)} className="dash-btn dash-btn-primary px-8">Save & Publish Data</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN LIST (DONATION DRIVES)
  // ==========================================


  const nonDraftDrives = drives.filter(d => d.visibility !== 'Draft');
  const nonDraftDrivesCount = nonDraftDrives.length;

  const calculatedBooks = nonDraftDrives.reduce((sum, drive) => {
    const driveLogs = globalLogs.filter(l => l.announcementId === drive.id);
    const totalBooks = driveLogs.reduce((sum, log) => sum + (log.books?.reduce((acc: number, b: any) => acc + b.quantityDonated, 0) || 0), 0);
    const driveOverride = statsOverrides?.driveOverrides?.[drive.id] || statsOverrides?.driveOverrides?.[drive.id.toString()];
    const books = (driveOverride && driveOverride.booksOverride !== null && driveOverride.booksOverride !== undefined)
      ? Number(driveOverride.booksOverride)
      : totalBooks;
    return sum + books;
  }, 0);

  const calculatedAuthors = nonDraftDrives.reduce((sum, drive) => {
    const driveLogs = globalLogs.filter(l => l.announcementId === drive.id);
    const totalAuthors = new Set(driveLogs.map(l => l.authorId)).size;
    const driveOverride = statsOverrides?.driveOverrides?.[drive.id] || statsOverrides?.driveOverrides?.[drive.id.toString()];
    const authors = (driveOverride && driveOverride.authorsOverride !== null && driveOverride.authorsOverride !== undefined)
      ? Number(driveOverride.authorsOverride)
      : totalAuthors;
    return sum + authors;
  }, 0);

  const activeLibrariesCount = libraries.filter(lib => drives.some(d => d.libraryId === lib.id && d.visibility !== 'Draft')).length;

  const filteredBySearch = drives.filter(d => d.title.toLowerCase().includes(driveSearch.toLowerCase()));
  const allDrivesCount = drives.length;
  const openDrivesCount = drives.filter(d => d.visibility === 'Published').length;
  const closedDrivesCount = drives.filter(d => d.visibility === 'Closed').length;

  const filteredDrives = filteredBySearch.filter(d => {
    if (showArchivedDrives) return d.isArchived;
    if (d.isArchived) return false;
    if (driveStatusFilter === 'Open') return d.visibility === 'Published';
    if (driveStatusFilter === 'Closed') return d.visibility === 'Closed';
    return true;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">



      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-paa-navy">Library Donations Ecosystem</h2>
          <p className="text-sm text-gray-500">Manage libraries and organize donation drives for authors</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportGlobalRegistry} className="dash-btn bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> Global Registry
          </button>
          <div className="dash-btn bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm flex items-center gap-2">
            <Download className="w-4 h-4 shrink-0" />
            <select
              value={selectedAirportId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedAirportId(val);
                if (val) {
                  downloadAirportReport(parseInt(val));
                  setSelectedAirportId('');
                }
              }}
              className="bg-transparent text-xs font-bold outline-none border-none cursor-pointer text-gray-700 py-0.5"
            >
              <option value="" className="text-gray-500 bg-white font-bold">Airport Report</option>
              {libraries.map((lib: any) => (
                <option key={lib.id} value={lib.id} className="text-gray-700 bg-white font-bold">
                  {lib.name}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleExportAuthorDonationReport} className="dash-btn bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> Author Report
          </button>
          <button onClick={() => setIsLibraryMasterOpen(true)} className="dash-btn bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Manage Libraries
          </button>
          <button onClick={() => { setEditingDrive(null); setIsDriveModalOpen(true); }} className="dash-btn dash-btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create New Drive
          </button>
        </div>
      </div>

      {/* Ecosystem Summary Heading & Edit Stats Button */}
      <div className="mb-3 flex justify-between items-center mt-6">
        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Ecosystem Summary</span>
        {isEditingStats ? (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditingStats(false)}
              className="text-xs font-bold text-gray-500 border border-gray-300 bg-white hover:bg-gray-50 px-4 py-1.5 rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveStatsOverrides}
              className="text-xs font-bold bg-paa-navy text-white px-4 py-1.5 rounded-full hover:bg-paa-navy/90 transition-colors active:scale-95"
            >
              Save Stats
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setOverrideDrives(statsOverrides.drivesOverride !== null ? statsOverrides.drivesOverride : nonDraftDrivesCount);
              setOverrideBooks(statsOverrides.booksOverride !== null ? statsOverrides.booksOverride : calculatedBooks);
              setOverrideAuthors(statsOverrides.authorsOverride !== null ? statsOverrides.authorsOverride : calculatedAuthors);
              setOverrideLibraries(statsOverrides.librariesOverride !== null ? statsOverrides.librariesOverride : activeLibrariesCount);
              setIsEditingStats(true);
            }}
            className="text-xs font-bold text-paa-navy border border-paa-navy/20 bg-gray-50 hover:bg-paa-navy/5 px-4 py-1.5 rounded-full transition-colors"
          >
            Edit Stats
          </button>
        )}
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl p-4 shadow-sm ${isEditingStats ? "ring-2 ring-indigo-300 ring-offset-1" : "border-none"}`}>
          <div className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider mb-1">Total Drives Organized</div>
          {isEditingStats ? (
            <input
              type="text"
              autoFocus
              className="text-xl font-serif text-white font-bold bg-transparent border-0 border-b-2 border-white/30 focus:border-white outline-none w-full p-0 placeholder-white/50"
              value={overrideDrives}
              placeholder="NA"
              onChange={e => setOverrideDrives(e.target.value)}
            />
          ) : (
            <div className="text-xl font-serif text-white font-bold">
              {statsOverrides.drivesOverride !== null ? statsOverrides.drivesOverride : nonDraftDrivesCount}
            </div>
          )}
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-xl p-4 shadow-sm border-none">
          <div className="text-[10px] font-bold text-rose-100 uppercase tracking-wider mb-1">Total Books Donated</div>
          <div className="text-xl font-serif text-white font-bold">
            {calculatedBooks}
          </div>
        </div>
        <div className={`bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-xl p-4 shadow-sm ${isEditingStats ? "ring-2 ring-emerald-300 ring-offset-1" : "border-none"}`}>
          <div className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1">Active Libraries</div>
          {isEditingStats ? (
            <input
              type="text"
              className="text-xl font-serif text-white font-bold bg-transparent border-0 border-b-2 border-white/30 focus:border-white outline-none w-full p-0 placeholder-white/50"
              value={overrideLibraries}
              placeholder="NA"
              onChange={e => setOverrideLibraries(e.target.value)}
            />
          ) : (
            <div className="text-xl font-serif text-white font-bold">
              {statsOverrides.librariesOverride !== null ? statsOverrides.librariesOverride : activeLibrariesCount}
            </div>
          )}
        </div>
      </div>

      {/* Donations Performance Chart */}
      {(() => {
        let chartDrives = [...nonDraftDrives];
        
        // Sort chronologically so that slice(-15) works correctly
        chartDrives.sort((a: any, b: any) => {
          const dateA = new Date(a.registrationEndDate || a.createdAt || 0);
          const dateB = new Date(b.registrationEndDate || b.createdAt || 0);
          return dateA.getTime() - dateB.getTime();
        });

        const now = new Date();
        if (donationTimeFilter === 'Last 15') {
          chartDrives = chartDrives.slice(-15);
        } else if (donationTimeFilter === 'Last Quarter') {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          chartDrives = chartDrives.filter((d: any) => new Date(d.registrationEndDate || d.createdAt) >= threeMonthsAgo);
        } else if (!isNaN(parseInt(donationTimeFilter))) {
          const targetYear = parseInt(donationTimeFilter);
          const startOfYear = new Date(targetYear, 0, 1);
          const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);
          chartDrives = chartDrives.filter((d: any) => {
            const date = new Date(d.registrationEndDate || d.createdAt);
            return date >= startOfYear && date <= endOfYear;
          });
        }

        const currentYear = new Date().getFullYear();
        const availableYears = [];
        for (let y = currentYear; y >= 2025; y--) {
          availableYears.push(y);
        }

        let dateRangeString = 'All Time';
        if (chartDrives.length > 0) {
          const sortedDates = chartDrives
            .map(d => new Date(d.registrationEndDate || d.createdAt))
            .sort((a, b) => a.getTime() - b.getTime());
          const firstDate = sortedDates[0];
          const lastDate = sortedDates[sortedDates.length - 1];
          const formatOpts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
          if (firstDate.getTime() === lastDate.getTime() || firstDate.toLocaleDateString(undefined, formatOpts) === lastDate.toLocaleDateString(undefined, formatOpts)) {
            dateRangeString = firstDate.toLocaleDateString(undefined, formatOpts);
          } else {
            dateRangeString = `${firstDate.toLocaleDateString(undefined, formatOpts)} - ${lastDate.toLocaleDateString(undefined, formatOpts)}`;
          }
        }

        const chartData = chartDrives.map(drive => {
          const driveLogs = globalLogs.filter(l => l.announcementId === drive.id);
          const totalBooks = driveLogs.reduce((sum, log) => sum + (log.books?.reduce((acc: number, b: any) => acc + b.quantityDonated, 0) || 0), 0);
          const totalAuthors = new Set(driveLogs.map(l => l.authorId)).size;

          const driveOverride = statsOverrides?.driveOverrides?.[drive.id] || statsOverrides?.driveOverrides?.[drive.id.toString()];
          const books = (driveOverride && driveOverride.booksOverride !== null && driveOverride.booksOverride !== undefined)
            ? Number(driveOverride.booksOverride)
            : totalBooks;
          const authors = (driveOverride && driveOverride.authorsOverride !== null && driveOverride.authorsOverride !== undefined)
            ? Number(driveOverride.authorsOverride)
            : totalAuthors;

          return {
            name: drive.title,
            booksDonated: books,
            authorsCount: authors
          };
        });

        return (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h4 className="font-bold text-paa-navy font-serif">Donations Performance Overview <span className="text-gray-500 font-normal ml-2 text-sm tracking-wide">({dateRangeString})</span></h4>
                <p className="text-xs text-gray-500 font-medium mt-1">Comparing total books donated and author participation across campaigns.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                <select
                  className="border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-paa-navy text-gray-700 bg-gray-50"
                  value={donationTimeFilter}
                  onChange={(e) => setDonationTimeFilter(e.target.value)}
                >
                  <option value="Last 15">Last 15 Campaigns</option>
                  <option value="All">All Time</option>
                  <option value="Last Quarter">Last Quarter</option>
                  {availableYears.map(y => (
                    <option key={y} value={y.toString()}>{y}</option>
                  ))}
                </select>
                {/* Legends */}
                <div className="flex items-center gap-1.5"><div className="w-3.5 h-1.5 rounded-full bg-paa-navy"></div> Books Donated</div>
              </div>
            </div>

            <div className="h-64 w-full animate-in fade-in duration-500">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} dy={10} tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <RechartsTooltip
                    cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                  />
                  <Line 
                    type="linear" 
                    dataKey="booksDonated" 
                    name="Books Donated" 
                    stroke="var(--color-paa-navy, #1e3a8a)" 
                    strokeWidth={3} 
                    activeDot={{ r: 6 }} 
                    dot={(props: any) => { const { cx, cy, index } = props; const total = chartData.length; if (total <= 30 || index % Math.ceil(total / 15) === 0 || index === total - 1) { return <circle cx={cx} cy={cy} r={3} fill="#fff" stroke="var(--color-paa-navy, #1e3a8a)" strokeWidth={2} key={`dot-books-${index}`} />; } return null; }}
                  >
                    <LabelList dataKey="booksDonated" position="top" offset={10} style={{ fill: '#4b5563', fontSize: 10, fontWeight: 'bold' }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {/* Drives Grid Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-4 mt-8">
        <h3 className="text-xl font-bold text-paa-navy font-serif">Donation Drives Master</h3>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex flex-wrap bg-gray-100 p-1 rounded-lg gap-1">
            {['All', 'Open', 'Closed'].map((filter) => (
              <button
                key={filter}
                onClick={() => setDriveStatusFilter(filter as any)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${driveStatusFilter === filter
                    ? 'bg-white text-paa-navy shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {filter} ({filter === 'All' ? allDrivesCount : filter === 'Open' ? openDrivesCount : closedDrivesCount})
              </button>
            ))}
            <div className="w-[1px] h-6 bg-gray-300 mx-1 hidden sm:block self-center"></div>
            <div 
              onClick={() => setShowArchivedDrives(!showArchivedDrives)}
              className="flex items-center gap-2 cursor-pointer shrink-0 ml-1 self-center"
            >
              <div className={`relative w-8 h-4 rounded-full transition-colors ${showArchivedDrives ? 'bg-red-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform duration-200 ${showArchivedDrives ? 'translate-x-4' : 'translate-x-0'} shadow-sm`}></div>
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-gray-600">Archived</span>
            </div>
          </div>
          <input
            type="text"
            placeholder="Search drives by title..."
            className="w-full sm:w-80 border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-paa-navy focus:ring-1 focus:ring-paa-navy shadow-sm"
            value={driveSearch}
            onChange={(e) => setDriveSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-max">
          <thead className="bg-indigo-50 border-b-2 border-indigo-100">
            <tr>
              <th className="p-4 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase tracking-wider w-[50px] text-center">S.No</th>
              <th className="p-4 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase tracking-wider">Drive Name</th>
              <th className="p-4 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase tracking-wider">Deadline</th>
              <th className="p-4 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase tracking-wider">Location</th>
              <th className="p-4 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase tracking-wider">Status</th>
              <th className="p-4 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase tracking-wider">Authors</th>
              <th className="p-4 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase tracking-wider">Books</th>
              <th className="p-4 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="p-12 text-center text-gray-500">Loading donation drives...</td></tr>
            ) : filteredDrives.length === 0 ? (
              <tr><td colSpan={8} className="p-12 text-center text-gray-500">No donation drives found. Click "Create New Drive" to start.</td></tr>
            ) : [...filteredDrives]
                .sort((a, b) => new Date(b.registrationEndDate || 0).getTime() - new Date(a.registrationEndDate || 0).getTime())
                .map((drive, idx) => {
              // Calculate books for this drive from globalLogs (since fetchDrives doesn't nest books)
              const driveLogs = globalLogs.filter(l => l.announcementId === drive.id);
              const totalBooks = driveLogs.reduce((sum, log) => sum + (log.books?.reduce((acc: number, b: any) => acc + b.quantityDonated, 0) || 0), 0);

              // Check if we have overrides for this specific drive
              const driveOverride = statsOverrides?.driveOverrides?.[drive.id] || statsOverrides?.driveOverrides?.[drive.id.toString()];
              
              const displayAuthors = (driveOverride && driveOverride.authorsOverride !== null && driveOverride.authorsOverride !== undefined)
                ? driveOverride.authorsOverride
                : (drive.registrations?.length || 0);

              const displayBooks = (driveOverride && driveOverride.booksOverride !== null && driveOverride.booksOverride !== undefined)
                ? driveOverride.booksOverride
                : totalBooks;

              return (
                <tr key={drive.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'} hover:bg-slate-200/60 transition-colors`}>
                  <td className="p-4 text-center font-bold text-gray-500">{idx + 1}</td>
                  <td className="p-4 max-w-[200px]">
                    <div className="font-bold text-sm text-paa-navy leading-snug line-clamp-2" title={drive.title}>{drive.title}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {new Date(drive.registrationEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-4 text-sm text-gray-600 max-w-[200px]">
                    <div className="line-clamp-2 leading-snug" title={drive.library?.city ? `${drive.library.name}, ${drive.library.city}` : drive.library?.name}>
                      {drive.library?.city ? `${drive.library.name}, ${drive.library.city}` : drive.library?.name}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${drive.visibility === 'Published' ? 'bg-[#ebd8c0] text-emerald-600 border-emerald-200' :
                        drive.visibility === 'Closed' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                          'bg-yellow-50 text-yellow-600 border-yellow-200'
                      }`}>
                      {drive.visibility}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-sm text-paa-navy">{displayAuthors}</td>
                  <td className="p-4 font-bold text-sm text-paa-navy">{displayBooks}</td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => {
                      setSelectedDriveBreakdown(drive);
                      fetchRegistrations(drive.id);
                    }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition-colors" title="Manage Drive"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setEditingDrive(drive); setIsDriveModalOpen(true); }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition-colors" title="Edit Drive"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {drive.visibility === 'Published' && !drive.isArchived ? (
                      <button onClick={() => unpublishCampaign(drive.id)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded border border-orange-200 transition-colors" title="Unpublish Campaign">
                        <X className="w-4 h-4" />
                      </button>
                    ) : !drive.isArchived ? (
                      <button onClick={() => publishCampaign(drive.id)} className="p-1.5 text-emerald-600 hover:bg-[#ebd8c0] rounded border border-emerald-200 transition-colors" title="Publish to All Authors">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    ) : null}
                    {drive.isArchived ? (
                      <button onClick={() => handleRestoreDrive(drive.id)} className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold bg-amber-100 text-amber-800 border-none rounded shadow hover:bg-amber-200 transition-colors" title="Restore Drive">
                        Restore
                      </button>
                    ) : (
                      <button onClick={() => handleDeleteDrive(drive.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded border border-red-200 transition-colors" title="Archive Drive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


      {/* ==========================================
          MODAL: LIBRARY MASTER
          ========================================== */}
      {isLibraryMasterOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-paa-navy flex items-center gap-2"><BookOpen className="w-5 h-5 text-paa-gold" /> Library Master</h3>
                <p className="text-xs text-gray-500 mt-0.5">Manage target libraries and airports for donation drives</p>
              </div>
              <button onClick={() => setIsLibraryMasterOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
              {/* Add/Edit Library Form inline at top */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
                <h4 className="text-sm font-bold text-paa-navy uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">{editingLib ? 'Edit Library' : 'Add New Library'}</h4>
                <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
<form onSubmit={handleSaveLibrary} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Library Name *</label>
                    <input name="libName" defaultValue={editingLib?.name} required className="w-full border border-gray-300 p-2 rounded text-sm focus:border-paa-navy outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Type *</label>
                    <select name="type" defaultValue={editingLib?.type || 'Public Library'} required className="w-full border border-gray-300 p-2 rounded text-sm focus:border-paa-navy outline-none">
                      <option>Airport Library</option>
                      <option>Public Library</option>
                      <option>Institutional Library</option>
                      <option>Military Library</option>
                      <option>CafAc Library</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Status</label>
                    <select name="status" defaultValue={editingLib?.status || 'Active'} className="w-full border border-gray-300 p-2 rounded text-sm focus:border-paa-navy outline-none">
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">City *</label>
                    <input name="city" defaultValue={editingLib?.city} required className="w-full border border-gray-300 p-2 rounded text-sm focus:border-paa-navy outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">State *</label>
                    <input name="state" defaultValue={editingLib?.state} required className="w-full border border-gray-300 p-2 rounded text-sm focus:border-paa-navy outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Contact Person *</label>
                    <input name="contactPerson" defaultValue={editingLib?.contactPerson} required className="w-full border border-gray-300 p-2 rounded text-sm focus:border-paa-navy outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Contact Number *</label>
                    <input name="contactNumber" defaultValue={editingLib?.contactNumber} required className="w-full border border-gray-300 p-2 rounded text-sm focus:border-paa-navy outline-none" />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Shipping Address *</label>
                    <input name="shippingAddress" defaultValue={editingLib?.shippingAddress} required className="w-full border border-gray-300 p-2 rounded text-sm focus:border-paa-navy outline-none" />
                  </div>

                  <div className="md:col-span-4 flex justify-end gap-2 mt-2">
                    {editingLib && <button type="button" onClick={() => setEditingLib(null)} className="px-4 py-2 border border-gray-300 rounded text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel Edit</button>}
                    <button type="submit" className="px-6 py-2 bg-paa-navy text-white rounded text-sm font-bold hover:bg-paa-gold hover:text-paa-navy transition-colors">{editingLib ? 'Update Library' : 'Add Library'}</button>
                  </div>
                </form>
</FocusTrap>
              </div>

              {/* Libraries Table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                    <tr>
                      <th className="p-3 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase tracking-wider">Library</th>
                      <th className="p-3 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase tracking-wider">Location</th>
                      <th className="p-3 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase tracking-wider">Contact</th>
                      <th className="p-3 !text-[14px] font-bold !text-indigo-800 !bg-transparent uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {libraries.map(lib => (
                      <tr key={lib.id} className="hover:bg-gray-50/50">
                        <td className="p-3">
                          <div className="font-semibold text-sm text-paa-navy">{lib.name}</div>
                          <div className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded inline-block mt-1">{lib.type}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{lib.city}</div>
                          <div className="text-xs text-gray-500">{lib.state}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm font-medium">{lib.contactPerson}</div>
                          <div className="text-xs text-gray-500">{lib.contactNumber}</div>
                        </td>
                        <td className="p-3 text-right">
                          <button onClick={() => setEditingLib(lib)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded inline-block mr-1"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteLibrary(lib.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded inline-block"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                    {libraries.length === 0 && (
                      <tr><td colSpan={4} className="p-6 text-center text-gray-500 text-sm">No libraries found. Add one above.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs section removed as per user request */}

    </div>
  );
}
