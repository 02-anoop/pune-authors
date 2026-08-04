const { PrismaClient } = require('@prisma/client'); 
const p = new PrismaClient(); 
p.author.findMany({}).then(async a => { 
  const stuck = a.filter(x => { 
    if (!x.extraData) return false;
    let ed = x.extraData;
    if (typeof ed === 'string') {
      try { ed = JSON.parse(ed); } catch(e) {}
    }
    if (typeof ed === 'string') {
      try { ed = JSON.parse(ed); } catch(e) {}
    }
    return ed && ed.hasPendingEdits; // ANY truthy value
  }); 
  console.log('STUCK AUTHORS TRUTHY:', stuck.map(s => `${s.name} (${s.status}) - ${typeof s.extraData === 'string' ? s.extraData : JSON.stringify(s.extraData)}`)); 
  p.$disconnect(); 
})
