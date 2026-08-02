import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import axios from "axios";
import { ArrowLeft, ArrowRight, Book, BookOpen, Megaphone, Store, Mic, Sparkles, Users, Plane, Library, PenTool, Palette, Printer, FileText, Mail, Phone, MapPin, Download, ExternalLink, Heart, Search, Landmark, Rocket, Feather, ChevronLeft, ChevronRight, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import FocusTrap from 'focus-trap-react';

// --- ANIMATED COUNTER ---
function CountUp({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // Don't animate if there's no data yet, wait for the live update
    if (end === 0) {
      setCount(0);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);

      setCount(Math.floor(easeProgress * end));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, [end, duration, isVisible]);

  return (
    <div ref={ref} style={{ display: "inline-block" }}>
      {count}
      {suffix}
    </div>
  );
}

// --- FADE IN ON SCROLL ---
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(18px)",
        transition: `all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// --- COLOR PALETTE ---
const C = {
  gold: "#d4a017",
  goldLight: "#f5e6b8",
  goldBg: "#fffdf5",
  amber: "#b44d28",
  dark: "#1a1a1a",
  darkCard: "#222",
  text: "#333",
  muted: "#777",
  border: "#e8e0d0",
  white: "#fff",
  cream: "#faf7f0",
  greenDark: "#1b5e20",
  greenLight: "#e8f5e9",
  blueDark: "#0d47a1",
};

const topGenres = [
  { name: "Romance", icon: <Heart color="#ef4444" size={28} />, bg: "#fee2e2", cat: "Fiction", subcat: "Romance" },
  { name: "Mystery", icon: <Search color="#eab308" size={28} />, bg: "#fef9c3", cat: "Fiction", subcat: "Mystery & Thriller" },
  { name: "Historical", icon: <Landmark color="#d97706" size={28} />, bg: "#ffedd5", cat: "Fiction", subcat: "Historical Fiction" },
  { name: "Fantasy", icon: <Sparkles color="#a855f7" size={28} />, bg: "#f3e8ff", cat: "Fiction", subcat: "Fantasy" },
  { name: "Sci-Fi", icon: <Rocket color="#3b82f6" size={28} />, bg: "#dbeafe", cat: "Fiction", subcat: "Science Fiction" },
  { name: "Poetry", icon: <Feather color="#ec4899" size={28} />, bg: "#fce7f3", cat: "Poetry", subcat: "All" },
];

const topLanguages = [
  { name: "Marathi", letter: "म", bg: "#fee2e2", color: "#ef4444" },
  { name: "English", letter: "A", bg: "#dbeafe", color: "#3b82f6" },
  { name: "Hindi", letter: "हिं", bg: "#fef9c3", color: "#eab308" },
  { name: "Sanskrit", letter: "सं", bg: "#ffedd5", color: "#f97316" },
  { name: "Kannada", letter: "ಕ", bg: "#e0f2fe", color: "#0ea5e9" },
  { name: "Tamil", letter: "த", bg: "#fef3c7", color: "#d97706" },
];

export function LandingPage() {
  const ficScrollRef = useRef<HTMLDivElement>(null);
  const nfScrollRef = useRef<HTMLDivElement>(null);
  const nrScrollRef = useRef<HTMLDivElement>(null);
  const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: 'left'|'right') => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      const scrollAmount = clientWidth * 0.8;
      ref.current.scrollTo({ left: scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount), behavior: 'smooth' });
    }
  };
  const [activeGenre, setActiveGenre] = useState<string>("All Books");
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [stats, setStats] = useState({
    events: 0, fairs: 0, airportLibraries: 0, authors: 0, books: 0, categories: 0,
    landingConfig: {
      heroTitle: "Helping indie authors publish, promote and sell.",
      heroHighlight: "authors",
      heroSubtitle: "We provide independent authors with refined publishing assistance, strategic promotion, and curated distribution channels.",
      titleColor: "#1e293b",
      highlightColor: "#f16522",
      subtitleColor: "#475569",
      featuredCategories: [] as string[]
    }
  });
  const [heroSearch, setHeroSearch] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselImages, setCarouselImages] = useState<any[]>([]);
  const navigate = useNavigate();

  const totalSlides = carouselImages.length > 0 ? carouselImages.length : 1;

  // Contact State
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [languageDrilldown, setLanguageDrilldown] = useState<"Others" | "Foreign" | null>(null);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/books`)
      .then((res) => {
        const mapped = res.data.map((b: any) => ({
          ...b,
          originalGenre: b.genre,
          authorName: b.author?.name || "Unknown",
          genre: b.genre?.includes("Children") ? "C" : b.genre?.includes("Non-Fiction") || b.genre === "NF" ? "NF" : "F",
          description: b.synopsis,
          coverUrl: b.coverUrl?.startsWith("http") ? b.coverUrl : `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${b.coverUrl?.startsWith('/') ? '' : '/'}${b.coverUrl}`,
        }));
        setGalleryItems(mapped);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoadingBooks(false));

    axios
      .get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/public-stats`)
      .then((res) => setStats(res.data))
      .catch((err) => console.error(err));

    axios
      .get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/carousel`)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setCarouselImages(res.data.slice(0, 10));
        } else {
          // Fallback to gallery events
          axios
            .get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/gallery`)
            .then((galRes) => {
              const flatImages: any[] = [];
              galRes.data.forEach((evt: any) => {
                if (evt.images) {
                  evt.images.forEach((img: any) => {
                    flatImages.push({
                      id: img.id,
                      url: img.url,
                      createdAt: img.createdAt || evt.date
                    });
                  });
                }
              });
              if (flatImages.length > 0) {
                // Sort by date (newest first) and take top 10
                const sorted = flatImages.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setCarouselImages(sorted.slice(0, 10));
              } else {
                setCarouselImages([
                  { id: "u1", url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800" },
                  { id: "u2", url: "https://images.unsplash.com/photo-1513001900722-370f803f498d?w=800" },
                  { id: "u3", url: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800" }
                ]);
              }
            })
            .catch((err) => {
              console.error(err);
              setCarouselImages([
                { id: "u1", url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800" },
                { id: "u2", url: "https://images.unsplash.com/photo-1513001900722-370f803f498d?w=800" },
                { id: "u3", url: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800" }
              ]);
            });
        }
      })
      .catch((err) => {
        console.error(err);
        setCarouselImages([
          { id: "u1", url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800" },
          { id: "u2", url: "https://images.unsplash.com/photo-1513001900722-370f803f498d?w=800" },
          { id: "u3", url: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800" }
        ]);
      });
  }, []);

  const mappedGenre = activeGenre === "All Books" ? null : activeGenre === "Non-Fiction" ? "NF" : activeGenre === "Fiction" ? "F" : activeGenre === "Children's corner" ? "C" : null;
  const filteredGallery = mappedGenre ? galleryItems.filter((b: any) => b.genre === mappedGenre) : galleryItems;

  const allSubCategories = Array.from(new Set(galleryItems.map((b: any) => {
    if (b.subGenre && b.subGenre.trim() !== "All" && b.subGenre.trim() !== "") {
      const parts = b.subGenre.split(">").map((s: string) => s.trim());
      return parts[0];
    }
    return b.originalGenre;
  }).filter(Boolean)));

  const availableGenres = allSubCategories.map(catName => {
    const isNA = catName.toUpperCase() === "NA" || catName.toUpperCase() === "N/A";
    const displayName = isNA ? "Others" : catName;

    const curated = topGenres.find(g => g.subcat.toLowerCase() === catName.toLowerCase() || g.name.toLowerCase() === catName.toLowerCase());
    if (curated && !isNA) return curated;

    const colors = [
      { bg: "#fee2e2", color: "#ef4444" },
      { bg: "#dbeafe", color: "#3b82f6" },
      { bg: "#fef9c3", color: "#eab308" },
      { bg: "#e0f2fe", color: "#0ea5e9" },
      { bg: "#f3e8ff", color: "#a855f7" },
      { bg: "#ffedd5", color: "#f97316" },
      { bg: "#fce7f3", color: "#ec4899" },
      { bg: "#dcfce7", color: "#22c55e" },
    ];
    let hash = 0;
    for (let i = 0; i < displayName.length; i++) { hash = displayName.charCodeAt(i) + ((hash << 5) - hash); }
    const c = colors[Math.abs(hash) % colors.length];

    return {
      name: displayName,
      icon: <BookOpen color={c.color} size={28} />,
      bg: c.bg,
      cat: "All",
      subcat: catName
    };
  }).sort((a, b) => {
    if (a.name === "Others") return 1;
    if (b.name === "Others") return -1;
    return a.name.localeCompare(b.name);
  });

  const allLanguageNames = Array.from(new Set(galleryItems.map((b: any) => b.language?.trim()).filter(Boolean)));

  const availableLanguages = allLanguageNames.map(langName => {
    const isNA = langName.toUpperCase() === "NA" || langName.toUpperCase() === "N/A";
    const displayName = isNA ? "Others" : langName;

    const curated = topLanguages.find(l => l.name.toLowerCase() === langName.toLowerCase());
    if (curated && !isNA) return { ...curated, searchParam: langName };

    const colors = [
      { bg: "#fce7f3", color: "#ec4899" },
      { bg: "#dcfce7", color: "#22c55e" },
      { bg: "#ede9fe", color: "#8b5cf6" },
      { bg: "#ffedd5", color: "#f97316" },
      { bg: "#ccfbf1", color: "#14b8a6" },
      { bg: "#fee2e2", color: "#ef4444" },
      { bg: "#dbeafe", color: "#3b82f6" },
      { bg: "#fef9c3", color: "#eab308" },
    ];
    let hash = 0;
    for (let i = 0; i < displayName.length; i++) { hash = displayName.charCodeAt(i) + ((hash << 5) - hash); }
    const c = colors[Math.abs(hash) % colors.length];

    return {
      name: displayName,
      searchParam: langName,
      letter: displayName.charAt(0).toUpperCase(),
      bg: c.bg,
      color: c.color
    };
  }).sort((a, b) => {
    if (a.name === "Others") return 1;
    if (b.name === "Others") return -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <main style={{ fontFamily: "var(--font-body)", background: C.cream, color: C.dark, overflowX: "hidden" }}>

      {/* ════════════════════════════════════════════
          HERO — DOTTED BACKGROUND
      ════════════════════════════════════════════ */}
      <section 
        className="hero-section"
        style={{ 
          position: "relative", 
          minHeight: "80vh", 
          display: "flex", 
          alignItems: "center", 
          overflow: "hidden", 
          backgroundImage: "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2000&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <div className="hero-overlay" style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 45%, rgba(255,255,255,0.3) 100%)" }} />
        <div className="hero-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "12rem 2rem 4rem 2rem", width: "100%", position: "relative", zIndex: 10 }}>
          {/* LEFT SIDE - STATIC */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", zIndex: 10 }}>
            <FadeIn>
              <h1
                className="hero-title landing-hero-title"
                style={{
                  fontFamily: "'Google Sans', 'Montserrat', sans-serif",
                  fontSize: "clamp(4.5rem, 8vw, 7.5rem)",
                  fontWeight: 900,
                  color: "#D84315", // Forced red
                  lineHeight: 1.05,
                  marginBottom: "1rem",
                  letterSpacing: "-0.03em",
                }}
              >
                BUY BOOKS
                <img 
                  className="hero-emoji"
                  src="/buy-books-emoji.webp" 
                  alt="icon" 
                  style={{ height: "1em", width: "1.2em", display: "inline-block", verticalAlign: "bottom", marginLeft: "0.25em", borderRadius: "0.15em", objectFit: "cover", paddingBottom: "0.1em" }} 
                />
              </h1>

              <p className="hero-paragraph" style={{ fontFamily: "'Google Sans', 'Montserrat', sans-serif", fontSize: 16, color: "#222", lineHeight: 1.7, marginBottom: "2.5rem", maxWidth: 650, fontWeight: 500 }}>
                Pune Authors' Association is a group of authors based out of Pune, Mumbai, and other cities as well. Pune Authors' Association was conceived to revive book reading, promote Indian authors, and Indian Literarture. It also helps authors in publishing support like formatting, editing, cover design, and printing at very cost-effective rates. You will come across interesting books at highly subsidised rates. In the present times, where technology allows books to be made available virtually, the group has decided to create its virtual presence. It is providing a limited, exclusive collection to the interested readers. You will not have to scroll endlessly to find a good book on this website.
              </p>



              {/* Buttons */}
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <Link
                  to="/catalogue"
                  className="hero-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    background: "#D84315",
                    color: "#ffffff",
                    padding: "1rem 2.5rem",
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    borderRadius: 50,
                    border: "2px solid #D84315",
                    boxShadow: "0 4px 20px rgba(216,67,21,0.3)",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    fontFamily: "'Google Sans', 'Montserrat', sans-serif"
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.color = "#111";
                    e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.3)";
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.background = "#111";
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
                  }}
                >
                  Browse Books
                </Link>
              </div>
            </FadeIn>
          </div>
          

        </div>
      </section>

      
      {/* ════════════════════════════════════════════
          IMMERSIVE FICTION (ORANGE)
      ════════════════════════════════════════════ */}
      <section style={{ backgroundColor: "#FF6B00", backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)", backgroundSize: "24px 24px", padding: "5rem 2rem", fontFamily: "'Google Sans', sans-serif", overflow: "hidden" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "3rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ fontFamily: "\'Playfair Display\', serif", fontSize: "clamp(2.5rem, 4vw, 3.5rem)", fontWeight: 800, color: "#fff", marginBottom: "0.5rem" }}>Fiction</h2>
                <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 16, fontWeight: 500 }}>Lose yourself in worlds woven by our finest storytellers.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                   <div className="arrow-btn hover-bg-black" onClick={() => scrollContainer(ficScrollRef, 'left')} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", transition: "all 0.3s ease" }}><ArrowLeft size={16}/></div>
                   <div className="arrow-btn hover-bg-black" onClick={() => scrollContainer(ficScrollRef, 'right')} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", transition: "all 0.3s ease" }}><ArrowRight size={16}/></div>
                </div>
                <Link to="/catalogue?category=Fiction" className="view-all-btn" style={{ background: "#fff", color: "#111", padding: "0.8rem 2rem", borderRadius: 50, fontWeight: 700, textDecoration: "none", fontSize: 13, letterSpacing: "0.05em", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", display: "inline-block" }}>
                  VIEW ALL
                </Link>
              </div>
            </div>
          </FadeIn>
          
          <div ref={ficScrollRef} className="horizontal-scroll" style={{ display: "flex", gap: "1.5rem", overflowX: "auto", paddingBottom: "2rem", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}>
            {galleryItems.filter(b => b.genre === "F").slice(0, 8).map((book, i) => (
              <Link to={`/book/${book.id}`} key={i} className="fic-card" style={{ flex: "0 0 280px", width: 280, background: "#fff", borderRadius: 16, padding: "1rem", position: "relative", display: "flex", flexDirection: "column", textDecoration: "none" }}>
                <div className="fic-img-wrapper" style={{ width: "100%", height: 220, background: "#f1f5f9", borderRadius: 8, marginBottom: "1rem", overflow: "hidden" }}>
                  <img src={book.coverUrl ? (book.coverUrl.startsWith("http") ? book.coverUrl : `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${book.coverUrl}`) : "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=450&fit=crop"} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div className="fic-content-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 800, color: "#111", margin: "0 0 0.2rem 0",  }}>{book.title}</h4>
                    <p className="fic-author" style={{ fontSize: 13, color: "#666", margin: "0 0 1rem 0", fontWeight: 500 }}>{book.authorName}</p>
                  </div>
                  <div className="fic-stars" style={{ display: "flex", alignItems: "center", gap: "0.2rem", marginBottom: "0.8rem" }}>
                       {[1,2,3,4].map(star => <span key={star} style={{ color: "#FFCC00", fontSize: 12 }}>★</span>)}
                       <span style={{ color: "#e2e8f0", fontSize: 12 }}>★</span>
                       <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "0.3rem", fontWeight: 700 }}>4.0</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#FF6B00" }}>₹{book.mrp || 150}</span>
                    <div className="fic-arrow" style={{ width: 32, height: 32, borderRadius: "50%", background: "#FF6B00", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.3s ease, transform 0.2s" }}>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          KNOWLEDGE & NON-FICTION (WHITE DOTS)
      ════════════════════════════════════════════ */}
      <section className="bg-dots-light" style={{ padding: "5rem 2rem", borderTop: "4px solid #FFCC00", borderBottom: "12px solid #FFCC00", overflow: "hidden", fontFamily: "'Google Sans', sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div className="nf-header-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "3rem", flexWrap: "wrap", gap: "2rem" }}>
              <div style={{ textAlign: "left" }}>
                <h2 style={{ fontFamily: "\'Playfair Display\', serif", fontSize: "clamp(2.5rem, 4vw, 3.5rem)", fontWeight: 800, color: "#0033FF", marginBottom: "0.5rem", lineHeight: 1.1 }}>Non-Fiction</h2>
                <p style={{ color: "#334155", fontSize: 16, fontWeight: 500 }}>Explore real-world insights, histories, and thought-provoking analysis.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                   <div className="arrow-btn hover-bg-black" onClick={() => scrollContainer(nfScrollRef, 'left')} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,51,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#0033FF", transition: "all 0.3s ease" }}><ArrowLeft size={16}/></div>
                   <div className="arrow-btn hover-bg-black" onClick={() => scrollContainer(nfScrollRef, 'right')} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,51,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#0033FF", transition: "all 0.3s ease" }}><ArrowRight size={16}/></div>
                </div>
                <Link to="/catalogue?category=Non-Fiction" className="view-all-btn" style={{ background: "#0033FF", color: "#fff", padding: "0.8rem 2rem", borderRadius: 50, fontWeight: 700, textDecoration: "none", fontSize: 13, letterSpacing: "0.05em", boxShadow: "0 4px 15px rgba(0,51,255,0.2)" }}>
                  VIEW ALL
                </Link>
              </div>
            </div>
          </FadeIn>
          
          <div ref={nfScrollRef} className="horizontal-scroll" style={{ display: "grid", gridTemplateRows: "1fr 1fr", gridAutoFlow: "column", gridAutoColumns: "320px", gap: "1.5rem", overflowX: "auto", paddingBottom: "2rem", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}>
            {galleryItems.filter(b => b.genre === "NF").slice(0, 8).map((book, i) => (
              <Link to={`/book/${book.id}`} key={i} className="nf-card" style={{ flex: "0 0 320px", width: 320, background: "#fff", borderRadius: 12, padding: "1.2rem", display: "flex", gap: "1rem", alignItems: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.03)", textDecoration: "none" }}>
                <div className="nf-img-wrapper" style={{ width: 80, height: 110, background: "#f1f5f9", borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                  <img src={book.coverUrl ? (book.coverUrl.startsWith("http") ? book.coverUrl : `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${book.coverUrl}`) : "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=450&fit=crop"} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "center" }}>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: "#111", margin: "0 0 0.3rem 0", lineHeight: 1.2 }}>{book.title}</h4>
                  <p className="nf-author" style={{ fontSize: 12, color: "#666", margin: "0 0 0.5rem 0", fontWeight: 500 }}>{book.authorName}</p>
                  <div className="nf-stars" style={{ display: "flex", alignItems: "center", gap: "0.2rem", marginBottom: "0.8rem" }}>
                     {[1,2,3,4].map(star => <span key={star} style={{ color: "#FFCC00", fontSize: 12 }}>★</span>)}
                     <span style={{ color: "#e2e8f0", fontSize: 12 }}>★</span>
                     <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "0.3rem", fontWeight: 600 }}>4.0</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#0033FF" }}>₹{book.mrp || 200}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      
      {/* ════════════════════════════════════════════
          CHILDREN'S CORNER (YELLOW 3D)
      ════════════════════════════════════════════ */}
      <section style={{ backgroundColor: "#FFD700", padding: "5rem 2rem", position: "relative", overflow: "hidden", fontFamily: "'Google Sans', sans-serif" }}>
        {/* Floating 3D emojis */}
        <div className="emoji-rocket" style={{ position: "absolute", top: "10%", left: "5%", fontSize: "3rem", animation: "float 6s ease-in-out infinite" }}>🚀</div>
        <div className="emoji-dice" style={{ position: "absolute", top: "20%", right: "15%", fontSize: "3rem", animation: "float 8s ease-in-out infinite reverse" }}>🎲</div>
        <div className="emoji-paint" style={{ position: "absolute", bottom: "15%", left: "10%", fontSize: "4rem", animation: "float 7s ease-in-out infinite" }}>🎨</div>
        <div className="emoji-balloon" style={{ position: "absolute", top: "50%", right: "5%", fontSize: "3rem", animation: "float 5s ease-in-out infinite" }}>🎈</div>
        <div className="emoji-star" style={{ position: "absolute", bottom: "30%", right: "25%", fontSize: "2.5rem", animation: "float 9s ease-in-out infinite reverse" }}>⭐</div>

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 10 }}>
          <FadeIn>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "3rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ fontFamily: "\'Playfair Display\', serif", fontSize: "clamp(2.5rem, 4vw, 3.5rem)", fontWeight: 900, color: "#111", marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>Children's Corner</h2>
                <p style={{ color: "#333", fontSize: 16, fontWeight: 600 }}>Colorful stories for young, imaginative minds.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                   <div className="arrow-btn hover-bg-black" style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#111", transition: "background 0.2s" }}><ArrowLeft size={16}/></div>
                   <div className="arrow-btn hover-bg-black" style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#111", transition: "background 0.2s" }}><ArrowRight size={16}/></div>
                </div>
                <Link to="/catalogue?category=Children's Books" className="view-all-btn" style={{ background: "#111", color: "#fff", padding: "0.8rem 2rem", borderRadius: 50, fontWeight: 700, textDecoration: "none", fontSize: 13, letterSpacing: "0.05em", display: "inline-block" }}>
                  VIEW ALL
                </Link>
              </div>
            </div>
          </FadeIn>
          
          <div className="horizontal-scroll" style={{ display: "flex", gap: "1.5rem", overflowX: "auto", paddingBottom: "2rem", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {galleryItems.filter(b => b.genre === "C").slice(0, 8).map((book, i) => (
              <Link to={`/book/${book.id}`} key={i} className="child-card" style={{ flex: "0 0 300px", width: 300, background: "#fff", borderRadius: 20, padding: "1.2rem", position: "relative", display: "flex", gap: "1rem", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", textDecoration: "none" }}>
                <div className="child-img-wrapper" style={{ width: 100, height: 140, background: "#f1f5f9", borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
                   <img src={book.coverUrl ? (book.coverUrl.startsWith("http") ? book.coverUrl : `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${book.coverUrl}`) : "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=450&fit=crop"} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: "#111", margin: "0 0 0.2rem 0", lineHeight: 1.2 }}>{book.title}</h4>
                  <p className="child-author" style={{ fontSize: 12, color: "#666", margin: "0 0 0.5rem 0", fontWeight: 600 }}>by {book.authorName}</p>
                  <div className="child-stars" style={{ display: "flex", alignItems: "center", gap: "0.2rem", marginBottom: "0.8rem" }}>
                     {[1,2,3,4].map(star => <span key={star} style={{ color: "#FFD700", fontSize: 12 }}>★</span>)}
                     <span style={{ color: "#e2e8f0", fontSize: 12 }}>★</span>
                     <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "0.3rem", fontWeight: 700 }}>4.0</span>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#111" }}>₹{book.mrp || 220}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

{/* ════════════════════════════════════════════
          NEW RELEASES (SLANT GREEN)
      ════════════════════════════════════════════ */}
      <section className="bg-slant" style={{ padding: "5rem 2rem", overflow: "hidden", fontFamily: "'Google Sans', sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "3rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <div style={{ width: 30, height: 2, background: "#00D084" }} />
                  <span style={{ color: "#00D084", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>FRESH ARRIVALS</span>
                </div>
                <h2 style={{ fontFamily: "\'Playfair Display\', serif", fontSize: "clamp(2.5rem, 4vw, 3.5rem)", fontWeight: 800, color: "#111", lineHeight: 1.1 }}>Latest Added</h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <div className="arrow-btn hover-bg-black" onClick={() => scrollContainer(nrScrollRef, 'left')} style={{ width: 36, height: 36, borderRadius: "50%", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#111", transition: "all 0.3s ease" }}><ArrowLeft size={16}/></div>
                   <div className="arrow-btn hover-bg-black" onClick={() => scrollContainer(nrScrollRef, 'right')} style={{ width: 36, height: 36, borderRadius: "50%", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#111", transition: "all 0.3s ease" }}><ArrowRight size={16}/></div>
                </div>
                <Link to="/catalogue" className="view-all-btn" style={{ background: "#00D084", color: "#fff", padding: "0.8rem 2rem", borderRadius: 50, fontWeight: 700, textDecoration: "none", fontSize: 13, letterSpacing: "0.05em", boxShadow: "0 4px 15px rgba(0,208,132,0.2)", display: "inline-block" }}>
                  VIEW ALL
                </Link>
              </div>
            </div>
          </FadeIn>
          
          <div ref={nrScrollRef} className="horizontal-scroll" style={{ display: "flex", gap: "1.5rem", overflowX: "auto", paddingBottom: "2rem", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}>
            {[...galleryItems].reverse().slice(0, 8).map((book, i) => (
              <Link to={`/book/${book.id}`} key={i} className="nr-card" style={{ flex: "0 0 240px", width: 240, background: "#fff", borderRadius: 16, padding: "1.2rem", position: "relative", display: "flex", flexDirection: "column", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", textDecoration: "none" }}>
                <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "#00D084", color: "#fff", fontSize: "10px", fontWeight: 800, padding: "0.3rem 0.6rem", borderRadius: "50px", letterSpacing: "0.1em", zIndex: 10, boxShadow: "0 2px 10px rgba(0,208,132,0.3)" }}>NEW</div>
                <div className="nr-img-wrapper" style={{ width: "100%", height: 260, background: "linear-gradient(180deg, #e6f9f0 0%, #ccf4df 100%)", borderRadius: 8, marginBottom: "1.2rem", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                   <img src={book.coverUrl ? (book.coverUrl.startsWith("http") ? book.coverUrl : `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${book.coverUrl}`) : "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=450&fit=crop"} alt={book.title} style={{ width: "80%", height: "90%", objectFit: "cover", borderRadius: 4, boxShadow: "0 10px 20px rgba(0,208,132,0.2)" }} />
                </div>
                <div className="nr-content-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 800, color: "#111", margin: "0 0 0.3rem 0",  }}>{book.title}</h4>
                    <p className="nr-author" style={{ fontSize: 12, color: "#666", margin: "0 0 0.5rem 0", fontWeight: 500 }}>{book.authorName}</p>
                    <div className="nr-stars" style={{ display: "flex", alignItems: "center", gap: "0.2rem", marginBottom: "1rem" }}>
                       {[1,2,3,4].map(star => <span key={star} style={{ color: "#FFCC00", fontSize: 12 }}>★</span>)}
                       <span style={{ color: "#e2e8f0", fontSize: 12 }}>★</span>
                       <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "0.3rem", fontWeight: 600 }}>4.0</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#00D084" }}>₹{book.mrp || 250}</span>
                    <div className="nr-arrow" style={{ width: 32, height: 32, borderRadius: "50%", background: "#00D084", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.3s ease, transform 0.2s" }}>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>


  
      {/* ════════════════════════════════════════════
          CONTACT SECTION (DARK DOTS)
      ════════════════════════════════════════════ */}
      <section className="bg-dots-dark" style={{ padding: "6rem 2rem", fontFamily: "'Google Sans', sans-serif" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#FFCC00", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem" }}>
                 <Mail size={24} color="#111" />
              </div>
              <h2 className="contact-heading" style={{ fontFamily: "\'Playfair Display\', serif", fontSize: "clamp(2.5rem, 4vw, 3.5rem)", fontWeight: 800, color: "#fff", marginBottom: "1rem" }}>Get in Touch</h2>
              <p className="contact-desc" style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: 500 }}>For Organising a Literary Event, Bulk Buying of Books, and Authors for joining this Group</p>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                try {
                  await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/contact`, {
                    name: contactName,
                    email: contactEmail,
                    message: contactMessage,
                  });
                  // @ts-ignore
                  toast.success("Thank you! Your message has been received.");
                  setContactName("");
                  setContactEmail("");
                  setContactMessage("");
                } catch (err) {
                  console.error(err);
                  // @ts-ignore
                  toast.error("Failed to send message. Please try again.");
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              <div className="contact-grid" style={{ display: "grid", gap: "3rem", marginBottom: "3rem" }}>
                <div>
                  <label className="contact-label" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#FFCC00", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.8rem" }}>FIRST & LAST NAME</label>
                  <input
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    type="text"
                    placeholder="e.g. Jane Doe"
                    className="contact-input"
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label className="contact-label" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#FFCC00", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.8rem" }}>EMAIL ADDRESS</label>
                  <input
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    type="email"
                    placeholder="jane@example.com"
                    className="contact-input"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
              <div className="contact-textarea-container" style={{ marginBottom: "4rem" }}>
                <label className="contact-label" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#FFCC00", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.8rem" }}>HOW CAN WE HELP?</label>
                <textarea
                  required
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  rows={1}
                  placeholder="Tell us about your project or inquiry..."
                  className="contact-input"
                  style={{ width: "100%", resize: "none", overflow: "hidden" }}
                />
              </div>
              
              <div className="contact-btn-container" style={{ textAlign: "right" }}>
                <button
                  className="contact-btn"
                  disabled={isSubmitting}
                  type="submit"
                  style={{
                    background: "#FFCC00",
                    color: "#111",
                    border: "none",
                    padding: "1rem 2.5rem",
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    borderRadius: 50,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    opacity: isSubmitting ? 0.7 : 1,
                    transition: "all 0.3s",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    boxShadow: "0 4px 20px rgba(255, 204, 0, 0.2)"
                  }}
                >
                  {isSubmitting ? "SENDING..." : "SUBMIT INQUIRY"} <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </FadeIn>
        </div>
      </section>


  {/* ── STYLES ── */ }
  <style>{`\n        .view-all-btn { transition: all 0.3s ease; }\n        .view-all-btn:hover { background-color: #111 !important; color: #fff !important; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15) !important; }\n        .hover-bg-black:hover { background-color: #111 !important; color: #fff !important; transform: scale(1.05); }
        .hero-btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .hero-btn-outline:hover { background: rgba(212,160,23,0.1) !important; }
        .pillar-card:hover { background: rgba(255,255,255,0.1) !important; transform: translateY(-4px); border-color: rgba(212,160,23,0.25) !important; }
        .svc-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
        .book-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
        .fic-card:hover .fic-arrow { background-color: #111 !important; transform: translateX(3px); }
        .nr-card:hover .nr-arrow { background-color: #111 !important; transform: translateX(3px); }

        .browse-link:hover { border-color: #d4a017 !important; background: #fffdf5 !important; }
        .form-input:focus { border-color: #d4a017 !important; }
        
        .contact-grid { grid-template-columns: 1fr 1fr; }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 2.5rem !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 1.5rem !important; }
          section { padding: 4rem 1.2rem !important; }
          .contact-grid { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
          
          /* Fix headers wrapping on mobile */
          /* Fix headers wrapping on mobile */
          .nf-header-flex { flex-direction: column !important; align-items: flex-start !important; gap: 1.2rem !important; margin-bottom: 1.5rem !important; }
          .nf-header-flex > div:first-child { text-align: left !important; }
          
          /* SECTION EMOJIS (Push to edges, lower opacity) */
          .emoji-rocket { top: 2% !important; left: -2% !important; opacity: 0.25 !important; }
          .emoji-dice { top: 5% !important; right: 2% !important; opacity: 0.25 !important; }
          .emoji-paint { bottom: 5% !important; left: -2% !important; opacity: 0.25 !important; }
          .emoji-balloon, .emoji-star { opacity: 0.15 !important; }

          /* HERO SECTION OVERRIDES */
          .hero-section { min-height: 55vh !important; }
          .hero-overlay { background: linear-gradient(to right, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.6) 60%, rgba(255,255,255,0.2) 100%) !important; }
          .hero-content { padding: 6rem 1rem 3rem 1rem !important; }
          
          .hero-title { 
            font-size: 3.5rem !important;
            margin-bottom: 1.5rem !important;
          }
          .hero-emoji { height: 0.6em !important; width: 0.7em !important; }
          .hero-paragraph { 
            line-height: 1.8 !important; 
            padding: 0 0.5rem !important; 
            font-size: 15px !important;
            margin-bottom: 2rem !important;
          }

          /* TYPOGRAPHY HIERARCHY */
          h2 { font-size: 1.8rem !important; line-height: 1.2 !important; margin-bottom: 0.5rem !important; }
          .nf-header-flex p, section > div > div > p { font-size: 14px !important; }
          
          /* BUTTONS & NAV ARROWS */
          .arrow-btn { width: 28px !important; height: 28px !important; }
          .arrow-btn svg { width: 12px !important; height: 12px !important; }
          .hero-btn {
            padding: 0 1.5rem !important; 
            font-size: 12px !important; 
            height: 46px !important; 
            border-radius: 12px !important;
            display: inline-flex !important; 
            align-items: center !important; 
            justify-content: center !important;
          }
          .view-all-btn {
            padding: 0 0.8rem !important; 
            font-size: 10px !important; 
            height: 28px !important; 
            border-radius: 8px !important;
            display: inline-flex !important; 
            align-items: center !important; 
            justify-content: center !important;
          }
          
          /* CAROUSEL CARDS STANDARD (All Match Children/NF) */
          .fic-card, .nr-card, .nf-card, .child-card { 
            flex-direction: row !important; align-items: center !important;
            flex: 0 0 260px !important; width: 260px !important; 
            padding: 0.8rem !important; gap: 0.8rem !important; border-radius: 12px !important; 
          }
          .horizontal-scroll { grid-auto-columns: 260px !important; }
          .fic-img-wrapper, .nr-img-wrapper, .nf-img-wrapper, .child-img-wrapper { 
            width: 70px !important; height: 100px !important; margin-bottom: 0 !important; flex-shrink: 0 !important;
          }
          .fic-content-wrapper, .nr-content-wrapper { justify-content: center !important; }
          .fic-card h4, .nr-card h4, .nf-card h4, .child-card h4 { font-size: 14px !important; margin-bottom: 4px !important; }
          .fic-author, .nr-author, .nf-author, .child-author { font-size: 11px !important; margin-bottom: 6px !important; }
          .fic-stars, .nr-stars, .nf-stars, .child-stars { margin-bottom: 8px !important; }
          .nr-arrow, .fic-arrow { display: none !important; } /* Hide arrows on mobile to match NF/Child */

          /* CONTACT SECTION */
          .contact-heading { margin-bottom: 1rem !important; }
          .contact-desc { margin-bottom: 1.5rem !important; }
          .contact-grid { margin-bottom: 1rem !important; gap: 1rem !important; }
          .contact-textarea-container { margin-bottom: 1.5rem !important; }
          .contact-label { font-size: 10px !important; letter-spacing: 0.05em !important; margin-bottom: 0.3rem !important; }
          .contact-input { 
            height: 48px !important; padding: 0 0.8rem !important; 
            border-bottom: 1px solid rgba(255,255,255,0.1) !important; 
            font-size: 14px !important; border-radius: 8px !important;
          }
          .contact-input::placeholder { color: rgba(255,255,255,0.3) !important; }
          textarea.contact-input { height: auto !important; padding: 0.8rem !important; }
          .contact-btn-container { text-align: center !important; }
          .contact-btn { 
            width: 80% !important; height: 46px !important; 
            border-radius: 16px !important; margin: 0 auto !important; 
            display: inline-flex !important; justify-content: center !important;
          }
        }

        .bg-dots-light {
          background-color: #C2F285;
          background-image: radial-gradient(rgba(27, 94, 32, 0.15) 1.5px, transparent 1.5px);
          background-size: 16px 16px;
        }
        .bg-slant {
          background-color: #ffffff;
          background-image: linear-gradient(rgba(0,208,132,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,208,132,0.08) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .bg-dots-dark {
          background-color: #111111;
          background-image: radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        .nf-card {
          border: 1px solid transparent;
          transition: all 0.3s ease;
        }
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .nf-card:hover {
          border-color: #0033FF;
          box-shadow: 0 10px 30px rgba(0, 51, 255, 0.1);
        }
        .fic-card {
          transition: all 0.3s ease;
        }
        .fic-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.15);
        }
        .nr-card {
          transition: all 0.3s ease;
        }
        .nr-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0, 208, 132, 0.15);
        }
        .contact-input {
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          padding: 0.5rem 0;
          font-size: 14px;
          outline: none;
          transition: border-color 0.3s;
        }
        .contact-input:focus {
          border-bottom-color: #FFCC00;
        }
      `}</style>
    </main >
  );
}