const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Finding archived authors...');
    const archivedAuthors = await prisma.author.findMany({
      where: { isArchived: true },
      select: { id: true, name: true }
    });

    console.log(`Found ${archivedAuthors.length} archived authors.`);
    
    for (const author of archivedAuthors) {
      console.log(`Processing author: "${author.name}" (ID: ${author.id})...`);
      const updateResult = await prisma.book.updateMany({
        where: { authorId: author.id, isArchived: false },
        data: { isArchived: true }
      });
      console.log(`-> Archived ${updateResult.count} books.`);
    }

    console.log('Cleanup complete!');
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
