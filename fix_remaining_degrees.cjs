const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const all = await prisma.author.findMany();
  let count = 0;
  for (const a of all) {
    if (!a.qualification) continue;
    let modified = false;
    let currentQuals = [];
    try {
       currentQuals = JSON.parse(a.qualification);
       if (Array.isArray(currentQuals)) {
         currentQuals.forEach(q => {
           if (['Graduation', 'Post-Graduation', 'Ph.D', 'Diploma'].includes(q.qualification)) {
             let cert = q.certificateUrl ? q.certificateUrl.toLowerCase() : '';
             let specific = '';
             if (cert.includes('b.tech') || cert.includes('btech')) specific = 'B.Tech/B.E.';
             else if (cert.includes('be degree')) specific = 'B.Tech/B.E.';
             else if (cert.includes('ma cert') || cert.includes('ma_') || cert.includes('m.a')) specific = 'M.A.';
             else if (cert.includes('ba_') || cert.includes('b.a')) specific = 'B.A.';
             else if (cert.includes('b.ed')) specific = 'B.Ed';
             else if (cert.includes('msc') || cert.includes('m.sc')) specific = 'M.Sc';
             else if (cert.includes('m com') || cert.includes('m.com')) specific = 'M.Com';
             else if (cert.includes('degree certificate')) {
                 if (q.qualification === 'Graduation') specific = 'Bachelors';
                 if (q.qualification === 'Post-Graduation') specific = 'Masters';
             } else if (cert.includes('masters')) specific = 'Masters';
             else if (cert.includes('bachelors')) specific = 'Bachelors';

             if (specific) {
                q.level = q.qualification;
                q.qualification = specific;
                modified = true;
                console.log(`Updated ${a.email} to ${specific}`);
             } else {
                // Default if unknown
                q.level = q.qualification;
                q.qualification = 'Other';
                modified = true;
                console.log(`Updated ${a.email} to Other`);
             }
           }
         });
       }
    } catch(e) {}
    
    if (modified) {
       await prisma.author.update({
         where: { id: a.id },
         data: { qualification: JSON.stringify(currentQuals) }
       });
       count++;
    }
  }
  console.log('Fixed', count, 'remaining authors');
}
main().finally(() => prisma.$disconnect());
