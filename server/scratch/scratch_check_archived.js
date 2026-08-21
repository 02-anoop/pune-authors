const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const authors = await prisma.author.findMany({
    where: { isArchived: true },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      isArchived: true
    }
  });
  console.log("Archived Authors: ", JSON.stringify(authors, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
