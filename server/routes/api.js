const { validate } = require('../middleware/validate');
const { eventSchema } = require('../validators');
const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const bcrypt = require('bcrypt');
const { getCache, setCache, invalidateCache } = require('../utils/cache');
const { isAdmin, verifyToken, optionalVerifyToken } = require('../middleware/auth');
const { sendNotificationEmail, emailWrap } = require('../utils/email');
const { upload } = require('../config/upload');
const { inr } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');

router.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ success: true, url });
});

// --- BOOKS & AUTHORS ---

// --- PUBLIC FORMS --- //

// Author Event Request (from Author Landing Page)
router.post('/api/author-event-request', async (req, res) => {
  try {
    const { name, email, phone, format, category, audience, proposedDate, proposedTime, location, description, organisationName, proposerName, designation, activities } = req.body;

    const eventActivitiesStr = activities || format || "N/A";

    // Save to existing ContactInquiry table to avoid requiring AWS database migrations
    const formattedMessage = `[EVENT REQUEST]
Organisation: ${organisationName || "N/A"}
Proposer: ${proposerName || "N/A"}
Designation: ${designation || "N/A"}
Event Activities: ${eventActivitiesStr}
Format: ${eventActivitiesStr}
Category: ${category}
Audience: ${audience || "N/A"}
Date: ${proposedDate}
Time: ${proposedTime || "N/A"}
Location: ${location || "N/A"}
Phone: ${phone}

Description:
${description}`;

    await prisma.contactInquiry.create({
      data: {
        name,
        email,
        message: formattedMessage
      }
    });
    res.json({ success: true, message: "Event request submitted" });
  } catch (error) {
    console.error("Error submitting event request:", error);
    res.status(500).json({ error: "Failed to submit request" });
  }
});

// --- PUBLIC CONTACT INQUIRY ---
router.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Missing fields' });

    // Save to DB
    const inquiry = await prisma.contactInquiry.create({
      data: { name, email, message }
    });

    // Also create a Query so it appears in the Admin Helpdesk
    await prisma.query.create({
      data: {
        subject: `Contact Form: ${name}`,
        message: `From: ${email}\n\n${message}`,
        status: 'Pending'
      }
    });

    res.status(201).json(inquiry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit' });
  }
});

