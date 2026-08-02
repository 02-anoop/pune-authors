const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');
const { upload } = require('../config/upload');
const { sendNotificationEmail, emailWrap } = require('../utils/email');

// Replace /api/auth/ prefix with / since we will mount on /api/auth
// --- AUTHENTICATION ---



router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address, interests, role } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    let userRole = role || 'CUSTOMER';
    if (userRole === 'ADMIN') {
      return res.status(403).json({ error: 'Cannot register as ADMIN via this endpoint' });
    }
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, phone, address, interests, role: userRole }
    });
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    let hasCompletedRegistration = true;
    // Allow Pending authors to login so they can view their status dashboard
    if (user.role === 'AUTHOR') {
      const author = await prisma.author.findUnique({ where: { email } });
      if (!author) {
        hasCompletedRegistration = false;
      } else if (author.status === 'Rejected') {
        // We still allow login if rejected, we will show rejected status in AuthorDashboardPage
      }
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, role: user.role, name: user.name, hasCompletedRegistration });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// --- OTP & DRAFTS ---

router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    // Prevent signing up again if the user account already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    
    await prisma.otpVerification.upsert({
      where: { email },
      update: { otp, expiresAt },
      create: { email, otp, expiresAt }
    });
    
    const html = emailWrap('Verify your email', `<p>Your OTP for Pune Authors' Association is:</p><h2 style="font-size: 32px; letter-spacing: 4px; color: #1a1a2e;">${otp}</h2><p>This code expires in 10 minutes.</p>`);
    await sendNotificationEmail(email, 'Verify Your Email', html);
    
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) return res.status(400).json({ error: 'Missing required fields' });
    
    const verification = await prisma.otpVerification.findUnique({ where: { email } });
    if (!verification || verification.otp !== otp || verification.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    // Create user and draft
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    let user;
    if (!existingUser) {
      user = await prisma.user.create({
        data: { name: email.split('@')[0], email, password: hashedPassword, role: 'AUTHOR' }
      });
    } else {
      user = await prisma.user.update({
        where: { email },
        data: { password: hashedPassword, role: 'AUTHOR' }
      });
    }
    
    const draft = await prisma.authorDraft.upsert({
      where: { email },
      update: {},
      create: { email, form: {}, books: [], qualifications: [], extraDataState: {} }
    });
    
    // Clear OTP
    await prisma.otpVerification.delete({ where: { email } });
    
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, role: user.role, name: user.name, message: 'Verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/save-draft', verifyToken, async (req, res) => {
  try {
    const { step, form, books, qualifications, extraDataState, skillInput, hobbyInput } = req.body;
    await prisma.authorDraft.upsert({
      where: { email: req.user.email },
      update: { step, form, books, qualifications, extraDataState, skillInput, hobbyInput },
      create: { email: req.user.email, step, form, books, qualifications, extraDataState, skillInput, hobbyInput }
    });
    res.json({ message: 'Draft saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

router.get('/get-draft', verifyToken, async (req, res) => {
  try {
    const draft = await prisma.authorDraft.findUnique({ where: { email: req.user.email } });
    res.json({ draft, email: req.user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Account not found' });
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    
    await prisma.otpVerification.upsert({
      where: { email },
      update: { otp, expiresAt },
      create: { email, otp, expiresAt }
    });
    
    const html = emailWrap('Reset Password', `<p>Your password reset OTP is:</p><h2 style="font-size: 32px; letter-spacing: 4px; color: #1a1a2e;">${otp}</h2><p>This code expires in 10 minutes.</p>`);
    await sendNotificationEmail(email, 'Password Reset OTP', html);
    
    res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const verification = await prisma.otpVerification.findUnique({ where: { email } });
    
    if (!verification || verification.otp !== otp || verification.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });
    
    await prisma.otpVerification.delete({ where: { email } });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    let authorProfile = null;
    let authorOrders = [];
    let customerOrders = [];

    if (user.role === 'AUTHOR') {
      authorProfile = await prisma.author.findUnique({
        where: { email: user.email },
        include: { books: true }
      });

      if (authorProfile && authorProfile.books.length > 0) {
        const bookIds = authorProfile.books.map(b => b.id);
        const orderItems = await prisma.orderItem.findMany({
          where: { bookId: { in: bookIds } },
          include: { order: true, book: true },
          orderBy: { createdAt: 'desc' }
        });
        authorOrders = orderItems.map(item => ({
          id: item.id,
          orderId: item.order.id,
          customerName: item.order.customerName,
        customerPhone: item.order.customerPhone,
        customerEmail: item.order.customerEmail,
          address: item.order.address,
          bookTitle: item.book.title,
          quantity: item.quantity,
          status: item.status,
          paymentScreenshot: item.order.paymentScreenshot,
          createdAt: item.createdAt
        }));
      }
    } else if (user.role === 'CUSTOMER') {
      customerOrders = await prisma.order.findMany({
        where: { customerEmail: user.email },
        orderBy: { createdAt: 'desc' },
        include: { 
          items: {
            include: { 
              book: { include: { author: true } }
            }
          }
        }
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, authorProfile, authorOrders, customerOrders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { name, address, phone }
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});


module.exports = router;
