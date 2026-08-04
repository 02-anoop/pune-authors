const fs = require('fs');

try {
  let api = fs.readFileSync('server/routes/api.js', 'utf8');

  const oldEndpoint = `// EVENT REGISTRATIONS FOR ADMIN
router.post('/api/admin/events/registration', verifyToken, isAdmin, async (req, res) => {
  try {
    const { eventId, authorId, books, optInStatus, manualTotalSold, manualTotalRevenue } = req.body;
    
    await prisma.eventAuthor.updateMany({
      where: { eventId, authorId },
      data: { 
        optInStatus: optInStatus || undefined,
        manualTotalSold: manualTotalSold !== null ? manualTotalSold : undefined,
        manualTotalRevenue: manualTotalRevenue !== null ? manualTotalRevenue : undefined
      }
    });

    if (books && Array.isArray(books)) {
      for (const b of books) {
        const targetBookId = b.bookId || (b.book ? b.book.id : null) || b.id;
        if (!targetBookId) continue;
        
        await prisma.eventBook.updateMany({
          where: { eventId, authorId, bookId: parseInt(targetBookId) },
          data: {
            listedStock: b.actualSent !== undefined ? parseInt(b.actualSent) : undefined,
            soldStock: b.soldStock !== undefined ? parseInt(b.soldStock) : undefined,
            returnedStock: b.returnedStock !== undefined ? parseInt(b.returnedStock) : undefined,
            manualDailySales: b.manualDailySales || undefined,
            overrideMrp: b.overrideMrp !== undefined && b.overrideMrp !== "" ? parseFloat(b.overrideMrp) : null
          }
        });
      }
    }
    
    invalidateCache('admin:dashboard-stats');
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update registration' });
  }
});`;

  const newEndpoint = `// EVENT REGISTRATIONS FOR ADMIN
router.post('/api/admin/events/registration', verifyToken, isAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.body.eventId);
    const authorId = parseInt(req.body.authorId);
    const { books, optInStatus, manualTotalSold, manualTotalRevenue } = req.body;
    
    const existingAuthor = await prisma.eventAuthor.findFirst({
      where: { eventId, authorId }
    });

    if (existingAuthor) {
      await prisma.eventAuthor.update({
        where: { id: existingAuthor.id },
        data: { 
          optInStatus: optInStatus || undefined,
          manualTotalSold: manualTotalSold !== null ? manualTotalSold : undefined,
          manualTotalRevenue: manualTotalRevenue !== null ? manualTotalRevenue : undefined
        }
      });
    } else {
      await prisma.eventAuthor.create({
        data: {
          eventId,
          authorId,
          optInStatus: optInStatus || "Registered",
          manualTotalSold: manualTotalSold !== null ? manualTotalSold : null,
          manualTotalRevenue: manualTotalRevenue !== null ? manualTotalRevenue : null
        }
      });
    }

    if (books && Array.isArray(books)) {
      for (const b of books) {
        const targetBookId = parseInt(b.bookId || (b.book ? b.book.id : null) || b.id);
        if (!targetBookId || isNaN(targetBookId)) continue;
        
        const existingBook = await prisma.eventBook.findFirst({
          where: { eventId, authorId, bookId: targetBookId }
        });

        if (existingBook) {
          await prisma.eventBook.update({
            where: { id: existingBook.id },
            data: {
              listedStock: b.actualSent !== undefined ? parseInt(b.actualSent) : undefined,
              soldStock: b.soldStock !== undefined ? parseInt(b.soldStock) : undefined,
              returnedStock: b.returnedStock !== undefined ? parseInt(b.returnedStock) : undefined,
              manualDailySales: b.manualDailySales || undefined,
              overrideMrp: b.overrideMrp !== undefined && b.overrideMrp !== "" && b.overrideMrp !== null ? parseFloat(b.overrideMrp) : null
            }
          });
        } else {
          await prisma.eventBook.create({
            data: {
              eventId,
              authorId,
              bookId: targetBookId,
              listedStock: b.actualSent !== undefined ? parseInt(b.actualSent) : 0,
              soldStock: b.soldStock !== undefined ? parseInt(b.soldStock) : 0,
              returnedStock: b.returnedStock !== undefined ? parseInt(b.returnedStock) : 0,
              manualDailySales: b.manualDailySales || {},
              overrideMrp: b.overrideMrp !== undefined && b.overrideMrp !== "" && b.overrideMrp !== null ? parseFloat(b.overrideMrp) : null
            }
          });
        }
      }
    }
    
    invalidateCache('admin:dashboard-stats');
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update registration' });
  }
});`;

  api = api.replace(oldEndpoint, newEndpoint);

  fs.writeFileSync('server/routes/api.js', api);
  console.log('Fixed /api/admin/events/registration endpoint in server/routes/api.js');
} catch (e) {
  console.error(e);
}
