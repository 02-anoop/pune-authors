const fs = require('fs');
const file = 'src/app/components/OperationsDashboardPage.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const tbodyIndex = lines.findIndex((l, i) => l.includes('<tbody>') && lines[i+1].includes('{books'));
const endIndex = lines.findIndex((l, i) => i > tbodyIndex && l.includes('{/* Genre */}'));

const insert = `              {books
                .filter((b) => bookStatusFilter === 'All' || b.status === bookStatusFilter)
                .filter((b) => {
                  if (!bookSearchTerm) return true;
                  const term = bookSearchTerm.toLowerCase();
                  return (
                    (b.title && b.title.toLowerCase().includes(term)) ||
                    (b.authorName && b.authorName.toLowerCase().includes(term))
                  );
                })
                .sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }))
                .map((book, idx) => {
                  const even = idx % 2 === 0;
                  const cell = (bg0, bg1, extra = '') =>
                    \`px-2 py-1.5 border border-black/15 align-middle \${extra}\` + ' ' + (even ? bg0 : bg1);
                  return (
                    <tr key={book.id} className="hover:brightness-[0.96] transition-all">
                      {/* S.No */}
                      <td className={cell('bg-[#E2E8F0]', 'bg-[#CBD5E1]', 'text-center font-bold text-gray-500')}>{idx + 1}</td>

                      {/* Cover: front + back thumbnails */}
                      <td className={cell('bg-[#F8FAFC]', 'bg-[#F1F5F9]')}>
                        <div className="flex gap-1 justify-center">
                          {[book.coverUrl, book.backCoverUrl].map((url, ci) => (
                            <div key={ci} className="relative w-11 h-16 bg-gray-100 rounded border border-gray-300 overflow-hidden shrink-0">
                              {url
                                ? <img loading="lazy" src={url.startsWith('http') ? url : \`\${API}\${url.startsWith('/') ? '' : '/'}\${url}\`} alt={ci === 0 ? 'Front' : 'Back'} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.target).style.display = 'none'; }} />
                                : <span className="text-[7px] text-gray-300 font-bold absolute inset-0 flex items-center justify-center">{ci === 0 ? 'F' : 'B'}</span>}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Book Title */}
                      <td className={cell('bg-[#EFF6FF]', 'bg-[#DBEAFE]', 'font-bold text-[#0b1a2e]')}>
                        {book.title}
                        {(book.overpriced || book.isOverpriced) && (
                          <span className="ml-1 bg-yellow-100 text-yellow-800 text-[9px] px-1 py-0.5 rounded font-bold">⚠</span>
                        )}
                      </td>

                      {/* Subtitle */}
                      <td className={cell('bg-[#F0F9FF]', 'bg-[#E0F2FE]', 'text-gray-500 italic')}>
                        {(!book.subtitle || book.subtitle.trim().toUpperCase() === 'NA' || book.subtitle.trim().toUpperCase() === 'N/A') ? "" : book.subtitle}
                      </td>

                      {/* Author */}
                      <td className={cell('bg-[#FFF7ED]', 'bg-[#FFEDD5]', 'font-bold text-[#0b1a2e]')}>{book.authorName}</td>`;

lines.splice(tbodyIndex + 1, endIndex - (tbodyIndex + 1), ...insert.split('\n'));
fs.writeFileSync(file, lines.join('\n'));
console.log('Fixed');
