const fs = require('fs');
const file = 'c:/Users/arvin/Desktop/pune-authors-app/src/app/components/AdminOverviewTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove corrupted comments
content = content.replace(/\/\*[\s\S]*?ÃƒÆ’[\s\S]*?\*\//g, '');

// The Pending Actions section is currently at the top. Let's find it.
const pendingActionsStart = content.indexOf('<div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm">');
const pendingActionsHeader = content.indexOf('Pending Actions', pendingActionsStart);
if (pendingActionsStart > -1 && pendingActionsHeader > -1) {
    // The current layout has Pending Actions at top, then High Level KPIs, then Visual Data Insights (col-span-2) + Pending Actions & Low Stock (col-span-1)
    
    // Let's find the Low Stock block
    const lowStockStartStr = '<div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm flex flex-col h-[500px]">';
    const lowStockStart = content.indexOf(lowStockStartStr);
    
    if (lowStockStart > -1) {
        // We need to extract the whole Low Stock block.
        // It starts at lowStockStart. Let's find its matching closing div.
        let braces = 0;
        let lowStockEnd = -1;
        for (let i = lowStockStart; i < content.length; i++) {
            if (content.substr(i, 4) === '<div') braces++;
            if (content.substr(i, 5) === '</div') {
                braces--;
                if (braces === 0) {
                    lowStockEnd = i + 6; // include </div>
                    break;
                }
            }
        }
        
        if (lowStockEnd > -1) {
            let lowStockBlock = content.substring(lowStockStart, lowStockEnd);
            
            // Remove the Low Stock Block and its parent div `<div className="space-y-6">`
            // Actually, let's just replace the whole `<div className="space-y-6"> \n <div class...h-[500px]">...</div>\n</div>`
            
            // Or just remove the `lowStockBlock` and any empty `div` wrapping it.
            // Let's use regex to remove the wrapper.
            content = content.substring(0, lowStockStart) + '/* LOW_STOCK_REMOVED */' + content.substring(lowStockEnd);
            content = content.replace(/<div className="space-y-6">\s*\/\* LOW_STOCK_REMOVED \*\/\s*<\/div>/, '');
            content = content.replace('/* LOW_STOCK_REMOVED */', '');
            
            // Also need to remove the wrapper `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">` around Visual Insights since it's now just col-span-2.
            // Actually, we can just change `lg:col-span-2` to `lg:col-span-3` or remove the grid wrapper and let it be full width.
            content = content.replace(/<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">\s*<div className="lg:col-span-2 space-y-6">/, '<div className="space-y-6">');
            // This leaves an extra `</div>` at the end of the file.
            // So let's find the last two `</div>` before the `return` ends.
            // Actually it's easier to just change `lg:grid-cols-3` to `lg:grid-cols-1` and `lg:col-span-2` to `lg:col-span-1`
            content = content.replace('grid-cols-1 lg:grid-cols-3 gap-6', 'grid-cols-1 gap-6');
            content = content.replace('lg:col-span-2 space-y-6', 'space-y-6');
            
            // Now, we need to insert `lowStockBlock` into the top Pending Actions area.
            // We want them side-by-side or stacked?
            // "Taking full width to the right of tabs" -> side by side in a 2 column grid?
            // The top level is:
            /*
              <div className="space-y-6">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                       // Old Pending Actions Block
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                       // Low Stock Block
                    </div>
                 </div>
                 ... KPIs ...
            */
            
            // Let's find the old Pending Actions block
            let paBraces = 0;
            let paEnd = -1;
            for (let i = pendingActionsStart; i < content.length; i++) {
                if (content.substr(i, 4) === '<div') paBraces++;
                if (content.substr(i, 5) === '</div') {
                    paBraces--;
                    if (paBraces === 0) {
                        paEnd = i + 6;
                        break;
                    }
                }
            }
            
            if (paEnd > -1) {
                let paBlock = content.substring(pendingActionsStart, paEnd);
                
                // Construct new combined block
                let combinedBlock = `
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            ${paBlock}
          </div>
          <div className="space-y-6">
            ${lowStockBlock}
          </div>
        </div>
`;
                
                content = content.substring(0, pendingActionsStart) + combinedBlock + content.substring(paEnd);
            }
        }
    }
}

fs.writeFileSync(file, content);
console.log("Done");