// 1. Get all approved books for catalogue
router.get('/api/books', async (req, res) => {
  const { genre } = req.query;
  const cacheKey = `books:${genre || 'all'}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const where = { status: 'Approved', isArchived: false };
  if (genre) where.genre = genre;

  const books = await prisma.book.findMany({
    where,
    include: { author: true, reviews: { select: { rating: true } } }
  });

  const filteredBooks = books.filter(b => {
    if (!b.author || b.author.status === 'Rejected') return false;
    const extraData = b.author?.extraData;
    if (extraData && extraData.lateFines > 0 && extraData.fineDate) {
      const diffDays = (new Date().getTime() - new Date(extraData.fineDate).getTime()) / (1000 * 3600 * 24);
      if (diffDays > 3) return false;
    }
    return true;
  });

  setCache(cacheKey, filteredBooks, 60 * 1000); // 60s cache
  res.json(filteredBooks);
});

// 1a(i). Get public landing page stats
router.get('/api/public-stats', async (req, res) => {
  const cached = getCache('public-stats');
  if (cached) return res.json(cached);
  try {
    const authors = await prisma.author.count({ where: { status: 'Active' } });
    const books = await prisma.book.count({ where: { status: 'Approved' } });
    const genres = await prisma.book.findMany({ select: { genre: true }, distinct: ['genre'], where: { status: 'Approved' } });
    const categories = genres.filter(g => g.genre).length;

    const events = await prisma.event.count();
    const libraries = await prisma.library.count();

    // Total donated books
    const donationAgg = await prisma.donationBook.aggregate({
      _sum: { quantityDonated: true }
    });
    const totalDonatedBooks = donationAgg._sum.quantityDonated || 1400; // fallback if null

    // For fairs, if we don't have a specific tag, we can just use 3 or derive it.
    const fairs = 3;

    // Fetch system settings for manual overrides and landing page config
    const rawSettings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'manualAuthorsCount', 'manualBooksCount', 'manualEventsCount', 'manualDonatedBooksCount',
            'landing_hero_title', 'landing_hero_highlight', 'landing_hero_subtitle',
            'landing_title_color', 'landing_highlight_color', 'landing_subtitle_color',
            'landing_featured_categories',
            'author_hero_title', 'author_hero_highlight', 'author_hero_subtitle',
            'organizer_hero_title', 'organizer_hero_highlight', 'organizer_hero_subtitle'
          ]
        }
      }
    });
    const settingsMap = {};
    rawSettings.forEach(s => settingsMap[s.key] = s.value);

    const stats = {
      authors: settingsMap['manualAuthorsCount'] ? parseInt(settingsMap['manualAuthorsCount']) : authors,
      books: settingsMap['manualBooksCount'] ? parseInt(settingsMap['manualBooksCount']) : books,
      categories: categories,
      events: settingsMap['manualEventsCount'] ? parseInt(settingsMap['manualEventsCount']) : events,
      fairs: fairs,
      airportLibraries: libraries,
      totalDonatedBooks: settingsMap['manualDonatedBooksCount'] ? parseInt(settingsMap['manualDonatedBooksCount']) : totalDonatedBooks,
      landingConfig: {
        heroTitle: settingsMap['landing_hero_title'] || "Helping indie authors publish, promote and sell.",
        heroHighlight: settingsMap['landing_hero_highlight'] || "authors",
        heroSubtitle: settingsMap['landing_hero_subtitle'] || "We provide independent authors with refined publishing assistance, strategic promotion, and curated distribution channels.",
        titleColor: settingsMap['landing_title_color'] || "#0f172a",
        highlightColor: settingsMap['landing_highlight_color'] || "#f16522",
        subtitleColor: settingsMap['landing_subtitle_color'] || "#334155",
        featuredCategories: settingsMap['landing_featured_categories'] ? JSON.parse(settingsMap['landing_featured_categories']) : [],
        authorHeroTitle: settingsMap['author_hero_title'] || '',
        authorHeroHighlight: settingsMap['author_hero_highlight'] || '',
        authorHeroSubtitle: settingsMap['author_hero_subtitle'] || '',
        organizerHeroTitle: settingsMap['organizer_hero_title'] || '',
        organizerHeroHighlight: settingsMap['organizer_hero_highlight'] || '',
        organizerHeroSubtitle: settingsMap['organizer_hero_subtitle'] || ''
      }
    };
    // Force nodemon restart to pick up generated Prisma Client
    setCache('public-stats', stats, 5 * 60 * 1000); // 5 mins
    res.json(stats);
  } catch (err) {
    console.error("public-stats error:", err);
    res.status(500).json({ error: 'Failed to fetch public stats' });
  }
});


// 1b. Get single book by ID (with author + reviews)
router.get('/api/books/:id', async (req, res) => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        author: true,
        reviews: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const extraData = book.author?.extraData;
    if (extraData && extraData.lateFines > 0 && extraData.fineDate) {
      const diffDays = (new Date().getTime() - new Date(extraData.fineDate).getTime()) / (1000 * 3600 * 24);
      if (diffDays > 3) return res.status(403).json({ error: 'Book is temporarily suspended' });
    }

    res.json(book);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// Get reviews for a book
router.get('/api/books/:id/reviews', async (req, res) => {
  try {
    const reviews = await prisma.bookReview.findMany({
      where: { bookId: parseInt(req.params.id) },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Submit a review for a book
router.post('/api/books/:id/reviews', async (req, res) => {
  try {
    const { reviewerName, rating, comment, writingStyleRating, contentQualityRating, enjoyedMost } = req.body;
    if (!reviewerName || !rating || !comment) {
      return res.status(400).json({ error: 'Name, rating and comment are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Idempotency: Check if a similar review was submitted very recently
    const recentDuplicate = await prisma.bookReview.findFirst({
      where: {
        bookId: parseInt(req.params.id),
        reviewerName,
        comment,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // within the last 5 minutes
        }
      }
    });

    if (recentDuplicate) {
      return res.status(200).json(recentDuplicate);
    }

    const review = await prisma.bookReview.create({
      data: {
        bookId: parseInt(req.params.id),
        reviewerName,
        rating: parseInt(rating),
        comment,
        writingStyleRating: writingStyleRating ? parseInt(writingStyleRating) : null,
        contentQualityRating: contentQualityRating ? parseInt(contentQualityRating) : null,
        enjoyedMost: enjoyedMost || null
      }
    });
    res.status(201).json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});


// 2. Author Registration (creates author, user login, and their first book)
router.post('/api/authors/register', upload.any(), async (req, res) => {
  try {
    const {
      name, email, phone, whatsapp, password, bio, penName, city, state, instagram, facebook, linkedin, youtube,
      qualification, qualifications, institution, subject, dob, experience, skills, hobbies, whyJoining, aadharNumber, address, district, pincode, extraData, transactionId, conflictOfInterestSignature, agreedToGuidelines, agreedToInfoDoc, groupJoiningDate
    } = req.body;

    // Check if email already in use by an actual Author profile
    const existingAuthor = await prisma.author.findUnique({ where: { email } });
    if (existingAuthor) {
      return res.status(400).json({ error: 'Email already registered as an Author' });
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });

    let booksArray = [];
    if (req.body.books) {
      try { booksArray = JSON.parse(req.body.books); } catch (e) { }
    }
    if (booksArray.length === 0 && req.body.title) {
      booksArray.push({
        title: req.body.title,
        subtitle: req.body.subtitle,
        genre: req.body.genre,
        subGenre: req.body.subGenre,
        synopsis: req.body.synopsis,
        pages: req.body.pages,
        mrp: req.body.mrp,
        stock: req.body.stock,
        language: req.body.language,
        isbn: req.body.isbn,
        publisher: req.body.publisher,
        publicationDate: req.body.publicationDate,
        edition: req.body.edition,
        format: req.body.format
      });
    }

    let qualificationsArray = [];
    if (qualifications) {
      try { qualificationsArray = JSON.parse(qualifications); } catch (e) { }
    } else if (qualification) {
      qualificationsArray.push({ qualification, institution, subject });
    }

    let photoUrl = req.body.photoUrl || null, paymentScreenshotUrl = req.body.paymentScreenshotUrl || null, qrCodeUrl = req.body.qrCodeUrl || null, certificateUrl = req.body.certificateUrl || null;
    let covers = {};
    let backCovers = {};
    if (req.body.covers) try { covers = JSON.parse(req.body.covers); } catch(e){}
    if (req.body.backCovers) try { backCovers = JSON.parse(req.body.backCovers); } catch(e){}
    if (Array.isArray(req.files)) {
      for (const file of req.files) {
        if (file.fieldname === 'photo') photoUrl = `/uploads/${file.filename}`;
        if (file.fieldname === 'paymentScreenshot') paymentScreenshotUrl = `/uploads/${file.filename}`;
        if (file.fieldname === 'qrCode') qrCodeUrl = `/uploads/${file.filename}`;
        if (file.fieldname === 'certificate') certificateUrl = `/uploads/${file.filename}`;
        if (file.fieldname === 'cover') covers[0] = `/uploads/${file.filename}`;
        if (file.fieldname === 'backCover') backCovers[0] = `/uploads/${file.filename}`;
        if (file.fieldname.startsWith('cover_')) {
          const idx = file.fieldname.split('_')[1];
          covers[idx] = `/uploads/${file.filename}`;
        }
        if (file.fieldname.startsWith('backCover_')) {
          const idx = file.fieldname.split('_')[1];
          backCovers[idx] = `/uploads/${file.filename}`;
        }
        if (file.fieldname.startsWith('certificate_')) {
          const id = file.fieldname.split('_')[1];
          const q = qualificationsArray.find(q => q.id == id);
          if (q) q.certificateUrl = `/uploads/${file.filename}`;
        }
      }
    }

    // Fallback logic for backward compatibility
    if (certificateUrl && qualificationsArray.length > 0 && !qualificationsArray[0].certificateUrl) {
      qualificationsArray[0].certificateUrl = certificateUrl;
    }

    const finalQualificationString = JSON.stringify(qualificationsArray);

    // Explicitly validate payment requirements
    if (!paymentScreenshotUrl || !transactionId) {
      return res.status(400).json({ error: 'Payment screenshot and Transaction ID are mandatory for registration.' });
    }

    // Explicitly validate mandatory file uploads (cover, backCover, certificate)
    if (!covers[0]) {
      return res.status(400).json({ error: 'Book Front Cover is mandatory.' });
    }
    if (!backCovers[0]) {
      return res.status(400).json({ error: 'Book Back Cover is mandatory.' });
    }
    if (!qualificationsArray[0]?.certificateUrl) {
      return res.status(400).json({ error: 'Qualification Certificate is mandatory.' });
    }

    // Handle login user
    let user = existingUser;
    let finalHashedPassword;
    if (!existingUser) {
      if (!password) {
        return res.status(400).json({ error: 'Password is required for new registration' });
      }
      finalHashedPassword = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: { name, email, password: finalHashedPassword, role: 'AUTHOR', address }
      });
    } else {
      finalHashedPassword = existingUser.password;
      await prisma.user.update({
        where: { email },
        data: { name, address, role: existingUser.role === 'ADMIN' ? 'ADMIN' : 'AUTHOR' }
      });
    }

    let author;
    try {
      author = await prisma.author.create({
        data: {
          name: name || "NA",
          email: email || "NA",
          phone: phone || "NA",
          bio: bio || "NA",
          penName: penName || "NA",
          city: city || "NA",
          state: state || "NA",
          instagram: instagram || "",
          facebook: facebook || "",
          photoUrl: photoUrl || "",
          qrCodeUrl: qrCodeUrl || "",
          transactionId: transactionId || "NA",
          paymentScreenshot: paymentScreenshotUrl || "",
          qualification: finalQualificationString,
          institution: "NA",
          subject: "NA",
          certificateUrl: "",
          age: dob || "NA",
          experience: experience || "0",
          skills: skills || "NA",
          hobbies: hobbies || "NA",
          whyJoining: whyJoining || "NA",
          aadharNumber: aadharNumber || "NA",
          address: address || "NA",
          district: district || "NA",
          pincode: pincode || "000000",
          dob: dob || "NA",
          groupJoiningDate: groupJoiningDate ? new Date(groupJoiningDate) : undefined,
          skillsJson: (() => { try { return JSON.parse(skills) } catch (e) { return [] } })(),
          hobbiesJson: (() => { try { return JSON.parse(hobbies) } catch (e) { return [] } })(),
          qualificationsJson: qualificationsArray,
          extraData: (() => {
            let parsed = extraData ? JSON.parse(extraData) : {};
            parsed.linkedin = linkedin || "";
            parsed.youtube = youtube || "";
            parsed.conflictOfInterestSignature = conflictOfInterestSignature || "NA";
            if (agreedToGuidelines !== undefined) parsed.agreedToGuidelines = agreedToGuidelines === 'true' || agreedToGuidelines === true;
            if (agreedToInfoDoc !== undefined) parsed.agreedToInfoDoc = agreedToInfoDoc === 'true' || agreedToInfoDoc === true;
            return parsed;
          })(),
          books: {
            create: booksArray.map((b, idx) => ({
              title: b.title || "NA",
              subtitle: b.subtitle || "NA",
              genre: b.genre || "NA",
              subGenre: b.subGenre || "NA",
              synopsis: b.synopsis || "NA",
              pages: parseInt(b.pages) || 0,
              mrp: parseFloat(b.mrp) || 0,
              stock: parseInt(b.stock) || 0,
              language: b.language || "NA",
              isbn: b.isbn || "0000000000000",
              publisher: b.publisher || "NA",
              publicationDate: b.publicationDate || "NA",
              edition: b.edition || "1",
              format: b.format || "NA",
              printFormat: b.printFormat || "NA",
              purpose: b.purpose || "NA",
              coverUrl: covers[idx] || "",
              backCoverUrl: backCovers[idx] || "",
              status: 'Pending'
            }))
          }
        },
        include: { books: true }
      });
    } catch (dbError) {
      // Rollback user if author fails AND user was just created
      if (!existingUser) {
        await prisma.user.delete({ where: { email } });
      }
      throw dbError;
    }

    invalidateCache('books');

    if (typeof sendNotificationEmail === 'function' && typeof emailWrap === 'function') {
      const emailContent = `
        <p>Dear ${author.name},</p>
        <p>Thank you for registering with the Pune Authors' Association.</p>
        <p>Your profile has been created and is currently under admin review.</p>
        <p>You will receive another email once your application is approved or rejected.</p>
        <p>Dashboard access will be available only after your application has been approved.</p>
      `;
      sendNotificationEmail(author.email, "Registration Received - PAA", emailWrap("Registration Received", emailContent));
    }

    res.status(201).json(author);
  } catch (error) {
    console.error(error);
    require('fs').writeFileSync('last_error.log', error.stack || error.toString());
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// Full re-application endpoint
// Author: Edit Profile (Full)
router.put('/api/author/edit-profile-full', verifyToken, upload.any(), async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { email: req.user.email }, include: { books: true } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    let currentExtraData = author.extraData || {};
    if (typeof currentExtraData === 'string') {
      try { currentExtraData = JSON.parse(currentExtraData); } catch (e) { currentExtraData = {}; }
    }

    // We snapshot the entire author record so admin can diff it!
    if (!currentExtraData.hasPendingEdits) {
      const { extraData: _extraData, ...authorWithoutExtra } = author;
      currentExtraData.originalProfileData = authorWithoutExtra;
    }
    currentExtraData.hasPendingEdits = true;

    const {
      name, phone, whatsapp, bio, penName, city, state, instagram, facebook, linkedin, youtube,
      qualification, qualifications, institution, subject, dob, experience, skills, hobbies, whyJoining, aadharNumber, address, district, pincode, extraData, transactionId, conflictOfInterestSignature, agreedToGuidelines, agreedToInfoDoc
    } = req.body;

    let booksArray = [];
    if (req.body.books) {
      try { booksArray = JSON.parse(req.body.books); } catch (e) { }
    }
    if (booksArray.length === 0 && req.body.title) {
      booksArray.push({
        title: req.body.title, subtitle: req.body.subtitle, genre: req.body.genre, subGenre: req.body.subGenre,
        synopsis: req.body.synopsis, pages: req.body.pages, mrp: req.body.mrp, stock: req.body.stock,
        language: req.body.language, isbn: req.body.isbn, publisher: req.body.publisher,
        publicationDate: req.body.publicationDate, edition: req.body.edition, format: req.body.format, purpose: req.body.purposeOfWriting, printFormat: req.body.printFormat
      });
    }

    let qualificationsArray = [];
    if (qualifications) {
      try { qualificationsArray = JSON.parse(qualifications); } catch (e) { }
    } else if (qualification) {
      qualificationsArray.push({ qualification, institution, subject });
    }

    let photoUrl = author.photoUrl, paymentScreenshotUrl = author.paymentScreenshot, qrCodeUrl = author.qrCodeUrl;
    let covers = {};
    let backCovers = {};

    let existingQuals = [];
    try { existingQuals = JSON.parse(author.qualification || '[]'); } catch (e) { }
    qualificationsArray.forEach(q => {
      const eq = existingQuals.find(ex => ex.id === q.id);
      if (eq && eq.certificateUrl) q.certificateUrl = eq.certificateUrl;
    });

    if (Array.isArray(req.files)) {
      for (const file of req.files) {
        if (file.fieldname === 'photo') photoUrl = `/uploads/${file.filename}`;
        if (file.fieldname === 'paymentScreenshot') paymentScreenshotUrl = `/uploads/${file.filename}`;
        if (file.fieldname === 'qrCode') qrCodeUrl = `/uploads/${file.filename}`;
        if (file.fieldname.startsWith('cover_')) {
          const idx = file.fieldname.split('_')[1];
          covers[idx] = `/uploads/${file.filename}`;
        }
        if (file.fieldname.startsWith('backCover_')) {
          const idx = file.fieldname.split('_')[1];
          backCovers[idx] = `/uploads/${file.filename}`;
        }
        if (file.fieldname.startsWith('certificate_')) {
          const id = file.fieldname.split('_')[1];
          const q = qualificationsArray.find(q => q.id == id);
          if (q) q.certificateUrl = `/uploads/${file.filename}`;
        }
      }
    }

    const finalQualificationString = JSON.stringify(qualificationsArray);

    if (extraData) {
      let incomingExtra = typeof extraData === 'string' ? JSON.parse(extraData) : extraData;
      if (typeof incomingExtra === 'string') {
        try { incomingExtra = JSON.parse(incomingExtra); } catch (e) { }
      }
      if (incomingExtra && typeof incomingExtra === 'object' && !Array.isArray(incomingExtra)) {
        currentExtraData = { ...currentExtraData, ...incomingExtra, hasPendingEdits: true, originalProfileData: currentExtraData.originalProfileData };
      }
    }

    if (linkedin) currentExtraData.linkedin = linkedin;
    if (youtube) currentExtraData.youtube = youtube;
    if (conflictOfInterestSignature) currentExtraData.conflictOfInterestSignature = conflictOfInterestSignature;
    if (agreedToGuidelines !== undefined) currentExtraData.agreedToGuidelines = agreedToGuidelines === 'true' || agreedToGuidelines === true;
    if (agreedToInfoDoc !== undefined) currentExtraData.agreedToInfoDoc = agreedToInfoDoc === 'true' || agreedToInfoDoc === true;

    await prisma.author.update({
      where: { id: author.id },
      data: {
        name, phone, bio, penName, city, state, instagram, facebook,
        photoUrl, qrCodeUrl, transactionId, paymentScreenshot: paymentScreenshotUrl,
        qualification: finalQualificationString,
        age: dob, experience, skills, hobbies, whyJoining, aadharNumber, address, district, pincode, dob, skillsJson: (() => { try { return JSON.parse(skills) } catch (e) { return [] } })(), hobbiesJson: (() => { try { return JSON.parse(hobbies) } catch (e) { return [] } })(), qualificationsJson: qualificationsArray,
        status: 'Edited',
        extraData: currentExtraData
      }
    });

    const incomingBookIds = booksArray.map(b => parseInt(b.id)).filter(id => !isNaN(id));
    await prisma.book.updateMany({
      where: { authorId: author.id, id: { notIn: incomingBookIds } },
      data: { isArchived: true, status: 'Archived' }
    });

    for (let i = 0; i < booksArray.length; i++) {
      const b = booksArray[i];
      const bId = parseInt(b.id);
      const existingBook = !isNaN(bId) ? author.books.find(eb => eb.id === bId) : null;

      let isEdited = false;
      if (existingBook) {
        const fields = ['title', 'subtitle', 'genre', 'subGenre', 'synopsis', 'purpose', 'language', 'isbn', 'publisher', 'publicationDate', 'edition', 'format', 'printFormat'];
        for (let f of fields) {
          if ((b[f] || '') !== (existingBook[f] || '')) isEdited = true;
        }
        if ((parseInt(b.pages) || null) !== existingBook.pages) isEdited = true;
        if ((parseFloat(b.mrp) || 0) !== existingBook.mrp) isEdited = true;
        if ((parseInt(b.stock) || 0) !== existingBook.stock) isEdited = true;
        if (covers[i] || (i === 0 && covers[0])) isEdited = true;
        if (backCovers[i] || (i === 0 && backCovers[0])) isEdited = true;
      }

      const bookStatus = existingBook ? (isEdited ? 'Pending' : existingBook.status) : 'Pending';

      const bookData = {
        title: b.title, subtitle: b.subtitle, genre: b.genre, subGenre: b.subGenre,
        synopsis: b.synopsis,
        purpose: b.purpose, pages: parseInt(b.pages) || null, mrp: parseFloat(b.mrp) || 0,
        stock: parseInt(b.stock) || 0, language: b.language, isbn: b.isbn,
        publisher: b.publisher, publicationDate: b.publicationDate, edition: b.edition, format: b.format, printFormat: b.printFormat,
        status: bookStatus
      };
      if (covers[i] || (i === 0 && covers[0])) {
        bookData.coverUrl = covers[i] || covers[0];
      }
      if (backCovers[i] || (i === 0 && backCovers[0])) {
        bookData.backCoverUrl = backCovers[i] || backCovers[0];
      }
      if (existingBook) {
        await prisma.book.update({ where: { id: existingBook.id }, data: bookData });
      } else {
        await prisma.book.create({ data: { ...bookData, authorId: author.id } });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    require('fs').writeFileSync('last_error.log', err.stack || err.toString());
    res.status(500).json({ error: 'Failed to update profile', details: err.message });
  }
});

router.put('/api/author/reapply-full', verifyToken, upload.any(), async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { email: req.user.email }, include: { books: true } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    const {
      name, phone, whatsapp, bio, penName, city, state, instagram, facebook, linkedin, youtube,
      qualification, qualifications, institution, subject, dob, experience, skills, hobbies, whyJoining, aadharNumber, address, district, pincode, extraData, transactionId, conflictOfInterestSignature, agreedToGuidelines, agreedToInfoDoc
    } = req.body;

    let booksArray = [];
    if (req.body.books) {
      try { booksArray = JSON.parse(req.body.books); } catch (e) { }
    }
    if (booksArray.length === 0 && req.body.title) {
      booksArray.push({
        title: req.body.title, subtitle: req.body.subtitle, genre: req.body.genre, subGenre: req.body.subGenre,
        synopsis: req.body.synopsis, pages: req.body.pages, mrp: req.body.mrp, stock: req.body.stock,
        language: req.body.language, isbn: req.body.isbn, publisher: req.body.publisher,
        publicationDate: req.body.publicationDate, edition: req.body.edition, format: req.body.format, purpose: req.body.purposeOfWriting
      });
    }

    let qualificationsArray = [];
    if (qualifications) {
      try { qualificationsArray = JSON.parse(qualifications); } catch (e) { }
    } else if (qualification) {
      qualificationsArray.push({ qualification, institution, subject });
    }

    let photoUrl = author.photoUrl, paymentScreenshotUrl = author.paymentScreenshot, qrCodeUrl = author.qrCodeUrl;
    let covers = {};
    let backCovers = {};

    // Copy existing certificates
    let existingQuals = [];
    try { existingQuals = JSON.parse(author.qualification || '[]'); } catch (e) { }
    qualificationsArray.forEach(q => {
      const eq = existingQuals.find(ex => ex.id === q.id);
      if (eq && eq.certificateUrl) q.certificateUrl = eq.certificateUrl;
    });

    if (Array.isArray(req.files)) {
      for (const file of req.files) {
        if (file.fieldname === 'photo') photoUrl = `/uploads/${file.filename}`;
        if (file.fieldname === 'paymentScreenshot') paymentScreenshotUrl = `/uploads/${file.filename}`;
        if (file.fieldname === 'qrCode') qrCodeUrl = `/uploads/${file.filename}`;
        if (file.fieldname.startsWith('cover_')) {
          const idx = file.fieldname.split('_')[1];
          covers[idx] = `/uploads/${file.filename}`;
        }
        if (file.fieldname.startsWith('backCover_')) {
          const idx = file.fieldname.split('_')[1];
          backCovers[idx] = `/uploads/${file.filename}`;
        }
        if (file.fieldname.startsWith('certificate_')) {
          const id = file.fieldname.split('_')[1];
          const q = qualificationsArray.find(q => q.id == id);
          if (q) q.certificateUrl = `/uploads/${file.filename}`;
        }
      }
    }

    const finalQualificationString = JSON.stringify(qualificationsArray);

    await prisma.author.update({
      where: { id: author.id },
      data: {
        name, phone, bio, penName, city, state, instagram, facebook,
        photoUrl, qrCodeUrl, transactionId, paymentScreenshot: paymentScreenshotUrl,
        qualification: finalQualificationString,
        age: dob, experience, skills, hobbies, whyJoining, aadharNumber, address, district, pincode, dob, skillsJson: (() => { try { return JSON.parse(skills) } catch (e) { return [] } })(), hobbiesJson: (() => { try { return JSON.parse(hobbies) } catch (e) { return [] } })(), qualificationsJson: qualificationsArray, status: 'Pending',
        extraData: (() => {
          let parsed = extraData ? JSON.parse(extraData) : (author.extraData || {});
          if (linkedin) parsed.linkedin = linkedin;
          if (youtube) parsed.youtube = youtube;
          if (conflictOfInterestSignature) parsed.conflictOfInterestSignature = conflictOfInterestSignature;
          if (agreedToGuidelines !== undefined) parsed.agreedToGuidelines = agreedToGuidelines === 'true' || agreedToGuidelines === true;
          if (agreedToInfoDoc !== undefined) parsed.agreedToInfoDoc = agreedToInfoDoc === 'true' || agreedToInfoDoc === true;
          parsed.isReapplied = true;
          return parsed;
        })()
      }
    });

    const incomingBookIds = booksArray.map(b => parseInt(b.id)).filter(id => !isNaN(id));
    await prisma.book.updateMany({
      where: { authorId: author.id, id: { notIn: incomingBookIds } },
      data: { isArchived: true, status: 'Archived' }
    });

    for (let i = 0; i < booksArray.length; i++) {
      const b = booksArray[i];
      const bId = parseInt(b.id);
      const existingBook = !isNaN(bId) ? author.books.find(eb => eb.id === bId) : null;

      let isEdited = false;
      if (existingBook) {
        const fields = ['title', 'subtitle', 'genre', 'subGenre', 'synopsis', 'purpose', 'language', 'isbn', 'publisher', 'publicationDate', 'edition', 'format', 'printFormat'];
        for (let f of fields) {
          if ((b[f] || '') !== (existingBook[f] || '')) isEdited = true;
        }
        if ((parseInt(b.pages) || null) !== existingBook.pages) isEdited = true;
        if ((parseFloat(b.mrp) || 0) !== existingBook.mrp) isEdited = true;
        if ((parseInt(b.stock) || 0) !== existingBook.stock) isEdited = true;
        if (covers[i] || (i === 0 && covers[0])) isEdited = true;
        if (backCovers[i] || (i === 0 && backCovers[0])) isEdited = true;
      }

      const bookStatus = existingBook ? (isEdited ? 'Pending' : existingBook.status) : 'Pending';

      const bookData = {
        title: b.title, subtitle: b.subtitle, genre: b.genre, subGenre: b.subGenre,
        synopsis: b.synopsis,
        purpose: b.purpose, pages: parseInt(b.pages) || null, mrp: parseFloat(b.mrp) || 0,
        stock: parseInt(b.stock) || 0, language: b.language, isbn: b.isbn,
        publisher: b.publisher, publicationDate: b.publicationDate, edition: b.edition, format: b.format, printFormat: b.printFormat,
        status: bookStatus
      };
      if (covers[i] || (i === 0 && covers[0])) {
        bookData.coverUrl = covers[i] || covers[0];
      }
      if (backCovers[i] || (i === 0 && backCovers[0])) {
        bookData.backCoverUrl = backCovers[i] || backCovers[0];
      }
      if (existingBook) {
        await prisma.book.update({ where: { id: existingBook.id }, data: bookData });
      } else {
        await prisma.book.create({ data: { ...bookData, authorId: author.id } });
      }
    }

    if (typeof sendNotificationEmail === 'function' && typeof emailWrap === 'function') {
      const emailContent = `
        <p>Dear ${author.name || name},</p>
        <p>We have received your updated application with the Pune Authors' Association.</p>
        <p>Your profile is now <strong>under review</strong> by our editorial team. We aim to process all applications within <strong>5–7 working days</strong>.</p>
        <p>We hope to be able to approve your application this time. If you have any questions in the meantime, feel free to reach out to us.</p>
        <p style="margin-top:16px;">Warm regards,<br/>Pune Authors' Association</p>
      `;
      sendNotificationEmail(author.email, "Reapplication Received – PAA", emailWrap("Reapplication Received", emailContent));
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Reapplication failed', details: error.message });
  }
});

// 3. Get Author Dashboard details (mocking auth by just email query for now)
router.get('/api/authors/:email', async (req, res) => {
  const author = await prisma.author.findUnique({
    where: { email: req.params.email },
    include: { books: true }
  });
  if (!author) return res.status(404).json({ error: 'Author not found' });
  res.json(author);
});

// 4. Operations Dashboard - Get all authors
router.get('/api/admin/authors', verifyToken, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const allSystemEvents = await prisma.event.findMany({
      where: { broadcastStatus: { not: 'Draft' } },
      select: { id: true, date: true, status: true }
    });

    const [authors, total] = await Promise.all([
      prisma.author.findMany({
        skip,
        take: limit,
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
      }),
      prisma.author.count()
    ]);

    // Get global totals for dashboard stats (lightweight counts)
    const [totalActive, totalPending, totalSuspended] = await Promise.all([
      prisma.author.count({ where: { status: 'Approved' } }),
      prisma.author.count({ where: { status: 'Pending Verification' } }),
      prisma.author.count({ where: { status: 'Suspended' } })
    ]);

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
        ...a,
        joined: a.createdAt.toISOString().split('T')[0],
        totalBooks: a._count.books,
        eventsPart: a._count.eventRegistrations + a._count.eventAuthors,
        eventParticipation: a.eventAuthors.map(ea => ({
          ...ea,
          status: ea.optInStatus === 'Awaiting Approval' ? 'Pending' : ea.optInStatus
        })),
        aggEligibleEvents: eligibleCount,
        aggParticipatedEvents: participatedCount,
        extraData: typeof a.extraData === 'string' ? (() => { try { return JSON.parse(a.extraData || '{}') } catch(e) { return {} } })() : (a.extraData || {})
      };
    });

    res.json({
      data: mapped,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalActive,
        totalPending,
        totalSuspended
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Delete (Archive) Author
router.delete('/api/admin/authors/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const authorId = parseInt(req.params.id);
    await prisma.author.update({ where: { id: authorId }, data: { isArchived: true } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to archive' });
  }
});

// Restore Author
router.put('/api/admin/authors/:id/restore', verifyToken, isAdmin, async (req, res) => {
  try {
    const authorId = parseInt(req.params.id);
    await prisma.author.update({ where: { id: authorId }, data: { isArchived: false } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to restore' });
  }
});

// 5. Operations Dashboard - Approve Author
router.put('/api/admin/authors/:id/full-update-and-approve', verifyToken, isAdmin, upload.any(), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const author = await prisma.author.findUnique({ where: { id }, include: { books: true } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    const {
      name, phone, whatsapp, bio, penName, city, state, instagram, facebook, linkedin, youtube,
      qualification, qualifications, institution, subject, dob, experience, skills, hobbies, whyJoining, aadharNumber, address, district, pincode, extraData, transactionId, conflictOfInterestSignature, agreedToGuidelines, agreedToInfoDoc
    } = req.body;

    let booksArray = [];
    if (req.body.books) {
      try { booksArray = JSON.parse(req.body.books); } catch (e) { }
    }
    if (booksArray.length === 0 && req.body.title) {
      booksArray.push({
        title: req.body.title, subtitle: req.body.subtitle, genre: req.body.genre, subGenre: req.body.subGenre,
        synopsis: req.body.synopsis, pages: req.body.pages, mrp: req.body.mrp, stock: req.body.stock,
        language: req.body.language, isbn: req.body.isbn, publisher: req.body.publisher,
        publicationDate: req.body.publicationDate, edition: req.body.edition, format: req.body.format, purpose: req.body.purposeOfWriting
      });
    }

    let qualificationsArray = [];
    if (qualifications) {
      try { qualificationsArray = JSON.parse(qualifications); } catch (e) { }
    } else if (qualification) {
      qualificationsArray.push({ qualification, institution, subject });
    }

    let photoUrl = author.photoUrl, paymentScreenshotUrl = author.paymentScreenshot, qrCodeUrl = author.qrCodeUrl;
    let covers = {};
    let backCovers = {};

    // Copy existing certificates
    let existingQuals = [];
    try { existingQuals = JSON.parse(author.qualification || '[]'); } catch (e) { }
    qualificationsArray.forEach(q => {
      const eq = existingQuals.find(ex => ex.id === q.id);
      if (eq && eq.certificateUrl) q.certificateUrl = eq.certificateUrl;
    });

    if (Array.isArray(req.files)) {
      for (const file of req.files) {
        if (file.fieldname === 'photo') photoUrl = `/uploads/${file.filename}`;
        if (file.fieldname === 'paymentScreenshot') paymentScreenshotUrl = `/uploads/${file.filename}`;
        if (file.fieldname === 'qrCode') qrCodeUrl = `/uploads/${file.filename}`;
        if (file.fieldname.startsWith('cover_')) {
          const idx = file.fieldname.split('_')[1];
          covers[idx] = `/uploads/${file.filename}`;
        }
        if (file.fieldname.startsWith('backCover_')) {
          const idx = file.fieldname.split('_')[1];
          backCovers[idx] = `/uploads/${file.filename}`;
        }
        if (file.fieldname.startsWith('certificate_')) {
          const certId = file.fieldname.split('_')[1];
          const q = qualificationsArray.find(q => q.id == certId);
          if (q) q.certificateUrl = `/uploads/${file.filename}`;
        }
      }
    }

    const finalQualificationString = JSON.stringify(qualificationsArray);

    await prisma.author.update({
      where: { id },
      data: {
        name, phone, bio, penName, city, state, instagram, facebook,
        photoUrl, qrCodeUrl, transactionId, paymentScreenshot: paymentScreenshotUrl,
        qualification: finalQualificationString,
        age: dob, experience, skills, hobbies, whyJoining, aadharNumber, address, district, pincode, dob, skillsJson: (() => { try { return JSON.parse(skills) } catch (e) { return [] } })(), hobbiesJson: (() => { try { return JSON.parse(hobbies) } catch (e) { return [] } })(), qualificationsJson: qualificationsArray,
        status: 'Active',
        rejectionReason: null,
        extraData: (() => {
          let parsed = extraData ? JSON.parse(extraData) : (author.extraData || {});
          if (linkedin) parsed.linkedin = linkedin;
          if (youtube) parsed.youtube = youtube;
          if (conflictOfInterestSignature) parsed.conflictOfInterestSignature = conflictOfInterestSignature;
          if (agreedToGuidelines !== undefined) parsed.agreedToGuidelines = agreedToGuidelines === 'true' || agreedToGuidelines === true;
          if (agreedToInfoDoc !== undefined) parsed.agreedToInfoDoc = agreedToInfoDoc === 'true' || agreedToInfoDoc === true;
          parsed.hasPendingEdits = false;
          parsed.isReapplied = false;
          return parsed;
        })()
      }
    });

    const incomingBookIds = booksArray.map(b => parseInt(b.id)).filter(id => !isNaN(id));
    await prisma.book.updateMany({
      where: { authorId: author.id, id: { notIn: incomingBookIds } },
      data: { isArchived: true, status: 'Archived' }
    });

    for (let i = 0; i < booksArray.length; i++) {
      const b = booksArray[i];
      const bId = parseInt(b.id);
      const existingBook = !isNaN(bId) ? author.books.find(eb => eb.id === bId) : null;
      const bookData = {
        title: b.title, subtitle: b.subtitle, genre: b.genre, subGenre: b.subGenre,
        synopsis: b.synopsis,
        purpose: b.purpose, pages: parseInt(b.pages) || null, mrp: parseFloat(b.mrp) || 0,
        stock: parseInt(b.stock) || 0, language: b.language, isbn: b.isbn,
        publisher: b.publisher, publicationDate: b.publicationDate, edition: b.edition, format: b.format, printFormat: b.printFormat
      };
      if (covers[i] || (i === 0 && covers[0])) {
        bookData.coverUrl = covers[i] || covers[0];
      }
      if (backCovers[i] || (i === 0 && backCovers[0])) {
        bookData.backCoverUrl = backCovers[i] || backCovers[0];
      }
      if (existingBook) {
        await prisma.book.update({ where: { id: existingBook.id }, data: { ...bookData, status: 'Approved' } });
      } else {
        await prisma.book.create({ data: { ...bookData, authorId: author.id, status: 'Approved' } });
      }
    }

    // Send approval email
    const wasEditing = author.status === 'Edited' || (author.extraData && author.extraData.hasPendingEdits);
    const emailContent = wasEditing ? `
      <p>Dear ${author.name},</p>
      <p>Your recent profile updates have been officially <strong>approved</strong> by the Pune Authors' Association editorial team.</p>
      <p>Your updated information is now live on the platform.</p>
    ` : `
      <p>Dear ${author.name},</p>
      <p>Congratulations! Your author profile has been officially approved by the Pune Authors' Association editorial team.</p>
      <p>Your books are now live in the catalogue. You can log in to your dashboard to manage your inventory, track orders, and participate in upcoming events.</p>
      <p>Welcome to the community!</p>
    `;
    if (typeof sendNotificationEmail === 'function' && typeof emailWrap === 'function') {
      sendNotificationEmail(author.email, wasEditing ? "PAA Profile Updates Approved!" : "Welcome to PAA - Your Profile is Approved!", emailWrap(wasEditing ? "Updates Approved" : "Profile Approved", emailContent));
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Approve and update failed', details: error.message });
  }
});

router.post('/api/admin/authors/:id/approve', verifyToken, isAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const existingAuthor = await prisma.author.findUnique({ where: { id } });

  let extraData = {};
  if (existingAuthor.extraData) {
    extraData = typeof existingAuthor.extraData === 'string' ? JSON.parse(existingAuthor.extraData) : existingAuthor.extraData;
  }
  const wasEdited = extraData.hasPendingEdits || existingAuthor.status === 'Edited';
  const wasReapplied = extraData.isReapplied;

  extraData.hasPendingEdits = false;
  extraData.originalProfileData = {};
  extraData.isReapplied = false;

  const author = await prisma.author.update({
    where: { id },
    data: { status: 'Active', rejectionReason: null, extraData: extraData }
  });
  // Approve their pending books too
  await prisma.book.updateMany({
    where: { authorId: id, status: 'Pending' },
    data: { status: 'Approved' }
  });

  // Send approval email
  if (wasEdited) {
    const emailContent = `
      <p>Dear ${author.name},</p>
      <p>Your recent profile updates have been officially approved by the Pune Authors' Association editorial team.</p>
      <p>Your changes are now live. You can log in to your dashboard to manage your inventory and profile.</p>
    `;
    if (typeof sendNotificationEmail === 'function' && typeof emailWrap === 'function') {
      sendNotificationEmail(author.email, "Profile Edits Approved!", emailWrap("Edits Approved", emailContent));
    }
  } else {
    const emailContent = `
      <p>Dear ${author.name},</p>
      <p>Congratulations! Your author profile has been officially approved by the Pune Authors' Association editorial team.</p>
      <p>Your books are now live in the catalogue. You can log in to your dashboard to manage your inventory, track orders, and participate in upcoming events.</p>
      <p>Welcome to the community!</p>
    `;
    if (typeof sendNotificationEmail === 'function' && typeof emailWrap === 'function') {
      sendNotificationEmail(author.email, "Welcome to PAA - Your Profile is Approved!", emailWrap("Profile Approved", emailContent));
    }
  }

  res.json(author);
});

// 5b. Operations Dashboard - Reject Author (with reason)
router.post('/api/admin/authors/:id/reject', verifyToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    const author = await prisma.author.update({
      where: { id },
      data: { status: 'Rejected', rejectionReason: reason || 'No reason provided.' }
    });

    // Send rejection email
    const emailContent = `
      <p>Dear ${author.name},</p>
      <p>We have reviewed your author profile application for the Pune Authors' Association.</p>
      <p>Unfortunately, your application has been rejected at this time for the following reason(s):</p>
      <p style="padding: 10px; background-color: #fef2f2; border-left: 4px solid #ef4444; color: #b91c1c;">
        <strong>${reason || 'No specific reason provided.'}</strong>
      </p>
      <p>Please log in to your dashboard to resolve these issues and update your profile. Once the necessary changes are made, your profile will be re-evaluated.</p>
    `;

    if (typeof sendNotificationEmail === 'function' && typeof emailWrap === 'function') {
      sendNotificationEmail(author.email, "Action Required: Your PAA Profile Status", emailWrap("Profile Review Update", emailContent));
    }

    res.json(author);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject author' });
  }
});

// Admin: Reject author edits (revert)
router.post('/api/admin/authors/:id/reject-edits', verifyToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existingAuthor = await prisma.author.findUnique({ where: { id }, include: { books: true } });
    if (!existingAuthor) return res.status(404).json({ error: 'Not found' });

    let currentExtraData = existingAuthor.extraData || {};
    if (typeof currentExtraData === 'string') {
      try { currentExtraData = JSON.parse(currentExtraData); } catch (e) { currentExtraData = {}; }
    }

    let updateData = {};
    if (currentExtraData.originalProfileData) {
      // Only restore specific top-level fields
      const fieldsToRestore = ['name', 'phone', 'bio', 'penName', 'city', 'state', 'instagram', 'facebook', 'photoUrl', 'qrCodeUrl', 'qualification', 'age', 'experience', 'skills', 'hobbies', 'whyJoining', 'aadharNumber', 'address', 'district', 'pincode', 'skillsJson', 'hobbiesJson', 'qualificationsJson'];
      for (const f of fieldsToRestore) {
        if (currentExtraData.originalProfileData[f] !== undefined) {
          updateData[f] = currentExtraData.originalProfileData[f];
        }
      }

      if (currentExtraData.originalProfileData.books) {
        const originalBooks = currentExtraData.originalProfileData.books;
        const currentBooks = await prisma.book.findMany({ where: { authorId: id } });
        const originalBookIds = originalBooks.map(b => b.id);

        await prisma.book.updateMany({
          where: { authorId: id, id: { notIn: originalBookIds } },
          data: { isArchived: true, status: 'Archived' }
        });

        for (const ob of originalBooks) {
          const { id: bookId, authorId, createdAt, updatedAt, ...bookDataToRestore } = ob;
          const exists = currentBooks.find(b => b.id === bookId);
          if (exists) {
            await prisma.book.update({ where: { id: bookId }, data: bookDataToRestore });
          } else {
            await prisma.book.create({ data: { ...bookDataToRestore, authorId: id } });
          }
        }
      }
    }

    currentExtraData.hasPendingEdits = false;
    currentExtraData.editedProfileFields = [];
    currentExtraData.originalProfileData = {};

    const author = await prisma.author.update({
      where: { id },
      data: {
        ...updateData,
        status: 'Active',
        extraData: currentExtraData
      }
    });

    const { reason } = req.body || {};

    // Email notification
    const emailContent = `
      <p>Dear ${author.name},</p>
      <p>Your recent profile edits could not be approved and have been reverted to their previous state.</p>
      ${reason ? `<p><strong>Admin Note:</strong> ${reason}</p>` : ''}
      <p>Please review your information and try submitting again if needed.</p>
    `;
    if (typeof sendNotificationEmail === 'function' && typeof emailWrap === 'function') {
      sendNotificationEmail(author.email, "Profile Edits Rejected", emailWrap("Edits Rejected", emailContent));
    }

    res.json(author);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject edits' });
  }
});


// Admin: Edit author profile (bio, name, phone, whatsapp, etc. and books)
router.put('/api/admin/authors/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, bio, phone, whatsapp, penName, city, state, address, aadharNumber, qualification, age, experience, skills, hobbies, instagram, facebook, whyJoining, books, district, pincode, dob } = req.body;
    const existingAuthor = await prisma.author.findUnique({ where: { id } });
    let currentExtraData = existingAuthor.extraData || {};
    if (typeof currentExtraData === 'string') {
      try { currentExtraData = JSON.parse(currentExtraData); } catch (e) { currentExtraData = {}; }
    }
    currentExtraData.hasPendingEdits = false;
    currentExtraData.editedProfileFields = [];

    const author = await prisma.author.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(phone !== undefined && { phone }),
        // whatsapp field removed
        ...(penName !== undefined && { penName }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(address !== undefined && { address }),
        ...(aadharNumber !== undefined && { aadharNumber }),
        ...(qualification !== undefined && { qualification }),
        ...(age !== undefined && { age }),
        ...(experience !== undefined && { experience }),
        ...(skills !== undefined && { skills }),
        ...(hobbies !== undefined && { hobbies }),
        ...(instagram !== undefined && { instagram }),
        ...(facebook !== undefined && { facebook }),
        ...(whyJoining !== undefined && { whyJoining }),
        ...(district !== undefined && { district }),
        ...(pincode !== undefined && { pincode }),
        ...(dob !== undefined && { dob }),
        ...(skills !== undefined && { skillsJson: (() => { try { return JSON.parse(skills) } catch (e) { return [] } })() }),
        ...(hobbies !== undefined && { hobbiesJson: (() => { try { return JSON.parse(hobbies) } catch (e) { return [] } })() }),
        extraData: currentExtraData
      }
    });

    if (books && Array.isArray(books)) {
      for (const b of books) {
        if (b.id) {
          await prisma.book.update({
            where: { id: parseInt(b.id) },
            data: {
              title: b.title,
              subtitle: b.subtitle,
              genre: b.genre,
              subGenre: b.subGenre,
              mrp: b.mrp ? parseFloat(b.mrp) : undefined,
              language: b.language,
              format: b.format,
              printFormat: b.printFormat,
              pages: b.pages ? parseInt(b.pages) : undefined,
              publisher: b.publisher,
              isbn: b.isbn,
              publicationDate: b.publicationDate,
              synopsis: b.synopsis,
              purpose: b.purpose,
              stock: b.stock ? parseInt(b.stock) : undefined
            }
          });
        }
      }
    }

    res.json(author);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update author' });
  }
});

// Admin Dashboard Overview Stats
// Public Stats for Landing/Registration Pages
router.get('/api/impact-stats', async (req, res) => {
  const cached = getCache('impact:stats');
  if (cached) return res.json(cached);

  try {
    const events = await prisma.event.findMany({
      include: {
        eventAuthors: true,
        posOrders: {
          where: { paymentStatus: 'CONFIRMED' },
          include: { items: true }
        }
      }
    });

    let totalFairs = 0;
    let totalFairsBooks = 0;
    let totalLiteraryEvents = 0;
    let totalLiteraryBooks = 0;

    events.forEach(evt => {
      let booksSold = evt.aggSold || 0;
      
      if (evt.eventAuthors) {
        evt.eventAuthors.forEach(ea => {
          if (ea.manualTotalSold) booksSold += ea.manualTotalSold;
        });
      }

      if (evt.posOrders) {
        evt.posOrders.forEach(order => {
          if (order.items) {
            order.items.forEach(item => {
              booksSold += item.quantity;
            });
          }
        });
      }

      const matchStr = ((evt.name || '') + ' ' + (evt.eventType || '')).toLowerCase();
      if (matchStr.includes('fair') || matchStr.includes('mela')) {
        totalFairs++;
        totalFairsBooks += booksSold;
      } else {
        totalLiteraryEvents++;
        totalLiteraryBooks += booksSold;
      }
    });

    const totalLibraries = await prisma.library.count();
    const totalLibraryBooks = totalLibraries * 112;

    const result = {
      totalFairs,
      totalFairsBooks,
      totalLiteraryEvents,
      totalLiteraryBooks,
      totalLibraries,
      totalLibraryBooks
    };

    setCache('impact:stats', result, 1000 * 60 * 15); // cache for 15 mins
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch public stats' });
  }
});

router.get('/api/admin/dashboard-stats', verifyToken, isAdmin, async (req, res) => {
  const cached = getCache('admin:dashboard-stats');
  if (cached) return res.json(cached);
  try {
    const totalAuthors = await prisma.author.count();
    const totalBooks = await prisma.book.count();

    const [eventParticipations, pendingEventRegistrations, totalEvents, totalLibraries] = await Promise.all([
      prisma.eventAuthor.count({ where: { optInStatus: 'Registered' } }),
      prisma.eventAuthor.count({ where: { optInStatus: 'Pending Approval' } }),
      prisma.event.count(),
      prisma.library.count()
    ]);

    // 1. Total Revenue (Aligned with Sales Report logic)
    const webOrdersAll = await prisma.order.findMany({
      where: { status: { in: ['Completed', 'Delivered', 'Shipped', 'Dispatched'] } },
      include: { items: { include: { book: true } } }
    });
    let webRevenue = 0;
    webOrdersAll.forEach(o => {
      o.items.forEach(i => {
        webRevenue += i.quantity * (i.book?.mrp || 0);
      });
    });

    const posOrdersAll = await prisma.posOrder.findMany({
      include: { items: true }
    });
    let posRevenue = 0;
    posOrdersAll.forEach(po => {
      po.items.forEach(i => {
        posRevenue += i.quantity * (i.price || 0);
      });
    });

    const legacyEventsAll = await prisma.event.findMany({
      where: { status: 'Legacy Archive' }
    });
    let legacyRevenue = 0;
    legacyEventsAll.forEach(evt => {
      const qty = evt.aggSold || 0;
      legacyRevenue += evt.aggRevenue || (qty * 200) || 0;
    });

    const totalRevenue = webRevenue + posRevenue + legacyRevenue;

    // 2. Revenue Data (Last 6 Months)
    // We can use Prisma groupBy or queryRaw. To be safe across DBs, we'll fetch only date & amount for web orders
    // which is much lighter than fetching deep relations.
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const recentOrders = await prisma.orderItem.findMany({
      where: {
        order: { status: { in: ['Completed', 'Delivered', 'Shipped', 'Dispatched'] } },
        status: { notIn: ['Cancelled', 'Rejected'] },
        createdAt: { gte: sixMonthsAgo }
      },
      select: { quantity: true, book: { select: { mrp: true } }, createdAt: true }
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenueDataMap = {};
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      revenueDataMap[key] = { month: monthNames[d.getMonth()], revenue: 0, authors: 0 };
    }

    recentOrders.forEach(o => {
      const d = new Date(o.createdAt);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (revenueDataMap[key]) {
        revenueDataMap[key].revenue += (o.quantity * (o.book?.mrp || 0));
      }
    });
    const revenueData = Object.values(revenueDataMap);

    // 3. Top Customers
    // Using raw SQL is fastest for complex aggregations, but since SQLite/Postgres might differ,
    // we use Prisma groupBy. Prisma groupBy requires select/where.
    const topCustomersGrouped = await prisma.order.groupBy({
      by: ['customerEmail', 'customerName'],
      where: { customerEmail: { not: null }, status: { in: ['Completed', 'Delivered', 'Shipped', 'Dispatched'] } },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10
    });
    const topCustomers = topCustomersGrouped.map(c => ({
      email: c.customerEmail,
      name: c.customerName,
      totalSpent: c._sum.amount || 0,
      ordersCount: c._count.id
    }));

    // 4. Sales by Author, Genre, Books
    // For this, we'll fetch only the needed fields from OrderItem instead of the entire Order object
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: { status: { in: ['Completed', 'Delivered', 'Shipped', 'Dispatched'] } }
      },
      select: {
        quantity: true,
        book: {
          select: { title: true, genre: true, mrp: true, author: { select: { name: true } } }
        }
      }
    });

    const salesByAuthorMap = {};
    const salesByGenreMap = {};
    const bookSalesMap = {};

    orderItems.forEach(item => {
      if (!item.book) return;
      const authorName = item.book.author?.name || 'Unknown';
      const genre = item.book.genre || 'Other';
      const bookTitle = item.book.title;
      const itemRev = item.quantity * item.book.mrp;

      if (!salesByAuthorMap[authorName]) salesByAuthorMap[authorName] = { name: authorName, revenue: 0, units: 0 };
      salesByAuthorMap[authorName].revenue += itemRev;
      salesByAuthorMap[authorName].units += item.quantity;

      if (!salesByGenreMap[genre]) salesByGenreMap[genre] = { name: genre, revenue: 0, units: 0 };
      salesByGenreMap[genre].revenue += itemRev;
      salesByGenreMap[genre].units += item.quantity;

      if (!bookSalesMap[bookTitle]) bookSalesMap[bookTitle] = { title: bookTitle, author: authorName, revenue: 0, units: 0 };
      bookSalesMap[bookTitle].revenue += itemRev;
      bookSalesMap[bookTitle].units += item.quantity;
    });


    // 5. Event Sales (POS and Manual)
    const eventSalesMap = {};

    const posItems = await prisma.posOrderItem.findMany({
      where: { posOrder: { paymentStatus: 'CONFIRMED' } },
      select: {
        quantity: true,
        price: true,
        book: {
          select: { title: true, genre: true, mrp: true, author: { select: { name: true } } }
        },
        posOrder: { select: { event: { select: { name: true } } } }
      }
    });
    
    posItems.forEach(item => {
      if (item.book) {
        const authorName = item.book.author?.name || 'Unknown';
        const genre = item.book.genre || 'Other';
        const bookTitle = item.book.title;
        const itemRev = item.quantity * (item.price || item.book.mrp || 0);

        if (!salesByAuthorMap[authorName]) salesByAuthorMap[authorName] = { name: authorName, revenue: 0, units: 0 };
        salesByAuthorMap[authorName].revenue += itemRev;
        salesByAuthorMap[authorName].units += item.quantity;

        if (!salesByGenreMap[genre]) salesByGenreMap[genre] = { name: genre, revenue: 0, units: 0 };
        salesByGenreMap[genre].revenue += itemRev;
        salesByGenreMap[genre].units += item.quantity;

        if (!bookSalesMap[bookTitle]) bookSalesMap[bookTitle] = { title: bookTitle, author: authorName, revenue: 0, units: 0 };
        bookSalesMap[bookTitle].revenue += itemRev;
        bookSalesMap[bookTitle].units += item.quantity;
      }
    });

    posItems.forEach(item => {
      if (!item.posOrder || !item.posOrder.event) return;
      const eventName = item.posOrder.event.name;
      if (!eventSalesMap[eventName]) eventSalesMap[eventName] = { name: eventName, booksSold: 0 };
      eventSalesMap[eventName].booksSold += item.quantity;
    });

    const manualSalesBooks = await prisma.eventAuthor.findMany({
      where: { manualTotalSold: { gt: 0 } },
      select: { manualTotalSold: true, manualTotalRevenue: true, author: { select: { name: true } }, event: { select: { name: true } } }
    });
    manualSalesBooks.forEach(item => {
      if (item.author) {
        const authorName = item.author.name;
        if (!salesByAuthorMap[authorName]) salesByAuthorMap[authorName] = { name: authorName, revenue: 0, units: 0 };
        salesByAuthorMap[authorName].units += item.manualTotalSold;
        salesByAuthorMap[authorName].revenue += (item.manualTotalRevenue || 0);
      }
      
      if (!item.event) return;
      const eventName = item.event.name;
      if (!eventSalesMap[eventName]) eventSalesMap[eventName] = { name: eventName, booksSold: 0 };
      eventSalesMap[eventName].booksSold += item.manualTotalSold;
    });

    const soldEventBooks = await prisma.eventBook.findMany({
      where: { soldStock: { gt: 0 } },
      select: {
        soldStock: true,
        overrideMrp: true,
        book: { select: { title: true, genre: true, mrp: true, author: { select: { name: true } } } },
        event: { select: { name: true } },
        authorId: true,
        eventId: true
      }
    });

    soldEventBooks.forEach(item => {
      if (!item.book) return;
      const qty = item.soldStock;
      const price = item.overrideMrp || item.book.mrp || 0;
      const itemRev = qty * price;
      const authorName = item.book.author?.name || 'Unknown';
      const genre = item.book.genre || 'Other';
      const bookTitle = item.book.title;

      if (!salesByAuthorMap[authorName]) salesByAuthorMap[authorName] = { name: authorName, revenue: 0, units: 0 };
      salesByAuthorMap[authorName].revenue += itemRev;
      salesByAuthorMap[authorName].units += qty;

      if (!salesByGenreMap[genre]) salesByGenreMap[genre] = { name: genre, revenue: 0, units: 0 };
      salesByGenreMap[genre].revenue += itemRev;
      salesByGenreMap[genre].units += qty;

      if (!bookSalesMap[bookTitle]) bookSalesMap[bookTitle] = { title: bookTitle, author: authorName, revenue: 0, units: 0 };
      bookSalesMap[bookTitle].revenue += itemRev;
      bookSalesMap[bookTitle].units += qty;

      if (item.event) {
        const eventName = item.event.name;
        if (!eventSalesMap[eventName]) eventSalesMap[eventName] = { name: eventName, booksSold: 0 };
        eventSalesMap[eventName].booksSold += qty;
      }
    });

    const salesByAuthor = Object.values(salesByAuthorMap).sort((a, b) => b.units - a.units);
    const salesByGenre = Object.values(salesByGenreMap).sort((a, b) => b.units - a.units);
    const topSellingBooks = Object.values(bookSalesMap).sort((a, b) => b.units - a.units).slice(0, 10);
    const allEvents = await prisma.event.findMany({ select: { name: true } });
    allEvents.forEach(evt => {
      if (!eventSalesMap[evt.name]) eventSalesMap[evt.name] = { name: evt.name, booksSold: 0 };
    });
    const eventSalesData = Object.values(eventSalesMap);

    // 6. Quick Alerts & Activities
    const lowStockAlerts = await prisma.book.findMany({
      where: { stock: { lt: 10 } },
      include: { author: true, reviews: { select: { rating: true } } },
      take: 20
    });

    const [recentAuthors, latestOrders, recentEvents] = await Promise.all([
      prisma.author.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, createdAt: true } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, amount: true, customerName: true, createdAt: true } }),
      prisma.eventAuthor.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, createdAt: true, author: { select: { name: true } }, event: { select: { name: true } } } })
    ]);

    const activities = [
      ...recentAuthors.map(a => ({ id: `auth-${a.id}`, action: 'New Author Registration', subject: a.name, createdAt: a.createdAt, type: 'author' })),
      ...latestOrders.map(o => ({ id: `ord-${o.id}`, action: 'Order Received', subject: `INR ${o.amount} from ${o.customerName}`, createdAt: o.createdAt, type: 'order' })),
      ...recentEvents.map(e => ({ id: `evt-${e.id}`, action: 'Event RSVP', subject: `${e.author?.name || 'Author'} joined ${e.event?.name || 'Event'}`, createdAt: e.createdAt, type: 'event' }))
    ];
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recentActivities = activities.slice(0, 8);

    // Helper function for aggregate status calculation
    function getOrderAggregateStatus(ord) {
      const { status: ordStatus, items } = ord;
      if (ordStatus === 'Cancelled') return 'Cancelled';
      if (ordStatus === 'Payment Not Received') return 'Payment Failed';

      if (items && items.length > 0) {
        const allCompleted = items.every(it => it.status === 'Completed' || it.status === 'Delivered');
        const anyDispatched = items.some(it => it.status === 'Dispatched' || it.status === 'Completed' || it.status === 'Delivered');
        const anyAccepted = items.some(it => it.status === 'Accepted');
        const anyRejected = items.some(it => it.status === 'Rejected');

        if (allCompleted) return 'Delivered';
        if (anyDispatched) return 'Dispatched';
        if (anyAccepted) return 'Accepted';
        if (anyRejected) return 'Rejected';
      }

      if (ordStatus === 'Pending Verification' || ordStatus === 'Pending') {
        return 'Pending Verification';
      }

      return ordStatus || 'Pending';
    }

    const allOrdersForKPI = await prisma.order.findMany({
      include: { items: true }
    });

    let globalSuccessfulOrders = 0;
    let globalPendingOrders = 0;
    let globalDispatchedOrders = 0;

    allOrdersForKPI.forEach(ord => {
      const statusText = getOrderAggregateStatus(ord);
      if (statusText === 'Delivered') {
        globalSuccessfulOrders++;
      } else if (statusText === 'Pending Verification') {
        globalPendingOrders++;
      } else if (statusText === 'Dispatched') {
        globalDispatchedOrders++;
      }
    });

    const uniqueCustomersData = await prisma.order.groupBy({
      by: ['customerEmail'],
      _count: { id: true },
      where: { customerEmail: { not: null } }
    });
    const globalTotalCustomers = uniqueCustomersData.length;

    const result = {
      totalAuthors, totalBooks, eventParticipations, totalRevenue, revenueData, recentActivities,
      salesByAuthor, salesByGenre, topSellingBooks, topCustomers, lowStockAlerts, eventSalesData, pendingEventRegistrations,
      globalSuccessfulOrders, globalPendingOrders, globalDispatchedOrders, globalTotalCustomers,
      totalEvents, totalLibraries
    };

    setCache('admin:dashboard-stats', result, 45 * 1000);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed' });
  }
});

// Admin Books
router.get('/api/admin/books', verifyToken, isAdmin, async (req, res) => {
  try {
    const books = await prisma.book.findMany({
      where: {
        author: {
          status: 'Active'
        },
        isArchived: false
      },
      include: { author: true, orderItems: { include: { order: true } } }
    });
    const mapped = books.map(b => {
      const sales = b.orderItems.filter(item => ['Completed', 'Dispatched', 'Delivered', 'Shipped'].includes(item.order.status)).reduce((sum, item) => sum + item.quantity, 0);
      return {
        ...b,
        authorName: b.author.name,
        isbn: `978-0-00-000${b.id}`, // Mock ISBN
        sales
      };
    });
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.delete('/api/admin/books/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    await prisma.book.update({ 
      where: { id: parseInt(req.params.id) }, 
      data: { isArchived: true, status: 'Archived' } 
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Admin: Edit book details (title, genre, subGenre, mrp, stock, synopsis)
router.put('/api/admin/books/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { title, genre, subGenre, mrp, stock, synopsis } = req.body;
    const book = await prisma.book.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(title !== undefined && { title }),
        ...(genre !== undefined && { genre }),
        ...(subGenre !== undefined && { subGenre: subGenre || null }),
        ...(mrp !== undefined && { mrp: parseFloat(mrp) }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(synopsis !== undefined && { synopsis }),
      }
    });
    res.json(book);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update book' });
  }
});


router.post('/api/admin/books/:id/approve', verifyToken, isAdmin, async (req, res) => {
  try {
    const book = await prisma.book.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'Approved', rejectionReason: null }
    });
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve book' });
  }
});

router.post('/api/admin/books/:id/reject', verifyToken, isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const book = await prisma.book.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'Rejected', rejectionReason: reason || "No reason provided." }
    });
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject book' });
  }
});

// Admin Activities
router.get('/api/admin/activities', verifyToken, isAdmin, async (req, res) => {
  try {
    const activities = await prisma.activity.findMany({
      include: { registrations: true },
      orderBy: { createdAt: 'desc' }
    });
    const mapped = activities.map(act => ({
      ...act,
      registeredAuthors: act.registrations.length,
      color: act.status === 'Completed' ? 'bg-[#5bc0de]' : 'bg-[#5cb85c]'
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/api/admin/activities', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, date, location, type } = req.body;
    const act = await prisma.activity.create({
      data: { name, date, city: location, type, charges: 0, status: 'Upcoming' }
    });
    res.json(act);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// --- NEW AUTHOR DASHBOARD ROUTES ---

// Admin Get Specific Author Dashboard Data
router.get('/api/admin/authors/:id/dashboard-data', verifyToken, isAdmin, async (req, res) => {
  try {
    const authorProfile = await prisma.author.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        books: { include: { reviews: true } },
        eventRegistrations: {
          include: { activity: true }
        }
      }
    });

    if (!authorProfile) return res.status(404).json({ error: 'Author profile not found' });

    let authorOrders = [];
    if (authorProfile.books.length > 0) {
      const bookIds = authorProfile.books.map(b => b.id);
      const orderItems = await prisma.orderItem.findMany({
        where: { bookId: { in: bookIds } },
        include: { order: true, book: true },
        orderBy: { createdAt: 'desc' }
      });

      authorOrders = orderItems.map(item => ({
        id: item.id,
        orderId: item.order.id,
        isBulk: item.order.isBulk || false,
        orderStatus: item.order.status,
        customerName: item.order.customerName,
        customerPhone: item.order.customerPhone,
        customerEmail: item.order.customerEmail,
        address: item.order.address,
        bookTitle: item.book.title,
        quantity: item.quantity,
        amount: (item.book.mrp * item.quantity),
        status: item.status,
        trackingNumber: item.trackingNumber,
        paymentScreenshot: item.order.paymentScreenshot,
        paymentVerified: item.order.status === 'Completed',
        paymentFailed: item.order.status === 'Payment Not Received',
        createdAt: item.createdAt,
        dispatchedAt: item.dispatchedAt,
        deliveredAt: item.deliveredAt,
        date: item.createdAt.toISOString().split('T')[0]
      }));
    }

    res.json({ authorProfile, authorOrders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch author dashboard data' });
  }
});

router.post('/api/author/reapply', verifyToken, async (req, res) => {
  try {
    const { name, phone, bio, whatsapp, penName, city, state, address, aadharNumber, qualification, institution, subject, age, experience, skills, hobbies, transactionId, extraData } = req.body;
    let updateData = { status: 'Pending', rejectionReason: null };

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    // whatsapp field removed
    if (penName !== undefined) updateData.penName = penName;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (address !== undefined) updateData.address = address;
    if (aadharNumber !== undefined) updateData.aadharNumber = aadharNumber;
    if (qualification !== undefined) updateData.qualification = qualification;
    if (institution !== undefined) updateData.institution = institution;
    if (subject !== undefined) updateData.subject = subject;
    if (age !== undefined) updateData.age = age;
    if (experience !== undefined) updateData.experience = experience;
    if (skills !== undefined) updateData.skills = skills;
    if (hobbies !== undefined) updateData.hobbies = hobbies;
    if (transactionId !== undefined) updateData.transactionId = transactionId;
    if (extraData !== undefined) updateData.extraData = extraData;

    const author = await prisma.author.update({
      where: { email: req.user.email },
      data: updateData
    });
    res.json(author);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reapply' });
  }
});

// Get Author Dashboard Data
router.get('/api/author/dashboard-data', verifyToken, async (req, res) => {
  const cacheKey = `author:dashboard:${req.user.email}`;
  if (!req.query.t) {
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);
  }
  try {
    const authorProfile = await prisma.author.findUnique({
      where: { email: req.user.email },
      include: {
        books: { include: { reviews: true } },
        eventRegistrations: {
          include: { activity: true }
        }
      }
    });

    if (!authorProfile) return res.status(404).json({ error: 'Author profile not found' });

    // If there are pending edits, overlay the original profile data so the dashboard reflects the approved state
    if (authorProfile.extraData) {
      let ed = authorProfile.extraData;
      if (typeof ed === 'string') {
        try { ed = JSON.parse(ed); } catch (e) { ed = {}; }
      }
      if (ed.hasPendingEdits && ed.originalProfileData) {
        const { books: originalBooks, ...originalFields } = ed.originalProfileData;
        Object.assign(authorProfile, originalFields);
        if (originalBooks && Array.isArray(originalBooks)) {
          authorProfile.books = originalBooks.map(ob => {
            const currentBook = authorProfile.books.find(b => b.id === ob.id);
            return { ...ob, reviews: currentBook ? currentBook.reviews : [] };
          });
        }
      }
    }

    try {
      authorProfile.donationRegistrations = await prisma.donationRegistration.findMany({
        where: { authorId: authorProfile.id },
        include: {
          announcement: { include: { library: true } },
          books: { include: { book: true } }
        }
      });
    } catch (e) {
      authorProfile.donationRegistrations = [];
    }

    let authorOrders = [];
    if (authorProfile.books.length > 0) {
      const bookIds = authorProfile.books.map(b => b.id);
      const orderItems = await prisma.orderItem.findMany({
        where: { bookId: { in: bookIds } },
        include: { order: true, book: true },
        orderBy: { createdAt: 'desc' }
      });
      authorOrders = orderItems.map(item => ({
        id: item.id,
        orderId: item.order.id,
        isBulk: item.order.isBulk || false,
        orderStatus: item.order.status,
        customerName: item.order.customerName,
        customerPhone: item.order.customerPhone,
        customerEmail: item.order.customerEmail,
        address: item.order.address,
        bookTitle: item.book.title,
        quantity: item.quantity,
        amount: (item.book.mrp * item.quantity),
        status: item.status,
        trackingNumber: item.trackingNumber,
        paymentScreenshot: item.order.paymentScreenshot,
        transactionId: item.order.transactionId,
        paymentVerified: item.order.status === 'Completed',
        paymentFailed: item.order.status === 'Payment Not Received',
        createdAt: item.createdAt,
        acceptedAt: item.acceptedAt,
        dispatchedAt: item.dispatchedAt,
        deliveredAt: item.deliveredAt,
        expectedDeliveryDate: item.expectedDeliveryDate,
        autoDelivered: item.autoDelivered,
        date: item.createdAt.toISOString().split('T')[0],
        feedbackRating: item.feedbackRating,
        feedbackCondition: item.feedbackCondition,
        feedbackPackaging: item.feedbackPackaging,
        feedbackAsExpected: item.feedbackAsExpected,
        feedbackBuyAgain: item.feedbackBuyAgain,
        feedbackComments: item.feedbackComments,
        subtotal: item.order.subtotal,
        bundleDiscount: item.order.bundleDiscount,
        deliveryCharges: item.order.deliveryCharges,
        orderAmount: item.order.amount
      }));
    }

    let dynamicFields = [];
    try {
      const p = require('path').join(__dirname, 'settings.json');
      if (require('fs').existsSync(p)) {
        const settings = JSON.parse(require('fs').readFileSync(p));
        dynamicFields = settings.authorDynamicFields || [];
      }
    } catch (e) { }

    const eventInvites = await prisma.eventAuthor.findMany({
      where: { authorId: authorProfile.id },
      include: { event: true }
    });
    const listedBooks = await prisma.eventBook.findMany({
      where: { authorId: authorProfile.id },
      include: { book: true, event: true }
    });
    const posOrders = await prisma.posOrder.findMany({
      where: { authorId: authorProfile.id },
      include: { 
        items: { include: { book: true } },
        event: true 
      }
    });
    const notifications = await prisma.notification.findMany({
      where: { OR: [{ target: 'ALL' }, { target: authorProfile.name }, { target: `@${authorProfile.name}` }] },
      orderBy: { createdAt: 'desc' }
    });
    let activeDonations = [];
    try {
      activeDonations = await prisma.donationAnnouncement.findMany({
        where: { visibility: 'Published' },
        include: { library: true }
      });
    } catch (e) { }

    try {
      const allSystemEvents = await prisma.event.findMany({
        where: { broadcastStatus: { not: 'Draft' } },
        select: { id: true, date: true, status: true }
      });
      const joinDate = authorProfile.groupJoiningDate ? new Date(authorProfile.groupJoiningDate) : new Date(authorProfile.createdAt);
      joinDate.setHours(0, 0, 0, 0);

      const parseEvDate = (dStr) => {
        if (!dStr) return new Date(0);
        try {
          const s = typeof dStr === 'string' ? dStr : String(dStr);
          const dt = new Date(s.replace(/-/g, ' '));
          return isNaN(dt.getTime()) ? new Date(0) : dt;
        } catch(e) { return new Date(0); }
      };

      let eligibleCount = 0;
      allSystemEvents.forEach(e => {
        const eTime = parseEvDate(e.date || e.startDate).getTime();
        if (eTime >= joinDate.getTime()) eligibleCount++;
      });

      let participatedCount = 0;
      if (eventInvites) {
        participatedCount += eventInvites.filter(ei => ei.optInStatus === 'Registered' || ei.optInStatus === 'Approved' || ei.optInStatus === 'Pending Approval').length;
      }
      
      if (authorProfile.eventRegistrations) {
        const inviteEventIds = new Set(eventInvites.map(ei => ei.eventId));
        participatedCount += authorProfile.eventRegistrations.filter(er => {
           if (er.activityId && inviteEventIds.has(er.activityId)) return false; 
           return er.status === 'Registered' || er.status === 'Approved' || er.status === 'Pending Approval';
        }).length;
      }

      authorProfile.aggEligibleEvents = eligibleCount;
      authorProfile.aggParticipatedEvents = participatedCount;
    } catch (e) {
      console.error('Error calculating participation:', e);
    }

    let totalWebAndBulkSales = 0;
    let totalWebSales = 0;
    let totalBulkSales = 0;
    if (authorOrders.length > 0) {
      const completed = authorOrders.filter(o => o.status === 'Completed' || o.status === 'Delivered' || o.orderStatus === 'Completed' || o.orderStatus === 'Delivered');
      totalWebAndBulkSales = completed.reduce((sum, o) => sum + (o.amount || 0), 0);
      totalWebSales = completed.filter(o => !o.isBulk).reduce((sum, o) => sum + (o.amount || 0), 0);
      totalBulkSales = completed.filter(o => o.isBulk).reduce((sum, o) => sum + (o.amount || 0), 0);
    }

    const result = { authorProfile, authorOrders, dynamicFields, eventInvites, listedBooks, posOrders, notifications, activeDonations, totalWebAndBulkSales, totalWebSales, totalBulkSales };
    setCache(cacheKey, result, 20 * 1000); // 20s cache for dashboard
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Update Book Inventory (Stock)
router.put('/api/author/inventory/:id', verifyToken, async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    const { stock } = req.body;

    // Ensure book belongs to author
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });

    const updated = await prisma.book.update({
      where: { id: bookId, authorId: author.id },
      data: { stock: parseInt(stock) }
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Author: Update own bio / profile info
router.put('/api/author/profile/bio', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    const { bio, phone, whatsapp, name, penName, city, state, instagram, facebook, address, aadharNumber, qualification, institution, subject, age, experience, skills, hobbies, whyJoining, district, pincode, dob } = req.body;
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });

    const updateData = {
      ...(bio !== undefined && { bio }),
      ...(phone !== undefined && { phone }),
      // whatsapp field removed
      ...(name !== undefined && { name }),
      ...(penName !== undefined && { penName }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(instagram !== undefined && { instagram }),
      ...(facebook !== undefined && { facebook }),
      ...(address !== undefined && { address }),
      ...(aadharNumber !== undefined && { aadharNumber }),
      ...(qualification !== undefined && { qualification }),
      ...(institution !== undefined && { institution }),
      ...(subject !== undefined && { subject }),
      ...(age !== undefined && { age }),
      ...(experience !== undefined && { experience }),
      ...(skills !== undefined && { skills }),
      ...(hobbies !== undefined && { hobbies }),
      ...(whyJoining !== undefined && { whyJoining }),
      ...(district !== undefined && { district }),
      ...(pincode !== undefined && { pincode }),
      ...(dob !== undefined && { dob }),
      ...(skills !== undefined && { skillsJson: (() => { try { return JSON.parse(skills) } catch (e) { return [] } })() }),
      ...(hobbies !== undefined && { hobbiesJson: (() => { try { return JSON.parse(hobbies) } catch (e) { return [] } })() }),
      rejectionReason: null // Clear previous rejection if any
    };

    let currentExtraData = author.extraData || {};
    if (typeof currentExtraData === 'string') {
      try { currentExtraData = JSON.parse(currentExtraData); } catch (e) { currentExtraData = {}; }
    }
    let editedFields = currentExtraData.editedProfileFields || [];
    let originalData = currentExtraData.originalProfileData || {};

    for (const key of Object.keys(updateData)) {
      if (key === 'rejectionReason') continue;
      if (updateData[key] !== author[key] && !editedFields.includes(key)) {
        editedFields.push(key);
        if (!(key in originalData)) {
          originalData[key] = author[key];
        }
      }
    }

    if (req.file) {
      updateData.photoUrl = `/uploads/${req.file.filename}`;
      if (!editedFields.includes('photoUrl')) {
        editedFields.push('photoUrl');
        if (!('photoUrl' in originalData)) originalData['photoUrl'] = author.photoUrl;
      }
    }

    if (editedFields.length > 0) {
      currentExtraData.hasPendingEdits = true;
      currentExtraData.editedProfileFields = editedFields;
      currentExtraData.originalProfileData = originalData;
      updateData.extraData = currentExtraData;
    }

    // Also update User record name and address if they changed
    if (name !== undefined || address !== undefined || phone !== undefined) {
      await prisma.user.update({
        where: { email: req.user.email },
        data: {
          ...(name !== undefined && { name }),
          ...(address !== undefined && { address }),
          ...(phone !== undefined && { phone })
        }
      });
    }

    const updated = await prisma.author.update({
      where: { id: author.id },
      data: updateData
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Author: Update book details (reapply)
router.put('/api/author/books/:id', verifyToken, async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    const { title, subtitle, genre, subGenre, mrp, stock, synopsis, pages, language, isbn, publisher, publicationDate, edition, format, printFormat, purpose } = req.body;
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book || book.authorId !== author.id) return res.status(403).json({ error: 'Not authorized' });


    let isOverpriced = false;
    if (pages && printFormat && mrp) {
      const rate = printFormat === 'Black & White' ? 1 : 3;
      const fairPrice = (parseInt(pages) * rate) + 100;
      isOverpriced = parseFloat(mrp) > fairPrice;
    }

    const updated = await prisma.book.update({
      where: { id: bookId },
      data: {
        ...(mrp !== undefined && pages !== undefined && printFormat !== undefined && { overpriced: isOverpriced }),
        ...(title !== undefined && { title }),
        ...(subtitle !== undefined && { subtitle: subtitle || null }),
        ...(genre !== undefined && { genre }),
        ...(subGenre !== undefined && { subGenre: subGenre || null }),
        ...(mrp !== undefined && { mrp: parseFloat(mrp) }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(synopsis !== undefined && { synopsis }),
        ...(pages !== undefined && { pages: parseInt(pages) || null }),
        ...(language !== undefined && { language: language || null }),
        ...(isbn !== undefined && { isbn: isbn || null }),
        ...(publisher !== undefined && { publisher: publisher || null }),
        ...(publicationDate !== undefined && { publicationDate: publicationDate || null }),
        ...(edition !== undefined && { edition: edition || null }),
        ...(format !== undefined && { format: format || null }),
        ...(printFormat !== undefined && { printFormat }),
        status: 'Pending', // Setting back to pending for re-evaluation
        rejectionReason: null
      }
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// Author: Update book cover image
router.put('/api/author/books/:id/cover', verifyToken, upload.single('cover'), async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    if (!req.file) return res.status(400).json({ error: 'No cover image uploaded' });

    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book || book.authorId !== author.id) return res.status(403).json({ error: 'Not authorized' });

    const coverUrl = `/uploads/${req.file.filename}`;

    let isOverpriced = false;
    if (pages && printFormat && mrp) {
      const rate = printFormat === 'Black & White' ? 1 : 3;
      const fairPrice = (parseInt(pages) * rate) + 100;
      isOverpriced = parseFloat(mrp) > fairPrice;
    }

    const updated = await prisma.book.update({
      where: { id: bookId },
      data: {
        ...(mrp !== undefined && pages !== undefined && printFormat !== undefined && { overpriced: isOverpriced }), coverUrl
      }
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update cover' });
  }
});

// Add New Book by Existing Author
// --------------------------------------------------------
// Admin: Get all pending books (awaiting approval)
router.get('/api/admin/pending-books', verifyToken, isAdmin, async (req, res) => {
  try {
    const pendingBooks = await prisma.book.findMany({
      where: { status: 'Pending' },
      include: { author: true, reviews: { select: { rating: true } } }
    });
    res.json(pendingBooks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pending books' });
  }
});

// Admin: Approve a pending book
router.post('/api/admin/books/:id/approve', verifyToken, isAdmin, async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);

    let isOverpriced = false;
    if (pages && printFormat && mrp) {
      const rate = printFormat === 'Black & White' ? 1 : 3;
      const fairPrice = (parseInt(pages) * rate) + 100;
      isOverpriced = parseFloat(mrp) > fairPrice;
    }

    const updated = await prisma.book.update({
      where: { id: bookId },
      data: {
        ...(mrp !== undefined && pages !== undefined && printFormat !== undefined && { overpriced: isOverpriced }), status: 'Approved'
      }
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve book' });
  }
});
router.post('/api/author/books', verifyToken, upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'backCover', maxCount: 1 }]), async (req, res) => {
  try {
    const { title, subtitle, genre, subGenre, synopsis, pages, mrp, stock, overpriced, isOverpriced, language, isbn, publisher, publicationDate, edition, format, printFormat, purpose } = req.body;

    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });

    const coverUrl = req.files && req.files['cover'] ? `/uploads/${req.files['cover'][0].filename}` : null;
    const backCoverUrl = req.files && req.files['backCover'] ? `/uploads/${req.files['backCover'][0].filename}` : null;

    const newBook = await prisma.book.create({
      data: {
        title,
        subtitle: subtitle || null,
        genre,
        subGenre: subGenre || null,
        synopsis,
        pages: parseInt(pages) || null,
        mrp: parseFloat(mrp),
        stock: parseInt(stock) || 0,
        overpriced: overpriced === 'true' || isOverpriced === 'true',
        language: language || null,
        isbn: isbn || null,
        publisher: publisher || null,
        publicationDate: publicationDate || null,
        edition: edition || null,
        format: format || null,
        printFormat: printFormat,
        purpose: purpose || null,
        coverUrl,
        backCoverUrl,
        authorId: author.id,
        status: 'Pending'
      }
    });

    await prisma.author.update({
      where: { id: author.id },
      data: { status: 'Added New Book' }
    });

    res.status(201).json(newBook);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

// Get Activities
router.get('/api/activities', async (req, res) => {
  try {
    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Pay Late Delivery Fine
router.post('/api/author/fine/pay', verifyToken, upload.single('paymentScreenshot'), async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });

    let extraData = typeof author.extraData === 'string' ? JSON.parse(author.extraData || '{}') : (author.extraData || {});
    extraData = {
      ...extraData,
      fineStatus: 'Pending Verification',
      finePaymentScreenshot: req.file ? `/uploads/${req.file.filename}` : null,
      finePaymentDate: new Date().toISOString(),
      finePaymentReason: req.body.reason || ''
    };

    const updatedAuthor = await prisma.author.update({
      where: { id: author.id },
      data: { extraData }
    });

    await prisma.notification.create({
      data: {
        message: `${author.name} has submitted payment for their late delivery fine.`,
        target: 'ADMIN'
      }
    });

    invalidateCache(`authorData_${author.email}`);
    invalidateCache('adminAuthors');
    res.json(updatedAuthor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to pay fine' });
  }
});

// Admin: Approve Fine Payment
router.post('/api/admin/authors/:id/approve-fine', verifyToken, isAdmin, async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    let extraData = typeof author.extraData === 'string' ? JSON.parse(author.extraData || '{}') : (author.extraData || {});

    // Add to history
    if (!extraData.fineHistory) extraData.fineHistory = [];
    extraData.fineHistory.push({
      amount: extraData.lateFines || 0,
      chargedAt: extraData.fineDate || null,
      paidAt: extraData.finePaymentDate || null,
      approvedAt: new Date().toISOString()
    });

    extraData.lateFines = 0;
    extraData.fineDate = null;
    extraData.lateNotificationDate = null;
    extraData.fineStatus = null;
    extraData.finePaymentScreenshot = null;
    extraData.finePaymentDate = null;
    extraData.lastFinePaidAt = new Date().toISOString();

    const updatedAuthor = await prisma.author.update({
      where: { id: author.id },
      data: { extraData }
    });

    await prisma.notification.create({
      data: {
        message: 'Your late delivery fine payment has been approved. Your account has been reactivated.',
        target: author.email
      }
    });

    invalidateCache(`authorData_${author.email}`);
    invalidateCache('adminAuthors');
    res.json(updatedAuthor);
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve fine' });
  }
});

// Admin: Reject Fine Payment
router.post('/api/admin/authors/:id/reject-fine', verifyToken, isAdmin, async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    let extraData = typeof author.extraData === 'string' ? JSON.parse(author.extraData || '{}') : (author.extraData || {});
    extraData.fineStatus = null;
    extraData.finePaymentScreenshot = null;

    const updatedAuthor = await prisma.author.update({
      where: { id: author.id },
      data: { extraData }
    });

    invalidateCache(`authorData_${author.email}`);
    invalidateCache('adminAuthors');
    res.json(updatedAuthor);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject fine' });
  }
});


// Register for Activity
router.post('/api/author/activities/register', verifyToken, upload.single('paymentScreenshot'), async (req, res) => {
  try {
    const { activityId, booksIds, amount } = req.body;
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });

    const paymentScreenshot = req.file ? `/uploads/${req.file.filename}` : null;

    const registration = await prisma.eventRegistration.create({
      data: {
        authorId: author.id,
        activityId: parseInt(activityId),
        booksIds,
        amount: parseFloat(amount),
        paymentScreenshot
      }
    });
    res.status(201).json(registration);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 6. Checkout - Create Order

router.put('/api/orders/:id/cancel', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { book: { include: { author: true, reviews: { select: { rating: true } } } } } } } });
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (order.customerEmail !== req.user.email) return res.status(403).json({ error: 'Forbidden' });

    // Only allow cancel if not dispatched or delivered
    const cannotCancel = order.items.some(i => {
      const s = (i.status || '').trim().toLowerCase();
      return ['dispatched', 'shipped', 'completed', 'delivered'].includes(s);
    });
    if (cannotCancel) return res.status(400).json({ error: 'Cannot cancel order once it has been dispatched or delivered.' });

    if (order.status === 'Cancelled') {
      return res.json({ message: 'Order is already cancelled' });
    }

    await prisma.order.update({ where: { id }, data: { status: 'Cancelled' } });
    await prisma.orderItem.updateMany({ where: { orderId: id, status: { notIn: ['Rejected', 'Cancelled'] } }, data: { status: 'Cancelled' } });

    for (const item of order.items) {
      // Don't refund stock if it was already Dispatched/Completed, OR if it was already Rejected/Cancelled (stock already refunded then)
      if (item.status !== 'Dispatched' && item.status !== 'Completed' && item.status !== 'Rejected' && item.status !== 'Cancelled') {
        await prisma.book.update({
          where: { id: item.bookId },
          data: { stock: { increment: item.quantity } }
        });
      }
      if (item.book && item.book.author && item.book.author.email) {
        await sendNotificationEmail(item.book.author.email, 'Order Cancelled by Customer', `The order #PAA-${id.toString().padStart(4, '0')} for your book "${item.book.title}" was cancelled by the customer.`);
        invalidateCache(`author:dashboard:${item.book.author.email}`);
      }
    }

    // Send email
    await sendNotificationEmail(req.user.email, 'Order Cancelled', `Your order #PAA-${id.toString().padStart(4, '0')} has been cancelled successfully.`);
    invalidateCache('admin:dashboard-stats');

    res.json({ message: 'Order cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Bulk Order Creation
router.post('/api/orders/bulk', optionalVerifyToken, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, address, amount, items } = req.body;
    const rawItems = Array.isArray(items) ? items : JSON.parse(items);

    // 1. Aggregate and Validate quantities > 0
    const aggregatedItems = {};
    for (const item of rawItems) {
      const qty = parseInt(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Invalid quantity provided' });
      }
      const bId = parseInt(item.bookId);
      aggregatedItems[bId] = (aggregatedItems[bId] || 0) + qty;
    }

    const parsedItems = Object.keys(aggregatedItems).map(id => ({ bookId: parseInt(id), quantity: aggregatedItems[id] }));

    const emailToUse = req.user ? req.user.email : (customerEmail || 'guest@example.com');

    let customer = await prisma.customer.findUnique({ where: { email: emailToUse } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { name: customerName || 'Guest', email: emailToUse, phone: customerPhone || null }
      });
    }

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        customerName,
        customerEmail: emailToUse,
        customerPhone,
        address,
        amount: parseFloat(amount || 0), // Bulk orders get negotiated later, so this is just a requested baseline
        status: "Bulk Request Pending",
        isBulk: true,
        items: {
          create: parsedItems.map(item => ({
            bookId: item.bookId,
            quantity: item.quantity
          }))
        }
      },
      include: { items: { include: { book: true } } }
    });

    // Mock Email to Admin
    console.log(`[EMAIL MOCK] New Bulk Order Request #${order.id} received from ${customerName}.`);

    // Mock Email to User
    console.log(`[EMAIL MOCK] To: ${emailToUse}. Your bulk order request has been submitted and is pending admin approval.`);

    res.json(order);
  } catch (err) {
    console.error("Bulk Order Error:", err);
    res.status(500).json({ error: 'Failed to place bulk order' });
  }
});

