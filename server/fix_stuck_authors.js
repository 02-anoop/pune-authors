const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function run() {
  const activeAuthors = await prisma.author.findMany({ where: { status: 'Active' } });
  for (const author of activeAuthors) {
    if (author.extraData) {
      let ed = typeof author.extraData === 'string' ? JSON.parse(author.extraData) : author.extraData;
      let updated = false;
      if (ed.isReapplied === true) {
        ed.isReapplied = false;
        updated = true;
      }
      if (ed.hasPendingEdits === true) {
        ed.hasPendingEdits = false;
        updated = true;
      }
      if (updated) {
        await prisma.author.update({
          where: { id: author.id },
          data: { extraData: ed }
        });
        console.log(`Fixed author ${author.name}`);
      } else if (typeof author.extraData === 'string') {
        // Also fix stringified JSONs to object
        await prisma.author.update({
          where: { id: author.id },
          data: { extraData: ed }
        });
        console.log(`Fixed stringified extraData for ${author.name}`);
      }
    }
  }
  console.log("Done fixing DB.");
}
run();
