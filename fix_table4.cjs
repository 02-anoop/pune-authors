const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'app', 'components', 'OperationsDashboardPage.tsx');
let code = fs.readFileSync(file, 'utf-8');

const correctHeaders = `                {[
                  { label: 'S.No', cls: 'w-[40px] text-center' },
                  { label: 'Cover', cls: 'w-[100px]' },
                  { label: 'Book Title', cls: 'w-[180px] max-w-[180px] break-words whitespace-normal' },
                  { label: 'Subtitle', cls: 'w-[80px] max-w-[80px] break-words whitespace-normal' },
                  { label: 'Author', cls: 'w-[120px] max-w-[120px] break-words whitespace-normal' },
                  { label: 'Genre', cls: '' },
                  { label: 'Sub-Genre', cls: '' },
                  { label: 'ISBN', cls: 'text-center' },
                  { label: 'MRP', cls: 'text-center' },
                  { label: 'Language', cls: 'text-center' },
                  { label: 'Format', cls: 'text-center' },
                  { label: 'Pages', cls: 'text-center' },
                  { label: 'Publisher', cls: '' },
                  { label: 'Edition', cls: 'text-center' },
                  { label: 'Pub Date', cls: 'text-center' },
                  { label: 'Status', cls: 'text-center' },
                  { label: 'Stock', cls: 'text-center' },
                  { label: 'Synopsis', cls: 'w-[250px] max-w-[250px] break-words whitespace-normal' },
                ]`;

code = code.replace(/\{\[\s*\{\s*label:\s*'S\.No'[\s\S]*?\}\s*\]/, correctHeaders);

const oldRowStartRegex = /\{\/\* Book Title \*\/\}[\s\S]*?\{\/\* Subtitle \*\/\}[\s\S]*?\{\/\* Author \*\/\}/;
const newRowStart = `{/* Book Title */}
                      <td className={cell('bg-[#EFF6FF]', 'bg-[#DBEAFE]', 'font-bold text-[#0b1a2e]')}>
                        <div className="w-[180px] max-w-[180px] break-words whitespace-normal leading-snug">
                          {book.title}
                          {(book.overpriced || book.isOverpriced) && (
                            <span className="ml-1 bg-yellow-100 text-yellow-800 text-[9px] px-1 py-0.5 rounded font-bold">⚠</span>
                          )}
                        </div>
                      </td>

                      {/* Subtitle */}
                      <td className={cell('bg-[#F0F9FF]', 'bg-[#E0F2FE]', 'text-gray-500 italic')}>
                        <div className="w-[80px] max-w-[80px] break-words whitespace-normal leading-snug">
                          {(!book.subtitle || book.subtitle.trim().toUpperCase() === 'NA' || book.subtitle.trim().toUpperCase() === 'N/A') ? "" : book.subtitle}
                        </div>
                      </td>

                      {/* Author */}`;
code = code.replace(oldRowStartRegex, newRowStart);

code = code.replace(/\{\/\* Synopsis \*\/\}[\s\S]*?<\/td>\s*/g, '');

const endOfTrRegex = /\{\/\* Stock \*\/\}[\s\S]*?<\/td>\s*<\/tr>/;
const newEndOfTr = `{/* Stock */}
                      <td className={cell('bg-[#F0FDF4]', 'bg-[#DCFCE7]', 'text-center font-bold')} style={{ color: '#15803D' }}>
                        {book.stock ?? <span className="text-gray-300 font-normal">—</span>}
                      </td>

                      {/* Synopsis */}
                      <td className={cell('bg-[#FDF4FF]', 'bg-[#FAE8FF]', 'text-[10px] italic leading-tight')} style={{ maxWidth: '250px', whiteSpace: 'normal', minWidth: '250px' }}>
                        <div className="line-clamp-2" title={book.synopsis}>{book.synopsis || <span className="text-gray-300 not-italic">—</span>}</div>
                      </td>
                    </tr>`;
code = code.replace(endOfTrRegex, newEndOfTr);

fs.writeFileSync(file, code, 'utf-8');
console.log('Update successful 4!');