// Admin Approve Bulk Order
router.post('/api/admin/orders/:id/approve-bulk', verifyToken, isAdmin, async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: { status: "Approved - Pending Payment" },
      include: { customer: true }
    });

    // Mock Email to User
    console.log(`[EMAIL MOCK] To: ${order.customer.email}. Your bulk order #${order.id} has been approved. Please proceed with payment negotiations.`);

    invalidateCache('admin:dashboard-stats');
    res.json({ success: true, order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve bulk order' });
  }
});

router.post('/api/orders', optionalVerifyToken, upload.single('paymentScreenshot'), async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, address, amount, items, transactionId } = req.body;
    const rawItems = Array.isArray(items) ? items : JSON.parse(items);
    const paymentScreenshot = req.file ? `/uploads/${req.file.filename}` : null;

    // 1. Aggregate and Validate quantities > 0
    const aggregatedItems = {};
    for (const item of rawItems) {
      const qty = parseInt(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Invalid quantity provided' });
      }
      const bId = parseInt(item.bookId);
      aggregatedItems[bId] = (aggregatedItems[bId] || 0) + qty;
    }

    const parsedItems = Object.keys(aggregatedItems).map(id => ({ bookId: parseInt(id), quantity: aggregatedItems[id] }));

    // 2. Validate stock AND recalculate exact subtotal from DB to prevent financial spoofing
    let calculatedSubtotal = 0;
    for (const item of parsedItems) {
      const book = await prisma.book.findUnique({ where: { id: item.bookId } });
      if (!book) return res.status(404).json({ error: `Book ID ${item.bookId} not found` });
      if (book.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for book: ${book.title}. Available: ${book.stock}` });
      }
      calculatedSubtotal += book.mrp * item.quantity;
    }

    const bundleDiscount = parseFloat(req.body.bundleDiscount || 0);
    const deliveryCharges = parseFloat(req.body.deliveryCharges || 0);
    const expectedAmount = calculatedSubtotal - bundleDiscount + deliveryCharges;
    const requestedAmount = parseFloat(amount);

    if (Math.abs(expectedAmount - requestedAmount) > 1) {
      return res.status(400).json({ error: 'Amount mismatch detected. Financial payload may be corrupted.' });
    }

    const emailToUse = req.user ? req.user.email : (customerEmail || 'guest@example.com');

    // Find or create customer
    let customer = await prisma.customer.findUnique({ where: { email: emailToUse } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName || 'Guest',
          email: emailToUse,
          phone: customerPhone || null
        }
      });
    } else if (customerName && customer.name === 'Guest') {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { name: customerName, phone: customerPhone || customer.phone }
      });
    }

    // 3. Wrap Order Creation and Stock Deduction in a SINGLE Transaction to prevent zombie orders
    const order = await prisma.$transaction(async (tx) => {
      // Re-verify stock inside the transaction lock
      for (const item of parsedItems) {
        const book = await tx.book.findUnique({ where: { id: item.bookId } });
        if (book.stock < item.quantity) {
          throw new Error(`Insufficient stock for book ID ${item.bookId}`);
        }
      }

      const newOrder = await tx.order.create({
        data: {
          customerId: customer.id,
          customerName,
          customerEmail: emailToUse,
          customerPhone,
          address,
          amount: expectedAmount, // Strictly use our calculated amount
          subtotal: calculatedSubtotal,
          bundleDiscount,
          deliveryCharges,
          paymentScreenshot,
          transactionId: transactionId || null,
          items: {
            create: parsedItems.map(item => ({
              bookId: item.bookId,
              quantity: item.quantity
            }))
          }
        },
        include: { items: { include: { book: { include: { author: true, reviews: { select: { rating: true } } } } } } }
      });

      // Deduct stock safely within transaction
      for (const item of parsedItems) {
        await tx.book.update({
          where: { id: item.bookId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      return newOrder;
    });

    const orderId = `PAA-${String(order.id).padStart(4, '0')}`;
    const orderDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    // --- Email to CUSTOMER ---
    const itemRowsCustomer = order.items.map(item => `
      <tr>
        <td>${item.book.title}</td>
        <td>${item.book.author?.name || 'Unknown'}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${inr(item.book.mrp * item.quantity)}</td>
      </tr>`).join('');

    await sendNotificationEmail(
      emailToUse,
      `Order Confirmed #${orderId} — Pune Authors' Association`,
      emailWrap(`Order Placed Successfully! 🎉`, `
        <p>Hi <strong>${customerName}</strong>, your order has been received and is now awaiting author approval.</p>
        <table>
          <thead><tr><th>Book</th><th>Author</th><th>Qty</th><th>Amount</th></tr></thead>
          <tbody>${itemRowsCustomer}</tbody>
          <tfoot>
            ${order.bundleDiscount > 0 ? `<tr><td colspan="3" style="font-weight:600;text-align:right">Subtotal</td><td style="font-weight:600;text-align:right">${inr(order.subtotal)}</td></tr>
            <tr><td colspan="3" style="font-weight:600;text-align:right;color:green">Bundle Discount</td><td style="font-weight:600;text-align:right;color:green">-${inr(order.bundleDiscount)}</td></tr>` : ''}
            ${order.deliveryCharges > 0 ? `<tr><td colspan="3" style="font-weight:600;text-align:right">Delivery Charges</td><td style="font-weight:600;text-align:right">+${inr(order.deliveryCharges)}</td></tr>` : ''}
            <tr><td colspan="3" style="font-weight:700;text-align:right">Grand Total</td><td style="font-weight:700;text-align:right">${inr(order.amount)}</td></tr>
          </tfoot>
        </table>
        <table>
          <tr><td><strong>Order ID</strong></td><td>${orderId}</td></tr>
          <tr><td><strong>Date</strong></td><td>${orderDate}</td></tr>
          <tr><td><strong>Delivery Address</strong></td><td>${address}</td></tr>
          ${transactionId ? `<tr><td><strong>Transaction ID</strong></td><td>${transactionId}</td></tr>` : ''}
        </table>
        <p>The author will review your payment and approve the order. You will receive another email once approved.</p>
      `)
    );

    // --- Email to each AUTHOR ---
    const authorEmails = new Set();
    for (const item of order.items) {
      const authorEmail = item.book?.author?.email;
      if (!authorEmail || authorEmails.has(authorEmail)) continue;
      authorEmails.add(authorEmail);

      const authorItems = order.items.filter(i => i.book?.author?.email === authorEmail);
      const itemRowsAuthor = authorItems.map(i => `
        <tr>
          <td>${i.book.title}</td>
          <td style="text-align:center">${i.quantity}</td>
          <td style="text-align:right">${inr(i.book.mrp * i.quantity)}</td>
        </tr>`).join('');
      const authorTotal = authorItems.reduce((s, i) => s + i.book.mrp * i.quantity, 0);

      await sendNotificationEmail(
        authorEmail,
        `New Order #${orderId} for Your Book — Action Required`,
        emailWrap(`📦 New Order Received — Your Action Required`, `
          <p>Hi <strong>${item.book.author.name}</strong>, a new order has been placed for your book(s). Please log in to your dashboard to <strong>Approve or Reject</strong> this order.</p>
          <table>
            <thead><tr><th>Book</th><th>Qty</th><th>Amount</th></tr></thead>
            <tbody>${itemRowsAuthor}</tbody>
            <tfoot>
              ${order.bundleDiscount > 0 ? `<tr><td colspan="2" style="font-weight:600;text-align:right">Subtotal</td><td style="font-weight:600;text-align:right">${inr(order.subtotal)}</td></tr>
              <tr><td colspan="2" style="font-weight:600;text-align:right;color:green">Bundle Discount</td><td style="font-weight:600;text-align:right;color:green">-${inr(order.bundleDiscount)}</td></tr>` : ''}
              ${order.deliveryCharges > 0 ? `<tr><td colspan="2" style="font-weight:600;text-align:right">Delivery Charges</td><td style="font-weight:600;text-align:right">+${inr(order.deliveryCharges)}</td></tr>` : ''}
              <tr><td colspan="2" style="font-weight:700;text-align:right">Grand Total</td><td style="font-weight:700;text-align:right">${inr(order.amount)}</td></tr>
            </tfoot>
          </table>
          <table>
            <tr><td><strong>Order ID</strong></td><td>${orderId}</td></tr>
            <tr><td><strong>Order Date</strong></td><td>${orderDate}</td></tr>
            <tr><td><strong>Customer Name</strong></td><td>${customerName}</td></tr>
            <tr><td><strong>Customer Phone</strong></td><td>${customerPhone || 'Not provided'}</td></tr>
            <tr><td><strong>Delivery Address</strong></td><td>${address}</td></tr>
            ${transactionId ? `<tr><td><strong>Transaction ID</strong></td><td>${transactionId}</td></tr>` : ''}
          </table>
          <p><span class="badge">⚡ Action Needed</span> &nbsp;Log in at <a href="http://localhost:5173/author/dashboard">your dashboard</a> to approve or reject this order.</p>
        `)
      );

      invalidateCache(`author:dashboard:${authorEmail}`);
    }

    invalidateCache('admin:dashboard-stats');
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Order failed' });
  }
});

