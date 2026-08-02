const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/components/OperationsDashboardPage.tsx');
let content = fs.readFileSync(file, 'utf8');

// Fix the corrupted expectedFee line and the doubled td
// The corrupted block looks like:
// const expectedFee =
//   selectedEventBreakdown.feeType === "Per Title"
//     ? (m.books?.length |                                 <td ...
//     ...doubled book listing td...
//   </td>"flex flex-col gap-0.5">
//   ...second copy...
//   </td>

// Find and replace the corrupted section
const corruptedStart = `                           const expectedFee =\r\n                             selectedEventBreakdown.feeType === "Per Title"\r\n                               ? (m.books?.length |                                 <td className="p-3 text-sm text-gray-600 min-w-[180px]">\r\n                                  {(status !== 'Pending' && status !== 'Unpublished') && m.books && m.books.length > 0 ? (\r\n                                    <div className="flex flex-col gap-0.5">\r\n                                      {m.books.map((b: any, bi: number) => (\r\n                                        <span key={bi} className="text-[11px] text-gray-700 leading-tight">\r\n                                          <span className="font-medium">{b.book?.title || b.title || 'Book'}</span>\r\n                                          {' '}<span className="text-paa-navy font-bold">x{b.listedStock || 0}</span>\r\n                                        </span>\r\n                                      ))}\r\n                                    </div>\r\n                                  ) : (\r\n                                    <span className="text-gray-400 text-xs italic">—</span>\r\n                                  )}\r\n                                </td>"flex flex-col gap-0.5">\r\n                                      {m.books.map((b: any, bi: number) => (\r\n                                        <span key={bi} className="text-[11px] text-gray-700 leading-tight">\r\n                                          <span className="font-medium">{b.book?.title || b.title || 'Book'}</span>\r\n                                          {' '}<span className="text-paa-navy font-bold">x{b.listedStock || 0}</span>\r\n                                        </span>\r\n                                      ))}\r\n                                    </div>\r\n                                  ) : (\r\n                                    <span className="text-gray-400 text-xs italic">—</span>\r\n                                  )}\r\n                                </td>`;

const fixedSection = `                           const expectedFee =
                             selectedEventBreakdown.feeType === "Per Title"
                               ? (m.books?.length || 0) *
                                 (selectedEventBreakdown.registrationFee || 0)
                               : selectedEventBreakdown.registrationFee || 0;
                          return (
                            <React.Fragment key={i}>
                              <tr
                                className={\`hover:bg-indigo-50/50 transition-colors \${i % 2 === 0 ? "bg-white" : "bg-sky-100"}\`}
                              >
                                <td className="sticky left-0 z-10 bg-inherit shadow-[1px_0_0_rgba(0,0,0,0.1)]">
                                  <p className="font-bold text-paa-navy pl-4">
                                    {authorData?.name || "Unknown"}
                                  </p>
                                </td>
                                <td className="p-3 text-sm text-gray-600 min-w-[180px]">
                                  {(status !== 'Pending' && status !== 'Unpublished') && m.books && m.books.length > 0 ? (
                                    <div className="flex flex-col gap-0.5">
                                      {m.books.map((b: any, bi: number) => (
                                        <span key={bi} className="text-[11px] text-gray-700 leading-tight">
                                          <span className="font-medium">{b.book?.title || b.title || 'Book'}</span>
                                          {' '}<span className="text-paa-navy font-bold">x{b.listedStock || 0}</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs italic">—</span>
                                  )}
                                </td>`;

// Normalize line endings in search
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedCorrupted = corruptedStart.replace(/\r\n/g, '\n');
const normalizedFixed = fixedSection.replace(/\n/g, '\r\n');

if (normalizedContent.includes(normalizedCorrupted)) {
  content = normalizedContent.replace(normalizedCorrupted, normalizedFixed);
  // Re-add \r\n line endings
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed successfully!');
} else {
  console.log('Corrupted section not found with normalized line endings. Trying raw search...');
  // Try to find the key corrupted marker
  const marker = `? (m.books?.length |`;
  if (content.includes(marker)) {
    console.log('Found marker! Index:', content.indexOf(marker));
  } else {
    console.log('Marker not found either. Printing lines 6400-6435:');
    const lines = content.split('\n');
    for (let i = 6399; i <= 6434; i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
  }
}
