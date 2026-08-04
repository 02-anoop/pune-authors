const fs = require('fs');
const file = 'src/app/components/OperationsDashboardPage.tsx';

try {
  let content = fs.readFileSync(file, 'utf8');

  const searchStr = '<div className="flex justify-between items-center mb-4 mt-8">\n                <div>\n                  <h4 className="font-bold text-gray-700">\n                    Authors Participated / Registered';
  const startIndex = content.indexOf(searchStr);

  if (startIndex === -1) {
    console.log("Could not find start index");
    process.exit(1);
  }

  // Find the end of this block which is `)}` right before `</div>\n      );\n    }`
  const endSearchStr = '            </div>\n          )}\n        </div>\n      );\n    }\n\n    if (isRefreshing)';
  const endIndex = content.indexOf(endSearchStr, startIndex);

  if (endIndex === -1) {
    console.log("Could not find end index");
    process.exit(1);
  }

  // Remove everything from startIndex to endIndex (exclusive, meaning we keep `            </div>\n          )}\n        </div>\n      );\n    }\n\n    if (isRefreshing)`)
  // Wait, the legacy block is INSIDE `{!selectedAuthorForData ? (` block ?
  // No, the block is:
  //           ) : (
  //             <div>
  //               <EventExcelManager ... />
  //               <div className="flex justify-between items-center mb-4 mt-8">...
  //             </div>
  //           )}

  // So if we remove the legacy table, we just remove the block starting at `<div className="flex justify-between items-center mb-4 mt-8">`
  // up to the `</div>` that closes the `<div ...> <EventExcelManager /> ... </div>`.

  // Let's replace the whole `Authors Participated / Registered` section with nothing.
  content = content.substring(0, startIndex) + '\n' + content.substring(endIndex);

  fs.writeFileSync(file, content);
  console.log('SUCCESS');
} catch (e) {
  console.error('ERROR', e);
}