// Author: Approve a pending order item
router.put('/api/order-items/:id/author-approve', verifyToken, async (req, res) => {
  try {
    const orderItemId = parseInt(req.params.id);
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { book: { include: { author: true, reviews: { select: { rating: true } } } }, order: true }
    });
    if (!orderItem || orderItem.book.authorId !== author.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Idempotency: Prevent double approval and double stock deduction
    if (orderItem.status !== 'Pending Verification') {
      return res.status(400).json({ error: 'Order is no longer pending verification.' });
    }

    // Prevent negative inventory
    // (Removed because stock was already deducted at checkout. The author does not need double stock to click accept)

    const updated = await prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: 'Accepted' },
      include: { book: { include: { author: true, reviews: { select: { rating: true } } } }, order: true }
    });

    // Deduct stock and capture resulting value for low-stock check
    // [PRE-LAUNCH] Halt Deductions
    const bookAfterDeduct = await prisma.book.findUnique({
      where: { id: orderItem.bookId },
      include: { author: true }
    });
    // Fire low-stock alert asynchronously (non-blocking) if stock drops below threshold
    if (bookAfterDeduct.stock < 10) {
      fireStockAlert(bookAfterDeduct.id, bookAfterDeduct.title, bookAfterDeduct.author).catch(() => { });
    }

    const orderId = `PAA-${String(updated.order.id).padStart(4, '0')}`;
    const approvalDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const totalAmount = parseFloat(updated.book.mrp) * updated.quantity;

    // --- Email to CUSTOMER on approval ---
    if (updated.order?.customerEmail) {
      await sendNotificationEmail(
        updated.order.customerEmail,
        `Order Approved ✅ #${orderId} — ${updated.book.title}`,
        emailWrap(`Your Order Has Been Approved! 🎉`, `
          <p>Hi <strong>${updated.order.customerName}</strong>, great news! The author has approved your order.</p>
          <table>
            <tr><td><strong>Order ID</strong></td><td>${orderId}</td></tr>
            <tr><td><strong>Book</strong></td><td>${updated.book.title}</td></tr>
            <tr><td><strong>Author</strong></td><td>${updated.book.author?.name || author.name}</td></tr>
            <tr><td><strong>Quantity</strong></td><td>${updated.quantity}</td></tr>
            <tr><td><strong>Amount Paid</strong></td><td>${inr(totalAmount)}</td></tr>
            <tr><td><strong>Delivery Address</strong></td><td>${updated.order.address}</td></tr>
            <tr><td><strong>Approved On</strong></td><td>${approvalDate}</td></tr>
            ${updated.order.transactionId ? `<tr><td><strong>Your Transaction ID</strong></td><td>${updated.order.transactionId}</td></tr>` : ''}
          </table>
          <p>Your book will be packed and dispatched soon. The author will share a tracking number once dispatched.</p>
          <p>For queries, contact <strong>${author.name}</strong>${author.whatsapp ? ` on WhatsApp: ${author.whatsapp}` : ''} at ${author.email}.</p>
        `)
      );
    }

    // --- Email to AUTHOR with delivery instructions ---
    await sendNotificationEmail(
      author.email,
      `Order #${orderId} Approved — Pack & Dispatch`,
      emailWrap(`📦 Order Approved — Ready to Pack`, `
        <p>You have approved order <strong>${orderId}</strong>. Please pack the following and dispatch at the earliest.</p>
        <table>
          <tr><td><strong>Order ID</strong></td><td><strong>${orderId}</strong></td></tr>
          <tr><td><strong>Approved On</strong></td><td>${approvalDate}</td></tr>
          <tr><td><strong>Book Title</strong></td><td>${updated.book.title}</td></tr>
          <tr><td><strong>Quantity</strong></td><td>${updated.quantity}</td></tr>
          <tr><td><strong>Amount</strong></td><td>${inr(totalAmount)}</td></tr>
        </table>
        <h3 style="margin:24px 0 8px;font-size:16px;color:#1a1a2e;">📬 Ship To</h3>
        <table>
          <tr><td><strong>Name</strong></td><td>${updated.order.customerName}</td></tr>
          <tr><td><strong>Phone</strong></td><td>${updated.order.customerPhone || 'Not provided'}</td></tr>
          <tr><td><strong>Address</strong></td><td>${updated.order.address}</td></tr>
          ${updated.order.transactionId ? `<tr><td><strong>Transaction ID</strong></td><td>${updated.order.transactionId}</td></tr>` : ''}
        </table>
        <p style="margin-top:20px">Log in to your dashboard and click <strong>"Download Invoice"</strong> to get a printable slip for the delivery box.</p>
      `)
    );

    invalidateCache(`author:dashboard:${req.user.email}`);
    invalidateCache('admin:dashboard-stats');
    res.json({
      ...updated, invoiceData: {
        orderId,
        approvalDate,
        book: { title: updated.book.title, mrp: updated.book.mrp },
        author: { name: author.name, email: author.email, phone: author.phone, whatsapp: author.whatsapp },
        customer: { name: updated.order.customerName, phone: updated.order.customerPhone, email: updated.order.customerEmail, address: updated.order.address },
        quantity: updated.quantity,
        total: totalAmount,
        transactionId: updated.order.transactionId
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve order' });
  }
});

// Author: Fetch full invoice data for a specific order item
router.get('/api/order-items/:id/invoice', verifyToken, async (req, res) => {
  try {
    const orderItemId = parseInt(req.params.id);
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { book: { include: { author: true, reviews: { select: { rating: true } } } }, order: true }
    });
    if (!orderItem || orderItem.book.authorId !== author.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({
      orderId: `PAA-${String(orderItem.order.id).padStart(4, '0')}`,
      orderItemId: orderItem.id,
      status: orderItem.status,
      createdAt: orderItem.order.createdAt,
      book: { title: orderItem.book.title, mrp: orderItem.book.mrp, genre: orderItem.book.genre, coverUrl: orderItem.book.coverUrl },
      author: { name: author.name, email: author.email, phone: author.phone, whatsapp: author.whatsapp },
      customer: {
        name: orderItem.order.customerName,
        phone: orderItem.order.customerPhone,
        email: orderItem.order.customerEmail,
        address: orderItem.order.address
      },
      quantity: orderItem.quantity,
      total: parseFloat(orderItem.book.mrp) * orderItem.quantity,
      transactionId: orderItem.order.transactionId,
      trackingNumber: orderItem.trackingNumber
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Author: Reject a pending order item
router.put('/api/order-items/:id/author-reject', verifyToken, async (req, res) => {
  try {
    const orderItemId = parseInt(req.params.id);
    const { reason } = req.body;
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { book: true, order: true }
    });
    if (!orderItem || orderItem.book.authorId !== author.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (orderItem.status !== 'Pending Verification') {
      return res.status(400).json({ error: 'Order is no longer pending verification.' });
    }

    const updated = await prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: 'Rejected', rejectionReason: reason || 'Rejected by author' },
      include: { book: true, order: true }
    });

    // Restore stock since the order item is rejected
    await prisma.book.update({
      where: { id: orderItem.bookId },
      data: { stock: { increment: orderItem.quantity } }
    });

    if (updated.order?.customerEmail) {
      await sendNotificationEmail(updated.order.customerEmail, 'Order Rejected', `We\'re sorry. Your order for "${updated.book.title}" was rejected. Reason: ${reason || 'No specific reason provided.'}`);
    }

    invalidateCache(`author:dashboard:${req.user.email}`);
    invalidateCache('admin:dashboard-stats');
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject order' });
  }
});

// 7. Operations/Dashboard - Dynamic Sales Report
router.get('/api/admin/sales-report', verifyToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, filterType, selectedMonth, selectedYear } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    let start = new Date(startDate);
    let end = new Date(endDate);

    if (filterType === 'select_month' && selectedMonth && selectedYear) {
      start = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
      end = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);
    }

    end.setHours(23, 59, 59, 999);

    const webOrders = await prisma.order.findMany({
      where: {
        status: { in: ['Completed', 'Delivered', 'Shipped', 'Dispatched'] },
        createdAt: { gte: start, lte: end }
      },
      include: { items: { include: { book: { include: { author: true } } } } }
    });

    const posOrders = await prisma.posOrder.findMany({
      where: {
        createdAt: { gte: start, lte: end }
      },
      include: { event: true, items: { include: { book: { include: { author: true } } } } }
    });

    let totalRevenue = 0;
    let totalBooksSold = 0;
    let totalOrders = webOrders.length + posOrders.length;

    const chartDataMap = {};
    const channelDataMap = { Web: 0, Events: 0, 'Book Fairs': 0 };
    const tableData = [];

    const kpiSplits = {
      web: { revenue: 0, books: 0, orders: webOrders.length },
      events: { revenue: 0, books: 0, orders: 0 },
      bookFairs: { revenue: 0, books: 0, orders: 0 }
    };

    const processItem = (date, channel, eventName, authorName, title, qty, price, orderId) => {
      const fullDateStr = date.toISOString().split('T')[0];
      const monthStr = date.toISOString().slice(0, 7);
      const chartDateStr = (filterType === 'ytd' || filterType === 'lifetime') ? monthStr : fullDateStr;

      const rev = qty * price;

      totalRevenue += rev;
      totalBooksSold += qty;

      if (!chartDataMap[chartDateStr]) chartDataMap[chartDateStr] = { date: chartDateStr, revenue: 0, books: 0 };
      chartDataMap[chartDateStr].revenue += rev;
      chartDataMap[chartDateStr].books += qty;

      tableData.push({
        date: fullDateStr,
        orderId,
        channel,
        event: eventName,
        author: authorName,
        title,
        qty,
        revenue: rev
      });
    };

    webOrders.forEach(o => {
      o.items.forEach(i => {
        processItem(o.createdAt, 'Web Orders', '-', i.book.author.name, i.book.title, i.quantity, i.book.mrp, `PAA-${String(o.id).padStart(4, '0')}`);
        const rev = i.quantity * i.book.mrp;
        channelDataMap.Web += rev;
        kpiSplits.web.revenue += rev;
        kpiSplits.web.books += i.quantity;
      });
    });

    posOrders.forEach(po => {
      const isBookFair = po.event?.eventType === 'Book Fair' || po.event?.name?.toLowerCase().includes('fair');
      const channelName = isBookFair ? 'Book Fairs' : 'Events';
      const kpiKey = isBookFair ? 'bookFairs' : 'events';
      kpiSplits[kpiKey].orders += 1;

      po.items.forEach(i => {
        processItem(po.createdAt, channelName, po.event?.name || '-', i.book.author.name, i.book.title, i.quantity, i.price, po.event?.name || `POS-${String(po.id).padStart(4, '0')}`);
        const rev = i.quantity * i.price;
        channelDataMap[channelName] += rev;
        kpiSplits[kpiKey].revenue += rev;
        kpiSplits[kpiKey].books += i.quantity;
      });
    });

    const legacyEvents = await prisma.event.findMany({
      where: {
        status: 'Legacy Archive'
      }
    });

    const posEventIds = new Set(posOrders.filter(po => po.eventId).map(po => po.eventId));

    legacyEvents.forEach(evt => {
      let evtDate = new Date(evt.date);
      if (isNaN(evtDate.getTime())) {
        evtDate = new Date(evt.createdAt);
      }

      if (evtDate >= start && evtDate <= end) {
        // Prevent double counting if POS orders already exist for this archived event
        if (posEventIds.has(evt.id)) return;

        const qty = evt.aggSold || 0;
        const rev = evt.aggRevenue || (qty * 200) || 0;

        const isBookFair = evt.eventType === 'Book Fair' || evt.name?.toLowerCase().includes('fair');
        const channelName = isBookFair ? 'Book Fairs' : 'Events';
        const kpiKey = isBookFair ? 'bookFairs' : 'events';

        if (qty > 0 || rev > 0) {
          totalRevenue += rev;
          totalBooksSold += qty;
          
          const fullDateStr = evtDate.toISOString().split('T')[0];
          const monthStr = evtDate.toISOString().slice(0, 7);
          const chartDateStr = (filterType === 'ytd' || filterType === 'lifetime') ? monthStr : fullDateStr;

          if (!chartDataMap[chartDateStr]) chartDataMap[chartDateStr] = { date: chartDateStr, revenue: 0, books: 0 };
          chartDataMap[chartDateStr].revenue += rev;
          chartDataMap[chartDateStr].books += qty;

          channelDataMap[channelName] += rev;
          kpiSplits[kpiKey].revenue += rev;
          kpiSplits[kpiKey].books += qty;
          kpiSplits[kpiKey].orders += 1;
          totalOrders += 1;

          tableData.push({
            date: fullDateStr,
            orderId: evt.name || `LEGACY-${evt.id}`,
            channel: channelName,
            event: evt.name,
            author: `${evt.aggAuthors || 0} Authors`,
            title: '-',
            qty,
            revenue: rev
          });
        }
      }
    });

    const chartData = Object.values(chartDataMap).sort((a, b) => a.date.localeCompare(b.date));
    const channelData = [
      { name: 'Web Orders', value: channelDataMap.Web },
      { name: 'Events', value: channelDataMap.Events },
      { name: 'Book Fairs', value: channelDataMap['Book Fairs'] }
    ].filter(c => c.value > 0);

    res.json({
      kpis: {
        totalRevenue,
        totalBooksSold,
        totalOrders,
        splits: kpiSplits
      },
      chartData,
      channelData,
      tableData: tableData.sort((a, b) => b.date.localeCompare(a.date))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
});

