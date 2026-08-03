const { PrismaClient } = require('../node_modules/@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('Books@paa2025', 10);
  const user = await prisma.user.upsert({
    where: { email: 'Info@puneauthorsassociation.com' },
    update: { role: 'ADMIN', password: hash },
    create: {
      email: 'Info@puneauthorsassociation.com',
      name: 'Admin Info',
      password: hash,
      role: 'ADMIN'
    }
  });
  console.log('User upserted:', user.email);
}
main().catch(console.error).finally(() => prisma.$disconnect());
