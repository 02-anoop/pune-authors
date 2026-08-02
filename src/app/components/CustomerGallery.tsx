import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, ChevronLeft, ChevronRight, ImageIcon, Search, Calendar, Filter, User } from 'lucide-react';

let globalGalleryCache: { events: any[], allImages: any[], timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function CustomerGallery({ eventId }: { eventId?: string }) {
  const hasValidCache = !eventId && globalGalleryCache && Date.now() - globalGalleryCache.timestamp < CACHE_TTL;
  const [events, setEvents] = useState<any[]>(hasValidCache ? globalGalleryCache!.events : []);
  const [allImages, setAllImages] = useState<any[]>(hasValidCache ? globalGalleryCache!.allImages : []);
  const [loading, setLoading] = useState(!hasValidCache);
  
  // Lightbox
  const [lightboxImages, setLightboxImages] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 3;

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterDate, sortBy]);

  // Carousel
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId && globalGalleryCache && Date.now() - globalGalleryCache.timestamp < CACHE_TTL) {
        setEvents(globalGalleryCache.events);
        setAllImages(globalGalleryCache.allImages);
        setLoading(false);
        return;
      }
      try {
        const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        let url = `${API}/api/gallery/events`;
        const res = await axios.get(url);
        
        let fetchedEvents = res.data;
        const now = new Date();
        fetchedEvents = fetchedEvents.filter((e: any) => new Date(e.date) <= now);
        if (eventId) {
           fetchedEvents = fetchedEvents.filter((e: any) => e.id.toString() === eventId);
        }
        
        // Filter approved images for each event
        fetchedEvents = fetchedEvents.map((ev: any) => {
           const images = (ev.images || []).filter((img: any) => img.status === 'Approved');
           const bannerUrl = ev.event?.bannerUrl || ev.library?.bannerUrl || ev.photoUrl;
           
           // Automatically include banner as a gallery image if it exists
           if (bannerUrl) {
             const hasBanner = images.some((img: any) => img.url === bannerUrl);
             if (!hasBanner) {
               images.unshift({
                 id: `banner-${ev.id}`,
                 url: bannerUrl,
                 caption: `${ev.location || 'Event'} Banner`,
                 dateTaken: ev.date,
                 status: 'Approved',
                 createdAt: ev.date
               });
             }
           }

           return {
             ...ev,
             type: ev.event?.eventType || ev.library?.type || ev.type || 'Event',
             images
           };
        });
        
        setEvents(fetchedEvents);

        // Fetch dedicated carousel images
        try {
          const carouselRes = await axios.get(`${API}/api/carousel`);
          if (carouselRes.data && carouselRes.data.length > 0) {
            setAllImages(carouselRes.data);
          } else {
             // Fallback to event images if carousel is empty
             const flatImages = fetchedEvents.flatMap((ev: any) => 
                 ev.images.map((img: any) => ({ ...img, galleryEvent: ev }))
             );
             setAllImages(flatImages.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          }
        } catch (e) {
          console.error('Failed to fetch carousel, using fallback', e);
          const flatImages = fetchedEvents.flatMap((ev: any) => 
              ev.images.map((img: any) => ({ ...img, galleryEvent: ev }))
          );
          setAllImages(flatImages.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
        
        if (!eventId) {
          setAllImages(prevImages => {
             globalGalleryCache = {
               events: fetchedEvents,
               allImages: prevImages,
               timestamp: Date.now()
             };
             return prevImages;
          });
        }
        
      } catch (err) {
        console.error('Failed to fetch gallery', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  // Auto-advance carousel
  useEffect(() => {
    if (allImages.length === 0) return;
    const interval = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % Math.min(allImages.length, 10));
    }, 4000);
    return () => clearInterval(interval);
  }, [allImages]);

  const openLightbox = (images: any[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    document.body.style.overflow = 'auto';
  };

  const showNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null && lightboxImages.length > 0) {
      setLightboxIndex((lightboxIndex + 1) % lightboxImages.length);
    }
  };

  const showPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null && lightboxImages.length > 0) {
      setLightboxIndex((lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length);
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        {!eventId && (
          <div className="w-full h-[600px] md:h-[700px] bg-white flex gap-4 p-4 overflow-hidden">
             <div className="flex-1 flex flex-col gap-4 hidden md:flex">
                <div className="flex-[3] bg-gray-100 rounded-xl animate-pulse"></div>
                <div className="flex-[2] bg-gray-100 rounded-xl animate-pulse"></div>
             </div>
             <div className="flex-[3] bg-gray-100 rounded-xl animate-pulse"></div>
             <div className="flex-1 flex flex-col gap-4 hidden md:flex">
                <div className="flex-[2] bg-gray-100 rounded-xl animate-pulse"></div>
                <div className="flex-[3] bg-gray-100 rounded-xl animate-pulse"></div>
             </div>
          </div>
        )}
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 space-y-16">
          <div className="flex gap-4">
             <div className="h-10 bg-gray-100 rounded-lg w-[300px] animate-pulse" />
             <div className="h-10 bg-gray-100 rounded-lg w-[150px] animate-pulse hidden sm:block" />
          </div>
          {[1, 2].map((i) => (
             <div key={i} className="space-y-6">
                <div className="border-b border-gray-100 pb-3 flex flex-col gap-2">
                   <div className="h-8 bg-gray-100 rounded w-64 animate-pulse" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-48 md:h-64 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
             </div>
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="w-full">
         <div className="py-40 flex flex-col items-center justify-center bg-gray-50/50">
            <ImageIcon className="w-16 h-16 text-gray-300 mb-4 opacity-50" />
            <h3 className="text-2xl font-serif text-paa-navy mb-2">Event Gallery</h3>
            <p className="text-gray-500 max-w-sm text-center">We're gathering memories. Check back soon for our first event photos!</p>
         </div>
      </div>
    );
  }

  // Fallback to events if no images are approved
  const carouselImages = allImages.length > 0 
    ? allImages.slice(0, 10) 
    : events.slice(0, 10).map((e: any) => ({
        id: 'evt-' + e.id,
        url: e.bannerUrl || null,
        caption: e.event?.name || e.type || 'Event',
        galleryEvent: { date: e.date, city: e.location }
      }));

  const filteredEvents = events.filter(e => {
    if (!e.images || e.images.length === 0) return false;

    const matchSearch = (e.type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                        (e.location?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                        (e.city?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                        (e.event?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchType = filterType ? e.type === filterType : true;
    const matchDate = filterDate ? new Date(e.date).toISOString().startsWith(filterDate) : true;
    return matchSearch && matchType && matchDate;
  }).sort((a, b) => {
    if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'name_asc') return (a.event?.name || a.type || '').localeCompare(b.event?.name || b.type || '');
    if (sortBy === 'name_desc') return (b.event?.name || b.type || '').localeCompare(a.event?.name || a.type || '');
    return 0;
  });

  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * eventsPerPage, currentPage * eventsPerPage);

  return (
    <div className="w-full">
      {/* Featured Carousel / Hero */}
      {!eventId && carouselImages.length > 0 && (
        <div className="relative w-full h-[600px] md:h-[700px] bg-gray-900 overflow-hidden group">
          {carouselImages.map((img: any, idx) => (
            <div 
              key={img.id} 
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === carouselIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            >
               {img.url ? (
                 <img src={img.url.startsWith('http') ? img.url : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${img.url}`} className="w-full h-full object-cover" alt="Featured event" />
               ) : (
                 <div className="w-full h-full bg-stripes-gray flex items-center justify-center bg-gray-100">
                    <ImageIcon className="w-32 h-32 text-gray-300 opacity-20" />
                 </div>
               )}
            </div>
          ))}


          
          {carouselImages.length > 1 && (
            <>
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 z-30">
                {carouselImages.map((_, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setCarouselIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === carouselIndex ? 'bg-paa-gold w-8' : 'bg-white/40 w-4 hover:bg-white/80'}`}
                  />
                ))}
              </div>
              <button onClick={() => setCarouselIndex((carouselIndex - 1 + carouselImages.length) % carouselImages.length)} className="absolute top-1/2 left-4 md:left-12 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/30 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-30 backdrop-blur-md border border-white/20">
                 <ChevronLeft size={28} />
              </button>
              <button onClick={() => setCarouselIndex((carouselIndex + 1) % carouselImages.length)} className="absolute top-1/2 right-4 md:right-12 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/30 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-30 backdrop-blur-md border border-white/20">
                 <ChevronRight size={28} />
              </button>
            </>
          )}
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 space-y-10 py-12">

      {/* Filters */}
      {!eventId && (
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-paa-navy/5 shadow-sm sticky top-24 z-30">
          <div className="flex-[3] min-w-[300px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search events, locations..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="dash-input w-full h-full min-w-[280px]" style={{ paddingLeft: '2.5rem' }} />
          </div>
          <div className="flex items-center md:w-48 relative">
             <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
             <select value={filterType} onChange={e => setFilterType(e.target.value)} className="dash-input w-full" style={{ paddingLeft: '2.2rem' }}>
               <option value="">All Event Types</option>
               {Array.from(new Set(events.map(g => g.type))).filter(Boolean).map((t: any) => (
                 <option key={t} value={t}>{t}</option>
               ))}
             </select>
          </div>
          <div className="flex items-center md:w-40 relative">
             <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
             <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="dash-input w-full" style={{ paddingLeft: '2.2rem' }} />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="dash-input md:w-48">
            <option value="date_desc">Latest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
          </select>
        </div>
      )}

      {/* Event Galleries */}
      <div className="space-y-16">
        {paginatedEvents.map(ev => (
          <div key={ev.id} className="space-y-6">
             <div className="border-b border-paa-navy/10 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <h2 className="text-2xl md:text-3xl font-serif font-bold text-paa-navy">{ev.event?.name || ev.library?.name || ev.type} @ {ev.location}</h2>
                  <p className="text-sm font-bold tracking-widest uppercase text-paa-gray-text mt-1 flex items-center gap-2">
                     <Calendar size={14} className="text-paa-gold" /> {new Date(ev.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-paa-gray-text bg-gray-100 px-3 py-1.5 rounded-full">
                  {ev.images?.length || 0} Photos
                </div>
             </div>
             
             {ev.images && ev.images.length > 0 ? (
               <>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {ev.images.slice(0, 4).map((img: any, idx: number) => (
                     <div 
                       key={img.id} 
                       className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-gray-100 border border-paa-navy/5 shadow-sm"
                       onClick={() => openLightbox(ev.images, idx)}
                     >
                       <img 
                         src={img.url.startsWith('http') ? img.url : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${img.url}`} 
                         alt={img.caption || 'Event photo'} 
                         className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-paa-navy/80 via-transparent to-transparent opacity-100"></div>
                       {img.caption && (() => {
                          const uploaderMatch = img.caption.match(/\(Uploaded by (.*?)\)/);
                          const uploaderName = uploaderMatch ? uploaderMatch[1] : '';
                          const cleanCaption = img.caption.replace(/\(Uploaded by .*?\)/, '').trim();
                          
                          return (
                            <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1">
                               {cleanCaption && <p className="text-white text-xs font-medium line-clamp-2 drop-shadow-md">{cleanCaption}</p>}
                               {uploaderName && (
                                 <div className="flex items-center gap-1.5 text-paa-gold/90 mt-1">
                                   <User size={10} className="shrink-0" />
                                   <span className="text-[9px] uppercase font-bold tracking-widest truncate">{uploaderName}</span>
                                 </div>
                               )}
                            </div>
                          );
                       })()}
                     </div>
                   ))}
                 </div>
                 {ev.images.length > 4 && (
                   <div className="mt-4 flex justify-center">
                     <button 
                       onClick={() => openLightbox(ev.images, 0)}
                       className="px-6 py-2 bg-gray-100 hover:bg-paa-navy hover:text-white text-paa-navy font-bold uppercase tracking-widest text-xs rounded-full transition-colors border border-gray-200"
                     >
                       View All {ev.images.length} Photos
                     </button>
                   </div>
                 )}
               </>
             ) : (
               <div className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
                  <div className="absolute inset-0 opacity-10">
                     {ev.bannerUrl ? (
                        <img src={ev.bannerUrl.startsWith('http') ? ev.bannerUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${ev.bannerUrl}`} className="w-full h-full object-cover" alt="Placeholder" />
                     ) : (
                        <div className="w-full h-full bg-stripes-gray"></div>
                     )}
                  </div>
                  <div className="relative z-10 text-center p-6">
                     <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                     <p className="text-gray-500 font-medium">Photos coming soon for this event!</p>
                  </div>
               </div>
             )}
          </div>
        ))}
        {filteredEvents.length === 0 && (
          <div className="py-20 text-center text-gray-400 font-medium italic bg-white rounded-2xl border border-gray-100">
             No events found matching your current filters.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-12 pb-12">
           <button 
             onClick={() => {
               setCurrentPage(p => Math.max(1, p - 1));
               window.scrollTo({ top: 400, behavior: 'smooth' });
             }} 
             disabled={currentPage === 1} 
             className="w-12 h-12 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-500 hover:bg-paa-navy hover:text-white hover:border-paa-navy disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-500 disabled:hover:border-gray-200 transition-all shadow-sm"
           >
             <ChevronLeft size={20} />
           </button>
           <span className="text-sm font-bold text-paa-navy px-4 tracking-widest uppercase">Page {currentPage} of {totalPages}</span>
           <button 
             onClick={() => {
               setCurrentPage(p => Math.min(totalPages, p + 1));
               window.scrollTo({ top: 400, behavior: 'smooth' });
             }} 
             disabled={currentPage === totalPages} 
             className="w-12 h-12 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-500 hover:bg-paa-navy hover:text-white hover:border-paa-navy disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-500 disabled:hover:border-gray-200 transition-all shadow-sm"
           >
             <ChevronRight size={20} />
           </button>
        </div>
      )}

      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <button 
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2"
            onClick={closeLightbox}
          >
            <X size={32} />
          </button>
          
          <div className="relative max-w-5xl w-full h-full max-h-[85vh] flex items-center justify-center flex-col gap-4">
            <button 
              className="absolute left-0 md:-left-12 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4 transition-colors hover:scale-110 active:scale-95"
              onClick={showPrev}
            >
              <ChevronLeft size={48} />
            </button>
            
            <img 
              src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${lightboxImages[lightboxIndex].url}`}
              alt={lightboxImages[lightboxIndex].caption || 'Event photo'}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            
            {lightboxImages[lightboxIndex].caption && (() => {
               const uploaderMatch = lightboxImages[lightboxIndex].caption.match(/\(Uploaded by (.*?)\)/);
               const uploaderName = uploaderMatch ? uploaderMatch[1] : '';
               const cleanCaption = lightboxImages[lightboxIndex].caption.replace(/\(Uploaded by .*?\)/, '').trim();
               
               return (
                 <div className="flex flex-col items-center mt-4">
                   {cleanCaption && (
                     <p className="text-white/90 text-sm md:text-base font-medium bg-black/60 px-6 py-2.5 rounded-full max-w-2xl text-center" onClick={(e) => e.stopPropagation()}>
                       {cleanCaption}
                     </p>
                   )}
                   {uploaderName && (
                     <div className="flex items-center gap-2 mt-3 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/5" onClick={(e) => e.stopPropagation()}>
                       <div className="w-5 h-5 rounded-full bg-paa-gold/20 flex items-center justify-center">
                         <User size={12} className="text-paa-gold" />
                       </div>
                       <span className="text-white/80 text-xs font-bold tracking-wider uppercase">{uploaderName}</span>
                     </div>
                   )}
                 </div>
               );
            })()}

            <button 
              className="absolute right-0 md:-right-12 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4 transition-colors hover:scale-110 active:scale-95"
              onClick={showNext}
            >
              <ChevronRight size={48} />
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