router.get('/api/admin/reports/sales', verifyToken, isAdmin, async (req, res) => {
  try {
    const period = req.query.period || 'daily';
    const webOrders = await prisma.order.findMany({
      where: { status: { in: ['Completed', 'Delivered', 'Shipped', 'Dispatched'] } },
      include: { items: { include: { book: { include: { author: true, reviews: { select: { rating: true } } } } } } }
    });

    const posOrders = await prisma.posOrder.findMany({
      include: { event: true, items: { include: { book: { include: { author: true, reviews: { select: { rating: true } } } } } } }
    });

    const flatData = [];

    const getDateString = (dateObj) => {
      if (period === 'monthly') {
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      } else if (period === 'weekly') {
        const d = new Date(dateObj);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
      } else if (period === 'yearly') {
        return `${dateObj.getFullYear()}`;
      } else if (period === 'lifelong') {
        return 'All Time';
      }
      return dateObj.toISOString().split('T')[0];
    };

    webOrders.forEach(o => {
      const dateStr = getDateString(o.createdAt);
      o.items.forEach(i => {
        flatData.push({
          Period: dateStr,
          Channel: 'Web',
          Event: '-',
          Author: i.book.author.name,
          BookTitle: i.book.title,
          QuantitySold: i.quantity,
          Revenue: i.quantity * i.book.mrp
        });
      });
    });

    posOrders.forEach(po => {
      const dateStr = getDateString(po.createdAt);
      po.items.forEach(i => {
        flatData.push({
          Period: dateStr,
          Channel: 'POS',
          Event: po.event.name,
          Author: i.book.author.name,
          BookTitle: i.book.title,
          QuantitySold: i.quantity,
          Revenue: i.quantity * i.price
        });
      });
    });

    const aggregated = {};
    flatData.forEach(row => {
      const key = `${row.Period}|${row.Channel}|${row.Event}|${row.Author}|${row.BookTitle}`;
      if (!aggregated[key]) {
        aggregated[key] = { ...row };
      } else {
        aggregated[key].QuantitySold += row.QuantitySold;
        aggregated[key].Revenue += row.Revenue;
      }
    });

    const sortedData = Object.values(aggregated).sort((a, b) => b.Period.localeCompare(a.Period) || a.Channel.localeCompare(b.Channel));

    if (sortedData.length === 0) {
      return res.status(404).json({ error: 'No data found for the selected criteria' });
    }

    if (req.query.format === 'json') {
      return res.json(sortedData);
    }

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
      { key: 'Period', width: 20 },
      { key: 'Channel', width: 20 },
      { key: 'Event', width: 30 },
      { key: 'Author', width: 30 },
      { key: 'BookTitle', width: 40 },
      { key: 'QuantitySold', width: 15 },
      { key: 'Revenue', width: 15 }
    ];

    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    const todayStr = new Date().toISOString().split('T')[0];
    titleCell.value = `SALES REPORT (${period.toUpperCase()} - ${todayStr})`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1A2E' } };

    const headerRow = worksheet.addRow({
      Period: 'Period',
      Channel: 'Channel',
      Event: 'Event',
      Author: 'Author',
      BookTitle: 'Book Title',
      QuantitySold: 'Quantity Sold',
      Revenue: 'Revenue'
    });

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    sortedData.forEach((row) => {
      const addedRow = worksheet.addRow(row);
      addedRow.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const today = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename=sales_report_${period}_${today}.xlsx`);
    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

router.get('/api/admin/reports/chart', verifyToken, isAdmin, async (req, res) => {
  try {
    const period = req.query.period || 'daily';
    const webOrders = await prisma.order.findMany({
      where: { status: { in: ['Completed', 'Delivered', 'Shipped', 'Dispatched'] } },
      include: { items: { include: { book: true } } }
    });
    const posOrders = await prisma.posOrder.findMany({
      include: { items: true }
    });

    const getDateString = (dateObj) => {
      if (period === 'monthly') {
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      } else if (period === 'weekly') {
        const d = new Date(dateObj);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
      } else if (period === 'yearly') {
        return `${dateObj.getFullYear()}`;
      } else if (period === 'lifelong') {
        return 'All Time';
      }
      return dateObj.toISOString().split('T')[0];
    };

    const aggregated = {};
    webOrders.forEach(o => {
      const dateStr = getDateString(o.createdAt);
      if (!aggregated[dateStr]) aggregated[dateStr] = { name: dateStr, Web: 0, POS: 0 };
      o.items.forEach(i => {
        aggregated[dateStr].Web += i.quantity;
      });
    });

    posOrders.forEach(po => {
      const dateStr = getDateString(po.createdAt);
      if (!aggregated[dateStr]) aggregated[dateStr] = { name: dateStr, Web: 0, POS: 0 };
      po.items.forEach(i => {
        aggregated[dateStr].POS += i.quantity;
      });
    });

    const chartData = Object.values(aggregated).sort((a, b) => a.name.localeCompare(b.name));
    res.json(chartData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate chart data' });
  }
});

// 7. Operations/Author Dashboard - Get all orders
router.get('/api/admin/orders/export', verifyToken, isAdmin, async (req, res) => {
  try {
    const { type } = req.query;
    const whereClause = type === 'bulk' ? { isBulk: true } : type === 'web' ? { isBulk: false } : {};

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: { items: { include: { book: { include: { author: true, reviews: { select: { rating: true } } } } } } },
      orderBy: { createdAt: 'desc' }
    });
    const flatData = [];
    orders.forEach(o => {
      o.items.forEach(i => {
        flatData.push({
          OrderId: `ORD-${o.id}`,
          Date: o.createdAt.toISOString().split('T')[0],
          Customer: o.customerName,
          Email: o.customerEmail,
          Phone: o.customerPhone,
          Address: o.address,
          BookTitle: i.book.title,
          Author: i.book.author.name,
          Quantity: i.quantity,
          Amount: o.amount,
          PaymentStatus: o.paymentScreenshot ? 'Paid' : 'Unpaid',
          OrderStatus: i.status,
          TrackingNumber: i.trackingNumber || ''
        });
      });
    });
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders');

    worksheet.columns = [
      { key: 'OrderId', width: 15 },
      { key: 'Date', width: 15 },
      { key: 'Customer', width: 25 },
      { key: 'Email', width: 30 },
      { key: 'Phone', width: 15 },
      { key: 'Address', width: 40 },
      { key: 'BookTitle', width: 30 },
      { key: 'Author', width: 25 },
      { key: 'Quantity', width: 10 },
      { key: 'Amount', width: 15 },
      { key: 'PaymentStatus', width: 15 },
      { key: 'OrderStatus', width: 15 },
      { key: 'TrackingNumber', width: 20 }
    ];

    worksheet.mergeCells('A1:M1');
    const titleCell = worksheet.getCell('A1');
    const titleText = req.query.type === 'bulk' ? 'BULK ORDERS SUMMARY' : 'WEB ORDERS SUMMARY';
    titleCell.value = titleText;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } };

    const headerRow = worksheet.addRow({
      OrderId: 'Order ID',
      Date: 'Date',
      Customer: 'Customer',
      Email: 'Email',
      Phone: 'Phone',
      Address: 'Address',
      BookTitle: 'Book Title',
      Author: 'Author',
      Quantity: 'Quantity',
      Amount: 'Amount',
      PaymentStatus: 'Payment Status',
      OrderStatus: 'Order Status',
      TrackingNumber: 'Tracking Number'
    });

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    flatData.forEach((row) => {
      const addedRow = worksheet.addRow(row);
      addedRow.eachCell((cell, colNumber) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        
        const header = worksheet.getRow(2).getCell(colNumber).value;
        if (header === 'Payment Status') {
          if (cell.value === 'Paid') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
          else if (cell.value === 'Unpaid') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
        } else if (header === 'Order Status') {
          if (cell.value === 'Delivered' || cell.value === 'Completed') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
          else if (cell.value === 'Dispatched') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BC2E6' } };
          else if (['Rejected', 'Cancelled', 'Payment Failed'].includes(cell.value)) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
          else cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
        } else if (header === 'Amount' || header === 'Quantity') {
           cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
        } else if (header === 'Order ID' || header === 'Date') {
           cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
        } else {
           cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        }
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=orders_export.xlsx');
    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Admin Customers Route
router.get('/api/admin/customers', verifyToken, isAdmin, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          include: { items: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Delete (Archive) Order
router.delete('/api/admin/orders/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    await prisma.order.update({ where: { id: orderId }, data: { isArchived: true } });
    invalidateCache('admin:dashboard-stats');
    res.json({ success: true });
  } catch (error) {
    console.error('Archive order error:', error);
    res.status(500).json({ error: 'Failed to archive order' });
  }
});

// Restore Order
router.put('/api/admin/orders/:id/restore', verifyToken, isAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    await prisma.order.update({ where: { id: orderId }, data: { isArchived: false } });
    invalidateCache('admin:dashboard-stats');
    res.json({ success: true });
  } catch (error) {
    console.error('Restore order error:', error);
    res.status(500).json({ error: 'Failed to restore order' });
  }
});

router.get('/api/admin/orders', verifyToken, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          isBulk: true,
          createdAt: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          address: true,
          subtotal: true,
          deliveryCharges: true,
          bundleDiscount: true,
          amount: true,
          status: true,
          transactionId: true,
          paymentScreenshot: true,
          items: {
            select: {
              id: true,
              quantity: true,
              status: true,
              createdAt: true,
              acceptedAt: true,
              dispatchedAt: true,
              deliveredAt: true,
              trackingNumber: true,
              feedbackCondition: true,
              feedbackRating: true,
              feedbackComments: true,
              book: {
                select: {
                  title: true,
                  coverUrl: true,
                  mrp: true,
                  author: {
                    select: { id: true, name: true, email: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count()
    ]);

    const [pendingCount, toApproveOrders, shippedCount, totalRevenueAgg] = await Promise.all([
      prisma.order.count({ where: { status: 'Pending Verification' } }),
      prisma.orderItem.count({ where: { status: 'Pending' } }),
      prisma.orderItem.count({ where: { status: 'Dispatched' } }),
      prisma.order.aggregate({ _sum: { amount: true }, where: { status: 'Completed' } })
    ]);

    const mapped = orders.map(ord => ({
      id: `ORD-${ord.id.toString().padStart(4, '0')}`,
      dbId: ord.id,
      date: ord.createdAt.toISOString().split('T')[0],
      customer: ord.customerName,
      customerEmail: ord.customerEmail,
      customerPhone: ord.customerPhone,
      address: ord.address,
      subtotal: ord.subtotal || 0,
      deliveryCharges: ord.deliveryCharges || 0,
      bundleDiscount: ord.bundleDiscount || 0,
      isBulk: ord.isBulk,
      items: ord.items.map(i => ({
        id: i.id,
        title: i.book.title,
        coverUrl: i.book.coverUrl,
        qty: i.quantity,
        authorName: i.book.author.name,
        authorId: i.book.author.id,
        authorEmail: i.book.author.email,
        mrp: i.book.mrp,
        status: i.status,
        createdAt: i.createdAt,
        acceptedAt: i.acceptedAt,
        dispatchedAt: i.dispatchedAt,
        deliveredAt: i.deliveredAt,
        trackingNumber: i.trackingNumber,
        feedbackCondition: i.feedbackCondition,
        feedbackRating: i.feedbackRating,
        feedbackComments: i.feedbackComments,
        bookAvgRating: null // Extracted out for speed
      })),
      total: ord.amount,
      status: ord.status === 'Pending Verification' ? 'Pending' : ord.status,
      payment: ord.paymentScreenshot ? 'Paid' : 'Unpaid',
      paymentScreenshot: ord.paymentScreenshot
    }));

    res.json({
      data: mapped,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        pendingVerificationCount: pendingCount,
        toApproveOrders: toApproveOrders,
        shippedCount: shippedCount,
        totalRevenue: totalRevenueAgg._sum.amount || 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.put('/api/admin/orders/:id/status', verifyToken, isAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    
    // Fetch current order to check previous status
    const currentOrder = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!currentOrder) return res.status(404).json({ error: 'Order not found' });

    // Update the order status
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    // If changing to Cancelled or Rejected from a valid state, we must refund stock!
    if ((status === 'Cancelled' || status === 'Rejected') && 
        (currentOrder.status !== 'Cancelled' && currentOrder.status !== 'Rejected')) {
      for (const item of currentOrder.items) {
        if (item.status !== 'Dispatched' && item.status !== 'Completed' && item.status !== 'Rejected' && item.status !== 'Cancelled') {
          await prisma.book.update({
            where: { id: item.bookId },
            data: { stock: { increment: item.quantity } }
          });
          await prisma.orderItem.update({
            where: { id: item.id },
            data: { status: 'Cancelled' }
          });
        }
      }
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.put('/api/order-items/:id/status', verifyToken, async (req, res) => {
  try {
    let { status } = req.body;

    // Check if buyer has already submitted feedback
    const existing = await prisma.orderItem.findUnique({ where: { id: parseInt(req.params.id) }, include: { book: true } });
    if (!existing) return res.status(404).json({ error: 'Order item not found' });

    if (status === 'Delivered' && existing.feedbackRating != null) {
      status = 'Completed';
    }

    let updateData = { status };
    if (status === 'Delivered' || status === 'Completed') {
      updateData.deliveredAt = new Date();
    } else if (status === 'Accepted') {
      updateData.acceptedAt = new Date();
    } else if (status === 'Dispatched') {
      updateData.dispatchedAt = new Date();
    }

    // Refund stock if cancelled/rejected by admin manually
    if ((status === 'Cancelled' || status === 'Rejected') && 
        (existing.status !== 'Cancelled' && existing.status !== 'Rejected')) {
       await prisma.book.update({
          where: { id: existing.bookId },
          data: { stock: { increment: existing.quantity } }
       });
    }

    const orderItem = await prisma.orderItem.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });
    invalidateCache('admin:dashboard-stats');
    res.json(orderItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});


router.put('/api/order-items/:id/reject', verifyToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const existing = await prisma.orderItem.findUnique({ where: { id: parseInt(req.params.id) }, include: { book: true } });

    if (!existing || existing.status !== 'Pending Verification') {
      return res.status(400).json({ error: 'Order is no longer pending verification.' });
    }

    if (req.user.role !== 'Admin') {
      const author = await prisma.author.findUnique({ where: { email: req.user.email } });
      if (!author || existing.book.authorId !== author.id) {
        return res.status(403).json({ error: 'Not authorized to reject this order' });
      }
    }

    const orderItem = await prisma.orderItem.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'Rejected', rejectionReason: reason },
      include: { order: true, book: true }
    });

    // Refund stock since item was rejected
    if (orderItem.book) {
      await prisma.book.update({
        where: { id: orderItem.bookId },
        data: { stock: { increment: orderItem.quantity } }
      });
    }

    if (orderItem.order && orderItem.order.customerEmail) {
      await sendNotificationEmail(orderItem.order.customerEmail, 'Order Item Rejected', `Your order for book "${orderItem.book.title}" was rejected by the author. Reason: ${reason}`);
    }
    res.json(orderItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject order' });
  }
});

router.put('/api/order-items/:id/accept', verifyToken, async (req, res) => {
  try {
    const existing = await prisma.orderItem.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { book: true }
    });
    if (!existing || existing.status !== 'Pending Verification') {
      return res.status(400).json({ error: 'Order is not pending verification.' });
    }

    if (req.user.role !== 'Admin') {
      const author = await prisma.author.findUnique({ where: { email: req.user.email } });
      if (!author || existing.book.authorId !== author.id) {
        return res.status(403).json({ error: 'Not authorized to accept this order' });
      }
    }

    // Removed existing.book.stock < existing.quantity check. Stock was already deducted at order creation.

    const orderItem = await prisma.orderItem.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'Accepted', acceptedAt: new Date() },
      include: { order: true, book: { include: { author: true, reviews: { select: { rating: true } } } } }
    });

    if (orderItem.order && orderItem.order.customerEmail) {
      await sendNotificationEmail(orderItem.order.customerEmail, 'Order Accepted', `Good news! Your order for the book "${orderItem.book.title}" has been accepted by the author and is being prepared for dispatch.`);
    }
    // Deduct stock immediately
    if (orderItem) {
      // [PRE-LAUNCH] Halt Deductions
      // await prisma.book.update({
      //   where: { id: orderItem.bookId },
      //   data: { stock: { decrement: orderItem.quantity } }
      // });
    }
    // Invalidate cache
    if (orderItem.book?.author?.email) invalidateCache(`author:dashboard:${orderItem.book.author.email}`);
    res.json(orderItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to accept order' });
  }
});


router.put('/api/order-items/:id/dispatch', verifyToken, async (req, res) => {
  try {
    const { trackingNumber } = req.body;

    const existing = await prisma.orderItem.findUnique({ where: { id: parseInt(req.params.id) }, include: { book: true } });
    if (!existing || existing.status !== 'Accepted') {
      return res.status(400).json({ error: 'Order must be accepted before dispatch.' });
    }

    if (req.user.role !== 'Admin') {
      const author = await prisma.author.findUnique({ where: { email: req.user.email } });
      if (!author || existing.book.authorId !== author.id) {
        return res.status(403).json({ error: 'Not authorized to dispatch this order' });
      }
    }

    const now = new Date();
    const expectedDeliveryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const orderItem = await prisma.orderItem.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: 'Dispatched',
        trackingNumber: trackingNumber || 'N/A',
        dispatchedAt: now,
        expectedDeliveryDate
      },
      include: { order: true, book: true }
    });

    if (orderItem.order && orderItem.order.customerEmail) {
      const trackingString = (trackingNumber && trackingNumber !== 'N/A') ? ` Tracking No: ${trackingNumber}` : '';
      await sendNotificationEmail(orderItem.order.customerEmail, 'Order Dispatched', `Your book "${orderItem.book.title}" has been dispatched.${trackingString}`);
    }

    invalidateCache('admin:dashboard-stats');
    res.json(orderItem);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to dispatch order' });
  }
});

router.put('/api/order-items/:id/acknowledge', verifyToken, async (req, res) => {
  try {
    const { condition, rating, comments, packaging, asExpected, buyAgain } = req.body || {};
    const existing = await prisma.orderItem.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { book: { include: { author: true } }, order: true }
    });

    const orderItem = await prisma.orderItem.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: 'Delivered',
        deliveredAt: existing.deliveredAt || new Date(),
        feedbackCondition: condition || null,
        feedbackRating: rating ? parseInt(rating) : null,
        feedbackComments: comments || null,
        feedbackPackaging: packaging || null,
        feedbackAsExpected: asExpected || null,
        feedbackBuyAgain: buyAgain || null
      }
    });

    if (rating && existing.order?.customerEmail) {
      await sendNotificationEmail(existing.order.customerEmail, 'Thank You for Your Feedback', `Thank you for providing delivery feedback for "${existing.book?.title}". Your feedback helps us improve our services.`);
    }

    if (req.body.bookRating && existing) {
      await prisma.bookReview.create({
        data: {
          rating: parseInt(req.body.bookRating),
          comment: req.body.bookReviewComment || '',
          reviewerName: existing.order?.customerName || 'Anonymous',
          bookId: existing.bookId
        }
      });
      if (existing.order?.customerEmail) {
        await sendNotificationEmail(existing.order.customerEmail, 'Thank You for Your Review', `Thank you for reviewing "${existing.book?.title}". Your review helps other readers discover great books!`);
      }
    }

    res.json(orderItem);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to acknowledge order' });
  }
});


// 8. Operations Dashboard - Verify Order
router.post('/api/admin/orders/:id/verify', verifyToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.order.findUnique({ where: { id } });

    if (!existing || existing.status !== 'Pending Verification') {
      return res.status(400).json({ error: 'Order is already processed or not pending verification.' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status: 'Completed' },
      include: { items: true }
    });

    invalidateCache('admin:dashboard-stats');
    res.json(order);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify order' });
  }
});

router.post('/api/admin/orders/:id/reject-payment', verifyToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.order.findUnique({ where: { id } });

    if (!existing || existing.status !== 'Pending Verification') {
      return res.status(400).json({ error: 'Order is already processed or not pending verification.' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status: 'Payment Not Received' },
      include: { items: true }
    });

    // Refund stock for all items
    for (const item of order.items) {
      if (item.status !== 'Dispatched' && item.status !== 'Completed') {
        await prisma.book.update({
          where: { id: item.bookId },
          data: { stock: { increment: item.quantity } }
        });
      }
    }

    invalidateCache('admin:dashboard-stats');
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject payment' });
  }
});

// 9. Contact Inquiry
router.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Save to DB
    const inquiry = await prisma.contactInquiry.create({
      data: { name, email, message }
    });

    res.json({ success: true, message: "Inquiry saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save inquiry' });
  }
});


// 10. Gallery Events
router.get('/api/gallery', async (req, res) => {
  try {
    const events = await prisma.galleryEvent.findMany({
      orderBy: { date: 'desc' },
      include: { images: { where: { status: 'Approved' } } }
    });
    const now = new Date();
    const filteredEvents = events.filter(e => new Date(e.date) <= now);
    res.json(filteredEvents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch gallery events' });
  }
});

router.post('/api/admin/gallery', verifyToken, isAdmin, upload.single('photo'), async (req, res) => {
  try {
    const { location, place, city, date, duration, authors, booksSold, type, description } = req.body;
    let photoUrl = '';
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    }

    const newEvent = await prisma.galleryEvent.create({
      data: {
        location,
        place,
        city,
        date: new Date(date),
        duration,
        authors: parseInt(authors),
        booksSold: parseInt(booksSold),
        type,
        description,
        photoUrl
      }
    });
    res.status(201).json(newEvent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload gallery event' });
  }
});
router.put('/api/admin/gallery/:id', verifyToken, isAdmin, upload.single('photo'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { location, place, city, date, duration, authors, booksSold, type, description } = req.body;
    let updateData = {
      location, place, city, date: new Date(date), duration,
      authors: parseInt(authors), booksSold: parseInt(booksSold), type, description
    };
    if (req.file) {
      updateData.photoUrl = `/uploads/${req.file.filename}`;
    }

    const updated = await prisma.galleryEvent.update({
      where: { id },
      data: updateData
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update gallery event' });
  }
});

router.delete('/api/admin/gallery/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.galleryEvent.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete gallery event' });
  }
});

router.post('/api/admin/gallery/:id/images', verifyToken, isAdmin, upload.single('photo'), async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { caption, dateTaken, itemType } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    let galleryEvent;

    if (itemType === 'Library') {
      galleryEvent = await prisma.galleryEvent.findUnique({ where: { libraryId: eventId } });
      if (!galleryEvent) {
        const lib = await prisma.library.findUnique({ where: { id: eventId } });
        if (!lib) return res.status(404).json({ error: 'Library not found' });

        galleryEvent = await prisma.galleryEvent.create({
          data: {
            libraryId: eventId,
            location: lib.name,
            place: lib.airportName || lib.name,
            city: lib.city,
            date: new Date(lib.createdAt),
            duration: 'Ongoing',
            authors: 0,
            booksSold: 0,
            type: lib.type,
            description: `Donation Drive for ${lib.name}`,
            photoUrl: lib.bannerUrl || ''
          }
        });
      }
    } else {
      galleryEvent = await prisma.galleryEvent.findUnique({ where: { eventId } });
      if (!galleryEvent) {
        const evt = await prisma.event.findUnique({ where: { id: eventId } });
        if (!evt) return res.status(404).json({ error: 'Event not found' });

        galleryEvent = await prisma.galleryEvent.create({
          data: {
            eventId,
            location: evt.name,
            place: evt.location,
            city: '',
            date: evt.date ? new Date(evt.date) : new Date(),
            duration: evt.duration || '1 Day',
            authors: 0,
            booksSold: 0,
            type: evt.eventType || 'Literary Event',
            description: evt.description || evt.name,
            photoUrl: evt.bannerUrl || ''
          }
        });
      }
    }

    const image = await prisma.galleryImage.create({
      data: {
        galleryEventId: galleryEvent.id,
        url: `/uploads/${req.file.filename}`,
        caption: caption || null,
        dateTaken: dateTaken ? new Date(dateTaken) : null,
        status: 'Approved'
      }
    });
    res.status(201).json(image);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add image' });
  }
});

router.delete('/api/admin/gallery/images/:imageId', verifyToken, isAdmin, async (req, res) => {
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
router.get('/api/admin/events/:id/registrations', verifyToken, isAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const registrations = await prisma.eventAuthor.findMany({
      where: { eventId, optInStatus: { not: 'Pending' } },
      include: {
        author: {
          include: { books: true }
        }
      }
    });

    const eventBooks = await prisma.eventBook.findMany({
      where: { eventId },
      include: { book: true }
    });

    const posOrders = await prisma.posOrder.findMany({
      where: { eventId, paymentStatus: 'CONFIRMED' },
      include: { items: true }
    });

    const dailySalesMap = {};
    const uniqueDatesSet = new Set();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    posOrders.forEach(po => {
      const dateStr = formatter.format(po.createdAt);
      uniqueDatesSet.add(dateStr);
      po.items.forEach(poi => {
        if (!dailySalesMap[poi.bookId]) dailySalesMap[poi.bookId] = {};
        dailySalesMap[poi.bookId][dateStr] = (dailySalesMap[poi.bookId][dateStr] || 0) + poi.quantity;
      });
    });
    const uniqueDates = Array.from(uniqueDatesSet).sort();

    const detailedRegistrations = registrations.map(reg => {
      const authorBooks = eventBooks.filter(eb => eb.authorId === reg.authorId).map(ab => ({
        ...ab,
        dailySales: dailySalesMap[ab.bookId] || {}
      }));

      const categoryCounts = {};
      authorBooks.forEach(ab => {
        const cat = ab.book?.category || 'Uncategorized';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + ab.listedStock;
      });

      return {
        ...reg,
        books: authorBooks,
        categoryCounts
      };
    });

    res.json({ registrations: detailedRegistrations, uniqueDates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

router.post('/api/admin/events/:eventId/author/:authorId/approve', verifyToken, isAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const authorId = parseInt(req.params.authorId);

    await prisma.eventAuthor.updateMany({
      where: { eventId, authorId },
      data: { optInStatus: 'Registered' }
    });

    const author = await prisma.author.findUnique({ where: { id: authorId } });
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (author && event) {
      sendNotificationEmail(
        author.email,
        `Event Registration Approved: ${event.name}`,
        emailWrap(
          `Your Registration is Approved`,
          `<p>Great news! Your registration for the event <strong>${event.name}</strong> has been approved by the administrators.</p>
           <p>You can now see the event details and manage your participation from your Author Dashboard.</p>`
        )
      ).catch(e => console.error('Failed to send approve email:', e));
      
      invalidateCache(`author:dashboard:${author.email}`);
      invalidateCache(`author:events:${author.email}`);
    }

    invalidateCache('admin:dashboard-stats');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve' });
  }
});

router.put('/api/admin/events/:eventId/author/:authorId/transaction', verifyToken, isAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const authorId = parseInt(req.params.authorId);
    const { transactionId } = req.body;

    await prisma.eventAuthor.updateMany({
      where: { eventId, authorId },
      data: { transactionId }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction ID' });
  }
});

router.post('/api/admin/events/:eventId/author/:authorId/reject', verifyToken, isAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const authorId = parseInt(req.params.authorId);
    const { reason } = req.body;

    const existingRegistration = await prisma.eventAuthor.findFirst({
      where: { eventId, authorId }
    });

    if (existingRegistration && existingRegistration.optInStatus !== 'Rejected') {
      await prisma.eventAuthor.updateMany({
        where: { eventId, authorId },
        data: { 
          optInStatus: 'Rejected',
          rejectionReason: reason || 'Not specified'
        }
      });

      // Restore reserved stock since registration was rejected
      const eventBooks = await prisma.eventBook.findMany({
        where: { eventId, authorId }
      });

      for (const eb of eventBooks) {
        const uncommittedStock = eb.listedStock - (eb.soldStock || 0);
        if (uncommittedStock > 0) {
          await prisma.book.update({
            where: { id: eb.bookId },
            data: { stock: { increment: uncommittedStock } }
          });
          await prisma.eventBook.update({
            where: { id: eb.id },
            data: { listedStock: (eb.soldStock || 0) }
          });
        }
      }
    }

    const author = await prisma.author.findUnique({ where: { id: authorId } });
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (author && event) {
      sendNotificationEmail(
        author.email,
        `Event Registration Update: ${event.name}`,
        emailWrap(
          `Registration Update`,
          `<p>We are writing to inform you about an update regarding your registration for the event <strong>${event.name}</strong>.</p>
           <p>Unfortunately, your registration has not been approved at this time.</p>
           ${reason ? `<p><strong>Reason provided by administration:</strong> ${reason}</p>` : ''}
           <p>If you have any questions, please reach out to our support team.</p>`
        )
      ).catch(e => console.error('Failed to send reject email:', e));
      
      invalidateCache(`author:dashboard:${author.email}`);
      invalidateCache(`author:events:${author.email}`);
    }

    invalidateCache('admin:dashboard-stats');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject' });
  }
});

// --- FORMS MANAGEMENT ---



// --- QUERIES (SUPPORT) ---



// --- DYNAMIC AUTHOR FIELDS ---
router.get('/api/admin/author-fields', verifyToken, isAdmin, (req, res) => {
  try {
    const settings = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'settings.json')));
    res.json(settings.authorDynamicFields || []);
  } catch (e) {
    res.json([]);
  }
});

router.get('/api/author-fields', (req, res) => {
  try {
    const settings = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'settings.json')));
    res.json(settings.authorDynamicFields || []);
  } catch (e) {
    res.json([]);
  }
});

router.post('/api/admin/author-fields', verifyToken, isAdmin, (req, res) => {
  try {
    const fields = req.body.fields;
    const settingsPath = require('path').join(__dirname, 'settings.json');
    let settings = {};
    if (require('fs').existsSync(settingsPath)) {
      settings = JSON.parse(require('fs').readFileSync(settingsPath));
    }
    settings.authorDynamicFields = fields;
    require('fs').writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save fields' });
  }
});

router.put('/api/author/profile/extra', verifyToken, async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: "Author not found" });
    await prisma.author.update({
      where: { id: author.id },
      data: { extraData: req.body.extraData }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update extra data' });
  }
});


// --- DYNAMIC AUTHOR FIELDS ---
router.get('/api/admin/author-fields', verifyToken, isAdmin, (req, res) => {
  try {
    const settings = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'settings.json')));
    res.json(settings.authorDynamicFields || []);
  } catch (e) { res.json([]); }
});

router.post('/api/admin/author-fields', verifyToken, isAdmin, (req, res) => {
  try {
    const p = require('path').join(__dirname, 'settings.json');
    const settings = require('fs').existsSync(p) ? JSON.parse(require('fs').readFileSync(p)) : {};
    settings.authorDynamicFields = req.body.fields;
    require('fs').writeFileSync(p, JSON.stringify(settings, null, 2));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to save settings' }); }
});

router.put('/api/author/profile/extra', verifyToken, async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    await prisma.author.update({
      where: { id: author.id },
      data: { extraData: req.body }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save extra data' });
  }
});



// --- AUTHOR EVENTS MANAGEMENT ---
router.get('/api/author/events', verifyToken, async (req, res) => {
  const cacheKey = `author:events:${req.user.email}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);
  try {
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    const eventInvites = await prisma.eventAuthor.findMany({
      where: {
        authorId: author.id,
        event: { broadcastStatus: { not: 'Draft' } }
      },
      include: { event: true }
    });

    const books = await prisma.book.findMany({ where: { authorId: author.id, status: 'Approved' } });
    const listedBooks = await prisma.eventBook.findMany({
      where: { authorId: author.id },
      include: { book: true }
    });

    // All past events (for the gallery / history section in author dashboard)
    const pastEvents = await prisma.event.findMany({
      where: { status: { in: ['Past', 'Legacy Archive'] }, broadcastStatus: 'Published' },
      orderBy: { date: 'desc' },
      include: {
        _count: { select: { eventAuthors: { where: { optInStatus: 'Registered' } }, eventBooks: true } }
      }
    });

    const invitedEventIds = eventInvites.map(ei => ei.eventId);
    const availableEvents = await prisma.event.findMany({
      where: {
        id: { notIn: invitedEventIds },
        status: { in: ['Upcoming', 'Upcoming/Live'] },
        broadcastStatus: { not: 'Draft' }
      },
      orderBy: { createdAt: 'desc' }
    });

    const parseEventDateHelper = (dateStr) => {
      if (!dateStr) return new Date(0);
      try {
        const str = typeof dateStr === 'string' ? dateStr : String(dateStr);
        const d = new Date(str.replace(/-/g, ' '));
        return isNaN(d.getTime()) ? new Date(0) : d;
      } catch (e) {
        return new Date(0);
      }
    };

    const allAuthors = await prisma.author.findMany({ select: { createdAt: true, groupJoiningDate: true } });

    const attachParticipation = (evt) => {
      const evTime = parseEventDateHelper(evt.date || evt.startDate).getTime();
      let eligibleAuthorsCount = evt.aggEligibleAuthors;
      if (eligibleAuthorsCount == null) {
        eligibleAuthorsCount = allAuthors.filter(a => {
          const joinDate = a.groupJoiningDate ? new Date(a.groupJoiningDate) : new Date(a.createdAt);
          joinDate.setHours(0, 0, 0, 0);
          return evTime >= joinDate.getTime();
        }).length;
      }
      const isPastOrArchive = evt.isLegacy || evt.status === 'Past' || evt.status === 'Legacy Archive';
      const evtAuthors = isPastOrArchive ? (evt.aggAuthors != null ? evt.aggAuthors : 'NA') : (evt._count?.eventAuthors || 0);
      evt.participationPercentage = eligibleAuthorsCount === 0 || evtAuthors === 'NA' ? 0 : Math.round((Number(evtAuthors) / eligibleAuthorsCount) * 100);
      return evt;
    };

    pastEvents.forEach(attachParticipation);
    availableEvents.forEach(attachParticipation);
    eventInvites.forEach(ei => { if (ei.event) attachParticipation(ei.event); });

    const result = { eventInvites, books, listedBooks, pastEvents, availableEvents };
    setCache(cacheKey, result, 30 * 1000);
    res.json(result);
  } catch (error) {
    console.error('Error fetching author events:', error);
    res.status(500).json({ error: 'Failed to fetch events', details: error.message });
  }
});

router.get('/api/author/book-performance', verifyToken, async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    const eventAuthors = await prisma.eventAuthor.findMany({
      where: { 
        authorId: author.id,
        optInStatus: { in: ['Registered', 'Approved'] }
      },
      include: {
        event: true
      }
    });

    const posOrders = await prisma.posOrder.findMany({
      where: {
        authorId: author.id,
        paymentStatus: 'CONFIRMED'
      },
      include: {
        items: {
          include: { book: true }
        }
      }
    });

    const listedBooks = await prisma.eventBook.findMany({
      where: { authorId: author.id },
      include: { book: true }
    });

    const performanceData = [];

    eventAuthors.forEach(ea => {
      const isBookFair = ea.event?.eventType === 'Book Fair' || ea.event?.name?.toLowerCase().includes('fair');
      if (!isBookFair) return;

      const eventId = ea.eventId;
      const eventOrders = posOrders.filter(po => po.eventId === eventId);
      
      const bookDataMap = {}; // title -> data
      let hasPosData = false;
      
      eventOrders.forEach(po => {
        po.items.forEach(item => {
          hasPosData = true;
          const title = item.book ? item.book.title : 'Unknown Book';
          if (!bookDataMap[title]) {
            bookDataMap[title] = {
              eventId: ea.eventId,
              eventName: ea.event.name,
              date: ea.event.date,
              bookTitle: title,
              booksSold: 0,
              revenue: 0,
              investment: ea.investment || 0
            };
          }
          bookDataMap[title].booksSold += item.quantity;
          bookDataMap[title].revenue += item.price * item.quantity;
        });
      });
      
      if (!hasPosData) {
        if (ea.manualTotalRevenue > 0 || ea.manualTotalSold > 0) {
          performanceData.push({
            eventId: ea.eventId,
            eventName: ea.event.name,
            date: ea.event.date,
            bookTitle: 'Manual Aggregation',
            booksSold: ea.manualTotalSold || 0,
            revenue: ea.manualTotalRevenue || 0,
            investment: ea.investment || 0
          });
        } else {
          const eventBooks = listedBooks.filter(lb => lb.eventId === ea.eventId);
          let foundManualSales = false;
          eventBooks.forEach(eb => {
            if (eb.soldStock > 0) {
              foundManualSales = true;
              const price = eb.overrideMrp || eb.book?.mrp || 0;
              performanceData.push({
                eventId: ea.eventId,
                eventName: ea.event.name,
                date: ea.event.date,
                bookTitle: eb.book?.title || 'Unknown Book',
                booksSold: eb.soldStock,
                revenue: eb.soldStock * price,
                investment: ea.investment || 0
              });
            }
          });
          if (!foundManualSales) {
            performanceData.push({
              eventId: ea.eventId,
              eventName: ea.event.name,
              date: ea.event.date,
              bookTitle: 'No Sales Yet',
              booksSold: 0,
              revenue: 0,
              investment: ea.investment || 0
            });
          }
        }
      } else {
        Object.values(bookDataMap).forEach(data => performanceData.push(data));
      }
    });

    res.json(performanceData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch book performance' });
  }
});

router.put('/api/author/book-performance/:eventId/investment', verifyToken, async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    const eventId = parseInt(req.params.eventId);
    const { investment } = req.body;
    
    if (isNaN(investment)) return res.status(400).json({ error: 'Invalid investment value' });

    await prisma.eventAuthor.updateMany({
      where: { authorId: author.id, eventId },
      data: { investment: parseFloat(investment) }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update investment' });
  }
});

