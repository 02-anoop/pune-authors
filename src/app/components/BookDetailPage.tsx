import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Star, BookOpen, User, Tag, IndianRupee, Send, MessageSquare, Package, Globe, MapPin, Award } from "lucide-react";
import { BookReviewForm, BookReviewPayload } from "./BookReviewForm";
import { getCategoryColor } from "./CataloguePage";

const API = (import.meta.env.VITE_API_URL || "http://localhost:3001").trim();

interface Review {
  id: number;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface BookDetail {
  id: number;
  title: string;
  genre: string;
  subGenre: string | null;
  synopsis: string;
  mrp: number;
  coverUrl: string | null;
  backCoverUrl?: string | null;
  stock: number;
  status: string;
  createdAt: string;
  format?: string;
  pages?: number;
  language?: string;
  publisher?: string;
  publicationDate?: string;
  isbn?: string;
  author: {
    name: string;
    bio: string;
    photoUrl: string | null;
    email: string;
    qualification?: string;
    age?: string;
    experience?: string;
    skills?: string;
    hobbies?: string;
    extraData?: any;
    city?: string;
    country?: string;
  };
  reviews: Review[];
}

const GENRE_COLORS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  Fiction: { bg: "#f0f4ff", color: "#3b4fd8", border: "#c7d2fe", label: "Fiction" },
  "Non-Fiction": { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", label: "Non-Fiction" },
  F: { bg: "#f0f4ff", color: "#3b4fd8", border: "#c7d2fe", label: "Fiction" },
  NF: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", label: "Non-Fiction" },
  C: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa", label: "Children" },
};

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={onChange ? 28 : 16}
          fill={(hover || value) >= s ? "#f59e0b" : "none"}
          color={(hover || value) >= s ? "#f59e0b" : "#d1d5db"}
          style={{ cursor: onChange ? "pointer" : "default", transition: "all 0.1s" }}
          onMouseEnter={() => onChange && setHover(s)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange && onChange(s)}
        />
      ))}
    </div>
  );
}

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [moreFromAuthor, setMoreFromAuthor] = useState<any[]>([]);
  const [moreFromCategory, setMoreFromCategory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Review form state
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Cart state for floating checkout
  const [cartItems, setCartItems] = useState<string[]>([]);
  const [allBooksData, setAllBooksData] = useState<any[]>([]);

  useEffect(() => {
    const updateCart = () => {
      const saved = localStorage.getItem('checkout_cart');
      if (saved) {
        setCartItems(JSON.parse(saved));
      } else {
        setCartItems([]);
      }
    };
    updateCart();
    window.addEventListener('cart_updated', updateCart);
    return () => window.removeEventListener('cart_updated', updateCart);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    Promise.all([
      fetch(`${API}/api/books/${id}`).then(r => r.json()),
      fetch(`${API}/api/books`).then(r => r.json())
    ])
    .then(([bookData, allBooksData]) => {
      if (bookData.error) {
        setError(bookData.error);
      } else {
        setBook(bookData);
        if (Array.isArray(allBooksData)) {
          setAllBooksData(allBooksData);
          const authorId = bookData.author?.id;
          const genre = bookData.genre;
          
          const fromAuthor = allBooksData.filter(b => b.id !== bookData.id && b.author?.id === authorId);
          setMoreFromAuthor(fromAuthor.slice(0, 4));

          const fromCategory = allBooksData.filter(b => b.id !== bookData.id && b.genre === genre && b.author?.id !== authorId);
          setMoreFromCategory(fromCategory.slice(0, 4));
        }
      }
    })
    .catch(() => setError("Failed to load book data"))
    .finally(() => setLoading(false));
  }, [id]);

  const handleSubmitReview = async (data: BookReviewPayload) => {
    setSubmitting(true);
    setSubmitMsg("");
    try {
      const res = await fetch(`${API}/api/books/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          reviewerName: data.reviewerName, 
          rating: data.overallRating, 
          comment: data.reviewText,
          writingStyleRating: data.writingStyleRating,
          contentQualityRating: data.contentQualityRating,
          enjoyedMost: data.enjoyedMost
        }),
      });
      const responseData = await res.json();
      if (!res.ok) { setSubmitMsg(responseData.error || "Failed to submit"); return; }
      // Prepend review locally
      setBook((prev) => prev ? { ...prev, reviews: [responseData, ...prev.reviews] } : prev);
      setSubmitMsg("✓ Your review has been submitted. Thank you!");
    } catch {
      setSubmitMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ background: "#fafafa", minHeight: "100vh", fontFamily: "var(--font-body)", color: "#111" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #eaeaea", padding: "10rem 1.10rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: "3rem", alignItems: "flex-start", opacity: 0.6, pointerEvents: "none" }}>
          <div style={{ width: 260, height: 380, background: "#f0f0f4", borderRadius: 4, flexShrink: 0, border: "1px solid #eaeaea", position: "relative", overflow: "hidden" }} className="animate-pulse"></div>
          <div style={{ flex: 1, paddingRight: "2rem" }}>
            <div style={{ width: 80, height: 20, background: "#f0f0f4", borderRadius: 4, marginBottom: 20 }} className="animate-pulse"></div>
            <div style={{ width: "80%", height: 40, background: "#f0f0f4", borderRadius: 4, marginBottom: 16 }} className="animate-pulse"></div>
            <div style={{ width: "40%", height: 20, background: "#f0f0f4", borderRadius: 4, marginBottom: 30 }} className="animate-pulse"></div>
            <div style={{ width: 120, height: 20, background: "#f0f0f4", borderRadius: 4, marginBottom: 30 }} className="animate-pulse"></div>
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ width: 150, height: 40, background: "#f0f0f4", borderRadius: 4 }} className="animate-pulse"></div>
              <div style={{ width: 150, height: 40, background: "#f0f0f4", borderRadius: 4 }} className="animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (error || !book) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
      <p style={{ color: "#ef4444", fontWeight: 600 }}>{error || "Book not found"}</p>
      <button onClick={() => navigate("/catalogue")} style={{ background: "#1a1a2e", color: "#fff", border: "none", padding: "0.6rem 1.4rem", borderRadius: 8, cursor: "pointer" }}>Back to Catalogue</button>
    </div>
  );

  const meta = getCategoryColor(book.genre === "F" ? "Fiction" : book.genre === "NF" ? "Non-Fiction" : book.genre === "C" ? "Children's Books" : book.genre);
  const images = [
    book?.coverUrl,
    book?.backCoverUrl || (book as any)?.back_cover_image_url || (book as any)?.backCoverImage
  ].filter(Boolean) as string[];
  const avgRating = book.reviews.length > 0
    ? book.reviews.reduce((s, r) => s + r.rating, 0) / book.reviews.length
    : 0;

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh", fontFamily: "var(--font-body)", color: "#111" }}>
      {/* Hero banner */}
      <div className="book-hero-bg" style={{ 
        backgroundColor: "#f8f9fa",
        backgroundImage: `linear-gradient(${meta.color}33 1px, transparent 1px), linear-gradient(90deg, ${meta.color}33 1px, transparent 1px)`,
        backgroundSize: "20px 20px",
        borderBottom: "1px solid rgba(0,0,0,0.05)", padding: "7.5rem 1.5rem 5rem", position: "relative" 
      }}>
        <div className="book-hero-wrapper" style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
          <button className="go-back-btn" onClick={() => navigate(-1)}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#fff", color: "#475569", border: "1px solid #e2e8f0", padding: "0.6rem 1.2rem", borderRadius: 30, cursor: "pointer", fontSize: 12, fontWeight: 700, marginBottom: "3rem", textTransform: "uppercase", letterSpacing: "0.05em", boxShadow: "0 4px 6px rgba(0,0,0,0.02)", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#0f172a"; e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.05)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#475569"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.02)"; }}>
            <ArrowLeft size={16} /> Go Back
          </button>

          <div className="book-hero-container" style={{ display: "flex", gap: "4rem", flexWrap: "wrap", alignItems: "center" }}>
            {/* Cover */}
            <div style={{ width: 280, height: 400, borderRadius: 16, background: "#fff", flexShrink: 0, boxShadow: "0 20px 40px rgba(0,0,0,0.12)", overflow: "hidden", position: "relative", zIndex: 10, display: "flex", flexDirection: "column" }}>
              {images.length > 0
                ? (
                  <>
                    <div style={{ flex: 1, position: "relative" }}>
                      <img src={images[currentImageIndex].startsWith('http') ? images[currentImageIndex] : `${API}${images[currentImageIndex].startsWith('/') ? images[currentImageIndex] : '/' + images[currentImageIndex]}`} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }} />
                    </div>
                    {images.length > 1 && (
                      <div style={{ position: "absolute", bottom: 16, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8, zIndex: 20 }}>
                        {images.map((_, idx) => (
                          <div 
                            key={idx} 
                            onClick={(e) => { e.preventDefault(); setCurrentImageIndex(idx); }}
                            style={{ 
                              width: 8, height: 8, borderRadius: "50%", 
                              background: currentImageIndex === idx ? "#fff" : "rgba(255, 255, 255, 0.4)", 
                              cursor: "pointer", transition: "all 0.2s",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
                            }} 
                          />
                        ))}
                      </div>
                    )}
                  </>
                )
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fa" }}>
                    <BookOpen size={48} color="#cbd5e1" />
                  </div>}
            </div>

            {/* Title block */}
            <div style={{ flex: 1, minWidth: 300 }}>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.2rem" }}>
                <span style={{ color: meta.color, background: meta.bg, padding: "0.4rem 1rem", borderRadius: 30, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {book.genre === "F" ? "Fiction" : book.genre === "NF" ? "Non-Fiction" : book.genre === "C" ? "Children's Books" : book.genre}
                </span>
                {book.subGenre && (
                  <span style={{ color: "#475569", background: "#f1f5f9", padding: "0.4rem 1rem", borderRadius: 30, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {book.subGenre}
                  </span>
                )}
              </div>
              
              <h1 className="book-title" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, color: "#0f172a", lineHeight: 1.1, margin: "0 0 0.8rem", letterSpacing: "-0.02em" }}>
                {book.title}
              </h1>
              
              <p style={{ color: "#64748b", fontSize: 18, margin: "0 0 2rem", fontWeight: 500 }}>by <span style={{ color: "#0f172a", fontWeight: 700 }}>{book.author.name}</span></p>

              {/* Rating summary */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
                <StarRating value={Math.round(avgRating)} />
                {book.reviews.length > 0
                  ? <span style={{ color: "#475569", fontSize: 14, fontWeight: 600 }}>{avgRating.toFixed(1)} / 5 &nbsp;·&nbsp; {book.reviews.length} review{book.reviews.length !== 1 ? "s" : ""}</span>
                  : <span style={{ color: "#94a3b8", fontSize: 14, fontStyle: "italic", fontWeight: 500 }}>No ratings yet — be the first!</span>}
              </div>
              
              {(() => {
                 const rules = book.author.extraData?.bundleRules?.filter((r: any) => r.enabled) || [];
                 if (rules.length > 0) {
                    rules.sort((a: any,b: any) => b.buyCount - a.buyCount);
                    const r = rules[0];
                    return (
                      <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", color: "#d97706", padding: "0.8rem 1.2rem", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2rem" }}>
                        🔥 Bundle Offer: Buy {r.buyCount}+ Books by this Author, Get ₹{r.discount} Off!
                      </div>
                    );
                 } else if (book.author.extraData?.bundleRule?.enabled) {
                    return (
                      <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", color: "#d97706", padding: "0.8rem 1.2rem", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2rem" }}>
                        🔥 Bundle Offer: Buy {book.author.extraData.bundleRule.buyCount}+ Books by this Author, Get ₹{book.author.extraData.bundleRule.discount} Off!
                      </div>
                    );
                 }
                 return null;
              })()}

              {/* Price & stock Panel */}
              <div className="book-price-panel" style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "center", background: "#fff", padding: "1.5rem 2rem", borderRadius: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.04)", border: "1px solid #f1f5f9" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>Price</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
                    <span className="book-price-val" style={{ fontSize: 36, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>₹{book.mrp}</span>
                  </div>
                </div>
                
                <div className="book-stock-badge" style={{ background: book.stock > 0 ? "#ecfdf5" : "#fef2f2", color: book.stock > 0 ? "#059669" : "#dc2626", padding: "0.5rem 1rem", borderRadius: 12, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Package size={14} /> {book.stock > 0 ? "In stock" : "Out of stock"}
                </div>
                
                {book.stock > 0 && (
                  <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                    <button onClick={() => {
                        const saved = localStorage.getItem('checkout_cart');
                        const cart = saved ? JSON.parse(saved).map(String) : [];
                        if (!cart.includes(String(book.id))) {
                           cart.push(String(book.id));
                           localStorage.setItem('checkout_cart', JSON.stringify(cart));
                           window.dispatchEvent(new Event('cart_updated'));
                           toast.success('Added to cart');
                        } else {
                           toast.info('Already in cart');
                        }
                    }} style={{ background: "#f8f9fa", color: "#0f172a", border: "1px solid #e2e8f0", padding: "1rem 2rem", borderRadius: 16, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background="#f1f5f9"; e.currentTarget.style.borderColor="#cbd5e1"; e.currentTarget.style.transform="scale(1.02)"; }} onMouseLeave={e => { e.currentTarget.style.background="#f8f9fa"; e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.transform="scale(1)"; }}>
                      Add to Cart
                    </button>
                    <button onClick={() => {
                        const saved = localStorage.getItem('checkout_cart');
                        const cart = saved ? JSON.parse(saved).map(String) : [];
                        if (!cart.includes(String(book.id))) {
                           cart.push(String(book.id));
                           localStorage.setItem('checkout_cart', JSON.stringify(cart));
                           window.dispatchEvent(new Event('cart_updated'));
                        }
                        const token = localStorage.getItem("token");
                        const role = localStorage.getItem("userRole");
                        if (!token || role !== "CUSTOMER") {
                          navigate("/login?role=CUSTOMER&redirect=/checkout");
                        } else {
                          navigate("/checkout");
                        }
                    }} style={{ background: meta.color || "#0f172a", color: "#fff", border: "none", padding: "1rem 2.5rem", borderRadius: 16, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 8px 20px rgba(0,0,0,0.15)" }} onMouseEnter={e => { e.currentTarget.style.transform="scale(1.04)"; e.currentTarget.style.filter="brightness(1.1)"; }} onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.filter="brightness(1)"; }}>
                      Buy Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: "0 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2.5rem 0", display: "grid", gridTemplateColumns: "280px 1fr", gap: "4rem" }} className="book-detail-grid">
        
        {/* Left column (Metadata) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Quick details */}
          <div style={{ background: "#fff", border: "1px solid #f1f5f9", padding: "2rem", borderRadius: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 400, color: "#111", margin: "0 0 1.5rem" }}>Book Details</h3>
            <div style={{ width: 20, height: 1, background: "#111", marginBottom: "1.5rem" }}></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { icon: <Tag size={14} />, label: "Genre", value: book.genre === "F" ? "Fiction" : book.genre === "NF" ? "Non-Fiction" : book.genre === "C" ? "Children's Books" : book.genre },
                book.subGenre ? { icon: <Tag size={14} />, label: "Sub-Genre", value: book.subGenre } : null,
                book.format && book.format !== "NA" ? { icon: <BookOpen size={14} />, label: "Format", value: book.format } : null,
                book.pages ? { icon: <BookOpen size={14} />, label: "Pages", value: book.pages } : null,
                book.language && book.language !== "NA" ? { icon: <Globe size={14} />, label: "Language", value: book.language } : null,
                book.publisher && book.publisher !== "NA" ? { icon: <User size={14} />, label: "Publisher", value: book.publisher } : null,
                book.publicationDate && book.publicationDate !== "NA" ? { icon: <Package size={14} />, label: "Publication Date", value: new Date(book.publicationDate).toLocaleDateString() === 'Invalid Date' ? book.publicationDate : new Date(book.publicationDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) } : null,
                book.isbn && book.isbn !== "NA" ? { icon: <Award size={14} />, label: "ISBN", value: book.isbn } : null
              ].filter(Boolean).map((detail: any, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed #e2e8f0", paddingBottom: "0.8rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b" }}>
                    <span style={{ color: "#38bdf8" }}>{detail.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{detail.label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textAlign: "right", maxWidth: "60%" }}>{detail.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Author Location */}
          {(book.author.city || book.author.country) && (
            <div style={{ background: "#fff", border: "1px solid #f1f5f9", padding: "1.5rem 2rem", borderRadius: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.03)", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                <MapPin size={20} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.3rem" }}>Location</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  {[book.author.city, book.author.country].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right column (Main Content) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Synopsis */}
          <section style={{ background: "#fff", border: "1px solid #f1f5f9", padding: "3rem", borderRadius: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400, color: "#111", margin: "0 0 1.5rem" }}>
              About the Book
            </h2>
            <div style={{ width: 30, height: 1, background: "#111", marginBottom: "1.5rem" }}></div>
            <p style={{ color: "#222", lineHeight: 1.8, fontSize: 14, margin: 0, fontWeight: 400 }}>{book.synopsis || "No synopsis available."}</p>
          </section>

          {/* Author bio */}
          <section style={{ background: "#fff", border: "1px solid #f1f5f9", padding: "3rem", borderRadius: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400, color: "#111", margin: "0 0 1.5rem" }}>
              About the Author
            </h2>
            <div style={{ width: 30, height: 1, background: "#111", marginBottom: "2rem" }}></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: meta.bg, border: `2px solid ${meta.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22, fontWeight: 700, color: meta.color }}>
                  {book.author.photoUrl
                    ? <img src={book.author.photoUrl.startsWith('http') ? book.author.photoUrl : `${API}${book.author.photoUrl.startsWith('/') ? book.author.photoUrl : '/' + book.author.photoUrl}`} alt={book.author.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                    : book.author.name.charAt(0)}
                </div>
                <p style={{ fontWeight: 700, color: "#1a1a2e", margin: 0, fontSize: 16 }}>{book.author.name}</p>
              </div>
              
              <div>
                <p style={{ color: "#6b7280", lineHeight: 1.75, fontSize: 14, margin: 0 }}>{book.author.bio || "No bio available."}</p>
                {book.author.extraData && Object.keys(book.author.extraData).length > 0 && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f5' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Additional Information</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                      {book.author.age && book.author.age !== 'NA' && (
                        <div>
                          <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontWeight: 600 }}>DATE OF BIRTH</span>
                          <span style={{ display: 'block', fontSize: 13, color: '#1a1a2e', fontWeight: 500 }}>
                            {(() => {
                              try {
                                const d = new Date(book.author.age);
                                if (!isNaN(d.getTime())) {
                                  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
                                }
                              } catch(e) {}
                              return book.author.age;
                            })()}
                          </span>
                        </div>
                      )}
                      {book.author.experience && book.author.experience !== 'NA' && book.author.experience !== '0' && (
                        <div>
                          <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontWeight: 600 }}>EXPERIENCE</span>
                          <span style={{ display: 'block', fontSize: 13, color: '#1a1a2e', fontWeight: 500 }}>{book.author.experience} Years</span>
                        </div>
                      )}
                      {book.author.qualification && (() => {
                        try {
                          const quals = JSON.parse(book.author.qualification);
                          if (Array.isArray(quals) && quals.length > 0 && quals[0].qualification) {
                            return (
                              <div style={{ gridColumn: '1 / -1' }}>
                                <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontWeight: 600 }}>QUALIFICATIONS</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.2rem' }}>
                                  {quals.map((q: any, i: number) => (
                                    <span key={i} style={{ display: 'block', fontSize: 13, color: '#1a1a2e', fontWeight: 500 }}>
                                      <strong>{q.qualification}</strong>
                                      {q.institution ? ` — ${q.institution}` : ''}
                                      {q.subject ? ` (${q.subject})` : ''}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                        } catch(e) {}
                        return null;
                      })()}
                      {book.author.skills && book.author.skills !== 'NA' && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontWeight: 600 }}>SKILLS</span>
                          <span style={{ display: 'block', fontSize: 13, color: '#1a1a2e', fontWeight: 500 }}>
                            {(() => {
                               try {
                                  const parsed = JSON.parse(book.author.skills);
                                  if (Array.isArray(parsed)) return parsed.join(', ');
                               } catch(e) {}
                               return book.author.skills;
                            })()}
                          </span>
                        </div>
                      )}
                      {book.author.hobbies && book.author.hobbies !== 'NA' && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontWeight: 600 }}>HOBBIES</span>
                          <span style={{ display: 'block', fontSize: 13, color: '#1a1a2e', fontWeight: 500 }}>
                            {(() => {
                               try {
                                  const parsed = JSON.parse(book.author.hobbies);
                                  if (Array.isArray(parsed)) return parsed.join(', ');
                               } catch(e) {}
                               return book.author.hobbies;
                            })()}
                          </span>
                        </div>
                      )}
                      {book.author.extraData && (() => {
                        let ed = book.author.extraData;
                        if (typeof ed === 'string') {
                           try { ed = JSON.parse(ed); } catch(e) { ed = {}; }
                        }
                        if (!ed || typeof ed !== 'object') return null;

                        const excludedKeys = [
                          'bundleRules', 'bundleRule', 'lowStockAlerts', 'lateFines', 
                          'isPublishedByPublisher', 'whyJoining', 'conflictOfInterestSignature', 
                          'agreedToGuidelines', 'agreedToInfoDoc', 'isReapplied', 'hasPendingEdits', 
                          'editedProfileFields', 'fineHistory', 'lateNotificationDate', 'fineDate', 
                          'fineStatus', 'finePaymentScreenshot', 'finePaymentDate', 'lastFinePaidAt'
                        ];

                        return Object.entries(ed)
                          .filter(([k, v]) => typeof v !== 'object' && v !== null && v !== '' && !excludedKeys.includes(k))
                          .map(([k, v]) => {
                            const valStr = String(v);
                            const isUrl = valStr.startsWith('http://') || valStr.startsWith('https://');
                            const isLongField = isUrl || valStr.length > 30 || ['youtube', 'linkedin', 'instagram', 'facebook', 'website', 'social'].includes(k.toLowerCase());

                            return (
                              <div key={k} style={{ gridColumn: isLongField ? '1 / -1' : 'auto' }}>
                                <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{k}</span>
                                {isUrl ? (
                                  <a 
                                    href={valStr} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ display: 'block', fontSize: 13, color: '#059669', fontWeight: 500, textDecoration: 'underline', wordBreak: 'break-all' }}
                                  >
                                    {valStr}
                                  </a>
                                ) : (
                                  <span style={{ display: 'block', fontSize: 13, color: '#1a1a2e', fontWeight: 500, wordBreak: 'break-word' }}>
                                    {valStr}
                                  </span>
                                )}
                              </div>
                            );
                          });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Reviews list */}
          <section style={{ background: "#fff", border: "1px solid #f1f5f9", padding: book.reviews.length === 0 ? "2rem" : "3rem", borderRadius: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400, color: "#111", margin: 0 }}>Reader Reviews</h2>
              {book.reviews.length > 0 && <span style={{ fontSize: 11, fontWeight: 500, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>{book.reviews.length} review{book.reviews.length !== 1 ? "s" : ""}</span>}
            </div>
            <div style={{ width: 30, height: 1, background: "#111", marginBottom: book.reviews.length === 0 ? "1.5rem" : "2rem" }}></div>
            {book.reviews.length === 0
              ? <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "#f8fafc", border: "1px dashed #cbd5e1", padding: "1rem 1.5rem", borderRadius: 12 }}>
                  <Star size={20} style={{ color: "#94a3b8" }} />
                  <div>
                    <p style={{ fontWeight: 700, margin: 0, fontSize: 13, color: "#475569" }}>No reviews yet</p>
                    <p style={{ fontSize: 12, margin: "0.1rem 0 0", color: "#94a3b8" }}>Be the first to share your thoughts!</p>
                  </div>
                </div>
              : <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {book.reviews.map((r) => (
                    <div key={r.id} style={{ borderLeft: `3px solid ${meta.border}`, paddingLeft: "1rem", paddingTop: "0.25rem", paddingBottom: "0.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 14 }}>{r.reviewerName}</span>
                        <StarRating value={r.rating} />
                        <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                          {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <p style={{ color: "#4b5563", fontSize: 14, lineHeight: 1.65, margin: 0 }}>{r.comment}</p>
                    </div>
                  ))}
                </div>}
          </section>

          {/* Write a review */}
          <section>
            {!showReviewForm ? (
              <button className="write-review-btn" onClick={() => setShowReviewForm(true)} style={{ background: meta.color, color: "#fff", border: "none", padding: "1rem 2rem", borderRadius: 16, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", transition: "all 0.2s", width: "100%", boxShadow: `0 10px 25px ${meta.color}40` }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.filter = "brightness(1.1)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.filter = "brightness(1)"; }}>
                Write a Review
              </button>
            ) : (
              <div>
                <BookReviewForm onSubmit={handleSubmitReview} isSubmitting={submitting} />
                {submitMsg && (
                  <p style={{ fontSize: 13, color: submitMsg.startsWith("✓") ? "#111" : "#b44d28", fontWeight: 500, marginTop: "1rem", textAlign: "center" }}>{submitMsg}</p>
                )}
                <button onClick={() => setShowReviewForm(false)} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 13, fontWeight: 600, textDecoration: "underline", marginTop: "1rem", cursor: "pointer", width: "100%", textAlign: "center" }}>
                  Cancel
                </button>
              </div>
            )}
          </section>
        </div>
      </div>


      </div>

      <div className="book-more-bg" style={{ 
        backgroundColor: "#f8f9fa",
        backgroundImage: `radial-gradient(${meta.color}33 1px, transparent 1px)`,
        backgroundSize: "16px 16px", 
        padding: "4rem 1.5rem 6rem", marginTop: "4rem", borderRadius: "40px 40px 0 0",
        borderTop: "1px solid rgba(0,0,0,0.05)"
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {moreFromAuthor.length > 0 && (
            <div style={{ marginBottom: moreFromCategory.length > 0 ? "4rem" : 0 }}>
              <h3 className="related-section-title" style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "#111", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.8rem" }}>
                <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: meta.color }}></span>
                More from {book?.author?.name || 'this Author'}
              </h3>
              <div className="related-book-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "2rem" }}>
                {moreFromAuthor.map((relatedBook) => (
                  <Link to={`/book/${relatedBook.id}`} key={`author-${relatedBook.id}`} className="related-book-card" style={{ 
                    display: "flex", flexDirection: "row", alignItems: "center", gap: "1.5rem",
                    background: "#fff", borderRadius: 20, padding: "1rem", 
                    boxShadow: "0 10px 40px rgba(0,0,0,0.03)", 
                    textDecoration: "none", 
                    position: "relative",
                    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)" 
                  }} 
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-6px)"; e.currentTarget.style.boxShadow=`0 20px 50px ${meta.color}25`; }} 
                  onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 10px 40px rgba(0,0,0,0.03)"; }}>
                    
                    <div style={{ width: 110, height: 150, flexShrink: 0, background: `linear-gradient(135deg, ${meta.color}15 0%, ${meta.color}05 100%)`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      <img
                        src={relatedBook.coverUrl ? (relatedBook.coverUrl.startsWith("http") ? relatedBook.coverUrl : `${API}${relatedBook.coverUrl.startsWith('/') ? relatedBook.coverUrl : '/' + relatedBook.coverUrl}`) : "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=450&fit=crop"}
                        alt={relatedBook.title}
                        style={{ width: "75%", height: "85%", objectFit: "cover", borderRadius: 6, boxShadow: "5px 10px 20px rgba(0,0,0,0.1), -2px -2px 10px rgba(255,255,255,0.7)", transition: "transform 0.4s ease" }}
                        onMouseEnter={e => e.currentTarget.style.transform="scale(1.08)"}
                        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
                      />
                    </div>
                    
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0.5rem 0" }}>
                      <h4 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: "0.4rem", lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {relatedBook.title}
                      </h4>
                      <div style={{ fontSize: 13, color: "#64748b", marginBottom: "1rem", fontWeight: 600 }}>{relatedBook.authorName || relatedBook.author?.name}</div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: meta.color }}>
                          ₹{relatedBook.mrp || 250}
                        </span>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: meta.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 12px ${meta.color}40` }}>
                          <ArrowRight size={16} />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {moreFromCategory.length > 0 && (
            <div className="related-section-wrapper" style={{ marginTop: moreFromAuthor.length > 0 ? "4rem" : 0 }}>
              <h3 className="related-section-title" style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "#111", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.8rem" }}>
                <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: meta.color }}></span>
                More in {book?.genre === "NF" ? "Non-Fiction" : book?.genre === "F" ? "Fiction" : "Children's"}
              </h3>
              <div className="related-book-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "2rem" }}>
                {moreFromCategory.slice(0, 3).map((relatedBook) => (
                  <Link to={`/book/${relatedBook.id}`} key={`cat-${relatedBook.id}`} className="related-book-card" style={{ 
                    display: "flex", flexDirection: "row", alignItems: "center", gap: "1.5rem",
                    background: "#fff", borderRadius: 20, padding: "1rem", 
                    boxShadow: "0 10px 40px rgba(0,0,0,0.03)", 
                    textDecoration: "none", 
                    position: "relative",
                    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)" 
                  }} 
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-6px)"; e.currentTarget.style.boxShadow=`0 20px 50px ${meta.color}25`; }} 
                  onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 10px 40px rgba(0,0,0,0.03)"; }}>
                    
                    <div style={{ width: 110, height: 150, flexShrink: 0, background: `linear-gradient(135deg, ${meta.color}15 0%, ${meta.color}05 100%)`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      <img
                        src={relatedBook.coverUrl ? (relatedBook.coverUrl.startsWith("http") ? relatedBook.coverUrl : `${API}${relatedBook.coverUrl.startsWith('/') ? relatedBook.coverUrl : '/' + relatedBook.coverUrl}`) : "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=450&fit=crop"}
                        alt={relatedBook.title}
                        style={{ width: "75%", height: "85%", objectFit: "cover", borderRadius: 6, boxShadow: "5px 10px 20px rgba(0,0,0,0.1), -2px -2px 10px rgba(255,255,255,0.7)", transition: "transform 0.4s ease" }}
                        onMouseEnter={e => e.currentTarget.style.transform="scale(1.08)"}
                        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
                      />
                    </div>
                    
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0.5rem 0" }}>
                      <h4 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: "0.4rem", lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {relatedBook.title}
                      </h4>
                      <div style={{ fontSize: 13, color: "#64748b", marginBottom: "1rem", fontWeight: 600 }}>{relatedBook.authorName || relatedBook.author?.name}</div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: meta.color }}>
                          ₹{relatedBook.mrp || 250}
                        </span>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: meta.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 12px ${meta.color}40` }}>
                          <ArrowRight size={16} />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {cartItems.length > 0 && (
        <div className="catalogue-floating-checkout" style={{
          position: "fixed", bottom: "2rem", right: "2rem",
          background: "#111", color: "#fff", borderRadius: 50,
          padding: "0.8rem 1rem 0.8rem 2rem", boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", gap: "2rem", zIndex: 100,
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          <div className="catalogue-floating-checkout-text">
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>{cartItems.length} Book{cartItems.length > 1 ? "s" : ""} Selected</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Total: ₹{cartItems.reduce((sum, id) => sum + (allBooksData.find(b => b.id.toString() === id.toString())?.mrp || 0), 0)}</div>
          </div>
          <button onClick={() => {
              const token = localStorage.getItem("token");
              const role = localStorage.getItem("userRole");
              if (!token || role !== "CUSTOMER") {
                navigate("/login?role=CUSTOMER&redirect=/checkout");
              } else {
                navigate("/checkout");
              }
            }}
            style={{ 
              background: meta.color, 
              border: "none", cursor: "pointer", color: "#fff", 
              padding: "0.8rem 1.8rem", borderRadius: 40, 
              fontWeight: 800, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.05em",
              display: "flex", alignItems: "center", gap: "0.5rem",
              transition: "transform 0.2s, filter 0.2s" 
            }}
          >
            Checkout <ArrowRight size={16} />
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .book-detail-grid { grid-template-columns: 1fr !important; }
          .book-price-panel {
            padding: 1.2rem !important;
            gap: 1rem !important;
            border-radius: 16px !important;
          }
          .book-price-val {
            font-size: 28px !important;
          }
          .book-price-panel button {
             padding: 0.8rem 1rem !important;
             font-size: 11px !important;
             border-radius: 12px !important;
             flex: 1 !important;
             justify-content: center !important;
          }
          .book-stock-badge {
             padding: 0.4rem 0.8rem !important;
             font-size: 11px !important;
          }
          .book-hero-container {
             justify-content: center !important;
             text-align: center !important;
             gap: 2rem !important;
          }
          .book-title {
             font-size: 2rem !important;
          }
          .book-hero-bg {
             padding: 5rem 1rem 3rem !important;
          }
          .book-hero-wrapper {
             padding: 0 !important;
          }
          .go-back-btn {
             margin-bottom: 1.5rem !important;
          }
          .book-more-bg {
             padding: 2.5rem 1rem 3rem !important;
             margin-top: 2rem !important;
             border-radius: 30px 30px 0 0 !important;
          }
          .related-section-title {
             font-size: 1.5rem !important;
             margin-bottom: 1.2rem !important;
          }
          .related-section-wrapper {
             margin-top: 2.5rem !important;
          }
          .related-book-grid {
             grid-template-columns: 1fr !important;
             gap: 1rem !important;
          }
          .related-book-card {
             padding: 0.8rem !important;
             gap: 1rem !important;
             border-radius: 16px !important;
          }
          .related-book-card h4 {
             font-size: 1rem !important;
          }
          .write-review-btn {
             width: auto !important;
             display: block !important;
             margin: 0 auto !important;
             padding: 0.6rem 1.5rem !important;
             font-size: 11px !important;
             border-radius: 30px !important;
             box-shadow: 0 4px 10px rgba(0,0,0,0.1) !important;
          }
          .catalogue-floating-checkout {
            left: 0.5rem !important;
            right: 0.5rem !important;
            bottom: 0.5rem !important;
            flex-direction: row !important;
            gap: 0.5rem !important;
            padding: 0.5rem 1rem !important;
            border-radius: 50px !important;
            align-items: center !important;
            width: auto !important;
            justify-content: space-between !important;
          }
          .catalogue-floating-checkout-text {
             text-align: left !important;
             font-size: 0.9rem !important;
          }
          .catalogue-floating-checkout-text > div:first-child {
             font-size: 14px !important;
          }
          .catalogue-floating-checkout-text > div:last-child {
             font-size: 11px !important;
          }
          .catalogue-floating-checkout button {
             width: auto !important;
             padding: 0.5rem 1rem !important;
             font-size: 0.8rem !important;
             border-radius: 50px !important;
          }
        }
      `}</style>
    </div>
  );
}
