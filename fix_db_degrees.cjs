const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

function getLevelFromDegree(degree) {
  if (!degree) return "Other";
  const d = degree.toLowerCase();
  if (d.includes('phd') || d.includes('ph.d') || d.includes('d.phil')) return "Ph.D";
  if (d.includes('mtech') || d.includes('m.tech') || d.includes('msc') || d.includes('m.sc') || d.includes('m.a') || d.includes('mba') || d.includes('mca') || d.includes('md') || d.includes('ms') || d.includes('pg ') || d.includes('masters')) return "Post-Graduation";
  if (d.includes('btech') || d.includes('b.tech') || d.includes('bsc') || d.includes('b.sc') || d.includes('b.a') || d.includes('bca') || d.includes('bba') || d.includes('mbbs') || d.includes('b.pharm') || d.includes('be') || d.includes('b.e') || d.includes('bachelor')) return "Graduation";
  if (d.includes('diploma')) return "Diploma";
  return "Other";
}

async function main() {
  const allAuthors = await prisma.author.findMany();
  let updatedCount = 0;

  for (const author of allAuthors) {
    if (!author.qualification) continue;
    
    // Find the corresponding draft
    const draft = await prisma.authorDraft.findUnique({ where: { email: author.email } });
    if (!draft || !draft.qualifications) continue;

    let draftQuals = [];
    try { draftQuals = typeof draft.qualifications === 'string' ? JSON.parse(draft.qualifications) : draft.qualifications; } catch(e) {}
    
    let currentQuals = [];
    try { currentQuals = JSON.parse(author.qualification); } catch(e) {}

    let modified = false;

    if (Array.isArray(currentQuals) && Array.isArray(draftQuals)) {
      for (let i = 0; i < currentQuals.length; i++) {
        let cq = currentQuals[i];
        
        // Find matching draft qualification by ID or index
        let dq = draftQuals.find(d => d.id === cq.id) || draftQuals[i];
        
        if (dq && dq.qualification) {
           const draftDegree = dq.qualification;
           
           // If current is just 'Graduation' and draft is specific
           if (cq.qualification === "Graduation" || cq.qualification === "Post-Graduation" || cq.qualification === "Ph.D" || cq.qualification === "Diploma" || cq.qualification === "Other") {
               cq.level = cq.qualification;
               cq.qualification = draftDegree;
               modified = true;
           } else if (!cq.level) {
               // If it's already specific but lacks a level
               cq.level = getLevelFromDegree(cq.qualification);
               modified = true;
           }
        }
      }
    }

    if (modified) {
      console.log(`Updating ${author.email}`);
      await prisma.author.update({
        where: { id: author.id },
        data: { qualification: JSON.stringify(currentQuals) }
      });
      updatedCount++;
    }
  }
  console.log("Updated", updatedCount, "authors");
}
main().finally(() => prisma.$disconnect());