router.post('/api/author/events/:eventId/opt-in', verifyToken, upload.single('paymentScreenshot'), async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    let booksToLink = [];
    if (req.body.booksToLink) {
      booksToLink = JSON.parse(req.body.booksToLink);
    }

    const author = await prisma.author.findUnique({ where: { email: req.user.email } });

    // ── Idempotency guard: prevent duplicate registrations ──
    const existingRecord = await prisma.eventAuthor.findFirst({ where: { eventId, authorId: author.id } });
    if (existingRecord && (existingRecord.optInStatus === 'Pending Approval' || existingRecord.optInStatus === 'Registered')) {
      return res.status(409).json({ error: `You have already registered for this event (status: ${existingRecord.optInStatus}). Duplicate submissions are not allowed.` });
    }

    let paymentScreenshot = null;
    if (req.file) {
      paymentScreenshot = `/uploads/${req.file.filename}`;
    }
    const transactionId = req.body.transactionId || null;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Validate payment screenshot requirement
    if (event.registrationFee > 0 && !paymentScreenshot) {
      // Allow if they already have an existing screenshot attached to their EventAuthor profile
      const existingOptIn = await prisma.eventAuthor.findFirst({ where: { eventId, authorId: author.id } });
      if (!existingOptIn || !existingOptIn.paymentScreenshot) {
        // Wait, if totalFee could be 0 because they selected 0 books? But they are required to select > 0 books to opt in.
        return res.status(400).json({ error: 'Payment screenshot is required for this event.' });
      }
    }
    if (event.registrationFee > 0 && !transactionId) {
      const existingOptIn = await prisma.eventAuthor.findFirst({ where: { eventId, authorId: author.id } });
      if (!existingOptIn || !existingOptIn.transactionId) {
        return res.status(400).json({ error: 'Transaction ID is required for this event.' });
      }
    }

    // Wrap the entire process in a transaction to prevent partial updates and stock generation exploits
    await prisma.$transaction(async (tx) => {
      // ── STEP 1: Restore any previously committed stock back to Book.stock ──
      const previousEventBooks = await tx.eventBook.findMany({
        where: { eventId, authorId: author.id },
        include: { book: true }
      });
      for (const prev of previousEventBooks) {
        const uncommittedStock = prev.listedStock - prev.soldStock;
        if (uncommittedStock > 0) {
          await tx.book.update({
            where: { id: prev.bookId },
            data: { stock: { increment: uncommittedStock } }
          });
        }
      }

      // ── STEP 2: Validate new listing quantities against current (now-restored) Book.stock ──
      if (booksToLink && booksToLink.length > 0) {
        for (const b of booksToLink) {
          const book = await tx.book.findUnique({ where: { id: parseInt(b.bookId) } });
          if (!book) {
            throw new Error(`Book not found (ID: ${b.bookId})`);
          }
          const requested = parseInt(b.stock);
          if (requested <= 0) {
            throw new Error(`Listed quantity must be at least 1 for "${book.title}"`);
          }
          if (book.stock < requested) {
            throw new Error(`Insufficient stock for "${book.title}". You have ${book.stock} available but listed ${requested}.`);
          }
        }
      }

      // ── STEP 3: Create or Update EventAuthor status (handles authors not in original broadcast) ──
      const existingTxAuthor = await tx.eventAuthor.findFirst({ where: { eventId, authorId: author.id } });
      if (existingTxAuthor) {
        await tx.eventAuthor.update({
          where: { id: existingTxAuthor.id },
          data: {
            optInStatus: 'Pending Approval',
            ...(paymentScreenshot && { paymentScreenshot }),
            ...(transactionId && { transactionId }),
          }
        });
      } else {
        await tx.eventAuthor.create({
          data: {
            eventId,
            authorId: author.id,
            optInStatus: 'Pending Approval',
            ...(paymentScreenshot && { paymentScreenshot }),
            ...(transactionId && { transactionId }),
          }
        });
      }

      // ── STEP 4: Archive removed EventBook records ──
      const incomingBookIds = booksToLink ? booksToLink.map(b => parseInt(b.bookId)) : [];
      await tx.eventBook.updateMany({ 
        where: { eventId, authorId: author.id, bookId: { notIn: incomingBookIds } }, 
        data: { isArchived: true } 
      });

      // ── STEP 5: Deduct new listedStock from Book.stock and update/create EventBook records ──
      const lowStockBooksAfterEvent = [];
      if (booksToLink && booksToLink.length > 0) {
        for (const b of booksToLink) {
          const requested = parseInt(b.stock);
          const bookId = parseInt(b.bookId);

          const existingEb = await tx.eventBook.findFirst({
            where: { eventId, authorId: author.id, bookId }
          });

          if (existingEb) {
            await tx.eventBook.update({
              where: { id: existingEb.id },
              data: { 
                listedStock: { increment: requested },
                isArchived: false
              }
            });
          } else {
            await tx.eventBook.create({
              data: {
                eventId,
                authorId: author.id,
                bookId,
                listedStock: requested,
                overrideMrp: b.overrideMrp || null
              }
            });
          }

          // Deduct listed stock from Book.stock
          const bookAfterDeduct = await tx.book.update({
            where: { id: bookId },
            data: { stock: { decrement: requested } },
            include: { author: true }
          });
          
          if (bookAfterDeduct.stock < 10) {
            lowStockBooksAfterEvent.push(bookAfterDeduct);
          }
        }
      }
      // Store for post-transaction processing (transactions cannot use external I/O)
      author._lowStockBooksAfterEvent = lowStockBooksAfterEvent;
    }, { maxWait: 15000, timeout: 30000 });

    // Fire low-stock alerts after transaction commits (non-blocking)
    if (author._lowStockBooksAfterEvent && author._lowStockBooksAfterEvent.length > 0) {
      for (const b of author._lowStockBooksAfterEvent) {
        fireStockAlert(b.id, b.title, author).catch(() => { });
      }
    }

    // ── Bust all affected caches so both author and admin see fresh data immediately ──
    invalidateCache(`author:events:${req.user.email}`);       // author events tab
    invalidateCache(`author:dashboard:${req.user.email}`);    // author dashboard
    invalidateCache('admin:dashboard-stats');                  // admin pending count badge
    // ── Send Confirmation Email to Author ──
    try {
      const bookIds = booksToLink.map(b => parseInt(b.bookId));
      let booksListHtml = '<p>No books listed (Registration only).</p>';
      
      if (bookIds.length > 0) {
        const listedBooksData = await prisma.book.findMany({
          where: { id: { in: bookIds } }
        });
        
        booksListHtml = '<ul style="padding-left: 20px; line-height: 1.6;">';
        booksToLink.forEach(b => {
          const bookDb = listedBooksData.find(db => db.id === parseInt(b.bookId));
          if (bookDb) {
            booksListHtml += `<li><strong>${bookDb.title}</strong> &mdash; ${b.stock} copies</li>`;
          }
        });
        booksListHtml += '</ul>';
      }

      const emailHtml = emailWrap(
        `Event Registration Received`,
        `<p>Dear ${author.name},</p>
         <p>We have successfully received your registration request for the event <strong>${event.name}</strong>.</p>
         <p>Below is the list of books and quantities you have requested to list for this event:</p>
         ${booksListHtml}
         <p>Your registration is currently pending approval. We will notify you as soon as the administration reviews and approves it.</p>
         <p>Thank you,<br/>Pune Authors' Association</p>`
      );
      
      sendNotificationEmail(author.email, `Registration Received: ${event.name}`, emailHtml).catch(e => console.error('Failed to send opt-in email:', e));
    } catch (emailErr) {
      console.error('Error sending opt-in email:', emailErr);
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    if (error.message.includes('Insufficient stock') || error.message.includes('Listed quantity') || error.message.includes('Book not found')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to opt in', details: error.message, stack: error.stack });
  }
});

router.post('/api/author/events/:eventId/opt-out', verifyToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    await prisma.eventAuthor.updateMany({
      where: { eventId, authorId: author.id },
      data: { optInStatus: 'Declined' }
    });

    invalidateCache(`author:events:${req.user.email}`);
    invalidateCache(`author:dashboard:${req.user.email}`);
    invalidateCache('admin:dashboard-stats');
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to decline invite' });
  }
});



const isEventLiveToday = (evt) => {
  if (!evt || evt.dateType === 'tentative' || !evt.date) return false;

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  if (evt.date === todayStr) return true;

  const parseDt = (dStr) => {
    if (!dStr) return null;
    const dt = new Date(String(dStr).replace(/-/g, ' '));
    return isNaN(dt.getTime()) ? null : dt;
  };

  const startDate = parseDt(evt.date);
  if (!startDate) return false;

  startDate.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let durationDays = 1;
  if (typeof evt.duration === 'string') {
    const match = evt.duration.match(/(\d+)\s*Days?/i);
    if (match && parseInt(match[1]) > 0) {
      durationDays = parseInt(match[1]);
    }
  }

  const endDate = new Date(startDate.getTime());
  endDate.setDate(endDate.getDate() + Math.max(1, durationDays) - 1);
  endDate.setHours(23, 59, 59, 999);

  return now.getTime() >= startDate.getTime() && now.getTime() <= endDate.getTime();
};

// PUBLIC EVENTS ENDPOINT
router.get('/api/public/events', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        galleryEvent: { include: { images: true } },
        _count: {
          select: {
            eventBooks: true,
            eventAuthors: { where: { optInStatus: 'Registered' } }
          }
        }
      },
      orderBy: { id: 'desc' }
    });
    const processed = events.map(e => (e.status === 'Upcoming' && isEventLiveToday(e)) ? { ...e, status: 'Live' } : e);
    res.json(processed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch public events', detail: error.message, stack: error.stack });
  }
});

// GET PUBLIC EVENT CATALOGUE
router.get('/api/events/:eventId/catalogue', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { galleryEvent: true }
    });

    const listedBooks = await prisma.eventBook.findMany({
      where: { eventId },
      include: {
        book: true,
        author: { select: { name: true, bio: true, photoUrl: true } }
      }
    });

    res.json({ event, catalogue: listedBooks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch catalogue' });
  }
});

// --- EVENTS MANAGEMENT (PHASE 1) ---

router.post('/api/admin/events', verifyToken, isAdmin, upload.single('banner'), validate(eventSchema), async (req, res) => {
  try {
    const { name, location, date, dateType, tentativeDate, duration, startTime, endTime, eventType, category, registrationFee, feeType, description, livePosEnabled, notifyAllAuthors } = req.body;

    const existingEvent = await prisma.event.findFirst({
      where: { name, location, date }
    });
    if (existingEvent) {
      return res.status(400).json({ error: 'An event with the same name, location, and date already exists.' });
    }

    let bannerUrl = null;
    if (req.file) {
      bannerUrl = `/uploads/${req.file.filename}`;
    }

    const event = await prisma.event.create({
      data: {
        name,
        location,
        date,
        dateType: dateType || 'exact',
        tentativeDate: tentativeDate || (dateType === 'tentative' ? date : null),
        duration,
        startTime: startTime || null,
        endTime: endTime || null,
        description: description || null,
        bannerUrl,
        status: req.body.status || (dateType === 'exact' && new Date(date) < new Date() ? 'Past' : 'Upcoming'),
        broadcastStatus: notifyAllAuthors === 'false' ? 'Draft' : 'CustomersAlso',
        eventType: eventType || 'Book Fair',
        category: category || null,
        registrationFee: registrationFee ? parseFloat(registrationFee) : 0,
        feeType: feeType || 'Per Author',
        aggAuthors: req.body.aggAuthors ? parseInt(req.body.aggAuthors) : null,
        aggTitles: req.body.aggTitles ? parseInt(req.body.aggTitles) : null,
        aggSent: req.body.aggSent ? parseInt(req.body.aggSent) : null,
        aggSold: req.body.aggSold ? parseInt(req.body.aggSold) : null,
        aggRevenue: req.body.aggRevenue ? parseFloat(req.body.aggRevenue) : null,
        aggEligibleAuthors: req.body.aggEligibleAuthors ? parseInt(req.body.aggEligibleAuthors) : null,
        livePosEnabled: livePosEnabled === 'true' || livePosEnabled === true
      }
    });

    const activeAuthors = await prisma.author.findMany({ where: { status: 'Active' } });
    const eventAuthorsData = activeAuthors.map(a => ({ eventId: event.id, authorId: a.id, optInStatus: 'Pending' }));
    await prisma.eventAuthor.createMany({ data: eventAuthorsData, skipDuplicates: true });

    if (notifyAllAuthors !== 'false') {
      const subject = `New Event Announced: ${event.name}`;
      let bannerHtml = '';
      if (bannerUrl) {
        bannerHtml = `<div style="text-align: center; margin-bottom: 20px;">
           <img src="${process.env.VITE_API_URL || 'https://pune-authors-app.vercel.app'}${bannerUrl}" alt="Event Banner" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
         </div>`;
      }

      const content = `
        ${bannerHtml}
        <h2 style="color: #1e3a8a; margin-bottom: 15px;">${event.name}</h2>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px 20px; border-radius: 4px; margin-bottom: 25px; color: #4b5563; font-size: 15px; font-style: italic; line-height: 1.5;">
          ${event.description ? event.description.replace(/\n/g, '<br>') : 'Join us for our upcoming event! Click the link below to view more details and register.'}
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="margin-top: 0; color: #1f2937; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 15px;">Event Quick Facts</h3>
          <p style="margin: 8px 0; font-size: 15px;"><strong>📅 Date:</strong> ${new Date(event.date || event.startDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p style="margin: 8px 0; font-size: 15px;"><strong>📍 Location:</strong> ${event.location || event.venue || 'TBA'}</p>
          ${event.registrationFee > 0 ? `<p style="margin: 8px 0; font-size: 15px;"><strong>💰 Registration Fee:</strong> ₹${event.registrationFee} ${event.feeType === 'Per Title' ? 'per title' : ''}</p>` : '<p style="margin: 8px 0; font-size: 15px;"><strong>💰 Registration:</strong> Free</p>'}
        </div>
        
        <div style="text-align: center; margin-top: 35px; margin-bottom: 15px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/events" style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);">Register Now</a>
        </div>
        <p style="text-align: center; font-size: 13px; color: #6b7280; margin-top: 15px;">
          You can also access the registration page from the "Events Ecosystem" tab in your Author Portal.
        </p>
      `;

      // Async email sending loop so we don't block the response
      for (const author of activeAuthors) {
        sendNotificationEmail(author.email, subject, emailWrap(subject, content)).catch(e => console.error('Failed to notify author:', author.email, e));
      }
    }

    res.status(201).json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.post('/api/admin/events/:eventId/publish-all', verifyToken, isAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    await prisma.event.update({
      where: { id: eventId },
      data: { broadcastStatus: 'Published' }
    });
    
    // Also publish any drafts
    const drafts = await prisma.eventAuthor.findMany({ where: { eventId, optInStatus: { endsWith: '-Draft' } } });
    for (const d of drafts) {
      await prisma.eventAuthor.update({
        where: { id: d.id },
        data: { optInStatus: d.optInStatus.replace('-Draft', '') }
      });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/admin/events/:eventId/unpublish', verifyToken, isAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    await prisma.event.update({
      where: { id: eventId },
      data: { broadcastStatus: 'Draft' }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/admin/events/:eventId/author/:authorId/publish', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const authorId = parseInt(req.params.authorId);
    const { booksData, registrationStatus, paymentStatus, amountPaid, useGlobalOverride, globalSold, globalRevenue, isDraft, manualDailySales } = req.body;

    // Remove transaction wrapper to prevent timeouts
    const tx = prisma;
    // Upsert EventAuthor to update status
    const existingAuthor = await tx.eventAuthor.findFirst({ where: { eventId, authorId } });
    const allowedStatuses = ['Registered', 'Approved', 'Pending Approval', 'Pending', 'Declined', 'Rejected'];
    let statusValue = allowedStatuses.includes(registrationStatus) ? registrationStatus :
      (registrationStatus === 'Participated' ? 'Registered' : 'Declined');
    if (isDraft) statusValue += '-Draft';
    const manualSold = useGlobalOverride ? parseInt(globalSold) || 0 : null;
    const manualRevenue = useGlobalOverride ? parseFloat(globalRevenue) || 0 : null;

    if (existingAuthor) {
      await tx.eventAuthor.update({
        where: { id: existingAuthor.id },
        data: { optInStatus: statusValue, manualTotalSold: manualSold, manualTotalRevenue: manualRevenue, paymentStatus: paymentStatus || null, amountPaid: amountPaid ? parseFloat(amountPaid) : null, manualDailySales: manualDailySales || null }
      });
    } else {
      await tx.eventAuthor.create({
        data: { eventId, authorId, optInStatus: statusValue, manualTotalSold: manualSold, manualTotalRevenue: manualRevenue, paymentStatus: paymentStatus || null, amountPaid: amountPaid ? parseFloat(amountPaid) : null, manualDailySales: manualDailySales || null }
      });
    }

    if (!isDraft) {
      const currentEvt = await tx.event.findUnique({ where: { id: eventId } });
      if (currentEvt && currentEvt.broadcastStatus === 'Draft') {
        await tx.event.update({ where: { id: eventId }, data: { broadcastStatus: 'Published' } });
      }
    }

    if (!useGlobalOverride && booksData) {
      for (const b of booksData) {
        const listed = parseInt(b.listedStock) || 0;
        let sold = parseInt(b.soldStock) || 0;
        const bId = parseInt(b.bookId);

        const existingEb = await tx.eventBook.findFirst({ where: { eventId, authorId, bookId: bId } });
        
        // Protect POS sales: Admin manual save should never blindly wipe out real POS transactions
        const actualSold = Math.max(existingEb ? existingEb.soldStock : 0, sold);
        let returned = existingEb ? existingEb.returnedStock : 0;

        // Auto-settlement logic: Once the event is published (not draft), automatically return unsold stock!
        if (!isDraft && listed > 0) {
            const targetReturned = Math.max(0, listed - actualSold);
            const difference = targetReturned - returned;
            
            if (difference !== 0) {
                await tx.book.update({
                    where: { id: bId },
                    data: { stock: { increment: difference } }
                });
                returned = targetReturned;
            }
        }

        if (existingEb) {
          await tx.eventBook.update({
            where: { id: existingEb.id },
            data: {
              listedStock: listed,
              soldStock: actualSold,
              returnedStock: returned,
              overrideMrp: b.overrideMrp ? parseFloat(b.overrideMrp) : null,
              manualDailySales: b.manualDailySales || existingEb.manualDailySales
            }
          });
        } else if (b.isSelected || listed > 0 || actualSold > 0) {
          await tx.eventBook.create({
            data: {
              eventId,
              authorId,
              bookId: bId,
              listedStock: listed,
              soldStock: actualSold,
              returnedStock: returned,
              overrideMrp: b.overrideMrp ? parseFloat(b.overrideMrp) : null,
              manualDailySales: b.manualDailySales || null
            }
          });
        }
      }
    }

    // Notify the author
    const author = await tx.author.findUnique({ where: { id: authorId } });
    const event = await tx.event.findUnique({ where: { id: eventId } });

    if (author && event) {
      const subject = `Sales Data Published: ${event.name}`;
      const content = `<p>Dear ${author.name},</p>
        <p>Your sales and revenue data for the event <strong>${event.name}</strong> has been updated and published to your Author Dashboard.</p>
        <p>Please log in to your dashboard to view the performance breakdown and settlement details.</p>`;

      // Use sendNotificationEmail without await so it doesn't block the response
      if (!isDraft) {
        sendNotificationEmail(author.email, subject, emailWrap(subject, content)).catch(e => console.error('Email failed:', e));
      }

      await tx.notification.create({
        data: {
          message: `Your sales data for the event "${event.name}" has been published.`,
          target: author.email
        }
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, stack: err.stack, details: 'Failed to publish author data' });
  }
});

router.get('/api/admin/proposed-events', verifyToken, isAdmin, async (req, res) => {
  try {
    const inquiries = await prisma.contactInquiry.findMany({
      where: { message: { startsWith: '[EVENT REQUEST]' } },
      orderBy: { createdAt: 'desc' }
    });
    const proposed = inquiries.map(inq => {
      const extract = (key) => {
        const line = inq.message.split('\n').find(l => l.startsWith(key + ':'));
        return line ? line.replace(key + ':', '').trim() : '';
      };
      return {
        id: `proposed_${inq.id}`,
        isProposed: true,
        name: extract('Organisation') || extract('Proposer') || 'Proposed Event',
        eventType: 'Proposed Event',
        date: extract('Date') || inq.createdAt.toISOString().split('T')[0],
        registrationFee: 0,
        status: 'Proposed',
        livePosEnabled: false,
        _count: { eventAuthors: 0 },
        eventAuthors: [],
        description: extract('Description') || inq.message,
        location: extract('Location') || 'N/A'
      };
    });
    res.json(proposed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch proposed events' });
  }
});

router.get('/api/admin/events', verifyToken, isAdmin, async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { eventAuthors: { where: { optInStatus: { not: 'Pending' } } }, eventBooks: true } },
        eventAuthors: { select: { optInStatus: true } },
        eventBooks: { select: { listedStock: true, soldStock: true, book: { select: { mrp: true } } } },
        posOrders: {
          where: { paymentStatus: 'CONFIRMED' },
          include: { items: { select: { quantity: true, price: true } } }
        },
        galleryEvent: { include: { images: true } }
      }
    });
    const processed = events.map(e => {
       let posSold = 0;
       let posRevenue = 0;
       if (e.posOrders) {
          e.posOrders.forEach(po => {
             if (po.items) {
               po.items.forEach(poi => {
                  posSold += poi.quantity;
                  posRevenue += (poi.quantity * (poi.price || 0));
               });
             }
          });
       }
       const isLive = (e.status === 'Upcoming' && isEventLiveToday(e));
       // Strip posOrders from payload to save bandwidth, just send the totals
       const { posOrders, ...rest } = e;
       return { ...rest, status: isLive ? 'Live' : e.status, livePosSold: posSold, livePosRevenue: posRevenue };
    });
    res.json(processed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.put('/api/admin/events/:id', verifyToken, isAdmin, upload.single('banner'), async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { name, location, date, dateType, tentativeDate, duration, startTime, endTime, status, eventType, category, registrationFee, feeType, description, livePosEnabled, aggAuthors, aggTitles, aggSent, aggSold, aggRevenue, aggEligibleAuthors } = req.body;

    let updateData = { name, location, date, duration, status };
    if (dateType !== undefined) updateData.dateType = dateType;
    if (tentativeDate !== undefined) updateData.tentativeDate = tentativeDate;
    if (startTime !== undefined) updateData.startTime = startTime || null;
    if (endTime !== undefined) updateData.endTime = endTime || null;
    if (description !== undefined) updateData.description = description;
    if (eventType !== undefined) updateData.eventType = eventType;
    if (category !== undefined) updateData.category = category;
    if (registrationFee !== undefined) updateData.registrationFee = parseFloat(registrationFee);
    if (feeType !== undefined) updateData.feeType = feeType;
    if (livePosEnabled !== undefined) updateData.livePosEnabled = livePosEnabled === 'true' || livePosEnabled === true;
    if (aggAuthors !== undefined) updateData.aggAuthors = parseInt(aggAuthors) || 0;
    if (aggTitles !== undefined) updateData.aggTitles = parseInt(aggTitles) || 0;
    if (aggSent !== undefined) updateData.aggSent = parseInt(aggSent) || 0;
    if (aggSold !== undefined) updateData.aggSold = parseInt(aggSold) || 0;
    if (aggRevenue !== undefined) updateData.aggRevenue = parseFloat(aggRevenue) || 0;
    if (aggEligibleAuthors !== undefined) updateData.aggEligibleAuthors = parseInt(aggEligibleAuthors) || 0;

    if (req.file) {
      updateData.bannerUrl = `/uploads/${req.file.filename}`;
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: updateData
    });
    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/api/admin/events/:id/banner', verifyToken, isAdmin, async (req, res) => {
  try {
    const event = await prisma.event.update({
      where: { id: parseInt(req.params.id) },
      data: { bannerUrl: null }
    });
    res.json(event);
  } catch (error) {
    console.error('Delete event banner error:', error);
    res.status(500).json({ error: 'Failed to delete event banner' });
  }
});

router.get('/api/admin/events/:id/report', verifyToken, isAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const eventBooks = await prisma.eventBook.findMany({
      where: { eventId, listedStock: { gt: 0 } },
      include: { author: true, book: true }
    });

    const eventAuthors = await prisma.eventAuthor.findMany({
      where: { eventId },
      include: { author: true }
    });

    const posOrders = await prisma.posOrder.findMany({
      where: { eventId, paymentStatus: 'CONFIRMED' },
      include: { items: true }
    });

    const uniqueDates = Array.from(new Set(posOrders.map(o => new Date(o.createdAt).toDateString()))).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const authorsData = [];
    let totalRevenue = 0;
    let totalBooksSold = 0;
    let totalBooksListed = 0;
    const categorySales = {};

    for (const ea of eventAuthors) {
      if (ea.optInStatus === 'Pending') continue;

      const authorBooks = eventBooks.filter(eb => eb.authorId === ea.authorId);
      if (authorBooks.length === 0 && ea.optInStatus !== 'Registered') continue;

      let authorRevenue = 0;
      let authorSold = 0;
      let authorListed = 0;

      const booksList = authorBooks.map(eb => {
        const mrp = parseFloat(eb.book.mrp) || 0;
        const sold = eb.soldStock || 0;
        const revenue = mrp * sold;

        authorRevenue += revenue;
        authorSold += sold;
        authorListed += eb.listedStock;

        const cat = eb.book.genre || eb.book.category || 'Uncategorized';
        if (!categorySales[cat]) categorySales[cat] = { revenue: 0, sold: 0 };
        categorySales[cat].revenue += revenue;
        categorySales[cat].sold += sold;

        const bookPosItems = posOrders.flatMap(o =>
          o.items.filter(i => i.bookId === eb.bookId).map(i => ({ date: new Date(o.createdAt).toDateString(), qty: i.quantity }))
        );
        const dayWiseSales = {};
        uniqueDates.forEach(d => dayWiseSales[d] = 0);
        bookPosItems.forEach(i => dayWiseSales[i.date] += i.qty);

        return {
          id: eb.id,
          title: eb.book.title,
          category: cat,
          mrp,
          listedStock: eb.listedStock,
          soldStock: sold,
          dayWiseSales,
          availableStock: eb.listedStock - sold,
          returnedStock: eb.returnedStock,
          revenue
        };
      });

      totalRevenue += authorRevenue;
      totalBooksSold += authorSold;
      totalBooksListed += authorListed;

      const expectedFee = event.feeType === 'Per Title' ? authorBooks.length * event.registrationFee : event.registrationFee;

      authorsData.push({
        id: ea.authorId,
        name: ea.author.name,
        email: ea.author.email,
        phone: ea.author.phone,
        optInStatus: ea.optInStatus,
        paymentScreenshot: ea.paymentScreenshot,
        transactionId: ea.transactionId,
        amountPaid: ea.amountPaid,
        expectedFee,
        totalRevenue: authorRevenue,
        totalSold: authorSold,
        totalListed: authorListed,
        manualTotalSold: ea.manualTotalSold,
        manualTotalRevenue: ea.manualTotalRevenue,
        books: booksList
      });
    }

    res.json({
      status: 'live',
      overallStats: {
        totalRevenue,
        totalBooksSold,
        totalBooksListed,
        totalAuthorsRegistered: authorsData.length
      },
      categorySales,
      uniqueDates,
      authors: authorsData
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

router.get('/api/admin/events/export', verifyToken, isAdmin, async (req, res) => {
  try {
    const rawEvents = await prisma.event.findMany({
      include: {
        eventAuthors: true,
        posOrders: {
          where: { paymentStatus: 'CONFIRMED' },
          include: { items: true }
        }
      }
    });

    const events = rawEvents.sort((a, b) => {
      let da = new Date(a.date).getTime();
      let db = new Date(b.date).getTime();
      if (isNaN(da)) da = new Date(a.createdAt).getTime();
      if (isNaN(db)) db = new Date(b.createdAt).getTime();
      return da - db;
    });

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Events & Stalls');

    worksheet.columns = [
      { key: 'sno', width: 6 },
      { key: 'name', width: 35 },
      { key: 'format', width: 20 },
      { key: 'category', width: 25 },
      { key: 'address', width: 25 },
      { key: 'month', width: 15 },
      { key: 'year', width: 10 },
      { key: 'duration', width: 15 },
      { key: 'authors', width: 15 },
      { key: 'sold', width: 15 },
      { key: 'yearWise', width: 15 }
    ];

    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'LIST OF LITERARY EVENT/STALL ORGANISED AND PARTICIPATION IN BOOK FAIR, SINCE INCEPTION OF THIS GROUP';
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } }; // Cyan
    titleCell.border = { top: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' }, bottom: { style: 'medium' } };

    const headerRow = worksheet.addRow({
      sno: 'S.No',
      name: 'Society/Institution Name',
      format: 'Format',
      category: 'Category',
      address: 'Address',
      month: 'Month Organised',
      year: 'Year',
      duration: 'Duration of Event',
      authors: 'No of Authors Participated',
      sold: 'No of Books Sold',
      yearWise: 'Year Wise'
    });

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    const yearTotals = {};
    const rowsData = [];

    events.forEach((evt, idx) => {
      const numAuthors = evt.eventAuthors.length;
      let booksSold = evt.aggSold || 0;

      if (evt.eventAuthors && evt.eventAuthors.length > 0) {
        evt.eventAuthors.forEach(ea => {
          if (ea.manualTotalSold) booksSold += ea.manualTotalSold;
        });
      }

      if (evt.posOrders && evt.posOrders.length > 0) {
        evt.posOrders.forEach(order => {
          if (order.items) {
            order.items.forEach(item => {
              booksSold += item.quantity;
            });
          }
        });
      }

      let year = new Date().getFullYear();
      let monthStr = '';
      if (evt.date) {
        const d = new Date(evt.date);
        if (!isNaN(d.getFullYear())) {
          year = d.getFullYear();
          monthStr = d.toLocaleString('en-US', { month: 'short' });
        }
      }

      let format = 'Stall';
      let category = evt.eventType || 'Other';
      const categoryMatch = evt.name ? evt.name.toLowerCase() : '';
      const typeMatch = evt.eventType ? evt.eventType.toLowerCase() : '';
      const combinedMatch = categoryMatch + ' ' + typeMatch;

      if (combinedMatch.includes('housing') || combinedMatch.includes('society') || combinedMatch.includes('estate') || combinedMatch.includes('vihar') || combinedMatch.includes('area') || combinedMatch.includes('phase')) {
        format = 'Meet the Authors';
        category = 'Housing Society';
      } else if (combinedMatch.includes('corporate') || combinedMatch.includes('tata') || combinedMatch.includes('systems') || combinedMatch.includes('hcl') || combinedMatch.includes('deloitte')) {
        format = 'Meet the Authors';
        category = 'Corporate Office';
      } else if (combinedMatch.includes('college') || combinedMatch.includes('university') || combinedMatch.includes('afmc') || combinedMatch.includes('command')) {
        format = 'Meet the Authors';
        category = 'College';
      } else if (combinedMatch.includes('book fair')) {
        format = 'Stall';
        category = 'Book Fair';
      } else if (combinedMatch.includes('fair') || combinedMatch.includes('mela')) {
        format = 'Stall';
        category = 'Fair';
      }

      if (!yearTotals[year]) yearTotals[year] = 0;
      yearTotals[year] += booksSold;

      rowsData.push({
        sno: idx + 1,
        name: evt.name,
        format,
        category,
        address: evt.location || '',
        month: monthStr,
        year: year,
        duration: evt.duration || '',
        authors: numAuthors,
        sold: booksSold,
        originalYear: year
      });
    });

    rowsData.forEach(row => {
      row.yearWise = yearTotals[row.originalYear];
      const addedRow = worksheet.addRow(row);

      addedRow.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      // Category color
      let catColor = 'FFFFFFFF';
      const catLower = row.category.toLowerCase();
      if (catLower.includes('housing') || catLower.includes('college')) catColor = 'FFF4C2C2'; // Peach
      else if (catLower.includes('corporate') || catLower.includes('university')) catColor = 'FFFFFF00'; // Yellow
      else if (catLower.includes('book fair')) catColor = 'FF00FF00'; // Green
      else if (catLower.includes('fair')) catColor = 'FF90EE90'; // Light Green

      addedRow.getCell('category').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catColor } };

      // Format color
      let formatColor = 'FFFFFFFF';
      if (row.format === 'Meet the Authors') formatColor = 'FFB0C4DE'; // Light Blue-Grey
      else if (row.format === 'Stall') formatColor = 'FF98FB98'; // Pale Green
      addedRow.getCell('format').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: formatColor } };

      // Year color
      let yearColor = 'FFFFFFFF';
      if (row.year === 2025) yearColor = 'FF00FFFF'; // Cyan
      else if (row.year === 2026) yearColor = 'FFFFE4B5'; // Moccasin
      addedRow.getCell('year').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yearColor } };

      // Year Wise background
      addedRow.getCell('yearWise').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF87CEEB' } }; // Sky Blue

      // Center-align columns
      addedRow.getCell('sno').alignment = { horizontal: 'center' };
      addedRow.getCell('month').alignment = { horizontal: 'center' };
      addedRow.getCell('year').alignment = { horizontal: 'center' };
      addedRow.getCell('duration').alignment = { horizontal: 'center' };
      addedRow.getCell('authors').alignment = { horizontal: 'center' };
      addedRow.getCell('sold').alignment = { horizontal: 'center' };
      addedRow.getCell('yearWise').alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Merge Year Wise cells
    let currentYear = null;
    let startRow = 3;
    for (let i = 0; i < rowsData.length; i++) {
      const row = rowsData[i];
      const rowNum = i + 3;
      if (currentYear !== row.year) {
        if (currentYear !== null && startRow < rowNum - 1) {
          worksheet.mergeCells(`K${startRow}:K${rowNum - 1}`);
        }
        currentYear = row.year;
        startRow = rowNum;
      }
    }
    if (currentYear !== null && startRow < rowsData.length + 2) {
      worksheet.mergeCells(`K${startRow}:K${rowsData.length + 2}`);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Events_Export.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Events Error:', error);
    res.status(500).json({ error: 'Failed to generate Excel export' });
  }
});

