require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Security Imports
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// Security: Helmet (Configured to allow Vercel to read your images)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Gzip/Brotli compression for all responses (reduces payload size significantly)
app.use(compression());

// Security: Rate Limiting (Prevents DDoS and brute-force guessing)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit
  message: 'Too many requests from this IP, please try again later.'
});

// Security: Strict CORS (Only allows requests from your Website)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow localhost, vercel, and the official custom domain!
    if (!origin || origin.includes('localhost') || origin.includes('vercel.app') || origin.includes('puneauthorsassociation.com')) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  }
};
app.set('trust proxy', 1); // Trust Nginx reverse proxy to get real user IPs
app.use(cors(corsOptions)); // CORS MUST BE ABOVE LIMITER

// Serve static images BEFORE the rate limiter so images don't count towards the limit!
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// If an image doesn't exist (e.g. on local environments), immediately return 404 so it doesn't hit the rate limiter!
app.use('/uploads', (req, res) => res.status(404).send('Image not found locally'));

app.use(limiter);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
const authRoutes = require('./routes/auth');
const posRoutes = require('./routes/pos');
const formsRoutes = require('./routes/forms');
const queriesRoutes = require('./routes/queries');
const apiRoutes = require('./routes/api');
const donationsRoutes = require('./routes/donations');

app.use('/api/auth', authRoutes);
app.use('/', posRoutes);
app.use('/', formsRoutes);
app.use('/', queriesRoutes);
app.use('/', donationsRoutes);

// Main legacy routes aggregator mounted at root since paths inside have full prefix like /api/admin/...
app.use('/', apiRoutes);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendNotificationEmail, emailWrap } = require('./utils/email');

