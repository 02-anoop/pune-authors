import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Download, Search, CheckSquare, Printer, MapPin, Edit2, Trash2, Bell, X, FileDown, Loader2 } from 'lucide-react';
import { AuthorRegistrationPage } from './AuthorRegistrationPage';
import { AuthorFullProfileView } from './AuthorFullProfileView';

export const AdminAuthorsTab = React.memo(({
  authors, API, selectedAuthorIds, setSelectedAuthorIds, isDownloadingPdf, setIsDownloadingPdf,
  authorSearchTerm: searchTerm, setAuthorSearchTerm: setSearchTerm, authorStatusFilter, setAuthorStatusFilter,
  setAuthorsPage, fetchAuthors, fetchBooks, loadingAction, handleApproveAuthor, openRejectAuthorModal,
  handleViewEditAuthor, handleDeleteAuthor, handleRestoreAuthor, books, authorsMeta, authorsPage,
  selectedPendingAuthor, setSelectedPendingAuthor, selectedAuthor, setSelectedAuthor
}: any) => {
const [showArchived, setShowArchived] = useState(false);
  const [archivedAuthors, setArchivedAuthors] = useState<any[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Field definitions grouped by category (Strictly requested custom fields)
  const FIELD_CATEGORIES = [
    {
      category: 'Author Fields Selection',
      fields: [
        { id: 'name', label: 'Author Name' },
        { id: 'penName', label: 'Pen Name' },
        { id: 'email', label: 'Email' },
        { id: 'phone', label: 'Phone Number' },
        { id: 'qualification', label: 'Qualification' },
        { id: 'institution', label: 'Institute' },
        { id: 'city', label: 'City' },
        { id: 'state', label: 'State' },
        { id: 'age', label: 'Age' },
        { id: 'skills', label: 'Skills' },
        { id: 'hobbies', label: 'Hobbies' },
        { id: 'createdAt', label: 'Joining Date' },
        { id: 'booksCount', label: 'Number of Books' },
        { id: 'socialMedia', label: 'Social Media Links' },
        { id: 'booksData', label: 'Books Catalogue' },
      ]
    }
  ];

  const ALL_STANDARD_FIELD_IDS = FIELD_CATEGORIES.flatMap(c => c.fields.map(f => f.id));
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>(ALL_STANDARD_FIELD_IDS);

  const parseExtraData = (ed: any) => {
    if (!ed) return {};
    if (typeof ed === 'object') return ed;
    if (typeof ed === 'string') {
      try { return JSON.parse(ed); } catch (e) { return {}; }
    }
    return {};
  };

  const handleToggleField = (fieldId: string) => {
    setSelectedFieldIds(prev => 
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSelectAllFields = () => {
    setSelectedFieldIds([...ALL_STANDARD_FIELD_IDS]);
  };

  const handleDeselectAllFields = () => {
    setSelectedFieldIds(['name', 'email', 'phone']);
  };

  const pickFirst = (...vals: any[]) => {
    for (const v of vals) {
      if (v !== null && v !== undefined && v !== '') {
        if (Array.isArray(v) && v.length === 0) continue;
        return v;
      }
    }
    return '';
  };

  const getMergedAuthor = (author: any) => {
    const ed = parseExtraData(author.extraData);
    const opd = parseExtraData(ed?.originalProfileData);

    // Only explicitly pick fields that may be stored in extraData/originalProfileData.
    // Do NOT spread ...ed or ...opd — that would overwrite root fields like name, email, books, etc.
    return {
      ...author,
      qualification: pickFirst(author.qualification, ed.qualification, opd.qualification),
      qualificationsJson: pickFirst(author.qualificationsJson, ed.qualificationsJson, opd.qualificationsJson, author.qualifications, ed.qualifications, opd.qualifications),
      institution: pickFirst(author.institution, ed.institution, opd.institution, ed.college, opd.college, ed.university, opd.university),
      skills: pickFirst(author.skills, ed.skills, opd.skills),
      skillsJson: pickFirst(author.skillsJson, ed.skillsJson, opd.skillsJson, author.skills, ed.skills, opd.skills),
      hobbies: pickFirst(author.hobbies, ed.hobbies, opd.hobbies),
      hobbiesJson: pickFirst(author.hobbiesJson, ed.hobbiesJson, opd.hobbiesJson, author.hobbies, ed.hobbies, opd.hobbies),
      age: pickFirst(author.age, author.dob, ed.age, ed.dob, opd.age, opd.dob),
      instagram: pickFirst(author.instagram, ed.instagram, opd.instagram),
      facebook: pickFirst(author.facebook, ed.facebook, opd.facebook),
      linkedin: pickFirst(author.linkedin, ed.linkedin, opd.linkedin),
      youtube: pickFirst(author.youtube, ed.youtube, opd.youtube),
      penName: pickFirst(author.penName, ed.penName, opd.penName),
      city: pickFirst(author.city, ed.city, opd.city),
      state: pickFirst(author.state, ed.state, opd.state),
    };
  };

  const getQualificationText = (a: any) => {
    const qj = a.qualificationsJson || a.qualification;
    const formatEntry = (q: any) => {
      if (typeof q !== 'object' || !q) return String(q || '');
      const deg = q.qualification || q.degree || '';
      const subj = q.subject || q.major || q.specialization || '';
      if (deg && subj && subj !== 'N/A' && subj !== 'NA') return `${deg} (${subj})`;
      return deg || subj || '';
    };

    if (qj) {
      if (Array.isArray(qj) && qj.length > 0) {
        const formatted = qj.map(formatEntry).filter(Boolean);
        if (formatted.length > 0) return formatted.join(', ');
      }
      if (typeof qj === 'string') {
        try {
          const parsed = JSON.parse(qj);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const formatted = parsed.map(formatEntry).filter(Boolean);
            if (formatted.length > 0) return formatted.join(', ');
          }
        } catch (e) { }
      }
    }

    const raw = a.qualification || '';
    if (typeof raw === 'string' && raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const formatted = parsed.map(formatEntry).filter(Boolean);
          if (formatted.length > 0) return formatted.join(', ');
        }
      } catch (e) { }
    }
    return raw;
  };

  const getInstituteText = (a: any) => {
    if (a.institution) return a.institution;
    const qj = a.qualificationsJson || a.qualification;
    if (qj) {
      if (Array.isArray(qj) && qj.length > 0) {
        return qj.map((q: any) => typeof q === 'object' ? (q.institution || q.college || q.university || '') : '').filter(Boolean).join(', ');
      }
      if (typeof qj === 'string') {
        try {
          const parsed = JSON.parse(qj);
          if (Array.isArray(parsed)) {
            return parsed.map((q: any) => typeof q === 'object' ? (q.institution || q.college || q.university || '') : '').filter(Boolean).join(', ');
          }
        } catch (e) { }
      }
    }
    return a.institution || a.college || a.university || '';
  };

  const getSkillsText = (a: any) => {
    const sk = a.skillsJson || a.skills;
    if (!sk) return '';
    if (Array.isArray(sk)) return sk.join(', ');
    if (typeof sk === 'string') {
      try {
        const parsed = JSON.parse(sk);
        if (Array.isArray(parsed)) return parsed.join(', ');
      } catch (e) { }
      return sk;
    }
    return String(sk);
  };

  const getHobbiesText = (a: any) => {
    const hb = a.hobbiesJson || a.hobbies;
    if (!hb) return '';
    if (Array.isArray(hb)) return hb.join(', ');
    if (typeof hb === 'string') {
      try {
        const parsed = JSON.parse(hb);
        if (Array.isArray(parsed)) return parsed.join(', ');
      } catch (e) { }
      return hb;
    }
    return String(hb);
  };

  const getAgeText = (a: any) => {
    const rawAge = a.age || a.dob || '';
    if (!rawAge) return '';
    if (typeof rawAge === 'string' && rawAge.match(/^\d{4}-\d{2}-\d{2}/)) {
      const birthYear = new Date(rawAge).getFullYear();
      if (!isNaN(birthYear) && birthYear > 1900 && birthYear < 2026) {
        const ageYrs = new Date().getFullYear() - birthYear;
        return `${rawAge} (${ageYrs} yrs)`;
      }
    }
    return String(rawAge);
  };

  const getSocialMediaText = (a: any) => {
    const links: string[] = [];
    if (a.instagram) links.push(`Instagram: ${a.instagram}`);
    if (a.facebook) links.push(`Facebook: ${a.facebook}`);
    if (a.linkedin) links.push(`LinkedIn: ${a.linkedin}`);
    if (a.youtube) links.push(`YouTube: ${a.youtube}`);
    return links.length > 0 ? links.join('  |  ') : 'N/A';
  };

  const executeExcelExport = async () => {
    try {
      setIsExporting(true);
      let targetAuthors: any[] = [];
      if (exportScope === 'selected' && selectedAuthorIds && selectedAuthorIds.length > 0) {
        targetAuthors = (authors || []).filter((a: any) => selectedAuthorIds.includes(a.id) && !a.isArchived);
      } else {
        try {
          const res = await axios.get(`${API}/api/admin/authors?limit=5000`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const fetchedList = res.data.data || res.data.authors || (Array.isArray(res.data) ? res.data : []);
          // Filter out archived authors as safety net (backend also filters, but double-check)
          const nonArchived = fetchedList.filter((a: any) => !a.isArchived);
          targetAuthors = nonArchived.length > 0 ? nonArchived : (authors || []).filter((a: any) => !a.isArchived);
        } catch (e) {
          targetAuthors = (authors || []).filter((a: any) => !a.isArchived);
        }
      }

      if (!targetAuthors || targetAuthors.length === 0) {
        toast.error("No authors available for export.");
        setIsExporting(false);
        return;
      }

      if (selectedFieldIds.length === 0) {
        toast.error("Please select at least one field to export.");
        setIsExporting(false);
        return;
      }

      toast.loading("Generating customized Excel file...", { id: "export-authors-toast" });

      const ExcelModule = await import('exceljs');
      const ExcelJS = ExcelModule.default || ExcelModule;
      const fileSaverModule = await import('file-saver');
      const saveAs = fileSaverModule.saveAs || (fileSaverModule as any).default?.saveAs || fileSaverModule.default || fileSaverModule;

      // Construct headers list according to selectedFieldIds
      const headersMap: Record<string, string> = {
        name: 'Author Name',
        penName: 'Pen Name',
        email: 'Email',
        phone: 'Phone Number',
        qualification: 'Qualification',
        institution: 'Institute',
        city: 'City',
        state: 'State',
        age: 'Age',
        skills: 'Skills',
        hobbies: 'Hobbies',
        createdAt: 'Joining Date',
        booksCount: 'Number of Books',
        socialMedia: 'Social Media Links',
        booksData: 'Books Catalogue',
      };

      const selectedHeaders = ['Sr. No.', ...selectedFieldIds.map(id => headersMap[id] || id)];

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Authors Directory');
      
      // Title Banner (Heading 1)
      sheet.mergeCells(1, 1, 1, selectedHeaders.length);
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = "PUNE AUTHORS' ASSOCIATION — AUTHORS DIRECTORY";
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1A2E' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 40;
      
      // Subtitle Banner (Heading 2)
      sheet.mergeCells(2, 1, 2, selectedHeaders.length);
      const subTitleCell = sheet.getCell(2, 1);
      subTitleCell.value = `Export Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}   |   Total Records: ${targetAuthors.length} Authors`;
      subTitleCell.font = { name: 'Arial', size: 10, italic: true, bold: true, color: { argb: 'FFFFFFFF' } };
      subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(2).height = 24;

      // Blank Spacer Row
      sheet.addRow([]);
      sheet.getRow(3).height = 12;
      
      // Header Row (Column Titles)
      const headerRow = sheet.addRow(selectedHeaders);
      headerRow.height = 32;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } }; // Bright Amber Gold
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF0B1A2E' } },
          bottom: { style: 'medium', color: { argb: 'FF0B1A2E' } },
          left: { style: 'thin', color: { argb: 'FFD97706' } },
          right: { style: 'thin', color: { argb: 'FFD97706' } }
        };
      });

      // Bright Vibrant Color Palette for Excel Columns
      const fieldColorMap: Record<string, string> = {
        name: 'FFE4E6',        // Bright Light Coral / Rose
        penName: 'FEF3C7',     // Bright Gold / Amber
        email: 'E0F2FE',       // Bright Sky Blue
        phone: 'DCFCE7',       // Bright Mint Green
        qualification: 'F3E8FF',// Bright Lavender Purple
        institution: 'CFFAFE',  // Bright Cyan
        city: 'FFEDD5',        // Bright Peach Orange
        state: 'FEF9C3',       // Bright Yellow
        age: 'E0E7FF',         // Bright Indigo
        skills: 'D1FAE5',       // Bright Emerald
        hobbies: 'FCE7F3',      // Bright Pink
        createdAt: 'ECFCCB',    // Bright Lime
        booksCount: 'DBEAFE',   // Bright Light Blue
        socialMedia: 'EDE9FE',  // Bright Violet
        booksData: 'FFE4E6',    // Bright Rose
      };

      // Data Rows
      targetAuthors.forEach((rawAuthor: any, idx: number) => {
        const m = getMergedAuthor(rawAuthor);
        const rowData: any[] = [idx + 1]; // Sr. No. (1, 2, 3, ...)

        selectedFieldIds.forEach(fieldId => {
          let val = '';
          switch (fieldId) {
            case 'name': val = m.name || ''; break;
            case 'penName': val = m.penName || ''; break;
            case 'email': val = m.email || ''; break;
            case 'phone': val = m.phone || ''; break;
            case 'qualification': val = getQualificationText(m); break;
            case 'institution': val = getInstituteText(m); break;
            case 'city': val = m.city || ''; break;
            case 'state': val = m.state || ''; break;
            case 'age': val = getAgeText(m); break;
            case 'skills': val = getSkillsText(m); break;
            case 'hobbies': val = getHobbiesText(m); break;
            case 'createdAt': val = m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ''; break;
            case 'booksCount': val = m.books ? m.books.length : (m._count ? m._count.books : 0); break;
            case 'socialMedia': val = getSocialMediaText(m); break;
            case 'booksData': 
              val = m.books && m.books.length > 0 
                ? m.books.map((b: any) => `${b.title} (${b.genre || 'General'}, MRP: ₹${b.mrp || 0})`).join('; ')
                : 'No books'; 
              break;
            default:
              val = m[fieldId] !== undefined && m[fieldId] !== null 
                ? (typeof m[fieldId] === 'object' ? JSON.stringify(m[fieldId]) : String(m[fieldId])) 
                : '';
              break;
          }
          rowData.push(val);
        });

        const addedRow = sheet.addRow(rowData);
        
        // Calculate dynamic row height based on text content
        let maxLines = 1;
        rowData.forEach(val => {
          const str = String(val);
          if (str.length > 40) {
            const lines = Math.ceil(str.length / 35);
            if (lines > maxLines) maxLines = lines;
          }
        });
        addedRow.height = Math.max(26, Math.min(maxLines * 18, 90));

        addedRow.eachCell((cell, colIndex) => {
          if (colIndex === 1) {
            // Format Sr. No. Column
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // Light Slate
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
              bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
              left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
              right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            };
            return;
          }

          const fieldId = selectedFieldIds[colIndex - 2];
          cell.font = { name: 'Arial', size: 10, color: { argb: 'FF111827' } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };

          // Apply rich vibrant palette colors based on field ID
          const bgCol = 'FF' + (fieldColorMap[fieldId] || 'FFFFFF');
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgCol } };

          const isCenterAligned = ['age', 'booksCount', 'createdAt'].includes(fieldId);
          cell.alignment = { 
            horizontal: isCenterAligned ? 'center' : 'left', 
            vertical: 'middle',
            wrapText: true 
          };
        });
      });

      // Auto width starting from Header Row 4 (ignoring title banner rows 1 & 2)
      sheet.columns.forEach((column, colIdx) => {
        if (colIdx === 0) {
          column.width = 10;
          return;
        }
        let maxLength = 16;
        sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber >= 4) { // Only inspect Header and Data rows
            const cell = row.getCell(colIdx + 1);
            const columnValue = cell.value ? cell.value.toString() : '';
            // If cell has multi-line text, measure longest line length
            const lineLengths = columnValue.split('\n').map((l: string) => l.length);
            const maxLineLen = Math.max(...lineLengths, 0);
            if (maxLineLen > maxLength) {
              maxLength = maxLineLen;
            }
          }
        });
        // Cap column width between 18 and 50 so long text wraps neatly
        column.width = Math.max(18, Math.min(maxLength + 4, 50));
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `authors_custom_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Excel exported successfully!", { id: "export-authors-toast" });
      setShowExportModal(false);
    } catch (err) {
      console.error("Export Authors Excel Error:", err);
      toast.error("Failed to export Excel file. Please try again.", { id: "export-authors-toast" });
    } finally {
      setIsExporting(false);
    }
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
              if (typeof fetchBooks === 'function') fetchBooks();
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

    const filteredAuthors = useMemo(() => {
      if (showArchived) {
        // Show the archived authors fetched from the backend
        return archivedAuthors
          .filter(a => !searchTerm || a.name.toLowerCase().includes(searchTerm.toLowerCase()) || (a.email && a.email.toLowerCase().includes(searchTerm.toLowerCase())))
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
      }
      return authors.filter(a => {
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
      });
    }, [authors, archivedAuthors, showArchived, searchTerm, authorStatusFilter]);

    return (
      <div className="bg-white border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out flex flex-col">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-serif font-semibold text-[#0b1a2e] tracking-tight">List of Authors</h3>
            <span className="bg-[#0b1a2e]/10 text-[#0b1a2e] py-1 px-3 text-xs font-bold shadow-sm rounded-full">{filteredAuthors.length} Total</span>
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
              onClick={async () => {
                const next = !showArchived;
                setShowArchived(next);
                if (next && archivedAuthors.length === 0) {
                  try {
                    const res = await axios.get(`${API}/api/admin/authors?includeArchived=true&limit=5000`, {
                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    const all = res.data.data || res.data.authors || (Array.isArray(res.data) ? res.data : []);
                    setArchivedAuthors(all.filter((a: any) => a.isArchived));
                  } catch (e) {
                    setArchivedAuthors(authors.filter((a: any) => a.isArchived));
                  }
                }
              }}
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
              {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" aria-hidden="true" />} {isDownloadingPdf ? 'Generating...' : 'Soft Copy Catalogue'}
            </button>
            <button onClick={() => handleDownloadCatalogue(true)} disabled={selectedAuthorIds.length === 0 || isDownloadingPdf} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:text-[#0b1a2e] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm">
              {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" aria-hidden="true" />} {isDownloadingPdf ? 'Generating...' : 'Printing Catalogue'}
            </button>
            <button onClick={() => setShowExportModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:text-[#0b1a2e] whitespace-nowrap shadow-sm cursor-pointer">
              <Download className="w-3.5 h-3.5" aria-hidden="true" /> Export Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto w-full" style={{ contentVisibility: "auto", containIntrinsicSize: "800px" }}>
          <table className="w-full text-left text-[11px] border-collapse border-[1.5px] border-black">
            <thead className="bg-indigo-50 border-b-2 border-indigo-100">
              <tr>
                <th className="w-10 text-center p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize align-middle">
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
                <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize align-middle">Author Details</th>
                <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize align-middle">Contact</th>
                <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize align-middle">Location</th>
                <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize text-center align-middle">Status</th>
                <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize text-center align-middle">Participation</th>
                <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize text-center align-middle">Books</th>
                <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize text-center align-middle">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuthors.map((author, idx) => (
                <tr key={author.id} className={`${selectedAuthorIds.includes(author.id) ? 'bg-indigo-100' : (idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]')} hover:bg-sky-100 transition-colors`}>
                  <td className="text-center p-1 border-[1.5px] border-black align-middle">
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
                  <td className="p-1 border-[1.5px] border-black align-middle">
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
                  <td className="p-1 border-[1.5px] border-black align-middle">
                    <p className="text-paa-navy font-medium">{author.email}</p>
                    <p className="text-paa-gray-text text-xs mt-0.5 font-medium">{author.phone}</p>
                  </td>
                  <td className="p-1 border-[1.5px] border-black align-middle">
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
                  <td className="p-1 border-[1.5px] border-black text-center align-middle">
                    {(() => {
                      const ed = typeof author.extraData === 'string' ? (() => { try { return JSON.parse(author.extraData); } catch (e) { return {}; } })() : (author.extraData || {});
                      const isReapplied = ed?.isReapplied === true && author.status === 'Pending';
                      const pendingBooksCount = books.filter(b => b.authorId === author.id && b.status === 'Pending').length;

                      if (author.isArchived || author.status === 'Archived') {
                        return <span className="dash-badge" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid transparent' }}>Deleted Account</span>;
                      }
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
                  <td className="p-1 border-[1.5px] border-black text-center align-middle">
                    {author.aggEligibleEvents > 0 ? (
                      <div>
                        <div className="font-bold text-paa-navy text-sm">{Math.round((author.aggParticipatedEvents / author.aggEligibleEvents) * 100)}%</div>
                        <div className="text-[10px] font-medium text-gray-500 uppercase">{author.aggParticipatedEvents}/{author.aggEligibleEvents} Events & Fairs</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs font-bold uppercase">N/A</span>
                    )}
                  </td>
                  <td className="p-1 border-[1.5px] border-black text-center font-bold text-paa-navy align-middle">
                    {author.totalBooks}
                  </td>
                  <td className="p-1 border-[1.5px] border-black text-center align-middle">
                    <div className="inline-flex items-center justify-center min-w-[80px] gap-2 flex-wrap">
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
                onClick={() => { setAuthorsPage((p: number) => Math.max(1, p - 1)); setTimeout(fetchAuthors, 0); }}
                disabled={authorsPage === 1}
                className="px-4 py-2 border border-gray-200 rounded text-sm text-paa-navy disabled:opacity-50 font-medium bg-white hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => { setAuthorsPage((p: number) => Math.min(authorsMeta.totalPages, p + 1)); setTimeout(fetchAuthors, 0); }}
                disabled={authorsPage === authorsMeta.totalPages}
                className="px-4 py-2 border border-gray-200 rounded text-sm text-paa-navy disabled:opacity-50 font-medium bg-white hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Excel Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-8 pb-10 px-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#0b1a2e]">Export Authors Excel Data</h3>
                    <p className="text-xs text-gray-500">Select target authors and choose which fields to include in the spreadsheet.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Author Selection Scope */}
              <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2.5">1. Target Authors Selection</p>
                <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'all'}
                      onChange={() => setExportScope('all')}
                      className="accent-[#0b1a2e] w-4 h-4"
                    />
                    <span>Export All Currently Listed Authors ({authors.length})</span>
                  </label>
                  {selectedAuthorIds && selectedAuthorIds.length > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer text-emerald-700 font-semibold">
                      <input
                        type="radio"
                        name="exportScope"
                        checked={exportScope === 'selected'}
                        onChange={() => setExportScope('selected')}
                        className="accent-[#0b1a2e] w-4 h-4"
                      />
                      <span>Export Selected Authors Only ({selectedAuthorIds.length} checked)</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Field Selection Area */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    2. Choose Fields to Include ({selectedFieldIds.length} Selected)
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAllFields}
                      className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold rounded-md transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllFields}
                      className="px-2.5 py-1 text-gray-600 bg-gray-100 hover:bg-gray-200 font-semibold rounded-md transition-colors"
                    >
                      Reset Default
                    </button>
                  </div>
                </div>

                <div className="max-h-[340px] overflow-y-auto pr-1 space-y-4 border border-gray-200 rounded-xl p-4 bg-white">
                  {FIELD_CATEGORIES.map((cat) => (
                    <div key={cat.category} className="space-y-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#0b1a2e] border-b border-gray-100 pb-1">
                        {cat.category}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {cat.fields.map((field) => (
                          <label
                            key={field.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                              selectedFieldIds.includes(field.id)
                                ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900 font-medium'
                                : 'bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedFieldIds.includes(field.id)}
                              onChange={() => handleToggleField(field.id)}
                              className="accent-[#0b1a2e] w-3.5 h-3.5 rounded"
                            />
                            <span className="truncate">{field.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeExcelExport}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0b1a2e] hover:bg-[#122844] rounded-lg shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Excel Sheet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
});