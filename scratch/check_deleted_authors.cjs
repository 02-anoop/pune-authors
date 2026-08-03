const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const authors = await prisma.author.findMany({
      where: {
        OR: [
          { name: { contains: 'Siddharth', mode: 'insensitive' } },
          { name: { contains: 'Sritapa', mode: 'insensitive' } }
        ]
      },
      include: { books: true }
    });
    
    console.log(`Found ${authors.length} authors:`);
    authors.forEach(a => {
      console.log(`\nAuthor: ${a.name} (ID: ${a.id})`);
      console.log(`- Status: ${a.status}`);
      console.log(`- isArchived: ${a.isArchived}`);
      console.log(`- Books count: ${a.books.length}`);
      a.books.forEach(b => {
        console.log(`  * Book ID: ${b.id}, Title: "${b.title}", Status: ${b.status}, isArchived: ${b.isArchived}`);
      });
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