// Auto-Delivery Background Interval (Runs every hour)
setInterval(async () => {
  try {
    const now = new Date();
    const expiredOrders = await prisma.orderItem.findMany({
      where: {
        status: 'Dispatched',
        dispatchedAt: { lt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) }
      }
    });

    if (expiredOrders.length > 0) {
      console.log(`Auto-delivering ${expiredOrders.length} orders...`);
      for (const order of expiredOrders) {
        await prisma.orderItem.update({
          where: { id: order.id },
          data: {
            status: 'Delivered',
            autoDelivered: true,
            deliveredAt: now
          }
        });
      }
    }

    // Auto-Verify Orders (3 days after delivery)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const unverifiedOrders = await prisma.order.findMany({
      where: { status: 'Pending Verification' },
      include: { items: true }
    });

    for (const order of unverifiedOrders) {
      if (!order.items || order.items.length === 0) continue;

      const hasDeliveredItems = order.items.some(item => item.status === 'Delivered');
      const isReadyForVerify = order.items.every(item => {
        if (item.status === 'Rejected') return true;
        if (item.status === 'Delivered' && item.deliveredAt && item.deliveredAt < threeDaysAgo) return true;
        return false;
      });

      if (hasDeliveredItems && isReadyForVerify) {
        console.log(`Auto-verifying order ${order.id}...`);
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'Completed' }
        });
      }
    }

    // Auto-Send 24-Hour Acceptance Warning to Authors
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lateAuthorsToWarn = await prisma.orderItem.findMany({
      where: {
        status: { in: ['Pending Verification', 'Pending'] },
        createdAt: { lt: twentyFourHoursAgo },
        authorWarnedAt: null
      },
      include: { order: true, book: { include: { author: true } } }
    });

    if (lateAuthorsToWarn.length > 0) {
      console.log(`Sending late warning emails to ${lateAuthorsToWarn.length} unaccepted orders...`);
      for (const item of lateAuthorsToWarn) {
        if (!item.book || !item.book.author || !item.book.author.email) continue;
        const authorEmail = item.book.author.email;
        const bookTitle = item.book ? item.book.title : 'Unknown Book';
        const orderId = item.orderId || (item.order && item.order.id);

        const emailContent = `
          <p>Dear ${item.book.author.name},</p>
          <p>You have a pending order for <strong>${bookTitle}</strong> (Order #${orderId}) that has been waiting for your acceptance for over 24 hours.</p>
          <p>Please log in to your Author Dashboard immediately to accept and fulfill this order.</p>
          <p>Failure to accept orders in a timely manner will result in a penalty fine and temporary suspension of your account for receiving new orders.</p>
          <p>Thank you for your prompt attention to this matter.</p>
        `;

        await sendNotificationEmail(authorEmail, 'Action Required: Order Pending Acceptance > 24 Hours', emailWrap('Urgent Order Acceptance Required', emailContent))
          .catch(e => console.error('Failed to send late author warning', e));

        await prisma.orderItem.update({
          where: { id: item.id },
          data: { authorWarnedAt: now }
        });
      }
    }

    // Auto-Send 48-Hour Dispatch Warning to Authors
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const lateDispatchToWarn = await prisma.orderItem.findMany({
      where: {
        status: 'Accepted',
        createdAt: { lt: fortyEightHoursAgo },
        authorDispatchWarnedAt: null
      },
      include: { order: true, book: { include: { author: true } } }
    });

    if (lateDispatchToWarn.length > 0) {
      console.log(`Sending late dispatch warning emails for ${lateDispatchToWarn.length} un-dispatched orders...`);
      for (const item of lateDispatchToWarn) {
        if (!item.book || !item.book.author || !item.book.author.email) continue;
        const authorEmail = item.book.author.email;
        const bookTitle = item.book ? item.book.title : 'Unknown Book';
        const orderId = item.orderId || (item.order && item.order.id);

        const emailContent = `
          <p>Dear ${item.book.author.name},</p>
          <p>You have an accepted order for <strong>${bookTitle}</strong> (Order #${orderId}) that has been waiting for you to dispatch it for over 48 hours.</p>
          <p>Please log in to your Author Dashboard immediately, dispatch the book, and update the tracking details.</p>
          <p>Failure to dispatch orders in a timely manner will result in a penalty fine and temporary suspension of your account for receiving new orders.</p>
          <p>Thank you for your prompt attention to this matter.</p>
        `;

        await sendNotificationEmail(authorEmail, 'Action Required: Order Pending Dispatch > 48 Hours', emailWrap('Urgent Order Dispatch Required', emailContent))
          .catch(e => console.error('Failed to send late dispatch warning', e));

        await prisma.orderItem.update({
          where: { id: item.id },
          data: { authorDispatchWarnedAt: now }
        });
      }
    }

    // Auto-Raise Support Ticket (10 days after order creation if not delivered)
    const tenDaysAgoForTicket = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const overdueItems = await prisma.orderItem.findMany({
      where: {
        status: { notIn: ['Delivered', 'Rejected'] },
        createdAt: { lt: tenDaysAgoForTicket }
      },
      include: { order: true, book: true }
    });

    for (const item of overdueItems) {
      if (!item.order || !item.order.customerId) continue;
      const orderId = item.orderId || item.order.id;
      const subject = `Automatic Ticket: Order #${orderId} delayed`;
      
      const existingTicket = await prisma.query.findFirst({
        where: {
          userId: item.order.customerId,
          subject: subject
        }
      });
      
      if (!existingTicket) {
        console.log(`Auto-raising ticket for delayed order item #${item.id}`);
        await prisma.query.create({
          data: {
            userId: item.order.customerId,
            subject: subject,
            message: `Hello, I placed an order for "${item.book ? item.book.title : 'a book'}" (Order #${orderId}) over 10 days ago and haven't received it yet. Could you please check on the status?`,
            status: 'Pending'
          }
        });
      }
    }

    // Daily Admin Report for Late Authors (runs at 9 AM)
    if (now.getHours() === 9 && (!global.lastLateReportSent || global.lastLateReportSent.getDate() !== now.getDate())) {
      global.lastLateReportSent = now;
      const lateItems = await prisma.orderItem.findMany({
        where: {
          status: { in: ['Pending', 'Pending Verification', 'Accepted'] },
          createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        },
        include: { author: true, order: true, book: true }
      });

      const actuallyLate = lateItems.filter(it => {
        const hours = (now.getTime() - new Date(it.createdAt).getTime()) / (1000 * 3600);
        if ((it.status === 'Pending Verification' || it.status === 'Pending') && hours > 24) return true;
        if (it.status === 'Accepted' && hours > 48) return true;
        return false;
      });

      if (actuallyLate.length > 0) {
        let html = `<p>Admin,</p><p>There are ${actuallyLate.length} delayed order items requiring attention.</p><ul>`;
        actuallyLate.forEach(it => {
          html += `<li><strong>Order ${it.orderId || (it.order && it.order.id)}</strong> - Author: ${it.authorName || (it.author && it.author.name) || 'Unknown'} - Item: ${it.book ? it.book.title : 'Unknown'} - Status: ${it.status}</li>`;
        });
        html += `</ul><p>Please check the Operations Dashboard to issue warnings or fines.</p>`;

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@puneauthors.com';
        await sendNotificationEmail(adminEmail, 'Daily Late Authors Report', emailWrap('Late Authors Report', html))
          .catch(e => console.error('Failed to send daily report', e));
      }
    }
  } catch (error) {
    console.error('Auto-delivery interval error:', error);
  }
}, 60 * 60 * 1000); // 1 hour

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;

// Trigger nodemon restart

// Trigger nodemon restart 3
