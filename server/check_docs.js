const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const notifs = await prisma.notification.findMany({
    where: { documentUrl: { not: null } }
  });
  console.log("Documents:");
  notifs.forEach(n => console.log(n.id, n.message, n.documentUrl, n.documentName));
}

main().catch(console.error).finally(() => prisma.$disconnect());
