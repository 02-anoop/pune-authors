const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const all = await prisma.author.findMany();
  let results = [];
  for (const a of all) {
    if (!a.qualification) continue;
    try {
       const qArr = JSON.parse(a.qualification);
       if (Array.isArray(qArr)) {
         qArr.forEach(q => {
             results.push({ name: a.name, email: a.email, level: q.level || 'MISSING', degree: q.qualification, cert: q.certificateUrl });
         });
       }
    } catch(e) {}
  }
  console.table(results);
}
main().finally(() => prisma.$disconnect());
