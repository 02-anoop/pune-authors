require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const startDate = '2000-01-01';
    const endDate = '2099-12-31';

    let start = new Date(startDate);
    let end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    console.log("Fetching web orders...");
    const webOrders = await prisma.order.findMany({
      where: {
        status: { in: ['Completed', 'Delivered', 'Shipped', 'Dispatched'] },
        createdAt: { gte: start, lte: end }
      },
      include: { items: { include: { book: { include: { author: true } } } } }
    });
    console.log("Web orders fetched:", webOrders.length);

    console.log("Fetching POS orders...");
    const posOrders = await prisma.posOrder.findMany({
      where: {
        createdAt: { gte: start, lte: end }
      },
      include: { event: true, items: { include: { book: { include: { author: true } } } } }
    });
    console.log("POS orders fetched:", posOrders.length);

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

    const processItem = (date, channel, eventName, authorName, title, genre, subGenre, qty, price, orderId) => {
      const fullDateStr = date.toISOString().split('T')[0];
      const monthStr = date.toISOString().slice(0, 7);
      const chartDateStr = monthStr;

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
        genre: genre || 'Other',
        subGenre: subGenre || '',
        qty,
        revenue: rev
      });
    };

    console.log("Processing web orders...");
    webOrders.forEach(o => {
      o.items.forEach(i => {
        processItem(o.createdAt, 'Web Orders', '-', i.book.author?.name || 'Unknown', i.book.title, i.book.genre, i.book.subGenre, i.quantity, i.book.mrp, `PAA-${String(o.id).padStart(4, '0')}`);
        const rev = i.quantity * i.book.mrp;
        channelDataMap.Web += rev;
        kpiSplits.web.revenue += rev;
        kpiSplits.web.books += i.quantity;
      });
    });

    console.log("Processing pos orders...");
    posOrders.forEach(po => {
      const isBookFair = po.event?.eventType === 'Book Fair' || po.event?.name?.toLowerCase().includes('fair');
      const channelName = isBookFair ? 'Book Fairs' : 'Events';
      const kpiKey = isBookFair ? 'bookFairs' : 'events';
      kpiSplits[kpiKey].orders += 1;

      po.items.forEach(i => {
        processItem(po.createdAt, channelName, po.event?.name || '-', i.book.author?.name || 'Unknown', i.book.title, i.book.genre, i.book.subGenre, i.quantity, i.price, po.event?.name || `POS-${String(po.id).padStart(4, '0')}`);
        const rev = i.quantity * i.price;
        channelDataMap[channelName] += rev;
        kpiSplits[kpiKey].revenue += rev;
        kpiSplits[kpiKey].books += i.quantity;
      });
    });

    console.log("Fetching manual events...");
    const manualEvents = await prisma.event.findMany({
      where: {
        OR: [
          { status: 'Legacy Archive' },
          { livePosEnabled: false }
        ]
      },
      include: {
        eventAuthors: {
          where: { manualTotalSold: { gt: 0 } },
          include: { author: { include: { books: true } } }
        }
      }
    });

    console.log("Processing manual events...");
    const posEventIds = new Set(posOrders.filter(po => po.eventId).map(po => po.eventId));

    manualEvents.forEach(evt => {
      let evtDate = new Date(evt.date);
      if (isNaN(evtDate.getTime())) {
        evtDate = new Date(evt.createdAt);
      }

      if (evtDate >= start && evtDate <= end) {
        if (posEventIds.has(evt.id)) return;

        const isBookFair = evt.eventType === 'Book Fair' || evt.name?.toLowerCase().includes('fair');
        const channelName = isBookFair ? 'Book Fairs' : 'Events';
        const kpiKey = isBookFair ? 'bookFairs' : 'events';

        let totalEvtSold = evt.aggSold || 0;
        let totalEvtRev = evt.aggRevenue || (totalEvtSold * 200) || 0;

        if (totalEvtSold > 0 || totalEvtRev > 0) {
          totalRevenue += totalEvtRev;
          totalBooksSold += totalEvtSold;

          const fullDateStr = evtDate.toISOString().split('T')[0];
          const monthStr = evtDate.toISOString().slice(0, 7);
          const chartDateStr = monthStr;

          if (!chartDataMap[chartDateStr]) chartDataMap[chartDateStr] = { date: chartDateStr, revenue: 0, books: 0 };
          chartDataMap[chartDateStr].revenue += totalEvtRev;
          chartDataMap[chartDateStr].books += totalEvtSold;

          channelDataMap[channelName] += totalEvtRev;
          kpiSplits[kpiKey].revenue += totalEvtRev;
          kpiSplits[kpiKey].books += totalEvtSold;
          kpiSplits[kpiKey].orders += 1;
          totalOrders += 1;

          let unaccountedQty = totalEvtSold;
          let unaccountedRev = totalEvtRev;

          if (evt.eventAuthors && evt.eventAuthors.length > 0) {
            evt.eventAuthors.forEach(ea => {
              const qty = ea.manualTotalSold;
              let rev = ea.manualTotalRevenue || 0;
              if (rev === 0 && totalEvtSold > 0) {
                rev = Math.round((qty / totalEvtSold) * totalEvtRev);
              }

              unaccountedQty -= qty;
              unaccountedRev -= rev;

              let title = '-';
              let genre = 'Other';
              let subGenre = '-';
              if (ea.author && ea.author.books && ea.author.books.length > 0) {
                const primaryBook = ea.author.books[0];
                title = ea.author.books.length > 1 ? 'Multiple Books' : primaryBook.title;
                genre = primaryBook.genre || 'Other';
                subGenre = primaryBook.subGenre || '-';
              }

              tableData.push({
                date: fullDateStr,
                orderId: evt.name || `EVENT-${evt.id}`,
                channel: channelName,
                event: evt.name,
                author: ea.author?.name || 'Unknown Author',
                title: title,
                genre: genre,
                subGenre: subGenre,
                qty,
                revenue: rev
              });
            });
          }

          if (unaccountedQty > 0 || unaccountedRev > 0) {
            tableData.push({
              date: fullDateStr,
              orderId: evt.name || `EVENT-${evt.id}`,
              channel: channelName,
              event: evt.name,
              author: `${evt.aggAuthors || 0} Authors`,
              title: '-',
              genre: 'Other',
              subGenre: '-',
              qty: unaccountedQty,
              revenue: unaccountedRev > 0 ? unaccountedRev : 0
            });
          }
        }
      }
    });

    console.log("Success! Total Revenue:", totalRevenue);
  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    await prisma.$disconnect();
  }
}
run();
