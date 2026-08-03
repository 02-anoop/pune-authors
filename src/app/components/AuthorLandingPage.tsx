import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { BookOpen, Users, Calendar, PenTool, CheckCircle, ArrowRight, ChevronRight, Mail, Phone, MapPin, Megaphone, Sparkles, Feather, Heart, Library, ChevronLeft, Star, X, FileText, Download } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import FocusTrap from 'focus-trap-react';
import policyPdf from './data/Group Activities and Charter.pdf';
// --- COLOR PALETTE (Aaply Style) ---
const C = {
  yellow: "#eef110", // Super vibrant neon yellow
  yellowDark: "#d6d90e",
  red: "#ef4444",    // Vibrant red
  blue: "#3b82f6",   // Vibrant blue
  green: "#a3e635",  // Parrot green
  purple: "#a855f7", // Vibrant purple
  dark: "#000000",   // Pure black
  white: "#ffffff",
  bg: "#f3f4f6",     // Light grey background
  text: "#111827",
  muted: "#6b7280",
};

// --- ANIMATED COUNTER ---
function CountUp({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || end === 0) { setCount(end === 0 ? 0 : count); return; }
    let startTimestamp: number | null = null;
    let animationFrameId: number;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeProgress * end));
      if (progress < 1) { animationFrameId = window.requestAnimationFrame(step); } else { setCount(end); }
    };
    animationFrameId = window.requestAnimationFrame(step);
    return () => { if (animationFrameId) window.cancelAnimationFrame(animationFrameId); };
  }, [end, duration, isVisible]);

  return <div ref={ref} style={{ display: "inline-block" }}>{count}{suffix}</div>;
}

// --- FADE IN ON SCROLL ---
function FadeIn({ children, delay = 0, className = "", style = {} }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={className} ref={ref} style={{ ...style, opacity: isVisible ? 1 : 0, transform: isVisible ? "translateY(0)" : "translateY(24px)", transition: `all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms` }}>
      {children}
    </div>
  );
}