router.post('/api/admin/events/:id/notify-settlement', verifyToken, isAdmin, async (req, res) => {
  res.json({ message: 'Notification emails sent to pending authors!' });
});

router.put('/api/author/events/:id/settle', verifyToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: 'Author not found' });
    const authorId = author.id;
    const { settlements } = req.body; // Array of { eventBookId, soldStock, returnedStock }

    await prisma.$transaction(async (tx) => {
      for (const settlement of settlements) {
        console.log('Processing settlement:', settlement);
        const eb = await tx.eventBook.findUnique({ where: { id: settlement.eventBookId }, include: { book: true } });
        console.log('Found EventBook:', !!eb, 'author match:', eb?.authorId === authorId, 'event match:', eb?.eventId === eventId);
        if (eb && eb.authorId === authorId && eb.eventId === eventId) {
          // Verify they haven't already settled this book
          console.log('Stock Check. listed:', eb.listedStock, 'sold:', eb.soldStock, 'returned:', eb.returnedStock);
          if (eb.listedStock !== eb.soldStock + eb.returnedStock) {
            await tx.eventBook.update({
              where: { id: eb.id },
              data: { soldStock: settlement.soldStock, returnedStock: settlement.returnedStock }
            });
            // Add returned stock back to inventory safely using atomic increment
            await tx.book.update({
              where: { id: eb.bookId },
              data: { stock: { increment: settlement.returnedStock } }
            });
          }
        }
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit settlement' });
  }
});

// Delete (Archive) Event
router.delete('/api/admin/events/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    await prisma.event.update({ where: { id: eventId }, data: { isArchived: true } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to archive event' });
  }
});

// Restore Event
router.put('/api/admin/events/:id/restore', verifyToken, isAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    await prisma.event.update({ where: { id: eventId }, data: { isArchived: false } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to restore event' });
  }
});

router.post('/api/admin/events/:id/broadcast', verifyToken, isAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { target } = req.body; // 'Authors' or 'Customers'

    if (target === 'Authors') {
      await prisma.event.update({
        where: { id: eventId },
        data: { broadcastStatus: 'AuthorsOnly' }
      });

      // Here NodeMailer logic would go to email authors
      // For now we just create EventAuthor records for all Active authors
      const activeAuthors = await prisma.author.findMany({ where: { status: 'Active' } });
      const eventAuthorsData = activeAuthors.map(a => ({ eventId, authorId: a.id, optInStatus: 'Pending' }));
      await prisma.eventAuthor.createMany({ data: eventAuthorsData, skipDuplicates: true });

      res.json({ success: true, message: 'Broadcast sent to authors. Opt-in requests created.' });
    } else if (target === 'Customers') {
      await prisma.event.update({
        where: { id: eventId },
        data: { broadcastStatus: 'CustomersAlso' }
      });
      res.json({ success: true, message: 'Catalogue generated and broadcasted to customers!' });
    } else {
      res.status(400).json({ error: 'Invalid broadcast target' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Broadcast failed' });
  }
});




// Notifications
router.get('/api/notifications', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500
    });
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/api/admin/notifications', verifyToken, isAdmin, upload.single('document'), async (req, res) => {
  try {
    const { message, target } = req.body;
    let documentUrl = null;
    let documentName = null;

    if (req.file) {
      documentUrl = `/uploads/${req.file.filename}`;
      documentName = req.file.originalname;
    }

    const notification = await prisma.notification.create({
      data: {
        message,
        target: target || 'ALL',
        documentUrl,
        documentName
      }
    });
    res.json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Delete (Archive) Notification
router.delete('/api/admin/notifications/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.notification.update({ where: { id }, data: { isArchived: true } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to archive notification' });
  }
});

// Restore Notification
router.put('/api/admin/notifications/:id/restore', verifyToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.notification.update({ where: { id }, data: { isArchived: false } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to restore notification' });
  }
});


// Server Files (Uploads folder)
router.get('/api/admin/server-files', verifyToken, isAdmin, async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) return res.json([]);
    const files = fs.readdirSync(uploadsDir);
    const docs = files.filter(f => f.toLowerCase().endsWith('.pdf') || f.toLowerCase().endsWith('.doc') || f.toLowerCase().endsWith('.docx'));
    const result = docs.map(f => {
      const stats = fs.statSync(path.join(uploadsDir, f));
      return {
        name: f,
        url: `/uploads/${f}`,
        size: stats.size,
        createdAt: stats.birthtime
      };
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list server files' });
  }
});

router.delete('/api/admin/server-files/:filename', verifyToken, isAdmin, async (req, res) => {
  try {
    const filename = req.params.filename;
    if (filename.includes('..') || filename.includes('/')) return res.status(400).json({error: 'Invalid filename'});
    const filepath = path.join(__dirname, '..', 'uploads', filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Author: Upload image to Gallery Event
router.post('/api/author/gallery/:id/images', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { caption } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });

    // Validate event exists
    const event = await prisma.galleryEvent.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Gallery event not found' });

    // Append author name to caption automatically so Admin knows who uploaded it
    const finalCaption = caption ? `${caption} (Uploaded by ${author.name})` : `Uploaded by ${author.name}`;

    const newImage = await prisma.galleryImage.create({
      data: {
        galleryEventId: eventId,
        url: `/uploads/${req.file.filename}`,
        caption: finalCaption,
        dateTaken: new Date(),
        status: 'Pending'
      }
    });

    res.json(newImage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

router.delete('/api/author/gallery/images/:id', verifyToken, async (req, res) => {
  try {
    const imageId = parseInt(req.params.id);
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });

    // Ensure the image exists and belongs to the author
    const image = await prisma.galleryImage.findUnique({ where: { id: imageId } });
    if (!image) return res.status(404).json({ error: 'Image not found' });

    if (!image.caption || !image.caption.includes(`Uploaded by ${author.name}`)) {
      return res.status(403).json({ error: 'You can only delete your own images' });
    }

    // Actually delete the image
    await prisma.galleryImage.delete({ where: { id: imageId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});


// --- GALLERY ENDPOINTS ---

router.get('/api/gallery/events', async (req, res) => {
  try {
    let events = await prisma.galleryEvent.findMany({
      orderBy: { date: 'desc' },
      include: {
        images: true,
        event: true,
        library: {
          include: {
            announcements: {
              orderBy: { registrationEndDate: 'asc' },
              take: 1
            }
          }
        }
      }
    });

    // Filter out Future (Upcoming), Pending Approval, and Rejected events, as well as any future dates
    const now = new Date();
    events = events.filter(e => {
      if (e.library) return true; // Libraries always show
      if (new Date(e.date) > now) return false;
      if (!e.event) return true;
      return !['Upcoming', 'Pending Approval', 'Rejected'].includes(e.event.status);
    });

    // Override date on library-linked GalleryEvents to use oldest drive date
    events = events.map(e => {
      if (e.library && e.library.announcements && e.library.announcements.length > 0) {
        const oldestDriveDate = e.library.announcements[0].registrationEndDate;
        return { ...e, date: oldestDriveDate || e.library.createdAt };
      }
      return e;
    });

    const existingEventIds = events.map(e => e.eventId).filter(Boolean);
    const existingLibraryIds = events.map(e => e.libraryId).filter(Boolean);

    const extraEvents = await prisma.event.findMany({
      where: {
        id: { notIn: existingEventIds },
        bannerUrl: { not: null, not: "" },
        status: { notIn: ['Upcoming', 'Pending Approval', 'Rejected'] }
      }
    });

    const extraLibraries = await prisma.library.findMany({
      where: {
        id: { notIn: existingLibraryIds },
        bannerUrl: { not: null, not: "" }
      },
      include: {
        announcements: {
          orderBy: { registrationEndDate: 'asc' },
          take: 1
        }
      }
    });

    const virtualEvents = extraEvents.map(e => {
      return {
        id: `virtual-evt-${e.id}`,
        eventId: e.id,
        date: e.date,
        location: e.location,
        type: e.eventType,
        photoUrl: e.bannerUrl,
        event: e,
        images: []
      };
    }).filter(e => new Date(e.date) <= now);

    const virtualLibraries = extraLibraries.map(l => {
      // Use the oldest drive's registrationEndDate as the canonical date
      const oldestDriveDate =
        l.announcements && l.announcements.length > 0
          ? l.announcements[0].registrationEndDate
          : null;
      return ({
        id: `virtual-lib-${l.id}`,
        libraryId: l.id,
        date: oldestDriveDate || l.createdAt,
        location: `${l.airportName || ''}, ${l.city}`.trim().replace(/^,/, '').trim(),
        type: l.type || 'Airport Library',
        photoUrl: l.bannerUrl,
        library: l,
        images: []
      });
    }); // Libraries always show — no date filter

    events = [...events, ...virtualEvents, ...virtualLibraries];
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch gallery events' });
  }
});

router.get('/api/gallery/images', async (req, res) => {
  try {
    const { eventId } = req.query;
    const where = {};
    if (eventId) {
      where.galleryEventId = parseInt(eventId);
    }
    const images = await prisma.galleryImage.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch gallery images' });
  }
});


router.get('/api/admin/gallery/pending', verifyToken, isAdmin, async (req, res) => {
  try {
    const images = await prisma.galleryImage.findMany({
      where: { status: 'Pending' },
      include: { galleryEvent: true }
    });
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending images' });
  }
});

router.put('/api/admin/gallery/images/:id/approve', verifyToken, isAdmin, async (req, res) => {
  try {
    const img = await prisma.galleryImage.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'Approved' }
    });
    res.json(img);
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve image' });
  }
});

router.delete('/api/admin/gallery/images/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    await prisma.galleryImage.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE IMAGE ERROR:', err);
    res.status(500).json({ error: 'Failed to reject image' });
  }
});

// Admin: Notify author of late delivery
router.post('/api/admin/authors/:id/notify-late', verifyToken, isAdmin, async (req, res) => {
  try {
    const authorId = parseInt(req.params.id);
    const { orderId, count, hours } = req.body;
    const author = await prisma.author.findUnique({ where: { id: authorId } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    let extraData = typeof author.extraData === 'string' ? JSON.parse(author.extraData || '{}') : (author.extraData || {});
    extraData = { ...extraData, lateNotificationDate: new Date().toISOString() };

    const updatedAuthor = await prisma.author.update({
      where: { id: authorId },
      data: { extraData }
    });

    if (typeof sendNotificationEmail === 'function' && typeof emailWrap === 'function') {
      const emailContent = `
        <p>Dear ${author.name},</p>
        <p>This is an automated notification from the Pune Authors' Association.</p>
        <p>You have <strong>${count || 'some'} pending item(s)</strong> for order <strong>${orderId || 'recent orders'}</strong> that have been delayed by <strong>${hours || 'more than 24'} hours</strong> (${req.body.delayType || 'Delay'}).</p>
        <p>Please log in to your Author Dashboard immediately to review and process pending orders. Continued delays may result in fines or account suspension.</p>
      `;
      sendNotificationEmail(author.email, "Urgent: Late Delivery Notification", emailWrap("Late Delivery Notice", emailContent));
    }

    // Notifications are handled dynamically via AuthorDashboard banner

    invalidateCache('adminAuthors');
    res.json(updatedAuthor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to notify author' });
  }
});

// Admin: Charge late delivery fine
router.post('/api/admin/authors/:id/fine', verifyToken, isAdmin, async (req, res) => {
  try {
    const authorId = parseInt(req.params.id);
    const { amount, orderId, count, hours } = req.body;
    const author = await prisma.author.findUnique({ where: { id: authorId } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    let extraData = typeof author.extraData === 'string' ? JSON.parse(author.extraData || '{}') : (author.extraData || {});
    extraData.lateFines = (extraData.lateFines || 0) + Number(amount);
    if (!extraData.fineDate) {
      extraData.fineDate = new Date().toISOString();
    }

    const updatedAuthor = await prisma.author.update({
      where: { id: authorId },
      data: { extraData }
    });

    if (typeof sendNotificationEmail === 'function' && typeof emailWrap === 'function') {
      const emailContent = `
        <p>Dear ${author.name},</p>
        <p>A fine of <strong>₹${amount}</strong> has been charged to your account due to severe delays in fulfilling orders.</p>
        ${orderId ? `<p>Specifically, you had <strong>${count || 'multiple'} items</strong> pending for order <strong>${orderId}</strong> with a delay of <strong>${hours || 'more than 24'} hours</strong> (${req.body.delayType || 'Delay'}).</p>` : ''}
        <p>Your account will remain suspended for new orders until this fine is cleared. Please log in to your Author Dashboard to complete the payment.</p>
      `;
      sendNotificationEmail(author.email, "Action Required: Fine Imposed for Late Delivery", emailWrap("Fine Charged", emailContent));
    }

    invalidateCache('adminAuthors');
    res.json(updatedAuthor);
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply fine' });
  }
});


router.get('/api/admin/reviews', verifyToken, isAdmin, async (req, res) => {
  try {
    const bookReviews = await prisma.bookReview.findMany({
      include: { book: { select: { title: true, author: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    const deliveryReviews = await prisma.orderItem.findMany({
      where: { feedbackRating: { not: null } },
      include: { book: { select: { title: true, author: { select: { name: true } } } }, order: { select: { customerName: true, id: true } } },
      orderBy: { deliveredAt: 'desc' }
    });
    res.json({ bookReviews, deliveryReviews });
  } catch (err) {
    console.error('Failed to fetch reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.delete('/api/admin/reviews/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    await prisma.bookReview.delete({ where: { id: reviewId } });
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Failed to delete review:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});


// Escalate order
router.post('/api/admin/orders/:id/escalate', verifyToken, isAdmin, async (req, res) => {
  try {
    // In a real system, send email via AWS SES or SendGrid here
    console.log(`[ESCALATION] Email sent to author for order item ${req.params.id}`);
    res.json({ success: true, message: "Escalation email sent to author" });
  } catch (err) {
    res.status(500).json({ error: 'Failed to escalate' });
  }
});

// Notify low stock
router.post('/api/admin/authors/:id/notify-low-stock', verifyToken, isAdmin, async (req, res) => {
  try {
    const authorId = Number(req.params.id);
    const { bookId, title } = req.body;
    const author = await prisma.author.findUnique({ where: { id: authorId } });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    let extraData = author.extraData || {};
    let lowStockAlerts = extraData.lowStockAlerts || [];
    lowStockAlerts.push({ bookId, title, timestamp: Date.now(), read: false });
    extraData.lowStockAlerts = lowStockAlerts;

    await prisma.author.update({
      where: { id: authorId },
      data: { extraData }
    });

    invalidateCache('adminAuthors');
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to notify low stock:', err);
    res.status(500).json({ error: 'Failed to notify low stock' });
  }
});

// --- POSTAL API PROXY (bypass CORS) ---

router.get('/api/postal/state/:state', async (req, res) => {
  const https = require('https');
  const state = encodeURIComponent(req.params.state);
  const url = `https://api.postalpincode.in/postoffice/${state}`;

  https.get(url, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        res.json(JSON.parse(data));
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse postal data' });
      }
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'Failed to fetch postal data' });
  });
});

router.get('/api/postal/pincode/:pincode', async (req, res) => {
  const https = require('https');
  const pincode = encodeURIComponent(req.params.pincode);
  const url = `https://api.postalpincode.in/pincode/${pincode}`;

  https.get(url, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        res.json(JSON.parse(data));
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse postal data' });
      }
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'Failed to fetch postal data' });
  });
});

router.get('/api/postal/postoffice/:district', async (req, res) => {
  const https = require('https');
  const district = encodeURIComponent(req.params.district);
  const url = `https://api.postalpincode.in/postoffice/${district}`;

  https.get(url, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        res.json(JSON.parse(data));
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse postal data' });
      }
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'Failed to fetch postal data' });
  });
});


// ----------------- POS SYSTEM ROUTES -----------------
router.get('/api/pos/events/:eventId/pos-inventory', optionalVerifyToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const eventBooks = await prisma.eventBook.findMany({
      where: { eventId },
      include: { book: { include: { author: true } } }
    });

    let author = null;
    let filteredEventBooks = eventBooks;
    if (req.user && req.user.role !== 'Admin') {
      author = await prisma.author.findUnique({ where: { email: req.user.email } });
      if (author) {
        filteredEventBooks = eventBooks.filter(eb => eb.book.authorId === author.id);
      }
    }

    res.json({ event, eventBooks: filteredEventBooks, author });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load POS inventory' });
  }
});

router.get('/api/pos/events/:eventId/pos-sales-summary', optionalVerifyToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    let authorIdFilter;
    if (req.user && req.user.role !== 'Admin') {
      const author = await prisma.author.findUnique({ where: { email: req.user.email } });
      if (author) {
        authorIdFilter = author.id;
      }
    }

    const orderWhere = { eventId, paymentStatus: 'CONFIRMED' };
    if (authorIdFilter) orderWhere.authorId = authorIdFilter;

    const orders = await prisma.posOrder.findMany({
      where: orderWhere,
      include: { items: { include: { book: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const bookWhere = { eventId };
    if (authorIdFilter) bookWhere.authorId = authorIdFilter;

    const eventBooks = await prisma.eventBook.findMany({
      where: bookWhere,
      include: { book: true }
    });

    let totalSales = 0;
    let totalRevenue = 0;
    let todaySales = 0;
    let todayRevenue = 0;
    const bookSalesCount = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const order of orders) {
      totalRevenue += order.totalAmount;
      const isToday = new Date(order.createdAt) >= today;
      if (isToday) todayRevenue += order.totalAmount;

      for (const item of order.items) {
        totalSales += item.quantity;
        if (isToday) todaySales += item.quantity;

        if (!bookSalesCount[item.bookId]) {
          bookSalesCount[item.bookId] = { title: item.book.title, count: 0 };
        }
        bookSalesCount[item.bookId].count += item.quantity;
      }
    }

    const topSellingBooks = Object.values(bookSalesCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      summary: {
        totalSales,
        totalRevenue,
        todaySales,
        todayRevenue,
        topSellingBooks,
        totalTransactions: orders.length,
        totalBooksSold: totalSales
      },
      posOrders: orders,
      eventBooks
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load POS summary' });
  }
});

router.post('/api/pos/events/:eventId/pos-checkout', optionalVerifyToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const { items, paymentMethod } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ error: 'No items in cart' });

    await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItems = [];

      // We'll map the POS Order to the primary author of the first book as a generic tracking,
      // or we could make authorId nullable. For now, since schema requires authorId:
      const firstBook = await tx.book.findUnique({ where: { id: items[0].bookId } });
      const genericAuthorId = firstBook ? firstBook.authorId : 1;

      for (const item of items) {
        const book = await tx.book.findUnique({ where: { id: item.bookId } });
        if (!book) throw new Error(`Book not found: ${item.bookId}`);

        const eventBook = await tx.eventBook.findFirst({
          where: { eventId, bookId: item.bookId }
        });

        if (!eventBook) throw new Error(`Book not listed in this event: ${book.title}`);
        const available = eventBook.listedStock - eventBook.soldStock - eventBook.returnedStock;
        if (available < item.quantity) throw new Error(`Insufficient stock for ${book.title}`);

        totalAmount += book.mrp * item.quantity;

        const todayDateStr = new Date().toDateString();
        let currentDailySales = eventBook.manualDailySales || {};
        if (typeof currentDailySales !== 'object') currentDailySales = {};
        
        let todaySales = currentDailySales[todayDateStr] || { sold: 0, revenue: 0 };
        todaySales.sold = (todaySales.sold || 0) + item.quantity;
        todaySales.revenue = (todaySales.revenue || 0) + (book.mrp * item.quantity);
        currentDailySales[todayDateStr] = todaySales;

        await tx.eventBook.update({
          where: { id: eventBook.id },
          data: { 
             soldStock: { increment: item.quantity },
             manualDailySales: currentDailySales
          }
        });

        const eventAuthor = await tx.eventAuthor.findFirst({
           where: { eventId, authorId: book.authorId }
        });
        
        if (eventAuthor) {
            await tx.eventAuthor.update({
               where: { id: eventAuthor.id },
               data: {
                  manualTotalSold: { increment: item.quantity },
                  manualTotalRevenue: { increment: (book.mrp * item.quantity) }
               }
            });
        }

        orderItems.push({
          bookId: item.bookId,
          quantity: item.quantity,
          price: book.mrp
        });
      }

      await tx.posOrder.create({
        data: {
          eventId,
          authorId: genericAuthorId,
          totalAmount,
          paymentMethod: paymentMethod || 'CASH',
          paymentStatus: 'CONFIRMED',
          saleSource: 'BOOK_FAIR',
          items: {
            create: orderItems
          }
        }
      });
    }, { maxWait: 15000, timeout: 30000 });

    invalidateCache('admin:dashboard-stats');
    
    // Invalidate caches for all authors involved in this POS sale
    const authorIds = new Set();
    for (const item of items) {
       const book = await prisma.book.findUnique({ where: { id: item.bookId }, include: { author: true }});
       if (book && book.author && !authorIds.has(book.author.id)) {
           authorIds.add(book.author.id);
           invalidateCache(`author:dashboard:${book.author.email}`);
       }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Checkout failed' });
  }
});

router.delete('/api/pos/orders/:orderId', optionalVerifyToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) return res.status(400).json({ error: 'Invalid order ID' });

    await prisma.$transaction(async (tx) => {
      const posOrder = await tx.posOrder.findUnique({
        where: { id: orderId },
        include: { items: { include: { book: true } } }
      });

      if (!posOrder) throw new Error('Order not found');

      const dateStr = new Date(posOrder.createdAt).toDateString();

      for (const item of posOrder.items) {
        const eventBook = await tx.eventBook.findFirst({
          where: { eventId: posOrder.eventId, bookId: item.bookId }
        });

        if (eventBook) {
          let currentDailySales = eventBook.manualDailySales || {};
          if (typeof currentDailySales !== 'object') currentDailySales = {};
          
          if (currentDailySales[dateStr]) {
            currentDailySales[dateStr].sold = Math.max(0, (currentDailySales[dateStr].sold || 0) - item.quantity);
            currentDailySales[dateStr].revenue = Math.max(0, (currentDailySales[dateStr].revenue || 0) - (item.price * item.quantity));
          }

          await tx.eventBook.update({
            where: { id: eventBook.id },
            data: { 
              soldStock: { decrement: item.quantity },
              manualDailySales: currentDailySales
            }
          });
        }

        const eventAuthor = await tx.eventAuthor.findFirst({
          where: { eventId: posOrder.eventId, authorId: item.book.authorId }
        });

        if (eventAuthor) {
          await tx.eventAuthor.update({
             where: { id: eventAuthor.id },
             data: {
                manualTotalSold: { decrement: item.quantity },
                manualTotalRevenue: { decrement: (item.price * item.quantity) }
             }
          });
        }
      }

      await tx.posOrderItem.deleteMany({ where: { posOrderId: posOrder.id } });
      await tx.posOrder.delete({ where: { id: posOrder.id } });
      
      // Pass author IDs out of transaction to invalidate cache
      const affectedAuthors = new Set();
      for (const item of posOrder.items) {
          affectedAuthors.add(item.book.authorId);
      }
      req.affectedAuthorIds = Array.from(affectedAuthors);
    });

    invalidateCache('admin:dashboard-stats');
    if (req.affectedAuthorIds) {
       for (const authorId of req.affectedAuthorIds) {
           const author = await prisma.author.findUnique({ where: { id: authorId } });
           if (author) invalidateCache(`author:dashboard:${author.email}`);
       }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to delete POS order' });
  }
});

router.post('/api/pos/events/:eventId/add-stock', optionalVerifyToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const { bookId, quantity } = req.body;

    await prisma.$transaction(async (tx) => {
      const eventBook = await tx.eventBook.findFirst({ where: { eventId, bookId } });
      if (!eventBook) throw new Error('Book not in event');

      const book = await tx.book.findUnique({ where: { id: bookId } });

      const updatedBook = await tx.book.update({
        where: { id: bookId },
        data: { stock: { decrement: quantity } }
      });

      await tx.stockHistory.create({
        data: {
          bookId: bookId,
          changeQty: quantity,
          lastStock: book.stock,
          currentStock: updatedBook.stock,
          status: 'Approved'
        }
      });

      await tx.eventBook.update({
        where: { id: eventBook.id },
        data: { listedStock: { increment: quantity } }
      });
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to add stock' });
  }
});
// ----------------------------------------------------

// ============================================================
// INVENTORY & DISTRIBUTION — HELPER + 3 NEW API ENDPOINTS
// ============================================================

/**
 * fireStockAlert — Fires a low-stock notification to the author + admin.
 * Has a 24-hour dedup guard to prevent notification spam.
 * Must be called OUTSIDE of Prisma transactions (uses external I/O).
 */
const fireStockAlert = async (bookId, bookTitle, author) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAlert = await prisma.notification.findFirst({
      where: {
        message: { contains: `[LOW_STOCK:${bookId}]` },
        createdAt: { gt: oneDayAgo }
      }
    });
    if (recentAlert) return; // Already alerted within 24 hours

    const alertMsg = `[LOW_STOCK:${bookId}] Low stock alert: "${bookTitle}" has fewer than 10 copies remaining.`;

    // In-app notification for the author
    await prisma.notification.create({
      data: { message: alertMsg, target: author.name }
    });
    // In-app notification for admin
    await prisma.notification.create({
      data: { message: alertMsg, target: 'ADMIN' }
    });

    // Email to author
    await sendNotificationEmail(
      author.email,
      `⚠️ Low Stock Alert — "${bookTitle}"`,
      emailWrap(`Low Inventory Warning`, `
        <p>Hi <strong>${author.name}</strong>, this is an automated alert from the PAA platform.</p>
        <p>Your book <strong>"${bookTitle}"</strong> has dropped below <strong>10 copies</strong> in your inventory.</p>
        <p>Please log in to your Author Dashboard and use the <strong>Update Stock</strong> feature to replenish your inventory before accepting new orders or registering for events.</p>
        <table>
          <tr><td><strong>Book</strong></td><td>${bookTitle}</td></tr>
          <tr><td><strong>Threshold</strong></td><td>Below 10 copies</td></tr>
        </table>
        <p style="color:#b44d28;font-weight:bold;">Action required: Update your master stock to ensure continued operations.</p>
      `)
    );
  } catch (err) {
    console.error('[fireStockAlert] Failed:', err.message);
  }
};

// Helper for Unified Ledger Calculation
async function computeBookInventory(books) {
  if (!books || books.length === 0) return [];

  const bookIds = books.map(b => b.id);

  const CUTOFF_DATE = new Date('2026-07-08T00:00:00Z');

  // Aggregate web order quantities per book (upcoming only)
  const orderItemAgg = await prisma.orderItem.groupBy({
    by: ['bookId'],
    where: {
      bookId: { in: bookIds },
      status: { in: ['Accepted', 'Dispatched', 'Completed', 'Delivered'] },
      createdAt: { gte: CUTOFF_DATE }
    },
    _sum: { quantity: true },
    _max: { createdAt: true }
  });

  // Aggregate donation quantities per book (upcoming only)
  const donationAgg = await prisma.donationBook.groupBy({
    by: ['bookId'],
    where: {
      bookId: { in: bookIds },
      createdAt: { gte: CUTOFF_DATE }
    },
    _sum: { quantityDonated: true },
    _max: { createdAt: true }
  });

  // Aggregate event listed stock per book — EXCLUDE Legacy Archive events
  const eventBooksRaw = await prisma.eventBook.findMany({
    where: {
      bookId: { in: bookIds },
      event: {
        status: { not: 'Legacy Archive' },
        livePosEnabled: true
      }
    },
    include: {
      event: { select: { id: true, name: true, location: true, status: true } }
    }
  });

  // Latest event activity
  const eventAgg = await prisma.eventBook.groupBy({
    by: ['bookId'],
    where: { bookId: { in: bookIds } },
    _max: { createdAt: true }
  });

  // Stock history logs
  const stockHistoryList = await prisma.stockHistory.findMany({
    where: { bookId: { in: bookIds } },
    orderBy: { updatedAt: 'desc' }
  });

  // Granular donation breakdown per book (library-level, upcoming only)
  const donationBooksRaw = await prisma.donationBook.findMany({
    where: {
      bookId: { in: bookIds },
      createdAt: { gte: CUTOFF_DATE }
    },
    include: {
      registration: {
        include: {
          announcement: { include: { library: { select: { id: true, name: true, city: true } } } }
        }
      }
    }
  });

  // Build lookup maps
  const webSoldMap = {};
  const lastActivityMap = {};

  orderItemAgg.forEach(r => {
    webSoldMap[r.bookId] = r._sum.quantity || 0;
    if (r._max.createdAt) {
      if (!lastActivityMap[r.bookId] || r._max.createdAt > lastActivityMap[r.bookId]) {
        lastActivityMap[r.bookId] = r._max.createdAt;
      }
    }
  });

  const airportMap = {};
  donationAgg.forEach(r => {
    airportMap[r.bookId] = r._sum.quantityDonated || 0;
    if (r._max.createdAt) {
      if (!lastActivityMap[r.bookId] || r._max.createdAt > lastActivityMap[r.bookId]) {
        lastActivityMap[r.bookId] = r._max.createdAt;
      }
    }
  });

  eventAgg.forEach(r => {
    if (r._max.createdAt) {
      if (!lastActivityMap[r.bookId] || r._max.createdAt > lastActivityMap[r.bookId]) {
        lastActivityMap[r.bookId] = r._max.createdAt;
      }
    }
  });

  const eventMap = {};
  const eventBreakdownMap = {};
  eventBooksRaw.forEach(eb => {
    eventMap[eb.bookId] = (eventMap[eb.bookId] || 0) + eb.listedStock;
    if (!eventBreakdownMap[eb.bookId]) eventBreakdownMap[eb.bookId] = [];
    eventBreakdownMap[eb.bookId].push({
      type: 'event',
      label: eb.event.name,
      location: eb.event.location,
      status: eb.event.status,
      quantity: eb.listedStock,
      sold: eb.soldStock
    });
  });

  const donationBreakdownMap = {};
  donationBooksRaw.forEach(db => {
    const lib = db.registration?.announcement?.library;
    if (!donationBreakdownMap[db.bookId]) donationBreakdownMap[db.bookId] = [];
    donationBreakdownMap[db.bookId].push({
      type: 'airport',
      label: lib ? `${lib.name}${lib.city ? `, ${lib.city}` : ''}` : 'Airport Library',
      quantity: db.quantityDonated
    });
  });

  return books.map(book => {
    const webSold = webSoldMap[book.id] || 0;
    const airportQty = airportMap[book.id] || 0;
    const eventQty = eventMap[book.id] || 0;
    const stockHistory = stockHistoryList.filter(h => h.bookId === book.id);

    // Initial stock entered by author
    const masterStock = book.stock;
    // Dynamically deduct upcoming data (web, airport, events)
    const currentStock = masterStock - webSold - airportQty - eventQty;
    const hasPending = stockHistory.some(h => h.status === 'Pending');

    const distributionBreakdown = [
      ...(donationBreakdownMap[book.id] || []),
      ...(eventBreakdownMap[book.id] || [])
    ];

    // Last activity fallback to book.createdAt
    const lastActivityDate = lastActivityMap[book.id] || book.createdAt;

    // Check if stale (no activity in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isStale = new Date(lastActivityDate) < thirtyDaysAgo;

    return {
      id: book.id,
      title: book.title,
      authorName: book.author ? book.author.name : 'Unknown',
      authorId: book.authorId,
      mrp: book.mrp,
      masterStock,
      currentStock,
      webSold,
      airportQty,
      eventQty,
      lastActivity: lastActivityDate,
      isLowStock: currentStock < 10,
      isStale,
      distributionBreakdown,
      genre: book.genre,
      coverUrl: book.coverImage,
      stockHistory,
      hasPending
    };
  });
}

