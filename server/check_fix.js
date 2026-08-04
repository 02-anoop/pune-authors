const { PrismaClient } = require('@prisma/client'); 
const p = new PrismaClient(); 
p.author.findMany({}).then(async a => { 
  const stuck = a.filter(x => { 
    if (!x.extraData) return false;
    let ed = x.extraData;
    if (typeof ed === 'string') {
      try { ed = JSON.parse(ed); } catch(e) {}
    }
    return ed && ed.hasPendingEdits === true && x.status !== 'Edited';
  }); 
  console.log('STUCK AUTHORS TRUTHY:', stuck.map(s => `${s.name} (${s.status})`)); 
  for (const s of stuck) {
      await p.author.update({ where: { id: s.id }, data: { status: 'Edited' } });
      console.log('Fixed:', s.name);
  }
  p.$disconnect(); 
})
