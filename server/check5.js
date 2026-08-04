const { PrismaClient } = require('@prisma/client'); 
const p = new PrismaClient(); 
p.author.findMany({ where: { status: 'Active' } }).then(async a => { 
  const stuck = a.filter(x => { 
    if (!x.extraData) return false;
    let ed = x.extraData;
    if (typeof ed === 'string') {
      try { ed = JSON.parse(ed); } catch(e) {}
    }
    // Also parse nested stringified extraData just in case
    if (typeof ed === 'string') {
      try { ed = JSON.parse(ed); } catch(e) {}
    }
    return ed && ed.hasPendingEdits === true;
  }); 
  console.log('STUCK AUTHORS:', stuck.map(s => s.name)); 
  
  for (const author of stuck) {
    await p.author.update({
      where: { id: author.id },
      data: { status: 'Edited' }
    });
    console.log(`Updated status to 'Edited' for ${author.name}`);
  }
  
  p.$disconnect(); 
})
