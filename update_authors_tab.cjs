const fs = require('fs');

const file = 'c:/Users/arvin/Desktop/pune-authors-app/src/app/components/OperationsDashboardPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "{activeTab === 'authors' && renderAuthorsTab({ refreshTrigger: lastRefreshTime })}",
  "{activeTab === 'authors' && <Suspense fallback={<div className='p-10 text-center animate-pulse'>Loading Authors...</div>}><AdminAuthorsTabLazy authors={authors} API={API} selectedAuthorIds={selectedAuthorIds} setSelectedAuthorIds={setSelectedAuthorIds} isDownloadingPdf={isDownloadingPdf} setIsDownloadingPdf={setIsDownloadingPdf} authorSearchTerm={authorSearchTerm} setAuthorSearchTerm={setAuthorSearchTerm} authorStatusFilter={authorStatusFilter} setAuthorStatusFilter={setAuthorStatusFilter} setAuthorsPage={setAuthorsPage} fetchAuthors={fetchAuthors} loadingAction={loadingAction} handleApproveAuthor={handleApproveAuthor} openRejectAuthorModal={openRejectAuthorModal} handleViewEditAuthor={handleViewEditAuthor} handleDeleteAuthor={handleDeleteAuthor} books={books} authorsMeta={authorsMeta} authorsPage={authorsPage} /></Suspense>}"
);

content = content.replace(
  "const SalesReportTabLazy = lazy(() => import('./SalesReportTab').then(m => ({ default: m.SalesReportTab })));",
  "const SalesReportTabLazy = lazy(() => import('./SalesReportTab').then(m => ({ default: m.SalesReportTab })));\\nconst AdminAuthorsTabLazy = lazy(() => import('./AdminAuthorsTab').then(m => ({ default: m.AdminAuthorsTab })));"
);

content = content.replace(
  /const renderAuthorsTab = \(\{ refreshTrigger \}: any\) => \{[\s\S]*?(?=^\s*const BooksTab = \(\) => \{)/m,
  ""
);

fs.writeFileSync(file, content);
console.log('Successfully updated OperationsDashboardPage.tsx');
