const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const authors = await prisma.author.findMany({ where: { NOT: { qualification: null } } });
  authors.forEach(a => {
    try {
      const qArr = JSON.parse(a.qualification);
      qArr.forEach(q => {
        if (q.qualification === "Graduation") {
           console.log("Author:", a.id, a.name);
           console.log("Q:", q);
        }
      });
    } catch(e) {}
  });
}
main().finally(() => prisma.$disconnect());
