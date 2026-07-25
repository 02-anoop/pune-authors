const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { upload } = require('../config/upload');

// --- LIBRARY MASTER CRUD ---

// Get all libraries
router.get('/api/admin/libraries', verifyToken, isAdmin, async (req, res) => {
  try {
    const libraries = await prisma.library.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        galleryEvent: { include: { images: true } },
        announcements: {
          orderBy: { registrationEndDate: 'asc' }
        }
      }
    });
    res.json(libraries);
  } catch (err) {
    console.error('Failed to fetch libraries error:', err);
    res.status(500).json({ error: 'Failed to fetch libraries', detail: err.message });
  }
});

// Get public libraries (for Flybraries on buyer side)
router.get('/api/public/libraries', async (req, res) => {
  try {
    const libraries = await prisma.library.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        galleryEvent: { include: { images: true } },
        announcements: {
          orderBy: { registrationEndDate: 'asc' }
        }
      }
    });
    res.json(libraries);
  } catch (err) {
    console.error('Failed to fetch public libraries error:', err);
    res.status(500).json({ error: 'Failed to fetch public libraries' });
  }
});

// Create library
router.post('/api/admin/libraries', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, type, airportCode, airportName, city, state, country, contactPerson, contactNumber, email, shippingAddress, status } = req.body;
    const library = await prisma.library.create({
      data: {
        name,
        type,
        city,
        state,
        country: country || 'India',
        contactPerson,
        contactNumber,
        shippingAddress,
        ...(airportCode && { airportCode }),
        ...(airportName && { airportName }),
        ...(email && { email }),
        ...(status && { status })
      }
    });
    res.json(library);
  } catch (err) {
    console.error('Create library error:', err);
    res.status(500).json({ error: 'Failed to create library', detail: err.message });
  }
});

// Update library
router.put('/api/admin/libraries/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, type, airportCode, airportName, city, state, country, contactPerson, contactNumber, email, shippingAddress, status } = req.body;
    const library = await prisma.library.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(city && { city }),
        ...(state && { state }),
        ...(country && { country }),
        ...(contactPerson && { contactPerson }),
        ...(contactNumber && { contactNumber }),
        ...(shippingAddress && { shippingAddress }),
        ...(airportCode !== undefined && { airportCode }),
        ...(airportName !== undefined && { airportName }),
        ...(email !== undefined && { email }),
        ...(status && { status })
      }
    });
    res.json(library);
  } catch (err) {
    console.error('Update library error:', err);
    res.status(500).json({ error: 'Failed to update library', detail: err.message });
  }
});

// Update library banner
router.put('/api/admin/libraries/:id/banner', verifyToken, isAdmin, upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No banner file provided' });
    const library = await prisma.library.update({
      where: { id: parseInt(req.params.id) },
      data: { bannerUrl: `/uploads/${req.file.filename}` }
    });
    res.json(library);
  } catch (err) {
    console.error('Update library banner error:', err);
    res.status(500).json({ error: 'Failed to update library banner' });
  }
});

// Delete library banner
router.delete('/api/admin/libraries/:id/banner', verifyToken, isAdmin, async (req, res) => {
  try {
    const library = await prisma.library.update({
      where: { id: parseInt(req.params.id) },
      data: { bannerUrl: null }
    });
    res.json(library);
  } catch (err) {
    console.error('Delete library banner error:', err);
    res.status(500).json({ error: 'Failed to delete library banner' });
  }
});

// Delete library
router.delete('/api/admin/libraries/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    await prisma.library.update({
      where: { id: parseInt(req.params.id) },
      data: { isArchived: true, status: 'Archived' }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete library' });
  }
});


// --- DONATION ANNOUNCEMENTS ---

