const fs = require('fs');

const sourceFile = 'c:/Users/arvin/Desktop/pune-authors-app/scratch/authors_tab.tsx';
const targetFile = 'c:/Users/arvin/Desktop/pune-authors-app/src/app/components/AdminAuthorsTab.tsx';

let content = fs.readFileSync(sourceFile, 'utf8');

// Remove the function signature "const renderAuthorsTab = ({ refreshTrigger }: any) => {"
content = content.replace(/const renderAuthorsTab = \(\{ refreshTrigger \}: any\) => \{/, '');
// Remove the very last "};"
content = content.trim().replace(/};\s*$/, '');

const header = `import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Download, Search, CheckSquare, Printer, MapPin, Edit2, Trash2, Bell, X, FileDown } from 'lucide-react';

export const AdminAuthorsTab = React.memo(({
  authors, API, selectedAuthorIds, setSelectedAuthorIds, isDownloadingPdf, setIsDownloadingPdf,
  authorSearchTerm, setAuthorSearchTerm, authorStatusFilter, setAuthorStatusFilter,
  setAuthorsPage, fetchAuthors, loadingAction, handleApproveAuthor, openRejectAuthorModal,
  handleViewEditAuthor, handleDeleteAuthor, books, authorsMeta, authorsPage
}: any) => {
`;

// Add accessibility labels
content = content.replace(/<input type="text" placeholder="SEARCH AUTHORS..."/g, '<label htmlFor="authorSearch" className="sr-only">Search Authors</label><input id="authorSearch" type="text" placeholder="SEARCH AUTHORS..."');
content = content.replace(/<Search className="([^"]+)" \/>/g, '<Search className="$1" aria-hidden="true" />');
content = content.replace(/<Download className="([^"]+)" \/>/g, '<Download className="$1" aria-hidden="true" />');
content = content.replace(/<CheckSquare className="([^"]+)" \/>/g, '<CheckSquare className="$1" aria-hidden="true" />');
content = content.replace(/<Printer className="([^"]+)" \/>/g, '<Printer className="$1" aria-hidden="true" />');
content = content.replace(/<FileDown className="([^"]+)" \/>/g, '<FileDown className="$1" aria-hidden="true" />');
content = content.replace(/<MapPin className="([^"]+)" \/>/g, '<MapPin className="$1" aria-hidden="true" />');
content = content.replace(/<Edit2 className="([^"]+)" \/>/g, '<Edit2 className="$1" aria-hidden="true" />');
content = content.replace(/<Trash2 className="([^"]+)" \/>/g, '<Trash2 className="$1" aria-hidden="true" />');
content = content.replace(/<input type="checkbox" checked={selectedAuthorIds\.length === authors\.length && authors\.length > 0}/g, '<input type="checkbox" aria-label="Select all authors" checked={selectedAuthorIds.length === authors.length && authors.length > 0}');
content = content.replace(/<input type="checkbox" checked={selectedAuthorIds\.includes\(author\.id\)}/g, '<input type="checkbox" aria-label={`Select author ${author.name}`} checked={selectedAuthorIds.includes(author.id)}');

// Fix contrast issues on buttons if there are any obvious ones (like the ones identified in sales tab)
// The dashboard typically uses dash-btn and dash-btn-success etc.

// Apply content-visibility
content = content.replace(/<div className="overflow-x-auto">/, '<div className="overflow-x-auto w-full" style={{ contentVisibility: "auto", containIntrinsicSize: "800px" }}>');

const finalContent = header + content + '\n});';

fs.writeFileSync(targetFile, finalContent);
console.log('Created AdminAuthorsTab.tsx');
