const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.notification.findMany({ 
  where: { documentUrl: { not: null } },
  select: { message: true, documentUrl: true } 
}).then(n => console.log(JSON.stringify(n, null, 2))).finally(() => prisma.$disconnect());
