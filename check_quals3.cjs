const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const all = await prisma.author.findMany();
  let nonStandard = [];
  all.forEach(a => {
    if (a.qualification) {
       nonStandard.push(a.qualification);
    }
  });
  console.log('Total authors:', all.length);
  console.log('Sample qualifications:');
  console.log(nonStandard.slice(0, 5));
}
main().finally(() => prisma.$disconnect());
