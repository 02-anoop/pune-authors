const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const authors = await prisma.author.findMany({ where: { NOT: { qualification: null } } });
  let stats = {};
  let count = 0;
  authors.forEach(a => {
    try {
      const qArr = JSON.parse(a.qualification);
      qArr.forEach(q => {
        if (!stats[q.qualification]) stats[q.qualification] = 0;
        stats[q.qualification]++;
      });
      count++;
    } catch(e) {}
  });
  console.log(stats);
  console.log("Parsed", count, "authors");
}
main().finally(() => prisma.$disconnect());
