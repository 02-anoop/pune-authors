const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const all = await prisma.author.findMany();
  for (const a of all) {
    if (!a.qualification) continue;
    try {
       const qArr = JSON.parse(a.qualification);
       let modified = false;
       if (Array.isArray(qArr)) {
         qArr.forEach(q => {
             if (!q.level && q.qualification === 'Other') {
                q.level = 'Other';
                modified = true;
             }
         });
       }
       if (modified) {
          await prisma.author.update({ where: { id: a.id }, data: { qualification: JSON.stringify(qArr) }});
       }
    } catch(e) {}
  }
}
main().finally(() => prisma.$disconnect());
