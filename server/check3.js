const { PrismaClient } = require('@prisma/client'); 
const p = new PrismaClient(); 
p.author.findMany({ where: { status: 'Edited' } }).then(async a => { 
  console.log('AUTHORS WITH EDITED STATUS:', a.map(x => x.name)); 
  p.$disconnect(); 
})
