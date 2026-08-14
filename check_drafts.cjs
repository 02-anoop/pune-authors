const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const drafts = await prisma.authorDraft.findMany();
  let found = 0;
  drafts.forEach(d => {
    try {
      const q = typeof d.qualifications === 'string' ? JSON.parse(d.qualifications) : d.qualifications;
      if (Array.isArray(q)) {
        q.forEach(i => {
           if (i.qualification && !["Graduation", "Post-Graduation", "Ph.D", "Other", "Diploma"].includes(i.qualification)) {
             console.log("Draft Email:", d.email, "=>", i.qualification);
             found++;
           }
        });
      }
    } catch(e) {}
  });
  console.log("Found", found, "drafts with specific degrees");
}
main().finally(() => prisma.$disconnect());
