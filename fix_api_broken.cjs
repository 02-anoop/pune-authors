const fs = require('fs');

try {
  let api = fs.readFileSync('server/routes/api.js', 'utf8');
  let lines = api.split('\n');
  
  // Find where router.delete('/api/admin/gallery/images/:imageId' starts
  const startIndex = lines.findIndex(l => l.includes("router.delete('/api/admin/gallery/images/:imageId'"));
  // Find where router.get('/api/admin/events/:id/registrations' starts
  const endIndex = lines.findIndex(l => l.includes("router.get('/api/admin/events/:id/registrations'"));
  
  if (startIndex !== -1 && endIndex !== -1) {
    const fixedContent = `router.delete('/api/admin/gallery/images/:imageId', verifyToken, isAdmin, async (req, res) => {
  try {
    const imageId = parseInt(req.params.imageId);
    await prisma.galleryImage.delete({ where: { id: imageId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});


// EVENT REGISTRATIONS FOR ADMIN
router.post('/api/admin/events/registration', verifyToken, isAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.body.eventId);
    const authorId = parseInt(req.body.authorId);
    const { books, optInStatus, manualTotalSold, manualTotalRevenue, amountPaid } = req.body;
    
    const existingAuthor = await prisma.eventAuthor.findFirst({
      where: { eventId, authorId }
    });

    if (existingAuthor) {
      await prisma.eventAuthor.update({
        where: { id: existingAuthor.id },
        data: { 
          optInStatus: optInStatus || undefined,
          manualTotalSold: manualTotalSold !== null ? manualTotalSold : undefined,
          manualTotalRevenue: manualTotalRevenue !== null ? manualTotalRevenue : undefined,
          amountPaid: amountPaid !== undefined && amountPaid !== "" && amountPaid !== null ? parseFloat(amountPaid) : existingAuthor.amountPaid
        }
      });
    } else {
      await prisma.eventAuthor.create({
        data: {
          eventId,
          authorId,
          optInStatus: optInStatus || "Registered",
          manualTotalSold: manualTotalSold !== null ? manualTotalSold : null,
          manualTotalRevenue: manualTotalRevenue !== null ? manualTotalRevenue : null,
          amountPaid: amountPaid !== undefined && amountPaid !== "" && amountPaid !== null ? parseFloat(amountPaid) : null
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
});

`;
    
    // Replace lines from startIndex to endIndex - 1
    lines.splice(startIndex, endIndex - startIndex, fixedContent.trimEnd());
    
    fs.writeFileSync('server/routes/api.js', lines.join('\\n'));
    console.log('Fixed API routes');
  }
} catch(e) {
  console.error(e);
}
