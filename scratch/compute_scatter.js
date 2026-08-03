// Compute scatter data
    let authorScatterData = [];
    try {
      const allAuthorsDB = await prisma.author.findMany({
        select: { id: true, name: true, createdAt: true, groupJoiningDate: true },
        where: { status: 'Approved' }
      });
      const allEventsDB = await prisma.event.findMany({
        where: { broadcastStatus: { not: 'Draft' } },
        select: { id: true, date: true, startDate: true }
      });
      const allRegistrationsDB = await prisma.eventAuthor.findMany({
        where: { optInStatus: { in: ['Registered', 'Approved', 'Pending Approval'] } },
        select: { authorId: true, eventId: true }
      });
      
      let allManualDB = [];
      try {
         allManualDB = await prisma.eventRegistration.findMany({
           where: { status: { in: ['Registered', 'Approved', 'Pending Approval'] } },
           select: { authorId: true, activityId: true }
         });
      } catch(e) {} // in case eventRegistration table doesn't exist

      const regMap = {};
      allRegistrationsDB.forEach(r => {
        if (!regMap[r.authorId]) regMap[r.authorId] = new Set();
        regMap[r.authorId].add(r.eventId);
      });
      allManualDB.forEach(r => {
        if (!regMap[r.authorId]) regMap[r.authorId] = new Set();
        if (r.activityId) regMap[r.authorId].add(r.activityId);
      });

      const adminStats = getCache('admin:dashboard-stats');
      const salesMap = {};
      if (adminStats && adminStats.salesByAuthor) {
         adminStats.salesByAuthor.forEach(a => salesMap[a.name] = a.units);
      }

      const parseEvDate = (dStr) => {
        if (!dStr) return new Date(0);
        try {
          const s = typeof dStr === 'string' ? dStr : String(dStr);
          const dt = new Date(s.replace(/-/g, ' '));
          return isNaN(dt.getTime()) ? new Date(0) : dt;
        } catch(e) { return new Date(0); }
      };

      const parsedEvents = allEventsDB.map(e => ({
        id: e.id,
        time: parseEvDate(e.date || e.startDate).getTime()
      }));

      allAuthorsDB.forEach(a => {
         const joinDate = a.groupJoiningDate ? new Date(a.groupJoiningDate) : new Date(a.createdAt);
         joinDate.setHours(0,0,0,0);
         const joinTime = joinDate.getTime();
         
         let eligible = 0;
         parsedEvents.forEach(e => {
            if (e.time >= joinTime) eligible++;
         });
         
         const participated = regMap[a.id] ? regMap[a.id].size : 0;
         
         if (eligible > 0) {
            authorScatterData.push({
               id: a.id,
               name: a.name,
               percentage: Math.round((participated / eligible) * 100),
               booksSold: salesMap[a.name] || 0
            });
         }
      });
    } catch (err) {
      console.error('Failed to compute scatter data', err);
    }
