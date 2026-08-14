const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const all = await prisma.author.findMany();
  for (const a of all) {
    if (a.qualification && a.qualification.includes('NIT WARANGAL')) {
       console.log('Author email:', a.email);
       console.log('Author quals:', a.qualification);
       const draft = await prisma.authorDraft.findUnique({ where: { email: a.email } });
       console.log('Draft quals:', draft ? draft.qualifications : 'Not found');
    }
  }
}
main().finally(() => prisma.$disconnect());
