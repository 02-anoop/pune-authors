const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const author = await prisma.author.findFirst({ where: { institution: 'NIT WARANGAL' } });
  if (author) {
    console.log('Author email:', author.email);
    console.log('Author quals in db:', author.qualification);
    const draft = await prisma.authorDraft.findUnique({ where: { email: author.email } });
    console.log('Draft quals:', draft ? draft.qualifications : 'Not found');
  } else {
    console.log('Author not found');
  }
}
main().finally(() => prisma.$disconnect());
