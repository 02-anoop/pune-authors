import { Link } from "react-router";

export function Footer() {
  return (
    <footer style={{ background: "#FFFFFF", color: "#666", padding: "4rem 1.5rem 2rem", fontSize: 14, fontFamily: "'Google Sans', sans-serif", borderTop: "1px solid #eaeaea" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "3rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1.5rem" }}>
            <img src="/logo.webp" alt="Pune Authors' Association Logo" style={{ height: 40, objectFit: "contain" }} />
            <span style={{ fontSize: 13, fontWeight: 900, color: "#111", letterSpacing: "0.05em", fontFamily: "'Playfair Display', serif", textTransform: "uppercase" }}>Pune Authors' Association</span>
          </div>
          <p style={{ lineHeight: 1.6, fontWeight: 500 }}>A group that collaborates to reach the readers, takes initiatives to revive book reading by organising literary events, participation in book fairs, promoting books at airport flybraries, thereby, promoting Indian authors, Indian literature and Indian culture</p>
        </div>
        <div>
          <h4 style={{ color: "#111", fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", marginBottom: "1.5rem", textTransform: "uppercase", fontFamily: "'Playfair Display', serif" }}>Quick Navigation</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontWeight: 500 }}>
            <Link to="/catalogue" style={{ color: "#666", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#111"} onMouseLeave={e => e.currentTarget.style.color = "#666"}>Buy Books</Link>
            <Link to="/register" style={{ color: "#666", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#111"} onMouseLeave={e => e.currentTarget.style.color = "#666"}>Authors - join the group</Link>
            <Link to="/organizers" style={{ color: "#666", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#111"} onMouseLeave={e => e.currentTarget.style.color = "#666"}>Organize a Literary Event</Link>
            <Link to="/invite-authors" style={{ color: "#666", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#111"} onMouseLeave={e => e.currentTarget.style.color = "#666"}>Invite an Author</Link>
            <Link to="/about" style={{ color: "#666", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#111"} onMouseLeave={e => e.currentTarget.style.color = "#666"}>About the Group</Link>
            <Link to="/catalogue" style={{ color: "#666", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#111"} onMouseLeave={e => e.currentTarget.style.color = "#666"}>Browse & Download the Catalog</Link>
          </div>
        </div>
        <div>
          <h4 style={{ color: "#111", fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", marginBottom: "1.5rem", textTransform: "uppercase", fontFamily: "'Playfair Display', serif" }}>Official Contacts</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontWeight: 500 }}>
            <span style={{ lineHeight: 1.5 }}>
              Cdr Shiv Mathur<br/>
              Pune Authors' Association<br/>
              2112, Clover Highlands<br/>
              NIBM, Pune 411048
            </span>
            <span>info@puneauthorsassociation.com</span>
            <span>+91 79770 97397</span>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1280, margin: "3rem auto 0", borderTop: "1px solid #eaeaea", paddingTop: "2rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", fontWeight: 500 }}>
        <span>© 2026 Pune Authors' Association. All Rights Reserved.</span>
        <div style={{ display: "flex", gap: "2rem" }}>
          <Link to="#" style={{ color: "#666", textDecoration: "none" }} onMouseEnter={e => e.currentTarget.style.color = "#111"} onMouseLeave={e => e.currentTarget.style.color = "#666"}>Privacy Charter</Link>
          <Link to="#" style={{ color: "#666", textDecoration: "none" }} onMouseEnter={e => e.currentTarget.style.color = "#111"} onMouseLeave={e => e.currentTarget.style.color = "#666"}>Terms of Operations</Link>
        </div>
      </div>
    </footer>
  );
}
