const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testQuery() {
  try {
    console.log('Fetching database info...');
    const allSystemEvents = await prisma.event.findMany({
      where: { broadcastStatus: { not: 'Draft' } },
      select: { id: true, date: true, status: true }
    });

    const authors = await prisma.author.findMany({
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        status: true,
        createdAt: true,
        groupJoiningDate: true,
        extraData: true,
        qrCodeUrl: true,
        isArchived: true,
        books: {
          select: {
            id: true,
            title: true,
            genre: true,
            mrp: true
          }
        },
        _count: {
          select: { books: true, eventRegistrations: true, eventAuthors: true }
        },
        eventAuthors: {
          select: {
            eventId: true,
            optInStatus: true,
            event: { select: { name: true, date: true } }
          }
        },
        eventRegistrations: {
          select: {
            activityId: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Successfully fetched ${authors.length} authors and ${allSystemEvents.length} events!`);

    const parseEvDate = (dStr) => {
      if (!dStr) return new Date(0);
      try {
        const s = typeof dStr === 'string' ? dStr : String(dStr);
        const dt = new Date(s.replace(/-/g, ' '));
        return isNaN(dt.getTime()) ? new Date(0) : dt;
      } catch(e) { return new Date(0); }
    };

    const mapped = authors.map(a => {
      const joinDate = a.groupJoiningDate ? new Date(a.groupJoiningDate) : new Date(a.createdAt);
      joinDate.setHours(0, 0, 0, 0);
      
      let eligibleCount = 0;
      allSystemEvents.forEach(e => {
        const eTime = parseEvDate(e.date || e.startDate).getTime();
        if (eTime >= joinDate.getTime()) eligibleCount++;
      });
      
      let participatedCount = 0;
      if (a.eventAuthors) {
        participatedCount += a.eventAuthors.filter(ei => ei.optInStatus === 'Registered' || ei.optInStatus === 'Approved' || ei.optInStatus === 'Pending Approval').length;
      }
      if (a.eventRegistrations) {
        const inviteEventIds = new Set(a.eventAuthors ? a.eventAuthors.map(ei => ei.eventId) : []);
        participatedCount += a.eventRegistrations.filter(er => {
           if (er.activityId && inviteEventIds.has(er.activityId)) return false; 
           return er.status === 'Registered' || er.status === 'Approved' || er.status === 'Pending Approval';
        }).length;
      }

      return {
        id: a.id,
        name: a.name,
        aggEligibleEvents: eligibleCount,
        aggParticipatedEvents: participatedCount
      };
    });

    console.log('First mapped item:', mapped[0]);
    console.log('Query Test Passed!');
  } catch (err) {
    console.error('Error during query:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();
