const { PrismaClient } = require('@prisma/client'); 
const p = new PrismaClient(); 
p.author.findMany({}).then(async a => { 
  const stuck = a.filter(x => { 
    if (!x.extraData) return false;
    const str = typeof x.extraData === 'string' ? x.extraData : JSON.stringify(x.extraData);
    return str.includes('hasPendingEdits');
  }); 
  console.log('AUTHORS WITH HAS_PENDING_EDITS:', stuck.map(s => ({ name: s.name, status: s.status, ed: s.extraData }))); 
  p.$disconnect(); 
})