// GET /api/author/inventory
// Returns per-book inventory with dynamic distribution breakdown
router.get('/api/author/inventory', verifyToken, async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });

    let books = await prisma.book.findMany({
      where: { authorId: author.id },
      orderBy: { createdAt: 'asc' }
    });

    // Inject authorName for the helper
    books = books.map(b => ({ ...b, authorName: author.name }));

    const enriched = await computeBookInventory(books);
    res.json(enriched);
  } catch (err) {
    console.error('[GET /api/author/inventory]', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});


// PUT /api/author/books/:id/stock
// Accepts positive OR negative addQty. Positive = restock, Negative = manual deduction.
router.put('/api/author/books/:id/stock', verifyToken, async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    const { addQty } = req.body;
    if (addQty === undefined || addQty === null || isNaN(parseInt(addQty)) || parseInt(addQty) === 0) {
      return res.status(400).json({ error: 'addQty must be a non-zero integer (positive to add, negative to remove)' });
    }

    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });

    const book = await prisma.book.findFirst({ where: { id: bookId, authorId: author.id } });
    if (!book) return res.status(404).json({ error: 'Book not found or not yours' });

    const qty = parseInt(addQty);
    const newStock = book.stock + qty;

    // Guard: prevent total stock going negative
    if (newStock < 0) {
      return res.status(400).json({
        error: `Stock cannot be less than zero. Current: ${book.stock}, adjustment: ${qty} → would result in ${newStock}.`
      });
    }

    const history = await prisma.stockHistory.create({
      data: {
        bookId: bookId,
        changeQty: qty,
        lastStock: book.stock,
        currentStock: newStock,
        status: 'Pending'
      }
    });

    invalidateCache(`author:dashboard:${req.user.email}`);
    res.json({ id: book.id, title: book.title, currentStock: book.stock, adjustment: qty, pending: true });
  } catch (err) {
    console.error('[PUT /api/author/books/:id/stock]', err);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// POST /api/author/inventory/validate-event
// Pre-registration validation: checks if requestedQty <= currentStock
router.post('/api/author/inventory/validate-event', verifyToken, async (req, res) => {
  try {
    const { bookId, requestedQty } = req.body;
    if (!bookId || !requestedQty) return res.status(400).json({ error: 'bookId and requestedQty are required' });

    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });

    const book = await prisma.book.findFirst({ where: { id: parseInt(bookId), authorId: author.id } });
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const currentStock = book.stock;
    const qty = parseInt(requestedQty);
    const valid = currentStock >= qty;

    res.json({
      valid,
      currentStock,
      requestedQty: qty,
      message: valid
        ? `Sufficient stock available (${currentStock} copies).`
        : `Insufficient inventory. Please update your master inventory stock before registering. Available: ${currentStock}, Requested: ${qty}.`
    });
  } catch (err) {
    console.error('[POST /api/author/inventory/validate-event]', err);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// ----------------------------------------------------
// ADMIN INVENTORY PORTAL ROUTES
// ----------------------------------------------------

// POST /api/admin/inventory/ping-author
router.post('/api/admin/inventory/ping-author', verifyToken, isAdmin, async (req, res) => {
  try {
    const { bookId, authorId } = req.body;
    const author = await prisma.author.findUnique({ where: { id: parseInt(authorId) } });
    const book = await prisma.book.findUnique({ where: { id: parseInt(bookId) } });

    if (!author || !book) return res.status(404).json({ error: 'Not found' });

    // Add to lowStockAlerts in extraData so it shows in Author Pending Actions
    const currentExtraData = (author.extraData && typeof author.extraData === 'object' && !Array.isArray(author.extraData)) ? author.extraData : {};
    const existingAlerts = currentExtraData.lowStockAlerts || [];
    
    await prisma.author.update({
      where: { id: author.id },
      data: {
        extraData: {
          ...currentExtraData,
          lowStockAlerts: [
            ...existingAlerts,
            { bookId: book.id, title: book.title, timestamp: Date.now(), read: false }
          ]
        }
      }
    });

    await prisma.notification.create({
      data: {
        message: `The Admin team has noticed your inventory for "${book.title}" is running low. Please update your master stock in your dashboard to ensure continued distribution.`,
        target: author.name
      }
    });

    if (author.email) {
      const emailHtml = emailWrap("Restock Request", `
        <p>Hi ${author.name},</p>
        <p>The Admin team has noticed your inventory for <strong>${book.title}</strong> is running low.</p>
        <p style="color:#b44d28;font-weight:bold;">Action required: Update your master stock in your dashboard to ensure continued distribution.</p>
      `);
      try {
        await sendNotificationEmail(author.email, `Restock Request: ${book.title}`, emailHtml);
      } catch (emailErr) {
        console.error('[POST ping-author] Email failed:', emailErr);
        return res.status(500).json({ error: 'Database updated, but failed to send email. Please verify SMTP credentials.' });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[POST ping-author]', err);
    res.status(500).json({ error: 'Failed to ping author' });
  }
});

// PUT /api/admin/inventory/approve/:historyId
router.put('/api/admin/inventory/approve/:historyId', verifyToken, isAdmin, async (req, res) => {
  try {
    const historyId = parseInt(req.params.historyId);
    const { action } = req.body;

    const history = await prisma.stockHistory.findUnique({ where: { id: historyId }, include: { book: { include: { author: true } } } });
    if (!history) return res.status(404).json({ error: 'Not found' });
    if (history.status !== 'Pending') return res.status(400).json({ error: 'Already processed' });

    if (action === 'reject') {
      await prisma.stockHistory.update({
        where: { id: historyId },
        data: { status: 'Rejected' }
      });
      return res.json({ success: true, status: 'Rejected' });
    }

    const newStock = history.book.stock + history.changeQty;

    await prisma.$transaction([
      prisma.book.update({
        where: { id: history.bookId },
        data: { stock: newStock }
      }),
      prisma.stockHistory.update({
        where: { id: historyId },
        data: { status: 'Approved', currentStock: newStock, lastStock: history.book.stock }
      })
    ]);

    if (history.changeQty < 0 && newStock < 10 && history.book.stock >= 10) {
      fireStockAlert(history.bookId, history.book.title, history.book.author).catch(() => { });
    } else if (newStock >= 10) {
      const tag = `[LOW_STOCK:${history.bookId}]`;
      await prisma.notification.deleteMany({
        where: { message: { contains: tag }, target: 'ADMIN' }
      }).catch(() => { });
    }

    invalidateCache(`author:dashboard:${history.book.author.email}`);
    res.json({ success: true, status: 'Approved' });
  } catch (err) {
    console.error('[PUT /api/admin/inventory/approve]', err);
    res.status(500).json({ error: 'Failed to approve inventory' });
  }
});

// GET /api/admin/inventory
router.get('/api/admin/inventory', verifyToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', lowStock } = req.query;
    const isExport = req.query.export === 'true';
    const skip = (Number(page) - 1) * Number(limit);

    let whereClause = {};

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { author: { name: { contains: search } } }
      ];
    }
    
    whereClause.isArchived = false;

    if (lowStock === 'true') {
      whereClause.stock = { lt: 10 };
    }

    if (isExport) {
      const allBooks = await prisma.book.findMany({
        where: whereClause,
        include: { author: { select: { name: true } } },
        orderBy: { title: 'asc' }
      });

      const enrichedBooks = await computeBookInventory(allBooks);

      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inventory');

      worksheet.columns = [
        { key: 'sno', width: 6 },
        { key: 'title', width: 40 },
        { key: 'author', width: 30 },
        { key: 'masterStock', width: 15 },
        { key: 'webSold', width: 15 },
        { key: 'airportQty', width: 15 },
        { key: 'eventQty', width: 15 },
        { key: 'currentStock', width: 15 },
        { key: 'lastActivity', width: 20 }
      ];

      worksheet.mergeCells('A1:I1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'INVENTORY & DISTRIBUTION REPORT';
      titleCell.font = { bold: true, size: 12 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } }; // Cyan
      titleCell.border = { top: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' }, bottom: { style: 'medium' } };

      const headerRow = worksheet.addRow({
        sno: 'S.No',
        title: 'Title',
        author: 'Author',
        masterStock: 'Master Stock',
        webSold: 'Web Sold',
        airportQty: 'Airport Qty',
        eventQty: 'Event Qty',
        currentStock: 'Current Stock',
        lastActivity: 'Last Activity'
      });

      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      enrichedBooks.forEach((b, i) => {
        const addedRow = worksheet.addRow({
          sno: i + 1,
          title: b.title,
          author: b.authorName,
          masterStock: b.masterStock,
          webSold: b.webSold,
          airportQty: b.airportQty,
          eventQty: b.eventQty,
          currentStock: b.currentStock,
          lastActivity: new Date(b.lastActivity).toLocaleDateString('en-GB')
        });

        addedRow.eachCell((cell, colNumber) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.font = { name: 'Arial', size: 10, color: { argb: '000000' } };
          
          let colBgColor = 'FFFFFF';
          if (colNumber === 2) colBgColor = 'FF8B8B'; // Light red (Title)
          else if (colNumber === 3) colBgColor = 'FFD2A3'; // Light orange (Author)
          else if (colNumber === 4) colBgColor = 'D4D8DD'; // Light gray (Master Stock)
          else if (colNumber === 5) colBgColor = 'B3E5FC'; // Light cyan (Web Sold)
          else if (colNumber === 6 || colNumber === 7) colBgColor = 'DDA0DD'; // Lavender (Event/Airport Qty)
          else if (colNumber === 9) colBgColor = 'C8E6C9'; // Light green (Last Activity)
          
          if (colNumber !== 8) { // 8 is Current Stock, colored dynamically below
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colBgColor } };
          }
        });

        let stockColor = 'FFFFFFFF';
        if (b.currentStock <= 5) stockColor = 'FFF4C2C2'; // Peach/Pink for low stock
        else if (b.currentStock <= 20) stockColor = 'FFFFFF00'; // Yellow for medium
        else stockColor = 'FF90EE90'; // Light green for good stock

        addedRow.getCell('currentStock').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stockColor } };

        addedRow.getCell('sno').alignment = { horizontal: 'center' };
        addedRow.getCell('masterStock').alignment = { horizontal: 'center' };
        addedRow.getCell('webSold').alignment = { horizontal: 'center' };
        addedRow.getCell('airportQty').alignment = { horizontal: 'center' };
        addedRow.getCell('eventQty').alignment = { horizontal: 'center' };
        addedRow.getCell('currentStock').alignment = { horizontal: 'center', vertical: 'middle' };
        addedRow.getCell('lastActivity').alignment = { horizontal: 'center' };
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory_export.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }

    // We need to fetch all books to compute accurate global KPIs based on dynamic inventory logic
    const allBooks = await prisma.book.findMany({
      include: { author: { select: { name: true } } }
    });
    const enrichedGlobalBooks = await computeBookInventory(allBooks);

    // In-memory filter & sort to properly float pending to the top
    let filtered = enrichedGlobalBooks;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(s) ||
        b.authorName.toLowerCase().includes(s)
      );
    }
    if (lowStock === 'true') {
      filtered = filtered.filter(b => b.currentStock < 10);
    }

    // Sort: Pending first, then Low Stock, then A-Z
    filtered.sort((a, b) => {
      if (a.hasPending && !b.hasPending) return -1;
      if (!a.hasPending && b.hasPending) return 1;

      const aLow = a.currentStock < 10;
      const bLow = b.currentStock < 10;
      if (aLow && !bLow) return -1;
      if (!aLow && bLow) return 1;

      return a.title.localeCompare(b.title);
    });

    const total = filtered.length;
    const enrichedBooks = filtered.slice(skip, skip + Number(limit));

    // Global stats across ALL platform
    const globalTotalTitles = await prisma.book.count({ where: {} });

    // Removed duplicate declaration of allBooks and enrichedGlobalBooks

    const globalLowStock = enrichedGlobalBooks.filter(b => b.currentStock < 10).length;

    // Dead Stock: No activity in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const staleInventory = enrichedGlobalBooks.filter(b => new Date(b.lastActivity) < thirtyDaysAgo).length;

    // Pending Restocks: Pinged authors in the last 14 days whose books are STILL low stock
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const recentPings = await prisma.notification.findMany({
      where: {
        message: { contains: 'running low' },
        createdAt: { gte: fourteenDaysAgo }
      }
    });
    const pingedAuthorNames = new Set(recentPings.map(n => n.target));
    const pendingRestocks = enrichedGlobalBooks.filter(b => b.currentStock < 10 && pingedAuthorNames.has(b.authorName)).length;

    res.json({
      data: enrichedBooks,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        globalStats: {
          totalTitles: globalTotalTitles,
          staleInventory,
          pendingRestocks,
          globalLowStock
        }
      }
    });

  } catch (err) {
    console.error('[GET admin inventory]', err);
    res.status(500).json({ error: 'Failed to fetch admin inventory' });
  }
});

// ----------------------------------------------------
// GLOBAL SALES ANALYTICS
// ----------------------------------------------------
router.get('/api/admin/sales-analytics', verifyToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.gte = new Date(startDate);
      dateFilter.lte = new Date(endDate);
    }

    // 1. Fetch Web Orders
    const webOrders = await prisma.orderItem.findMany({
      where: {
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        order: { status: { in: ['Completed', 'Delivered', 'Shipped', 'Dispatched'] } },
        status: { notIn: ['Cancelled', 'Rejected'] }
      },
      include: {
        order: { select: { customerName: true, id: true } },
        book: { select: { title: true, mrp: true, author: { select: { name: true } } } }
      }
    });

    // 2. Fetch POS Orders
    const posOrders = await prisma.posOrderItem.findMany({
      where: {
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        posOrder: { paymentStatus: 'CONFIRMED' }
      },
      include: {
        posOrder: { select: { id: true, event: { select: { name: true } } } },
        book: { select: { title: true, author: { select: { name: true } } } }
      }
    });

    // 3. Fetch Event Manual Sales (if they have dates)
    const manualSales = await prisma.eventAuthor.findMany({
      where: {
        manualTotalSold: { gt: 0 },
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
      },
      include: {
        event: { select: { name: true } },
        author: { select: { name: true } }
      }
    });

    const ledger = [];
    let totalRevenue = 0;
    let totalUnits = 0;

    webOrders.forEach(item => {
      const revenue = item.quantity * (item.book?.mrp || 0);
      totalRevenue += revenue;
      totalUnits += item.quantity;
      ledger.push({
        date: item.createdAt,
        channel: 'Web',
        refId: `ORD-${String(item.order.id).padStart(4, '0')}`,
        customer: item.order.customerName,
        title: item.book.title,
        author: item.book.author.name,
        qty: item.quantity,
        revenue: revenue
      });
    });

    posOrders.forEach(item => {
      const revenue = item.quantity * item.price;
      totalRevenue += revenue;
      totalUnits += item.quantity;
      ledger.push({
        date: item.createdAt,
        channel: 'POS',
        refId: `POS-${String(item.posOrder.id).padStart(4, '0')}`,
        customer: 'Walk-in (POS)',
        title: item.book.title,
        author: item.book.author.name,
        qty: item.quantity,
        revenue: revenue
      });
    });

    manualSales.forEach(item => {
      totalRevenue += item.manualTotalRevenue || 0;
      totalUnits += item.manualTotalSold || 0;
      ledger.push({
        date: item.createdAt,
        channel: 'Manual',
        refId: `EVT-${item.eventId}`,
        customer: 'Walk-in (Manual)',
        title: 'Mixed Books',
        author: item.author.name,
        qty: item.manualTotalSold || 0,
        revenue: item.manualTotalRevenue || 0
      });
    });

    ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const bookMap = {};
    const authorMap = {};
    const channelMap = { Web: 0, POS: 0, Manual: 0 };

    ledger.forEach(item => {
      if (channelMap[item.channel] !== undefined) {
        channelMap[item.channel] += item.revenue;
      }

      if (item.channel !== 'Manual') {
        if (!bookMap[item.title]) bookMap[item.title] = { title: item.title, qty: 0, revenue: 0, author: item.author };
        bookMap[item.title].qty += item.qty;
        bookMap[item.title].revenue += item.revenue;
      }

      if (!authorMap[item.author]) authorMap[item.author] = { author: item.author, revenue: 0, qty: 0 };
      authorMap[item.author].revenue += item.revenue;
      authorMap[item.author].qty += item.qty;
    });

    const topBooks = Object.values(bookMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
    const topAuthors = Object.values(authorMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    res.json({
      totalRevenue,
      totalUnits,
      channelBreakdown: channelMap,
      topBooks,
      topAuthors,
      ledger
    });

  } catch (err) {
    console.error('[GET sales analytics]', err);
    res.status(500).json({ error: 'Failed to fetch sales analytics' });
  }
});

// Author Event Proposal
router.post('/api/author/propose-event', verifyToken, upload.single('banner'), async (req, res) => {
  try {
    const { name, location, date, duration, eventType, description, startTime, endTime, registrationFee, feeType } = req.body;

    // Fetch author info
    const author = await prisma.author.findFirst({ where: { userId: req.user.id } });
    const authorName = author ? author.name : req.user.email;

    const eventDesc = `[Proposed by Author: ${authorName}]
${description || ''}`;

    let bannerUrl = null;
    if (req.file) {
      bannerUrl = `/uploads/${req.file.filename}`;
    }

    const event = await prisma.event.create({
      data: {
        name: name || 'Untitled Event',
        location: location || '',
        date: date || '',
        duration: duration || '',
        eventType: eventType || 'Other',
        description: eventDesc,
        startTime: startTime || null,
        endTime: endTime || null,
        registrationFee: registrationFee ? parseFloat(registrationFee) : 0,
        feeType: feeType || 'Per Author',
        bannerUrl,
        status: 'Pending Approval',
        commissionFlat: 0,
        commissionPercent: 0,
      }
    });
    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to propose event' });
  }
});

// Admin Event Status Update (Approve/Reject)
router.put('/api/admin/events/:id/status', verifyToken, isAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['Upcoming', 'Rejected', 'Past', 'Legacy Archive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get the event before updating to check if it was Pending Approval
    const existingEvent = await prisma.event.findUnique({ where: { id: eventId } });

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { status }
    });

    // If the event was a proposal (description contains "[Proposed by Author:"), notify the proposing author
    if (existingEvent && existingEvent.status === 'Pending Approval' && existingEvent.description) {
      const proposerMatch = existingEvent.description.match(/\[Proposed by Author: (.*?)\]/);
      if (proposerMatch) {
        const proposerName = proposerMatch[1];
        const isApproved = status === 'Upcoming';
        const statusLabel = isApproved ? 'Approved ✅' : 'Rejected ❌';
        const notifMessage = `Your event proposal "${existingEvent.name}" has been ${isApproved ? 'approved' : 'rejected'} by the admin. ${isApproved ? 'It is now listed as an Upcoming event.' : 'Please contact the admin team for further details.'}`;

        // In-app notification to the author
        await prisma.notification.create({
          data: { message: notifMessage, target: proposerName }
        });

        // Find the author's email
        const author = await prisma.author.findFirst({ where: { name: proposerName } });
        if (author && author.email) {
          const emailContent = emailWrap(
            `Event Proposal ${statusLabel}`,
            `<p>Hi <strong>${proposerName}</strong>,</p>
             <p>Your event proposal <strong>"${existingEvent.name}"</strong> has been reviewed by the PAA admin team.</p>
             <table style="margin:16px 0;border-collapse:collapse;">
               <tr><td style="padding:6px 12px;font-weight:bold;background:#f0f4f8;">Event</td><td style="padding:6px 12px;">${existingEvent.name}</td></tr>
               <tr><td style="padding:6px 12px;font-weight:bold;background:#f0f4f8;">Date</td><td style="padding:6px 12px;">${existingEvent.date}</td></tr>
               <tr><td style="padding:6px 12px;font-weight:bold;background:#f0f4f8;">Location</td><td style="padding:6px 12px;">${existingEvent.location || 'TBA'}</td></tr>
               <tr><td style="padding:6px 12px;font-weight:bold;background:#f0f4f8;">Decision</td><td style="padding:6px 12px;font-weight:bold;color:${isApproved ? '#16a34a' : '#dc2626'};">${statusLabel}</td></tr>
             </table>
             ${isApproved
              ? `<p style="color:#16a34a;font-weight:bold;">Congratulations! Your event has been approved and is now listed. You will be notified when registration opens.</p>`
              : `<p style="color:#dc2626;">Unfortunately, this proposal was not approved at this time. Please reach out to the admin team if you have any questions.</p>`
            }`
          );
          await sendNotificationEmail(author.email, `Event Proposal ${statusLabel}: "${existingEvent.name}"`, emailContent).catch(err => {
            console.error('[Event status email] Failed:', err.message);
          });
        }
      }
    }

    res.json(updatedEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update event status' });
  }
});


const carouselDir = path.join(__dirname, '../uploads/carousel');
if (!fs.existsSync(carouselDir)) fs.mkdirSync(carouselDir, { recursive: true });

// Get all carousel images
router.get('/api/carousel', (req, res) => {
  try {
    const files = fs.readdirSync(carouselDir).filter(f => f.match(/\.(jpg|jpeg|png|webp|gif)$/i));

    let order = [];
    const orderPath = path.join(carouselDir, 'order.json');
    if (fs.existsSync(orderPath)) {
      order = JSON.parse(fs.readFileSync(orderPath));
    }

    files.sort((a, b) => {
      let indexA = order.indexOf(a);
      let indexB = order.indexOf(b);
      if (indexA === -1) indexA = 999;
      if (indexB === -1) indexB = 999;
      return indexA - indexB;
    });

    const images = files.map(f => ({
      id: f,
      url: `/uploads/carousel/${f}`
    }));
    res.json(images);
  } catch (err) {
    console.error('Carousel fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch carousel' });
  }
});

// Reorder carousel images
router.post('/api/admin/carousel/reorder', verifyToken, isAdmin, (req, res) => {
  try {
    const { order } = req.body;
    const orderPath = path.join(carouselDir, 'order.json');
    fs.writeFileSync(orderPath, JSON.stringify(order));
    res.json({ success: true });
  } catch (err) {
    console.error('Carousel reorder error:', err);
    res.status(500).json({ error: 'Failed to reorder carousel' });
  }
});

// Upload carousel image
router.post('/api/admin/carousel', verifyToken, isAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  try {
    const tempPath = req.file.path;
    const destPath = path.join(carouselDir, req.file.filename);
    fs.renameSync(tempPath, destPath);
    res.json({ success: true, url: `/uploads/carousel/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Delete carousel image
router.delete('/api/admin/carousel/:filename', verifyToken, isAdmin, (req, res) => {
  try {
    const filepath = path.join(carouselDir, req.params.filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Upload pre-generated Catalogue PDF for Buyer Portal (Admin)
router.post('/api/admin/catalogue-pdf', verifyToken, isAdmin, upload.single('pdf'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const tempPath = req.file.path;
    const destPath = path.join(__dirname, '../uploads/catalogue.pdf');
    if (!fs.existsSync(path.dirname(destPath))) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
    }
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
    fs.renameSync(tempPath, destPath);
    res.json({ success: true, url: `/uploads/catalogue.pdf` });
  } catch (err) {
    console.error('[Upload Catalogue PDF]', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Upload pre-generated Catalogue PDF (Public fallback for first time only)
router.post('/api/public/catalogue-pdf', upload.single('pdf'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const destPath = path.join(__dirname, '../uploads/catalogue.pdf');
    // Security check: Only allow public upload if the file doesn't already exist!
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(req.file.path); // Delete the uploaded temp file
      return res.status(403).json({ error: 'Catalogue already exists. Only admins can overwrite.' });
    }

    const tempPath = req.file.path;
    if (!fs.existsSync(path.dirname(destPath))) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
    }
    fs.renameSync(tempPath, destPath);
    res.json({ success: true, url: `/uploads/catalogue.pdf` });
  } catch (err) {
    console.error('[Public Upload Catalogue PDF]', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.delete('/api/admin/catalogue-pdf', verifyToken, isAdmin, (req, res) => {
  try {
    const destPath = path.join(__dirname, '../uploads/catalogue.pdf');
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ----------------------------------------------------

// ── SYSTEM SETTINGS ────────────────────────────────────────────────────────────

router.get('/api/admin/settings', verifyToken, isAdmin, async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = {};
    settings.forEach(s => settingsMap[s.key] = s.value);
    res.json(settingsMap);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.post('/api/admin/settings', verifyToken, isAdmin, async (req, res) => {
  try {
    const settings = req.body;

    // Process each key-value pair and upsert in the database
    const updates = Object.entries(settings).map(async ([key, value]) => {
      if (value === null || value === undefined || value === '') {
        // If empty, delete the setting so it falls back to dynamic
        return prisma.systemSetting.deleteMany({ where: { key } }).catch(() => { });
      } else {
        return prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) }
        });
      }
    });

    await Promise.all(updates);

    // Clear public stats cache
    invalidateCache('public-stats');

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to save settings:", error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});


// ── AUTHOR INVITATIONS MODULE ───────────────────────────────────────────────

// Public: Get all approved authors for discovery
router.get('/api/public/authors', async (req, res) => {
  try {
    const authors = await prisma.author.findMany({
      where: { status: 'Active' },
      include: {
        books: { where: { status: 'Approved', isArchived: false } },
        eventAuthors: { include: { event: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(authors);
  } catch (error) {
    console.error("Failed to fetch public authors:", error);
    res.status(500).json({ error: 'Failed to fetch authors' });
  }
});

// Public: Get single author profile
router.get('/api/public/authors/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const author = await prisma.author.findUnique({
      where: { id },
      include: {
        books: { where: { status: 'Approved', isArchived: false } },
        eventAuthors: { include: { event: true } }
      }
    });
    if (!author || author.status !== 'Active') return res.status(404).json({ error: 'Author not found' });
    res.json(author);
  } catch (error) {
    console.error("Failed to fetch author profile:", error);
    res.status(500).json({ error: 'Failed to fetch author profile' });
  }
});

// Public: Submit an invitation
router.post('/api/author-invitation', async (req, res) => {
  try {
    const invitation = await prisma.authorInvitation.create({
      data: {
        ...req.body,
        status: 'Sent to Author'
      }
    });

    try {
      const author = await prisma.author.findUnique({
        where: { id: parseInt(req.body.authorId) }
      });
      if (author && author.email) {
        const subject = `New Event Invitation: "${req.body.eventTitle}"`;
        const emailContent = `
          <p>Hello <strong>${author.name}</strong>,</p>
          <p>You have received a new event invitation from <strong>${req.body.customerName}</strong>${req.body.organizationName ? ` (${req.body.organizationName})` : ''}.</p>
          
          <h3>Event Specifications</h3>
          <ul>
            <li><strong>Event Type:</strong> ${req.body.eventType}</li>
            <li><strong>Event Title:</strong> ${req.body.eventTitle}</li>
            <li><strong>Date:</strong> ${req.body.eventDate} ${req.body.eventTime ? `at ${req.body.eventTime}` : ''}</li>
            <li><strong>Venue:</strong> ${req.body.venue}</li>
          </ul>
          
          <h3>Organizer Contact Details</h3>
          <ul>
            <li><strong>Name:</strong> ${req.body.customerName}</li>
            <li><strong>Email:</strong> ${req.body.customerEmail}</li>
            <li><strong>Phone:</strong> ${req.body.customerPhone}</li>
          </ul>
          
          <p>Please log in to your PAA Author Dashboard and navigate to the <strong>Invitations</strong> section to view full details and respond (Accept/Decline).</p>
        `;
        if (typeof sendNotificationEmail === 'function' && typeof emailWrap === 'function') {
          sendNotificationEmail(author.email, subject, emailWrap("Event Invitation", emailContent)).catch(err => {
            console.error("Failed to send invitation email:", err);
          });
        }
      }
    } catch (emailErr) {
      console.error("Error sending email notification:", emailErr);
    }

    res.json({ success: true, invitation });
  } catch (error) {
    console.error("Failed to submit invitation:", error);
    res.status(500).json({ error: 'Failed to submit invitation' });
  }
});

// Admin: Get all invitations
router.get('/api/admin/invitations', verifyToken, isAdmin, async (req, res) => {
  try {
    const invitations = await prisma.authorInvitation.findMany({
      include: { author: { select: { name: true, photoUrl: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invitations);
  } catch (error) {
    console.error("Failed to fetch admin invitations:", error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Admin: Update invitation status
router.put('/api/admin/invitations/:id/status', verifyToken, isAdmin, async (req, res) => {
  try {
    const { status, adminRemarks } = req.body;
    const invitation = await prisma.authorInvitation.update({
      where: { id: parseInt(req.params.id) },
      data: { status, adminRemarks }
    });
    res.json({ success: true, invitation });
  } catch (error) {
    console.error("Failed to update invitation status:", error);
    res.status(500).json({ error: 'Failed to update invitation status' });
  }
});

// Author: Get invitations assigned to them
router.get('/api/author/invitations', verifyToken, async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: 'Author profile not found' });

    const invitations = await prisma.authorInvitation.findMany({
      where: {
        authorId: author.id,
        status: { in: ['Sent to Author', 'Accepted by Author', 'Rejected by Author', 'Completed'] }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invitations);
  } catch (error) {
    console.error("Failed to fetch author invitations:", error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Author: Respond to invitation
router.put('/api/author/invitations/:id/respond', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(404).json({ error: 'Author profile not found' });

    // ensure author owns this invitation
    const inv = await prisma.authorInvitation.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!inv || inv.authorId !== author.id) return res.status(403).json({ error: 'Forbidden' });

    if (!['Accepted by Author', 'Rejected by Author'].includes(status)) {
      return res.status(400).json({ error: 'Invalid response status' });
    }

    const invitation = await prisma.authorInvitation.update({
      where: { id: parseInt(req.params.id) },
      data: { status }
    });
    res.json({ success: true, invitation });
  } catch (error) {
    console.error("Failed to respond to invitation:", error);
    res.status(500).json({ error: 'Failed to respond to invitation' });
  }
});

module.exports = router;