export function AuthorLandingPage() {
  const [stats, setStats] = useState<any>({ events: 0, authors: 0, books: 0, airportLibraries: 0, landingConfig: {} });
  const [carouselImages, setCarouselImages] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [showDocsModal, setShowDocsModal] = useState(false);
  const [policyDocs, setPolicyDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    if (showDocsModal && policyDocs.length === 0) {
      setLoadingDocs(true);
      axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/notifications`)
        .then(res => {
          const docs = res.data.filter((n: any) => n.documentUrl);
          setPolicyDocs(docs);
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingDocs(false));
    }
  }, [showDocsModal]);

  useEffect(() => {
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
          axios
            .get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/gallery`)
            .then((galRes) => {
              const flatImages: any[] = [];
              galRes.data.forEach((evt: any) => {
                if (evt.images) {
                  evt.images.forEach((img: any) => {
                    flatImages.push({ id: img.id, url: img.url, createdAt: img.createdAt || evt.date });
                  });
                }
              });
              if (flatImages.length > 0) {
                const sorted = flatImages.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setCarouselImages(sorted.slice(0, 10));
              } else {
                setCarouselImages([
                  { id: "u1", url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800" },
                  { id: "u2", url: "https://images.unsplash.com/photo-1513001900722-370f803f498d?w=800" },
                  { id: "u3", url: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800" }
                ]);
              }
            });
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (carouselImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(p => (p + 1) % carouselImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [carouselImages]);

  const totalSlides = carouselImages.length;

  return (
    <main style={{ fontFamily: "var(--font-body)", background: C.bg, color: C.text, overflowX: "hidden" }}>
      
      {/* ════════════════════════════════════════════
          GLOBAL STYLES FOR ANIMATIONS & LAYOUT
      ════════════════════════════════════════════ */}
      <style>{`
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .bento-wide { grid-column: span 3; }

        @media (max-width: 900px) {
          .bento-grid { grid-template-columns: 1fr; }
          .bento-wide { grid-column: span 1; }
        }

        .neo-card {
          border-radius: 32px;
          border: 3px solid ${C.dark};
          box-shadow: 6px 6px 0px ${C.dark};
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .neo-card.interactive {
          cursor: pointer;
        }
        .neo-card.interactive:hover {
          transform: translateY(-12px) scale(1.02) rotate(-1deg);
          box-shadow: 14px 14px 0px ${C.dark};
          z-index: 10;
        }

        /* Float Animations */
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes float-reverse {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(12px) rotate(-3deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float-3d {
          0% { transform: perspective(600px) rotateX(10deg) rotateY(-10deg) translateY(0); }
          50% { transform: perspective(600px) rotateX(5deg) rotateY(-5deg) translateY(-20px); }
          100% { transform: perspective(600px) rotateX(10deg) rotateY(-10deg) translateY(0); }
        }
        
        .anim-float { animation: float 6s ease-in-out infinite; }
        .anim-float-rev { animation: float-reverse 7s ease-in-out infinite; }
        .anim-spin { animation: spin-slow 15s linear infinite; }
        .anim-3d { animation: float-3d 5s ease-in-out infinite; }

        /* Responsive Grids */
        .hero-grid {
          position: relative;
          z-index: 10;
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
        }
        .hero-grid > * {
          min-width: 0 !important;
          max-width: 100% !important;
        }
        .hero-carousel-wrapper {
          min-width: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        .hero-carousel-card {
          min-width: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        
        .contact-grid {
          max-width: 1000px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
        }

        /* ════════════════════════════════════════════
           RESPONSIVE BREAKPOINTS (Tablet & Mobile)
        ════════════════════════════════════════════ */

        /* Tablet Breakpoint (max-width: 1024px) */
        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center !important;
            gap: 2.5rem !important;
          }
          .hero-text-wrapper {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
          }
          .hero-pill {
            margin: 0 auto 1.25rem auto !important;
          }
          .hero-title {
            text-align: center !important;
            margin: 0 auto 1.25rem auto !important;
          }
          .hero-desc {
            text-align: center !important;
            margin: 0 auto 2rem auto !important;
          }
          .button-wrapper {
            width: 100% !important;
            justify-content: center !important;
            align-items: center !important;
          }
          .bento-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1.5rem !important;
          }
          .bento-wide {
            grid-column: span 2 !important;
          }
          .contact-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
          .desktop-only-deco {
            display: none !important;
          }
        }

        /* Mobile Tablet & Large Phone (max-width: 768px) */
        @media (max-width: 768px) {
          .hero-section {
            padding: 6.5rem 1rem 2rem !important;
            width: 100% !important;
            max-width: 100vw !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }
          .hero-grid {
            gap: 1.5rem !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            padding: 0 !important;
            margin: 0 auto !important;
            text-align: center !important;
          }
          .hero-pill {
            font-size: 0.75rem !important;
            padding: 0.4rem 1.25rem !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            margin: 0 auto 1.25rem auto !important;
            display: inline-flex !important;
            justify-content: center !important;
            align-items: center !important;
            text-align: center !important;
          }
          .hero-title {
            font-size: clamp(1.4rem, 5.5vw, 1.8rem) !important;
            line-height: 1.25 !important;
            margin: 0 auto 1rem auto !important;
            text-align: center !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .hero-title br {
            display: none !important;
          }
          .hero-desc {
            font-size: 0.88rem !important;
            line-height: 1.5 !important;
            margin: 0 auto 1.5rem auto !important;
            text-align: center !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .hero-carousel-card {
            padding: 0.85rem !important;
            border-radius: 20px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
          }
          .hero-carousel-box {
            height: 210px !important;
          }
          .section-divider {
            margin: 2rem 0 1rem 0 !important;
          }
          .bento-grid-container {
            padding: 1rem 0.85rem 3rem !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .bento-grid {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
            width: 100% !important;
          }
          .bento-wide {
            grid-column: span 1 !important;
          }
          .neo-card {
            border-radius: 20px !important;
            border-width: 2px !important;
            box-shadow: 4px 4px 0px ${C.dark} !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .bento-card-inner {
            padding: 1.25rem 1rem !important;
            min-height: auto !important;
          }
          .bento-card-title {
            font-size: 1.25rem !important;
          }
          .bento-card-num {
            min-width: 34px !important;
            width: 34px !important;
            height: 34px !important;
            font-size: 0.9rem !important;
          }
          .author-needs-header {
            padding: 1.75rem 0.85rem 1.25rem !important;
          }
          .author-needs-title {
            font-size: 1.4rem !important;
          }
          .author-needs-grid {
            padding: 1.25rem 0.75rem !important;
            gap: 0.85rem !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
          }
          .author-needs-grid > * {
            height: 100% !important;
          }
          .author-needs-grid > *:nth-child(5) {
            grid-column: span 2 !important;
          }
          .author-needs-circle-wrapper {
            animation: none !important;
            width: 100% !important;
            height: 100% !important;
          }
          .author-needs-circle {
            width: 100% !important;
            height: 100% !important;
            min-height: 145px !important;
            border-radius: 20px !important;
            padding: 1.25rem 0.85rem !important;
            box-shadow: 4px 4px 0px ${C.dark} !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            box-sizing: border-box !important;
          }
          .author-needs-circle h3 {
            font-size: 1.05rem !important;
            margin-bottom: 0.35rem !important;
            line-height: 1.2 !important;
          }
          .author-needs-circle p {
            font-size: 0.8rem !important;
            line-height: 1.35 !important;
            margin: 0 !important;
          }
          .contact-section {
            padding: 2.5rem 0.85rem !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .contact-title {
            font-size: 1.75rem !important;
          }
          .contact-form-box {
            padding: 1.25rem 1rem !important;
            border-radius: 20px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .button-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            align-items: center !important;
            justify-content: center !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
          }
          .button-wrapper a, .button-wrapper button {
            width: 100% !important;
            max-width: 100% !important;
            text-align: center !important;
            justify-content: center !important;
            padding: 0.8rem 1rem !important;
            font-size: 0.9rem !important;
            box-sizing: border-box !important;
            white-space: normal !important;
            word-break: break-word !important;
            display: flex !important;
            align-items: center !important;
            letter-spacing: 0.02em !important;
          }
        }

        /* Compact Phone (max-width: 480px) */
        @media (max-width: 480px) {
          .hero-section {
            padding: 5.5rem 0.75rem 1.5rem !important;
          }
          .hero-title {
            font-size: 1.35rem !important;
          }
          .hero-desc {
            font-size: 0.84rem !important;
          }
          .hero-carousel-box {
            height: 190px !important;
          }
          .author-needs-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 0.65rem !important;
          }
          .author-needs-circle {
            min-height: 130px !important;
            padding: 0.85rem 0.65rem !important;
          }
          .author-needs-circle h3 {
            font-size: 0.95rem !important;
          }
          .author-needs-circle p {
            font-size: 0.76rem !important;
          }
        }


      `}</style>

      {/* ════════════════════════════════════════════
          HERO SECTION (2-Column)
      ════════════════════════════════════════════ */}
      <section className="hero-section" style={{ padding: "11.5rem 2rem 4rem", position: "relative", overflow: "hidden" }}>
        
        {/* Floating background decorations */}
        <div className="anim-float desktop-only-deco" style={{ position: "absolute", top: "15rem", left: "2%", width: 60, height: 60, zIndex: 0 }}>
          <svg viewBox="0 0 100 100" fill={C.yellow}><path d="M50 0L61 39H100L69 61L81 100L50 77L19 100L31 61L0 39H39L50 0Z" stroke={C.dark} strokeWidth="4" strokeLinejoin="round"/></svg>
        </div>
        <div className="anim-float-rev desktop-only-deco" style={{ position: "absolute", bottom: "5%", left: "40%", width: 80, height: 80, zIndex: 0 }}>
          <svg viewBox="0 0 100 100" fill={C.red}><circle cx="50" cy="50" r="40" stroke={C.dark} strokeWidth="4"/></svg>
        </div>
        <div className="anim-spin desktop-only-deco" style={{ position: "absolute", top: "10rem", right: "58%", width: 50, height: 50, zIndex: 0 }}>
          <svg viewBox="0 0 100 100" fill="none" stroke={C.blue} strokeWidth="8" strokeLinecap="round">
            <path d="M50 20 Q80 20 80 50 Q80 80 50 80 Q20 80 20 50 Q20 30 50 30 Q70 30 70 50 Q70 70 50 70" />
          </svg>
        </div>
        
        {/* New Pen SVG */}
        <div className="anim-float desktop-only-deco" style={{ position: "absolute", bottom: "30%", right: "1%", width: 70, height: 70, zIndex: 0, transform: "rotate(-15deg)" }}>
          <svg viewBox="0 0 24 24" fill={C.yellow} stroke={C.dark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
            <path d="M2 2l7.586 7.586"></path>
            <circle cx="11" cy="11" r="2"></circle>
          </svg>
        </div>

        {/* New Book SVG */}
        <div className="anim-float-rev desktop-only-deco" style={{ position: "absolute", top: "12rem", right: "35%", width: 65, height: 65, zIndex: 0, opacity: 0.8 }}>
          <svg viewBox="0 0 24 24" fill={C.white} stroke={C.dark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
          </svg>
        </div>

        <div className="hero-grid">
          
          {/* LEFT SIDE: TEXT */}
          <FadeIn className="hero-text-wrapper">
            <div className="hero-pill" style={{ display: "inline-flex", background: C.white, padding: "0.5rem 1.5rem", borderRadius: 50, border: `2px solid ${C.dark}`, boxShadow: "2px 2px 0px #000", fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
              For Authors & Writers
            </div>

            <h1 className="hero-title" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.5rem, 5vw, 4.2rem)", fontWeight: 900, color: C.dark, lineHeight: 1.1, letterSpacing: "-0.04em", marginBottom: "1.5rem" }}>
              Join the Group <br/>
              <span style={{ display: "inline-block", position: "relative" }}>
                and reach
                <svg className="anim-float desktop-only-deco" style={{ position: "absolute", top: "5px", right: "-45px", width: 40, height: 40, zIndex: -1 }} viewBox="0 0 100 100" fill={C.blue}><path d="M50 0L61 39H100L69 61L81 100L50 77L19 100L31 61L0 39H39L50 0Z" stroke={C.dark} strokeWidth="4" strokeLinejoin="round"/></svg>
              </span><br/>
              out to <span style={{ color: C.red, display: "inline-block", position: "relative", zIndex: 1 }}>
                readers.
                <svg style={{ position: "absolute", bottom: "-5px", left: 0, right: 0, width: "100%", height: 15, zIndex: -1 }} preserveAspectRatio="none" viewBox="0 0 100 20" fill="none"><path d="M0 10 Q25 0, 50 10 T100 10" stroke={C.yellow} strokeWidth="8" strokeLinecap="round"/></svg>
              </span>
            </h1>

            <p className="hero-desc" style={{ fontSize: "1.1rem", color: C.text, fontWeight: 600, maxWidth: 500, marginBottom: "2.5rem", lineHeight: 1.6 }}>
              Join Pune Authors' Association to SELL, PROMOTE, AND GET SUPPORT IN SELF-PUBLISHING IN A COST-EFFECTIVE WAY (CROWD FUNDED). We provide comprehensive services from editing to reader outreach.
            </p>

            <div className="button-wrapper" style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
              <Link to="/register" style={{ 
                background: C.yellow, color: C.dark, padding: "1.2rem 3rem", borderRadius: "50px", 
                fontWeight: 900, textDecoration: "none", fontSize: "1.1rem", border: `3px solid ${C.dark}`,
                boxShadow: "4px 4px 0px #000", transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05) rotate(-3deg)"; e.currentTarget.style.boxShadow = "8px 8px 0px #000"; e.currentTarget.style.background = C.white; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1) rotate(0deg)"; e.currentTarget.style.boxShadow = "4px 4px 0px #000"; e.currentTarget.style.background = C.yellow; }}>
                REGISTER AS AUTHOR
              </Link>
              <button onClick={() => setShowDocsModal(true)} style={{ 
                display: "inline-block", background: C.white, color: C.dark, cursor: "pointer",
                padding: "1rem 2.5rem", borderRadius: "50px", fontWeight: 900, fontSize: "1.1rem", 
                textDecoration: "none", border: `3px solid ${C.dark}`, boxShadow: "4px 4px 0px #000",
                transition: "transform 0.2s, box-shadow 0.2s" 
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "6px 6px 0px #000"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translate(0px, 0px)"; e.currentTarget.style.boxShadow = "4px 4px 0px #000"; }}>
                📄 View Policy Documents
              </button>
            </div>
          </FadeIn>

          {/* RIGHT SIDE: CAROUSEL */}
          <FadeIn delay={150} className="hero-carousel-wrapper">
            <div className="neo-card hero-carousel-card" style={{ background: C.white, padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "0.5rem", width: "100%", marginBottom: "1rem" }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.red, border: `2px solid ${C.dark}` }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.yellow, border: `2px solid ${C.dark}` }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.blue, border: `2px solid ${C.dark}` }} />
              </div>
              
              <div className="hero-carousel-box" style={{ width: "100%", height: 400, background: "#f8fafc", borderRadius: 16, border: `2px solid ${C.dark}`, position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", width: `${totalSlides * 100}%`, height: "100%", transform: `translateX(-${currentSlide * (100 / (totalSlides || 1))}%)`, transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}>
                  {carouselImages.map((img: any, idx) => (
                    <div key={idx} style={{ width: `${100 / totalSlides}%`, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img
                        src={img.url.startsWith('http') ? img.url : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${img.url.startsWith('/') ? img.url : '/' + img.url}`}
                        style={{ width: "100%", height: "100%", objectFit: "contain", padding: "1rem" }} alt=""
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Decorative dashed divider */}
      <div className="section-divider" style={{ width: "100%", overflow: "hidden", margin: "6rem 0 2rem 0" }}>
        <svg width="100%" height="20" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="10" x2="100%" y2="10" stroke={C.dark} strokeWidth="4" strokeDasharray="15, 10" />
        </svg>
      </div>

      {/* ════════════════════════════════════════════
          BENTO GRID LAYOUT
      ════════════════════════════════════════════ */}
      <section className="bento-grid-container" style={{ padding: "2rem 2rem 6rem" }}>
        <div className="bento-grid">

          {/* Card 2: About PAA (Square White) */}
          <FadeIn delay={200} style={{ height: "100%" }}>
            <div className="neo-card interactive bento-card-inner" style={{ background: C.white, padding: "3rem 2rem", height: "100%", minHeight: 320, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <div className="bento-card-num" style={{ background: C.white, border: `2px solid ${C.dark}`, borderRadius: "50%", minWidth: 48, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 900, boxShadow: "2px 2px 0px #000" }}>
                  1
                </div>
                <h2 className="bento-card-title" style={{ margin: 0, fontSize: "1.8rem", fontWeight: 900, letterSpacing: "-0.03em", color: C.dark, lineHeight: 1.1 }}>
                  An Active Literary Collective.
                </h2>
              </div>
              <p style={{ fontSize: "1.05rem", color: C.muted, lineHeight: 1.6, fontWeight: 500, marginBottom: "1rem" }}>
                The Pune Authors' Association is focused on reviving book reading, supporting writers, and organizing literary events in schools, colleges, and housing societies across the city.
              </p>
              <Link to="/about" style={{ fontWeight: 800, color: C.dark, display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "auto", textDecoration: "none" }}>
                About the Group <ArrowRight size={18} />
              </Link>
            </div>
          </FadeIn>

          {/* Card 3: Lit Fests (Vertical Red with 3D animation) */}
          <FadeIn delay={300} style={{ height: "100%" }}>
            <div className="neo-card interactive bento-card-inner" style={{ background: C.red, padding: "3rem 2rem", height: "100%", minHeight: 320, color: C.white, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <div className="bento-card-num" style={{ background: C.white, border: `2px solid ${C.dark}`, color: C.dark, borderRadius: "50%", minWidth: 48, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 900, boxShadow: "2px 2px 0px #000" }}>
                  2
                </div>
                <h3 className="bento-card-title" style={{ margin: 0, fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                  Literary Events
                </h3>
              </div>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, lineHeight: 1.5, opacity: 0.9, marginBottom: "2rem" }}>
                Meet the Author, Story Writing Competition, Author Talks, Publishing Support, Panel Discussion.
              </p>
            </div>
          </FadeIn>

          {/* Card 4: Yellow decorative wavy card */}
          <FadeIn delay={400} style={{ height: "100%" }}>
            <div className="neo-card interactive bento-card-inner" style={{ background: C.yellow, padding: "3rem 2rem", height: "100%", minHeight: 320, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ position: "relative", zIndex: 10, textAlign: "left", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div className="bento-card-num" style={{ background: C.white, border: `2px solid ${C.dark}`, color: C.dark, borderRadius: "50%", minWidth: 48, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 900, boxShadow: "2px 2px 0px #000" }}>
                    3
                  </div>
                  <h3 className="bento-card-title" style={{ margin: 0, fontSize: "2rem", fontWeight: 900, color: C.dark, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                    Get Invited
                  </h3>
                </div>
                <p style={{ fontSize: "1.1rem", fontWeight: 600, color: C.dark, lineHeight: 1.5, opacity: 0.9, marginBottom: "2rem" }}>Get invited for panel discussion and author talks</p>
              </div>

              {/* Overlapping Community Avatars */}
              <div style={{ display: "flex", justifyContent: "center", width: "100%", marginTop: "auto", zIndex: 5 }}>
                {[Users, BookOpen, Sparkles].map((Icon, i) => (
                  <div key={i} className={i % 2 === 0 ? "anim-float" : "anim-float-rev"} style={{ 
                    width: 64, height: 64, borderRadius: "50%", background: C.white, border: `4px solid ${C.dark}`, 
                    marginLeft: i > 0 ? -20 : 0, boxShadow: "4px 4px 0px rgba(0,0,0,0.8)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 - i,
                  }}>
                    <Icon size={28} color={C.dark} />
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Card 5: Everything an Author Needs (Wide Animated Edge-to-Edge) */}
          <FadeIn className="bento-wide" delay={500}>
            <div className="neo-card" style={{ background: C.purple, color: C.white, display: "flex", flexDirection: "column", overflow: "visible" }}>
              <div className="author-needs-header" style={{ padding: "4rem 2rem", textAlign: "center", position: "relative", overflow: "hidden", borderRadius: "32px 32px 0 0" }}>
                <div className="anim-float" style={{ display: "inline-flex", background: C.white, border: `2px solid ${C.dark}`, color: C.dark, borderRadius: "50%", width: 56, height: 56, alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 900, marginBottom: "1.5rem", boxShadow: "4px 4px 0px #000" }}>
                  4
                </div>
                <div style={{ position: "relative", display: "inline-block", marginBottom: "1rem" }}>
                  <h2 className="author-needs-title" style={{ position: "relative", zIndex: 1, fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, textShadow: "4px 4px 0px rgba(0,0,0,0.8)", margin: 0 }}>
                    Everything an Author Needs
                  </h2>
                  <svg style={{ position: "absolute", bottom: "-5px", left: "-2%", width: "104%", height: 16, zIndex: 0 }} preserveAspectRatio="none" viewBox="0 0 100 20" fill="none"><path d="M0 10 Q25 0, 50 10 T100 10" stroke={C.yellow} strokeWidth="12" strokeLinecap="round"/></svg>
                </div>
                <p style={{ fontSize: "1.1rem", color: C.white, textShadow: "2px 2px 0px rgba(0,0,0,0.5)", lineHeight: 1.6, fontWeight: 600, maxWidth: 850, margin: "1rem auto 0" }}>
                  We provide support to sell books, organize literary events, participate in book fairs, promote books, and offer publishing support—everything an author needs to grow, connect, and succeed.
                </p>
              </div>

              {/* Circular 3D Tabs / Cards Grid */}
              <div className="author-needs-grid" style={{ 
                display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "3rem", 
                padding: "5rem 2rem", background: C.white, borderTop: `4px solid ${C.dark}`,
                backgroundImage: `radial-gradient(rgba(0,0,0,0.15) 2px, transparent 2px)`,
                backgroundSize: "30px 30px",
                borderRadius: "0 0 32px 32px"
              }}>
                
                {[
                  { title: "Selling Books", desc: "Selling directly through website, events, and NBT book fairs.", icon: "🛍️", bg: C.green, color: C.dark },
                  { title: "Literary Events", desc: "Meet the author, panel discussions, and writing workshops.", icon: "🎤", bg: C.purple, color: C.white },
                  { title: "Book Fairs", desc: "Participation in National Book Trust and literature fests.", icon: "🎪", bg: C.red, color: C.white },
                  { title: "Promote Books", desc: "Promotional initiatives through airport library and media.", icon: "🚀", bg: C.blue, color: C.white },
                  { title: "Publishing Support", desc: "Editing, formatting, printing, and professional cover design.", icon: "📖", bg: C.yellow, color: C.dark }
                ].map((item, idx) => (
                  <FadeIn key={idx} delay={500 + (idx * 150)} style={{ height: "100%" }}>
                    <div className={`author-needs-circle-wrapper ${idx % 2 === 0 ? "anim-float" : "anim-float-rev"}`} style={{ position: "relative" }}>
                      <div className="author-needs-circle" style={{ 
                        width: 260, height: 260, borderRadius: "50%",
                        background: item.bg, color: item.color,
                        border: `4px solid ${C.dark}`,
                        boxShadow: "8px 8px 0px #000",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        textAlign: "center", padding: "1.5rem",
                        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        cursor: "pointer",
                        position: "relative",
                        zIndex: 1
                      }}
                      onMouseEnter={e => { 
                        e.currentTarget.style.transform = "scale(1.15) translateY(-10px) rotate(-5deg)"; 
                        e.currentTarget.style.boxShadow = "16px 16px 0px #000"; 
                        e.currentTarget.style.zIndex = "10"; 
                      }}
                      onMouseLeave={e => { 
                        e.currentTarget.style.transform = "scale(1) translateY(0px) rotate(0deg)"; 
                        e.currentTarget.style.boxShadow = "8px 8px 0px #000"; 
                        e.currentTarget.style.zIndex = "1"; 
                      }}>
                        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem", filter: "drop-shadow(3px 3px 0px rgba(0,0,0,0.25))" }}>{item.icon}</div>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: 900, marginBottom: "0.5rem", lineHeight: 1.1 }}>{item.title}</h3>
                        <p style={{ fontSize: "0.85rem", fontWeight: 700, opacity: 0.9 }}>{item.desc}</p>
                      </div>
                    </div>
                  </FadeIn>
                ))}
                
              </div>

            </div>
          </FadeIn>


        </div>
      </section>

      {/* ════════════════════════════════════════════
          CONTACT SECTION — BLACK SLICK STYLE
      ════════════════════════════════════════════ */}
      <section className="contact-section" style={{ background: C.dark, padding: "6rem 2rem", color: C.white, borderTop: `4px solid ${C.dark}` }}>
        <div className="contact-grid">
          <FadeIn>
            <div>
              <h2 className="contact-title" style={{ fontFamily: "var(--font-display)", fontSize: "3rem", fontWeight: 900, color: C.white, marginBottom: "1rem", letterSpacing: "-0.03em" }}>Get in Touch</h2>
              <p style={{ fontSize: "1.1rem", color: "#9ca3af", lineHeight: 1.6, marginBottom: "3rem", fontWeight: 500 }}>
                Whether you're an author seeking publishing assistance, want to organize an event, or partner with us for literary initiatives — we're here to help.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "1rem", background: "#1f2937", padding: "0.8rem 1.5rem", borderRadius: 50, width: "fit-content", border: "1px solid #374151" }}>
                  <Mail size={20} color={C.yellow} />
                  <span style={{ fontSize: "1rem", color: C.white, fontWeight: 700 }}>info@puneauthorsassociation.com</span>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "1rem", background: "#1f2937", padding: "0.8rem 1.5rem", borderRadius: 50, width: "fit-content", border: "1px solid #374151" }}>
                  <Phone size={20} color={C.red} />
                  <span style={{ fontSize: "1rem", color: C.white, fontWeight: 700 }}>+91 79770 97397</span>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "1rem", background: "#1f2937", padding: "0.8rem 1.5rem", borderRadius: 50, width: "fit-content", border: "1px solid #374151" }}>
                  <MapPin size={20} color={C.blue} />
                  <span style={{ fontSize: "1rem", color: C.white, fontWeight: 700 }}>Cdr Shiv Mathur, 2112, Clover Highlands, NIBM, Pune 411048</span>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <ContactForm />
          </FadeIn>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          POLICY DOCUMENTS MODAL
      ════════════════════════════════════════════ */}
      {showDocsModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
        }}>
          <div style={{
            background: C.white, width: "100%", maxWidth: 600, borderRadius: 24,
            border: `4px solid ${C.dark}`, boxShadow: "8px 8px 0px #000",
            maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden"
          }}>
            <div style={{ padding: "1.5rem", borderBottom: `2px solid ${C.dark}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.yellow }}>
              <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: C.dark, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileText size={24} /> Policy Documents
              </h2>
              <button onClick={() => setShowDocsModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.dark }}>
                <X size={28} />
              </button>
            </div>
            
            <div style={{ padding: "2rem", overflowY: "auto", flex: 1, background: C.bg }}>
              {loadingDocs ? (
                <div style={{ textAlign: "center", padding: "3rem", fontWeight: 700, color: C.muted }}>Loading documents...</div>
              ) : policyDocs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", fontWeight: 700, color: C.muted }}>
                  <p style={{ margin: 0 }}>No policy documents available yet.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {policyDocs.map((doc, idx) => (
                    <div key={idx} style={{ 
                      background: C.white, border: `2px solid ${C.dark}`, borderRadius: 16, 
                      padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem",
                      boxShadow: "4px 4px 0px rgba(0,0,0,0.1)"
                    }}>
                      <div>
                        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.2rem", fontWeight: 800, color: C.dark }}>
                          {doc.message || "Policy Document"}
                        </h3>
                        <p style={{ margin: 0, fontSize: "0.9rem", color: C.muted, fontWeight: 600 }}>
                          Added on {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <a 
                        href={`${doc.documentUrl?.startsWith('http') ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001')}${doc.documentUrl}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "0.5rem", alignSelf: "flex-start",
                          background: C.blue, color: C.white, padding: "0.5rem 1rem", borderRadius: "50px",
                          fontWeight: 700, fontSize: "0.9rem", textDecoration: "none",
                          border: `2px solid ${C.dark}`, boxShadow: "2px 2px 0px #000",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "4px 4px 0px #000"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translate(0px, 0px)"; e.currentTarget.style.boxShadow = "2px 2px 0px #000"; }}
                      >
                        <Download size={16} /> View Document
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


// --- CONTACT FORM COMPONENT ---
function ContactForm() {
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
      <form
        className="contact-form-box"
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSubmitting(true);
          try {
            await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/contact`, {
              name: contactName,
              email: contactEmail,
              message: contactMessage,
            });
            toast.success("Thank you! Your message has been received.");
            setContactName("");
            setContactEmail("");
            setContactMessage("");
          } catch (err) {
            console.error(err);
            toast.error("Failed to send message. Please try again.");
          } finally {
            setIsSubmitting(false);
          }
        }}
        style={{ background: "#111827", padding: "3rem", borderRadius: 32, border: "2px solid #374151" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2rem" }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>Full Name</label>
            <input
              required value={contactName} onChange={(e) => setContactName(e.target.value)} type="text"
              style={{ width: "100%", padding: "1rem", background: "#1f2937", border: `2px solid #374151`, borderRadius: 12, outline: "none", fontSize: "1rem", color: C.white, transition: "border-color 0.3s" }}
              onFocus={e => e.currentTarget.style.borderColor = C.yellow}
              onBlur={e => e.currentTarget.style.borderColor = "#374151"}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>Email Address</label>
            <input
              required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email"
              style={{ width: "100%", padding: "1rem", background: "#1f2937", border: `2px solid #374151`, borderRadius: 12, outline: "none", fontSize: "1rem", color: C.white, transition: "border-color 0.3s" }}
              onFocus={e => e.currentTarget.style.borderColor = C.yellow}
              onBlur={e => e.currentTarget.style.borderColor = "#374151"}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>Your Message</label>
            <textarea
              required value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} rows={4}
              style={{ width: "100%", padding: "1rem", background: "#1f2937", border: `2px solid #374151`, borderRadius: 12, outline: "none", fontSize: "1rem", color: C.white, resize: "none", transition: "border-color 0.3s" }}
              onFocus={e => e.currentTarget.style.borderColor = C.yellow}
              onBlur={e => e.currentTarget.style.borderColor = "#374151"}
            />
          </div>
        </div>

        <button
          disabled={isSubmitting} type="submit"
          style={{
            background: C.yellow, color: C.dark, border: "none",
            padding: "1rem 2rem", fontSize: "1rem", fontWeight: 900,
            borderRadius: 50, cursor: isSubmitting ? "not-allowed" : "pointer",
            width: "100%", transition: "all 0.2s",
          }}
          onMouseEnter={e => { if(!isSubmitting) e.currentTarget.style.transform = "scale(1.02)"; }}
          onMouseLeave={e => { if(!isSubmitting) e.currentTarget.style.transform = "scale(1)"; }}
        >
          {isSubmitting ? "Sending..." : "Submit Inquiry"}
        </button>
      </form>
    </FocusTrap>
  );
}
