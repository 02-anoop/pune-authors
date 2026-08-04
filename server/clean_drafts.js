const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function cleanDrafts() {
  const authors = await prisma.eventAuthor.findMany({
    where: { optInStatus: { endsWith: '-Draft' } }
  });
  console.log('Found ' + authors.length + ' authors with -Draft');
  for (const a of authors) {
    await prisma.eventAuthor.update({
      where: { id: a.id },
      data: { optInStatus: a.optInStatus.replace('-Draft', '') }
    });
  }
  console.log('Done cleaning drafts.');
}
cleanDrafts().then(() => prisma.$disconnect());
