import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import axios from "axios";
import { Search, Filter, BookOpen, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { bookCategories } from "../data/categories";

const C = {
  gold: "#FF6B00",
  goldBg: "#f8f9fa",
  amber: "#0033FF",
  dark: "#111",
  text: "#111",
  muted: "#475569",
  border: "#eaeaea",
  white: "#fff",
  cream: "#fff",
};

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function BrowseAuthorsPage() {
  const [authors, setAuthors] = useState<any[]>([]);
  const [filteredAuthors, setFilteredAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBookCount, setSelectedBookCount] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/public/authors`);
        setAuthors(res.data);
        setFilteredAuthors(res.data);
      } catch (err) {
        console.error("Error fetching authors:", err);
        toast.error("Failed to load authors");
      } finally {
        setLoading(false);
      }
    };
    fetchAuthors();
  }, []);

  // Compute unique filter options
  const uniqueCities = useMemo(() => Array.from(new Set(authors.map(a => a.city).filter(Boolean))).sort(), [authors]);
  const uniqueGenres = useMemo(() => {
    const allGenres = authors.flatMap(a => a.books.map((b: any) => b.genre));
    return Array.from(new Set(allGenres.filter(Boolean))).sort();
  }, [authors]);

  useEffect(() => {
    let result = authors;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(q) || (a.city && a.city.toLowerCase().includes(q)));
    }

    if (selectedGenre) {
      result = result.filter(a => a.books.some((b: any) => b.genre === selectedGenre));
    }

    if (selectedCity) {
      result = result.filter(a => a.city === selectedCity);
    }

    if (selectedBookCount) {
      result = result.filter(a => {
        const count = a.books.length;
        if (selectedBookCount === "1-2") return count >= 1 && count <= 2;
        if (selectedBookCount === "3-5") return count >= 3 && count <= 5;
        if (selectedBookCount === "5+") return count > 5;
        return true;
      });
    }

    setFilteredAuthors(result);
    setCurrentPage(1); // Reset to page 1 on filter change
  }, [searchTerm, selectedGenre, selectedCity, selectedBookCount, authors]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAuthors.length / itemsPerPage);
  const indexOfLastAuthor = currentPage * itemsPerPage;
  const indexOfFirstAuthor = indexOfLastAuthor - itemsPerPage;
  const currentAuthors = filteredAuthors.slice(indexOfFirstAuthor, indexOfLastAuthor);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 400, behavior: "smooth" }); // scroll back to top of list
    }
  };

  return (
    <main style={{ fontFamily: "'Google Sans', 'Montserrat', sans-serif", background: C.cream, minHeight: "100vh" }}>
      {/* Hero Section */}
      <section style={{ padding: "11.5rem 2rem 8rem", textAlign: "center", position: "relative", overflow: "hidden", backgroundColor: "#fff" }}>
        <div style={{ 
          position: "absolute", 
          inset: 0, 
          backgroundImage: "url('/panel-discussion.webp')", 
          backgroundSize: "cover", 
          backgroundPosition: "center 15%",
          filter: "grayscale(100%)",
          zIndex: 0
        }}></div>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", textAlign: "center", marginTop: "8rem" }}>
          <h1 style={{ 
            fontFamily: "'Playfair Display', serif", 
            fontSize: "clamp(2.5rem, 5vw, 4.5rem)", 
            color: "#FF6B00", 
            fontWeight: 800, 
            lineHeight: 1.4, 
            letterSpacing: "-0.02em", 
            margin: 0,
            display: "inline",
            background: "rgba(255, 255, 255, 0.4)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            padding: "0 0.4em",
            borderRadius: "12px",
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone"
          }}>
            Discover & Invite Authors
          </h1>
          <p style={{
            fontSize: "0.95rem",
            color: "#fff",
            fontWeight: 700,
            marginTop: "2rem",
            textShadow: "0 2px 4px rgba(0,0,0,0.8)",
            letterSpacing: "0.05em",
            lineHeight: 1.8
          }}>
            Book Launch &nbsp;|&nbsp; Book Reading &nbsp;|&nbsp; School Visit &nbsp;|&nbsp; College Seminar <br className="block md:hidden" />
            <span className="hidden md:inline">&nbsp;|&nbsp; </span>Literary Festival &nbsp;|&nbsp; Workshop &nbsp;|&nbsp; Panel Discussion &nbsp;|&nbsp; Storytelling Session &nbsp;|&nbsp; Others
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "10rem 2rem" }} className="browse-container">
        
        {/* Horizontal Filter Bar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", background: "#fff", padding: "1rem", border: `1px solid ${C.border}`, marginBottom: "3rem" }} className="filter-bar">
          
          <div style={{ flex: "1 1 250px", display: "flex", gap: "0.5rem", padding: "0 1rem" }}>
            <div style={{ display: "flex", alignItems: "center", color: C.muted }}>
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Search authors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15, color: C.dark }}
            />
          </div>

          <div style={{ width: "1px", height: "30px", background: C.border, display: "none" }} className="hide-on-mobile"></div>

          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            style={{ padding: "0.8rem 1.5rem", border: "none", outline: "none", background: C.dark, borderRadius: 50, fontSize: 14, color: C.white, cursor: "pointer", fontWeight: 600 }}
            className="filter-select"
          >
            <option value="">All Genres</option>
            {uniqueGenres.map(g => (
              <option key={g as string} value={g as string}>{g as string}</option>
            ))}
          </select>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{ padding: "0.8rem 1.5rem", border: "none", outline: "none", background: C.gold, borderRadius: 50, fontSize: 14, color: C.white, cursor: "pointer", fontWeight: 600 }}
            className="filter-select"
          >
            <option value="">All Cities</option>
            {uniqueCities.map(c => (
              <option key={c as string} value={c as string}>{c as string}</option>
            ))}
          </select>

          <button
            onClick={() => { setSearchTerm(""); setSelectedGenre(""); setSelectedCity(""); }}
            style={{ padding: "0.8rem 1.5rem", background: C.goldBg, border: `1px solid ${C.border}`, borderRadius: 50, color: C.dark, fontSize: 13, fontWeight: 700, cursor: "pointer", marginLeft: "auto", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dark; }}
            className="clear-btn"
          >
            Clear
          </button>
        </div>

        {/* Authors Grid */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <div style={{ fontSize: 15, color: C.muted, fontWeight: 500 }}>
              Showing <span style={{ color: C.dark, fontWeight: 700 }}>{filteredAuthors.length}</span> author{filteredAuthors.length !== 1 && "s"}
            </div>
          </div>

          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "2rem" }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ background: C.white, borderRadius: 16, height: 380, border: `1px solid ${C.border}` }} className="animate-pulse" />
              ))}
            </div>
          ) : filteredAuthors.length === 0 ? (
            <div style={{ textAlign: "center", padding: "5rem 2rem", background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
                <Search size={32} color={C.muted} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: C.dark, marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>No authors found</h3>
              <p style={{ color: C.muted, fontSize: 15 }}>Try adjusting your search or filters to find what you're looking for.</p>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: "2rem", marginBottom: "4rem" }} className="author-grid">
                {currentAuthors.map((author, index) => {
                  
                  // Parse qualifications
                  let parsedQuals: any[] = [];
                  if (author.qualificationsJson) {
                    parsedQuals = Array.isArray(author.qualificationsJson) ? author.qualificationsJson : 
                                   (typeof author.qualificationsJson === 'string' ? JSON.parse(author.qualificationsJson).catch(()=>[]) : []);
                  } else if (author.qualification) {
                    try { parsedQuals = JSON.parse(author.qualification); } 
                    catch(e) { parsedQuals = [{ qualification: author.qualification, institution: author.institution }]; }
                  }
                  if (!Array.isArray(parsedQuals)) parsedQuals = [];

                  // Parse skills
                  let parsedSkills: string[] = [];
                  if (author.skillsJson) {
                    parsedSkills = Array.isArray(author.skillsJson) ? author.skillsJson : 
                                   (typeof author.skillsJson === 'string' ? JSON.parse(author.skillsJson).catch(()=>[]) : []);
                  } else if (author.skills) {
                    try { parsedSkills = JSON.parse(author.skills); } 
                    catch(e) { parsedSkills = [author.skills]; }
                  }
                  if (!Array.isArray(parsedSkills)) parsedSkills = [];

                  const cardColors = ["#bbf7d0", "#fed7aa", "#e9d5ff", "#bfdbfe", "#fef08a", "#fbcfe8"];
                  const cardBg = cardColors[index % cardColors.length];

                  return (
                    <Link
                      key={author.id}
                      to={`/invite-authors/${author.id}`}
                      style={{
                        background: cardBg, borderRadius: 24, border: `1px solid rgba(0, 51, 255, 0.08)`, overflow: "hidden",
                        textDecoration: "none", color: "inherit", transition: "all 0.3s ease", display: "flex", flexDirection: "column",
                        position: "relative", boxShadow: "0 8px 30px rgba(0, 51, 255, 0.03)"
                      }}
                      className="author-card"
                    >
                      {/* Top Banner */}
                      <div style={{ height: "80px", background: "linear-gradient(135deg, rgba(0, 51, 255, 0.06) 0%, rgba(255, 107, 0, 0.06) 100%)", borderBottom: `1px solid ${C.border}`, backgroundImage: "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)", backgroundSize: "16px 16px" }}></div>
                      
                      {/* Avatar overlapping banner */}
                      <div style={{ padding: "0 1.5rem", marginTop: "-60px", display: "flex", alignItems: "flex-end", gap: "1rem", position: "relative", zIndex: 2 }}>
                        <div style={{
                          width: 120, height: 120, borderRadius: "50%", background: C.white, border: `4px solid ${C.white}`,
                          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", 
                          boxShadow: "0 4px 10px rgba(0,0,0,0.05)", flexShrink: 0
                        }}>
                          {author.photoUrl ? (
                            <img src={author.photoUrl.startsWith('http') ? author.photoUrl : `${API}${author.photoUrl.startsWith('/') ? author.photoUrl : '/' + author.photoUrl}`} alt={author.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: 36, fontWeight: 800, color: C.gold, fontFamily: "var(--font-display)" }}>{author.name.charAt(0)}</span>
                          )}
                        </div>
                        
                        <div style={{ paddingBottom: "0.4rem" }}>
                          <p style={{ fontSize: 11, color: C.amber, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>{author.city || "Pune"}</p>
                          <h3 style={{ fontSize: 21, fontWeight: 800, color: C.dark, fontFamily: "var(--font-display)", lineHeight: 1.1 }}>{author.name}</h3>
                        </div>
                      </div>
                      
                      {/* Details & Footer */}
                      <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
                        
                        {/* Qualifications & Skills */}
                        <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                          {parsedQuals.length > 0 && (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 800, color: C.amber, marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Education
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                {parsedQuals.map((q: any, i) => {
                                  const degreeText = q.qualification || q.degree || "";
                                  const subjectText = q.subject || "";
                                  const modeText = q.mode ? ` (${q.mode})` : "";
                                  let displayStr = degreeText;
                                  if (subjectText) displayStr += (displayStr ? ` in ${subjectText}` : subjectText);
                                  displayStr += modeText;
                                  return (
                                    <div key={i} style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>
                                      • <span style={{ fontWeight: 600, color: C.text }}>{displayStr}</span> 
                                      {q.institution || q.college ? ` from ${q.institution || q.college}` : ""}
                                      {q.year ? ` (${q.year})` : ""}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {parsedSkills.length > 0 && (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 800, color: C.amber, marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Skills
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                                {parsedSkills.map((s, i) => (
                                  <span key={i} style={{ fontSize: 11, fontWeight: 700, color: C.amber, background: `${C.amber}15`, padding: "0.3rem 0.6rem", borderRadius: 4 }}>
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Bio */}
                        <div style={{ marginBottom: "1.5rem", flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: C.amber, marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            About the Author
                          </div>
                          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {author.bio || "No biography provided."}
                          </p>
                        </div>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1.2rem", borderTop: `1px solid ${C.border}` }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: C.white, padding: "0.4rem 0.8rem", borderRadius: 30, border: `1px solid ${C.border}` }}>
                            <BookOpen size={14} color={C.muted} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>{author.books?.length || 0}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Books</span>
                          </div>
                          
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.white, background: C.amber, padding: "0.5rem 1rem", borderRadius: 30, display: "flex", alignItems: "center", gap: "0.2rem", transition: "all 0.2s" }} className="view-profile-btn">
                            View Profile <ChevronRight size={14} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}>
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}`, background: currentPage === 1 ? "transparent" : C.white, color: currentPage === 1 ? C.border : C.dark, cursor: currentPage === 1 ? "default" : "pointer", transition: "all 0.2s" }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      style={{ 
                        width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", 
                        border: page === currentPage ? "none" : `1px solid ${C.border}`, 
                        background: page === currentPage ? C.gold : C.white, 
                        color: page === currentPage ? C.white : C.dark, 
                        fontWeight: page === currentPage ? 800 : 600,
                        cursor: "pointer", transition: "all 0.2s",
                        fontSize: 14
                      }}
                    >
                      {page}
                    </button>
                  ))}

                  <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}`, background: currentPage === totalPages ? "transparent" : C.white, color: currentPage === totalPages ? C.border : C.dark, cursor: currentPage === totalPages ? "default" : "pointer", transition: "all 0.2s" }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .author-card {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .author-card:hover { 
          transform: translateY(-4px); 
          box-shadow: 0 20px 40px rgba(0, 51, 255, 0.08) !important; 
          border-color: rgba(0, 51, 255, 0.2) !important;
        }
        .view-profile-btn {
          transition: all 0.3s ease;
        }
        .author-card:hover .view-profile-btn {
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0, 51, 255, 0.3);
        }
        @media (max-width: 900px) {
          .layout-grid { grid-template-columns: 1fr !important; }
        }
        .filter-bar {
          border-radius: 100px;
        }
        .author-grid {
          grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
        }
        .filter-select {
          border-radius: 50px;
        }
        @media (max-width: 768px) {
          .filter-bar {
            flex-direction: column;
            border-radius: 20px !important;
            padding: 1.5rem !important;
            align-items: stretch !important;
          }
          .filter-bar > div:first-child {
            background: #f8f9fa;
            border-radius: 50px;
            padding: 0.8rem 1rem !important;
          }
          .filter-select {
            width: 100%;
            background: #f8f9fa !important;
            margin-bottom: 0.5rem;
          }
          .clear-btn {
            width: 100%;
            margin-left: 0 !important;
            text-align: center;
          }
          .author-grid {
            grid-template-columns: 1fr;
          }
          .hide-on-mobile {
            display: none !important;
          }
          .browse-container {
            padding: 2rem 1rem !important;
          }
        }
      `}</style>
    </main>
  );
}
