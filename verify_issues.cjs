const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const all = await prisma.author.findMany();
  let issues = [];
  for (const a of all) {
    if (!a.qualification) continue;
    try {
       const qArr = JSON.parse(a.qualification);
       if (Array.isArray(qArr)) {
         qArr.forEach(q => {
             if (!q.level || q.level === 'MISSING' || ['Graduation', 'Post-Graduation', 'Ph.D', 'Diploma'].includes(q.qualification)) {
                issues.push({ name: a.name, email: a.email, level: q.level, degree: q.qualification, cert: q.certificateUrl });
             }
         });
       }
    } catch(e) {}
  }
  console.log('Issues found:', issues.length);
  if (issues.length > 0) console.table(issues);
}
main().finally(() => prisma.$disconnect());
