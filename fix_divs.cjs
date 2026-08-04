const fs = require('fs');
const file = 'src/app/components/EventExcelManager.tsx';

try {
  let content = fs.readFileSync(file, 'utf8');

  // Change Actions header to bright yellow
  content = content.replace('className="border-[1.5px] border-black bg-gray-200 p-1 w-24">Actions</th>', 'className="border-[1.5px] border-black bg-[#FFE600] p-1 w-24">Actions</th>');

  // Fix mrp cell (Line 317)
  content = content.replace(
    /<td className=\{\`border-\[1\.5px\] border-black p-0 \$\{isEditing \? 'bg-white' : 'bg-\\[#ffddaa\\]'\} text-black font-mono font-bold\`\}>[\s\S]*?<\/td>/,
    `<td className={\`border-[1.5px] border-black \${isEditing ? 'bg-white p-0' : 'bg-[#ffddaa] p-1'} text-black text-center font-mono font-bold\`}>
                        {isEditing ? (
                          <input
                            type="number"
                            className="w-full h-full p-1 bg-transparent border-none text-center outline-none font-bold font-mono"
                            value={book.overrideMrp !== undefined && book.overrideMrp !== "" ? book.overrideMrp : mrp}
                            onChange={(e) => handleMrpChange(author.authorId, bIdx, e.target.value)}
                          />
                        ) : (
                          mrp
                        )}
                      </td>`
  );

  // Fix actualSent cell (Line 340)
  content = content.replace(
    /<td className=\{\`border-\[1\.5px\] border-black text-black p-0 bg-white\`\}>[\s\S]*?<\/td>/,
    `<td className={\`border-[1.5px] border-black text-black \${isEditing ? 'p-0' : 'p-1 text-center font-bold'} bg-white\`}>
                        {isEditing ? (
                          <input 
                            type="number"
                            className="w-full h-full p-1 bg-transparent border-none text-center outline-none font-bold"
                            value={book.actualSent}
                            onChange={(e) => handleActualSentChange(author.authorId, bIdx, e.target.value)}
                          />
                        ) : (
                          book.actualSent
                        )}
                      </td>`
  );

  // Fix daily sales cell (Line 354)
  content = content.replace(
    /<td key=\{dc\.label\} className=\{\`border-\[1\.5px\] border-black p-0 bg-white\`\}>[\s\S]*?<\/td>/g,
    `<td key={dc.label} className={\`border-[1.5px] border-black \${isEditing ? 'p-0' : 'p-1 text-center font-bold'} bg-white\`}>
                          {isEditing ? (
                            <input 
                              type="number"
                              className="w-full h-full p-1 bg-transparent border-none text-center outline-none font-bold"
                              value={book.manualDailySales?.[dc.dateStr]?.sold ?? ""}
                              onChange={(e) => handleCellChange(author.authorId, bIdx, dc.dateStr, e.target.value)}
                            />
                          ) : (
                            book.manualDailySales?.[dc.dateStr]?.sold ?? ""
                          )}
                        </td>`
  );

  // Fix status cell
  content = content.replace(
    /<div className="flex justify-center items-center h-full">\s*<span className=\{\`px-2 py-1 text-\[9px\] leading-tight rounded-full text-black whitespace-normal break-words inline-block max-w-full \$\{author\.optInStatus === 'Pending Approval' \|\| author\.optInStatus === 'Pending' \? 'bg-yellow-300' : author\.optInStatus === 'Rejected' \? 'bg-red-300' : 'bg-green-300'\}\`\}>\s*\{author\.optInStatus \|\| "Registered"\}\s*<\/span>\s*<\/div>/,
    `{author.optInStatus || "Registered"}`
  );

  // Status td also needs to reflect color directly if requested, or just text. Let's make the text bold without the nested tags
  // The above replace stripped out the div and span.

  fs.writeFileSync(file, content);
  console.log('SUCCESS');
} catch (e) {
  console.error('ERROR', e);
}
