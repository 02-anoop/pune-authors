const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const author = await prisma.author.findUnique({
    where: { email: 'arvindpuri1492@gmail.com' },
    include: { books: true }
  });
  console.log('Author books:', JSON.stringify(author.books, null, 2));
}
main().finally(() => prisma.$disconnect());
