const { PrismaClient } = require('@prisma/client'); 
const p = new PrismaClient(); 
p.author.findMany({}).then(async a => { 
  const stuck = a.filter(x => { 
    try { 
      const e = typeof x.extraData === 'string' ? JSON.parse(x.extraData) : (x.extraData || {}); 
      return e.hasPendingEdits; 
    } catch(err){
      return false
    } 
  }); 
  console.log('STUCK AUTHORS:', stuck.map(s => s.name + ' (' + s.status + ')')); 
  
  // Auto-fix the stuck authors by setting their status to 'Edited'
  for (const author of stuck) {
    if (author.status !== 'Edited') {
      await p.author.update({
        where: { id: author.id },
        data: { status: 'Edited' }
      });
      console.log(`Updated status to 'Edited' for ${author.name}`);
    }
  }
  
  p.$disconnect(); 
})
