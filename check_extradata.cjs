const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const authors = await prisma.author.findMany({ where: { NOT: { qualification: null } } });
  authors.forEach(a => {
    let ed = null;
    try { ed = JSON.parse(a.extraData || '{}'); } catch(e) {}
    console.log("Author:", a.id, "extraData:", Object.keys(ed || {}));
  });
}
main().finally(() => prisma.$disconnect());
