const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBooks() {
  const activeAuthors = await prisma.author.findMany({
    where: { status: 'Active', isArchived: false }
  });
  console.log(`Found ${activeAuthors.length} active authors.`);
  
  for (const author of activeAuthors) {
    const res = await prisma.book.updateMany({
      where: {
        authorId: author.id,
        OR: [
          { status: 'Archived' },
          { isArchived: true },
          { status: 'Pending' }
        ]
      },
      data: { status: 'Approved', isArchived: false }
    });
    if (res.count > 0) {
      console.log(`Updated ${res.count} books for author ${author.id}`);
    }
  }
  console.log('Done');
}
fixBooks();
