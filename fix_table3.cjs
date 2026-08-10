const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'components', 'OperationsDashboardPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update headers
const oldHeaders = `                {[
                  { label: 'S.No', cls: 'w-[40px] text-center' },
                  { label: 'Cover', cls: 'w-[100px]' },
                  { label: 'Book Title', cls: '' },
                  { label: 'Subtitle', cls: '' },
                  { label: 'Author', cls: '' },
                  { label: 'Genre', cls: '' },
                  { label: 'Sub-Genre', cls: '' },
                  { label: 'Synopsis', cls: '' },
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
                ]`;

const newHeaders = `                {[
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

// Normalizing line endings for replace
content = content.replace(oldHeaders.replace(/\r\n/g, '\n'), newHeaders.replace(/\r\n/g, '\n'))
                 .replace(oldHeaders.replace(/\n/g, '\r\n'), newHeaders.replace(/\n/g, '\r\n'));

// 2. Reorder table cells
const oldRowStart = `                      {/* Book Title */}
                      <td className={cell('bg-[#EFF6FF]', 'bg-[#DBEAFE]', 'font-bold text-[#0b1a2e]')}>
                        {book.title}
                        {(book.overpriced || book.isOverpriced) && (
                          <span className="ml-1 bg-yellow-100 text-yellow-800 text-[9px] px-1 py-0.5 rounded font-bold">⚠</span>
                        )}
                      </td>

                      {/* Subtitle */}
                      <td className={cell('bg-[#F0F9FF]', 'bg-[#E0F2FE]', 'text-gray-500 italic')}>
                        {(!book.subtitle || book.subtitle.trim().toUpperCase() === 'NA' || book.subtitle.trim().toUpperCase() === 'N/A') ? "" : book.subtitle}
                      </td>`;

const newRowStart = `                      {/* Book Title */}
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
                      </td>`;

const oldSynopsis = `                      {/* Synopsis */}
                      <td className={cell('bg-[#FDF4FF]', 'bg-[#FAE8FF]', 'text-[10px] italic leading-tight')} style={{ maxWidth: '200px', whiteSpace: 'normal', minWidth: '150px' }}>
                        <div className="line-clamp-3" title={book.synopsis}>{book.synopsis || <span className="text-gray-300 not-italic">—</span>}</div>
                      </td>`;

const newSynopsis = `                      {/* Synopsis */}
                      <td className={cell('bg-[#FDF4FF]', 'bg-[#FAE8FF]', 'text-[10px] italic leading-tight')} style={{ maxWidth: '250px', whiteSpace: 'normal', minWidth: '250px' }}>
                        <div className="line-clamp-2" title={book.synopsis}>{book.synopsis || <span className="text-gray-300 not-italic">—</span>}</div>
                      </td>`;

// Apply Row Start replace
content = content.replace(oldRowStart.replace(/\r\n/g, '\n'), newRowStart.replace(/\r\n/g, '\n'))
                 .replace(oldRowStart.replace(/\n/g, '\r\n'), newRowStart.replace(/\n/g, '\r\n'));

// Extract Synopsis and move it to the end
content = content.replace(oldSynopsis.replace(/\r\n/g, '\n') + '\n\n', '')
                 .replace(oldSynopsis.replace(/\n/g, '\r\n') + '\r\n\r\n', '');

const oldStockEnd = `                      {/* Stock */}
                      <td className={cell('bg-[#F0FDF4]', 'bg-[#DCFCE7]', 'text-center font-bold')} style={{ color: '#15803D' }}>
                        {book.stock ?? <span className="text-gray-300 font-normal">—</span>}
                      </td>
                    </tr>`;

const newStockEnd = `                      {/* Stock */}
                      <td className={cell('bg-[#F0FDF4]', 'bg-[#DCFCE7]', 'text-center font-bold')} style={{ color: '#15803D' }}>
                        {book.stock ?? <span className="text-gray-300 font-normal">—</span>}
                      </td>

${newSynopsis}
                    </tr>`;

content = content.replace(oldStockEnd.replace(/\r\n/g, '\n'), newStockEnd.replace(/\r\n/g, '\n'))
                 .replace(oldStockEnd.replace(/\n/g, '\r\n'), newStockEnd.replace(/\n/g, '\r\n'));

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Update successful!');
