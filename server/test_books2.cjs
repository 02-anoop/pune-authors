const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const author = await prisma.author.findUnique({
    where: { email: 'arvindpuri1492@gmail.com' },
    include: { books: true }
  });
  console.log('Statuses:', author.books.map(b => b.status));
}
main().finally(() => prisma.$disconnect());
