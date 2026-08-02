import { useState, useEffect, useRef } from "react";

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
      { threshold: 0.08 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(20px)",
        transition: `all 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const goals = [
  {
    img: "/goal_reading.webp",
    title: "Revive Reading Culture",
    desc: "Promote and revive book reading as a habit . An effort to keep book reading alive.",
  },
  {
    img: "/goal_creativity.webp",
    title: "Showcase Creativity",
    desc: "Showcase the value of knowledge and creativity through books.",
  },
  {
    img: "/goal_community.webp",
    title: "Community Literary Events",
    desc: "Provide an avenue in form of a literary activity within the housing societies, educational institutions, and organisations, taking them out of their digital world.",
  },
  {
    img: "/goal_author_signing.webp",
    title: "Direct Author Interaction",
    desc: " A literary activity at the door step, Residents can meet authors live, interact and purchase inked, signed copies directly.",
  },
  {
    img: "/goal_indian_lit.webp",
    title: "Promote Indian Literature",
    desc: " Promote Indian Authors, Indian culture and literature.",
  },
  {
    img: "/goal_mentoring.webp",
    title: "Guide Aspiring Authors",
    desc: " Help and guide those who are keen to write and receive support in self-publishing a book.",
  },
];

const initiatives = [
  {
    icon: "🎪",
    color: "#f16522",
    bg: "#fff3e6",
    title: "Literary Events",
    desc: "The group has been organising Literary Events at an average rate of 3-4 events per month, in housing societies, educational institutions and corporate offices. Prominent places where these events were organised tare like NOFRA Navy Nagar, Mumbai; AFMC, Pune; Tata Motors, HCL technologies, Persistent Systems, a few prominent housing societies, and many more.",
  },
  {
    icon: "📚",
    color: "#2563EB",
    bg: "#eff6ff",
    title: "Book Fair Participation",
    desc: "Participate in Book Fairs, mainly the ones organised by the National Book Trust of India.",
  },
  {
    icon: "✈️",
    color: "#059669",
    bg: "#ecfdf5",
    title: "Airport Flybraries",
    desc: "Setup Flybraries at 6 prominent Indian airports — Pune, Chennai, Kolkata, Mangalore, Thiruvananthapuram & Bhubaneswar — donating 1,600 copies of books to date.",
  },
  {
    icon: "🌐",
    color: "#7c3aed",
    bg: "#f5f3ff",
    title: "Online Presence",
    desc: "Created this website for selling books online. The presence of this exclusive select group of local authors goes online and the reach goes beyond the physical limitations. The website allows author management and also provides clients to reach us for organising a literary event. It gives full visibility to everyone about the group’s initiatives. ",
  },
  {
    icon: "🤝",
    color: "#db2777",
    bg: "#fdf2f8",
    title: "Publishing Support",
    desc: "Actively support authors in publishing related tasks, helping them navigate the complexities of bringing a book to market.",
  },
];

export function AboutPage() {
  return (
    <main
      style={{
        fontFamily: "var(--font-body)",
        background: "#fff",
        color: "#111",
        minHeight: "calc(100vh - 64px)",
        overflowX: "hidden",
      }}
    >
      {/* ── HERO ── */}
      <section
        style={{
          position: "relative",
          minHeight: "45vh",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
        }}
      >
        {/* Background decorative text */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: "clamp(6rem, 18vw, 18rem)",
              fontWeight: 900,
              color: "rgba(255,255,255,0.03)",
              letterSpacing: "-0.05em",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            PAA
          </div>
        </div>

        {/* Accent blobs */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(241,101,34,0.2) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            left: "10%",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "11.5rem 1.5rem 3rem",
            width: "100%",
            position: "relative",
            zIndex: 10,
          }}
        >
          <FadeIn>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(241,101,34,0.15)",
                border: "1px solid rgba(241,101,34,0.3)",
                borderRadius: 50,
                padding: "6px 16px",
                marginBottom: "1.5rem",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f16522" }}>
                Founded Dec 2024 · Pune, India
              </span>
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.8rem, 5.5vw, 5rem)",
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
                maxWidth: 750,
                marginBottom: "1.5rem",
              }}
            >
              Pune Authors'{" "}
              <span style={{ fontStyle: "italic", color: "#f16522" }}>Association.</span>
            </h1>

          </FadeIn>
        </div>
      </section>

      {/* ── ORIGIN STORY ── */}
      <section style={{ padding: "2.5rem 1.5rem 4rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* 2-col: Photo + Intro */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center", marginBottom: "1.5rem" }} className="about-grid">
            <FadeIn delay={150}>
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(2.5rem, 4vw, 3.5rem)",
                    fontWeight: 900,
                    color: "#0f172a",
                    lineHeight: 1.15,
                    letterSpacing: "-0.02em",
                    marginBottom: "1.5rem",
                  }}
                >
                  Our <span style={{ color: "#f16522" }}>Story</span>
                </h2>
                <div style={{ width: 60, height: 4, background: "#f16522", borderRadius: 2, marginBottom: "2rem" }} />
                <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.8, fontWeight: 500, marginBottom: "1.2rem", textAlign: "justify" }}>
                  Pune Authors' Association is an informal group of authors. This group was formed in <strong style={{ color: "#0f172a" }}>December 2024</strong>. Founder of the group is Cdr <strong style={{ color: "#0f172a" }}>Cdr (Retd) Shiv Mathur</strong>. The group started with around 25 authors from Pune.
                </p>
                <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.8, fontWeight: 500, textAlign: "justify" }}>
                  Then we also included a few from Mumbai, and with time authors from other parts of India have also been joining us. Generally, the strength of the group hovers around 50. The number of titles is three times the number of authors on an average, and the books cover a wide variety of genres.
                </p>
              </div>
            </FadeIn>

            <FadeIn>
              <div style={{ position: "relative" }}>
                {/* Image card */}
                <div
                  style={{
                    borderRadius: 20,
                    overflow: "hidden",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.15)",
                    position: "relative",
                  }}
                >
                  <img
                    src="/pune_authors_hcl_event.webp"
                    alt="Pune Authors Association event at HCL Technologies"
                    style={{ width: "100%", height: 480, objectFit: "cover", display: "block" }}
                  />
                  {/* Overlay badge */}
                  {/* <div
                    style={{
                      position: "absolute",
                      bottom: 24,
                      left: 24,
                      background: "rgba(15,23,42,0.92)",
                      backdropFilter: "blur(12px)",
                      borderRadius: 14,
                      padding: "14px 20px",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Founder
                    </div>
                    <div style={{ fontSize: 16, color: "#fff", fontWeight: 700 }}>
                      Cdr (Retd) Shiv Mathur
                    </div>
                  </div> */}
                </div>
                {/* Decorative accent removed */}
              </div>
            </FadeIn>
          </div>

          {/* Full-width: Goals + Initiatives + Closing (Continuous plain fashion) */}
          <FadeIn delay={100}>
            <div style={{ marginTop: "0px", color: "#475569", fontSize: 16, lineHeight: 1.8, fontWeight: 500 }}>
              <p style={{ fontWeight: 700, color: "#0f172a", marginBottom: "0.8rem" }}>
                The main goals of the group are as follows:
              </p>
              <ul style={{ listStyleType: "disc", paddingLeft: "2rem", marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <li>Promote and revive book reading as a habit. An effort to keep book reading alive.</li>
                <li>Showcase the value of knowledge and creativity through books.</li>
                <li>Provide an avenue in form of a literary activity within the housing societies, educational institutions, and organisations, taking them out of their digital world.</li>
                <li>A literary activity at the door step, where residents can meet the authors live, interact with them, understand the background about the writing of that book.</li>
                <li>Promote Indian Authors, Indian culture and literature.</li>
                <li>They can also buy inked signed copies from the authors directly.</li>
                <li>Help and guide those who are keen to write and receive support in self-publishing a book.</li>
              </ul>

              <p style={{ fontWeight: 700, color: "#0f172a", marginBottom: "0.8rem", marginTop: "2rem" }}>
                To meet the above-mentioned objectives of the group, following are the key initiatives that have been executed on a regular basis:
              </p>
              <ul style={{ listStyleType: "disc", paddingLeft: "2rem", marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <li>Organise Literary Events in housing societies, educational institutions, and organisations.</li>
                <li>Participate in Book Fairs, mainly the ones organised by the National Book Trust of India.</li>
                <li>Set up or support libraries. Airport Flybraries at six airports was setup by way of donating 1600 copies of different books.</li>
                <li>Created the website for selling books online. The presence of this exclusive select group of local authors goes online and the reach goes beyond the physical limitations. The website allows author management and also provides clients to reach us for organising a literary event. It gives full visibility to everyone about the group's initiatives.</li>
                <li>Support authors in publishing related tasks.</li>
              </ul>

              <p style={{ marginBottom: "1.2rem", marginTop: "2rem" }}>
                Since inception the group has been organising Literary Events at an average rate of 3-4 events per month, in housing societies, educational institutions and corporate offices. Prominent places where these events were organised tare like NOFRA Navy Nagar, Mumbai; AFMC, Pune; Tata Motors, HCL technologies, Persistent Systems, a few prominent housing societies, etc.
              </p>
              <p style={{ marginBottom: "1.2rem" }}>
                The group has helped setup Flybraries at six of the prominent airports in India and donated till date 1600 copies of books to the airport Flybraries. They are Pune, Chennai, Kolkata, Mangalore, Thiruvananthapuram, &amp; Bhubaneshwar airports.
              </p>
              <p style={{ marginBottom: "1.2rem" }}>
                The aim is to reach every corner of India, and then go beyond our borders.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── GOALS ── */}
      <section style={{ background: "#0f172a", padding: "3.5rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f16522", marginBottom: "1rem" }}>
                What We Stand For
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                Our <span style={{ fontStyle: "italic", color: "#f16522" }}>Goals</span>
              </h2>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }} className="goals-grid">
            {goals.map((g, i) => (
              <FadeIn key={g.title} delay={i * 80}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    padding: "2rem",
                    height: "100%",
                    transition: "border-color 0.3s, background 0.3s",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(241,101,34,0.4)";
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(241,101,34,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)";
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
                  }}
                >
                  {/* Image + Title side by side */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", marginBottom: "1rem" }}>
                    <div style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
                      <img src={g.img} alt={g.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.3, margin: 0 }}>{g.title}</h3>
                  </div>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>{g.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── KEY INITIATIVES ── */}
      <section style={{ padding: "3.5rem 1.5rem", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ marginBottom: "3.5rem" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f16522", marginBottom: "1rem" }}>
                On the Ground
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                  maxWidth: 600,
                }}
              >
                Key <span style={{ fontStyle: "italic", color: "#f16522" }}>Initiatives</span>
              </h2>
            </div>
          </FadeIn>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {initiatives.map((init, i) => (
              <FadeIn key={init.title} delay={i * 100}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "72px 1fr",
                    gap: "1.75rem",
                    alignItems: "flex-start",
                    background: "#fff",
                    border: `1px solid ${init.color}22`,
                    borderLeft: `5px solid ${init.color}`,
                    borderRadius: 16,
                    padding: "2rem 2.25rem",
                    boxShadow: `0 4px 20px ${init.color}18`,
                    transition: "box-shadow 0.3s, transform 0.2s",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 36px ${init.color}30`;
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${init.color}18`;
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: init.bg,
                      border: `2px solid ${init.color}33`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 26,
                      flexShrink: 0,
                      boxShadow: `0 2px 8px ${init.color}20`,
                    }}
                  >
                    {init.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: init.color, marginBottom: "0.4rem" }}>{init.title}</h3>
                    <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7 }}>{init.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FLYBRARIES HIGHLIGHT ── */}
      <section style={{ padding: "1.5rem 1.5rem 3.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div
              style={{
                background: "linear-gradient(135deg, #f16522 0%, #e8500f 100%)",
                borderRadius: 24,
                padding: "4rem",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4rem",
                alignItems: "center",
                overflow: "hidden",
                position: "relative",
              }}
              className="flybrary-grid"
            >
              {/* Decorative circle */}
              <div
                style={{
                  position: "absolute",
                  top: -100,
                  right: -100,
                  width: 400,
                  height: 400,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)",
                  pointerEvents: "none",
                }}
              />
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: "1rem" }}>
                  Major Milestone
                </div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(2rem, 3.5vw, 2.8rem)",
                    fontWeight: 900,
                    color: "#fff",
                    lineHeight: 1.15,
                    letterSpacing: "-0.02em",
                    marginBottom: "1.5rem",
                  }}
                >
                  Airport <span style={{ fontStyle: "italic" }}>Flybraries</span>
                </h2>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", lineHeight: 1.8 }}>
                  We've set up libraries at six prominent Indian airports, donating <strong>1,600 copies of books</strong> to make literature accessible to every traveller.
                </p>
              </div>
              <div>
                <div className="flybrary-cities" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  {["Pune", "Chennai", "Kolkata", "Mangalore", "Thiruvananthapuram", "Bhubaneswar"].map((city) => (
                    <div
                      key={city}
                      style={{
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: 12,
                        padding: "0.75rem 1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>✈️</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{city}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── VISION ── */}
      <section style={{ background: "#FFF9F5", padding: "3.5rem 1.5rem" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <div style={{ fontSize: 48, marginBottom: "1.5rem" }}>🌏</div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                marginBottom: "1.5rem",
              }}
            >
              The Vision Ahead
            </h2>
            <div style={{ width: 48, height: 3, background: "#f16522", borderRadius: 2, margin: "0 auto 1.5rem" }} />
            <p style={{ fontSize: 18, color: "#475569", lineHeight: 1.8, fontWeight: 500 }}>
              "The aim is to reach every corner of India, and then go beyond our borders."
            </p>
            <p style={{ fontSize: 16, color: "#94a3b8", marginTop: "1rem", fontWeight: 500 }}>
              — Pune Authors' Association
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── BOOK SHOP, CAFÉ & LIBRARY (COMING SOON) ── */}
      <section style={{ padding: "1.5rem 1.5rem 4rem" }}>
        <div className="book-cafe-card" style={{ maxWidth: 1100, margin: "0 auto", backgroundColor: "#FFD700", borderRadius: 24, overflow: "hidden", padding: "4rem" }}>
          <FadeIn>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6rem", alignItems: "center" }} className="about-grid">
              <div>
                <div style={{ display: "inline-block", background: "#111", color: "#FFD700", padding: "0.5rem 1.5rem", borderRadius: 50, fontSize: 14, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
                  🚀 Coming Soon
                </div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.8rem", fontWeight: 900, color: "#111", lineHeight: 1.15, marginBottom: "1.5rem", letterSpacing: "-0.02em" }}>
                  The Book Shop,{" "}
                  <span style={{ fontStyle: "italic", color: "#111" }}>Café &amp; Library</span>
                </h2>
                <p style={{ fontSize: 16, color: "#333", lineHeight: 1.8, marginBottom: "2rem", maxWidth: 450, fontWeight: 600, textAlign: "justify" }}>
                  A curated literary haven where readers can discover, browse, and enjoy books alongside artisanal refreshments in a warm, inviting atmosphere.
                </p>
              </div>
              <div style={{ borderRadius: 16, overflow: "hidden", border: "4px solid #fff" }}>
                <img
                  src="https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&h=500&fit=crop"
                  alt="Book Café & Library"
                  style={{ width: "100%", height: 340, objectFit: "cover", display: "block" }}
                />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .about-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
          .goals-grid { grid-template-columns: 1fr 1fr !important; }
          .flybrary-grid { grid-template-columns: 1fr !important; gap: 2.5rem !important; }
          .story-list { grid-template-columns: 1fr !important; }
          .story-closing { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .goals-grid { grid-template-columns: 1fr !important; }
          .flybrary-grid { padding: 2rem !important; }
          .flybrary-cities { grid-template-columns: 1fr !important; }
          .book-cafe-card { padding: 2rem !important; }
        }
      `}</style>
    </main>
  );
}
