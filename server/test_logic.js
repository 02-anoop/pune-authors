const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
    const allSystemEvents = await prisma.event.findMany({
      where: { broadcastStatus: { not: 'Draft' } },
      select: { id: true, date: true, status: true }
    });
    
    console.log("Found system events:", allSystemEvents.length);
    const authors = await prisma.author.findMany({
        take: 3,
        include: {
           eventRegistrations: true,
           eventAuthors: true
        }
    });

    const parseEvDate = (dStr) => {
      if (!dStr) return new Date(0);
      try {
        const s = typeof dStr === 'string' ? dStr : String(dStr);
        const dt = new Date(s.replace(/-/g, ' '));
        return isNaN(dt.getTime()) ? new Date(0) : dt;
      } catch(e) { return new Date(0); }
    };

    authors.forEach(author => {
      const joinDate = author.groupJoiningDate ? new Date(author.groupJoiningDate) : new Date(author.createdAt);
      joinDate.setHours(0, 0, 0, 0);
      
      let eligibleCount = 0;
      allSystemEvents.forEach(e => {
        const eTime = parseEvDate(e.date).getTime();
        if (eTime >= joinDate.getTime()) eligibleCount++;
      });
      
      let participatedCount = 0;
      if (author.eventAuthors) {
        participatedCount += author.eventAuthors.filter(ei => ei.optInStatus === 'Registered' || ei.optInStatus === 'Approved' || ei.optInStatus === 'Pending Approval').length;
      }
      if (author.eventRegistrations) {
        const inviteEventIds = new Set(author.eventAuthors ? author.eventAuthors.map(ei => ei.eventId) : []);
        participatedCount += author.eventRegistrations.filter(er => {
           if (er.activityId && inviteEventIds.has(er.activityId)) return false; 
           return er.status === 'Registered' || er.status === 'Approved' || er.status === 'Pending Approval';
        }).length;
      }
      console.log(author.name, "-> Eligible:", eligibleCount, "Participated:", participatedCount);
    });

}

run().catch(console.error).finally(() => prisma.$disconnect());
