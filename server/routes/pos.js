const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { getCache, setCache, invalidateCache } = require('../utils/cache');
const { isAdmin, verifyToken } = require('../middleware/auth');
const { sendNotificationEmail, emailWrap } = require('../utils/email');
const { upload } = require('../config/upload');

// --- POS APIs ---



router.post('/api/author/events/:eventId/add-stock', verifyToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const { bookId, quantity } = req.body;
    
    if (!bookId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid book or quantity' });
    }

    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    // Ensure the book exists and belongs to the author
    const book = await prisma.book.findFirst({ where: { id: parseInt(bookId), authorId: author.id } });
    if (!book) return res.status(404).json({ error: 'Book not found' });

    // Check if the author has enough stock in main inventory
    if (book.stock < quantity) {
      return res.status(400).json({ error: 'Not enough stock in your main inventory to add to this event.' });
    }

    // Find the event book
    const eventBook = await prisma.eventBook.findFirst({ where: { eventId, authorId: author.id, bookId: parseInt(bookId) } });
    if (!eventBook) return res.status(404).json({ error: 'Book is not registered for this event.' });

    // Use a transaction to deduct from main inventory and add to event inventory
    await prisma.$transaction([
      prisma.book.update({
        where: { id: book.id },
        data: { stock: { decrement: parseInt(quantity) } }
      }),
      prisma.eventBook.update({
        where: { id: eventBook.id },
        data: { listedStock: { increment: parseInt(quantity) } }
      })
    ]);

    // invalidate author cache since main inventory changed
    invalidateCache(`authorDashboardData_${author.id}`);

    res.json({ success: true, message: 'Stock added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

router.get('/api/author/events/:eventId/pos-inventory', verifyToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    const eventBooks = await prisma.eventBook.findMany({
      where: { eventId, authorId: author.id },
      include: { book: true }
    });

    res.json({ author, eventBooks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch POS inventory' });
  }
});

router.post('/api/author/events/:eventId/pos-checkout', verifyToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const { cart, paymentMethod, totalAmount } = req.body;
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    // 1. Aggregate and validate cart items > 0
    const aggregatedItems = {};
    for (const item of cart) {
      const qty = parseInt(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Invalid quantity provided in cart' });
      }
      const bId = parseInt(item.bookId);
      aggregatedItems[bId] = (aggregatedItems[bId] || 0) + qty;
    }
    const parsedCart = Object.keys(aggregatedItems).map(id => ({ bookId: parseInt(id), quantity: aggregatedItems[id] }));

    // 2. Validate stock and recalculate exact totals
    let calculatedTotal = 0;
    const finalCartWithPrices = [];
    
    for (const item of parsedCart) {
       const eb = await prisma.eventBook.findFirst({ where: { eventId, authorId: author.id, bookId: item.bookId }, include: { book: true } });
       if (!eb) return res.status(400).json({ error: `Book ${item.bookId} not registered for this event` });
       if ((eb.listedStock - eb.soldStock) < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for book: ${eb.book?.title}` });
       }
       calculatedTotal += eb.book.mrp * item.quantity;
       finalCartWithPrices.push({ bookId: item.bookId, quantity: item.quantity, price: eb.book.mrp });
    }

    // Strictly override the requested amount with the calculated amount
    const requestedAmount = parseFloat(totalAmount);
    if (Math.abs(calculatedTotal - requestedAmount) > 1) {
       return res.status(400).json({ error: 'Amount mismatch. Financial payload invalid.' });
    }

    // 3. Wrap in a transaction to prevent zombie orders
    const posOrder = await prisma.$transaction(async (tx) => {
      // Re-verify stock inside lock
      for (const item of finalCartWithPrices) {
         const eb = await tx.eventBook.findFirst({ where: { eventId, authorId: author.id, bookId: item.bookId } });
         if ((eb.listedStock - eb.soldStock) < item.quantity) {
            throw new Error(`Insufficient stock for book ID ${item.bookId}`);
         }
      }

      const newPosOrder = await tx.posOrder.create({
        data: {
          authorId: author.id,
          eventId,
          totalAmount: calculatedTotal,
          paymentMethod,
          paymentStatus: 'CONFIRMED',
          saleSource: 'BOOK_FAIR',
          items: {
            create: finalCartWithPrices.map(item => ({
               bookId: item.bookId,
               quantity: item.quantity,
               price: item.price
            }))
          }
        }
      });

      for (const item of finalCartWithPrices) {
         const eb = await tx.eventBook.findFirst({ where: { eventId, authorId: author.id, bookId: item.bookId } });
         await tx.eventBook.update({
            where: { id: eb.id },
            data: { soldStock: { increment: item.quantity } }
         });
      }
      return newPosOrder;
    });

    res.json({ success: true, posOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'POS checkout failed' });
  }
});

router.get('/api/author/events/:eventId/pos-sales-summary', verifyToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    const posOrders = await prisma.posOrder.findMany({
      where: { eventId, authorId: author.id },
      include: { items: { include: { book: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const summary = posOrders.reduce((acc, order) => {
      acc.totalRevenue += order.totalAmount;
      acc.totalBooksSold += order.items.reduce((sum, item) => sum + item.quantity, 0);
      return acc;
    }, { totalRevenue: 0, totalBooksSold: 0, totalTransactions: posOrders.length });

    const eventBooks = await prisma.eventBook.findMany({
      where: { eventId, authorId: author.id },
      include: { book: true }
    });

    res.json({ summary, posOrders, eventBooks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch POS sales summary' });
  }
});



module.exports = router;
