const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function run() {
  const author = await prisma.author.findFirst({ where: { name: "Dr Saroj Salelkar" }, select: { name: true, status: true, extraData: true } });
  console.log(JSON.stringify(author, null, 2));
}
run();
