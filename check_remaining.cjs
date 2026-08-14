const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const all = await prisma.author.findMany();
  let remaining = [];
  for (const a of all) {
    if (!a.qualification) continue;
    try {
       const qArr = JSON.parse(a.qualification);
       if (Array.isArray(qArr)) {
         qArr.forEach(q => {
           if (['Graduation', 'Post-Graduation', 'Ph.D', 'Diploma'].includes(q.qualification)) {
             remaining.push({ email: a.email, name: a.name, qual: q.qualification, cert: q.certificateUrl });
           }
         });
       }
    } catch(e) {}
  }
  console.log('Remaining:', remaining);
}
main().finally(() => prisma.$disconnect());