// Get all announcements
router.get('/api/admin/donation-announcements', verifyToken, isAdmin, async (req, res) => {
  try {
    const announcements = await prisma.donationAnnouncement.findMany({
      include: { library: true, registrations: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(announcements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Create announcement
router.post('/api/admin/donation-announcements', verifyToken, isAdmin, async (req, res) => {
  try {
    const { libraryId, feeAmount, ...rest } = req.body;
    const announcement = await prisma.donationAnnouncement.create({
      data: {
        ...rest,
        feeAmount: feeAmount ? parseInt(feeAmount) : 0,
        libraryId: parseInt(libraryId)
      }
    });
    res.json(announcement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Update announcement
router.put('/api/admin/donation-announcements/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { libraryId, feeAmount, ...rest } = req.body;
    const updateData = { ...rest };
    if (libraryId) updateData.libraryId = parseInt(libraryId);
    if (feeAmount !== undefined) updateData.feeAmount = parseInt(feeAmount) || 0;
    
    const announcement = await prisma.donationAnnouncement.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });
    res.json(announcement);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Delete (Archive) announcement
router.delete('/api/admin/donation-announcements/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    await prisma.donationAnnouncement.update({
      where: { id: parseInt(req.params.id) },
      data: { isArchived: true }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive announcement' });
  }
});

// Restore announcement
router.put('/api/admin/donation-announcements/:id/restore', verifyToken, isAdmin, async (req, res) => {
  try {
    await prisma.donationAnnouncement.update({
      where: { id: parseInt(req.params.id) },
      data: { isArchived: false }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore announcement' });
  }
});

// Publish campaign to all authors
router.post('/api/admin/donation-announcements/:id/publish-all', verifyToken, isAdmin, async (req, res) => {
  try {
    const announcement = await prisma.donationAnnouncement.update({
      where: { id: parseInt(req.params.id) },
      data: { visibility: 'Published' }
    });
    res.json(announcement);
  } catch (err) {
    res.status(500).json({ error: 'Failed to publish campaign' });
  }
});

// Unpublish campaign
router.post('/api/admin/donation-announcements/:id/unpublish', verifyToken, isAdmin, async (req, res) => {
  try {
    const announcement = await prisma.donationAnnouncement.update({
      where: { id: parseInt(req.params.id) },
      data: { visibility: 'Draft' }
    });
    res.json(announcement);
  } catch (err) {
    res.status(500).json({ error: 'Failed to unpublish campaign' });
  }
});

// --- AUTHOR SIDE ---

// Get author's own books (used by donation form for book selection)
router.get('/api/author/books', verifyToken, async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: 'Author not found' });
    const books = await prisma.book.findMany({
      where: { authorId: author.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch author books' });
  }
});

// Get active announcements
router.get('/api/author/donation-announcements', verifyToken, async (req, res) => {
  try {
    const announcements = await prisma.donationAnnouncement.findMany({
      where: {
        visibility: {
          in: ['Published', 'Closed']
        }
      },
      include: { library: true }
    });
    res.json(announcements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Get author's own registrations
router.get('/api/author/donation-registrations', verifyToken, async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: 'Author not found' });
    
    const registrations = await prisma.donationRegistration.findMany({
      where: { authorId: author.id },
      include: {
        announcement: { include: { library: true } },
        books: { include: { book: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(registrations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Get author's donation summary (for read-only dashboard)
router.get('/api/author/donation-summary', verifyToken, async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: 'Author not found' });
    
    const registrations = await prisma.donationRegistration.findMany({
      where: { authorId: author.id },
      include: {
        books: { include: { book: true } }
      }
    });

    const uniqueLibraries = new Set(registrations.map(r => r.announcementId)).size;
    const totalBooks = registrations.reduce((sum, reg) => sum + reg.books.reduce((acc, b) => acc + (b.quantityDonated || 0), 0), 0);
    const totalValue = registrations.reduce((sum, reg) => sum + reg.books.reduce((acc, b) => acc + ((b.quantityDonated || 0) * (b.book?.mrp || 0)), 0), 0);

    res.json({
      librariesDonated: uniqueLibraries,
      booksDonated: totalBooks,
      totalValue: totalValue
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch donation summary' });
  }
});

// Delete author's own registration before it is approved (Admins can delete any registration)
router.delete('/api/author/donation-registrations/:id', verifyToken, async (req, res) => {
  try {
    const registration = await prisma.donationRegistration.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { books: true }
    });

    if (!registration) return res.status(404).json({ error: 'Registration not found' });
    
    const isAdmin = req.user.role === 'ADMIN';

    if (!isAdmin) {
      const author = await prisma.author.findUnique({ where: { email: req.user.email } });
      if (!author) return res.status(404).json({ error: 'Author not found' });

      // Check ownership
      if (registration.authorId !== author.id) {
        return res.status(403).json({ error: 'Unauthorized to delete this registration' });
      }

      // Check status
      if (registration.status === 'Approved') {
        return res.status(400).json({ error: 'Cannot delete registration after it has been approved' });
      }
    }

    // Replenish the author's book inventory/stock by the donated quantity (only if NOT manual)
    if (registration.transactionId !== 'MANUAL_ENTRY' && registration.books && registration.books.length > 0) {
      for (const b of registration.books) {
        await prisma.book.update({
          where: { id: b.bookId },
          data: {
            stock: {
              increment: b.quantityDonated
            }
          }
        });
      }
    }

    // Soft delete the registration
    await prisma.donationRegistration.update({
      where: { id: registration.id },
      data: { isArchived: true, status: 'Cancelled' }
    });

    res.json({ message: 'Registration deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

// Register for donation
router.post('/api/author/donations', verifyToken, upload.single('paymentScreenshot'), async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: 'Author not found' });
    
    let { announcementId, books, feePaid, paymentStatus, transactionId } = req.body;
    
    if (typeof books === 'string') {
      try { books = JSON.parse(books); } catch (e) { books = []; }
    }

    // Verify stock availability
    for (const b of books) {
      const bookItem = await prisma.book.findUnique({ where: { id: parseInt(b.bookId) } });
      if (!bookItem) return res.status(404).json({ error: 'Book not found' });
      if (parseInt(b.quantityDonated) > bookItem.stock) {
        return res.status(400).json({ error: `Cannot donate more than available stock (${bookItem.stock}) for "${bookItem.title}"` });
      }
    }
    
    const registration = await prisma.donationRegistration.create({
      data: {
        announcementId: parseInt(announcementId),
        authorId: author.id,
        feePaid: feePaid ? parseInt(feePaid) : 0,
        paymentStatus: paymentStatus || (feePaid > 0 ? 'Pending' : 'Completed'),
        transactionId: transactionId || null,
        paymentScreenshot: req.file ? `/uploads/${req.file.filename}` : null,
        books: {
          create: books.map(b => ({
            bookId: parseInt(b.bookId),
            quantityDonated: parseInt(b.quantityDonated)
          }))
        }
      }
    });

    // Decrease the author's book inventory/stock by the donated quantity
    for (const b of books) {
      await prisma.book.update({
        where: { id: parseInt(b.bookId) },
        data: {
          stock: {
            decrement: parseInt(b.quantityDonated)
          }
        }
      });
    }
    
    res.json(registration);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register donation' });
  }
});


// --- AIRPORT REGISTRY (ADMIN) ---

// Manual registration by Admin
router.post('/api/admin/donation-registrations/manual', verifyToken, isAdmin, async (req, res) => {
  try {
    const { announcementId, authorId, books, feePaid, paymentStatus } = req.body;

    const registration = await prisma.donationRegistration.create({
      data: {
        announcementId: parseInt(announcementId),
        authorId: parseInt(authorId),
        feePaid: feePaid ? parseInt(feePaid) : 0,
        paymentStatus: paymentStatus || 'Completed',
        transactionId: 'MANUAL_ENTRY',
        books: {
          create: books.map(b => ({
            bookId: parseInt(b.bookId),
            quantityDonated: parseInt(b.quantityDonated)
          }))
        }
      }
    });
    
    res.json(registration);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to manually add registration' });
  }
});

router.get('/api/admin/donation-registrations', verifyToken, isAdmin, async (req, res) => {
  try {
    const { announcementId } = req.query;
    const where = announcementId ? { announcementId: parseInt(announcementId) } : {};
    const registrations = await prisma.donationRegistration.findMany({
      where,
      include: {
        author: true,
        announcement: { include: { library: true } },
        books: { include: { book: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(registrations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

router.patch('/api/admin/donation-registrations/:id/status', verifyToken, isAdmin, async (req, res) => {
  try {
    const { status, remarks } = req.body; // Approved, Rejected, Changes Requested
    const reg = await prisma.donationRegistration.update({
      where: { id: parseInt(req.params.id) },
      data: { status, remarks }
    });
    res.json(reg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.patch('/api/admin/donation-registrations/:id/dispatch', verifyToken, isAdmin, async (req, res) => {
  try {
    const reg = await prisma.donationRegistration.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(reg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update dispatch details' });
  }
});

// Publish granular or global author data
router.post('/api/admin/donation-registrations/:id/publish', verifyToken, isAdmin, async (req, res) => {
  try {
    const { registrationStatus, paymentStatus, receivedStatus, useGlobalOverride, globalBooksDonated, globalDonationValue, globalRemarks, booksData } = req.body;
    
    const updateData = {
      status: registrationStatus,
      paymentStatus,
      receivedStatus,
      useGlobalOverride,
      broadcastStatus: 'Published'
    };
    
    if (useGlobalOverride) {
      updateData.globalBooksDonated = parseInt(globalBooksDonated) || 0;
      updateData.globalDonationValue = parseFloat(globalDonationValue) || 0;
      updateData.globalRemarks = globalRemarks;
    }
    
    const reg = await prisma.donationRegistration.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });
    
    if (!useGlobalOverride && booksData && booksData.length > 0) {
      // Update each book
      for (const b of booksData) {
        if (b.id) {
          await prisma.donationBook.update({
            where: { id: parseInt(b.id) },
            data: {
              qtyCollected: parseInt(b.qtyCollected) || 0,
              qtyDispatched: parseInt(b.qtyDispatched) || 0,
              qtyReceived: parseInt(b.qtyReceived) || 0,
              libraryConfirmation: b.libraryConfirmation || 'Pending',
              remarks: b.remarks || null
            }
          });
        }
      }
    }
    
    res.json(reg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to publish data' });
  }
});

// --- DASHBOARD STATS ---

router.get('/api/admin/donation-dashboard', verifyToken, isAdmin, async (req, res) => {
  try {
    const activeLibraries = await prisma.library.count({ where: { status: 'Active' } });
    const activeCampaigns = await prisma.donationAnnouncement.count({ where: { visibility: 'Published' } });
    
    // Unique authors participated
    const authors = await prisma.donationRegistration.findMany({
      select: { authorId: true },
      distinct: ['authorId']
    });
    
    const books = await prisma.donationBook.aggregate({
      _sum: { quantityDonated: true }
    });
    
    const pendingRegs = await prisma.donationRegistration.count({ where: { status: 'Registered' } });
    const pendingDispatches = await prisma.donationRegistration.count({ where: { status: 'Approved', dispatchStatus: 'Pending' } });
    const delivered = await prisma.donationRegistration.count({ where: { receivedStatus: 'Received' } });
    
    res.json({
      activeLibraries,
      activeCampaigns,
      participatingAuthors: authors.length,
      totalBooksDonated: books._sum.quantityDonated || 0,
      pendingRegistrations: pendingRegs,
      pendingDispatches,
      deliveredDonations: delivered
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});


const statsFilePath = path.join(__dirname, '../data/library_stats_overrides.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(statsFilePath))) {
  fs.mkdirSync(path.dirname(statsFilePath), { recursive: true });
}

// Fetch overrides
router.get('/api/admin/library-stats-overrides', verifyToken, async (req, res) => {
  try {
    let data = { drivesOverride: null, booksOverride: null, authorsOverride: null, librariesOverride: null, driveOverrides: {} };
    if (fs.existsSync(statsFilePath)) {
      const content = fs.readFileSync(statsFilePath, 'utf8');
      data = JSON.parse(content);
    }
    if (!data.driveOverrides) data.driveOverrides = {};
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch library stats overrides' });
  }
});

// Update overrides
router.post('/api/admin/library-stats-overrides', verifyToken, isAdmin, async (req, res) => {
  try {
    const { drivesOverride, booksOverride, authorsOverride, librariesOverride } = req.body;
    
    let data = { drivesOverride: null, booksOverride: null, authorsOverride: null, librariesOverride: null, driveOverrides: {} };
    if (fs.existsSync(statsFilePath)) {
      const content = fs.readFileSync(statsFilePath, 'utf8');
      data = JSON.parse(content);
    }
    
    data.drivesOverride = drivesOverride === '' || drivesOverride === null ? null : parseInt(drivesOverride);
    data.booksOverride = booksOverride === '' || booksOverride === null ? null : parseInt(booksOverride);
    data.authorsOverride = authorsOverride === '' || authorsOverride === null ? null : parseInt(authorsOverride);
    data.librariesOverride = librariesOverride === '' || librariesOverride === null ? null : parseInt(librariesOverride);
    
    fs.writeFileSync(statsFilePath, JSON.stringify(data, null, 2), 'utf8');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save overrides' });
  }
});

// Update overrides for a specific drive
router.post('/api/admin/library-stats-overrides/drive/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const driveId = req.params.id;
    const { authorsOverride, booksOverride, dispatchedOverride } = req.body;
    
    let data = { drivesOverride: null, booksOverride: null, authorsOverride: null, librariesOverride: null, driveOverrides: {} };
    if (fs.existsSync(statsFilePath)) {
      const content = fs.readFileSync(statsFilePath, 'utf8');
      data = JSON.parse(content);
    }
    if (!data.driveOverrides) data.driveOverrides = {};
    
    data.driveOverrides[driveId] = {
      authorsOverride: authorsOverride === '' || authorsOverride === null ? null : parseInt(authorsOverride),
      booksOverride: booksOverride === '' || booksOverride === null ? null : parseInt(booksOverride),
      dispatchedOverride: dispatchedOverride === '' || dispatchedOverride === null ? null : parseInt(dispatchedOverride)
    };
    
    fs.writeFileSync(statsFilePath, JSON.stringify(data, null, 2), 'utf8');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save drive overrides' });
  }
});

module.exports = router;
